import type { PuzzleSpec, RoundState } from '@/lib/types'
import type { GameRules, Unit } from '@/config/rules'
import { scoreRound } from '@/lib/scoring'
import { formatDistance, remainingPhrase } from '@/lib/format'
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

  const badge = won
    ? `Solved in ${breakdown.guessesUsed}/${rules.guesses}`
    : breakdown.overshot
      ? 'Overshot the target'
      : 'Out of guesses'
  const headline = won ? 'You made it' : breakdown.overshot ? 'Too far!' : 'So close'

  return (
    <section className="result" aria-live="polite">
      <div className="result__badge">{badge}</div>
      <h2 className={`result__headline${won ? ' result__headline--win' : ''}`}>
        {headline}
      </h2>
      <div className="result__score mono">{formatDistance(breakdown.totalKm, unit)}</div>
      <div className="result__line">
        of {formatDistance(puzzle.targetKm, unit)} target ·{' '}
        {won ? 'landed in the band' : remainingPhrase(breakdown.remainingKm, unit)}
      </div>

      <div className="result__answer-note">
        The ring on the globe marks the target distance as a single straight hop — the
        closest cities to it are pinned along it.
      </div>

      <button className="btn" onClick={onShare}>
        {shareLabel === 'Copied!' ? <CheckIcon /> : <ShareIcon />}
        {shareLabel}
      </button>
    </section>
  )
}
