using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InterviewPrep.Infrastructure.Persistence.Migrations;

[DbContext(typeof(InterviewPrepDbContext))]
[Migration("20260713120000_AddFlashcardPersonalNote")]
public partial class AddFlashcardPersonalNote : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "PersonalNote",
            table: "Flashcards",
            type: "TEXT",
            maxLength: 1000,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "PersonalNote",
            table: "Flashcards");
    }
}
