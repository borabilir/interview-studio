using InterviewPrep.Application.Features.Dashboard;
using InterviewPrep.Application.Features.CodingQuestions;
using InterviewPrep.Application.Features.Flashcards;
using InterviewPrep.Application.Features.InterviewSessions;
using InterviewPrep.Application.Features.Notes;
using InterviewPrep.Application.Features.Progress;
using InterviewPrep.Application.Features.Search;
using InterviewPrep.Application.Features.StudyPlans;
using InterviewPrep.Application.Features.SystemDesignScenarios;
using InterviewPrep.Application.Features.Topics;
using Microsoft.Extensions.DependencyInjection;

namespace InterviewPrep.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<ITopicService, TopicService>();
        services.AddScoped<INoteService, NoteService>();
        services.AddScoped<ICodingQuestionService, CodingQuestionService>();
        services.AddScoped<IFlashcardService, FlashcardService>();
        services.AddScoped<IInterviewSessionService, InterviewSessionService>();
        services.AddScoped<ISystemDesignScenarioService, SystemDesignScenarioService>();
        services.AddScoped<IProgressService, ProgressService>();
        services.AddScoped<IStudyPlanService, StudyPlanService>();
        services.AddScoped<ISearchService, SearchService>();
        return services;
    }
}
