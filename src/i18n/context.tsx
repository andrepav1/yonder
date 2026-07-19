// React binding for i18n: a provider that owns the active locale (persisted +
// browser-detected on first run) and a `useI18n` hook exposing the current
// catalog as `t`, plus `locale` / `setLocale`.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Locale, Messages } from './types'
import { defaultLocale, detectLocale, getMessages } from './index'
import { loadLocale, saveLocale } from '@/store/prefs'

interface I18nValue {
  locale: Locale
  t: Messages
  setLocale: (locale: Locale) => void
}

const I18nContext = createContext<I18nValue | null>(null)

/** Initial locale: a saved preference wins, else the browser's language. */
function initialLocale(): Locale {
  const saved = loadLocale()
  if (saved) return saved
  if (typeof navigator !== 'undefined') {
    const langs = navigator.languages ?? [navigator.language]
    return detectLocale(langs.filter(Boolean))
  }
  return defaultLocale
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    saveLocale(next)
  }, [])

  // Keep <html lang> in sync for a11y + correct hyphenation/quotes.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  const value = useMemo<I18nValue>(
    () => ({ locale, t: getMessages(locale), setLocale }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider')
  return ctx
}
