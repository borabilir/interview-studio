import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { useI18n } from './i18n'

const TopicsPage = lazy(() => import('./pages/TopicsPage'))
const TopicDetailPage = lazy(() => import('./pages/TopicDetailPage'))
const FlashcardsPage = lazy(() => import('./pages/FlashcardsPage'))

function PageLoader() {
  const { t } = useI18n()
  return (
    <div className="animate-pulse space-y-5" aria-label={t('Sayfa yükleniyor', 'Loading page')}>
      <div className="space-y-2">
        <div className="h-3 w-20 rounded bg-muted" />
        <div className="h-8 w-56 rounded-lg bg-muted" />
        <div className="h-3 w-96 max-w-full rounded bg-muted" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-32 rounded-2xl bg-muted" />
        <div className="h-32 rounded-2xl bg-muted" />
        <div className="h-32 rounded-2xl bg-muted" />
      </div>
      <div className="h-80 rounded-2xl bg-muted" />
    </div>
  )
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/topics" replace />} />
        <Route path="topics" element={<LazyPage><TopicsPage /></LazyPage>} />
        <Route path="topics/:topicId" element={<LazyPage><TopicDetailPage /></LazyPage>} />
        <Route path="flashcards" element={<LazyPage><FlashcardsPage /></LazyPage>} />
        <Route path="*" element={<Navigate to="/topics" replace />} />
      </Route>
    </Routes>
  )
}
