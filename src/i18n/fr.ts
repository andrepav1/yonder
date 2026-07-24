// French catalog.

import type { Messages } from './types'

export const fr: Messages = {
  numberLocale: 'fr-FR',

  appName: 'Yondle',
  tagline: 'jeu de géographie quotidien',

  header: {
    distanceUnit: 'Unité de distance',
    howToPlay: 'Comment jouer',
    statistics: 'Statistiques',
    language: 'Langue',
  },

  modes: {
    daily: 'Quotidien',
    practice: 'Entraînement',
    practiceLabel: 'Mode entraînement',
    practiceEyebrow: 'Votre départ',
    newPuzzle: 'Nouvelle partie',
    practiceNote: 'Les parties d’entraînement n’affectent pas votre série quotidienne.',
    title: 'Modes',
    catalog: {
      classic: {
        name: 'Classique',
        blurb:
          'Sautez de ville en ville pour atteindre la distance cible sans la dépasser.',
      },
      hidden: {
        name: 'Destination cachée',
        blurb:
          'Trouvez la capitale mystère à partir d’indices de distance et de direction.',
      },
    },
  },

  hidden: {
    eyebrow: 'Trouvez la capitale cachée',
    anchorLabel: 'Indice depuis',
    clue: (distance) => `à environ ${distance}`,
    hint: (guesses) => `devinez des capitales pour vous rapprocher · ${guesses} essais`,
    away: (distance) => `à ${distance}`,
    found: 'Trouvée !',
    resultWin: (used, total) => `Trouvée en ${used}/${total}`,
    resultLose: 'Plus d’essais',
    headlineWin: 'Vous l’avez trouvée',
    headlineLose: 'Si près',
    answer: (city) => `C’était ${city}`,
  },

  menu: {
    label: 'Menu',
    about: 'À propos',
  },

  support: {
    cta: 'Offrez-moi un café',
    note: 'Vous aimez cette balade quotidienne ? Aidez à garder Yondle gratuit.',
  },

  ads: {
    label: 'Publicité',
  },

  about: {
    tagline: 'Un jeu de géographie quotidien.',
    intro:
      'Chaque jour (UTC), tout le monde reçoit le même défi : une ville de départ et une distance cible. Construisez un trajet en nommant des villes — chaque étape ajoute la distance depuis votre dernière ville à un total cumulé.',
    rules:
      'Atteignez la cible sans la dépasser, en un minimum d’étapes. Vous avez 6 essais. Passez en mode Entraînement pour des défis aléatoires illimités qui n’affectent pas votre série.',
    credits:
      'Données des villes © GeoNames (CC BY 4.0). Application web statique, utilisable hors ligne.',
  },

  prompt: {
    eyebrow: 'Départ du jour',
    targetLabel: 'Atteignez un total de',
    hint: (band, guesses) =>
      `sautez de ville en ville · terminez à moins de ${band} sous la cible · ne dépassez pas · ${guesses} essais`,
    guessesLeft: (n) => `${n} essais restants`,
  },

  globe: {
    label: (startCity) =>
      `Globe centré sur ${startCity}, montrant votre parcours de villes. Faites glisser pour tourner.`,
    zoomIn: 'Zoom avant',
    zoomOut: 'Zoom arrière',
    reveal: {
      hint: 'Touchez un point pour voir une ville que vous auriez pu atteindre.',
      ideal: 'Au plus près de la cible',
      completion: 'Aurait terminé votre parcours',
    },
    hints: {
      label: 'Indices',
      cities: 'Afficher les villes',
      names: 'Révéler les noms',
    },
  },

  input: {
    placeholder: 'Nommez une ville…',
    ariaLabel: 'Deviner une ville',
    submit: 'Valider',
    submitAria: 'Valider la proposition',
  },

  guessRow: {
    insideBand: 'Dans la zone !',
    overshot: (over) => `Dépassé de ${over} !`,
  },

  errors: {
    duplicate: 'Vous avez déjà proposé cette ville.',
    startCity: 'C’est la ville de départ — choisissez-en une autre.',
    finished: 'La partie du jour est terminée.',
    overshoot: 'Ce saut dépasse la cible — essayez une ville plus proche.',
  },

  format: {
    toGo: (distance) => `${distance} restants`,
    over: (distance) => `${distance} de trop`,
    onTheLine: 'pile sur la ligne',
  },

  result: {
    solved: (used, total) => `Réussi en ${used}/${total}`,
    overshotBadge: 'Cible dépassée',
    outOfGuesses: 'Plus d’essais',
    headlineWin: 'Vous y êtes !',
    headlineOver: 'Trop loin !',
    headlineClose: 'Si près',
    ofTarget: (target) => `sur une cible de ${target}`,
    landedInBand: 'arrivé dans la zone',
    answerNote:
      'Les points sur le globe sont les villes les plus proches de la distance cible — celles qui l’auraient emporté en un seul saut direct. Touchez un point pour explorer où vous auriez pu aller.',
    share: 'Partager le résultat',
    copied: 'Copié !',
  },

  howTo: {
    title: 'Comment jouer',
    intro:
      'Chaque jour, une ville de départ et une distance cible. Construisez un parcours ville par ville et additionnez les sauts — atteignez la cible sans la dépasser.',
    step1:
      'Proposez une ville. Votre score est la distance depuis le départ jusqu’à elle (à vol d’oiseau). Proposez-en une autre et le saut depuis votre dernière ville vers la nouvelle s’ajoute.',
    step2:
      'Continuez à sauter pour grimper vers la cible. L’indice chaud / froid se réchauffe à mesure que votre total s’en approche — regardez le nombre « restants » diminuer.',
    step3: (band, guesses) =>
      `Terminez votre total à moins de ${band} sous la cible pour gagner. Un saut qui dépasserait la cible est bloqué — choisissez simplement une ville plus proche. Vous ne perdez qu’en épuisant vos ${guesses} essais. Moins de sauts, meilleur score.`,
    note: (min) =>
      `Seules les villes de plus de ${min} habitants sont dans le jeu — les plus petites ne sont pas devinables.`,
    cta: 'C’est parti',
  },

  stats: {
    title: 'Statistiques',
    played: 'Parties',
    winPct: '% de victoires',
    streak: 'Série',
    max: 'Record',
    distribution: 'Répartition des essais',
    empty:
      'Aucune partie pour l’instant — jouez au puzzle du jour pour lancer une série.',
  },

  modal: {
    close: 'Fermer',
  },

  share: {
    ofTarget: (pct) => `📏 ${pct}% de la cible`,
    overshot: (pct) => `📏 ${pct}% (dépassé)`,
  },

  footer: {
    cityData: 'Données des villes',
    license: 'CC BY 4.0',
  },
}
