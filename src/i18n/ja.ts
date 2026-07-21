// Japanese catalog.

import type { Messages } from './types'

export const ja: Messages = {
  numberLocale: 'ja-JP',

  appName: 'Yondle',
  tagline: '毎日の地理あてゲーム',

  header: {
    distanceUnit: '距離の単位',
    howToPlay: '遊び方',
    statistics: '統計',
    language: '言語',
  },

  modes: {
    daily: 'デイリー',
    practice: '練習',
    practiceLabel: '練習モード',
    practiceEyebrow: '出発地',
    newPuzzle: '新しい問題',
    practiceNote: '練習の問題はデイリーの連続記録に影響しません。',
  },

  menu: {
    label: 'メニュー',
    about: 'このゲームについて',
  },

  about: {
    tagline: '毎日の地理あてゲーム。',
    intro:
      '毎日（UTC）、全員が同じ問題に挑戦します。出発都市と目標距離が一つずつ。都市を挙げて旅を作り、各区間で前の都市からの距離を合計に足していきます。',
    rules:
      '目標を超えないように、できるだけ少ない区間で到達しましょう。挑戦は6回。練習モードでは、連続記録に影響しないランダムな問題を無制限に遊べます。',
    credits:
      '都市データ © GeoNames（CC BY 4.0）。静的でオフラインでも動作するWebアプリです。',
  },

  prompt: {
    eyebrow: '今日の出発地',
    targetLabel: '合計で到達',
    hint: (band, guesses) =>
      `都市から都市へ跳ぶ · 目標の ${band} 以内に収める · 超えない · ${guesses} 回`,
    guessesLeft: (n) => `残り ${n} 回`,
  },

  globe: {
    label: (startCity) =>
      `${startCity} を中心にした地球儀。あなたの都市のルートを表示。ドラッグで回転。`,
    zoomIn: '拡大',
    zoomOut: '縮小',
    reveal: {
      hint: 'ピンをタップすると、到達できた都市が見られます。',
      ideal: '目標に最も近い',
      completion: 'ここからゴールできた',
    },
  },

  input: {
    placeholder: '都市名を入力…',
    ariaLabel: '都市を推測',
    submit: '決定',
    submitAria: '推測を送信',
  },

  guessRow: {
    insideBand: '範囲内！',
    overshot: '超過！',
  },

  errors: {
    duplicate: 'その都市はすでに推測しました。',
    startCity: 'それは出発都市です — 別の場所を選んでください。',
    finished: '今日のラウンドは終了しました。',
  },

  format: {
    toGo: (distance) => `あと ${distance}`,
    over: (distance) => `${distance} 超過`,
    onTheLine: 'ちょうどライン上',
  },

  result: {
    solved: (used, total) => `${used}/${total} で達成`,
    overshotBadge: '目標を超過',
    outOfGuesses: '回数切れ',
    headlineWin: '達成しました',
    headlineOver: '行き過ぎ！',
    headlineClose: '惜しい',
    ofTarget: (target) => `目標 ${target} のうち`,
    landedInBand: '範囲内に到達',
    answerNote:
      '地球儀上のピンは目標距離に最も近い都市です — 一度の直行で勝てたはずの都市です。ピンをタップして、行けたはずの場所を探してみましょう。',
    share: '結果を共有',
    copied: 'コピーしました！',
  },

  howTo: {
    title: '遊び方',
    intro:
      '毎日、出発都市と目標距離が一つずつ。都市を一つずつつないでルートを作り、各区間を足していきます — 超えずに目標に到達しましょう。',
    step1:
      '都市を推測します。スコアは出発地からその都市までの直線距離です。もう一度推測すると、前の都市から新しい都市までの区間が加算されます。',
    step2:
      '跳び続けて目標に近づきます。合計が近づくにつれてホット/コールドの合図が温かくなります —「あと」の数字が減っていくのを見ましょう。',
    step3: (band, guesses) =>
      `合計を目標の ${band} 以内に収めれば勝ちです。超えると失敗 — ${guesses} 回を使い切っても同じです。区間が少ないほど良いスコアです。`,
    cta: 'さあ出発',
  },

  stats: {
    title: '統計',
    played: 'プレイ数',
    winPct: '勝率',
    streak: '連勝',
    max: '最高',
    distribution: '推測回数の分布',
    empty: 'まだプレイ記録がありません — 今日のパズルで連勝を始めましょう。',
  },

  modal: {
    close: '閉じる',
  },

  share: {
    ofTarget: (pct) => `📏 目標の ${pct}%`,
    overshot: (pct) => `📏 ${pct}%（超過）`,
  },

  footer: {
    cityData: '都市データ',
    license: 'CC BY 4.0',
  },
}
