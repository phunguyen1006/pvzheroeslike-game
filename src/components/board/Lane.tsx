import React, { useState, useEffect, useRef } from 'react'
import { MinionSlot } from './MinionSlot'
import { LaneEnvironmentFX } from './LaneEnvironmentFX'
import type { LaneState, Card as CardType, Minion as MinionType } from '../../engine/types'

export interface LaneProps {
  lane: LaneState
  isHighlighted?: boolean
  selectedCard?: CardType | null
  selectedCardSide?: 'plants' | 'zombies'
  isCombatLane?: boolean
  isAttackingPlant?: boolean
  isAttackingZombie?: boolean
  isHitPlant?: boolean
  isHitZombie?: boolean
  isDyingPlant?: boolean
  isDyingZombie?: boolean
  onSelectLane: (laneIndex: number) => void
  onDropCardToLane?: (laneIndex: number, cardId: string) => void
  onInspectMinion?: (minion: MinionType) => void
  onInspectEnvironment?: (cardId: string) => void
}

export const Lane: React.FC<LaneProps> = ({
  lane,
  isHighlighted = false,
  selectedCard,
  selectedCardSide,
  isCombatLane = false,
  isAttackingPlant = false,
  isAttackingZombie = false,
  isHitPlant = false,
  isHitZombie = false,
  isDyingPlant = false,
  isDyingZombie = false,
  onSelectLane,
  onDropCardToLane,
  onInspectMinion,
  onInspectEnvironment,
}) => {
  const isHeights = lane.type === 'heights'
  const isWater = lane.type === 'water'

  const [isLaneDragOver, setIsLaneDragOver] = useState(false)
  const [isLandingThud, setIsLandingThud] = useState(false)
  const prevPlantIdRef = useRef<string | undefined>(lane.plantMinion?.instanceId)
  const prevZombieIdRef = useRef<string | undefined>(lane.zombieMinion?.instanceId)

  // Trigger landing thud when a new minion appears on this lane
  useEffect(() => {
    const currentPlantId = lane.plantMinion?.instanceId
    const currentZombieId = lane.zombieMinion?.instanceId

    if (
      (currentPlantId && currentPlantId !== prevPlantIdRef.current) ||
      (currentZombieId && currentZombieId !== prevZombieIdRef.current)
    ) {
      setIsLandingThud(true)
      const timer = setTimeout(() => setIsLandingThud(false), 700)
      prevPlantIdRef.current = currentPlantId
      prevZombieIdRef.current = currentZombieId
      return () => clearTimeout(timer)
    }
    prevPlantIdRef.current = currentPlantId
    prevZombieIdRef.current = currentZombieId
  }, [lane.plantMinion?.instanceId, lane.zombieMinion?.instanceId])

  // Validate if selected card can be played in this lane
  let isCardPlayableHere = false
  let unmetReason: string | undefined = undefined

  if (selectedCard) {
    if (selectedCard.type === 'environment') {
      isCardPlayableHere = true
    } else if (selectedCard.type === 'trick') {
      isCardPlayableHere = true
    } else {
      const isAmphibious = Boolean(selectedCard.amphibious || selectedCard.traits?.includes('amphibious'))
      if (isWater && !isAmphibious) {
        isCardPlayableHere = false
        unmetReason = 'Cần đặc tính Amphibious!'
      } else {
        if (selectedCard.side === 'plants') {
          const hasEmptySlot = !lane.plantMinion || (Boolean(selectedCard.teamUp || lane.plantMinion.teamUp) && !lane.plantTeamUpMinion)
          if (hasEmptySlot) {
            isCardPlayableHere = true
          } else {
            unmetReason = 'Làn đã đầy Plant!'
          }
        } else {
          if (!lane.zombieMinion) {
            isCardPlayableHere = true
          } else {
            unmetReason = 'Làn đã có Zombie!'
          }
        }
      }
    }
  }

  const handleDrop = (cardId: string) => {
    setIsLandingThud(true)
    setTimeout(() => setIsLandingThud(false), 700)
    onDropCardToLane?.(lane.index, cardId)
  }

  const handleLaneDragOver = (e: React.DragEvent) => {
    if (isCardPlayableHere) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setIsLaneDragOver(true)
    }
  }

  const handleLaneDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setIsLaneDragOver(false)
  }

  const handleLaneDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsLaneDragOver(false)
    const cardId = e.dataTransfer.getData('text/plain')
    if (cardId && isCardPlayableHere) {
      handleDrop(cardId)
    }
  }

  const hasSelectedCard = Boolean(selectedCard)
  const isEligible = hasSelectedCard && isCardPlayableHere
  const isIneligible = hasSelectedCard && !isCardPlayableHere

  return (
    <div
      className={`pvz-lane lane-${lane.type} lane-idx-${lane.index} ${
        lane.environment ? `has-environment env-${lane.environment.id}` : ''
      } ${
        isHighlighted ? 'is-lane-highlighted' : ''
      } ${isCombatLane ? 'is-combat-active-lane' : ''} ${
        isEligible ? 'is-eligible-lane' : ''
      } ${isIneligible ? 'is-ineligible-lane' : ''} ${
        isLaneDragOver ? 'is-lane-drag-over' : ''
      } ${
        isEligible && selectedCard?.side ? `eligible-${selectedCard.side}-lane` : ''
      } ${
        isEligible ? `eligible-lane-type-${lane.type}` : ''
      } ${isLandingThud ? 'lane-landing-impact lane-flash-active' : ''}`}
      onClick={() => onSelectLane(lane.index)}
      onDragOver={handleLaneDragOver}
      onDragLeave={handleLaneDragLeave}
      onDrop={handleLaneDrop}
    >
      {/* 1. Dynamic Glowing Pulse Ring for Valid Placement */}
      {isEligible && (
        <div
          className={`lane-valid-pulse-border ${
            selectedCard?.side === 'plants' ? 'plant-valid-border' : 'zombie-valid-border'
          } ${isHeights ? 'heights-valid-border' : isWater ? 'water-valid-border' : 'ground-valid-border'} ${
            isLaneDragOver ? 'border-drag-over-boost' : ''
          }`}
        >
          <div className="pulse-border-glow" />
          <div className="pulse-border-sheen" />
          <div className="lane-destination-tag">
            {isHeights ? '🏔️ HEIGHTS' : isWater ? '🌊 WATER' : '🌱 GROUND'}
          </div>
        </div>
      )}

      {/* 2. Landing Impact Thud Visual FX */}
      {isLandingThud && (
        <div className="card-drop-landing-vfx" aria-hidden="true">
          <div className="landing-dust-ring" />
          <div className="landing-impact-flash" />
          <div className="landing-ground-ripple" />
        </div>
      )}

      {/* Subtle Lane Type Label at Top */}
      <div className="lane-type-indicator">
        {isHeights ? (
          <span className="lane-type-chip heights-chip">🏔️ HEIGHTS</span>
        ) : isWater ? (
          <span className="lane-type-chip water-chip">🌊 WATER</span>
        ) : null}
      </div>

      {/* Living Lane Environment FX (Heights Wind & Water Ripples & Gravestones) */}
      <LaneEnvironmentFX lane={lane} />

      {/* 3. Active Environment Lane Surface VFX */}
      {lane.environment && (
        <div className={`lane-environment-overlay env-overlay-${lane.environment.id}`} aria-hidden="true">
          <div className="env-ambient-glow" />
          <div className="env-terrain-texture" />

          {/* Theme 1: Spikeweed Sector - Ground thorns tremor & spore dust motes */}
          {lane.environment.id === 'plant_spikeweed_sector' && (
            <div className="env-spikeweed-bed">
              <div className="spikeweed-thorn-tremor">
                <span className="spikeweed-spike spike-1">▲</span>
                <span className="spikeweed-spike spike-2">▲</span>
                <span className="spikeweed-spike spike-3">▲</span>
                <span className="spikeweed-spike spike-4">▲</span>
                <span className="spikeweed-spike spike-5">▲</span>
                <span className="spikeweed-spike spike-6">▲</span>
                <span className="spikeweed-spike spike-7">▲</span>
                <span className="spikeweed-spike spike-8">▲</span>
              </div>
              <div className="spikeweed-spore-dust dust-1" />
              <div className="spikeweed-spore-dust dust-2" />
              <div className="spikeweed-spore-dust dust-3" />
            </div>
          )}

          {/* Theme 2: Laser Base Alpha & Moon Base Z - High-tech scanning lasers & cyber sparks */}
          {(lane.environment.id === 'zombie_moon_base_z' ||
            lane.environment.id === 'zombie_laser_base_alpha' ||
            lane.environment.id === 'zombie_medulla_nebula') && (
            <div className="env-laser-base-grid">
              <div className="laser-grid-mesh" />
              <div className="laser-sweep-line laser-sweep-smooth" />
              <div className="laser-cyber-spark spark-1" />
              <div className="laser-cyber-spark spark-2" />
              <div className="laser-cyber-spark spark-3" />
              <div className="laser-pulse-node node-top" />
              <div className="laser-pulse-node node-mid" />
              <div className="laser-pulse-node node-bottom" />
            </div>
          )}

          {/* Theme 3: Bog of Sunken Hope, Bog of Doom & Planet of the Grapes - Rising effervescent bubbles & swamp mist */}
          {(lane.environment.id === 'plant_planet_of_the_grapes' ||
            lane.environment.id === 'plant_bog_of_doom' ||
            lane.environment.id === 'plant_bog_of_sunken_hope') && (
            <div className="env-swamp-bog">
              <div className="swamp-bubble-rise bubble-1" />
              <div className="swamp-bubble-rise bubble-2" />
              <div className="swamp-bubble-rise bubble-3" />
              <div className="swamp-bubble-rise bubble-4" />
              <div className="swamp-mist-undulate mist-1" />
              <div className="swamp-mist-undulate mist-2" />
            </div>
          )}

          {/* Theme 4: Solar Winds - Radiant golden sunbeams flowing upwards */}
          {lane.environment.id === 'plant_solar_winds' && (
            <div className="env-solar-winds-flow">
              <div className="solar-sunbeam beam-1" />
              <div className="solar-sunbeam beam-2" />
              <div className="solar-sparkle-dot spark-1" />
              <div className="solar-sparkle-dot spark-2" />
            </div>
          )}

          {/* Theme 5: Total Eclipse & Area 22 - Dark lunar shadow & biohazard energy */}
          {(lane.environment.id === 'zombie_total_eclipse' ||
            lane.environment.id === 'zombie_area_22') && (
            <div className="env-eclipse-overlay">
              <div className="eclipse-dark-shadow" />
              <div className="area22-radiation-aura" />
            </div>
          )}
        </div>
      )}

      {/* Zombie Minion Slot (Top Half) */}
      <div className="lane-slot-wrapper zombie-slot-wrapper">
        <MinionSlot
          minion={lane.zombieMinion}
          side="zombies"
          isActiveLane={isHighlighted && selectedCardSide === 'zombies'}
          isEligibleTarget={isCardPlayableHere && selectedCardSide === 'zombies'}
          unmetReason={selectedCardSide === 'zombies' ? unmetReason : undefined}
          isLanding={isLandingThud && Boolean(lane.zombieMinion)}
          isAttacking={isAttackingZombie}
          isHit={isHitZombie}
          isDying={isDyingZombie}
          onClick={() => onSelectLane(lane.index)}
          onDropCard={handleDrop}
          onInspect={onInspectMinion}
        />
      </div>

      {/* Center Divider / Active Environment Badge */}
      <div className="lane-center-belt">
        {lane.environment ? (
          <div
            className={`active-environment-token env-${lane.environment.id}`}
            title={`${lane.environment.name}: ${lane.environment.description} (Nhấp để xem chi tiết thẻ)`}
            onClick={(e) => {
              e.stopPropagation()
              if (lane.environment) {
                onInspectEnvironment?.(lane.environment.id)
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (lane.environment) {
                onInspectEnvironment?.(lane.environment.id)
              }
            }}
          >
            {lane.environment.image ? (
              <img
                src={lane.environment.image}
                alt={lane.environment.name}
                className="env-token-img"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              <span className="env-token-fallback">🌍</span>
            )}
            <span className="env-token-name">{lane.environment.name}</span>
          </div>
        ) : (
          <div className="lane-chalk-seam" />
        )}
      </div>

      {/* Plant Minion Slot (Bottom Half) - Supports Team-Up */}
      <div className="lane-slot-wrapper plant-slot-wrapper">
        <MinionSlot
          minion={lane.plantMinion}
          side="plants"
          isActiveLane={isHighlighted && selectedCardSide === 'plants'}
          isEligibleTarget={isCardPlayableHere && selectedCardSide === 'plants'}
          unmetReason={selectedCardSide === 'plants' ? unmetReason : undefined}
          isLanding={isLandingThud && Boolean(lane.plantMinion)}
          isAttacking={isAttackingPlant}
          isHit={isHitPlant}
          isDying={isDyingPlant}
          onClick={() => onSelectLane(lane.index)}
          onDropCard={handleDrop}
          onInspect={onInspectMinion}
        />

        {/* TeamUp Secondary Slot */}
        {(lane.plantTeamUpMinion || (lane.plantMinion?.teamUp && selectedCard?.side === 'plants')) && (
          <div className="teamup-slot-container">
            <MinionSlot
              minion={lane.plantTeamUpMinion || null}
              side="plants"
              isTeamUp={true}
              isActiveLane={isHighlighted && selectedCardSide === 'plants'}
              isEligibleTarget={isCardPlayableHere && selectedCardSide === 'plants'}
              isLanding={isLandingThud && Boolean(lane.plantTeamUpMinion)}
              isAttacking={isAttackingPlant}
              isHit={isHitPlant}
              isDying={isDyingPlant}
              onClick={() => onSelectLane(lane.index)}
              onDropCard={handleDrop}
              onInspect={onInspectMinion}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default Lane
