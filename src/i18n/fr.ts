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
  },

  input: {
    placeholder: 'Nommez une ville…',
    ariaLabel: 'Deviner une ville',
    submit: 'Valider',
    submitAria: 'Valider la proposition',
  },

  guessRow: {
    insideBand: 'Dans la zone !',
    overshot: 'Dépassé !',
  },

  errors: {
    duplicate: 'Vous avez déjà proposé cette ville.',
    startCity: 'C’est la ville de départ — choisissez-en une autre.',
    finished: 'La partie du jour est terminée.',
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
      'Les points sur le globe sont les villes les plus proches de la distance cible — celles qui l’auraient emporté en un seul saut direct.',
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
      `Terminez votre total à moins de ${band} sous la cible pour gagner. Dépassez-la et c’est perdu — tout comme épuiser vos ${guesses} essais. Moins de sauts, meilleur score.`,
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
