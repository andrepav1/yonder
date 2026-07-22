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
| `--surface`           | `#fffdf8`             | `#221c16`             | cards, form, buttons      |
| `--panel`             | `--surface` @ 80%     | `--surface` @ 80%     | info-card fills (globe show-through) |
| `--fg` / `--fg-muted` | `#2a2320` / `#7c6f63` | `#f0e7da` / `#a99b8b` | text                      |
| `--accent`            | `#c2410c`             | `#e67635`             | brand, CTA, target figure |
| `--win`               | `#2f7d57`             | `#5fb98a`             | win row + headline        |
| `--reveal`            | `#6a53c4`             | `#a996f2`             | end-of-round answer cities |

**Translucent info panels** (`--panel`, `--panel-win`): the prompt card, guess rows,
and result card fill with `--surface` at 80% opacity so a zoomed globe — which grows
past its box and slides *beneath* these cards by paint order — shows through them. The
guess input and every button keep the fully opaque `--surface`/`--accent` so controls
stay crisp — including the **disabled** Guess button, dimmed only to `opacity: 0.7`
(not enough for the globe to read through) rather than going see-through.

**Hot → cold ramp** (`--temp-4` … `--temp-0`): ember → amber → gold → dusty teal →
deep blue. `4` = win, in the band (hottest); `0` = far from the target or busted
(coldest). Set by `tempLevel()` in `lib/scoring.ts` — graded by how much of the journey
remains — so the guess-row swatch, the **globe guess pins**, and the share squares
always agree.

**Globe** (`--globe-ocean/-graticule/-coast` + the `--hypso-0…9` ramp): a muted,
low-contrast Earth rendered as a **hypsometric elevation map** — five ocean-depth
blues (shelf → deep) grading into six land tans/browns (lowland → snow-capped peak),
painted deepest-first so they stack into relief; the deepest ocean is the sphere's
`--globe-ocean` base, the Greenland/Antarctica ice sheets sit on top as `--globe-ice`
(so they read as ice caps, not brown highlands), and a `--globe-coast` hairline keeps
coastlines crisp. Kept
low-contrast in both themes — pale blues + warm tans in light, deep ink ocean + muted
umber land in dark — so the accent ring + pins still carry the eye. The **journey**
linking the
start through each guess is a soft `--fg` line; the start city is an accent halo + dot;
guess pins are small ramp-coloured dots. On finish the globe reveals the cities the
player could have guessed, colour-coded so they never read as guesses: `--reveal`
(violet) for the ideal single-hop wins ("would have won"), `--win` (green) for the
completions from where the player stopped. Globe labels use `--font-body` at a light
weight (not the display serif), centred above the dot. **Explorable city dots** (the
zoom-to-reveal layer) are the quietest marks on the board — tiny `--fg-muted` dots at
~50% opacity, deliberately subordinate to every game marker; the engaged one lifts to
full `--fg` with a soft muted halo and its name label. Zoom controls (`+`/`−`) sit as a
translucent, backdrop-blurred pair in the globe's lower-right corner.

## Accessibility

- **Never colour-alone.** Every hot/cold cue ships with text ("1,134 km to go",
  "Inside the band!", "Overshot!") and the win/bust rows also get a distinct border.
- Touch targets ≥ 44px (icon buttons, inputs, unit toggle, menu trigger). Visible
  focus rings (`--ring`). `prefers-reduced-motion` disables animation. Safe-area
  insets respected.
- Modal is a labelled `role="dialog"`, Esc + scrim close, scrim ~55% for legibility.
- The header menu (☰) is a `role="menu"` popover: the mode items are
  `menuitemradio` (the active mode `aria-checked`), the rest `menuitem`. It closes on
  outside pointer, Esc, or a pick — mode switch (Daily / Practice), How to play,
  Statistics, About all live here so the header stays uncluttered.

## Motion

Entrances only, 150–320ms, ease-out; guess rows and cards `rise`, the sheet slides up
from the bottom, the header menu popover fades + drops in (`menu-in`, ~140ms). The
globe also spins ~600ms to re-centre on each new guess. Nothing decorative-only. All
disabled under reduced-motion (the globe snaps instead of spinning).

## Deferred (logged, not built)

Colorblind-safe ramp, installable PWA. (The interactive map with pins — once deferred —
is now the globe board; see `DECISIONS.md`.)
