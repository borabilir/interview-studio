using InterviewPrep.Application.Abstractions.Persistence;
using InterviewPrep.Domain.Entities;

namespace InterviewPrep.Application.Features.Search;

internal sealed class SearchService(IUnitOfWork unitOfWork) : ISearchService
{
    public async Task<IReadOnlyList<SearchResultDto>> SearchAsync(
        string? query,
        CancellationToken cancellationToken = default)
    {
        var term = query?.Trim();
        if (string.IsNullOrWhiteSpace(term))
        {
            return [];
        }

        // Aynı scoped DbContext paralel sorguyu desteklemez; sorgular bilinçli olarak sıralı çalışır.
        var topics = await unitOfWork.Repository<Topic>().ListAsync(
            topic => new SearchResultDto(
                topic.Id,
                topic.Name,
                topic.Description,
                "Topic",
                "/topics/" + topic.Id),
            topic => !topic.IsArchived
                && (topic.Name.Contains(term)
                    || topic.Category.Contains(term)
                    || topic.Description.Contains(term)
                    || topic.TopicTags.Any(join => join.Tag.Name.Contains(term))),
            topics => topics.OrderBy(topic => topic.Name),
            take: 8,
            cancellationToken: cancellationToken);

        var notes = await unitOfWork.Repository<Note>().ListAsync(
            note => new SearchResultDto(
                note.Id,
                note.Title,
                note.Content.Length > 160 ? note.Content.Substring(0, 160) : note.Content,
                "Note",
                "/notes?id=" + note.Id),
            note => note.Title.Contains(term) || note.Content.Contains(term),
            notes => notes.OrderByDescending(note => note.UpdatedAtUtc),
            take: 8,
            cancellationToken: cancellationToken);

        var codingQuestions = await unitOfWork.Repository<CodingQuestion>().ListAsync(
            question => new SearchResultDto(
                question.Id,
                question.Title,
                question.Description,
                "CodingQuestion",
                "/coding?id=" + question.Id),
            question => question.Title.Contains(term)
                || question.Description.Contains(term)
                || question.StarterCode.Contains(term),
            questions => questions.OrderBy(question => question.Title),
            take: 8,
            cancellationToken: cancellationToken);

        var flashcards = await unitOfWork.Repository<Flashcard>().ListAsync(
            card => new SearchResultDto(
                card.Id,
                card.Question,
                card.Answer.Length > 160 ? card.Answer.Substring(0, 160) : card.Answer,
                "Flashcard",
                "/flashcards?id=" + card.Id),
            card => card.Question.Contains(term)
                || card.Answer.Contains(term)
                || (card.Why != null && card.Why.Contains(term))
                || (card.ProductionExample != null && card.ProductionExample.Contains(term))
                || (card.BankingExample != null && card.BankingExample.Contains(term))
                || (card.InterviewTip != null && card.InterviewTip.Contains(term))
                || (card.Topic != null && card.Topic.Name.Contains(term))
                || card.FlashcardTags.Any(join => join.Tag.Name.Contains(term)),
            cards => cards.OrderBy(card => card.NextReviewAtUtc),
            take: 8,
            cancellationToken: cancellationToken);

        var sessions = await unitOfWork.Repository<InterviewSession>().ListAsync(
            session => new SearchResultDto(
                session.Id,
                session.Title,
                session.SummaryFeedback,
                "InterviewSession",
                "/mock-interviews?id=" + session.Id),
            session => session.Title.Contains(term) || session.SummaryFeedback.Contains(term),
            sessions => sessions.OrderByDescending(session => session.UpdatedAtUtc),
            take: 6,
            cancellationToken: cancellationToken);

        var interviewQuestions = await unitOfWork.Repository<InterviewAnswer>().ListAsync(
            answer => new SearchResultDto(
                answer.Id,
                answer.Question,
                answer.InterviewSession.Title,
                "InterviewQuestion",
                "/mock-interviews?id=" + answer.InterviewSessionId),
            answer => answer.Question.Contains(term) || answer.Answer.Contains(term),
            answers => answers.OrderByDescending(answer => answer.UpdatedAtUtc),
            take: 8,
            cancellationToken: cancellationToken);

        var systemDesigns = await unitOfWork.Repository<SystemDesignScenario>().ListAsync(
            scenario => new SearchResultDto(
                scenario.Id,
                scenario.Title,
                scenario.Problem,
                "SystemDesignScenario",
                "/system-design?id=" + scenario.Id),
            scenario => scenario.Title.Contains(term)
                || scenario.Problem.Contains(term)
                || scenario.Architecture.Contains(term)
                || scenario.Requirements.Contains(term),
            scenarios => scenarios.OrderByDescending(scenario => scenario.UpdatedAtUtc),
            take: 8,
            cancellationToken: cancellationToken);

        return topics
            .Concat(notes)
            .Concat(codingQuestions)
            .Concat(flashcards)
            .Concat(sessions)
            .Concat(interviewQuestions)
            .Concat(systemDesigns)
            .Take(40)
            .ToList();
    }
}
