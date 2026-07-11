using InterviewPrep.Application.Abstractions.Persistence;
using InterviewPrep.Application.Common;
using InterviewPrep.Domain.Entities;
using InterviewPrep.Domain.Enums;

namespace InterviewPrep.Application.Features.CodingQuestions;

internal sealed class CodingQuestionService(IUnitOfWork unitOfWork) : ICodingQuestionService
{
    private readonly IRepository<CodingQuestion> _questions = unitOfWork.Repository<CodingQuestion>();

    public Task<IReadOnlyList<CodingQuestionSummaryDto>> GetAllAsync(
        string? search,
        Difficulty? difficulty,
        string? language,
        Guid? topicId,
        CancellationToken cancellationToken = default)
    {
        var term = search?.Trim();
        var normalizedLanguage = language?.Trim();
        return _questions.ListAsync(
            question => new CodingQuestionSummaryDto(
                question.Id,
                question.Title,
                question.Description,
                question.Difficulty,
                question.Language,
                question.Confidence,
                question.TopicId,
                question.Topic == null ? null : question.Topic.Name,
                question.CodingQuestionTags.OrderBy(join => join.Tag.Name).Select(join => join.Tag.Name).ToList(),
                question.Attempts.Count,
                question.Attempts.Select(attempt => (int?)attempt.CorrectnessScore).Max(),
                question.Attempts.Select(attempt => (DateTime?)attempt.SubmittedAtUtc).Max(),
                question.UpdatedAtUtc),
            question => (string.IsNullOrEmpty(term)
                    || question.Title.Contains(term)
                    || question.Description.Contains(term))
                && (!difficulty.HasValue || question.Difficulty == difficulty.Value)
                && (string.IsNullOrEmpty(normalizedLanguage) || question.Language == normalizedLanguage)
                && (!topicId.HasValue || question.TopicId == topicId.Value),
            questions => questions.OrderByDescending(question => question.Difficulty).ThenBy(question => question.Title),
            cancellationToken: cancellationToken);
    }

    public async Task<CodingQuestionDetailDto> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var question = await _questions.FirstOrDefaultAsync(
            candidate => candidate.Id == id,
            candidate => new CodingQuestionDetailDto(
                candidate.Id,
                candidate.Title,
                candidate.Description,
                candidate.Difficulty,
                candidate.Language,
                candidate.StarterCode,
                candidate.ExpectedSolution,
                candidate.PersonalSolution,
                candidate.Confidence,
                candidate.TopicId,
                candidate.Topic == null ? null : candidate.Topic.Name,
                candidate.CodingQuestionTags.OrderBy(join => join.Tag.Name).Select(join => join.Tag.Name).ToList(),
                candidate.Attempts.OrderByDescending(attempt => attempt.AttemptNumber)
                    .Select(attempt => new CodingAttemptDto(
                        attempt.Id,
                        attempt.AttemptNumber,
                        attempt.Solution,
                        attempt.Language,
                        attempt.CorrectnessScore,
                        attempt.ReadabilityScore,
                        attempt.PerformanceScore,
                        attempt.ArchitectureScore,
                        attempt.BestPracticesFeedback,
                        attempt.InterviewFeedback,
                        attempt.FollowUpQuestions,
                        attempt.AlternativeSolution,
                        attempt.SeniorLevelImprovements,
                        attempt.DurationMinutes,
                        attempt.SubmittedAtUtc))
                    .ToList(),
                candidate.CreatedAtUtc,
                candidate.UpdatedAtUtc),
            cancellationToken);

        return question ?? throw new NotFoundException(nameof(CodingQuestion), id);
    }

    public async Task<CodingQuestionDetailDto> UpdateDraftAsync(
        Guid questionId,
        UpdateCodingDraftRequest request,
        CancellationToken cancellationToken = default)
    {
        var question = await _questions.GetByIdAsync(questionId, cancellationToken)
            ?? throw new NotFoundException(nameof(CodingQuestion), questionId);

        question.PersonalSolution = request.PersonalSolution ?? string.Empty;
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(questionId, cancellationToken);
    }

    public async Task<CodingAttemptDto> SubmitAttemptAsync(
        Guid questionId,
        SubmitCodingAttemptRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(request.Solution);
        var question = await _questions.GetByIdAsync(questionId, cancellationToken)
            ?? throw new NotFoundException(nameof(CodingQuestion), questionId);

        var attempts = await unitOfWork.Repository<CodingAttempt>().ListTrackedAsync(
            attempt => attempt.CodingQuestionId == questionId,
            cancellationToken);
        var evaluation = request.Evaluation ?? CreateLocalEvaluation(request.Solution);

        var attempt = new CodingAttempt
        {
            CodingQuestionId = questionId,
            AttemptNumber = attempts.Count == 0 ? 1 : attempts.Max(item => item.AttemptNumber) + 1,
            Solution = request.Solution,
            Language = string.IsNullOrWhiteSpace(request.Language) ? question.Language : request.Language.Trim(),
            CorrectnessScore = ClampScore(evaluation.CorrectnessScore),
            ReadabilityScore = ClampScore(evaluation.ReadabilityScore),
            PerformanceScore = ClampScore(evaluation.PerformanceScore),
            ArchitectureScore = ClampScore(evaluation.ArchitectureScore),
            BestPracticesFeedback = evaluation.BestPracticesFeedback?.Trim() ?? string.Empty,
            InterviewFeedback = evaluation.InterviewFeedback?.Trim() ?? string.Empty,
            FollowUpQuestions = evaluation.FollowUpQuestions?.Trim() ?? string.Empty,
            AlternativeSolution = evaluation.AlternativeSolution?.Trim() ?? string.Empty,
            SeniorLevelImprovements = evaluation.SeniorLevelImprovements?.Trim() ?? string.Empty,
            DurationMinutes = Math.Max(0, request.DurationMinutes),
            SubmittedAtUtc = DateTime.UtcNow
        };

        await unitOfWork.Repository<CodingAttempt>().AddAsync(attempt, cancellationToken);
        question.Confidence = Math.Clamp((question.Confidence + attempt.CorrectnessScore) / 2, 0, 100);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Map(attempt);
    }

    private static CodeEvaluationRequest CreateLocalEvaluation(string solution)
    {
        var hasContent = solution.Trim().Length >= 24;
        var score = hasContent ? 70 : 40;
        return new CodeEvaluationRequest(
            score,
            hasContent ? 72 : 45,
            hasContent ? 68 : 40,
            hasContent ? 65 : 40,
            "AI sağlayıcısı bağlı değil. Sonuç, yerel temel kontrolden üretildi.",
            "Çözüm kaydedildi. Ayrıntılı mülakat geri bildirimi için AI provider yapılandırılmalıdır.",
            "Çözümün zaman ve alan karmaşıklığı nedir? Edge case'leri nasıl ele alırsın?",
            string.Empty,
            "Girdi sözleşmesini, hata davranışını ve ölçüm yaklaşımını açıkça belirt.");
    }

    private static CodingAttemptDto Map(CodingAttempt attempt) => new(
        attempt.Id,
        attempt.AttemptNumber,
        attempt.Solution,
        attempt.Language,
        attempt.CorrectnessScore,
        attempt.ReadabilityScore,
        attempt.PerformanceScore,
        attempt.ArchitectureScore,
        attempt.BestPracticesFeedback,
        attempt.InterviewFeedback,
        attempt.FollowUpQuestions,
        attempt.AlternativeSolution,
        attempt.SeniorLevelImprovements,
        attempt.DurationMinutes,
        attempt.SubmittedAtUtc);

    private static int ClampScore(int value) => Math.Clamp(value, 0, 100);
}
