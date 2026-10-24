import React from 'react'
import type { Side } from '../../engine/types'

export interface GameOverModalProps {
  winner: Side
  plantHeroName?: string
  zombieHeroName?: string
  plantHeroAvatar?: string
  zombieHeroAvatar?: string
  turnCount?: number
  onRematch: () => void
  onMainMenu?: () => void
  onHeroSelect?: () => void
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  winner,
  plantHeroName = 'Green Shadow',
  zombieHeroName = 'Super Brainz',
  plantHeroAvatar = '/assets/heroes/plants/Green Shadow.png',
  zombieHeroAvatar = '/assets/heroes/zombies/Super Brainz.png',
  turnCount = 1,
  onRematch,
  onMainMenu,
  onHeroSelect,
}) => {
  const isPlants = winner === 'plants'
  const winningHeroName = isPlants ? plantHeroName : zombieHeroName
  const winningHeroAvatar = isPlants ? plantHeroAvatar : zombieHeroAvatar

  return (
    <div className="pvz-modal-backdrop gameover-backdrop">
      <div className={`game-over-dialog ${winner}-winner-dialog`}>
        {/* Animated Celebration Burst */}
        <div className="game-over-header">
          <div className="victory-crown-badge">{isPlants ? '🏆' : '👑'}</div>
          <h1 className="game-over-title">
            {isPlants ? 'CHIẾN THẮNG RỰC RỠ!' : 'ZOMBIES THỐNG TRỊ!'}
          </h1>
          <p className="game-over-subtitle">
            {isPlants
              ? `Tướng [${winningHeroName}] đã xuất sắc đập tan kế hoạch của Dr. Zomboss!`
              : `Tướng [${winningHeroName}] đã thành công thâu tóm toàn bộ khu vườn!`}
          </p>
        </div>

        {/* Winning Hero Art Showcase */}
        <div className="game-over-art-wrap">
          <div className={`winner-avatar-glow-ring ${winner}-ring`}>
            <img
              src={winningHeroAvatar}
              alt={winningHeroName}
              className="winner-hero-img"
              onError={(e) => {
                e.currentTarget.src = isPlants
                  ? '/assets/heroes/plants/Green Shadow.png'
                  : '/assets/heroes/zombies/Super Brainz.png'
              }}
            />
          </div>
          <span className="winner-hero-title-tag">{winningHeroName}</span>
        </div>

        {/* Match Statistics */}
        <div className="game-over-stats-panel">
          <div className="stat-pill-item">
            <span className="stat-label">LƯỢT ĐẤU</span>
            <span className="stat-val">{turnCount} Rounds</span>
          </div>
          <div className="stat-pill-item">
            <span className="stat-label">PHE THẮNG</span>
            <span className="stat-val">{isPlants ? '🌱 PLANTS' : '🧟 ZOMBIES'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="game-over-actions">
          <button className="pvz-btn primary-menu-btn rematch-action-btn" onClick={onRematch}>
            🔄 TÁI ĐẤU NGAY
          </button>
          {onHeroSelect && (
            <button className="pvz-btn secondary-menu-btn heroselect-action-btn" onClick={onHeroSelect}>
              🦸 ĐỔI ANH HÙNG
            </button>
          )}
          {onMainMenu && (
            <button className="pvz-btn deck-builder-menu-btn mainmenu-action-btn" onClick={onMainMenu}>
              🏠 VỀ MENU CHÍNH
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default GameOverModal
