using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InterviewPrep.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFlashcardInterviewFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BankingExample",
                table: "Flashcards",
                type: "TEXT",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InterviewFrequency",
                table: "Flashcards",
                type: "TEXT",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InterviewTip",
                table: "Flashcards",
                type: "TEXT",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProductionExample",
                table: "Flashcards",
                type: "TEXT",
                maxLength: 4000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BankingExample",
                table: "Flashcards");

            migrationBuilder.DropColumn(
                name: "InterviewFrequency",
                table: "Flashcards");

            migrationBuilder.DropColumn(
                name: "InterviewTip",
                table: "Flashcards");

            migrationBuilder.DropColumn(
                name: "ProductionExample",
                table: "Flashcards");
        }
    }
}
