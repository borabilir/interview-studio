using InterviewPrep.Application.Features.CodingQuestions;
using InterviewPrep.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace InterviewPrep.Api.Controllers;

[ApiController]
[Route("api/coding-questions")]
public sealed class CodingQuestionsController(ICodingQuestionService service) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<CodingQuestionSummaryDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<CodingQuestionSummaryDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] Difficulty? difficulty,
        [FromQuery] string? language,
        [FromQuery] Guid? topicId,
        CancellationToken cancellationToken) =>
        Ok(await service.GetAllAsync(search, difficulty, language, topicId, cancellationToken));

    [HttpGet("{id:guid}")]
    [ProducesResponseType<CodingQuestionDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CodingQuestionDetailDto>> GetById(Guid id, CancellationToken cancellationToken) =>
        Ok(await service.GetByIdAsync(id, cancellationToken));

    [HttpPatch("{id:guid}/draft")]
    [ProducesResponseType<CodingQuestionDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CodingQuestionDetailDto>> UpdateDraft(
        Guid id,
        [FromBody] UpdateCodingDraftRequest request,
        CancellationToken cancellationToken) =>
        Ok(await service.UpdateDraftAsync(id, request, cancellationToken));

    [HttpPost("{id:guid}/attempts")]
    [ProducesResponseType<CodingAttemptDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<CodingAttemptDto>> SubmitAttempt(
        Guid id,
        [FromBody] SubmitCodingAttemptRequest request,
        CancellationToken cancellationToken)
    {
        var attempt = await service.SubmitAttemptAsync(id, request, cancellationToken);
        return Created($"/api/coding-questions/{id}#attempt-{attempt.Id}", attempt);
    }
}
