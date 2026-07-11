import { HelpCircle } from 'lucide-react'
import { useI18n } from '../../i18n'
import { cn } from './featureClassNames'
import { MarkdownAnswer } from './MarkdownAnswer'

type FlashcardWhySectionProps = {
  value?: string | null
  compact?: boolean
  className?: string
}

type FlashcardWhyEditorFieldProps = {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function FlashcardWhySection({ value, compact = false, className }: FlashcardWhySectionProps) {
  const text = value?.trim()

  if (!text) return null

  return (
    <section className={cn(
      'mt-4 rounded-2xl border border-primary/15 bg-primary/[0.035] p-4',
      compact && 'p-3',
      className,
    )}>
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.04em] text-primary">
        <HelpCircle className="size-3.5" />
        Why?
      </div>
      <MarkdownAnswer value={text} compact={compact} />
    </section>
  )
}

export function FlashcardWhyEditorField({ value, onChange, className }: FlashcardWhyEditorFieldProps) {
  const { t } = useI18n()

  return (
    <label className={cn('block space-y-2 text-xs font-medium text-foreground', className)}>
      <span className="inline-flex items-center gap-1.5">
        <HelpCircle className="size-3.5 text-primary" />
        Why?
      </span>
      <span className="block text-[11px] font-normal leading-5 text-muted-foreground">
        {t(
          'Tanımı tekrar etmeden, kavramın hangi mühendislik problemi için var olduğunu ve hangi trade-off’ları çözdüğünü yaz.',
          'Without repeating the definition, describe the engineering problem this concept exists for and the trade-offs it addresses.',
        )}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        placeholder={t(
          'Örn. Bu ayrım performans ve esneklik arasında bilinçli bir denge kurar...',
          'e.g. This separation creates a deliberate balance between performance and flexibility...',
        )}
        className="w-full resize-y rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring/30"
      />
    </label>
  )
}
