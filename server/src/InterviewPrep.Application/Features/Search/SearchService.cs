using InterviewPrep.Application.Abstractions.Persistence;
using InterviewPrep.Domain.Entities;

namespace InterviewPrep.Application.Features.Search;

internal sealed class SearchService(IUnitOfWork unitOfWork) : ISearchService
{
    public async Task<IReadOnlyList<SearchResultDto>> SearchAsync(
        string? query,
        CancellationToken cancellationToken = default)
    {
        var term = query?.Trim();
        if (string.IsNullOrWhiteSpace(term))
        {
            return [];
        }

        var topics = await unitOfWork.Repository<Topic>().ListAsync(
            topic => new TopicSearchCandidate(
                topic.Id,
                topic.Name,
                topic.Category,
                topic.Description,
                topic.TopicTags.Select(join => join.Tag.Name).ToList()),
            topic => !topic.IsArchived,
            topics => topics.OrderBy(topic => topic.ParentTopicId.HasValue)
                .ThenBy(topic => topic.SortOrder)
                .ThenBy(topic => topic.Name),
            cancellationToken: cancellationToken);

        var topicResults = topics
            .Select(topic => new ScoredSearchResult(
                new SearchResultDto(
                    topic.Id,
                    topic.Name,
                    topic.Description,
                    "Topic",
                    "/topics/" + topic.Id),
                ScoreTopic(term, topic)))
            .Where(result => result.Score > 0);

        var flashcards = await unitOfWork.Repository<Flashcard>().ListAsync(
            card => new FlashcardSearchCandidate(
                card.Id,
                card.Question,
                card.Answer,
                card.Why,
                card.ProductionExample,
                card.BankingExample,
                card.InterviewTip,
                card.Topic == null ? null : card.Topic.Name,
                card.FlashcardTags.Select(join => join.Tag.Name).ToList()),
            orderBy: cards => cards.OrderByDescending(card => card.CreatedAtUtc),
            cancellationToken: cancellationToken);

        var flashcardResults = flashcards
            .Select(card => new ScoredSearchResult(
                new SearchResultDto(
                    card.Id,
                    card.Question,
                    Preview(card.Answer),
                    "Flashcard",
                    "/flashcards?id=" + card.Id),
                ScoreFlashcard(term, card)))
            .Where(result => result.Score > 0);

        return topicResults
            .Concat(flashcardResults)
            .OrderByDescending(result => result.Score)
            .ThenBy(result => result.Result.Kind)
            .ThenBy(result => result.Result.Title)
            .Take(40)
            .Select(result => result.Result)
            .ToList();
    }

    private static int ScoreTopic(string term, TopicSearchCandidate topic) =>
        (ScoreText(term, topic.Name) * 5)
        + (ScoreText(term, topic.Category) * 2)
        + ScoreText(term, topic.Description)
        + (topic.Tags.Select(tag => ScoreText(term, tag)).DefaultIfEmpty(0).Max() * 3);

    private static int ScoreFlashcard(string term, FlashcardSearchCandidate card) =>
        (ScoreText(term, card.Question) * 8)
        + (card.Tags.Select(tag => ScoreText(term, tag)).DefaultIfEmpty(0).Max() * 3)
        + (ScoreText(term, card.TopicName) * 2)
        + ScoreText(term, card.Answer)
        + ScoreText(term, card.Why)
        + ScoreText(term, card.ProductionExample)
        + ScoreText(term, card.BankingExample)
        + ScoreText(term, card.InterviewTip);

    private static int ScoreText(string term, string? value)
    {
        if (string.IsNullOrWhiteSpace(term) || string.IsNullOrWhiteSpace(value))
        {
            return 0;
        }

        var normalizedTerm = NormalizeSearchText(term);
        var normalizedValue = NormalizeSearchText(value);

        if (normalizedValue.Equals(normalizedTerm, StringComparison.OrdinalIgnoreCase))
        {
            return 100;
        }

        if (normalizedValue.StartsWith(normalizedTerm, StringComparison.OrdinalIgnoreCase))
        {
            return 90;
        }

        if (normalizedValue.Contains(normalizedTerm, StringComparison.OrdinalIgnoreCase))
        {
            return 75;
        }

        var tokens = normalizedTerm.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return tokens.Length > 1 && tokens.All(token => normalizedValue.Contains(token, StringComparison.OrdinalIgnoreCase))
            ? 35
            : 0;
    }

    private static string NormalizeSearchText(string value) =>
        value
            .Replace('-', ' ')
            .Replace('_', ' ')
            .Replace('/', ' ')
            .Replace('.', ' ');

    private static string Preview(string value) =>
        value.Length > 160 ? value[..160] : value;

    private sealed record ScoredSearchResult(SearchResultDto Result, int Score);

    private sealed record TopicSearchCandidate(
        Guid Id,
        string Name,
        string Category,
        string Description,
        IReadOnlyList<string> Tags);

    private sealed record FlashcardSearchCandidate(
        Guid Id,
        string Question,
        string Answer,
        string? Why,
        string? ProductionExample,
        string? BankingExample,
        string? InterviewTip,
        string? TopicName,
        IReadOnlyList<string> Tags);
}
