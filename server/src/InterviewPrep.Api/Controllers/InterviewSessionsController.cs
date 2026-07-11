using InterviewPrep.Application.Features.InterviewSessions;
using InterviewPrep.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace InterviewPrep.Api.Controllers;

[ApiController]
[Route("api/interview-sessions")]
public sealed class InterviewSessionsController(IInterviewSessionService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<InterviewSessionSummaryDto>>> GetAll(
        [FromQuery] InterviewType? type,
        [FromQuery] SessionStatus? status,
        CancellationToken cancellationToken) =>
        Ok(await service.GetAllAsync(type, status, cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<InterviewSessionDetailDto>> GetById(Guid id, CancellationToken cancellationToken) =>
        Ok(await service.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    public async Task<ActionResult<InterviewSessionDetailDto>> Create(
        [FromBody] CreateInterviewSessionRequest request,
        CancellationToken cancellationToken)
    {
        var session = await service.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = session.Id }, session);
    }

    [HttpPost("{id:guid}/answers")]
    public async Task<ActionResult<InterviewAnswerDto>> SubmitAnswer(
        Guid id,
        [FromBody] SubmitInterviewAnswerRequest request,
        CancellationToken cancellationToken) =>
        Ok(await service.SubmitAnswerAsync(id, request, cancellationToken));

    [HttpPost("{id:guid}/complete")]
    public async Task<ActionResult<InterviewSessionDetailDto>> Complete(
        Guid id,
        [FromBody] CompleteInterviewSessionRequest? request,
        CancellationToken cancellationToken) =>
        Ok(await service.CompleteAsync(id, request, cancellationToken));
}
