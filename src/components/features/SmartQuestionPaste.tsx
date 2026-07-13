import { ClipboardPaste, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '../../i18n'
import {
  hasParsedFlashcardFields,
  parseFlashcardImport,
  type ParsedFlashcardImport,
} from '../../utils/flashcardImport'
import { ActionButton } from './FeaturePrimitives'
import { cn } from './featureClassNames'

type SmartQuestionPasteResult = {
  applied: string[]
  ignored?: string[]
}

type SmartQuestionPasteProps = {
  onApply: (parsed: ParsedFlashcardImport) => SmartQuestionPasteResult
  className?: string
}

export function SmartQuestionPaste({ onApply, className }: SmartQuestionPasteProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [raw, setRaw] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const apply = () => {
    const parsed = parseFlashcardImport(raw)

    if (!hasParsedFlashcardFields(parsed)) {
      setError(t('Bu metinde tanınan alan bulunamadı.', 'No recognized fields were found in this text.'))
      setMessage('')
      return
    }

    const result = onApply(parsed)
    const appliedText = result.applied.length
      ? t(`${result.applied.length} alan aktarıldı: ${result.applied.join(', ')}`, `${result.applied.length} fields imported: ${result.applied.join(', ')}`)
      : t('Alan bulunamadı veya mevcut ekrana uygulanamadı.', 'No fields could be applied to the current screen.')
    const ignoredText = result.ignored?.length
      ? t(` Uygulanamayan: ${result.ignored.join(', ')}`, ` Ignored: ${result.ignored.join(', ')}`)
      : ''

    setMessage(`${appliedText}${ignoredText}`)
    setError('')
  }

  return (
    <section className={cn('rounded-2xl border border-dashed border-primary/25 bg-primary/[0.035] p-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <ClipboardPaste className="size-4" />
          </span>
          <div>
            <p className="text-xs font-semibold text-foreground">{t('Akıllı yapıştır', 'Smart paste')}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {t(
                'ChatGPT çıktısını tek seferde yapıştır; konu, soru, cevap, Why, örnekler ve etiketler otomatik dolsun.',
                'Paste the ChatGPT output once; topic, question, answer, Why, examples, and tags will be filled automatically.',
              )}
            </p>
          </div>
        </div>
        <ActionButton icon={open ? X : Sparkles} onClick={() => setOpen((value) => !value)}>
          {open ? t('Kapat', 'Close') : t('Metin yapıştır', 'Paste text')}
        </ActionButton>
      </div>

      {open ? (
        <div className="mt-3">
          <textarea
            value={raw}
            onChange={(event) => {
              setRaw(event.target.value)
              setError('')
              setMessage('')
            }}
            rows={8}
            placeholder={t('# Ana Konu ile başlayan ChatGPT cevabını buraya yapıştır...', 'Paste the ChatGPT answer starting with # Main Topic here...')}
            className="w-full resize-y rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring/30"
          />
          {error ? <p className="mt-2 text-xs text-rose-500">{error}</p> : null}
          {message ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{message}</p> : null}
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <ActionButton onClick={() => { setRaw(''); setMessage(''); setError('') }}>{t('Temizle', 'Clear')}</ActionButton>
            <ActionButton variant="primary" icon={Sparkles} disabled={!raw.trim()} onClick={apply}>
              {t('Alanlara aktar', 'Import fields')}
            </ActionButton>
          </div>
        </div>
      ) : null}
    </section>
  )
}
