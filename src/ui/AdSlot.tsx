import { useEffect } from 'react'
import { defaultMonetization } from '@/config/monetization'
import { useI18n } from '@/i18n/context'

// Google AdSense placement. Purely presentational and fully opt-in: renders
// nothing unless BOTH a publisher client and a slot id are configured in
// `monetization.ts`. With ads unconfigured (the default) no script loads and no
// ad markup is emitted, so the app stays static + offline-friendly.
//
// Kept out of the pure core — `lib/*` never imports this.

let scriptRequested = false

function ensureAdSenseScript(client: string): void {
  if (scriptRequested || typeof document === 'undefined') return
  scriptRequested = true
  if (document.querySelector('script[data-yondle-ads]')) return
  const s = document.createElement('script')
  s.async = true
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
    client,
  )}`
  s.crossOrigin = 'anonymous'
  s.dataset.yondleAds = 'true'
  document.head.appendChild(s)
}

/** Post-result AdSense placement, read from the app-level monetization config. */
export function AdSlot() {
  const { t } = useI18n()
  const { client, resultSlot } = defaultMonetization.ads
  const enabled = Boolean(client && resultSlot)

  useEffect(() => {
    if (!enabled) return
    ensureAdSenseScript(client)
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] }
      ;(w.adsbygoogle = w.adsbygoogle || []).push({})
    } catch {
      // AdSense unavailable (not approved, offline, or blocked) — leave it empty.
    }
  }, [enabled, client])

  if (!enabled) return null

  return (
    <aside className="result__ad" aria-label={t.ads.label}>
      <span className="result__ad-label">{t.ads.label}</span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={resultSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  )
}
