using System.Text.Json;
using InterviewPrep.Application.Features.AiAssistant;
using Microsoft.Extensions.Options;

namespace InterviewPrep.Infrastructure.Ai;

public sealed class ProjectDocumentService(IOptions<ProjectDocumentOptions> options) : IProjectDocumentService
{
    private const string OverviewSectionId = "overview";
    private static readonly JsonSerializerOptions MetadataJsonOptions = new(JsonSerializerDefaults.Web);

    public Task<IReadOnlyList<ProjectDocumentDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var directory = GetDirectory();
        if (!Directory.Exists(directory))
        {
            return Task.FromResult<IReadOnlyList<ProjectDocumentDto>>([]);
        }

        var directoryProjects = Directory
            .EnumerateDirectories(directory, "*", SearchOption.TopDirectoryOnly)
            .Where(path => EnumerateSectionFiles(path).Count > 0)
            .Select(CreateDirectoryProject)
            .ToDictionary(document => document.Id, StringComparer.OrdinalIgnoreCase);

        var flatProjects = Directory
            .EnumerateFiles(directory, "*.md", SearchOption.TopDirectoryOnly)
            .Select(path =>
            {
                var id = Path.GetFileNameWithoutExtension(path);
                return new ProjectDocumentDto(id, Humanize(id), null, null, "Reference", 1);
            })
            .Where(document => !directoryProjects.ContainsKey(document.Id));

        var documents = directoryProjects.Values
            .Concat(flatProjects)
            .OrderBy(document => document.Name)
            .ToList();

        return Task.FromResult<IReadOnlyList<ProjectDocumentDto>>(documents);
    }

    public async Task<ProjectDocumentContent?> GetByIdAsync(
        string projectId,
        CancellationToken cancellationToken = default)
    {
        var id = NormalizeId(projectId);
        if (id is null)
        {
            return null;
        }

        var projectDirectory = Path.Combine(GetDirectory(), id);
        if (Directory.Exists(projectDirectory))
        {
            var files = EnumerateSectionFiles(projectDirectory);
            if (files.Count == 0)
            {
                return null;
            }

            var sections = new List<string>(files.Count);
            foreach (var file in files)
            {
                sections.Add(await File.ReadAllTextAsync(file, cancellationToken));
            }

            var metadata = ReadMetadata(projectDirectory);
            return new ProjectDocumentContent(
                id,
                metadata?.Name ?? Humanize(id),
                string.Join("\n\n---\n\n", sections));
        }

        var path = Path.Combine(GetDirectory(), $"{id}.md");
        if (!File.Exists(path))
        {
            return null;
        }

        var content = await File.ReadAllTextAsync(path, cancellationToken);
        return new ProjectDocumentContent(id, Humanize(id), content);
    }

    public Task<IReadOnlyList<ProjectDocumentSectionDto>> GetSectionsAsync(
        string projectId,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var id = NormalizeId(projectId);
        if (id is null)
        {
            return Task.FromResult<IReadOnlyList<ProjectDocumentSectionDto>>([]);
        }

        var projectDirectory = Path.Combine(GetDirectory(), id);
        if (Directory.Exists(projectDirectory))
        {
            var sections = EnumerateSectionFiles(projectDirectory)
                .Select(path => new ProjectDocumentSectionDto(
                    Path.GetFileNameWithoutExtension(path),
                    ReadMarkdownTitle(path) ?? HumanizeSection(Path.GetFileNameWithoutExtension(path))))
                .ToList();

            return Task.FromResult<IReadOnlyList<ProjectDocumentSectionDto>>(sections);
        }

        var flatPath = Path.Combine(GetDirectory(), $"{id}.md");
        IReadOnlyList<ProjectDocumentSectionDto> flatSections = File.Exists(flatPath)
            ? [new ProjectDocumentSectionDto(OverviewSectionId, ReadMarkdownTitle(flatPath) ?? "Genel Bakış")]
            : [];

        return Task.FromResult(flatSections);
    }

    public async Task<ProjectDocumentSectionContent?> GetSectionAsync(
        string projectId,
        string sectionId,
        CancellationToken cancellationToken = default)
    {
        var projectIdValue = NormalizeId(projectId);
        var sectionIdValue = NormalizeId(sectionId);
        if (projectIdValue is null || sectionIdValue is null)
        {
            return null;
        }

        var projectDirectory = Path.Combine(GetDirectory(), projectIdValue);
        string path;
        if (Directory.Exists(projectDirectory))
        {
            path = Path.Combine(projectDirectory, $"{sectionIdValue}.md");
        }
        else if (sectionIdValue.Equals(OverviewSectionId, StringComparison.OrdinalIgnoreCase))
        {
            path = Path.Combine(GetDirectory(), $"{projectIdValue}.md");
        }
        else
        {
            return null;
        }

        if (!File.Exists(path))
        {
            return null;
        }

        var content = await File.ReadAllTextAsync(path, cancellationToken);
        return new ProjectDocumentSectionContent(
            sectionIdValue,
            projectIdValue,
            ReadMarkdownTitle(path) ?? HumanizeSection(sectionIdValue),
            content);
    }

    private ProjectDocumentDto CreateDirectoryProject(string projectDirectory)
    {
        var id = Path.GetFileName(projectDirectory);
        var metadata = ReadMetadata(projectDirectory);
        return new ProjectDocumentDto(
            id,
            metadata?.Name ?? Humanize(id),
            metadata?.Subtitle,
            metadata?.Description,
            metadata?.Status ?? "Living document",
            EnumerateSectionFiles(projectDirectory).Count);
    }

    private static List<string> EnumerateSectionFiles(string projectDirectory) =>
        Directory
            .EnumerateFiles(projectDirectory, "*.md", SearchOption.TopDirectoryOnly)
            .OrderBy(path => Path.GetFileName(path), StringComparer.OrdinalIgnoreCase)
            .ToList();

    private static ProjectMetadata? ReadMetadata(string projectDirectory)
    {
        var path = Path.Combine(projectDirectory, "project.json");
        if (!File.Exists(path))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<ProjectMetadata>(File.ReadAllText(path), MetadataJsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private string GetDirectory()
    {
        if (!string.IsNullOrWhiteSpace(options.Value.Directory))
        {
            return Path.GetFullPath(options.Value.Directory);
        }

        return Path.Combine(AppContext.BaseDirectory, "App_Data", "project-docs");
    }

    private static string? NormalizeId(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var id = value.Trim();
        return Path.GetFileNameWithoutExtension(id).Equals(id, StringComparison.Ordinal)
            && Path.GetFileName(id).Equals(id, StringComparison.Ordinal)
            ? id
            : null;
    }

    private static string? ReadMarkdownTitle(string path)
    {
        foreach (var line in File.ReadLines(path))
        {
            if (line.StartsWith("# ", StringComparison.Ordinal))
            {
                return line[2..].Trim();
            }
        }

        return null;
    }

    private static string HumanizeSection(string id)
    {
        var withoutOrder = id.TrimStart('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '_');
        return string.Join(' ', withoutOrder.Split('-', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
    }

    private static string Humanize(string id)
    {
        if (id.Equals("ledgerly", StringComparison.OrdinalIgnoreCase)) return "Ledgerly";
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

    private sealed record ProjectMetadata(
        string? Name,
        string? Subtitle,
        string? Description,
        string? Status);
}
