using InterviewPrep.Domain.Enums;

namespace InterviewPrep.Application.Features.Dashboard;

public sealed record DashboardDto(
    IReadOnlyList<StudyPlanSummaryDto> TodayStudyPlan,
    IReadOnlyList<RecentNoteDto> RecentNotes,
    IReadOnlyList<UpcomingFlashcardDto> UpcomingReviewCards,
    int StudyStreak,
    double ConfidenceScore,
    IReadOnlyList<WeakTopicDto> WeakTopics,
    IReadOnlyList<RecentCodingAttemptDto> RecentlySolvedCodingQuestions,
    IReadOnlyList<AiFeedbackDto> RecentAiFeedback,
    DashboardTotalsDto Totals);

public sealed record StudyPlanSummaryDto(
    Guid Id,
    string Title,
    StudyPlanStatus Status,
    int PlannedMinutes,
    int ActualMinutes,
    IReadOnlyList<StudyPlanItemDto> Items);

public sealed record StudyPlanItemDto(
    Guid Id,
    string Title,
    StudyActivityType ActivityType,
    string? TopicName,
    int PlannedMinutes,
    bool IsCompleted);

public sealed record RecentNoteDto(
    Guid Id,
    string Title,
    string? TopicName,
    bool IsPinned,
    DateTime UpdatedAtUtc);

public sealed record UpcomingFlashcardDto(
    Guid Id,
    string Question,
    string? TopicName,
    Difficulty Difficulty,
    DateTime NextReviewAtUtc);

public sealed record WeakTopicDto(
    Guid Id,
    string Name,
    string Category,
    int Progress,
    int ConfidenceLevel,
    Priority Priority);

public sealed record RecentCodingAttemptDto(
    Guid Id,
    Guid CodingQuestionId,
    string Title,
    string Language,
    Difficulty Difficulty,
    int CorrectnessScore,
    DateTime SubmittedAtUtc);

public sealed record AiFeedbackDto(
    Guid Id,
    string Kind,
    string Title,
    string Feedback,
    DateTime CreatedAtUtc);

public sealed record DashboardTotalsDto(
    int Topics,
    int Notes,
    int QuestionsSolved,
    int ReviewCardsDue,
    int MinutesStudiedThisWeek);

public interface IDashboardService
{
    Task<DashboardDto> GetAsync(CancellationToken cancellationToken = default);
}
