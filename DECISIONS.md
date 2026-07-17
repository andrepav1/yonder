# Yondle — decision log

Short, ADR-style record of the choices behind the design, captured during the
requirements interview. Append a dated entry when a non-trivial decision is made or
changed. The "why" matters as much as the "what".

## 2026-07-17 — Globe drag no longer freezes mid-spin (touch)

- **Symptom.** On touch, dragging to spin the globe would sometimes "move a little
  bit and then stop" while the finger kept moving.
- **Cause.** The SVG bound `endDrag` to `onPointerLeave`. The globe is a circle inside
  a square element, so while spinning it's easy to drag the finger past the SVG's box;
  if pointer capture didn't hold, `pointerleave` fired and ended the drag early. There
  was also no `onPointerCancel` handler, so a browser-initiated `pointercancel` left
  `drag.current` stuck and corrupted the next gesture.
- **Fix.** Drop the `pointerleave` teardown (pointer capture already keeps the moves
  routed to the SVG for the dragging pointer, wherever the finger goes) and end the
  drag only on `pointerup`/`pointercancel`. Track the pointer id so stray extra fingers
  and mismatched up/cancel events can't interfere. Behaviour on mouse is unchanged.

## 2026-07-15 — Initial design (requirements interview)

**Context.** Greenfield daily geography guessing game, mobile-first, static (no
backend for v1), deploying to Vercel. Built to eventually support multiple
modes / multiplayer, but only the solo daily game ships first.

### Game mechanics

- **Single round per day**, 6 guesses, locked after finishing. (Considered: 5 rounds
  summed; single-round "golf" scored by guess count. Chose single-round with a graded
  proximity score for a quick, shareable daily.)
- **Win = best guess within ±5% of target** (binary; drives the streak). Tolerance is
  a **percentage of the target**, not a fixed km/mi band — it's unit-independent and
  fair across short and long targets (a fixed ±8 km is trivial at 2000 km, brutal at
  100 km).
- **Score = `1000 × max(0, 1 − error/0.50)`** on the best guess, **+50 per unused
  guess** on a win. Perfect hit = max; 0 once you're 50% off. Win/lose and score are
  two layers over the same percent-error number.

### Puzzle generation

- **Global**, target distance **200–2000 km**. Start city **population-weighted**.
- **Solvability is guaranteed at generation time**: the target is re-drawn (seeded, so
  still deterministic) until the ±5% band contains **≥3** dataset cities.
- **Deterministic from the UTC date string** via FNV-1a hash → `mulberry32`. Same day
  = same puzzle for everyone. Generator is pure (no clock/`Math.random`), so puzzles
  can be precomputed server-side later.

### Start-city recognizability (tuned 2026-07-15)

- The spec asked start cities to feel "well-known". With `minPopulation: 300k` + linear
  weighting, ~35% of starts were sub-1M and obscure (the mid-size long tail collectively
  outweighs megacities). Measured alternatives over 60 days:
  - `300k, exp 1` → median 1.47M, 21/60 under 1M (too obscure)
  - **`1M, exp 1` → median 2.8M, 0 under 1M, good geographic spread ✅ (chosen)**
  - `1M, exp 1.5` / `500k, exp 2` → medians 5.4M / 9.6M, but over-concentrated on a
    handful of Chinese/Indian megacities (repetitive).
- **Decision:** `startCity.minPopulation = 1_000_000`, `weightExponent = 1`. The
  dataset keeps its 100k floor, so _answer_ cities stay varied; only the **start** is
  restricted. 564 cities are start-eligible — ample daily variety.
- _Known limitation:_ population weighting skews start cities toward Asia (that's where
  the population is). A future geographic-balancing knob could even this out; out of
  scope for v1.

### Input & feedback

- **Free-text input with fuzzy match** (accent/case-insensitive, typo-tolerant via
  bounded Levenshtein), backed by a typeahead. Resolves to the closest dataset city;
  duplicate names are disambiguated by country (then admin-1 region).
- Bearing shown as **exact degrees + arrow**. Reveal the **top 3 closest** answers.

### Persistence & sharing

- **localStorage only** (no backend): daily lock + current/max streak, games played,
  win %, guess distribution.
- Share string: hot/cold squares + direction arrows, score line, **no city names**.

### Platform & polish

- **React + Vite + TypeScript**, ESLint + Prettier, Vitest, GitHub Actions CI,
  Vercel.
- v1 includes: how-to-play onboarding, auto dark mode, decorative globe/map motif.
- **Deferred from v1:** colorblind-safe palette, installable PWA, interactive map with
  pins. (Easy to add later; flagged so we don't forget.)

### Architecture

- **Light seams (YAGNI):** pure engine ↔ React shell split, one declarative `rules.ts`,
  a single-entry `GameMode` descriptor (registry-ready), and a `StatsStore` interface
  with a localStorage adapter. No unused multiplayer machinery yet — just clean seams
  so modes/multiplayer are additive later.
- **Config format:** typed TS module (`src/config/rules.ts`) for type-safety and
  autocomplete over a raw JSON file.

## 2026-07-15 — UI build (steps 4–6)

**Context.** Built the React shell on top of the pure core, using the `ui-ux-pro-max`
skill for the visual system.

- **Design system "Terra"** (`DESIGN.md`): warm sand/paper + terracotta, hot→cold ramp,
  Calistoga (display) + Inter (UI) + JetBrains Mono (figures). Light + dark auto by
  `prefers-color-scheme`. Semantic CSS-variable tokens; no raw hex in components.
- **Fonts self-hosted** via `@fontsource` (imported in `main.tsx`) rather than a Google
  Fonts CDN link — no runtime network dependency, better for Vercel + offline, and
  it works in the CDN-blocked sandbox.
- **Icons are inline SVG** (`ui/icons.tsx`), not an icon dependency or emoji chrome —
  small bundle, offline-safe. (Emoji squares in the _share string_ are content, fine.)
- **Hot/cold never colour-alone**: every cue carries text ("142 km too far", "Inside
  the band!") + the win row a distinct border, satisfying the a11y rule.
- **Daily lock** = the in-progress/finished `RoundState` is saved per date in
  localStorage and restored on load; `recordResult` folds into stats idempotently.
- **Dataset stays inlined** into the JS bundle (import of `cities.json`) so `cities.ts`
  and puzzle generation remain synchronous. Costs ~150 KB gzip in the main chunk;
  `chunkSizeWarningLimit` raised to acknowledge it. A future optimisation is to emit it
  as a fetched asset + lazy-load, if bundle size becomes a concern.
- **Verification**: `scripts/screenshot.mjs` drives the built app in the pre-installed
  Chromium at 390×844; the board / play / win / dark states were captured and checked.

## 2026-07-15 — Interactive globe board

**Context.** The v1 board was a text prompt (start city + target distance) over a
decorative graticule, with guesses as rows and the answers revealed as a text list.
Requested change: make the **Earth globe the primary surface** — show it on load
centred on the start city, put guesses below it, and render the answer as a **circle
around the start city whose radius is the target distance** instead of a text list.

- **The "target ring" is the answer visualization.** The set of perfect answers is
  exactly the geodesic circle of radius `targetKm` around the start, so we draw that
  circle (`d3.geoCircle`, radius in degrees = `km / EARTH_RADIUS_KM · 180/π`) as a
  dashed accent ring. It _is_ the answer, continuously — every city on it scores a
  bullseye — so it stays **hidden during play** and is only drawn once the round is
  over (win or out of guesses). The old "3 closest possible answers" text list in
  `ResultCard` is gone; those cities are now pinned along the ring when it's revealed.
- **"Target city" = the start/departure city.** It's the only city known at the start
  of a round and the centre everything is measured from; the ring is drawn around it.
- **d3-geo orthographic, not a 3D/WebGL globe.** `geoOrthographic` + `geoPath` render
  to plain SVG path strings we hand to React. It gives correct back-hemisphere
  clipping (`clipAngle(90)`), a trivial geodesic circle, and drag-to-spin, without a
  Three.js/WebGL dependency or a canvas render loop. Markers on the far side are
  hidden with a `geoDistance ≤ 90°` test against the point facing the viewer.
- **Land outline is bundled, not fetched.** `world-atlas` land-110m TopoJSON (~56 KB),
  hydrated once at module load with `topojson-client` — keeps the app fully static and
  offline-safe (matches the fonts/dataset "no runtime CDN" stance). Land-only (no
  country borders) suits the minimal look and stays legible at ~320 px.
- **New deps** (all UI-only, none in the pure `lib/` core): `d3-geo`,
  `topojson-client`, `world-atlas` (+ `@types/*`). This resolves the "interactive map
  with pins" item that was deferred from v1.

## 2026-07-16 — Cumulative-path game (rules rework)

**Context.** The v1 game was single-shot: each guess was scored by its own distance
_from the start_, and you won if your best guess landed within ±5% of the target. The
requested new game is a **cumulative journey**: keep guessing cities and sum the legs
between consecutive guesses (Rome→Milan, then Milan→Turin, …) until the running total
reaches the target. This changes the core, not just tuning — legs are measured from the
_previous_ city, the total only grows, and overshooting is a loss.

### Rules decided (requirements interview)

- **Score is cumulative.** Each guess adds `haversine(previousCity, newCity)` (the start
  city for the first hop) to a running total. `GuessResult` now carries `legKm`,
  `cumulativeKm`, `remainingKm`, `over`, `won` (was: distance-from-start / delta /
  errorPct).
- **Win band is one-sided: `[target·(1−tol), target]`, `tol = 0.02`.** You win the
  instant the total lands within 2% _below_ the target; crossing the target **busts**
  the round immediately (even with guesses left). Narrower and asymmetric vs the old
  ±5%, because "sneak up without going over" is the whole tension.
- **Fixed cap of 6 guesses; each city once.** Running out is a loss. Duplicates
  (including the start) are rejected without using a turn — chosen over allowing
  revisits, which would let players bounce between two nearby cities to creep up in
  tiny increments and trivialize landing in the 2% band.
- **Golf scoring.** No graded points anymore — the streak + guess distribution reward
  reaching the band in the **fewest hops**. `ScoreBreakdown` drops `base`/`bonus`/
  proximity fields for `guessesUsed` / `totalKm` / `remainingKm` / `overshot`. The
  existing per-guesses-used distribution already models this, so stats/streaks are
  unchanged. (`rules.score` proximity config removed.)

### Solvability, kept cheap

- The generator's guarantee is unchanged in shape but reinterpreted: it still requires
  ≥ `minValidAnswers` cities within `[target·(1−tol), target]` of the start — now read
  as **single-hop wins** (a city you could reach in one guess without overshooting).
  That keeps generation a cheap, deterministic reseed loop (no path search) while
  guaranteeing every day is winnable; multi-hop paths only add more ways in.
- Band widened target range to **500–3000 km** and dropped `tol` to 0.02: the annulus
  `[0.98x, x]` scales with `x`, so a higher floor keeps ≥3 in-band cities easy to find
  within `maxAttempts` despite the narrower band. Year-long determinism + solvability
  tests stay green.

### UI / feedback

- **Globe draws the journey** (a line: start → each guess in order) during play; the
  target ring is now a _reference_ ("where one straight hop lands"), still revealed only
  at the end. Guess rows show the leg (`+480 km`), running total, and "to go" / "over".
- **`format.deltaPhrase` → `remainingPhrase`** ("142 km to go" / "37 km over"), and
  `scoring.evaluateGuess` → `evaluateLeg` (takes the previous point + prior total). The
  `GameMode.evaluate(puzzle, city)` seam became `apply(state, puzzle, city)` since a leg
  needs the running state. Share is now hop squares + leg arrows + a reach-% line.
- **Screenshot harness** (`print-today` + `screenshot.mjs`) drives a safe partial hop
  for the mid-game shot and a single-hop win for the win shot, validating both names
  through `resolveGuess` so bare names (e.g. "Orléans") resolve to the intended city.

## 2026-07-16 — Drop the target ring

**Context.** The end-of-round globe drew a dashed geodesic ring at the target distance
("where a single straight hop lands"). In the cumulative-path game the target is a
_path length_, not a radius, so the ring no longer represents the thing you're aiming
at and read as a leftover from the single-shot game.

- **Removed the ring** (`geoCircle` / `kmToDegrees` / the `targetKm` Globe prop and the
  `.globe__ring` style all go with it). The globe now shows only the journey line, the
  guess pins, and — on finish — the closest **single-hop win** pins, which stand on
  their own without the circle. Result-card copy updated to match.

## 2026-07-16 — Wider targets, absolute win band in the UI

- **Target range 500 → 10000 km** (was 500–3000). Longer targets make multi-hop
  journeys the natural way to play rather than a single long hop. Solvability is
  unaffected: at large radii the `[target·(1−tol), target]` annulus sweeps a big
  circle across the globe, so ≥3 single-hop wins are still easy to find (year-long
  determinism + solvability tests stay green).
- **The UI never states the tolerance as a percent.** The win band is a fraction of the
  target internally (`tolerancePct`), but the prompt and how-to now show the actual
  band width for the day via `format.bandLabel(targetKm, tolerancePct, unit)` (e.g.
  "within 45 km below the target") — so it reads in the player's chosen km/mi, from one
  source of truth. (The share string's "% of target" is a different number — reach, not
  tolerance — and stays.)

## 2026-07-16 — Cleanup pass (post-rework)

- **Hot/cold thresholds moved back into `rules`.** The rework had hard-coded
  `tempLevel`'s remaining-fraction cutoffs as bare literals (`0.08/0.2/0.45`) and left
  its `rules` param unused — a regression against "pure modules take `rules` and
  hard-code nothing" (the pre-rework `tempLevel` derived its cutoffs from `rules`). They
  now live in `rules.feedback.hotColdBands`. Behaviour unchanged; the seam is restored.
