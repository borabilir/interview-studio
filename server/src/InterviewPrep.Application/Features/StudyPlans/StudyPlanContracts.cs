using InterviewPrep.Domain.Enums;

namespace InterviewPrep.Application.Features.StudyPlans;

public sealed record StudyPlanItemDto(
    Guid Id,
    Guid? TopicId,
    string? TopicName,
    string Title,
    StudyActivityType ActivityType,
    Guid? ResourceId,
    int PlannedMinutes,
    bool IsCompleted,
    int SortOrder);

public sealed record StudyPlanDto(
    Guid Id,
    string Title,
    DateTime ScheduledForUtc,
    StudyPlanStatus Status,
    int PlannedMinutes,
    int ActualMinutes,
    string Notes,
    IReadOnlyList<StudyPlanItemDto> Items,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record UpdateStudyPlanItemRequest(bool IsCompleted);

public interface IStudyPlanService
{
    Task<IReadOnlyList<StudyPlanDto>> GetAllAsync(
        DateTime? fromUtc,
        DateTime? toUtc,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StudyPlanDto>> GetTodayAsync(CancellationToken cancellationToken = default);
    Task<StudyPlanDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<StudyPlanDto> UpdateItemAsync(Guid planId, Guid itemId, UpdateStudyPlanItemRequest request, CancellationToken cancellationToken = default);
    Task<StudyPlanDto> ToggleItemAsync(Guid planId, Guid itemId, CancellationToken cancellationToken = default);
}
