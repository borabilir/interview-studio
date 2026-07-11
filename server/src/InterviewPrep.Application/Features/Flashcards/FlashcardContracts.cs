using InterviewPrep.Domain.Enums;

namespace InterviewPrep.Application.Features.Flashcards;

public enum FlashcardReviewRating
{
    Again = 1,
    Hard = 2,
    Good = 3,
    Easy = 4
}

public sealed record FlashcardDto(
    Guid Id,
    string Question,
    string Answer,
    string? Why,
    string? ProductionExample,
    string? BankingExample,
    string? InterviewTip,
    InterviewFrequency? InterviewFrequency,
    Difficulty Difficulty,
    Guid? TopicId,
    string? TopicName,
    IReadOnlyList<string> Tags,
    DateTime NextReviewAtUtc,
    DateTime? LastReviewedAtUtc,
    int IntervalDays,
    int RepetitionCount,
    double EaseFactor,
    int ReviewCount,
    int CorrectReviewCount,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed class CreateFlashcardRequest
{
    public string Question { get; init; } = string.Empty;
    public string Answer { get; init; } = string.Empty;
    public string? Why { get; init; }
    public string? ProductionExample { get; init; }
    public string? BankingExample { get; init; }
    public string? InterviewTip { get; init; }
    public InterviewFrequency? InterviewFrequency { get; init; }
    public Difficulty Difficulty { get; init; } = Difficulty.Medium;
    public Guid? TopicId { get; init; }
    public IReadOnlyList<string>? Tags { get; init; }
}

public sealed class UpdateFlashcardRequest
{
    public string Question { get; init; } = string.Empty;
    public string Answer { get; init; } = string.Empty;
    public string? Why { get; init; }
    public string? ProductionExample { get; init; }
    public string? BankingExample { get; init; }
    public string? InterviewTip { get; init; }
    public InterviewFrequency? InterviewFrequency { get; init; }
    public Difficulty Difficulty { get; init; } = Difficulty.Medium;
    public Guid? TopicId { get; init; }
    public IReadOnlyList<string>? Tags { get; init; }
}

public sealed record ReviewFlashcardRequest(FlashcardReviewRating Rating);

public interface IFlashcardService
{
    Task<IReadOnlyList<FlashcardDto>> GetAllAsync(
        string? search,
        bool dueOnly,
        Guid? topicId,
        string? tag,
        CancellationToken cancellationToken = default);

    Task<FlashcardDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<FlashcardDto> CreateAsync(CreateFlashcardRequest request, CancellationToken cancellationToken = default);
    Task<FlashcardDto> UpdateAsync(Guid id, UpdateFlashcardRequest request, CancellationToken cancellationToken = default);
    Task<FlashcardDto> ReviewAsync(Guid id, ReviewFlashcardRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
