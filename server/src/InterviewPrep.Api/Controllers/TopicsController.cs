using InterviewPrep.Application.Features.Topics;
using Microsoft.AspNetCore.Mvc;

namespace InterviewPrep.Api.Controllers;

[ApiController]
[Route("api/topics")]
public sealed class TopicsController(ITopicService topicService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<TopicDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TopicDto>>> GetAll(CancellationToken cancellationToken) =>
        Ok(await topicService.GetAllAsync(cancellationToken));

    [HttpGet("{id:guid}")]
    [ProducesResponseType<TopicDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TopicDto>> GetById(Guid id, CancellationToken cancellationToken) =>
        Ok(await topicService.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [ProducesResponseType<TopicDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TopicDto>> Create(
        [FromBody] CreateTopicRequest request,
        CancellationToken cancellationToken)
    {
        var topic = await topicService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = topic.Id }, topic);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType<TopicDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TopicDto>> Update(
        Guid id,
        [FromBody] UpdateTopicRequest request,
        CancellationToken cancellationToken) =>
        Ok(await topicService.UpdateAsync(id, request, cancellationToken));

    [HttpPatch("{id:guid}/progress")]
    [ProducesResponseType<TopicDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TopicDto>> UpdateProgress(
        Guid id,
        [FromBody] UpdateTopicProgressRequest request,
        CancellationToken cancellationToken) =>
        Ok(await topicService.UpdateProgressAsync(id, request, cancellationToken));

    [HttpPatch("reorder")]
    [ProducesResponseType<IReadOnlyList<TopicDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<TopicDto>>> Reorder(
        [FromBody] ReorderTopicsRequest request,
        CancellationToken cancellationToken) =>
        Ok(await topicService.ReorderAsync(request, cancellationToken));

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await topicService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
