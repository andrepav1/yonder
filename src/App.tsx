import { useEffect, useMemo, useRef, useState } from 'react'
import type { City, RoundState } from '@/lib/types'
import type { Unit } from '@/config/rules'
import { dailyMode, practiceMode } from '@/modes/daily'
import { utcDateString } from '@/lib/puzzle'
import { createRound, isFinished, guessesLeft, type GuessError } from '@/lib/engine'
import { findCompletions } from '@/lib/reveal'
import { createStatsStore, type Stats } from '@/store/statsStore'
import { loadUnit, saveUnit, isOnboarded, setOnboarded } from '@/store/prefs'
import { formatDistance, bandLabel } from '@/lib/format'
import { cityLabel, allCities } from '@/lib/cities'
import { useI18n } from '@/i18n/context'
import { Globe } from '@/ui/Globe'
import { GuessInput } from '@/ui/GuessInput'
import { GuessRow } from '@/ui/GuessRow'
import { ResultCard } from '@/ui/ResultCard'
import { HowToPlay } from '@/ui/HowToPlay'
import { StatsPanel } from '@/ui/StatsPanel'
import { About } from '@/ui/About'
import { LanguageSwitcher } from '@/ui/LanguageSwitcher'
import { AppMenu } from '@/ui/Menu'
import { ShuffleIcon } from '@/ui/icons'

// The public URL appended to shared results. Update to your Vercel domain.
const SITE_URL = 'https://yondle.vercel.app'

type Mode = 'daily' | 'practice'

function humanDate(date: string, locale: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  return d.toLocaleDateString(locale, {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * A fresh random seed for a practice puzzle. Randomness lives here at the UI
 * boundary — never in `lib/*` — so the generator stays pure and deterministic
 * in its seed. Prefixed so a practice seed can never collide with a UTC date.
 */
function makePracticeSeed(): string {
  const rand = Math.random().toString(36).slice(2, 10)
  return `practice-${Date.now().toString(36)}-${rand}`
}

export default function App() {
  const { t, locale } = useI18n()
  const rules = dailyMode.rules
  const date = useMemo(() => utcDateString(), [])
  const store = useMemo(() => createStatsStore(rules), [rules])

  const [mode, setMode] = useState<Mode>('daily')
  const [practiceSeed, setPracticeSeed] = useState<string>(makePracticeSeed)

  // The daily round is date-locked and persisted; the practice round is
  // ephemeral (in memory only) and never touches the streak or stats.
  const [dailyRound, setDailyRound] = useState<RoundState>(
    () => store.loadRound(date) ?? createRound(date),
  )
  const [practiceRound, setPracticeRound] = useState<RoundState>(() =>
    createRound(practiceSeed),
  )
  const [stats, setStats] = useState<Stats>(() => store.loadStats())
  const [unit, setUnit] = useState<Unit>(() => loadUnit(rules.units.default))
  const [toast, setToast] = useState('')
  const [showHowTo, setShowHowTo] = useState(() => !isOnboarded())
  const [showStats, setShowStats] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [copied, setCopied] = useState(false)
  const toastTimer = useRef<number | undefined>(undefined)

  const practice = mode === 'practice'
  const activeMode = practice ? practiceMode : dailyMode
  const seed = practice ? practiceSeed : date
  const puzzle = useMemo(() => activeMode.generate(seed), [activeMode, seed])
  const round = practice ? practiceRound : dailyRound
  const finished = isFinished(round)

  // The end-of-round "learn the map" reveal: cities the player could have
  // guessed. `ideal` = the closest single-hop wins from the start (precomputed);
  // `completions` = cities that would have finished the run from where the player
  // actually stopped (only meaningful on an undershot loss — empty on a win or an
  // overshoot). Computed only once the round is over.
  const reveal = useMemo(() => {
    if (!finished) return undefined
    const guessedIds = new Set(round.guesses.map((g) => g.city.id))
    const exclude = new Set(guessedIds)
    exclude.add(puzzle.start.id)
    const last = round.guesses[round.guesses.length - 1]
    const from = last ? last.city : puzzle.start
    const cumulativeKm = last ? last.cumulativeKm : 0
    const completions =
      round.status === 'won'
        ? []
        : findCompletions(
            puzzle,
            from,
            cumulativeKm,
            allCities(),
            rules,
            rules.generation.exploreCount,
            exclude,
          )
    const ideal = puzzle.exploreAnswers.filter((a) => !guessedIds.has(a.city.id))
    return { ideal, completions, from }
  }, [finished, round, puzzle, rules])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const flashToast = (msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2600)
  }

  const errorText = (error: GuessError): string =>
    error === 'start-city' ? t.errors.startCity : t.errors[error]

  const handleGuess = (city: City) => {
    const res = activeMode.apply(round, puzzle, city)
    if (res.error) {
      flashToast(errorText(res.error))
      return
    }
    setToast('')
    if (practice) {
      setPracticeRound(res.state)
      return
    }
    setDailyRound(res.state)
    store.saveRound(res.state)
    if (isFinished(res.state)) {
      setStats(store.recordResult(res.state))
    }
  }

  const switchMode = (next: Mode) => {
    if (next === mode) return
    setToast('')
    setMode(next)
  }

  const newPractice = () => {
    const s = makePracticeSeed()
    setToast('')
    setPracticeSeed(s)
    setPracticeRound(createRound(s))
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
    const text = dailyMode.share(round, puzzle, { url: SITE_URL, t })
    try {
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share({ text })
      } else {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1800)
      }
    } catch {
      // user cancelled share sheet or clipboard blocked — no-op
    }
  }

  const left = guessesLeft(round, rules)

  return (
    <div className="app">
      <div className="shell">
        <header className="hdr">
          <div className="hdr__brand">
            <span className="hdr__title">{t.appName}</span>
            <span className="hdr__sub">
              {practice ? t.modes.practiceLabel : humanDate(date, t.numberLocale)}
            </span>
          </div>
          <div className="hdr__actions">
            <LanguageSwitcher />
            <div className="unit" role="group" aria-label={t.header.distanceUnit}>
              <button aria-pressed={unit === 'km'} onClick={() => changeUnit('km')}>
                km
              </button>
              <button aria-pressed={unit === 'mi'} onClick={() => changeUnit('mi')}>
                mi
              </button>
            </div>
            <AppMenu
              mode={mode}
              onSelectMode={switchMode}
              onHowTo={() => setShowHowTo(true)}
              onStats={() => setShowStats(true)}
              onAbout={() => setShowAbout(true)}
            />
          </div>
        </header>

        <section className="prompt">
          <div className="prompt__eyebrow">
            {practice ? t.modes.practiceEyebrow : t.prompt.eyebrow}
          </div>
          <div className="prompt__start">{cityLabel(puzzle.start, locale)}</div>
          <div className="prompt__target-label">{t.prompt.targetLabel}</div>
          <div className="prompt__target mono">
            {formatDistance(puzzle.targetKm, unit, t)}
          </div>
          <div className="prompt__hint">
            {t.prompt.hint(
              bandLabel(puzzle.targetKm, rules.tolerancePct, unit, t),
              rules.guesses,
            )}
          </div>
          <div className="pips" aria-label={t.prompt.guessesLeft(left)}>
            {Array.from({ length: rules.guesses }).map((_, i) => {
              const g = round.guesses[i]
              const cls = g ? (g.won ? 'pip pip--win' : 'pip pip--used') : 'pip'
              return <span key={i} className={cls} />
            })}
          </div>
          {practice && <div className="prompt__note">{t.modes.practiceNote}</div>}
        </section>

        <Globe
          start={puzzle.start}
          guesses={round.guesses}
          rules={rules}
          unit={unit}
          cities={allCities()}
          reveal={reveal}
          finished={finished}
        />

        {!finished && <GuessInput onGuess={handleGuess} />}
        {toast && (
          <div className="toast" role="alert">
            {toast}
          </div>
        )}

        {practice && !finished && (
          <button className="btn btn--ghost btn--newpuzzle" onClick={newPractice}>
            <ShuffleIcon />
            {t.modes.newPuzzle}
          </button>
        )}

        {round.guesses.length > 0 && (
          <div className="guesses">
            {[...round.guesses].reverse().map((g, i) => (
              <GuessRow key={`${g.city.id}-${i}`} result={g} rules={rules} unit={unit} />
            ))}
          </div>
        )}

        {finished && (
          <ResultCard
            state={round}
            puzzle={puzzle}
            rules={rules}
            unit={unit}
            onShare={handleShare}
            copied={copied}
            onNewPuzzle={practice ? newPractice : undefined}
          />
        )}

        <footer className="foot">
          {t.footer.cityData} ©{' '}
          <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">
            GeoNames
          </a>{' '}
          · {t.footer.license}
        </footer>
      </div>

      {showHowTo && (
        <HowToPlay rules={rules} puzzle={puzzle} unit={unit} onClose={closeHowTo} />
      )}
      {showStats && <StatsPanel stats={stats} onClose={() => setShowStats(false)} />}
      {showAbout && <About onClose={() => setShowAbout(false)} />}
    </div>
  )
}
