# Yondle 🧭

A daily, mobile-first **geography guessing game**. Every day, everyone in the world
gets the **same** puzzle: one **start city** and one **target distance**. Build a
journey city by city — each guess adds the great-circle (haversine) distance from your
**previous** city (the start, on the first hop) to a **running total**. Reach the
target without going over. A hop that would overshoot is **blocked** — it costs you
nothing, so you just pick a closer city; you only lose by using up all your guesses
before landing your total just under the target. You get **6 guesses**, and fewer hops
is a better score.

> **Project status:** v1 is complete — the pure, tested game core (distance/bearing,
> dataset + fuzzy autocomplete, deterministic generator, scoring, engine, share, stats)
> **and** the React UI (an interactive 3D **globe** as the board, guess loop, hot/cold
> feedback, result, stats, onboarding, light + dark, **nine languages**), with a
> **daily** puzzle plus free-play **modes** (Classic + Hidden Destination) behind a
> header menu.
> Fully static; deploys to Vercel. `npm run dev` to play.

## How it works

| Rule            | Value                                                          | Where                              |
| --------------- | -------------------------------------------------------------- | ---------------------------------- |
| Guesses per day | **6** hops                                                     | `rules.guesses`                    |
| Scoring         | **cumulative** — sum of each leg (previous city → next)        | `src/lib/scoring.ts`               |
| Win band        | running total in **[target·98%, target]** (one-sided; no over) | `rules.tolerancePct`               |
| Overshoot       | a hop that would go **over** is **blocked** (no turn spent, forgiving default) | `rules.overshoot.endsRound`        |
| Lose            | out of 6 guesses short of the band (overshoot ends it only under sudden-death) | `src/lib/engine.ts`                |
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
- **Guessable cities:** only cities with a population **≥ 100,000** are in the game
  (~6.2k worldwide) — smaller towns can't be guessed. The How-to-play primer says so up
  front, so players know the field.

### The globe

The board is an **interactive orthographic globe** (drag to spin), centred on the
day's start city when the page loads. Each guess extends a **journey line** from the
start through your cities in order and drops a pin coloured on the same hot→cold ramp
as the list below it, and the globe **spins to re-centre on your latest guess** (drag
to override); pins on the far side of the Earth are hidden until you rotate them into
view.

You can also **zoom** the globe — pinch, scroll, or the `+`/`−` buttons — to explore.

While you're playing, the globe stays clean: **no city dots are shown** until you spend a
hint (or the round ends). The two hints live in the header **≡ menu**, keeping the board
uncluttered:

- **Show cities** reveals the explorable dots — the **biggest cities first**, and the
  further you zoom in, the more (progressively smaller) cities appear around you.
- **Reveal names** then lets you **tap any city** to read its name in your own language.

Hints are a **free assist** — they never affect your score, streak, stats, or the shared
result. In the daily puzzle an unlocked hint sticks for the rest of the round (it survives
a reload); practice hints reset with each new puzzle. Either way, once the round is over
the dots always show and are always tappable.

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

### Modes

The **daily** is the home board — the one saved, streak-tracked puzzle everyone
shares. Tap the **menu** (☰) → **Modes** to open a picker of **free-play** modes; each
serves an **endless stream of random puzzles** that are **off the record** (they never
touch your daily streak, win %, or guess distribution). Hit **New puzzle** to reshuffle,
or **Daily** in the menu to go home. Two modes today:

- **Classic** — the daily's rules as free play: build a journey to the target distance.
- **Hidden Destination** — a deduction game: find a **secret capital**. You get the
  distance + bearing from an anchor city, then guess capitals; each reports how far
  (and which way) it is from the mystery city, hot/cold. Name it exactly within 8 tries.

Under the hood this is the game's mode seam: every mode is a declarative descriptor
(setup / play / goal / present) over one generic engine, so a new variant is a
descriptor, not an engine rewrite. See `MODES.md` for the framework. The generator
stays pure and deterministic in its seed — the UTC date for the daily (same for
everyone), a fresh random token for free play; the randomness lives at the app boundary.

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
npm run data:capitals -- <cities15000.txt>   # refresh the national-capital flags only
npm run data:elevation    # regenerate src/data/elevation.json from NOAA ETOPO (needs network)
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
  config/rules.ts     # ← all game tunables, one declarative object
  config/monetization.ts  # ← ads + donation switches (opt-in; UI-only, never in lib/)
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
  modes/daily.ts      # GameMode descriptors (daily + free-play modes) over a registry
  store/              # persistence behind a KeyValueStore seam
    storage.ts        # memory + localStorage adapters
    statsStore.ts     # stats, streaks, distribution, daily round save
    prefs.ts          # unit + language + onboarding flag
  ui/                 # React shell (Globe, GuessInput, GuessRow, ResultCard, AdSlot, SupportLink, Menu, About, LanguageSwitcher, …)
  styles/globals.css  # the "Terra" design system (see DESIGN.md)
  App.tsx  main.tsx   # app shell + entry
  data/cities.json    # committed compact dataset (built artifact)
  data/elevation.json # committed globe relief bands (built artifact)
scripts/
  build-cities.mjs    # GeoNames -> cities.json (incl. localized names)
  enrich-cities.mjs   # attach/refresh translations on an existing cities.json
  build-elevation.mjs # NOAA ETOPO -> elevation.json (globe hypsometric bands)
  preview-puzzles.mts # dev: print sample puzzles
  screenshot.mjs      # dev: phone-sized screenshots of the real UI
```

The core is intentionally **pure and data-driven** so puzzles can later be
precomputed server-side and the game can grow additional modes / multiplayer without
rewrites. See `CLAUDE.md` for architecture notes and `DECISIONS.md` for the rationale
behind each rule.

## Data & deployment

City data (names, coordinates, and localized alternate names) ©
[GeoNames](https://www.geonames.org/), licensed **CC BY 4.0**. The globe's elevation
relief is derived from [NOAA NCEI **ETOPO 2022**](https://www.ncei.noaa.gov/products/etopo-global-relief-model)
(public domain). The compact `cities.json` and `elevation.json` are committed, so the
app is fully static — it deploys to **Vercel** (framework preset **Vite**, build
command `npm run build`, output `dist/`) with no backend.

## Support & monetization

Yondle stays free and static. The optional, **opt-in** revenue bits live in one
declarative file, `src/config/monetization.ts` — deliberately kept out of the
determinism-sacred pure core (`lib/*` never imports it):

- **Donations** — set `supportUrl` to your "buy me a coffee" / tip link and a
  support link appears in the About dialog and on the end-of-round result. Empty
  string hides it.
- **Ads** — set the AdSense `client` + `resultSlot` ids to render one non-intrusive
  unit on the result card. Left empty (the default) **no ad script loads and no ad
  markup is emitted**, so the app stays fully static + offline-friendly.

Everything degrades to nothing when unconfigured, so the game ships unchanged until
you fill these in. See **`MONETIZATION.md`** for the full playbook (current values,
the AdSense activation steps, and the deferred revenue tiers).

## Tech

React + Vite + TypeScript, ESLint + Prettier, Vitest, GitHub Actions CI. The globe is
rendered with **d3-geo** (orthographic projection + geodesic circle). Its base is a
**hypsometric elevation map** — brown/blue relief bands (ocean depth → land height)
contoured from **NOAA ETOPO 2022** with **d3-contour** and bundled as TopoJSON, plus
an ice-sheet overlay so Greenland and Antarctica read as ice caps rather than brown
highlands — with a crisp coastline (**world-atlas** TopoJSON) stroked over the top,
all hydrated with **topojson-client**. Every tint is a theme-aware CSS token, so the
relief adapts to light/dark mode. All client-side, no runtime network.
