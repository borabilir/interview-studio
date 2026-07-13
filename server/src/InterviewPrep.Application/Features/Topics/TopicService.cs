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
            topics => topics
                .OrderBy(topic => topic.ParentTopicId.HasValue)
                .ThenBy(topic => topic.ParentTopicId)
                .ThenBy(topic => topic.SortOrder)
                .ThenBy(topic => topic.Name),
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
            SortOrder = NormalizeSortOrder(
                request.SortOrder ?? await GetNextSortOrderAsync(request.ParentTopicId, cancellationToken)),
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

        var parentChanged = topic.ParentTopicId != request.ParentTopicId;
        topic.Name = request.Name.Trim();
        topic.Category = request.Category.Trim();
        topic.Description = request.Description?.Trim() ?? string.Empty;
        topic.Priority = request.Priority;
        topic.Progress = ClampScore(request.Progress);
        topic.ConfidenceLevel = ClampScore(request.ConfidenceLevel);
        topic.EstimatedMastery = ClampScore(request.EstimatedMastery);
        topic.AccentColor = string.IsNullOrWhiteSpace(request.AccentColor) ? "#6366F1" : request.AccentColor.Trim();
        topic.SortOrder = NormalizeSortOrder(request.SortOrder
            ?? (parentChanged ? await GetNextSortOrderAsync(request.ParentTopicId, cancellationToken) : topic.SortOrder));
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

    public async Task<IReadOnlyList<TopicDto>> ReorderAsync(
        ReorderTopicsRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.TopicIds is null)
        {
            throw new ArgumentException("Sıralama listesi boş olamaz.", nameof(request));
        }

        var topics = (await _topics.ListTrackedAsync(
            topic => !topic.IsArchived && topic.ParentTopicId == request.ParentTopicId,
            cancellationToken)).ToList();

        if (request.TopicIds.Count != topics.Count || request.TopicIds.Distinct().Count() != topics.Count)
        {
            throw new ArgumentException("Sıralama listesi bu seviyedeki tüm konuları içermelidir.", nameof(request));
        }

        var byId = topics.ToDictionary(topic => topic.Id);
        for (var index = 0; index < request.TopicIds.Count; index++)
        {
            var topicId = request.TopicIds[index];
            if (!byId.TryGetValue(topicId, out var topic))
            {
                throw new ArgumentException("Sıralama listesi bu seviyedeki tüm konuları içermelidir.", nameof(request));
            }

            topic.SortOrder = index;
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetAllAsync(cancellationToken);
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
            topic.SortOrder,
            topic.ParentTopicId,
            topic.ParentTopic == null ? null : topic.ParentTopic.Name,
            topic.TopicTags.OrderBy(topicTag => topicTag.Tag.Name).Select(topicTag => topicTag.Tag.Name).ToList(),
            topic.UpdatedAtUtc);

    private static int ClampScore(int score) => Math.Clamp(score, 0, 100);

    private static int NormalizeSortOrder(int sortOrder) => Math.Max(0, sortOrder);

    private async Task<int> GetNextSortOrderAsync(Guid? parentTopicId, CancellationToken cancellationToken)
    {
        var siblings = await _topics.ListTrackedAsync(
            topic => !topic.IsArchived && topic.ParentTopicId == parentTopicId,
            cancellationToken);

        return siblings.Count == 0 ? 0 : siblings.Max(topic => topic.SortOrder) + 1;
    }

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
        var tagNames = TagUtilities.NormalizeNames(requestedTags);
        if (tagNames.Count == 0)
        {
            return;
        }

        var tagSlugs = tagNames.Select(TagUtilities.Slugify).ToList();
        var existingTags = (await unitOfWork.Repository<Tag>().ListTrackedAsync(
            tag => tagNames.Contains(tag.Name) || tagSlugs.Contains(tag.Slug), cancellationToken)).ToList();

        foreach (var tagName in tagNames)
        {
            var slug = TagUtilities.Slugify(tagName);
            var tag = existingTags.FirstOrDefault(candidate =>
                string.Equals(candidate.Name, tagName, StringComparison.OrdinalIgnoreCase)
                || string.Equals(candidate.Slug, slug, StringComparison.OrdinalIgnoreCase));

            if (tag is null)
            {
                tag = new Tag { Name = tagName, Slug = slug };
                await unitOfWork.Repository<Tag>().AddAsync(tag, cancellationToken);
                existingTags.Add(tag);
            }

            await unitOfWork.Repository<TopicTag>().AddAsync(
                new TopicTag { TopicId = topicId, TagId = tag.Id },
                cancellationToken);
        }
    }

}
