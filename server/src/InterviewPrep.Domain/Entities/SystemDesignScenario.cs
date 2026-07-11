using InterviewPrep.Domain.Common;

namespace InterviewPrep.Domain.Entities;

public sealed class SystemDesignScenario : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Problem { get; set; } = string.Empty;
    public string Requirements { get; set; } = string.Empty;
    public string Constraints { get; set; } = string.Empty;
    public string Architecture { get; set; } = string.Empty;
    public string? Diagram { get; set; }
    public string Pros { get; set; } = string.Empty;
    public string Cons { get; set; } = string.Empty;
    public string Scalability { get; set; } = string.Empty;
    public string Security { get; set; } = string.Empty;
    public string Caching { get; set; } = string.Empty;
    public string Monitoring { get; set; } = string.Empty;
    public string Logging { get; set; } = string.Empty;
    public string MessageQueue { get; set; } = string.Empty;
    public string Database { get; set; } = string.Empty;
    public string ApiDesign { get; set; } = string.Empty;
    public string AiCritique { get; set; } = string.Empty;
    public int Confidence { get; set; }
    public Guid? TopicId { get; set; }
    public Topic? Topic { get; set; }

    public ICollection<SystemDesignScenarioTag> SystemDesignScenarioTags { get; set; } = new List<SystemDesignScenarioTag>();
}
