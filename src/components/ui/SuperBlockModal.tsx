import React from 'react'
import type { Card as CardType, Side } from '../../engine/types'
import { Card } from '../cards/Card'

export interface SuperBlockModalProps {
  side: Side
  superpower: CardType
  onPlaySuperpower: () => void
  onSaveSuperpower: () => void
}

export const SuperBlockModal: React.FC<SuperBlockModalProps> = ({
  side,
  superpower,
  onPlaySuperpower,
  onSaveSuperpower,
}) => {
  const isPlant = side === 'plants'

  return (
    <div className="pvz-modal-backdrop superblock-backdrop">
      <div className={`superblock-dialog-card ${side}-dialog`}>
        {/* Header with animated shield rays */}
        <div className="superblock-header">
          <div className="shield-burst-halo">🛡️</div>
          <h2 className="superblock-title">SUPER-BLOCK ĐƯỢC KÍCH HOẠT!</h2>
          <p className="superblock-subtitle">
            Khiên bảo vệ đã chặn 100% sát thương! Bạn nhận được Siêu năng lực miễn phí:
          </p>
        </div>

        {/* Superpower Card Spotlight */}
        <div className="superblock-card-spotlight">
          <Card
            card={superpower}
            isPlayable={true}
            size="lg"
            showTooltip={false}
            interactive={false}
          />
        </div>

        {/* Description Banner */}
        <div className="superblock-description-box">
          <span className="sp-name-highlight">{superpower.name}</span>
          <p className="sp-desc-text">{superpower.description || 'Siêu năng lực huyền thoại!'}</p>
        </div>

        {/* Decision Actions */}
        <div className="superblock-action-buttons">
          <button
            className={`pvz-btn play-sp-btn ${isPlant ? 'plant-btn' : 'zombie-btn'}`}
            onClick={onPlaySuperpower}
          >
            ⚡ DÙNG NGAY BÂY GIỜ (0 {isPlant ? 'Sun' : 'Brain'})
          </button>
          <button
            className="pvz-btn save-sp-btn"
            onClick={onSaveSuperpower}
          >
            📥 Lưu vào tay bài
          </button>
        </div>
      </div>
    </div>
  )
}

export default SuperBlockModal
