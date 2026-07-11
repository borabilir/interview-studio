import { cn } from '../../lib/cn'

export function Progress({ value, className, indicatorClassName }: { value: number; className?: string; indicatorClassName?: string }) {
  const normalized = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-ink/[0.08]', className)} role="progressbar" aria-valuenow={normalized}>
      <div
        className={cn('h-full rounded-full bg-accent transition-all duration-700', indicatorClassName)}
        style={{ width: `${normalized}%` }}
      />
    </div>
  )
}
