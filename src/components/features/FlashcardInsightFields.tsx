import {
  BriefcaseBusiness,
  Building2,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { ApiInterviewFrequency } from '../../types/api'
import { useI18n } from '../../i18n'
import { cn } from './featureClassNames'
import { MarkdownAnswer } from './MarkdownAnswer'
import type { FlashcardInsightDraft, FlashcardInsightSource } from './flashcardInsightModel'

function FieldShell({
  icon: Icon,
  label,
  children,
  compact,
}: {
  icon: LucideIcon
  label: string
  children: ReactNode
  compact?: boolean
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.04em] text-muted-foreground">
        <Icon className="size-3.5 text-primary" />
        {label}
      </div>
      <div className={cn(compact ? 'text-xs leading-5' : 'text-sm leading-6')}>
        {children}
      </div>
    </div>
  )
}

export function FlashcardInsightFields({
  card,
  compact = false,
  className,
}: {
  card: FlashcardInsightSource
  compact?: boolean
  className?: string
}) {
  const hasTextFields = Boolean(card.productionExample || card.bankingExample || card.interviewTip)

  if (!hasTextFields) return null

  return (
    <div className={cn('mt-4 grid gap-3', !compact && 'sm:grid-cols-2', className)}>
      {card.productionExample ? (
        <FieldShell icon={BriefcaseBusiness} label="Production Example" compact={compact}>
          <MarkdownAnswer value={card.productionExample} compact={compact} />
        </FieldShell>
      ) : null}
      {card.bankingExample ? (
        <FieldShell icon={Building2} label="Banking Example" compact={compact}>
          <MarkdownAnswer value={card.bankingExample} compact={compact} />
        </FieldShell>
      ) : null}
      {card.interviewTip ? (
        <FieldShell icon={Lightbulb} label="Interview Tip" compact={compact}>
          <MarkdownAnswer value={card.interviewTip} compact={compact} />
        </FieldShell>
      ) : null}
    </div>
  )
}

export function FlashcardInsightEditorFields({
  value,
  onChange,
  className,
}: {
  value: FlashcardInsightDraft
  onChange: (value: FlashcardInsightDraft) => void
  className?: string
}) {
  const { t } = useI18n()
  const update = (patch: Partial<FlashcardInsightDraft>) => onChange({ ...value, ...patch })

  return (
    <section className={cn('rounded-2xl border border-border/70 bg-muted/20 p-4', className)}>
      <div className="mb-4">
        <p className="text-xs font-semibold text-foreground">{t('Mülakat bağlamı', 'Interview context')}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {t('Bu alanlar opsiyoneldir; gerçek hayat örneği ve mülakat ipucu eklemek istediğinde kullan.', 'These fields are optional; use them when you want real-world context and interview guidance.')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-xs font-medium text-foreground">
          Production Example
          <textarea
            value={value.productionExample}
            onChange={(event) => update({ productionExample: event.target.value })}
            rows={4}
            placeholder={t('Gerçek sistemde nasıl karşına çıkar?', 'How does this show up in a real system?')}
            className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring/30"
          />
        </label>

        <label className="space-y-1.5 text-xs font-medium text-foreground">
          Banking Example
          <textarea
            value={value.bankingExample}
            onChange={(event) => update({ bankingExample: event.target.value })}
            rows={4}
            placeholder={t('Bankacılıkla ilgiliyse örnek ekle; değilse boş bırak.', 'Add only if banking-related; otherwise leave empty.')}
            className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring/30"
          />
        </label>

        <label className="space-y-1.5 text-xs font-medium text-foreground">
          Interview Tip
          <textarea
            value={value.interviewTip}
            onChange={(event) => update({ interviewTip: event.target.value })}
            rows={4}
            placeholder={t('Mülakatçı burada neyi ölçer, hangi follow-up gelebilir?', 'What is the interviewer testing, and what follow-up may come next?')}
            className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring/30"
          />
        </label>

        <label className="space-y-1.5 text-xs font-medium text-foreground">
          {t('Mülakatta Sorulma Olasılığı', 'Interview frequency')}
          <select
            value={value.interviewFrequency}
            onChange={(event) => update({ interviewFrequency: event.target.value as ApiInterviewFrequency | '' })}
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          >
            <option value="">{t('Seçilmedi', 'Not selected')}</option>
            <option value="Low">{t('Düşük', 'Low')}</option>
            <option value="Medium">{t('Orta', 'Medium')}</option>
            <option value="High">{t('Yüksek', 'High')}</option>
            <option value="VeryHigh">{t('Çok yüksek', 'Very high')}</option>
          </select>
        </label>
      </div>
    </section>
  )
}
