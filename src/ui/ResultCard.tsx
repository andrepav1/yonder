import type { PuzzleSpec, RoundState } from '@/lib/types'
import type { GameRules, Unit } from '@/config/rules'
import { scoreRound } from '@/lib/scoring'
import { formatDistance, remainingPhrase } from '@/lib/format'
import { useI18n } from '@/i18n/context'
import { ShareIcon, CheckIcon } from './icons'

interface ResultCardProps {
  state: RoundState
  puzzle: PuzzleSpec
  rules: GameRules
  unit: Unit
  onShare: () => void
  copied: boolean
}

export function ResultCard({
  state,
  puzzle,
  rules,
  unit,
  onShare,
  copied,
}: ResultCardProps) {
  const { t } = useI18n()
  const won = state.status === 'won'
  const breakdown = scoreRound(state.guesses, won, rules)

  const badge = won
    ? t.result.solved(breakdown.guessesUsed, rules.guesses)
    : breakdown.overshot
      ? t.result.overshotBadge
      : t.result.outOfGuesses
  const headline = won
    ? t.result.headlineWin
    : breakdown.overshot
      ? t.result.headlineOver
      : t.result.headlineClose

  return (
    <section className="result" aria-live="polite">
      <div className="result__badge">{badge}</div>
      <h2 className={`result__headline${won ? ' result__headline--win' : ''}`}>
        {headline}
      </h2>
      <div className="result__score mono">
        {formatDistance(breakdown.totalKm, unit, t)}
      </div>
      <div className="result__line">
        {t.result.ofTarget(formatDistance(puzzle.targetKm, unit, t))} ·{' '}
        {won ? t.result.landedInBand : remainingPhrase(breakdown.remainingKm, unit, t)}
      </div>

      <div className="result__answer-note">{t.result.answerNote}</div>

      <button className="btn" onClick={onShare}>
        {copied ? <CheckIcon /> : <ShareIcon />}
        {copied ? t.result.copied : t.result.share}
      </button>
    </section>
  )
}
