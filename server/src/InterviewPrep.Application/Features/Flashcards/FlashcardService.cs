using System.Linq.Expressions;
using InterviewPrep.Application.Abstractions.Persistence;
using InterviewPrep.Application.Common;
using InterviewPrep.Domain.Entities;

namespace InterviewPrep.Application.Features.Flashcards;

internal sealed class FlashcardService(IUnitOfWork unitOfWork) : IFlashcardService
{
    private readonly IRepository<Flashcard> _flashcards = unitOfWork.Repository<Flashcard>();

    public Task<IReadOnlyList<FlashcardDto>> GetAllAsync(
        string? search,
        bool dueOnly,
        Guid? topicId,
        string? tag,
        CancellationToken cancellationToken = default)
    {
        var term = search?.Trim();
        var tagTerm = tag?.Trim();
        var now = DateTime.UtcNow;
        return _flashcards.ListAsync(
            Projection,
            card => (string.IsNullOrEmpty(term)
                    || card.Question.Contains(term)
                    || card.Answer.Contains(term)
                    || (card.Why != null && card.Why.Contains(term))
                    || (card.ProductionExample != null && card.ProductionExample.Contains(term))
                    || (card.BankingExample != null && card.BankingExample.Contains(term))
                    || (card.InterviewTip != null && card.InterviewTip.Contains(term))
                    || (card.Topic != null && card.Topic.Name.Contains(term))
                    || card.FlashcardTags.Any(join => join.Tag.Name.Contains(term)))
                && (!dueOnly || card.NextReviewAtUtc <= now)
                && (!topicId.HasValue || card.TopicId == topicId.Value)
                && (string.IsNullOrEmpty(tagTerm) || card.FlashcardTags.Any(join => join.Tag.Name == tagTerm)),
            cards => cards.OrderBy(card => card.NextReviewAtUtc).ThenBy(card => card.Difficulty),
            cancellationToken: cancellationToken);
    }

    public async Task<FlashcardDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var card = await _flashcards.FirstOrDefaultAsync(
            candidate => candidate.Id == id,
            Projection,
            cancellationToken);
        return card ?? throw new NotFoundException(nameof(Flashcard), id);
    }

    public async Task<FlashcardDto> CreateAsync(
        CreateFlashcardRequest request,
        CancellationToken cancellationToken = default)
    {
        Validate(request.Question, request.Answer);
        await EnsureTopicExistsAsync(request.TopicId, cancellationToken);

        var card = new Flashcard
        {
            Question = request.Question.Trim(),
            Answer = request.Answer.Trim(),
            Why = NormalizeOptional(request.Why),
            ProductionExample = NormalizeOptional(request.ProductionExample),
            BankingExample = NormalizeOptional(request.BankingExample),
            InterviewTip = NormalizeOptional(request.InterviewTip),
            InterviewFrequency = request.InterviewFrequency,
            Difficulty = request.Difficulty,
            TopicId = request.TopicId,
            NextReviewAtUtc = DateTime.UtcNow,
            EaseFactor = 2.5
        };

        await _flashcards.AddAsync(card, cancellationToken);
        await AddTagsAsync(card.Id, request.Tags, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(card.Id, cancellationToken);
    }

    public async Task<FlashcardDto> UpdateAsync(
        Guid id,
        UpdateFlashcardRequest request,
        CancellationToken cancellationToken = default)
    {
        Validate(request.Question, request.Answer);
        await EnsureTopicExistsAsync(request.TopicId, cancellationToken);
        var card = await _flashcards.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(nameof(Flashcard), id);

        card.Question = request.Question.Trim();
        card.Answer = request.Answer.Trim();
        card.Why = NormalizeOptional(request.Why);
        card.ProductionExample = NormalizeOptional(request.ProductionExample);
        card.BankingExample = NormalizeOptional(request.BankingExample);
        card.InterviewTip = NormalizeOptional(request.InterviewTip);
        card.InterviewFrequency = request.InterviewFrequency;
        card.Difficulty = request.Difficulty;
        card.TopicId = request.TopicId;

        var joins = await unitOfWork.Repository<FlashcardTag>().ListTrackedAsync(
            join => join.FlashcardId == id,
            cancellationToken);
        foreach (var join in joins)
        {
            unitOfWork.Repository<FlashcardTag>().Remove(join);
        }

        await AddTagsAsync(card.Id, request.Tags, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(card.Id, cancellationToken);
    }

    public async Task<FlashcardDto> ReviewAsync(
        Guid id,
        ReviewFlashcardRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!Enum.IsDefined(request.Rating))
        {
            throw new ArgumentException("Geçerli bir tekrar değerlendirmesi seçilmelidir.", nameof(request));
        }

        var card = await _flashcards.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(nameof(Flashcard), id);
        var now = DateTime.UtcNow;

        switch (request.Rating)
        {
            case FlashcardReviewRating.Again:
                card.RepetitionCount = 0;
                card.IntervalDays = 0;
                card.EaseFactor = Math.Max(1.3, card.EaseFactor - 0.2);
                card.NextReviewAtUtc = now.AddMinutes(10);
                break;
            case FlashcardReviewRating.Hard:
                card.RepetitionCount++;
                card.IntervalDays = Math.Max(1, (int)Math.Ceiling(Math.Max(1, card.IntervalDays) * 1.2));
                card.EaseFactor = Math.Max(1.3, card.EaseFactor - 0.15);
                card.NextReviewAtUtc = now.AddDays(card.IntervalDays);
                card.CorrectReviewCount++;
                break;
            case FlashcardReviewRating.Good:
                card.RepetitionCount++;
                card.IntervalDays = card.RepetitionCount switch
                {
                    1 => 1,
                    2 => 3,
                    _ => Math.Max(1, (int)Math.Round(Math.Max(1, card.IntervalDays) * card.EaseFactor))
                };
                card.NextReviewAtUtc = now.AddDays(card.IntervalDays);
                card.CorrectReviewCount++;
                break;
            case FlashcardReviewRating.Easy:
                card.RepetitionCount++;
                card.EaseFactor = Math.Min(3.0, card.EaseFactor + 0.15);
                card.IntervalDays = card.RepetitionCount == 1
                    ? 4
                    : Math.Max(4, (int)Math.Round(Math.Max(1, card.IntervalDays) * card.EaseFactor * 1.3));
                card.NextReviewAtUtc = now.AddDays(card.IntervalDays);
                card.CorrectReviewCount++;
                break;
        }

        card.LastReviewedAtUtc = now;
        card.ReviewCount++;
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(card.Id, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var card = await _flashcards.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(nameof(Flashcard), id);
        _flashcards.Remove(card);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureTopicExistsAsync(Guid? topicId, CancellationToken cancellationToken)
    {
        if (topicId is { } id && await unitOfWork.Repository<Topic>().GetByIdAsync(id, cancellationToken) is null)
        {
            throw new NotFoundException(nameof(Topic), id);
        }
    }

    private async Task AddTagsAsync(
        Guid flashcardId,
        IReadOnlyList<string>? requestedTags,
        CancellationToken cancellationToken)
    {
        var names = requestedTags?.Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList() ?? [];
        if (names.Count == 0)
        {
            return;
        }

        var existing = await unitOfWork.Repository<Tag>().ListTrackedAsync(
            tag => names.Contains(tag.Name),
            cancellationToken);
        foreach (var name in names)
        {
            var tag = existing.FirstOrDefault(item => string.Equals(item.Name, name, StringComparison.OrdinalIgnoreCase));
            if (tag is null)
            {
                tag = new Tag
                {
                    Name = name,
                    Slug = string.Join('-', name.ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries))
                };
                await unitOfWork.Repository<Tag>().AddAsync(tag, cancellationToken);
            }

            await unitOfWork.Repository<FlashcardTag>().AddAsync(
                new FlashcardTag { FlashcardId = flashcardId, TagId = tag.Id },
                cancellationToken);
        }
    }

    private static void Validate(string question, string answer)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(question);
        ArgumentException.ThrowIfNullOrWhiteSpace(answer);
    }

    private static string? NormalizeOptional(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    private static readonly Expression<Func<Flashcard, FlashcardDto>> Projection = card => new FlashcardDto(
        card.Id,
        card.Question,
        card.Answer,
        card.Why,
        card.ProductionExample,
        card.BankingExample,
        card.InterviewTip,
        card.InterviewFrequency,
        card.Difficulty,
        card.TopicId,
        card.Topic == null ? null : card.Topic.Name,
        card.FlashcardTags.OrderBy(join => join.Tag.Name).Select(join => join.Tag.Name).ToList(),
        card.NextReviewAtUtc,
        card.LastReviewedAtUtc,
        card.IntervalDays,
        card.RepetitionCount,
        card.EaseFactor,
        card.ReviewCount,
        card.CorrectReviewCount,
        card.CreatedAtUtc,
        card.UpdatedAtUtc);
}
