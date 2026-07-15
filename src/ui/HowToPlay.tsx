import type { GameRules } from '@/config/rules'
import { Modal } from './Modal'

interface HowToPlayProps {
  rules: GameRules
  onClose: () => void
}

export function HowToPlay({ rules, onClose }: HowToPlayProps) {
  const pct = Math.round(rules.tolerancePct * 100)
  return (
    <Modal title="How to play" onClose={onClose}>
      <p style={{ marginTop: 0 }}>
        Every day, one <strong>start city</strong> and one{' '}
        <strong>target distance</strong>. Name a real city that sits as close as possible
        to that distance from the start — as the crow flies.
      </p>

      <div className="howto__step">
        <span className="howto__num">1</span>
        <p>
          Type a city and guess. You’ll see its <strong>distance</strong> from the start,
          how far that is from the target, and the <strong>direction</strong> (bearing) to
          it.
        </p>
      </div>
      <div className="howto__step">
        <span className="howto__num">2</span>
        <p>
          Use the <strong>hot / cold</strong> cue to home in. Warm means your distance is
          near the target; cool means you’re off.
        </p>
      </div>
      <div className="howto__step">
        <span className="howto__num">3</span>
        <p>
          Land within <strong>±{pct}%</strong> of the target within{' '}
          <strong>{rules.guesses} guesses</strong> to win. Fewer guesses score more.
        </p>
      </div>

      <button className="btn" onClick={onClose}>
        Let’s wander
      </button>
    </Modal>
  )
}
