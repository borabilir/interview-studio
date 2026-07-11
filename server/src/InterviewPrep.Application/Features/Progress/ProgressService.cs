using InterviewPrep.Application.Abstractions.Persistence;
using InterviewPrep.Application.Common;
using InterviewPrep.Domain.Entities;

namespace InterviewPrep.Application.Features.Progress;

internal sealed class ProgressService(IUnitOfWork unitOfWork) : IProgressService
{
    private readonly IRepository<ProgressEntry> _entries = unitOfWork.Repository<ProgressEntry>();

    public Task<IReadOnlyList<ProgressEntryDto>> GetAllAsync(
        DateTime? fromUtc,
        DateTime? toUtc,
        Guid? topicId,
        CancellationToken cancellationToken = default)
    {
        if (fromUtc.HasValue && toUtc.HasValue && fromUtc > toUtc)
        {
            throw new ArgumentException("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
        }

        return _entries.ListAsync(
            entry => new ProgressEntryDto(
                entry.Id,
                entry.ActivityDateUtc,
                entry.MinutesStudied,
                entry.QuestionsSolved,
                entry.CodingAttempts,
                entry.MockInterviews,
                entry.ConfidenceScore,
                entry.TopicId,
                entry.Topic == null ? null : entry.Topic.Name,
                entry.CreatedAtUtc),
            entry => (!fromUtc.HasValue || entry.ActivityDateUtc >= fromUtc.Value)
                && (!toUtc.HasValue || entry.ActivityDateUtc <= toUtc.Value)
                && (!topicId.HasValue || entry.TopicId == topicId.Value),
            entries => entries.OrderByDescending(entry => entry.ActivityDateUtc),
            cancellationToken: cancellationToken);
    }

    public async Task<ProgressOverviewDto> GetOverviewAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var today = now.Date;
        var weekStart = today.AddDays(-6);
        var monthStart = today.AddDays(-29);

        var entries = await _entries.ListAsync(
            entry => new ProgressAggregateRow(
                entry.ActivityDateUtc,
                entry.MinutesStudied,
                entry.QuestionsSolved,
                entry.CodingAttempts,
                entry.MockInterviews,
                entry.ConfidenceScore,
                entry.TopicId),
            cancellationToken: cancellationToken);

        var topics = await unitOfWork.Repository<Topic>().ListAsync(
            topic => new TopicAggregateRow(topic.Id, topic.Name, topic.Progress, topic.ConfidenceLevel),
            topic => !topic.IsArchived,
            cancellationToken: cancellationToken);

        var studiedByTopic = entries.Where(entry => entry.TopicId.HasValue)
            .GroupBy(entry => entry.TopicId!.Value)
            .ToDictionary(group => group.Key, group => group.Sum(entry => entry.MinutesStudied) / 60d);
        var topicOverview = topics.Select(topic => new TopicProgressOverviewDto(
                topic.Id,
                topic.Name,
                topic.Progress,
                topic.Confidence,
                studiedByTopic.GetValueOrDefault(topic.Id)))
            .ToList();

        var weekly = Enumerable.Range(0, 7)
            .Select(offset => weekStart.AddDays(offset))
            .Select(date => new ProgressPointDto(
                date,
                entries.Where(entry => entry.ActivityDateUtc.Date == date).Sum(entry => entry.MinutesStudied)))
            .ToList();
        var monthlyQuestions = Enumerable.Range(0, 30)
            .Select(offset => monthStart.AddDays(offset))
            .Select(date => new ProgressPointDto(
                date,
                entries.Where(entry => entry.ActivityDateUtc.Date == date).Sum(entry => entry.QuestionsSolved)))
            .ToList();
        var confidence = entries
            .GroupBy(entry => entry.ActivityDateUtc.Date)
            .OrderBy(group => group.Key)
            .Select(group => new ProgressPointDto(group.Key, group.Average(entry => entry.ConfidenceScore)))
            .ToList();

        return new ProgressOverviewDto(
            new ProgressTotalsDto(
                topics.Count(topic => topic.Progress >= 100),
                entries.Sum(entry => entry.MinutesStudied) / 60d,
                entries.Sum(entry => entry.QuestionsSolved),
                entries.Sum(entry => entry.CodingAttempts),
                entries.Sum(entry => entry.MockInterviews),
                entries.Count == 0 ? 0 : Math.Round(entries.Average(entry => entry.ConfidenceScore), 1)),
            weekly,
            monthlyQuestions,
            confidence,
            topicOverview.OrderByDescending(topic => topic.Confidence).ThenByDescending(topic => topic.Progress).Take(5).ToList(),
            topicOverview.OrderBy(topic => topic.Confidence).ThenBy(topic => topic.Progress).Take(5).ToList(),
            topics.Where(topic => topic.Progress >= 100).Select(topic => topic.Id).ToList());
    }

    public async Task<ProgressEntryDto> CreateAsync(
        CreateProgressEntryRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.TopicId is { } topicId
            && await unitOfWork.Repository<Topic>().GetByIdAsync(topicId, cancellationToken) is null)
        {
            throw new NotFoundException(nameof(Topic), topicId);
        }

        var entry = new ProgressEntry
        {
            ActivityDateUtc = request.ActivityDateUtc == default ? DateTime.UtcNow : request.ActivityDateUtc.ToUniversalTime(),
            MinutesStudied = Math.Max(0, request.MinutesStudied),
            QuestionsSolved = Math.Max(0, request.QuestionsSolved),
            CodingAttempts = Math.Max(0, request.CodingAttempts),
            MockInterviews = Math.Max(0, request.MockInterviews),
            ConfidenceScore = Math.Clamp(request.ConfidenceScore, 0, 100),
            TopicId = request.TopicId
        };
        await _entries.AddAsync(entry, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return (await GetAllAsync(entry.ActivityDateUtc.AddTicks(-1), entry.ActivityDateUtc.AddTicks(1), entry.TopicId, cancellationToken))
            .Single(item => item.Id == entry.Id);
    }

    private sealed record ProgressAggregateRow(
        DateTime ActivityDateUtc,
        int MinutesStudied,
        int QuestionsSolved,
        int CodingAttempts,
        int MockInterviews,
        int ConfidenceScore,
        Guid? TopicId);

    private sealed record TopicAggregateRow(Guid Id, string Name, int Progress, int Confidence);
}
