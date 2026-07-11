using InterviewPrep.Domain.Common;
using InterviewPrep.Domain.Enums;

namespace InterviewPrep.Domain.Entities;

public sealed class CodingQuestion : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Difficulty Difficulty { get; set; } = Difficulty.Medium;
    public string Language { get; set; } = "csharp";
    public string StarterCode { get; set; } = string.Empty;
    public string ExpectedSolution { get; set; } = string.Empty;
    public string PersonalSolution { get; set; } = string.Empty;
    public int Confidence { get; set; }
    public Guid? TopicId { get; set; }
    public Topic? Topic { get; set; }

    public ICollection<CodingAttempt> Attempts { get; set; } = new List<CodingAttempt>();
    public ICollection<CodingQuestionTag> CodingQuestionTags { get; set; } = new List<CodingQuestionTag>();
}

public sealed class CodingAttempt : BaseEntity
{
    public Guid CodingQuestionId { get; set; }
    public CodingQuestion CodingQuestion { get; set; } = null!;
    public string Solution { get; set; } = string.Empty;
    public string Language { get; set; } = "csharp";
    public int AttemptNumber { get; set; }
    public int CorrectnessScore { get; set; }
    public int ReadabilityScore { get; set; }
    public int PerformanceScore { get; set; }
    public int ArchitectureScore { get; set; }
    public string BestPracticesFeedback { get; set; } = string.Empty;
    public string InterviewFeedback { get; set; } = string.Empty;
    public string FollowUpQuestions { get; set; } = string.Empty;
    public string AlternativeSolution { get; set; } = string.Empty;
    public string SeniorLevelImprovements { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }
    public DateTime SubmittedAtUtc { get; set; } = DateTime.UtcNow;
}
