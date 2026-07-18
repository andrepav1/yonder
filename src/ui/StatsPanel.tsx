import type { Stats } from '@/store/statsStore'
import { useI18n } from '@/i18n/context'
import { Modal } from './Modal'

interface StatsPanelProps {
  stats: Stats
  onClose: () => void
}

export function StatsPanel({ stats, onClose }: StatsPanelProps) {
  const { t } = useI18n()
  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0
  const maxCount = Math.max(1, ...stats.distribution)

  return (
    <Modal title={t.stats.title} onClose={onClose}>
      <div className="stats__grid">
        <div className="stat">
          <div className="stat__num mono">{stats.played}</div>
          <div className="stat__label">{t.stats.played}</div>
        </div>
        <div className="stat">
          <div className="stat__num mono">{winPct}</div>
          <div className="stat__label">{t.stats.winPct}</div>
        </div>
        <div className="stat">
          <div className="stat__num mono">{stats.currentStreak}</div>
          <div className="stat__label">{t.stats.streak}</div>
        </div>
        <div className="stat">
          <div className="stat__num mono">{stats.maxStreak}</div>
          <div className="stat__label">{t.stats.max}</div>
        </div>
      </div>

      <div className="answers__title">{t.stats.distribution}</div>
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

      {stats.played === 0 && <p style={{ marginBottom: 0 }}>{t.stats.empty}</p>}
    </Modal>
  )
}
