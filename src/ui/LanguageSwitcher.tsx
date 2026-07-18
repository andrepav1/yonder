import { LOCALES } from '@/i18n'
import { useI18n } from '@/i18n/context'
import { LanguageIcon } from './icons'

/**
 * Compact language picker for the header: a globe icon + the current short code,
 * with a native <select> laid over it for accessible, zero-dependency behaviour
 * (keyboard, outside-click, and the OS picker on mobile all come for free).
 */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0]!

  return (
    <div className="lang">
      <LanguageIcon />
      <span className="lang__code">{current.short}</span>
      <select
        className="lang__select"
        aria-label={t.header.language}
        value={locale}
        onChange={(e) => setLocale(e.target.value as typeof locale)}
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  )
}
