using InterviewPrep.Application.Features.Progress;
using Microsoft.AspNetCore.Mvc;

namespace InterviewPrep.Api.Controllers;

[ApiController]
[Route("api/progress")]
public sealed class ProgressController(IProgressService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProgressEntryDto>>> GetAll(
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] Guid? topicId,
        CancellationToken cancellationToken) =>
        Ok(await service.GetAllAsync(fromUtc, toUtc, topicId, cancellationToken));

    [HttpGet("overview")]
    public async Task<ActionResult<ProgressOverviewDto>> GetOverview(CancellationToken cancellationToken) =>
        Ok(await service.GetOverviewAsync(cancellationToken));

    [HttpPost]
    public async Task<ActionResult<ProgressEntryDto>> Create(
        [FromBody] CreateProgressEntryRequest request,
        CancellationToken cancellationToken)
    {
        var entry = await service.CreateAsync(request, cancellationToken);
        return Created($"/api/progress/{entry.Id}", entry);
    }
}
