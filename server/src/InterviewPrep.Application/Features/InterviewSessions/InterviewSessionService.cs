using InterviewPrep.Application.Abstractions.Persistence;
using InterviewPrep.Application.Common;
using InterviewPrep.Domain.Entities;
using InterviewPrep.Domain.Enums;

namespace InterviewPrep.Application.Features.InterviewSessions;

internal sealed class InterviewSessionService(IUnitOfWork unitOfWork) : IInterviewSessionService
{
    private readonly IRepository<InterviewSession> _sessions = unitOfWork.Repository<InterviewSession>();
    private readonly IRepository<InterviewAnswer> _answers = unitOfWork.Repository<InterviewAnswer>();

    public Task<IReadOnlyList<InterviewSessionSummaryDto>> GetAllAsync(
        InterviewType? type,
        SessionStatus? status,
        CancellationToken cancellationToken = default) =>
        _sessions.ListAsync(
            session => new InterviewSessionSummaryDto(
                session.Id,
                session.Title,
                session.Type,
                session.Status,
                session.Answers.Count,
                session.Answers.Count(answer => answer.Answer != string.Empty),
                session.Status == SessionStatus.Completed
                    ? (session.TechnicalAccuracyScore + session.CommunicationScore + session.ConfidenceScore + session.StructureScore) / 4
                    : null,
                session.StartedAtUtc,
                session.CompletedAtUtc,
                session.UpdatedAtUtc),
            session => (!type.HasValue || session.Type == type.Value)
                && (!status.HasValue || session.Status == status.Value),
            sessions => sessions.OrderByDescending(session => session.UpdatedAtUtc),
            cancellationToken: cancellationToken);

    public async Task<InterviewSessionDetailDto> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var session = await _sessions.FirstOrDefaultAsync(
            candidate => candidate.Id == id,
            candidate => new InterviewSessionDetailDto(
                candidate.Id,
                candidate.Title,
                candidate.Type,
                candidate.Status,
                candidate.StartedAtUtc,
                candidate.CompletedAtUtc,
                candidate.TechnicalAccuracyScore,
                candidate.CommunicationScore,
                candidate.ConfidenceScore,
                candidate.StructureScore,
                candidate.SummaryFeedback,
                candidate.Answers.OrderBy(answer => answer.Sequence)
                    .Select(answer => new InterviewAnswerDto(
                        answer.Id,
                        answer.Sequence,
                        answer.Question,
                        answer.Answer,
                        answer.TechnicalAccuracyScore,
                        answer.CommunicationScore,
                        answer.ConfidenceScore,
                        answer.StructureScore,
                        answer.MissingDetails,
                        answer.Feedback,
                        answer.FollowUpQuestions,
                        answer.UpdatedAtUtc))
                    .ToList(),
                candidate.CreatedAtUtc,
                candidate.UpdatedAtUtc),
            cancellationToken);

        return session ?? throw new NotFoundException(nameof(InterviewSession), id);
    }

    public async Task<InterviewSessionDetailDto> CreateAsync(
        CreateInterviewSessionRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(request.Title);
        var questions = request.Questions
            .Where(question => !string.IsNullOrWhiteSpace(question))
            .Select(question => question.Trim())
            .ToList();
        if (questions.Count == 0)
        {
            throw new ArgumentException("En az bir mülakat sorusu eklenmelidir.", nameof(request));
        }

        var session = new InterviewSession
        {
            Title = request.Title.Trim(),
            Type = request.Type,
            Status = request.StartImmediately ? SessionStatus.InProgress : SessionStatus.Planned,
            StartedAtUtc = request.StartImmediately ? DateTime.UtcNow : null
        };
        await _sessions.AddAsync(session, cancellationToken);

        for (var index = 0; index < questions.Count; index++)
        {
            await _answers.AddAsync(new InterviewAnswer
            {
                InterviewSessionId = session.Id,
                Sequence = index + 1,
                Question = questions[index]
            }, cancellationToken);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(session.Id, cancellationToken);
    }

    public async Task<InterviewAnswerDto> SubmitAnswerAsync(
        Guid id,
        SubmitInterviewAnswerRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(request.Answer);
        if (request.Sequence <= 0)
        {
            throw new ArgumentException("Soru sırası 1 veya daha büyük olmalıdır.", nameof(request));
        }

        var session = await _sessions.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(nameof(InterviewSession), id);
        if (session.Status is SessionStatus.Completed or SessionStatus.Abandoned)
        {
            throw new ArgumentException("Tamamlanmış veya bırakılmış bir mülakat oturumu değiştirilemez.", nameof(id));
        }

        if (session.Status == SessionStatus.Planned)
        {
            session.Status = SessionStatus.InProgress;
            session.StartedAtUtc = DateTime.UtcNow;
        }

        var answer = (await _answers.ListTrackedAsync(
            candidate => candidate.InterviewSessionId == id && candidate.Sequence == request.Sequence,
            cancellationToken)).SingleOrDefault();
        if (answer is null)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(request.Question);
            answer = new InterviewAnswer
            {
                InterviewSessionId = id,
                Sequence = request.Sequence,
                Question = request.Question!.Trim()
            };
            await _answers.AddAsync(answer, cancellationToken);
        }

        var evaluation = request.Evaluation ?? CreateLocalEvaluation(request.Answer);
        answer.Answer = request.Answer.Trim();
        if (!string.IsNullOrWhiteSpace(request.Question))
        {
            answer.Question = request.Question.Trim();
        }
        answer.TechnicalAccuracyScore = Clamp(evaluation.TechnicalAccuracyScore);
        answer.CommunicationScore = Clamp(evaluation.CommunicationScore);
        answer.ConfidenceScore = Clamp(evaluation.ConfidenceScore);
        answer.StructureScore = Clamp(evaluation.StructureScore);
        answer.MissingDetails = evaluation.MissingDetails?.Trim() ?? string.Empty;
        answer.Feedback = evaluation.Feedback?.Trim() ?? string.Empty;
        answer.FollowUpQuestions = evaluation.FollowUpQuestions?.Trim() ?? string.Empty;

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Map(answer);
    }

    public async Task<InterviewSessionDetailDto> CompleteAsync(
        Guid id,
        CompleteInterviewSessionRequest? request,
        CancellationToken cancellationToken = default)
    {
        var session = await _sessions.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(nameof(InterviewSession), id);
        var answers = await _answers.ListTrackedAsync(
            answer => answer.InterviewSessionId == id && answer.Answer != string.Empty,
            cancellationToken);
        if (answers.Count == 0)
        {
            throw new ArgumentException("Oturumu tamamlamak için en az bir soru yanıtlanmalıdır.", nameof(id));
        }

        session.TechnicalAccuracyScore = (int)Math.Round(answers.Average(answer => answer.TechnicalAccuracyScore));
        session.CommunicationScore = (int)Math.Round(answers.Average(answer => answer.CommunicationScore));
        session.ConfidenceScore = (int)Math.Round(answers.Average(answer => answer.ConfidenceScore));
        session.StructureScore = (int)Math.Round(answers.Average(answer => answer.StructureScore));
        session.Status = SessionStatus.Completed;
        session.StartedAtUtc ??= DateTime.UtcNow;
        session.CompletedAtUtc = DateTime.UtcNow;
        session.SummaryFeedback = string.IsNullOrWhiteSpace(request?.SummaryFeedback)
            ? "Oturum tamamlandı. Güçlü yanlarını korurken düşük puanlı değerlendirme alanlarına odaklan."
            : request.SummaryFeedback.Trim();

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    private static InterviewAnswerEvaluationRequest CreateLocalEvaluation(string answer)
    {
        var wordCount = answer.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        var baseScore = Math.Clamp(45 + wordCount, 45, 78);
        return new InterviewAnswerEvaluationRequest(
            baseScore,
            Math.Min(80, baseScore + 3),
            Math.Min(78, baseScore + 1),
            Math.Min(82, baseScore + 4),
            "Varsayımlar, trade-off'lar ve somut örnekler ayrıca kontrol edilmelidir.",
            "Yanıt kaydedildi. Ayrıntılı değerlendirme için AI provider yapılandırılmalıdır.",
            "Bu yaklaşım hangi ölçekte zorlanır? Başka hangi çözümü değerlendirirdin?");
    }

    private static InterviewAnswerDto Map(InterviewAnswer answer) => new(
        answer.Id,
        answer.Sequence,
        answer.Question,
        answer.Answer,
        answer.TechnicalAccuracyScore,
        answer.CommunicationScore,
        answer.ConfidenceScore,
        answer.StructureScore,
        answer.MissingDetails,
        answer.Feedback,
        answer.FollowUpQuestions,
        answer.UpdatedAtUtc);

    private static int Clamp(int score) => Math.Clamp(score, 0, 100);
}
