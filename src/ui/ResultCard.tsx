import type { RoundState } from '@/lib/types'
import type { GameRules, Unit } from '@/config/rules'
import { scoreRound } from '@/lib/scoring'
import { deltaPhrase } from '@/lib/format'
import { ShareIcon, CheckIcon } from './icons'

interface ResultCardProps {
  state: RoundState
  rules: GameRules
  unit: Unit
  onShare: () => void
  shareLabel: string
}

export function ResultCard({
  state,
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

      <div className="result__answer-note">
        The ring on the globe marks every perfect answer — the closest cities are
        pinned along it.
      </div>

      <button className="btn" onClick={onShare}>
        {shareLabel === 'Copied!' ? <CheckIcon /> : <ShareIcon />}
        {shareLabel}
      </button>
    </section>
  )
}
