import React from 'react'
import type { HeroState, Side, Phase } from '../../engine/types'
import { ASSET_MANIFEST } from '../../data/assetsManifest'

export interface HeroBottomArenaProps {
  hero: HeroState
  side: Side
  phase: Phase
  isHurt?: boolean
  floatingDamage?: string
  onSuperBlockClick?: () => void
}

export const HeroBottomArena: React.FC<HeroBottomArenaProps> = ({
  hero,
  side,
  phase,
  isHurt = false,
  floatingDamage,
  onSuperBlockClick,
}) => {
  const isPlant = side === 'plants'
  const maxBlocks = 3
  const remainingBlocks = Math.max(0, maxBlocks - (hero.blockCount || 0))
  const isTurnActive = isPlant
    ? phase === 'PLANT_PLAY'
    : phase === 'ZOMBIE_PLAY' || phase === 'ZOMBIE_TRICKS'

  const blockMeterVal = hero.blockMeter || 0
  const isShieldReady = hero.isShieldActive || blockMeterVal >= 8

  return (
    <div className={`pvz-bottom-arena-zone ${side}-bottom-zone ${isHurt ? 'hero-bottom-is-hurt' : ''}`}>
      {/* Garden Dirt Pit Background */}
      <div className="hero-dirt-crater player-dirt-crater" />

      {/* Hero Podium Flex Container */}
      <div className="player-hero-podium">
        {/* Left Side: Resource Orb + Crest Shield HP + 3 Shield Pips */}
        <div className="player-vitals-cluster">
          {/* Resource Orb (Sun for Plant, Brain for Zombie) */}
          <div
            className={`hero-resource-orb player-resource-orb ${isPlant ? 'sun-orb' : 'brain-orb'}`}
            title={`${isPlant ? hero.sun : hero.brains} tài nguyên sẵn sàng`}
          >
            <div className="sun-radiance-ring" />
            {isPlant ? (
              <span className="resource-orb-sun-symbol">☀️</span>
            ) : (
              <img
                src={ASSET_MANIFEST.traits.Resource_Brain}
                alt="Brains"
                className="resource-orb-icon"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            )}
            <span className="resource-orb-digit">
              {isPlant ? hero.sun : hero.brains}
            </span>
          </div>

          {/* Hero Crest Shield with 3D Red Heart */}
          <div className="hero-crest-shield player-crest-shield">
            <div className="crest-shield-frame">
              <div className="crest-heart-glow" />
              <img
                src={ASSET_MANIFEST.traits.Resource_Health_Heart}
                alt="HP"
                className="crest-heart-img"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              <span className="crest-hp-number">{hero.hp}</span>
            </div>

            {/* 3 Super-Block Shield Pips */}
            <div className="crest-block-shields" title={`${remainingBlocks}/3 Lượt Super-Block`}>
              {Array.from({ length: maxBlocks }).map((_, i) => {
                const isCharged = i < remainingBlocks
                return (
                  <div
                    key={i}
                    className={`block-shield-pip ${isCharged ? 'shield-lit plant-shield-lit' : 'shield-broken'}`}
                  >
                    🛡️
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Center: Hero Standing Sprite */}
        <div className={`hero-standing-character player-hero-character ${isTurnActive ? 'hero-turn-focus' : ''}`}>
          <img
            src={hero.avatar || '/assets/board/Game_Logo.png'}
            alt={hero.name}
            className="hero-full-sprite player-sprite"
            onError={(e) => {
              e.currentTarget.src = isPlant
                ? '/assets/heroes/plants/Green Shadow.png'
                : '/assets/heroes/zombies/Super Brainz.png'
            }}
          />

          {/* Floating Damage Number */}
          {floatingDamage && (
            <div className="hero-floating-damage-burst">{floatingDamage}</div>
          )}
        </div>

        {/* Right Side: Circular Superpower Device / 8-Segment Gauge */}
        <div
          className={`hero-superpower-device ${isShieldReady ? 'device-shield-active' : ''}`}
          onClick={isShieldReady ? onSuperBlockClick : undefined}
          title={`Super-Block Gauge: ${blockMeterVal}/8 Vạch`}
        >
          {/* Circular Metallic Rim with 8 Segment Arcs */}
          <div className="superpower-outer-dial">
            {Array.from({ length: 8 }).map((_, i) => {
              const isFilled = i < blockMeterVal
              const isLastFilled = i === blockMeterVal - 1
              return (
                <div
                  key={i}
                  className={`dial-segment-pip segment-${i} ${isFilled ? 'segment-lit' : 'segment-dim'} ${
                    isLastFilled ? 'segment-pulse' : ''
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
            <div className="dial-center-core">
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
  )
}

export default HeroBottomArena
