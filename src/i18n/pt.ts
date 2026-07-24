// Portuguese (Brazilian) catalog.

import type { Messages } from './types'

export const pt: Messages = {
  numberLocale: 'pt-BR',

  appName: 'Yondle',
  tagline: 'jogo de geografia diário',

  header: {
    distanceUnit: 'Unidade de distância',
    howToPlay: 'Como jogar',
    statistics: 'Estatísticas',
    language: 'Idioma',
  },

  modes: {
    daily: 'Diário',
    practice: 'Treino',
    practiceLabel: 'Modo treino',
    practiceEyebrow: 'A sua partida',
    newPuzzle: 'Novo desafio',
    practiceNote: 'As partidas de treino não afetam a sua sequência diária.',
  },

  menu: {
    label: 'Menu',
    about: 'Sobre',
  },

  support: {
    cta: 'Pague-me um café',
    note: 'Curtindo o passeio diário? Ajude a manter o Yondle gratuito.',
  },

  ads: {
    label: 'Publicidade',
  },

  about: {
    tagline: 'Um jogo diário de geografia.',
    intro:
      'Todos os dias (UTC), todos recebem o mesmo desafio: uma cidade de partida e uma distância-alvo. Crie um trajeto nomeando cidades — cada salto soma a distância da sua última cidade a um total acumulado.',
    rules:
      'Alcance o alvo sem ultrapassá-lo, no menor número de saltos. Você tem 6 tentativas. Mude para o modo Treino para desafios aleatórios ilimitados que não afetam a sua sequência.',
    credits:
      'Dados de cidades © GeoNames (CC BY 4.0). Aplicação web estática e disponível offline.',
  },

  prompt: {
    eyebrow: 'Partida de hoje',
    targetLabel: 'Alcance um total de',
    hint: (band, guesses) =>
      `pule de cidade em cidade · pare a menos de ${band} abaixo do alvo · não passe · ${guesses} tentativas`,
    guessesLeft: (n) => `${n} tentativas restantes`,
  },

  globe: {
    label: (startCity) =>
      `Globo centrado em ${startCity}, mostrando seu trajeto de cidades. Arraste para girar.`,
    zoomIn: 'Aproximar',
    zoomOut: 'Afastar',
    reveal: {
      hint: 'Toque num ponto para ver uma cidade que você poderia ter alcançado.',
      ideal: 'Mais perto do alvo',
      completion: 'Teria concluído seu trajeto',
    },
    hints: {
      label: 'Dicas',
      cities: 'Mostrar cidades',
      names: 'Revelar nomes',
    },
  },

  input: {
    placeholder: 'Diga uma cidade…',
    ariaLabel: 'Adivinhe uma cidade',
    submit: 'Enviar',
    submitAria: 'Enviar palpite',
  },

  guessRow: {
    insideBand: 'Na faixa!',
    overshot: (over) => `Passou por ${over}!`,
  },

  errors: {
    duplicate: 'Você já palpitou nessa cidade.',
    startCity: 'Essa é a cidade de partida — escolha outra.',
    finished: 'A partida de hoje acabou.',
    overshoot: 'Esse salto ultrapassa o alvo — tente uma cidade mais próxima.',
  },

  format: {
    toGo: (distance) => `faltam ${distance}`,
    over: (distance) => `${distance} a mais`,
    onTheLine: 'exatamente na linha',
  },

  result: {
    solved: (used, total) => `Resolvido em ${used}/${total}`,
    overshotBadge: 'Alvo ultrapassado',
    outOfGuesses: 'Sem tentativas',
    headlineWin: 'Você conseguiu',
    headlineOver: 'Longe demais!',
    headlineClose: 'Por pouco',
    ofTarget: (target) => `de um alvo de ${target}`,
    landedInBand: 'chegou na faixa',
    answerNote:
      'Os pontos no globo são as cidades mais próximas da distância alvo — as que teriam vencido em um único salto direto. Toque num ponto para explorar aonde você poderia ter ido.',
    share: 'Compartilhar resultado',
    copied: 'Copiado!',
  },

  howTo: {
    title: 'Como jogar',
    intro:
      'Todo dia, uma cidade de partida e uma distância alvo. Monte um trajeto cidade por cidade e some os saltos — alcance o alvo sem passar.',
    step1:
      'Palpite uma cidade. Sua pontuação é a distância da partida até ela (em linha reta). Palpite outra e o salto da sua última cidade para a nova é somado.',
    step2:
      'Continue saltando para se aproximar do alvo. A dica quente / frio esquenta conforme seu total se aproxima — veja o número «faltam» diminuir.',
    step3: (band, guesses) =>
      `Pare seu total a menos de ${band} abaixo do alvo para vencer. Um salto que ultrapassaria o alvo é bloqueado — basta escolher uma cidade mais próxima. Você só perde ao esgotar as ${guesses} tentativas. Menos saltos, melhor pontuação.`,
    note: (min) =>
      `Só as cidades com mais de ${min} habitantes estão no jogo — as menores não podem ser adivinhadas.`,
    cta: 'Vamos explorar',
  },

  stats: {
    title: 'Estatísticas',
    played: 'Jogadas',
    winPct: '% vitórias',
    streak: 'Sequência',
    max: 'Recorde',
    distribution: 'Distribuição de tentativas',
    empty: 'Nenhum jogo ainda — jogue o desafio de hoje para começar uma sequência.',
  },

  modal: {
    close: 'Fechar',
  },

  share: {
    ofTarget: (pct) => `📏 ${pct}% do alvo`,
    overshot: (pct) => `📏 ${pct}% (ultrapassou)`,
  },

  footer: {
    cityData: 'Dados das cidades',
    license: 'CC BY 4.0',
  },
}
