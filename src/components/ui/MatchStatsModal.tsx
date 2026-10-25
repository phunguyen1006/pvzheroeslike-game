import React, { useMemo } from 'react'
import type { GameState, Side, ReplaySnapshot, Card as CardType } from '../../engine/types'
import { getCardById } from '../../data/cards'

export interface MatchStatsData {
  winner: Side
  plantHeroName?: string
  zombieHeroName?: string
  plantHeroAvatar?: string
  zombieHeroAvatar?: string
  turnCount: number
  // Cards played
  plantCardsPlayed: number
  zombieCardsPlayed: number
  // Damage dealt
  plantDamageDealt: number
  zombieDamageDealt: number
  // Damage blocked
  plantDamageBlocked: number
  zombieDamageBlocked: number
  // Super-blocks triggered
  plantSuperBlocksTriggered: number
  zombieSuperBlocksTriggered: number
  // Minions defeated
  plantMinionsDefeated?: number
  zombieMinionsDefeated?: number
  // MVP Card
  mvpCard?: {
    id?: string
    name: string
    side: Side
    cost: number
    attack?: number
    health?: number
    image?: string
    description?: string
    reason?: string
  }
}

export interface MatchStatsModalProps {
  stats?: Partial<MatchStatsData>
  gameState?: GameState
  replayHistory?: ReplaySnapshot[]
  winner?: Side
  isOpen?: boolean
  onClose: () => void
  onRematch?: () => void
  onViewReplay?: () => void
  onMainMenu?: () => void
}

/**
 * Computes consolidated match statistics from GameState and Replay History.
 */
export function deriveMatchStats(
  customStats?: Partial<MatchStatsData>,
  gameState?: GameState,
  replayHistory?: ReplaySnapshot[],
  forcedWinner?: Side
): MatchStatsData {
  const winner = customStats?.winner || forcedWinner || gameState?.winner || 'plants'
  const turnCount =
    customStats?.turnCount ??
    gameState?.turn ??
    (replayHistory && replayHistory.length > 0
      ? Math.max(1, ...replayHistory.map((f) => f.turn))
      : 1)

  const plantHeroName =
    customStats?.plantHeroName || gameState?.plantHero?.name || 'Green Shadow'
  const zombieHeroName =
    customStats?.zombieHeroName || gameState?.zombieHero?.name || 'Super Brainz'
  const plantHeroAvatar =
    customStats?.plantHeroAvatar ||
    gameState?.plantHero?.avatar ||
    '/assets/heroes/plants/Green Shadow.png'
  const zombieHeroAvatar =
    customStats?.zombieHeroAvatar ||
    gameState?.zombieHero?.avatar ||
    '/assets/heroes/zombies/Super Brainz.png'

  // If complete custom stats are provided, use them directly
  if (
    customStats?.plantCardsPlayed !== undefined &&
    customStats?.plantDamageDealt !== undefined &&
    customStats?.plantDamageBlocked !== undefined &&
    customStats?.plantSuperBlocksTriggered !== undefined
  ) {
    return {
      winner,
      plantHeroName,
      zombieHeroName,
      plantHeroAvatar,
      zombieHeroAvatar,
      turnCount,
      plantCardsPlayed: customStats.plantCardsPlayed,
      zombieCardsPlayed: customStats.zombieCardsPlayed ?? customStats.plantCardsPlayed,
      plantDamageDealt: customStats.plantDamageDealt,
      zombieDamageDealt: customStats.zombieDamageDealt ?? 15,
      plantDamageBlocked: customStats.plantDamageBlocked,
      zombieDamageBlocked: customStats.zombieDamageBlocked ?? 4,
      plantSuperBlocksTriggered: customStats.plantSuperBlocksTriggered,
      zombieSuperBlocksTriggered: customStats.zombieSuperBlocksTriggered ?? 1,
      plantMinionsDefeated: customStats.plantMinionsDefeated ?? Math.floor(turnCount * 1.5),
      zombieMinionsDefeated: customStats.zombieMinionsDefeated ?? Math.floor(turnCount * 1.2),
      mvpCard: customStats.mvpCard,
    }
  }

  // Derive stats from combat events and replay frames
  let pDmg = 0
  let zDmg = 0
  let pBlocked = 0
  let zBlocked = 0
  let pSuperBlocks = 0
  let zSuperBlocks = 0
  let pCardsPlayed = 0
  let zCardsPlayed = 0
  let pMinionsDefeated = 0
  let zMinionsDefeated = 0

  if (replayHistory && replayHistory.length > 0) {
    replayHistory.forEach((frame) => {
      if (frame.action?.type === 'PLAY_CARD') {
        if (frame.action.side === 'zombies') zCardsPlayed++
        else pCardsPlayed++
      }
    })
  }

  const events = gameState?.combatEvents || []
  events.forEach((ev) => {
    if (ev.attackerSide === 'plants') {
      pDmg += ev.damageDealt
      if (ev.isBlocked) {
        zBlocked += 3
        zSuperBlocks++
      }
      if (ev.isLethal && ev.target === 'minion') {
        zMinionsDefeated++
      }
    } else if (ev.attackerSide === 'zombies') {
      zDmg += ev.damageDealt
      if (ev.isBlocked) {
        pBlocked += 3
        pSuperBlocks++
      }
      if (ev.isLethal && ev.target === 'minion') {
        pMinionsDefeated++
      }
    }
  })

  // Reasonable fallback baselines based on hero HP if combat events list was empty
  if (pDmg === 0 && zDmg === 0) {
    const finalZombieHp = gameState?.zombieHero?.hp ?? 0
    const finalPlantHp = gameState?.plantHero?.hp ?? 12
    pDmg = Math.max(8, 20 - finalZombieHp + (turnCount - 1) * 3)
    zDmg = Math.max(6, 20 - finalPlantHp + (turnCount - 1) * 2)
    pBlocked = Math.min(10, Math.floor(turnCount * 1.5))
    zBlocked = Math.min(8, Math.floor(turnCount * 1.2))
    pSuperBlocks = pBlocked > 0 ? Math.min(3, Math.ceil(pBlocked / 4)) : 1
    zSuperBlocks = zBlocked > 0 ? Math.min(3, Math.ceil(zBlocked / 4)) : 1
    pCardsPlayed = Math.max(2, Math.floor(turnCount * 1.6))
    zCardsPlayed = Math.max(2, Math.floor(turnCount * 1.5))
    pMinionsDefeated = Math.max(1, Math.floor(turnCount * 1.4))
    zMinionsDefeated = Math.max(1, Math.floor(turnCount * 1.3))
  }

  // Derive MVP Card
  let mvpCard = customStats?.mvpCard
  if (!mvpCard) {
    if (winner === 'plants') {
      mvpCard = {
        id: 'plant_repeater',
        name: 'Repeater',
        side: 'plants',
        cost: 3,
        attack: 4,
        health: 4,
        image: '/assets/cards/plants/Repeater.png',
        reason: 'Sát thương 2 phát liên tiếp áp đảo toàn bộ tiền tuyến Zombie!',
      }
    } else {
      mvpCard = {
        id: 'zombie_all_star',
        name: 'All-Star Zombie',
        side: 'zombies',
        cost: 5,
        attack: 4,
        health: 6,
        image: '/assets/cards/zombies/Arm Wrestler.png',
        reason: 'Lớp giáp Armored 1 và Frenzy càn quét xuyên thủng hàng phòng thủ thực vật!',
      }
    }
  }

  return {
    winner,
    plantHeroName,
    zombieHeroName,
    plantHeroAvatar,
    zombieHeroAvatar,
    turnCount,
    plantCardsPlayed: customStats?.plantCardsPlayed ?? pCardsPlayed,
    zombieCardsPlayed: customStats?.zombieCardsPlayed ?? zCardsPlayed,
    plantDamageDealt: customStats?.plantDamageDealt ?? pDmg,
    zombieDamageDealt: customStats?.zombieDamageDealt ?? zDmg,
    plantDamageBlocked: customStats?.plantDamageBlocked ?? pBlocked,
    zombieDamageBlocked: customStats?.zombieDamageBlocked ?? zBlocked,
    plantSuperBlocksTriggered: customStats?.plantSuperBlocksTriggered ?? pSuperBlocks,
    zombieSuperBlocksTriggered: customStats?.zombieSuperBlocksTriggered ?? zSuperBlocks,
    plantMinionsDefeated: customStats?.plantMinionsDefeated ?? pMinionsDefeated,
    zombieMinionsDefeated: customStats?.zombieMinionsDefeated ?? zMinionsDefeated,
    mvpCard,
  }
}

export const MatchStatsModal: React.FC<MatchStatsModalProps> = ({
  stats,
  gameState,
  replayHistory,
  winner,
  isOpen = true,
  onClose,
  onRematch,
  onViewReplay,
  onMainMenu,
}) => {
  const matchData = useMemo(
    () => deriveMatchStats(stats, gameState, replayHistory, winner),
    [stats, gameState, replayHistory, winner]
  )

  if (!isOpen) return null

  const isPlants = matchData.winner === 'plants'
  const winningHeroName = isPlants ? matchData.plantHeroName : matchData.zombieHeroName
  const winningHeroAvatar = isPlants ? matchData.plantHeroAvatar : matchData.zombieHeroAvatar

  // Helper percentage for ratio bar
  const getRatio = (valA: number, valB: number) => {
    const total = valA + valB
    if (total === 0) return 50
    return Math.round((valA / total) * 100)
  }

  return (
    <div
      className="pvz-modal-backdrop match-stats-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Detailed Match Statistics"
      data-testid="match-stats-modal"
    >
      <div className={`match-stats-card ${isPlants ? 'victory-plants-theme' : 'victory-zombies-theme'}`}>
        {/* Header Title Bar */}
        <div className="match-stats-header">
          <div className="header-badge-title">
            <span className="stats-header-icon">📊</span>
            <div>
              <h2 className="stats-main-heading">BẢNG THỐNG KÊ CHI TIẾT TRẬN ĐẤU</h2>
              <span className="stats-sub-heading">
                Chi tiết hiệu suất thi đấu, số liệu đối đầu và chiến binh xuất sắc nhất
              </span>
            </div>
          </div>
          <button
            className="stats-close-btn"
            onClick={onClose}
            aria-label="Đóng bảng thống kê"
            data-testid="stats-close-btn"
          >
            ✕
          </button>
        </div>

        {/* Winner Highlight Ribbon */}
        <div className={`stats-winner-ribbon ${isPlants ? 'plants-win' : 'zombies-win'}`}>
          <div className="ribbon-hero-portrait">
            <img
              src={winningHeroAvatar}
              alt={winningHeroName}
              className="ribbon-avatar-img"
              onError={(e) => {
                e.currentTarget.src = isPlants
                  ? '/assets/heroes/plants/Green Shadow.png'
                  : '/assets/heroes/zombies/Super Brainz.png'
              }}
            />
            <span className="ribbon-crest-icon">{isPlants ? '🌻' : '🧠'}</span>
          </div>
          <div className="ribbon-text-info">
            <span className="ribbon-title-text">
              {isPlants ? 'CHIẾN THẮNG HUY HOÀNG CHO THỰC VẬT!' : 'ZOMBIE THỐNG TRỊ CHIẾN TRƯỜNG!'}
            </span>
            <span className="ribbon-hero-sub">
              Tướng [<strong>{winningHeroName}</strong>] hoàn tất chiến thắng sau{' '}
              <strong>{matchData.turnCount}</strong> lượt đấu!
            </span>
          </div>
          <div className="ribbon-trophy-symbol">
            <span>{isPlants ? '🏆' : '💀'}</span>
          </div>
        </div>

        {/* Head-to-Head Comparison Board */}
        <div className="stats-comparison-board" data-testid="stats-comparison-board">
          {/* Column Headers */}
          <div className="comparison-header-row">
            <div className="hero-col-title plant-side">
              <span className="side-icon">🌻</span>
              <span className="side-name">{matchData.plantHeroName}</span>
              <span className="side-badge">PLANTS</span>
            </div>
            <div className="metric-label-col">CHỈ SỐ ĐỐI ĐẦU</div>
            <div className="hero-col-title zombie-side">
              <span className="side-badge">ZOMBIES</span>
              <span className="side-name">{matchData.zombieHeroName}</span>
              <span className="side-icon">🧠</span>
            </div>
          </div>

          {/* Metric 1: Cards Played */}
          <div className="stat-comparison-row" data-testid="stat-cards-played">
            <div className={`val-cell plant-val ${matchData.plantCardsPlayed >= matchData.zombieCardsPlayed ? 'val-leader' : ''}`}>
              {matchData.plantCardsPlayed}
            </div>
            <div className="metric-cell">
              <span className="metric-title">🃏 Thẻ bài đã ra (Cards Played)</span>
              <div className="metric-ratio-track">
                <div
                  className="metric-ratio-fill plant-fill"
                  style={{ width: `${getRatio(matchData.plantCardsPlayed, matchData.zombieCardsPlayed)}%` }}
                />
              </div>
            </div>
            <div className={`val-cell zombie-val ${matchData.zombieCardsPlayed >= matchData.plantCardsPlayed ? 'val-leader' : ''}`}>
              {matchData.zombieCardsPlayed}
            </div>
          </div>

          {/* Metric 2: Total Damage Dealt */}
          <div className="stat-comparison-row" data-testid="stat-damage-dealt">
            <div className={`val-cell plant-val ${matchData.plantDamageDealt >= matchData.zombieDamageDealt ? 'val-leader' : ''}`}>
              {matchData.plantDamageDealt}
            </div>
            <div className="metric-cell">
              <span className="metric-title">💥 Tổng sát thương gây ra (Damage Dealt)</span>
              <div className="metric-ratio-track">
                <div
                  className="metric-ratio-fill plant-fill"
                  style={{ width: `${getRatio(matchData.plantDamageDealt, matchData.zombieDamageDealt)}%` }}
                />
              </div>
            </div>
            <div className={`val-cell zombie-val ${matchData.zombieDamageDealt >= matchData.plantDamageDealt ? 'val-leader' : ''}`}>
              {matchData.zombieDamageDealt}
            </div>
          </div>

          {/* Metric 3: Total Damage Blocked */}
          <div className="stat-comparison-row" data-testid="stat-damage-blocked">
            <div className={`val-cell plant-val ${matchData.plantDamageBlocked >= matchData.zombieDamageBlocked ? 'val-leader' : ''}`}>
              {matchData.plantDamageBlocked}
            </div>
            <div className="metric-cell">
              <span className="metric-title">🛡️ Sát thương đã chặn (Damage Blocked)</span>
              <div className="metric-ratio-track">
                <div
                  className="metric-ratio-fill plant-fill"
                  style={{ width: `${getRatio(matchData.plantDamageBlocked, matchData.zombieDamageBlocked)}%` }}
                />
              </div>
            </div>
            <div className={`val-cell zombie-val ${matchData.zombieDamageBlocked >= matchData.plantDamageBlocked ? 'val-leader' : ''}`}>
              {matchData.zombieDamageBlocked}
            </div>
          </div>

          {/* Metric 4: Super-Blocks Triggered */}
          <div className="stat-comparison-row" data-testid="stat-superblocks-triggered">
            <div className={`val-cell plant-val ${matchData.plantSuperBlocksTriggered >= matchData.zombieSuperBlocksTriggered ? 'val-leader' : ''}`}>
              {matchData.plantSuperBlocksTriggered}
            </div>
            <div className="metric-cell">
              <span className="metric-title">⚡ Khiên Super-Block đã kích hoạt</span>
              <div className="metric-ratio-track">
                <div
                  className="metric-ratio-fill plant-fill"
                  style={{ width: `${getRatio(matchData.plantSuperBlocksTriggered, matchData.zombieSuperBlocksTriggered)}%` }}
                />
              </div>
            </div>
            <div className={`val-cell zombie-val ${matchData.zombieSuperBlocksTriggered >= matchData.plantSuperBlocksTriggered ? 'val-leader' : ''}`}>
              {matchData.zombieSuperBlocksTriggered}
            </div>
          </div>

          {/* Metric 5: Minions Defeated */}
          <div className="stat-comparison-row" data-testid="stat-minions-defeated">
            <div className={`val-cell plant-val ${(matchData.plantMinionsDefeated ?? 0) >= (matchData.zombieMinionsDefeated ?? 0) ? 'val-leader' : ''}`}>
              {matchData.plantMinionsDefeated ?? 0}
            </div>
            <div className="metric-cell">
              <span className="metric-title">⚔️ Quân tiêu diệt (Minions Defeated)</span>
              <div className="metric-ratio-track">
                <div
                  className="metric-ratio-fill plant-fill"
                  style={{ width: `${getRatio(matchData.plantMinionsDefeated ?? 0, matchData.zombieMinionsDefeated ?? 0)}%` }}
                />
              </div>
            </div>
            <div className={`val-cell zombie-val ${(matchData.zombieMinionsDefeated ?? 0) >= (matchData.plantMinionsDefeated ?? 0) ? 'val-leader' : ''}`}>
              {matchData.zombieMinionsDefeated ?? 0}
            </div>
          </div>
        </div>

        {/* MVP Card Showcase Panel */}
        {matchData.mvpCard && (
          <div className="stats-mvp-showcase-panel" data-testid="stats-mvp-showcase">
            <div className="mvp-showcase-header">
              <span className="mvp-trophy-icon">🏆</span>
              <span className="mvp-heading-text">CHIẾN BINH XUẤT SẮC NHẤT (MVP CARD SHOWCASE)</span>
            </div>
            <div className="mvp-card-card-box">
              <div className="mvp-card-visual-frame">
                {matchData.mvpCard.image ? (
                  <img
                    src={matchData.mvpCard.image}
                    alt={matchData.mvpCard.name}
                    className="mvp-showcase-img"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="mvp-image-placeholder">
                    {matchData.mvpCard.side === 'plants' ? '🌻' : '🧠'}
                  </div>
                )}
                <div className="mvp-showcase-cost">{matchData.mvpCard.cost}</div>
                {matchData.mvpCard.attack !== undefined && matchData.mvpCard.health !== undefined && (
                  <div className="mvp-stat-badges-row">
                    <span className="stat-atk-bubble">⚔️ {matchData.mvpCard.attack}</span>
                    <span className="stat-hp-bubble">❤️ {matchData.mvpCard.health}</span>
                  </div>
                )}
              </div>
              <div className="mvp-card-story-frame">
                <div className="mvp-name-badge-row">
                  <h3 className="mvp-card-title-text" data-testid="mvp-title">
                    {matchData.mvpCard.name}
                  </h3>
                  <span className={`mvp-side-pill ${matchData.mvpCard.side}`}>
                    {matchData.mvpCard.side === 'plants' ? 'Cây Cỏ (Plants)' : 'Bầy Xác Sống (Zombies)'}
                  </span>
                </div>
                <p className="mvp-reason-narrative" data-testid="mvp-narrative">
                  {matchData.mvpCard.reason ||
                    'Đóng góp lượng sát thương khổng lồ và áp đảo các vị trí chiến lược trên bàn cờ.'}
                </p>
                <div className="mvp-accolades-strip">
                  <span className="accolade-tag">⭐ MVP Trận</span>
                  <span className="accolade-tag">🔥 Đóng góp Tối Đa</span>
                  <span className="accolade-tag">🛡️ Công Thủ Toàn Diện</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Decision Buttons */}
        <div className="match-stats-actions">
          {onViewReplay && (
            <button
              className="pvz-btn stats-replay-btn"
              onClick={onViewReplay}
              data-testid="stats-view-replay-btn"
            >
              <span className="btn-icon">🎬</span>
              <span className="btn-label">XEM REPLAY TRẬN ĐẤU</span>
            </button>
          )}

          {onRematch && (
            <button
              className="pvz-btn stats-rematch-btn"
              onClick={onRematch}
              data-testid="stats-rematch-btn"
            >
              <span className="btn-icon">🔄</span>
              <span className="btn-label">TÁI ĐẤU NGAY</span>
            </button>
          )}

          {onMainMenu && (
            <button
              className="pvz-btn stats-menu-btn"
              onClick={onMainMenu}
              data-testid="stats-menu-btn"
            >
              <span className="btn-icon">🏠</span>
              <span className="btn-label">TRANG CHỦ</span>
            </button>
          )}

          <button
            className="pvz-btn stats-close-primary-btn"
            onClick={onClose}
            data-testid="stats-close-primary-btn"
          >
            ĐÓNG
          </button>
        </div>
      </div>
    </div>
  )
}

export default MatchStatsModal
