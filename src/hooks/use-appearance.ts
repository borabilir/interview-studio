import { useEffect } from 'react'
import { useLocalStorage } from './use-local-storage'

export const accentColors = {
  Coral: '218 91 68',
  Indigo: '99 102 241',
  Blue: '14 165 233',
  Violet: '139 92 246',
  Emerald: '16 143 101',
  Rose: '225 70 104',
} as const

export type AccentColor = keyof typeof accentColors

export function useAppearance() {
  const [accent, setAccent] = useLocalStorage<AccentColor>('accent', 'Coral')
  const [fontSize, setFontSize] = useLocalStorage('interface-font-size', 15)
  const [reduceMotion, setReduceMotion] = useLocalStorage('reduce-motion', false)

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentColors[accent])
  }, [accent])

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`
  }, [fontSize])

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion)
  }, [reduceMotion])

  return { accent, setAccent, fontSize, setFontSize, reduceMotion, setReduceMotion }
}
