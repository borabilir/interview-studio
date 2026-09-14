import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Search, Sparkles, X } from 'lucide-react'
import { useI18n } from '../i18n'
import { MarkdownAnswer } from '../components/features/MarkdownAnswer'
import { api } from '../services/api'
import { queryKeys } from '../services/queryKeys'
import type { FlashcardDto, TopicDto } from '../types/api'

const EMPTY_CARDS: FlashcardDto[] = []
const EMPTY_TOPICS: TopicDto[] = []
type ContentSection = 'note' | 'answer' | 'ai' | 'why' | 'production' | 'banking' | 'code'
type AiSection = Exclude<ContentSection, 'ai'>
type ProjectDocumentDto = { id: string; name: string }

const dragRegionStyle = { WebkitAppRegion: 'drag' } as CSSProperties
const noDragRegionStyle = { WebkitAppRegion: 'no-drag' } as CSSProperties

const PROJECT_LABELS: Record<string, string> = {
  ledgerly: 'ledgerly',
  novartis: 'sys',
  hcmonair: 'hcm',
  'chatbot-backend': 'bot be',
  'chatbot-dashboard': 'bot fe',
  'chatbot-widget': 'bot w',
  'adserve-dashboard': 'ads',
  rambly: 'rmb',
  resumeparser: 'parser',
}

const PROJECT_ORDER = ['ledgerly', 'novartis', 'hcmonair', 'resumeparser', 'chatbot-backend', 'chatbot-dashboard', 'chatbot-widget', 'adserve-dashboard', 'rambly']

function DesktopTitleBar({ enabled }: { enabled: boolean }) {
  if (!enabled) return null

  return (
    <div className="-mx-2 -mt-2 mb-3 flex h-8 items-center justify-between px-1" style={dragRegionStyle}>
      <span className="pl-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Interview Studio</span>
      <button
        type="button"
        onClick={() => window.close()}
        style={noDragRegionStyle}
        className="grid size-8 place-items-center rounded-xl text-muted-foreground transition hover:bg-rose-500/15 hover:text-rose-500"
        aria-label="Pencereyi kapat"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

export default function EasyModePage() {
  const { t, locale } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const aiAbortRef = useRef<AbortController | null>(null)
  const [query, setQuery] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [contentSection, setContentSection] = useState<ContentSection>('note')
  const [aiSection, setAiSection] = useState<AiSection>('note')
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [followUpInput, setFollowUpInput] = useState('')
  const [followUpQuestion, setFollowUpQuestion] = useState('')
  const [followUpAnswer, setFollowUpAnswer] = useState('')
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const desktopOverlay = new URLSearchParams(window.location.search).get('desktop') === '1'

  useEffect(() => {
    if (!desktopOverlay) return
    const previousHtmlBackground = document.documentElement.style.background
    const previousBodyBackground = document.body.style.background
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
    return () => {
      document.documentElement.style.background = previousHtmlBackground
      document.body.style.background = previousBodyBackground
    }
  }, [desktopOverlay])

  const cardsQuery = useQuery({
    queryKey: queryKeys.flashcards.all,
    queryFn: () => api.flashcards.list<FlashcardDto[]>(),
  })
  const topicsQuery = useQuery({
    queryKey: queryKeys.topics.all,
    queryFn: () => api.topics.list<TopicDto[]>(),
  })
  const projectDocumentsQuery = useQuery({
    queryKey: ['project-documents'],
    queryFn: () => api.projectDocuments.list<ProjectDocumentDto[]>(),
  })
  const cards = cardsQuery.data ?? EMPTY_CARDS
  const topics = topicsQuery.data ?? EMPTY_TOPICS
  const projectDocuments = projectDocumentsQuery.data ?? []
  const selectedProject = selectedProjectId
    ? projectDocuments.find((project) => project.id === selectedProjectId)
    : undefined
  const projectOptions = [
    { id: '', name: t('Genel', 'General') },
    ...PROJECT_ORDER
      .map((id) => projectDocuments.find((project) => project.id === id))
      .filter((project): project is ProjectDocumentDto => Boolean(project))
      .map((project) => ({
        ...project,
        name: PROJECT_LABELS[project.id] ?? project.name,
      })),
  ]
  const topicById = useMemo(() => new Map(topics.map((topic) => [topic.id, topic])), [topics])
  const topicPath = useCallback((card: FlashcardDto) => {
    if (!card.topicId) return []
    const topic = topicById.get(card.topicId)
    if (!topic) return card.topicName ? [card.topicName] : []
    if (!topic.parentTopicId) return [topic.name]
    const parent = topicById.get(topic.parentTopicId)
    return parent ? [parent.name, topic.name] : [topic.name]
  }, [topicById])
  const normalizedQuery = query.trim().toLocaleLowerCase(locale)
  const matches = useMemo(() => {
    if (!normalizedQuery) return EMPTY_CARDS
    const keywords = normalizedQuery.split(/\s+/).filter(Boolean)
    return cards
      .filter((card) => {
        const searchable = [card.question, ...topicPath(card), ...card.tags].join(' ').toLocaleLowerCase(locale)
        return keywords.every((keyword) => searchable.includes(keyword))
      })
      .slice(0, 30)
  }, [cards, locale, normalizedQuery, topicPath])
  const selectedCard = selectedId ? cards.find((card) => card.id === selectedId) : undefined

  const selectCard = (card: FlashcardDto) => {
    setSelectedId(card.id)
    setContentSection(card.personalNote?.trim() ? 'note' : 'answer')
    clearAiOutput()
  }

  useEffect(() => {
    if (!selectedCard) inputRef.current?.focus()
  }, [selectedCard])

  useEffect(() => () => {
    aiAbortRef.current?.abort()
  }, [])

  const stopAi = useCallback(() => {
    aiAbortRef.current?.abort()
    aiAbortRef.current = null
    setAiLoading(false)
    setFollowUpLoading(false)
  }, [])

  const clearAiOutput = useCallback(() => {
    stopAi()
    setAiAnswer('')
    setAiError('')
    setAiSection('note')
    setFollowUpInput('')
    setFollowUpQuestion('')
    setFollowUpAnswer('')
  }, [stopAi])

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null
      return element?.tagName === 'INPUT'
        || element?.tagName === 'TEXTAREA'
        || element?.isContentEditable
    }

    const goBack = () => {
      if (selectedCard) {
        setSelectedId(null)
        setContentSection('note')
        setQuery('')
        clearAiOutput()
        return true
      }

      if (aiAnswer || aiLoading) {
        clearAiOutput()
        setQuery('')
        return true
      }

      return false
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const commandKey = event.metaKey || event.ctrlKey
      const isTyping = isTypingTarget(event.target)

      if (commandKey && key === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        return
      }

      if (commandKey && event.key === 'Enter') {
        event.preventDefault()
        void askAi('note')
        return
      }

      if (isTyping) return

      if (event.key === 'Escape' || event.key === 'Backspace') {
        if (goBack()) {
          event.preventDefault()
        } else if (query) {
          event.preventDefault()
          setQuery('')
        }
        return
      }

      const sectionByKey: Record<string, ContentSection> = {
        '1': 'note',
        '2': 'answer',
        '3': 'ai',
        '4': 'why',
        '5': 'production',
        '6': 'banking',
        '7': 'code',
      }
      const section = sectionByKey[event.key]
      if (!section) return

      if (selectedCard) {
        event.preventDefault()
        setContentSection(section)
        if (section === 'ai') {
          void askAi('answer', selectedProjectId, selectedCard.question)
        }
        if (section === 'code') {
          void askAi('code', selectedProjectId, selectedCard.question)
        }
        return
      }

      if ((aiAnswer || aiLoading) && section !== 'ai') {
        event.preventDefault()
        void askAi(section)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [aiAnswer, aiLoading, clearAiOutput, query, selectedCard, selectedProjectId])

  const aiSections: Array<{ id: AiSection; label: string }> = [
    { id: 'note', label: t('Kısa not', 'Short note') },
    { id: 'answer', label: t('Asıl cevap', 'Answer') },
    { id: 'why', label: 'Why?' },
    { id: 'production', label: 'Production' },
    { id: 'banking', label: 'Banking' },
    { id: 'code', label: 'Kod' },
  ]

  const askAi = async (section: AiSection = 'note', projectId = selectedProjectId, question = query) => {
    const trimmedQuery = question.trim()
    if (!trimmedQuery) return

    aiAbortRef.current?.abort()
    const controller = new AbortController()
    aiAbortRef.current = controller
    setSelectedProjectId(projectId)
    setAiSection(section)
    setAiAnswer('')
    setAiError('')
    setFollowUpQuestion('')
    setFollowUpAnswer('')
    setAiLoading(true)

    try {
      await api.ai.streamInterviewAnswer(trimmedQuery, section, projectId || null, (chunk) => {
        if (aiAbortRef.current === controller) {
          setAiAnswer((answer) => `${answer}${chunk}`)
        }
      }, controller.signal)
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setAiError(t('AI cevabı alınamadı. API key ve server ayarlarını kontrol et.', 'AI answer could not be loaded. Check the API key and server settings.'))
      }
    } finally {
      if (aiAbortRef.current === controller) {
        aiAbortRef.current = null
        setAiLoading(false)
      }
    }
  }

  const askFollowUp = async (baseQuestion: string, previousAnswer: string) => {
    const trimmedFollowUp = followUpInput.trim()
    const trimmedPreviousAnswer = previousAnswer.trim()
    if (!baseQuestion.trim() || !trimmedFollowUp || !trimmedPreviousAnswer) return

    aiAbortRef.current?.abort()
    const controller = new AbortController()
    aiAbortRef.current = controller
    setFollowUpQuestion(trimmedFollowUp)
    setFollowUpAnswer('')
    setFollowUpInput('')
    setAiError('')
    setFollowUpLoading(true)

    try {
      await api.ai.streamInterviewAnswer(baseQuestion, 'followup', selectedProjectId || null, (chunk) => {
        if (aiAbortRef.current === controller) {
          setFollowUpAnswer((answer) => `${answer}${chunk}`)
        }
      }, controller.signal, trimmedPreviousAnswer, trimmedFollowUp)
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setAiError(t('Follow-up cevabı alınamadı.', 'Follow-up answer could not be loaded.'))
      }
    } finally {
      if (aiAbortRef.current === controller) {
        aiAbortRef.current = null
        setFollowUpLoading(false)
      }
    }
  }

  if (selectedCard) {
    const sections: Array<{ id: ContentSection; label: string; value?: string | null }> = [
      { id: 'note', label: t('Kısa not', 'Short note'), value: selectedCard.personalNote },
      { id: 'answer', label: t('Asıl cevap', 'Answer'), value: selectedCard.answer },
      { id: 'ai', label: 'AI', value: aiSection === 'answer' ? aiAnswer : null },
      { id: 'why', label: 'Why?', value: selectedCard.why },
      { id: 'production', label: 'Production', value: selectedCard.productionExample },
      { id: 'banking', label: 'Banking', value: selectedCard.bankingExample },
      { id: 'code', label: 'Kod', value: aiSection === 'code' ? aiAnswer : null },
    ]
    const activeSection = sections.find((section) => section.id === contentSection) ?? sections[0]
    const activeAnswer = activeSection.value ?? ''
    return (
      <main className={`easy-mode-page h-screen overflow-hidden p-2 text-foreground ${desktopOverlay ? 'bg-transparent' : 'bg-background sm:p-5'}`}>
        <div className={`mx-auto flex h-[calc(100vh-1rem)] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-border p-5 shadow-2xl sm:h-[calc(100vh-2.5rem)] sm:p-7 ${desktopOverlay ? 'bg-card/80 backdrop-blur-xl' : 'bg-card'}`}>
          <DesktopTitleBar enabled={desktopOverlay} />
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button type="button" onClick={() => { setSelectedId(null); setContentSection('note'); setQuery(''); clearAiOutput() }} className="grid size-11 shrink-0 place-items-center rounded-2xl border border-border bg-background transition hover:bg-muted" aria-label={t('Aramaya dön', 'Back to search')}>
              <ArrowLeft className="size-4" />
            </button>
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  setContentSection(section.id)
                  if (section.id === 'ai') {
                    void askAi('answer', selectedProjectId, selectedCard.question)
                  }
                  if (section.id === 'code') {
                    void askAi('code', selectedProjectId, selectedCard.question)
                  }
                }}
                disabled={section.id !== 'ai' && section.id !== 'code' && !section.value}
                className={`h-11 shrink-0 rounded-2xl border px-3 text-sm font-semibold transition disabled:opacity-35 ${contentSection === section.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted'}`}
              >
                {aiLoading && ((section.id === 'ai' && aiSection === 'answer') || (section.id === 'code' && aiSection === 'code')) ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : section.id === 'ai' ? (
                  <span className="flex items-center gap-1.5"><Sparkles className="size-3.5" />{section.label}</span>
                ) : section.label}
              </button>
            ))}
          </div>
          <h1 className="mt-4 line-clamp-3 text-base font-semibold leading-6 text-muted-foreground sm:text-lg sm:leading-7">{selectedCard.question}</h1>
          <div className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-3xl bg-muted/45 p-5 sm:p-7">
            {activeSection.value ? (
              activeSection.id === 'note'
                ? <p className="whitespace-pre-wrap text-2xl font-medium leading-10 sm:text-[1.7rem] sm:leading-[1.65]">{activeSection.value}</p>
                : <MarkdownAnswer value={activeSection.value} className="text-2xl font-medium leading-10 sm:text-[1.7rem] sm:leading-[1.65]" />
            ) : activeSection.id === 'ai' && aiLoading && aiSection === 'answer' ? (
              <p className="text-base leading-7 text-muted-foreground">{t('AI cevabı hazırlanıyor…', 'Preparing AI answer…')}</p>
            ) : activeSection.id === 'code' && aiLoading && aiSection === 'code' ? (
              <p className="text-base leading-7 text-muted-foreground">{t('Kod örneği hazırlanıyor…', 'Preparing code example…')}</p>
            ) : (
              <p className="text-base leading-7 text-muted-foreground">{t('Bu alan için henüz içerik eklenmemiş.', 'No content has been added for this section yet.')}</p>
            )}
            {followUpQuestion ? (
              <div className="mt-6 border-t border-border/70 pt-5">
                <p className="mb-3 text-xs font-semibold text-primary">{followUpQuestion}</p>
                {followUpAnswer ? (
                  <MarkdownAnswer value={followUpAnswer} className="text-2xl font-medium leading-10 sm:text-[1.7rem] sm:leading-[1.65]" />
                ) : followUpLoading ? (
                  <p className="text-base leading-7 text-muted-foreground">{t('Follow-up cevabı hazırlanıyor…', 'Preparing follow-up answer…')}</p>
                ) : null}
              </div>
            ) : null}
          </div>
          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void askFollowUp(selectedCard.question, followUpAnswer || activeAnswer)
            }}
          >
            <input
              value={followUpInput}
              onChange={(event) => setFollowUpInput(event.target.value)}
              disabled={!activeAnswer && !followUpAnswer}
              placeholder={t('Follow-up sor…', 'Ask follow-up…')}
              className="h-10 min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-45"
            />
            <button
              type="submit"
              disabled={!followUpInput.trim() || (!activeAnswer && !followUpAnswer) || followUpLoading}
              className="h-10 shrink-0 rounded-2xl border border-border bg-background px-3 text-xs font-semibold transition hover:bg-muted disabled:opacity-45"
            >
              {followUpLoading ? <Loader2 className="size-4 animate-spin" /> : '↵'}
            </button>
          </form>
        </div>
      </main>
    )
  }

  if (aiAnswer || aiLoading) {
    return (
      <main className={`easy-mode-page h-screen overflow-hidden p-2 text-foreground ${desktopOverlay ? 'bg-transparent' : 'bg-background sm:p-5'}`}>
        <div className={`mx-auto flex h-[calc(100vh-1rem)] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-border p-5 shadow-2xl sm:h-[calc(100vh-2.5rem)] sm:p-7 ${desktopOverlay ? 'bg-card/80 backdrop-blur-xl' : 'bg-card'}`}>
          <DesktopTitleBar enabled={desktopOverlay} />
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => {
                clearAiOutput()
                setQuery('')
              }}
              className="grid size-11 shrink-0 place-items-center rounded-2xl border border-border bg-background transition hover:bg-muted"
              aria-label={t('Aramaya dön', 'Back to search')}
            >
              <ArrowLeft className="size-4" />
            </button>
            {aiSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => void askAi(section.id)}
                className={`h-11 shrink-0 rounded-2xl border px-3 text-sm font-semibold transition ${aiSection === section.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted'}`}
              >
                {section.label}
              </button>
            ))}
          </div>
          <div className="mt-6">
            {selectedProject ? <p className="mb-2 text-xs font-semibold text-primary">{selectedProject.name}</p> : null}
            <h1 className="line-clamp-3 text-base font-semibold leading-6 text-muted-foreground sm:text-lg sm:leading-7">{query}</h1>
          </div>
          {aiError ? <p className="mt-4 rounded-2xl bg-rose-500/10 p-3 text-sm text-rose-500">{aiError}</p> : null}
          <div className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-3xl bg-muted/45 p-5 sm:p-7">
            {aiAnswer ? (
              <MarkdownAnswer value={aiAnswer} className="text-2xl font-medium leading-10 sm:text-[1.7rem] sm:leading-[1.65]" />
            ) : (
              <p className="text-base leading-7 text-muted-foreground">{t('Mülakat cevabı hazırlanıyor…', 'Preparing an interview answer…')}</p>
            )}
            {followUpQuestion ? (
              <div className="mt-6 border-t border-border/70 pt-5">
                <p className="mb-3 text-xs font-semibold text-primary">{followUpQuestion}</p>
                {followUpAnswer ? (
                  <MarkdownAnswer value={followUpAnswer} className="text-2xl font-medium leading-10 sm:text-[1.7rem] sm:leading-[1.65]" />
                ) : followUpLoading ? (
                  <p className="text-base leading-7 text-muted-foreground">{t('Follow-up cevabı hazırlanıyor…', 'Preparing follow-up answer…')}</p>
                ) : null}
              </div>
            ) : null}
          </div>
          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void askFollowUp(query, followUpAnswer || aiAnswer)
            }}
          >
            <input
              value={followUpInput}
              onChange={(event) => setFollowUpInput(event.target.value)}
              disabled={!aiAnswer && !followUpAnswer}
              placeholder={t('Follow-up sor…', 'Ask follow-up…')}
              className="h-10 min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-45"
            />
            <button
              type="submit"
              disabled={!followUpInput.trim() || (!aiAnswer && !followUpAnswer) || followUpLoading}
              className="h-10 shrink-0 rounded-2xl border border-border bg-background px-3 text-xs font-semibold transition hover:bg-muted disabled:opacity-45"
            >
              {followUpLoading ? <Loader2 className="size-4 animate-spin" /> : '↵'}
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className={`easy-mode-page h-screen overflow-hidden p-2 text-foreground ${desktopOverlay ? 'bg-transparent' : 'bg-background sm:p-5'}`}>
      <div className={`mx-auto flex h-[calc(100vh-1rem)] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-border p-5 shadow-2xl sm:h-[calc(100vh-2.5rem)] sm:p-7 ${desktopOverlay ? 'bg-card/80 backdrop-blur-xl' : 'bg-card'}`}>
        <DesktopTitleBar enabled={desktopOverlay} />
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              if (aiAnswer || aiLoading || followUpAnswer || followUpQuestion) {
                clearAiOutput()
              } else {
                setAiError('')
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void askAi('note')
              }
            }}
            placeholder={t('Keyword yaz…', 'Type a keyword…')}
            className="h-16 w-full rounded-2xl border-2 border-border bg-background pl-12 pr-14 text-lg font-medium outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
          {query ? <button type="button" onClick={() => { setQuery(''); clearAiOutput() }} className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={t('Aramayı temizle', 'Clear search')}><X className="size-5" /></button> : null}
        </div>

        <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
          {projectOptions.map((project) => (
            <button
              key={project.id || 'general'}
              type="button"
              onClick={() => void askAi('note', project.id)}
              disabled={!query.trim() || aiLoading}
              className="h-10 shrink-0 rounded-2xl border border-border bg-background px-3 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-45"
            >
              {project.name}
            </button>
          ))}
        </div>

        {aiError ? <p className="mt-2 rounded-2xl bg-rose-500/10 p-3 text-sm text-rose-500">{aiError}</p> : null}

        <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
          {cardsQuery.isPending || topicsQuery.isPending ? <p className="py-12 text-center text-sm text-muted-foreground">{t('Sorular yükleniyor…', 'Loading questions…')}</p> : null}
          {cardsQuery.isError || topicsQuery.isError ? <p className="rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-500">{t('Sorular yüklenemedi.', 'Questions could not be loaded.')}</p> : null}
          {!cardsQuery.isPending && !topicsQuery.isPending && normalizedQuery && matches.length === 0 && !aiAnswer && !aiLoading ? <p className="py-12 text-center text-sm text-muted-foreground">{t('Eşleşen soru bulunamadı.', 'No matching question found.')}</p> : null}
          {!normalizedQuery && !cardsQuery.isPending && !topicsQuery.isPending ? <p className="py-12 text-center text-sm leading-6 text-muted-foreground">{t('Soruları bulmak için bir veya birkaç keyword yaz.', 'Type one or more keywords to find questions.')}</p> : null}
          {matches.map((card) => (
            <button key={card.id} type="button" onClick={() => selectCard(card)} className="w-full cursor-default rounded-2xl border border-border bg-background p-4 text-left transition hover:border-primary/40 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15">
              {topicPath(card).length ? (
                <p className="mb-2 truncate text-xs font-semibold text-primary">
                  {topicPath(card).join(' / ')}
                </p>
              ) : null}
              <p className="text-lg font-semibold leading-7 sm:text-xl sm:leading-8">{card.question}</p>
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
