import type { ComponentType } from 'react'
import { useI18n } from '@/i18n/context'
import { freeModes } from '@/modes/daily'
import { Modal } from './Modal'
import { CompassIcon, CheckIcon } from './icons'

/** Per-mode card icon, mapped by mode id (kept in the UI layer, not the descriptor). */
const MODE_ICONS: Record<string, ComponentType<{ size?: number }>> = {
  classic: CompassIcon,
}

interface ModesModalProps {
  /** The currently active free mode id, or null when on the daily. */
  activeId: string | null
  /** Load a mode as a fresh free-play round. */
  onSelect: (id: string) => void
  onClose: () => void
}

/**
 * The Modes picker — a bottom-sheet listing every free-play mode as a card
 * (icon + name + blurb). Picking one loads it in the main screen; all modes are
 * free play, so nothing here touches the daily streak.
 */
export function ModesModal({ activeId, onSelect, onClose }: ModesModalProps) {
  const { t } = useI18n()
  return (
    <Modal title={t.modes.title} onClose={onClose}>
      <p style={{ marginTop: 0 }}>{t.modes.practiceNote}</p>
      <div className="modes">
        {freeModes.map((mode) => {
          const copy = t.modes.catalog[mode.id as keyof typeof t.modes.catalog]
          const Icon = MODE_ICONS[mode.id] ?? CompassIcon
          const active = mode.id === activeId
          return (
            <button
              key={mode.id}
              className="modecard"
              aria-current={active}
              onClick={() => onSelect(mode.id)}
            >
              <span className="modecard__icon">
                <Icon size={22} />
              </span>
              <span className="modecard__text">
                <span className="modecard__name">
                  {copy?.name ?? mode.label}
                  {active && <CheckIcon size={16} className="modecard__check" />}
                </span>
                {copy && <span className="modecard__blurb">{copy.blurb}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
