import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import { cn } from '../../lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
}

const variants: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-ink text-canvas shadow-sm hover:bg-ink/[.88] dark:bg-accent dark:text-white dark:hover:bg-accent/90',
  secondary: 'border-line bg-panel text-ink shadow-sm hover:border-muted/40 hover:bg-canvas',
  ghost: 'border-transparent bg-transparent text-muted hover:bg-ink/[0.055] hover:text-ink',
  danger: 'border-transparent bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:text-red-400',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 rounded-lg px-3 text-xs',
  md: 'h-10 rounded-xl px-4 text-sm',
  icon: 'h-9 w-9 rounded-xl p-0',
}

export function Button({
  className,
  variant = 'secondary',
  size = 'md',
  loading,
  icon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'focus-ring inline-flex shrink-0 items-center justify-center gap-2 border font-medium transition duration-200 disabled:pointer-events-none disabled:opacity-45',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}
