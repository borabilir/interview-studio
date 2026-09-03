using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InterviewPrep.Infrastructure.Persistence.Migrations;

[DbContext(typeof(InterviewPrepDbContext))]
[Migration("20260713123000_AddFlashcardConfidence")]
public partial class AddFlashcardConfidence : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "Confidence",
            table: "Flashcards",
            type: "INTEGER",
            nullable: false,
            defaultValue: 0);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "Confidence",
            table: "Flashcards");
    }
}
