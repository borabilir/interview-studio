using InterviewPrep.Domain.Enums;

namespace InterviewPrep.Application.Features.CodingQuestions;

public sealed record CodingQuestionSummaryDto(
    Guid Id,
    string Title,
    string Description,
    Difficulty Difficulty,
    string Language,
    int Confidence,
    Guid? TopicId,
    string? TopicName,
    IReadOnlyList<string> Tags,
    int AttemptCount,
    int? BestCorrectnessScore,
    DateTime? LastAttemptedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record CodingAttemptDto(
    Guid Id,
    int AttemptNumber,
    string Solution,
    string Language,
    int CorrectnessScore,
    int ReadabilityScore,
    int PerformanceScore,
    int ArchitectureScore,
    string BestPracticesFeedback,
    string InterviewFeedback,
    string FollowUpQuestions,
    string AlternativeSolution,
    string SeniorLevelImprovements,
    int DurationMinutes,
    DateTime SubmittedAtUtc);

public sealed record CodingQuestionDetailDto(
    Guid Id,
    string Title,
    string Description,
    Difficulty Difficulty,
    string Language,
    string StarterCode,
    string ExpectedSolution,
    string PersonalSolution,
    int Confidence,
    Guid? TopicId,
    string? TopicName,
    IReadOnlyList<string> Tags,
    IReadOnlyList<CodingAttemptDto> Attempts,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record CodeEvaluationRequest(
    int CorrectnessScore,
    int ReadabilityScore,
    int PerformanceScore,
    int ArchitectureScore,
    string? BestPracticesFeedback,
    string? InterviewFeedback,
    string? FollowUpQuestions,
    string? AlternativeSolution,
    string? SeniorLevelImprovements);

public sealed record SubmitCodingAttemptRequest(
    string Solution,
    string? Language,
    int DurationMinutes,
    CodeEvaluationRequest? Evaluation);

public sealed record UpdateCodingDraftRequest(string? PersonalSolution);

public interface ICodingQuestionService
{
    Task<IReadOnlyList<CodingQuestionSummaryDto>> GetAllAsync(
        string? search,
        Difficulty? difficulty,
        string? language,
        Guid? topicId,
        CancellationToken cancellationToken = default);

    Task<CodingQuestionDetailDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<CodingQuestionDetailDto> UpdateDraftAsync(
        Guid questionId,
        UpdateCodingDraftRequest request,
        CancellationToken cancellationToken = default);

    Task<CodingAttemptDto> SubmitAttemptAsync(
        Guid questionId,
        SubmitCodingAttemptRequest request,
        CancellationToken cancellationToken = default);
}
