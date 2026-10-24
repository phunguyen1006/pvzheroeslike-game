import React, { useEffect } from 'react'
import type { Side } from '../../engine/types'
import { soundManager } from '../../audio/SoundManager'

export interface GameOverModalProps {
  winner: Side
  plantHeroName?: string
  zombieHeroName?: string
  plantHeroAvatar?: string
  zombieHeroAvatar?: string
  turnCount?: number
  totalDamageDealt?: number
  minionsDefeated?: number
  starsWon?: number
  onRematch: () => void
  onMainMenu?: () => void
  onHeroSelect?: () => void
  onCampaignMap?: () => void
}

/**
 * GameOverModal (Màn hình Kết thúc Trận đấu Chuẩn PvZ Heroes)
 * - Victory: Pháo hoa rực rỡ, hạt giấy ăn mừng (confetti), vương miện vàng, hào quang thắng lợi
 * - Defeat: Mây đen u ám, bia mộ đổ vỡ, mưa u buồn, ánh tím lạnh lẽo
 * - Bảng thống kê trận đấu: Số Lượt đấu, Sát thương đã gây ra, Minions đã tiêu diệt, Sao chiến dịch
 * - Các nút điều hướng: Rematch, Đổi Hero, Về Menu Chính, Bản Đồ Chiến Dịch
 * - Tích hợp âm thanh Web Audio API soundManager
 */
export const GameOverModal: React.FC<GameOverModalProps> = ({
  winner,
  plantHeroName = 'Green Shadow',
  zombieHeroName = 'Super Brainz',
  plantHeroAvatar = '/assets/heroes/plants/Green Shadow.png',
  zombieHeroAvatar = '/assets/heroes/zombies/Super Brainz.png',
  turnCount = 1,
  totalDamageDealt,
  minionsDefeated,
  starsWon,
  onRematch,
  onMainMenu,
  onHeroSelect,
  onCampaignMap,
}) => {
  const isPlants = winner === 'plants'
  const winningHeroName = isPlants ? plantHeroName : zombieHeroName
  const winningHeroAvatar = isPlants ? plantHeroAvatar : zombieHeroAvatar

  // Calculated match stats fallbacks if not provided
  const displayDamage = totalDamageDealt ?? (20 + (turnCount - 1) * 4)
  const displayMinions = minionsDefeated ?? Math.max(2, Math.floor(turnCount * 1.5))

  useEffect(() => {
    if (isPlants) {
      soundManager.playVictory()
    } else {
      soundManager.playDefeat()
    }
  }, [isPlants])

  return (
    <div className={`pvz-modal-backdrop gameover-screen-backdrop ${isPlants ? 'is-victory' : 'is-defeat'}`} role="dialog" aria-modal="true">
      {/* 1. Victory Confetti / Defeat Gloom VFX */}
      {isPlants ? (
        <div className="victory-confetti-container" aria-hidden="true">
          <div className="confetti-streamer c-1" />
          <div className="confetti-streamer c-2" />
          <div className="confetti-streamer c-3" />
          <div className="confetti-streamer c-4" />
          <div className="confetti-streamer c-5" />
          <div className="confetti-streamer c-6" />
          <div className="confetti-streamer c-7" />
          <div className="confetti-streamer c-8" />
          <div className="victory-firework-burst burst-1" />
          <div className="victory-firework-burst burst-2" />
        </div>
      ) : (
        <div className="defeat-gloom-container" aria-hidden="true">
          <div className="defeat-dark-clouds" />
          <div className="gloom-rain-drop r-1" />
          <div className="gloom-rain-drop r-2" />
          <div className="gloom-rain-drop r-3" />
          <div className="gloom-rain-drop r-4" />
          <div className="gloom-rain-drop r-5" />
          <div className="defeat-shattered-tombstone">🪦</div>
        </div>
      )}

      {/* 2. Main Dialog Card */}
      <div className={`gameover-card ${isPlants ? 'victory-card' : 'defeat-card'}`}>
        {/* Header Ribbon & Crown */}
        <div className="gameover-header-cluster">
          <div className="gameover-emblem-badge">
            <span className="badge-icon">{isPlants ? '👑' : '💀'}</span>
            <div className="emblem-shine-ring" />
          </div>

          <h1 className="gameover-main-title">
            {isPlants ? 'CHIẾN THẮNG RỰC RỠ!' : 'THẤT BẠI...'}
          </h1>

          <p className="gameover-sub-message">
            {isPlants
              ? `Tướng [${winningHeroName}] đã xuất sắc đập tan dã tâm của bầy Zombie và bảo vệ thành công Khu Vườn!`
              : `Bầy Zombie của Tướng [${winningHeroName}] đã tràn vào nhà! Hãy củng cố lực lượng và phục thù!`}
          </p>
        </div>

        {/* Winning/Defeated Hero Portrait Stage */}
        <div className="gameover-hero-stage">
          <div className="hero-stage-spotlight" />
          <div className={`hero-avatar-frame ${isPlants ? 'plant-frame' : 'zombie-frame'}`}>
            <img
              src={winningHeroAvatar}
              alt={winningHeroName}
              className="gameover-avatar-img"
              onError={(e) => {
                e.currentTarget.src = isPlants
                  ? '/assets/heroes/plants/Green Shadow.png'
                  : '/assets/heroes/zombies/Super Brainz.png'
              }}
            />
            <div className="hero-faction-crest">
              {isPlants ? '🌻' : '🧠'}
            </div>
          </div>
          <div className="hero-victory-label-tag">
            <span className="tag-faction">{isPlants ? 'QUÁN QUÂN' : 'CHIẾN THẮNG'}</span>
            <span className="tag-name">{winningHeroName}</span>
          </div>
        </div>

        {/* Match Performance Statistics Panel */}
        <div className="gameover-stats-board">
          <div className="stats-board-title">
            <span>📊 THỐNG KÊ TRẬN ĐẤU</span>
          </div>
          <div className="stats-grid-cols">
            <div className="stat-card-box">
              <span className="stat-box-icon">⏳</span>
              <span className="stat-box-num">{turnCount}</span>
              <span className="stat-box-label">LƯỢT ĐẤU (ROUNDS)</span>
            </div>
            <div className="stat-card-box">
              <span className="stat-box-icon">💥</span>
              <span className="stat-box-num">{displayDamage}</span>
              <span className="stat-box-label">TỔNG SÁT THƯƠNG</span>
            </div>
            <div className="stat-card-box">
              <span className="stat-box-icon">⚔️</span>
              <span className="stat-box-num">{displayMinions}</span>
              <span className="stat-box-label">QUÂN ĐÃ TIÊU DIỆT</span>
            </div>
            {starsWon !== undefined && (
              <div className="stat-card-box stat-stars-box">
                <span className="stat-box-icon">⭐</span>
                <span className="stat-box-num">{starsWon} / 3</span>
                <span className="stat-box-label">SAO CHIẾN DỊCH</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Decision Buttons */}
        <div className="gameover-decision-actions">
          {onCampaignMap && (
            <button className="pvz-btn gameover-campaign-btn" onClick={onCampaignMap}>
              <span className="btn-icon">🗺️</span>
              <span className="btn-label">BẢN ĐỒ CHIẾN DỊCH</span>
            </button>
          )}

          <button
            className={`pvz-btn gameover-primary-btn ${isPlants ? 'btn-victory-gold' : 'btn-defeat-purple'}`}
            onClick={onRematch}
            autoFocus
          >
            <span className="btn-shine-sweep" />
            <span className="btn-icon">🔄</span>
            <span className="btn-label">TÁI ĐẤU NGAY (REMATCH)</span>
          </button>

          {onHeroSelect && (
            <button className="pvz-btn gameover-secondary-btn" onClick={onHeroSelect}>
              <span className="btn-icon">🦸</span>
              <span className="btn-label">ĐỔI ANH HÙNG</span>
            </button>
          )}

          {onMainMenu && (
            <button className="pvz-btn gameover-menu-btn" onClick={onMainMenu}>
              <span className="btn-icon">🏠</span>
              <span className="btn-label">VỀ TRANG CHỦ</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default GameOverModal
