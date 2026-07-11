using InterviewPrep.Domain.Common;
using InterviewPrep.Domain.Enums;

namespace InterviewPrep.Domain.Entities;

public sealed class StudyPlan : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public DateTime ScheduledForUtc { get; set; }
    public StudyPlanStatus Status { get; set; } = StudyPlanStatus.Planned;
    public int PlannedMinutes { get; set; }
    public int ActualMinutes { get; set; }
    public string Notes { get; set; } = string.Empty;

    public ICollection<StudyPlanItem> Items { get; set; } = new List<StudyPlanItem>();
}

public sealed class StudyPlanItem : BaseEntity
{
    public Guid StudyPlanId { get; set; }
    public StudyPlan StudyPlan { get; set; } = null!;
    public Guid? TopicId { get; set; }
    public Topic? Topic { get; set; }
    public string Title { get; set; } = string.Empty;
    public StudyActivityType ActivityType { get; set; }
    public Guid? ResourceId { get; set; }
    public int PlannedMinutes { get; set; }
    public bool IsCompleted { get; set; }
    public int SortOrder { get; set; }
}
