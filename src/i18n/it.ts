// Italian catalog.

import type { Messages } from './types'

export const it: Messages = {
  numberLocale: 'it-IT',

  appName: 'Yondle',
  tagline: 'gioco di geografia quotidiano',

  header: {
    distanceUnit: 'Unità di distanza',
    howToPlay: 'Come si gioca',
    statistics: 'Statistiche',
    language: 'Lingua',
  },

  modes: {
    daily: 'Giornaliero',
    practice: 'Allenamento',
    practiceLabel: 'Modalità allenamento',
    practiceEyebrow: 'La tua partenza',
    newPuzzle: 'Nuova sfida',
    practiceNote: 'Le partite di allenamento non influenzano la tua serie giornaliera.',
  },

  menu: {
    label: 'Menu',
    about: 'Informazioni',
  },

  about: {
    tagline: 'Un gioco di geografia quotidiano.',
    intro:
      'Ogni giorno (UTC) tutti ricevono lo stesso puzzle: una città di partenza e una distanza obiettivo. Costruisci un percorso nominando città — ogni tappa aggiunge la distanza dall’ultima città a un totale progressivo.',
    rules:
      'Raggiungi l’obiettivo senza superarlo, nel minor numero di tappe. Hai 6 tentativi. Passa alla modalità Allenamento per puzzle casuali illimitati che non influiscono sulla tua serie.',
    credits:
      'Dati delle città © GeoNames (CC BY 4.0). App web statica, utilizzabile offline.',
  },

  prompt: {
    eyebrow: 'Partenza di oggi',
    targetLabel: 'Raggiungi un totale di',
    hint: (band, guesses) =>
      `salta di città in città · fermati entro ${band} sotto l’obiettivo · non superarlo · ${guesses} tentativi`,
    guessesLeft: (n) => `${n} tentativi rimasti`,
  },

  globe: {
    label: (startCity) =>
      `Globo centrato su ${startCity}, che mostra il tuo percorso di città. Trascina per ruotare.`,
    zoomIn: 'Ingrandisci',
    zoomOut: 'Riduci',
    reveal: {
      hint: 'Tocca un punto per vedere una città che avresti potuto raggiungere.',
      ideal: 'Più vicina al bersaglio',
      completion: 'Avrebbe concluso il tuo percorso',
    },
  },

  input: {
    placeholder: 'Nomina una città…',
    ariaLabel: 'Indovina una città',
    submit: 'Conferma',
    submitAria: 'Conferma il tentativo',
  },

  guessRow: {
    insideBand: 'Nella fascia!',
    overshot: 'Superato!',
  },

  errors: {
    duplicate: 'Hai già proposto questa città.',
    startCity: 'È la città di partenza — scegline un’altra.',
    finished: 'La partita di oggi è finita.',
  },

  format: {
    toGo: (distance) => `${distance} rimanenti`,
    over: (distance) => `${distance} di troppo`,
    onTheLine: 'esattamente sulla linea',
  },

  result: {
    solved: (used, total) => `Risolto in ${used}/${total}`,
    overshotBadge: 'Obiettivo superato',
    outOfGuesses: 'Tentativi esauriti',
    headlineWin: 'Ce l’hai fatta',
    headlineOver: 'Troppo lontano!',
    headlineClose: 'Per un soffio',
    ofTarget: (target) => `su un obiettivo di ${target}`,
    landedInBand: 'arrivato nella fascia',
    answerNote:
      'I punti sul globo sono le città più vicine alla distanza obiettivo — quelle che avrebbero vinto con un solo salto diretto. Tocca un punto per esplorare dove avresti potuto andare.',
    share: 'Condividi il risultato',
    copied: 'Copiato!',
  },

  howTo: {
    title: 'Come si gioca',
    intro:
      'Ogni giorno, una città di partenza e una distanza obiettivo. Costruisci un percorso città per città e somma i salti — raggiungi l’obiettivo senza superarlo.',
    step1:
      'Proponi una città. Il tuo punteggio è la distanza dalla partenza fino ad essa (in linea d’aria). Proponine un’altra e il salto dall’ultima città a quella nuova si aggiunge.',
    step2:
      'Continua a saltare per avvicinarti all’obiettivo. L’indizio caldo / freddo si scalda man mano che il totale si avvicina — guarda il numero « rimanenti » diminuire.',
    step3: (band, guesses) =>
      `Fermati con il totale entro ${band} sotto l’obiettivo per vincere. Superalo e hai perso — così come esaurire i ${guesses} tentativi. Meno salti, punteggio migliore.`,
    cta: 'Andiamo',
  },

  stats: {
    title: 'Statistiche',
    played: 'Partite',
    winPct: '% vittorie',
    streak: 'Serie',
    max: 'Record',
    distribution: 'Distribuzione dei tentativi',
    empty: 'Ancora nessuna partita — gioca il puzzle di oggi per iniziare una serie.',
  },

  modal: {
    close: 'Chiudi',
  },

  share: {
    ofTarget: (pct) => `📏 ${pct}% dell’obiettivo`,
    overshot: (pct) => `📏 ${pct}% (superato)`,
  },

  footer: {
    cityData: 'Dati delle città',
    license: 'CC BY 4.0',
  },
}
