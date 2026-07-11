import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { Code2, Plus, X } from 'lucide-react'
import { useI18n } from '../../i18n'
import { cn } from './featureClassNames'

const CODE_LANGUAGES = [
  { value: 'csharp', label: 'C#', editorLanguage: 'csharp' },
  { value: 'sql', label: 'SQL', editorLanguage: 'sql' },
  { value: 'javascript', label: 'JavaScript', editorLanguage: 'javascript' },
  { value: 'typescript', label: 'TypeScript', editorLanguage: 'typescript' },
  { value: 'json', label: 'JSON', editorLanguage: 'json' },
  { value: 'yaml', label: 'YAML', editorLanguage: 'yaml' },
  { value: 'dockerfile', label: 'Dockerfile', editorLanguage: 'dockerfile' },
  { value: 'bash', label: 'Bash', editorLanguage: 'shell' },
  { value: 'xml', label: 'XML', editorLanguage: 'xml' },
]

type CodeBlockComposerProps = {
  onInsert: (markdown: string) => void
  className?: string
}

function createCodeBlock(language: string, code: string) {
  return `\`\`\`${language}\n${code.trimEnd()}\n\`\`\``
}

export function CodeBlockComposer({ onInsert, className }: CodeBlockComposerProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [language, setLanguage] = useState('csharp')
  const [code, setCode] = useState('')

  const selectedLanguage = CODE_LANGUAGES.find((item) => item.value === language) ?? CODE_LANGUAGES[0]
  const canInsert = Boolean(code.trim())

  const insert = () => {
    if (!canInsert) return
    onInsert(createCodeBlock(language, code))
    setCode('')
    setOpen(false)
  }

  return (
    <div className={cn('rounded-2xl border border-border bg-muted/25 p-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
            <Code2 className="size-4" />
          </span>
          <div>
            <p className="text-xs font-semibold text-foreground">{t('Kod bloğu', 'Code block')}</p>
            <p className="text-[11px] text-muted-foreground">
              {t('Cevaba syntax highlighting destekli kod bloğu ekle.', 'Insert a syntax-highlighted code block into the answer.')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground transition hover:bg-muted"
        >
          {open ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          {open ? t('Kapat', 'Close') : t('Kod ekle', 'Add code')}
        </button>
      </div>

      {open ? (
        <div className="mt-3 space-y-3">
          <label className="block space-y-1.5 text-xs font-medium text-foreground">
            {t('Dil', 'Language')}
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            >
              {CODE_LANGUAGES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>

          <div className="overflow-hidden rounded-2xl border border-border bg-[#101114]">
            <div className="flex h-10 items-center justify-between border-b border-white/10 px-3">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-white/75">
                <Code2 className="size-3.5 text-primary" />
                {selectedLanguage.label}
              </span>
              <span className="font-mono text-[11px] text-white/40">```{selectedLanguage.value}</span>
            </div>
            <div className="h-[220px]">
              <Editor
                height="100%"
                language={selectedLanguage.editorLanguage}
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value ?? '')}
                options={{
                  automaticLayout: true,
                  fontFamily: "'SFMono-Regular', Consolas, monospace",
                  fontSize: 13,
                  lineHeight: 22,
                  minimap: { enabled: false },
                  padding: { top: 12, bottom: 12 },
                  renderLineHighlight: 'line',
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  tabSize: 2,
                  wordWrap: 'on',
                }}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={insert}
              disabled={!canInsert}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('Cevaba ekle', 'Insert into answer')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
