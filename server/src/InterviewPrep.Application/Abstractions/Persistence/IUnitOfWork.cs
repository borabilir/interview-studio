using InterviewPrep.Domain.Common;

namespace InterviewPrep.Application.Abstractions.Persistence;

public interface IUnitOfWork
{
    IRepository<TEntity> Repository<TEntity>() where TEntity : BaseEntity;
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
