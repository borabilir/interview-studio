import { useId, useRef, useState } from 'react'
import {
  Bold,
  Code2,
  Eye,
  Italic,
  List,
  MessageSquareQuote,
  Pilcrow,
  SquarePen,
} from 'lucide-react'
import { useI18n } from '../../i18n'
import { appendMarkdownBlock } from '../../utils/markdown'
import { CodeBlockComposer } from './CodeBlockComposer'
import { cn } from './featureClassNames'
import { MarkdownAnswer } from './MarkdownAnswer'

type EditorMode = 'write' | 'preview'

type RichAnswerEditorProps = {
  value: string
  onChange: (value: string) => void
  label?: string
  required?: boolean
  className?: string
  minHeightClassName?: string
}

export function RichAnswerEditor({
  value,
  onChange,
  label,
  required = false,
  className,
  minHeightClassName = 'min-h-[280px]',
}: RichAnswerEditorProps) {
  const { t } = useI18n()
  const labelId = useId()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [mode, setMode] = useState<EditorMode>('write')

  const resolvedLabel = label ?? t('Cevap', 'Answer')
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0

  const focusTextarea = (selectionStart?: number, selectionEnd?: number) => {
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus()
      if (selectionStart !== undefined && selectionEnd !== undefined) {
        textareaRef.current?.setSelectionRange(selectionStart, selectionEnd)
      }
    })
  }

  const insertSnippet = (snippet: string, selectionOffset = snippet.length) => {
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? value.length
    const end = textarea?.selectionEnd ?? value.length
    const next = `${value.slice(0, start)}${snippet}${value.slice(end)}`
    onChange(next)
    setMode('write')
    focusTextarea(start + selectionOffset, start + selectionOffset)
  }

  const wrapSelection = (prefix: string, suffix: string, placeholder: string) => {
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? value.length
    const end = textarea?.selectionEnd ?? value.length
    const selected = value.slice(start, end) || placeholder
    const next = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`
    onChange(next)
    setMode('write')
    focusTextarea(start + prefix.length, start + prefix.length + selected.length)
  }

  const toolbar = [
    {
      label: t('Kalın', 'Bold'),
      icon: Bold,
      onClick: () => wrapSelection('**', '**', t('önemli nokta', 'important point')),
    },
    {
      label: t('İtalik', 'Italic'),
      icon: Italic,
      onClick: () => wrapSelection('_', '_', t('vurgu', 'emphasis')),
    },
    {
      label: t('Inline code', 'Inline code'),
      icon: Code2,
      onClick: () => wrapSelection('`', '`', 'Task.WhenAll'),
    },
    {
      label: t('Madde listesi', 'Bullet list'),
      icon: List,
      onClick: () => insertSnippet('\n- İlk nokta\n- İkinci nokta\n', 3),
    },
    {
      label: t('Alıntı', 'Quote'),
      icon: MessageSquareQuote,
      onClick: () => insertSnippet('\n> Kısa not\n', 3),
    },
    {
      label: t('Paragraf başlığı', 'Paragraph heading'),
      icon: Pilcrow,
      onClick: () => insertSnippet('\n## Başlık\n', 4),
    },
  ]

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p id={labelId} className="text-xs font-semibold text-foreground">{resolvedLabel}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {t('Markdown destekli: açıklama, liste, inline code ve kod bloğu ekleyebilirsin.', 'Markdown enabled: add explanations, lists, inline code, and code blocks.')}
          </p>
        </div>
        <div className="flex rounded-xl border border-border bg-background p-1">
          {(['write', 'preview'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition',
                mode === item ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {item === 'write' ? <SquarePen className="size-3.5" /> : <Eye className="size-3.5" />}
              {item === 'write' ? t('Yaz', 'Write') : t('Önizleme', 'Preview')}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-border bg-background shadow-inner focus-within:border-primary/45 focus-within:ring-4 focus-within:ring-primary/10">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/35 px-3 py-2">
          <div className="flex flex-wrap gap-1">
            {toolbar.map(({ label: itemLabel, icon: Icon, onClick }) => (
              <button
                key={itemLabel}
                type="button"
                onClick={onClick}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-background hover:text-foreground"
                title={itemLabel}
                aria-label={itemLabel}
              >
                <Icon className="size-3.5" />
              </button>
            ))}
          </div>
          <span className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground">
            {wordCount} {t('kelime', 'words')}
          </span>
        </div>

        {mode === 'write' ? (
          <textarea
            ref={textareaRef}
            required={required}
            aria-labelledby={labelId}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            spellCheck={false}
            className={cn(
              'w-full resize-y border-0 bg-transparent px-4 py-4 text-sm leading-7 text-foreground outline-none placeholder:text-muted-foreground/55',
              minHeightClassName,
            )}
            placeholder={t(
              'Cevabı burada yapılandır: kısa tanım, önemli farklar, örnek ve varsa kod bloğu...',
              'Structure the answer here: short definition, key differences, example, and code block if needed...',
            )}
          />
        ) : (
          <div className={cn('overflow-y-auto px-4 py-4', minHeightClassName)}>
            {value.trim() ? (
              <MarkdownAnswer value={value} />
            ) : (
              <div className="grid h-full place-items-center rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
                <div>
                  <Eye className="mx-auto size-5 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium text-foreground">{t('Önizleme boş', 'Preview is empty')}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t('Cevap yazınca burada formatlı halini göreceksin.', 'Write an answer to see the formatted version here.')}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <CodeBlockComposer
        onInsert={(block) => {
          onChange(appendMarkdownBlock(value, block))
          setMode('write')
          focusTextarea()
        }}
      />
    </div>
  )
}
