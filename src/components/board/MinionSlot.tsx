import React, { useState, useEffect, useRef } from 'react'
import type { Minion as MinionType } from '../../engine/types'
import { ASSET_MANIFEST } from '../../data/assetsManifest'
import { soundManager } from '../../audio/SoundManager'

export interface MinionSlotProps {
  minion: MinionType | null
  side: 'plants' | 'zombies'
  isTeamUp?: boolean
  isActiveLane?: boolean
  isEligibleTarget?: boolean
  unmetReason?: string
  isLanding?: boolean
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
  isLanding = false,
  onClick,
  onDropCard,
}) => {
  const [imgError, setImgError] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isShattering, setIsShattering] = useState(false)
  const wasGravestoneRef = useRef(Boolean(minion?.isGravestone))
  const isPlant = side === 'plants'

  // Trigger shatter visual & audio effect when Gravestone cracks open (revealed at Zombie Tricks)
  useEffect(() => {
    if (wasGravestoneRef.current && minion && !minion.isGravestone) {
      setIsShattering(true)
      soundManager.playGravestoneReveal()
      const timer = setTimeout(() => {
        setIsShattering(false)
      }, 850)
      wasGravestoneRef.current = false
      return () => clearTimeout(timer)
    }
    wasGravestoneRef.current = Boolean(minion?.isGravestone)
  }, [minion?.isGravestone])

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
          <div
            className={`board-drop-target-ring ${isPlant ? 'plant-drop-ring' : 'zombie-drop-ring'} ${
              isDragOver ? 'ring-drag-over-boost' : ''
            }`}
          >
            <div className="ring-pulse-halo" />
            <div className="ring-rotating-border" />
            <span className="ring-center-icon">{isPlant ? '🌱' : '🧟'}</span>
          </div>
        )}
      </div>
    )
  }

  // 2. OCCUPIED SLOT: Free-standing character sprite OR 3D Granite Gravestone
  const isGravestone = Boolean(minion.isGravestone)
  const isDamaged = minion.currentHealth < minion.maxHealth
  const isBuffedAttack = minion.currentAttack > minion.baseAttack
  const isDebuffedAttack = minion.currentAttack < minion.baseAttack

  const portraitSrc = imgError
    ? ASSET_MANIFEST.ui.defaultCardPlaceholder || '/assets/board/Game_Logo.png'
    : minion.image || '/assets/board/Game_Logo.png'

  const armorValue = minion.armored ?? (minion.traits?.includes('armored') ? 1 : 0)
  const isArmored = armorValue > 0
  const isDeadly = Boolean(minion.deadly || minion.traits?.includes('deadly'))
  const isBullseye = Boolean(minion.bullseye || minion.traits?.includes('bullseye'))
  const isStrikethrough = Boolean(minion.strikethrough || minion.traits?.includes('strikethrough'))
  const isFrenzy = Boolean(minion.frenzy || minion.traits?.includes('frenzy'))
  const isAmphibious = Boolean(minion.amphibious || minion.traits?.includes('amphibious'))
  const isDoubleStrike = Boolean(
    minion.doubleStrike ||
    minion.traits?.includes('doubleStrike') ||
    (minion.traits as any)?.includes('Double Strike') ||
    (minion.traits as any)?.includes('double strike')
  )
  const isAntiHero = Boolean(
    minion.antiHero ||
    minion.traits?.includes('antiHero') ||
    (minion.traits as any)?.includes('anti-hero') ||
    (minion.traits as any)?.includes('antihero')
  )

  return (
    <div
      className={`minion-board-slot occupied-minion-slot ${side}-slot ${
        isGravestone ? 'gravestone-slot' : ''
      } ${
        isTeamUp ? 'teamup-slot' : ''
      } ${minion.isFrozen ? 'is-frozen-slot' : ''} ${minion.isHit ? 'is-hit-pulse' : ''} ${
        minion.isAttacking ? 'is-attacking-lunge' : ''
      } ${isLanding ? 'is-minion-landing' : ''} ${isShattering ? 'gravestone-shattering' : ''}`}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      title={
        isGravestone
          ? 'Bia Mộ Cổ Kính (Gravestone): Chứa 1 Zombie bí ẩn sẽ nứt vỡ xuất trận lúc Zombie Tricks!'
          : `${minion.name} (${minion.currentAttack} Công / ${minion.currentHealth} Máu)`
      }
    >
      {/* 2A. GRAVESTONE: 3D Granite Tombstone Slab hiding minion identity */}
      {isGravestone ? (
        <>
          <div className={`minion-character-wrapper gravestone-character-wrapper ${isLanding ? 'landing-character-bounce' : ''}`}>
            {/* Ground Oval Shadow under Gravestone */}
            <div className={`minion-ground-shadow gravestone-ground-shadow ${isLanding ? 'shadow-landing-flare' : ''}`} />

            {/* 3D Granite Stone Slab */}
            <div className="gravestone-stone-slab">
              {/* Arched Top Bevel */}
              <div className="gravestone-slab-arch" />

              {/* Stone Carved Face */}
              <div className="gravestone-slab-face">
                {/* Spooky Purple Mist Aura */}
                <div className="gravestone-mist-aura" />

                {/* Skull Emblem */}
                <div className="gravestone-skull-emblem" aria-hidden="true">☠️</div>

                {/* Ancient Inscription */}
                <div className="gravestone-rip-text">R.I.P.</div>

                {/* Granite Surface Fractures / Cracks */}
                <div className="gravestone-cracks" aria-hidden="true">
                  <svg className="gravestone-cracks-svg" viewBox="0 0 100 120" preserveAspectRatio="none">
                    <path d="M 22 18 L 36 38 L 28 54 L 46 76 L 38 102" stroke="#1c1917" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
                    <path d="M 36 38 L 56 44 L 72 34 L 80 50" stroke="#1c1917" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
                    <path d="M 46 76 L 64 82 L 76 104" stroke="#1c1917" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
                  </svg>
                </div>

                {/* Overgrown Ancient Moss */}
                <div className="gravestone-moss moss-top-left" />
                <div className="gravestone-moss moss-top-right" />
                <div className="gravestone-moss moss-base-left" />
                <div className="gravestone-moss moss-base-right" />

                {/* Glowing Zombie Eyes inside Tombstone */}
                <div className="gravestone-undead-eyes">
                  <span className="undead-eye-dot left" />
                  <span className="undead-eye-dot right" />
                </div>
              </div>
            </div>
          </div>

          {/* Foot Stats Cluster: Mystery Gravestone Badge `🪦 ? / ?` */}
          <div className="minion-foot-stats-cluster gravestone-foot-cluster">
            <div className="gravestone-mystery-badge" title="Chỉ số bí ẩn (Sẽ hé lộ khi nứt vỡ lúc Zombie Tricks)">
              <span className="mystery-badge-icon">🪦</span>
              <span className="mystery-badge-text">? / ?</span>
            </div>
          </div>
        </>
      ) : (
        /* 2B. NORMAL MINION: Free-standing character sprite on grass */
        <>
          {/* Gravestone Shatter VFX Overlay (Active when revealed) */}
          {isShattering && (
            <div className="gravestone-shatter-container" aria-hidden="true">
              <div className="gravestone-shatter-flash" />
              <div className="gravestone-shatter-shockwave" />
              <div className="gravestone-stone-chunk chunk-1">🪨</div>
              <div className="gravestone-stone-chunk chunk-2">🪨</div>
              <div className="gravestone-stone-chunk chunk-3">🪨</div>
              <div className="gravestone-stone-chunk chunk-4">🪨</div>
              <div className="gravestone-stone-chunk chunk-5">💨</div>
              <div className="gravestone-shatter-dust" />
            </div>
          )}

          {/* Minion Character Stand: Free-standing with ground shadow */}
          <div className={`minion-character-wrapper ${isLanding ? 'landing-character-bounce' : ''} ${isShattering ? 'minion-revealed-pop' : ''}`}>
            {/* Ground Oval Shadow under character's feet */}
            <div className={`minion-ground-shadow ${isLanding ? 'shadow-landing-flare' : ''}`} />

            {/* Character Sprite Cutout */}
            <img
              src={portraitSrc}
              alt={minion.name}
              className={`minion-character-sprite ${isLanding ? 'sprite-landing-squash' : ''}`}
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
                <div className="mini-trait-chip armored" title={`Armored ${armorValue}: Giảm ${armorValue} sát thương`}>
                  <img src={ASSET_MANIFEST.traits.Trait_Armored} alt="Armored" className="mini-trait-img" />
                </div>
              )}
              {isDeadly && (
                <div className="mini-trait-chip deadly" title="Deadly: Tiêu diệt ngay mục tiêu">
                  <img src={ASSET_MANIFEST.traits.Trait_Deadly} alt="Deadly" className="mini-trait-img" />
                </div>
              )}
              {isBullseye && (
                <div className="mini-trait-chip bullseye" title="Bullseye: Bắn trúng không sạc Super-Block">
                  <img src={ASSET_MANIFEST.traits.Trait_Bullseye} alt="Bullseye" className="mini-trait-img" />
                </div>
              )}
              {isStrikethrough && (
                <div className="mini-trait-chip strikethrough" title="Strikethrough: Bắn xuyên qua minion trúng Hero">
                  <img src={ASSET_MANIFEST.traits.Trait_Strikethrough} alt="Strikethrough" className="mini-trait-img" />
                </div>
              )}
              {isFrenzy && (
                <div className="mini-trait-chip frenzy" title="Frenzy: Tấn công thêm một đòn khi tiêu diệt minion">
                  <img src={ASSET_MANIFEST.traits.Trait_Frenzy} alt="Frenzy" className="mini-trait-img" />
                </div>
              )}
              {isDoubleStrike && (
                <div className="mini-trait-chip double-strike" title="Double Strike: Tấn công thêm một đòn sau giao tranh">
                  <span className="mini-trait-glyph">⚡</span>
                </div>
              )}
              {isAmphibious && (
                <div className="mini-trait-chip amphibious" title="Amphibious: Thủy quân (đi được trên nước)">
                  <span className="mini-trait-glyph">💧</span>
                </div>
              )}
              {isAntiHero && (
                <div className="mini-trait-chip anti-hero" title="Anti-Hero: Tăng công vào lane trống">
                  <img src={ASSET_MANIFEST.traits.Trait_AntiHero} alt="Anti-Hero" className="mini-trait-img" />
                </div>
              )}
            </div>
          </div>

          {/* Combat Stat Badges: Spiky Green Attack Burst / Bullseye Reticle & Glossy Red Heart / Armored Shield */}
          <div className="minion-foot-stats-cluster">
            {/* Attack Starburst / Bullseye Target Badge */}
            <div
              className={`foot-stat-badge attack-starburst ${
                isBullseye ? 'attack-bullseye' : ''
              } ${
                isBuffedAttack ? 'stat-boosted' : isDebuffedAttack ? 'stat-reduced' : ''
              }`}
              title={isBullseye ? 'Bullseye: Bỏ qua Block Meter đối phương' : undefined}
            >
              <div className="starburst-shape" />
              <span className="foot-stat-digit">{minion.currentAttack}</span>
              {isBullseye ? (
                <span className="bullseye-reticle-ring">◎</span>
              ) : (
                <span className="starburst-mini-star">★</span>
              )}
            </div>

            {/* Health Heart Badge (Overlaps slightly on the right, with optional Armored Plate) */}
            <div
              className={`foot-stat-badge health-heart ${
                isArmored ? 'health-armored' : ''
              } ${
                isDamaged ? 'stat-damaged' : 'stat-normal'
              }`}
              title={isArmored ? `Armored ${armorValue}: Giảm ${armorValue} sát thương` : undefined}
            >
              <img
                src={ASSET_MANIFEST.traits.Resource_Health_Heart}
                alt="HP"
                className="foot-heart-icon"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              <span className="foot-stat-digit">{minion.currentHealth}</span>
              {isArmored && (
                <div className="armored-shield-overlay" title={`Giáp +${armorValue}`}>
                  <span className="armored-shield-icon">🛡️</span>
                  <span className="armored-shield-val">{armorValue}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default MinionSlot
