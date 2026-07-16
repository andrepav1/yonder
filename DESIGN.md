# Yondle — "Terra" design system

The visual language: **warm, muted, wandering — "somewhere far off."** Exaggerated
minimalism, a single mobile-first column, generous whitespace, an interactive Earth
globe as the board, and a hot→cold ramp. Tokens live in
`src/styles/globals.css`; this file is the intent behind them. (Generated with the
`ui-ux-pro-max` skill, then tuned for the travel feel.)

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

**Hot → cold ramp** (`--temp-4` … `--temp-0`): ember → amber → gold → dusty teal →
deep blue. `4` = win, in the band (hottest); `0` = far from the target or busted
(coldest). Set by `tempLevel()` in `lib/scoring.ts` — graded by how much of the journey
remains — so the guess-row swatch, the **globe guess pins**, and the share squares
always agree.

**Globe** (`--globe-ocean/-land/-graticule/-edge`): a muted, low-contrast Earth so the
journey line and the ramp-coloured pins carry the eye — pale slate ocean + warm sand
land in light, deep ink ocean + warm umber land in dark. The **journey** linking the
start through each guess is a soft `--fg` line; the start city is an accent halo + dot
with a Calistoga label; on finish the closest single-hop cities are pinned.

## Accessibility

- **Never colour-alone.** Every hot/cold cue ships with text ("1,134 km to go",
  "Inside the band!", "Overshot!") and the win/bust rows also get a distinct border.
- Touch targets ≥ 44px (icon buttons, inputs, unit toggle). Visible focus rings
  (`--ring`). `prefers-reduced-motion` disables animation. Safe-area insets respected.
- Modal is a labelled `role="dialog"`, Esc + scrim close, scrim ~55% for legibility.

## Motion

Entrances only, 150–320ms, ease-out; guess rows and cards `rise`, the sheet slides up
from the bottom. The globe also spins ~600ms to re-centre on each new guess. Nothing
decorative-only. All disabled under reduced-motion (the globe snaps instead of spinning).

## Deferred (logged, not built)

Colorblind-safe ramp, installable PWA. (The interactive map with pins — once deferred —
is now the globe board; see `DECISIONS.md`.)
