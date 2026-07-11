using InterviewPrep.Application.Features.Flashcards;
using Microsoft.AspNetCore.Mvc;

namespace InterviewPrep.Api.Controllers;

[ApiController]
[Route("api/flashcards")]
public sealed class FlashcardsController(IFlashcardService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<FlashcardDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] bool dueOnly = false,
        [FromQuery] Guid? topicId = null,
        [FromQuery] string? tag = null,
        CancellationToken cancellationToken = default) =>
        Ok(await service.GetAllAsync(search, dueOnly, topicId, tag, cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<FlashcardDto>> GetById(Guid id, CancellationToken cancellationToken) =>
        Ok(await service.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    public async Task<ActionResult<FlashcardDto>> Create(
        [FromBody] CreateFlashcardRequest request,
        CancellationToken cancellationToken)
    {
        var card = await service.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = card.Id }, card);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<FlashcardDto>> Update(
        Guid id,
        [FromBody] UpdateFlashcardRequest request,
        CancellationToken cancellationToken) =>
        Ok(await service.UpdateAsync(id, request, cancellationToken));

    [HttpPost("{id:guid}/review")]
    public async Task<ActionResult<FlashcardDto>> Review(
        Guid id,
        [FromBody] ReviewFlashcardRequest request,
        CancellationToken cancellationToken) =>
        Ok(await service.ReviewAsync(id, request, cancellationToken));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await service.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
