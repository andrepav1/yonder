# Yonder 🧭

A daily, mobile-first **geography guessing game**. Every day, everyone in the world
gets the **same** puzzle: one **start city** and one **target distance**. Your job is
to name a real city that lies as close as possible to that exact distance from the
start — measured as the great-circle (haversine) distance. You get **6 guesses**.

> **Project status:** v1 is complete — the pure, tested game core (distance/bearing,
> dataset + fuzzy autocomplete, deterministic generator, scoring, engine, share, stats)
> **and** the React UI (guess loop, hot/cold feedback, result, stats, onboarding, light
>
> - dark). Fully static; deploys to Cloudflare Pages. `npm run dev` to play.

## How it works

| Rule            | Value                                                                  | Where                              |
| --------------- | ---------------------------------------------------------------------- | ---------------------------------- |
| Guesses per day | **6**                                                                  | `rules.guesses`                    |
| Win band        | best guess within **±5%** of target                                    | `rules.tolerancePct`               |
| Score           | `1000 × max(0, 1 − error/0.5)` on best guess **+ 50 per unused guess** | `rules.score`                      |
| Target distance | **200–2000 km**, validated to have ≥3 valid answers                    | `rules.target`, `rules.generation` |
| Start city      | population-weighted, **≥ 1,000,000** (recognizable)                    | `rules.startCity`                  |
| Dataset         | GeoNames cities, **pop ≥ 100k** (~6.2k cities)                         | `rules.dataset`                    |
| Daily reset     | **UTC midnight**, seeded from the date                                 | `rules.reset`                      |

**Win vs. score are two layers over the same number** — a guess's _percent error_ is
`|guessDistance − target| ÷ target`.

- **Win/lose (drives the streak):** you win if your best guess lands inside the ±5%
  band. For a 1000 km target that's 950–1050 km. It's unit-independent — the same in
  km or miles.
- **Score (bragging rights):** how _deep_ inside you got — full points at a perfect
  hit, decaying smoothly to 0 once you're 50% off, plus a bonus for finishing in fewer
  guesses.

### Per-guess feedback

After each guess you see the guessed city's actual distance from the start, the delta
from target ("142 km too far" / "37 km too close"), the exact **bearing in degrees +
an arrow** (e.g. `47° ↗`), and a hot→cold colour cue by percent error. A km/mi toggle
switches all displayed distances (the win band is a percentage, so it's identical
either way).

### End of round

On a win or after 6 guesses, Yonder reveals the **3 closest possible** answer cities
and your best delta. A Wordle-style shareable summary (hot/cold squares + direction
arrows, no city names) copies to the clipboard.

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
2026-07-15  START: Baotou       TARGET: 607 km   band 577–637   valid answers: many
            closest: Linshui 604 km (−3), Handan 604 km, Guyuan 603 km ...
```

### Project structure

```
src/
  config/rules.ts     # ← all tunables, one declarative object
  lib/                # pure, tested core (no I/O)
    prng.ts           # mulberry32 + date-string hash
    geo.ts            # haversine, bearing, compass, unit conversion
    types.ts          # City, PuzzleSpec, RoundState, … (serializable)
    cities.ts         # dataset load + fuzzy autocomplete
    puzzle.ts         # deterministic daily generator
    scoring.ts        # evaluate guess, proximity score, hot/cold level
    engine.ts         # pure RoundState machine
    share.ts          # Wordle-style share string
    format.ts         # distance / delta / bearing display
  modes/daily.ts      # the one GameMode descriptor (+ registry)
  store/              # persistence behind a KeyValueStore seam
    storage.ts        # memory + localStorage adapters
    statsStore.ts     # stats, streaks, distribution, daily round save
    prefs.ts          # unit + onboarding flag
  ui/                 # React shell (GuessInput, GuessRow, ResultCard, …)
  styles/globals.css  # the "Terra" design system (see DESIGN.md)
  App.tsx  main.tsx   # app shell + entry
  data/cities.json    # committed compact dataset (built artifact)
scripts/
  build-cities.mjs    # GeoNames -> cities.json
  preview-puzzles.mts # dev: print sample puzzles
  screenshot.mjs      # dev: phone-sized screenshots of the real UI
```

The core is intentionally **pure and data-driven** so puzzles can later be
precomputed server-side and the game can grow additional modes / multiplayer without
rewrites. See `CLAUDE.md` for architecture notes and `DECISIONS.md` for the rationale
behind each rule.

## Data & deployment

City data © [GeoNames](https://www.geonames.org/), licensed **CC BY 4.0**. The
compact `cities.json` is committed, so the app is fully static — it deploys to
**Cloudflare Pages** (build command `npm run build`, output `dist/`) with no backend.

## Tech

React + Vite + TypeScript, ESLint + Prettier, Vitest, GitHub Actions CI.
