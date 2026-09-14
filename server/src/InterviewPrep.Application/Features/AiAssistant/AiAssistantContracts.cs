namespace InterviewPrep.Application.Features.AiAssistant;

public sealed record AiAssistantRequest(
    string Query,
    string? Section,
    string? ProjectId,
    string? PreviousAnswer,
    string? FollowUpQuestion);

public sealed record ProjectDocumentDto(
    string Id,
    string Name,
    string? Subtitle,
    string? Description,
    string Status,
    int SectionCount);

public sealed record ProjectDocumentContent(string Id, string Name, string Content);

public sealed record ProjectDocumentSectionDto(string Id, string Title);

public sealed record ProjectDocumentSectionContent(
    string Id,
    string ProjectId,
    string Title,
    string Content);

public interface IProjectDocumentService
{
    Task<IReadOnlyList<ProjectDocumentDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ProjectDocumentContent?> GetByIdAsync(string projectId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProjectDocumentSectionDto>> GetSectionsAsync(
        string projectId,
        CancellationToken cancellationToken = default);
    Task<ProjectDocumentSectionContent?> GetSectionAsync(
        string projectId,
        string sectionId,
        CancellationToken cancellationToken = default);
}

public interface IAiAssistantService
{
    Task StreamInterviewAnswerAsync(
        string query,
        string? section,
        string? projectId,
        string? previousAnswer,
        string? followUpQuestion,
        Func<string, CancellationToken, Task> onChunk,
        CancellationToken cancellationToken = default);
}
