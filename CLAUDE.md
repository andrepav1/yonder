# Yondle — working notes for Claude

A daily, mobile-first **geography guessing game**. Every UTC day everyone gets the
same puzzle: one **start city** + one **target distance**. Build a journey by naming
cities: each guess adds the great-circle (haversine) distance from your **previous**
city (the start for the first hop) to a **running total**. Reach the target — land in
`[target·(1−tol), target]` — without overshooting. Overshoot, or run out of the 6
guesses, and you lose. Fewer hops is a better (golf) score. See `README.md` for the
player-facing picture and `DECISIONS.md` for _why_ the rules are what they are.

> **Status:** v1 is fully built — the pure core (distance/bearing, dataset +
> autocomplete, seeded generator, scoring, engine, share, stats) **and** the React
> UI (an interactive **globe** board, guess loop, feedback, result, stats,
> onboarding, a **daily** + a **practice** (unlimited free-play) mode behind a
> header menu, **i18n in 9 languages** — including **localized city names** you can
> guess in any language). All green under Vitest + ESLint +
> typecheck, and verified end-to-end in a real browser. Deploys static to Vercel. See
> `DESIGN.md` for the visual system.

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
  `City.names` is an optional `{ locale: name }` map (`CityNames`) carrying only the
  localized names that **differ** from the canonical `name` (English is never stored).
- `src/lib/cities.ts` — loads `src/data/cities.json`, hydrates `City[]`, and does
  accent/case-insensitive **fuzzy**, **locale-aware** autocomplete. `localizedName` /
  `cityLabel(city, locale?)` render the active language (falling back to `name`);
  `search`/`resolveGuess` match a query against a city's canonical **and** all localized
  names, so a city is reachable by typing it in any supported language. `cityLabel`
  **always** appends the country (`"Name, Country"`), promoting to `"Name, Region,
  Country"` when the name repeats within that country; the name+country pairing keys off
  the canonical name, and country/region qualifiers stay in their (English) dataset form.
- `src/lib/puzzle.ts` — `generatePuzzle(date, {cities?, rules?})`: population-weighted
  start city + validated target so every day has ≥ `minValidAnswers` cities within
  `[target·(1−tol), target]` of the start — i.e. **single-hop wins** — guaranteeing
  solvability (multi-hop paths only add more options). Deterministic in `date`. Emits
  `answers` (the `revealCount` closest to target, for share) and `exploreAnswers` (the
  `exploreCount` closest — a superset, powering the end-of-round explore reveal).
- `src/lib/reveal.ts` — **pure** end-of-round "learn the map" helper: `findCompletions`
  returns the cities that would have finished the run in one more hop **from where the
  player actually stopped** (the personal near-miss layer; empty once the target is
  reached or overshot). Layer 1 (ideal single-hop wins) is the precomputed
  `puzzle.exploreAnswers`; this is Layer 2, which depends on the played round.
- `src/lib/explore.ts` — **pure** progressive-reveal helper: `exploreMinPopulation(zoom,
  rules)` gives the population floor at a given map zoom, log-interpolating from
  `rules.explore.zoomedOutMinPopulation` (only the biggest cities, zoomed out) down to
  `rules.dataset.minPopulation` (zoomed in). The Globe uses it to decide *which* real
  cities to draw as its explorable dot layer; the projection-dependent culling stays in
  the component.
- `src/lib/scoring.ts` — **pure**: `evaluateLeg` (leg / running total / remaining /
  bearing / over / win — a guess from a given previous point onto the running total),
  `scoreRound` (golf: guess count + final total), and `tempLevel` (the shared hot→cold
  level, graded by how much of the journey remains; 0 also = bust/overshoot).
- `src/lib/engine.ts` — **pure** round state machine: `createRound`, `applyGuess`
  (adds the next leg from the previous city; rejects finished / start-city / duplicate
  without using a turn; ends the round on a win, an **overshoot**, or out of guesses),
  `guessesLeft`. Every transition returns a new serializable `RoundState`.
- `src/lib/share.ts` — **pure** Wordle-style share string (hot/cold squares per hop +
  leg arrows, a reach-% line, no city names).
- `src/lib/format.ts` — **pure** display helpers (`formatDistance`, `remainingPhrase`,
  `formatBearing`), unit-aware. Word-bearing helpers take a `Messages` catalog
  (default English) so number grouping + phrasing follow the active locale.
- `src/i18n/` — **internationalization** (English, French, Italian, Spanish, Portuguese,
  German, Japanese, Korean, Chinese). `types.ts` is the `Messages` shape + `Locale`;
  one React-free, serializable catalog per language (`en.ts`, `fr.ts`, … — plain strings
  with small interpolation fns); `index.ts` is the registry
  (`catalogs`, `LOCALES`, `getMessages`, `detectLocale`, `isLocale`); `context.tsx` is
  the React `I18nProvider` + `useI18n()` hook exposing `{ locale, t, setLocale }`.
  Pure `lib/*` helpers import catalogs (never the context), so the core stays
  I/O-free. Adding a language = adding a catalog + a `LOCALES` entry.
- `src/data/cities.json` — **committed** compact dataset (array-of-arrays; see
  `fields`). Built by `scripts/build-cities.mjs`. Each tuple's optional 8th element is
  the `{ locale: name }` translations map (present only for cities that have any).
- `src/modes/daily.ts` — the `GameMode` descriptors (`generate(seed)`/`apply`/
  `score`/`share`) built by a shared `makeMode` factory + a `modes` registry.
  Ships **two** modes: `dailyMode` (seed = UTC date, streak-tracked) and
  `practiceMode` (seed = a random token, unlimited free play). `generate` is
  deterministic in its seed; the practice randomness lives at the App boundary,
  never in `lib/*`. Adding a mode = adding a descriptor.
- `src/store/` — persistence behind a `KeyValueStore` seam (`storage.ts`, memory +
  localStorage adapters): `statsStore.ts` (pure `updateStats` streak logic + the
  `StatsStore` wrapper: stats, streaks, guess distribution, per-day round save +
  idempotent `recordResult`) and `prefs.ts` (unit + language + onboarding flag).
- `src/App.tsx` — orchestrates play: pick the active mode (daily vs practice),
  generate the puzzle, load/restore the saved daily round (daily lock), handle
  guesses, record the result, share. Holds both a persisted **daily** round and
  an ephemeral in-memory **practice** round; only daily writes to the store or
  the streak/stats, and practice never does. `makePracticeSeed()` (the sole
  impure boundary) mints a fresh random seed per practice puzzle. On finish it
  builds the globe **reveal** — `exploreAnswers` (Layer 1) plus `findCompletions`
  from the stopping point (Layer 2) — and hands it to `Globe`, along with `allCities()`
  as the globe's explorable (zoom-to-reveal) city universe.
- `src/ui/*` — React shell: `Globe` (the interactive board — see below), `GuessInput`
  (fuzzy typeahead), `GuessRow` (leg, running total, remaining, bearing, hot/cold), `ResultCard`
  (score + share, or a **New puzzle** button in practice; the answer _reveal_ lives
  on the globe, not a text list), `HowToPlay`, `StatsPanel`, `About` (what the game
  is + credits), `Modal` (bottom-sheet), `Menu` (header overflow popover: mode
  switch + How to play / Statistics / About), `LanguageSwitcher` (header language
  picker — a native `<select>` over a globe icon), `icons.tsx` (inline SVG — no
  emoji chrome). Every component pulls copy from `useI18n().t` — no hard-coded strings.
- `src/ui/Globe.tsx` — the main guessing surface: a drag-to-spin **orthographic
  globe** (d3-geo) over a bundled land outline (`world-atlas` land-110m TopoJSON,
  hydrated once with `topojson-client`). Purely presentational — all geometry comes
  from props. Renders the start-city marker, the **journey** (a line linking start →
  each guess in order — the legs that sum toward the target) and guess pins coloured by
  `tempLevel`, and — only once `finished` — an explorable **reveal** (via the `reveal`
  prop): the ideal single-hop wins (violet `--reveal` dots) plus the completions from the
  player's stopping point (win-coloured dots) — both distinct from the smaller,
  ramp-coloured guess pins. **Hover** (mouse) previews a pin and
  **tap** (a press that doesn't drag) pins the selection — the engaged pin gets a halo +
  a lighter name label, a distance/kind caption below the globe, and, for a completion,
  the dashed **missed leg** from where the player stopped. Spins to face the
  start on load and smoothly **re-centres on the latest guess** (rAF-animated; drag
  interrupts). Far-hemisphere points are hidden via a `geoDistance` great-circle test.
  **Zoom** (pinch / wheel / `+`−` buttons) magnifies the globe via `projection.scale`
  and draws an **explorable city layer** from the `cities` prop: quiet dots for real
  cities, filtered by `exploreMinPopulation(zoom, rules)` (biggest first, more as you
  zoom in) then culled to the near hemisphere + viewport and capped at
  `rules.explore.maxDots`; tap one to read its name (caption + label). Excludes the
  start / guessed / reveal cities (they carry their own markers). Zooming simply
  **grows the globe past the board** (the SVG overflows). The `.globe` stays a plain
  in-flow block in the **normal document layer** (`touch-action: none`, no `z-index` of
  its own — a negative `z-index` once promoted it into a compositing layer where the
  browser ignored `touch-action`, so pinch zoomed the page and drag went flaky); the
  enlarged sphere slides *beneath* the surrounding — often translucent — UI purely by
  paint order (panels after it paint on top; the two panels above it — `.prompt` and the
  `.hdr` header — are each lifted with `position: relative; z-index: 1` so the growing
  sphere recedes behind them instead of covering the logo + settings). Presentational as ever — geometry from
  props, no runtime network; land is bundled.
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
GeoNames dumps into `./data-src/` (gitignored) and run `npm run data:build`:

- `cities15000.txt` — https://download.geonames.org/export/dump/cities15000.zip
- `countryInfo.txt` — https://download.geonames.org/export/dump/countryInfo.txt
- `admin1CodesASCII.txt` — https://download.geonames.org/export/dump/admin1CodesASCII.txt
- `alternateNamesV2.txt` — https://download.geonames.org/export/dump/alternateNamesV2.zip
  (**optional** — enables localized city names; absent = English-only build)

The script filters to `population ≥ 100_000` (~6.2k cities), resolves country +
admin-1 names, rounds coordinates to 4 decimals, and writes a compact tuple array.
**Keep the `MIN_POPULATION` in the script in sync with `rules.dataset.minPopulation`.**

**Localized names.** When `alternateNamesV2.txt` is present, the build attaches a
per-city `{ locale: name }` map for the 8 non-English catalog locales. For each
(city, locale) it picks an official/preferred name (ties broken by the shorter form),
skipping colloquial + historic variants, and drops any name identical to the canonical
one — so only genuine translations are stored (~4k of the ~6.2k cities). The selection
logic lives in `selectAlternateNames` and is reused by `scripts/enrich-cities.mjs`
(`npm run data:enrich -- <alternateNamesV2.txt>`), which attaches/refreshes translations
onto an already-built `cities.json` **without** re-downloading the three base dumps.

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
