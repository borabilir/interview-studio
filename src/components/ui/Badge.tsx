import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'purple'

const tones: Record<BadgeTone, string> = {
  neutral: 'border-line bg-canvas text-muted',
  accent: 'border-accent/15 bg-accent/10 text-accent',
  success: 'border-success/15 bg-success/10 text-success',
  warning: 'border-amber-500/15 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  purple: 'border-violet-500/15 bg-violet-500/10 text-violet-700 dark:text-violet-400',
}

export function Badge({ className, tone = 'neutral', ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn('inline-flex h-6 items-center rounded-full border px-2.5 text-[11px] font-semibold tracking-[-0.01em]', tones[tone], className)}
      {...props}
    />
  )
}
