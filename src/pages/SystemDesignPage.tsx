import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  Bot,
  CheckCircle2,
  Database,
  Download,
  FileText,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  ActionButton,
  EmptyState,
  IconButton,
  Panel,
  ProgressBar,
  StatusPill,
} from "../components/features/FeaturePrimitives";
import { cn } from "../components/features/featureClassNames";
import { useDebouncedValue } from "../hooks/use-debounced-value";
import { useI18n } from "../i18n";
import { api } from "../services/api";

type SystemDesignSummaryDto = {
  id: string;
  title: string;
  problem: string;
  confidence: number;
  topicId?: string | null;
  topicName?: string | null;
  tags: string[];
  updatedAtUtc: string;
};

type SystemDesignScenarioDto = {
  id: string;
  title: string;
  problem: string;
  requirements: string;
  constraints: string;
  architecture: string;
  diagram?: string | null;
  pros: string;
  cons: string;
  scalability: string;
  security: string;
  caching: string;
  monitoring: string;
  logging: string;
  messageQueue: string;
  database: string;
  apiDesign: string;
  aiCritique: string;
  confidence: number;
  topicId?: string | null;
  topicName?: string | null;
  tags: string[];
  createdAtUtc: string;
  updatedAtUtc: string;
};

type TabId = "overview" | "requirements" | "architecture" | "api" | "data" | "tradeoffs";

function EditableArea({ label, value, onChange, placeholder, rows = 8 }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; rows?: number }) {
  return <label className="block"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} placeholder={placeholder} className="mt-2 w-full resize-y rounded-2xl border border-border bg-card/70 p-4 text-sm leading-7 text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-2 focus:ring-ring/20" /></label>;
}

function toScenarioInput(value: SystemDesignScenarioDto) {
  return {
    title: value.title,
    problem: value.problem,
    requirements: value.requirements,
    constraints: value.constraints,
    architecture: value.architecture,
    diagram: value.diagram,
    pros: value.pros,
    cons: value.cons,
    scalability: value.scalability,
    security: value.security,
    caching: value.caching,
    monitoring: value.monitoring,
    logging: value.logging,
    messageQueue: value.messageQueue,
    database: value.database,
    apiDesign: value.apiDesign,
    aiCritique: value.aiCritique,
    confidence: value.confidence,
    topicId: value.topicId,
    tags: value.tags,
  };
}

export default function SystemDesignPage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedScenarioId = searchParams.get("id");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("architecture");
  const [critiqueOpen, setCritiqueOpen] = useState(true);
  const [scenarioListOpen, setScenarioListOpen] = useState(() => window.innerWidth >= 1024);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 250);
  const [draft, setDraft] = useState<SystemDesignScenarioDto | null>(null);
  const [dirty, setDirty] = useState(false);
  const lastSubmitted = useRef("");
  const failedFingerprint = useRef("");
  const latestDraft = useRef<SystemDesignScenarioDto | null>(null);
  const dirtyRef = useRef(false);
  const pendingSave = useRef<Promise<SystemDesignScenarioDto> | null>(null);
  const selectionTarget = useRef<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["system-design-scenarios"],
    queryFn: () => api.systemDesign.list<SystemDesignSummaryDto[]>(),
  });
  const scenarios = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  const detailQuery = useQuery({
    queryKey: ["system-design-scenarios", selectedId],
    queryFn: () => api.systemDesign.get<SystemDesignScenarioDto>(selectedId!),
    enabled: Boolean(selectedId),
  });

  useEffect(() => {
    if (detailQuery.data && detailQuery.data.id !== draft?.id) {
      setDraft(detailQuery.data);
      latestDraft.current = detailQuery.data;
      setDirty(false);
      dirtyRef.current = false;
      lastSubmitted.current = "";
      failedFingerprint.current = "";
    }
  }, [detailQuery.data, draft?.id]);

  const updateMutation = useMutation({
    mutationFn: (value: SystemDesignScenarioDto) =>
      api.systemDesign.update<SystemDesignScenarioDto>(value.id, toScenarioInput(value)),
    onSuccess: (saved, submitted) => {
      failedFingerprint.current = "";
      const changedWhileSaving = latestDraft.current
        && JSON.stringify(latestDraft.current) !== JSON.stringify(submitted);
      if (!changedWhileSaving) {
        setDraft(saved);
        latestDraft.current = saved;
        setDirty(false);
        dirtyRef.current = false;
      } else {
        setDirty(true);
        dirtyRef.current = true;
      }
      queryClient.setQueryData(["system-design-scenarios", saved.id], saved);
      void queryClient.invalidateQueries({ queryKey: ["system-design-scenarios"], exact: true });
    },
    onError: (_error, submitted) => {
      failedFingerprint.current = JSON.stringify(submitted);
    },
  });

  const saveDraftAsync = updateMutation.mutateAsync;
  const isSaving = updateMutation.isPending;
  const runSave = useCallback((value: SystemDesignScenarioDto) => {
    const promise = saveDraftAsync(value);
    pendingSave.current = promise;
    void promise.then(
      () => { if (pendingSave.current === promise) pendingSave.current = null; },
      () => { if (pendingSave.current === promise) pendingSave.current = null; },
    );
    return promise;
  }, [saveDraftAsync]);

  const debouncedDraft = useDebouncedValue(draft, 800);
  useEffect(() => {
    if (!dirty || !debouncedDraft || isSaving) return;
    const fingerprint = JSON.stringify(debouncedDraft);
    if (fingerprint === lastSubmitted.current || fingerprint === failedFingerprint.current) return;
    lastSubmitted.current = fingerprint;
    void runSave(debouncedDraft).catch(() => undefined);
  }, [debouncedDraft, dirty, isSaving, runSave]);

  const flushLatestDraft = useCallback(async () => {
    if (pendingSave.current) {
      try {
        await pendingSave.current;
      } catch {
        // A failed autosave is retried once below with the newest draft.
      }
    }

    while (dirtyRef.current && latestDraft.current) {
      const current = latestDraft.current;
      try {
        await runSave(current);
      } catch {
        return false;
      }
    }
    return true;
  }, [runSave]);

  const selectScenario = useCallback(async (id: string) => {
    if (id === selectedId || selectionTarget.current) return;
    selectionTarget.current = id;
    if (!(await flushLatestDraft())) {
      selectionTarget.current = null;
      return;
    }

    setSelectedId(id);
    setSearchParams({ id });
    setDraft(null);
    latestDraft.current = null;
    setDirty(false);
    dirtyRef.current = false;
    lastSubmitted.current = "";
    failedFingerprint.current = "";
    selectionTarget.current = null;
  }, [flushLatestDraft, selectedId, setSearchParams]);

  const createMutation = useMutation({
    mutationFn: () => api.systemDesign.create<SystemDesignScenarioDto>({
      title: t("Yeni System Design senaryosu", "New system design scenario"),
      problem: t("Çözülecek problemi ve başarı ölçütlerini tanımla.", "Define the problem and success criteria."),
      requirements: "",
      constraints: "",
      architecture: "",
      diagram: "",
      pros: "",
      cons: "",
      scalability: "",
      security: "",
      caching: "",
      monitoring: "",
      logging: "",
      messageQueue: "",
      database: "",
      apiDesign: "",
      aiCritique: "",
      confidence: 0,
      topicId: null,
      tags: [],
    }),
    onSuccess: (created) => {
      queryClient.setQueryData(["system-design-scenarios", created.id], created);
      void queryClient.invalidateQueries({ queryKey: ["system-design-scenarios"], exact: true });
      setSelectedId(created.id);
      setSearchParams({ id: created.id });
      setDraft(created);
      latestDraft.current = created;
      setActiveTab("overview");
      setDirty(false);
      dirtyRef.current = false;
      failedFingerprint.current = "";
    },
  });

  const createScenario = async () => {
    if (await flushLatestDraft()) createMutation.mutate();
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.systemDesign.remove(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: ["system-design-scenarios", id] });
      const remaining = (queryClient.getQueryData<SystemDesignSummaryDto[]>(["system-design-scenarios"]) ?? [])
        .filter((scenario) => scenario.id !== id);
      queryClient.setQueryData(["system-design-scenarios"], remaining);
      setSelectedId(remaining[0]?.id ?? null);
      setSearchParams(remaining[0] ? { id: remaining[0].id } : {});
      setDraft(null);
      latestDraft.current = null;
      setDirty(false);
      dirtyRef.current = false;
      void queryClient.invalidateQueries({ queryKey: ["system-design-scenarios"], exact: true });
    },
  });

  useEffect(() => {
    if (!scenarios.length) return;
    const linkedExists = linkedScenarioId
      ? scenarios.some((scenario) => scenario.id === linkedScenarioId)
      : false;
    const targetId = linkedExists ? linkedScenarioId : selectedId ?? scenarios[0].id;
    if (targetId && targetId !== selectedId) void selectScenario(targetId);
  }, [linkedScenarioId, scenarios, selectScenario, selectedId]);

  const visibleScenarios = useMemo(() => {
    const normalized = debouncedSearch.toLocaleLowerCase(locale);
    if (!normalized) return scenarios;
    return scenarios.filter((scenario) => [scenario.title, scenario.problem, scenario.topicName ?? "", ...scenario.tags].some((value) => value.toLocaleLowerCase(locale).includes(normalized)));
  }, [debouncedSearch, locale, scenarios]);

  const patchDraft = <K extends keyof SystemDesignScenarioDto>(key: K, value: SystemDesignScenarioDto[K]) => {
    failedFingerprint.current = "";
    lastSubmitted.current = "";
    setDraft((current) => {
      const updated = current ? { ...current, [key]: value } : current;
      latestDraft.current = updated;
      return updated;
    });
    setDirty(true);
    dirtyRef.current = true;
  };

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "overview", label: t("Genel bakış", "Overview") },
    { id: "requirements", label: t("Gereksinimler", "Requirements") },
    { id: "architecture", label: t("Mimari", "Architecture") },
    { id: "api", label: t("API Design", "API Design") },
    { id: "data", label: t("Veri modeli", "Data model") },
    { id: "tradeoffs", label: t("Trade-off", "Trade-off") },
  ];

  const saveState = updateMutation.isError
    ? t("Kaydedilemedi", "Could not save")
    : updateMutation.isPending || dirty
      ? t("Kaydediliyor…", "Saving…")
      : t("Kaydedildi", "Saved");

  const renderEditor = () => {
    if (!draft) return null;
    if (activeTab === "overview") return <div className="mx-auto max-w-4xl space-y-5"><div className="grid gap-4 md:grid-cols-[1fr_180px]"><label className="block"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t("Senaryo adı", "Scenario title")}</span><input value={draft.title} onChange={(event) => patchDraft("title", event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-border bg-card/70 px-4 text-base font-semibold outline-none focus:ring-2 focus:ring-ring/20" /></label><label className="block"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t("Özgüven", "Confidence")}</span><input type="number" min={0} max={100} value={draft.confidence} onChange={(event) => patchDraft("confidence", Math.max(0, Math.min(100, Number(event.target.value))))} className="mt-2 h-12 w-full rounded-2xl border border-border bg-card/70 px-4 text-sm outline-none" /></label></div><EditableArea label={t("Problem", "Problem")} value={draft.problem} onChange={(value) => patchDraft("problem", value)} placeholder={t("Kapsamı, kullanıcıları ve başarı ölçütlerini açıkla…", "Describe scope, users, and success criteria…")} /><EditableArea label={t("Kısıtlar", "Constraints")} value={draft.constraints} onChange={(value) => patchDraft("constraints", value)} placeholder={t("Trafik, gecikme, tutarlılık ve uyumluluk sınırlarını yaz…", "Document traffic, latency, consistency, and compliance boundaries…")} /></div>;
    if (activeTab === "requirements") return <div className="mx-auto max-w-4xl space-y-5"><div><StatusPill tone="info">{t("Gereksinim analizi", "Requirements analysis")}</StatusPill><h3 className="mt-3 text-2xl font-semibold tracking-tight">{t("Sistemi çizmeden önce tanımla", "Define the system before drawing it")}</h3><p className="mt-2 text-sm text-muted-foreground">{t("Functional ve non-functional gereksinimleri, öncelikleri ve kabul ölçütlerini belirt.", "Document functional and non-functional requirements, priorities, and acceptance criteria.")}</p></div><EditableArea label={t("Gereksinimler", "Requirements")} value={draft.requirements} onChange={(value) => patchDraft("requirements", value)} placeholder={t("Her satıra bir gereksinim yaz…", "Write one requirement per line…")} rows={16} /><EditableArea label={t("Kısıtlar", "Constraints")} value={draft.constraints} onChange={(value) => patchDraft("constraints", value)} placeholder={t("Ölçek, bütçe, güvenlik ve mevzuat kısıtları…", "Scale, budget, security, and regulatory constraints…")} /></div>;
    if (activeTab === "architecture") return <div className="space-y-5"><div><h3 className="text-lg font-semibold tracking-tight">{t("Üst seviye mimari", "High-level architecture")}</h3><p className="mt-1 text-xs text-muted-foreground">{t("Kritik istek akışını, bileşen sorumluluklarını ve hata sınırlarını açıkla.", "Explain the critical request path, component responsibilities, and failure boundaries.")}</p></div><div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,.75fr)]"><EditableArea label={t("Mimari açıklama", "Architecture description")} value={draft.architecture} onChange={(value) => patchDraft("architecture", value)} placeholder={t("Bileşenleri ve veri akışını anlat…", "Describe components and data flow…")} rows={18} /><Panel className="overflow-hidden"><div className="border-b border-border p-4"><p className="text-xs font-semibold">{t("Diyagram taslağı", "Diagram draft")}</p><p className="mt-1 text-[10px] text-muted-foreground">{t("Metin tabanlı diyagram otomatik kaydedilir.", "The text-based diagram is saved automatically.")}</p></div><textarea value={draft.diagram ?? ""} onChange={(event) => patchDraft("diagram", event.target.value)} className="min-h-[390px] w-full resize-none bg-[radial-gradient(circle_at_center,rgb(var(--muted))_1px,transparent_1px)] p-5 font-mono text-xs leading-6 outline-none [background-size:20px_20px]" placeholder={t("client -> API Gateway -> service -> database", "client -> API Gateway -> service -> database")} /></Panel></div><div className="grid gap-4 lg:grid-cols-3"><EditableArea label={t("Ölçeklenebilirlik", "Scalability")} value={draft.scalability} onChange={(value) => patchDraft("scalability", value)} placeholder={t("Partitioning, yatay ölçekleme…", "Partitioning, horizontal scaling…")} /><EditableArea label={t("Caching", "Caching")} value={draft.caching} onChange={(value) => patchDraft("caching", value)} placeholder={t("Cache stratejisi ve invalidation…", "Cache strategy and invalidation…")} /><EditableArea label={t("Message Queue", "Message queue")} value={draft.messageQueue} onChange={(value) => patchDraft("messageQueue", value)} placeholder={t("Teslim garantileri, retry ve DLQ…", "Delivery guarantees, retries, and DLQ…")} /></div></div>;
    if (activeTab === "api") return <div className="mx-auto max-w-4xl space-y-5"><div><StatusPill tone="purple">{t("API Design", "API Design")}</StatusPill><h3 className="mt-3 text-2xl font-semibold tracking-tight">{t("API sözleşmesini ve davranışını tanımla", "Define the API contract and behavior")}</h3></div><EditableArea label={t("Endpoint · Request · Response · Error", "Endpoints · Request · Response · Error")} value={draft.apiDesign} onChange={(value) => patchDraft("apiDesign", value)} placeholder={t("Endpoint'leri, idempotency yaklaşımını ve hata modelini yaz…", "Document endpoints, idempotency, and the error model…")} rows={20} /></div>;
    if (activeTab === "data") return <div className="mx-auto max-w-4xl space-y-5"><div><StatusPill tone="info">{t("Veri modeli", "Data model")}</StatusPill><h3 className="mt-3 text-2xl font-semibold tracking-tight">{t("Verinin yaşam döngüsünü tasarla", "Design the data lifecycle")}</h3></div><EditableArea label={t("Database ve şema kararları", "Database and schema decisions")} value={draft.database} onChange={(value) => patchDraft("database", value)} placeholder={t("Entity'ler, ilişkiler, index'ler, tutarlılık ve saklama politikası…", "Entities, relationships, indexes, consistency, and retention…")} rows={20} /></div>;
    return <div className="mx-auto max-w-5xl space-y-5"><div><StatusPill tone="warning">{t("Trade-off", "Trade-off")}</StatusPill><h3 className="mt-3 text-2xl font-semibold tracking-tight">{t("Kararların bedelini görünür kıl", "Make the cost of each decision explicit")}</h3></div><div className="grid gap-4 md:grid-cols-2"><EditableArea label={t("Artılar", "Pros")} value={draft.pros} onChange={(value) => patchDraft("pros", value)} placeholder={t("Bu yaklaşımın güçlü yanları…", "Strengths of this approach…")} /><EditableArea label={t("Eksiler", "Cons")} value={draft.cons} onChange={(value) => patchDraft("cons", value)} placeholder={t("Operasyonel ve teknik bedeller…", "Operational and technical costs…")} /><EditableArea label={t("Güvenlik", "Security")} value={draft.security} onChange={(value) => patchDraft("security", value)} placeholder={t("Kimlik, yetki, şifreleme, audit…", "Identity, authorization, encryption, audit…")} /><EditableArea label={t("Monitoring", "Monitoring")} value={draft.monitoring} onChange={(value) => patchDraft("monitoring", value)} placeholder={t("SLI, SLO, metric ve alarm stratejisi…", "SLIs, SLOs, metrics, and alerting…")} /><EditableArea label={t("Logging", "Logging")} value={draft.logging} onChange={(value) => patchDraft("logging", value)} placeholder={t("Yapılandırılmış log ve correlation…", "Structured logs and correlation…")} /></div></div>;
  };

  return (
    <div className="relative flex h-[calc(100dvh-112px)] min-h-[680px] overflow-hidden rounded-[22px] border border-border/70 bg-background shadow-soft sm:h-[calc(100dvh-128px)] lg:h-[calc(100dvh-136px)]">
      {scenarioListOpen ? <aside className="absolute inset-y-0 left-0 z-30 flex w-[285px] shrink-0 flex-col border-r border-border/70 bg-card shadow-float lg:static lg:bg-card/60 lg:shadow-none"><div className="flex h-16 items-center justify-between border-b border-border/70 px-4"><div><h1 className="text-sm font-semibold tracking-tight">{t("System Design stüdyosu", "System design studio")}</h1><p className="mt-0.5 text-[10px] text-muted-foreground">{t(`${scenarios.length} senaryo`, `${scenarios.length} scenarios`)}</p></div><div className="flex gap-1"><IconButton icon={Plus} label={t("Yeni senaryo", "New scenario")} onClick={() => void createScenario()} disabled={createMutation.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" /><IconButton icon={PanelLeftClose} label={t("Senaryo listesini kapat", "Close scenario list")} className="lg:hidden" onClick={() => setScenarioListOpen(false)} /></div></div><div className="p-3"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><span className="sr-only">{t("Senaryolarda ara", "Search scenarios")}</span><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 w-full rounded-xl border border-border bg-background/80 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-ring/30" placeholder={t("Senaryolarda ara", "Search scenarios")} /></label></div><nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-4" aria-label={t("System Design senaryoları", "System design scenarios")}>{listQuery.isPending ? <p className="p-4 text-center text-xs text-muted-foreground">{t("Yükleniyor…", "Loading…")}</p> : listQuery.isError ? <button type="button" onClick={() => void listQuery.refetch()} className="w-full rounded-xl p-4 text-xs text-rose-500">{t("Yüklenemedi · Yeniden dene", "Could not load · Try again")}</button> : visibleScenarios.length ? visibleScenarios.map((scenario) => <button key={scenario.id} type="button" onClick={() => void selectScenario(scenario.id)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition", selectedId === scenario.id ? "bg-primary/10" : "hover:bg-muted/60")}><div className={cn("grid size-8 shrink-0 place-items-center rounded-xl", selectedId === scenario.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}><Database className="size-3.5" /></div><div className="min-w-0 flex-1"><p className={cn("truncate text-xs font-semibold", selectedId === scenario.id ? "text-primary" : "text-foreground")}>{scenario.title}</p><p className="mt-1 truncate text-[10px] text-muted-foreground">{scenario.topicName || t("Genel", "General")}</p></div><span className="text-[10px] font-medium text-muted-foreground">{scenario.confidence}%</span></button>) : <p className="p-4 text-center text-xs text-muted-foreground">{t("Senaryo bulunamadı.", "No scenarios found.")}</p>}</nav><div className="border-t border-border/70 p-4"><button type="button" className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-br from-primary/10 to-violet-500/10 p-3 text-left"><Sparkles className="size-4 text-primary" /><span><span className="block text-[11px] font-semibold">{t("AI ile senaryo üret", "Generate with AI")}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">{t("Zayıf alanlarına göre", "Based on weak areas")}</span></span></button></div></aside> : null}

      <main className="flex min-w-0 flex-1 flex-col"><header className="flex h-16 shrink-0 items-center justify-between border-b border-border/70 bg-card/50 px-5 backdrop-blur-xl"><div className="flex min-w-0 items-center gap-2">{!scenarioListOpen ? <IconButton icon={PanelLeftOpen} label={t("Senaryo listesini aç", "Open scenario list")} onClick={() => setScenarioListOpen(true)} /> : null}<div className="min-w-0"><div className="flex items-center gap-2"><h2 className="truncate text-sm font-semibold tracking-tight">{draft?.title ?? t("System Design", "System design")}</h2>{draft ? <StatusPill tone={draft.confidence >= 70 ? "success" : draft.confidence >= 40 ? "warning" : "neutral"}>{t(`Özgüven ${draft.confidence}`, `Confidence ${draft.confidence}`)}</StatusPill> : null}</div><p className={cn("mt-1 text-[10px]", updateMutation.isError ? "text-rose-500" : "text-muted-foreground")}>{saveState}{draft?.updatedAtUtc ? ` · ${new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(draft.updatedAtUtc))}` : ""}</p></div></div><div className="flex items-center gap-2"><IconButton icon={Download} label={t("Tasarımı dışa aktar", "Export design")} disabled={!draft} /><IconButton icon={Trash2} label={t("Senaryoyu sil", "Delete scenario")} disabled={!draft || deleteMutation.isPending} onClick={() => { if (draft && window.confirm(t("Bu senaryo kalıcı olarak silinsin mi?", "Permanently delete this scenario?"))) deleteMutation.mutate(draft.id); }} className="text-rose-500" /><ActionButton icon={Sparkles} variant="primary" disabled={!draft} onClick={() => setCritiqueOpen(true)}>{t("AI değerlendirmesi", "AI critique")}</ActionButton></div></header>
        <div className="flex h-12 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/70 px-4">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={cn("relative h-12 shrink-0 px-3 text-xs font-medium transition", activeTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>{tab.label}{activeTab === tab.id ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" /> : null}</button>)}</div>
        <div className="flex min-h-0 flex-1"><section className="min-w-0 flex-1 overflow-y-auto p-5 lg:p-6">{detailQuery.isPending ? <Panel className="grid min-h-96 animate-pulse place-items-center text-sm text-muted-foreground">{t("Senaryo yükleniyor…", "Loading scenario…")}</Panel> : detailQuery.isError ? <Panel><EmptyState icon={Activity} title={t("Senaryo yüklenemedi", "Scenario could not be loaded")} description={t("API bağlantısını kontrol edip yeniden deneyin.", "Check the API connection and try again.")} action={<ActionButton onClick={() => void detailQuery.refetch()}>{t("Yeniden dene", "Try again")}</ActionButton>} /></Panel> : !draft ? <Panel><EmptyState icon={FileText} title={t("Bir senaryo seç", "Select a scenario")} description={t("Çalışmaya başlamak için listeden bir senaryo seç veya yeni bir tane oluştur.", "Select a scenario from the list or create one to start working.")} action={<ActionButton icon={Plus} variant="primary" onClick={() => void createScenario()}>{t("Yeni senaryo", "New scenario")}</ActionButton>} /></Panel> : renderEditor()}</section>
          {critiqueOpen && draft ? <aside className="absolute inset-y-0 right-0 z-20 flex w-[320px] shrink-0 flex-col border-l border-border/70 bg-card/95 shadow-float 2xl:static 2xl:bg-card/80 2xl:shadow-none"><div className="flex h-12 items-center justify-between border-b border-border/70 px-4"><span className="inline-flex items-center gap-2 text-xs font-semibold"><Sparkles className="size-3.5 text-primary" />{t("Mimari değerlendirmesi", "Architecture critique")}</span><button type="button" onClick={() => setCritiqueOpen(false)} className="grid size-8 place-items-center rounded-lg hover:bg-muted" aria-label={t("Değerlendirmeyi kapat", "Close critique")}><PanelLeftClose className="size-4" /></button></div><div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4"><div className="rounded-2xl bg-gradient-to-br from-primary/[.12] to-violet-500/10 p-4 ring-1 ring-inset ring-primary/15"><div className="flex items-start justify-between"><div><p className="text-[11px] text-muted-foreground">{t("Tasarım özgüveni", "Design confidence")}</p><p className="mt-1 text-3xl font-semibold tracking-[-0.04em]">{draft.confidence}<span className="text-sm text-muted-foreground"> / 100</span></p></div><div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Bot className="size-4" /></div></div><ProgressBar value={draft.confidence} className="mt-4" /></div><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("AI değerlendirmesi", "AI critique")}</p>{draft.aiCritique ? <div className="rounded-xl border border-border p-4 text-xs leading-6 text-foreground">{draft.aiCritique}</div> : <div className="rounded-xl border border-dashed border-border p-4 text-xs leading-6 text-muted-foreground">{t("Bu senaryo için henüz AI değerlendirmesi oluşturulmamış.", "No AI critique has been generated for this scenario yet.")}</div>}</div>{draft.pros ? <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("Güçlü yanlar", "Strengths")}</p><div className="flex gap-2 rounded-xl bg-emerald-500/[.06] p-3 text-[11px] leading-5"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />{draft.pros}</div></div> : null}<div className="rounded-xl bg-muted/50 p-3"><div className="flex items-center gap-2"><ListChecks className="size-4 text-primary" /><p className="text-xs font-semibold">{t("Mülakat kontrolü", "Interview check")}</p></div><p className="mt-2 text-[11px] leading-5 text-muted-foreground">{t("Her kararı gereksinim, failure mode ve ölçülebilir trade-off ile ilişkilendir.", "Connect every decision to a requirement, failure mode, and measurable trade-off.")}</p></div></div></aside> : null}
        </div>
      </main>
    </div>
  );
}

export { SystemDesignPage };
