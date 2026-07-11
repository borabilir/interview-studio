import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  AlignLeft,
  Bot,
  Check,
  ChevronDown,
  Clock3,
  FilePlus2,
  History,
  ImagePlus,
  Link2,
  ListFilter,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  Pin,
  Search,
  Sparkles,
  Star,
  Tags,
  Trash2,
  WandSparkles,
} from 'lucide-react'
import {
  ActionButton,
  IconButton,
  Panel,
  StatusPill,
} from '../components/features/FeaturePrimitives'
import { cn } from '../components/features/featureClassNames'
import { useDebouncedValue } from '../hooks/use-debounced-value'
import { useI18n } from '../i18n'
import { api } from '../services/api'
import { queryKeys } from '../services/queryKeys'
import type { CreateNoteInput, NoteDetailDto, NoteSummaryDto, UpdateNoteInput } from '../types/api'

type EditorMode = 'edit' | 'preview' | 'split'
type SaveState = 'saved' | 'dirty' | 'saving' | 'error'
const EMPTY_NOTES: NoteSummaryDto[] = []

type NoteEditorDraft = {
  noteId: string
  title: string
  content: string
  topicId: string | null
  isPinned: boolean
  isFavorite: boolean
  tags: string[]
  aiSummary: string | null
  aiExplanation: string | null
  aiImprovementSuggestions: string | null
}

function toDraft(note: NoteDetailDto): NoteEditorDraft {
  return {
    noteId: note.id,
    title: note.title,
    content: note.content,
    topicId: note.topicId ?? null,
    isPinned: note.isPinned,
    isFavorite: note.isFavorite,
    tags: note.tags,
    aiSummary: note.aiSummary ?? null,
    aiExplanation: note.aiExplanation ?? null,
    aiImprovementSuggestions: note.aiImprovementSuggestions ?? null,
  }
}

function toUpdateInput(draft: NoteEditorDraft, fallbackTitle: string, changeSummary: string): UpdateNoteInput {
  return {
    title: draft.title.trim() || fallbackTitle,
    content: draft.content,
    topicId: draft.topicId,
    isPinned: draft.isPinned,
    isFavorite: draft.isFavorite,
    tags: draft.tags,
    aiSummary: draft.aiSummary,
    aiExplanation: draft.aiExplanation,
    aiImprovementSuggestions: draft.aiImprovementSuggestions,
    changeSummary,
  }
}

export default function NotesPage() {
  const { t, locale } = useI18n()
  const queryClient = useQueryClient()
  const [routeParams, setRouteParams] = useSearchParams()
  const requestedNoteId = routeParams.get('id') ?? routeParams.get('note')
  const [selectedId, setSelectedId] = useState<string | null>(() => requestedNoteId)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query.trim(), 250)
  const [mode, setMode] = useState<EditorMode>('split')
  const [aiOpen, setAiOpen] = useState(true)
  const [listOpen, setListOpen] = useState(() => window.innerWidth >= 768)
  const [draft, setDraft] = useState<NoteEditorDraft | null>(null)
  const debouncedDraft = useDebouncedValue(draft, 650)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const revisionRef = useRef<Record<string, number>>({})
  const appliedRevisionRef = useRef<Record<string, number>>({})
  const hydratedNoteRef = useRef<string | null>(null)

  const notesQuery = useQuery({
    queryKey: queryKeys.notes.list(debouncedQuery),
    queryFn: () => api.notes.list<NoteSummaryDto[]>({ search: debouncedQuery || undefined }),
  })

  const notes = notesQuery.data ?? EMPTY_NOTES

  useEffect(() => {
    if (requestedNoteId && requestedNoteId !== selectedId) {
      hydratedNoteRef.current = null
      setDraft(null)
      setSelectedId(requestedNoteId)
    }
  }, [requestedNoteId, selectedId])

  useEffect(() => {
    if (!selectedId && notes.length) setSelectedId(notes[0].id)
  }, [notes, selectedId])

  const detailQuery = useQuery({
    queryKey: queryKeys.notes.detail(selectedId ?? ''),
    queryFn: () => api.notes.get<NoteDetailDto>(selectedId!),
    enabled: Boolean(selectedId),
  })

  useEffect(() => {
    const note = detailQuery.data
    if (note && hydratedNoteRef.current !== note.id) {
      hydratedNoteRef.current = note.id
      setDraft(toDraft(note))
      setSaveState('saved')
    }
  }, [detailQuery.data])

  const updateNote = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateNoteInput; revision: number }) =>
      api.notes.update<NoteDetailDto>(id, input),
    onSuccess: (saved, variables) => {
      if (variables.revision >= (appliedRevisionRef.current[variables.id] ?? 0)) {
        appliedRevisionRef.current[variables.id] = variables.revision
        queryClient.setQueryData(queryKeys.notes.detail(saved.id), saved)
      }
      void queryClient.invalidateQueries({ queryKey: ['notes', 'list'] })
      if (variables.id === hydratedNoteRef.current && variables.revision === revisionRef.current[variables.id]) {
        setSaveState('saved')
      }
    },
    onError: (_error, variables) => {
      if (variables.id === hydratedNoteRef.current && variables.revision === revisionRef.current[variables.id]) {
        setSaveState('error')
      }
    },
  })

  useEffect(() => {
    if (!debouncedDraft || saveState !== 'dirty' || debouncedDraft.noteId !== selectedId) return
    const revision = revisionRef.current[debouncedDraft.noteId] ?? 0
    setSaveState('saving')
    updateNote.mutate({
      id: debouncedDraft.noteId,
      input: toUpdateInput(debouncedDraft, t('İsimsiz not', 'Untitled note'), t('Otomatik kayıt', 'Automatic save')),
      revision,
    })
    // The mutation object is intentionally omitted: it changes identity as request state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDraft, selectedId, t])

  const createNote = useMutation({
    mutationFn: (input: CreateNoteInput) => api.notes.create<NoteDetailDto>(input),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.notes.detail(created.id), created)
      void queryClient.invalidateQueries({ queryKey: ['notes', 'list'] })
      hydratedNoteRef.current = null
      setSelectedId(created.id)
      setRouteParams({ id: created.id }, { replace: true })
      setQuery('')
      setListOpen(true)
    },
  })

  const deleteNote = useMutation({
    mutationFn: (id: string) => api.notes.remove(id),
    onSuccess: (_data, deletedId) => {
      queryClient.removeQueries({ queryKey: queryKeys.notes.detail(deletedId) })
      void queryClient.invalidateQueries({ queryKey: ['notes', 'list'] })
      const next = notes.find((note) => note.id !== deletedId)
      hydratedNoteRef.current = null
      setDraft(null)
      setSelectedId(next?.id ?? null)
      setRouteParams(next ? { id: next.id } : {}, { replace: true })
    },
  })

  const updateDraft = (patch: Partial<NoteEditorDraft>) => {
    if (draft) revisionRef.current[draft.noteId] = (revisionRef.current[draft.noteId] ?? 0) + 1
    setSaveState('dirty')
    setDraft((current) => current ? { ...current, ...patch } : current)
  }

  const handleCreate = () => {
    if (draft && saveState === 'dirty') {
      updateNote.mutate({
        id: draft.noteId,
        input: toUpdateInput(draft, t('İsimsiz not', 'Untitled note'), t('Otomatik kayıt', 'Automatic save')),
        revision: revisionRef.current[draft.noteId] ?? 0,
      })
    }
    createNote.mutate({
      title: t('İsimsiz not', 'Untitled note'),
      content: t('# Yeni not\n\nYazmaya başla…', '# New note\n\nStart writing…'),
      topicId: null,
      isPinned: false,
      isFavorite: false,
      tags: [],
    })
  }

  const handleDelete = () => {
    if (!selectedId || !window.confirm(t('Bu not kalıcı olarak silinsin mi?', 'Delete this note permanently?'))) return
    deleteNote.mutate(selectedId)
  }

  const selectNote = (id: string) => {
    if (draft && saveState === 'dirty' && draft.noteId !== id) {
      const revision = revisionRef.current[draft.noteId] ?? 0
      updateNote.mutate({
        id: draft.noteId,
        input: toUpdateInput(draft, t('İsimsiz not', 'Untitled note'), t('Otomatik kayıt', 'Automatic save')),
        revision,
      })
    }
    hydratedNoteRef.current = null
    setDraft(null)
    setSelectedId(id)
    setRouteParams({ id }, { replace: true })
    if (window.innerWidth < 768) setListOpen(false)
  }

  const formatUpdated = (date: string) => {
    const value = new Date(date)
    const diffMinutes = Math.max(0, Math.round((Date.now() - value.getTime()) / 60_000))
    if (diffMinutes < 1) return t('Şimdi', 'Now')
    if (diffMinutes < 60) return t(`${diffMinutes} dk önce`, `${diffMinutes} min ago`)
    const hours = Math.floor(diffMinutes / 60)
    if (hours < 24) return t(`${hours} sa önce`, `${hours} hr ago`)
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(value)
  }

  const editorReady = Boolean(selectedId && draft?.noteId === selectedId)
  const modeLabel = (item: EditorMode) => item === 'edit' ? t('Düzenle', 'Edit') : item === 'preview' ? t('Önizleme', 'Preview') : t('Bölünmüş', 'Split')

  return (
    <div className="relative flex h-[calc(100dvh-112px)] min-h-[640px] overflow-hidden rounded-[22px] border border-border/70 bg-background shadow-soft sm:h-[calc(100dvh-128px)] lg:h-[calc(100dvh-136px)]">
      {listOpen ? (
        <aside className="absolute inset-y-0 left-0 z-30 flex w-[286px] shrink-0 flex-col border-r border-border/70 bg-card shadow-float md:static md:bg-card/65 md:shadow-none">
          <div className="flex h-16 items-center justify-between border-b border-border/70 px-4">
            <div><h1 className="text-base font-semibold tracking-[-0.02em] text-foreground">{t('Notlar', 'Notes')}</h1><p className="mt-0.5 text-[11px] text-muted-foreground">{t(`${notes.length} not · veritabanıyla eşitlendi`, `${notes.length} notes · database synced`)}</p></div>
            <div className="flex items-center gap-1"><IconButton icon={createNote.isPending ? LoaderCircle : FilePlus2} label={t('Not oluştur', 'Create note')} disabled={createNote.isPending} onClick={handleCreate} className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" /><IconButton icon={PanelLeftClose} label={t('Not listesini kapat', 'Close note list')} className="md:hidden" onClick={() => setListOpen(false)} /></div>
          </div>
          <div className="space-y-2 p-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <span className="sr-only">{t('Notlarda ara', 'Search notes')}</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Tüm notlarda ara', 'Search all notes')} className="h-9 w-full rounded-xl border border-border bg-background/80 pl-9 pr-3 text-xs outline-none transition focus:ring-2 focus:ring-ring/30" />
            </label>
            <div className="flex gap-1"><button type="button" className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-muted text-[11px] font-medium text-foreground"><AlignLeft className="size-3" />{t('Tüm notlar', 'All notes')}</button><button type="button" className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={t('Notları filtrele', 'Filter notes')}><ListFilter className="size-3.5" /></button></div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            {notesQuery.isLoading ? [0, 1, 2, 3].map((item) => <div key={item} className="mb-2 h-20 animate-pulse rounded-xl bg-muted/60" />) : null}
            {notesQuery.isError ? <div className="p-4 text-center"><p className="text-xs text-rose-600">{t('Notlar yüklenemedi.', 'Notes could not be loaded.')}</p><button type="button" onClick={() => notesQuery.refetch()} className="mt-2 text-xs font-medium text-primary">{t('Yeniden dene', 'Try again')}</button></div> : null}
            {!notesQuery.isLoading && !notesQuery.isError && !notes.length ? <div className="p-5 text-center text-xs leading-5 text-muted-foreground">{query ? t('Aramayla eşleşen not yok.', 'No notes match your search.') : t('Henüz not yok. İlk notunu oluştur.', 'No notes yet. Create your first one.')}</div> : null}
            {notes.map((note) => (
              <button key={note.id} type="button" onClick={() => selectNote(note.id)} className={cn('mb-1 w-full rounded-xl px-3 py-3 text-left transition', selectedId === note.id ? 'bg-primary/10' : 'hover:bg-muted/65')}>
                <div className="flex items-center gap-1.5">{note.isPinned ? <Pin className="size-3 rotate-45 text-primary" /> : null}<p className={cn('min-w-0 flex-1 truncate text-xs font-semibold', selectedId === note.id ? 'text-primary' : 'text-foreground')}>{note.title}</p>{note.isFavorite ? <Star className="size-3 fill-amber-400 text-amber-400" /> : null}</div>
                <p className="mt-1.5 line-clamp-2 text-[11px] leading-[1.5] text-muted-foreground">{note.preview || t('İçerik yok', 'No content')}</p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground"><span>{note.topicName ?? t('Genel', 'General')}</span><span>{formatUpdated(note.updatedAtUtc)}</span></div>
              </button>
            ))}
          </div>
          <div className="border-t border-border/70 p-3"><button type="button" className="flex h-9 w-full items-center gap-2 rounded-xl px-2 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"><Tags className="size-3.5" />{t('Etiketlere göre göz at', 'Browse by tags')}<ChevronDown className="ml-auto size-3.5" /></button></div>
        </aside>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col">
        {!selectedId && !notesQuery.isLoading ? (
          <div className="grid h-full place-items-center p-8 text-center"><div><FilePlus2 className="mx-auto size-7 text-muted-foreground" /><h2 className="mt-3 text-sm font-semibold text-foreground">{t('Çalışma alanın hazır', 'Your workspace is ready')}</h2><p className="mt-1 text-sm text-muted-foreground">{t('İlk notunu oluştur ve hazırlığa başla.', 'Create your first note and start preparing.')}</p><ActionButton icon={FilePlus2} variant="primary" className="mt-4" onClick={handleCreate}>{t('Not oluştur', 'Create note')}</ActionButton></div></div>
        ) : (
          <>
            <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-card/50 px-4 backdrop-blur-xl">
              <div className="flex min-w-0 items-center gap-2">
                {!listOpen ? <IconButton icon={PanelLeftOpen} label={t('Not listesini aç', 'Open note list')} onClick={() => setListOpen(true)} /> : null}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {editorReady ? <input aria-label={t('Not başlığı', 'Note title')} value={draft!.title} onChange={(event) => updateDraft({ title: event.target.value })} className="min-w-0 flex-1 bg-transparent text-sm font-semibold tracking-tight text-foreground outline-none" /> : <div className="h-4 w-40 animate-pulse rounded bg-muted" />}
                    <StatusPill tone={saveState === 'error' ? 'danger' : saveState === 'saved' ? 'success' : 'warning'}>
                      {saveState === 'saving' ? <LoaderCircle className="mr-1 size-3 animate-spin" /> : saveState === 'saved' ? <Check className="mr-1 size-3" /> : null}
                      {saveState === 'saving' ? t('Kaydediliyor', 'Saving') : saveState === 'dirty' ? t('Kaydedilecek', 'Pending') : saveState === 'error' ? t('Kaydedilemedi', 'Save failed') : t('Kaydedildi', 'Saved')}
                    </StatusPill>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 className="size-3" />{detailQuery.data ? t(`${formatUpdated(detailQuery.data.updatedAtUtc)} düzenlendi`, `Edited ${formatUpdated(detailQuery.data.updatedAtUtc)}`) : t('Not yükleniyor', 'Loading note')}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <div className="hidden rounded-xl border border-border bg-background p-0.5 sm:flex">{(['edit', 'preview', 'split'] as const).map((item) => <button key={item} type="button" onClick={() => setMode(item)} className={cn('h-7 rounded-lg px-2.5 text-[11px] font-medium transition', mode === item ? 'bg-muted text-foreground shadow-sm' : 'text-muted-foreground')}>{modeLabel(item)}</button>)}</div>
                <IconButton icon={History} label={t('Sürüm geçmişi', 'Version history')} title={t(`${detailQuery.data?.versions.length ?? 0} sürüm`, `${detailQuery.data?.versions.length ?? 0} versions`)} />
                <IconButton icon={Pin} label={draft?.isPinned ? t('Sabitlemeyi kaldır', 'Unpin note') : t('Notu sabitle', 'Pin note')} disabled={!editorReady} onClick={() => updateDraft({ isPinned: !draft!.isPinned })} className={draft?.isPinned ? 'text-primary' : undefined} />
                <IconButton icon={Star} label={draft?.isFavorite ? t('Favorilerden çıkar', 'Remove from favorites') : t('Favoriye ekle', 'Favorite note')} disabled={!editorReady} onClick={() => updateDraft({ isFavorite: !draft!.isFavorite })} className={draft?.isFavorite ? 'text-amber-500' : undefined} />
                <IconButton icon={Trash2} label={t('Notu sil', 'Delete note')} disabled={deleteNote.isPending || !selectedId} onClick={handleDelete} />
                {!aiOpen ? <ActionButton icon={Sparkles} onClick={() => setAiOpen(true)}>{t('AI desteği', 'AI assist')}</ActionButton> : null}
              </div>
            </header>

            <div className="flex min-h-0 flex-1">
              <section className="min-w-0 flex-1 overflow-hidden">
                <div className="flex h-11 items-center gap-1 border-b border-border/60 px-3 text-muted-foreground">
                  <button type="button" className="grid size-8 place-items-center rounded-lg text-xs font-bold hover:bg-muted hover:text-foreground" aria-label={t('Kalın', 'Bold')}>B</button><button type="button" className="grid size-8 place-items-center rounded-lg text-xs italic hover:bg-muted hover:text-foreground" aria-label={t('İtalik', 'Italic')}>I</button><span className="mx-1 h-4 w-px bg-border" /><button type="button" className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium hover:bg-muted hover:text-foreground">{t('Başlık', 'Heading')}<ChevronDown className="ml-1 inline size-3" /></button><IconButton icon={Link2} label={t('İç bağlantı ekle', 'Add internal link')} className="size-8 border-transparent bg-transparent" /><IconButton icon={ImagePlus} label={t('Görsel ekle', 'Add image')} className="size-8 border-transparent bg-transparent" /><span className="ml-auto text-[10px]">Markdown</span>
                </div>
                {detailQuery.isError ? <div className="grid h-[calc(100%-2.75rem)] place-items-center p-8 text-center"><div><p className="text-sm font-semibold text-foreground">{t('Not yüklenemedi', 'Note could not be loaded')}</p><ActionButton className="mt-3" onClick={() => detailQuery.refetch()}>{t('Yeniden dene', 'Try again')}</ActionButton></div></div> : !editorReady ? <div className="h-[calc(100%-2.75rem)] animate-pulse bg-muted/20" /> : (
                  <div className={cn('grid h-[calc(100%-2.75rem)] min-h-0', mode === 'split' && 'lg:grid-cols-2')}>
                    {mode !== 'preview' ? <div className={cn('min-h-0', mode === 'split' && 'border-r border-border/70')}><textarea aria-label={t('Markdown düzenleyici', 'Markdown editor')} value={draft!.content} onChange={(event) => updateDraft({ content: event.target.value })} spellCheck={false} className="h-full w-full resize-none bg-transparent px-6 py-7 font-mono text-[13px] leading-6 text-foreground outline-none placeholder:text-muted-foreground lg:px-9" /></div> : null}
                    {mode !== 'edit' ? <article className="min-h-0 overflow-y-auto px-6 py-7 lg:px-9"><div className="prose prose-sm max-w-none text-foreground prose-headings:tracking-tight prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-foreground prose-pre:border prose-pre:border-border prose-pre:bg-[#101114] prose-blockquote:border-primary/40 prose-blockquote:text-muted-foreground dark:prose-invert"><ReactMarkdown remarkPlugins={[remarkGfm]}>{draft!.content}</ReactMarkdown></div></article> : null}
                  </div>
                )}
              </section>

              {aiOpen ? (
                <aside className="absolute inset-y-0 right-0 z-20 flex w-[310px] shrink-0 flex-col border-l border-border/70 bg-card/95 shadow-float 2xl:static 2xl:bg-card/80 2xl:shadow-none">
                  <div className="flex h-12 items-center justify-between border-b border-border/70 px-4"><span className="inline-flex items-center gap-2 text-xs font-semibold text-foreground"><Sparkles className="size-3.5 text-primary" />{t('AI yazım asistanı', 'AI writing partner')}</span><IconButton icon={PanelRightClose} label={t('AI panelini kapat', 'Close AI panel')} className="size-8 border-transparent" onClick={() => setAiOpen(false)} /></div>
                  <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
                    <div className="rounded-2xl bg-gradient-to-br from-primary/[.12] via-primary/5 to-violet-500/10 p-4 ring-1 ring-inset ring-primary/15"><div className="flex items-center gap-2"><div className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground"><Bot className="size-4" /></div><div><p className="text-xs font-semibold text-foreground">{t('Not analizi', 'Note analysis')}</p><p className="text-[10px] text-muted-foreground">{draft?.aiSummary ? t('AI analizi hazır', 'AI analysis is ready') : t('Henüz analiz edilmedi', 'Not analyzed yet')}</p></div></div></div>
                    <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Hızlı işlemler', 'Quick actions')}</p><div className="grid grid-cols-2 gap-2">{[{ tr: 'Özetle', en: 'Summarize', icon: AlignLeft }, { tr: 'İyileştir', en: 'Improve', icon: WandSparkles }, { tr: 'Açıkla', en: 'Explain', icon: Bot }, { tr: 'Kart oluştur', en: 'Flashcards', icon: Sparkles }].map(({ tr, en, icon: Icon }) => <button key={en} type="button" className="flex items-center gap-2 rounded-xl border border-border bg-background/70 p-3 text-left text-[11px] font-medium text-foreground transition hover:border-primary/30 hover:bg-primary/5"><Icon className="size-3.5 text-primary" />{t(tr, en)}</button>)}</div></div>
                    <div><div className="mb-2 flex items-center justify-between"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('AI önerisi', 'AI suggestion')}</p>{draft?.aiImprovementSuggestions ? <StatusPill tone="purple">{t('Hazır', 'Ready')}</StatusPill> : null}</div><Panel className="p-4"><p className="text-xs leading-5 text-muted-foreground">{draft?.aiImprovementSuggestions || t('Bu not için henüz iyileştirme önerisi oluşturulmadı.', 'No improvement suggestion has been generated for this note yet.')}</p></Panel></div>
                    {draft?.aiSummary ? <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Özet', 'Summary')}</p><p className="text-xs leading-5 text-muted-foreground">{draft.aiSummary}</p></div> : null}
                    <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Etiketler', 'Tags')}</p><div className="flex flex-wrap gap-1.5">{draft?.tags.length ? draft.tags.map((tag) => <StatusPill key={tag}>{tag}</StatusPill>) : <span className="text-xs text-muted-foreground">{t('Etiket yok', 'No tags')}</span>}</div></div>
                  </div>
                  <div className="border-t border-border/70 p-3"><label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2"><input aria-label={t('AI asistanına bu notu sor', 'Ask AI about this note')} placeholder={t('Bu not hakkında sor…', 'Ask about this note…')} className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" /><Sparkles className="size-3.5 text-primary" /></label></div>
                </aside>
              ) : null}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export { NotesPage }
