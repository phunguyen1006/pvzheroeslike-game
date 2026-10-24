import React, { useState } from 'react'
import type { Card as CardType, Side } from '../../engine/types'
import { Card } from '../cards/Card'

export interface MulliganModalProps {
  cards: CardType[]
  superpower?: CardType
  side: Side
  onConfirmMulligan: (selectedIndices: number[]) => void
}

export const MulliganModal: React.FC<MulliganModalProps> = ({
  cards,
  superpower,
  side,
  onConfirmMulligan,
}) => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])

  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    )
  }

  const handleConfirm = () => {
    onConfirmMulligan(selectedIndices)
  }

  return (
    <div className="pvz-modal-backdrop mulligan-backdrop">
      <div className={`mulligan-dialog-card ${side}-dialog`}>
        <div className="mulligan-header">
          <h2 className="mulligan-title">BỐC BÀI ĐẦU TRẬN (MULLIGAN)</h2>
          <p className="mulligan-guidance">
            Nhấp chọn những lá bài bạn muốn đổi lấy bài mới trong bộ bài, sau đó ấn Xác nhận!
          </p>
        </div>

        {/* 4 Starting Cards Row */}
        <div className="mulligan-cards-grid">
          {cards.slice(0, 4).map((card, index) => {
            const isRedrawSelected = selectedIndices.includes(index)
            return (
              <div
                key={`${card.id}-${index}`}
                className={`mulligan-card-slot ${isRedrawSelected ? 'redraw-selected' : ''}`}
                onClick={() => toggleSelect(index)}
              >
                <Card
                  card={card}
                  isPlayable={true}
                  isSelected={isRedrawSelected}
                  size="md"
                  showTooltip={false}
                />
                <div className="mulligan-status-badge">
                  {isRedrawSelected ? '🔄 Đổi lá này' : '✅ Giữ lại'}
                </div>
              </div>
            )
          })}
        </div>

        {/* Starting Superpower Card Showcase */}
        {superpower && (
          <div className="mulligan-sp-showcase">
            <span className="sp-showcase-label">⭐ Siêu năng lực khởi đầu (Cố định):</span>
            <div className="sp-card-compact">
              <span className="sp-compact-icon">⚡</span>
              <span className="sp-compact-name">{superpower.name} (0 Cost)</span>
            </div>
          </div>
        )}

        {/* Confirm Button */}
        <div className="mulligan-actions">
          <button className="pvz-btn primary-menu-btn mulligan-confirm-btn" onClick={handleConfirm}>
            {selectedIndices.length > 0
              ? `Đổi ${selectedIndices.length} lá bài & Vào trận!`
              : 'Giữ nguyên & Vào trận!'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default MulliganModal
