import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/i18n/context'
import {
  MenuIcon,
  CalendarIcon,
  ShuffleIcon,
  HelpIcon,
  StatsIcon,
  InfoIcon,
  CheckIcon,
} from './icons'

export type MenuMode = 'daily' | 'practice'

interface AppMenuProps {
  mode: MenuMode
  onSelectMode: (mode: MenuMode) => void
  onHowTo: () => void
  onStats: () => void
  onAbout: () => void
}

/**
 * Header overflow menu: game mode (Daily / Practice), plus How to play,
 * Statistics, and About. A lightweight popover — closes on outside pointer,
 * Escape, or picking an item. Keeps the header uncluttered.
 */
export function AppMenu({ mode, onSelectMode, onHowTo, onStats, onAbout }: AppMenuProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }

  return (
    <div className="menu" ref={wrapRef}>
      <button
        className="iconbtn"
        aria-label={t.menu.label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MenuIcon />
      </button>
      {open && (
        <div className="menu__pop" role="menu">
          <button
            className="menu__item"
            role="menuitemradio"
            aria-checked={mode === 'daily'}
            onClick={pick(() => onSelectMode('daily'))}
          >
            <CalendarIcon size={18} />
            <span className="menu__label">{t.modes.daily}</span>
            {mode === 'daily' && <CheckIcon size={16} className="menu__check" />}
          </button>
          <button
            className="menu__item"
            role="menuitemradio"
            aria-checked={mode === 'practice'}
            onClick={pick(() => onSelectMode('practice'))}
          >
            <ShuffleIcon size={18} />
            <span className="menu__label">{t.modes.practice}</span>
            {mode === 'practice' && <CheckIcon size={16} className="menu__check" />}
          </button>

          <div className="menu__sep" role="separator" />

          <button className="menu__item" role="menuitem" onClick={pick(onHowTo)}>
            <HelpIcon size={18} />
            <span className="menu__label">{t.header.howToPlay}</span>
          </button>
          <button className="menu__item" role="menuitem" onClick={pick(onStats)}>
            <StatsIcon size={18} />
            <span className="menu__label">{t.header.statistics}</span>
          </button>
          <button className="menu__item" role="menuitem" onClick={pick(onAbout)}>
            <InfoIcon size={18} />
            <span className="menu__label">{t.menu.about}</span>
          </button>
        </div>
      )}
    </div>
  )
}
