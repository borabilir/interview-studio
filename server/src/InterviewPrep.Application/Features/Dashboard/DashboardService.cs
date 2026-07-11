using InterviewPrep.Application.Abstractions.Persistence;
using InterviewPrep.Domain.Entities;

namespace InterviewPrep.Application.Features.Dashboard;

internal sealed class DashboardService(IUnitOfWork unitOfWork) : IDashboardService
{
    public async Task<DashboardDto> GetAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var today = now.Date;
        var tomorrow = today.AddDays(1);
        var weekStart = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));

        var plans = await unitOfWork.Repository<StudyPlan>().ListAsync(
            plan => new StudyPlanSummaryDto(
                plan.Id,
                plan.Title,
                plan.Status,
                plan.PlannedMinutes,
                plan.ActualMinutes,
                plan.Items.OrderBy(item => item.SortOrder)
                    .Select(item => new StudyPlanItemDto(
                        item.Id,
                        item.Title,
                        item.ActivityType,
                        item.Topic == null ? null : item.Topic.Name,
                        item.PlannedMinutes,
                        item.IsCompleted))
                    .ToList()),
            plan => plan.ScheduledForUtc >= today && plan.ScheduledForUtc < tomorrow,
            plans => plans.OrderBy(plan => plan.ScheduledForUtc),
            cancellationToken: cancellationToken);

        var recentNotes = await unitOfWork.Repository<Note>().ListAsync(
            note => new RecentNoteDto(
                note.Id,
                note.Title,
                note.Topic == null ? null : note.Topic.Name,
                note.IsPinned,
                note.UpdatedAtUtc),
            orderBy: notes => notes.OrderByDescending(note => note.UpdatedAtUtc),
            take: 5,
            cancellationToken: cancellationToken);

        var reviewCutoff = now.AddDays(7);
        var upcomingCards = await unitOfWork.Repository<Flashcard>().ListAsync(
            card => new UpcomingFlashcardDto(
                card.Id,
                card.Question,
                card.Topic == null ? null : card.Topic.Name,
                card.Difficulty,
                card.NextReviewAtUtc),
            card => card.NextReviewAtUtc <= reviewCutoff,
            cards => cards.OrderBy(card => card.NextReviewAtUtc),
            take: 6,
            cancellationToken: cancellationToken);

        var activityDates = await unitOfWork.Repository<ProgressEntry>().ListAsync(
            entry => entry.ActivityDateUtc,
            entry => entry.MinutesStudied > 0,
            entries => entries.OrderByDescending(entry => entry.ActivityDateUtc),
            cancellationToken: cancellationToken);

        var activeTopics = await unitOfWork.Repository<Topic>().ListAsync(
            topic => new { topic.Id, topic.ConfidenceLevel },
            topic => !topic.IsArchived,
            cancellationToken: cancellationToken);

        var weakTopics = await unitOfWork.Repository<Topic>().ListAsync(
            topic => new WeakTopicDto(
                topic.Id,
                topic.Name,
                topic.Category,
                topic.Progress,
                topic.ConfidenceLevel,
                topic.Priority),
            topic => !topic.IsArchived && (topic.ConfidenceLevel < 65 || topic.Progress < 50),
            topics => topics.OrderBy(topic => topic.ConfidenceLevel).ThenBy(topic => topic.Progress),
            take: 5,
            cancellationToken: cancellationToken);

        var solvedQuestions = await unitOfWork.Repository<CodingAttempt>().ListAsync(
            attempt => new RecentCodingAttemptDto(
                attempt.Id,
                attempt.CodingQuestionId,
                attempt.CodingQuestion.Title,
                attempt.Language,
                attempt.CodingQuestion.Difficulty,
                attempt.CorrectnessScore,
                attempt.SubmittedAtUtc),
            attempt => attempt.CorrectnessScore >= 70,
            attempts => attempts.OrderByDescending(attempt => attempt.SubmittedAtUtc),
            take: 5,
            cancellationToken: cancellationToken);

        var codeFeedback = await unitOfWork.Repository<CodingAttempt>().ListAsync(
            attempt => new AiFeedbackDto(
                attempt.Id,
                "Code review",
                attempt.CodingQuestion.Title,
                attempt.InterviewFeedback,
                attempt.SubmittedAtUtc),
            attempt => attempt.InterviewFeedback != string.Empty,
            attempts => attempts.OrderByDescending(attempt => attempt.SubmittedAtUtc),
            take: 4,
            cancellationToken: cancellationToken);

        var interviewFeedback = await unitOfWork.Repository<InterviewAnswer>().ListAsync(
            answer => new AiFeedbackDto(
                answer.Id,
                "Mock interview",
                answer.Question,
                answer.Feedback,
                answer.CreatedAtUtc),
            answer => answer.Feedback != string.Empty,
            answers => answers.OrderByDescending(answer => answer.CreatedAtUtc),
            take: 4,
            cancellationToken: cancellationToken);

        var topicCount = activeTopics.Count;
        var noteCount = await unitOfWork.Repository<Note>().CountAsync(cancellationToken: cancellationToken);
        var solvedCount = await unitOfWork.Repository<CodingAttempt>().CountAsync(
            attempt => attempt.CorrectnessScore >= 70, cancellationToken);
        var cardsDue = await unitOfWork.Repository<Flashcard>().CountAsync(
            card => card.NextReviewAtUtc <= now, cancellationToken);
        var weekMinutes = await unitOfWork.Repository<ProgressEntry>().ListAsync(
            entry => entry.MinutesStudied,
            entry => entry.ActivityDateUtc >= weekStart,
            cancellationToken: cancellationToken);

        var confidence = activeTopics.Count == 0
            ? 0
            : Math.Round(activeTopics.Average(topic => topic.ConfidenceLevel), 1);

        var feedback = codeFeedback.Concat(interviewFeedback)
            .OrderByDescending(item => item.CreatedAtUtc)
            .Take(6)
            .ToList();

        return new DashboardDto(
            plans,
            recentNotes,
            upcomingCards,
            CalculateStudyStreak(activityDates, today),
            confidence,
            weakTopics,
            solvedQuestions,
            feedback,
            new DashboardTotalsDto(topicCount, noteCount, solvedCount, cardsDue, weekMinutes.Sum()));
    }

    private static int CalculateStudyStreak(IEnumerable<DateTime> activityDates, DateTime today)
    {
        var days = activityDates.Select(value => value.Date).Distinct().ToHashSet();
        var cursor = days.Contains(today) ? today : today.AddDays(-1);
        var streak = 0;

        while (days.Contains(cursor))
        {
            streak++;
            cursor = cursor.AddDays(-1);
        }

        return streak;
    }
}
