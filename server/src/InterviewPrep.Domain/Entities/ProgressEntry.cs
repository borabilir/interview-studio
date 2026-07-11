using InterviewPrep.Domain.Common;

namespace InterviewPrep.Domain.Entities;

public sealed class ProgressEntry : BaseEntity
{
    public DateTime ActivityDateUtc { get; set; }
    public int MinutesStudied { get; set; }
    public int QuestionsSolved { get; set; }
    public int CodingAttempts { get; set; }
    public int MockInterviews { get; set; }
    public int ConfidenceScore { get; set; }
    public Guid? TopicId { get; set; }
    public Topic? Topic { get; set; }
}
