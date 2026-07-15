import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { City, RoundState } from '@/lib/types'
import type { Unit } from '@/config/rules'
import { dailyMode } from '@/modes/daily'
import { utcDateString } from '@/lib/puzzle'
import {
  applyGuess,
  createRound,
  isFinished,
  guessesLeft,
  type GuessError,
} from '@/lib/engine'
import { createStatsStore, type Stats } from '@/store/statsStore'
import { loadUnit, saveUnit, isOnboarded, setOnboarded } from '@/store/prefs'
import { formatDistance } from '@/lib/format'
import { cityLabel } from '@/lib/cities'
import { GlobeMotif } from '@/ui/GlobeMotif'
import { GuessInput } from '@/ui/GuessInput'
import { GuessRow } from '@/ui/GuessRow'
import { GuessMap } from '@/ui/GuessMap'

// Same lazy globe used on the result card; kept out of the initial bundle and
// only fetched once the first guess lands.
const GlobeMap = lazy(() => import('@/ui/GlobeMap'))
import { ResultCard } from '@/ui/ResultCard'
import { HowToPlay } from '@/ui/HowToPlay'
import { StatsPanel } from '@/ui/StatsPanel'
import { HelpIcon, StatsIcon } from '@/ui/icons'

// The public URL appended to shared results. Update to your Vercel domain.
const SITE_URL = 'https://yondle.vercel.app'

const ERROR_TEXT: Record<GuessError, string> = {
  duplicate: 'You already guessed that city.',
  'start-city': 'That’s the start city — pick somewhere else.',
  finished: 'Today’s round is over.',
}

function humanDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  return d.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function App() {
  const rules = dailyMode.rules
  const date = useMemo(() => utcDateString(), [])
  const puzzle = useMemo(() => dailyMode.generate(date), [date])
  const store = useMemo(() => createStatsStore(rules), [rules])

  const [round, setRound] = useState<RoundState>(
    () => store.loadRound(date) ?? createRound(date),
  )
  const [stats, setStats] = useState<Stats>(() => store.loadStats())
  const [unit, setUnit] = useState<Unit>(() => loadUnit(rules.units.default))
  const [toast, setToast] = useState('')
  const [showHowTo, setShowHowTo] = useState(() => !isOnboarded())
  const [showStats, setShowStats] = useState(false)
  const [shareLabel, setShareLabel] = useState('Share result')
  const toastTimer = useRef<number | undefined>(undefined)

  const finished = isFinished(round)

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const flashToast = (msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2600)
  }

  const handleGuess = (city: City) => {
    const res = applyGuess(round, puzzle, city, rules)
    if (res.error) {
      flashToast(ERROR_TEXT[res.error])
      return
    }
    setToast('')
    setRound(res.state)
    store.saveRound(res.state)
    if (isFinished(res.state)) {
      setStats(store.recordResult(res.state))
    }
  }

  const changeUnit = (u: Unit) => {
    setUnit(u)
    saveUnit(u)
  }

  const closeHowTo = () => {
    setShowHowTo(false)
    setOnboarded()
  }

  const handleShare = async () => {
    const text = dailyMode.share(round, puzzle, { url: SITE_URL })
    try {
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share({ text })
      } else {
        await navigator.clipboard.writeText(text)
        setShareLabel('Copied!')
        window.setTimeout(() => setShareLabel('Share result'), 1800)
      }
    } catch {
      // user cancelled share sheet or clipboard blocked — no-op
    }
  }

  const left = guessesLeft(round, rules)

  return (
    <div className="app">
      <GlobeMotif />
      <div className="shell">
        <header className="hdr">
          <div className="hdr__brand">
            <span className="hdr__title">Yondle</span>
            <span className="hdr__sub">{humanDate(date)}</span>
          </div>
          <div className="hdr__actions">
            <div className="unit" role="group" aria-label="Distance unit">
              <button aria-pressed={unit === 'km'} onClick={() => changeUnit('km')}>
                km
              </button>
              <button aria-pressed={unit === 'mi'} onClick={() => changeUnit('mi')}>
                mi
              </button>
            </div>
            <button
              className="iconbtn"
              onClick={() => setShowHowTo(true)}
              aria-label="How to play"
            >
              <HelpIcon />
            </button>
            <button
              className="iconbtn"
              onClick={() => setShowStats(true)}
              aria-label="Statistics"
            >
              <StatsIcon />
            </button>
          </div>
        </header>

        <section className="prompt">
          <div className="prompt__eyebrow">Today’s departure</div>
          <div className="prompt__start">{cityLabel(puzzle.start)}</div>
          <div className="prompt__target-label">Find a city about</div>
          <div className="prompt__target mono">
            {formatDistance(puzzle.targetKm, unit)}
          </div>
          <div className="prompt__hint">
            away · within ±{Math.round(rules.tolerancePct * 100)}% · {rules.guesses}{' '}
            guesses
          </div>
          <div className="pips" aria-label={`${left} guesses left`}>
            {Array.from({ length: rules.guesses }).map((_, i) => {
              const g = round.guesses[i]
              const cls = g ? (g.won ? 'pip pip--win' : 'pip pip--used') : 'pip'
              return <span key={i} className={cls} />
            })}
          </div>
        </section>

        {!finished && <GuessInput onGuess={handleGuess} />}
        {toast && (
          <div className="toast" role="alert">
            {toast}
          </div>
        )}

        {round.guesses.length > 0 && (
          <>
            <GuessMap puzzle={puzzle} guesses={round.guesses} rules={rules} unit={unit} />
            {!finished && (
              <Suspense fallback={<div className="globe__fallback" aria-hidden="true" />}>
                <GlobeMap puzzle={puzzle} guesses={round.guesses} rules={rules} />
              </Suspense>
            )}
            <div className="guesses">
              {[...round.guesses].reverse().map((g, i) => (
                <GuessRow key={`${g.city.id}-${i}`} result={g} rules={rules} unit={unit} />
              ))}
            </div>
          </>
        )}

        {finished && (
          <ResultCard
            state={round}
            puzzle={puzzle}
            rules={rules}
            unit={unit}
            onShare={handleShare}
            shareLabel={shareLabel}
          />
        )}

        <footer className="foot">
          City data ©{' '}
          <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">
            GeoNames
          </a>{' '}
          · CC BY 4.0
        </footer>
      </div>

      {showHowTo && <HowToPlay rules={rules} onClose={closeHowTo} />}
      {showStats && <StatsPanel stats={stats} onClose={() => setShowStats(false)} />}
    </div>
  )
}
