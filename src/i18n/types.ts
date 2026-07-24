// i18n — supported locales and the shape of a message catalog.
//
// Catalogs are plain, React-free, serializable objects: UI strings plus a few
// small interpolation helpers. The pure `lib/*` helpers that render words
// (format, share) accept a `Messages` value and hard-code no English, mirroring
// how the game core takes `GameRules`. `numberLocale` is the BCP-47 tag used for
// `toLocaleString` number/date grouping.

export type Locale = 'en' | 'fr' | 'it' | 'es' | 'zh' | 'pt' | 'de' | 'ja' | 'ko'

/** Locale metadata for the language switcher (display name in its own tongue). */
export interface LocaleInfo {
  code: Locale
  /** Endonym — the language's name in itself (e.g. "Français"). */
  label: string
  /** Short code shown in the compact switcher (e.g. "FR"). */
  short: string
}

export interface Messages {
  /** BCP-47 tag for number/date formatting (e.g. 'en-US', 'fr-FR', 'it-IT'). */
  numberLocale: string

  /** Product name — kept identical across locales (it's a brand). */
  appName: string
  /** <title> / meta tagline. */
  tagline: string

  header: {
    distanceUnit: string
    howToPlay: string
    statistics: string
    language: string
  }

  modes: {
    /** Menu label / name for the shared daily puzzle. */
    daily: string
    /** Menu label / name for free-play/practice. */
    practice: string
    /** Header subtitle shown while in practice mode. */
    practiceLabel: string
    /** Prompt eyebrow shown while in practice mode (the daily one is date-specific). */
    practiceEyebrow: string
    /** Button that generates a fresh practice puzzle. */
    newPuzzle: string
    /** Reassurance that practice rounds are off the record. */
    practiceNote: string
    /** Menu item + modal heading for the mode picker. */
    title: string
    /** Per-mode card copy in the Modes modal, keyed by mode id. */
    catalog: {
      classic: { name: string; blurb: string }
    }
  }

  menu: {
    /** aria-label for the header menu trigger. */
    label: string
    /** "About" — menu item + About dialog title. */
    about: string
  }

  /** Support / donation link (shown when a support URL is configured). */
  support: {
    /** Link label, e.g. "Buy me a coffee". */
    cta: string
    /** One-line nudge shown alongside it, e.g. on the result card. */
    note: string
  }

  /** Advertising slot chrome. */
  ads: {
    /** Small transparency label rendered above an ad unit. */
    label: string
  }

  about: {
    /** One-line description under the title. */
    tagline: string
    /** What the game is. */
    intro: string
    /** How a round works, briefly. */
    rules: string
    /** Data + build credits line. */
    credits: string
  }

  prompt: {
    eyebrow: string
    targetLabel: string
    /** e.g. "hop city to city · land within 40 km below the target · …" */
    hint: (band: string, guesses: number) => string
    guessesLeft: (n: number) => string
  }

  globe: {
    /** aria-label for the interactive globe. */
    label: (startCity: string) => string
    /** aria-label for the zoom-in control. */
    zoomIn: string
    /** aria-label for the zoom-out control. */
    zoomOut: string
    /** End-of-round "explore the map" reveal copy. */
    reveal: {
      /** Caption prompting the player to tap the revealed cities. */
      hint: string
      /** Tag on a city closest to the target — a single-hop win from the start. */
      ideal: string
      /** Tag on a city that would have finished the run from where they stopped. */
      completion: string
    }
    /** In-round hint controls that progressively reveal the explorable cities. */
    hints: {
      /** Group label for the hint controls. */
      label: string
      /** Hint 1 — reveal the (unnamed) city dots on the globe. */
      cities: string
      /** Hint 2 — also let the player tap a dot to read its city name. */
      names: string
    }
  }

  input: {
    placeholder: string
    ariaLabel: string
    submit: string
    submitAria: string
  }

  guessRow: {
    insideBand: string
    /** Overshoot label with how far past the target the total landed, e.g. "Overshot by 320 km". */
    overshot: (over: string) => string
  }

  /** Rejected-guess toasts, keyed to engine `GuessError`. */
  errors: {
    duplicate: string
    startCity: string
    finished: string
    overshoot: string
  }

  /** Word templates for `remainingPhrase` (number is pre-formatted). */
  format: {
    toGo: (distance: string) => string
    over: (distance: string) => string
    onTheLine: string
  }

  result: {
    solved: (used: number, total: number) => string
    overshotBadge: string
    outOfGuesses: string
    headlineWin: string
    headlineOver: string
    headlineClose: string
    ofTarget: (target: string) => string
    landedInBand: string
    answerNote: string
    share: string
    copied: string
  }

  howTo: {
    title: string
    intro: string
    step1: string
    step2: string
    step3: (band: string, guesses: number) => string
    /** Note that only cities above the dataset population floor are guessable. */
    note: (minPopulation: string) => string
    cta: string
  }

  stats: {
    title: string
    played: string
    winPct: string
    streak: string
    max: string
    distribution: string
    empty: string
  }

  modal: {
    close: string
  }

  share: {
    ofTarget: (pct: number) => string
    overshot: (pct: number) => string
  }

  footer: {
    /** e.g. "City data © GeoNames · CC BY 4.0" — GeoNames is a link. */
    cityData: string
    license: string
  }
}
