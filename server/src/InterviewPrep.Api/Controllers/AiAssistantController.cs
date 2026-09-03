using System.Text.Json;
using InterviewPrep.Application.Features.AiAssistant;
using Microsoft.AspNetCore.Mvc;

namespace InterviewPrep.Api.Controllers;

[ApiController]
[Route("api/ai")]
public sealed class AiAssistantController(IAiAssistantService service) : ControllerBase
{
    [HttpPost("interview-answer/stream")]
    public async Task StreamInterviewAnswer(
        [FromBody] AiAssistantRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
        {
            Response.StatusCode = StatusCodes.Status400BadRequest;
            await Response.WriteAsJsonAsync(new { error = "Query is required." }, cancellationToken);
            return;
        }

        Response.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";

        await service.StreamInterviewAnswerAsync(
            request.Query,
            request.Section,
            request.ProjectId,
            request.PreviousAnswer,
            request.FollowUpQuestion,
            async (chunk, token) =>
            {
                await Response.WriteAsync($"data: {JsonSerializer.Serialize(chunk)}\n\n", token);
                await Response.Body.FlushAsync(token);
            },
            cancellationToken);

        await Response.WriteAsync("event: done\ndata: {}\n\n", cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);
    }
}
