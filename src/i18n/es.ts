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

  modes: {
    daily: 'Diario',
    practice: 'Práctica',
    practiceLabel: 'Modo práctica',
    practiceEyebrow: 'Tu salida',
    newPuzzle: 'Nuevo desafío',
    practiceNote: 'Las partidas de práctica no afectan tu racha diaria.',
    title: 'Modos',
    catalog: {
      classic: {
        name: 'Clásico',
        blurb:
          'Salta de ciudad en ciudad para alcanzar la distancia objetivo sin pasarte.',
      },
      hidden: {
        name: 'Destino oculto',
        blurb:
          'Encuentra la capital misteriosa con pistas de distancia y dirección.',
      },
    },
  },

  hidden: {
    eyebrow: 'Encuentra la capital oculta',
    anchorLabel: 'Pista desde',
    clue: (distance) => `a unos ${distance}`,
    hint: (guesses) => `adivina capitales para acercarte · ${guesses} intentos`,
    away: (distance) => `a ${distance}`,
    found: '¡La encontraste!',
    resultWin: (used, total) => `Encontrada en ${used}/${total}`,
    resultLose: 'Sin intentos',
    headlineWin: 'La encontraste',
    headlineLose: 'Por poco',
    answer: (city) => `Era ${city}`,
  },

  menu: {
    label: 'Menú',
    about: 'Acerca de',
  },

  support: {
    cta: 'Invítame a un café',
    note: '¿Disfrutas del paseo diario? Ayuda a mantener Yondle gratis.',
  },

  ads: {
    label: 'Publicidad',
  },

  about: {
    tagline: 'Un juego diario de geografía.',
    intro:
      'Cada día (UTC), todos reciben el mismo reto: una ciudad de salida y una distancia objetivo. Crea un recorrido nombrando ciudades — cada salto suma la distancia desde tu última ciudad a un total acumulado.',
    rules:
      'Alcanza el objetivo sin pasarte, en los menos saltos posibles. Tienes 6 intentos. Cambia al modo Práctica para retos aleatorios ilimitados que no afectan tu racha.',
    credits:
      'Datos de ciudades © GeoNames (CC BY 4.0). Aplicación web estática y disponible sin conexión.',
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
    zoomIn: 'Acercar',
    zoomOut: 'Alejar',
    reveal: {
      hint: 'Toca un punto para ver una ciudad que podrías haber alcanzado.',
      ideal: 'Más cerca del objetivo',
      completion: 'Habría completado tu recorrido',
    },
    hints: {
      label: 'Pistas',
      cities: 'Mostrar ciudades',
      names: 'Revelar nombres',
    },
  },

  input: {
    placeholder: 'Nombra una ciudad…',
    ariaLabel: 'Adivina una ciudad',
    submit: 'Enviar',
    submitAria: 'Enviar propuesta',
  },

  guessRow: {
    insideBand: '¡En la zona!',
    overshot: (over) => `¡Te pasaste por ${over}!`,
  },

  errors: {
    duplicate: 'Ya has propuesto esa ciudad.',
    startCity: 'Esa es la ciudad de salida — elige otra.',
    finished: 'La partida de hoy ha terminado.',
    overshoot: 'Ese salto se pasa del objetivo — prueba una ciudad más cercana.',
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
      'Los puntos del globo son las ciudades más cercanas a la distancia objetivo — las que habrían ganado con un solo salto directo. Toca un punto para explorar adónde podrías haber ido.',
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
      `Termina tu total a menos de ${band} bajo el objetivo para ganar. Un salto que se pasaría queda bloqueado — solo elige una ciudad más cercana. Solo pierdes si agotas los ${guesses} intentos. Menos saltos, mejor puntuación.`,
    note: (min) =>
      `Solo las ciudades con más de ${min} habitantes están en el juego — las más pequeñas no se pueden adivinar.`,
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
