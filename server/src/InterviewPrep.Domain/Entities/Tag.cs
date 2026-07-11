using InterviewPrep.Domain.Common;

namespace InterviewPrep.Domain.Entities;

public sealed class Tag : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Color { get; set; } = "#71717A";

    public ICollection<TopicTag> TopicTags { get; set; } = new List<TopicTag>();
    public ICollection<NoteTag> NoteTags { get; set; } = new List<NoteTag>();
    public ICollection<CodingQuestionTag> CodingQuestionTags { get; set; } = new List<CodingQuestionTag>();
    public ICollection<FlashcardTag> FlashcardTags { get; set; } = new List<FlashcardTag>();
    public ICollection<SystemDesignScenarioTag> SystemDesignScenarioTags { get; set; } = new List<SystemDesignScenarioTag>();
}

public sealed class TopicTag : BaseEntity
{
    public Guid TopicId { get; set; }
    public Topic Topic { get; set; } = null!;
    public Guid TagId { get; set; }
    public Tag Tag { get; set; } = null!;
}

public sealed class NoteTag : BaseEntity
{
    public Guid NoteId { get; set; }
    public Note Note { get; set; } = null!;
    public Guid TagId { get; set; }
    public Tag Tag { get; set; } = null!;
}

public sealed class CodingQuestionTag : BaseEntity
{
    public Guid CodingQuestionId { get; set; }
    public CodingQuestion CodingQuestion { get; set; } = null!;
    public Guid TagId { get; set; }
    public Tag Tag { get; set; } = null!;
}

public sealed class FlashcardTag : BaseEntity
{
    public Guid FlashcardId { get; set; }
    public Flashcard Flashcard { get; set; } = null!;
    public Guid TagId { get; set; }
    public Tag Tag { get; set; } = null!;
}

public sealed class SystemDesignScenarioTag : BaseEntity
{
    public Guid SystemDesignScenarioId { get; set; }
    public SystemDesignScenario SystemDesignScenario { get; set; } = null!;
    public Guid TagId { get; set; }
    public Tag Tag { get; set; } = null!;
}
