import { useI18n } from '@/i18n/context'
import { Modal } from './Modal'

interface AboutProps {
  onClose: () => void
}

/** A short "About" dialog — what the game is, the rules in brief, and credits. */
export function About({ onClose }: AboutProps) {
  const { t } = useI18n()
  return (
    <Modal title={t.menu.about} onClose={onClose}>
      <p className="about__tagline">{t.about.tagline}</p>
      <p>{t.about.intro}</p>
      <p>{t.about.rules}</p>
      <p className="about__credits">{t.about.credits}</p>
      <button className="btn" onClick={onClose}>
        {t.modal.close}
      </button>
    </Modal>
  )
}
