// Dev-only screenshot harness. Serves the built app (dist/) and drives it with
// the sandbox's pre-installed Chromium to capture phone-sized screenshots of
// the real UI in a few states + both themes.
//
// It derives today's puzzle facts from scripts/print-today.mts, so the mid-game
// ("play") shot uses a safe partial hop and the "win" shot uses a single-hop
// winning city — neither overshoots the cumulative target.
//
// Usage: npm run build && node scripts/screenshot.mjs
// Env:   OUT_DIR = where to write PNGs (default ./shots)

import { chromium } from 'playwright-core'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, extname, resolve } from 'node:path'

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const DIST = resolve('dist')
const OUT = resolve(process.env.OUT_DIR ?? 'shots')
const PORT = 4199

// Today's puzzle facts: a one-hop winning city + a safe partial hop.
const facts = JSON.parse(
  execFileSync('npx', ['vite-node', 'scripts/print-today.mts'], { encoding: 'utf8' }),
)
const ANSWER = facts.answer ?? ''
const PARTIAL = facts.partial ?? ''

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
}

function serve() {
  return createServer(async (req, res) => {
    try {
      const url = decodeURIComponent((req.url ?? '/').split('?')[0])
      let file = join(DIST, url)
      if (url === '/' || !existsSync(file)) file = join(DIST, 'index.html')
      const body = await readFile(file)
      res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream')
      res.end(body)
    } catch {
      res.statusCode = 500
      res.end('err')
    }
  })
}

async function guess(page, name) {
  await page.fill('.guess__input', name)
  await page.waitForTimeout(120)
  await page.press('.guess__input', 'Enter')
  await page.waitForTimeout(350)
}

async function run() {
  const server = serve()
  await new Promise((r) => server.listen(PORT, r))
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })

  const shot = async (
    name,
    {
      dark = false,
      onboarded = true,
      play = false,
      win = false,
      menu = false,
      modesModal = false,
      free = false,
      tapReveal = false,
    } = {},
  ) => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      colorScheme: dark ? 'dark' : 'light',
    })
    if (onboarded) {
      await ctx.addInitScript(() => localStorage.setItem('yondle:onboarded:v1', '1'))
    }
    const page = await ctx.newPage()
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)

    if (menu || modesModal || free) {
      // Open the header menu; optionally open the Modes modal and pick a mode.
      await page.click('.menu .iconbtn')
      await page.waitForTimeout(200)
      if (modesModal || free) {
        await page.getByRole('menuitem', { name: 'Modes' }).click()
        await page.waitForTimeout(300)
        if (free) {
          // Pick the first mode card (Classic) → a fresh free-play round.
          await page.locator('.modecard').first().click()
          await page.waitForTimeout(400)
        }
      }
    }
    if (play && PARTIAL) {
      // A single mid-journey hop — round still in progress.
      await guess(page, PARTIAL)
    }
    if (win && ANSWER) {
      // A one-hop win (distance lands in the band).
      await guess(page, ANSWER)
    }
    if (tapReveal) {
      // Tap the first revealed "could-have-guessed" pin to open its callout.
      const pin = page.locator('.globe__reveal').first()
      await pin.waitFor({ state: 'attached', timeout: 2000 }).catch(() => {})
      await pin.click({ force: true }).catch(() => {})
      await page.waitForTimeout(300)
    }
    await page.waitForTimeout(500)
    await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true })
    await ctx.close()
    console.log('shot', name)
  }

  await shot('howto-light', { onboarded: false })
  await shot('board-light')
  await shot('menu-light', { menu: true })
  await shot('modes-light', { modesModal: true })
  await shot('free-light', { free: true })
  await shot('play-light', { play: true })
  await shot('win-light', { win: true })
  await shot('explore-light', { win: true, tapReveal: true })
  await shot('explore-dark', { dark: true, win: true, tapReveal: true })
  await shot('board-dark', { dark: true })
  await shot('win-dark', { dark: true, win: true })

  await browser.close()
  server.close()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
