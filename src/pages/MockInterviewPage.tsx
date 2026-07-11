import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Lightbulb,
  MessageSquareText,
  Mic,
  MicOff,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import {
  ActionButton,
  EmptyState,
  PageHeader,
  Panel,
  ProgressBar,
  StatusPill,
} from "../components/features/FeaturePrimitives";
import { cn } from "../components/features/featureClassNames";
import { useI18n } from "../i18n";
import { api } from "../services/api";

type InterviewType = "Technical" | "HumanResources" | "Behavioral" | "SystemDesign";
type SessionStatus = "Planned" | "InProgress" | "Completed" | "Abandoned";

type InterviewSummaryDto = {
  id: string;
  title: string;
  type: InterviewType;
  status: SessionStatus;
  questionCount: number;
  answeredQuestionCount: number;
  overallScore?: number | null;
  startedAtUtc?: string | null;
  completedAtUtc?: string | null;
  updatedAtUtc: string;
};

type InterviewAnswerDto = {
  id: string;
  sequence: number;
  question: string;
  answer: string;
  technicalAccuracyScore: number;
  communicationScore: number;
  confidenceScore: number;
  structureScore: number;
  missingDetails: string;
  feedback: string;
  followUpQuestions: string;
  updatedAtUtc: string;
};

type InterviewDetailDto = {
  id: string;
  title: string;
  type: InterviewType;
  status: SessionStatus;
  startedAtUtc?: string | null;
  completedAtUtc?: string | null;
  technicalAccuracyScore: number;
  communicationScore: number;
  confidenceScore: number;
  structureScore: number;
  summaryFeedback: string;
  answers: InterviewAnswerDto[];
  createdAtUtc: string;
  updatedAtUtc: string;
};

export default function MockInterviewPage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedSessionId = searchParams.get("id");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [recording, setRecording] = useState(false);
  const [submitted, setSubmitted] = useState<InterviewAnswerDto | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<InterviewType>("Technical");
  const [newQuestions, setNewQuestions] = useState("");

  const sessionsQuery = useQuery({
    queryKey: ["interview-sessions"],
    queryFn: () => api.interviews.list<InterviewSummaryDto[]>(),
  });
  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);

  useEffect(() => {
    if (linkedSessionId && sessions.some((session) => session.id === linkedSessionId)) {
      if (selectedId !== linkedSessionId) {
        setSelectedId(linkedSessionId);
        setSubmitted(null);
        setAnswer("");
      }
    } else if (!selectedId && sessions.length) {
      const active = sessions.find((session) => session.status === "InProgress" || session.status === "Planned") ?? sessions[0];
      setSelectedId(active.id);
    }
  }, [linkedSessionId, selectedId, sessions]);

  const detailQuery = useQuery({
    queryKey: ["interview-sessions", selectedId],
    queryFn: () => api.interviews.get<InterviewDetailDto>(selectedId!),
    enabled: Boolean(selectedId),
  });
  const session = detailQuery.data;
  const orderedQuestions = useMemo(() => [...(session?.answers ?? [])].sort((a, b) => a.sequence - b.sequence), [session?.answers]);
  const currentQuestion = orderedQuestions.find((item) => !item.answer.trim());
  const answeredCount = orderedQuestions.filter((item) => item.answer.trim()).length;
  const progress = orderedQuestions.length ? (answeredCount / orderedQuestions.length) * 100 : 0;

  const answerMutation = useMutation({
    mutationFn: () => api.interviews.answer<InterviewAnswerDto>(session!.id, {
      sequence: currentQuestion!.sequence,
      question: currentQuestion!.question,
      answer,
      evaluation: null,
    }),
    onSuccess: (result) => {
      setSubmitted(result);
      void queryClient.invalidateQueries({ queryKey: ["interview-sessions"], exact: true });
      void queryClient.invalidateQueries({
        queryKey: ["interview-sessions", session!.id],
        exact: true,
        refetchType: "none",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => api.interviews.complete<InterviewDetailDto>(session!.id, { summaryFeedback: null }),
    onSuccess: (completed) => {
      queryClient.setQueryData(["interview-sessions", completed.id], completed);
      void queryClient.invalidateQueries({ queryKey: ["interview-sessions"], exact: true });
    },
  });

  const createMutation = useMutation({
    mutationFn: () => api.interviews.create<InterviewDetailDto>({
      title: newTitle,
      type: newType,
      questions: newQuestions.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
      startImmediately: true,
    }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ["interview-sessions"], exact: true });
      queryClient.setQueryData(["interview-sessions", created.id], created);
      setSelectedId(created.id);
      setSearchParams({ id: created.id });
      setCreatorOpen(false);
      setNewTitle("");
      setNewQuestions("");
      setAnswer("");
      setSubmitted(null);
    },
  });

  const typeLabel = (type: InterviewType) => ({
    Technical: t("Teknik", "Technical"),
    HumanResources: t("HR", "HR"),
    Behavioral: t("Yetkinlik", "Behavioral"),
    SystemDesign: t("System Design", "System Design"),
  })[type];
  const statusLabel = (status: SessionStatus) => ({
    Planned: t("Planlandı", "Planned"),
    InProgress: t("Devam ediyor", "In progress"),
    Completed: t("Tamamlandı", "Completed"),
    Abandoned: t("Bırakıldı", "Abandoned"),
  })[status];

  const moveNext = () => {
    if (submitted && session) {
      queryClient.setQueryData<InterviewDetailDto>(["interview-sessions", session.id], (current) => current ? {
        ...current,
        status: "InProgress",
        answers: current.answers.map((item) => item.sequence === submitted.sequence ? submitted : item),
      } : current);
    }
    setSubmitted(null);
    setAnswer("");
    setRecording(false);
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <PageHeader
        eyebrow={t("Canlı simülasyon", "Live simulation")}
        title={session?.title ?? t("Deneme mülakatları", "Mock interviews")}
        description={t("Teknik doğruluk, iletişim, özgüven ve yanıt yapısı için anlık geri bildirim al.", "Get immediate feedback on technical accuracy, communication, confidence, and answer structure.")}
        actions={<ActionButton icon={Plus} variant="primary" onClick={() => setCreatorOpen(true)}>{t("Yeni mülakat", "New interview")}</ActionButton>}
      />

      {sessionsQuery.isPending ? (
        <Panel className="grid min-h-96 animate-pulse place-items-center text-sm text-muted-foreground">{t("Mülakatlar yükleniyor…", "Loading interviews…")}</Panel>
      ) : sessionsQuery.isError ? (
        <Panel><EmptyState icon={MessageSquareText} title={t("Mülakatlar yüklenemedi", "Interviews could not be loaded")} description={t("API bağlantısını kontrol edip yeniden deneyin.", "Check the API connection and try again.")} action={<ActionButton onClick={() => void sessionsQuery.refetch()}>{t("Yeniden dene", "Try again")}</ActionButton>} /></Panel>
      ) : sessions.length === 0 ? (
        <Panel><EmptyState icon={MessageSquareText} title={t("Henüz deneme mülakatı yok", "No mock interviews yet")} description={t("İlk oturumunu oluşturup sorularını gerçek mülakat temposunda yanıtla.", "Create your first session and answer questions at a real interview pace.")} action={<ActionButton icon={Plus} variant="primary" onClick={() => setCreatorOpen(true)}>{t("Mülakat oluştur", "Create interview")}</ActionButton>} /></Panel>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[270px_minmax(0,1fr)_320px]">
          <Panel className="h-fit overflow-hidden">
            <div className="border-b border-border/70 p-4"><p className="text-xs font-semibold text-foreground">{t("Mülakat oturumları", "Interview sessions")}</p><p className="mt-1 text-[10px] text-muted-foreground">{sessions.length} {t("kayıtlı oturum", "saved sessions")}</p></div>
            <div className="space-y-1 p-2">
              {sessions.map((item) => <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setSearchParams({ id: item.id }); setSubmitted(null); setAnswer(""); }} className={cn("w-full rounded-xl px-3 py-3 text-left transition", selectedId === item.id ? "bg-primary/10" : "hover:bg-muted/60")}><div className="flex items-center justify-between gap-2"><p className={cn("truncate text-xs font-semibold", selectedId === item.id ? "text-primary" : "text-foreground")}>{item.title}</p>{item.status === "Completed" ? <Check className="size-3.5 shrink-0 text-emerald-500" /> : <Circle className="size-3.5 shrink-0 text-border" />}</div><div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground"><span>{typeLabel(item.type)}</span><span>·</span><span>{statusLabel(item.status)}</span></div><ProgressBar value={item.questionCount ? (item.answeredQuestionCount / item.questionCount) * 100 : 0} className="mt-2" /></button>)}
            </div>
          </Panel>

          {detailQuery.isPending ? <Panel className="grid min-h-[560px] animate-pulse place-items-center text-sm text-muted-foreground">{t("Oturum yükleniyor…", "Loading session…")}</Panel> : detailQuery.isError || !session ? <Panel><EmptyState icon={MessageSquareText} title={t("Oturum yüklenemedi", "Session could not be loaded")} description={t("Oturumu yeniden yüklemeyi deneyin.", "Try loading the session again.")} action={<ActionButton onClick={() => void detailQuery.refetch()}>{t("Yeniden dene", "Try again")}</ActionButton>} /></Panel> : (
            <div className="space-y-5">
              {session.status === "Completed" ? (
                <Panel className="p-6 sm:p-8"><div className="flex items-start gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white"><CheckCircle2 className="size-5" /></div><div><StatusPill tone="success">{t("Tamamlandı", "Completed")}</StatusPill><h2 className="mt-3 text-2xl font-semibold tracking-tight">{t("Mülakat değerlendirmesi", "Interview evaluation")}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{session.summaryFeedback || t("Bu oturum için özet geri bildirim bulunmuyor.", "No summary feedback is available for this session.")}</p><p className="mt-4 text-xs text-muted-foreground">{session.completedAtUtc ? new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short" }).format(new Date(session.completedAtUtc)) : ""}</p></div></div></Panel>
              ) : currentQuestion ? (
                <>
                  <Panel className="relative overflow-hidden p-6 sm:p-8"><div className="pointer-events-none absolute -right-20 -top-20 size-52 rounded-full bg-primary/[.08] blur-3xl" /><div className="relative"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 text-white"><Bot className="size-5" /></div><div><p className="text-xs font-semibold text-foreground">{t("Mira · AI mülakatçı", "Mira · AI interviewer")}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{t("Yanıtını bekliyor", "Waiting for your answer")}</p></div></div><div className="mt-8"><StatusPill tone="purple">{t(`Soru ${currentQuestion.sequence} / ${orderedQuestions.length}`, `Question ${currentQuestion.sequence} of ${orderedQuestions.length}`)}</StatusPill><h2 className="mt-4 text-2xl font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-[1.75rem]">{currentQuestion.question}</h2><p className="mt-4 text-sm leading-6 text-muted-foreground">{t("Yanıtını önce ana çerçeveyle başlat, sonra mekanikleri, örnekleri ve trade-off'ları açıkla.", "Lead with the high-level model, then explain mechanics, examples, and trade-offs.")}</p></div></div></Panel>
                  <Panel className="overflow-hidden"><div className="flex items-center justify-between border-b border-border/70 px-5 py-3"><div className="flex items-center gap-2"><MessageSquareText className="size-4 text-primary" /><span className="text-xs font-semibold text-foreground">{t("Yanıtın", "Your response")}</span></div><span className="text-[11px] text-muted-foreground">{t(`${answer.trim() ? answer.trim().split(/\s+/).length : 0} kelime`, `${answer.trim() ? answer.trim().split(/\s+/).length : 0} words`)}</span></div><textarea value={answer} onChange={(event) => { setAnswer(event.target.value); setSubmitted(null); }} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && answer.trim()) answerMutation.mutate(); }} placeholder={t("Düşünce sürecini açık ve yapılandırılmış biçimde anlat…", "Explain your reasoning clearly and in a structured way…")} className="min-h-52 w-full resize-none bg-transparent px-5 py-5 text-sm leading-7 text-foreground outline-none placeholder:text-muted-foreground/65" /><div className="flex flex-col gap-3 border-t border-border/70 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><button type="button" onClick={() => setRecording((value) => !value)} className={cn("inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium", recording ? "border-rose-500/30 bg-rose-500/10 text-rose-600" : "border-border bg-background text-muted-foreground")}>{recording ? <MicOff className="size-4" /> : <Mic className="size-4" />}{recording ? t("Kaydı durdur", "Stop recording") : t("Sesli yanıtla", "Answer by voice")}</button><div className="flex gap-2"><ActionButton icon={RotateCcw} disabled={!answer} onClick={() => setAnswer("")}>{t("Temizle", "Clear")}</ActionButton><ActionButton icon={Send} variant="primary" disabled={!answer.trim() || answerMutation.isPending} onClick={() => answerMutation.mutate()}>{answerMutation.isPending ? t("Değerlendiriliyor…", "Evaluating…") : t("Yanıtı gönder", "Submit answer")}</ActionButton></div></div>{answerMutation.isError ? <p className="border-t border-border p-3 text-center text-xs text-rose-500">{t("Yanıt kaydedilemedi. Lütfen yeniden deneyin.", "The answer could not be saved. Please try again.")}</p> : null}</Panel>
                </>
              ) : (
                <Panel><EmptyState icon={CheckCircle2} title={t("Tüm sorular yanıtlandı", "All questions answered")} description={t("Puan ortalamalarını ve oturum özetini oluşturmak için mülakatı tamamla.", "Complete the interview to calculate scores and generate the session summary.")} action={<ActionButton variant="primary" disabled={completeMutation.isPending} onClick={() => completeMutation.mutate()}>{completeMutation.isPending ? t("Tamamlanıyor…", "Completing…") : t("Mülakatı tamamla", "Complete interview")}</ActionButton>} /></Panel>
              )}

              {submitted ? <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><Panel className="overflow-hidden border-emerald-500/20"><div className="flex items-start gap-3 bg-emerald-500/[.06] p-5"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white"><CheckCircle2 className="size-4" /></div><div className="min-w-0"><p className="text-sm font-semibold text-foreground">{t("Yanıt değerlendirildi", "Answer evaluated")}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{submitted.feedback || t("Yanıtın kaydedildi. Sonraki soruya geçebilirsin.", "Your answer was saved. You can continue to the next question.")}</p></div><ActionButton icon={ArrowRight} variant="primary" className="ml-auto shrink-0" onClick={moveNext}>{t("Devam et", "Continue")}</ActionButton></div></Panel></motion.div> : null}
            </div>
          )}

          {session ? <div className="space-y-5">
            <Panel className="overflow-hidden"><div className="flex items-center justify-between border-b border-border/70 px-4 py-3"><span className="inline-flex items-center gap-2 text-xs font-semibold text-foreground"><Sparkles className="size-3.5 text-primary" />{t("Canlı değerlendirme", "Live evaluation")}</span><StatusPill tone="success">{statusLabel(session.status)}</StatusPill></div><div className="space-y-5 p-4">{[
              { label: t("Teknik doğruluk", "Technical accuracy"), value: submitted?.technicalAccuracyScore ?? session.technicalAccuracyScore },
              { label: t("İletişim", "Communication"), value: submitted?.communicationScore ?? session.communicationScore },
              { label: t("Özgüven", "Confidence"), value: submitted?.confidenceScore ?? session.confidenceScore },
              { label: t("Yapı", "Structure"), value: submitted?.structureScore ?? session.structureScore },
            ].map((metric) => <div key={metric.label}><div className="mb-2 flex justify-between"><p className="text-[11px] font-medium text-foreground">{metric.label}</p><span className="text-sm font-semibold">{metric.value}</span></div><ProgressBar value={metric.value} /></div>)}</div></Panel>
            <Panel className="p-4"><div className="flex items-start gap-3"><div className="grid size-8 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-500"><Lightbulb className="size-4" /></div><div><p className="text-xs font-semibold text-foreground">{t("Eksik ayrıntılar", "Missing details")}</p><p className="mt-1.5 text-xs leading-5 text-muted-foreground">{submitted?.missingDetails || t("Yanıt gönderdikten sonra eksik noktalar burada gösterilir.", "Missing points appear here after you submit an answer.")}</p></div></div></Panel>
            <Panel className="p-4"><div className="flex items-center gap-2"><Target className="size-4 text-primary" /><p className="text-xs font-semibold">{t("Oturum ilerlemesi", "Session progress")}</p></div><ProgressBar value={progress} className="mt-4" /><div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground"><Clock3 className="size-3" />{t(`${answeredCount} / ${orderedQuestions.length} soru`, `${answeredCount} of ${orderedQuestions.length} questions`)}</div></Panel>
          </div> : <div />}
        </div>
      )}

      {creatorOpen ? <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t("Yeni mülakat", "New interview")}><Panel className="w-full max-w-xl p-5 shadow-float"><div className="flex items-center justify-between"><h2 className="text-base font-semibold">{t("Yeni deneme mülakatı", "New mock interview")}</h2><button type="button" onClick={() => setCreatorOpen(false)} className="grid size-8 place-items-center rounded-lg hover:bg-muted" aria-label={t("Pencereyi kapat", "Close dialog")}><X className="size-4" /></button></div><label className="mt-5 block text-xs font-medium">{t("Oturum adı", "Session title")}<input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" placeholder={t("Örn. Senior Backend teknik mülakatı", "e.g. Senior Backend technical interview")} /></label><label className="mt-4 block text-xs font-medium">{t("Mülakat türü", "Interview type")}<select value={newType} onChange={(event) => setNewType(event.target.value as InterviewType)} className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"><option value="Technical">{t("Teknik", "Technical")}</option><option value="HumanResources">{t("HR", "HR")}</option><option value="Behavioral">{t("Yetkinlik", "Behavioral")}</option><option value="SystemDesign">{t("System Design", "System Design")}</option></select></label><label className="mt-4 block text-xs font-medium">{t("Sorular", "Questions")}<textarea value={newQuestions} onChange={(event) => setNewQuestions(event.target.value)} className="mt-2 min-h-36 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" placeholder={t("Her satıra bir mülakat sorusu yaz…", "Write one interview question per line…")} /></label>{createMutation.isError ? <p className="mt-3 text-xs text-rose-500">{t("Mülakat oluşturulamadı.", "The interview could not be created.")}</p> : null}<div className="mt-5 flex justify-end gap-2"><ActionButton onClick={() => setCreatorOpen(false)}>{t("İptal", "Cancel")}</ActionButton><ActionButton variant="primary" disabled={!newTitle.trim() || !newQuestions.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>{createMutation.isPending ? t("Oluşturuluyor…", "Creating…") : t("Başlat", "Start")}</ActionButton></div></Panel></div> : null}
    </div>
  );
}

export { MockInterviewPage };
