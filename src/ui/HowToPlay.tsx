import type { PuzzleSpec } from '@/lib/types'
import type { GameRules, Unit } from '@/config/rules'
import { bandLabel } from '@/lib/format'
import { Modal } from './Modal'

interface HowToPlayProps {
  rules: GameRules
  puzzle: PuzzleSpec
  unit: Unit
  onClose: () => void
}

export function HowToPlay({ rules, puzzle, unit, onClose }: HowToPlayProps) {
  const band = bandLabel(puzzle.targetKm, rules.tolerancePct, unit)
  return (
    <Modal title="How to play" onClose={onClose}>
      <p style={{ marginTop: 0 }}>
        Every day, one <strong>start city</strong> and one{' '}
        <strong>target distance</strong>. Build a journey city by city and add up the hops
        — reach the target without going over.
      </p>

      <div className="howto__step">
        <span className="howto__num">1</span>
        <p>
          Guess a city. Your score is the <strong>distance from the start</strong> to it
          (as the crow flies). Guess again and the hop from your{' '}
          <strong>last city</strong> to the new one is <strong>added on</strong>.
        </p>
      </div>
      <div className="howto__step">
        <span className="howto__num">2</span>
        <p>
          Keep hopping to climb toward the target. The <strong>hot / cold</strong> cue
          warms up as your running total nears it — watch the <strong>“to go”</strong>
          number shrink.
        </p>
      </div>
      <div className="howto__step">
        <span className="howto__num">3</span>
        <p>
          Land your total within <strong>{band}</strong> below the target to win. Go{' '}
          <strong>over</strong> and you bust — so does running out of{' '}
          <strong>{rules.guesses} guesses</strong>. Fewer hops is a better score.
        </p>
      </div>

      <button className="btn" onClick={onClose}>
        Let’s wander
      </button>
    </Modal>
  )
}
