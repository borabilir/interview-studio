namespace InterviewPrep.Application.Features.Notes;

public sealed record NoteSummaryDto(
    Guid Id,
    string Title,
    string Preview,
    bool IsPinned,
    bool IsFavorite,
    string? TopicName,
    IReadOnlyList<string> Tags,
    DateTime UpdatedAtUtc);

public sealed record NoteVersionDto(
    Guid Id,
    int Version,
    string Title,
    string ChangeSummary,
    DateTime CreatedAtUtc);

public sealed record NoteDetailDto(
    Guid Id,
    string Title,
    string Content,
    string? AiSummary,
    string? AiExplanation,
    string? AiImprovementSuggestions,
    bool IsPinned,
    bool IsFavorite,
    int CurrentVersion,
    Guid? TopicId,
    string? TopicName,
    IReadOnlyList<string> Tags,
    IReadOnlyList<NoteVersionDto> Versions,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record CreateNoteRequest(
    string Title,
    string? Content,
    Guid? TopicId,
    bool IsPinned,
    bool IsFavorite,
    IReadOnlyList<string>? Tags);

public sealed record UpdateNoteRequest(
    string Title,
    string? Content,
    Guid? TopicId,
    bool IsPinned,
    bool IsFavorite,
    IReadOnlyList<string>? Tags,
    string? AiSummary,
    string? AiExplanation,
    string? AiImprovementSuggestions,
    string? ChangeSummary);

public interface INoteService
{
    Task<IReadOnlyList<NoteSummaryDto>> GetAllAsync(
        string? search,
        bool pinnedOnly,
        bool favoritesOnly,
        Guid? topicId,
        CancellationToken cancellationToken = default);

    Task<NoteDetailDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<NoteDetailDto> CreateAsync(CreateNoteRequest request, CancellationToken cancellationToken = default);
    Task<NoteDetailDto> UpdateAsync(Guid id, UpdateNoteRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
