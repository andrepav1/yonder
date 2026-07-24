import type { PuzzleSpec, RoundState } from '@/lib/types'
import type { GameRules, Unit } from '@/config/rules'
import { scoreRound } from '@/lib/scoring'
import { formatDistance, remainingPhrase } from '@/lib/format'
import { useI18n } from '@/i18n/context'
import { ShareIcon, CheckIcon, ShuffleIcon } from './icons'
import { SupportLink } from './SupportLink'
import { AdSlot } from './AdSlot'

interface ResultCardProps {
  state: RoundState
  puzzle: PuzzleSpec
  rules: GameRules
  unit: Unit
  onShare: () => void
  copied: boolean
  /** In free-play, offered alongside sharing — start a fresh puzzle. */
  onNewPuzzle?: () => void
}

export function ResultCard({
  state,
  puzzle,
  rules,
  unit,
  onShare,
  copied,
  onNewPuzzle,
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

      <div className="result__actions">
        <button className="btn" onClick={onShare}>
          {copied ? <CheckIcon /> : <ShareIcon />}
          {copied ? t.result.copied : t.result.share}
        </button>
        {onNewPuzzle && (
          <button className="btn btn--ghost" onClick={onNewPuzzle}>
            <ShuffleIcon />
            {t.modes.newPuzzle}
          </button>
        )}
      </div>

      <div className="result__support">
        <span className="result__support-note">{t.support.note}</span>
        <SupportLink />
      </div>

      <AdSlot />
    </section>
  )
}
