import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Code2,
  Flame,
  MessageSquareText,
  Plus,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import {
  ActionButton,
  EmptyState,
  MetricCard,
  PageHeader,
  Panel,
  ProgressBar,
  ProgressRing,
  StatusPill,
} from "../components/features/FeaturePrimitives";
import { useI18n } from "../i18n";
import { api } from "../services/api";

type ProgressEntryDto = {
  id: string;
  activityDateUtc: string;
  minutesStudied: number;
  questionsSolved: number;
  codingAttempts: number;
  mockInterviews: number;
  confidenceScore: number;
  topicId?: string | null;
  topicName?: string | null;
  createdAtUtc: string;
};

type ProgressPointDto = { dateUtc: string; value: number };
type TopicProgressDto = { topicId: string; name: string; progress: number; confidence: number; studiedHours: number };
type ProgressOverviewDto = {
  totals: {
    completedTopics: number;
    hoursStudied: number;
    questionsSolved: number;
    codingAttempts: number;
    mockInterviews: number;
    averageConfidence: number;
  };
  weeklyMinutes: ProgressPointDto[];
  monthlyQuestions: ProgressPointDto[];
  confidenceHistory: ProgressPointDto[];
  strongestTopics: TopicProgressDto[];
  weakestTopics: TopicProgressDto[];
  completedTopicIds: string[];
};

type ProgressDraft = {
  minutesStudied: number;
  questionsSolved: number;
  codingAttempts: number;
  mockInterviews: number;
  confidenceScore: number;
};

const initialDraft: ProgressDraft = {
  minutesStudied: 30,
  questionsSolved: 0,
  codingAttempts: 0,
  mockInterviews: 0,
  confidenceScore: 70,
};

function TrendChart({ points, label, locale }: { points: ProgressPointDto[]; label: string; locale: string }) {
  const width = 720;
  const height = 220;
  if (!points.length) return <div className="grid h-64 place-items-center text-xs text-muted-foreground">{label}</div>;
  const xStep = points.length > 1 ? width / (points.length - 1) : width;
  const values = points.map((item) => item.value);
  const minimum = Math.min(...values, 0);
  const maximum = Math.max(...values, 100);
  const range = Math.max(1, maximum - minimum);
  const point = (value: number, index: number) => `${points.length === 1 ? width / 2 : index * xStep},${height - ((value - minimum) / range) * (height - 16) - 8}`;
  const line = points.map((item, index) => point(item.value, index)).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <div className="relative mt-6 h-64 w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height + 28}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" role="img" aria-label={label}>
        <defs><linearGradient id="progressArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity=".22" /><stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" /></linearGradient></defs>
        {[0, .33, .66, 1].map((offset) => <line key={offset} x1="0" x2={width} y1={offset * height} y2={offset * height} stroke="currentColor" className="text-border/70" strokeDasharray="3 6" vectorEffect="non-scaling-stroke" />)}
        <motion.polygon initial={{ opacity: 0 }} animate={{ opacity: 1 }} points={area} fill="url(#progressArea)" />
        <motion.polyline initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .8 }} points={line} fill="none" stroke="rgb(var(--accent))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {points.map((item, index) => { const [cx, cy] = point(item.value, index).split(","); return <circle key={item.dateUtc} cx={cx} cy={cy} r="3.5" fill="rgb(var(--panel))" stroke="rgb(var(--accent))" strokeWidth="2" vectorEffect="non-scaling-stroke" />; })}
        {points.map((item, index) => <text key={item.dateUtc} x={points.length === 1 ? width / 2 : index * xStep} y={height + 24} textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"} className="fill-muted-foreground text-[9px]">{new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(item.dateUtc))}</text>)}
      </svg>
    </div>
  );
}

export default function ProgressPage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<ProgressDraft>(initialDraft);

  const overviewQuery = useQuery({
    queryKey: ["progress", "overview"],
    queryFn: () => api.progress.overview<ProgressOverviewDto>(),
  });
  const entriesQuery = useQuery({
    queryKey: ["progress", "entries"],
    queryFn: () => api.progress.list<ProgressEntryDto[]>(),
  });

  const createMutation = useMutation({
    mutationFn: () => api.progress.create<ProgressEntryDto>({
      activityDateUtc: new Date().toISOString(),
      ...draft,
      topicId: null,
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["progress"] });
      setFormOpen(false);
      setDraft(initialDraft);
    },
  });

  const overview = overviewQuery.data;
  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data]);
  const topicRows = useMemo(() => {
    const byId = new Map<string, TopicProgressDto>();
    for (const topic of [...(overview?.strongestTopics ?? []), ...(overview?.weakestTopics ?? [])]) byId.set(topic.topicId, topic);
    return [...byId.values()].sort((a, b) => b.progress - a.progress);
  }, [overview]);

  const weeklyTotal = (overview?.weeklyMinutes ?? []).reduce((sum, item) => sum + item.value, 0);
  const streak = useMemo(() => {
    const activeDates = new Set(entries.filter((entry) => entry.minutesStudied > 0).map((entry) => new Date(entry.activityDateUtc).toISOString().slice(0, 10)));
    let count = 0;
    const cursor = new Date();
    while (activeDates.has(cursor.toISOString().slice(0, 10))) {
      count += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return count;
  }, [entries]);

  const isLoading = overviewQuery.isPending || entriesQuery.isPending;
  const isError = overviewQuery.isError || entriesQuery.isError;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-7">
      <PageHeader
        eyebrow={t("Performans içgörüleri", "Performance insights")}
        title={t("İlerlemen", "Your progress")}
        description={t("Çalışma temponu, özgüvenini ve mülakata hazırlık önündeki gelişim alanlarını tek yerde izle.", "Track your momentum, confidence, and the growth areas between you and interview readiness.")}
        actions={<ActionButton icon={Plus} variant="primary" onClick={() => setFormOpen(true)}>{t("Çalışma kaydet", "Log study")}</ActionButton>}
      />

      {isLoading ? (
        <Panel className="grid min-h-96 animate-pulse place-items-center text-sm text-muted-foreground">{t("İlerleme verileri yükleniyor…", "Loading progress data…")}</Panel>
      ) : isError || !overview ? (
        <Panel><EmptyState icon={BarChart3} title={t("İlerleme verileri yüklenemedi", "Progress data could not be loaded")} description={t("API bağlantısını kontrol edip yeniden deneyin.", "Check the API connection and try again.")} action={<ActionButton onClick={() => { void overviewQuery.refetch(); void entriesQuery.refetch(); }}>{t("Yeniden dene", "Try again")}</ActionButton>} /></Panel>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard icon={Clock3} label={t("Çalışılan süre", "Hours studied")} value={`${overview.totals.hoursStudied.toLocaleString(locale, { maximumFractionDigits: 1 })}h`} detail={t("Toplam odaklanmış çalışma", "Total focused study")} />
            <MetricCard icon={CheckCircle2} label={t("Tamamlanan konular", "Topics completed")} value={String(overview.totals.completedTopics)} detail={t("Ustalık hedefini geçen", "Past the mastery target")} iconClassName="bg-emerald-500/10 text-emerald-500" />
            <MetricCard icon={Code2} label={t("Çözülen sorular", "Questions solved")} value={String(overview.totals.questionsSolved)} detail={t(`${overview.totals.codingAttempts} kodlama denemesi`, `${overview.totals.codingAttempts} coding attempts`)} iconClassName="bg-violet-500/10 text-violet-500" />
            <MetricCard icon={MessageSquareText} label={t("Deneme mülakatları", "Mock interviews")} value={String(overview.totals.mockInterviews)} detail={t("Tamamlanan oturumlar", "Completed sessions")} iconClassName="bg-sky-500/10 text-sky-500" />
            <MetricCard icon={Flame} label={t("Çalışma serisi", "Study streak")} value={t(`${streak} gün`, `${streak} days`)} detail={t("Kesintisiz çalışma", "Consecutive study days")} iconClassName="bg-orange-500/10 text-orange-500" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,.7fr)]">
            <Panel className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="flex items-center gap-2"><h2 className="text-sm font-semibold text-foreground">{t("Özgüven eğrisi", "Confidence trajectory")}</h2><StatusPill tone="info">{overview.confidenceHistory.length} {t("ölçüm", "measurements")}</StatusPill></div><p className="mt-1 text-xs text-muted-foreground">{t("Çalışma kayıtları ve mülakat geri bildirimlerinden hesaplanır.", "Calculated from study records and interview feedback.")}</p></div><Sparkles className="size-4 text-primary" /></div><TrendChart points={overview.confidenceHistory} label={t("Özgüven eğrisi grafiği", "Confidence trajectory chart")} locale={locale} /></Panel>
            <Panel className="relative overflow-hidden p-5 sm:p-6"><div className="absolute -right-16 -top-16 size-44 rounded-full bg-primary/10 blur-3xl" /><div className="relative"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-foreground">{t("Mülakata hazırlık", "Interview readiness")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("Ortalama özgüven puanı", "Average confidence score")}</p></div><Sparkles className="size-4 text-primary" /></div><div className="my-7 flex items-center justify-center"><ProgressRing value={Math.round(overview.totals.averageConfidence)} size={132} strokeWidth={9} /></div><p className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-[11px] leading-5 text-muted-foreground"><span className="font-semibold text-foreground">{overview.totals.averageConfidence >= 75 ? t("İyi gidiyorsun.", "On track.") : t("Odaklanmaya devam.", "Keep focusing.")}</span> {t("Zayıf konuları çalışma planına taşıyarak hazırlık puanını yükseltebilirsin.", "Move weak topics into your study plan to improve readiness.")}</p></div></Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,.7fr)]">
            <Panel className="overflow-hidden"><div className="border-b border-border/70 px-5 py-4"><h2 className="text-sm font-semibold text-foreground">{t("Konu performansı", "Topic performance")}</h2><p className="mt-1 text-[11px] text-muted-foreground">{t("Aktif konulardaki ustalık ve özgüven düzeyi.", "Mastery and confidence across active topics.")}</p></div>{topicRows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead><tr className="border-b border-border/60 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><th className="px-5 py-3">{t("Konu", "Topic")}</th><th className="px-4 py-3">{t("Ustalık", "Mastery")}</th><th className="px-4 py-3">{t("Özgüven", "Confidence")}</th><th className="px-5 py-3 text-right">{t("Durum", "Status")}</th></tr></thead><tbody>{topicRows.map((topic) => { const state = topic.progress >= 75 ? t("Güçlü", "Strong") : topic.progress >= 50 ? t("Gelişiyor", "Growing") : t("Odaklanmalı", "Needs focus"); return <tr key={topic.topicId} className="border-b border-border/50 last:border-0"><td className="px-5 py-3.5 text-xs font-medium text-foreground">{topic.name}<p className="mt-1 text-[9px] text-muted-foreground">{topic.studiedHours.toLocaleString(locale, { maximumFractionDigits: 1 })}h</p></td><td className="px-4 py-3.5"><div className="flex items-center gap-2"><ProgressBar value={topic.progress} className="w-24" /><span className="text-[10px] text-muted-foreground">{topic.progress}%</span></div></td><td className="px-4 py-3.5 text-xs font-semibold text-foreground">{topic.confidence}</td><td className="px-5 py-3.5 text-right"><StatusPill tone={topic.progress >= 75 ? "success" : topic.progress >= 50 ? "info" : "warning"}>{state}</StatusPill></td></tr>; })}</tbody></table></div> : <EmptyState icon={Target} title={t("Konu ilerlemesi yok", "No topic progress")} description={t("Konu bazlı çalışma kayıtların burada görünecek.", "Topic-based study records will appear here.")} />}</Panel>
            <div className="space-y-5">
              <Panel className="p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-foreground">{t("Haftalık etkinlik", "Weekly activity")}</h2><p className="mt-1 text-[11px] text-muted-foreground">{t(`${Math.round(weeklyTotal)} dk toplam`, `${Math.round(weeklyTotal)} min total`)}</p></div><BarChart3 className="size-4 text-primary" /></div>{overview.weeklyMinutes.length ? <div className="mt-6 flex h-40 items-end gap-2">{overview.weeklyMinutes.map((bar, index) => { const peak = Math.max(...overview.weeklyMinutes.map((item) => item.value), 1); return <div key={bar.dateUtc} className="flex h-full flex-1 flex-col justify-end gap-2"><div className="relative flex flex-1 items-end rounded-lg bg-muted/45"><motion.div initial={{ height: 0 }} animate={{ height: `${(bar.value / peak) * 100}%` }} transition={{ delay: index * .05 }} className="w-full rounded-lg bg-primary/60" /></div><span className="text-center text-[9px] text-muted-foreground">{new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(bar.dateUtc))}</span></div>; })}</div> : <p className="mt-6 text-xs text-muted-foreground">{t("Bu hafta için kayıt yok.", "No entries for this week.")}</p>}</Panel>
              <Panel className="p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-foreground">{t("Son kayıtlar", "Recent entries")}</h2><CalendarDays className="size-4 text-primary" /></div>{entries.length ? <div className="mt-4 space-y-3">{entries.slice(0, 5).map((entry) => <div key={entry.id} className="rounded-xl bg-muted/40 p-3"><div className="flex items-center justify-between"><p className="text-[11px] font-medium text-foreground">{entry.topicName || t("Genel çalışma", "General study")}</p><span className="text-[10px] text-muted-foreground">{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(entry.activityDateUtc))}</span></div><p className="mt-1 text-[10px] text-muted-foreground">{t(`${entry.minutesStudied} dk · ${entry.questionsSolved} soru · özgüven ${entry.confidenceScore}`, `${entry.minutesStudied} min · ${entry.questionsSolved} questions · confidence ${entry.confidenceScore}`)}</p></div>)}</div> : <p className="mt-4 text-xs text-muted-foreground">{t("Henüz çalışma kaydı yok.", "No study entries yet.")}</p>}</Panel>
            </div>
          </div>
        </>
      )}

      {formOpen ? <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t("Çalışma kaydet", "Log study")}><Panel className="w-full max-w-lg p-5 shadow-float"><div className="flex items-center justify-between"><h2 className="text-base font-semibold">{t("Bugünkü çalışmayı kaydet", "Log today's study")}</h2><button type="button" onClick={() => setFormOpen(false)} className="grid size-8 place-items-center rounded-lg hover:bg-muted" aria-label={t("Pencereyi kapat", "Close dialog")}><X className="size-4" /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2">{[
        { key: "minutesStudied" as const, label: t("Çalışılan dakika", "Minutes studied") },
        { key: "questionsSolved" as const, label: t("Çözülen soru", "Questions solved") },
        { key: "codingAttempts" as const, label: t("Kodlama denemesi", "Coding attempts") },
        { key: "mockInterviews" as const, label: t("Deneme mülakatı", "Mock interviews") },
      ].map((field) => <label key={field.key} className="text-xs font-medium">{field.label}<input type="number" min={0} value={draft[field.key]} onChange={(event) => setDraft((value) => ({ ...value, [field.key]: Number(event.target.value) }))} className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" /></label>)}</div><label className="mt-4 block text-xs font-medium">{t("Özgüven puanı", "Confidence score")}<input type="range" min={0} max={100} value={draft.confidenceScore} onChange={(event) => setDraft((value) => ({ ...value, confidenceScore: Number(event.target.value) }))} className="mt-3 w-full accent-primary" /><span className="mt-1 block text-right text-xs text-muted-foreground">{draft.confidenceScore} / 100</span></label>{createMutation.isError ? <p className="mt-3 text-xs text-rose-500">{t("Çalışma kaydı eklenemedi.", "The study entry could not be added.")}</p> : null}<div className="mt-5 flex justify-end gap-2"><ActionButton onClick={() => setFormOpen(false)}>{t("İptal", "Cancel")}</ActionButton><ActionButton variant="primary" disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>{createMutation.isPending ? t("Kaydediliyor…", "Saving…") : t("Kaydet", "Save")}</ActionButton></div></Panel></div> : null}
    </div>
  );
}

export { ProgressPage };
