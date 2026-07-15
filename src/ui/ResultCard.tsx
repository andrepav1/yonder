import type { PuzzleSpec, RoundState } from '@/lib/types'
import type { GameRules, Unit } from '@/config/rules'
import { scoreRound } from '@/lib/scoring'
import { cityLabel } from '@/lib/cities'
import { formatDistance, deltaPhrase } from '@/lib/format'
import { ShareIcon, CheckIcon } from './icons'

interface ResultCardProps {
  state: RoundState
  puzzle: PuzzleSpec
  rules: GameRules
  unit: Unit
  onShare: () => void
  shareLabel: string
}

export function ResultCard({
  state,
  puzzle,
  rules,
  unit,
  onShare,
  shareLabel,
}: ResultCardProps) {
  const won = state.status === 'won'
  const breakdown = scoreRound(state.guesses, won, rules)

  return (
    <section className="result" aria-live="polite">
      <div className="result__badge">
        {won ? `Solved in ${breakdown.guessesUsed}/${rules.guesses}` : 'Out of guesses'}
      </div>
      <h2 className={`result__headline${won ? ' result__headline--win' : ''}`}>
        {won ? 'You found it' : 'So close'}
      </h2>
      <div className="result__score mono">
        {breakdown.score}
        <span className="unit">pts</span>
      </div>
      <div className="result__line">
        {won &&
          breakdown.bonus > 0 &&
          `${breakdown.base} base + ${breakdown.bonus} speed · `}
        best guess {deltaPhrase(breakdown.bestDeltaKm, unit)}
      </div>

      <div className="answers">
        <div className="answers__title">Closest possible answers</div>
        {puzzle.answers.map((a) => (
          <div className="answers__item" key={a.city.id}>
            <span>{cityLabel(a.city)}</span>
            <span className="mono">{formatDistance(a.distanceKm, unit)}</span>
          </div>
        ))}
      </div>

      <button className="btn" onClick={onShare}>
        {shareLabel === 'Copied!' ? <CheckIcon /> : <ShareIcon />}
        {shareLabel}
      </button>
    </section>
  )
}
