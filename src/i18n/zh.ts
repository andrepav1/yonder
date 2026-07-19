// Chinese (Simplified) catalog.

import type { Messages } from './types'

export const zh: Messages = {
  numberLocale: 'zh-CN',

  appName: 'Yondle',
  tagline: '每日地理猜谜游戏',

  header: {
    distanceUnit: '距离单位',
    howToPlay: '玩法',
    statistics: '统计',
    language: '语言',
  },

  prompt: {
    eyebrow: '今日出发地',
    targetLabel: '累计到达',
    hint: (band, guesses) =>
      `逐城跳跃 · 落在目标下方 ${band} 以内 · 不要超过 · ${guesses} 次机会`,
    guessesLeft: (n) => `剩余 ${n} 次机会`,
  },

  globe: {
    label: (startCity) => `以 ${startCity} 为中心的地球，显示你的城市路线。拖动可旋转。`,
  },

  input: {
    placeholder: '输入一座城市…',
    ariaLabel: '猜一座城市',
    submit: '提交',
    submitAria: '提交猜测',
  },

  guessRow: {
    insideBand: '进入区间！',
    overshot: '超过了！',
  },

  errors: {
    duplicate: '你已经猜过这座城市了。',
    startCity: '这是出发城市——请另选一座。',
    finished: '今天的游戏已结束。',
  },

  format: {
    toGo: (distance) => `还差 ${distance}`,
    over: (distance) => `超出 ${distance}`,
    onTheLine: '正好压线',
  },

  result: {
    solved: (used, total) => `用 ${used}/${total} 次完成`,
    overshotBadge: '超过了目标',
    outOfGuesses: '机会用尽',
    headlineWin: '你成功了',
    headlineOver: '太远了！',
    headlineClose: '差一点',
    ofTarget: (target) => `目标 ${target}`,
    landedInBand: '落入区间',
    answerNote: '地球上的标记是最接近目标距离的城市——它们本可以一次直跳获胜。',
    share: '分享结果',
    copied: '已复制！',
  },

  howTo: {
    title: '玩法',
    intro:
      '每天一座出发城市和一个目标距离。逐城构建路线并累加每一跳——在不超过目标的前提下到达它。',
    step1:
      '猜一座城市。你的得分是从出发地到它的直线距离。再猜一座，从你上一座城市到新城市的这一跳会累加上去。',
    step2:
      '不断跳跃，向目标靠近。随着累计总数接近目标，冷热提示会逐渐变热——看着「还差」的数字减小。',
    step3: (band, guesses) =>
      `让总数落在目标下方 ${band} 以内即可获胜。超过就出局——用完 ${guesses} 次机会也一样。跳数越少，得分越好。`,
    cta: '出发吧',
  },

  stats: {
    title: '统计',
    played: '已玩',
    winPct: '胜率',
    streak: '连胜',
    max: '最高',
    distribution: '猜测分布',
    empty: '还没有游戏记录——玩今天的谜题来开启连胜吧。',
  },

  modal: {
    close: '关闭',
  },

  share: {
    ofTarget: (pct) => `📏 目标的 ${pct}%`,
    overshot: (pct) => `📏 ${pct}%（超过）`,
  },

  footer: {
    cityData: '城市数据',
    license: 'CC BY 4.0',
  },
}
