import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  BookOpenCheck,
  ChevronDown,
  ChevronRight,
  Check,
  CircleHelp,
  Copy,
  FolderTree,
  Layers3,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import {
  ActionButton,
  EmptyState,
  IconButton,
  PageHeader,
  Panel,
  StatusPill,
} from '../components/features/FeaturePrimitives'
import {
  FlashcardInsightEditorFields,
  FlashcardInsightFields,
} from '../components/features/FlashcardInsightFields'
import { SmartQuestionPaste } from '../components/features/SmartQuestionPaste'
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
import { useDebouncedValue } from '../hooks/use-debounced-value'
import { useI18n } from '../i18n'
import { api } from '../services/api'
import { queryKeys } from '../services/queryKeys'
import {
  appendCodeBlocksToAnswer,
  sameLooseName,
  type ParsedFlashcardImport,
} from '../utils/flashcardImport'
import type {
  ApiDifficulty,
  ApiPriority,
  CreateTopicInput,
  FlashcardDto,
  ReorderTopicsInput,
  TopicDto,
  UpdateTopicInput,
  UpsertFlashcardInput,
} from '../types/api'

type QuestionDraft = {
  question: string
  answer: string
  why: string
  insights: FlashcardInsightDraft
  difficulty: ApiDifficulty
  topicId: string
  newSubtopic: string
  tags: string
}

type QuestionSection = {
  id: string
  title: string
  topic: TopicDto
  cards: FlashcardDto[]
  isSelected: boolean
}

const EMPTY_TOPICS: TopicDto[] = []
const EMPTY_CARDS: FlashcardDto[] = []

function compareTopics(locale: string) {
  return (a: TopicDto, b: TopicDto) =>
    a.sortOrder - b.sortOrder
    || a.name.localeCompare(b.name, locale)
}

function normalizeSearchText(value: string, locale: string) {
  return value
    .toLocaleLowerCase(locale)
    .replace(/[-_/.,;:()[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreTextMatch(value: string | null | undefined, term: string, locale: string) {
  if (!value || !term) return 0
  const normalized = normalizeSearchText(value, locale)
  if (normalized === term) return 100
  if (normalized.startsWith(term)) return 90
  if (normalized.includes(term)) return 75

  const tokens = term.split(' ').filter(Boolean)
  return tokens.length > 1 && tokens.every((token) => normalized.includes(token)) ? 35 : 0
}

function scoreTopicSearch(topic: TopicDto, term: string, locale: string) {
  if (!term) return 0
  return scoreTextMatch(topic.name, term, locale) * 5
    + scoreTextMatch(topic.category, term, locale) * 2
    + Math.max(0, ...topic.tags.map((tag) => scoreTextMatch(tag, term, locale))) * 3
}

function scoreCardSearch(card: FlashcardDto, term: string, locale: string) {
  if (!term) return 0
  return scoreTextMatch(card.question, term, locale) * 8
    + Math.max(0, ...card.tags.map((tag) => scoreTextMatch(tag, term, locale))) * 3
    + scoreTextMatch(card.topicName, term, locale) * 2
    + scoreTextMatch(card.answer, term, locale)
    + scoreTextMatch(card.why, term, locale)
    + scoreTextMatch(card.productionExample, term, locale)
    + scoreTextMatch(card.bankingExample, term, locale)
    + scoreTextMatch(card.interviewTip, term, locale)
}

function scoreCardPrimarySearch(card: FlashcardDto, term: string, locale: string) {
  if (!term) return 0
  return scoreTextMatch(card.question, term, locale) * 8
    + Math.max(0, ...card.tags.map((tag) => scoreTextMatch(tag, term, locale))) * 3
}

function scoreCardSecondarySearch(card: FlashcardDto, term: string, locale: string) {
  if (!term) return 0
  return scoreTextMatch(card.topicName, term, locale) * 2
    + scoreTextMatch(card.answer, term, locale)
    + scoreTextMatch(card.why, term, locale)
    + scoreTextMatch(card.productionExample, term, locale)
    + scoreTextMatch(card.bankingExample, term, locale)
    + scoreTextMatch(card.interviewTip, term, locale)
}

function rankCardsBySearch(cards: FlashcardDto[], term: string, locale: string) {
  const scored = cards
    .map((card) => ({
      card,
      primaryScore: scoreCardPrimarySearch(card, term, locale),
      secondaryScore: scoreCardSecondarySearch(card, term, locale),
    }))
    .map((item) => ({ ...item, score: item.primaryScore + item.secondaryScore }))
    .filter((item) => item.score > 0)

  const hasPrimaryMatches = scored.some((item) => item.primaryScore > 0)
  return scored
    .filter((item) => !hasPrimaryMatches || item.primaryScore > 0)
    .sort((a, b) =>
      b.primaryScore - a.primaryScore
      || b.score - a.score
      || new Date(b.card.createdAtUtc).getTime() - new Date(a.card.createdAtUtc).getTime()
      || a.card.question.localeCompare(b.card.question, locale),
    )
    .map((item) => item.card)
}

const emptyDraft: QuestionDraft = {
  question: '',
  answer: '',
  why: '',
  insights: emptyFlashcardInsights,
  difficulty: 'Medium',
  topicId: '',
  newSubtopic: '',
  tags: '',
}

function splitTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function difficultyTone(difficulty: ApiDifficulty) {
  if (difficulty === 'Easy') return 'success' as const
  if (difficulty === 'Hard') return 'danger' as const
  return 'warning' as const
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

function buildTopicQuestionOutline(rootTopic: TopicDto, directCards: FlashcardDto[], sections: QuestionSection[]) {
  const lines = [`# ${rootTopic.name}`]

  if (directCards.length) {
    lines.push('', '## Ana konu soruları')
    for (const card of directCards) lines.push(`- ${card.question}`)
  }

  for (const section of sections) {
    lines.push('', `## ${section.title}`)
    if (section.cards.length) {
      for (const card of section.cards) lines.push(`- ${card.question}`)
    } else {
      lines.push('- Soru yok')
    }
  }

  if (!directCards.length && sections.length === 0) {
    lines.push('', '- Alt konu veya soru yok')
  }

  return lines.join('\n').trimEnd()
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

export default function TopicDetailPage() {
  const { topicId = '' } = useParams<{ topicId: string }>()
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const queryClient = useQueryClient()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<FlashcardDto | null>(null)
  const [draft, setDraft] = useState<QuestionDraft>(emptyDraft)
  const [topicEditorOpen, setTopicEditorOpen] = useState(false)
  const [editingTopic, setEditingTopic] = useState<TopicDto | null>(null)
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(new Set())
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set())
  const [topicSearch, setTopicSearch] = useState('')
  const debouncedTopicSearch = useDebouncedValue(topicSearch, 250)
  const [outlineCopied, setOutlineCopied] = useState(false)
  const [topicDraft, setTopicDraft] = useState<CreateTopicInput>({
    name: '',
    category: '',
    description: '',
    priority: 'High',
    progress: 0,
    confidenceLevel: 25,
    estimatedMastery: 70,
    accentColor: '#7C3AED',
    parentTopicId: null,
    tags: [],
  })
  const [topicTags, setTopicTags] = useState('')

  const topicsQuery = useQuery({
    queryKey: queryKeys.topics.all,
    queryFn: () => api.topics.list<TopicDto[]>(),
  })

  const cardsQuery = useQuery({
    queryKey: queryKeys.flashcards.all,
    queryFn: () => api.flashcards.list<FlashcardDto[]>(),
  })

  const topics = useMemo(() => topicsQuery.data ?? EMPTY_TOPICS, [topicsQuery.data])
  const cards = useMemo(() => cardsQuery.data ?? EMPTY_CARDS, [cardsQuery.data])

  const topicById = useMemo(() => new Map(topics.map((topic) => [topic.id, topic])), [topics])
  const selectedTopic = topicById.get(topicId)
  const rootTopic = selectedTopic?.parentTopicId ? topicById.get(selectedTopic.parentTopicId) : selectedTopic
  const rootTopicId = rootTopic?.id
  const selectedTopicId = selectedTopic?.id
  const rootTopics = useMemo(
    () => topics.filter((topic) => !topic.parentTopicId).sort(compareTopics(locale)),
    [locale, topics],
  )
  const childrenByParent = useMemo(() => {
    const map = new Map<string, TopicDto[]>()
    for (const topic of topics) {
      if (!topic.parentTopicId) continue
      const children = map.get(topic.parentTopicId) ?? []
      children.push(topic)
      map.set(topic.parentTopicId, children)
    }
    for (const children of map.values()) children.sort(compareTopics(locale))
    return map
  }, [locale, topics])

  const subtopics = useMemo(() => {
    if (!rootTopic) return EMPTY_TOPICS
    return childrenByParent.get(rootTopic.id) ?? EMPTY_TOPICS
  }, [childrenByParent, rootTopic])

  const cardsByTopic = useMemo(() => {
    const map = new Map<string, FlashcardDto[]>()
    for (const card of cards) {
      if (!card.topicId) continue
      const items = map.get(card.topicId) ?? []
      items.push(card)
      map.set(card.topicId, items)
    }
    for (const items of map.values()) {
      items.sort((a, b) =>
        new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime()
        || a.question.localeCompare(b.question, locale),
      )
    }
    return map
  }, [cards, locale])

  const directCards = useMemo(
    () => (rootTopic ? cardsByTopic.get(rootTopic.id) ?? EMPTY_CARDS : EMPTY_CARDS),
    [cardsByTopic, rootTopic],
  )

  const sections = useMemo<QuestionSection[]>(() => {
    if (!rootTopic) return []
    const rows: QuestionSection[] = []

    for (const subtopic of subtopics) {
      rows.push({
        id: subtopic.id,
        title: subtopic.name,
        topic: subtopic,
        cards: cardsByTopic.get(subtopic.id) ?? [],
        isSelected: selectedTopic?.id === subtopic.id,
      })
    }

    return rows
  }, [cardsByTopic, rootTopic, selectedTopic?.id, subtopics])

  const totalQuestions = directCards.length + sections.reduce((total, section) => total + section.cards.length, 0)
  const topicSearchTerm = normalizeSearchText(debouncedTopicSearch, locale)
  const visibleDirectCards = useMemo(
    () => topicSearchTerm ? rankCardsBySearch(directCards, topicSearchTerm, locale) : directCards,
    [directCards, locale, topicSearchTerm],
  )
  const visibleSections = useMemo(
    () => sections
      .map((section) => {
        const topicScore = scoreTopicSearch(section.topic, topicSearchTerm, locale)
        const rankedCards = rankCardsBySearch(section.cards, topicSearchTerm, locale)
        return {
          ...section,
          cards: rankedCards.length > 0 ? rankedCards : topicScore > 0 ? section.cards : [],
          searchScore: Math.max(topicScore, ...rankedCards.map((card) => scoreCardSearch(card, topicSearchTerm, locale))),
        }
      })
      .filter((section) => !topicSearchTerm || section.cards.length > 0),
    [locale, sections, topicSearchTerm],
  )
  const rankedVisibleSections = useMemo(
    () => topicSearchTerm
      ? [...visibleSections]
        .sort((a, b) =>
          b.searchScore - a.searchScore
          || a.title.localeCompare(b.title, locale),
        )
      : visibleSections,
    [locale, topicSearchTerm, visibleSections],
  )
  const visibleQuestionCount = visibleDirectCards.length
    + rankedVisibleSections.reduce((total, section) => total + section.cards.length, 0)
  const displayedDirectCards = topicSearchTerm ? visibleDirectCards : directCards
  const displayedSections = topicSearchTerm ? rankedVisibleSections : sections
  const selectedAttachmentTopic = draft.topicId ? topicById.get(draft.topicId) : rootTopic
  const selectedAttachmentRoot = selectedAttachmentTopic?.parentTopicId
    ? topicById.get(selectedAttachmentTopic.parentTopicId)
    : selectedAttachmentTopic ?? rootTopic
  const selectedAttachmentPath = selectedAttachmentRoot
    ? selectedAttachmentTopic?.id && selectedAttachmentTopic.id !== selectedAttachmentRoot.id
      ? `${selectedAttachmentRoot.name} / ${selectedAttachmentTopic.name}`
      : selectedAttachmentRoot.name
    : ''

  useEffect(() => {
    setExpandedSectionIds(new Set())
  }, [rootTopicId, selectedTopicId])

  const difficultyLabel = (difficulty: ApiDifficulty) => {
    if (difficulty === 'Easy') return t('Kolay', 'Easy')
    if (difficulty === 'Hard') return t('Zor', 'Hard')
    return t('Orta', 'Medium')
  }

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.topics.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.all })
    void queryClient.invalidateQueries({ queryKey: ['flashcards'] })
  }

  const expandSection = (sectionId: string) => {
    setExpandedSectionIds((current) => {
      const next = new Set(current)
      next.add(sectionId)
      return next
    })
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSectionIds((current) => {
      const next = new Set(current)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const toggleCard = (cardId: string) => {
    setExpandedCardIds((current) => {
      const next = new Set(current)
      if (next.has(cardId)) {
        next.delete(cardId)
      } else {
        next.add(cardId)
      }
      return next
    })
  }

  const reorderTopics = useMutation({
    mutationFn: (input: ReorderTopicsInput) => api.topics.reorder<TopicDto[]>(input),
    onSuccess: (updatedTopics) => {
      queryClient.setQueryData(queryKeys.topics.all, updatedTopics)
      void queryClient.invalidateQueries({ queryKey: queryKeys.topics.all })
    },
  })

  const moveSubtopic = (topicIdToMove: string, direction: -1 | 1) => {
    if (!rootTopic) return
    const index = subtopics.findIndex((topic) => topic.id === topicIdToMove)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= subtopics.length) return

    const topicIds = subtopics.map((topic) => topic.id)
    const currentId = topicIds[index]
    topicIds[index] = topicIds[nextIndex]
    topicIds[nextIndex] = currentId
    reorderTopics.mutate({ parentTopicId: rootTopic.id, topicIds })
  }

  const saveQuestion = useMutation({
    mutationFn: async () => {
      if (!rootTopic) throw new Error('Root topic is required')

      let targetTopicId = draft.topicId || rootTopic.id
      const newSubtopic = draft.newSubtopic.trim()

      if (newSubtopic) {
        const currentTarget = topicById.get(targetTopicId)
        const targetRoot = currentTarget?.parentTopicId
          ? topicById.get(currentTarget.parentTopicId) ?? rootTopic
          : currentTarget ?? rootTopic

        const input: CreateTopicInput = {
          name: newSubtopic,
          category: targetRoot.name,
          description: '',
          priority: 'High',
          progress: 0,
          confidenceLevel: 25,
          estimatedMastery: 70,
          accentColor: targetRoot.accentColor,
          parentTopicId: targetRoot.id,
          tags: splitTags(draft.tags),
        }
        const created = await api.topics.create<TopicDto>(input)
        targetTopicId = created.id
      }

      const input: UpsertFlashcardInput = {
        question: draft.question.trim(),
        answer: draft.answer.trim(),
        why: draft.why.trim() || null,
        ...normalizeFlashcardInsights(draft.insights),
        difficulty: draft.difficulty,
        topicId: targetTopicId,
        tags: splitTags(draft.tags),
      }

      return editingCard
        ? api.flashcards.update<FlashcardDto>(editingCard.id, input)
        : api.flashcards.create<FlashcardDto>(input)
    },
    onSuccess: (saved) => {
      invalidate()
      const sectionToOpen = saved.topicId ?? rootTopic?.id
      if (sectionToOpen && sectionToOpen !== rootTopic?.id) expandSection(sectionToOpen)
      setEditorOpen(false)
      setEditingCard(null)
      setDraft(emptyDraft)
    },
  })

  const deleteQuestion = useMutation({
    mutationFn: (id: string) => api.flashcards.remove(id),
    onSuccess: () => invalidate(),
  })

  const saveTopic = useMutation({
    mutationFn: (input: UpdateTopicInput) => {
      return editingTopic
        ? api.topics.update<TopicDto>(editingTopic.id, input)
        : api.topics.create<TopicDto>(input)
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.topics.all })
      queryClient.setQueryData(queryKeys.topics.detail(saved.id), saved)
      if (saved.parentTopicId === rootTopic?.id) expandSection(saved.id)
      setTopicEditorOpen(false)
      setEditingTopic(null)
    },
  })

  const deleteTopic = useMutation({
    mutationFn: (id: string) => api.topics.remove(id),
    onSuccess: (_result, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.topics.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.all })
      void queryClient.invalidateQueries({ queryKey: ['flashcards'] })
      setTopicEditorOpen(false)
      setEditingTopic(null)

      if (deletedId === rootTopic?.id) {
        navigate('/topics')
      } else if (deletedId === selectedTopic?.id && rootTopic) {
        navigate(`/topics/${encodeURIComponent(rootTopic.id)}`)
      }
    },
  })

  const openCreate = (targetTopicId?: string) => {
    if (!rootTopic) return
    setEditingCard(null)
    setDraft({
      ...emptyDraft,
      topicId: targetTopicId ?? rootTopic.id,
    })
    expandSection(targetTopicId ?? rootTopic.id)
    saveQuestion.reset()
    setEditorOpen(true)
  }

  const openEdit = (card: FlashcardDto) => {
    if (!rootTopic) return
    setEditingCard(card)
    setDraft({
      question: card.question,
      answer: card.answer,
      why: card.why ?? '',
      insights: {
        productionExample: card.productionExample ?? '',
        bankingExample: card.bankingExample ?? '',
        interviewTip: card.interviewTip ?? '',
        interviewFrequency: card.interviewFrequency ?? '',
      },
      difficulty: card.difficulty,
      topicId: card.topicId ?? rootTopic.id,
      newSubtopic: '',
      tags: card.tags.join(', '),
    })
    saveQuestion.reset()
    setEditorOpen(true)
  }

  const openEditTopic = (topic: TopicDto) => {
    setEditingTopic(topic)
    setTopicDraft({
      name: topic.name,
      category: topic.category,
      description: topic.description,
      priority: topic.priority,
      progress: topic.progress,
      confidenceLevel: topic.confidenceLevel,
      estimatedMastery: topic.estimatedMastery,
      accentColor: topic.accentColor,
      parentTopicId: topic.parentTopicId ?? null,
      tags: topic.tags,
    })
    setTopicTags(topic.tags.join(', '))
    saveTopic.reset()
    setTopicEditorOpen(true)
  }

  const openCreateSubtopic = () => {
    if (!rootTopic) return
    setEditingTopic(null)
    setTopicDraft({
      name: '',
      category: rootTopic.name,
      description: '',
      priority: 'High',
      progress: 0,
      confidenceLevel: 25,
      estimatedMastery: 70,
      accentColor: rootTopic.accentColor,
      parentTopicId: rootTopic.id,
      tags: [],
    })
    setTopicTags('')
    saveTopic.reset()
    setTopicEditorOpen(true)
  }

  const applyImportedQuestion = (parsed: ParsedFlashcardImport) => {
    const applied: string[] = []
    const ignored: string[] = []
    if (!rootTopic) return { applied, ignored: ['Konu açık değil'] }

    const next: QuestionDraft = { ...draft, insights: { ...draft.insights } }
    const currentTopic = draft.topicId ? topicById.get(draft.topicId) : undefined
    let parsedRoot = currentTopic?.parentTopicId
      ? topicById.get(currentTopic.parentTopicId)
      : currentTopic ?? rootTopic

    if (parsed.topic) {
      const matchedRoot = rootTopics.find((topic) => sameLooseName(topic.name, parsed.topic!))
      if (matchedRoot) {
        parsedRoot = matchedRoot
        next.topicId = matchedRoot.id
        next.newSubtopic = ''
        applied.push('Konu')
      } else {
        ignored.push(`Ana konu bulunamadı: ${parsed.topic}`)
      }
    }

    if (parsed.subtopic) {
      const subtopic = parsedRoot
        ? (childrenByParent.get(parsedRoot.id) ?? []).find((topic) => sameLooseName(topic.name, parsed.subtopic!))
        : topics.find((topic) => topic.parentTopicId && sameLooseName(topic.name, parsed.subtopic!))
      if (subtopic) {
        next.topicId = subtopic.id
        next.newSubtopic = ''
      } else if (!editingCard) {
        next.topicId = parsedRoot?.id ?? rootTopic.id
        next.newSubtopic = parsed.subtopic
      } else {
        ignored.push(`Alt konu bulunamadı: ${parsed.subtopic}`)
      }
      applied.push('Alt konu')
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
      next.tags = tags.join(', ')
      applied.push(parsed.questionType ? 'Etiketler + Soru tipi' : 'Etiketler')
    }

    if (parsed.relatedQuestions) {
      ignored.push('İlgili sorular için ayrı alan yok')
    }

    setDraft(next)
    return { applied, ignored }
  }

  const confirmDeleteTopic = (topic: TopicDto) => {
    const childCount = topics.filter((candidate) => candidate.parentTopicId === topic.id).length
    const message = childCount > 0
      ? t(
        `“${topic.name}” ve ${childCount} alt konusu silinsin mi? Sorular silinmez, konusuz kalır.`,
        `Delete “${topic.name}” and ${childCount} subtopics? Questions will not be deleted; they become unassigned.`,
      )
      : t(
        `“${topic.name}” silinsin mi? Sorular silinmez, konusuz kalır.`,
        `Delete “${topic.name}”? Questions will not be deleted; they become unassigned.`,
      )

    if (window.confirm(message)) {
      deleteTopic.mutate(topic.id)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    saveQuestion.mutate()
  }

  const handleTopicSubmit = (event: FormEvent) => {
    event.preventDefault()
    saveTopic.mutate({
      name: topicDraft.name.trim(),
      category: topicDraft.category.trim(),
      description: topicDraft.description?.trim() ?? '',
      priority: topicDraft.priority,
      progress: topicDraft.progress,
      confidenceLevel: topicDraft.confidenceLevel,
      estimatedMastery: topicDraft.estimatedMastery,
      accentColor: topicDraft.accentColor ?? '#7C3AED',
      parentTopicId: topicDraft.parentTopicId ?? null,
      tags: splitTags(topicTags),
    })
  }

  const copyTopicOutline = async () => {
    if (!rootTopic) return

    const outline = buildTopicQuestionOutline(rootTopic, directCards, sections)
    await copyTextToClipboard(outline)
    setOutlineCopied(true)
    window.setTimeout(() => setOutlineCopied(false), 1600)
  }

  const renderQuestionCard = (card: FlashcardDto) => {
    const canExpandCard = shouldCollapseCard(card)
    const cardExpanded = expandedCardIds.has(card.id)
    const showFullCard = !canExpandCard || cardExpanded

    return (
      <article key={card.id} className="rounded-2xl border border-border/70 bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <CircleHelp className="size-4" />
          </span>
          <div
            role={canExpandCard ? 'button' : undefined}
            tabIndex={canExpandCard ? 0 : undefined}
            aria-expanded={canExpandCard ? cardExpanded : undefined}
            aria-label={canExpandCard ? (cardExpanded ? t('Soruyu kısalt', 'Collapse question') : t('Soruyu genişlet', 'Expand question')) : undefined}
            onClick={canExpandCard ? () => toggleCard(card.id) : undefined}
            onKeyDown={canExpandCard ? (event) => handleToggleKeyDown(event, () => toggleCard(card.id)) : undefined}
            className={cn(
              'min-w-0 flex-1',
              canExpandCard && '-m-2 cursor-pointer rounded-2xl p-2 transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
            )}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill tone={difficultyTone(card.difficulty)}>{`${t('Zorluk', 'Difficulty')}: ${difficultyLabel(card.difficulty)}`}</StatusPill>
              {card.interviewFrequency ? (
                <StatusPill tone={interviewFrequencyTone(card.interviewFrequency)}>
                  {`${t('Sorulma', 'Asked')}: ${interviewFrequencyLabel(card.interviewFrequency, t)}`}
                </StatusPill>
              ) : null}
              {card.tags.map((tag) => <StatusPill key={tag}>{tag}</StatusPill>)}
            </div>
            <h4 className={cn('mt-3 text-sm font-semibold leading-6 text-foreground', !showFullCard && 'line-clamp-2')}>{card.question}</h4>
            <div className={cn('relative mt-2 overflow-hidden transition-[max-height] duration-200', showFullCard ? 'max-h-none' : 'max-h-16')}>
              <MarkdownAnswer value={card.answer} className="text-muted-foreground" />
              <FlashcardWhySection value={card.why} compact />
              <FlashcardInsightFields card={card} compact />
              {!showFullCard ? <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent" /> : null}
            </div>
            {canExpandCard ? (
              <div className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 text-xs font-semibold text-primary transition">
                {cardExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                <span>{cardExpanded ? t('Kısalt', 'Collapse') : t('Devamını göster', 'Show more')}</span>
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-1">
            <IconButton icon={Pencil} label={t('Soruyu düzenle', 'Edit question')} className="size-8" onClick={() => openEdit(card)} />
            <IconButton
              icon={Trash2}
              label={t('Soruyu sil', 'Delete question')}
              className="size-8 text-rose-500"
              disabled={deleteQuestion.isPending}
              onClick={() => {
                if (window.confirm(t('Bu soru silinsin mi?', 'Delete this question?'))) {
                  deleteQuestion.mutate(card.id)
                }
              }}
            />
          </div>
        </div>
      </article>
    )
  }

  if (topicsQuery.isPending || cardsQuery.isPending) {
    return (
      <div className="mx-auto max-w-[1180px] space-y-5" aria-label={t('Konu yükleniyor', 'Loading topic')}>
        <div className="h-28 animate-pulse rounded-2xl bg-muted/50" />
        <div className="h-72 animate-pulse rounded-[22px] bg-muted/40" />
      </div>
    )
  }

  if (topicsQuery.isError || cardsQuery.isError || !rootTopic) {
    return (
      <Panel>
        <EmptyState
          icon={Layers3}
          title={t('Konu açılmadı', 'Topic could not be opened')}
          description={t('Konu bulunamadı veya API bağlantısı kurulamadı.', 'The topic was not found or the API could not be reached.')}
          action={<Link to="/topics"><ActionButton>{t('Konulara dön', 'Back to topics')}</ActionButton></Link>}
        />
      </Panel>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-6">
      <Link
        to="/topics"
        className="inline-flex items-center gap-1.5 rounded-lg text-xs font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-3.5" />
        {t('Konulara dön', 'Back to topics')}
      </Link>

      <Panel className="relative overflow-hidden p-6 sm:p-7">
        <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: rootTopic.accentColor }} />
        <PageHeader
          eyebrow={t('Ana konu', 'Main topic')}
          title={rootTopic.name}
          description={rootTopic.description || t('Bu konunun alt konuları ve soru-cevapları.', 'Subtopics and questions under this topic.')}
          actions={(
            <>
              <StatusPill tone="purple">{subtopics.length} {t('alt konu', 'subtopics')}</StatusPill>
              <StatusPill>{totalQuestions} {t('soru', 'questions')}</StatusPill>
              <ActionButton icon={Pencil} onClick={() => openEditTopic(rootTopic)}>
                {t('Konuyu düzenle', 'Edit topic')}
              </ActionButton>
              <ActionButton icon={FolderTree} onClick={openCreateSubtopic}>
                {t('Alt konu ekle', 'Add subtopic')}
              </ActionButton>
              <ActionButton icon={Copy} onClick={() => { void copyTopicOutline() }}>
                {outlineCopied ? t('Kopyalandı', 'Copied') : t('Listeyi kopyala', 'Copy list')}
              </ActionButton>
              <ActionButton
                icon={Trash2}
                className="border-rose-500/25 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                disabled={deleteTopic.isPending}
                onClick={() => confirmDeleteTopic(rootTopic)}
              >
                {t('Konuyu sil', 'Delete topic')}
              </ActionButton>
              <ActionButton icon={Plus} variant="primary" onClick={() => openCreate()}>
                {t('Soru ekle', 'Add question')}
              </ActionButton>
            </>
          )}
        />
      </Panel>

      <Panel className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <span className="sr-only">{t('Bu konuda ara', 'Search in this topic')}</span>
            <input
              value={topicSearch}
              onChange={(event) => setTopicSearch(event.target.value)}
              placeholder={t('Bu konuda soru, cevap veya etiket ara', 'Search question, answer, or tag in this topic')}
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-ring/30"
            />
          </label>
          <div className="flex items-center justify-between gap-2 lg:justify-end">
            {topicSearchTerm ? (
              <StatusPill tone={visibleQuestionCount ? 'success' : 'danger'}>
                {visibleQuestionCount} {t('eşleşme', 'matches')}
              </StatusPill>
            ) : (
              <StatusPill>{totalQuestions} {t('soru', 'questions')}</StatusPill>
            )}
            {topicSearchTerm ? (
              <ActionButton onClick={() => setTopicSearch('')}>
                {t('Aramayı temizle', 'Clear search')}
              </ActionButton>
            ) : null}
          </div>
        </div>
      </Panel>

      <div className="rounded-[24px] border border-border/70 bg-card/60 p-4 sm:p-5">
        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <FolderTree className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('Ana konu', 'Main topic')}</p>
            <h2 className="truncate text-base font-semibold text-foreground">{rootTopic.name}</h2>
          </div>
        </div>

        <div className="ml-5 border-l border-border/80 pl-5 pt-5">
          <div className="space-y-4">
            {displayedDirectCards.length ? (
              <div className="rounded-[20px] border border-border/70 bg-background/80 p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <BookOpenCheck className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('Sorular', 'Questions')}</p>
                      <h3 className="truncate text-sm font-semibold text-foreground">{rootTopic.name}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill>{displayedDirectCards.length} {t('soru', 'questions')}</StatusPill>
                    <ActionButton icon={Plus} onClick={() => openCreate(rootTopic.id)}>
                      {t('Soru ekle', 'Add question')}
                    </ActionButton>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {displayedDirectCards.map(renderQuestionCard)}
                </div>
              </div>
            ) : null}

            {displayedSections.map((section, sectionIndex) => {
              const isExpanded = topicSearchTerm ? true : expandedSectionIds.has(section.id)
              const panelId = `topic-section-${section.id}`

              return (
                <section
                key={section.id}
                className={cn(
                  'rounded-[20px] border bg-background/80 p-4 shadow-sm transition',
                  section.isSelected ? 'border-primary/40 ring-2 ring-primary/10' : 'border-border/70',
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    aria-controls={panelId}
                    aria-expanded={isExpanded}
                    onClick={() => toggleSection(section.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:-ml-2 sm:px-2 sm:py-1.5"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                      {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </span>
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                      <BookOpenCheck className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {section.topic.id === rootTopic.id ? t('Ana konu soruları', 'Main topic questions') : t('Alt konu', 'Subtopic')}
                      </span>
                      <span className="block truncate text-sm font-semibold text-foreground">{section.title}</span>
                    </span>
                  </button>
                  <div className="flex items-center gap-2">
                    <StatusPill>{section.cards.length} {t('soru', 'questions')}</StatusPill>
                    <IconButton
                      icon={ArrowUp}
                      label={t('Alt konuyu yukarı taşı', 'Move subtopic up')}
                      className="size-9"
                      disabled={Boolean(topicSearchTerm) || sectionIndex === 0 || reorderTopics.isPending}
                      onClick={() => moveSubtopic(section.topic.id, -1)}
                    />
                    <IconButton
                      icon={ArrowDown}
                      label={t('Alt konuyu aşağı taşı', 'Move subtopic down')}
                      className="size-9"
                      disabled={Boolean(topicSearchTerm) || sectionIndex >= sections.length - 1 || reorderTopics.isPending}
                      onClick={() => moveSubtopic(section.topic.id, 1)}
                    />
                    <ActionButton icon={Pencil} onClick={() => openEditTopic(section.topic)}>
                      {section.topic.id === rootTopic.id ? t('Düzenle', 'Edit') : t('Alt konuyu düzenle', 'Edit subtopic')}
                    </ActionButton>
                    {section.topic.id !== rootTopic.id ? (
                      <ActionButton
                        icon={Trash2}
                        className="border-rose-500/25 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                        disabled={deleteTopic.isPending}
                        onClick={() => confirmDeleteTopic(section.topic)}
                      >
                        {t('Sil', 'Delete')}
                      </ActionButton>
                    ) : null}
                    <ActionButton icon={Plus} onClick={() => openCreate(section.topic.id)}>
                      {t('Soru ekle', 'Add question')}
                    </ActionButton>
                  </div>
                </div>

                {isExpanded ? (
                  section.cards.length ? (
                    <div id={panelId} className="mt-4 space-y-3">
                    {section.cards.map((card) => {
                      const canExpandCard = shouldCollapseCard(card)
                      const cardExpanded = expandedCardIds.has(card.id)
                      const showFullCard = !canExpandCard || cardExpanded

                      return (
                      <article key={card.id} className="rounded-2xl border border-border/70 bg-card p-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                            <CircleHelp className="size-4" />
                          </span>
                          <div
                            role={canExpandCard ? 'button' : undefined}
                            tabIndex={canExpandCard ? 0 : undefined}
                            aria-expanded={canExpandCard ? cardExpanded : undefined}
                            aria-label={canExpandCard ? (cardExpanded ? t('Soruyu kısalt', 'Collapse question') : t('Soruyu genişlet', 'Expand question')) : undefined}
                            onClick={canExpandCard ? () => toggleCard(card.id) : undefined}
                            onKeyDown={canExpandCard ? (event) => handleToggleKeyDown(event, () => toggleCard(card.id)) : undefined}
                            className={cn(
                              'min-w-0 flex-1',
                              canExpandCard && '-m-2 cursor-pointer rounded-2xl p-2 transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                            )}
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <StatusPill tone={difficultyTone(card.difficulty)}>{`${t('Zorluk', 'Difficulty')}: ${difficultyLabel(card.difficulty)}`}</StatusPill>
                              {card.interviewFrequency ? (
                                <StatusPill tone={interviewFrequencyTone(card.interviewFrequency)}>
                                  {`${t('Sorulma', 'Asked')}: ${interviewFrequencyLabel(card.interviewFrequency, t)}`}
                                </StatusPill>
                              ) : null}
                              {card.tags.map((tag) => <StatusPill key={tag}>{tag}</StatusPill>)}
                            </div>
                            <h4 className={cn('mt-3 text-sm font-semibold leading-6 text-foreground', !showFullCard && 'line-clamp-2')}>{card.question}</h4>
                            <div className={cn('relative mt-2 overflow-hidden transition-[max-height] duration-200', showFullCard ? 'max-h-none' : 'max-h-16')}>
                              <MarkdownAnswer value={card.answer} className="text-muted-foreground" />
                              <FlashcardWhySection value={card.why} compact />
                              <FlashcardInsightFields card={card} compact />
                              {!showFullCard ? <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent" /> : null}
                            </div>
                            {canExpandCard ? (
                              <div className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 text-xs font-semibold text-primary transition">
                                {cardExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                                <span>{cardExpanded ? t('Kısalt', 'Collapse') : t('Devamını göster', 'Show more')}</span>
                              </div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <IconButton icon={Pencil} label={t('Soruyu düzenle', 'Edit question')} className="size-8" onClick={() => openEdit(card)} />
                            <IconButton
                              icon={Trash2}
                              label={t('Soruyu sil', 'Delete question')}
                              className="size-8 text-rose-500"
                              disabled={deleteQuestion.isPending}
                              onClick={() => {
                                if (window.confirm(t('Bu soru silinsin mi?', 'Delete this question?'))) {
                                  deleteQuestion.mutate(card.id)
                                }
                              }}
                            />
                          </div>
                        </div>
                      </article>
                      )
                    })}
                    </div>
                  ) : (
                    <div id={panelId} className="mt-4 rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                    {t('Bu başlık altında henüz soru yok.', 'There are no questions under this heading yet.')}
                    </div>
                  )
                ) : null}
                </section>
              )
            })}

            {topicSearchTerm && visibleQuestionCount === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-8 text-center">
                <Search className="mx-auto size-5 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold text-foreground">{t('Eşleşen soru yok', 'No matching questions')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('Aramayı değiştir veya temizle.', 'Change or clear the search.')}</p>
              </div>
            ) : null}

            {!topicSearchTerm && subtopics.length === 0 ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-background/60 px-4 py-3 text-xs text-muted-foreground">
                <span>{t('Alt konu yok. İstersen sadece alt konu oluşturabilir veya direkt soru ekleyebilirsin.', 'No subtopics yet. You can create only a subtopic or add a question directly.')}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={openCreateSubtopic} className="font-semibold text-primary hover:text-primary/80">
                    {t('Alt konu ekle', 'Add subtopic')}
                  </button>
                  <button type="button" onClick={() => openCreate()} className="font-semibold text-primary hover:text-primary/80">
                    {t('Soru ekle', 'Add question')}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {editorOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setEditorOpen(false)
          }}
        >
          <Panel className="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto bg-card p-6 shadow-float sm:p-7" role="dialog" aria-modal="true" aria-labelledby="question-editor-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="question-editor-title" className="text-lg font-semibold text-foreground">
                  {editingCard ? t('Soruyu düzenle', 'Edit question') : t('Soru ekle', 'Add question')}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('Soruyu ana konuya veya bir alt konuya bağla.', 'Attach the question to the main topic or a subtopic.')}
                </p>
              </div>
              <IconButton icon={X} label={t('Pencereyi kapat', 'Close dialog')} onClick={() => setEditorOpen(false)} />
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <SmartQuestionPaste onApply={applyImportedQuestion} />

              <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
                <label className="space-y-1.5 text-xs font-medium text-foreground">
                  {t('Bağlanacağı başlık', 'Attach to')}
                  <select
                    value={draft.topicId}
                    onChange={(event) => setDraft((current) => ({ ...current, topicId: event.target.value, newSubtopic: '' }))}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                  >
                    {rootTopics.map((topic) => (
                      <optgroup key={topic.id} label={topic.name}>
                        <option value={topic.id}>{topic.name}</option>
                        {(childrenByParent.get(topic.id) ?? []).map((subtopic) => (
                          <option key={subtopic.id} value={subtopic.id}>- {subtopic.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5 text-xs font-medium text-foreground">
                  {t('Zorluk', 'Difficulty')}
                  <select
                    value={draft.difficulty}
                    onChange={(event) => setDraft((current) => ({ ...current, difficulty: event.target.value as ApiDifficulty }))}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="Easy">{difficultyLabel('Easy')}</option>
                    <option value="Medium">{difficultyLabel('Medium')}</option>
                    <option value="Hard">{difficultyLabel('Hard')}</option>
                  </select>
                </label>
              </div>

              {!editingCard ? (
                <label className="block space-y-1.5 text-xs font-medium text-foreground">
                  {t('Yeni alt konu', 'New subtopic')}
                  <input
                    value={draft.newSubtopic}
                    onChange={(event) => setDraft((current) => ({ ...current, newSubtopic: event.target.value }))}
                    placeholder={t('Örn. Task.WhenAll, Index, Middleware', 'e.g. Task.WhenAll, Index, Middleware')}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                  />
                  <span className="block text-[11px] font-normal text-muted-foreground">
                    {selectedAttachmentRoot
                      ? t(
                        `Boş bırakırsan soru “${selectedAttachmentPath}” altına kaydedilir; yazarsan “${selectedAttachmentRoot.name}” altında yeni alt konu oluşur.`,
                        `Leave empty to save under “${selectedAttachmentPath}”; fill it to create a new subtopic under “${selectedAttachmentRoot.name}”.`,
                      )
                      : t('Yeni alt konu seçilen ana konu altında oluşur.', 'The new subtopic will be created under the selected main topic.')}
                  </span>
                </label>
              ) : null}

              <label className="block space-y-1.5 text-xs font-medium text-foreground">
                {t('Soru', 'Question')}
                <textarea
                  required
                  autoFocus
                  value={draft.question}
                  onChange={(event) => setDraft((current) => ({ ...current, question: event.target.value }))}
                  rows={3}
                  className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring/30"
                />
              </label>

              <RichAnswerEditor
                value={draft.answer}
                onChange={(answer) => setDraft((current) => ({ ...current, answer }))}
                required
              />
              <FlashcardWhyEditorField
                value={draft.why}
                onChange={(why) => setDraft((current) => ({ ...current, why }))}
              />

              <FlashcardInsightEditorFields
                value={draft.insights}
                onChange={(insights) => setDraft((current) => ({ ...current, insights }))}
              />

              <label className="block space-y-1.5 text-xs font-medium text-foreground">
                {t('Etiketler', 'Tags')}
                <input
                  value={draft.tags}
                  onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
                  placeholder={t('Virgülle ayır: async, C#, mülakat', 'Separate with commas: async, C#, interview')}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                />
              </label>

              <div className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                <Check className="mr-1.5 inline size-3.5 text-primary" />
                {t('Hiyerarşi', 'Hierarchy')}:{' '}
                <strong className="text-foreground">
                  {draft.newSubtopic.trim() && selectedAttachmentRoot
                    ? `${selectedAttachmentRoot.name} / ${draft.newSubtopic.trim()}`
                    : selectedAttachmentPath || rootTopic.name}
                </strong>
              </div>

              {saveQuestion.isError ? (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {t('Soru kaydedilemedi. Alanları kontrol edip yeniden dene.', 'The question could not be saved. Check the fields and try again.')}
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <ActionButton onClick={() => setEditorOpen(false)}>{t('Vazgeç', 'Cancel')}</ActionButton>
                <ActionButton type="submit" icon={Save} variant="primary" disabled={!draft.question.trim() || !draft.answer.trim() || saveQuestion.isPending}>
                  {saveQuestion.isPending ? t('Kaydediliyor...', 'Saving...') : t('Kaydet', 'Save')}
                </ActionButton>
              </div>
            </form>
          </Panel>
        </div>
      ) : null}

      {topicEditorOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setTopicEditorOpen(false)
              setEditingTopic(null)
            }
          }}
        >
          <Panel className="w-full max-w-xl bg-card p-6 shadow-float" role="dialog" aria-modal="true" aria-labelledby="topic-editor-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="topic-editor-title" className="text-lg font-semibold text-foreground">
                  {editingTopic
                    ? editingTopic.parentTopicId
                      ? t('Alt konuyu düzenle', 'Edit subtopic')
                      : t('Ana konuyu düzenle', 'Edit main topic')
                    : t('Alt konu ekle', 'Add subtopic')}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {editingTopic
                    ? t('Başlık, açıklama ve etiketleri güncelle.', 'Update title, description, and tags.')
                    : t(`Yeni alt konu “${rootTopic.name}” altında oluşturulacak.`, `The new subtopic will be created under “${rootTopic.name}”.`)}
                </p>
              </div>
              <IconButton icon={X} label={t('Pencereyi kapat', 'Close dialog')} onClick={() => { setTopicEditorOpen(false); setEditingTopic(null) }} />
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleTopicSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-medium text-foreground">
                  {t('Ad', 'Name')}
                  <input
                    required
                    autoFocus
                    value={topicDraft.name}
                    onChange={(event) => setTopicDraft((current) => ({ ...current, name: event.target.value }))}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </label>
                <label className="space-y-1.5 text-xs font-medium text-foreground">
                  {t('Kategori', 'Category')}
                  <input
                    required
                    value={topicDraft.category}
                    onChange={(event) => setTopicDraft((current) => ({ ...current, category: event.target.value }))}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </label>
              </div>

              <label className="block space-y-1.5 text-xs font-medium text-foreground">
                {t('Açıklama', 'Description')}
                <textarea
                  value={topicDraft.description ?? ''}
                  onChange={(event) => setTopicDraft((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-medium text-foreground">
                  {t('Öncelik', 'Priority')}
                  <select
                    value={topicDraft.priority}
                    onChange={(event) => setTopicDraft((current) => ({ ...current, priority: event.target.value as ApiPriority }))}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
                  >
                    <option value="Critical">{t('Kritik', 'Critical')}</option>
                    <option value="High">{t('Yüksek', 'High')}</option>
                    <option value="Medium">{t('Orta', 'Medium')}</option>
                    <option value="Low">{t('Düşük', 'Low')}</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-xs font-medium text-foreground">
                  {t('Renk', 'Color')}
                  <input
                    type="color"
                    value={topicDraft.accentColor ?? '#7C3AED'}
                    onChange={(event) => setTopicDraft((current) => ({ ...current, accentColor: event.target.value }))}
                    className="h-10 w-full rounded-xl border border-border bg-background px-2 py-1 outline-none"
                  />
                </label>
              </div>

              <label className="block space-y-1.5 text-xs font-medium text-foreground">
                {t('Etiketler', 'Tags')}
                <input
                  value={topicTags}
                  onChange={(event) => setTopicTags(event.target.value)}
                  placeholder={t('Virgülle ayır', 'Separate with commas')}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                />
              </label>

              {saveTopic.isError ? (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {t('Konu kaydedilemedi. Alanları kontrol edip yeniden dene.', 'Topic could not be saved. Check the fields and try again.')}
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <ActionButton onClick={() => { setTopicEditorOpen(false); setEditingTopic(null) }}>{t('Vazgeç', 'Cancel')}</ActionButton>
                <ActionButton type="submit" icon={Save} variant="primary" disabled={!topicDraft.name.trim() || !topicDraft.category.trim() || saveTopic.isPending}>
                  {saveTopic.isPending ? t('Kaydediliyor...', 'Saving...') : t('Kaydet', 'Save')}
                </ActionButton>
              </div>
            </form>
          </Panel>
        </div>
      ) : null}
    </div>
  )
}

export { TopicDetailPage }
