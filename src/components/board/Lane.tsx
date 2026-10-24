import React from 'react'
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
    onDropCardToLane?.(lane.index, cardId)
  }

  return (
    <div
      className={`pvz-lane lane-${lane.type} lane-idx-${lane.index} ${
        isHighlighted ? 'is-lane-highlighted' : ''
      } ${isCombatLane ? 'is-combat-active-lane' : ''} ${
        isCardPlayableHere ? 'is-eligible-lane' : ''
      }`}
      onClick={() => onSelectLane(lane.index)}
    >
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
