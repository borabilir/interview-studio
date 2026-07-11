using InterviewPrep.Application.Features.SystemDesignScenarios;
using Microsoft.AspNetCore.Mvc;

namespace InterviewPrep.Api.Controllers;

[ApiController]
[Route("api/system-design-scenarios")]
public sealed class SystemDesignScenariosController(ISystemDesignScenarioService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SystemDesignSummaryDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] Guid? topicId,
        CancellationToken cancellationToken) =>
        Ok(await service.GetAllAsync(search, topicId, cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SystemDesignScenarioDto>> GetById(Guid id, CancellationToken cancellationToken) =>
        Ok(await service.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    public async Task<ActionResult<SystemDesignScenarioDto>> Create(
        [FromBody] UpsertSystemDesignScenarioRequest request,
        CancellationToken cancellationToken)
    {
        var scenario = await service.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = scenario.Id }, scenario);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<SystemDesignScenarioDto>> Update(
        Guid id,
        [FromBody] UpsertSystemDesignScenarioRequest request,
        CancellationToken cancellationToken) =>
        Ok(await service.UpdateAsync(id, request, cancellationToken));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await service.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
