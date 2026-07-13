using System.Linq.Expressions;
using InterviewPrep.Application.Abstractions.Persistence;
using InterviewPrep.Application.Common;
using InterviewPrep.Domain.Entities;

namespace InterviewPrep.Application.Features.SystemDesignScenarios;

internal sealed class SystemDesignScenarioService(IUnitOfWork unitOfWork) : ISystemDesignScenarioService
{
    private readonly IRepository<SystemDesignScenario> _scenarios = unitOfWork.Repository<SystemDesignScenario>();

    public Task<IReadOnlyList<SystemDesignSummaryDto>> GetAllAsync(
        string? search,
        Guid? topicId,
        CancellationToken cancellationToken = default)
    {
        var term = search?.Trim();
        return _scenarios.ListAsync(
            scenario => new SystemDesignSummaryDto(
                scenario.Id,
                scenario.Title,
                scenario.Problem,
                scenario.Confidence,
                scenario.TopicId,
                scenario.Topic == null ? null : scenario.Topic.Name,
                scenario.SystemDesignScenarioTags.OrderBy(join => join.Tag.Name).Select(join => join.Tag.Name).ToList(),
                scenario.UpdatedAtUtc),
            scenario => (string.IsNullOrEmpty(term)
                    || scenario.Title.Contains(term)
                    || scenario.Problem.Contains(term))
                && (!topicId.HasValue || scenario.TopicId == topicId.Value),
            scenarios => scenarios.OrderByDescending(scenario => scenario.UpdatedAtUtc),
            cancellationToken: cancellationToken);
    }

    public async Task<SystemDesignScenarioDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var scenario = await _scenarios.FirstOrDefaultAsync(
            candidate => candidate.Id == id,
            Projection,
            cancellationToken);
        return scenario ?? throw new NotFoundException(nameof(SystemDesignScenario), id);
    }

    public async Task<SystemDesignScenarioDto> CreateAsync(
        UpsertSystemDesignScenarioRequest request,
        CancellationToken cancellationToken = default)
    {
        Validate(request);
        await EnsureTopicExistsAsync(request.TopicId, cancellationToken);
        var scenario = new SystemDesignScenario();
        Apply(scenario, request);
        await _scenarios.AddAsync(scenario, cancellationToken);
        await AddTagsAsync(scenario.Id, request.Tags, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(scenario.Id, cancellationToken);
    }

    public async Task<SystemDesignScenarioDto> UpdateAsync(
        Guid id,
        UpsertSystemDesignScenarioRequest request,
        CancellationToken cancellationToken = default)
    {
        Validate(request);
        await EnsureTopicExistsAsync(request.TopicId, cancellationToken);
        var scenario = await _scenarios.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(nameof(SystemDesignScenario), id);
        Apply(scenario, request);

        var joins = await unitOfWork.Repository<SystemDesignScenarioTag>().ListTrackedAsync(
            join => join.SystemDesignScenarioId == id,
            cancellationToken);
        foreach (var join in joins)
        {
            unitOfWork.Repository<SystemDesignScenarioTag>().Remove(join);
        }
        await AddTagsAsync(id, request.Tags, cancellationToken);

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var scenario = await _scenarios.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(nameof(SystemDesignScenario), id);
        _scenarios.Remove(scenario);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static void Apply(SystemDesignScenario scenario, UpsertSystemDesignScenarioRequest request)
    {
        scenario.Title = request.Title.Trim();
        scenario.Problem = request.Problem.Trim();
        scenario.Requirements = Clean(request.Requirements);
        scenario.Constraints = Clean(request.Constraints);
        scenario.Architecture = Clean(request.Architecture);
        scenario.Diagram = string.IsNullOrWhiteSpace(request.Diagram) ? null : request.Diagram.Trim();
        scenario.Pros = Clean(request.Pros);
        scenario.Cons = Clean(request.Cons);
        scenario.Scalability = Clean(request.Scalability);
        scenario.Security = Clean(request.Security);
        scenario.Caching = Clean(request.Caching);
        scenario.Monitoring = Clean(request.Monitoring);
        scenario.Logging = Clean(request.Logging);
        scenario.MessageQueue = Clean(request.MessageQueue);
        scenario.Database = Clean(request.Database);
        scenario.ApiDesign = Clean(request.ApiDesign);
        scenario.AiCritique = Clean(request.AiCritique);
        scenario.Confidence = Math.Clamp(request.Confidence, 0, 100);
        scenario.TopicId = request.TopicId;
    }

    private async Task AddTagsAsync(Guid scenarioId, IReadOnlyList<string>? requestedTags, CancellationToken cancellationToken)
    {
        var names = TagUtilities.NormalizeNames(requestedTags);
        if (names.Count == 0)
        {
            return;
        }

        var slugs = names.Select(TagUtilities.Slugify).ToList();
        var tags = (await unitOfWork.Repository<Tag>().ListTrackedAsync(
            tag => names.Contains(tag.Name) || slugs.Contains(tag.Slug),
            cancellationToken)).ToList();

        foreach (var name in names)
        {
            var slug = TagUtilities.Slugify(name);
            var tag = tags.FirstOrDefault(item =>
                string.Equals(item.Name, name, StringComparison.OrdinalIgnoreCase)
                || string.Equals(item.Slug, slug, StringComparison.OrdinalIgnoreCase));

            if (tag is null)
            {
                tag = new Tag
                {
                    Name = name,
                    Slug = slug
                };
                await unitOfWork.Repository<Tag>().AddAsync(tag, cancellationToken);
                tags.Add(tag);
            }

            await unitOfWork.Repository<SystemDesignScenarioTag>().AddAsync(
                new SystemDesignScenarioTag { SystemDesignScenarioId = scenarioId, TagId = tag.Id },
                cancellationToken);
        }
    }

    private async Task EnsureTopicExistsAsync(Guid? topicId, CancellationToken cancellationToken)
    {
        if (topicId is { } id && await unitOfWork.Repository<Topic>().GetByIdAsync(id, cancellationToken) is null)
        {
            throw new NotFoundException(nameof(Topic), id);
        }
    }

    private static void Validate(UpsertSystemDesignScenarioRequest request)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(request.Title);
        ArgumentException.ThrowIfNullOrWhiteSpace(request.Problem);
    }

    private static string Clean(string? value) => value?.Trim() ?? string.Empty;

    private static readonly Expression<Func<SystemDesignScenario, SystemDesignScenarioDto>> Projection = scenario =>
        new SystemDesignScenarioDto(
            scenario.Id,
            scenario.Title,
            scenario.Problem,
            scenario.Requirements,
            scenario.Constraints,
            scenario.Architecture,
            scenario.Diagram,
            scenario.Pros,
            scenario.Cons,
            scenario.Scalability,
            scenario.Security,
            scenario.Caching,
            scenario.Monitoring,
            scenario.Logging,
            scenario.MessageQueue,
            scenario.Database,
            scenario.ApiDesign,
            scenario.AiCritique,
            scenario.Confidence,
            scenario.TopicId,
            scenario.Topic == null ? null : scenario.Topic.Name,
            scenario.SystemDesignScenarioTags.OrderBy(join => join.Tag.Name).Select(join => join.Tag.Name).ToList(),
            scenario.CreatedAtUtc,
            scenario.UpdatedAtUtc);
}
