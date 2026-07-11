using InterviewPrep.Application.Features.Search;
using Microsoft.AspNetCore.Mvc;

namespace InterviewPrep.Api.Controllers;

[ApiController]
[Route("api/search")]
public sealed class SearchController(ISearchService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SearchResultDto>>> Search(
        [FromQuery(Name = "q")] string? query,
        CancellationToken cancellationToken) =>
        Ok(await service.SearchAsync(query, cancellationToken));
}
