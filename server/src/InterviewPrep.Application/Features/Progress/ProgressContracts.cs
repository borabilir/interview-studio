namespace InterviewPrep.Application.Features.Progress;

public sealed record ProgressEntryDto(
    Guid Id,
    DateTime ActivityDateUtc,
    int MinutesStudied,
    int QuestionsSolved,
    int CodingAttempts,
    int MockInterviews,
    int ConfidenceScore,
    Guid? TopicId,
    string? TopicName,
    DateTime CreatedAtUtc);

public sealed record CreateProgressEntryRequest(
    DateTime ActivityDateUtc,
    int MinutesStudied,
    int QuestionsSolved,
    int CodingAttempts,
    int MockInterviews,
    int ConfidenceScore,
    Guid? TopicId);

public sealed record ProgressPointDto(DateTime DateUtc, double Value);

public sealed record TopicProgressOverviewDto(
    Guid TopicId,
    string Name,
    int Progress,
    int Confidence,
    double StudiedHours);

public sealed record ProgressTotalsDto(
    int CompletedTopics,
    double HoursStudied,
    int QuestionsSolved,
    int CodingAttempts,
    int MockInterviews,
    double AverageConfidence);

public sealed record ProgressOverviewDto(
    ProgressTotalsDto Totals,
    IReadOnlyList<ProgressPointDto> WeeklyMinutes,
    IReadOnlyList<ProgressPointDto> MonthlyQuestions,
    IReadOnlyList<ProgressPointDto> ConfidenceHistory,
    IReadOnlyList<TopicProgressOverviewDto> StrongestTopics,
    IReadOnlyList<TopicProgressOverviewDto> WeakestTopics,
    IReadOnlyList<Guid> CompletedTopicIds);

public interface IProgressService
{
    Task<IReadOnlyList<ProgressEntryDto>> GetAllAsync(
        DateTime? fromUtc,
        DateTime? toUtc,
        Guid? topicId,
        CancellationToken cancellationToken = default);

    Task<ProgressOverviewDto> GetOverviewAsync(CancellationToken cancellationToken = default);
    Task<ProgressEntryDto> CreateAsync(CreateProgressEntryRequest request, CancellationToken cancellationToken = default);
}
