import { cn } from '../../lib/cn'

export function Switch({ checked, onCheckedChange, label }: { checked: boolean; onCheckedChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn('focus-ring relative h-6 w-10 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-ink/15')}
    >
      <span className={cn('absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform', checked ? 'translate-x-1' : '-translate-x-4')} />
    </button>
  )
}
