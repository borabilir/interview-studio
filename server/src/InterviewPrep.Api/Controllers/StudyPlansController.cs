using InterviewPrep.Application.Features.StudyPlans;
using Microsoft.AspNetCore.Mvc;

namespace InterviewPrep.Api.Controllers;

[ApiController]
[Route("api/study-plans")]
public sealed class StudyPlansController(IStudyPlanService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StudyPlanDto>>> GetAll(
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        CancellationToken cancellationToken) =>
        Ok(await service.GetAllAsync(fromUtc, toUtc, cancellationToken));

    [HttpGet("today")]
    public async Task<ActionResult<IReadOnlyList<StudyPlanDto>>> GetToday(CancellationToken cancellationToken) =>
        Ok(await service.GetTodayAsync(cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<StudyPlanDto>> GetById(Guid id, CancellationToken cancellationToken) =>
        Ok(await service.GetByIdAsync(id, cancellationToken));

    [HttpPatch("{planId:guid}/items/{itemId:guid}")]
    public async Task<ActionResult<StudyPlanDto>> UpdateItem(
        Guid planId,
        Guid itemId,
        [FromBody] UpdateStudyPlanItemRequest request,
        CancellationToken cancellationToken) =>
        Ok(await service.UpdateItemAsync(planId, itemId, request, cancellationToken));

    [HttpPost("{planId:guid}/items/{itemId:guid}/toggle")]
    public async Task<ActionResult<StudyPlanDto>> ToggleItem(
        Guid planId,
        Guid itemId,
        CancellationToken cancellationToken) =>
        Ok(await service.ToggleItemAsync(planId, itemId, cancellationToken));
}
