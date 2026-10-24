import React, { useState, useEffect, useRef } from 'react'
import type { HeroState, Side, Phase } from '../../engine/types'
import { ASSET_MANIFEST } from '../../data/assetsManifest'
import { soundManager } from '../../audio/SoundManager'
import { ComicSpeechBubble } from '../hero/ComicSpeechBubble'

export interface HeroBottomArenaProps {
  hero: HeroState
  side: Side
  phase: Phase
  isHurt?: boolean
  floatingDamage?: string
  activeEmote?: { text: string; emoji?: string } | null
  onDismissEmote?: () => void
  onSuperBlockClick?: () => void
}

export const HeroBottomArena: React.FC<HeroBottomArenaProps> = ({
  hero,
  side,
  phase,
  isHurt = false,
  floatingDamage,
  activeEmote,
  onDismissEmote,
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

  // Visual feedback when Super-Block meter charges (1-3 segments bouncing & flashing)
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

          {/* Comic Speech Bubble */}
          {activeEmote && (
            <ComicSpeechBubble
              text={activeEmote.text}
              emoji={activeEmote.emoji}
              side={side}
              onDismiss={onDismissEmote}
            />
          )}
        </div>

        {/* Right Side: Circular Superpower Device / 8-Segment Gauge */}
        <div
          className={`hero-superpower-device player-superpower-device ${
            isShieldReady ? 'device-shield-active' : ''
          } ${activeChargeRoll !== null ? 'device-is-charging' : ''}`}
          onClick={isShieldReady ? onSuperBlockClick : undefined}
          title={`Super-Block Gauge: ${blockMeterVal}/8 Vạch (${remainingBlocks}/3 Shields)`}
        >
          {/* Floating 1-3 Roll Number Badge (Pop-up on Meter Charge) */}
          {activeChargeRoll !== null && (
            <div
              className="superpower-roll-bounce-badge"
              key={`sp-roll-${activeChargeRoll}-${blockMeterVal}`}
            >
              <span className="roll-symbol">⚡</span>
              <span className="roll-val">+{activeChargeRoll}</span>
            </div>
          )}

          {/* Circular Metallic Rim with 8 Segment Arcs */}
          <div className="superpower-outer-dial">
            {Array.from({ length: 8 }).map((_, i) => {
              const isFilled = i < blockMeterVal
              const isNewlyCharged = flashingSegments.includes(i)
              const isLastFilled = i === blockMeterVal - 1

              return (
                <div
                  key={i}
                  className={`dial-segment-pip segment-${i} ${isFilled ? 'segment-lit' : 'segment-dim'} ${
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
  )
}

export default HeroBottomArena
