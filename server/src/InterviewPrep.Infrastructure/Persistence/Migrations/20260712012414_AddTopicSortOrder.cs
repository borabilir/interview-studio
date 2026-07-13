using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InterviewPrep.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTopicSortOrder : Migration
    {
        private static readonly string[] TopicParentSortOrderColumns = ["ParentTopicId", "SortOrder"];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "Topics",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql(
                """
                UPDATE "Topics"
                SET "SortOrder" = (
                    SELECT COUNT(*)
                    FROM "Topics" AS "Sibling"
                    WHERE COALESCE("Sibling"."ParentTopicId", '') = COALESCE("Topics"."ParentTopicId", '')
                      AND (
                          "Sibling"."Name" COLLATE NOCASE < "Topics"."Name" COLLATE NOCASE
                          OR (
                              "Sibling"."Name" COLLATE NOCASE = "Topics"."Name" COLLATE NOCASE
                              AND "Sibling"."Id" <= "Topics"."Id"
                          )
                      )
                ) - 1;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Topics_ParentTopicId_SortOrder",
                table: "Topics",
                columns: TopicParentSortOrderColumns);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Topics_ParentTopicId_SortOrder",
                table: "Topics");

            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "Topics");
        }
    }
}
