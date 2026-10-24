import React, { useState } from 'react'
import type { Card as CardType } from '../../engine/types'
import { ASSET_MANIFEST } from '../../data/assetsManifest'

export interface CardProps {
  card: CardType
  isSelected?: boolean
  isPlayable?: boolean
  onClick?: () => void
  onHover?: (hovered: boolean) => void
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
  interactive?: boolean
}

// Map trait names to sliced sprite assets
const TRAIT_ICON_MAP: Record<string, string> = {
  Armored: ASSET_MANIFEST.traits.Trait_Armored,
  armored: ASSET_MANIFEST.traits.Trait_Armored,
  'Anti-Hero': ASSET_MANIFEST.traits.Trait_AntiHero,
  antiHero: ASSET_MANIFEST.traits.Trait_AntiHero,
  Bullseye: ASSET_MANIFEST.traits.Trait_Bullseye,
  bullseye: ASSET_MANIFEST.traits.Trait_Bullseye,
  Deadly: ASSET_MANIFEST.traits.Trait_Deadly,
  deadly: ASSET_MANIFEST.traits.Trait_Deadly,
  Frenzy: ASSET_MANIFEST.traits.Trait_Frenzy,
  frenzy: ASSET_MANIFEST.traits.Trait_Frenzy,
  Frozen: ASSET_MANIFEST.traits.Trait_Frozen,
  frozen: ASSET_MANIFEST.traits.Trait_Frozen,
  Strikethrough: ASSET_MANIFEST.traits.Trait_Strikethrough,
  strikethrough: ASSET_MANIFEST.traits.Trait_Strikethrough,
}

// Explanations for tooltip inspection
const TRAIT_INFO: Record<string, { label: string; desc: string; icon?: string }> = {
  amphibious: {
    label: 'Amphibious (Lội nước)',
    desc: 'Có thể đặt và chiến đấu trên Water Lane (Hồ bơi).',
    icon: '🌊',
  },
  armored: {
    label: 'Armored (Bọc giáp)',
    desc: 'Giảm 1 sát thương nhận vào từ mọi nguồn.',
    icon: ASSET_MANIFEST.traits.Trait_Armored,
  },
  bullseye: {
    label: 'Bullseye (Bắn chuẩn)',
    desc: 'Sát thương gây ra không sạc vạch Super-Block của đối phương.',
    icon: ASSET_MANIFEST.traits.Trait_Bullseye,
  },
  deadly: {
    label: 'Deadly (Chết chóc)',
    desc: 'Bất kỳ sát thương nào gây ra đều tiêu diệt ngay mục tiêu.',
    icon: ASSET_MANIFEST.traits.Trait_Deadly,
  },
  frenzy: {
    label: 'Frenzy (Cuồng nộ)',
    desc: 'Khi tiêu diệt được một Plant, Zombie lập tức tấn công thêm một lần nữa.',
    icon: ASSET_MANIFEST.traits.Trait_Frenzy,
  },
  strikethrough: {
    label: 'Strikethrough (Xuyên thấu)',
    desc: 'Tấn công cả Minion đối diện và bắn xuyên trúng thẳng Hero đối thủ.',
    icon: ASSET_MANIFEST.traits.Trait_Strikethrough,
  },
  teamUp: {
    label: 'Team-Up (Đồng đội)',
    desc: 'Có thể đặt chung 1 lane với Plant khác. Plant phía trước sẽ che chắn.',
    icon: '🤝',
  },
  antiHero: {
    label: 'Anti-Hero (Đột kích)',
    desc: 'Tăng thêm sát thương khi làn đối diện không có đối thủ.',
    icon: ASSET_MANIFEST.traits.Trait_AntiHero,
  },
  freeze: {
    label: 'Freeze (Đóng băng)',
    desc: 'Làm mục tiêu bị đóng băng, bỏ lỡ lượt tấn công tiếp theo.',
    icon: ASSET_MANIFEST.traits.Trait_Frozen,
  },
}

// Map hero class to asset badge
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

export const Card: React.FC<CardProps> = ({
  card,
  isSelected = false,
  isPlayable = true,
  onClick,
  onHover,
  size = 'md',
  showTooltip = true,
  interactive = true,
}) => {
  const [imageFailed, setImageFailed] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const isPlant = card.side === 'plants'
  const isSuperpower = card.type === 'superpower'
  const isTrick = card.type === 'trick'
  const isEnvironment = card.type === 'environment'
  const isMinion = !isTrick && !isEnvironment && !isSuperpower

  const cardImageSrc = imageFailed
    ? ASSET_MANIFEST.ui.defaultCardPlaceholder || '/assets/board/Game_Logo.png'
    : card.image || '/assets/board/Game_Logo.png'

  const classIcon = card.heroClass ? CLASS_ICON_MAP[card.heroClass] : null

  // Normalize traits list
  const activeTraits: string[] = []
  if (card.amphibious) activeTraits.push('amphibious')
  if (card.armored) activeTraits.push('armored')
  if (card.bullseye) activeTraits.push('bullseye')
  if (card.deadly) activeTraits.push('deadly')
  if (card.frenzy) activeTraits.push('frenzy')
  if (card.strikethrough) activeTraits.push('strikethrough')
  if (card.teamUp) activeTraits.push('teamUp')
  if (card.freeze) activeTraits.push('freeze')
  if (card.antiHero) activeTraits.push('antiHero')
  if (card.traits) {
    card.traits.forEach(t => {
      const lower = String(t).toLowerCase()
      if (!activeTraits.some(at => at.toLowerCase() === lower)) {
        activeTraits.push(String(t))
      }
    })
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
    onHover?.(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    onHover?.(false)
  }

  return (
    <div
      className={`pvz-card-wrapper card-size-${size} ${interactive ? 'interactive' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`pvz-card ${card.side}-card type-${card.type} ${isSelected ? 'is-selected' : ''} ${
          isPlayable ? 'is-playable' : 'is-unplayable'
        }`}
        onClick={isPlayable && interactive ? onClick : undefined}
      >
        {/* Outer Frame Decoration (Plant leaf / Zombie metallic plate) */}
        <div className="card-frame-border" />

        {/* Cost Orb (Sun for plants, Brain for zombies, Free 0 for Superpowers) */}
        <div className={`card-cost-orb ${isSuperpower ? 'superpower-orb' : isPlant ? 'sun-orb' : 'brain-orb'}`}>
          {!isPlant && !isSuperpower && (
            <img
              src={ASSET_MANIFEST.traits.Resource_Brain}
              alt="Brains"
              className="orb-bg-icon"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          )}
          {isSuperpower && <span className="orb-bg-star">⭐</span>}
          <span className="cost-number">{card.cost}</span>
        </div>

        {/* Class Emblem at Top Right */}
        {classIcon && (
          <div className="card-class-badge" title={card.heroClass}>
            <img
              src={classIcon}
              alt={card.heroClass}
              className="class-badge-img"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          </div>
        )}

        {/* Card Artwork */}
        <div className="card-artwork-frame">
          <img
            src={cardImageSrc}
            alt={card.name}
            className="card-artwork-image"
            onError={() => setImageFailed(true)}
          />
          {imageFailed && (
            <div className="card-artwork-fallback">
              <span>{card.name.slice(0, 3).toUpperCase()}</span>
            </div>
          )}

          {/* Superpower Prismatic Foil */}
          {isSuperpower && <div className="superpower-foil-overlay" />}
        </div>

        {/* Name Banner Ribbon */}
        <div className="card-ribbon-banner">
          <span className="card-title-text" title={card.name}>
            {card.name}
          </span>
        </div>

        {/* Trait Badges Row */}
        {activeTraits.length > 0 && (
          <div className="card-traits-strip">
            {activeTraits.slice(0, 3).map((traitKey) => {
              const iconUrl = TRAIT_ICON_MAP[traitKey] || TRAIT_INFO[traitKey.toLowerCase()]?.icon
              const isEmoji = iconUrl && !iconUrl.startsWith('/')
              return (
                <div key={traitKey} className="trait-icon-bubble" title={traitKey}>
                  {iconUrl ? (
                    isEmoji ? (
                      <span className="trait-emoji">{iconUrl}</span>
                    ) : (
                      <img
                        src={iconUrl}
                        alt={traitKey}
                        className="trait-bubble-img"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    )
                  ) : (
                    <span className="trait-emoji">⚡</span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Minion Stats Orbs (Attack Sword / Health Heart) */}
        {isMinion && (
          <div className="card-stats-row">
            {/* Attack Badge (Jagged Sword Burst) */}
            <div className="card-stat-orb attack-orb" title={`Attack: ${card.attack}`}>
              <span className="stat-spikes">💥</span>
              <span className="stat-value">{card.attack}</span>
            </div>

            {/* Health Badge (Red Heart) */}
            <div className="card-stat-orb health-orb" title={`Health: ${card.health}`}>
              <img
                src={ASSET_MANIFEST.traits.Resource_Health_Heart}
                alt="HP"
                className="heart-icon-img"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              <span className="stat-value">{card.health}</span>
            </div>
          </div>
        )}

        {/* Card Type Tag for Tricks / Environments */}
        {(isTrick || isEnvironment || isSuperpower) && (
          <div className={`card-type-tag ${card.type}-tag`}>
            <span>{isSuperpower ? 'SUPERPOWER' : isTrick ? 'TRICK' : 'ENVIRONMENT'}</span>
          </div>
        )}
      </div>

      {/* Hover Inspection Tooltip Popover */}
      {showTooltip && isHovered && (
        <div className={`card-inspect-popover ${card.side}-popover`}>
          <div className="popover-header">
            <span className="popover-title">{card.name}</span>
            <span className="popover-cost">
              {isPlant ? '☀️' : '🧠'} {card.cost} {isPlant ? 'Sun' : 'Brains'}
            </span>
          </div>

          <div className="popover-meta">
            <span className="popover-category">
              {isSuperpower
                ? 'Superpower'
                : isTrick
                ? 'Trick'
                : isEnvironment
                ? 'Environment'
                : 'Minion'}
            </span>
            {card.heroClass && <span className="popover-class">• {card.heroClass}</span>}
            {card.laneRequirement && card.laneRequirement !== 'any' && (
              <span className="popover-lane">• {card.laneRequirement.toUpperCase()} LANE</span>
            )}
          </div>

          {/* Ability or Flavor Description */}
          {card.description && (
            <p className="popover-description">{card.description}</p>
          )}

          {/* Active Trait Explanations */}
          {activeTraits.length > 0 && (
            <div className="popover-traits-list">
              {activeTraits.map((t) => {
                const info = TRAIT_INFO[t.toLowerCase()]
                return (
                  <div key={t} className="popover-trait-item">
                    <span className="popover-trait-name">
                      {info?.label || t}:
                    </span>{' '}
                    <span className="popover-trait-desc">
                      {info?.desc || 'Đặc tính chiến đấu đặc biệt.'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {isMinion && (
            <div className="popover-stats-footer">
              <span className="footer-stat attack-stat">🗡️ {card.attack} Công</span>
              <span className="footer-stat health-stat">❤️ {card.health} Máu</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Card
