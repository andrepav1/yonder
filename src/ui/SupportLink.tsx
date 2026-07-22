import { defaultMonetization } from '@/config/monetization'
import { useI18n } from '@/i18n/context'
import { HeartIcon } from './icons'

interface SupportLinkProps {
  /** Compact inline variant (e.g. inside the About dialog). */
  compact?: boolean
}

/**
 * External support / "buy me a coffee" link. Renders nothing when no support
 * URL is configured in `monetization.ts`, so it stays fully opt-in.
 */
export function SupportLink({ compact = false }: SupportLinkProps) {
  const { t } = useI18n()
  const url = defaultMonetization.supportUrl
  if (!url) return null
  return (
    <a
      className={`support${compact ? ' support--compact' : ''}`}
      href={url}
      target="_blank"
      rel="noreferrer"
    >
      <HeartIcon />
      <span>{t.support.cta}</span>
    </a>
  )
}
