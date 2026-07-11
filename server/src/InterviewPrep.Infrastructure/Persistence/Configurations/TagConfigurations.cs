using InterviewPrep.Domain.Common;
using InterviewPrep.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InterviewPrep.Infrastructure.Persistence.Configurations;

internal sealed class TagConfiguration : BaseEntityConfiguration<Tag>
{
    public override void Configure(EntityTypeBuilder<Tag> builder)
    {
        base.Configure(builder);
        builder.Property(tag => tag.Name).HasMaxLength(80).IsRequired();
        builder.Property(tag => tag.Slug).HasMaxLength(100).IsRequired();
        builder.Property(tag => tag.Color).HasMaxLength(16);
        builder.HasIndex(tag => tag.Name).IsUnique();
        builder.HasIndex(tag => tag.Slug).IsUnique();
    }
}

internal abstract class TagJoinConfiguration<TEntity> : BaseEntityConfiguration<TEntity>
    where TEntity : BaseEntity
{
}

internal sealed class TopicTagConfiguration : TagJoinConfiguration<TopicTag>
{
    public override void Configure(EntityTypeBuilder<TopicTag> builder)
    {
        base.Configure(builder);
        builder.HasIndex(join => new { join.TopicId, join.TagId }).IsUnique();
        builder.HasOne(join => join.Topic).WithMany(topic => topic.TopicTags)
            .HasForeignKey(join => join.TopicId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(join => join.Tag).WithMany(tag => tag.TopicTags)
            .HasForeignKey(join => join.TagId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class NoteTagConfiguration : TagJoinConfiguration<NoteTag>
{
    public override void Configure(EntityTypeBuilder<NoteTag> builder)
    {
        base.Configure(builder);
        builder.HasIndex(join => new { join.NoteId, join.TagId }).IsUnique();
        builder.HasOne(join => join.Note).WithMany(note => note.NoteTags)
            .HasForeignKey(join => join.NoteId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(join => join.Tag).WithMany(tag => tag.NoteTags)
            .HasForeignKey(join => join.TagId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class CodingQuestionTagConfiguration : TagJoinConfiguration<CodingQuestionTag>
{
    public override void Configure(EntityTypeBuilder<CodingQuestionTag> builder)
    {
        base.Configure(builder);
        builder.HasIndex(join => new { join.CodingQuestionId, join.TagId }).IsUnique();
        builder.HasOne(join => join.CodingQuestion).WithMany(question => question.CodingQuestionTags)
            .HasForeignKey(join => join.CodingQuestionId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(join => join.Tag).WithMany(tag => tag.CodingQuestionTags)
            .HasForeignKey(join => join.TagId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class FlashcardTagConfiguration : TagJoinConfiguration<FlashcardTag>
{
    public override void Configure(EntityTypeBuilder<FlashcardTag> builder)
    {
        base.Configure(builder);
        builder.HasIndex(join => new { join.FlashcardId, join.TagId }).IsUnique();
        builder.HasOne(join => join.Flashcard).WithMany(card => card.FlashcardTags)
            .HasForeignKey(join => join.FlashcardId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(join => join.Tag).WithMany(tag => tag.FlashcardTags)
            .HasForeignKey(join => join.TagId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class SystemDesignScenarioTagConfiguration : TagJoinConfiguration<SystemDesignScenarioTag>
{
    public override void Configure(EntityTypeBuilder<SystemDesignScenarioTag> builder)
    {
        base.Configure(builder);
        builder.HasIndex(join => new { join.SystemDesignScenarioId, join.TagId }).IsUnique();
        builder.HasOne(join => join.SystemDesignScenario).WithMany(scenario => scenario.SystemDesignScenarioTags)
            .HasForeignKey(join => join.SystemDesignScenarioId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(join => join.Tag).WithMany(tag => tag.SystemDesignScenarioTags)
            .HasForeignKey(join => join.TagId).OnDelete(DeleteBehavior.Cascade);
    }
}
