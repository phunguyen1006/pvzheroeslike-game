import React from 'react'
import { BlockMeter } from './BlockMeter'
import type { HeroState, Side } from '../engine/types'
import { ASSET_MANIFEST } from '../data/assetsManifest'

export interface HeroHUDProps {
  hero: HeroState
  side: Side
  floatingDamage?: string
  isCurrentTurnActive?: boolean
  isHurt?: boolean
}

// Map class string to asset
const CLASS_ICON_MAP: Record<string, string> = {
  Guardian: ASSET_MANIFEST.traits.Plant_Class_Guardian,
  Kabloom: ASSET_MANIFEST.traits.Plant_Class_Kabloom,
  'Mega-Grow': ASSET_MANIFEST.traits.Plant_Class_MegaGrow,
  Smarty: ASSET_MANIFEST.traits.Plant_Class_Smarty,
  Solar: ASSET_MANIFEST.traits.Plant_Class_Solar,
  Beastly: ASSET_MANIFEST.traits.Zombie_Class_Beastly,
  Brainy: ASSET_MANIFEST.traits.Zombie_Class_Brainy,
  Crazy: ASSET_MANIFEST.traits.Zombie_Class_Crazy,
  Hearty: ASSET_MANIFEST.traits.Zombie_Class_Hearty,
  Sneaky: ASSET_MANIFEST.traits.Zombie_Class_Sneaky,
}

export const HeroHUD: React.FC<HeroHUDProps> = ({
  hero,
  side,
  floatingDamage,
  isCurrentTurnActive = false,
  isHurt = false,
}) => {
  const isPlant = side === 'plants'
  const hpPercent = Math.max(0, Math.min(100, (hero.hp / hero.maxHp) * 100))
  const isLowHp = hero.hp <= 6

  return (
    <div
      className={`pvz-hero-hud ${side}-hero-hud ${isCurrentTurnActive ? 'is-turn-active' : ''} ${
        isLowHp ? 'is-low-hp' : ''
      } ${isHurt ? 'hero-is-hurt-shake' : ''}`}
    >
      {/* Hero Avatar & Frame */}
      <div className="hero-portrait-frame-wrapper">
        <div className={`hero-portrait-border ${isHurt ? 'portrait-hit-glow' : ''}`}>
          <img
            src={hero.avatar || '/assets/board/Game_Logo.png'}
            alt={hero.name}
            className="hero-avatar-image"
            onError={(e) => {
              e.currentTarget.src = '/assets/board/Game_Logo.png'
            }}
          />
        </div>

        {/* Floating Combat Damage Number */}
        {floatingDamage && (
          <div className={`floating-damage-bubble ${side}-damage-bubble`}>
            {floatingDamage}
          </div>
        )}

        {/* Class Emblems Pill Badge */}
        {hero.classes && hero.classes.length > 0 && (
          <div className="hero-classes-overlay">
            {hero.classes.map((cls) => {
              const iconSrc = CLASS_ICON_MAP[cls]
              return iconSrc ? (
                <img
                  key={cls}
                  src={iconSrc}
                  alt={cls}
                  className="hero-class-mini-icon"
                  title={cls}
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              ) : null
            })}
          </div>
        )}
      </div>

      {/* Hero Info Column */}
      <div className="hero-stats-content">
        <div className="hero-title-row">
          <span className="hero-name-label">{hero.name}</span>
          <span className={`hero-faction-tag ${side}-tag`}>
            {isPlant ? 'PLANTS' : 'ZOMBIES'}
          </span>
        </div>

        {/* Vital Gauges Row (Health & Resource) */}
        <div className="hero-vitals-row">
          {/* Health Pill */}
          <div className={`vital-pill health-pill ${isLowHp ? 'vital-danger' : ''}`}>
            <img
              src={ASSET_MANIFEST.traits.Resource_Health_Heart}
              alt="HP"
              className="vital-icon heart-icon"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <div className="vital-numeric-group">
              <span className="vital-current-val">{hero.hp}</span>
              <span className="vital-denom-val">/{hero.maxHp}</span>
            </div>
            {/* Health Bar Fill */}
            <div className="vital-bar-track">
              <div
                className="vital-bar-fill health-bar-fill"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* Resource Pill (Sun or Brains) */}
          <div className={`vital-pill resource-pill ${isPlant ? 'sun-pill' : 'brain-pill'}`}>
            {isPlant ? (
              <span className="vital-icon sun-emoji">☀️</span>
            ) : (
              <img
                src={ASSET_MANIFEST.traits.Resource_Brain}
                alt="Brains"
                className="vital-icon brain-icon"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            )}
            <div className="vital-numeric-group">
              <span className="vital-current-val">
                {isPlant ? hero.sun : hero.brains}
              </span>
              <span className="vital-denom-val">
                /{isPlant ? hero.maxSun : hero.maxBrains}
              </span>
            </div>
          </div>
        </div>

        {/* Super-Block 8-Segment Gauge */}
        <div className="hero-blockmeter-row">
          <BlockMeter
            side={side}
            meter={hero.blockMeter}
            isShieldActive={hero.isShieldActive}
            blockCount={hero.blockCount}
          />
        </div>
      </div>
    </div>
  )
}

export default HeroHUD
