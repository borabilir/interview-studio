using System.Linq.Expressions;
using InterviewPrep.Application.Abstractions.Persistence;
using InterviewPrep.Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace InterviewPrep.Infrastructure.Persistence.Repositories;

internal sealed class EfRepository<TEntity>(InterviewPrepDbContext context) : IRepository<TEntity>
    where TEntity : BaseEntity
{
    private readonly DbSet<TEntity> _entities = context.Set<TEntity>();

    public async Task<TEntity?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        await _entities.FindAsync([id], cancellationToken);

    public async Task<IReadOnlyList<TEntity>> ListTrackedAsync(
        Expression<Func<TEntity, bool>>? predicate = null,
        CancellationToken cancellationToken = default)
    {
        IQueryable<TEntity> query = _entities;
        if (predicate is not null)
        {
            query = query.Where(predicate);
        }

        return await query.ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<TResult>> ListAsync<TResult>(
        Expression<Func<TEntity, TResult>> selector,
        Expression<Func<TEntity, bool>>? predicate = null,
        Func<IQueryable<TEntity>, IOrderedQueryable<TEntity>>? orderBy = null,
        int? take = null,
        CancellationToken cancellationToken = default)
    {
        IQueryable<TEntity> query = _entities.AsNoTracking();
        if (predicate is not null)
        {
            query = query.Where(predicate);
        }

        if (orderBy is not null)
        {
            query = orderBy(query);
        }

        if (take is > 0)
        {
            query = query.Take(take.Value);
        }

        return await query.Select(selector).ToListAsync(cancellationToken);
    }

    public async Task<TResult?> FirstOrDefaultAsync<TResult>(
        Expression<Func<TEntity, bool>> predicate,
        Expression<Func<TEntity, TResult>> selector,
        CancellationToken cancellationToken = default) =>
        await _entities.AsNoTracking().Where(predicate).Select(selector).FirstOrDefaultAsync(cancellationToken);

    public Task<int> CountAsync(
        Expression<Func<TEntity, bool>>? predicate = null,
        CancellationToken cancellationToken = default) =>
        predicate is null
            ? _entities.CountAsync(cancellationToken)
            : _entities.CountAsync(predicate, cancellationToken);

    public async Task AddAsync(TEntity entity, CancellationToken cancellationToken = default) =>
        await _entities.AddAsync(entity, cancellationToken);

    public void Remove(TEntity entity) => _entities.Remove(entity);
}
