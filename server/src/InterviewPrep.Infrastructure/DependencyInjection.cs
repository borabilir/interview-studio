using InterviewPrep.Application.Abstractions.Persistence;
using InterviewPrep.Application.Features.AiAssistant;
using InterviewPrep.Infrastructure.Ai;
using InterviewPrep.Infrastructure.Persistence;
using InterviewPrep.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace InterviewPrep.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        string connectionString,
        IConfiguration configuration)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(connectionString);

        services.AddDbContext<InterviewPrepDbContext>(options =>
            options.UseSqlite(connectionString, sqlite =>
                sqlite.MigrationsAssembly(typeof(InterviewPrepDbContext).Assembly.FullName)));
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.Configure<OpenAiOptions>(configuration.GetSection("OpenAI"));
        services.Configure<ProjectDocumentOptions>(configuration.GetSection("ProjectDocuments"));
        services.AddSingleton<HttpClient>();
        services.AddScoped<IProjectDocumentService, ProjectDocumentService>();
        services.AddScoped<IAiAssistantService, OpenAiAssistantService>();
        return services;
    }

    public static async Task InitializeDatabaseAsync(
        this IServiceProvider services,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<InterviewPrepDbContext>();
        await DatabaseInitializer.InitializeAsync(context, cancellationToken);
    }
}
