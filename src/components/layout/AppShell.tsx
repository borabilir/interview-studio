import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Command,
  CreditCard,
  Layers3,
  Menu,
  Moon,
  Plus,
  Search,
  Sun,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cn } from '../../lib/cn'
import { useAppearance } from '../../hooks/use-appearance'
import { useTheme } from '../../hooks/use-theme'
import { Button } from '../ui/Button'
import { useI18n } from '../../i18n'
import { useDebouncedValue } from '../../hooks/use-debounced-value'
import { api } from '../../services/api'
import type { SearchResultDto } from '../../types/api'

const navigation = [
  { tr: 'Konular', en: 'Topics', to: '/topics', icon: Layers3 },
  { tr: 'Pratik', en: 'Practice', to: '/flashcards', icon: CreditCard },
]

function AppMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-ink text-canvas shadow-sm dark:bg-accent dark:text-white">
        <BookOpenCheck className="h-4 w-4" />
      </div>
      {!compact ? <span className="text-[15px] font-semibold tracking-[-0.035em]">Interview Studio</span> : null}
    </div>
  )
}

function Sidebar({
  collapsed,
  onCollapse,
  mobileOpen,
  onMobileClose,
}: {
  collapsed: boolean
  onCollapse: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}) {
  const { t } = useI18n()

  return (
    <>
      <AnimatePresence>
        {mobileOpen ? (
          <motion.button
            aria-label={t('Navigasyonu kapat', 'Close navigation')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={onMobileClose}
          />
        ) : null}
      </AnimatePresence>
      <aside
        className={cn(
          'glass-panel fixed inset-y-0 left-0 z-50 flex flex-col border-r transition-[width,transform] duration-300 ease-out lg:translate-x-0',
          collapsed ? 'w-[76px]' : 'w-[236px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className={cn('flex h-[72px] items-center border-b px-5', collapsed && 'justify-center px-0')}>
          <AppMark compact={collapsed} />
          <button
            onClick={onMobileClose}
            className="focus-ring ml-auto rounded-lg p-1 text-muted lg:hidden"
            aria-label={t('Navigasyonu kapat', 'Close navigation')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-5">
          {!collapsed ? (
            <p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted/70">
              {t('Çalışma', 'Workspace')}
            </p>
          ) : null}
          <div className="space-y-1">
            {navigation.map((item) => {
              const label = t(item.tr, item.en)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onMobileClose}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'focus-ring group relative flex h-10 items-center rounded-xl text-[13px] font-medium transition-colors',
                      collapsed ? 'justify-center px-0' : 'gap-3 px-2.5',
                      isActive
                        ? 'bg-ink text-canvas shadow-sm dark:bg-white dark:text-[#1e1e1c]'
                        : 'text-muted hover:bg-ink/[0.05] hover:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={cn('h-[17px] w-[17px] shrink-0', isActive ? 'stroke-[2.2]' : 'stroke-[1.8]')} />
                      {!collapsed ? <span className="truncate">{label}</span> : null}
                      {isActive && !collapsed ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" /> : null}
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        </nav>

        {!collapsed ? (
          <div className="border-t p-3">
            <div className="rounded-xl border bg-canvas/70 p-3">
              <p className="text-xs font-semibold">{t('Odak modu', 'Focus mode')}</p>
              <p className="mt-1 text-[11px] leading-4 text-muted">
                {t('Sadece soru ekle, filtrele ve pratik et.', 'Only add, filter, and practice questions.')}
              </p>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onCollapse}
          aria-label={collapsed ? t('Kenar çubuğunu genişlet', 'Expand sidebar') : t('Kenar çubuğunu daralt', 'Collapse sidebar')}
          className="focus-ring absolute -right-3 top-[84px] hidden h-6 w-6 place-items-center rounded-full border bg-panel text-muted shadow-sm transition hover:text-ink lg:grid"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>
    </>
  )
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { t } = useI18n()
  const debouncedQuery = useDebouncedValue(query.trim(), 250)
  const { data: searchResults = [], isFetching } = useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: () => api.search<SearchResultDto[]>(debouncedQuery),
    enabled: open && debouncedQuery.length >= 2,
    staleTime: 30_000,
  })

  const results = useMemo(() => {
    const staticItems = [
      { label: t('Hızlı soru ekle', 'Quick add question'), to: '/topics?quickAdd=1', icon: Plus, hint: t('Ekle', 'Add') },
      ...navigation.map((item) => ({ label: t(item.tr, item.en), to: item.to, icon: item.icon, hint: t('Git', 'Navigate') })),
    ]
    const iconByKind: Record<string, typeof Layers3> = {
      Topic: Layers3,
      Flashcard: CreditCard,
    }
    const hintByKind: Record<string, string> = {
      Topic: t('Konu', 'Topic'),
      Flashcard: t('Soru', 'Question'),
    }
    const workspaceItems = searchResults
      .filter((result) => result.kind === 'Topic' || result.kind === 'Flashcard')
      .map((result) => ({
        label: result.title,
        to: result.path,
        icon: iconByKind[result.kind] ?? Search,
        hint: hintByKind[result.kind] ?? result.kind,
      }))
    const normalized = query.toLowerCase().trim()
    return [...staticItems, ...workspaceItems]
      .filter((item) => item.label.toLowerCase().includes(normalized))
      .slice(0, 10)
  }, [query, searchResults, t])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, open])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/25 px-4 pt-[14vh] backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t('Hızlı arama', 'Quick search')}
            initial={{ opacity: 0, scale: 0.97, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.17 }}
            className="w-full max-w-[590px] overflow-hidden rounded-2xl border bg-panel shadow-float"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex h-14 items-center gap-3 border-b px-4">
              <Search className="h-[18px] w-[18px] text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('Konu veya soru ara...', 'Search topics or questions...')}
                className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70"
              />
              <kbd className="rounded-md border bg-canvas px-1.5 py-0.5 font-sans text-[10px] text-muted">ESC</kbd>
            </div>
            <div className="max-h-[360px] overflow-y-auto p-2">
              <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                {t('Eşleşmeler', 'Matches')}
              </p>
              {results.map((item) => (
                <button
                  key={`${item.label}-${item.hint}`}
                  onClick={() => {
                    navigate(item.to)
                    onClose()
                  }}
                  className="focus-ring group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-canvas"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg border bg-panel text-muted group-hover:text-ink">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  <span className="text-xs text-muted">{item.hint}</span>
                </button>
              ))}
              {isFetching ? <div className="py-6 text-center text-sm text-muted">{t('Aranıyor...', 'Searching...')}</div> : null}
              {!isFetching && results.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted">{t('Sonuç bulunamadı.', 'Nothing found.')}</div>
              ) : null}
            </div>
            <div className="flex items-center justify-between border-t bg-canvas/60 px-4 py-2 text-[10px] text-muted">
              <span>{t('Konu ve sorularda ara', 'Search topics and questions')}</span>
              <span className="flex items-center gap-1"><Command className="h-3 w-3" /> K</span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const { resolvedTheme, toggleTheme } = useTheme()
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  useAppearance()

  const page = location.pathname.startsWith('/flashcards')
    ? { title: t('Pratik', 'Practice'), eyebrow: t('Mülakat simülasyonu', 'Interview simulation') }
    : location.pathname.startsWith('/topics/')
      ? { title: t('Konu', 'Topic'), eyebrow: t('Soru-cevap çalışma alanı', 'Question workspace') }
      : { title: t('Konular', 'Topics'), eyebrow: t('Soru havuzu', 'Question bank') }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen((value) => !value)
      }
      if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) {
        event.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="ambient-glow min-h-screen bg-canvas text-ink">
      <Sidebar
        collapsed={collapsed}
        onCollapse={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className={cn('min-h-screen transition-[padding] duration-300', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[236px]')}>
        <header className="sticky top-0 z-30 flex h-[72px] items-center border-b bg-canvas/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button
            className="focus-ring mr-3 rounded-lg p-2 text-muted lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label={t('Navigasyonu aç', 'Open navigation')}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="hidden text-[10px] font-semibold uppercase tracking-[0.13em] text-muted sm:block">{page.eyebrow}</p>
            <h1 className="truncate text-[17px] font-semibold tracking-[-0.03em]">{page.title}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setCommandOpen(true)}
              className="focus-ring hidden h-9 w-[230px] items-center gap-2 rounded-xl border bg-panel/70 px-3 text-left text-xs text-muted shadow-sm transition hover:border-muted/40 md:flex"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="flex-1">{t('Konu veya soru ara...', 'Search topics or questions...')}</span>
              <kbd className="rounded border bg-canvas px-1.5 py-0.5 font-sans text-[9px]">⌘ K</kbd>
            </button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              className="hidden sm:flex"
              onClick={() => navigate('/topics?quickAdd=1')}
            >
              {t('Hızlı soru', 'Quick question')}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t('Temayı değiştir', 'Toggle theme')}>
              {resolvedTheme === 'dark' ? <Sun className="h-[17px] w-[17px]" /> : <Moon className="h-[17px] w-[17px]" />}
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1320px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  )
}
