# Yondle 🧭

A daily, mobile-first **geography guessing game**. Every day, everyone in the world
gets the **same** puzzle: one **start city** and one **target distance**. Build a
journey city by city — each guess adds the great-circle (haversine) distance from your
**previous** city (the start, on the first hop) to a **running total**. Reach the
target without going over. Overshoot and you bust; land your total just under it to
win. You get **6 guesses**, and fewer hops is a better score.

> **Project status:** v1 is complete — the pure, tested game core (distance/bearing,
> dataset + fuzzy autocomplete, deterministic generator, scoring, engine, share, stats)
> **and** the React UI (an interactive 3D **globe** as the board, guess loop, hot/cold
> feedback, result, stats, onboarding, light + dark, **nine languages**), with a
> **daily** puzzle and an unlimited **practice** mode behind a header menu.
> Fully static; deploys to Vercel. `npm run dev` to play.

## How it works

| Rule            | Value                                                          | Where                              |
| --------------- | -------------------------------------------------------------- | ---------------------------------- |
| Guesses per day | **6** hops                                                     | `rules.guesses`                    |
| Scoring         | **cumulative** — sum of each leg (previous city → next)        | `src/lib/scoring.ts`               |
| Win band        | running total in **[target·98%, target]** (one-sided; no over) | `rules.tolerancePct`               |
| Bust            | total **over** the target, or out of 6 guesses                 | `src/lib/engine.ts`                |
| Score           | golf: **fewer hops is better**                                 | guess distribution                 |
| Target distance | **500–10000 km**, validated to have ≥3 single-hop wins         | `rules.target`, `rules.generation` |
| Start city      | population-weighted, **≥ 1,000,000** (recognizable)            | `rules.startCity`                  |
| Dataset         | GeoNames cities, **pop ≥ 100k** (~6.2k cities)                 | `rules.dataset`                    |
| Daily reset     | **UTC midnight**, seeded from the date                         | `rules.reset`                      |

- **Cumulative score:** your total is the sum of the legs. Start Rome, guess Milan →
  total = dist(Rome→Milan); guess Turin → total += dist(Milan→Turin); and so on. You
  can revisit no city (each is used once), and the legs only ever add up.
- **Win/lose (drives the streak):** you win the moment the total lands in the band —
  within **2% below** the target (for 2000 km, that's 1960–2000 km). Cross the target
  and you **bust** immediately; so does running out of guesses. The band is a
  percentage, so it's unit-independent (same in km or miles).
- **Score (bragging rights):** it's golf — the streak and guess distribution reward
  reaching the band in as **few hops** as possible.

### The globe

The board is an **interactive orthographic globe** (drag to spin), centred on the
day's start city when the page loads. Each guess extends a **journey line** from the
start through your cities in order and drops a pin coloured on the same hot→cold ramp
as the list below it, and the globe **spins to re-centre on your latest guess** (drag
to override); pins on the far side of the Earth are hidden until you rotate them into
view.

### Per-guess feedback

Below the globe, each guess shows the **leg** you just added (`+480 km`), the new
**running total**, how far there is left to go ("1,134 km to go" — or "37 km over" on a
bust), the exact **bearing in degrees + an arrow** (e.g. `47° ↗`) for that leg, and a
hot→cold colour cue that warms as the total nears the target. A km/mi toggle switches
all displayed distances (the win band is a percentage, so it's identical either way).

### End of round — explore the map

On a win, a bust, or after 6 guesses the globe turns into a **learning reveal** you can
spin and tap. It shows two kinds of cities you *could* have guessed:

- **Closest to target** — the single-hop wins from the start (the ideal one-hop
  solutions), and
- **Would have finished your run** — cities that would have completed the journey in one
  more hop from wherever you actually stopped (shown when you fell short — the "you were
  one city away" near-miss). Tapping one draws the **missed leg** you didn't take.

**Tap any pin** to read its name and distance (in your own language). The result card
shows how many hops you took and where your total landed, and a Wordle-style shareable
summary (hot/cold squares + leg arrows, a reach-% line, no city names) copies to the
clipboard.

### Practice mode

Tap the **menu** in the header (☰) to switch between **Daily** and **Practice**.
Practice serves an **endless stream of random puzzles** — same rules as the daily
(start city, target distance, 6 hops, don't overshoot), but a brand-new one every
time, so you can learn the mechanics or just keep playing after the daily is done.
Hit **New puzzle** any time to reshuffle. Practice rounds are **off the record** —
they never touch your daily streak, win %, or guess distribution, and there's no
share (the puzzle is yours alone, not the common daily one). The same menu also
holds **How to play**, **Statistics**, and **About**.

Under the hood this is the game's mode seam doing its job: the daily and practice
modes are two entries in a `modes` registry over the same pure engine, differing
only in their seed — the UTC date for the daily (same for everyone), a fresh random
token for each practice puzzle. The generator stays pure and deterministic in that
seed; the randomness lives at the app boundary.

### Languages

The whole interface speaks **English, French, Italian, Spanish, Portuguese, German,
Japanese, Korean, and Chinese** 🇬🇧 🇫🇷 🇮🇹 🇪🇸 🇧🇷 🇩🇪 🇯🇵 🇰🇷 🇨🇳. On first visit
the language is chosen from your browser, and the globe icon in the header switches it
any time (the choice is remembered). Numbers and the date follow the locale's
conventions (e.g. `1,234 km` vs `1 234 km`), and the shared summary is localized too
while keeping the puzzle date and `Yondle` name identical for everyone. Copy lives in
one place per language — `src/i18n/{en,fr,it}.ts` — so adding a language is just adding
a catalog and a `LOCALES` entry; the rest of the app reads strings through `useI18n()`.

**City names are localized too.** In a non-English UI, cities display in the chosen
language — London becomes _Londres_ / _ロンドン_, Munich becomes _München_ / _뮌헨_ — and
you can **type them in any language**: "London", "Londres" and "ロンドン" all find the same
city. Names come from GeoNames' alternate-names data (≈4k of the ~6.2k cities carry at
least one translation); where a language has no distinct name, it gracefully falls back
to the canonical English one. English display is unchanged.

## Development

```bash
npm install
npm run dev          # Vite dev server → http://localhost:5173
npm test             # Vitest pure-logic suites
npm run lint         # ESLint (flat config)
npm run typecheck    # tsc, strict
npm run build        # production build → dist/
npm run data:build   # regenerate src/data/cities.json from ./data-src
npm run preview:puzzles   # print generated puzzles for several dates
```

Peek at the deterministic generator (same for everyone on that date):

```
2026-07-16  START: Saint Petersburg   TARGET: 2264 km   win band 2219–2264 km (single hop; don't overshoot)
            single-hop wins in band: 3   closest: Balıkesir 2262 km (−2) ...
```

### Project structure

```
src/
  config/rules.ts     # ← all tunables, one declarative object
  lib/                # pure, tested core (no I/O)
    prng.ts           # mulberry32 + date-string hash
    geo.ts            # haversine, bearing, compass, unit conversion
    types.ts          # City, PuzzleSpec, RoundState, … (serializable)
    cities.ts         # dataset load + fuzzy, locale-aware autocomplete
    puzzle.ts         # deterministic daily generator
    scoring.ts        # evaluate a leg, cumulative total, hot/cold level
    engine.ts         # pure RoundState machine (accumulate legs, bust on over)
    share.ts          # Wordle-style share string (locale-aware)
    format.ts         # distance / remaining / bearing display (locale-aware)
  i18n/               # 9-language catalogs + registry + React provider/hook
    types.ts          # Messages shape + Locale
    en.ts fr.ts …     # one React-free, serializable catalog per language
    index.ts          # catalogs, LOCALES, getMessages, detectLocale
    context.tsx       # I18nProvider + useI18n()
  modes/daily.ts      # GameMode descriptors (daily + practice) over a modes registry
  store/              # persistence behind a KeyValueStore seam
    storage.ts        # memory + localStorage adapters
    statsStore.ts     # stats, streaks, distribution, daily round save
    prefs.ts          # unit + language + onboarding flag
  ui/                 # React shell (Globe, GuessInput, GuessRow, ResultCard, Menu, About, LanguageSwitcher, …)
  styles/globals.css  # the "Terra" design system (see DESIGN.md)
  App.tsx  main.tsx   # app shell + entry
  data/cities.json    # committed compact dataset (built artifact)
scripts/
  build-cities.mjs    # GeoNames -> cities.json (incl. localized names)
  enrich-cities.mjs   # attach/refresh translations on an existing cities.json
  preview-puzzles.mts # dev: print sample puzzles
  screenshot.mjs      # dev: phone-sized screenshots of the real UI
```

The core is intentionally **pure and data-driven** so puzzles can later be
precomputed server-side and the game can grow additional modes / multiplayer without
rewrites. See `CLAUDE.md` for architecture notes and `DECISIONS.md` for the rationale
behind each rule.

## Data & deployment

City data (names, coordinates, and localized alternate names) ©
[GeoNames](https://www.geonames.org/), licensed **CC BY 4.0**. The compact
`cities.json` is committed, so the app is fully static — it deploys to **Vercel**
(framework preset **Vite**, build command `npm run build`, output `dist/`) with no
backend.

## Tech

React + Vite + TypeScript, ESLint + Prettier, Vitest, GitHub Actions CI. The globe is
rendered with **d3-geo** (orthographic projection + geodesic circle) over a bundled
low-res land outline (**world-atlas** TopoJSON, hydrated with **topojson-client**) —
all client-side, no runtime network.
