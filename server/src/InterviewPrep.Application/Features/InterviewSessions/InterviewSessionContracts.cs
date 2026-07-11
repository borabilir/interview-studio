using InterviewPrep.Domain.Enums;

namespace InterviewPrep.Application.Features.InterviewSessions;

public sealed record InterviewSessionSummaryDto(
    Guid Id,
    string Title,
    InterviewType Type,
    SessionStatus Status,
    int QuestionCount,
    int AnsweredQuestionCount,
    int? OverallScore,
    DateTime? StartedAtUtc,
    DateTime? CompletedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record InterviewAnswerDto(
    Guid Id,
    int Sequence,
    string Question,
    string Answer,
    int TechnicalAccuracyScore,
    int CommunicationScore,
    int ConfidenceScore,
    int StructureScore,
    string MissingDetails,
    string Feedback,
    string FollowUpQuestions,
    DateTime UpdatedAtUtc);

public sealed record InterviewSessionDetailDto(
    Guid Id,
    string Title,
    InterviewType Type,
    SessionStatus Status,
    DateTime? StartedAtUtc,
    DateTime? CompletedAtUtc,
    int TechnicalAccuracyScore,
    int CommunicationScore,
    int ConfidenceScore,
    int StructureScore,
    string SummaryFeedback,
    IReadOnlyList<InterviewAnswerDto> Answers,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record CreateInterviewSessionRequest(
    string Title,
    InterviewType Type,
    IReadOnlyList<string> Questions,
    bool StartImmediately);

public sealed record InterviewAnswerEvaluationRequest(
    int TechnicalAccuracyScore,
    int CommunicationScore,
    int ConfidenceScore,
    int StructureScore,
    string? MissingDetails,
    string? Feedback,
    string? FollowUpQuestions);

public sealed record SubmitInterviewAnswerRequest(
    int Sequence,
    string? Question,
    string Answer,
    InterviewAnswerEvaluationRequest? Evaluation);

public sealed record CompleteInterviewSessionRequest(string? SummaryFeedback);

public interface IInterviewSessionService
{
    Task<IReadOnlyList<InterviewSessionSummaryDto>> GetAllAsync(
        InterviewType? type,
        SessionStatus? status,
        CancellationToken cancellationToken = default);

    Task<InterviewSessionDetailDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<InterviewSessionDetailDto> CreateAsync(CreateInterviewSessionRequest request, CancellationToken cancellationToken = default);
    Task<InterviewAnswerDto> SubmitAnswerAsync(Guid id, SubmitInterviewAnswerRequest request, CancellationToken cancellationToken = default);
    Task<InterviewSessionDetailDto> CompleteAsync(Guid id, CompleteInterviewSessionRequest? request, CancellationToken cancellationToken = default);
}
