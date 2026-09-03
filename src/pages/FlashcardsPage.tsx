import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
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
  Shuffle,
  Play,
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
import { SmartQuestionPaste } from '../components/features/SmartQuestionPaste'
import { Select } from '../components/ui/Select'
import { cn } from '../components/features/featureClassNames'
import { useDebouncedValue } from '../hooks/use-debounced-value'
import { useI18n } from '../i18n'
import { api } from '../services/api'
import { queryKeys } from '../services/queryKeys'
import {
  appendCodeBlocksToAnswer,
  sameLooseName,
  type ParsedFlashcardImport,
} from '../utils/flashcardImport'
import type { ApiDifficulty, ApiInterviewFrequency, FlashcardDto, TopicDto, UpsertFlashcardInput } from '../types/api'

type ReviewRating = 'Again' | 'Hard' | 'Good' | 'Easy'
type Mode = 'simulate' | 'browse'
type ConfidenceFilter = 'all' | 'low' | 'high' | 'unset'

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

function compareTopics(locale: string) {
  return (a: TopicDto, b: TopicDto) =>
    a.sortOrder - b.sortOrder
    || a.name.localeCompare(b.name, locale)
}

function difficultyTone(difficulty: ApiDifficulty) {
  return difficulty === 'Hard' ? 'danger' as const : difficulty === 'Medium' ? 'warning' as const : 'success' as const
}

function splitTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function shuffledIds(items: FlashcardDto[]) {
  const ids = items.map((item) => item.id)
  for (let index = ids.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]]
  }
  return ids
}

function metricColor(value: number) {
  if (value >= 70) return '#22c55e'
  if (value >= 40) return '#f59e0b'
  return '#ef4444'
}

function MetricCircle({ value, label, progress, compact = false, color, radial = true }: { value: string | number; label: string; progress: number; compact?: boolean; color?: string; radial?: boolean }) {
  const ringColor = color ?? metricColor(progress)
  const sizeClass = compact ? 'size-14' : 'size-20'
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className={cn('grid shrink-0 place-items-center rounded-full p-[5px] shadow-[0_8px_24px_rgba(15,23,42,0.12)]', sizeClass)}
        style={{
          background: radial
            ? `conic-gradient(${ringColor} ${Math.max(3, Math.min(100, progress)) * 3.6}deg, color-mix(in srgb, ${ringColor} 14%, transparent) 0deg)`
            : `color-mix(in srgb, ${ringColor} 22%, transparent)`,
          border: radial ? undefined : `2px solid ${ringColor}`,
        }}
      >
        <div className="grid size-full place-items-center rounded-full bg-card ring-1 ring-inset ring-border/60">
          <span className={cn('font-bold tracking-[-0.04em] text-foreground', compact ? 'text-sm' : 'text-lg')}>{value}</span>
        </div>
      </div>
      <span className={cn('font-semibold text-muted-foreground', compact ? 'mt-1 text-[9px]' : 'mt-2 text-[10px]')}>{label}</span>
    </div>
  )
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
  const debouncedQuery = useDebouncedValue(query.trim(), 250)
  const [selectedRootId, setSelectedRootId] = useState('')
  const [selectedSubtopicId, setSelectedSubtopicId] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const initialTag = searchParams.get('tag')?.trim()
    return initialTag ? [initialTag] : []
  })
  const [tagFilterInput, setTagFilterInput] = useState('')
  const [difficulty, setDifficulty] = useState<ApiDifficulty | 'all'>('all')
  const [interviewFrequency, setInterviewFrequency] = useState<ApiInterviewFrequency | 'all'>('all')
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('all')
  const [practiceStarted, setPracticeStarted] = useState(false)
  const [randomOrderIds, setRandomOrderIds] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [selfAnswer, setSelfAnswer] = useState('')
  const [personalNote, setPersonalNote] = useState('')
  const loadedNoteCardId = useRef<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<CardDraft>(emptyDraft)
  const [draftTagInput, setDraftTagInput] = useState('')
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
  const categorizedCards = useMemo(
    () => cards.filter((card) => card.topicId && topicById.has(card.topicId)),
    [cards, topicById],
  )
  const overallMetrics = useMemo(() => {
    const studied = categorizedCards.filter((item) => item.reviewCount > 0 || item.confidence > 0).length
    const ratedCards = categorizedCards.filter((item) => item.confidence > 0)
    return {
      total: categorizedCards.length,
      studied,
      studiedPercent: categorizedCards.length ? Math.round(studied / categorizedCards.length * 100) : 0,
      confidence: ratedCards.length
        ? Math.round(ratedCards.reduce((total, item) => total + item.confidence, 0) / (ratedCards.length * 4) * 100)
        : 0,
      ratedPercent: categorizedCards.length ? Math.round(ratedCards.length / categorizedCards.length * 100) : 0,
    }
  }, [categorizedCards])

  const rootTopics = useMemo(
    () => topics.filter((topic) => !topic.parentTopicId).sort(compareTopics(locale)),
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
    for (const children of map.values()) children.sort(compareTopics(locale))
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
    const tag = searchParams.get('tag')?.trim()
    setSelectedTags(tag ? [tag] : [])
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

  const matchingCards = useMemo(() => {
    const normalized = debouncedQuery.toLocaleLowerCase(locale)
    return categorizedCards
      .filter((card) => {
        if (linkedCardId && card.id !== linkedCardId) return false
        if (topicScopeIds.size > 0 && (!card.topicId || !topicScopeIds.has(card.topicId))) return false
        if (selectedTags.length > 0 && !selectedTags.every((selectedTag) =>
          card.tags.some((tag) => tag.toLocaleLowerCase(locale) === selectedTag.toLocaleLowerCase(locale)),
        )) return false
        if (difficulty !== 'all' && card.difficulty !== difficulty) return false
        if (interviewFrequency !== 'all' && card.interviewFrequency !== interviewFrequency) return false
        if (confidenceFilter === 'low' && (card.confidence < 1 || card.confidence > 2)) return false
        if (confidenceFilter === 'high' && card.confidence < 3) return false
        if (confidenceFilter === 'unset' && card.confidence !== 0) return false
        if (!normalized) return true
        return [
          card.question,
          card.answer,
          card.personalNote ?? '',
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
        new Date(a.createdAtUtc).getTime() - new Date(b.createdAtUtc).getTime()
        || a.question.localeCompare(b.question, locale),
      )
  }, [categorizedCards, confidenceFilter, debouncedQuery, difficulty, interviewFrequency, linkedCardId, locale, selectedTags, topicScopeIds])

  const filteredCards = useMemo(() => {
    if (!randomOrderIds.length) return matchingCards
    const order = new Map(randomOrderIds.map((id, position) => [id, position]))
    return [...matchingCards].sort((a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER))
  }, [matchingCards, randomOrderIds])

  const card = filteredCards.length ? filteredCards[index % filteredCards.length] : undefined

  useEffect(() => {
    setIndex(0)
    setFlipped(false)
    setSelfAnswer('')
  }, [confidenceFilter, debouncedQuery, difficulty, effectiveTopicId, interviewFrequency, selectedTags])

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

  const noteMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.flashcards.updateNote<FlashcardDto>(id, { personalNote: note }),
    onSuccess: (updated) => {
      queryClient.setQueryData<FlashcardDto[]>(queryKeys.flashcards.all, (current) =>
        current?.map((item) => (item.id === updated.id ? updated : item)),
      )
    },
  })
  const saveNote = noteMutation.mutate

  const confidenceMutation = useMutation({
    mutationFn: ({ id, confidence }: { id: string; confidence: number }) =>
      api.flashcards.updateConfidence<FlashcardDto>(id, { confidence }),
    onSuccess: (updated) => {
      queryClient.setQueryData<FlashcardDto[]>(queryKeys.flashcards.all, (current) =>
        current?.map((item) => (item.id === updated.id ? updated : item)),
      )
    },
  })

  useEffect(() => {
    if (!card || loadedNoteCardId.current === card.id) return
    loadedNoteCardId.current = card.id
    setPersonalNote(card.personalNote ?? '')
  }, [card])

  useEffect(() => {
    if (!card || personalNote.trim() === (card.personalNote ?? '')) return
    const cardId = card.id
    const timeout = window.setTimeout(() => {
      saveNote({ id: cardId, note: personalNote })
    }, 700)
    return () => window.clearTimeout(timeout)
  }, [card, personalNote, saveNote])

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
    { rating: 'Again' as const, label: t('Tekrar', 'Again'), icon: X, style: 'border-rose-500/25 bg-rose-500/5 text-rose-600 dark:text-rose-400' },
    { rating: 'Hard' as const, label: t('Zor', 'Hard'), icon: RotateCcw, style: 'border-amber-500/25 bg-amber-500/5 text-amber-600 dark:text-amber-400' },
    { rating: 'Good' as const, label: t('İyi', 'Good'), icon: Check, style: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' },
    { rating: 'Easy' as const, label: t('Kolay', 'Easy'), icon: Zap, style: 'border-sky-500/25 bg-sky-500/5 text-sky-600 dark:text-sky-400' },
  ]

  const rateCard = useCallback((rating: ReviewRating) => {
    if (!card || !flipped || reviewMutation.isPending) return
    reviewMutation.mutate({ id: card.id, rating })
  }, [card, flipped, reviewMutation])

  const rateConfidence = useCallback((confidence: number) => {
    if (!card || confidenceMutation.isPending) return
    confidenceMutation.mutate({ id: card.id, confidence })
  }, [card, confidenceMutation])

  const showPreviousCard = useCallback(() => {
    if (!filteredCards.length) return
    setIndex((value) => (value === 0 ? filteredCards.length - 1 : value - 1))
    setFlipped(false)
    setSelfAnswer('')
  }, [filteredCards.length])

  const showNextCard = useCallback(() => {
    if (!filteredCards.length) return
    setIndex((value) => (value + 1) % filteredCards.length)
    setFlipped(false)
    setSelfAnswer('')
  }, [filteredCards.length])

  useEffect(() => {
    if (mode !== 'simulate') return
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isEditing = target?.isContentEditable
        || target?.tagName === 'INPUT'
        || target?.tagName === 'TEXTAREA'
        || target?.tagName === 'SELECT'
      if (editorOpen || isEditing) return
      if (['1', '2', '3', '4'].includes(event.key)) {
        event.preventDefault()
        if (event.repeat) return
        rateConfidence(Number(event.key))
      } else if (event.key === 'Enter' || event.code === 'Space') {
        event.preventDefault()
        if (event.repeat) return
        setFlipped((value) => !value)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        showPreviousCard()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        showNextCard()
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [editorOpen, mode, rateConfidence, showNextCard, showPreviousCard])

  const openCreate = () => {
    setEditingId(null)
    setDraft({
      ...emptyDraft,
      topicId: effectiveTopicId || null,
      tags: selectedTags,
    })
    setDraftTagInput('')
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
    setDraftTagInput('')
    setEditorOpen(true)
  }

  const applyImportedQuestion = (parsed: ParsedFlashcardImport) => {
    const applied: string[] = []
    const ignored: string[] = []
    const next: CardDraft = { ...draft, insights: { ...draft.insights }, tags: [...draft.tags] }

    if (parsed.topic) {
      const root = rootTopics.find((topic) => sameLooseName(topic.name, parsed.topic!))
      if (root) {
        next.topicId = root.id
        applied.push('Konu')
      } else {
        ignored.push(`Ana konu bulunamadı: ${parsed.topic}`)
      }
    }

    if (parsed.subtopic) {
      const rootId = next.topicId
      const subtopic = rootId
        ? (childrenByParent.get(rootId) ?? []).find((topic) => sameLooseName(topic.name, parsed.subtopic!))
        : topics.find((topic) => topic.parentTopicId && sameLooseName(topic.name, parsed.subtopic!))

      if (subtopic) {
        next.topicId = subtopic.id
        applied.push('Alt konu')
      } else {
        ignored.push(`Alt konu bulunamadı: ${parsed.subtopic}`)
      }
    }

    if (parsed.question) {
      next.question = parsed.question
      applied.push('Soru')
    }

    if (parsed.answer || parsed.codeBlocks.length) {
      next.answer = appendCodeBlocksToAnswer(parsed.answer ?? next.answer, parsed.codeBlocks)
      applied.push(parsed.codeBlocks.length ? 'Cevap + Kod' : 'Cevap')
    }

    if (parsed.why) {
      next.why = parsed.why
      applied.push('Why')
    }

    if (parsed.productionExample) {
      next.insights.productionExample = parsed.productionExample
      applied.push('Production Example')
    }

    if (parsed.bankingExample) {
      next.insights.bankingExample = parsed.bankingExample
      applied.push('Banking Example')
    }

    if (parsed.interviewTip) {
      next.insights.interviewTip = parsed.interviewTip
      applied.push('Interview Tip')
    }

    if (parsed.interviewFrequency) {
      next.insights.interviewFrequency = parsed.interviewFrequency
      applied.push('Sorulma olasılığı')
    }

    if (parsed.difficulty) {
      next.difficulty = parsed.difficulty
      applied.push('Zorluk')
    }

    if (parsed.tags.length || parsed.questionType) {
      const tags = [...parsed.tags]
      if (parsed.questionType && !tags.some((tag) => sameLooseName(tag, parsed.questionType!))) {
        tags.push(parsed.questionType.toLocaleLowerCase('tr-TR'))
      }
      next.tags = tags
      applied.push(parsed.questionType ? 'Etiketler + Soru tipi' : 'Etiketler')
    }

    if (parsed.relatedQuestions) {
      ignored.push('İlgili sorular için ayrı alan yok')
    }

    setDraft(next)
    return { applied, ignored }
  }

  const clearFilters = () => {
    setSelectedRootId('')
    setSelectedSubtopicId('')
    setSelectedTags([])
    setTagFilterInput('')
    setDifficulty('all')
    setInterviewFrequency('all')
    setConfidenceFilter('all')
    setQuery('')
    setSearchParams({})
  }

  const cardsForTopic = (topic: TopicDto) => {
    const topicIds = topic.parentTopicId
      ? new Set([topic.id])
      : new Set([topic.id, ...(childrenByParent.get(topic.id) ?? []).map((child) => child.id)])
    return categorizedCards.filter((item) => item.topicId && topicIds.has(item.topicId))
  }

  const topicMetrics = (topic: TopicDto) => {
    const topicCards = cardsForTopic(topic)
    const studied = topicCards.filter((item) => item.reviewCount > 0 || item.confidence > 0).length
    const ratedCards = topicCards.filter((item) => item.confidence > 0)
    const confidence = ratedCards.length
      ? Math.round(ratedCards.reduce((total, item) => total + item.confidence, 0) / (ratedCards.length * 4) * 100)
      : 0
    return {
      total: topicCards.length,
      studied,
      studiedPercent: topicCards.length ? Math.round(studied / topicCards.length * 100) : 0,
      confidence,
    }
  }

  const startTopicPractice = (topic: TopicDto, random: boolean) => {
    const topicCards = cardsForTopic(topic)
    setSelectedRootId(topic.parentTopicId ?? topic.id)
    setSelectedSubtopicId(topic.parentTopicId ? topic.id : '')
    setSelectedTags([])
    setTagFilterInput('')
    setDifficulty('all')
    setInterviewFrequency('all')
    setConfidenceFilter('all')
    setQuery('')
    setRandomOrderIds(random ? shuffledIds(topicCards) : [])
    setIndex(0)
    setFlipped(false)
    setSelfAnswer('')
    setPracticeStarted(true)
    setSearchParams({ topicId: topic.id })
  }

  const addTagFilters = (tags: string[]) => {
    const normalizedTags = tags.map((tag) => tag.trim()).filter(Boolean)
    if (!normalizedTags.length) return
    setSelectedTags((current) => {
      const next = [...current]
      for (const tag of normalizedTags) {
        if (!next.some((item) => item.toLocaleLowerCase(locale) === tag.toLocaleLowerCase(locale))) next.push(tag)
      }
      return next
    })
  }

  const commitTagFilterInput = () => {
    addTagFilters(tagFilterInput.split(','))
    setTagFilterInput('')
  }

  const addDraftTags = (tags: string[]) => {
    setDraft((current) => {
      const nextTags = [...current.tags]
      for (const tag of tags.map((item) => item.trim()).filter(Boolean)) {
        if (!nextTags.some((item) => item.toLocaleLowerCase(locale) === tag.toLocaleLowerCase(locale))) nextTags.push(tag)
      }
      return { ...current, tags: nextTags }
    })
  }

  const commitDraftTagInput = () => {
    addDraftTags(splitTags(draftTagInput))
    setDraftTagInput('')
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
            {mode === 'simulate' && practiceStarted ? (
              <ActionButton onClick={() => { setPracticeStarted(false); setRandomOrderIds([]); clearFilters() }}>
                {t('Konulara dön', 'Back to topics')}
              </ActionButton>
            ) : null}
            <Link to="/easy-mode" target="_blank" className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground transition hover:bg-muted">
              {t('Kısa Notlar', 'Short Notes')}
            </Link>
            <ActionButton icon={Plus} variant="primary" onClick={openCreate}>{t('Soru ekle', 'Add question')}</ActionButton>
          </>
        )}
      />

      {mode === 'browse' || practiceStarted ? <Panel className="p-4">
        <div className="grid gap-3 [&>*]:min-w-0 lg:grid-cols-3 xl:grid-cols-7">
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
          <Select
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
          </Select>
          <Select
            value={selectedSubtopicId}
            onChange={(event) => setSelectedSubtopicId(event.target.value)}
            disabled={!selectedRootId || availableSubtopics.length === 0}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-55"
            aria-label={t('Alt konu filtresi', 'Subtopic filter')}
          >
            <option value="">{t('Tüm alt konular', 'All subtopics')}</option>
            {availableSubtopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
          </Select>
          <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-border bg-background px-2 py-1 focus-within:ring-2 focus-within:ring-ring/30">
            {selectedTags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                {tag}
                <button type="button" onClick={() => setSelectedTags((current) => current.filter((item) => item !== tag))} aria-label={t(`${tag} etiketini kaldır`, `Remove ${tag} tag`)}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <input
              value={tagFilterInput}
              onChange={(event) => {
                const value = event.target.value
                const parts = value.split(',')
                if (parts.length === 1) {
                  setTagFilterInput(value)
                  return
                }
                addTagFilters(parts.slice(0, -1))
                setTagFilterInput(parts.at(-1)?.trimStart() ?? '')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  commitTagFilterInput()
                } else if (event.key === 'Backspace' && !tagFilterInput && selectedTags.length) {
                  setSelectedTags((current) => current.slice(0, -1))
                }
              }}
              onBlur={commitTagFilterInput}
              className="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none"
              placeholder={selectedTags.length ? t('etiket ekle…', 'add tag…') : t('Etiketleri virgülle yaz…', 'Type tags separated by commas…')}
              aria-label={t('Etiket filtresi', 'Tag filter')}
            />
          </div>
          <Select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as ApiDifficulty | 'all')}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            aria-label={t('Zorluk filtresi', 'Difficulty filter')}
          >
            <option value="all">{t('Tüm zorluklar', 'All levels')}</option>
            <option value="Easy">{difficultyLabel('Easy')}</option>
            <option value="Medium">{difficultyLabel('Medium')}</option>
            <option value="Hard">{difficultyLabel('Hard')}</option>
          </Select>
          <Select
            value={confidenceFilter}
            onChange={(event) => setConfidenceFilter(event.target.value as ConfidenceFilter)}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            aria-label={t('Güven filtresi', 'Confidence filter')}
          >
            <option value="all">{t('Tüm güven seviyeleri', 'All confidence levels')}</option>
            <option value="low">{t('Güvenmediklerim', 'Low confidence')}</option>
            <option value="high">{t('Güvendiklerim', 'High confidence')}</option>
            <option value="unset">{t('Değerlendirilmemiş', 'Not rated')}</option>
          </Select>
          <Select
            value={interviewFrequency}
            onChange={(event) => setInterviewFrequency(event.target.value as ApiInterviewFrequency | 'all')}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            aria-label={t('Sorulma olasılığı filtresi', 'Interview frequency filter')}
          >
            <option value="all">{t('Tüm sorulma olasılıkları', 'All interview frequencies')}</option>
            {(['VeryHigh', 'High', 'Medium', 'Low'] as const).map((value) => (
              <option key={value} value={value}>{interviewFrequencyLabel(value, t)}</option>
            ))}
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{filteredCards.length} {t('soru gösteriliyor', 'questions shown')}</span>
          {effectiveTopic ? <StatusPill tone="purple">{effectiveTopic.parentTopicName ? `${effectiveTopic.parentTopicName} / ${effectiveTopic.name}` : effectiveTopic.name}</StatusPill> : null}
          {(effectiveTopicId || selectedTags.length > 0 || difficulty !== 'all' || interviewFrequency !== 'all' || confidenceFilter !== 'all' || query || linkedCardId) ? (
            <button type="button" onClick={clearFilters} className="ml-auto font-semibold text-foreground hover:text-primary">
              {t('Filtreleri temizle', 'Clear filters')}
            </button>
          ) : null}
        </div>
      </Panel> : null}

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
      ) : mode === 'simulate' && !practiceStarted ? (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t('Çalışmak istediğin konuyu seç', 'Choose a topic to practice')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('Alt konuya tıklayarak sırayla çalış veya rasgele pratik başlat.', 'Choose a subtopic for ordered practice or start a random session.')}</p>
          </div>
          <Panel className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card to-emerald-500/[0.05] p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{t('Tüm konular', 'All topics')}</p>
                <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-foreground">{t('Genel durum', 'Overall progress')}</h3>
                <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
                  {t(`${overallMetrics.studied} / ${overallMetrics.total} soru üzerinde çalıştın.`, `You have studied ${overallMetrics.studied} of ${overallMetrics.total} questions.`)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-7 gap-y-4 sm:grid-cols-4 sm:gap-x-9">
                <MetricCircle value={overallMetrics.total} label={t('Toplam soru', 'Questions')} progress={100} color="#8b5cf6" radial={false} />
                <MetricCircle value={`%${overallMetrics.studiedPercent}`} label={t('Çalışıldı', 'Studied')} progress={overallMetrics.studiedPercent} />
                <MetricCircle value={`%${overallMetrics.confidence}`} label={t('Ort. güven', 'Avg. confidence')} progress={overallMetrics.confidence} />
                <MetricCircle value={`%${overallMetrics.ratedPercent}`} label={t('Değerlendirildi', 'Rated')} progress={overallMetrics.ratedPercent} />
              </div>
            </div>
          </Panel>
          <div className="grid gap-5 lg:grid-cols-2">
            {rootTopics.map((rootTopic) => {
              const rootMetrics = topicMetrics(rootTopic)
              const subtopics = childrenByParent.get(rootTopic.id) ?? []
              return (
                <Panel key={rootTopic.id} className="overflow-hidden">
                  <div className="border-b border-border/70 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <button type="button" onClick={() => startTopicPractice(rootTopic, false)} className="min-w-0 text-left">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{t('Ana konu', 'Main topic')}</p>
                        <h3 className="mt-1 truncate text-base font-semibold text-foreground hover:text-primary">{rootTopic.name}</h3>
                      </button>
                      <button
                        type="button"
                        onClick={() => startTopicPractice(rootTopic, true)}
                        disabled={rootMetrics.total === 0}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
                      >
                        <Shuffle className="size-3.5" />
                        {t('Genel tekrar', 'Mixed review')}
                      </button>
                    </div>
                    <div className="mt-5 flex items-start justify-around rounded-2xl bg-muted/30 px-3 py-4">
                      <MetricCircle value={rootMetrics.total} label={t('Soru', 'Questions')} progress={100} color="#8b5cf6" radial={false} />
                      <MetricCircle value={`%${rootMetrics.studiedPercent}`} label={t('Çalışıldı', 'Studied')} progress={rootMetrics.studiedPercent} />
                      <MetricCircle value={`%${rootMetrics.confidence}`} label={t('Güven', 'Confidence')} progress={rootMetrics.confidence} />
                    </div>
                    <p className="mt-2 text-center text-[10px] font-medium text-muted-foreground">{rootMetrics.studied}/{rootMetrics.total} {t('soru çalışıldı', 'questions studied')}</p>
                  </div>
                  <div className="space-y-2 p-3">
                    {subtopics.length ? subtopics.map((subtopic) => {
                      const metrics = topicMetrics(subtopic)
                      return (
                        <div key={subtopic.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-background/50 p-3 sm:flex-nowrap">
                          <button type="button" onClick={() => startTopicPractice(subtopic, false)} disabled={metrics.total === 0} className="min-w-0 basis-full rounded-lg px-2 py-1.5 text-left transition hover:bg-muted disabled:opacity-45 sm:flex-1 sm:basis-auto">
                            <p className="truncate text-xs font-semibold text-foreground">{subtopic.name}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground">{metrics.studied}/{metrics.total} {t('soru çalışıldı', 'questions studied')}</p>
                          </button>
                          <MetricCircle value={metrics.total} label={t('Soru', 'Questions')} progress={100} compact color="#8b5cf6" radial={false} />
                          <MetricCircle value={`%${metrics.studiedPercent}`} label={t('Çalışma', 'Studied')} progress={metrics.studiedPercent} compact />
                          <MetricCircle value={`%${metrics.confidence}`} label={t('Güven', 'Confidence')} progress={metrics.confidence} compact />
                          <button type="button" onClick={() => startTopicPractice(subtopic, false)} disabled={metrics.total === 0} className="grid size-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground hover:text-primary disabled:opacity-40" aria-label={t(`${subtopic.name} pratiğine başla`, `Start ${subtopic.name} practice`)}><Play className="size-3.5" /></button>
                          <button type="button" onClick={() => startTopicPractice(subtopic, true)} disabled={metrics.total === 0} className="grid size-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground hover:text-primary disabled:opacity-40" aria-label={t(`${subtopic.name} için rasgele sor`, `Randomize ${subtopic.name}`)} title={t('Rasgele sor', 'Randomize')}><Shuffle className="size-3.5" /></button>
                        </div>
                      )
                    }) : (
                      <button type="button" onClick={() => startTopicPractice(rootTopic, false)} disabled={rootMetrics.total === 0} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-4 text-xs font-semibold text-muted-foreground hover:text-primary disabled:opacity-40"><Play className="size-3.5" />{t('Bu konudaki sorularla başla', 'Practice this topic')}</button>
                    )}
                  </div>
                </Panel>
              )
            })}
          </div>
        </div>
      ) : mode === 'simulate' ? (
        card ? (
          <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
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
                <ActionButton icon={Pencil} className="mt-4 w-full" onClick={() => openEdit(card)}>
                  {t('Soruyu düzenle', 'Edit question')}
                </ActionButton>
              </Panel>
              <Panel className="p-4">
                <p className="text-xs font-semibold text-foreground">{t('Bu soruya ne kadar güveniyorum?', 'How confident am I with this question?')}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    { value: 1, tr: 'Güvenmiyorum', en: 'Not confident' },
                    { value: 2, tr: 'Az', en: 'A little' },
                    { value: 3, tr: 'İyi', en: 'Confident' },
                    { value: 4, tr: 'Çok', en: 'Very confident' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => rateConfidence(option.value)}
                      disabled={confidenceMutation.isPending}
                      className={cn(
                        'rounded-xl border px-2 py-2.5 text-left text-[11px] font-semibold transition disabled:cursor-wait disabled:opacity-60',
                        card.confidence === option.value
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background/70 text-muted-foreground hover:border-primary/40 hover:text-foreground',
                      )}
                    >
                      <span className="mr-1.5 opacity-70">{option.value}</span>
                      {t(option.tr, option.en)}
                    </button>
                  ))}
                </div>
                {confidenceMutation.isError ? <p className="mt-2 text-xs text-rose-500">{t('Güven seviyesi kaydedilemedi.', 'Confidence level could not be saved.')}</p> : null}
              </Panel>
              {flipped ? <Panel className="p-4">
                <label htmlFor="flashcard-personal-note" className="text-xs font-semibold text-foreground">
                  {t('Kısa notum', 'My short note')}
                </label>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                  {t('Cevabı 1–2 cümleyle kendi sözlerinle özetle.', 'Summarize the answer in 1–2 sentences in your own words.')}
                </p>
                <textarea
                  id="flashcard-personal-note"
                  value={personalNote}
                  maxLength={1000}
                  onChange={(event) => setPersonalNote(event.target.value)}
                  onBlur={() => {
                    if (personalNote.trim() !== (card.personalNote ?? '')) saveNote({ id: card.id, note: personalNote })
                  }}
                  placeholder={t('Kısa özetini yaz…', 'Write your short summary…')}
                  className="mt-3 min-h-32 w-full resize-y rounded-xl border border-border bg-background/70 p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring/30"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className={cn('text-[10px]', noteMutation.isError ? 'text-rose-500' : 'text-muted-foreground')}>
                    {noteMutation.isPending
                      ? t('Otomatik kaydediliyor…', 'Auto-saving…')
                      : noteMutation.isError
                        ? t('Kaydedilemedi', 'Could not save')
                        : personalNote.trim() === (card.personalNote ?? '')
                          ? t('Kaydedildi', 'Saved')
                          : t('Yazmayı bırakınca kaydedilecek', 'Will save when you stop typing')}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{personalNote.length}/1000</span>
                </div>
              </Panel> : null}
            </div>

            <section className="min-h-[620px]">
              <div className="mb-3 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
                <button type="button" onClick={showPreviousCard} className="inline-flex items-center gap-1.5 hover:text-foreground"><ArrowLeft className="size-3.5" />{t('Önceki', 'Previous')}</button>
                <span>{t(`Soru ${Math.min(index + 1, filteredCards.length)} / ${filteredCards.length}`, `Question ${Math.min(index + 1, filteredCards.length)} of ${filteredCards.length}`)}</span>
                <button type="button" onClick={showNextCard} className="inline-flex items-center gap-1.5 hover:text-foreground">{t('Sonraki', 'Next')}<ArrowRight className="size-3.5" /></button>
              </div>

              <div className="min-h-[430px] [perspective:1400px]">
                <motion.div
                  key={`${card.id}-${flipped ? 'answer' : 'question'}`}
                  initial={{ opacity: 0, rotateY: flipped ? -10 : 10, scale: 0.985 }}
                  animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                  transition={{ duration: 0.24 }}
                  style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
                  className="flex min-h-[430px] flex-col overflow-hidden rounded-[28px] border border-border bg-card p-7 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-10"
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
              </div>

              {reviewMutation.isError ? <p className="mt-3 text-center text-xs text-rose-500">{t('Tekrar kaydedilemedi. Yeniden dene.', 'Review could not be saved. Try again.')}</p> : null}
              <div className={cn('mt-4 grid grid-cols-2 gap-2 transition sm:grid-cols-4', !flipped && 'pointer-events-none translate-y-1 opacity-35')}>
                {ratings.map(({ rating, label, icon: Icon, style }) => (
                  <button key={rating} type="button" onClick={() => rateCard(rating)} disabled={!flipped || reviewMutation.isPending} className={cn('rounded-2xl border px-3 py-3 text-left transition disabled:cursor-not-allowed', style)}>
                    <Icon className="size-4" />
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
                {item.tags.map((tag) => <button key={tag} type="button" onClick={() => addTagFilters([tag])} className="rounded-lg border border-border/70 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">{tag}</button>)}
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
            <SmartQuestionPaste className="mt-5" onApply={applyImportedQuestion} />
            <label className="mt-5 block text-xs font-medium text-foreground">
              {t('Konu / alt konu', 'Topic / subtopic')}
              <Select value={draft.topicId ?? ''} onChange={(event) => setDraft((value) => ({ ...value, topicId: event.target.value || null }))} className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
                <option value="">{t('Genel / Atanmamış', 'General / Unassigned')}</option>
                {rootTopics.map((topic) => (
                  <optgroup key={topic.id} label={topic.name}>
                    <option value={topic.id}>{topic.name}</option>
                    {(childrenByParent.get(topic.id) ?? []).map((child) => <option key={child.id} value={child.id}>- {child.name}</option>)}
                  </optgroup>
                ))}
              </Select>
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
              <Select value={draft.difficulty} onChange={(event) => setDraft((value) => ({ ...value, difficulty: event.target.value as ApiDifficulty }))} className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
                <option value="Easy">{difficultyLabel('Easy')}</option>
                <option value="Medium">{difficultyLabel('Medium')}</option>
                <option value="Hard">{difficultyLabel('Hard')}</option>
              </Select>
            </label>
            <div className="mt-4 text-xs font-medium text-foreground">
              <span>{t('Etiketler', 'Tags')}</span>
              <div className="mt-2 flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-border bg-background px-2 py-1 focus-within:ring-2 focus-within:ring-ring/30">
                {draft.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                    {tag}
                    <button type="button" onClick={() => setDraft((current) => ({ ...current, tags: current.tags.filter((item) => item !== tag) }))} aria-label={t(`${tag} etiketini kaldır`, `Remove ${tag} tag`)}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={draftTagInput}
                  onChange={(event) => {
                    const parts = event.target.value.split(',')
                    if (parts.length === 1) {
                      setDraftTagInput(event.target.value)
                      return
                    }
                    addDraftTags(parts.slice(0, -1))
                    setDraftTagInput(parts.at(-1)?.trimStart() ?? '')
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      commitDraftTagInput()
                    } else if (event.key === 'Backspace' && !draftTagInput && draft.tags.length) {
                      setDraft((current) => ({ ...current, tags: current.tags.slice(0, -1) }))
                    }
                  }}
                  onBlur={commitDraftTagInput}
                  className="min-w-32 flex-1 bg-transparent px-1 py-1 text-sm font-normal outline-none"
                  placeholder={draft.tags.length ? t('etiket ekle…', 'add tag…') : t('Virgülle etiket ekle…', 'Add tags separated by commas…')}
                />
              </div>
            </div>
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
