using InterviewPrep.Application.Features.Notes;
using Microsoft.AspNetCore.Mvc;

namespace InterviewPrep.Api.Controllers;

[ApiController]
[Route("api/notes")]
public sealed class NotesController(INoteService noteService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<NoteSummaryDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<NoteSummaryDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] bool pinnedOnly = false,
        [FromQuery] bool favoritesOnly = false,
        [FromQuery] Guid? topicId = null,
        CancellationToken cancellationToken = default) =>
        Ok(await noteService.GetAllAsync(search, pinnedOnly, favoritesOnly, topicId, cancellationToken));

    [HttpGet("{id:guid}")]
    [ProducesResponseType<NoteDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<NoteDetailDto>> GetById(Guid id, CancellationToken cancellationToken) =>
        Ok(await noteService.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [ProducesResponseType<NoteDetailDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<NoteDetailDto>> Create(
        [FromBody] CreateNoteRequest request,
        CancellationToken cancellationToken)
    {
        var note = await noteService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = note.Id }, note);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType<NoteDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<NoteDetailDto>> Update(
        Guid id,
        [FromBody] UpdateNoteRequest request,
        CancellationToken cancellationToken) =>
        Ok(await noteService.UpdateAsync(id, request, cancellationToken));

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await noteService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
