using InterviewPrep.Domain.Common;
using InterviewPrep.Domain.Enums;

namespace InterviewPrep.Domain.Entities;

public sealed class Flashcard : BaseEntity
{
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public string? Why { get; set; }
    public string? ProductionExample { get; set; }
    public string? BankingExample { get; set; }
    public string? InterviewTip { get; set; }
    public InterviewFrequency? InterviewFrequency { get; set; }
    public Difficulty Difficulty { get; set; } = Difficulty.Medium;
    public Guid? TopicId { get; set; }
    public Topic? Topic { get; set; }
    public DateTime NextReviewAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? LastReviewedAtUtc { get; set; }
    public int IntervalDays { get; set; }
    public int RepetitionCount { get; set; }
    public double EaseFactor { get; set; } = 2.5;
    public int ReviewCount { get; set; }
    public int CorrectReviewCount { get; set; }

    public ICollection<FlashcardTag> FlashcardTags { get; set; } = new List<FlashcardTag>();
}
