# Yondle — decision log

Short, ADR-style record of the choices behind the design, captured during the
requirements interview. Append a dated entry when a non-trivial decision is made or
changed. The "why" matters as much as the "what".

## 2026-07-24 — Overshoot is blocked, not sudden death

- **Context.** The one-sided win band plus cumulative-only distance made the game
  brutal: because every leg *adds* to the running total, the first time the total
  passes the target it can never come back down, so the engine ended the round as a
  **loss on the very first overshoot** — with the other five guesses wasted. In
  practice a single over-eager guess ended the day. Real players (including the
  author, three days running) bounced off it as "too hard and not fun."
- **Options.** (a) **Widen the band** — eases landing, but doesn't touch the sudden
  death that stings most. (b) **Overshoot lives** — allow N busts before losing;
  more forgiving, but keeps a punishing "you're out" moment and needs UI to convey
  the life count. (c) **Block the busting hop** — since an overshoot is provably
  unrecoverable, refuse to *record* it at all: reject it like a duplicate (no turn
  spent, running total untouched) and let the player pick a closer city. You then
  only lose by exhausting your six guesses short of the band.
- **Decision.** Went with **(c).** It fixes the exact complaint (no more one-guess
  game over) while staying true to the "build a journey" spirit — you can't take a
  hop that would bust, the same way you can't re-guess a city. Kept it **data-driven**
  behind `rules.overshoot.endsRound` (default `false`); setting it `true` restores
  classic sudden death, and the engine, share squares, and result copy all still
  handle a recorded overshoot for that mode. `errors.overshoot` (all nine locales)
  surfaces the block as a gentle "try a closer city" toast, reusing the existing
  no-turn rejection path.
- **Trade-off.** The daily is now easier and can only be lost by running the clock
  out — some tension leaves the *bust* moment. Acceptable: the golf score (fewer
  hops) still rewards precision, and a friendlier daily beats an unfun one. If it
  ever swings too easy, the band width and guess count are the next knobs to reach
  for, with sudden death a one-line revert.

## 2026-07-22 — Ice-sheet overlay (Greenland + Antarctica read as ice)

- **Context.** With the new hypsometric relief, Greenland and Antarctica came out
  brown — as tall as the Andes. That's *true of their surface* (the ETOPO 2022
  surface grid puts the ice-sheet tops at 2,500–3,200 m), but the height is **ice**,
  not rock, and a plain elevation ramp can't tell the two apart. It read as
  mountainous highland, which is misleading.
- **Options.** (a) Switch to ETOPO's **bedrock** grid — but then the ice vanishes and
  the interiors show as low basins, arguably *more* misleading (no white cap where
  everyone expects one). (b) Bundle a **separate** ice/glacier vector (Natural Earth) —
  works, but a second dataset at a different resolution, provenance, and alignment. (c)
  Derive the ice from the **same ETOPO source**.
- **Decision.** Went with **(c).** ETOPO ships both a *surface* and a *bedrock* grid;
  their difference is ice thickness. Handily, ETOPO models thick ice **only** under
  Greenland + Antarctica (Iceland, the Alps, the Himalaya all show ~0 at this
  resolution), so contouring (surface − bedrock) at a small threshold
  (`ICE_THICKNESS_MIN`, 250 m — the boundary is sharp, so anything 50–500 m works)
  yields exactly the two ice caps, perfectly aligned with the surface bands, no second
  dataset. Painted over the relief as a theme-aware `--globe-ice` (near-white in light,
  muted cool grey in dark so it doesn't glare), under the coastline so coasts stay crisp.
- **Trade-off.** Small mountain glaciers (Iceland, Patagonia, high Himalaya) aren't
  painted as ice — ETOPO's bedrock doesn't resolve them, and they're negligible at
  320 px anyway. The visual problem was the two continental ice sheets; those are fixed.

## 2026-07-22 — Hypsometric relief globe (brown/blue elevation map)

- **Context.** The globe drew land as one flat brown fill and the ocean as one flat
  blue disc — readable, but plain. We wanted a real **elevation map**: shades of brown
  for land height, shades of blue for ocean depth.
- **Options weighed.** (a) A **raster texture** wrapped on the sphere via canvas
  reprojection — most photoreal, but it rewrites the all-SVG globe into a canvas hybrid,
  adds an image asset, and can't easily follow our light/dark theme (fixed pixels). (b)
  Purely **procedural gradients** — tiny, but decorative, not a true elevation map. (c)
  **Vector hypsometric bands** — contour the world into a handful of depth/height bands
  and paint them as stacked SVG paths.
- **Decision.** Went with **(c) vector bands.** It stays true to the globe's existing
  nature — all-SVG, all-vector, geometry-from-props, bundled, no runtime network — and,
  crucially, keeps every band colour a **CSS token**, so the relief adapts to light/dark
  mode like the rest of the design system. Source is **NOAA ETOPO 2022** (public domain,
  includes bathymetry, so one grid gives both land *and* ocean), streamed **coarse
  (0.5°) via OPeNDAP** at build time so we never download the full ~450 MB grid, then
  contoured with **d3-contour**, simplified, and committed as a ~200 KB TopoJSON
  (`elevation.json`).
- **How it renders.** Bands are painted **deepest → highest**, each as a nested
  "value ≥ threshold" region, so higher bands overpaint lower ones into a continuous
  hypsometric tint (the sphere's base colour shows through only in the deepest trenches).
  A crisp coastline (the existing world-atlas land outline, stroke-only) is drawn over
  the bands so coasts stay sharp despite the coarse elevation grid.
- **Balance.** Chose ~0.5° resolution + 11 bands (5 ocean, 6 land) as the "balanced"
  point: a clear, smooth elevation feel at 320 px without bloating the bundle or the
  per-frame reprojection cost. `THRESHOLDS` (in `build-elevation.mjs`) and the
  `--hypso-*` CSS ramp must be kept in lockstep — same count, same order.

## 2026-07-21 — Fix: zoomed globe covered the header (logo + settings)

- **Context.** The "grow the sphere past the board, behind the UI" effect leans purely on
  paint order: the `.globe` is an unpositioned in-flow block, so siblings rendered *after*
  it (guess input, guesses, result) paint on top, and the one panel *above* it —
  `.prompt` — is lifted with `position: relative; z-index: 1` so the enlarged sphere
  recedes behind it too. But the **header** (`.hdr`, logo + language/unit/menu controls)
  sits above `.prompt` and had **no such lift**, so a fully-zoomed globe growing upward
  painted over it and hid the chrome.
- **Fix.** Give `.hdr` the same lift as `.prompt` — `position: relative; z-index: 1` —
  so the enlarged sphere slides *behind* the header. No new stacking gymnastics; it's the
  identical paint-order trick already used one panel down.

## 2026-07-21 — Fix: globe pinch-zoom leaked to the page; drag went flaky

- **Context.** After the "grow the sphere past the board, behind the UI" change, the
  whole interactive `.globe` was parked at a negative `z-index` (inside `.shell`, which
  is its own `z-index: 1` stacking context). On touch devices this promoted the globe
  into a **compositing layer behind `.shell`**, where the browser stopped honouring the
  SVG's `touch-action: none`: pinching zoomed the *page*, and single-finger drags came
  through unreliably.
- **Fix.** Keep the globe in the **normal document layer** — `.globe` is a plain,
  unpositioned in-flow block with no `z-index` of its own (plus `touch-action: none` on
  the container as belt-and-suspenders). The "slide behind the UI" effect is now pure
  paint order: panels rendered *after* the globe (guess input, guesses, result) already
  paint on top, and the one panel *above* it — `.prompt` — is lifted with
  `position: relative; z-index: 1` so the enlarged sphere recedes behind it too. No
  compositing-layer promotion, so `touch-action` is respected and pinch/drag work again.

## 2026-07-21 — Zoom + a progressive, explorable city layer

- **Context.** The globe showed only puzzle-relevant markers (start, journey, guesses,
  end-of-round reveal). Players wanted to **explore the map** — zoom in and click the
  cities scattered around the globe — with the biggest cities showing first and smaller
  ones appearing as you zoom in.
- **Zoom by scaling the orthographic projection.** A `zoom` factor multiplies
  `projection.scale` (pinch / wheel / `+`−` buttons, clamped to `[minZoom, maxZoom]`).
  Orthographic zoom just magnifies, so a zoomed globe overflows the board. We **let it
  overflow freely** — the SVG has `overflow: visible`, so the magnified sphere grows past
  the board and off the screen while sliding *beneath* the surrounding (translucent) UI,
  which stays legible on top. (Earlier this was clipped to the board disc with a circular
  `clipPath` to keep the globe round; the grow-and-recede-behind-the-UI feel read better,
  so the clip is gone.) Drag sensitivity divides by zoom so a pixel spins less when
  magnified.
- **Progressive reveal is a pure, rules-driven function of zoom.** `exploreMinPopulation
  (zoom, rules)` (in `lib/explore.ts`, unit-tested) log-interpolates a population floor
  from `explore.zoomedOutMinPopulation` (only megacities, zoomed out) down to
  `dataset.minPopulation` (zoomed in). "Biggest first" is free — the dataset is already
  population-sorted, so the floor **is** the reveal order. The Globe filters the full
  `allCities()` universe by that floor, then does the projection-dependent work
  (hemisphere + viewport culling, an `explore.maxDots` cap keeping the biggest) itself —
  keeping the pure/impure seam the codebase is built around.
- **Explore is read-only and off to the side of the puzzle.** Tapping a city shows its
  **name only** (no distance) — no game state changes, and no distance-from-start is
  leaked that could shortcut the guessing. The dots exclude the start / guessed / reveal
  cities (they have their own, louder markers) and are styled as the quietest marks on
  the board. Considered but rejected: **click-to-guess** (a bigger change to the guess
  flow and the engine's duplicate/overshoot handling) — deferred as possible follow-up.
- **Why keep the dots always visible, even during play.** A zoomed-out board still
  shows a handful of megacity dots, advertising the feature; they're muted enough not to
  compete with the guess markers, and the zoom hint only appears once the player zooms.

## 2026-07-21 — Always show the country in a city label

- **Context.** `cityLabel` disambiguated lazily: a bare name when unique (most cities),
  `"Name, Country"` only when the name repeated, `"Name, Region, Country"` when even that
  repeated. So players saw "Paris" but "Springfield, Illinois, United States" — an
  inconsistent, less legible label, and a bare name gives no help placing an unfamiliar
  city on the globe.
- **Decision.** Always carry the country: every label is at least `"Name, Country"`,
  still promoting to `"Name, Region, Country"` when the name repeats within the same
  country. This drops the `_countByName` (name-only) index; only the name+country tally
  is now needed. Matching (`search`/`resolveGuess`) is unchanged — labels are display
  only. Country/region qualifiers stay in their dataset (English) form, as before.

## 2026-07-21 — Practice mode + a header menu

- **Context.** The game shipped as a single daily puzzle, but the architecture was
  built for multiple modes (a `GameMode` descriptor + a `modes` registry with one
  entry). Requested: a **practice / explore** mode — unlimited random puzzles you can
  play any time — and, after a first attempt used a Daily/Practice **tab strip** that
  was disliked, a **menu** holding the mode switch plus other options (About, …).
- **Practice as a second mode (not a fork).** The daily and practice modes are two
  registry entries built by one `makeMode(rules)` factory; they share the engine,
  scoring, and share logic and differ **only in their seed**. `GameMode.generate` was
  generalized from `generate(date)` to `generate(seed)`: the daily passes the UTC date
  (same puzzle for everyone), practice passes a fresh random token per round. This
  validated the mode seam the codebase was designed around with almost no new logic.
- **Determinism stays sacred.** The generator is still a pure function of its seed —
  no `Math.random` / `Date.now` in `lib/*`. Practice's randomness lives at the single
  impure boundary in `App.tsx` (`makePracticeSeed()`), so the year-long determinism +
  solvability tests are untouched and a practice seed is reproducible if ever captured.
- **Practice is off the record.** The App keeps a persisted, date-locked **daily**
  round and a separate ephemeral in-memory **practice** round. Only the daily writes
  to the store and folds into the streak / win% / distribution; practice never does,
  and offers **New puzzle** instead of share (a random puzzle isn't the common daily
  one, so a shareable comparison would be meaningless). This protects the integrity of
  the daily streak — the thing the stats are *about* — while giving unlimited play.
- **Menu over tabs.** The first cut put Daily/Practice in an inline segmented control;
  it read as clutter above the board. Replaced with a header **overflow menu** (☰
  popover): mode switch (Daily / Practice, radio-checked), a separator, then How to
  play / Statistics / About. This also let the two standalone header icon buttons
  (help, stats) fold into one control, de-crowding a header that already carries the
  language + unit toggles. The popover closes on outside pointer, Escape, or a pick.
- **About.** A new short dialog (what the game is, the rules in brief, GeoNames +
  static-app credits) — the natural second menu item and a home for the attribution
  beyond the footer line. Copy added to all 9 catalogs; the key-shape parity test
  enforces completeness automatically.

## 2026-07-20 — Localized city names (guesses follow the UI language)

- **Context.** The UI shipped in 9 languages, but city names — shown on the globe, in
  guess rows, and typed into the input — were English-only. A French player saw
  "London", not "Londres". We wanted the guessable content to speak the chosen language
  too, without a translation-authoring burden or a backend.
- **Decision.** Enrich the bundled dataset from **GeoNames `alternateNamesV2`** (the same
  CC BY 4.0 source as the base data), storing a per-city `{ locale: name }` map on
  `City.names`. Display (`localizedName` / `cityLabel(city, locale)`) prefers the
  localized name; **matching** (`search`/`resolveGuess`) indexes the canonical name *and*
  every localized name, so a city is reachable by typing it in any language ("London" /
  "Londres" / "ロンドン" all resolve). English display and behaviour are untouched.
- **Storage.** We store a locale's name **only when it differs** from the canonical
  `name`, and never store `en`. That keeps the file compact (Latin-script cities that
  read the same across languages cost nothing) — ~4k of ~6.2k cities carry a translation,
  and `cities.json` grew ~420 KB → ~650 KB (well within the static bundle's budget; land
  outline + fonts already dominate).
- **Selection.** Per (city, locale): prefer an official/preferred name, break ties by the
  shorter form, and skip colloquial ("Big Apple") + historic ("Bombay") variants. This is
  data-driven, so a rebuild refreshes names with no code change.
- **Fallbacks & trade-offs.** Coverage is uneven — many mid-size cities have no name in a
  given language, so those gracefully fall back to the canonical (English) one; a
  non-English game is *mostly*, not fully, localized, and that's expected. GeoNames'
  `isPreferredName` occasionally marks a long official form (e.g. `ソウル特別市`,
  `東京都`) or a traditional-Chinese variant as preferred; we accept the data as-is rather
  than curating — it stays correct, and the short form still matches on prefix when typed.
  Country/region disambiguation qualifiers remain in English (not translated in the
  dataset). Determinism is unaffected: puzzle generation keys off ids + coordinates, never
  the display string.

## 2026-07-19 — Grew to 9 languages (validating the i18n seam)

- **Context.** After the i18n layer landed, we added Spanish + Chinese, then a second
  batch of Portuguese, German, Japanese, and Korean.
- **What it took.** Exactly what the design promised: one new catalog per language, one
  `LOCALES` entry, and widening the `Locale` union — no changes to any component, pure
  helper, or the provider. The key-shape parity test picks up each new locale
  automatically and enforces completeness against the English reference.
- **Notes.** `isLocale` derives its valid set from `LOCALES` rather than a
  hand-maintained literal, so new languages can't drift out of sync. The CJK locales
  (`zh`, `ja`, `ko`) render via the system font fallback — the bundled Inter/Calistoga
  faces are Latin-only, and pulling CJK webfonts (megabytes each) isn't worth it for a
  static game; the OS fonts look clean at the sizes used. Switcher labels are endonyms
  (`Español`, `日本語`, `한국어`, `中文`) so the picker is self-describing.
- **Batch selection.** Prioritized by audience reach against zero new infrastructure:
  all nine are LTR and need only a catalog. Right-to-left languages (Arabic, Hebrew,
  Persian/Urdu) are deliberately deferred — they need a `dir="rtl"` + logical-CSS pass
  first, a separate milestone rather than a translation drop-in.

## 2026-07-18 — Internationalization (English, French, Italian)

- **Context.** The UI shipped with English copy hard-coded inline across `App.tsx`,
  the `ui/*` components, and two pure helpers (`format.ts`, `share.ts`). We wanted
  French + Italian without a heavyweight i18n dependency and without compromising the
  "pure, I/O-free core" invariant.
- **Decision.** A tiny in-house i18n layer under `src/i18n`:
  - Catalogs (`en`/`fr`/`it`) are **plain, React-free, serializable** objects — strings
    plus small interpolation functions (`hint(band, guesses)`, `solved(used, total)`,
    …). English is the reference catalog and the default everywhere.
  - `index.ts` is the registry (`catalogs`, `LOCALES`, `getMessages`, `detectLocale`,
    `isLocale`); `context.tsx` adds the only React-aware piece, an `I18nProvider` +
    `useI18n()` hook exposing `{ locale, t, setLocale }`.
  - Pure `lib/*` helpers take a `Messages` catalog as an **optional last argument**
    (default English), mirroring how the game core already takes `GameRules`. This
    keeps `lib` dependency-light (it imports catalogs, never the React context) and
    means every existing English-only test stays green untouched.
- **Why not a library (`i18next`, `react-intl`).** Overkill for ~40 keys on a static
  daily game; they add bundle weight and a runtime we don't need. The catalog-as-data
  approach matches the project's existing "behaviour is data" philosophy and stays
  trivially unit-testable (a shape test asserts every locale defines the same keys).
- **Locale selection.** First visit detects from `navigator.languages` (primary subtag
  match), falling back to English; the header switcher persists an explicit choice in
  `localStorage` (`yondle:locale:v1`) via `prefs.ts`. `document.documentElement.lang`
  tracks the active locale for a11y + correct typography.
- **Numbers, dates, share.** `toLocaleString`/`toLocaleDateString` use each catalog's
  BCP-47 tag, so grouping and month names localize (`1,234 km` → `1 234 km`). The share
  string localizes its reach line but keeps the `Yondle` brand and ISO puzzle date
  identical for everyone, so results stay comparable across languages.

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

## 2026-07-21 — End-of-round "explore the map" reveal (a learning layer)

- **Context.** The end screen only dropped 3 unlabeled dots (the closest single-hop
  wins). It taught nothing, and a known failure mode of distance-guessing games is
  players farming cities near home rather than reasoning about the globe. We wanted the
  finish to *teach* geography, not just score it.
- **Decision.** On finish the globe becomes an explorable, tappable reveal with two
  layers of "cities you could have guessed":
  - **Layer 1 — ideal wins (precomputed, pure).** The `exploreCount` (16) closest
    single-hop wins from the start, kept in `PuzzleSpec.exploreAnswers` — a superset of
    the terse `answers` used by share. Determinism/solvability are untouched: it's just
    keeping more of the already-sorted valid answers.
  - **Layer 2 — personal completions (pure, dynamic).** `lib/reveal.ts:findCompletions`
    finds the cities that would have finished the run in one more hop **from where the
    player actually stopped**. This depends on the played round, so it can't live in the
    seed-only `PuzzleSpec`; it's computed at reveal time in `App` from the final round +
    the dataset. It's the "you were one city away" near-miss, and it's naturally empty on
    a win or an overshoot (nothing left to complete) — so it fires exactly on the
    fell-short losses where the lesson lands hardest.
- **Interaction.** Tap a pin (a press that doesn't cross a small drag threshold — reusing
  the existing pointer-capture drag) to select it: name label on the globe, a
  name/distance/kind caption below it, and, for a completion, the dashed **missed leg**
  from the stopping point. Reveal shows on **both win and loss** — on a win Layer 1 is
  "other ways you could have won it."
- **Why not a separate mode/route.** Kept it inline on the existing globe: zero new
  navigation, and the reveal reuses the board the player already knows. The globe stays
  purely presentational — all reveal geometry arrives via one `reveal` prop.

## 2026-07-21 — Pinch-zoom feel: faster, and no jump on re-pinch

- **Context.** Pinch zoom felt sluggish, and pinching → releasing → pinching again
  jerked the globe. Two causes: (1) the zoom updater read `pinchDist` *inside* the
  `setZoom` callback, but React runs that callback after the ref was already reassigned
  to the new separation, collapsing the frame's ratio toward 1 (weak, laggy zoom); and
  (2) the opening finger of a fresh pinch is momentarily a one-finger drag, so it spun
  the globe in the few milliseconds before the second finger landed.
- **Decision.**
  - Capture the pinch ratio *before* reassigning `pinchDist`, and raise it to
    `PINCH_SENSITIVITY` (1.6) so a small finger-spread magnifies more — a snappier pinch,
    still smooth. Correctness fix + speed knob in one.
  - Gate single-finger rotation on the press having cleared `TAP_MOVE_TOLERANCE` (the
    `moved` flag). This gives a second finger a brief window to land and switch the
    gesture to pinch before any spin happens. A drag *resumed* from a pinch (leftover
    finger) has no press and still spins immediately, as intended.

## 2026-07-22 — Hint system: gate the explorable dots while playing

- **Context.** The explorable city-dot layer used to be visible for the whole round —
  you could zoom in and tap any real city to read its name at any time. That quietly
  handed players a search tool: the answer set is "cities near a distance from the
  start", and being able to scan/label every nearby city trivialises the puzzle.
- **Decision.** Hide the dots during play and put them behind two opt-in **hints**:
  - **Hint 1 — Show cities**: render the dots (still anonymous).
  - **Hint 2 — Reveal names**: also let a tap read a dot's name.

  Once the round is **over** (win *or* loss) the dots always show and are always
  tappable, independent of hints — the end-of-round "learn the map" reveal is unchanged.
- **Placement — the header ≡ menu, not the board.** The hints first lived in a bar
  below the globe, but that put a permanent control in the main play view for something
  most players won't touch. Moved them into the existing header overflow menu, in a
  `HINTS` group between the mode radios and How to play / Statistics / About — an
  unlocked hint shows a check and disables (mirroring the Daily/Practice radios), and the
  group is hidden once the round is finished. The taller popover surfaced a latent
  stacking bug: `.hdr` and `.prompt` were both `z-index: 1` siblings, so the later
  `.prompt` painted over the header's popover once it grew tall enough to overlap the
  target text. Fixed by lifting `.hdr` to `z-index: 2` (still above the globe, now above
  the prompt too).
- **Free assist, not a penalty.** Hints don't touch the golf score, streak, stats, or
  the shared result. Rationale: the share string already carries no city names and the
  score is guess-count + final total; making hints costly would mean threading a
  penalty through `scoring.ts` / `share.ts` / stats and their invariant tests for a
  learning aid. Kept it a pure UI gate instead — the door is open to a tracked/penalised
  variant later (it's a single `hintLevel` today).
- **Where the state lives.** `hintLevel` (0/1/2) is owned by `App`, not baked into the
  serializable `RoundState` (it's a UI concern, and keeping it out of `RoundState` leaves
  the engine/modes and their determinism untouched). Daily persists it per date via
  `prefs.ts:load/saveHintLevel` (an unlocked hint survives a reload); practice keeps it
  in memory and resets it with each fresh puzzle. `Globe` stays purely presentational:
  it takes `hintLevel` + an `onHint` unlock callback and renders accordingly.

## 2026-07-22 — Tier-1 monetization: opt-in donations + ads, off the pure core

- **Context.** Yondle is a static, backend-less daily game — hard to monetize
  directly (à la Wordle), but with real daily retention. We want revenue that
  doesn't compromise the offline-friendly, deterministic, dependency-light design.
- **Decision — start with Tier 1 only: a donation link + one post-result ad slot.**
  Both are pure UI, both fully opt-in. Deferred the heavier bets (freemium archive
  behind auth+payments, education/B2B, sponsored puzzles) — see `MONETIZATION.md`.
- **Config lives in its own file, NOT `rules.ts`.** `src/config/monetization.ts`
  holds a declarative `MonetizationConfig` (`supportUrl` + AdSense `client`/
  `resultSlot`) + `defaultMonetization`. Kept separate because these are commercial/
  presentational switches, not **game rules** — folding them into `rules.ts` would
  drag ad ids and a URL through the determinism-sacred core and its year-long
  solvability tests. Only `src/ui/*` reads it; `lib/*` must never import it.
- **Everything degrades to nothing.** Empty strings render nothing: no support link,
  and — crucially — the AdSense script never loads and no ad markup is emitted. So
  the app stays 100% static + offline-friendly by default; a deploy only starts
  serving ads once real ids are pasted in. This keeps the "no runtime network" property
  intact for anyone who doesn't opt in.
- **Placement.** Support link on the `ResultCard` (after the share button) and in
  `About`; the single ad unit sits at the very bottom of the result, after a divider —
  the least intrusive spot, shown only once a round is finished. `SupportLink` /
  `AdSlot` are their own components so the surface stays swappable.
- **Not determinism-sacred.** Changing these never affects puzzle generation, scoring,
  or the shared result, so they carry no invariant tests — the `render-nothing` default
  is the safety property that matters.
