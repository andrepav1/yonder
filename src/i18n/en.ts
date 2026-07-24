// English catalog — the reference locale. Pure `lib/*` helpers default to this,
// so it must stay a complete `Messages`.

import type { Messages } from './types'

export const en: Messages = {
  numberLocale: 'en-US',

  appName: 'Yondle',
  tagline: 'daily geography game',

  header: {
    distanceUnit: 'Distance unit',
    howToPlay: 'How to play',
    statistics: 'Statistics',
    language: 'Language',
  },

  modes: {
    daily: 'Daily',
    practice: 'Practice',
    practiceLabel: 'Practice mode',
    practiceEyebrow: 'Your departure',
    newPuzzle: 'New puzzle',
    practiceNote: 'Practice puzzles don’t affect your daily streak.',
  },

  menu: {
    label: 'Menu',
    about: 'About',
  },

  support: {
    cta: 'Buy me a coffee',
    note: 'Enjoying the daily wander? Help keep Yondle free.',
  },

  ads: {
    label: 'Advertisement',
  },

  about: {
    tagline: 'A daily geography guessing game.',
    intro:
      'Every UTC day, everyone gets the same puzzle: one start city and one target distance. Build a journey by naming cities — each hop adds the distance from your last city to a running total.',
    rules:
      'Reach the target without overshooting, in as few hops as possible. You get 6 guesses. Switch to Practice for unlimited random puzzles that don’t affect your streak.',
    credits:
      'City data © GeoNames (CC BY 4.0). Built as a static, offline-friendly web app.',
  },

  prompt: {
    eyebrow: 'Today’s departure',
    targetLabel: 'Reach a total of',
    hint: (band, guesses) =>
      `hop city to city · land within ${band} below the target · don’t overshoot · ${guesses} guesses`,
    guessesLeft: (n) => `${n} guesses left`,
  },

  globe: {
    label: (startCity) =>
      `Globe centred on ${startCity}, showing your journey of guesses. Drag to spin.`,
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    reveal: {
      hint: 'Tap a pin to see a city you could have reached.',
      ideal: 'Closest to target',
      completion: 'Would have finished your run',
    },
    hints: {
      label: 'Hints',
      cities: 'Show cities',
      names: 'Reveal names',
    },
  },

  input: {
    placeholder: 'Name a city…',
    ariaLabel: 'Guess a city',
    submit: 'Guess',
    submitAria: 'Submit guess',
  },

  guessRow: {
    insideBand: 'Inside the band!',
    overshot: (over) => `Overshot by ${over}!`,
  },

  errors: {
    duplicate: 'You already guessed that city.',
    startCity: 'That’s the start city — pick somewhere else.',
    finished: 'Today’s round is over.',
    overshoot: 'That hop overshoots the target — try a closer city.',
  },

  format: {
    toGo: (distance) => `${distance} to go`,
    over: (distance) => `${distance} over`,
    onTheLine: 'on the line',
  },

  result: {
    solved: (used, total) => `Solved in ${used}/${total}`,
    overshotBadge: 'Overshot the target',
    outOfGuesses: 'Out of guesses',
    headlineWin: 'You made it',
    headlineOver: 'Too far!',
    headlineClose: 'So close',
    ofTarget: (target) => `of ${target} target`,
    landedInBand: 'landed in the band',
    answerNote:
      'The pins on the globe are the closest cities to the target distance — the ones that would have won it in a single straight hop. Tap any pin to explore where you could have gone.',
    share: 'Share result',
    copied: 'Copied!',
  },

  howTo: {
    title: 'How to play',
    intro:
      'Every day, one start city and one target distance. Build a journey city by city and add up the hops — reach the target without going over.',
    step1:
      'Guess a city. Your score is the distance from the start to it (as the crow flies). Guess again and the hop from your last city to the new one is added on.',
    step2:
      'Keep hopping to climb toward the target. The hot / cold cue warms up as your running total nears it — watch the “to go” number shrink.',
    step3: (band, guesses) =>
      `Land your total within ${band} below the target to win. A hop that would go over is blocked — just pick a closer city. You only lose by using up all ${guesses} guesses. Fewer hops is a better score.`,
    note: (min) =>
      `Only cities with more than ${min} people are in the game — smaller towns can’t be guessed.`,
    cta: 'Let’s wander',
  },

  stats: {
    title: 'Statistics',
    played: 'Played',
    winPct: 'Win %',
    streak: 'Streak',
    max: 'Max',
    distribution: 'Guess distribution',
    empty: 'No games yet — play today’s puzzle to start a streak.',
  },

  modal: {
    close: 'Close',
  },

  share: {
    ofTarget: (pct) => `📏 ${pct}% of target`,
    overshot: (pct) => `📏 ${pct}% (overshot)`,
  },

  footer: {
    cityData: 'City data',
    license: 'CC BY 4.0',
  },
}
