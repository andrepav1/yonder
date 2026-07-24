import { useEffect, useMemo, useRef, useState } from 'react'
import type { City, RoundState } from '@/lib/types'
import type { Unit } from '@/config/rules'
import { dailyMode, modes } from '@/modes/daily'
import { utcDateString } from '@/lib/puzzle'
import { createRound, isFinished, guessesLeft, type GuessError } from '@/lib/engine'
import { findCompletions } from '@/lib/reveal'
import { createStatsStore, type Stats } from '@/store/statsStore'
import {
  loadUnit,
  saveUnit,
  isOnboarded,
  setOnboarded,
  loadHintLevel,
  saveHintLevel,
  type HintLevel,
} from '@/store/prefs'
import { formatDistance, bandLabel, formatBearing } from '@/lib/format'
import { cityLabel, allCities, capitals } from '@/lib/cities'
import { initialBearingDeg } from '@/lib/geo'
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
import { ModesModal } from '@/ui/ModesModal'
import { ShuffleIcon } from '@/ui/icons'

// The public URL appended to shared results. Update to your Vercel domain.
const SITE_URL = 'https://yondle.vercel.app'

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
 * A fresh random seed for a free-play round. Randomness lives here at the UI
 * boundary — never in `lib/*` — so the generator stays pure and deterministic
 * in its seed. Prefixed so a free seed can never collide with a UTC date.
 */
function makeFreeSeed(): string {
  const rand = Math.random().toString(36).slice(2, 10)
  return `free-${Date.now().toString(36)}-${rand}`
}

export default function App() {
  const { t, locale } = useI18n()
  const date = useMemo(() => utcDateString(), [])
  // The daily is the only saved, streak-tracked board; its rules key the store.
  const dailyRules = dailyMode.rules
  const store = useMemo(() => createStatsStore(dailyRules), [dailyRules])

  // The active free-play mode id, or null when on the daily (the home board).
  // Never persisted — a reload always lands back on the daily.
  const [freeModeId, setFreeModeId] = useState<string | null>(null)
  const [freeSeed, setFreeSeed] = useState<string>(makeFreeSeed)
  const [showModes, setShowModes] = useState(false)

  // The daily round is date-locked and persisted; the free round is ephemeral
  // (in memory only) and never touches the streak or stats.
  const [dailyRound, setDailyRound] = useState<RoundState>(
    () => store.loadRound(date) ?? createRound(date),
  )
  const [freeRound, setFreeRound] = useState<RoundState>(() => createRound(freeSeed))
  const [stats, setStats] = useState<Stats>(() => store.loadStats())
  const [unit, setUnit] = useState<Unit>(() => loadUnit(dailyRules.units.default))
  // How far the hint reveal is unlocked. Daily persists (survives reloads);
  // free-play is in-memory and resets with each fresh puzzle.
  const [dailyHint, setDailyHint] = useState<HintLevel>(() => loadHintLevel(date))
  const [freeHint, setFreeHint] = useState<HintLevel>(0)
  const [toast, setToast] = useState('')
  const [showHowTo, setShowHowTo] = useState(() => !isOnboarded())
  const [showStats, setShowStats] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [copied, setCopied] = useState(false)
  const toastTimer = useRef<number | undefined>(undefined)

  const free = freeModeId !== null
  const activeMode = freeModeId ? (modes[freeModeId] ?? dailyMode) : dailyMode
  const rules = activeMode.rules
  const seed = free ? freeSeed : date
  const puzzle = useMemo(() => activeMode.generate(seed), [activeMode, seed])
  const round = free ? freeRound : dailyRound
  const finished = isFinished(round)
  const hintLevel = free ? freeHint : dailyHint
  const kind = activeMode.kind
  const hidden = kind === 'hidden'
  // Hidden Destination's opening clue: the bearing from the anchor to the target.
  const clueBearing =
    hidden && puzzle.target ? initialBearingDeg(puzzle.start, puzzle.target) : 0

  // Unlock a hint (only ever raises the level). Daily writes through to storage
  // so the reveal survives a reload; free-play stays in memory.
  const useHint = (level: number) => {
    const next = Math.min(2, Math.max(hintLevel, level)) as HintLevel
    if (free) {
      setFreeHint(next)
      return
    }
    setDailyHint(next)
    saveHintLevel(date, next)
  }

  // The end-of-round "learn the map" reveal: cities the player could have
  // guessed. `ideal` = the closest single-hop wins from the start (precomputed);
  // `completions` = cities that would have finished the run from where the player
  // actually stopped (only meaningful on an undershot loss — empty on a win or an
  // overshoot). Computed only once the round is over.
  const reveal = useMemo(() => {
    if (!finished) return undefined
    // Hidden Destination: reveal just the mystery city (as an "ideal" pin).
    if (hidden) {
      const target = puzzle.target
      if (!target) return undefined
      return {
        ideal: [],
        completions: [],
        from: puzzle.start,
        answer: { city: target, distanceKm: puzzle.targetKm },
      }
    }
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
  }, [finished, round, puzzle, rules, hidden])

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
    if (free) {
      setFreeRound(res.state)
      return
    }
    setDailyRound(res.state)
    store.saveRound(res.state)
    if (isFinished(res.state)) {
      setStats(store.recordResult(res.state))
    }
  }

  /** Return to the daily home board (its saved round is waiting). */
  const goDaily = () => {
    setToast('')
    setFreeModeId(null)
  }

  /** Load a mode from the Modes modal as a fresh free-play round. */
  const selectMode = (id: string) => {
    const s = makeFreeSeed()
    setToast('')
    setShowModes(false)
    setFreeModeId(id)
    setFreeSeed(s)
    setFreeRound(createRound(s))
    setFreeHint(0)
  }

  /** Reshuffle the current free-play mode with a new random puzzle. */
  const newFreePuzzle = () => {
    const s = makeFreeSeed()
    setToast('')
    setFreeSeed(s)
    setFreeRound(createRound(s))
    setFreeHint(0)
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
    const text = activeMode.share(round, puzzle, { url: SITE_URL, t })
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

  // Localized name for the active free mode (for the header subtitle).
  const activeModeName = freeModeId
    ? (t.modes.catalog[freeModeId as keyof typeof t.modes.catalog]?.name ??
      activeMode.label)
    : ''

  const left = guessesLeft(round, rules)

  return (
    <div className="app">
      <div className="shell">
        <header className="hdr">
          <div className="hdr__brand">
            <span className="hdr__title">{t.appName}</span>
            <span className="hdr__sub">
              {free ? activeModeName : humanDate(date, t.numberLocale)}
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
              isDaily={!free}
              onDaily={goDaily}
              onModes={() => setShowModes(true)}
              onHowTo={() => setShowHowTo(true)}
              onStats={() => setShowStats(true)}
              onAbout={() => setShowAbout(true)}
              hintLevel={hintLevel}
              onHint={useHint}
              finished={finished}
            />
          </div>
        </header>

        <section className="prompt">
          {hidden ? (
            <>
              <div className="prompt__eyebrow">{t.hidden.eyebrow}</div>
              <div className="prompt__target-label">{t.hidden.anchorLabel}</div>
              <div className="prompt__start">{cityLabel(puzzle.start, locale)}</div>
              <div className="prompt__clue">
                {t.hidden.clue(formatDistance(puzzle.targetKm, unit, t))}
                <span className="prompt__dir">{formatBearing(clueBearing)}</span>
              </div>
              <div className="prompt__hint">{t.hidden.hint(rules.guesses)}</div>
            </>
          ) : (
            <>
              <div className="prompt__eyebrow">
                {free ? t.modes.practiceEyebrow : t.prompt.eyebrow}
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
            </>
          )}
          <div className="pips" aria-label={t.prompt.guessesLeft(left)}>
            {Array.from({ length: rules.guesses }).map((_, i) => {
              const g = round.guesses[i]
              const cls = g ? (g.won ? 'pip pip--win' : 'pip pip--used') : 'pip'
              return <span key={i} className={cls} />
            })}
          </div>
          {free && <div className="prompt__note">{t.modes.practiceNote}</div>}
        </section>

        <Globe
          start={puzzle.start}
          guesses={round.guesses}
          rules={rules}
          unit={unit}
          cities={allCities()}
          hintLevel={hintLevel}
          reveal={reveal}
          finished={finished}
          showJourney={!hidden}
        />

        {!finished && (
          <GuessInput onGuess={handleGuess} pool={hidden ? capitals() : undefined} />
        )}
        {toast && (
          <div className="toast" role="alert">
            {toast}
          </div>
        )}

        {free && !finished && (
          <button className="btn btn--ghost btn--newpuzzle" onClick={newFreePuzzle}>
            <ShuffleIcon />
            {t.modes.newPuzzle}
          </button>
        )}

        {round.guesses.length > 0 && (
          <div className="guesses">
            {[...round.guesses].reverse().map((g, i) => (
              <GuessRow key={`${g.city.id}-${i}`} result={g} rules={rules} unit={unit} kind={kind} />
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
            onNewPuzzle={free ? newFreePuzzle : undefined}
            kind={kind}
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

      {showModes && (
        <ModesModal
          activeId={freeModeId}
          onSelect={selectMode}
          onClose={() => setShowModes(false)}
        />
      )}
      {showHowTo && (
        <HowToPlay rules={rules} puzzle={puzzle} unit={unit} onClose={closeHowTo} />
      )}
      {showStats && <StatsPanel stats={stats} onClose={() => setShowStats(false)} />}
      {showAbout && <About onClose={() => setShowAbout(false)} />}
    </div>
  )
}
