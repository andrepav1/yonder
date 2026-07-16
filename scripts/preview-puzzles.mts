// Dev-only: print generated puzzles for a range of dates so we can eyeball
// fairness. Run: npx vite-node scripts/preview-puzzles.mts
import { generatePuzzle } from '@/lib/puzzle'
import { cityLabel } from '@/lib/cities'

const dates = [
  '2026-07-15', // "today"
  '2026-07-16',
  '2026-07-17',
  '2026-01-01',
  '2026-03-14',
  '2026-11-02',
  '2026-12-25',
]

for (const date of dates) {
  const p = generatePuzzle(date)
  const band = `${Math.round(p.targetKm * (1 - p.tolerancePct))}–${p.targetKm} km`
  console.log(`\n${date}  seed=${p.seed}`)
  console.log(
    `  START: ${cityLabel(p.start)}  (pop ${p.start.population.toLocaleString()})`,
  )
  console.log(
    `  TARGET: ${p.targetKm} km   win band ${p.tolerancePct * 100}% under = ${band} (single hop; don't overshoot)`,
  )
  console.log(`  single-hop wins in band: ${p.validAnswerCount}`)
  console.log(`  closest ${p.answers.length}:`)
  for (const a of p.answers) {
    const delta = a.distanceKm - p.targetKm
    console.log(
      `    ${cityLabel(a.city).padEnd(28)} ${a.distanceKm.toFixed(1)} km  (${
        delta >= 0 ? '+' : ''
      }${delta.toFixed(1)} km)`,
    )
  }
}
