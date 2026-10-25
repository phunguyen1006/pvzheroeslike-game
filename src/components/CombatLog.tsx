import React, { useState, useEffect, useRef } from 'react'

export interface CombatLogProps {
  logs: string[]
  isOpen?: boolean
  onToggle?: () => void
  onClose?: () => void
  showToggleButton?: boolean
}

// Helper to categorize log event for color coding:
// Red = Damage, Green = Heal, Yellow = Buff / Stats, White = Standard
export function getLogEventCategory(text: string): 'damage' | 'heal' | 'buff' | 'standard' {
  const lower = text.toLowerCase()

  // 1. Heal detection
  if (
    lower.includes('hồi') ||
    lower.includes('heal') ||
    lower.includes('chữa') ||
    lower.includes('phục hồi')
  ) {
    return 'heal'
  }

  // 2. Buff / Stat change / Shield detection
  if (
    lower.includes('buff') ||
    lower.includes('tăng') ||
    lower.includes('cường hóa') ||
    lower.includes('chỉ số') ||
    lower.includes('block') ||
    lower.includes('shield') ||
    lower.includes('kháng') ||
    lower.includes('superpower')
  ) {
    return 'buff'
  }

  // 3. Damage / Kill detection
  if (
    lower.includes('sát thương') ||
    lower.includes('damage') ||
    lower.includes('tiêu diệt') ||
    lower.includes('tấn công') ||
    lower.includes('hạ gục') ||
    lower.includes('mất') ||
    lower.includes('đánh trúng') ||
    lower.includes('bị tiêu diệt')
  ) {
    return 'damage'
  }

  // 4. Standard / Phase / Turn
  return 'standard'
}

export const CombatLog: React.FC<CombatLogProps> = ({
  logs,
  isOpen: controlledIsOpen,
  onToggle,
  onClose,
  showToggleButton = true,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isPanelOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const bodyRef = useRef<HTMLDivElement>(null)

  const handleToggle = () => {
    if (onToggle) {
      onToggle()
    } else {
      setInternalIsOpen((prev) => !prev)
    }
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      setInternalIsOpen(false)
    }
  }

  // Auto-scroll to latest log entry
  useEffect(() => {
    if (isPanelOpen && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [logs, isPanelOpen])

  return (
    <>
      {/* 1. Toggle Button for Combat Log Panel at Right Viewport Margin */}
      {showToggleButton && (
        <button
          className="combat-log-toggle-btn"
          onClick={handleToggle}
          title={isPanelOpen ? 'Thu gọn Combat Log' : 'Mở Combat Log'}
          aria-label="Toggle Combat Log"
        >
          <span className="log-toggle-icon">📜</span>
          <span className="log-toggle-label">Log</span>
          {logs.length > 0 && !isPanelOpen && (
            <span className="log-unread-pill">{logs.length}</span>
          )}
        </button>
      )}

      {/* 2. Dedicated 280px x 400px Scrollable Combat Log Panel */}
      {isPanelOpen && (
        <aside
          className="combat-log-floating-panel"
          aria-label="Combat Log Panel"
        >
          {/* Panel Header */}
          <div className="combat-log-panel-header">
            <div className="combat-log-panel-title">
              <span>📜</span>
              <span>NHẬT KÝ CHIẾN ĐẤU</span>
            </div>
            <button
              className="combat-log-close-btn"
              onClick={handleClose}
              title="Đóng (Close)"
              aria-label="Đóng panel"
            >
              ✕
            </button>
          </div>

          {/* Panel Scrollable Body */}
          <div className="combat-log-panel-body" ref={bodyRef}>
            {logs.length === 0 ? (
              <div
                style={{
                  color: '#94a3b8',
                  fontStyle: 'italic',
                  textAlign: 'center',
                  padding: '24px 8px',
                }}
              >
                Chưa có sự kiện nào được ghi lại.
              </div>
            ) : (
              logs.map((logText, idx) => {
                const category = getLogEventCategory(logText)
                const categoryClass = `log-entry-${category}`
                const bulletSymbol =
                  category === 'damage'
                    ? '💥'
                    : category === 'heal'
                    ? '💚'
                    : category === 'buff'
                    ? '⚡'
                    : '🔹'

                return (
                  <div
                    key={idx}
                    className={`combat-log-entry-row ${categoryClass}`}
                  >
                    <span className="log-bullet-symbol" aria-hidden="true">
                      {bulletSymbol}
                    </span>
                    <span className="log-text-content">{logText}</span>
                  </div>
                )
              })
            )}
          </div>
        </aside>
      )}
    </>
  )
}

export default CombatLog
