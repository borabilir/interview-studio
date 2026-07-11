namespace InterviewPrep.Application.Features.Search;

public sealed record SearchResultDto(
    Guid Id,
    string Title,
    string? Description,
    string Kind,
    string Path);

public interface ISearchService
{
    Task<IReadOnlyList<SearchResultDto>> SearchAsync(
        string? query,
        CancellationToken cancellationToken = default);
}
