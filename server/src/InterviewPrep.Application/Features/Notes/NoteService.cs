using InterviewPrep.Application.Abstractions.Persistence;
using InterviewPrep.Application.Common;
using InterviewPrep.Domain.Entities;

namespace InterviewPrep.Application.Features.Notes;

internal sealed class NoteService(IUnitOfWork unitOfWork) : INoteService
{
    private readonly IRepository<Note> _notes = unitOfWork.Repository<Note>();

    public Task<IReadOnlyList<NoteSummaryDto>> GetAllAsync(
        string? search,
        bool pinnedOnly,
        bool favoritesOnly,
        Guid? topicId,
        CancellationToken cancellationToken = default)
    {
        var term = search?.Trim();
#pragma warning disable CA1845 // The selector must remain translatable; spans cannot be represented in expression trees.
        return _notes.ListAsync(
            note => new NoteSummaryDto(
                note.Id,
                note.Title,
                note.Content.Length > 180 ? note.Content.Substring(0, 180) + "…" : note.Content,
                note.IsPinned,
                note.IsFavorite,
                note.Topic == null ? null : note.Topic.Name,
                note.NoteTags.OrderBy(noteTag => noteTag.Tag.Name).Select(noteTag => noteTag.Tag.Name).ToList(),
                note.UpdatedAtUtc),
            note => (string.IsNullOrEmpty(term) || note.Title.Contains(term) || note.Content.Contains(term))
                && (!pinnedOnly || note.IsPinned)
                && (!favoritesOnly || note.IsFavorite)
                && (!topicId.HasValue || note.TopicId == topicId.Value),
            notes => notes.OrderByDescending(note => note.IsPinned).ThenByDescending(note => note.UpdatedAtUtc),
            cancellationToken: cancellationToken);
#pragma warning restore CA1845
    }

    public async Task<NoteDetailDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var note = await _notes.FirstOrDefaultAsync(
            candidate => candidate.Id == id,
            candidate => new NoteDetailDto(
                candidate.Id,
                candidate.Title,
                candidate.Content,
                candidate.AiSummary,
                candidate.AiExplanation,
                candidate.AiImprovementSuggestions,
                candidate.IsPinned,
                candidate.IsFavorite,
                candidate.CurrentVersion,
                candidate.TopicId,
                candidate.Topic == null ? null : candidate.Topic.Name,
                candidate.NoteTags.OrderBy(noteTag => noteTag.Tag.Name).Select(noteTag => noteTag.Tag.Name).ToList(),
                candidate.Versions.OrderByDescending(version => version.Version)
                    .Select(version => new NoteVersionDto(
                        version.Id,
                        version.Version,
                        version.Title,
                        version.ChangeSummary,
                        version.CreatedAtUtc))
                    .ToList(),
                candidate.CreatedAtUtc,
                candidate.UpdatedAtUtc),
            cancellationToken);

        return note ?? throw new NotFoundException(nameof(Note), id);
    }

    public async Task<NoteDetailDto> CreateAsync(CreateNoteRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(request.Title);

        if (request.TopicId is { } topicId
            && await unitOfWork.Repository<Topic>().GetByIdAsync(topicId, cancellationToken) is null)
        {
            throw new NotFoundException(nameof(Topic), topicId);
        }

        var note = new Note
        {
            Title = request.Title.Trim(),
            Content = request.Content ?? string.Empty,
            TopicId = request.TopicId,
            IsPinned = request.IsPinned,
            IsFavorite = request.IsFavorite
        };

        note.Versions.Add(new NoteVersion
        {
            NoteId = note.Id,
            Version = 1,
            Title = note.Title,
            Content = note.Content,
            ChangeSummary = "İlk sürüm"
        });

        var tagNames = TagUtilities.NormalizeNames(request.Tags);
        if (tagNames.Count > 0)
        {
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

                note.NoteTags.Add(new NoteTag { NoteId = note.Id, TagId = tag.Id });
            }
        }

        await _notes.AddAsync(note, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(note.Id, cancellationToken);
    }

    public async Task<NoteDetailDto> UpdateAsync(
        Guid id,
        UpdateNoteRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(request.Title);

        var note = await _notes.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(nameof(Note), id);

        if (request.TopicId is { } topicId
            && await unitOfWork.Repository<Topic>().GetByIdAsync(topicId, cancellationToken) is null)
        {
            throw new NotFoundException(nameof(Topic), topicId);
        }

        var nextTitle = request.Title.Trim();
        var nextContent = request.Content ?? string.Empty;
        var contentChanged = !string.Equals(note.Title, nextTitle, StringComparison.Ordinal)
            || !string.Equals(note.Content, nextContent, StringComparison.Ordinal);

        note.Title = nextTitle;
        note.Content = nextContent;
        note.TopicId = request.TopicId;
        note.IsPinned = request.IsPinned;
        note.IsFavorite = request.IsFavorite;
        note.AiSummary = NormalizeOptional(request.AiSummary);
        note.AiExplanation = NormalizeOptional(request.AiExplanation);
        note.AiImprovementSuggestions = NormalizeOptional(request.AiImprovementSuggestions);

        if (contentChanged)
        {
            note.CurrentVersion++;
            await unitOfWork.Repository<NoteVersion>().AddAsync(new NoteVersion
            {
                NoteId = note.Id,
                Version = note.CurrentVersion,
                Title = note.Title,
                Content = note.Content,
                ChangeSummary = string.IsNullOrWhiteSpace(request.ChangeSummary)
                    ? "Otomatik kaydedilen değişiklik"
                    : request.ChangeSummary.Trim()
            }, cancellationToken);
        }

        await SynchronizeTagsAsync(note, request.Tags, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(note.Id, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var note = await _notes.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(nameof(Note), id);

        _notes.Remove(note);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task SynchronizeTagsAsync(
        Note note,
        IReadOnlyList<string>? requestedTags,
        CancellationToken cancellationToken)
    {
        var tagNames = TagUtilities.NormalizeNames(requestedTags);
        var joins = await unitOfWork.Repository<NoteTag>().ListTrackedAsync(
            join => join.NoteId == note.Id,
            cancellationToken);

        foreach (var join in joins)
        {
            unitOfWork.Repository<NoteTag>().Remove(join);
        }

        if (tagNames.Count == 0)
        {
            return;
        }

        var tagSlugs = tagNames.Select(TagUtilities.Slugify).ToList();
        var tags = (await unitOfWork.Repository<Tag>().ListTrackedAsync(
            tag => tagNames.Contains(tag.Name) || tagSlugs.Contains(tag.Slug),
            cancellationToken)).ToList();

        foreach (var tagName in tagNames)
        {
            var slug = TagUtilities.Slugify(tagName);
            var tag = tags.FirstOrDefault(candidate =>
                string.Equals(candidate.Name, tagName, StringComparison.OrdinalIgnoreCase)
                || string.Equals(candidate.Slug, slug, StringComparison.OrdinalIgnoreCase));
            if (tag is null)
            {
                tag = new Tag { Name = tagName, Slug = slug };
                await unitOfWork.Repository<Tag>().AddAsync(tag, cancellationToken);
                tags.Add(tag);
            }

            await unitOfWork.Repository<NoteTag>().AddAsync(
                new NoteTag { NoteId = note.Id, TagId = tag.Id },
                cancellationToken);
        }
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
