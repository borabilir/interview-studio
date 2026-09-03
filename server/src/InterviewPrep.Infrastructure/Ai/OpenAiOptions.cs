namespace InterviewPrep.Infrastructure.Ai;

public sealed class OpenAiOptions
{
    public string ApiKey { get; init; } = string.Empty;
    public string Model { get; init; } = "gpt-4.1-mini";
    public string BaseUrl { get; init; } = "https://api.openai.com/v1";
}
