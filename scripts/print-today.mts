// Prints today's puzzle facts as JSON (used by the screenshot harness to drive
// a real winning guess). Dev-only.
import { generatePuzzle, utcDateString } from '@/lib/puzzle'

const date = process.env.YONDER_DATE ?? utcDateString()
const p = generatePuzzle(date)
process.stdout.write(
  JSON.stringify({
    date,
    start: p.start.name,
    targetKm: p.targetKm,
    answer: p.answers[0]?.city.name ?? '',
  }),
)
