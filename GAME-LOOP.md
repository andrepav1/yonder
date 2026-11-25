# Yondle — game-loop research

Playtest feedback: **"the game isn't fun."** This note collects game-design frameworks
(and Claude Code skills that teach them), checks Yondle's Classic loop against them, and
proposes variants to prototype. It is research, not a decision — when a direction is
chosen, record it in `DECISIONS.md`.

## Frameworks worth using

1. **The 30-second core loop** — *action → feedback → reward → decision → action*. If one
   pass of that loop isn't enjoyable on its own, no amount of meta (streaks, stats) fixes
   it. Every link has to land, especially *feedback* and *decision*.
2. **"A game is a series of interesting decisions"** (Sid Meier). A decision is
   interesting only when it involves a real, situational trade-off — no option is
   obviously best, and the right one depends on the current state.
3. **MDA (Mechanics → Dynamics → Aesthetics)** (Hunicke, LeBlanc, Zubek). Designers write
   rules; players feel the dynamics those rules produce. Pick the target *aesthetic*
   (discovery, tension, mastery, …) first and derive the mechanics from it.
4. **Daily-puzzle lessons (Wordle, Worldle, Globle).** One shared puzzle a day, minimal
   rules, spoiler-free sharing, fair difficulty — and above all, **every guess yields
   usable information for the next**. Reviewers of Worldle/Globle single out the
   distance + bearing "triangulation" feedback as where both the fun and the learning
   happen.

## Yondle's Classic loop, audited

- **The journey mechanic is vestigial.** Scoring is golf (fewer hops is better) and every
  day is generated to have single-hop winners, so the optimal play is always *one city on
  the range ring*. Hops 2–6 are never strategy, only damage control. No interesting
  decision (fails Meier's test).
- **The range ring collapses the one decision left.** Without it, the player must
  estimate great-circle distances in their head — too hard. With it, the task is "name a
  city under a circle" — too easy. Neither exercises geographic reasoning.
- **Guesses aren't informative.** Wordle-likes are deduction: each guess narrows the
  space. Here the target distance is known up front, so a guess only reports arithmetic
  the player could already compute (leg, total, remaining).
- **Overshoot leaves a zombie round.** Legs only add, so once past the band the round is
  lost but continues to the guess limit (already flagged in `DECISIONS.md`,
  2026-08-25, as potential busywork).
- **Feedback is numeric, not visceral.** Little "juice" — the payoff of a hop is a row of
  numbers.

**Hidden Destination** already follows the proven Worldle/Globle triangulation loop,
which is likely why it feels better than Classic.

## Variants to prototype

Pick a target aesthetic, then build one variant as a free-play mode (`MODES.md` makes a
new `ModeLogic` cheap) and playtest it against Classic.

| Aesthetic | Variant | Why it creates decisions |
| --- | --- | --- |
| **Planning** | Constrain each hop — e.g. max leg ~2,500 km, or a required waypoint ("Tokyo → Lima, via Africa"). | Multi-hop becomes a route choice with trade-offs instead of a penalty (cf. Travle). |
| **Mastery** | Score on landing precision, with a bonus for less-famous cities. | Risk/reward: a famous city near the ring is safe; an obscure one dead on it scores more. |
| **Deduction** | Hide the target distance; give only hot/cold on the running total. | Each guess becomes information, like Hidden Destination applied to journeys. |

**Whatever loop wins, add juice:** animate a flight along each leg's arc, tick the
running total up, a landing burst on a win. Cheap, and it makes every action feel good.

**Validate with the 30-second test:** watch a new player do one round with no
explanation; note where they hesitate or get bored.

## Claude Code skills that teach this

Third-party community skills — read the SKILL.md before installing.

- **`omer-metin/skills-for-antigravity` → `game-design-core`** (Apache-2.0). A
  principles-first designer persona: "the core loop must be fun in 30 seconds",
  "every system must justify its existence", "if players need the tutorial, the design
  has failed"; covers MDA, 8 kinds of fun, flow, risk/reward, juice.
  `npx skills add omer-metin/skills-for-antigravity --skill game-design-core --agent claude-code`
- **`gd-design-game-loop`** — core-loop documentation: player experience over time,
  session structure, pacing issues (body not verified).
- **`davila7/claude-code-templates` → `game-design`** — widely mirrored; includes a
  30-second core-loop section.

## Sources

- [game-design-core skill](https://claudeskills.info/skills/omer-metin/skills-for-antigravity/game-design-core/)
- [gd-design-game-loop skill](https://claudskills.com/skills/gd-design-game-loop/)
- [davila7 game-design skill](https://vibehackers.io/claude-code/skills/game-design-davila7)
- [Analysis: Sid Meier's key design lessons](https://www.gamedeveloper.com/game-platforms/analysis-sid-meier-s-key-design-lessons)
- [Affordances, game dynamics, gameplay, core loops (MDA)](https://medium.com/narrative-and-new-media/affordances-game-dynamics-gameplay-core-loops-282af6969a40)
- [Roblox: core loops](https://create.roblox.com/docs/production/game-design/core-loops)
- [GameAnalytics: how to perfect your game's core loop](https://www.gameanalytics.com/blog/how-to-perfect-your-games-core-loop)
- [Why Wordle works (Dan Meyer)](https://danmeyer.substack.com/p/why-wordle-works-according-to-desmos)
- [Josh Wardle reflects on Wordle](https://www.gamedeveloper.com/marketing/josh-wardle-reflects-on-the-the-unconventional-road-to-wordle-s-success)
- [Worldle: the compass mechanic](https://screenwiseapp.com/media/worldle-website)
- [Thinky Games: Worldle review](https://thinkygames.com/reviews/worldle-a-treasure-trove-for-geography-nerds/)
- [Kotaku: Globle](https://kotaku.com/globle-wordle-games-like-tree-puzzle-geography-game-bro-1848492190)
- [TechCrunch: MapTap](https://techcrunch.com/2026/06/18/maptap-a-daily-geography-game-is-my-new-wordle)
