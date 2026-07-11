import { useCallback, useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Check,
  CreditCard,
  Layers3,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import {
  ActionButton,
  EmptyState,
  PageHeader,
  Panel,
  StatusPill,
} from '../components/features/FeaturePrimitives'
import {
  FlashcardInsightEditorFields,
  FlashcardInsightFields,
} from '../components/features/FlashcardInsightFields'
import {
  emptyFlashcardInsights,
  interviewFrequencyLabel,
  interviewFrequencyTone,
  normalizeFlashcardInsights,
  type FlashcardInsightDraft,
} from '../components/features/flashcardInsightModel'
import { MarkdownAnswer } from '../components/features/MarkdownAnswer'
import { RichAnswerEditor } from '../components/features/RichAnswerEditor'
import { FlashcardWhyEditorField, FlashcardWhySection } from '../components/features/FlashcardWhySection'
import { cn } from '../components/features/featureClassNames'
import { useI18n } from '../i18n'
import { api } from '../services/api'
import { queryKeys } from '../services/queryKeys'
import type { ApiDifficulty, FlashcardDto, TopicDto, UpsertFlashcardInput } from '../types/api'

type ReviewRating = 'Again' | 'Hard' | 'Good' | 'Easy'
type Mode = 'simulate' | 'browse'

type CardDraft = {
  question: string
  answer: string
  why: string
  insights: FlashcardInsightDraft
  difficulty: ApiDifficulty
  topicId: string | null
  tags: string[]
}

const emptyDraft: CardDraft = {
  question: '',
  answer: '',
  why: '',
  insights: emptyFlashcardInsights,
  difficulty: 'Medium',
  topicId: null,
  tags: [],
}

const EMPTY_TOPICS: TopicDto[] = []
const EMPTY_CARDS: FlashcardDto[] = []

function difficultyTone(difficulty: ApiDifficulty) {
  return difficulty === 'Hard' ? 'danger' as const : difficulty === 'Medium' ? 'warning' as const : 'success' as const
}

function splitTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function shouldCollapseCard(card: FlashcardDto) {
  const insightText = [card.why, card.productionExample, card.bankingExample, card.interviewTip]
    .filter(Boolean)
    .join('\n')

  return card.question.length > 140
    || card.answer.length > 180
    || card.answer.includes('\n')
    || card.answer.includes('```')
    || insightText.length > 180
    || insightText.includes('\n')
    || insightText.includes('```')
}

function handleToggleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>, toggle: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    toggle()
  }
}

export default function FlashcardsPage() {
  const { t, locale } = useI18n()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const linkedCardId = searchParams.get('id')
  const [mode, setMode] = useState<Mode>(linkedCardId ? 'browse' : 'simulate')
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [selectedRootId, setSelectedRootId] = useState('')
  const [selectedSubtopicId, setSelectedSubtopicId] = useState('')
  const [selectedTag, setSelectedTag] = useState(searchParams.get('tag') ?? '')
  const [difficulty, setDifficulty] = useState<ApiDifficulty | 'all'>('all')
  const [dueOnly, setDueOnly] = useState(false)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [selfAnswer, setSelfAnswer] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<CardDraft>(emptyDraft)
  const [expandedBrowseCardIds, setExpandedBrowseCardIds] = useState<Set<string>>(new Set())

  const cardsQuery = useQuery({
    queryKey: queryKeys.flashcards.all,
    queryFn: () => api.flashcards.list<FlashcardDto[]>(),
  })

  const topicsQuery = useQuery({
    queryKey: queryKeys.topics.all,
    queryFn: () => api.topics.list<TopicDto[]>(),
  })

  const cards = useMemo(() => cardsQuery.data ?? EMPTY_CARDS, [cardsQuery.data])
  const topics = useMemo(() => topicsQuery.data ?? EMPTY_TOPICS, [topicsQuery.data])

  const topicById = useMemo(() => new Map(topics.map((topic) => [topic.id, topic])), [topics])
  const rootTopics = useMemo(
    () => topics.filter((topic) => !topic.parentTopicId).sort((a, b) => a.name.localeCompare(b.name, locale)),
    [locale, topics],
  )
  const childrenByParent = useMemo(() => {
    const map = new Map<string, TopicDto[]>()
    for (const topic of topics) {
      if (!topic.parentTopicId) continue
      const items = map.get(topic.parentTopicId) ?? []
      items.push(topic)
      map.set(topic.parentTopicId, items)
    }
    for (const children of map.values()) children.sort((a, b) => a.name.localeCompare(b.name, locale))
    return map
  }, [locale, topics])

  useEffect(() => {
    const topicId = searchParams.get('topicId') ?? ''
    const topic = topicId ? topicById.get(topicId) : undefined
    if (topic?.parentTopicId) {
      setSelectedRootId(topic.parentTopicId)
      setSelectedSubtopicId(topic.id)
    } else {
      setSelectedRootId(topicId)
      setSelectedSubtopicId('')
    }
    setSelectedTag(searchParams.get('tag') ?? '')
    setQuery(searchParams.get('q') ?? '')
    if (searchParams.get('id')) setMode('browse')
  }, [searchParams, topicById])

  const effectiveTopicId = selectedSubtopicId || selectedRootId
  const effectiveTopic = effectiveTopicId ? topicById.get(effectiveTopicId) : undefined
  const availableSubtopics = selectedRootId ? childrenByParent.get(selectedRootId) ?? [] : []

  const topicScopeIds = useMemo(() => {
    if (!effectiveTopicId) return new Set<string>()
    const topic = topicById.get(effectiveTopicId)
    if (!topic) return new Set<string>()
    if (topic.parentTopicId) return new Set([topic.id])
    return new Set([topic.id, ...(childrenByParent.get(topic.id) ?? []).map((child) => child.id)])
  }, [childrenByParent, effectiveTopicId, topicById])

  const availableTags = useMemo(() => {
    const tags = new Set<string>()
    for (const card of cards) {
      if (topicScopeIds.size > 0 && (!card.topicId || !topicScopeIds.has(card.topicId))) continue
      card.tags.forEach((tag) => tags.add(tag))
    }
    return [...tags].sort((a, b) => a.localeCompare(b, locale))
  }, [cards, locale, topicScopeIds])

  const filteredCards = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale)
    const now = Date.now()
    return cards
      .filter((card) => {
        if (linkedCardId && card.id !== linkedCardId) return false
        if (topicScopeIds.size > 0 && (!card.topicId || !topicScopeIds.has(card.topicId))) return false
        if (selectedTag && !card.tags.some((tag) => tag.toLocaleLowerCase(locale) === selectedTag.toLocaleLowerCase(locale))) return false
        if (difficulty !== 'all' && card.difficulty !== difficulty) return false
        if (dueOnly && new Date(card.nextReviewAtUtc).getTime() > now) return false
        if (!normalized) return true
        return [
          card.question,
          card.answer,
          card.why ?? '',
          card.productionExample ?? '',
          card.bankingExample ?? '',
          card.interviewTip ?? '',
          card.topicName ?? '',
          ...card.tags,
        ]
          .some((value) => value.toLocaleLowerCase(locale).includes(normalized))
      })
      .sort((a, b) =>
        new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime()
        || a.question.localeCompare(b.question, locale),
      )
  }, [cards, difficulty, dueOnly, linkedCardId, locale, query, selectedTag, topicScopeIds])

  const card = filteredCards.length ? filteredCards[index % filteredCards.length] : undefined

  useEffect(() => {
    setIndex(0)
    setFlipped(false)
    setSelfAnswer('')
  }, [difficulty, dueOnly, effectiveTopicId, query, selectedTag])

  useEffect(() => {
    if (index >= filteredCards.length) setIndex(0)
  }, [filteredCards.length, index])

  const invalidateCards = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.all })
    void queryClient.invalidateQueries({ queryKey: ['flashcards'] })
  }

  const reviewMutation = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: ReviewRating }) =>
      api.flashcards.review<FlashcardDto>(id, { rating }),
    onSuccess: (updated) => {
      queryClient.setQueryData<FlashcardDto[]>(queryKeys.flashcards.all, (current) =>
        current?.map((item) => (item.id === updated.id ? updated : item)),
      )
      invalidateCards()
      setFlipped(false)
      setSelfAnswer('')
      setIndex((value) => (filteredCards.length > 1 ? (value + 1) % filteredCards.length : 0))
    },
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      const input: UpsertFlashcardInput = {
        question: draft.question.trim(),
        answer: draft.answer.trim(),
        why: draft.why.trim() || null,
        ...normalizeFlashcardInsights(draft.insights),
        difficulty: draft.difficulty,
        topicId: draft.topicId,
        tags: draft.tags,
      }
      return editingId
        ? api.flashcards.update<FlashcardDto>(editingId, input)
        : api.flashcards.create<FlashcardDto>(input)
    },
    onSuccess: () => {
      invalidateCards()
      setEditorOpen(false)
      setEditingId(null)
      setDraft(emptyDraft)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.flashcards.remove(id),
    onSuccess: () => invalidateCards(),
  })

  const difficultyLabel = (value: ApiDifficulty) => {
    if (value === 'Easy') return t('Kolay', 'Easy')
    if (value === 'Hard') return t('Zor', 'Hard')
    return t('Orta', 'Medium')
  }

  const ratings = [
    { rating: 'Again' as const, label: t('Tekrar', 'Again'), shortcut: '1', icon: X, style: 'border-rose-500/25 bg-rose-500/5 text-rose-600 dark:text-rose-400' },
    { rating: 'Hard' as const, label: t('Zor', 'Hard'), shortcut: '2', icon: RotateCcw, style: 'border-amber-500/25 bg-amber-500/5 text-amber-600 dark:text-amber-400' },
    { rating: 'Good' as const, label: t('İyi', 'Good'), shortcut: '3', icon: Check, style: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' },
    { rating: 'Easy' as const, label: t('Kolay', 'Easy'), shortcut: '4', icon: Zap, style: 'border-sky-500/25 bg-sky-500/5 text-sky-600 dark:text-sky-400' },
  ]

  const rateCard = useCallback((rating: ReviewRating) => {
    if (!card || !flipped || reviewMutation.isPending) return
    reviewMutation.mutate({ id: card.id, rating })
  }, [card, flipped, reviewMutation])

  useEffect(() => {
    if (mode !== 'simulate') return
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isEditing = target?.isContentEditable
        || target?.tagName === 'INPUT'
        || target?.tagName === 'TEXTAREA'
        || target?.tagName === 'SELECT'
      if (editorOpen || isEditing) return
      if (event.code === 'Space') {
        event.preventDefault()
        setFlipped((value) => !value)
      } else if (flipped && ['1', '2', '3', '4'].includes(event.key)) {
        event.preventDefault()
        rateCard((['Again', 'Hard', 'Good', 'Easy'] as const)[Number(event.key) - 1])
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [editorOpen, flipped, mode, rateCard])

  const openCreate = () => {
    setEditingId(null)
    setDraft({
      ...emptyDraft,
      topicId: effectiveTopicId || null,
      tags: selectedTag ? [selectedTag] : [],
    })
    setEditorOpen(true)
  }

  const openEdit = (item: FlashcardDto) => {
    setEditingId(item.id)
    setDraft({
      question: item.question,
      answer: item.answer,
      why: item.why ?? '',
      insights: {
        productionExample: item.productionExample ?? '',
        bankingExample: item.bankingExample ?? '',
        interviewTip: item.interviewTip ?? '',
        interviewFrequency: item.interviewFrequency ?? '',
      },
      difficulty: item.difficulty,
      topicId: item.topicId ?? null,
      tags: item.tags,
    })
    setEditorOpen(true)
  }

  const clearFilters = () => {
    setSelectedRootId('')
    setSelectedSubtopicId('')
    setSelectedTag('')
    setDifficulty('all')
    setDueOnly(false)
    setQuery('')
    setSearchParams({})
  }

  const toggleBrowseCard = (cardId: string) => {
    setExpandedBrowseCardIds((current) => {
      const next = new Set(current)
      if (next.has(cardId)) {
        next.delete(cardId)
      } else {
        next.add(cardId)
      }
      return next
    })
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      <PageHeader
        eyebrow={t('Filtreli mülakat pratiği', 'Filtered interview practice')}
        title={t('Pratik', 'Practice')}
        description={t(
          'Konu, alt konu ve etiket seç; sadece çalışmak istediğin sorularla mülakat simülasyonu yap.',
          'Choose topic, subtopic, and tags; practice only the questions you want.',
        )}
        actions={(
          <>
            <div className="flex rounded-xl border border-border bg-card p-0.5">
              {(['simulate', 'browse'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={cn(
                    'h-8 rounded-lg px-3 text-xs font-medium transition',
                    mode === item ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {item === 'simulate' ? t('Simülasyon', 'Simulation') : t('Soru havuzu', 'Question bank')}
                </button>
              ))}
            </div>
            <ActionButton icon={Plus} variant="primary" onClick={openCreate}>{t('Soru ekle', 'Add question')}</ActionButton>
          </>
        )}
      />

      <Panel className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_210px_210px_170px_150px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <span className="sr-only">{t('Sorularda ara', 'Search questions')}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              placeholder={t('Soru, cevap veya etiket ara', 'Search question, answer, or tag')}
            />
          </label>
          <select
            value={selectedRootId}
            onChange={(event) => {
              setSelectedRootId(event.target.value)
              setSelectedSubtopicId('')
            }}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            aria-label={t('Konu filtresi', 'Topic filter')}
          >
            <option value="">{t('Tüm konular', 'All topics')}</option>
            {rootTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
          </select>
          <select
            value={selectedSubtopicId}
            onChange={(event) => setSelectedSubtopicId(event.target.value)}
            disabled={!selectedRootId || availableSubtopics.length === 0}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-55"
            aria-label={t('Alt konu filtresi', 'Subtopic filter')}
          >
            <option value="">{t('Tüm alt konular', 'All subtopics')}</option>
            {availableSubtopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
          </select>
          <select
            value={selectedTag}
            onChange={(event) => setSelectedTag(event.target.value)}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            aria-label={t('Etiket filtresi', 'Tag filter')}
          >
            <option value="">{t('Tüm etiketler', 'All tags')}</option>
            {availableTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
          </select>
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as ApiDifficulty | 'all')}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            aria-label={t('Zorluk filtresi', 'Difficulty filter')}
          >
            <option value="all">{t('Tüm zorluklar', 'All levels')}</option>
            <option value="Easy">{difficultyLabel('Easy')}</option>
            <option value="Medium">{difficultyLabel('Medium')}</option>
            <option value="Hard">{difficultyLabel('Hard')}</option>
          </select>
          <button
            type="button"
            onClick={() => setDueOnly((value) => !value)}
            className={cn(
              'inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition',
              dueOnly ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:bg-muted',
            )}
          >
            <SlidersHorizontal className="size-4" />
            {t('Vadesi gelen', 'Due')}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{filteredCards.length} {t('soru gösteriliyor', 'questions shown')}</span>
          {effectiveTopic ? <StatusPill tone="purple">{effectiveTopic.parentTopicName ? `${effectiveTopic.parentTopicName} / ${effectiveTopic.name}` : effectiveTopic.name}</StatusPill> : null}
          {selectedTag ? <StatusPill>{selectedTag}</StatusPill> : null}
          {(effectiveTopicId || selectedTag || difficulty !== 'all' || dueOnly || query || linkedCardId) ? (
            <button type="button" onClick={clearFilters} className="ml-auto font-semibold text-foreground hover:text-primary">
              {t('Filtreleri temizle', 'Clear filters')}
            </button>
          ) : null}
        </div>
      </Panel>

      {cardsQuery.isPending || topicsQuery.isPending ? (
        <Panel className="grid min-h-96 animate-pulse place-items-center text-sm text-muted-foreground">{t('Sorular yükleniyor...', 'Loading questions...')}</Panel>
      ) : cardsQuery.isError || topicsQuery.isError ? (
        <Panel>
          <EmptyState
            icon={Layers3}
            title={t('Sorular yüklenemedi', 'Questions could not be loaded')}
            description={t('API bağlantısını kontrol edip yeniden deneyin.', 'Check the API connection and try again.')}
            action={<ActionButton onClick={() => { void cardsQuery.refetch(); void topicsQuery.refetch() }}>{t('Yeniden dene', 'Try again')}</ActionButton>}
          />
        </Panel>
      ) : cards.length === 0 ? (
        <Panel>
          <EmptyState
            icon={CreditCard}
            title={t('Henüz soru yok', 'No questions yet')}
            description={t('İlk soru-cevap kartını ekleyerek pratik havuzunu başlat.', 'Create your first question-answer card to start practice.')}
            action={<ActionButton icon={Plus} variant="primary" onClick={openCreate}>{t('Soru ekle', 'Add question')}</ActionButton>}
          />
        </Panel>
      ) : mode === 'simulate' ? (
        card ? (
          <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-4">
              <Panel className="p-5">
                <p className="text-xs font-semibold text-foreground">{t('Simülasyon seti', 'Simulation set')}</p>
                <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground">{filteredCards.length}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{t('filtreye uyan soru', 'matching questions')}</p>
              </Panel>
              <Panel className="p-4">
                <p className="text-xs font-semibold text-foreground">{t('Sıradaki konu', 'Current topic')}</p>
                <p className="mt-2 text-sm font-medium text-foreground">{card.topicName || t('Genel', 'General')}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {card.tags.map((tag) => <span key={tag} className="rounded-lg border border-border/70 px-2 py-1 text-[11px] text-muted-foreground">{tag}</span>)}
                </div>
              </Panel>
            </div>

            <section className="min-h-[620px]">
              <div className="mb-3 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
                <button type="button" onClick={() => setIndex((value) => (value === 0 ? filteredCards.length - 1 : value - 1))} className="inline-flex items-center gap-1.5 hover:text-foreground"><ArrowLeft className="size-3.5" />{t('Önceki', 'Previous')}</button>
                <span>{t(`Soru ${Math.min(index + 1, filteredCards.length)} / ${filteredCards.length}`, `Question ${Math.min(index + 1, filteredCards.length)} of ${filteredCards.length}`)}</span>
                <button type="button" onClick={() => { setIndex((value) => (value + 1) % filteredCards.length); setFlipped(false); setSelfAnswer('') }} className="inline-flex items-center gap-1.5 hover:text-foreground">{t('Sonraki', 'Next')}<ArrowRight className="size-3.5" /></button>
              </div>

              <div className="relative min-h-[430px] [perspective:1400px]">
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={`${card.id}-${flipped ? 'answer' : 'question'}`}
                    initial={{ opacity: 0, rotateY: flipped ? -10 : 10, scale: 0.985 }}
                    animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                    exit={{ opacity: 0, rotateY: flipped ? 10 : -10, scale: 0.985 }}
                    transition={{ duration: 0.24 }}
                    className="absolute inset-0 flex flex-col overflow-hidden rounded-[28px] border border-border bg-card p-7 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-10"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone="purple">{card.topicName || t('Genel', 'General')}</StatusPill>
                      <StatusPill tone={difficultyTone(card.difficulty)}>{`${t('Zorluk', 'Difficulty')}: ${difficultyLabel(card.difficulty)}`}</StatusPill>
                      {card.interviewFrequency ? (
                        <StatusPill tone={interviewFrequencyTone(card.interviewFrequency)}>
                          {`${t('Sorulma', 'Asked')}: ${interviewFrequencyLabel(card.interviewFrequency, t)}`}
                        </StatusPill>
                      ) : null}
                    </div>
                    {!flipped ? (
                      <div className="grid flex-1 gap-6 py-8 lg:grid-cols-[1fr_0.95fr] lg:items-center">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{t('Mülakat sorusu', 'Interview question')}</p>
                          <h2 className="mt-5 text-balance text-2xl font-semibold leading-snug tracking-[-0.03em] text-foreground sm:text-[1.8rem]">{card.question}</h2>
                        </div>
                        <label className="block">
                          <span className="text-xs font-semibold text-foreground">{t('Kendi cevabın', 'Your answer')}</span>
                          <textarea
                            value={selfAnswer}
                            onChange={(event) => setSelfAnswer(event.target.value)}
                            placeholder={t('Cevabını yazabilir veya sesli anlatıp kısa not alabilirsin.', 'Write your answer or speak it and keep short notes.')}
                            className="mt-2 min-h-52 w-full resize-none rounded-2xl border border-border bg-background/80 p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring/30"
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="grid flex-1 place-items-center py-8">
                        <div className="max-w-3xl">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{t('Beklenen cevap', 'Expected answer')}</p>
                          <MarkdownAnswer value={card.answer} className="mt-5 text-base leading-8 sm:text-lg" />
                          <FlashcardWhySection value={card.why} />
                          <FlashcardInsightFields card={card} />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-center">
                      <ActionButton onClick={() => setFlipped((value) => !value)}>
                        {flipped ? t('Soruyu göster', 'Show question') : t('Cevabı göster', 'Reveal answer')}
                      </ActionButton>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {reviewMutation.isError ? <p className="mt-3 text-center text-xs text-rose-500">{t('Tekrar kaydedilemedi. Yeniden dene.', 'Review could not be saved. Try again.')}</p> : null}
              <div className={cn('mt-4 grid grid-cols-2 gap-2 transition sm:grid-cols-4', !flipped && 'pointer-events-none translate-y-1 opacity-35')}>
                {ratings.map(({ rating, label, shortcut, icon: Icon, style }) => (
                  <button key={rating} type="button" onClick={() => rateCard(rating)} disabled={!flipped || reviewMutation.isPending} className={cn('rounded-2xl border px-3 py-3 text-left transition disabled:cursor-not-allowed', style)}>
                    <div className="flex items-center justify-between"><Icon className="size-4" /><span className="rounded border border-current/15 px-1.5 py-0.5 font-mono text-[9px]">{shortcut}</span></div>
                    <p className="mt-2 text-xs font-semibold">{label}</p>
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <Panel>
            <EmptyState
              icon={Search}
              title={t('Bu filtrelerle soru yok', 'No questions match these filters')}
              description={t('Filtreleri değiştir veya bu konu için yeni soru ekle.', 'Change filters or add a question for this topic.')}
              action={<ActionButton icon={Plus} variant="primary" onClick={openCreate}>{t('Soru ekle', 'Add question')}</ActionButton>}
            />
          </Panel>
        )
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCards.length ? filteredCards.map((item) => {
            const canExpandCard = shouldCollapseCard(item)
            const cardExpanded = expandedBrowseCardIds.has(item.id)
            const showFullCard = !canExpandCard || cardExpanded

            return (
            <Panel key={item.id} className={cn('p-5 transition hover:-translate-y-0.5 hover:border-primary/25', linkedCardId === item.id && 'border-primary/40 ring-2 ring-primary/10')}>
              <div className="flex items-center justify-between gap-2">
                <StatusPill tone="purple">{item.topicName || t('Genel', 'General')}</StatusPill>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  <StatusPill tone={difficultyTone(item.difficulty)}>{`${t('Zorluk', 'Difficulty')}: ${difficultyLabel(item.difficulty)}`}</StatusPill>
                  {item.interviewFrequency ? (
                    <StatusPill tone={interviewFrequencyTone(item.interviewFrequency)}>
                      {`${t('Sorulma', 'Asked')}: ${interviewFrequencyLabel(item.interviewFrequency, t)}`}
                    </StatusPill>
                  ) : null}
                </div>
              </div>
              <div
                role={canExpandCard ? 'button' : undefined}
                tabIndex={canExpandCard ? 0 : undefined}
                aria-expanded={canExpandCard ? cardExpanded : undefined}
                aria-label={canExpandCard ? (cardExpanded ? t('Kartı kısalt', 'Collapse card') : t('Kartı genişlet', 'Expand card')) : undefined}
                onClick={canExpandCard ? () => toggleBrowseCard(item.id) : undefined}
                onKeyDown={canExpandCard ? (event) => handleToggleKeyDown(event, () => toggleBrowseCard(item.id)) : undefined}
                className={cn(
                  'mt-5',
                  canExpandCard && '-mx-2 cursor-pointer rounded-2xl p-2 transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                )}
              >
                <p className={cn('text-sm font-semibold leading-6 text-foreground', !showFullCard && 'line-clamp-2')}>{item.question}</p>
                <div className={cn('relative mt-3 overflow-hidden text-muted-foreground transition-[max-height] duration-200', showFullCard ? 'max-h-none' : 'max-h-16')}>
                  <MarkdownAnswer value={item.answer} compact />
                  <FlashcardWhySection value={item.why} compact />
                  <FlashcardInsightFields card={item} compact />
                  {!showFullCard ? <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent" /> : null}
                </div>
                {canExpandCard ? (
                  <div className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 text-xs font-semibold text-primary transition">
                    {cardExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                    <span>{cardExpanded ? t('Kısalt', 'Collapse') : t('Devamını göster', 'Show more')}</span>
                  </div>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {item.tags.map((tag) => <button key={tag} type="button" onClick={() => setSelectedTag(tag)} className="rounded-lg border border-border/70 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">{tag}</button>)}
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4 text-[10px] text-muted-foreground">
                <span>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(item.nextReviewAtUtc))}</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => openEdit(item)} className="grid size-8 place-items-center rounded-lg hover:bg-muted" aria-label={t('Soruyu düzenle', 'Edit question')}><Pencil className="size-3.5" /></button>
                  <button type="button" onClick={() => { if (window.confirm(t('Bu soru silinsin mi?', 'Delete this question?'))) deleteMutation.mutate(item.id) }} className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-500/10" aria-label={t('Soruyu sil', 'Delete question')}><Trash2 className="size-3.5" /></button>
                </div>
              </div>
            </Panel>
            )
          }) : (
            <Panel className="md:col-span-2 xl:col-span-3">
              <EmptyState
                icon={Search}
                title={t('Soru bulunamadı', 'No questions found')}
                description={t('Arama veya filtreleri değiştir.', 'Change the search or filters.')}
                action={<ActionButton onClick={clearFilters}>{t('Filtreleri temizle', 'Clear filters')}</ActionButton>}
              />
            </Panel>
          )}
        </div>
      )}

      {editorOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={editingId ? t('Soruyu düzenle', 'Edit question') : t('Yeni soru', 'New question')}>
          <Panel className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto p-5 shadow-float sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">{editingId ? t('Soruyu düzenle', 'Edit question') : t('Yeni soru', 'New question')}</h2>
              <button type="button" onClick={() => setEditorOpen(false)} className="grid size-8 place-items-center rounded-lg hover:bg-muted" aria-label={t('Pencereyi kapat', 'Close dialog')}><X className="size-4" /></button>
            </div>
            <label className="mt-5 block text-xs font-medium text-foreground">
              {t('Konu / alt konu', 'Topic / subtopic')}
              <select value={draft.topicId ?? ''} onChange={(event) => setDraft((value) => ({ ...value, topicId: event.target.value || null }))} className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
                <option value="">{t('Genel / Atanmamış', 'General / Unassigned')}</option>
                {rootTopics.map((topic) => (
                  <optgroup key={topic.id} label={topic.name}>
                    <option value={topic.id}>{topic.name}</option>
                    {(childrenByParent.get(topic.id) ?? []).map((child) => <option key={child.id} value={child.id}>- {child.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-xs font-medium text-foreground">
              {t('Soru', 'Question')}
              <textarea value={draft.question} onChange={(event) => setDraft((value) => ({ ...value, question: event.target.value }))} className="mt-2 min-h-24 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
            </label>
            <RichAnswerEditor
              className="mt-4"
              value={draft.answer}
              onChange={(answer) => setDraft((value) => ({ ...value, answer }))}
              required
              minHeightClassName="min-h-[240px]"
            />
            <FlashcardWhyEditorField
              className="mt-4"
              value={draft.why}
              onChange={(why) => setDraft((value) => ({ ...value, why }))}
            />
            <FlashcardInsightEditorFields
              className="mt-4"
              value={draft.insights}
              onChange={(insights) => setDraft((value) => ({ ...value, insights }))}
            />
            <label className="mt-4 block text-xs font-medium text-foreground">
              {t('Zorluk', 'Difficulty')}
              <select value={draft.difficulty} onChange={(event) => setDraft((value) => ({ ...value, difficulty: event.target.value as ApiDifficulty }))} className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
                <option value="Easy">{difficultyLabel('Easy')}</option>
                <option value="Medium">{difficultyLabel('Medium')}</option>
                <option value="Hard">{difficultyLabel('Hard')}</option>
              </select>
            </label>
            <label className="mt-4 block text-xs font-medium text-foreground">
              {t('Etiketler', 'Tags')}
              <input value={draft.tags.join(', ')} onChange={(event) => setDraft((value) => ({ ...value, tags: splitTags(event.target.value) }))} className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" placeholder={t('virgülle ayır: async, C#, concurrency', 'comma-separated: async, C#, concurrency')} />
            </label>
            {saveMutation.isError ? <p className="mt-3 text-xs text-rose-500">{t('Soru kaydedilemedi.', 'Question could not be saved.')}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <ActionButton onClick={() => setEditorOpen(false)}>{t('İptal', 'Cancel')}</ActionButton>
              <ActionButton variant="primary" disabled={!draft.question.trim() || !draft.answer.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? t('Kaydediliyor...', 'Saving...') : t('Kaydet', 'Save')}
              </ActionButton>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  )
}

export { FlashcardsPage }
