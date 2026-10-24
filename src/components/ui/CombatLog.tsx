import React from 'react'

export interface CombatLogProps {
  logs: string[]
}

export const CombatLog: React.FC<CombatLogProps> = ({ logs }) => {
  return (
    <div className="combat-log-container">
      <div className="combat-log-header">
        <span className="combat-log-title">📜 NHẬT KÝ CHIẾN ĐẤU</span>
      </div>
      <div className="combat-log-entries">
        {logs.slice(0, 15).map((log, idx) => {
          const isLethal = log.includes('tiêu diệt') || log.includes('Destroyed')
          const isBlock = log.includes('SUPER-BLOCK') || log.includes('Chặn')
          const isTrick = log.includes('Tricks') || log.includes('sử dụng')

          return (
            <div
              key={idx}
              className={`log-item ${isLethal ? 'lethal-log' : ''} ${isBlock ? 'block-log' : ''} ${isTrick ? 'trick-log' : ''}`}
            >
              <span className="log-bullet">•</span>
              <span className="log-text">{log}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CombatLog
