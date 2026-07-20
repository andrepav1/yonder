import type { CSSProperties } from 'react'
import type { GuessResult } from '@/lib/types'
import type { GameRules, Unit } from '@/config/rules'
import { tempLevel } from '@/lib/scoring'
import { cityLabel } from '@/lib/cities'
import { formatDistance, remainingPhrase, formatBearing } from '@/lib/format'
import { useI18n } from '@/i18n/context'

interface GuessRowProps {
  result: GuessResult
  rules: GameRules
  unit: Unit
}

export function GuessRow({ result, rules, unit }: GuessRowProps) {
  const { t, locale } = useI18n()
  const level = tempLevel(result, rules)
  const tempVar = `var(--temp-${level})`
  const status = result.won
    ? t.guessRow.insideBand
    : result.over
      ? t.guessRow.overshot
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
