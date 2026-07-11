using System.Linq.Expressions;
using InterviewPrep.Application.Abstractions.Persistence;
using InterviewPrep.Application.Common;
using InterviewPrep.Domain.Entities;
using InterviewPrep.Domain.Enums;

namespace InterviewPrep.Application.Features.StudyPlans;

internal sealed class StudyPlanService(IUnitOfWork unitOfWork) : IStudyPlanService
{
    private readonly IRepository<StudyPlan> _plans = unitOfWork.Repository<StudyPlan>();

    public Task<IReadOnlyList<StudyPlanDto>> GetAllAsync(
        DateTime? fromUtc,
        DateTime? toUtc,
        CancellationToken cancellationToken = default)
    {
        if (fromUtc.HasValue && toUtc.HasValue && fromUtc > toUtc)
        {
            throw new ArgumentException("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
        }

        return _plans.ListAsync(
            Projection,
            plan => (!fromUtc.HasValue || plan.ScheduledForUtc >= fromUtc.Value)
                && (!toUtc.HasValue || plan.ScheduledForUtc <= toUtc.Value),
            plans => plans.OrderBy(plan => plan.ScheduledForUtc),
            cancellationToken: cancellationToken);
    }

    public Task<IReadOnlyList<StudyPlanDto>> GetTodayAsync(CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);
        return GetAllAsync(today, tomorrow.AddTicks(-1), cancellationToken);
    }

    public async Task<StudyPlanDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var plan = await _plans.FirstOrDefaultAsync(
            candidate => candidate.Id == id,
            Projection,
            cancellationToken);
        return plan ?? throw new NotFoundException(nameof(StudyPlan), id);
    }

    public async Task<StudyPlanDto> UpdateItemAsync(
        Guid planId,
        Guid itemId,
        UpdateStudyPlanItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var plan = await _plans.GetByIdAsync(planId, cancellationToken)
            ?? throw new NotFoundException(nameof(StudyPlan), planId);
        var items = await unitOfWork.Repository<StudyPlanItem>().ListTrackedAsync(
            item => item.StudyPlanId == planId,
            cancellationToken);
        var item = items.SingleOrDefault(candidate => candidate.Id == itemId)
            ?? throw new NotFoundException(nameof(StudyPlanItem), itemId);

        item.IsCompleted = request.IsCompleted;
        plan.ActualMinutes = items.Where(candidate => candidate.IsCompleted).Sum(candidate => candidate.PlannedMinutes);
        plan.Status = items.All(candidate => candidate.IsCompleted)
            ? StudyPlanStatus.Completed
            : items.Any(candidate => candidate.IsCompleted)
                ? StudyPlanStatus.InProgress
                : StudyPlanStatus.Planned;

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(planId, cancellationToken);
    }

    public async Task<StudyPlanDto> ToggleItemAsync(
        Guid planId,
        Guid itemId,
        CancellationToken cancellationToken = default)
    {
        if (await _plans.GetByIdAsync(planId, cancellationToken) is null)
        {
            throw new NotFoundException(nameof(StudyPlan), planId);
        }

        var item = (await unitOfWork.Repository<StudyPlanItem>().ListTrackedAsync(
            candidate => candidate.StudyPlanId == planId && candidate.Id == itemId,
            cancellationToken)).SingleOrDefault()
            ?? throw new NotFoundException(nameof(StudyPlanItem), itemId);

        return await UpdateItemAsync(
            planId,
            itemId,
            new UpdateStudyPlanItemRequest(!item.IsCompleted),
            cancellationToken);
    }

    private static readonly Expression<Func<StudyPlan, StudyPlanDto>> Projection = plan => new StudyPlanDto(
        plan.Id,
        plan.Title,
        plan.ScheduledForUtc,
        plan.Status,
        plan.PlannedMinutes,
        plan.ActualMinutes,
        plan.Notes,
        plan.Items.OrderBy(item => item.SortOrder)
            .Select(item => new StudyPlanItemDto(
                item.Id,
                item.TopicId,
                item.Topic == null ? null : item.Topic.Name,
                item.Title,
                item.ActivityType,
                item.ResourceId,
                item.PlannedMinutes,
                item.IsCompleted,
                item.SortOrder))
            .ToList(),
        plan.CreatedAtUtc,
        plan.UpdatedAtUtc);
}
