using InterviewPrep.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InterviewPrep.Infrastructure.Persistence.Configurations;

internal sealed class TopicConfiguration : BaseEntityConfiguration<Topic>
{
    public override void Configure(EntityTypeBuilder<Topic> builder)
    {
        base.Configure(builder);
        builder.Property(topic => topic.Name).HasMaxLength(120).IsRequired();
        builder.Property(topic => topic.Category).HasMaxLength(80).IsRequired();
        builder.Property(topic => topic.Description).HasMaxLength(1000);
        builder.Property(topic => topic.AccentColor).HasMaxLength(16);
        builder.Property(topic => topic.Priority).HasConversion<string>().HasMaxLength(20);
        builder.HasIndex(topic => topic.Name);
        builder.HasIndex(topic => topic.ParentTopicId);
        builder.HasIndex(topic => new { topic.ParentTopicId, topic.SortOrder });
        builder.HasOne(topic => topic.ParentTopic)
            .WithMany(topic => topic.Subtopics)
            .HasForeignKey(topic => topic.ParentTopicId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.ToTable(table =>
        {
            table.HasCheckConstraint("CK_Topics_Progress", "Progress >= 0 AND Progress <= 100");
            table.HasCheckConstraint("CK_Topics_Confidence", "ConfidenceLevel >= 0 AND ConfidenceLevel <= 100");
            table.HasCheckConstraint("CK_Topics_Mastery", "EstimatedMastery >= 0 AND EstimatedMastery <= 100");
        });
    }
}

internal sealed class NoteConfiguration : BaseEntityConfiguration<Note>
{
    public override void Configure(EntityTypeBuilder<Note> builder)
    {
        base.Configure(builder);
        builder.Property(note => note.Title).HasMaxLength(240).IsRequired();
        builder.Property(note => note.Content).IsRequired();
        builder.HasIndex(note => new { note.IsPinned, note.UpdatedAtUtc });
        builder.HasOne(note => note.Topic)
            .WithMany(topic => topic.Notes)
            .HasForeignKey(note => note.TopicId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

internal sealed class NoteVersionConfiguration : BaseEntityConfiguration<NoteVersion>
{
    public override void Configure(EntityTypeBuilder<NoteVersion> builder)
    {
        base.Configure(builder);
        builder.Property(version => version.Title).HasMaxLength(240).IsRequired();
        builder.Property(version => version.ChangeSummary).HasMaxLength(500);
        builder.HasIndex(version => new { version.NoteId, version.Version }).IsUnique();
        builder.HasOne(version => version.Note)
            .WithMany(note => note.Versions)
            .HasForeignKey(version => version.NoteId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class CodingQuestionConfiguration : BaseEntityConfiguration<CodingQuestion>
{
    public override void Configure(EntityTypeBuilder<CodingQuestion> builder)
    {
        base.Configure(builder);
        builder.Property(question => question.Title).HasMaxLength(240).IsRequired();
        builder.Property(question => question.Description).IsRequired();
        builder.Property(question => question.Language).HasMaxLength(40).IsRequired();
        builder.Property(question => question.PersonalSolution).IsRequired();
        builder.Property(question => question.Difficulty).HasConversion<string>().HasMaxLength(20);
        builder.HasOne(question => question.Topic)
            .WithMany(topic => topic.CodingQuestions)
            .HasForeignKey(question => question.TopicId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

internal sealed class CodingAttemptConfiguration : BaseEntityConfiguration<CodingAttempt>
{
    public override void Configure(EntityTypeBuilder<CodingAttempt> builder)
    {
        base.Configure(builder);
        builder.Property(attempt => attempt.Language).HasMaxLength(40).IsRequired();
        builder.Property(attempt => attempt.Solution).IsRequired();
        builder.HasIndex(attempt => new { attempt.CodingQuestionId, attempt.AttemptNumber }).IsUnique();
        builder.HasIndex(attempt => attempt.SubmittedAtUtc);
        builder.HasOne(attempt => attempt.CodingQuestion)
            .WithMany(question => question.Attempts)
            .HasForeignKey(attempt => attempt.CodingQuestionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class FlashcardConfiguration : BaseEntityConfiguration<Flashcard>
{
    public override void Configure(EntityTypeBuilder<Flashcard> builder)
    {
        base.Configure(builder);
        builder.Property(card => card.Question).HasMaxLength(1000).IsRequired();
        builder.Property(card => card.Answer).IsRequired();
        builder.Property(card => card.Why).HasMaxLength(4000);
        builder.Property(card => card.ProductionExample).HasMaxLength(4000);
        builder.Property(card => card.BankingExample).HasMaxLength(4000);
        builder.Property(card => card.InterviewTip).HasMaxLength(4000);
        builder.Property(card => card.InterviewFrequency).HasConversion<string>().HasMaxLength(20);
        builder.Property(card => card.Difficulty).HasConversion<string>().HasMaxLength(20);
        builder.HasIndex(card => card.NextReviewAtUtc);
        builder.HasOne(card => card.Topic)
            .WithMany(topic => topic.Flashcards)
            .HasForeignKey(card => card.TopicId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

internal sealed class InterviewSessionConfiguration : BaseEntityConfiguration<InterviewSession>
{
    public override void Configure(EntityTypeBuilder<InterviewSession> builder)
    {
        base.Configure(builder);
        builder.Property(session => session.Title).HasMaxLength(240).IsRequired();
        builder.Property(session => session.Type).HasConversion<string>().HasMaxLength(30);
        builder.Property(session => session.Status).HasConversion<string>().HasMaxLength(30);
        builder.HasMany(session => session.Answers)
            .WithOne(answer => answer.InterviewSession)
            .HasForeignKey(answer => answer.InterviewSessionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class InterviewAnswerConfiguration : BaseEntityConfiguration<InterviewAnswer>
{
    public override void Configure(EntityTypeBuilder<InterviewAnswer> builder)
    {
        base.Configure(builder);
        builder.Property(answer => answer.Question).HasMaxLength(2000).IsRequired();
        builder.Property(answer => answer.Answer).IsRequired();
        builder.HasIndex(answer => new { answer.InterviewSessionId, answer.Sequence }).IsUnique();
    }
}

internal sealed class SystemDesignScenarioConfiguration : BaseEntityConfiguration<SystemDesignScenario>
{
    public override void Configure(EntityTypeBuilder<SystemDesignScenario> builder)
    {
        base.Configure(builder);
        builder.Property(scenario => scenario.Title).HasMaxLength(240).IsRequired();
        builder.Property(scenario => scenario.Problem).IsRequired();
        builder.HasOne(scenario => scenario.Topic)
            .WithMany(topic => topic.SystemDesignScenarios)
            .HasForeignKey(scenario => scenario.TopicId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

internal sealed class StudyPlanConfiguration : BaseEntityConfiguration<StudyPlan>
{
    public override void Configure(EntityTypeBuilder<StudyPlan> builder)
    {
        base.Configure(builder);
        builder.Property(plan => plan.Title).HasMaxLength(240).IsRequired();
        builder.Property(plan => plan.Status).HasConversion<string>().HasMaxLength(30);
        builder.HasIndex(plan => plan.ScheduledForUtc);
        builder.HasMany(plan => plan.Items)
            .WithOne(item => item.StudyPlan)
            .HasForeignKey(item => item.StudyPlanId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class StudyPlanItemConfiguration : BaseEntityConfiguration<StudyPlanItem>
{
    public override void Configure(EntityTypeBuilder<StudyPlanItem> builder)
    {
        base.Configure(builder);
        builder.Property(item => item.Title).HasMaxLength(240).IsRequired();
        builder.Property(item => item.ActivityType).HasConversion<string>().HasMaxLength(30);
        builder.HasIndex(item => new { item.StudyPlanId, item.SortOrder }).IsUnique();
        builder.HasOne(item => item.Topic)
            .WithMany(topic => topic.StudyPlanItems)
            .HasForeignKey(item => item.TopicId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

internal sealed class ProgressEntryConfiguration : BaseEntityConfiguration<ProgressEntry>
{
    public override void Configure(EntityTypeBuilder<ProgressEntry> builder)
    {
        base.Configure(builder);
        builder.HasIndex(entry => entry.ActivityDateUtc);
        builder.HasOne(entry => entry.Topic)
            .WithMany(topic => topic.ProgressEntries)
            .HasForeignKey(entry => entry.TopicId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
