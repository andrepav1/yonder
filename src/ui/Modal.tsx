import { useEffect, useRef, type ReactNode } from 'react'
import { useI18n } from '@/i18n/context'
import { CloseIcon } from './icons'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/** Bottom-sheet on mobile, centered card on wider screens. Esc + scrim close. */
export function Modal({ title, onClose, children }: ModalProps) {
  const { t } = useI18n()
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    sheetRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={sheetRef}
      >
        <div className="sheet__head">
          <h2 className="sheet__title">{title}</h2>
          <button className="iconbtn" onClick={onClose} aria-label={t.modal.close}>
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
