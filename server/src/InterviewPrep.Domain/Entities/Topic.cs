using InterviewPrep.Domain.Common;
using InterviewPrep.Domain.Enums;

namespace InterviewPrep.Domain.Entities;

public sealed class Topic : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Priority Priority { get; set; } = Priority.Medium;
    public int Progress { get; set; }
    public int ConfidenceLevel { get; set; }
    public int EstimatedMastery { get; set; }
    public string AccentColor { get; set; } = "#6366F1";
    public int SortOrder { get; set; }
    public bool IsArchived { get; set; }
    public Guid? ParentTopicId { get; set; }
    public Topic? ParentTopic { get; set; }

    public ICollection<Topic> Subtopics { get; set; } = new List<Topic>();
    public ICollection<Note> Notes { get; set; } = new List<Note>();
    public ICollection<CodingQuestion> CodingQuestions { get; set; } = new List<CodingQuestion>();
    public ICollection<Flashcard> Flashcards { get; set; } = new List<Flashcard>();
    public ICollection<SystemDesignScenario> SystemDesignScenarios { get; set; } = new List<SystemDesignScenario>();
    public ICollection<ProgressEntry> ProgressEntries { get; set; } = new List<ProgressEntry>();
    public ICollection<StudyPlanItem> StudyPlanItems { get; set; } = new List<StudyPlanItem>();
    public ICollection<TopicTag> TopicTags { get; set; } = new List<TopicTag>();
}
