import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  Circle,
  Clock3,
  Code2,
  Coffee,
  MessageSquareText,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import {
  ActionButton,
  EmptyState,
  PageHeader,
  Panel,
  ProgressBar,
  ProgressRing,
  StatusPill,
} from "../components/features/FeaturePrimitives";
import { cn } from "../components/features/featureClassNames";
import { useI18n } from "../i18n";
import { api } from "../services/api";

type ActivityType = "Topic" | "Note" | "CodingQuestion" | "Flashcard" | "SystemDesign" | "MockInterview";

type StudyPlanItemDto = {
  id: string;
  topicId?: string | null;
  topicName?: string | null;
  title: string;
  activityType: ActivityType;
  resourceId?: string | null;
  plannedMinutes: number;
  isCompleted: boolean;
  sortOrder: number;
};

type StudyPlanDto = {
  id: string;
  title: string;
  scheduledForUtc: string;
  status: "Planned" | "InProgress" | "Completed";
  plannedMinutes: number;
  actualMinutes: number;
  notes: string;
  items: StudyPlanItemDto[];
};

const activityStyle = {
  Topic: { icon: BookOpen, color: "bg-sky-500/10 text-sky-500" },
  Note: { icon: BookOpen, color: "bg-sky-500/10 text-sky-500" },
  CodingQuestion: { icon: Code2, color: "bg-violet-500/10 text-violet-500" },
  Flashcard: { icon: Brain, color: "bg-amber-500/10 text-amber-500" },
  SystemDesign: { icon: Target, color: "bg-emerald-500/10 text-emerald-500" },
  MockInterview: { icon: MessageSquareText, color: "bg-emerald-500/10 text-emerald-500" },
} satisfies Record<ActivityType, { icon: typeof BookOpen; color: string }>;

export default function StudyPlanPage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: ["study-plans"],
    queryFn: () => api.studyPlans.list<StudyPlanDto[]>(),
  });
  const todayQuery = useQuery({
    queryKey: ["study-plans", "today"],
    queryFn: () => api.studyPlans.today<StudyPlanDto[]>(),
  });

  const plans = useMemo(() => [...(plansQuery.data ?? [])]
    .sort((a, b) => a.scheduledForUtc.localeCompare(b.scheduledForUtc)), [plansQuery.data]);
  const activePlan = selectedPlanId
    ? plans.find((plan) => plan.id === selectedPlanId) ?? todayQuery.data?.[0] ?? plans[0]
    : todayQuery.data?.[0] ?? plans[0];
  const items = useMemo(() => [...(activePlan?.items ?? [])].sort((a, b) => a.sortOrder - b.sortOrder), [activePlan?.items]);
  const completed = items.filter((item) => item.isCompleted).length;
  const completion = items.length ? Math.round((completed / items.length) * 100) : 0;
  const focusedMinutes = items.filter((item) => item.isCompleted).reduce((sum, item) => sum + item.plannedMinutes, 0);

  const toggleMutation = useMutation({
    mutationFn: ({ planId, itemId }: { planId: string; itemId: string }) =>
      api.studyPlans.toggleItem<StudyPlanDto>(planId, itemId),
    onMutate: async ({ planId, itemId }) => {
      await queryClient.cancelQueries({ queryKey: ["study-plans"] });
      const previousPlans = queryClient.getQueryData<StudyPlanDto[]>(["study-plans"]);
      const previousToday = queryClient.getQueryData<StudyPlanDto[]>(["study-plans", "today"]);
      const toggle = (plan?: StudyPlanDto | null) => plan && plan.id === planId
        ? { ...plan, items: plan.items.map((item) => item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item) }
        : plan;
      queryClient.setQueryData<StudyPlanDto[]>(["study-plans"], (current) => current?.map((plan) => toggle(plan) ?? plan));
      queryClient.setQueryData<StudyPlanDto[]>(["study-plans", "today"], (current) => current?.map((plan) => toggle(plan) ?? plan));
      return { previousPlans, previousToday };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(["study-plans"], context?.previousPlans);
      queryClient.setQueryData(["study-plans", "today"], context?.previousToday);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["study-plans"] });
    },
  });

  const activityLabel = (type: ActivityType) => ({
    Topic: t("Öğren", "Learn"),
    Note: t("Not", "Note"),
    CodingQuestion: t("Kodlama", "Coding"),
    Flashcard: t("Tekrar", "Review"),
    SystemDesign: "System Design",
    MockInterview: t("Deneme", "Mock"),
  })[type];

  const formatDay = (date: string) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(date));
  const formatDate = (date: string) => new Intl.DateTimeFormat(locale, { day: "numeric" }).format(new Date(date));
  const formatFullDate = (date: string) => new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date(date));

  const isLoading = plansQuery.isPending || todayQuery.isPending;
  const isError = plansQuery.isError || todayQuery.isError;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-7">
      <PageHeader
        eyebrow={t("Uyarlanabilir yol haritası", "Adaptive roadmap")}
        title={t("Çalışma planın", "Your study plan")}
        description={t("Planın; odaklanmış çalışma, aktif hatırlama ve mülakat simülasyonunu gelişim alanlarına göre dengeler.", "Your plan balances focused work, active recall, and interview simulation around your growth areas.")}
        actions={<><ActionButton icon={RefreshCw} disabled>{t("Planı dengele", "Rebalance plan")}</ActionButton><ActionButton icon={Plus} variant="primary" disabled>{t("Oturum ekle", "Add session")}</ActionButton></>}
      />

      {isLoading ? (
        <Panel className="grid min-h-96 animate-pulse place-items-center text-sm text-muted-foreground">{t("Çalışma planı yükleniyor…", "Loading study plan…")}</Panel>
      ) : isError ? (
        <Panel><EmptyState icon={CalendarDays} title={t("Çalışma planı yüklenemedi", "Study plan could not be loaded")} description={t("API bağlantısını kontrol edip yeniden deneyin.", "Check the API connection and try again.")} action={<ActionButton onClick={() => { void plansQuery.refetch(); void todayQuery.refetch(); }}>{t("Yeniden dene", "Try again")}</ActionButton>} /></Panel>
      ) : !activePlan ? (
        <Panel><EmptyState icon={CalendarDays} title={t("Henüz çalışma planı yok", "No study plan yet")} description={t("İlk çalışma planını oluşturduğunda günlük oturumların burada görünecek.", "Your daily sessions will appear here after you create a study plan.")} /></Panel>
      ) : (
        <>
          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-4"><div className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" /><h2 className="text-sm font-semibold text-foreground">{t("Plan günleri", "Plan days")}</h2><StatusPill tone="info">{plans.length} {t("gün", "days")}</StatusPill></div><p className="text-xs text-muted-foreground">{activePlan.title}</p></div>
            <div className="grid auto-cols-[minmax(110px,1fr)] grid-flow-col gap-px overflow-x-auto bg-border/60">
              {plans.map((plan) => {
                const done = plan.items.length > 0 && plan.items.every((item) => item.isCompleted);
                const selected = plan.id === activePlan.id;
                const planProgress = plan.items.length ? Math.round((plan.items.filter((item) => item.isCompleted).length / plan.items.length) * 100) : 0;
                return <button key={plan.id} type="button" onClick={() => setSelectedPlanId(plan.id)} className={cn("relative min-h-28 bg-card p-4 text-left transition hover:bg-muted/30", selected && "bg-primary/5")}>
                  {selected ? <span className="absolute inset-x-0 top-0 h-0.5 bg-primary" /> : null}
                  <div className="flex items-center justify-between"><span className={cn("text-[10px] font-semibold uppercase tracking-wider", selected ? "text-primary" : "text-muted-foreground")}>{formatDay(plan.scheduledForUtc)}</span>{done ? <span className="grid size-4 place-items-center rounded-full bg-emerald-500 text-white"><Check className="size-2.5" /></span> : null}</div>
                  <p className={cn("mt-2 text-lg font-semibold", selected ? "text-primary" : "text-foreground")}>{formatDate(plan.scheduledForUtc)}</p>
                  <div className="mt-4"><ProgressBar value={planProgress} /><p className="mt-2 text-[9px] text-muted-foreground">{plan.plannedMinutes} {t("dk planlandı", "min planned")}</p></div>
                </button>;
              })}
            </div>
          </Panel>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(330px,.7fr)]">
            <Panel className="overflow-hidden">
              <div className="border-b border-border/70 px-5 py-4"><div className="flex items-center gap-2"><h2 className="text-sm font-semibold text-foreground">{t("Günün odağı", "Today's focus")}</h2><StatusPill tone="purple">{activePlan.plannedMinutes} {t("dk", "min")}</StatusPill></div><p className="mt-1 text-[11px] text-muted-foreground">{formatFullDate(activePlan.scheduledForUtc)} · {items.length} {t("odak oturumu", "focused sessions")}</p></div>
              {items.length ? <div className="divide-y divide-border/60">
                {items.map((item) => {
                  const style = activityStyle[item.activityType];
                  const Icon = style.icon;
                  return <motion.div layout key={item.id} className={cn("group grid grid-cols-[54px_minmax(0,1fr)] gap-3 px-4 py-4 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:px-5", item.isCompleted && "bg-muted/20")}>
                    <div className="pt-1 text-right"><p className="text-[11px] font-semibold tabular-nums text-foreground">{new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(activePlan.scheduledForUtc))}</p><p className="mt-1 text-[9px] text-muted-foreground">{item.plannedMinutes} {t("dk", "min")}</p></div>
                    <div className="flex min-w-0 gap-3">
                      <button type="button" onClick={() => toggleMutation.mutate({ planId: activePlan.id, itemId: item.id })} disabled={toggleMutation.isPending} aria-label={item.isCompleted ? t(`${item.title} etkinliğini tamamlanmadı olarak işaretle`, `Mark ${item.title} incomplete`) : t(`${item.title} etkinliğini tamamla`, `Complete ${item.title}`)} className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl transition", item.isCompleted ? "bg-emerald-500 text-white" : style.color)}>{item.isCompleted ? <Check className="size-4" /> : <Icon className="size-4" />}</button>
                      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className={cn("text-sm font-semibold tracking-tight text-foreground", item.isCompleted && "text-muted-foreground line-through")}>{item.title}</p><StatusPill>{activityLabel(item.activityType)}</StatusPill></div><div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground"><span>{item.topicName || t("Genel", "General")}</span>{item.resourceId ? <span className="inline-flex items-center gap-1 text-primary"><Sparkles className="size-3" />{t("Kaynağa bağlı", "Linked resource")}</span> : null}</div></div>
                    </div>
                    <div className="col-start-2 mt-2 sm:col-start-auto sm:mt-0"><ActionButton variant="ghost" className="h-8 text-[11px]">{item.isCompleted ? t("Tekrar et", "Review") : t("Başla", "Start")}<ArrowRight className="size-3" /></ActionButton></div>
                  </motion.div>;
                })}
              </div> : <EmptyState icon={BookOpen} title={t("Bu gün için oturum yok", "No sessions for this day")} description={t("Plan maddeleri eklendiğinde burada görünecek.", "Plan items will appear here when they are added.")} />}
              {toggleMutation.isError ? <p className="border-t border-border p-3 text-center text-xs text-rose-500">{t("Değişiklik kaydedilemedi; önceki duruma dönüldü.", "The change could not be saved and was rolled back.")}</p> : null}
            </Panel>

            <div className="space-y-5">
              <Panel className="relative overflow-hidden p-5"><div className="absolute -right-16 -top-16 size-40 rounded-full bg-primary/10 blur-3xl" /><div className="relative flex items-center gap-5"><ProgressRing value={completion} size={90} strokeWidth={7} /><div><p className="text-xs font-semibold text-foreground">{t("Günlük ilerleme", "Daily progress")}</p><p className="mt-1 text-[11px] text-muted-foreground">{t(`${completed} / ${items.length} oturum tamamlandı`, `${completed} of ${items.length} sessions complete`)}</p><div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground"><Clock3 className="size-3" />{focusedMinutes} {t("odaklanmış dakika", "focused minutes")}</div></div></div></Panel>
              <Panel className="p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-foreground">{t("Plan notu", "Plan note")}</h2><p className="mt-1 text-[11px] text-muted-foreground">{t("Bugünün önceliği", "Today's priority")}</p></div><div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><Sparkles className="size-4" /></div></div><p className="mt-4 text-xs leading-6 text-muted-foreground">{activePlan.notes || t("Bu plan için henüz not eklenmemiş.", "No note has been added to this plan yet.")}</p></Panel>
              <Panel className="p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-foreground">{t("Günlük hedef", "Daily target")}</h2><Target className="size-4 text-primary" /></div><div className="mt-4"><div className="mb-2 flex justify-between text-[11px]"><span className="font-medium text-foreground">{t("Odaklanmış çalışma", "Focused study")}</span><span className="text-muted-foreground">{focusedMinutes} / {activePlan.plannedMinutes} {t("dk", "min")}</span></div><ProgressBar value={activePlan.plannedMinutes ? (focusedMinutes / activePlan.plannedMinutes) * 100 : 0} /></div></Panel>
              <Panel className="flex items-center gap-3 p-4"><div className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-500"><Coffee className="size-4" /></div><div className="min-w-0"><p className="text-xs font-semibold text-foreground">{t("Enerjini koru", "Protect your energy")}</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{t("Uzun oturumların arasına kısa molalar ekle.", "Add short breaks between longer sessions.")}</p></div><Circle className="ml-auto size-4 text-border" /></Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export { StudyPlanPage };
