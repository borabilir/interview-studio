namespace InterviewPrep.Application.Features.SystemDesignScenarios;

public sealed record SystemDesignSummaryDto(
    Guid Id,
    string Title,
    string Problem,
    int Confidence,
    Guid? TopicId,
    string? TopicName,
    IReadOnlyList<string> Tags,
    DateTime UpdatedAtUtc);

public sealed record SystemDesignScenarioDto(
    Guid Id,
    string Title,
    string Problem,
    string Requirements,
    string Constraints,
    string Architecture,
    string? Diagram,
    string Pros,
    string Cons,
    string Scalability,
    string Security,
    string Caching,
    string Monitoring,
    string Logging,
    string MessageQueue,
    string Database,
    string ApiDesign,
    string AiCritique,
    int Confidence,
    Guid? TopicId,
    string? TopicName,
    IReadOnlyList<string> Tags,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record UpsertSystemDesignScenarioRequest(
    string Title,
    string Problem,
    string? Requirements,
    string? Constraints,
    string? Architecture,
    string? Diagram,
    string? Pros,
    string? Cons,
    string? Scalability,
    string? Security,
    string? Caching,
    string? Monitoring,
    string? Logging,
    string? MessageQueue,
    string? Database,
    string? ApiDesign,
    string? AiCritique,
    int Confidence,
    Guid? TopicId,
    IReadOnlyList<string>? Tags);

public interface ISystemDesignScenarioService
{
    Task<IReadOnlyList<SystemDesignSummaryDto>> GetAllAsync(
        string? search,
        Guid? topicId,
        CancellationToken cancellationToken = default);

    Task<SystemDesignScenarioDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<SystemDesignScenarioDto> CreateAsync(UpsertSystemDesignScenarioRequest request, CancellationToken cancellationToken = default);
    Task<SystemDesignScenarioDto> UpdateAsync(Guid id, UpsertSystemDesignScenarioRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
