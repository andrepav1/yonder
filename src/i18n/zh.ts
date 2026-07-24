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

  modes: {
    daily: '每日',
    practiceEyebrow: '你的出发地',
    newPuzzle: '换一题',
    practiceNote: '练习题不计入你的每日连胜。',
    title: '模式',
    catalog: {
      classic: {
        name: '经典',
        blurb: '在城市间跳跃，不超过目标距离地抵达。',
      },
      hidden: {
        name: '隐藏目的地',
        blurb: '根据距离和方向线索，找出神秘首都。',
      },
    },
  },

  hidden: {
    eyebrow: '找出隐藏的首都',
    anchorLabel: '线索起点',
    clue: (distance) => `大约 ${distance}`,
    hint: (guesses) => `猜首都逐步逼近 · ${guesses} 次`,
    away: (distance) => `${distance}`,
    found: '找到了！',
    resultWin: (used, total) => `${used}/${total} 找到`,
    resultLose: '次数用完',
    headlineWin: '你找到了',
    headlineLose: '就差一点',
    answer: (city) => `答案是 ${city}`,
  },

  menu: {
    label: '菜单',
    about: '关于',
  },

  support: {
    cta: '请我喝杯咖啡',
    note: '喜欢每日环游吗？帮助 Yondle 保持免费。',
  },

  ads: {
    label: '广告',
  },

  about: {
    tagline: '每日地理猜谜游戏。',
    intro:
      '每天（UTC）所有人都会拿到同一道题：一个出发城市和一个目标距离。通过说出城市来构建旅程——每一跳都会把上一个城市到新城市的距离加入累计总和。',
    rules:
      '在不超过目标的前提下，用尽量少的跳数到达目标。你有 6 次机会。切换到练习模式可无限畅玩不计入连胜的随机题目。',
    credits: '城市数据 © GeoNames（CC BY 4.0）。这是一个静态、可离线使用的网页应用。',
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
    zoomIn: '放大',
    zoomOut: '缩小',
    reveal: {
      hint: '点击一个标记，查看你本可以到达的城市。',
      ideal: '最接近目标',
      completion: '本可以从这里完成',
    },
    hints: {
      label: '提示',
      cities: '显示城市',
      names: '显示名称',
    },
  },

  input: {
    placeholder: '输入一座城市…',
    ariaLabel: '猜一座城市',
    submit: '提交',
    submitAria: '提交猜测',
  },

  guessRow: {
    insideBand: '进入区间！',
    overshot: (over) => `超过 ${over}！`,
  },

  errors: {
    duplicate: '你已经猜过这座城市了。',
    startCity: '这是出发城市——请另选一座。',
    finished: '今天的游戏已结束。',
    overshoot: '这一跳会超过目标——试试更近的城市。',
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
    answerNote:
      '地球上的标记是最接近目标距离的城市——它们本可以一次直跳获胜。点击标记，探索你本可以到达的地方。',
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
      `让总数落在目标下方 ${band} 以内即可获胜。会超过目标的一跳会被拦下——换一个更近的城市就行。只有用完 ${guesses} 次机会才会输。跳数越少，得分越好。`,
    note: (min) =>
      `游戏中只有人口超过 ${min} 的城市——更小的城镇无法猜测。`,
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
