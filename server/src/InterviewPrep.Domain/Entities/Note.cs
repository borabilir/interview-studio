using InterviewPrep.Domain.Common;

namespace InterviewPrep.Domain.Entities;

public sealed class Note : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? AiSummary { get; set; }
    public string? AiExplanation { get; set; }
    public string? AiImprovementSuggestions { get; set; }
    public bool IsPinned { get; set; }
    public bool IsFavorite { get; set; }
    public int CurrentVersion { get; set; } = 1;
    public Guid? TopicId { get; set; }
    public Topic? Topic { get; set; }

    public ICollection<NoteTag> NoteTags { get; set; } = new List<NoteTag>();
    public ICollection<NoteVersion> Versions { get; set; } = new List<NoteVersion>();
}

public sealed class NoteVersion : BaseEntity
{
    public Guid NoteId { get; set; }
    public Note Note { get; set; } = null!;
    public int Version { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string ChangeSummary { get; set; } = string.Empty;
}
