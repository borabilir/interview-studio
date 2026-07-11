import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, Bot, FilePlus2, Lightbulb, Sparkles, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '../../lib/cn'
import { useI18n } from '../../i18n'
import { api } from '../../services/api'

type Message = { id: number; role: 'assistant' | 'user'; text: string }
type CompanionDashboardDto = {
  weakTopics: Array<{ id: string; name: string }>
  recentlySolvedCodingQuestions: Array<{ id: string; title: string }>
}

function buildResponse(prompt: string, t: (turkish: string, english: string) => string, latestCodingTitle?: string) {
  const normalized = prompt.toLowerCase()
  if (normalized.includes('kafka')) {
    return t(
      'Senior seviyede sık sorulan bir ayrımla başlayalım: at-most-once, at-least-once ve exactly-once delivery modellerini karşılaştır. Her birinde duplicate veya veri kaybının nerede oluşabileceğini ve banka transferi event’i için hangisini seçeceğini açıkla.',
      'Let’s start with a common senior-level distinction: compare at-most-once, at-least-once, and exactly-once delivery. For each, describe where duplicates or loss can occur—and which guarantee you would choose for a bank transfer event.',
    )
  }
  if (normalized.includes('coding') || normalized.includes('attempt') || normalized.includes('kod')) {
    return latestCodingTitle
      ? t(
        `DB’deki son coding çalışman “${latestCodingTitle}”. Kayıtlı attempt ve değerlendirme ayrıntılarını Coding sayfasında açabilirsin. Buradaki sohbet şu anda yerel demo modunda olduğu için çözümün hakkında yeni bir AI değerlendirmesi üretmiyor.`,
        `Your latest DB-backed coding exercise is “${latestCodingTitle}”. Open Coding to review its saved attempt and evaluation. This chat is currently in local demo mode, so it does not generate a new AI review of your solution.`,
      )
      : t(
        'Henüz DB’de değerlendirebileceğim bir coding attempt yok. Coding sayfasından çözüm gönderdiğinde değerlendirme kalıcı olarak kaydedilir.',
        'There is no coding attempt in the database to review yet. Submit a solution from Coding and its evaluation will be persisted.',
      )
  }
  if (normalized.includes('idempoten')) {
    return t(
      'Idempotency, aynı mantıksal request tekrarlandığında ek bir side effect oluşmaması demektir. Payment akışında client tarafından üretilen idempotency key’i kabul et, sonucu aynı transactional boundary içinde sakla ve retry sırasında kayıtlı sonucu döndür. Kritik tasarım sorusu key’in ne kadar süre tutulacağıdır.',
      'Idempotency means repeating the same logical request produces no additional side effect. For payments, accept a client-generated idempotency key, persist it with the result in the same transactional boundary, and return that stored result on retry. The key design question is how long to retain it.',
    )
  }
  return t(
    'Bu sohbet şu anda yerel demo yanıtları kullanıyor; canlı AI provider bağlı değil. Kalıcı değerlendirme için ilgili Coding veya Mock Interview akışını kullanabilirsin.',
    'This chat currently uses local demo responses; no live AI provider is connected. Use the Coding or Mock Interview flow for a persisted evaluation.',
  )
}

export function AICompanion({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const dashboardQuery = useQuery({
    queryKey: ['dashboard', 'ai-companion-context'],
    queryFn: () => api.dashboard.get<CompanionDashboardDto>(),
    enabled: open,
    staleTime: 60_000,
  })
  const weakTopicNames = dashboardQuery.data?.weakTopics.slice(0, 3).map((topic) => topic.name) ?? []
  const latestCodingTitle = dashboardQuery.data?.recentlySolvedCodingQuestions[0]?.title
  const welcomeMessage = t(
    'Hazırlanmana yardımcı olmaya hazırım. Bir cevabı değerlendirebilir, bir kavramı açıklayabilir veya zayıf konularından odaklı bir pratik seti oluşturabilirim.',
    'I’m ready to help you prepare. I can review an answer, explain a concept, or turn your weak topics into a focused practice set.',
  )
  const [messages, setMessages] = useState<Message[]>([{ id: 1, role: 'assistant', text: welcomeMessage }])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const suggestions = [
    t('Kafka semantics konusunda beni test et', 'Quiz me on Kafka semantics'),
    t('Son coding attempt’ımı değerlendir', 'Review my latest coding attempt'),
    t('Payment idempotency kavramını açıkla', 'Explain payment idempotency'),
  ]

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  useEffect(() => {
    setMessages((items) => items.length === 1 && items[0].id === 1
      ? [{ ...items[0], text: welcomeMessage }]
      : items)
  }, [welcomeMessage])

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, open])

  const submit = (event?: FormEvent, suggestion?: string) => {
    event?.preventDefault()
    const prompt = (suggestion ?? input).trim()
    if (!prompt || thinking) return
    setMessages((items) => [...items, { id: Date.now(), role: 'user', text: prompt }])
    setInput('')
    setThinking(true)
    window.setTimeout(() => {
      setMessages((items) => [...items, { id: Date.now() + 1, role: 'assistant', text: buildResponse(prompt, t, latestCodingTitle) }])
      setThinking(false)
    }, 650)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button className="fixed inset-0 z-[70] bg-black/15 backdrop-blur-[2px]" aria-label={t('AI koçunu kapat', 'Close AI coach')} onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 330 }}
            className="fixed inset-y-0 right-0 z-[80] flex w-full max-w-[430px] flex-col border-l bg-panel shadow-float"
            aria-label={t('AI koçu', 'AI coach')}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex h-[72px] items-center gap-3 border-b px-5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-canvas dark:bg-accent dark:text-white"><Sparkles className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">Interview Studio AI</h2><p className="text-[10px] text-muted">{t('DB bağlamı · yerel demo', 'DB context · local demo')}</p></div>
              <span className="mr-1 flex items-center gap-1.5 text-[9px] font-medium text-amber-600 dark:text-amber-400"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {t('Demo', 'Demo')}</span>
              <button onClick={onClose} className="focus-ring rounded-xl p-2 text-muted hover:bg-canvas hover:text-ink" aria-label={t('AI koçunu kapat', 'Close AI coach')}><X className="h-4 w-4" /></button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
              <div className="mb-6 rounded-2xl border bg-canvas/65 p-4">
                <div className="flex items-center gap-2 text-[10px] font-semibold text-muted"><Lightbulb className="h-3.5 w-3.5 text-accent" /> {t('BUGÜNÜN BAĞLAMI', 'TODAY’S CONTEXT')}</div>
                <p className="mt-2 text-xs leading-relaxed">{dashboardQuery.isLoading
                  ? t('Çalışma bağlamın DB’den yükleniyor…', 'Loading your study context from the database…')
                  : weakTopicNames.length
                    ? t(`DB’ye göre odak gerektiren konuların: ${weakTopicNames.join(', ')}.`, `Topics needing focus according to the database: ${weakTopicNames.join(', ')}.`)
                    : t('DB’de henüz odak bağlamı oluşturacak yeterli kayıt yok.', 'There is not enough data in the database to build focus context yet.')}</p>
              </div>
              <div className="space-y-5">
                {messages.map((message) => (
                  <div key={message.id} className={cn('flex gap-2.5', message.role === 'user' && 'justify-end')}>
                    {message.role === 'assistant' && <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent"><Bot className="h-3.5 w-3.5" /></span>}
                    <div className={cn('max-w-[84%] rounded-2xl px-3.5 py-3 text-[12px] leading-[1.65]', message.role === 'user' ? 'rounded-br-md bg-ink text-canvas dark:bg-white dark:text-[#252421]' : 'rounded-bl-md border bg-canvas')}>
                      {message.text}
                      {message.role === 'assistant' && message.id !== 1 && (
                        <div className="mt-3 flex items-center gap-2 border-t pt-2 text-muted">
                          <button className="hover:text-ink" aria-label={t('Yararlı', 'Helpful')}><ThumbsUp className="h-3 w-3" /></button>
                          <button className="hover:text-ink" aria-label={t('Yararlı değil', 'Not helpful')}><ThumbsDown className="h-3 w-3" /></button>
                          <button className="ml-auto flex items-center gap-1 text-[9px] hover:text-ink"><FilePlus2 className="h-3 w-3" /> {t('Not olarak kaydet', 'Save as note')}</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {thinking && (
                  <div className="flex items-center gap-2.5"><span className="grid h-7 w-7 place-items-center rounded-lg bg-accent/10 text-accent"><Bot className="h-3.5 w-3.5" /></span><span className="flex gap-1 rounded-2xl rounded-bl-md border bg-canvas px-4 py-3">{[0, 1, 2].map((dot) => <i key={dot} className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-muted" style={{ animationDelay: `${dot * 140}ms` }} />)}</span></div>
                )}
                <div ref={endRef} />
              </div>
            </div>

            <div className="border-t bg-panel p-4">
              {messages.length === 1 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {suggestions.map((suggestion) => <button key={suggestion} onClick={() => submit(undefined, suggestion)} className="focus-ring rounded-lg border bg-canvas px-2.5 py-1.5 text-[10px] text-muted transition hover:border-accent/30 hover:text-ink">{suggestion}</button>)}
                </div>
              )}
              <form onSubmit={submit} className="rounded-2xl border bg-canvas p-2 shadow-sm focus-within:border-accent/35 focus-within:ring-2 focus-within:ring-accent/10">
                <textarea autoFocus value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) submit(event) }} rows={2} placeholder={t('Sor, pratik yap veya geri bildirim al…', 'Ask, practice, or get feedback…')} className="block w-full resize-none bg-transparent px-2 py-1 text-xs leading-relaxed outline-none placeholder:text-muted/65" />
                <div className="mt-1 flex items-center justify-between px-1"><span className="text-[9px] text-muted">{t('Yeni satır için Shift + Enter', 'Shift + Enter for a new line')}</span><button type="submit" disabled={!input.trim() || thinking} className="focus-ring grid h-7 w-7 place-items-center rounded-lg bg-ink text-canvas transition hover:opacity-85 disabled:opacity-30 dark:bg-accent dark:text-white" aria-label={t('Mesaj gönder', 'Send message')}><ArrowUp className="h-3.5 w-3.5" /></button></div>
              </form>
              <p className="mt-2 text-center text-[9px] text-muted/70">{t('AI hata yapabilir. Önemli teknik ayrıntıları doğrula.', 'AI can make mistakes. Validate important technical details.')}</p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
