using InterviewPrep.Domain.Common;
using InterviewPrep.Domain.Enums;

namespace InterviewPrep.Domain.Entities;

public sealed class InterviewSession : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public InterviewType Type { get; set; } = InterviewType.Technical;
    public SessionStatus Status { get; set; } = SessionStatus.Planned;
    public DateTime? StartedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public int TechnicalAccuracyScore { get; set; }
    public int CommunicationScore { get; set; }
    public int ConfidenceScore { get; set; }
    public int StructureScore { get; set; }
    public string SummaryFeedback { get; set; } = string.Empty;

    public ICollection<InterviewAnswer> Answers { get; set; } = new List<InterviewAnswer>();
}

public sealed class InterviewAnswer : BaseEntity
{
    public Guid InterviewSessionId { get; set; }
    public InterviewSession InterviewSession { get; set; } = null!;
    public int Sequence { get; set; }
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public int TechnicalAccuracyScore { get; set; }
    public int CommunicationScore { get; set; }
    public int ConfidenceScore { get; set; }
    public int StructureScore { get; set; }
    public string MissingDetails { get; set; } = string.Empty;
    public string Feedback { get; set; } = string.Empty;
    public string FollowUpQuestions { get; set; } = string.Empty;
}
