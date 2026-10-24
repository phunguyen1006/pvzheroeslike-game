import React, { useState } from 'react'
import type { Minion as MinionType } from '../../engine/types'
import { ASSET_MANIFEST } from '../../data/assetsManifest'

export interface MinionSlotProps {
  minion: MinionType | null
  side: 'plants' | 'zombies'
  isTeamUp?: boolean
  isActiveLane?: boolean
  isEligibleTarget?: boolean
  unmetReason?: string
  onClick?: () => void
  onDropCard?: (cardId: string) => void
}

export const MinionSlot: React.FC<MinionSlotProps> = ({
  minion,
  side,
  isTeamUp = false,
  isActiveLane = false,
  isEligibleTarget = false,
  unmetReason,
  onClick,
  onDropCard,
}) => {
  const [imgError, setImgError] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const isPlant = side === 'plants'

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (isEligibleTarget) {
      e.dataTransfer.dropEffect = 'move'
      setIsDragOver(true)
    }
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const cardId = e.dataTransfer.getData('text/plain')
    if (cardId && onDropCard) {
      onDropCard(cardId)
    }
  }

  // 1. EMPTY SLOT: Clean terrain, no dashed box or "Trống" text.
  // ONLY displays glowing drop ring when a playable card is active/hovering!
  if (!minion) {
    return (
      <div
        className={`minion-board-slot empty-minion-slot ${side}-slot ${
          isTeamUp ? 'teamup-slot' : ''
        } ${isEligibleTarget ? 'eligible-drop-target' : ''} ${
          isDragOver ? 'drag-over-active' : ''
        } ${isActiveLane ? 'active-lane-target' : ''}`}
        onClick={onClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        title={unmetReason || (isPlant ? 'Trồng Plant vào đây' : 'Thả Zombie vào đây')}
      >
        {/* Glowing Drop Target Ring (Only visible when card can be played here) */}
        {isEligibleTarget && (
          <div className={`board-drop-target-ring ${isPlant ? 'plant-drop-ring' : 'zombie-drop-ring'}`}>
            <div className="ring-pulse-halo" />
            <span className="ring-center-icon">{isPlant ? '🌱' : '🧟'}</span>
          </div>
        )}
      </div>
    )
  }

  // 2. OCCUPIED SLOT: Free-standing character sprite on the grass with foot badges
  const isDamaged = minion.currentHealth < minion.maxHealth
  const isBuffedAttack = minion.currentAttack > minion.baseAttack
  const isDebuffedAttack = minion.currentAttack < minion.baseAttack

  const portraitSrc = imgError
    ? ASSET_MANIFEST.ui.defaultCardPlaceholder || '/assets/board/Game_Logo.png'
    : minion.image || '/assets/board/Game_Logo.png'

  const isArmored = Boolean(minion.armored || minion.traits?.includes('armored'))
  const isDeadly = Boolean(minion.deadly || minion.traits?.includes('deadly'))
  const isBullseye = Boolean(minion.bullseye || minion.traits?.includes('bullseye'))
  const isStrikethrough = Boolean(minion.strikethrough || minion.traits?.includes('strikethrough'))
  const isFrenzy = Boolean(minion.frenzy || minion.traits?.includes('frenzy'))
  const isAntiHero = Boolean(
    minion.antiHero ||
    minion.traits?.includes('antiHero') ||
    (minion.traits as any)?.includes('anti-hero') ||
    (minion.traits as any)?.includes('antihero')
  )

  return (
    <div
      className={`minion-board-slot occupied-minion-slot ${side}-slot ${
        isTeamUp ? 'teamup-slot' : ''
      } ${minion.isFrozen ? 'is-frozen-slot' : ''} ${minion.isHit ? 'is-hit-pulse' : ''} ${
        minion.isAttacking ? 'is-attacking-lunge' : ''
      }`}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      title={`${minion.name} (${minion.currentAttack} Công / ${minion.currentHealth} Máu)`}
    >
      {/* Minion Character Stand: Free-standing with ground shadow */}
      <div className="minion-character-wrapper">
        {/* Ground Oval Shadow under character's feet */}
        <div className="minion-ground-shadow" />

        {/* Character Sprite Cutout */}
        <img
          src={portraitSrc}
          alt={minion.name}
          className="minion-character-sprite"
          onError={() => setImgError(true)}
        />

        {/* Frozen Ice Block Overlay */}
        {minion.isFrozen && (
          <div className="minion-frozen-ice-block">
            <img
              src={ASSET_MANIFEST.traits.Trait_Frozen}
              alt="Frozen"
              className="ice-crystal-sprite"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <div className="ice-frost-sheen" />
          </div>
        )}

        {/* Trait Indicators Badges Strip */}
        <div className="minion-active-traits-strip">
          {isArmored && (
            <div className="mini-trait-chip armored" title="Armored: Giảm 1 sát thương">
              <img src={ASSET_MANIFEST.traits.Trait_Armored} alt="Armored" className="mini-trait-img" />
            </div>
          )}
          {isDeadly && (
            <div className="mini-trait-chip deadly" title="Deadly: Tiêu diệt ngay mục tiêu">
              <img src={ASSET_MANIFEST.traits.Trait_Deadly} alt="Deadly" className="mini-trait-img" />
            </div>
          )}
          {isBullseye && (
            <div className="mini-trait-chip bullseye" title="Bullseye: Không sạc Super-Block đối thủ">
              <img src={ASSET_MANIFEST.traits.Trait_Bullseye} alt="Bullseye" className="mini-trait-img" />
            </div>
          )}
          {isStrikethrough && (
            <div className="mini-trait-chip strikethrough" title="Strikethrough: Bắn xuyên trúng Hero">
              <img src={ASSET_MANIFEST.traits.Trait_Strikethrough} alt="Strikethrough" className="mini-trait-img" />
            </div>
          )}
          {isFrenzy && (
            <div className="mini-trait-chip frenzy" title="Frenzy: Tấn công thêm khi hạ gục">
              <img src={ASSET_MANIFEST.traits.Trait_Frenzy} alt="Frenzy" className="mini-trait-img" />
            </div>
          )}
          {isAntiHero && (
            <div className="mini-trait-chip anti-hero" title="Anti-Hero: Tăng công vào lane trống">
              <img src={ASSET_MANIFEST.traits.Trait_AntiHero} alt="Anti-Hero" className="mini-trait-img" />
            </div>
          )}
        </div>
      </div>

      {/* Combat Stat Badges: Spiky Green Attack Burst & Glossy Red Heart */}
      <div className="minion-foot-stats-cluster">
        {/* Attack Starburst Badge */}
        <div
          className={`foot-stat-badge attack-starburst ${
            isBuffedAttack ? 'stat-boosted' : isDebuffedAttack ? 'stat-reduced' : ''
          }`}
        >
          <div className="starburst-shape" />
          <span className="foot-stat-digit">{minion.currentAttack}</span>
          <span className="starburst-mini-star">★</span>
        </div>

        {/* Health Heart Badge (Overlaps slightly on the right) */}
        <div
          className={`foot-stat-badge health-heart ${
            isDamaged ? 'stat-damaged' : 'stat-normal'
          }`}
        >
          <img
            src={ASSET_MANIFEST.traits.Resource_Health_Heart}
            alt="HP"
            className="foot-heart-icon"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <span className="foot-stat-digit">{minion.currentHealth}</span>
        </div>
      </div>
    </div>
  )
}

export default MinionSlot
