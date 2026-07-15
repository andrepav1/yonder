# Yonder 🧭

A daily, mobile-first **geography guessing game**. Every day, everyone in the world
gets the **same** puzzle: one **start city** and one **target distance**. Your job is
to name a real city that lies as close as possible to that exact distance from the
start — measured as the great-circle (haversine) distance. You get **6 guesses**.

> **Project status:** the pure game core (steps 1–3) is built and tested —
> distance/bearing math, the city dataset + fuzzy autocomplete, and the deterministic
> daily puzzle generator. The playable **UI is under construction** (steps 4–6). This
> README describes the design as agreed; sections marked _(planned)_ aren't wired to a
> screen yet.

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

### Per-guess feedback _(planned UI)_

After each guess you'll see the guessed city's actual distance from the start, the
delta from target ("142 km too far" / "37 km too close"), the exact **bearing in
degrees + an arrow** (e.g. `47° ↗`), and a hot→cold colour cue by percent error. A
km/mi toggle switches all displayed distances (the win band is a percentage, so it's
identical either way).

### End of round _(planned UI)_

On a win or after 6 guesses, Yonder reveals the **3 closest possible** answer cities
and your best delta. A Wordle-style shareable summary (hot/cold squares + direction
arrows, no city names) can be copied to the clipboard.

## Play the game logic today

Until the UI lands, you can watch the generator work:

```bash
npm install
npx vite-node scripts/preview-puzzles.mts   # prints puzzles for several dates
```

Example (deterministic — same for everyone on that date):

```
2026-11-02  START: Chengdu (pop 13,568,357)
            TARGET: 1024 km   win band ±5% = 973–1075 km   valid answers: 56
            closest: Thái Nguyên 1024.3 km (+0.3), Huangzhou 1027.6 km (+3.6) ...
```

## Development

```bash
npm install
npm run dev         # Vite dev server (planned — UI in progress)
npm test            # Vitest pure-logic suites
npm run lint        # ESLint (flat config)
npm run typecheck   # tsc, strict
npm run build       # production build → dist/ (planned)
npm run data:build  # regenerate src/data/cities.json from ./data-src
```

### Project structure

```
src/
  config/rules.ts     # ← all tunables, one declarative object
  lib/
    prng.ts           # mulberry32 + date-string hash
    geo.ts            # haversine, bearing, compass, unit conversion
    types.ts          # City, PuzzleSpec (serializable)
    cities.ts         # dataset load + fuzzy autocomplete
    puzzle.ts         # deterministic daily generator
  data/cities.json    # committed compact dataset (built artifact)
scripts/
  build-cities.mjs    # GeoNames -> cities.json
  preview-puzzles.mts # dev: print sample puzzles
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
