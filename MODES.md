# Yondle — modes framework

How Yondle goes from *one* game to *many*, without rewriting the engine each time.

This is a **design doc**, written up-front so the declarative shape is agreed before
the core is touched. Once built, it becomes the living reference for adding a mode
(and, per `CLAUDE.md`, updates land in the same commit as the code). Rationale for the
big calls lives in `DECISIONS.md`.

## The idea in one line

A **mode** is a declarative descriptor that fills in four separable slots — **setup**,
**play**, **goal**, **present** — over the same generic round state machine. Adding a
mode = adding a descriptor to the registry. No edits to the engine or the UI shell.

Today `engine.ts` / `scoring.ts` don't run *a* game, they run *one specific game*
(cumulative haversine vs a one-sided distance band). The framework lifts that
game-specific logic out of the core and into a `Classic` descriptor, leaving the
engine a thin delegator. Every existing test stays green — Classic is just the first
mode.

## Two axes, not one

"Daily vs practice" is **delivery** — orthogonal to *which* mode you play:

- **delivery** — `daily` (deterministic from the UTC date, shared by everyone,
  streak-tracked, saved) or `free` (a fresh random seed per round, nothing persisted).
- **mode** — the *variant* (Classic, Hidden Destination, …), i.e. the rules of play.

Each mode declares which deliveries it supports. **Classic is the only `daily` mode**
and stays the home screen. Every mode is *also* playable as `free`. There is no
separate "Practice" concept anymore — free-play Classic is just the Classic card in
the Modes list.

## Navigation & UI

- The app **opens on the daily Classic** — the only saved, streak-tracked puzzle.
- The header overflow **⋯ menu** gains two nav items (replacing the old Daily/Practice
  switch): **Daily** (return to the saved daily, in-progress round waiting) and
  **Modes** (opens the Modes modal). How-to / Statistics / About / in-round hints stay.
- The **Modes modal** floats over the app and lists every mode as a **card**: icon +
  name + one-line blurb. Selecting one loads it into the main screen as a `free` round.
- **Free-play rounds are ephemeral** — nothing is persisted, and a reload always drops
  back to the daily. Each free round offers a **New puzzle** button *and* a **Share**
  button. Only the daily writes to stats / streak.

## The descriptor

A mode is data where it can be, and small **pure** strategy functions where behaviour
genuinely differs. Sketch (final types land with the refactor):

```ts
interface ModeDefinition {
  // — identity: the "listable options" surface —
  id: string
  label: MessageKey          // i18n key, not a raw string
  blurb: MessageKey
  icon: IconName
  deliveries: Delivery[]      // ('daily' | 'free')[]
  rules: GameRules            // numeric tunables for this mode

  // 1. SETUP — build the puzzle from a seed (deterministic in the seed)
  setup: {
    cityPool?(all: City[]): City[]          // region / capitals-only filter
    generate(seed: string, pool: City[], rules: GameRules): PuzzleSpec
  }
  // 2. PLAY — what a guess costs and whether it's allowed
  play: {
    classifyLeg?(from: LatLng, to: LatLng): LegKind   // land/sea/air (transport)
    evaluate(round, puzzle, city, rules): GuessResult  // the per-guess reading
    accept?(round, puzzle, city): RejectReason | undefined
  }
  // 3. GOAL — win / lose / progress from the running state
  goal: {
    status(round, puzzle, rules): RoundStatus
    progress(round, puzzle, rules): Progress   // drives hot/cold + captions
  }
  // 4. PRESENT — score + share
  present: {
    score(round, puzzle, rules): ScoreBreakdown
    share(round, puzzle, rules, opts?): string
  }
}
```

`PuzzleSpec` / `GuessResult` grow a small, optional, serializable surface so non-Classic
modes can carry their own shape (a hidden `target` city, a per-leg `kind`, a
`distanceToGoalKm`) without Classic caring. The core stays JSON-round-trippable.

### What has to generalize in the core

- `engine.applyGuess` → generic: reject if finished / `accept()` says no, else
  `evaluate()` the guess, append it, then ask `goal.status()` for the transition. The
  Classic-specific overshoot/band logic moves **into** the Classic descriptor.
- `scoring.ts` → Classic's `evaluateLeg` / `scoreRound` / `tempLevel` become Classic's
  strategy functions; the shared `tempLevel` ramp stays reusable by modes that want it.
- Each `daily`-eligible mode owns a determinism + solvability test, mirroring
  `puzzle.test.ts`, so "determinism is sacred" holds per mode.

## Mode catalog

### Classic — `daily` + `free`  *(shipped, to be ported onto the framework)*

Build a journey city by city; each hop adds the great-circle distance from your
previous city to a running total. Land the total in `[target·(1−tol), target]` without
overshooting, in as few hops as possible. A hop that would overshoot is **blocked**
(no turn spent) unless `overshoot.endsRound` — see `DECISIONS.md` 2026-07-24. 6 guesses.

### Hidden Destination — `free`  *(first new mode)*

A **deduction** game — find a secret city.

- **Setup.** A hidden **capital** is chosen from the capitals-only pool
  (`cityPool` = capitals; the answer set is ~200, small enough to reason over). A start
  city anchors the puzzle: the prompt gives the **distance + bearing from the start to
  the hidden capital** as the opening clue. Deterministic in the seed.
- **Play.** Each guess is a **capital** (the guess input is restricted to the same pool
  — every guess is both a probe and a possible answer, no wasted turns). Its reading is
  the **distance from the guess to the hidden city + the bearing toward it**, shown as a
  globe pin coloured hot/cold by proximity with an arrow pointing at the target.
- **Goal.** Win by naming the **exact** hidden capital. **Generous try count**
  (default **8**, tunable) — running out is a loss.
- **Present.** No cumulative total / overshoot at all — each guess is an independent
  probe. Score = guesses used to find it. Share = a hot/cold trail (no names). On finish
  the globe reveals the hidden city.
- **Data.** Needs a **capital flag** added to the dataset build (`scripts/build-cities.mjs`
  — GeoNames feature code `PPLC`), since the current tuple stores population but not
  capital status. Keep it optional/back-compatible like the localized-names field.

### Backlog — sketched, not yet specced to build

Captured so the descriptor stays honest about what it must eventually span:

- **Around the World** (`daily`+`free`) — circumnavigate: cumulative ≥ Earth's
  circumference and end near the start, fewest hops. Pure haversine.
- **Point-to-point / routing** (`free`) — reach a destination where each hop is capped
  at a max range, so a far target must be island-hopped. Fewest hops.
- **Transport** (`free`) — legs typed road/boat/flight by whether they cross ocean
  (`classifyLeg` + the land/sea great-circle test over the bundled land polygons), with
  a budget or cost per type.
- **Local map** (`daily`-of-region + `free`) — Classic rules over a `cityPool` filtered
  to a region/country.
- **Select both cities** (`free`) — the player picks start *and* destination; distinct
  from generated Point-to-point.

## Build phases

1. **Framework + Classic port.** ✅ **Done.** Introduced the mode seam in `lib/mode.ts`
   (the pure `ModeLogic` interface — `play` + `score`), generalized `engine.ts` into a
   mode-agnostic delegator (`applyGuess(state, puzzle, city, logic, rules)` owns only
   the finished-guard + immutable append), and lifted the whole Classic game into
   `lib/classic.ts` as `classicLogic` (the distance/band primitives stay shared in
   `scoring.ts`). `makeMode` now pairs a `ModeLogic` with `rules`. Behaviour-identical,
   all 133 tests green, no UI change. (The richer setup/goal/present descriptor slots
   sketched above arrive with the modal + Hidden Destination, when a real second mode
   validates the shape.)
2. **Navigation + modal.** ⋯ menu → Daily / Modes; the Modes modal with cards; free-play
   plumbing (ephemeral round, New puzzle + Share); retire the old Practice path.
3. **Capital data.** Add the `PPLC` capital flag to the dataset build + a `capitals()`
   selector, guarded by a dataset-integrity test.
4. **Hidden Destination.** The descriptor + capitals-only guess input + distance/bearing
   feedback + reveal, with its own determinism test. Wire its card into the modal.

Each phase is independently green and commit-scoped.
