using InterviewPrep.Domain.Enums;

namespace InterviewPrep.Application.Features.Topics;

public sealed record TopicDto(
    Guid Id,
    string Name,
    string Category,
    string Description,
    Priority Priority,
    int Progress,
    int ConfidenceLevel,
    int EstimatedMastery,
    string AccentColor,
    Guid? ParentTopicId,
    string? ParentTopicName,
    IReadOnlyList<string> Tags,
    DateTime UpdatedAtUtc);

public sealed record CreateTopicRequest(
    string Name,
    string Category,
    string? Description,
    Priority Priority,
    int Progress,
    int ConfidenceLevel,
    int EstimatedMastery,
    string? AccentColor,
    Guid? ParentTopicId,
    IReadOnlyList<string>? Tags);

public sealed record UpdateTopicRequest(
    string Name,
    string Category,
    string? Description,
    Priority Priority,
    int Progress,
    int ConfidenceLevel,
    int EstimatedMastery,
    string? AccentColor,
    Guid? ParentTopicId,
    IReadOnlyList<string>? Tags);

public sealed record UpdateTopicProgressRequest(int Progress, int ConfidenceLevel);

public interface ITopicService
{
    Task<IReadOnlyList<TopicDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<TopicDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<TopicDto> CreateAsync(CreateTopicRequest request, CancellationToken cancellationToken = default);
    Task<TopicDto> UpdateAsync(Guid id, UpdateTopicRequest request, CancellationToken cancellationToken = default);
    Task<TopicDto> UpdateProgressAsync(Guid id, UpdateTopicProgressRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
