// Korean catalog.

import type { Messages } from './types'

export const ko: Messages = {
  numberLocale: 'ko-KR',

  appName: 'Yondle',
  tagline: '매일 즐기는 지리 추측 게임',

  header: {
    distanceUnit: '거리 단위',
    howToPlay: '게임 방법',
    statistics: '통계',
    language: '언어',
  },

  modes: {
    daily: '데일리',
    practice: '연습',
    practiceLabel: '연습 모드',
    practiceEyebrow: '출발 도시',
    newPuzzle: '새 문제',
    practiceNote: '연습 문제는 데일리 연속 기록에 영향을 주지 않습니다.',
  },

  menu: {
    label: '메뉴',
    about: '정보',
  },

  support: {
    cta: '커피 한 잔 사주기',
    note: '매일의 여정을 즐기고 계신가요? Yondle을 무료로 유지하도록 도와주세요.',
  },

  ads: {
    label: '광고',
  },

  about: {
    tagline: '매일 즐기는 지리 추측 게임.',
    intro:
      '매일(UTC) 모두가 같은 문제를 받습니다. 출발 도시 하나와 목표 거리 하나. 도시를 말하며 여정을 만들고, 각 구간마다 이전 도시로부터의 거리가 누적 합계에 더해집니다.',
    rules:
      '목표를 넘기지 않고 가능한 한 적은 횟수로 도달하세요. 기회는 6번입니다. 연습 모드에서는 연속 기록에 영향을 주지 않는 무작위 문제를 무제한으로 즐길 수 있습니다.',
    credits:
      '도시 데이터 © GeoNames (CC BY 4.0). 정적이고 오프라인에서도 작동하는 웹 앱입니다.',
  },

  prompt: {
    eyebrow: '오늘의 출발지',
    targetLabel: '총합 목표',
    hint: (band, guesses) =>
      `도시에서 도시로 이동 · 목표보다 ${band} 이내로 도달 · 초과 금지 · ${guesses}번의 기회`,
    guessesLeft: (n) => `${n}번 남음`,
  },

  globe: {
    label: (startCity) =>
      `${startCity}을(를) 중심으로 한 지구본. 도시 경로를 표시합니다. 드래그하여 회전.`,
    zoomIn: '확대',
    zoomOut: '축소',
    reveal: {
      hint: '핀을 탭하면 도달할 수 있었던 도시를 볼 수 있어요.',
      ideal: '목표에 가장 가까움',
      completion: '여기서 완주할 수 있었음',
    },
    hints: {
      label: '힌트',
      cities: '도시 표시',
      names: '이름 표시',
    },
  },

  input: {
    placeholder: '도시 이름 입력…',
    ariaLabel: '도시 추측',
    submit: '입력',
    submitAria: '추측 제출',
  },

  guessRow: {
    insideBand: '구간 안!',
    overshot: (over) => `${over} 초과!`,
  },

  errors: {
    duplicate: '이미 추측한 도시입니다.',
    startCity: '출발 도시입니다 — 다른 곳을 선택하세요.',
    finished: '오늘의 라운드가 끝났습니다.',
  },

  format: {
    toGo: (distance) => `${distance} 남음`,
    over: (distance) => `${distance} 초과`,
    onTheLine: '정확히 경계선',
  },

  result: {
    solved: (used, total) => `${used}/${total}에 완료`,
    overshotBadge: '목표 초과',
    outOfGuesses: '기회 소진',
    headlineWin: '성공했습니다',
    headlineOver: '너무 멀어요!',
    headlineClose: '아슬아슬',
    ofTarget: (target) => `목표 ${target} 중`,
    landedInBand: '구간에 도달',
    answerNote:
      '지구본의 핀은 목표 거리에 가장 가까운 도시들입니다 — 한 번의 직선 이동으로 이길 수 있었던 도시들입니다. 핀을 탭해 어디로 갈 수 있었는지 살펴보세요.',
    share: '결과 공유',
    copied: '복사됨!',
  },

  howTo: {
    title: '게임 방법',
    intro:
      '매일 출발 도시 하나와 목표 거리 하나. 도시를 하나씩 이어 경로를 만들고 각 구간을 더하세요 — 초과하지 않고 목표에 도달하세요.',
    step1:
      '도시를 추측하세요. 점수는 출발지에서 그 도시까지의 직선 거리입니다. 다시 추측하면 마지막 도시에서 새 도시까지의 구간이 더해집니다.',
    step2:
      '계속 이동하며 목표에 다가가세요. 합계가 가까워질수록 뜨거움/차가움 신호가 따뜻해집니다 —「남음」숫자가 줄어드는 것을 지켜보세요.',
    step3: (band, guesses) =>
      `합계를 목표보다 ${band} 이내로 맞추면 승리입니다. 초과하면 실패 — ${guesses}번의 기회를 모두 쓰면 마찬가지입니다. 구간이 적을수록 좋은 점수입니다.`,
    note: (min) =>
      `인구 ${min} 명이 넘는 도시만 게임에 나옵니다 — 더 작은 도시는 추측할 수 없습니다.`,
    cta: '떠나볼까요',
  },

  stats: {
    title: '통계',
    played: '플레이',
    winPct: '승률',
    streak: '연승',
    max: '최고',
    distribution: '추측 횟수 분포',
    empty: '아직 게임이 없습니다 — 오늘의 퍼즐을 플레이하여 연승을 시작하세요.',
  },

  modal: {
    close: '닫기',
  },

  share: {
    ofTarget: (pct) => `📏 목표의 ${pct}%`,
    overshot: (pct) => `📏 ${pct}% (초과)`,
  },

  footer: {
    cityData: '도시 데이터',
    license: 'CC BY 4.0',
  },
}
