import { useEffect, useMemo, useRef, useState } from 'react'
import type { City } from '@/lib/types'
import { search, resolveGuess, type SearchResult } from '@/lib/cities'

interface GuessInputProps {
  disabled?: boolean
  onGuess: (city: City) => void
}

/**
 * Free-text city input with a fuzzy typeahead. Typing filters suggestions;
 * Enter (or tap) submits — a highlighted suggestion if there is one, else the
 * best fuzzy resolution of the raw text. Keyboard: ↑/↓ to move, Enter to pick.
 */
export function GuessInput({ disabled, onGuess }: GuessInputProps) {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const results: SearchResult[] = useMemo(
    () => (value.trim().length >= 1 ? search(value, 6) : []),
    [value],
  )

  useEffect(() => {
    setActive(0)
  }, [value])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const commit = (city: City | null) => {
    if (!city) return
    onGuess(city)
    setValue('')
    setOpen(false)
  }

  const submit = () => {
    if (results.length > 0) commit(results[active]?.city ?? results[0]!.city)
    else commit(resolveGuess(value))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const canSubmit = !disabled && value.trim().length > 0

  return (
    <div className="guess" ref={rootRef}>
      <div className="guess__row">
        <input
          className="guess__input"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          placeholder="Name a city…"
          aria-label="Guess a city"
          value={value}
          disabled={disabled}
          onChange={(e) => {
            setValue(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <button
          className="guess__submit"
          onClick={submit}
          disabled={!canSubmit}
          aria-label="Submit guess"
        >
          Guess
        </button>
      </div>

      {open && results.length > 0 && (
        <ul className="suggest" role="listbox">
          {results.map((r, i) => (
            <li key={r.city.id} role="option" aria-selected={i === active}>
              <button
                className={`suggest__item${i === active ? ' suggest__item--active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  commit(r.city)
                }}
              >
                {r.label.includes(',') ? (
                  <>
                    {r.label.slice(0, r.label.indexOf(','))}
                    <span className="sub">{r.label.slice(r.label.indexOf(','))}</span>
                  </>
                ) : (
                  r.label
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
