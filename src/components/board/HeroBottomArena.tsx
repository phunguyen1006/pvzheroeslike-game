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
  isUsingSuperpower?: boolean
  isSuperBlockTriggered?: boolean
  floatingDamage?: string
  activeEmote?: { text: string; emoji?: string } | null
  onDismissEmote?: () => void
  onSuperBlockClick?: () => void
  winner?: Side | null
  isWinner?: boolean
  isDefeated?: boolean
}

export const HeroBottomArena: React.FC<HeroBottomArenaProps> = ({
  hero,
  side,
  phase,
  isHurt = false,
  isUsingSuperpower = false,
  isSuperBlockTriggered = false,
  floatingDamage,
  activeEmote,
  onDismissEmote,
  onSuperBlockClick,
  winner,
  isWinner = winner === side,
  isDefeated = Boolean(winner && winner !== side),
}) => {
  const isPlant = side === 'plants'
  const isLowHp = hero.hp <= 5 && hero.hp > 0
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
  const [showShieldShatter, setShowShieldShatter] = useState(false)
  const prevMeterRef = useRef(blockMeterVal)
  const prevShieldActiveRef = useRef(hero.isShieldActive)

  // Trigger shatter & 1.2s protective energy bubble on Super-Block
  useEffect(() => {
    if ((hero.isShieldActive && !prevShieldActiveRef.current) || isSuperBlockTriggered) {
      setShowShieldShatter(true)
      soundManager.playShieldClang()
      const timer = setTimeout(() => setShowShieldShatter(false), 1300)
      prevShieldActiveRef.current = hero.isShieldActive
      return () => clearTimeout(timer)
    }
    prevShieldActiveRef.current = hero.isShieldActive
  }, [hero.isShieldActive, isSuperBlockTriggered])

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
        <div
          className={`hero-standing-character player-hero-character ${
            isTurnActive ? 'hero-turn-focus' : ''
          } ${isHurt ? 'hero-portrait-hurt-shake' : ''} ${
            isUsingSuperpower ? 'hero-portrait-superpower-glow' : ''
          } ${isLowHp ? 'hero-portrait-low-hp' : ''} ${
            isWinner ? 'hero-winner-radiance' : ''
          } ${isDefeated ? 'hero-defeated-gloom' : ''}`}
        >
          {/* Victory Gold Aura & Crown */}
          {isWinner && (
            <div className="hero-victory-crown-wrapper" aria-hidden="true">
              <div className="hero-victory-crown" title="Chiến thắng!">👑</div>
              <div className="hero-victory-aura" />
              <div className="hero-winner-halo" />
            </div>
          )}

          {/* Defeat Screen Crack Overlay */}
          {isDefeated && (
            <div className="hero-defeat-cracked-overlay" aria-hidden="true">
              <div className="crack-line crack-line-1" />
              <div className="crack-line crack-line-2" />
              <div className="crack-line crack-line-3" />
              <div className="defeat-skull-badge">☠️</div>
            </div>
          )}

          {/* Hurt Red Glowing Rim Flash */}
          {isHurt && <div className="hero-hurt-red-rim-flash" aria-hidden="true" />}

          {/* Low HP Red Pulsating Danger Vignette & Alarm */}
          {isLowHp && (
            <div className="hero-danger-vignette-overlay" aria-hidden="true">
              <div className="danger-pulsing-edge" />
              <div className="danger-warning-badge">⚠️ NGUY HIỂM!</div>
            </div>
          )}

          {/* Superpower Glowing Aura Ring */}
          {isUsingSuperpower && (
            <div className="hero-superpower-radiant-aura" aria-hidden="true">
              <div className="superpower-aura-ring" />
              <div className="superpower-sparkle-burst" />
            </div>
          )}

          {/* Super-Block 1.2s Protective Radiant Energy Bubble */}
          {showShieldShatter && (
            <div className={`hero-energy-bubble-shield ${side}-energy-bubble`} aria-hidden="true">
              <div className="energy-bubble-sphere" />
              <div className="energy-bubble-sheen" />
              <div className="energy-bubble-pulse-ring ring-1" />
              <div className="energy-bubble-pulse-ring ring-2" />
            </div>
          )}

          {/* Super-Block Shattering Energy Shield & Glass Particles */}
          {showShieldShatter && (
            <div className="shield-shatter-particles-container" aria-hidden="true">
              <div className="shield-glass-shard shard-1" />
              <div className="shield-glass-shard shard-2" />
              <div className="shield-glass-shard shard-3" />
              <div className="shield-glass-shard shard-4" />
              <div className="shield-glass-shard shard-5" />
              <div className="shield-glass-shard shard-6" />
              <div className="shield-glass-shard shard-7" />
              <div className="shield-glass-shard shard-8" />
              <div className="shield-burst-flash" />
              <div className="shield-block-comic-badge">BLOCKED!</div>
            </div>
          )}

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
            <div className="hero-floating-damage-burst">
              {floatingDamage.startsWith('-') ? floatingDamage : `-${floatingDamage}`}
            </div>
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
