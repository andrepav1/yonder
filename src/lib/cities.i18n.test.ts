// Localized city names — proves the dataset carries per-language names and that
// the core (display + fuzzy matching) honours them, while English behaviour is
// untouched. The cases below are real GeoNames ids paired with the translations
// actually shipped in src/data/cities.json (see scripts/enrich-cities.mjs).

import { describe, it, expect } from 'vitest'
import type { Locale } from '@/i18n/types'
import { LOCALES } from '@/i18n'
import {
  allCities,
  search,
  resolveGuess,
  cityLabel,
  localizedName,
  foldText,
} from './cities'

/** A marquee city: stable GeoNames id + a slice of its verified translations. */
interface Case {
  id: number
  en: string
  t: Partial<Record<Locale, string>>
}

// A broad spread — Latin-script renamings, CJK scripts, and cities that read the
// same in some languages (so those locales fall back to English).
const CASES: Case[] = [
  {
    id: 2643743,
    en: 'London',
    t: { fr: 'Londres', es: 'Londres', it: 'Londra', pt: 'Londres', ja: 'ロンドン', ko: '런던', zh: '倫敦' },
  },
  {
    id: 2867714,
    en: 'Munich',
    t: { de: 'München', es: 'Múnich', it: 'Monaco di Baviera', pt: 'Munique', ja: 'ミュンヘン', ko: '뮌헨', zh: '慕尼黑' },
  },
  {
    id: 1850147,
    en: 'Tokyo',
    t: { de: 'Tokio', es: 'Tokio', pt: 'Tóquio', ja: '東京都', ko: '도쿄', zh: '東京' },
  },
  {
    id: 524901,
    en: 'Moscow',
    t: { de: 'Moskau', fr: 'Moscou', es: 'Moscú', it: 'Mosca', pt: 'Moscovo', ja: 'モスクワ', ko: '모스크바', zh: '莫斯科' },
  },
  {
    id: 2950159,
    en: 'Berlin',
    t: { es: 'Berlín', it: 'Berlino', pt: 'Berlim', ja: 'ベルリン', ko: '베를린', zh: '柏林' },
  },
  {
    id: 3169070,
    en: 'Rome',
    t: { it: 'Roma', de: 'Rom', es: 'Roma', pt: 'Roma', ja: 'ローマ', ko: '로마' },
  },
  {
    id: 3173435,
    en: 'Milan',
    t: { it: 'Milano', de: 'Mailand', es: 'Milán', pt: 'Milão', ja: 'ミラノ', ko: '밀라노' },
  },
  {
    id: 3172394,
    en: 'Naples',
    t: { it: 'Napoli', de: 'Neapel', es: 'Nápoles', pt: 'Nápoles', ja: 'ナポリ', ko: '나폴리' },
  },
  {
    id: 3176959,
    en: 'Florence',
    t: { it: 'Firenze', de: 'Florenz', es: 'Florencia', pt: 'Florença', ja: 'フィレンツェ', ko: '피렌체' },
  },
  {
    id: 2761369,
    en: 'Vienna',
    t: { de: 'Wien', fr: 'Vienne', es: 'Viena', pt: 'Viena', ja: 'ウィーン', ko: '빈' },
  },
  {
    id: 756135,
    en: 'Warsaw',
    t: { fr: 'Varsovie', de: 'Warschau', es: 'Varsovia', it: 'Varsavia', pt: 'Varsóvia', ja: 'ワルシャワ', ko: '바르샤바' },
  },
  {
    id: 2267057,
    en: 'Lisbon',
    t: { pt: 'Lisboa', de: 'Lissabon', es: 'Lisboa', fr: 'Lisbonne', it: 'Lisbona', ja: 'リスボン', ko: '리스본' },
  },
  {
    id: 264371,
    en: 'Athens',
    t: { es: 'Atenas', de: 'Athen', fr: 'Athènes', it: 'Atene', pt: 'Atenas', ja: 'アテネ', ko: '아테네' },
  },
  {
    id: 2660646,
    en: 'Geneva',
    t: { de: 'Genf', es: 'Ginebra', fr: 'Genève', it: 'Ginevra', pt: 'Genebra', ja: 'ジュネーヴ', ko: '제네바' },
  },
  {
    id: 1816670,
    en: 'Beijing',
    t: { es: 'Pekín', fr: 'Pékin', it: 'Pechino', pt: 'Pequim', ja: '北京市', ko: '베이징', zh: '北京' },
  },
  {
    id: 745044,
    en: 'Istanbul',
    t: { es: 'Estambul', pt: 'Istambul', ja: 'イスタンブール', ko: '이스탄불', zh: '伊斯坦堡' },
  },
  {
    id: 2803138,
    en: 'Antwerp',
    t: { de: 'Antwerpen', es: 'Amberes', fr: 'Anvers', it: 'Anversa', pt: 'Antuérpia', ja: 'アントワープ', ko: '안트베르펜' },
  },
  {
    id: 2618425,
    en: 'Copenhagen',
    t: { es: 'Copenhague', de: 'Kopenhagen', fr: 'Copenhague', it: 'Copenaghen', pt: 'Copenhaga', ja: 'コペンハーゲン', ko: '코펜하겐' },
  },
]

const cityById = (id: number) => {
  const c = allCities().find((x) => x.id === id)
  if (!c) throw new Error(`fixture city ${id} not found in dataset`)
  return c
}

/** The name segment of a label — before any ", Country" disambiguation. */
const head = (label: string) => label.split(',')[0]

describe('dataset ships localized names', () => {
  const cities = allCities()

  it('a substantial share of cities carry translations', () => {
    const withNames = cities.filter((c) => c.names && Object.keys(c.names).length > 0)
    // ~4k of ~6.2k cities have at least one translation.
    expect(withNames.length).toBeGreaterThan(3000)
  })

  it('only ships supported, non-English locale keys', () => {
    const supported = new Set(LOCALES.map((l) => l.code))
    for (const c of cities) {
      if (!c.names) continue
      for (const key of Object.keys(c.names)) {
        expect(supported.has(key as Locale)).toBe(true)
        // English is never stored — it always uses the canonical `name`.
        expect(key).not.toBe('en')
      }
    }
  })

  it('never stores a translation identical to the canonical name', () => {
    for (const c of cities) {
      if (!c.names) continue
      for (const localized of Object.values(c.names)) {
        expect(localized).not.toBe(c.name)
      }
    }
  })

  it('exposes every catalog language on at least one city', () => {
    const nonEnglish = LOCALES.map((l) => l.code).filter((c) => c !== 'en')
    for (const loc of nonEnglish) {
      const anyCity = cities.some((c) => c.names?.[loc])
      expect(anyCity, `expected at least one city translated into ${loc}`).toBe(true)
    }
  })
})

describe('localizedName', () => {
  it('returns the localized name when present', () => {
    const london = cityById(2643743)
    expect(localizedName(london, 'fr')).toBe('Londres')
    expect(localizedName(london, 'ja')).toBe('ロンドン')
  })

  it('falls back to the canonical name for an untranslated locale', () => {
    const london = cityById(2643743)
    // "London" is identical in German, so no `de` entry is stored -> fallback.
    expect(london.names?.de).toBeUndefined()
    expect(localizedName(london, 'de')).toBe('London')
  })

  it('returns the canonical name for English or no locale', () => {
    const munich = cityById(2867714)
    expect(localizedName(munich, 'en')).toBe('Munich')
    expect(localizedName(munich)).toBe('Munich')
  })
})

describe('cityLabel is locale-aware', () => {
  it('renders the localized name for each supported language', () => {
    for (const { id, t } of CASES) {
      const city = cityById(id)
      for (const [loc, expected] of Object.entries(t) as [Locale, string][]) {
        // Compare the name segment — some cities also carry ", Country".
        expect(head(cityLabel(city, loc))).toBe(expected)
      }
    }
  })

  it('is unchanged from the English name by default', () => {
    for (const { id, en } of CASES) {
      const city = cityById(id)
      expect(head(cityLabel(city))).toBe(en)
      // The default label and the explicit-English label must be identical.
      expect(cityLabel(city, 'en')).toBe(cityLabel(city))
    }
  })

  it('still disambiguates repeated names, keeping country in English', () => {
    // London, Ontario (Canada) shares the name -> label must carry the country,
    // and the country stays in its dataset (English) form.
    const londons = allCities().filter((c) => c.name === 'London')
    if (londons.length > 1) {
      for (const l of londons) {
        const label = cityLabel(l, 'fr')
        expect(label).toContain(l.country)
      }
    }
  })
})

describe('search matches localized names', () => {
  it('finds each city when its translated name is typed', () => {
    for (const { id, t } of CASES) {
      for (const [loc, term] of Object.entries(t) as [Locale, string][]) {
        const results = search(term, 20, loc)
        const ids = results.map((r) => r.city.id)
        expect(
          ids.includes(id),
          `typing "${term}" (${loc}) should surface city ${id}`,
        ).toBe(true)
      }
    }
  })

  it('resolves marquee cities by their localized name as the top hit', () => {
    // Longer, unambiguous localized names should win outright.
    const marquee: [string, Locale, number][] = [
      ['Londres', 'fr', 2643743],
      ['Londra', 'it', 2643743],
      ['München', 'de', 2867714],
      ['Monaco di Baviera', 'it', 2867714],
      ['Moscou', 'fr', 524901],
      ['Varsovie', 'fr', 756135],
      ['Firenze', 'it', 3176959],
      ['ロンドン', 'ja', 2643743],
      ['서울특별시', 'ko', 1835848],
      ['伊斯坦堡', 'zh', 745044],
      ['コペンハーゲン', 'ja', 2618425],
    ]
    for (const [term, loc, id] of marquee) {
      expect(search(term, 6, loc)[0]?.city.id, `${term} (${loc})`).toBe(id)
    }
  })

  it('is accent-insensitive on localized names too', () => {
    // "Múnich" typed without the accent still finds Munich.
    const results = search('munich', 20, 'es')
    expect(results.some((r) => r.city.id === 2867714)).toBe(true)
    // And "Genève" typed as plain "geneve".
    const geneva = search('geneve', 20, 'fr')
    expect(geneva.some((r) => r.city.id === 2660646)).toBe(true)
  })

  it('labels results in the active locale', () => {
    const results = search('Londres', 6, 'fr')
    const london = results.find((r) => r.city.id === 2643743)
    expect(london && head(london.label)).toBe('Londres')
  })

  it('still finds cities by their English name in any locale', () => {
    for (const { id, en } of CASES) {
      const results = search(en, 20, 'fr')
      expect(
        results.some((r) => r.city.id === id),
        `English "${en}" should still resolve under a non-English locale`,
      ).toBe(true)
    }
  })
})

describe('resolveGuess accepts localized input', () => {
  it('maps a localized name to the right city', () => {
    expect(resolveGuess('Londres')?.id).toBe(2643743)
    expect(resolveGuess('München')?.id).toBe(2867714)
    expect(resolveGuess('ロンドン')?.id).toBe(2643743)
    expect(resolveGuess('モスクワ')?.id).toBe(524901)
  })

  it('still maps English input to the right city', () => {
    expect(resolveGuess('London')?.id).toBe(2643743)
    expect(resolveGuess('Munich')?.id).toBe(2867714)
  })
})

describe('broad localized-matching sweep', () => {
  // Every shipped translation of a reasonable length must be reachable by typing
  // it — a wide net over the whole dataset, not just the marquee fixtures.
  it('a large sample of translated names each resolve to their own city', () => {
    const cities = allCities()
    let checked = 0
    let hits = 0
    for (const c of cities) {
      if (!c.names) continue
      for (const [loc, term] of Object.entries(c.names) as [Locale, string][]) {
        // Skip ultra-short CJK forms where substring matching is inherently
        // ambiguous across many cities.
        if (foldText(term).length < 3) continue
        checked++
        const results = search(term, 30, loc)
        if (results.some((r) => r.city.id === c.id)) hits++
      }
    }
    expect(checked).toBeGreaterThan(2000)
    // The overwhelming majority must be findable (a few genuinely collide with
    // higher-population cities sharing the substring).
    expect(hits / checked).toBeGreaterThan(0.98)
  })
})
