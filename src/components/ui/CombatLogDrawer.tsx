import React from 'react'

export interface CombatLogDrawerProps {
  isOpen: boolean
  onClose: () => void
  logs: string[]
}

export const CombatLogDrawer: React.FC<CombatLogDrawerProps> = ({
  isOpen,
  onClose,
  logs,
}) => {
  if (!isOpen) return null

  return (
    <div className="combat-drawer-overlay" onClick={onClose}>
      <aside
        className="combat-drawer-content"
        onClick={(e) => e.stopPropagation()}
        aria-label="Combat Log Drawer"
      >
        {/* Drawer Header */}
        <div className="combat-drawer-header">
          <div className="drawer-title-group">
            <span className="drawer-icon">💬</span>
            <h2 className="drawer-title">NHẬT KÝ CHIẾN TRƯỜNG</h2>
          </div>
          <button
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Đóng nhật ký"
            title="Đóng (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Drawer Subtitle & Entry Count */}
        <div className="combat-drawer-meta">
          <span className="meta-count">{logs.length} sự kiện được ghi nhận</span>
        </div>

        {/* Log Stream List */}
        <div className="combat-drawer-feed">
          {logs.length === 0 ? (
            <div className="drawer-empty-state">
              <div className="empty-state-icon">⚔️</div>
              <p className="empty-state-title">Chưa có giao tranh!</p>
              <p className="empty-state-desc">
                Các sự kiện tấn công, kích hoạt nội tại, lá chắn Super-Block sẽ xuất hiện tại đây theo thời gian thực.
              </p>
            </div>
          ) : (
            <div className="drawer-log-list">
              {logs.map((log, index) => {
                const isBlocked = log.includes('BLOCKED') || log.includes('chặn')
                const isKill = log.includes('tiêu diệt') || log.includes('hạ gục')
                const isHeroDamage = log.includes('Hero') || log.includes('Tướng')
                const isSuperBlock = log.includes('Super-Block')

                return (
                  <div
                    key={index}
                    className={`drawer-log-item ${
                      isSuperBlock
                        ? 'log-superblock'
                        : isBlocked
                        ? 'log-blocked'
                        : isKill
                        ? 'log-kill'
                        : isHeroDamage
                        ? 'log-herodamage'
                        : ''
                    }`}
                  >
                    <span className="log-idx-tag">#{index + 1}</span>
                    <span className="log-body-text">{log}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

export default CombatLogDrawer
