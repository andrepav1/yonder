// Spanish catalog.

import type { Messages } from './types'

export const es: Messages = {
  numberLocale: 'es-ES',

  appName: 'Yondle',
  tagline: 'juego de geografía diario',

  header: {
    distanceUnit: 'Unidad de distancia',
    howToPlay: 'Cómo jugar',
    statistics: 'Estadísticas',
    language: 'Idioma',
  },

  prompt: {
    eyebrow: 'Salida de hoy',
    targetLabel: 'Alcanza un total de',
    hint: (band, guesses) =>
      `salta de ciudad en ciudad · termina a menos de ${band} bajo el objetivo · no te pases · ${guesses} intentos`,
    guessesLeft: (n) => `${n} intentos restantes`,
  },

  globe: {
    label: (startCity) =>
      `Globo centrado en ${startCity}, mostrando tu recorrido de ciudades. Arrastra para girar.`,
  },

  input: {
    placeholder: 'Nombra una ciudad…',
    ariaLabel: 'Adivina una ciudad',
    submit: 'Enviar',
    submitAria: 'Enviar propuesta',
  },

  guessRow: {
    insideBand: '¡En la zona!',
    overshot: '¡Te pasaste!',
  },

  errors: {
    duplicate: 'Ya has propuesto esa ciudad.',
    startCity: 'Esa es la ciudad de salida — elige otra.',
    finished: 'La partida de hoy ha terminado.',
  },

  format: {
    toGo: (distance) => `faltan ${distance}`,
    over: (distance) => `${distance} de más`,
    onTheLine: 'justo en la línea',
  },

  result: {
    solved: (used, total) => `Resuelto en ${used}/${total}`,
    overshotBadge: 'Objetivo superado',
    outOfGuesses: 'Sin intentos',
    headlineWin: '¡Lo lograste!',
    headlineOver: '¡Demasiado lejos!',
    headlineClose: 'Por poco',
    ofTarget: (target) => `de un objetivo de ${target}`,
    landedInBand: 'llegaste a la zona',
    answerNote:
      'Los puntos del globo son las ciudades más cercanas a la distancia objetivo — las que habrían ganado con un solo salto directo.',
    share: 'Compartir resultado',
    copied: '¡Copiado!',
  },

  howTo: {
    title: 'Cómo jugar',
    intro:
      'Cada día, una ciudad de salida y una distancia objetivo. Construye un recorrido ciudad a ciudad y suma los saltos — alcanza el objetivo sin pasarte.',
    step1:
      'Propón una ciudad. Tu puntuación es la distancia desde la salida hasta ella (en línea recta). Propón otra y el salto desde tu última ciudad a la nueva se suma.',
    step2:
      'Sigue saltando para acercarte al objetivo. La pista de calor / frío se calienta a medida que tu total se aproxima — mira cómo baja el número «restante».',
    step3: (band, guesses) =>
      `Termina tu total a menos de ${band} bajo el objetivo para ganar. Si te pasas, pierdes — igual que si agotas los ${guesses} intentos. Menos saltos, mejor puntuación.`,
    cta: 'A explorar',
  },

  stats: {
    title: 'Estadísticas',
    played: 'Jugadas',
    winPct: '% victorias',
    streak: 'Racha',
    max: 'Récord',
    distribution: 'Distribución de intentos',
    empty: 'Aún no hay partidas — juega el reto de hoy para empezar una racha.',
  },

  modal: {
    close: 'Cerrar',
  },

  share: {
    ofTarget: (pct) => `📏 ${pct}% del objetivo`,
    overshot: (pct) => `📏 ${pct}% (superado)`,
  },

  footer: {
    cityData: 'Datos de las ciudades',
    license: 'CC BY 4.0',
  },
}
