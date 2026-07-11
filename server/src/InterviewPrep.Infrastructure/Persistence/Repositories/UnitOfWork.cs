using InterviewPrep.Application.Abstractions.Persistence;
using InterviewPrep.Domain.Common;

namespace InterviewPrep.Infrastructure.Persistence.Repositories;

internal sealed class UnitOfWork(InterviewPrepDbContext context) : IUnitOfWork
{
    private readonly Dictionary<Type, object> _repositories = [];

    public IRepository<TEntity> Repository<TEntity>() where TEntity : BaseEntity
    {
        var type = typeof(TEntity);
        if (!_repositories.TryGetValue(type, out var repository))
        {
            repository = new EfRepository<TEntity>(context);
            _repositories[type] = repository;
        }

        return (IRepository<TEntity>)repository;
    }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        context.SaveChangesAsync(cancellationToken);
}
