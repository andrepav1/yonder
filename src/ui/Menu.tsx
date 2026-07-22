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
  EyeIcon,
  TagIcon,
} from './icons'

export type MenuMode = 'daily' | 'practice'

interface AppMenuProps {
  mode: MenuMode
  onSelectMode: (mode: MenuMode) => void
  onHowTo: () => void
  onStats: () => void
  onAbout: () => void
  /** How far the in-round hint reveal is unlocked (0/1/2). */
  hintLevel: number
  /** Unlock a hint level (only ever raises it). */
  onHint: (level: number) => void
  /** Hide the hint controls once the round is over — the dots always show then. */
  finished: boolean
}

/**
 * Header overflow menu: game mode (Daily / Practice), the in-round hints, plus
 * How to play, Statistics, and About. A lightweight popover — closes on outside
 * pointer, Escape, or picking an item (hint toggles keep it open so both can be
 * unlocked in one visit). Keeps the header — and the board — uncluttered.
 */
export function AppMenu({
  mode,
  onSelectMode,
  onHowTo,
  onStats,
  onAbout,
  hintLevel,
  onHint,
  finished,
}: AppMenuProps) {
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

          {!finished && (
            <>
              <div className="menu__sep" role="separator" />
              <div className="menu__section">{t.globe.hints.label}</div>
              <button
                className="menu__item"
                role="menuitemcheckbox"
                aria-checked={hintLevel >= 1}
                disabled={hintLevel >= 1}
                onClick={() => onHint(1)}
              >
                <EyeIcon size={18} />
                <span className="menu__label">{t.globe.hints.cities}</span>
                {hintLevel >= 1 && <CheckIcon size={16} className="menu__check" />}
              </button>
              <button
                className="menu__item"
                role="menuitemcheckbox"
                aria-checked={hintLevel >= 2}
                disabled={hintLevel >= 2}
                onClick={() => onHint(2)}
              >
                <TagIcon size={18} />
                <span className="menu__label">{t.globe.hints.names}</span>
                {hintLevel >= 2 && <CheckIcon size={16} className="menu__check" />}
              </button>
            </>
          )}

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
