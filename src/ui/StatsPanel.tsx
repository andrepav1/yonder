import type { Stats } from '@/store/statsStore'
import { Modal } from './Modal'

interface StatsPanelProps {
  stats: Stats
  onClose: () => void
}

export function StatsPanel({ stats, onClose }: StatsPanelProps) {
  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0
  const maxCount = Math.max(1, ...stats.distribution)

  return (
    <Modal title="Statistics" onClose={onClose}>
      <div className="stats__grid">
        <div className="stat">
          <div className="stat__num mono">{stats.played}</div>
          <div className="stat__label">Played</div>
        </div>
        <div className="stat">
          <div className="stat__num mono">{winPct}</div>
          <div className="stat__label">Win %</div>
        </div>
        <div className="stat">
          <div className="stat__num mono">{stats.currentStreak}</div>
          <div className="stat__label">Streak</div>
        </div>
        <div className="stat">
          <div className="stat__num mono">{stats.maxStreak}</div>
          <div className="stat__label">Max</div>
        </div>
      </div>

      <div className="answers__title">Guess distribution</div>
      <div className="dist">
        {stats.distribution.map((count, i) => (
          <div className="dist__row" key={i}>
            <span className="dist__key">{i + 1}</span>
            <div
              className={`dist__bar${count === 0 ? ' dist__bar--empty' : ''}`}
              style={{ width: `${(count / maxCount) * 100}%` }}
            >
              {count}
            </div>
          </div>
        ))}
      </div>

      {stats.played === 0 && (
        <p style={{ marginBottom: 0 }}>
          No games yet — play today’s puzzle to start a streak.
        </p>
      )}
    </Modal>
  )
}
