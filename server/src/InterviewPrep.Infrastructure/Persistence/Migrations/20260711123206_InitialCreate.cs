using System;
using Microsoft.EntityFrameworkCore.Migrations;

#pragma warning disable CA1861 // EF Core tarafından üretilen migration sabit kolon dizileri kullanır.

#nullable disable

namespace InterviewPrep.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "InterviewSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 240, nullable: false),
                    Type = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    StartedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CompletedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    TechnicalAccuracyScore = table.Column<int>(type: "INTEGER", nullable: false),
                    CommunicationScore = table.Column<int>(type: "INTEGER", nullable: false),
                    ConfidenceScore = table.Column<int>(type: "INTEGER", nullable: false),
                    StructureScore = table.Column<int>(type: "INTEGER", nullable: false),
                    SummaryFeedback = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InterviewSessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StudyPlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 240, nullable: false),
                    ScheduledForUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    PlannedMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    ActualMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudyPlans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Tags",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Slug = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Color = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tags", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Topics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Category = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    Priority = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    Progress = table.Column<int>(type: "INTEGER", nullable: false),
                    ConfidenceLevel = table.Column<int>(type: "INTEGER", nullable: false),
                    EstimatedMastery = table.Column<int>(type: "INTEGER", nullable: false),
                    AccentColor = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    IsArchived = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Topics", x => x.Id);
                    table.CheckConstraint("CK_Topics_Confidence", "ConfidenceLevel >= 0 AND ConfidenceLevel <= 100");
                    table.CheckConstraint("CK_Topics_Mastery", "EstimatedMastery >= 0 AND EstimatedMastery <= 100");
                    table.CheckConstraint("CK_Topics_Progress", "Progress >= 0 AND Progress <= 100");
                });

            migrationBuilder.CreateTable(
                name: "InterviewAnswers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    InterviewSessionId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Sequence = table.Column<int>(type: "INTEGER", nullable: false),
                    Question = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false),
                    Answer = table.Column<string>(type: "TEXT", nullable: false),
                    TechnicalAccuracyScore = table.Column<int>(type: "INTEGER", nullable: false),
                    CommunicationScore = table.Column<int>(type: "INTEGER", nullable: false),
                    ConfidenceScore = table.Column<int>(type: "INTEGER", nullable: false),
                    StructureScore = table.Column<int>(type: "INTEGER", nullable: false),
                    MissingDetails = table.Column<string>(type: "TEXT", nullable: false),
                    Feedback = table.Column<string>(type: "TEXT", nullable: false),
                    FollowUpQuestions = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InterviewAnswers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InterviewAnswers_InterviewSessions_InterviewSessionId",
                        column: x => x.InterviewSessionId,
                        principalTable: "InterviewSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CodingQuestions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 240, nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    Difficulty = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    Language = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    StarterCode = table.Column<string>(type: "TEXT", nullable: false),
                    ExpectedSolution = table.Column<string>(type: "TEXT", nullable: false),
                    Confidence = table.Column<int>(type: "INTEGER", nullable: false),
                    TopicId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CodingQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CodingQuestions_Topics_TopicId",
                        column: x => x.TopicId,
                        principalTable: "Topics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Flashcards",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Question = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    Answer = table.Column<string>(type: "TEXT", nullable: false),
                    Difficulty = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    TopicId = table.Column<Guid>(type: "TEXT", nullable: true),
                    NextReviewAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    LastReviewedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    IntervalDays = table.Column<int>(type: "INTEGER", nullable: false),
                    RepetitionCount = table.Column<int>(type: "INTEGER", nullable: false),
                    EaseFactor = table.Column<double>(type: "REAL", nullable: false),
                    ReviewCount = table.Column<int>(type: "INTEGER", nullable: false),
                    CorrectReviewCount = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Flashcards", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Flashcards_Topics_TopicId",
                        column: x => x.TopicId,
                        principalTable: "Topics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Notes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 240, nullable: false),
                    Content = table.Column<string>(type: "TEXT", nullable: false),
                    AiSummary = table.Column<string>(type: "TEXT", nullable: true),
                    AiExplanation = table.Column<string>(type: "TEXT", nullable: true),
                    AiImprovementSuggestions = table.Column<string>(type: "TEXT", nullable: true),
                    IsPinned = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsFavorite = table.Column<bool>(type: "INTEGER", nullable: false),
                    CurrentVersion = table.Column<int>(type: "INTEGER", nullable: false),
                    TopicId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notes_Topics_TopicId",
                        column: x => x.TopicId,
                        principalTable: "Topics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "ProgressEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ActivityDateUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    MinutesStudied = table.Column<int>(type: "INTEGER", nullable: false),
                    QuestionsSolved = table.Column<int>(type: "INTEGER", nullable: false),
                    CodingAttempts = table.Column<int>(type: "INTEGER", nullable: false),
                    MockInterviews = table.Column<int>(type: "INTEGER", nullable: false),
                    ConfidenceScore = table.Column<int>(type: "INTEGER", nullable: false),
                    TopicId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProgressEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProgressEntries_Topics_TopicId",
                        column: x => x.TopicId,
                        principalTable: "Topics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "StudyPlanItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    StudyPlanId = table.Column<Guid>(type: "TEXT", nullable: false),
                    TopicId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Title = table.Column<string>(type: "TEXT", maxLength: 240, nullable: false),
                    ActivityType = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    ResourceId = table.Column<Guid>(type: "TEXT", nullable: true),
                    PlannedMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    IsCompleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudyPlanItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StudyPlanItems_StudyPlans_StudyPlanId",
                        column: x => x.StudyPlanId,
                        principalTable: "StudyPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StudyPlanItems_Topics_TopicId",
                        column: x => x.TopicId,
                        principalTable: "Topics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "SystemDesignScenarios",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 240, nullable: false),
                    Problem = table.Column<string>(type: "TEXT", nullable: false),
                    Requirements = table.Column<string>(type: "TEXT", nullable: false),
                    Constraints = table.Column<string>(type: "TEXT", nullable: false),
                    Architecture = table.Column<string>(type: "TEXT", nullable: false),
                    Diagram = table.Column<string>(type: "TEXT", nullable: true),
                    Pros = table.Column<string>(type: "TEXT", nullable: false),
                    Cons = table.Column<string>(type: "TEXT", nullable: false),
                    Scalability = table.Column<string>(type: "TEXT", nullable: false),
                    Security = table.Column<string>(type: "TEXT", nullable: false),
                    Caching = table.Column<string>(type: "TEXT", nullable: false),
                    Monitoring = table.Column<string>(type: "TEXT", nullable: false),
                    Logging = table.Column<string>(type: "TEXT", nullable: false),
                    MessageQueue = table.Column<string>(type: "TEXT", nullable: false),
                    Database = table.Column<string>(type: "TEXT", nullable: false),
                    ApiDesign = table.Column<string>(type: "TEXT", nullable: false),
                    AiCritique = table.Column<string>(type: "TEXT", nullable: false),
                    Confidence = table.Column<int>(type: "INTEGER", nullable: false),
                    TopicId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemDesignScenarios", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SystemDesignScenarios_Topics_TopicId",
                        column: x => x.TopicId,
                        principalTable: "Topics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "TopicTag",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TopicId = table.Column<Guid>(type: "TEXT", nullable: false),
                    TagId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TopicTag", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TopicTag_Tags_TagId",
                        column: x => x.TagId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TopicTag_Topics_TopicId",
                        column: x => x.TopicId,
                        principalTable: "Topics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CodingAttempts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CodingQuestionId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Solution = table.Column<string>(type: "TEXT", nullable: false),
                    Language = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    AttemptNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    CorrectnessScore = table.Column<int>(type: "INTEGER", nullable: false),
                    ReadabilityScore = table.Column<int>(type: "INTEGER", nullable: false),
                    PerformanceScore = table.Column<int>(type: "INTEGER", nullable: false),
                    ArchitectureScore = table.Column<int>(type: "INTEGER", nullable: false),
                    BestPracticesFeedback = table.Column<string>(type: "TEXT", nullable: false),
                    InterviewFeedback = table.Column<string>(type: "TEXT", nullable: false),
                    FollowUpQuestions = table.Column<string>(type: "TEXT", nullable: false),
                    AlternativeSolution = table.Column<string>(type: "TEXT", nullable: false),
                    SeniorLevelImprovements = table.Column<string>(type: "TEXT", nullable: false),
                    DurationMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    SubmittedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CodingAttempts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CodingAttempts_CodingQuestions_CodingQuestionId",
                        column: x => x.CodingQuestionId,
                        principalTable: "CodingQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CodingQuestionTag",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CodingQuestionId = table.Column<Guid>(type: "TEXT", nullable: false),
                    TagId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CodingQuestionTag", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CodingQuestionTag_CodingQuestions_CodingQuestionId",
                        column: x => x.CodingQuestionId,
                        principalTable: "CodingQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CodingQuestionTag_Tags_TagId",
                        column: x => x.TagId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FlashcardTag",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    FlashcardId = table.Column<Guid>(type: "TEXT", nullable: false),
                    TagId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FlashcardTag", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FlashcardTag_Flashcards_FlashcardId",
                        column: x => x.FlashcardId,
                        principalTable: "Flashcards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FlashcardTag_Tags_TagId",
                        column: x => x.TagId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NoteTag",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    NoteId = table.Column<Guid>(type: "TEXT", nullable: false),
                    TagId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NoteTag", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NoteTag_Notes_NoteId",
                        column: x => x.NoteId,
                        principalTable: "Notes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NoteTag_Tags_TagId",
                        column: x => x.TagId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NoteVersions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    NoteId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Version = table.Column<int>(type: "INTEGER", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 240, nullable: false),
                    Content = table.Column<string>(type: "TEXT", nullable: false),
                    ChangeSummary = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NoteVersions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NoteVersions_Notes_NoteId",
                        column: x => x.NoteId,
                        principalTable: "Notes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SystemDesignScenarioTag",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    SystemDesignScenarioId = table.Column<Guid>(type: "TEXT", nullable: false),
                    TagId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemDesignScenarioTag", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SystemDesignScenarioTag_SystemDesignScenarios_SystemDesignScenarioId",
                        column: x => x.SystemDesignScenarioId,
                        principalTable: "SystemDesignScenarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SystemDesignScenarioTag_Tags_TagId",
                        column: x => x.TagId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CodingAttempts_CodingQuestionId_AttemptNumber",
                table: "CodingAttempts",
                columns: new[] { "CodingQuestionId", "AttemptNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CodingAttempts_SubmittedAtUtc",
                table: "CodingAttempts",
                column: "SubmittedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_CodingAttempts_UpdatedAtUtc",
                table: "CodingAttempts",
                column: "UpdatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_CodingQuestions_TopicId",
                table: "CodingQuestions",
                column: "TopicId");

            migrationBuilder.CreateIndex(
                name: "IX_CodingQuestions_UpdatedAtUtc",
                table: "CodingQuestions",
                column: "UpdatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_CodingQuestionTag_CodingQuestionId_TagId",
                table: "CodingQuestionTag",
                columns: new[] { "CodingQuestionId", "TagId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CodingQuestionTag_TagId",
                table: "CodingQuestionTag",
                column: "TagId");

            migrationBuilder.CreateIndex(
                name: "IX_CodingQuestionTag_UpdatedAtUtc",
                table: "CodingQuestionTag",
                column: "UpdatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_Flashcards_NextReviewAtUtc",
                table: "Flashcards",
                column: "NextReviewAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_Flashcards_TopicId",
                table: "Flashcards",
                column: "TopicId");

            migrationBuilder.CreateIndex(
                name: "IX_Flashcards_UpdatedAtUtc",
                table: "Flashcards",
                column: "UpdatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_FlashcardTag_FlashcardId_TagId",
                table: "FlashcardTag",
                columns: new[] { "FlashcardId", "TagId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FlashcardTag_TagId",
                table: "FlashcardTag",
                column: "TagId");

            migrationBuilder.CreateIndex(
                name: "IX_FlashcardTag_UpdatedAtUtc",
                table: "FlashcardTag",
                column: "UpdatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_InterviewAnswers_InterviewSessionId_Sequence",
                table: "InterviewAnswers",
                columns: new[] { "InterviewSessionId", "Sequence" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InterviewAnswers_UpdatedAtUtc",
                table: "InterviewAnswers",
                column: "UpdatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_InterviewSessions_UpdatedAtUtc",
                table: "InterviewSessions",
                column: "UpdatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_Notes_IsPinned_UpdatedAtUtc",
                table: "Notes",
                columns: new[] { "IsPinned", "UpdatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Notes_TopicId",
                table: "Notes",
                column: "TopicId");

            migrationBuilder.CreateIndex(
                name: "IX_Notes_UpdatedAtUtc",
                table: "Notes",
                column: "UpdatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_NoteTag_NoteId_TagId",
                table: "NoteTag",
                columns: new[] { "NoteId", "TagId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NoteTag_TagId",
                table: "NoteTag",
                column: "TagId");

            migrationBuilder.CreateIndex(
                name: "IX_NoteTag_UpdatedAtUtc",
                table: "NoteTag",
                column: "UpdatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_NoteVersions_NoteId_Version",
                table: "NoteVersions",
                columns: new[] { "NoteId", "Version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NoteVersions_UpdatedAtUtc",
                table: "NoteVersions",
                column: "UpdatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_ProgressEntries_ActivityDateUtc",
                table: "ProgressEntries",
                column: "ActivityDateUtc");

            migrationBuilder.CreateIndex(
                name: "IX_ProgressEntries_TopicId",
                table: "ProgressEntries",
                column: "TopicId");

            migrationBuilder.CreateIndex(
                name: "IX_ProgressEntries_UpdatedAtUtc",
                table: "ProgressEntries",
                column: "UpdatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_StudyPlanItems_StudyPlanId_SortOrder",
                table: "StudyPlanItems",
                columns: new[] { "StudyPlanId", "SortOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StudyPlanItems_TopicId",
                table: "StudyPlanItems",
                column: "TopicId");

            migrationBuilder.CreateIndex(
                name: "IX_StudyPlanItems_UpdatedAtUtc",
                table: "StudyPlanItems",
                column: "UpdatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_StudyPlans_ScheduledForUtc",
                table: "StudyPlans",
                column: "ScheduledForUtc");

            migrationBuilder.CreateIndex(
                name: "IX_StudyPlans_UpdatedAtUtc",
                table: "StudyPlans",
                column: "UpdatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_SystemDesignScenarios_TopicId",
                table: "SystemDesignScenarios",
                column: "TopicId");

            migrationBuilder.CreateIndex(
                name: "IX_SystemDesignScenarios_UpdatedAtUtc",
                table: "SystemDesignScenarios",
                column: "UpdatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_SystemDesignScenarioTag_SystemDesignScenarioId_TagId",
                table: "SystemDesignScenarioTag",
                columns: new[] { "SystemDesignScenarioId", "TagId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SystemDesignScenarioTag_TagId",
                table: "SystemDesignScenarioTag",
                column: "TagId");

            migrationBuilder.CreateIndex(
                name: "IX_SystemDesignScenarioTag_UpdatedAtUtc",
                table: "SystemDesignScenarioTag",
                column: "UpdatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_Tags_Name",
                table: "Tags",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tags_Slug",
                table: "Tags",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tags_UpdatedAtUtc",
                table: "Tags",
                column: "UpdatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_Topics_Name",
                table: "Topics",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Topics_UpdatedAtUtc",
                table: "Topics",
                column: "UpdatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_TopicTag_TagId",
                table: "TopicTag",
                column: "TagId");

            migrationBuilder.CreateIndex(
                name: "IX_TopicTag_TopicId_TagId",
                table: "TopicTag",
                columns: new[] { "TopicId", "TagId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TopicTag_UpdatedAtUtc",
                table: "TopicTag",
                column: "UpdatedAtUtc");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CodingAttempts");

            migrationBuilder.DropTable(
                name: "CodingQuestionTag");

            migrationBuilder.DropTable(
                name: "FlashcardTag");

            migrationBuilder.DropTable(
                name: "InterviewAnswers");

            migrationBuilder.DropTable(
                name: "NoteTag");

            migrationBuilder.DropTable(
                name: "NoteVersions");

            migrationBuilder.DropTable(
                name: "ProgressEntries");

            migrationBuilder.DropTable(
                name: "StudyPlanItems");

            migrationBuilder.DropTable(
                name: "SystemDesignScenarioTag");

            migrationBuilder.DropTable(
                name: "TopicTag");

            migrationBuilder.DropTable(
                name: "CodingQuestions");

            migrationBuilder.DropTable(
                name: "Flashcards");

            migrationBuilder.DropTable(
                name: "InterviewSessions");

            migrationBuilder.DropTable(
                name: "Notes");

            migrationBuilder.DropTable(
                name: "StudyPlans");

            migrationBuilder.DropTable(
                name: "SystemDesignScenarios");

            migrationBuilder.DropTable(
                name: "Tags");

            migrationBuilder.DropTable(
                name: "Topics");
        }
    }
}
