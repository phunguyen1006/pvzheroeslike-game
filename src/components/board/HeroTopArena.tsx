import React from 'react'
import type { HeroState, Side, Phase } from '../../engine/types'
import { ASSET_MANIFEST } from '../../data/assetsManifest'

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

      {/* 2. Opponent Podium: Hero Standing in Stadium Dirt Pit with Crest Shield & Resource */}
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

        {/* Opponent Vitals Cluster: Crest Shield HP + Super-Block Shields + Resource Orb */}
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
        </div>
      </div>
    </div>
  )
}

export default HeroTopArena
