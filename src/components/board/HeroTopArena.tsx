import React, { useState, useEffect, useRef } from 'react'
import type { HeroState, Side, Phase } from '../../engine/types'
import { ASSET_MANIFEST } from '../../data/assetsManifest'
import { soundManager } from '../../audio/SoundManager'

export interface HeroTopArenaProps {
  hero: HeroState
  side: Side
  opponentHandCount?: number
  phase: Phase
  isHurt?: boolean
  floatingDamage?: string
  isTargetable?: boolean
  onHeroClick?: () => void
  onOpenCombatLog: () => void
  unreadLogCount?: number
  isMuted?: boolean
  onToggleMute?: () => void
  onReturnHome?: () => void
}

export const HeroTopArena: React.FC<HeroTopArenaProps> = ({
  hero,
  side,
  opponentHandCount = 4,
  phase,
  isHurt = false,
  floatingDamage,
  isTargetable = false,
  onHeroClick,
  onOpenCombatLog,
  unreadLogCount = 0,
  isMuted = false,
  onToggleMute,
  onReturnHome,
}) => {
  const isZombie = side === 'zombies'
  const maxBlocks = 3
  const remainingBlocks = Math.max(0, maxBlocks - (hero.blockCount || 0))
  const blockMeterVal = hero.blockMeter || 0
  const isShieldReady = hero.isShieldActive || blockMeterVal >= 8

  // Visual feedback when Opponent Super-Block meter charges (1-3 segments bouncing & flashing)
  const [activeChargeRoll, setActiveChargeRoll] = useState<number | null>(null)
  const [flashingSegments, setFlashingSegments] = useState<number[]>([])
  const prevMeterRef = useRef(blockMeterVal)

  useEffect(() => {
    const prev = prevMeterRef.current
    if (blockMeterVal > prev && prev < 8) {
      const diff = Math.min(3, blockMeterVal - prev)
      setActiveChargeRoll(diff)
      const chargedList: number[] = []
      for (let i = prev; i < blockMeterVal && i < 8; i++) {
        chargedList.push(i)
      }
      setFlashingSegments(chargedList)
      soundManager.playBlockCharge(diff)

      const timer = setTimeout(() => {
        setActiveChargeRoll(null)
        setFlashingSegments([])
      }, 1000)

      prevMeterRef.current = blockMeterVal
      return () => clearTimeout(timer)
    }
    prevMeterRef.current = blockMeterVal
  }, [blockMeterVal])

  const isCurrentTurnActive = isZombie
    ? phase === 'ZOMBIE_PLAY' || phase === 'ZOMBIE_TRICKS'
    : phase === 'PLANT_PLAY'

  return (
    <div className={`pvz-top-arena-zone ${side}-top-zone ${isHurt ? 'hero-top-is-hurt' : ''}`}>
      {/* 1. Top Horizon Bar: Opponent Face-down Hand + Quick Action Controls */}
      <div className="top-horizon-controls-bar">
        {/* Left: Opponent Cards Backs (peeking from top edge) & Combat Log Button */}
        <div className="top-left-group">
          {/* Menu / Home Icon Button */}
          <button
            className="arena-icon-btn home-return-btn"
            onClick={onReturnHome}
            title="Về Menu chính"
          >
            🏠
          </button>

          {/* Combat Log Drawer Trigger Button (💬) */}
          <button
            className="arena-icon-btn chat-log-btn"
            onClick={onOpenCombatLog}
            title="Nhật ký giao tranh (Combat Feed)"
          >
            💬
            {unreadLogCount > 0 && (
              <span className="chat-unread-badge">{unreadLogCount}</span>
            )}
          </button>

          {/* Opponent Face-down Hand Cards Fan */}
          <div className="opponent-peeking-hand" title={`${opponentHandCount} lá bài trên tay đối thủ`}>
            {Array.from({ length: Math.min(6, Math.max(1, opponentHandCount)) }).map((_, i) => (
              <div
                key={i}
                className="opponent-card-back"
                style={{
                  transform: `rotate(${(i - 1.5) * 5}deg) translateY(${Math.abs(i - 1.5) * 2}px)`,
                }}
              >
                <div className="card-back-pattern" />
              </div>
            ))}
          </div>
        </div>

        {/* Center: Phase Tracker Pill */}
        <div className="top-center-phase-pill">
          <span className="phase-turn-dot" />
          <span className="phase-title-text">
            {phase === 'ZOMBIE_PLAY'
              ? '🧟 Zombie ra quân'
              : phase === 'PLANT_PLAY'
              ? '🌱 Lượt của Plant'
              : phase === 'ZOMBIE_TRICKS'
              ? '⚡ Zombie Tricks'
              : phase === 'FIGHT'
              ? '⚔️ GIAO TRANH!'
              : 'Chuẩn bị'}
          </span>
        </div>

        {/* Right: Sound Toggle & Settings */}
        <div className="top-right-group">
          <button
            className="arena-icon-btn sound-toggle-btn"
            onClick={onToggleMute}
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {/* 2. Opponent Podium: Hero Standing in Stadium Dirt Pit with Crest Shield, Resource & Superpower Dial */}
      <div
        className={`opponent-hero-podium ${isTargetable ? 'is-targetable-hero' : ''}`}
        onClick={onHeroClick}
        style={{ cursor: isTargetable ? 'crosshair' : 'default' }}
        title={isTargetable ? 'Click để tấn công Hero đối thủ bằng Trick!' : undefined}
      >
        {/* Dirt Pit Crater Background */}
        <div className="hero-dirt-crater opponent-dirt-crater" />

        {/* Hero Character Sprite */}
        <div className={`hero-standing-character ${isCurrentTurnActive ? 'hero-turn-focus' : ''}`}>
          <img
            src={hero.avatar || '/assets/board/Game_Logo.png'}
            alt={hero.name}
            className="hero-full-sprite"
            onError={(e) => {
              e.currentTarget.src = isZombie
                ? '/assets/heroes/zombies/Super Brainz.png'
                : '/assets/heroes/plants/Green Shadow.png'
            }}
          />

          {/* Floating Damage Number */}
          {floatingDamage && (
            <div className="hero-floating-damage-burst">{floatingDamage}</div>
          )}
        </div>

        {/* Opponent Vitals Cluster: Crest Shield HP + Super-Block Shields + Resource Orb + Superpower Dial */}
        <div className="opponent-vitals-cluster">
          {/* Crest Shield with Glossy Heart HP */}
          <div className="hero-crest-shield opponent-crest-shield">
            <div className="crest-shield-frame">
              <div className="crest-heart-glow" />
              <img
                src={ASSET_MANIFEST.traits.Resource_Health_Heart}
                alt="Health"
                className="crest-heart-img"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              <span className="crest-hp-number">{hero.hp}</span>
            </div>

            {/* 3 Super-Block Shield Pips underneath */}
            <div className="crest-block-shields" title={`${remainingBlocks}/3 Lượt Super-Block`}>
              {Array.from({ length: maxBlocks }).map((_, i) => {
                const isCharged = i < remainingBlocks
                return (
                  <div
                    key={i}
                    className={`block-shield-pip ${isCharged ? 'shield-lit' : 'shield-broken'}`}
                  >
                    🛡️
                  </div>
                )
              })}
            </div>
          </div>

          {/* Resource Orb (Brain for Zombie, Sun for Plant) */}
          <div className={`hero-resource-orb ${isZombie ? 'brain-orb' : 'sun-orb'}`}>
            {isZombie ? (
              <img
                src={ASSET_MANIFEST.traits.Resource_Brain}
                alt="Brains"
                className="resource-orb-icon"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              <span className="resource-orb-sun-symbol">☀️</span>
            )}
            <span className="resource-orb-digit">
              {isZombie ? hero.brains : hero.sun}
            </span>
          </div>

          {/* Opponent Superpower Device / 8-Segment Gauge with Charge Animation */}
          <div
            className={`hero-superpower-device opponent-superpower-device ${
              isShieldReady ? 'device-shield-active' : ''
            } ${activeChargeRoll !== null ? 'device-is-charging' : ''}`}
            title={`Super-Block Gauge đối thủ: ${blockMeterVal}/8 Vạch (${remainingBlocks}/3 Shields)`}
          >
            {/* Floating 1-3 Roll Number Badge (Pop-up on Meter Charge) */}
            {activeChargeRoll !== null && (
              <div
                className="superpower-roll-bounce-badge opponent-roll-badge"
                key={`opp-roll-${activeChargeRoll}-${blockMeterVal}`}
              >
                <span className="roll-symbol">⚡</span>
                <span className="roll-val">+{activeChargeRoll}</span>
              </div>
            )}

            <div className="superpower-outer-dial opponent-outer-dial">
              {Array.from({ length: 8 }).map((_, i) => {
                const isFilled = i < blockMeterVal
                const isNewlyCharged = flashingSegments.includes(i)
                const isLastFilled = i === blockMeterVal - 1

                return (
                  <div
                    key={i}
                    className={`dial-segment-pip segment-${i} ${
                      isFilled ? 'segment-lit opponent-segment-lit' : 'segment-dim'
                    } ${
                      isNewlyCharged
                        ? 'segment-charging-flash'
                        : isLastFilled
                        ? 'segment-pulse'
                        : ''
                    }`}
                    style={{
                      transform: `rotate(${i * 45}deg)`,
                    }}
                  >
                    <div className="segment-nub" />
                  </div>
                )
              })}

              {/* Central Superpower / Shield Emblem */}
              <div className={`dial-center-core ${activeChargeRoll !== null ? 'core-charge-pulse' : ''}`}>
                {isShieldReady ? (
                  <div className="core-shield-burst-active">
                    <span className="burst-icon">🛡️</span>
                    <span className="burst-glow-ring" />
                  </div>
                ) : (
                  <div className="core-shield-idle">
                    <span className="core-meter-text">{blockMeterVal}/8</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HeroTopArena
