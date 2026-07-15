# Yondle — working notes for Claude

A daily, mobile-first **geography guessing game**. Every UTC day everyone gets the
same puzzle: one **start city** + one **target distance**. Name a real city whose
great-circle (haversine) distance from the start is as close as possible to the
target. 6 guesses. See `README.md` for the player-facing picture and `DECISIONS.md`
for _why_ the rules are what they are.

> **Status:** v1 is fully built — the pure core (distance/bearing, dataset +
> autocomplete, seeded generator, scoring, engine, share, stats) **and** the React
> UI (an interactive **globe** board, guess loop, feedback, result, stats,
> onboarding). All green under Vitest + ESLint + typecheck, and verified end-to-end
> in a real browser. Deploys static to Vercel. See `DESIGN.md` for the visual system.

## How to work here (non-negotiable)

1. **Docs are part of "done".** Any change to a feature, rule, module, route,
   the data pipeline, or a config knob updates `README.md` **and** this file **in
   the same commit**. Non-trivial design calls get a short entry in `DECISIONS.md`.
2. **The game is data-driven.** All tunables live in `src/config/rules.ts` as one
   declarative `GameRules` object. Pure modules take `rules` as a parameter and
   hard-code nothing. Change behaviour by editing rules, not logic.
3. **The core is pure and serializable.** Everything in `src/lib/*` is
   dependency-light, I/O-free, and unit-tested. `PuzzleSpec` / (later) `RoundState`
   are plain JSON — the seam that lets puzzles be precomputed server-side and, later,
   support multiple modes / multiplayer.
4. **Determinism is sacred.** The daily puzzle is a pure function of the UTC date
   string (+ dataset + rules). No `Date.now()` / `Math.random()` in `lib/puzzle.ts`
   or `lib/prng.ts`. If you touch generation, keep the year-long solvability +
   determinism tests green.
5. **Green before commit.** `npm run lint && npm run typecheck && npm test` must all
   pass. Commit scoped work as you finish it.

## Architecture (light seams for future modes/multiplayer)

- `src/config/rules.ts` — the one declarative `GameRules` object + `defaultRules`.
- `src/lib/prng.ts` — `hashString` (FNV-1a) + `mulberry32` seeded PRNG. Pure.
- `src/lib/geo.ts` — `haversineKm`, `initialBearingDeg`, `compass16`,
  `bearingArrow`, km/mi conversion. Pure.
- `src/lib/types.ts` — serializable domain types (`City`, `PuzzleSpec`, `AnswerCity`).
- `src/lib/cities.ts` — loads `src/data/cities.json`, hydrates `City[]`, and does
  accent/case-insensitive **fuzzy** autocomplete (`search`, `resolveGuess`,
  `cityLabel` disambiguation).
- `src/lib/puzzle.ts` — `generatePuzzle(date, {cities?, rules?})`: population-weighted
  start city + validated target so every day has ≥ `minValidAnswers` cities in the
  win band. Deterministic in `date`.
- `src/lib/scoring.ts` — **pure**: `evaluateGuess` (distance/delta/bearing/win),
  `proximityBase`, `scoreRound`, and `tempLevel` (the shared hot→cold level).
- `src/lib/engine.ts` — **pure** round state machine: `createRound`, `applyGuess`
  (rejects finished / start-city / duplicate without using a turn), `guessesLeft`.
  Every transition returns a new serializable `RoundState`.
- `src/lib/share.ts` — **pure** Wordle-style share string (hot/cold squares + arrows,
  score line, no city names).
- `src/lib/format.ts` — **pure** display helpers (`formatDistance`, `deltaPhrase`,
  `formatBearing`), unit-aware.
- `src/data/cities.json` — **committed** compact dataset (array-of-arrays; see
  `fields`). Built by `scripts/build-cities.mjs`.
- `src/modes/daily.ts` — the single `GameMode` descriptor (`generate`/`evaluate`/
  `score`/`share`) + a `modes` registry. Adding a mode = adding a descriptor.
- `src/store/` — persistence behind a `KeyValueStore` seam (`storage.ts`, memory +
  localStorage adapters): `statsStore.ts` (pure `updateStats` streak logic + the
  `StatsStore` wrapper: stats, streaks, guess distribution, per-day round save +
  idempotent `recordResult`) and `prefs.ts` (unit + onboarding flag).
- `src/App.tsx` — orchestrates the day: generate puzzle, load/restore the saved
  round (daily lock), handle guesses, record the result, share.
- `src/ui/*` — React shell: `Globe` (the interactive board — see below), `GuessInput`
  (fuzzy typeahead), `GuessRow` (distance, delta, bearing, hot/cold), `ResultCard`
  (score + share; the answer *reveal* now lives on the globe, not a text list),
  `HowToPlay`, `StatsPanel`, `Modal` (bottom-sheet), `icons.tsx` (inline SVG — no
  emoji chrome).
- `src/ui/Globe.tsx` — the main guessing surface: a drag-to-spin **orthographic
  globe** (d3-geo) over a bundled land outline (`world-atlas` land-110m TopoJSON,
  hydrated once with `topojson-client`). Purely presentational — all geometry comes
  from props. Renders the start-city marker and guess pins coloured by `tempLevel`
  during play, and — only once `finished` — the geodesic **target ring** (`geoCircle`
  radius = `targetKm`, the locus of perfect answers). The ring is the answer, so it
  stays hidden mid-round. Far-hemisphere points are hidden via a `geoDistance`
  great-circle test. No runtime network; land is bundled.
- `src/styles/globals.css` — the "Terra" design system tokens (see `DESIGN.md`).

## Run it

```bash
npm install
npm run dev          # Vite dev server → http://localhost:5173
npm test             # vitest — all pure-logic suites
npm run lint         # eslint (flat config)
npm run typecheck    # tsc -b --noEmit
npm run build        # production build → dist/ (static, Vercel)
npm run data:build   # rebuild src/data/cities.json from ./data-src (see below)
npm run preview:puzzles   # eyeball generated puzzles for several dates
npm run build && npm run screenshot   # phone-sized screenshots of the real UI
```

`npm run screenshot` (`scripts/screenshot.mjs`) serves `dist/` and drives the
sandbox's pre-installed Chromium (`playwright-core`, pinned to the baked revision)
at 390×844 to capture the board / play / win states in light + dark → `./shots/`.
Use it to verify UI/UX changes on a narrow viewport.

## Dataset pipeline

`src/data/cities.json` is the committed, bundled artifact — the app imports it
directly, so **no download is needed to run or deploy**. To regenerate it, drop the
three GeoNames dumps into `./data-src/` (gitignored) and run `npm run data:build`:

- `cities15000.txt` — https://download.geonames.org/export/dump/cities15000.zip
- `countryInfo.txt` — https://download.geonames.org/export/dump/countryInfo.txt
- `admin1CodesASCII.txt` — https://download.geonames.org/export/dump/admin1CodesASCII.txt

The script filters to `population ≥ 100_000` (~6.2k cities), resolves country +
admin-1 names, rounds coordinates to 4 decimals, and writes a compact tuple array.
**Keep the `MIN_POPULATION` in the script in sync with `rules.dataset.minPopulation`.**

## Conventions

- **TypeScript, strict.** `noUncheckedIndexedAccess` is on — index access is
  `T | undefined`; assert with `!` only where you've bounds-checked.
- **Path alias `@/` → `src/`** (Vite + tsconfig + vitest all agree).
- **Tests co-locate** as `*.test.ts` next to the module. Generation tests assert the
  determinism + solvability invariants across a full year of dates.
- **Deploy:** static site → **Vercel** (framework preset **Vite**, build
  `npm run build`, output `dist/`). All logic is client-side; no backend in v1.

## Data attribution

City data © GeoNames, licensed **CC BY 4.0**. Attribution belongs in the app footer.
