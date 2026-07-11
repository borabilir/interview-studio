namespace InterviewPrep.Domain.Enums;

public enum Priority
{
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4
}

public enum Difficulty
{
    Easy = 1,
    Medium = 2,
    Hard = 3
}

public enum InterviewFrequency
{
    Low = 1,
    Medium = 2,
    High = 3,
    VeryHigh = 4
}

public enum InterviewType
{
    Technical = 1,
    HumanResources = 2,
    Behavioral = 3,
    SystemDesign = 4
}

public enum SessionStatus
{
    Planned = 1,
    InProgress = 2,
    Completed = 3,
    Abandoned = 4
}

public enum StudyPlanStatus
{
    Planned = 1,
    InProgress = 2,
    Completed = 3
}

public enum StudyActivityType
{
    Topic = 1,
    Note = 2,
    CodingQuestion = 3,
    Flashcard = 4,
    SystemDesign = 5,
    MockInterview = 6
}
