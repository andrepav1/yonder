# Yondle — working notes for Claude

A daily, mobile-first **geography guessing game**. Every UTC day everyone gets the
same puzzle: one **start city** + one **target distance**. Build a journey by naming
cities: each guess adds the great-circle (haversine) distance from your **previous**
city (the start for the first hop) to a **running total**. Reach the target — land in
`[target·(1−tol), target]` — without overshooting. Overshoot (the round ends there —
the total only climbs), or run out of the 6 guesses, and you lose. Fewer hops is a better (golf) score. See `README.md` for the
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
- `src/config/monetization.ts` — the declarative `MonetizationConfig` (Tier-1
  revenue: a `supportUrl` donation link + AdSense `client`/`resultSlot` ids) +
  `defaultMonetization`. **Deliberately separate from `rules.ts`** and read only by
  `src/ui/*` — the pure core (`lib/*`) must never import it. Everything is opt-in:
  empty strings render nothing (no ad script loads, no ad markup), so the app stays
  fully static + offline-friendly by default. Not game rules → not determinism-sacred.
  See `MONETIZATION.md` for the playbook (current values + AdSense activation steps).
- `src/lib/prng.ts` — `hashString` (FNV-1a) + `mulberry32` seeded PRNG. Pure.
- `src/lib/weighted.ts` — `weightedByPopulation(pool, exponent)`: builds a
  population-weighted picker (`r ∈ [0,1)` → pool member, binary search over cumulative
  weights). Pure; shared by both puzzle generators (`puzzle.ts`, `hidden.ts`).
- `src/lib/geo.ts` — `haversineKm`, `initialBearingDeg`, `compass16`,
  `bearingArrow`, km/mi conversion. Pure.
- `src/lib/types.ts` — serializable domain types (`City`, `PuzzleSpec`, `AnswerCity`).
  `City.names` is an optional `{ locale: name }` map (`CityNames`) carrying only the
  localized names that **differ** from the canonical `name` (English is never stored).
  `City.capital` is an optional flag (true only for national capitals — GeoNames `PPLC`).
  `PuzzleSpec.start` is **optional** — journey modes (Classic) have an origin, deduction
  modes (Hidden Destination) have none, and `classicLogic` guards on it.
  `PuzzleSpec.target` (optional) is the mystery city for Hidden Destination; `GuessResult`
  carries optional `toTargetKm` + `temp` for modes that grade a guess by proximity
  (Classic leaves both unset and derives everything from the cumulative-path fields).
- `src/lib/cities.ts` — loads `src/data/cities.json`, hydrates `City[]`, and does
  accent/case-insensitive **fuzzy**, **locale-aware** autocomplete. `localizedName` /
  `cityLabel(city, locale?)` render the active language (falling back to `name`);
  `search`/`resolveGuess` match a query against a city's canonical **and** all localized
  names, so a city is reachable by typing it in any supported language. `cityLabel`
  **always** appends the country (`"Name, Country"`), promoting to `"Name, Region,
  Country"` when the name repeats within that country; the name+country pairing keys off
  the canonical name, and country/region qualifiers stay in their (English) dataset form.
  `capitals()` returns the national-capital pool (~160, memoized) and `isCapital(city)`
  tests the flag — a small, famous city set for modes like Hidden Destination.
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
- `src/lib/cull.ts` — **pure** view-culling geometry for the globe's map layers.
  `toLayer` prepares a layer (coastline, borders, a relief band), cutting it into
  **pieces** — one ring or line each, with its lon/lat bbox — on first use, since
  culling only engages above ~1.5× zoom and a round that never zooms in shouldn't
  pay for them; `visibleRadiusDeg` gives the angular cap the square board can show
  at a given scale (**corner**, not edge — the diagonal is what stays visible);
  `visible` collects the pieces that can reach it in one pass, or hands back the
  layer whole when nothing can be culled. The per-piece test is deliberately
  hand-rolled trigonometry rather than d3's `geoDistance` — same maths, but routed
  through d3's stream machinery it measured ~50× slower per call, which across
  thousands of pieces a frame cost more than culling saved (5.7 → 0.4 ms/frame). Without it a zoomed
  frame re-projects the entire planet to paint a ~10° sliver. Culling generously is
  the point: a piece wrongly kept costs its vertices, one wrongly dropped is a hole
  in the map, so `cull.test.ts` asserts the **superset property** — anything that
  draws on the board, or that contains the view centre, survives — swept over many
  centres × zooms × layers. That test caught both bugs in the first draft (an
  inverted `lonDelta`, and boxes spanning >180° of longitude snapping to the wrong
  edge); keep it green if you touch the maths.
- `src/lib/scoring.ts` — **pure**: `evaluateLeg` (leg / running total / remaining /
  bearing / over / win — a guess from a given previous point onto the running total),
  `scoreRound` (golf: guess count + final total), and `tempLevel` (the shared hot→cold
  level, graded by how much of the journey remains; 0 also = bust/overshoot).
- `src/lib/mode.ts` — the **mode seam**: the pure `ModeLogic` interface the engine
  delegates to (`play` → validate+evaluate a guess into a rejection or a
  `{result, status}`; `score`), plus `GuessError` / `ApplyResult` / `PlayOutcome`.
  Adding a game variant = writing a `ModeLogic` (+ a descriptor in `src/modes/*`), not
  editing the engine. See `MODES.md` for the framework + roadmap.
- `src/lib/engine.ts` — **pure, mode-agnostic** round state machine: `createRound`,
  `guessesLeft`, `isFinished`, and `applyGuess(state, puzzle, city, logic, rules)` — it
  owns only the lifecycle (finished-guard + immutable append) and delegates the actual
  play of a guess to the mode's `ModeLogic`. Re-exports the `mode.ts` types for
  back-compat. Every transition returns a new serializable `RoundState`.
- `src/lib/classic.ts` — **pure**: `classicLogic`, the original game as the first
  `ModeLogic`. A guess adds the next leg from the previous city; rejects start-city /
  duplicate without using a turn; ends the round on a win, an **overshoot**, or out of
  guesses. Because legs only ever add, an overshoot can never recover, so by default
  (`rules.overshoot.endsRound: true`) it **ends the round** as a loss. Flipping the knob
  to `false` **blocks** the busting hop instead (rejected, no turn spent): gentler, but
  it can strand a player whose remaining distance is shorter than the nearest city,
  leaving a round that can neither be won nor ended — see `DECISIONS.md`. Composes the
  distance/band primitives from `scoring.ts`.
- `src/lib/hidden.ts` — **pure**: Hidden Destination, a deduction mode (find a secret
  **capital**; no start city, no cumulative path, no overshoot). `generateHidden(seed)`
  picks a population-weighted capital target and **nothing else** — no origin and no
  opening clue, since a named start plus its distance+bearing would pin the answer for
  free; the first guess is the opening probe. `hiddenLogic` (`ModeLogic`) evaluates each guess
  as an independent probe (distance + bearing to the target, proximity `temp`), wins
  only on the exact capital, and ends after `rules.guesses` (8) tries; `hiddenTempLevel`
  grades hot→cold by distance; `buildHiddenShare` is its spoiler-free share. Draws the
  answer + guess pool from `capitals()`.
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
  the `{ locale: name }` translations map (present only for cities that have any). A
  top-level `capitals` array lists the geonameids of national capitals (GeoNames
  `PPLC`) — kept out of the tuple so it stays back-compatible and refreshable on its own.
- `src/data/elevation.json` — **committed** hypsometric relief for the globe: a
  TopoJSON with two objects — `bands` (nested elevation/depth bands; each geometry's
  `properties.v` is the band's lower-bound in metres) and `ice` (the Greenland +
  Antarctica ice sheets). Built by `scripts/build-elevation.mjs` from NOAA ETOPO 2022
  (streamed coarse via OPeNDAP, contoured with d3-contour, simplified). The Globe
  paints the bands deepest→highest as a brown/blue elevation map, then the ice on
  top; the band count + order mirror the `--hypso-*` CSS ramp. The ice comes from the
  same source — ETOPO's *surface* minus its *bedrock* grid is the ice thickness,
  contoured at a small threshold — so the two great ice caps read as ice, not the
  brown highlands their surface height would otherwise colour them. Presentational
  only — no game logic reads it.
- `src/data/elevation-fine.json` — the **deep-zoom relief tier** (0.1°, twice the linear
  resolution of `elevation.json`). Emitted by the same `scripts/build-elevation.mjs` run.
  **Not bundled**: the Globe `import()`s it the first time a player zooms past
  `FINE_RELIEF_ZOOM`, so it rides in its own chunk (~200 KB gz) that most rounds never
  fetch. Same shape as `elevation.json`, and the hydrator refuses a tier whose band
  count doesn't match the `--hypso-*` ramp rather than mis-colour the map.
- `src/data/outline.json` — **committed** fine coastline + country borders (world-atlas
  50m, thinned by `scripts/build-outline.mjs`), the detail tier the globe swaps in when
  zoomed past `DETAIL_ZOOM`. Objects are `land` + **`borders`** (the interior mesh, cut at
  build time) rather than world-atlas's `land` + `countries`; `toOutline` handles both
  shapes. Presentational only.
- `src/modes/daily.ts` — the `GameMode` descriptors (`generate(seed)`/`apply`/
  `score`/`share`) built by a shared `makeMode` factory + a `modes` registry. Each
  descriptor pairs a **`ModeLogic`** (the pure play strategy — Classic's is
  `classicLogic`) with its `rules`; `apply`/`score` just delegate to it through the
  generic engine, so the UI never sees mode-specific logic. Ships **two** descriptors
  today: `dailyMode` (seed = UTC date, streak-tracked) and the free-play modes
  `classicMode` + `hiddenMode` (Hidden Destination). Each carries a `kind`
  (`'classic' | 'hidden'`) — the UI's presentation discriminant, the only mode-specific
  thing `src/ui/*` reads; the engine stays kind-agnostic. `freeModes` is the ordered
  list the Modes modal renders (card copy in `t.modes.catalog[id]`, icon mapped in the
  modal); `modes` is the id→descriptor registry. Descriptors can override `generate`
  (Hidden uses `generateHidden`) and `share` (Hidden uses `buildHiddenShare`); both
  default to Classic. `generate` is deterministic in its seed; the free-play randomness
  lives at the App boundary, never in `lib/*`. Adding a mode = a `ModeLogic` + a
  descriptor in `freeModes` (see `MODES.md`).
- `src/store/` — persistence behind a `KeyValueStore` seam (`storage.ts`, memory +
  localStorage adapters): `statsStore.ts` (pure `updateStats` streak logic + the
  `StatsStore` wrapper: stats, streaks, guess distribution, per-day round save +
  idempotent `recordResult`) and `prefs.ts` (unit + language + onboarding flag +
  per-day `HintLevel` — how far the in-round hint reveal is unlocked, `load/saveHintLevel`).
- `src/App.tsx` — orchestrates play. The **daily** (`freeModeId === null`) is the home
  board — the only saved, streak-tracked round; picking a mode from the Modes modal
  sets `freeModeId` and swaps in an ephemeral **free-play** round (a fresh random seed,
  its own in-memory round + hint level), and `goDaily()` returns home. `freeModeId` is
  never persisted, so a reload always lands on the daily. Only the daily writes to the
  store or the streak/stats; free play never does. `makeFreeSeed()` (the sole impure
  boundary) mints a fresh random seed per free puzzle; `newFreePuzzle()` reshuffles the
  active mode. It always generates the **daily** puzzle (the home board, and the puzzle
  `HowToPlay` explains, whichever mode is on screen) and the active free puzzle beside
  it. On finish it builds the globe **reveal** — `exploreAnswers` (Layer 1)
  plus `findCompletions` from the stopping point (Layer 2), or, for Hidden Destination,
  just the mystery `answer` city — and hands it to `Globe`,
  along with the globe's explorable (zoom-to-reveal) city universe: `allCities()`, or
  `capitals()` + `exploreAll` in a capitals-only mode.
  Owns the **hint level** (daily persisted via `load/saveHintLevel`, free-play in-memory
  + reset per puzzle) and the **Modes modal** open state, passing hints to `Globe` (to
  gate the dots) and the nav (`onDaily` / `onModes`) + hint unlock (`onHint`) to `Menu`.
- `src/ui/*` — React shell: `Globe` (the interactive board — see below), `GuessInput`
  (fuzzy typeahead), `GuessRow` (leg, running total, remaining, bearing, hot/cold), `ResultCard`
  (score + **Share**, plus a **New puzzle** button in free play; the answer _reveal_ lives
  on the globe, not a text list; also hosts the opt-in `SupportLink` + `AdSlot`),
  `SupportLink` (external donation link — renders nothing unless
  `monetization.supportUrl` is set; also shown in `About`), `AdSlot` (post-result
  AdSense unit — renders nothing, and loads no script, unless `monetization.ads`
  client + slot are configured), `HowToPlay`, `StatsPanel`, `About` (what the game
  is + credits + support link), `Modal` (bottom-sheet), `ModesModal` (the mode picker —
  a `Modal` listing every `freeModes` descriptor as an icon + name + blurb card;
  selecting one loads it as a free-play round), `Menu` (header overflow popover:
  **Daily** / **Modes** nav + in-round **hints** (Show cities / Reveal names, hidden
  once finished) + How to play / Statistics / About), `LanguageSwitcher` (header
  language picker — a native `<select>` over a globe icon), `icons.tsx` (inline SVG — no
  emoji chrome). Every component pulls copy from `useI18n().t` — no hard-coded strings.
- `src/ui/Globe.tsx` — the main guessing surface: a drag-to-spin **orthographic
  globe** (d3-geo). Its base is a **hypsometric elevation map** — the `elevation.json`
  bands (hydrated once with `topojson-client`) painted deepest→highest as nested
  brown/blue relief (ocean depth → land height), then the `ice` sheets
  (Greenland/Antarctica) as `--globe-ice` on top, with a crisp coastline
  (`world-atlas` countries-110m TopoJSON) stroked over the top and **country
  borders** (`--globe-border`) inland of it. One `world-atlas` file feeds both:
  its `land` object is the coastline, and `topojson-client`'s `mesh(…, (a, b) =>
  a !== b)` over its `countries` object yields the interior boundaries only — each
  border drawn once, coastlines not double-stroked.
  The **relief** has tiers too: past `FINE_RELIEF_ZOOM` (3.2) the globe fetches
  `elevation-fine.json` (0.1°) and swaps it in, because 0.2° cells read as 20 px blocks
  at 6× however good the coastline is. One-shot and fire-and-forget — a failed fetch
  just leaves the bundled bands on screen. The fetch effect keys on the *threshold*
  (`zoom >= FINE_RELIEF_ZOOM`), not on `zoom`: keyed on `zoom` it was torn down and
  re-run every frame of a drag, so its cleanup cancelled the very import it had just
  started and the tier silently never arrived.
  **Two outline tiers**, both bundled: 110m carries the whole-globe view, and past
  `DETAIL_ZOOM` (2.2) the finer `@/data/outline.json` takes over, so zooming *reveals*
  island chains, inlets and the real wiggle of country borders (the Balkans, Benelux,
  the Nepal/Bangladesh borders) instead of magnifying polygons. The fine tier is hydrated
  on **first use**, not at module load — a round that never zooms in shouldn't pay for
  it. Every map layer is then drawn through `lib/cull.ts`: only the pieces the board
  can reach get re-projected, which is what pays for the extra detail (a zoomed drag
  measured **36.7 → 49.2 fps** with the finer coastline, A/B against the same build). The band tints are the
  `--hypso-*` CSS ramp (theme-aware); the deepest ocean is the sphere's
  `--globe-ocean` base.
  Purely presentational — all geometry comes
  from props. Renders the start-city marker (`start` is **optional** — Hidden
  Destination has no origin, so the globe opens on a neutral world view), the
  **journey** (a line linking start →
  each guess in order — the legs that sum toward the target) and guess pins coloured by
  `tempLevel`, and — only once `finished` — an explorable **reveal** (via the `reveal`
  prop): the ideal single-hop wins (violet `--reveal` dots) plus the completions from the
  player's stopping point (win-coloured dots) — both distinct from the smaller,
  ramp-coloured guess pins. A third reveal kind, `answer` (also violet), marks the single
  mystery city for Hidden Destination (caption tag "The hidden capital"); it carries no
  distance (nothing to measure from) and the globe **spins it into view** on finish, so
  the one pin that matters is never left on the far hemisphere. **Hover** (mouse) previews a pin and
  **tap** (a press that doesn't drag) pins the selection — the engaged pin gets a halo +
  a lighter name label, a distance/kind caption below the globe, and, for a completion,
  the dashed **missed leg** from where the player stopped. Spins to face the
  start on load and smoothly **re-centres on the latest guess** (rAF-animated; drag
  interrupts). Far-hemisphere points are hidden via a `geoDistance` great-circle test.
  **Zoom** feels like moving in rather than the picture growing: the `+`/`−` buttons
  **ease** to their target (`ZOOM_DURATION`, interpolated *geometrically* — equal
  ratios per frame, since equal increments visibly decelerate as the globe grows), and
  wheel + pinch are **anchored**, keeping whatever is under the pointer (or the middle
  of the pinch) under it. Scaling alone happens about the globe's centre, which slides
  the anchor outward; `zoomAbout` measures where the anchor points before versus after
  the scale change and spins by the difference — exact at the anchor, invisible error
  away from it (measured drift 37 px → 2.5 px). A drag, a pinch or a wheel cancels an
  easing zoom.
  **Zoom** (pinch / wheel / `+`−` buttons) magnifies the globe via `projection.scale`
  and draws an **explorable city layer** from the `cities` prop: quiet dots for real
  cities, filtered by `exploreMinPopulation(zoom, rules)` (biggest first, more as you
  zoom in) then culled to the near hemisphere + viewport and capped at
  `rules.explore.maxDots`; tap one to read its name (caption + label). The `exploreAll`
  prop skips that zoom/population gate for a pool that is already small and curated —
  Hidden Destination passes `capitals()`, so its hint reveals **capitals only** (the set
  the answer is drawn from), whole, at any zoom. Excludes the
  start / guessed / reveal cities (they carry their own markers). This layer is
  **gated by hints while playing** (`hintLevel` prop): 0 = no dots (the default),
  ≥1 shows the dots, ≥2 also makes them tappable for names; once `finished` the dots
  always show and are always tappable regardless. The two hint levels are unlocked from
  the header overflow **menu** (`Menu.tsx`), not the globe — the Globe just reads
  `hintLevel` and renders accordingly; the menu's `capitalsOnly` prop relabels hint 1
  ("Show capitals") in a capitals-only mode. Hints are a free assist — purely presentational
  here; the persisted level lives in `App`. Zooming simply
  **grows the globe past the board** (the SVG overflows). The `.globe` stays a plain
  in-flow block in the **normal document layer** (`touch-action: none`, no `z-index` of
  its own — a negative `z-index` once promoted it into a compositing layer where the
  browser ignored `touch-action`, so pinch zoomed the page and drag went flaky); the
  enlarged sphere slides *beneath* the surrounding — often translucent — UI purely by
  paint order (panels after it paint on top; the two panels above it — `.prompt` and the
  `.hdr` header — are each lifted with `position: relative; z-index: 1` so the growing
  sphere recedes behind them instead of covering the logo + settings). Presentational as ever — geometry from
  props. Everything needed to *play* is bundled; the single runtime fetch is the
  deep-zoom relief tier, and the globe carries on with the bundled bands if it
  never arrives.
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
npm run data:elevation    # rebuild src/data/elevation.json from NOAA ETOPO (needs network)
npm run data:outline      # rebuild src/data/outline.json (fine coastline; no network)
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

**Capitals.** The build also emits a top-level `capitals` array — the geonameids of
national capitals, detected from the `PPLC` feature code in `cities15000.txt`
(`collectCapitalIds`). Like translations, it can be refreshed onto an already-built
`cities.json` without a full rebuild: `npm run data:capitals -- <cities15000.txt>`
(`scripts/enrich-capitals.mjs`) intersects `PPLC` ids with the dataset (~160 capitals,
pop ≥ 100k) and rewrites just the `capitals` list, leaving translations intact.

**Globe outline.** `src/data/outline.json` is the globe's *fine* coastline + borders —
the tier that appears when you zoom in. Rebuild with `npm run data:outline`
(`scripts/build-outline.mjs`, no network): it takes world-atlas's 50m outline, thins it
with `topojson-simplify` and rebuilds the topology, keeping **every ring** (the small
islands are the whole point) while dropping the sub-pixel wiggle — 739 KB → ~250 KB,
small enough to bundle, so the detail costs no runtime fetch and the globe still works
offline.

**Land and borders are thinned separately, and must be.** Simplification scores a
vertex by the triangle it forms with its neighbours, so it strips *straight* lines
hardest — and country borders are long straight or gently curved runs where coastlines
are convoluted. A single shared weight left the coast at 3.4× the 110m detail and the
borders at **1.4×**, i.e. zooming visibly sharpened the coast while the borders stayed
exactly as blocky as before. `LAND_SIMPLIFY` (0.02) and `BORDER_SIMPLIFY` (0.0005) are
therefore separate knobs; borders are cheap (~19k points at 50m) so they keep nearly
everything. Re-measure a drag if you raise either.

**Globe elevation.** `src/data/elevation.json` is the other committed, bundled
artifact — the hypsometric relief the globe paints under the coastline. Rebuild it
with `npm run data:elevation` (`scripts/build-elevation.mjs`, needs network). One run
emits **two tiers** from one download: the bundled `elevation.json` (0.2°) and the
deep-zoom `elevation-fine.json` (0.1°, fetched on demand — see above). The fine tier
keeps finer land detail (`FINE_LAND_SIMPLIFY`) but **drops speck-sized land rings**
(`FINE_LAND_MIN_RING`): at 0.1° a single warm cell contours to a ~6-point triangle and
there are ~23,000 of them, carrying three quarters of the bytes and most of the frame
cost, since culling tests every ring every frame. Dropping them took the tier from
1,263 KB to 660 KB and a deep-zoom drag from 27 to 47 fps, and costs elevation speckle
rather than islands — the coastline comes from `outline.json`, not from here. The build
streams a coarse (0.2°, block-averaged) subset of the **NOAA ETOPO 2022** global
relief grid via OPeNDAP — so no giant download — contours it into fixed
depth/height bands with **d3-contour**, reprojects the contours from grid space to
lon/lat, and writes a quantized + simplified TopoJSON (~390 KB, ~25 s end to end).
The `THRESHOLDS` array (5 ocean + 6 land bands) must stay in lockstep with the
`--hypso-*` colour ramp in `globals.css` — same count, same order.

Two things in that reprojection are easy to get wrong and show up as relief that
sits *beside* its coastline (most visible on island chains, against the country
borders): d3-contour's coordinates are offset **+0.5 cell** from the data indices,
and a block-averaged cell stands for its members' **centroid**, not its first
sample. `projector()` applies both — leave them in, or the map drifts ~0.125° NE.
Simplification is split by band: land keeps its detail (`LAND_SIMPLIFY`), while the
ocean bands are thinned harder and have their smallest rings dropped
(`OCEAN_SIMPLIFY` / `OCEAN_MIN_RING`) — invisible at globe scale, and it roughly
halves the file. `LAND_SIMPLIFY` is the **frame-rate knob**: the Globe re-projects
every band on every drag frame, and dropping it to 0.05 costs ~10 fps mid-drag for
detail you can't see. Re-measure a drag if you change it. It also fetches ETOPO's *bedrock*
grid and contours (surface − bedrock) at `ICE_THICKNESS_MIN` to emit the `ice`
object — Greenland + Antarctica — since ETOPO models thick ice only under those two
sheets, so nothing else is falsely flagged.

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
Globe elevation relief derived from **NOAA NCEI ETOPO 2022** (public domain).
