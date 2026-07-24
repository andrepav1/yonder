import type { CSSProperties } from 'react'
import type { GuessResult } from '@/lib/types'
import type { GameRules, Unit } from '@/config/rules'
import type { ModeKind } from '@/modes/daily'
import { tempLevel } from '@/lib/scoring'
import { cityLabel } from '@/lib/cities'
import { formatDistance, remainingPhrase, formatBearing } from '@/lib/format'
import { useI18n } from '@/i18n/context'

interface GuessRowProps {
  result: GuessResult
  rules: GameRules
  unit: Unit
  kind?: ModeKind
}

export function GuessRow({ result, rules, unit, kind = 'classic' }: GuessRowProps) {
  const { t, locale } = useI18n()

  // Hidden Destination: each guess is a probe toward the mystery city — show its
  // distance + bearing to the target and a hot/cold read, not a cumulative path.
  if (kind === 'hidden') {
    const level = result.temp ?? 0
    const toTargetKm = result.toTargetKm ?? 0
    const status = result.won ? t.hidden.found : t.hidden.away(formatDistance(toTargetKm, unit, t))
    return (
      <div
        className={`grow${result.won ? ' grow--win' : ''}`}
        style={{ '--temp': `var(--temp-${level})` } as CSSProperties}
      >
        <span className="grow__temp" aria-hidden="true" />
        <div className="grow__body">
          <div className="grow__city">{cityLabel(result.city, locale)}</div>
          <div className={`grow__delta${result.won ? ' grow__delta--win' : ''}`}>{status}</div>
        </div>
        {!result.won && (
          <div className="grow__meta">
            <div className="grow__bearing">{formatBearing(result.bearingDeg)}</div>
          </div>
        )}
      </div>
    )
  }

  const level = tempLevel(result, rules)
  const tempVar = `var(--temp-${level})`
  const status = result.won
    ? t.guessRow.insideBand
    : result.over
      ? t.guessRow.overshot(formatDistance(Math.abs(result.remainingKm), unit, t))
      : remainingPhrase(result.remainingKm, unit, t)
  const statusMod = result.won
    ? ' grow__delta--win'
    : result.over
      ? ' grow__delta--over'
      : ''
  return (
    <div
      className={`grow${result.won ? ' grow--win' : ''}${result.over ? ' grow--over' : ''}`}
      style={{ '--temp': tempVar } as CSSProperties}
    >
      <span className="grow__temp" aria-hidden="true" />
      <div className="grow__body">
        <div className="grow__city">
          {cityLabel(result.city, locale)}
          <span className="grow__leg"> +{formatDistance(result.legKm, unit, t)}</span>
        </div>
        <div className={`grow__delta${statusMod}`}>{status}</div>
      </div>
      <div className="grow__meta">
        <div className="grow__dist">{formatDistance(result.cumulativeKm, unit, t)}</div>
        <div className="grow__bearing">{formatBearing(result.bearingDeg)}</div>
      </div>
    </div>
  )
}
