using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace InterviewPrep.Infrastructure.Persistence;

public sealed class InterviewPrepDbContextFactory : IDesignTimeDbContextFactory<InterviewPrepDbContext>
{
    public InterviewPrepDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<InterviewPrepDbContext>()
            .UseSqlite("Data Source=interview-prep.design.db")
            .Options;

        return new InterviewPrepDbContext(options);
    }
}
