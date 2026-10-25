import React, { useState, useEffect } from 'react'
import type { Card as CardType, Side } from '../../engine/types'
import { Card } from '../cards/Card'
import { soundManager } from '../../audio/SoundManager'

export interface MulliganScreenProps {
  cards: CardType[]
  superpower?: CardType
  side: Side
  onConfirmMulligan: (selectedIndices: number[]) => void
}

/**
 * MulliganScreen (Màn hình Đổi bài đầu trận chuẩn PvZ Heroes)
 * - Hiển thị 4 lá bài ban đầu + 1 lá Superpower cố định
 * - Nhấn chọn lá bài để đổi (hiển thị dấu chéo đỏ ❌ "ĐỔI LÁ NÀY" & làm mờ nhẹ)
 * - Nút "XÁC NHẬN ĐỔI BÀI" với hiệu ứng 3D Card Flip chân thực
 * - Tích hợp âm thanh Web Audio API soundManager
 */
export const MulliganScreen: React.FC<MulliganScreenProps> = ({
  cards,
  superpower,
  side,
  onConfirmMulligan,
}) => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [isFlipping, setIsFlipping] = useState(false)
  const isPlant = side === 'plants'

  // Play card deal sound on mount
  useEffect(() => {
    soundManager.playCardDrop()
  }, [])

  const toggleSelect = (index: number) => {
    if (isFlipping) return
    soundManager.playCardPickup()
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    )
  }

  const handleConfirm = () => {
    if (isFlipping) return

    if (selectedIndices.length > 0) {
      soundManager.playCardPickup()
      setIsFlipping(true)
      // Run 3D flip animation before dispatching
      setTimeout(() => {
        soundManager.playBuff()
        onConfirmMulligan(selectedIndices)
      }, 550)
    } else {
      soundManager.playCardDrop()
      onConfirmMulligan([])
    }
  }

  const startingCards = cards.slice(0, 4)

  return (
    <div className="pvz-modal-backdrop mulligan-screen-backdrop" role="dialog" aria-modal="true">
      {/* Dynamic Background Rays */}
      <div className="mulligan-ambient-rays" aria-hidden="true" />

      <div className={`mulligan-screen-card ${side}-theme`}>
        {/* Comic Header Title */}
        <div className="mulligan-comic-header">
          <div className="mulligan-title-ribbon">
            <span className="ribbon-icon">🃏</span>
            <h1 className="mulligan-comic-title">BỐC BÀI ĐẦU TRẬN</h1>
            <span className="ribbon-icon">✨</span>
          </div>
          <p className="mulligan-sub-guidance">
            Chạm vào lá bài bạn muốn đổi để rút lá khác trong bộ bài, sau đó ấn <strong>Xác nhận</strong>!
          </p>
        </div>

        {/* 4 Starting Minions/Tricks Grid */}
        <div className="mulligan-cards-stage">
          <div className="mulligan-cards-row">
            {startingCards.map((card, index) => {
              const isSelectedForRedraw = selectedIndices.includes(index)
              const cardFlipping = isFlipping && isSelectedForRedraw

              return (
                <div
                  key={`${card.id}-${index}`}
                  className={`mulligan-card-slot-wrap ${
                    isSelectedForRedraw ? 'is-marked-redraw' : 'is-marked-keep'
                  } ${cardFlipping ? 'is-card-flipping' : ''}`}
                  onClick={() => toggleSelect(index)}
                  title={isSelectedForRedraw ? 'Nhấn để giữ lại lá bài này' : 'Nhấn để đổi lấy lá bài mới'}
                >
                  <div className="card-flipper-3d">
                    {/* Front Face: The Card */}
                    <div className="card-flipper-front">
                      <Card
                        card={card}
                        isPlayable={true}
                        size="md"
                        showTooltip={false}
                        interactive={false}
                      />

                      {/* Redraw Cross Overlay with Red Stamp */}
                      {isSelectedForRedraw && (
                        <div className="mulligan-cross-overlay">
                          <div className="mulligan-red-stamp">
                            <span className="mulligan-stamp-text">✕ ĐỔI BÀI</span>
                          </div>
                          <div className="cross-badge-circle">
                            <span className="cross-badge-icon">❌</span>
                          </div>
                          <span className="cross-badge-label">ĐỔI LÁ NÀY</span>
                        </div>
                      )}

                      {/* Kept Status Cue */}
                      {!isSelectedForRedraw && (
                        <div className="mulligan-keep-pill">
                          <span className="keep-check-icon">✓</span>
                          <span className="keep-label">GIỮ LẠI</span>
                        </div>
                      )}
                    </div>

                    {/* Back Face: Card Back during 3D flip animation */}
                    <div className="card-flipper-back">
                      <div className="pvz-card-back-pattern">
                        <span className="card-back-emblem">{isPlant ? '🌱' : '🧟'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 5th Card: Guaranteed Superpower Card Showcase */}
        {superpower && (
          <div className="mulligan-superpower-showcase">
            <div className="sp-showcase-halo" />
            <div className="sp-showcase-badge">
              <span className="sp-icon">⚡</span>
              <span className="sp-badge-text">SIÊU NĂNG LỰC KHỞI ĐẦU (0 COST)</span>
            </div>
            <div className="sp-showcase-item">
              <div className="sp-card-thumbnail">
                {superpower.image ? (
                  <img
                    src={superpower.image}
                    alt={superpower.name}
                    className="sp-thumb-img"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                ) : (
                  <span className="sp-fallback-icon">🛡️</span>
                )}
              </div>
              <div className="sp-details-col">
                <span className="sp-name-line">{superpower.name}</span>
                <span className="sp-desc-line">
                  {superpower.description || 'Lá bài Siêu Năng Lực cố định luôn sẵn sàng trên tay!'}
                </span>
              </div>
              <div className="sp-fixed-tag">
                <span>CỐ ĐỊNH</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mulligan-actions-bar">
          <button
            className={`pvz-btn mulligan-confirm-action-btn ${
              selectedIndices.length > 0 ? 'has-redraws' : 'keep-all'
            } ${isPlant ? 'plant-confirm' : 'zombie-confirm'}`}
            onClick={handleConfirm}
            disabled={isFlipping}
          >
            <span className="btn-sheen-sweep" />
            <span className="confirm-btn-icon">
              {selectedIndices.length > 0 ? '🔄' : '⚔️'}
            </span>
            <div className="confirm-btn-text">
              <span className="confirm-main-title">
                {selectedIndices.length > 0
                  ? `XÁC NHẬN ĐỔI ${selectedIndices.length} LÁ BÀI (MULLIGAN)`
                  : 'GIỮ NGUYÊN BÀI & VÀO TRẬN!'}
              </span>
              <span className="confirm-sub-title">
                {selectedIndices.length > 0
                  ? 'Rút lại các lá bài mới từ bộ bài'
                  : 'Sẵn sàng chiến đấu ngay lập tức'}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default MulliganScreen
