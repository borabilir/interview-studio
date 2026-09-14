using InterviewPrep.Application.Features.AiAssistant;
using Microsoft.AspNetCore.Mvc;

namespace InterviewPrep.Api.Controllers;

[ApiController]
[Route("api/project-documents")]
public sealed class ProjectDocumentsController(IProjectDocumentService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProjectDocumentDto>>> GetAll(CancellationToken cancellationToken) =>
        Ok(await service.GetAllAsync(cancellationToken));

    [HttpGet("{projectId}")]
    public async Task<ActionResult<ProjectDocumentContent>> GetById(
        string projectId,
        CancellationToken cancellationToken)
    {
        var document = await service.GetByIdAsync(projectId, cancellationToken);
        return document is null ? NotFound() : Ok(document);
    }

    [HttpGet("{projectId}/sections")]
    public async Task<ActionResult<IReadOnlyList<ProjectDocumentSectionDto>>> GetSections(
        string projectId,
        CancellationToken cancellationToken) =>
        Ok(await service.GetSectionsAsync(projectId, cancellationToken));

    [HttpGet("{projectId}/sections/{sectionId}")]
    public async Task<ActionResult<ProjectDocumentSectionContent>> GetSection(
        string projectId,
        string sectionId,
        CancellationToken cancellationToken)
    {
        var section = await service.GetSectionAsync(projectId, sectionId, cancellationToken);
        return section is null ? NotFound() : Ok(section);
    }
}
