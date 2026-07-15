# Yondle — "Terra" design system

The visual language: **warm, muted, wandering — "somewhere far off."** Exaggerated
minimalism, a single mobile-first column, generous whitespace, a globe play surface
(start city at centre, dashed target ring, a target-radius circle per guess), and a
hot→cold proximity ramp. Tokens live in `src/styles/globals.css`;
this file is the intent behind them. (Generated with the `ui-ux-pro-max` skill, then
tuned for the travel feel.)

## Type

Three self-hosted families (via `@fontsource`, imported in `main.tsx` — no runtime CDN):

- **Calistoga** (`--font-display`) — warm display serif. Brand, city names, headlines.
- **Inter** (`--font-body`) — UI, copy, labels.
- **JetBrains Mono** (`--font-mono`) — the data face: distances, deltas, bearings,
  scores, the date. Always `font-variant-numeric: tabular-nums` so figures don't jitter.

## Colour

Warm sand/paper base, terracotta brand accent, sage green for the win. Full light +
dark, auto by `prefers-color-scheme`. Semantic CSS variables only — no raw hex in
components.

| Token                 | Light                 | Dark                  | Use                       |
| --------------------- | --------------------- | --------------------- | ------------------------- |
| `--bg`                | `#fbf6ee`             | `#17130f`             | page                      |
| `--surface`           | `#fffdf8`             | `#221c16`             | cards                     |
| `--fg` / `--fg-muted` | `#2a2320` / `#7c6f63` | `#f0e7da` / `#a99b8b` | text                      |
| `--accent`            | `#c2410c`             | `#e67635`             | brand, CTA, target figure |
| `--win`               | `#2f7d57`             | `#5fb98a`             | win row + headline        |

**Hot → cold proximity ramp** (`--temp-4` … `--temp-0`): ember → amber → gold → dusty
teal → deep blue. `4` = win/bullseye (hottest), `0` = way off (coldest). Set by
`tempLevel()` in `lib/scoring.ts` so the guess-row swatch and the share squares always
agree.

## Accessibility

- **Never colour-alone.** Every hot/cold cue ships with text ("142 km too far",
  "Inside the band!") and the win row also gets a distinct border + label.
- Touch targets ≥ 44px (icon buttons, inputs, unit toggle). Visible focus rings
  (`--ring`). `prefers-reduced-motion` disables animation. Safe-area insets respected.
- Modal is a labelled `role="dialog"`, Esc + scrim close, scrim ~55% for legibility.

## Motion

Entrances only, 150–320ms, ease-out; guess rows and cards `rise`, the sheet slides up
from the bottom. Nothing decorative-only. All disabled under reduced-motion.

## Deferred (logged, not built)

Colorblind-safe ramp, installable PWA, interactive map with pins. See `DECISIONS.md`.
