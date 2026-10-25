import React, { useState, useEffect } from 'react'
import type { Side } from '../../engine/types'
import { soundManager } from '../../audio/SoundManager'

export interface DetailedMatchStats {
  plantDamageDealt?: number
  zombieDamageDealt?: number
  plantMinionsSummoned?: number
  zombieMinionsSummoned?: number
  plantTricksPlayed?: number
  zombieTricksPlayed?: number
  plantSuperBlocks?: number
  zombieSuperBlocks?: number
  plantHighestHit?: number
  zombieHighestHit?: number
  matchDurationSeconds?: number
}

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
  detailedStats?: DetailedMatchStats
  eventTicketsEarned?: {
    base: number
    boost: number
    total: number
    isBoosted: boolean
    heroName?: string
  }
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
  eventTicketsEarned,
  detailedStats,
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

  const [showDetailedStats, setShowDetailedStats] = useState(false)

  // Head-to-head detailed match metrics
  const plantDamage = detailedStats?.plantDamageDealt ?? (isPlants ? displayDamage : Math.max(12, displayDamage - 8))
  const zombieDamage = detailedStats?.zombieDamageDealt ?? (isPlants ? Math.max(10, displayDamage - 10) : displayDamage)

  const plantMinions = detailedStats?.plantMinionsSummoned ?? (isPlants ? Math.max(3, turnCount + 2) : Math.max(2, turnCount))
  const zombieMinions = detailedStats?.zombieMinionsSummoned ?? (isPlants ? Math.max(2, turnCount) : Math.max(3, turnCount + 2))

  const plantTricks = detailedStats?.plantTricksPlayed ?? Math.max(1, Math.floor(turnCount * 0.8))
  const zombieTricks = detailedStats?.zombieTricksPlayed ?? Math.max(1, Math.floor(turnCount * 0.9))

  const plantBlocks = detailedStats?.plantSuperBlocks ?? (isPlants ? Math.min(3, Math.floor(turnCount / 2)) : 1)
  const zombieBlocks = detailedStats?.zombieSuperBlocks ?? (isPlants ? 1 : Math.min(3, Math.floor(turnCount / 2)))

  const plantHighest = detailedStats?.plantHighestHit ?? (isPlants ? 6 : 4)
  const zombieHighest = detailedStats?.zombieHighestHit ?? (isPlants ? 4 : 6)

  const matchDuration = detailedStats?.matchDurationSeconds ?? (turnCount * 28)
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // Calculate comparison percentages for head-to-head comparison bars
  const getPlantPercent = (plantVal: number, zombieVal: number) => {
    const total = plantVal + zombieVal
    if (total === 0) return 50
    return Math.max(15, Math.min(85, Math.round((plantVal / total) * 100)))
  }

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

          {/* Toggle Button for Detailed Match Stats */}
          <div style={{ textAlign: 'center', margin: '8px 0' }}>
            <button
              className="gameover-detailed-stats-toggle-btn"
              onClick={() => setShowDetailedStats((prev) => !prev)}
              type="button"
            >
              <span>{showDetailedStats ? '📊 ẨN THỐNG KÊ CHI TIẾT' : '📊 XEM THỐNG KÊ CHI TIẾT TRẬN ĐẤU'}</span>
            </button>
          </div>

          {/* Head-to-Head Comparison Bars Board */}
          {showDetailedStats && (
            <div className="gameover-head-to-head-container">
              <div className="h2h-header-row">
                <span className="h2h-plant-hero-label">🌱 {plantHeroName}</span>
                <span style={{ color: '#facc15', fontSize: '0.8rem' }}>ĐỐI ĐẦU TRỰC TIẾP</span>
                <span className="h2h-zombie-hero-label">🧟 {zombieHeroName}</span>
              </div>

              {/* Metric 1: Total Damage Dealt */}
              <div className="h2h-metric-row">
                <div className="h2h-metric-title">
                  <span>{plantDamage}</span>
                  <span>TỔNG SÁT THƯƠNG GÂY RA</span>
                  <span>{zombieDamage}</span>
                </div>
                <div className="h2h-bar-track">
                  <div
                    className="h2h-plant-fill"
                    style={{ width: `${getPlantPercent(plantDamage, zombieDamage)}%` }}
                  />
                  <div
                    className="h2h-zombie-fill"
                    style={{ width: `${100 - getPlantPercent(plantDamage, zombieDamage)}%` }}
                  />
                </div>
              </div>

              {/* Metric 2: Minions Summoned */}
              <div className="h2h-metric-row">
                <div className="h2h-metric-title">
                  <span>{plantMinions}</span>
                  <span>MINION ĐÃ TRIỆU HỒI</span>
                  <span>{zombieMinions}</span>
                </div>
                <div className="h2h-bar-track">
                  <div
                    className="h2h-plant-fill"
                    style={{ width: `${getPlantPercent(plantMinions, zombieMinions)}%` }}
                  />
                  <div
                    className="h2h-zombie-fill"
                    style={{ width: `${100 - getPlantPercent(plantMinions, zombieMinions)}%` }}
                  />
                </div>
              </div>

              {/* Metric 3: Tricks Played */}
              <div className="h2h-metric-row">
                <div className="h2h-metric-title">
                  <span>{plantTricks}</span>
                  <span>TRICKS ĐÃ THI TRIỂN</span>
                  <span>{zombieTricks}</span>
                </div>
                <div className="h2h-bar-track">
                  <div
                    className="h2h-plant-fill"
                    style={{ width: `${getPlantPercent(plantTricks, zombieTricks)}%` }}
                  />
                  <div
                    className="h2h-zombie-fill"
                    style={{ width: `${100 - getPlantPercent(plantTricks, zombieTricks)}%` }}
                  />
                </div>
              </div>

              {/* Metric 4: Super-Blocks Triggered */}
              <div className="h2h-metric-row">
                <div className="h2h-metric-title">
                  <span>{plantBlocks} / 3</span>
                  <span>KÍCH HOẠT SUPER-BLOCK</span>
                  <span>{zombieBlocks} / 3</span>
                </div>
                <div className="h2h-bar-track">
                  <div
                    className="h2h-plant-fill"
                    style={{ width: `${getPlantPercent(plantBlocks, zombieBlocks)}%` }}
                  />
                  <div
                    className="h2h-zombie-fill"
                    style={{ width: `${100 - getPlantPercent(plantBlocks, zombieBlocks)}%` }}
                  />
                </div>
              </div>

              {/* Metric 5: Highest Single Hit */}
              <div className="h2h-metric-row">
                <div className="h2h-metric-title">
                  <span>{plantHighest}</span>
                  <span>SÁT THƯƠNG ĐƠN PHÁT LỚN NHẤT</span>
                  <span>{zombieHighest}</span>
                </div>
                <div className="h2h-bar-track">
                  <div
                    className="h2h-plant-fill"
                    style={{ width: `${getPlantPercent(plantHighest, zombieHighest)}%` }}
                  />
                  <div
                    className="h2h-zombie-fill"
                    style={{ width: `${100 - getPlantPercent(plantHighest, zombieHighest)}%` }}
                  />
                </div>
              </div>

              {/* Metric 6: Match Duration & Turns */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  paddingTop: '6px',
                  marginTop: '4px',
                }}
              >
                <span>⏱️ Thời lượng: {formatDuration(matchDuration)}</span>
                <span>🔄 Số lượt Turn: {turnCount}</span>
              </div>
            </div>
          )}

          {/* Event Tickets Reward Banner */}
          {eventTicketsEarned && eventTicketsEarned.total > 0 && (
            <div className="gameover-event-ticket-banner">
              <div className="ticket-banner-badge">
                <span className="ticket-icon">🎟️</span>
                <span className="ticket-amount">+{eventTicketsEarned.total} VÉ SỰ KIỆN</span>
              </div>
              {eventTicketsEarned.isBoosted && (
                <span className="ticket-boost-note">
                  ⚡ X2 Vé Tăng Tốc từ Hero [{eventTicketsEarned.heroName || 'Sự Kiện'}] (+{eventTicketsEarned.boost} Thưởng)!
                </span>
              )}
            </div>
          )}
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
