import type { PuzzleSpec } from '@/lib/types'
import type { GameRules, Unit } from '@/config/rules'
import { bandLabel } from '@/lib/format'
import { useI18n } from '@/i18n/context'
import { Modal } from './Modal'

interface HowToPlayProps {
  rules: GameRules
  puzzle: PuzzleSpec
  unit: Unit
  onClose: () => void
}

export function HowToPlay({ rules, puzzle, unit, onClose }: HowToPlayProps) {
  const { t } = useI18n()
  const band = bandLabel(puzzle.targetKm, rules.tolerancePct, unit, t)
  return (
    <Modal title={t.howTo.title} onClose={onClose}>
      <p style={{ marginTop: 0 }}>{t.howTo.intro}</p>

      <div className="howto__step">
        <span className="howto__num">1</span>
        <p>{t.howTo.step1}</p>
      </div>
      <div className="howto__step">
        <span className="howto__num">2</span>
        <p>{t.howTo.step2}</p>
      </div>
      <div className="howto__step">
        <span className="howto__num">3</span>
        <p>{t.howTo.step3(band, rules.guesses)}</p>
      </div>

      <button className="btn" onClick={onClose}>
        {t.howTo.cta}
      </button>
    </Modal>
  )
}
