// German catalog.

import type { Messages } from './types'

export const de: Messages = {
  numberLocale: 'de-DE',

  appName: 'Yondle',
  tagline: 'tägliches Geografie-Rätsel',

  header: {
    distanceUnit: 'Entfernungseinheit',
    howToPlay: 'Spielanleitung',
    statistics: 'Statistik',
    language: 'Sprache',
  },

  modes: {
    daily: 'Täglich',
    practice: 'Übung',
    practiceLabel: 'Übungsmodus',
    practiceEyebrow: 'Dein Startpunkt',
    newPuzzle: 'Neues Rätsel',
    practiceNote: 'Übungsrunden zählen nicht für deine tägliche Serie.',
  },

  menu: {
    label: 'Menü',
    about: 'Über',
  },

  about: {
    tagline: 'Ein tägliches Geografie-Ratespiel.',
    intro:
      'Jeden Tag (UTC) bekommen alle dasselbe Rätsel: eine Startstadt und eine Zieldistanz. Baue eine Reise, indem du Städte nennst — jeder Sprung addiert die Distanz von deiner letzten Stadt zu einer laufenden Summe.',
    rules:
      'Erreiche das Ziel, ohne es zu überschreiten, in möglichst wenigen Sprüngen. Du hast 6 Versuche. Wechsle in den Übungsmodus für unbegrenzte Zufallsrätsel, die deine Serie nicht beeinflussen.',
    credits:
      'Städtedaten © GeoNames (CC BY 4.0). Als statische, offline-taugliche Web-App gebaut.',
  },

  prompt: {
    eyebrow: 'Heutiger Start',
    targetLabel: 'Erreiche eine Summe von',
    hint: (band, guesses) =>
      `von Stadt zu Stadt springen · bis ${band} unter dem Ziel landen · nicht überschreiten · ${guesses} Versuche`,
    guessesLeft: (n) => `${n} Versuche übrig`,
  },

  globe: {
    label: (startCity) =>
      `Globus zentriert auf ${startCity}, zeigt deine Städtereise. Zum Drehen ziehen.`,
    zoomIn: 'Vergrößern',
    zoomOut: 'Verkleinern',
    reveal: {
      hint: 'Tippe auf einen Punkt, um eine erreichbare Stadt zu sehen.',
      ideal: 'Am nächsten zum Ziel',
      completion: 'Hätte deine Reise beendet',
    },
    hints: {
      label: 'Hinweise',
      cities: 'Städte zeigen',
      names: 'Namen zeigen',
    },
  },

  input: {
    placeholder: 'Nenne eine Stadt…',
    ariaLabel: 'Eine Stadt raten',
    submit: 'Raten',
    submitAria: 'Tipp absenden',
  },

  guessRow: {
    insideBand: 'In der Zone!',
    overshot: 'Überschritten!',
  },

  errors: {
    duplicate: 'Diese Stadt hast du schon geraten.',
    startCity: 'Das ist die Startstadt — wähle eine andere.',
    finished: 'Die heutige Runde ist vorbei.',
  },

  format: {
    toGo: (distance) => `noch ${distance}`,
    over: (distance) => `${distance} zu viel`,
    onTheLine: 'genau auf der Linie',
  },

  result: {
    solved: (used, total) => `Gelöst in ${used}/${total}`,
    overshotBadge: 'Ziel überschritten',
    outOfGuesses: 'Keine Versuche mehr',
    headlineWin: 'Geschafft',
    headlineOver: 'Zu weit!',
    headlineClose: 'Knapp daneben',
    ofTarget: (target) => `von ${target} Ziel`,
    landedInBand: 'in der Zone gelandet',
    answerNote:
      'Die Markierungen auf dem Globus sind die Städte, die der Zieldistanz am nächsten liegen — die, die es in einem einzigen direkten Sprung gewonnen hätten. Tippe auf eine Markierung, um zu erkunden, wohin du hättest gehen können.',
    share: 'Ergebnis teilen',
    copied: 'Kopiert!',
  },

  howTo: {
    title: 'Spielanleitung',
    intro:
      'Jeden Tag eine Startstadt und eine Zieldistanz. Baue Stadt für Stadt eine Reise und addiere die Sprünge — erreiche das Ziel, ohne es zu überschreiten.',
    step1:
      'Rate eine Stadt. Deine Punktzahl ist die Luftlinie vom Start zu ihr. Rate erneut, und der Sprung von deiner letzten Stadt zur neuen wird hinzuaddiert.',
    step2:
      'Springe weiter, um dem Ziel näherzukommen. Der Heiß-/Kalt-Hinweis wird wärmer, je näher deine Summe kommt — sieh zu, wie die „noch“-Zahl schrumpft.',
    step3: (band, guesses) =>
      `Lande deine Summe bis ${band} unter dem Ziel, um zu gewinnen. Überschreite es und du verlierst — ebenso, wenn deine ${guesses} Versuche aufgebraucht sind. Weniger Sprünge sind besser.`,
    note: (min) =>
      `Nur Städte mit mehr als ${min} Einwohnern sind im Spiel — kleinere Orte kannst du nicht raten.`,
    cta: 'Auf geht’s',
  },

  stats: {
    title: 'Statistik',
    played: 'Gespielt',
    winPct: 'Sieg-%',
    streak: 'Serie',
    max: 'Rekord',
    distribution: 'Versuchsverteilung',
    empty: 'Noch keine Spiele — spiele das heutige Rätsel, um eine Serie zu starten.',
  },

  modal: {
    close: 'Schließen',
  },

  share: {
    ofTarget: (pct) => `📏 ${pct}% des Ziels`,
    overshot: (pct) => `📏 ${pct}% (überschritten)`,
  },

  footer: {
    cityData: 'Städtedaten',
    license: 'CC BY 4.0',
  },
}
