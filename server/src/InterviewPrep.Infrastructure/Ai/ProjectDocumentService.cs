using InterviewPrep.Application.Features.AiAssistant;
using Microsoft.Extensions.Options;

namespace InterviewPrep.Infrastructure.Ai;

public sealed class ProjectDocumentService(IOptions<ProjectDocumentOptions> options) : IProjectDocumentService
{
    public Task<IReadOnlyList<ProjectDocumentDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var directory = GetDirectory();
        if (!System.IO.Directory.Exists(directory))
        {
            return Task.FromResult<IReadOnlyList<ProjectDocumentDto>>([]);
        }

        var documents = System.IO.Directory
            .EnumerateFiles(directory, "*.md", SearchOption.TopDirectoryOnly)
            .Select(path =>
            {
                var id = Path.GetFileNameWithoutExtension(path);
                return new ProjectDocumentDto(id, Humanize(id));
            })
            .OrderBy(document => document.Name)
            .ToList();

        return Task.FromResult<IReadOnlyList<ProjectDocumentDto>>(documents);
    }

    public async Task<ProjectDocumentContent?> GetByIdAsync(string projectId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(projectId))
        {
            return null;
        }

        var id = projectId.Trim();
        if (!Path.GetFileNameWithoutExtension(id).Equals(id, StringComparison.Ordinal))
        {
            return null;
        }

        var path = Path.Combine(GetDirectory(), $"{id}.md");
        if (!File.Exists(path))
        {
            return null;
        }

        var content = await File.ReadAllTextAsync(path, cancellationToken);
        return new ProjectDocumentContent(id, Humanize(id), content);
    }

    private string GetDirectory()
    {
        if (!string.IsNullOrWhiteSpace(options.Value.Directory))
        {
            return Path.GetFullPath(options.Value.Directory);
        }

        return Path.Combine(AppContext.BaseDirectory, "App_Data", "project-docs");
    }

    private static string Humanize(string id)
    {
        if (id.Equals("hcmonair", StringComparison.OrdinalIgnoreCase)) return "HCM OnAir";
        if (id.Equals("resumeparser", StringComparison.OrdinalIgnoreCase)) return "Resume Parser";

        return string.Join(' ', id.Split('-', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .Replace("chatbot", "Chatbot", StringComparison.OrdinalIgnoreCase)
            .Replace("dashboard", "Dashboard", StringComparison.OrdinalIgnoreCase)
            .Replace("backend", "Backend", StringComparison.OrdinalIgnoreCase)
            .Replace("widget", "Widget", StringComparison.OrdinalIgnoreCase)
            .Replace("adserve", "Adserve", StringComparison.OrdinalIgnoreCase)
            .Replace("novartis", "Novartis", StringComparison.OrdinalIgnoreCase)
            .Replace("rambly", "Rambly", StringComparison.OrdinalIgnoreCase);
    }
}
