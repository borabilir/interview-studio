import { motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  Braces,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Flame,
  GitBranch,
  Layers3,
  MoreHorizontal,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Progress } from '../components/ui/Progress'
import { cn } from '../lib/cn'
import { api } from '../services/api'
import { useI18n } from '../i18n'

type DashboardApiDto = {
  todayStudyPlan: Array<{
    id: string
    title: string
    status: string
    plannedMinutes: number
    actualMinutes: number
    items: Array<{
      id: string
      title: string
      activityType: string
      topicName?: string | null
      plannedMinutes: number
      isCompleted: boolean
    }>
  }>
  recentNotes: Array<{
    id: string
    title: string
    topicName?: string | null
    isPinned: boolean
    updatedAtUtc: string
  }>
  upcomingReviewCards: Array<{
    id: string
    question: string
    topicName?: string | null
    difficulty: string
    nextReviewAtUtc: string
  }>
  studyStreak: number
  confidenceScore: number
  weakTopics: Array<{
    id: string
    name: string
    category: string
    progress: number
    confidenceLevel: number
    priority: string
  }>
  recentlySolvedCodingQuestions: Array<{
    id: string
    codingQuestionId: string
    title: string
    language: string
    difficulty: string
    correctnessScore: number
    submittedAtUtc: string
  }>
  recentAiFeedback: Array<{
    id: string
    kind: string
    title: string
    feedback: string
    createdAtUtc: string
  }>
  totals: {
    topics: number
    notes: number
    questionsSolved: number
    reviewCardsDue: number
    minutesStudiedThisWeek: number
  }
}

type ProgressPointDto = {
  dateUtc: string
  value: number
}

type ProgressOverviewDto = {
  confidenceHistory: ProgressPointDto[]
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remaining = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remaining}`
}

function MetricCard({ icon: Icon, label, value, detail, accent }: { icon: typeof Flame; label: string; value: string; detail: string; accent?: boolean }) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }} className="surface flex min-w-0 items-center gap-3.5 px-4 py-4 sm:px-5">
      <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', accent ? 'bg-accent/10 text-accent' : 'bg-canvas text-muted')}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <strong className="text-xl font-semibold tracking-[-0.045em]">{value}</strong>
          <span className="truncate text-[10px] font-medium text-success">{detail}</span>
        </div>
        <p className="truncate text-[11px] text-muted">{label}</p>
      </div>
    </motion.div>
  )
}

function FocusPlan({ plan, onToggle, updatingItemId }: {
  plan?: DashboardApiDto['todayStudyPlan'][number]
  onToggle: (planId: string, itemId: string, isCompleted: boolean) => void
  updatingItemId?: string
}) {
  const { t } = useI18n()
  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const items = plan?.items ?? []
  const completeCount = items.filter((item) => item.isCompleted).length
  const completion = items.length ? (completeCount / items.length) * 100 : 0

  useEffect(() => {
    if (!running || seconds <= 0) return
    const interval = window.setInterval(() => setSeconds((value) => value - 1), 1000)
    return () => window.clearInterval(interval)
  }, [running, seconds])

  return (
    <section className="surface overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b px-5 py-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-[-0.025em]">{t('Bugünün odağı', 'Today’s focus')}</h2>
            <Badge tone="accent">{t(`${completeCount} / ${items.length}`, `${completeCount} of ${items.length}`)}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted">{plan ? t(`${plan.plannedMinutes} dakika planlandı · dengeli çalışma`, `${plan.plannedMinutes} minutes planned · balanced workload`) : t('Bugün için çalışma planı yok', 'No study plan for today')}</p>
        </div>
        <div className="hidden w-28 sm:block"><Progress value={completion} /></div>
        <Button
          variant={running ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => setRunning((value) => !value)}
          icon={running ? <Timer className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
        >
          {running ? formatTimer(seconds) : t('Odağı başlat', 'Start focus')}
        </Button>
      </div>
      <div className="divide-y">
        {items.map((item, index) => {
          const activityLabel = item.activityType === 'CodingQuestion'
            ? t('Pratik', 'Practice')
            : item.activityType === 'Flashcard'
              ? t('Tekrar', 'Review')
              : t('Öğren', 'Learn')
          return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.045 }}
            className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-canvas/65 sm:px-6"
          >
            <button
              onClick={() => plan && onToggle(plan.id, item.id, !item.isCompleted)}
              disabled={updatingItemId === item.id}
              className={cn('focus-ring grid h-[21px] w-[21px] shrink-0 place-items-center rounded-full border transition disabled:opacity-50', item.isCompleted ? 'border-success bg-success text-white' : 'hover:border-accent')}
              aria-label={item.isCompleted ? t(`${item.title} görevini tamamlanmadı olarak işaretle`, `Mark ${item.title} incomplete`) : t(`${item.title} görevini tamamla`, `Complete ${item.title}`)}
            >
              {item.isCompleted ? <Check className="h-3 w-3" strokeWidth={3} /> : <Circle className="h-2 w-2 fill-transparent stroke-transparent" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className={cn('truncate text-[13px] font-medium transition', item.isCompleted && 'text-muted line-through decoration-muted/40')}>{item.title}</p>
              <p className="mt-0.5 truncate text-[10px] text-muted">{item.topicName ?? item.activityType}</p>
            </div>
            <Badge tone={item.activityType === 'CodingQuestion' ? 'purple' : item.activityType === 'Topic' ? 'accent' : 'neutral'} className="hidden sm:inline-flex">{activityLabel}</Badge>
            <span className="flex w-12 items-center justify-end gap-1 text-[10px] tabular-nums text-muted"><Clock3 className="h-3 w-3" /> {item.plannedMinutes}{t('dk', 'm')}</span>
            <button aria-label={t('Görev seçenekleri', 'Task options')} className="focus-ring rounded-lg p-1 text-muted opacity-0 transition group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></button>
          </motion.div>
          )
        })}
        {items.length === 0 && <div className="px-6 py-10 text-center text-sm text-muted">{t('Bugün için planlanmış görev bulunmuyor.', 'There are no planned tasks for today.')}</div>}
      </div>
      <div className="flex items-center justify-between border-t bg-canvas/45 px-5 py-3 sm:px-6">
        <span className="text-[10px] text-muted">{t('AI bu planı son deneme mülakatına göre düzenledi', 'AI adjusted this plan from your last mock interview')}</span>
        <Link to="/study-plan" className="focus-ring rounded text-[11px] font-semibold text-ink hover:text-accent">{t('Planı görüntüle', 'View plan')}</Link>
      </div>
    </section>
  )
}

function AICoachCard({ insight }: { insight?: DashboardApiDto['recentAiFeedback'][number] }) {
  const { t } = useI18n()
  return (
    <section className="relative min-h-[365px] overflow-hidden rounded-2xl border border-[#33312e] bg-[#242321] p-6 text-[#f5f1e9] shadow-soft dark:border-line">
      <div className="dot-grid absolute inset-0 opacity-20" />
      <div className="absolute -right-14 -top-16 h-52 w-52 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.07]"><Sparkles className="h-4 w-4 text-[#ec8068]" /></span>
          <Badge className="border-white/10 bg-white/[0.06] text-white/55">AI KOÇU</Badge>
        </div>
        <div className="mt-8">
          <p className="text-[11px] font-medium text-white/45">{insight?.kind ?? t('Geliştirilmeye değer bir örüntü', 'A pattern worth fixing')}</p>
          <h2 className="mt-2 max-w-[290px] text-[23px] font-medium leading-[1.2] tracking-[-0.045em]">{insight?.title ?? t('Cevabı biliyorsun. Şimdi daha net anlat.', 'You know the answer. Now make it sharper.')}</h2>
          <p className="mt-3 max-w-[310px] text-[12px] leading-relaxed text-white/55">
            {insight?.feedback ?? t('Teknik içeriğin güçlü; ancak implementation detayından önce trade-off’u söylemen cevabı daha kıdemli gösterecek.', 'Your technical content is strong; lead with the trade-off before implementation details to make the answer more senior.')}
          </p>
        </div>
        <div className="mt-auto pt-7">
          <div className="mb-4 flex gap-2">
            {[t('Yapı', 'Structure'), t('İletişim', 'Communication')].map((item) => <span key={item} className="rounded-md bg-white/[0.07] px-2 py-1 text-[10px] text-white/60">{item}</span>)}
          </div>
          <Link to="/mock-interviews" className="focus-ring inline-flex h-9 items-center gap-2 rounded-xl bg-[#f5f1e9] px-3.5 text-xs font-semibold text-[#252421] transition hover:bg-white">
            {t('Bu beceriyi çalış', 'Practice this skill')} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function ConfidenceChart({ value, history }: { value: number; history: ProgressPointDto[] }) {
  const { t, locale } = useI18n()
  const [periodWeeks, setPeriodWeeks] = useState<6 | 12>(6)
  const visibleHistory = history.filter((point) => {
    const cutoff = Date.now() - periodWeeks * 7 * 86_400_000
    return new Date(point.dateUtc).getTime() >= cutoff
  })
  const width = 294
  const height = 90
  const chartPoints = visibleHistory.map((point, index) => {
    const x = visibleHistory.length === 1 ? width / 2 : (index / (visibleHistory.length - 1)) * width
    const normalized = Math.min(100, Math.max(0, point.value))
    const y = height - 6 - (normalized / 100) * (height - 12)
    return { ...point, x, y }
  })
  const points = chartPoints.map((point) => `${point.x},${point.y}`).join(' ')
  const firstPoint = chartPoints[0]
  const middlePoint = chartPoints[Math.floor((chartPoints.length - 1) / 2)]
  const lastPoint = chartPoints.at(-1)
  return (
    <section className="surface flex min-h-[245px] flex-col p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow">{t('Özgüven', 'Confidence')}</p>
          <div className="mt-2 flex items-end gap-2"><strong className="text-3xl font-semibold tracking-[-0.055em]">{Math.round(value)}%</strong><span className="mb-1 flex items-center text-[10px] font-semibold text-success"><TrendingUp className="mr-0.5 h-3 w-3" /> {t('Güncel', 'Live')}</span></div>
        </div>
        <select value={periodWeeks} onChange={(event) => setPeriodWeeks(Number(event.target.value) as 6 | 12)} aria-label={t('Özgüven dönemi', 'Confidence period')} className="focus-ring rounded-lg border bg-canvas px-2 py-1 text-[10px] text-muted"><option value={6}>{t('6 hafta', '6 weeks')}</option><option value={12}>{t('12 hafta', '12 weeks')}</option></select>
      </div>
      {chartPoints.length ? <><div className="relative mt-auto h-[110px] w-full pt-4">
        <div className="absolute inset-x-0 top-[34px] border-t border-dashed" />
        <div className="absolute inset-x-0 top-[72px] border-t border-dashed" />
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="relative h-full w-full overflow-visible" aria-label={t(`${periodWeeks} haftalık özgüven değişimi`, `Confidence change over ${periodWeeks} weeks`)}>
          <defs>
            <linearGradient id="confidence-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgb(var(--accent))" stopOpacity=".19" /><stop offset="1" stopColor="rgb(var(--accent))" stopOpacity="0" /></linearGradient>
          </defs>
          <path d={`M ${points} L ${lastPoint!.x},${height} L ${firstPoint!.x},${height} Z`} fill="url(#confidence-fill)" />
          <polyline points={points} fill="none" stroke="rgb(var(--accent))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <circle cx={lastPoint!.x} cy={lastPoint!.y} r="4" fill="rgb(var(--panel))" stroke="rgb(var(--accent))" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-muted/70"><span>{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(firstPoint!.dateUtc))}</span>{middlePoint && middlePoint !== firstPoint && middlePoint !== lastPoint ? <span>{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(middlePoint.dateUtc))}</span> : null}<span>{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(lastPoint!.dateUtc))}</span></div></> : <div className="grid flex-1 place-items-center text-center text-xs text-muted">{t('Bu dönem için özgüven kaydı yok.', 'No confidence entries for this period.')}</div>}
    </section>
  )
}

function WeakTopicsCard({ topics }: { topics: DashboardApiDto['weakTopics'] }) {
  const { t } = useI18n()
  const colors = ['bg-amber-500', 'bg-violet-500', 'bg-sky-500']
  const priorityLabel = (priority: string) => ({
    Low: t('Düşük', 'Low'),
    Medium: t('Orta', 'Medium'),
    High: t('Yüksek', 'High'),
    Critical: t('Kritik', 'Critical'),
  })[priority] ?? priority
  return (
    <section className="surface min-h-[245px] p-5">
      <div className="flex items-center justify-between">
        <div><p className="eyebrow">{t('Dikkat gerekiyor', 'Needs attention')}</p><h3 className="mt-1 text-sm font-semibold">{t('Zayıf konular', 'Weak topics')}</h3></div>
        <Link to="/topics" className="focus-ring rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"><ChevronRight className="h-4 w-4" /></Link>
      </div>
      <div className="mt-5 space-y-4">
        {topics.slice(0, 3).map((topic, index) => (
          <div key={topic.id}>
            <div className="mb-1.5 flex items-center text-xs"><span className={cn('mr-2 h-2 w-2 rounded-full', colors[index % colors.length])} /><span className="font-medium">{topic.name}</span><span className="ml-auto tabular-nums text-muted">{topic.confidenceLevel}%</span><span className="ml-2 text-[9px] font-semibold text-success">{priorityLabel(topic.priority)}</span></div>
            <Progress value={topic.confidenceLevel} className="h-1" indicatorClassName={colors[index % colors.length]} />
          </div>
        ))}
        {topics.length === 0 && <p className="py-5 text-center text-xs text-muted">{t('Zayıf konu bulunmuyor.', 'No weak topics found.')}</p>}
      </div>
      <div className="mt-5 rounded-xl bg-canvas px-3 py-2.5 text-[10px] leading-relaxed text-muted"><Zap className="mr-1 inline h-3 w-3 text-accent" /> {t('İki odaklı oturum en zayıf konunu hedef seviyeye yaklaştırabilir.', 'Two focused sessions could move your weakest topic closer to its target.')}</div>
    </section>
  )
}

function RecentNotesCard({ notes }: { notes: DashboardApiDto['recentNotes'] }) {
  const { t, locale } = useI18n()
  const colors = ['bg-[#e06852]', 'bg-[#7c70b5]', 'bg-[#4d8c75]']
  return (
    <section className="surface min-h-[245px] overflow-hidden">
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <div><p className="eyebrow">{t('Bilgi tabanı', 'Knowledge base')}</p><h3 className="mt-1 text-sm font-semibold">{t('Son notlar', 'Recent notes')}</h3></div>
        <Link to="/notes" className="text-[10px] font-semibold text-muted transition hover:text-ink">{t('Tümünü gör', 'View all')}</Link>
      </div>
      <div className="divide-y">
        {notes.slice(0, 3).map((note, index) => (
          <Link key={note.id} to={`/notes?note=${note.id}`} className="group flex items-center gap-3 px-5 py-3 transition hover:bg-canvas/70">
            <span className={cn('h-9 w-1 rounded-full', colors[index % colors.length])} />
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium group-hover:text-accent">{note.title}</span><span className="mt-0.5 block text-[9px] text-muted">{note.topicName ?? t('Genel', 'General')}</span></span>
            <span className="text-[9px] text-muted">{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(note.updatedAtUtc))}</span>
          </Link>
        ))}
        {notes.length === 0 && <div className="px-5 py-8 text-center text-xs text-muted">{t('Henüz not yok.', 'No notes yet.')}</div>}
      </div>
    </section>
  )
}

function RecentActivity({ coding, feedback }: { coding: DashboardApiDto['recentlySolvedCodingQuestions']; feedback: DashboardApiDto['recentAiFeedback'] }) {
  const { t, locale } = useI18n()
  const feedbackKind = (kind: string) => ({
    'Mock interview': t('Deneme mülakatı', 'Mock interview'),
    'Code review': t('Kod değerlendirmesi', 'Code review'),
  })[kind] ?? kind
  const activity = [
    ...coding.slice(0, 2).map((item) => ({ icon: Braces, title: item.title, detail: t(`${item.correctnessScore}% AI puanı · ${item.language}`, `${item.correctnessScore}% AI score · ${item.language}`), date: item.submittedAtUtc, tone: 'text-violet-500 bg-violet-500/10' })),
    ...feedback.slice(0, 1).map((item) => ({ icon: GitBranch, title: item.title, detail: feedbackKind(item.kind), date: item.createdAtUtc, tone: 'text-success bg-success/10' })),
  ]
  return (
    <section className="surface p-5">
      <div className="flex items-center justify-between"><div><p className="eyebrow">{t('Son çalışmalar', 'Latest work')}</p><h3 className="mt-1 text-sm font-semibold">{t('Son aktiviteler', 'Recent activity')}</h3></div><RotateCcw className="h-3.5 w-3.5 text-muted" /></div>
      <div className="mt-4 space-y-1">
        {activity.map((item) => (
          <div key={item.title} className="flex items-center gap-3 rounded-xl py-2.5">
            <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', item.tone)}><item.icon className="h-3.5 w-3.5" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{item.title}</span><span className="block truncate text-[9px] text-muted">{item.detail}</span></span>
            <span className="text-[9px] text-muted">{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(item.date))}</span>
          </div>
        ))}
      </div>
      {activity.length === 0 && <p className="py-8 text-center text-xs text-muted">{t('Henüz aktivite yok.', 'No activity yet.')}</p>}
    </section>
  )
}

export function DashboardPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const { data: liveDashboard, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.dashboard.get<DashboardApiDto>(),
  })
  const { data: progressOverview } = useQuery({
    queryKey: ['progress', 'overview'],
    queryFn: () => api.progress.overview<ProgressOverviewDto>(),
  })
  const updatePlanItem = useMutation({
    mutationFn: ({ planId, itemId, isCompleted }: { planId: string; itemId: string; isCompleted: boolean }) =>
      api.studyPlans.updateItem(planId, itemId, { isCompleted }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['study-plans'] }),
      ])
    },
  })
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    return hour < 12 ? t('Günaydın', 'Good morning') : hour < 18 ? t('İyi günler', 'Good afternoon') : t('İyi akşamlar', 'Good evening')
  }, [t])

  if (isLoading) return <div className="h-96 animate-pulse rounded-3xl bg-muted" aria-label={t('Dashboard yükleniyor', 'Loading dashboard')} />
  if (isError || !liveDashboard) return <div className="surface grid min-h-80 place-items-center p-8 text-center"><div><h2 className="text-lg font-semibold">{t('Veritabanına ulaşılamadı', 'Database unavailable')}</h2><p className="mt-2 text-sm text-muted">{t('API’yi npm run dev:api komutuyla başlatıp tekrar dene.', 'Start the API with npm run dev:api and try again.')}</p></div></div>

  const confidence = Math.round(liveDashboard.confidenceScore)

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-xs font-medium text-muted">{greeting}, Bora</p>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.055em] sm:text-[34px]">{t('Bugünü değerlendir.', 'Make today count.')}</h2>
          <p className="mt-2 max-w-xl text-[13px] text-muted">{t('Senior backend mülakatın için doğru yoldasın. Bir odaklı oturum ivmeni koruyacak.', 'You’re on track for your senior backend interview. One focused session will keep the momentum going.')}</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border bg-panel px-3 py-2 shadow-sm">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent/10 text-accent"><Target className="h-3.5 w-3.5" /></span>
          <div className="pr-1"><p className="text-[9px] text-muted">{t('Mülakat hazırlığı', 'Interview readiness')}</p><p className="text-xs font-semibold">{confidence >= 70 ? t('Güçlü', 'Strong') : confidence >= 50 ? t('Gelişiyor', 'Developing') : t('Odak gerekli', 'Needs focus')} · {confidence}%</p></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard icon={Flame} label={t('Çalışma serisi', 'Study streak')} value={t(`${liveDashboard.studyStreak} gün`, `${liveDashboard.studyStreak} days`)} detail={t('Kişisel rekor', 'Personal best')} accent />
        <MetricCard icon={Target} label={t('Genel özgüven', 'Overall confidence')} value={`${confidence}%`} detail={t('Güncel skor', 'Current score')} />
        <MetricCard icon={BookOpen} label={t('Bugün bekleyen kartlar', 'Cards due today')} value={`${liveDashboard.totals.reviewCardsDue}`} detail={t('Tekrar kuyruğu', 'Review queue')} />
        <MetricCard icon={Timer} label={t('Bu haftaki odak', 'Focused this week')} value={t(`${(liveDashboard.totals.minutesStudiedThisWeek / 60).toFixed(1)}sa`, `${(liveDashboard.totals.minutesStudiedThisWeek / 60).toFixed(1)}h`)} detail={t('DB’den güncel', 'Live from DB')} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.75fr)_minmax(310px,0.75fr)]">
        <FocusPlan
          plan={liveDashboard.todayStudyPlan[0]}
          onToggle={(planId, itemId, isCompleted) => updatePlanItem.mutate({ planId, itemId, isCompleted })}
          updatingItemId={updatePlanItem.variables?.itemId}
        />
        <AICoachCard insight={liveDashboard.recentAiFeedback[0]} />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <ConfidenceChart value={liveDashboard.confidenceScore} history={progressOverview?.confidenceHistory ?? []} />
        <WeakTopicsCard topics={liveDashboard.weakTopics} />
        <RecentNotesCard notes={liveDashboard.recentNotes} />
        <RecentActivity coding={liveDashboard.recentlySolvedCodingQuestions} feedback={liveDashboard.recentAiFeedback} />
      </div>

      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-dashed bg-panel/50 px-5 py-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-success/10 text-success"><Layers3 className="h-4 w-4" /></span><div><p className="text-xs font-semibold">{t('Haftalık hedef: ilerlemeyi sürdür', 'Weekly target: keep progressing')}</p><p className="text-[10px] text-muted">{t(`${liveDashboard.totals.questionsSolved} coding sorusu · ${liveDashboard.totals.notes} not · ${liveDashboard.totals.minutesStudiedThisWeek} dakika`, `${liveDashboard.totals.questionsSolved} coding questions · ${liveDashboard.totals.notes} notes · ${liveDashboard.totals.minutesStudiedThisWeek} minutes`)}</p></div></div>
        <Link to="/progress" className="focus-ring flex items-center gap-1 rounded-lg text-[11px] font-semibold text-muted hover:text-ink">{t('Haftalık raporu gör', 'See weekly report')} <ChevronRight className="h-3 w-3" /></Link>
      </div>
    </div>
  )
}
