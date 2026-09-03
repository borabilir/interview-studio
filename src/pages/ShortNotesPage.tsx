import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, Copy, FileText, Landmark, Lightbulb, Save, Server, Sparkles, WandSparkles, X } from 'lucide-react'
import { MarkdownAnswer } from '../components/features/MarkdownAnswer'
import { cn } from '../lib/cn'
import { api } from '../services/api'
import { queryKeys } from '../services/queryKeys'
import type { FlashcardDto, TopicDto } from '../types/api'
import { useI18n } from '../i18n'

type DetailKind = 'answer' | 'production' | 'why' | 'banking' | 'tip'
type DetailSelection = { card: FlashcardDto; kind: DetailKind } | null
type SmartSaveSelection = { topic: TopicDto; cards: FlashcardDto[] } | null
type ParsedSummary = { question: string; note: string }

const EMPTY_TOPICS: TopicDto[] = []
const EMPTY_CARDS: FlashcardDto[] = []

function groupBy<T>(items: T[], keyFor: (item: T) => string) {
  return items.reduce((groups, item) => {
    const key = keyFor(item)
    groups.set(key, [...(groups.get(key) ?? []), item])
    return groups
  }, new Map<string, T[]>())
}

function normalizeQuestion(value: string) {
  return value
    .replace(/^\s*\d+[.)]\s*/, '')
    .replace(/[`*_]/g, '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9çğıöşü\s]/gi, '')
    .replace(/\s+/g, ' ')
}

function parseSummaryList(raw: string): ParsedSummary[] {
  const headingPattern = /^###\s+(?:\d+[.)]\s*)?(.+?)\s*$/gm
  const headings = [...raw.matchAll(headingPattern)]
  return headings.flatMap((heading, index) => {
    const start = (heading.index ?? 0) + heading[0].length
    const end = headings[index + 1]?.index ?? raw.length
    const body = raw.slice(start, end).trim()
    const fenced = /^```(?:text|markdown)?\s*\n([\s\S]*?)\n?```\s*$/i.exec(body)
    const note = (fenced?.[1] ?? body).trim()
    return note ? [{ question: heading[1].trim(), note }] : []
  })
}

const detailConfig: Record<DetailKind, { tr: string; en: string; icon: typeof FileText; value: (card: FlashcardDto) => string | null | undefined }> = {
  answer: { tr: 'Tam cevap', en: 'Full answer', icon: FileText, value: (card) => card.answer },
  production: { tr: 'Production', en: 'Production', icon: Server, value: (card) => card.productionExample },
  why: { tr: 'Neden?', en: 'Why?', icon: Lightbulb, value: (card) => card.why },
  banking: { tr: 'Banking', en: 'Banking', icon: Landmark, value: (card) => card.bankingExample },
  tip: { tr: 'Mülakat ipucu', en: 'Interview tip', icon: Sparkles, value: (card) => card.interviewTip },
}

function NoteEditor({ card }: { card: FlashcardDto }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [note, setNote] = useState(card.personalNote ?? '')
  const mutation = useMutation({
    mutationFn: (personalNote: string) => api.flashcards.updateNote<FlashcardDto>(card.id, { personalNote }),
    onSuccess: (updated) => {
      queryClient.setQueryData<FlashcardDto[]>(queryKeys.flashcards.all, (current) =>
        current?.map((item) => item.id === updated.id ? updated : item),
      )
    },
  })
  const saveNote = mutation.mutate

  useEffect(() => setNote(card.personalNote ?? ''), [card.id, card.personalNote])

  useEffect(() => {
    if (note.trim() === (card.personalNote ?? '')) return
    const timeout = window.setTimeout(() => saveNote(note), 700)
    return () => window.clearTimeout(timeout)
  }, [card.personalNote, note, saveNote])

  return (
    <div>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={3}
        placeholder={t('Kısa notunu yaz…', 'Write a short note…')}
        className="min-h-24 w-full resize-y rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
      />
      <p className={cn('mt-1.5 text-[10px]', mutation.isError ? 'text-rose-500' : 'text-muted-foreground')}>
        {mutation.isPending
          ? t('Kaydediliyor…', 'Saving…')
          : mutation.isError
            ? t('Not kaydedilemedi.', 'Note could not be saved.')
            : t('Otomatik kaydedilir', 'Saved automatically')}
      </p>
    </div>
  )
}

function QuestionList({ cards, onDetail }: { cards: FlashcardDto[]; onDetail: (card: FlashcardDto, kind: DetailKind) => void }) {
  const { t } = useI18n()
  if (!cards.length) return <p className="px-4 py-5 text-xs text-muted-foreground">{t('Bu başlıkta soru yok.', 'No questions in this topic.')}</p>

  return (
    <div className="divide-y divide-border/70">
      {cards.map((card, index) => (
        <article key={card.id} className="grid gap-4 px-4 py-5 xl:grid-cols-[minmax(260px,0.8fr)_minmax(340px,1.2fr)] xl:px-5">
          <div>
            <div className="flex gap-3">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
              <h4 className="text-sm font-semibold leading-6 text-foreground">{card.question}</h4>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5 pl-10">
              {(Object.keys(detailConfig) as DetailKind[]).map((kind) => {
                const config = detailConfig[kind]
                const Icon = config.icon
                const available = Boolean(config.value(card)?.trim())
                return (
                  <button
                    key={kind}
                    type="button"
                    disabled={!available}
                    onClick={() => onDetail(card, kind)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background/60 px-2.5 text-[11px] font-semibold text-muted-foreground transition hover:border-primary/35 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Icon className="size-3.5" />
                    {t(config.tr, config.en)}
                  </button>
                )
              })}
            </div>
          </div>
          <NoteEditor card={card} />
        </article>
      ))}
    </div>
  )
}

function Accordion({ title, count, accent, children, inset = false, onCopy, copied = false, onSmartSave }: { title: string; count: number; accent?: string; children: React.ReactNode; inset?: boolean; onCopy?: () => void; copied?: boolean; onSmartSave?: () => void }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  return (
    <section className={cn('overflow-hidden border bg-card', inset ? 'rounded-xl border-border/70' : 'rounded-2xl border-border shadow-sm')}>
      <div className="flex items-center gap-2 px-4 py-2 transition hover:bg-muted/40 sm:px-5">
        {accent ? <span className="h-8 w-1 rounded-full" style={{ backgroundColor: accent }} /> : null}
        <button type="button" onClick={() => setOpen((value) => !value)} className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left">
          <span className="flex-1 text-sm font-semibold text-foreground sm:text-base">{title}</span>
        </button>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background/70 px-2.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            {copied ? t('Kopyalandı', 'Copied') : t('Listeyi kopyala', 'Copy list')}
          </button>
        ) : null}
        {onSmartSave ? (
          <button type="button" onClick={onSmartSave} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 px-2.5 text-[11px] font-semibold text-primary transition hover:bg-primary/10">
            <WandSparkles className="size-3.5" />
            {t('Akıllı kaydet', 'Smart save')}
          </button>
        ) : null}
        <button type="button" onClick={() => setOpen((value) => !value)} className="flex items-center gap-3 py-2">
          <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">{count}</span>
          <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open ? <div className="border-t border-border/70">{children}</div> : null}
    </section>
  )
}

function SmartSaveModal({ selection, onClose }: { selection: SmartSaveSelection; onClose: () => void }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [raw, setRaw] = useState('')
  const parsed = useMemo(() => parseSummaryList(raw), [raw])
  const matches = useMemo(() => {
    if (!selection) return []
    const cardsByQuestion = new Map(selection.cards.map((card) => [normalizeQuestion(card.question), card]))
    return parsed.map((item) => ({ ...item, card: cardsByQuestion.get(normalizeQuestion(item.question)) }))
  }, [parsed, selection])
  const matched = matches.filter((item): item is typeof item & { card: FlashcardDto } => Boolean(item.card))
  const mutation = useMutation({
    mutationFn: async () => Promise.all(matched.map((item) => api.flashcards.updateNote<FlashcardDto>(item.card.id, { personalNote: item.note.slice(0, 1000) }))),
    onSuccess: (updatedCards) => {
      queryClient.setQueryData<FlashcardDto[]>(queryKeys.flashcards.all, (current) => current?.map((card) => updatedCards.find((updated) => updated.id === card.id) ?? card))
      onClose()
    },
  })

  useEffect(() => setRaw(''), [selection?.topic.id])
  useEffect(() => {
    if (!selection) return
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, selection])
  if (!selection) return null

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/55 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        <header className="flex items-start gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">{t('Akıllı kısa not kaydı', 'Smart short-note save')}</p><h2 className="mt-1 text-lg font-semibold text-foreground">{selection.topic.name}</h2></div>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-muted" aria-label={t('Kapat', 'Close')}><X className="size-4" /></button>
        </header>
        <div className="overflow-y-auto p-5 sm:p-6">
          <p className="text-sm leading-6 text-muted-foreground">{t('### 1. Soru başlıklarıyla gelen metni yapıştır. Eşleşen text blokları kısa not olarak otomatik kaydedilir.', 'Paste text containing ### 1. Question headings. Matching text blocks are saved as short notes.')}</p>
          <textarea value={raw} onChange={(event) => setRaw(event.target.value)} rows={14} placeholder="### 1. Soru…\n\n```text\nÖzet cevap…\n```" className="mt-4 w-full resize-y rounded-2xl border border-border bg-background p-4 font-mono text-xs leading-6 outline-none focus:ring-2 focus:ring-primary/20" />
          {raw.trim() ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-lg bg-muted px-2.5 py-1.5 text-muted-foreground">{t(`${parsed.length} bölüm bulundu`, `${parsed.length} sections found`)}</span>
              <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-emerald-600">{t(`${matched.length} soru eşleşti`, `${matched.length} questions matched`)}</span>
              {matches.length > matched.length ? <span className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-amber-600">{t(`${matches.length - matched.length} eşleşmedi`, `${matches.length - matched.length} unmatched`)}</span> : null}
            </div>
          ) : null}
          {matches.some((item) => !item.card) ? <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-700 dark:text-amber-300">{matches.filter((item) => !item.card).map((item) => item.question).join(' • ')}</div> : null}
          {mutation.isError ? <p className="mt-3 text-xs text-rose-500">{t('Kısa notlar kaydedilemedi.', 'Short notes could not be saved.')}</p> : null}
          <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="h-9 rounded-xl border border-border px-3 text-xs font-semibold">{t('Vazgeç', 'Cancel')}</button><button type="button" disabled={!matched.length || mutation.isPending} onClick={() => mutation.mutate()} className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-40"><Save className="size-4" />{mutation.isPending ? t('Kaydediliyor…', 'Saving…') : t(`${matched.length} notu kaydet`, `Save ${matched.length} notes`)}</button></div>
        </div>
      </div>
    </div>
  )
}

function DetailModal({ selection, onClose }: { selection: DetailSelection; onClose: () => void }) {
  const { t } = useI18n()
  useEffect(() => {
    if (!selection) return
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, selection])
  if (!selection) return null
  const config = detailConfig[selection.kind]
  const value = config.value(selection.card) ?? ''
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/55 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        <header className="flex items-start gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">{t(config.tr, config.en)}</p>
            <h2 className="mt-1 text-base font-semibold leading-6 text-foreground">{selection.card.question}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={t('Kapat', 'Close')}><X className="size-4" /></button>
        </header>
        <div className="overflow-y-auto p-5 sm:p-7"><MarkdownAnswer value={value} className="text-base leading-8" /></div>
      </div>
    </div>
  )
}

export default function ShortNotesPage() {
  const { t } = useI18n()
  const [detail, setDetail] = useState<DetailSelection>(null)
  const [smartSave, setSmartSave] = useState<SmartSaveSelection>(null)
  const [copiedTopicId, setCopiedTopicId] = useState<string | null>(null)
  const topicsQuery = useQuery({ queryKey: queryKeys.topics.all, queryFn: () => api.topics.list<TopicDto[]>() })
  const cardsQuery = useQuery({ queryKey: queryKeys.flashcards.all, queryFn: () => api.flashcards.list<FlashcardDto[]>() })
  const topics = topicsQuery.data ?? EMPTY_TOPICS
  const cards = cardsQuery.data ?? EMPTY_CARDS
  const roots = useMemo(() => topics.filter((topic) => !topic.parentTopicId).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)), [topics])
  const cardsByTopic = useMemo(() => groupBy(cards, (card) => card.topicId ?? ''), [cards])
  const childrenByParent = useMemo(() => groupBy(topics.filter((topic) => topic.parentTopicId), (topic) => topic.parentTopicId ?? ''), [topics])
  const sortedCards = (topicId: string) => [...(cardsByTopic.get(topicId) ?? [])].sort((a, b) => a.createdAtUtc.localeCompare(b.createdAtUtc))
  const descendantCount = (root: TopicDto) => (childrenByParent.get(root.id) ?? []).reduce((total, child) => total + sortedCards(child.id).length, sortedCards(root.id).length)

  const copyQuestionList = async (topic: TopicDto, questions: FlashcardDto[]) => {
    const lines = [topic.name, '', ...questions.map((card, index) => `${index + 1}. ${card.question}`)]
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopiedTopicId(topic.id)
    window.setTimeout(() => setCopiedTopicId((current) => current === topic.id ? null : current), 1800)
  }

  if (topicsQuery.isPending || cardsQuery.isPending) return <div className="h-72 animate-pulse rounded-2xl bg-muted" />
  if (topicsQuery.isError || cardsQuery.isError) return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-500">{t('Kısa notlar yüklenemedi.', 'Short notes could not be loaded.')}</div>

  return (
    <div>
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">{t('Hızlı çalışma alanı', 'Quick study workspace')}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">{t('Kısa Notlar', 'Short Notes')}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('Konuları sırayla aç, kısa cevaplarını tek ekranda düzenle ve ihtiyaç duyduğun ayrıntıyı modalda görüntüle.', 'Expand topics in order, edit short answers in one place, and open details in a modal.')}</p>
      </div>
      <div className="space-y-3">
        {roots.map((root) => {
          const children = [...(childrenByParent.get(root.id) ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
          const directCards = sortedCards(root.id)
          return (
            <Accordion key={root.id} title={root.name} count={descendantCount(root)} accent={root.accentColor}>
              <div className="space-y-2 bg-muted/15 p-3 sm:p-4">
                {directCards.length ? <Accordion title={t('Genel sorular', 'General questions')} count={directCards.length} inset><QuestionList cards={directCards} onDetail={(card, kind) => setDetail({ card, kind })} /></Accordion> : null}
                {children.map((child) => {
                  const childCards = sortedCards(child.id)
                  return <Accordion key={child.id} title={child.name} count={childCards.length} inset onCopy={() => void copyQuestionList(child, childCards)} copied={copiedTopicId === child.id} onSmartSave={() => setSmartSave({ topic: child, cards: childCards })}><QuestionList cards={childCards} onDetail={(card, kind) => setDetail({ card, kind })} /></Accordion>
                })}
              </div>
            </Accordion>
          )
        })}
        {(cardsByTopic.get('') ?? []).length ? <Accordion title={t('Konusuz sorular', 'Uncategorized questions')} count={(cardsByTopic.get('') ?? []).length}><QuestionList cards={sortedCards('')} onDetail={(card, kind) => setDetail({ card, kind })} /></Accordion> : null}
      </div>
      <DetailModal selection={detail} onClose={() => setDetail(null)} />
      <SmartSaveModal selection={smartSave} onClose={() => setSmartSave(null)} />
    </div>
  )
}
