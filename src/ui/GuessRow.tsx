import type { CSSProperties } from 'react'
import type { GuessResult } from '@/lib/types'
import type { GameRules, Unit } from '@/config/rules'
import { tempLevel } from '@/lib/scoring'
import { cityLabel } from '@/lib/cities'
import { formatDistance, deltaPhrase, formatDirection } from '@/lib/format'

interface GuessRowProps {
  result: GuessResult
  rules: GameRules
  unit: Unit
}

export function GuessRow({ result, rules, unit }: GuessRowProps) {
  const level = tempLevel(result, rules)
  const tempVar = `var(--temp-${level})`
  return (
    <div
      className={`grow${result.won ? ' grow--win' : ''}`}
      style={{ '--temp': tempVar } as CSSProperties}
    >
      <span className="grow__temp" aria-hidden="true" />
      <div className="grow__body">
        <div className="grow__city">{cityLabel(result.city)}</div>
        <div className={`grow__delta${result.won ? ' grow__delta--win' : ''}`}>
          {result.won ? 'Inside the band!' : deltaPhrase(result.deltaKm, unit)}
        </div>
      </div>
      <div className="grow__meta">
        <div className="grow__dist">{formatDistance(result.distanceKm, unit)}</div>
        <div className="grow__dir">{formatDirection(result.bearingDeg)}</div>
      </div>
    </div>
  )
}
