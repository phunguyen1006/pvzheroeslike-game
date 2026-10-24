import React, { useState, useEffect, useRef } from 'react'
import { MinionSlot } from './MinionSlot'
import type { LaneState, Card as CardType } from '../../engine/types'

export interface LaneProps {
  lane: LaneState
  isHighlighted?: boolean
  selectedCard?: CardType | null
  selectedCardSide?: 'plants' | 'zombies'
  isCombatLane?: boolean
  onSelectLane: (laneIndex: number) => void
  onDropCardToLane?: (laneIndex: number, cardId: string) => void
}

export const Lane: React.FC<LaneProps> = ({
  lane,
  isHighlighted = false,
  selectedCard,
  selectedCardSide,
  isCombatLane = false,
  onSelectLane,
  onDropCardToLane,
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
        isHighlighted ? 'is-lane-highlighted' : ''
      } ${isCombatLane ? 'is-combat-active-lane' : ''} ${
        isEligible ? 'is-eligible-lane' : ''
      } ${isIneligible ? 'is-ineligible-lane' : ''} ${
        isLaneDragOver ? 'is-lane-drag-over' : ''
      } ${
        isEligible && selectedCard?.side ? `eligible-${selectedCard.side}-lane` : ''
      } ${
        isEligible ? `eligible-lane-type-${lane.type}` : ''
      } ${isLandingThud ? 'lane-landing-impact' : ''}`}
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

      {/* Zombie Minion Slot (Top Half) */}
      <div className="lane-slot-wrapper zombie-slot-wrapper">
        <MinionSlot
          minion={lane.zombieMinion}
          side="zombies"
          isActiveLane={isHighlighted && selectedCardSide === 'zombies'}
          isEligibleTarget={isCardPlayableHere && selectedCardSide === 'zombies'}
          unmetReason={selectedCardSide === 'zombies' ? unmetReason : undefined}
          isLanding={isLandingThud && Boolean(lane.zombieMinion)}
          onClick={() => onSelectLane(lane.index)}
          onDropCard={handleDrop}
        />
      </div>

      {/* Center Divider / Active Environment Badge */}
      <div className="lane-center-belt">
        {lane.environment ? (
          <div
            className={`active-environment-token env-${lane.environment.id}`}
            title={`${lane.environment.name}: ${lane.environment.description}`}
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
          onClick={() => onSelectLane(lane.index)}
          onDropCard={handleDrop}
        />

        {/* Team-Up Secondary Slot */}
        {(lane.plantTeamUpMinion || (lane.plantMinion?.teamUp && selectedCard?.side === 'plants')) && (
          <div className="teamup-slot-container">
            <MinionSlot
              minion={lane.plantTeamUpMinion || null}
              side="plants"
              isTeamUp={true}
              isActiveLane={isHighlighted && selectedCardSide === 'plants'}
              isEligibleTarget={isCardPlayableHere && selectedCardSide === 'plants'}
              isLanding={isLandingThud && Boolean(lane.plantTeamUpMinion)}
              onClick={() => onSelectLane(lane.index)}
              onDropCard={handleDrop}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default Lane
