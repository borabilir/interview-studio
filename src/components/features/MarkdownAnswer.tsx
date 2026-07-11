import { isValidElement, useEffect, useState, type HTMLAttributes, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { codeToHtml } from 'shiki'
import { cn } from './featureClassNames'

type MarkdownAnswerProps = {
  value: string
  compact?: boolean
  className?: string
}

const LANGUAGE_LABELS: Record<string, string> = {
  bash: 'Bash',
  csharp: 'C#',
  dockerfile: 'Dockerfile',
  javascript: 'JavaScript',
  json: 'JSON',
  shell: 'Shell',
  sh: 'Shell',
  sql: 'SQL',
  typescript: 'TypeScript',
  xml: 'XML',
  yaml: 'YAML',
  text: 'Text',
}

function normalizeLanguage(language: string) {
  const normalized = language.toLowerCase()
  if (normalized === 'cs' || normalized === 'c#') return 'csharp'
  if (normalized === 'shell' || normalized === 'sh' || normalized === 'shellscript') return 'bash'
  if (normalized === 'docker') return 'dockerfile'
  if (normalized === 'yml') return 'yaml'
  if (normalized === 'js') return 'javascript'
  if (normalized === 'ts') return 'typescript'
  return normalized
}

function languageLabel(language: string) {
  return LANGUAGE_LABELS[language] ?? language
}

function guessLanguage(code: string) {
  const trimmed = code.trim()
  if (!trimmed) return 'text'
  if (/^\s*(SELECT|WITH|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/im.test(trimmed)) return 'sql'
  if (/^\s*(#!\/|npm |dotnet |git |cd |mkdir |rm |cp |mv |echo |\$ )/im.test(trimmed)) return 'bash'
  if (/^\s*</.test(trimmed)) return 'xml'
  if (/^\s*[{[]/.test(trimmed)) return 'json'
  if (/^\s*FROM\s+|^\s*RUN\s+|^\s*COPY\s+|^\s*ENTRYPOINT\s+/im.test(trimmed)) return 'dockerfile'
  if (/\b(public|private|protected|internal|class|struct|interface|namespace|using|Console\.|Task<|async|await|string|int|var)\b/.test(trimmed)) return 'csharp'
  return 'text'
}

function HighlightedCodeBlock({ code, language }: { code: string; language: string }) {
  const normalizedLanguage = normalizeLanguage(language)
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setHtml(null)

    if (normalizedLanguage === 'text') {
      return () => {
        active = false
      }
    }

    void codeToHtml(code, {
      lang: normalizedLanguage,
      theme: 'github-dark-default',
    }).then((highlighted) => {
      if (active) setHtml(highlighted)
    }).catch(() => {
      if (active) setHtml(null)
    })

    return () => {
      active = false
    }
  }, [code, normalizedLanguage])

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-white/10 bg-[#101114] shadow-inner">
      <div className="flex h-9 items-center justify-between border-b border-white/10 px-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
          {languageLabel(normalizedLanguage)}
        </span>
      </div>
      {html ? (
        <div className="shiki-code-body" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="m-0 overflow-x-auto border-0 bg-transparent p-4 text-xs leading-6 text-white">
          <code>{code}</code>
        </pre>
      )}
    </div>
  )
}

function MarkdownCode({ className, children, ...props }: HTMLAttributes<HTMLElement> & { children?: ReactNode }) {
  return (
    <code className={className} {...props}>
      {children}
    </code>
  )
}

function nodeText(value: ReactNode): string {
  if (value === null || value === undefined || typeof value === 'boolean') return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(nodeText).join('')
  if (isValidElement<{ children?: ReactNode }>(value)) return nodeText(value.props.children)
  return ''
}

function MarkdownPre({ children }: { children?: ReactNode }) {
  const child = Array.isArray(children) ? children[0] : children
  const className = isValidElement<{ className?: string }>(child) ? child.props.className ?? '' : ''
  const rawCode = nodeText(children).replace(/\n$/, '')
  const language = /language-([\w#+-]+)/.exec(className)?.[1] ?? guessLanguage(rawCode)

  return <HighlightedCodeBlock code={rawCode} language={language} />
}

export function MarkdownAnswer({ value, compact = false, className }: MarkdownAnswerProps) {
  return (
    <div className={cn('markdown-answer', compact ? 'text-xs leading-5' : 'text-sm leading-6', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: MarkdownPre,
          code: MarkdownCode,
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  )
}
