import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowUpRight,
  BookOpenCheck,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FolderTree,
  Hash,
  Pencil,
  Layers3,
  Plus,
  Search,
  Tags,
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
} from '../components/features/FlashcardInsightFields'
import {
  emptyFlashcardInsights,
  normalizeFlashcardInsights,
  type FlashcardInsightDraft,
} from '../components/features/flashcardInsightModel'
import { RichAnswerEditor } from '../components/features/RichAnswerEditor'
import { FlashcardWhyEditorField } from '../components/features/FlashcardWhySection'
import { useI18n } from '../i18n'
import { api } from '../services/api'
import { queryKeys } from '../services/queryKeys'
import type {
  ApiDifficulty,
  ApiPriority,
  CreateTopicInput,
  FlashcardDto,
  TopicDto,
  UpdateTopicInput,
  UpsertFlashcardInput,
} from '../types/api'

type QuickQuestionDraft = {
  question: string
  answer: string
  why: string
  insights: FlashcardInsightDraft
  difficulty: ApiDifficulty
  topicId: string
  subtopicId: string
  newSubtopic: string
  tags: string
}

const emptyTopic: CreateTopicInput = {
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
}

const emptyQuestion: QuickQuestionDraft = {
  question: '',
  answer: '',
  why: '',
  insights: emptyFlashcardInsights,
  difficulty: 'Medium',
  topicId: '',
  subtopicId: '',
  newSubtopic: '',
  tags: '',
}

const priorityTone: Record<ApiPriority, 'neutral' | 'warning' | 'danger'> = {
  Critical: 'danger',
  High: 'warning',
  Medium: 'neutral',
  Low: 'neutral',
}

const EMPTY_TOPICS: TopicDto[] = []
const EMPTY_CARDS: FlashcardDto[] = []

function splitTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export default function TopicsPage() {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const requestedTopicId = searchParams.get('id')
  const quickAddRequested = searchParams.get('quickAdd') === '1'
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editingTopic, setEditingTopic] = useState<TopicDto | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [newTopic, setNewTopic] = useState<CreateTopicInput>(emptyTopic)
  const [topicTagText, setTopicTagText] = useState('')
  const [draft, setDraft] = useState<QuickQuestionDraft>(emptyQuestion)
  const [expandedTopicIds, setExpandedTopicIds] = useState<Set<string>>(new Set())

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
  const rootTopics = useMemo(
    () => topics.filter((topic) => !topic.parentTopicId).sort((a, b) => a.name.localeCompare(b.name, locale)),
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
    for (const children of map.values()) {
      children.sort((a, b) => a.name.localeCompare(b.name, locale))
    }
    return map
  }, [locale, topics])

  const allTags = useMemo(() => {
    const names = new Set<string>()
    for (const topic of topics) topic.tags.forEach((tag) => names.add(tag))
    for (const card of cards) card.tags.forEach((tag) => names.add(tag))
    return [...names].sort((a, b) => a.localeCompare(b, locale))
  }, [cards, locale, topics])

  const visibleTopics = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale)
    if (!normalized) return rootTopics

    return rootTopics.filter((topic) => {
      const children = childrenByParent.get(topic.id) ?? []
      const values = [
        topic.name,
        topic.category,
        ...topic.tags,
        ...children.flatMap((child) => [child.name, child.category, ...child.tags]),
      ]
      return values.some((value) => value.toLocaleLowerCase(locale).includes(normalized))
    })
  }, [childrenByParent, locale, query, rootTopics])

  const cardCountFor = (topic: TopicDto) => {
    const ids = new Set([topic.id, ...(childrenByParent.get(topic.id) ?? []).map((child) => child.id)])
    return cards.filter((card) => card.topicId && ids.has(card.topicId)).length
  }

  const priorityLabel = (priority: ApiPriority) => {
    if (priority === 'Critical') return t('Kritik', 'Critical')
    if (priority === 'High') return t('Yüksek', 'High')
    if (priority === 'Medium') return t('Orta', 'Medium')
    return t('Düşük', 'Low')
  }

  const difficultyLabel = (difficulty: ApiDifficulty) => {
    if (difficulty === 'Easy') return t('Kolay', 'Easy')
    if (difficulty === 'Hard') return t('Zor', 'Hard')
    return t('Orta', 'Medium')
  }

  const saveTopic = useMutation({
    mutationFn: (input: CreateTopicInput | UpdateTopicInput) =>
      editingTopic
        ? api.topics.update<TopicDto>(editingTopic.id, input)
        : api.topics.create<TopicDto>(input),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.topics.all })
      queryClient.setQueryData(queryKeys.topics.detail(saved.id), saved)
      setNewTopic(emptyTopic)
      setTopicTagText('')
      setEditingTopic(null)
      setCreateOpen(false)
    },
  })

  const deleteTopic = useMutation({
    mutationFn: (id: string) => api.topics.remove(id),
    onSuccess: (_result, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.topics.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.all })
      void queryClient.invalidateQueries({ queryKey: ['flashcards'] })
      setExpandedTopicIds((current) => {
        const next = new Set(current)
        next.delete(deletedId)
        return next
      })
      if (editingTopic?.id === deletedId) {
        setEditingTopic(null)
        setCreateOpen(false)
      }
    },
  })

  const createQuestion = useMutation({
    mutationFn: async () => {
      const parentTopic = topicById.get(draft.topicId)
      let targetTopicId = draft.subtopicId || draft.topicId
      const newSubtopic = draft.newSubtopic.trim()

      if (newSubtopic) {
        const created = await api.topics.create<TopicDto>({
          name: newSubtopic,
          category: parentTopic?.name ?? t('Alt konu', 'Subtopic'),
          description: '',
          priority: 'High',
          progress: 0,
          confidenceLevel: 25,
          estimatedMastery: 70,
          accentColor: parentTopic?.accentColor ?? '#7C3AED',
          parentTopicId: draft.topicId,
          tags: splitTags(draft.tags),
        })
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
      return api.flashcards.create<FlashcardDto>(input)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.topics.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.all })
      void queryClient.invalidateQueries({ queryKey: ['flashcards'] })
      setDraft(emptyQuestion)
      setQuickAddOpen(false)
      if (quickAddRequested) setSearchParams({})
    },
  })

  useEffect(() => {
    if (requestedTopicId) navigate(`/topics/${encodeURIComponent(requestedTopicId)}`, { replace: true })
  }, [navigate, requestedTopicId])

  useEffect(() => {
    if (quickAddRequested) setQuickAddOpen(true)
  }, [quickAddRequested])

  useEffect(() => {
    if (!quickAddOpen || draft.topicId || rootTopics.length === 0) return
    setDraft((current) => ({ ...current, topicId: rootTopics[0].id }))
  }, [draft.topicId, quickAddOpen, rootTopics])

  const openQuickAdd = (topicId?: string, subtopicId?: string) => {
    const topic = topicId ? topicById.get(topicId) : undefined
    const rootId = topic?.parentTopicId ?? topicId ?? rootTopics[0]?.id ?? ''
    const childId = topic?.parentTopicId ? topic.id : subtopicId ?? ''
    setDraft({ ...emptyQuestion, topicId: rootId, subtopicId: childId })
    setQuickAddOpen(true)
  }

  const openCreateTopic = () => {
    setEditingTopic(null)
    setNewTopic(emptyTopic)
    setTopicTagText('')
    saveTopic.reset()
    setCreateOpen(true)
  }

  const openEditTopic = (topic: TopicDto) => {
    setEditingTopic(topic)
    setNewTopic({
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
    setTopicTagText(topic.tags.join(', '))
    saveTopic.reset()
    setCreateOpen(true)
  }

  const toggleSubtopics = (topicId: string) => {
    setExpandedTopicIds((current) => {
      const next = new Set(current)
      if (next.has(topicId)) {
        next.delete(topicId)
      } else {
        next.add(topicId)
      }
      return next
    })
  }

  const confirmDeleteTopic = (topic: TopicDto) => {
    const childCount = childrenByParent.get(topic.id)?.length ?? 0
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

  const handleSaveTopic = (event: FormEvent) => {
    event.preventDefault()
    saveTopic.mutate({
      ...newTopic,
      name: newTopic.name.trim(),
      category: newTopic.category.trim(),
      description: newTopic.description?.trim() ?? '',
      accentColor: newTopic.accentColor || '#7C3AED',
      parentTopicId: newTopic.parentTopicId || null,
      tags: splitTags(topicTagText),
    })
  }

  const selectedRoot = topicById.get(draft.topicId)
  const subtopicOptions = draft.topicId ? childrenByParent.get(draft.topicId) ?? [] : []
  const canSaveQuestion = Boolean(draft.question.trim() && draft.answer.trim() && draft.topicId)
  const canChangeTopicParent = !editingTopic || (childrenByParent.get(editingTopic.id)?.length ?? 0) === 0

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      <PageHeader
        eyebrow={t('Pratik çalışma alanı', 'Practice workspace')}
        title={t('Konular ve sorular', 'Topics and questions')}
        description={t(
          'Ana akış burada: konuları ve alt konuları tut, hızlıca soru ekle, sonra filtreleyip mülakat pratiğine geç.',
          'Keep topics and subtopics here, add questions quickly, then filter and practice.',
        )}
        actions={(
          <>
            <ActionButton icon={Plus} onClick={openCreateTopic}>{t('Konu ekle', 'Add topic')}</ActionButton>
            <ActionButton icon={BookOpenCheck} variant="primary" onClick={() => openQuickAdd()}>
              {t('Hızlı soru ekle', 'Quick add question')}
            </ActionButton>
          </>
        )}
      />

      <Panel className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <span className="sr-only">{t('Konu veya etiket ara', 'Search topic or tag')}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('Konu, alt konu veya etiket ara', 'Search topic, subtopic, or tag')}
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-ring/30"
            />
          </label>
          <Link
            to="/flashcards"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <CreditCard className="size-4" />
            {t('Pratik ekranına git', 'Go to practice')}
          </Link>
        </div>
        {allTags.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {allTags.slice(0, 12).map((tag) => (
              <Link
                key={tag}
                to={`/flashcards?tag=${encodeURIComponent(tag)}`}
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
              >
                <Hash className="size-3" />
                {tag}
              </Link>
            ))}
          </div>
        ) : null}
      </Panel>

      {topicsQuery.isPending || cardsQuery.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => <Panel key={item} className="h-56 animate-pulse bg-muted/45" />)}
        </div>
      ) : topicsQuery.isError || cardsQuery.isError ? (
        <Panel>
          <EmptyState
            icon={Layers3}
            title={t('Veriler yüklenemedi', 'Data could not be loaded')}
            description={t('API bağlantısını kontrol edip yeniden dene.', 'Check the API connection and try again.')}
            action={<ActionButton onClick={() => { void topicsQuery.refetch(); void cardsQuery.refetch() }}>{t('Yeniden dene', 'Try again')}</ActionButton>}
          />
        </Panel>
      ) : visibleTopics.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleTopics.map((topic) => {
            const children = childrenByParent.get(topic.id) ?? []
            const childrenExpanded = expandedTopicIds.has(topic.id)
            const count = cardCountFor(topic)
            return (
              <Panel key={topic.id} className="relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-primary/25">
                <div className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: topic.accentColor }} />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <FolderTree className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <Link to={`/topics/${encodeURIComponent(topic.id)}`} className="block truncate text-base font-semibold tracking-tight text-foreground hover:text-primary">
                          {topic.name}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{topic.category}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <StatusPill tone={priorityTone[topic.priority]}>{priorityLabel(topic.priority)}</StatusPill>
                    <IconButton icon={Pencil} label={t('Konuyu düzenle', 'Edit topic')} className="size-8" onClick={() => openEditTopic(topic)} />
                    <IconButton
                      icon={Trash2}
                      label={t('Konuyu sil', 'Delete topic')}
                      className="size-8 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                      disabled={deleteTopic.isPending}
                      onClick={() => confirmDeleteTopic(topic)}
                    />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-border/70 bg-background/65 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('Soru', 'Questions')}</p>
                    <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-foreground">{count}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/65 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('Alt konu', 'Subtopics')}</p>
                    <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-foreground">{children.length}</p>
                  </div>
                </div>

                {children.length ? (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => toggleSubtopics(topic.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-left transition hover:bg-muted/50"
                      aria-expanded={childrenExpanded}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {childrenExpanded ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                        <span className="truncate text-xs font-semibold text-foreground">{t('Alt konular', 'Subtopics')}</span>
                      </span>
                      <StatusPill>{children.length}</StatusPill>
                    </button>

                    {childrenExpanded ? (
                      <div className="mt-2 space-y-2">
                        {children.slice(0, 5).map((child) => (
                          <div key={child.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/45 px-3 py-2">
                            <Link to={`/topics/${encodeURIComponent(child.id)}`} className="min-w-0 text-xs font-medium text-foreground hover:text-primary">
                              <span className="truncate">{child.name}</span>
                            </Link>
                            <div className="flex shrink-0 items-center gap-1">
                              <IconButton icon={Pencil} label={t('Alt konuyu düzenle', 'Edit subtopic')} className="size-7 rounded-lg" onClick={() => openEditTopic(child)} />
                              <IconButton
                                icon={Trash2}
                                label={t('Alt konuyu sil', 'Delete subtopic')}
                                className="size-7 rounded-lg text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                                disabled={deleteTopic.isPending}
                                onClick={() => confirmDeleteTopic(child)}
                              />
                              <button
                                type="button"
                                onClick={() => openQuickAdd(topic.id, child.id)}
                                className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10"
                              >
                                {t('Soru ekle', 'Add')}
                              </button>
                            </div>
                          </div>
                        ))}
                        {children.length > 5 ? (
                          <p className="px-1 text-[11px] text-muted-foreground">+{children.length - 5} {t('alt konu daha', 'more subtopics')}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl border border-dashed border-border px-3 py-3 text-xs leading-5 text-muted-foreground">
                    {t('Henüz alt konu yok. İlk soruyu eklerken alt konu oluşturabilirsin.', 'No subtopics yet. You can create one while adding a question.')}
                  </p>
                )}

                <div className="mt-4 flex min-h-7 flex-wrap gap-1.5">
                  {topic.tags.slice(0, 5).map((tag) => (
                    <Link key={tag} to={`/flashcards?topicId=${topic.id}&tag=${encodeURIComponent(tag)}`} className="rounded-lg border border-border/70 bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground">
                      {tag}
                    </Link>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between gap-2 border-t border-border/60 pt-4">
                  <ActionButton icon={Plus} onClick={() => openQuickAdd(topic.id)}>{t('Soru ekle', 'Add question')}</ActionButton>
                  <Link
                    to={`/topics/${encodeURIComponent(topic.id)}`}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {t('Aç', 'Open')}
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>
              </Panel>
            )
          })}
        </div>
      ) : (
        <Panel>
          <EmptyState
            icon={Search}
            title={t('Eşleşen konu yok', 'No matching topics')}
            description={t('Aramayı temizle veya yeni bir konu ekle.', 'Clear the search or add a new topic.')}
            action={<ActionButton onClick={() => setQuery('')}>{t('Aramayı temizle', 'Clear search')}</ActionButton>}
          />
        </Panel>
      )}

      {createOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setCreateOpen(false) }}>
          <Panel className="w-full max-w-lg bg-card p-6" role="dialog" aria-modal="true" aria-labelledby="new-topic-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="new-topic-title" className="text-lg font-semibold text-foreground">{editingTopic ? t('Konuyu düzenle', 'Edit topic') : t('Konu ekle', 'Add topic')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{editingTopic ? t('Ana konu veya alt konu bilgilerini güncelle.', 'Update topic or subtopic details.') : t('Ana konu veya mevcut bir konunun altında alt konu oluştur.', 'Create a main topic or a subtopic.')}</p>
              </div>
              <IconButton icon={X} label={t('Pencereyi kapat', 'Close dialog')} onClick={() => { setCreateOpen(false); setEditingTopic(null) }} />
            </div>
            <form className="mt-5 space-y-4" onSubmit={handleSaveTopic}>
              <label className="block space-y-1.5 text-xs font-medium text-foreground">
                {t('Üst konu', 'Parent topic')}
                <select
                  value={newTopic.parentTopicId ?? ''}
                  onChange={(event) => setNewTopic((current) => ({ ...current, parentTopicId: event.target.value || null }))}
                  disabled={!canChangeTopicParent}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none disabled:opacity-60"
                >
                  <option value="">{t('Ana konu olarak ekle', 'Add as main topic')}</option>
                  {rootTopics.filter((topic) => topic.id !== editingTopic?.id).map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                </select>
              </label>
              {!canChangeTopicParent ? <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">{t('Alt konuları olan bir ana konunun üst konusu değiştirilemez.', 'A topic with subtopics cannot be moved under another parent.')}</p> : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-medium text-foreground">
                  {t('Ad', 'Name')}
                  <input required autoFocus value={newTopic.name} onChange={(event) => setNewTopic((current) => ({ ...current, name: event.target.value }))} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
                </label>
                <label className="space-y-1.5 text-xs font-medium text-foreground">
                  {t('Kategori', 'Category')}
                  <input required value={newTopic.category} onChange={(event) => setNewTopic((current) => ({ ...current, category: event.target.value }))} placeholder={t('Örn. Backend', 'e.g. Backend')} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
                </label>
              </div>
              <label className="block space-y-1.5 text-xs font-medium text-foreground">
                {t('Açıklama', 'Description')}
                <textarea value={newTopic.description ?? ''} onChange={(event) => setNewTopic((current) => ({ ...current, description: event.target.value }))} rows={3} className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-medium text-foreground">
                  {t('Öncelik', 'Priority')}
                  <select value={newTopic.priority} onChange={(event) => setNewTopic((current) => ({ ...current, priority: event.target.value as ApiPriority }))} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none">
                    <option value="Critical">{t('Kritik', 'Critical')}</option>
                    <option value="High">{t('Yüksek', 'High')}</option>
                    <option value="Medium">{t('Orta', 'Medium')}</option>
                    <option value="Low">{t('Düşük', 'Low')}</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-xs font-medium text-foreground">
                  {t('Renk', 'Color')}
                  <input type="color" value={newTopic.accentColor ?? '#7C3AED'} onChange={(event) => setNewTopic((current) => ({ ...current, accentColor: event.target.value }))} className="h-10 w-full rounded-xl border border-border bg-background px-2 py-1 outline-none" />
                </label>
              </div>
              <label className="block space-y-1.5 text-xs font-medium text-foreground">
                {t('Etiketler', 'Tags')}
                <input value={topicTagText} onChange={(event) => setTopicTagText(event.target.value)} placeholder={t('Virgülle ayır', 'Separate with commas')} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
              </label>
              {saveTopic.isError ? <p className="text-xs text-rose-600 dark:text-rose-400">{t('Konu kaydedilemedi. Alanları kontrol edip yeniden dene.', 'Topic could not be saved. Check the fields and try again.')}</p> : null}
              <div className="flex justify-end gap-2 pt-1">
                <ActionButton onClick={() => { setCreateOpen(false); setEditingTopic(null) }}>{t('Vazgeç', 'Cancel')}</ActionButton>
                <ActionButton type="submit" variant="primary" disabled={saveTopic.isPending}>{saveTopic.isPending ? t('Kaydediliyor...', 'Saving...') : t('Kaydet', 'Save')}</ActionButton>
              </div>
            </form>
          </Panel>
        </div>
      ) : null}

      {quickAddOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setQuickAddOpen(false) }}>
          <Panel className="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto bg-card p-6 shadow-float sm:p-7" role="dialog" aria-modal="true" aria-labelledby="quick-question-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="quick-question-title" className="text-lg font-semibold text-foreground">{t('Hızlı soru ekle', 'Quick add question')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('Konu, alt konu ve etiketleri seç; soru hemen pratik havuzuna düşsün.', 'Pick topic, subtopic, and tags; the question goes straight into practice.')}</p>
              </div>
              <IconButton icon={X} label={t('Pencereyi kapat', 'Close dialog')} onClick={() => { setQuickAddOpen(false); if (quickAddRequested) setSearchParams({}) }} />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-medium text-foreground">
                {t('Konu', 'Topic')}
                <select
                  value={draft.topicId}
                  onChange={(event) => setDraft((current) => ({ ...current, topicId: event.target.value, subtopicId: '', newSubtopic: '' }))}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
                >
                  {rootTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-medium text-foreground">
                {t('Alt konu', 'Subtopic')}
                <select
                  value={draft.subtopicId}
                  onChange={(event) => setDraft((current) => ({ ...current, subtopicId: event.target.value, newSubtopic: '' }))}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
                >
                  <option value="">{selectedRoot ? t(`${selectedRoot.name} altına ekle`, `Add under ${selectedRoot.name}`) : t('Alt konu yok', 'No subtopic')}</option>
                  {subtopicOptions.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_180px]">
              <label className="space-y-1.5 text-xs font-medium text-foreground">
                {t('Yeni alt konu', 'New subtopic')}
                <input value={draft.newSubtopic} onChange={(event) => setDraft((current) => ({ ...current, newSubtopic: event.target.value, subtopicId: '' }))} placeholder={t('Örn. Task.WhenAll, Index, Middleware', 'e.g. Task.WhenAll, Index, Middleware')} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
              </label>
              <label className="space-y-1.5 text-xs font-medium text-foreground">
                {t('Zorluk', 'Difficulty')}
                <select value={draft.difficulty} onChange={(event) => setDraft((current) => ({ ...current, difficulty: event.target.value as ApiDifficulty }))} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none">
                  <option value="Easy">{difficultyLabel('Easy')}</option>
                  <option value="Medium">{difficultyLabel('Medium')}</option>
                  <option value="Hard">{difficultyLabel('Hard')}</option>
                </select>
              </label>
            </div>

            <label className="mt-4 block space-y-1.5 text-xs font-medium text-foreground">
              {t('Soru', 'Question')}
              <textarea value={draft.question} onChange={(event) => setDraft((current) => ({ ...current, question: event.target.value }))} className="min-h-24 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
            </label>
            <RichAnswerEditor
              className="mt-4"
              value={draft.answer}
              onChange={(answer) => setDraft((current) => ({ ...current, answer }))}
              required
            />
            <FlashcardWhyEditorField
              className="mt-4"
              value={draft.why}
              onChange={(why) => setDraft((current) => ({ ...current, why }))}
            />
            <FlashcardInsightEditorFields
              className="mt-4"
              value={draft.insights}
              onChange={(insights) => setDraft((current) => ({ ...current, insights }))}
            />
            <label className="mt-4 block space-y-1.5 text-xs font-medium text-foreground">
              <span className="inline-flex items-center gap-1.5"><Tags className="size-3.5 text-primary" />{t('Etiketler', 'Tags')}</span>
              <input value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} placeholder={t('virgülle ayır: async, C#, mülakat', 'comma-separated: async, C#, interview')} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
            </label>

            {createQuestion.isError ? <p className="mt-3 text-xs text-rose-600">{t('Soru kaydedilemedi. Alanları kontrol edip yeniden dene.', 'Question could not be saved. Check the fields and try again.')}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <ActionButton onClick={() => { setQuickAddOpen(false); if (quickAddRequested) setSearchParams({}) }}>{t('Vazgeç', 'Cancel')}</ActionButton>
              <ActionButton variant="primary" disabled={!canSaveQuestion || createQuestion.isPending} onClick={() => createQuestion.mutate()}>
                {createQuestion.isPending ? t('Kaydediliyor...', 'Saving...') : t('Soruyu kaydet', 'Save question')}
              </ActionButton>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  )
}

export { TopicsPage }


