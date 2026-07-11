import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Editor from '@monaco-editor/react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  Clock3,
  Code2,
  Copy,
  Expand,
  FileCode2,
  Lightbulb,
  ListFilter,
  LoaderCircle,
  PanelLeftClose,
  Play,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  TerminalSquare,
  XCircle,
  Zap,
} from 'lucide-react'
import {
  ActionButton,
  IconButton,
  Panel,
  ProgressBar,
  StatusPill,
} from '../components/features/FeaturePrimitives'
import { cn } from '../components/features/featureClassNames'
import { useDebouncedValue } from '../hooks/use-debounced-value'
import { useLocalStorage } from '../hooks/use-local-storage'
import { useI18n } from '../i18n'
import { api } from '../services/api'
import { queryKeys } from '../services/queryKeys'
import type {
  ApiDifficulty,
  CodingAttemptDto,
  CodingQuestionDetailDto,
  CodingQuestionSummaryDto,
  CreateCodingAttemptInput,
  UpdateCodingDraftInput,
} from '../types/api'

type CodingTab = 'problem' | 'solution' | 'attempts'
type RunState = 'idle' | 'ready' | 'submitted' | 'error'
type DraftSaveState = 'saved' | 'dirty' | 'saving' | 'error'
const EMPTY_QUESTIONS: CodingQuestionSummaryDto[] = []

function difficultyTone(difficulty: ApiDifficulty) {
  if (difficulty === 'Easy') return 'success' as const
  if (difficulty === 'Hard') return 'danger' as const
  return 'warning' as const
}

function languageLabel(language: string) {
  const labels: Record<string, string> = {
    csharp: 'C#', javascript: 'JavaScript', typescript: 'TypeScript', sql: 'SQL',
    json: 'JSON', yaml: 'YAML', dockerfile: 'Dockerfile', bash: 'Bash', xml: 'XML',
  }
  return labels[language.toLowerCase()] ?? language
}

function filenameFor(language: string) {
  const extensions: Record<string, string> = {
    csharp: 'cs', javascript: 'js', typescript: 'ts', sql: 'sql', json: 'json',
    yaml: 'yaml', dockerfile: 'Dockerfile', bash: 'sh', xml: 'xml',
  }
  const extension = extensions[language.toLowerCase()] ?? 'txt'
  return extension === 'Dockerfile' ? extension : `solution.${extension}`
}

function averageScore(attempt: CodingAttemptDto) {
  return Math.round((attempt.correctnessScore + attempt.readabilityScore + attempt.performanceScore + attempt.architectureScore) / 4)
}

export default function CodingPage() {
  const { t, locale } = useI18n()
  const queryClient = useQueryClient()
  const [routeParams, setRouteParams] = useSearchParams()
  const requestedQuestionId = routeParams.get('id')
  const [editorMinimap] = useLocalStorage('editor-minimap', true)
  const [editorWordWrap] = useLocalStorage('editor-word-wrap', true)
  const [editorFontSize] = useLocalStorage('editor-font-size', 14)
  const [selectedId, setSelectedId] = useState<string | null>(() => requestedQuestionId)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), 250)
  const [code, setCode] = useState('')
  const debouncedCode = useDebouncedValue(code, 650)
  const hydratedQuestionRef = useRef<string | null>(null)
  const revisionRef = useRef<Record<string, number>>({})
  const appliedRevisionRef = useRef<Record<string, number>>({})
  const startedRevisionRef = useRef<Record<string, number>>({})
  const persistedCodeRef = useRef<Record<string, string>>({})
  const startedAtRef = useRef(Date.now())
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>('saved')
  const [activeTab, setActiveTab] = useState<CodingTab>('problem')
  const [consoleOpen, setConsoleOpen] = useState(true)
  const [leftOpen, setLeftOpen] = useState(true)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewAttemptId, setReviewAttemptId] = useState<string | null>(null)
  const [editorFullscreen, setEditorFullscreen] = useState(false)
  const [runState, setRunState] = useState<RunState>('idle')

  const questionsQuery = useQuery({
    queryKey: queryKeys.coding.list(debouncedSearch),
    queryFn: () => api.coding.list<CodingQuestionSummaryDto[]>({ search: debouncedSearch || undefined }),
  })
  const questions = questionsQuery.data ?? EMPTY_QUESTIONS

  useEffect(() => {
    if (!selectedId && questions.length) setSelectedId(questions[0].id)
  }, [questions, selectedId])

  const questionQuery = useQuery({
    queryKey: queryKeys.coding.detail(selectedId ?? ''),
    queryFn: () => api.coding.get<CodingQuestionDetailDto>(selectedId!),
    enabled: Boolean(selectedId),
  })
  const question = questionQuery.data

  useEffect(() => {
    if (!question || hydratedQuestionRef.current === question.id) return
    hydratedQuestionRef.current = question.id
    startedAtRef.current = Date.now()
    const persistedCode = question.personalSolution.trim() ? question.personalSolution : question.starterCode
    persistedCodeRef.current[question.id] = persistedCode
    setCode(persistedCode)
    setDraftSaveState('saved')
    const latestAttempt = [...question.attempts].sort((a, b) => b.attemptNumber - a.attemptNumber)[0]
    setReviewAttemptId(latestAttempt?.id ?? null)
    setRunState('idle')
    setActiveTab('problem')
  }, [question])

  const updateDraft = useMutation({
    scope: { id: 'coding-draft-autosave' },
    mutationFn: ({ questionId, input }: {
      questionId: string
      input: UpdateCodingDraftInput
      revision: number
    }) => api.coding.updateDraft<CodingQuestionDetailDto>(questionId, input),
    onSuccess: (saved, variables) => {
      if (variables.revision >= (appliedRevisionRef.current[variables.questionId] ?? 0)) {
        appliedRevisionRef.current[variables.questionId] = variables.revision
        persistedCodeRef.current[variables.questionId] = saved.personalSolution.trim()
          ? saved.personalSolution
          : saved.starterCode
        queryClient.setQueryData<CodingQuestionDetailDto>(
          queryKeys.coding.detail(variables.questionId),
          (current) => {
            if (!current) return saved
            const attempts = [...saved.attempts]
            current.attempts.forEach((attempt) => {
              if (!attempts.some((candidate) => candidate.id === attempt.id)) attempts.push(attempt)
            })
            return { ...saved, attempts }
          },
        )
      }
      void queryClient.invalidateQueries({ queryKey: ['coding-questions', 'list'] })
      if (
        variables.questionId === hydratedQuestionRef.current
        && variables.revision === revisionRef.current[variables.questionId]
      ) {
        setDraftSaveState('saved')
      }
    },
    onError: (_error, variables) => {
      startedRevisionRef.current[variables.questionId] = variables.revision - 1
      if (
        variables.questionId === hydratedQuestionRef.current
        && variables.revision === revisionRef.current[variables.questionId]
      ) {
        setDraftSaveState('error')
      }
    },
  })

  useEffect(() => {
    if (!selectedId || hydratedQuestionRef.current !== selectedId || draftSaveState !== 'dirty') return
    const revision = revisionRef.current[selectedId] ?? 0
    if ((startedRevisionRef.current[selectedId] ?? -1) >= revision) return
    startedRevisionRef.current[selectedId] = revision
    setDraftSaveState('saving')
    updateDraft.mutate({
      questionId: selectedId,
      input: { personalSolution: debouncedCode },
      revision,
    })
    // Mutation state changes must not restart the debounce effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedCode, selectedId])

  useEffect(() => {
    if (!requestedQuestionId || requestedQuestionId === selectedId) return
    if (
      selectedId
      && hydratedQuestionRef.current === selectedId
      && (draftSaveState === 'dirty' || draftSaveState === 'error')
    ) {
      const revision = revisionRef.current[selectedId] ?? 0
      if ((startedRevisionRef.current[selectedId] ?? -1) < revision) {
        startedRevisionRef.current[selectedId] = revision
        updateDraft.mutate({
          questionId: selectedId,
          input: { personalSolution: code },
          revision,
        })
      }
    }
    hydratedQuestionRef.current = null
    setCode('')
    setSelectedId(requestedQuestionId)
    // The route effect only reacts to navigation; editor state is flushed from the current render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedQuestionId, selectedId])

  const submitAttempt = useMutation({
    mutationFn: ({ questionId, input }: { questionId: string; input: CreateCodingAttemptInput }) =>
      api.coding.submit<CodingAttemptDto>(questionId, input),
    onSuccess: (attempt, variables) => {
      queryClient.setQueryData<CodingQuestionDetailDto>(queryKeys.coding.detail(variables.questionId), (current) =>
        current ? {
          ...current,
          attempts: [...current.attempts.filter((item) => item.id !== attempt.id), attempt],
        } : current,
      )
      void queryClient.invalidateQueries({ queryKey: ['coding-questions', 'list'] })
      setReviewAttemptId(attempt.id)
      setReviewOpen(true)
      setRunState('submitted')
    },
    onError: () => {
      setConsoleOpen(true)
      setRunState('error')
    },
  })

  const detailWithSubmittedAttempt = questionQuery.data
  const reviewAttempt = detailWithSubmittedAttempt?.attempts.find((attempt) => attempt.id === reviewAttemptId)
    ?? [...(detailWithSubmittedAttempt?.attempts ?? [])].sort((a, b) => b.attemptNumber - a.attemptNumber)[0]

  const difficultyLabel = (difficulty: ApiDifficulty) => {
    if (difficulty === 'Easy') return t('Kolay', 'Easy')
    if (difficulty === 'Hard') return t('Zor', 'Hard')
    return t('Orta', 'Medium')
  }

  const tabLabel = (tab: CodingTab) => {
    if (tab === 'solution') return t('Çözüm', 'Solution')
    if (tab === 'attempts') return t('Denemeler', 'Attempts')
    return t('Soru', 'Problem')
  }

  const selectQuestion = (id: string) => {
    if (
      selectedId
      && hydratedQuestionRef.current === selectedId
      && (draftSaveState === 'dirty' || draftSaveState === 'error')
    ) {
      const revision = revisionRef.current[selectedId] ?? 0
      if ((startedRevisionRef.current[selectedId] ?? -1) < revision) {
        startedRevisionRef.current[selectedId] = revision
        updateDraft.mutate({
          questionId: selectedId,
          input: { personalSolution: code },
          revision,
        })
      }
    }
    hydratedQuestionRef.current = null
    setCode('')
    setSelectedId(id)
    setRouteParams({ id }, { replace: true })
    if (window.innerWidth < 1024) setLeftOpen(false)
  }

  const navigateQuestion = (direction: -1 | 1) => {
    if (!questions.length) return
    const currentIndex = questions.findIndex((item) => item.id === selectedId)
    const nextIndex = currentIndex < 0 ? 0 : Math.min(questions.length - 1, Math.max(0, currentIndex + direction))
    selectQuestion(questions[nextIndex].id)
  }

  const changeCode = (value: string) => {
    if (value === code) return
    setCode(value)
    if (selectedId && hydratedQuestionRef.current === selectedId) {
      revisionRef.current[selectedId] = (revisionRef.current[selectedId] ?? 0) + 1
      const hasInFlightSave = (startedRevisionRef.current[selectedId] ?? -1)
        > (appliedRevisionRef.current[selectedId] ?? -1)
      setDraftSaveState(
        value === persistedCodeRef.current[selectedId] && !hasInFlightSave ? 'saved' : 'dirty',
      )
    }
    setRunState('idle')
  }

  const resetCode = () => {
    if (question) changeCode(question.starterCode)
  }

  const handleSubmit = () => {
    if (!question || !code.trim() || submitAttempt.isPending) return
    if (draftSaveState === 'dirty' || draftSaveState === 'error') {
      const revision = revisionRef.current[question.id] ?? 0
      if ((startedRevisionRef.current[question.id] ?? -1) < revision) {
        startedRevisionRef.current[question.id] = revision
        setDraftSaveState('saving')
        updateDraft.mutate({
          questionId: question.id,
          input: { personalSolution: code },
          revision,
        })
      }
    }
    submitAttempt.mutate({
      questionId: question.id,
      input: {
        solution: code,
        language: question.language,
        durationMinutes: Math.max(1, Math.round((Date.now() - startedAtRef.current) / 60_000)),
        evaluation: null,
      },
    })
  }

  const solvedCount = questions.filter((item) => (item.bestCorrectnessScore ?? 0) >= 70).length

  return (
    <div className="relative flex h-[calc(100dvh-112px)] min-h-[640px] overflow-y-auto rounded-[22px] border border-border/70 bg-background shadow-soft sm:h-[calc(100dvh-128px)] lg:h-[calc(100dvh-136px)] xl:overflow-hidden">
      {leftOpen ? (
        <aside className="absolute inset-y-0 left-0 z-30 flex w-[280px] shrink-0 flex-col border-r border-border/70 bg-card shadow-float lg:static lg:bg-card/65 lg:shadow-none">
          <div className="flex h-16 items-center justify-between border-b border-border/70 px-4">
            <div><p className="text-sm font-semibold tracking-tight text-foreground">{t('Soru bankası', 'Question bank')}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{t(`${solvedCount} / ${questions.length} çözüldü`, `${solvedCount} of ${questions.length} solved`)}</p></div>
            <IconButton icon={PanelLeftClose} label={t('Soru bankasını gizle', 'Hide question bank')} onClick={() => setLeftOpen(false)} />
          </div>
          <div className="p-3">
            <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><span className="sr-only">{t('Soru ara', 'Search questions')}</span><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 w-full rounded-xl border border-border bg-background/75 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-ring/30" placeholder={t('Sorularda ara', 'Search questions')} /></label>
            <div className="mt-2 flex items-center justify-between px-1"><span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><ListFilter className="size-3" />{t('Tüm sorular', 'All challenges')}</span><span className="text-[11px] text-muted-foreground">{questions.length}</span></div>
          </div>
          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-4" aria-label={t('Kodlama soruları', 'Coding questions')}>
            {questionsQuery.isLoading ? [0, 1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-muted/60" />) : null}
            {questionsQuery.isError ? <div className="p-4 text-center"><p className="text-xs text-rose-600">{t('Sorular yüklenemedi.', 'Questions could not be loaded.')}</p><button type="button" onClick={() => questionsQuery.refetch()} className="mt-2 text-xs font-medium text-primary">{t('Yeniden dene', 'Try again')}</button></div> : null}
            {!questionsQuery.isLoading && !questionsQuery.isError && !questions.length ? <p className="p-5 text-center text-xs leading-5 text-muted-foreground">{search ? t('Aramayla eşleşen soru yok.', 'No questions match your search.') : t('Henüz kodlama sorusu yok.', 'There are no coding questions yet.')}</p> : null}
            {questions.map((item, index) => (
              <button key={item.id} type="button" onClick={() => selectQuestion(item.id)} className={cn('group w-full rounded-xl px-3 py-3 text-left transition', selectedId === item.id ? 'bg-primary/10' : 'hover:bg-muted/70')}>
                <div className="flex items-start gap-2.5"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">{(item.bestCorrectnessScore ?? 0) >= 70 ? <Check className="size-3 text-emerald-500" /> : index + 1}</span><div className="min-w-0 flex-1"><p className={cn('truncate text-xs font-medium', selectedId === item.id ? 'text-primary' : 'text-foreground')}>{item.title}</p><div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground"><span className={cn(item.difficulty === 'Easy' && 'text-emerald-600 dark:text-emerald-400', item.difficulty === 'Medium' && 'text-amber-600 dark:text-amber-400', item.difficulty === 'Hard' && 'text-rose-600 dark:text-rose-400')}>{difficultyLabel(item.difficulty)}</span><span>·</span><span className="truncate">{item.topicName ?? languageLabel(item.language)}</span></div></div></div>
              </button>
            ))}
          </nav>
          <div className="border-t border-border/70 p-4"><div className="mb-2 flex items-center justify-between text-[11px]"><span className="font-medium text-foreground">{t('Tamamlanma', 'Completion')}</span><span className="text-muted-foreground">{solvedCount} / {questions.length}</span></div><ProgressBar value={questions.length ? solvedCount / questions.length * 100 : 0} /></div>
        </aside>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col">
        {!selectedId && !questionsQuery.isLoading ? <div className="grid h-full place-items-center p-8 text-center"><div><Code2 className="mx-auto size-7 text-muted-foreground" /><h1 className="mt-3 text-sm font-semibold text-foreground">{t('Kodlama çalışma alanı', 'Coding workspace')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('Başlamak için veritabanına bir kodlama sorusu ekle.', 'Add a coding question to the database to get started.')}</p></div></div> : (
          <>
            <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-card/50 px-3 backdrop-blur-xl sm:px-5">
              <div className="flex min-w-0 items-center gap-2">
                {!leftOpen ? <IconButton icon={Code2} label={t('Soru bankasını göster', 'Show question bank')} onClick={() => setLeftOpen(true)} /> : null}
                <IconButton icon={ArrowLeft} label={t('Önceki soru', 'Previous question')} disabled={questions.findIndex((item) => item.id === selectedId) <= 0} onClick={() => navigateQuestion(-1)} />
                <IconButton icon={ArrowRight} label={t('Sonraki soru', 'Next question')} disabled={questions.findIndex((item) => item.id === selectedId) >= questions.length - 1} onClick={() => navigateQuestion(1)} />
                <div className="ml-1 min-w-0">{question ? <><div className="flex items-center gap-2"><h1 className="truncate text-sm font-semibold tracking-tight text-foreground">{question.title}</h1><StatusPill tone={difficultyTone(question.difficulty)}>{difficultyLabel(question.difficulty)}</StatusPill></div><p className="mt-0.5 text-[11px] text-muted-foreground">{languageLabel(question.language)} · {question.topicName ?? t('Genel', 'General')} · {t(`${question.attempts.length + 1}. deneme`, `Attempt ${question.attempts.length + 1}`)}</p></> : <div className="h-8 w-56 animate-pulse rounded bg-muted" />}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2"><span role="status" className={cn('hidden items-center gap-1.5 text-xs sm:flex', draftSaveState === 'error' ? 'text-rose-500' : draftSaveState === 'saved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>{draftSaveState === 'saving' ? <LoaderCircle className="size-3.5 animate-spin" /> : draftSaveState === 'saved' ? <Check className="size-3.5" /> : draftSaveState === 'error' ? <XCircle className="size-3.5" /> : <Clock3 className="size-3.5" />}{draftSaveState === 'saving' ? t('Kaydediliyor', 'Saving') : draftSaveState === 'saved' ? t('Kaydedildi', 'Saved') : draftSaveState === 'error' ? t('Kaydedilemedi', 'Save failed') : t('Kaydedilecek', 'Pending save')}</span><ActionButton icon={Play} disabled={!question || !code} onClick={() => { setConsoleOpen(true); setRunState('ready') }}>{t('Kontrol et', 'Check')}</ActionButton><ActionButton icon={submitAttempt.isPending ? LoaderCircle : Send} variant="primary" disabled={!question || !code.trim() || submitAttempt.isPending} onClick={handleSubmit}>{submitAttempt.isPending ? t('Gönderiliyor', 'Submitting') : t('Gönder', 'Submit')}</ActionButton></div>
            </header>

            {questionQuery.isError ? <div className="grid min-h-0 flex-1 place-items-center p-8 text-center"><div><p className="text-sm font-semibold text-foreground">{t('Soru yüklenemedi', 'Question could not be loaded')}</p><ActionButton className="mt-3" onClick={() => questionQuery.refetch()}>{t('Yeniden dene', 'Try again')}</ActionButton></div></div> : !question ? <div className="min-h-0 flex-1 animate-pulse bg-muted/20" /> : (
              <div className="relative flex min-h-0 flex-1 flex-col xl:flex-row">
                <section className="flex min-h-[300px] w-full shrink-0 flex-col border-b border-border/70 xl:w-[38%] xl:border-b-0 xl:border-r">
                  <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border/70 px-3">{(['problem', 'solution', 'attempts'] as const).map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={cn('h-8 rounded-lg px-3 text-xs font-medium transition', activeTab === tab ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')}>{tabLabel(tab)}{tab === 'attempts' ? ` (${question.attempts.length})` : ''}</button>)}</div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-5 lg:p-6">
                    {activeTab === 'problem' ? (
                      <div className="space-y-6"><div><div className="mb-3 flex flex-wrap items-center gap-2"><StatusPill tone={difficultyTone(question.difficulty)}>{difficultyLabel(question.difficulty)}</StatusPill>{question.tags.map((tag) => <StatusPill key={tag}>{tag}</StatusPill>)}</div><h2 className="text-xl font-semibold tracking-[-0.025em] text-foreground">{question.title}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{question.description}</p></div><div className="rounded-2xl border border-border bg-muted/35 p-4"><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('Beklenti', 'Expectation')}</p><p className="mt-2 text-xs leading-5 text-foreground">{t('Çözümünü okunabilir, test edilebilir ve performans etkilerini açıklayabilecek şekilde hazırla.', 'Prepare a readable, testable solution and be ready to explain its performance implications.')}</p></div><button type="button" onClick={() => setActiveTab('solution')} className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 text-left transition hover:bg-primary/10"><Lightbulb className="size-5 text-primary" /><span><span className="block text-xs font-semibold text-foreground">{t('Çözümü karşılaştırmak ister misin?', 'Want to compare solutions?')}</span><span className="mt-0.5 block text-[11px] text-muted-foreground">{question.attempts.length ? t('Beklenen çözümü görüntüle', 'View the expected solution') : t('Önce kendi denemeni gönder', 'Submit your own attempt first')}</span></span></button></div>
                    ) : activeTab === 'solution' ? (
                      question.attempts.length ? <div className="space-y-4"><StatusPill tone="purple">{t('Beklenen çözüm', 'Expected solution')}</StatusPill><h2 className="text-lg font-semibold text-foreground">{t('Çözüm yaklaşımı', 'Solution approach')}</h2><pre className="overflow-x-auto rounded-2xl border border-border bg-[#101114] p-4 text-xs leading-6 text-white"><code>{question.expectedSolution}</code></pre></div> : <div className="grid min-h-56 place-items-center text-center"><div><Lightbulb className="mx-auto size-6 text-muted-foreground" /><h2 className="mt-3 text-sm font-semibold text-foreground">{t('Çözüm henüz kilitli', 'Solution is still locked')}</h2><p className="mt-1 text-xs text-muted-foreground">{t('Beklenen çözümü görmek için önce bir deneme gönder.', 'Submit an attempt before viewing the expected solution.')}</p></div></div>
                    ) : (
                      <div className="space-y-3">{question.attempts.length ? [...question.attempts].sort((a, b) => b.attemptNumber - a.attemptNumber).map((attempt) => <button key={attempt.id} type="button" onClick={() => { setReviewAttemptId(attempt.id); setReviewOpen(true) }} className="w-full text-left"><Panel className="flex items-center justify-between p-4 transition hover:border-primary/30"><div><p className="text-xs font-semibold text-foreground">{t(`${attempt.attemptNumber}. deneme`, `Attempt ${attempt.attemptNumber}`)}</p><p className="mt-1 text-[11px] text-muted-foreground">{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(attempt.submittedAtUtc))} · {attempt.durationMinutes} {t('dk', 'min')}</p></div><StatusPill tone={averageScore(attempt) >= 80 ? 'success' : averageScore(attempt) >= 60 ? 'warning' : 'danger'}>%{averageScore(attempt)}</StatusPill></Panel></button>) : <p className="py-12 text-center text-sm text-muted-foreground">{t('Henüz deneme gönderilmedi.', 'No attempts have been submitted yet.')}</p>}</div>
                    )}
                  </div>
                </section>

                <section className={cn('flex min-h-[430px] min-w-0 flex-1 flex-col bg-[#101114] text-white', editorFullscreen && 'fixed inset-3 z-50 rounded-2xl shadow-2xl')}>
                  <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-3"><div className="flex items-center gap-2"><FileCode2 className="size-4 text-sky-400" /><span className="text-xs font-medium text-white/90">{filenameFor(question.language)}</span><span className={cn('size-1.5 rounded-full', draftSaveState === 'saved' ? 'bg-emerald-400' : draftSaveState === 'error' ? 'bg-rose-400' : 'bg-amber-400')} /></div><div className="flex items-center gap-1"><span className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] text-white/60">{languageLabel(question.language)}<ChevronDown className="size-3" /></span><button type="button" className="grid size-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white" aria-label={t('Kodu kopyala', 'Copy code')} onClick={() => void navigator.clipboard.writeText(code)}><Copy className="size-3.5" /></button><button type="button" className="grid size-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white" aria-label={t('Kodu sıfırla', 'Reset code')} onClick={resetCode}><RotateCcw className="size-3.5" /></button><button type="button" className="grid size-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white" aria-label={editorFullscreen ? t('Tam ekrandan çık', 'Exit fullscreen') : t('Düzenleyiciyi tam ekran yap', 'Fullscreen editor')} onClick={() => setEditorFullscreen((current) => !current)}><Expand className="size-3.5" /></button></div></div>
                  <div className="min-h-0 flex-1"><Editor height="100%" language={question.language} theme="vs-dark" value={code} onChange={(value) => changeCode(value ?? '')} options={{ fontSize: editorFontSize, lineHeight: Math.round(editorFontSize * 1.65), fontFamily: "'SFMono-Regular', Consolas, monospace", minimap: { enabled: editorMinimap }, scrollBeyondLastLine: false, padding: { top: 16 }, wordWrap: editorWordWrap ? 'on' : 'off', smoothScrolling: true, cursorSmoothCaretAnimation: 'on', renderLineHighlight: 'all', automaticLayout: true }} /></div>
                  <div className={cn('shrink-0 border-t border-white/10 bg-[#0c0d10] transition-all', consoleOpen ? 'h-32' : 'h-10')}><button type="button" onClick={() => setConsoleOpen((open) => !open)} className="flex h-10 w-full items-center justify-between px-4 text-[11px] font-medium text-white/60 hover:text-white"><span className="inline-flex items-center gap-2"><TerminalSquare className="size-3.5" />{t('Değerlendirme durumu', 'Evaluation status')}</span><span>{runState === 'submitted' ? t('Gönderildi', 'Submitted') : runState === 'ready' ? t('Göndermeye hazır', 'Ready to submit') : runState === 'error' ? t('Hata', 'Error') : t('Hazır', 'Ready')}</span></button>{consoleOpen ? <div className="px-4 pb-3 font-mono text-[11px] leading-5"><p className={runState === 'error' ? 'text-rose-400' : runState === 'submitted' ? 'text-emerald-400' : 'text-white/45'}>{runState === 'error' ? t('Çözüm kaydedilemedi. API bağlantısını kontrol edip yeniden dene.', 'The solution could not be saved. Check the API connection and try again.') : runState === 'submitted' ? t('Çözüm veritabanına kaydedildi ve değerlendirme tamamlandı.', 'The solution was saved to the database and evaluated.') : runState === 'ready' ? t('Kod hazır. Sunucu değerlendirmesi için “Gönder” düğmesini kullan.', 'The code is ready. Use “Submit” for server evaluation.') : t('Kodunu düzenle ve hazır olduğunda gönder.', 'Edit your code and submit it when ready.')}</p></div> : null}</div>
                </section>

                {reviewOpen ? (
                  <aside className="absolute inset-y-0 right-0 z-20 flex w-[300px] shrink-0 flex-col border-l border-border/70 bg-card/95 shadow-float 2xl:static 2xl:bg-card/90 2xl:shadow-none">
                    <div className="flex h-12 items-center justify-between border-b border-border/70 px-4"><span className="inline-flex items-center gap-2 text-xs font-semibold text-foreground"><Sparkles className="size-3.5 text-primary" />{t('AI değerlendirmesi', 'AI review')}</span><IconButton icon={XCircle} label={t('AI değerlendirmesini kapat', 'Close AI review')} className="size-8 border-transparent" onClick={() => setReviewOpen(false)} /></div>
                    {reviewAttempt ? <><div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4"><div className="rounded-2xl bg-gradient-to-br from-primary/[.12] to-violet-500/[.08] p-4 ring-1 ring-inset ring-primary/15"><div className="flex items-center justify-between"><div><p className="text-[11px] font-medium text-muted-foreground">{t('Genel puan', 'Overall score')}</p><p className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-foreground">{averageScore(reviewAttempt)}<span className="text-base text-muted-foreground">/100</span></p></div><Zap className="size-6 text-primary" /></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{reviewAttempt.interviewFeedback || t('Değerlendirme kaydedildi.', 'The evaluation has been saved.')}</p></div><div className="space-y-3">{[{ tr: 'Doğruluk', en: 'Correctness', value: reviewAttempt.correctnessScore }, { tr: 'Okunabilirlik', en: 'Readability', value: reviewAttempt.readabilityScore }, { tr: 'Performans', en: 'Performance', value: reviewAttempt.performanceScore }, { tr: 'Mimari', en: 'Architecture', value: reviewAttempt.architectureScore }].map((metric) => <div key={metric.en}><div className="mb-1.5 flex justify-between text-[11px]"><span className="text-muted-foreground">{t(metric.tr, metric.en)}</span><span className="font-semibold text-foreground">{metric.value}</span></div><ProgressBar value={metric.value} /></div>)}</div>{reviewAttempt.bestPracticesFeedback ? <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('En iyi uygulamalar', 'Best practices')}</p><Panel className="p-3.5"><p className="whitespace-pre-wrap text-xs leading-5 text-foreground">{reviewAttempt.bestPracticesFeedback}</p></Panel></div> : null}{reviewAttempt.followUpQuestions ? <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('Takip soruları', 'Follow-up questions')}</p><Panel className="p-3.5"><p className="whitespace-pre-wrap text-xs leading-5 text-foreground">{reviewAttempt.followUpQuestions}</p></Panel></div> : null}{reviewAttempt.seniorLevelImprovements ? <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('Senior seviye iyileştirmeler', 'Senior-level improvements')}</p><Panel className="p-3.5"><p className="whitespace-pre-wrap text-xs leading-5 text-foreground">{reviewAttempt.seniorLevelImprovements}</p></Panel></div> : null}</div><div className="border-t border-border/70 p-3"><ActionButton icon={Bot} className="w-full" variant="primary">{t('AI koçuyla tartış', 'Discuss with AI coach')}</ActionButton></div></> : <div className="grid flex-1 place-items-center p-6 text-center"><div><Sparkles className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 text-xs text-muted-foreground">{t('AI değerlendirmesini görmek için bir çözüm gönder.', 'Submit a solution to see its AI review.')}</p></div></div>}
                  </aside>
                ) : null}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export { CodingPage }
