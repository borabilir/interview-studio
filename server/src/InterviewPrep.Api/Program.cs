using System.Text.Json.Serialization;
using InterviewPrep.Api;
using InterviewPrep.Application;
using InterviewPrep.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Avoid the Windows Event Log provider, which can require elevated access in
// local development and containers. Structured console logs work everywhere.
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

var dataDirectory = Path.Combine(builder.Environment.ContentRootPath, "App_Data");
Directory.CreateDirectory(dataDirectory);
var databasePath = Path.Combine(dataDirectory, "interview-prep.db");
var connectionString = builder.Configuration.GetConnectionString("InterviewPrep")
    ?? $"Data Source={databasePath}";

builder.Services.AddApplication();
builder.Services.AddInfrastructure(connectionString);
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new() { Title = "Mülakat Hazırlık API", Version = "v1" });
});
builder.Services.AddHealthChecks();
builder.Services.AddCors(options =>
{
    options.AddPolicy("WebClient", policy => policy
        .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? ["http://localhost:5173"])
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();

app.UseExceptionHandler();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors("WebClient");
app.MapControllers();
app.MapHealthChecks("/api/health");

await app.Services.InitializeDatabaseAsync();
await app.RunAsync();

public partial class Program;
