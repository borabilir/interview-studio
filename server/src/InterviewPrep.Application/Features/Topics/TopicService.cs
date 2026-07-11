using InterviewPrep.Application.Abstractions.Persistence;
using InterviewPrep.Application.Common;
using InterviewPrep.Domain.Entities;

namespace InterviewPrep.Application.Features.Topics;

internal sealed class TopicService(IUnitOfWork unitOfWork) : ITopicService
{
    private readonly IRepository<Topic> _topics = unitOfWork.Repository<Topic>();

    public Task<IReadOnlyList<TopicDto>> GetAllAsync(CancellationToken cancellationToken = default) =>
        _topics.ListAsync(
            TopicProjection,
            topic => !topic.IsArchived,
            topics => topics.OrderBy(topic => topic.ParentTopicId.HasValue).ThenBy(topic => topic.Name),
            cancellationToken: cancellationToken);

    public async Task<TopicDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var topic = await _topics.FirstOrDefaultAsync(
            candidate => candidate.Id == id && !candidate.IsArchived,
            TopicProjection,
            cancellationToken);

        return topic ?? throw new NotFoundException(nameof(Topic), id);
    }

    public async Task<TopicDto> CreateAsync(CreateTopicRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(request.Name);
        ArgumentException.ThrowIfNullOrWhiteSpace(request.Category);
        await EnsureValidParentAsync(null, request.ParentTopicId, cancellationToken);

        var topic = new Topic
        {
            Name = request.Name.Trim(),
            Category = request.Category.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            Priority = request.Priority,
            Progress = ClampScore(request.Progress),
            ConfidenceLevel = ClampScore(request.ConfidenceLevel),
            EstimatedMastery = ClampScore(request.EstimatedMastery),
            AccentColor = string.IsNullOrWhiteSpace(request.AccentColor) ? "#6366F1" : request.AccentColor.Trim(),
            ParentTopicId = request.ParentTopicId
        };

        await _topics.AddAsync(topic, cancellationToken);
        await AddTagsAsync(topic.Id, request.Tags, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(topic.Id, cancellationToken);
    }

    public async Task<TopicDto> UpdateAsync(
        Guid id,
        UpdateTopicRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(request.Name);
        ArgumentException.ThrowIfNullOrWhiteSpace(request.Category);
        await EnsureValidParentAsync(id, request.ParentTopicId, cancellationToken);

        var topic = await _topics.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(nameof(Topic), id);
        if (topic.IsArchived)
        {
            throw new NotFoundException(nameof(Topic), id);
        }

        topic.Name = request.Name.Trim();
        topic.Category = request.Category.Trim();
        topic.Description = request.Description?.Trim() ?? string.Empty;
        topic.Priority = request.Priority;
        topic.Progress = ClampScore(request.Progress);
        topic.ConfidenceLevel = ClampScore(request.ConfidenceLevel);
        topic.EstimatedMastery = ClampScore(request.EstimatedMastery);
        topic.AccentColor = string.IsNullOrWhiteSpace(request.AccentColor) ? "#6366F1" : request.AccentColor.Trim();
        topic.ParentTopicId = request.ParentTopicId;

        var joins = await unitOfWork.Repository<TopicTag>().ListTrackedAsync(
            join => join.TopicId == id,
            cancellationToken);
        foreach (var join in joins)
        {
            unitOfWork.Repository<TopicTag>().Remove(join);
        }

        await AddTagsAsync(topic.Id, request.Tags, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(topic.Id, cancellationToken);
    }

    public async Task<TopicDto> UpdateProgressAsync(
        Guid id,
        UpdateTopicProgressRequest request,
        CancellationToken cancellationToken = default)
    {
        var topic = await _topics.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(nameof(Topic), id);

        topic.Progress = ClampScore(request.Progress);
        topic.ConfidenceLevel = ClampScore(request.ConfidenceLevel);
        topic.UpdatedAtUtc = DateTime.UtcNow;
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(topic.Id, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var activeTopics = await _topics.ListTrackedAsync(
            topic => !topic.IsArchived,
            cancellationToken);
        var topic = activeTopics.FirstOrDefault(candidate => candidate.Id == id)
            ?? throw new NotFoundException(nameof(Topic), id);

        var topicIds = new HashSet<Guid> { topic.Id };
        var added = true;
        while (added)
        {
            added = false;
            foreach (var child in activeTopics)
            {
                if (child.ParentTopicId.HasValue
                    && topicIds.Contains(child.ParentTopicId.Value)
                    && topicIds.Add(child.Id))
                {
                    added = true;
                }
            }
        }

        foreach (var archivedTopic in activeTopics.Where(candidate => topicIds.Contains(candidate.Id)))
        {
            archivedTopic.IsArchived = true;
            archivedTopic.ParentTopicId = null;
        }

        var ids = topicIds.ToList();

        foreach (var note in await unitOfWork.Repository<Note>().ListTrackedAsync(
            note => note.TopicId.HasValue && ids.Contains(note.TopicId.Value),
            cancellationToken))
        {
            note.TopicId = null;
        }

        foreach (var question in await unitOfWork.Repository<CodingQuestion>().ListTrackedAsync(
            question => question.TopicId.HasValue && ids.Contains(question.TopicId.Value),
            cancellationToken))
        {
            question.TopicId = null;
        }

        foreach (var card in await unitOfWork.Repository<Flashcard>().ListTrackedAsync(
            card => card.TopicId.HasValue && ids.Contains(card.TopicId.Value),
            cancellationToken))
        {
            card.TopicId = null;
        }

        foreach (var scenario in await unitOfWork.Repository<SystemDesignScenario>().ListTrackedAsync(
            scenario => scenario.TopicId.HasValue && ids.Contains(scenario.TopicId.Value),
            cancellationToken))
        {
            scenario.TopicId = null;
        }

        foreach (var item in await unitOfWork.Repository<StudyPlanItem>().ListTrackedAsync(
            item => item.TopicId.HasValue && ids.Contains(item.TopicId.Value),
            cancellationToken))
        {
            item.TopicId = null;
        }

        foreach (var entry in await unitOfWork.Repository<ProgressEntry>().ListTrackedAsync(
            entry => entry.TopicId.HasValue && ids.Contains(entry.TopicId.Value),
            cancellationToken))
        {
            entry.TopicId = null;
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static readonly System.Linq.Expressions.Expression<Func<Topic, TopicDto>> TopicProjection = topic =>
        new TopicDto(
            topic.Id,
            topic.Name,
            topic.Category,
            topic.Description,
            topic.Priority,
            topic.Progress,
            topic.ConfidenceLevel,
            topic.EstimatedMastery,
            topic.AccentColor,
            topic.ParentTopicId,
            topic.ParentTopic == null ? null : topic.ParentTopic.Name,
            topic.TopicTags.OrderBy(topicTag => topicTag.Tag.Name).Select(topicTag => topicTag.Tag.Name).ToList(),
            topic.UpdatedAtUtc);

    private static int ClampScore(int score) => Math.Clamp(score, 0, 100);

    private async Task EnsureValidParentAsync(Guid? topicId, Guid? parentTopicId, CancellationToken cancellationToken)
    {
        if (parentTopicId is not { } id)
        {
            return;
        }

        if (topicId == id)
        {
            throw new ArgumentException("Bir konu kendisinin alt konusu olamaz.", nameof(parentTopicId));
        }

        var parent = await _topics.GetByIdAsync(id, cancellationToken);
        if (parent is null || parent.IsArchived)
        {
            throw new NotFoundException(nameof(Topic), id);
        }

        var ancestorId = parent.ParentTopicId;
        while (ancestorId.HasValue)
        {
            if (ancestorId == topicId)
            {
                throw new ArgumentException("Alt konu hiyerarşisinde döngü oluşturulamaz.", nameof(parentTopicId));
            }

            var ancestor = await _topics.GetByIdAsync(ancestorId.Value, cancellationToken);
            ancestorId = ancestor?.ParentTopicId;
        }
    }

    private async Task AddTagsAsync(
        Guid topicId,
        IReadOnlyList<string>? requestedTags,
        CancellationToken cancellationToken)
    {
        var tagNames = NormalizeTags(requestedTags);
        if (tagNames.Count == 0)
        {
            return;
        }

        var existingTags = await unitOfWork.Repository<Tag>().ListTrackedAsync(
            tag => tagNames.Contains(tag.Name), cancellationToken);

        foreach (var tagName in tagNames)
        {
            var tag = existingTags.FirstOrDefault(candidate =>
                string.Equals(candidate.Name, tagName, StringComparison.OrdinalIgnoreCase));

            if (tag is null)
            {
                tag = new Tag { Name = tagName, Slug = Slugify(tagName) };
                await unitOfWork.Repository<Tag>().AddAsync(tag, cancellationToken);
            }

            await unitOfWork.Repository<TopicTag>().AddAsync(
                new TopicTag { TopicId = topicId, TagId = tag.Id },
                cancellationToken);
        }
    }

    private static List<string> NormalizeTags(IReadOnlyList<string>? tags) =>
        tags?.Where(tag => !string.IsNullOrWhiteSpace(tag))
            .Select(tag => tag.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList() ?? [];

    private static string Slugify(string value) =>
        string.Join('-', value.Trim().ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries));
}
