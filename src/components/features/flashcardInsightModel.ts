import type { ApiInterviewFrequency } from '../../types/api'

export type FlashcardInsightDraft = {
  productionExample: string
  bankingExample: string
  interviewTip: string
  interviewFrequency: ApiInterviewFrequency | ''
}

export type FlashcardInsightSource = {
  productionExample?: string | null
  bankingExample?: string | null
  interviewTip?: string | null
  interviewFrequency?: ApiInterviewFrequency | null
}

export const emptyFlashcardInsights: FlashcardInsightDraft = {
  productionExample: '',
  bankingExample: '',
  interviewTip: '',
  interviewFrequency: '',
}

export function normalizeFlashcardInsights(value: FlashcardInsightDraft) {
  return {
    productionExample: value.productionExample.trim() || null,
    bankingExample: value.bankingExample.trim() || null,
    interviewTip: value.interviewTip.trim() || null,
    interviewFrequency: value.interviewFrequency || null,
  }
}

export function interviewFrequencyTone(value: ApiInterviewFrequency) {
  if (value === 'VeryHigh') return 'danger' as const
  if (value === 'High') return 'warning' as const
  if (value === 'Medium') return 'info' as const
  return 'neutral' as const
}

export function interviewFrequencyLabel(
  value: ApiInterviewFrequency,
  t: (tr: string, en: string) => string,
) {
  if (value === 'Low') return t('Düşük', 'Low')
  if (value === 'Medium') return t('Orta', 'Medium')
  if (value === 'High') return t('Yüksek', 'High')
  return t('Çok yüksek', 'Very high')
}
