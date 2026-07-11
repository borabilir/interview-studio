import { useCallback, useEffect, type ReactNode } from 'react'
import { useLocalStorage } from '../hooks/use-local-storage'
import { I18nContext, type AppLanguage } from './context'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useLocalStorage<AppLanguage>('language', 'tr')

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const t = useCallback(
    (turkish: string, english: string) => (language === 'tr' ? turkish : english),
    [language],
  )

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t,
        locale: language === 'tr' ? 'tr-TR' : 'en-US',
      }}
    >
      {children}
    </I18nContext.Provider>
  )
}
