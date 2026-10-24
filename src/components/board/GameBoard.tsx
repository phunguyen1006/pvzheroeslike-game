import React, { useState } from 'react'
import { Lane } from './Lane'
import { CombatVFXLayer, type Projectile, type FloatingTextItem, type ShockwaveItem } from './CombatVFXLayer'
import { CombatActionPopups, type CombatPopupItem } from './CombatActionPopups'
import { TurnRopeTimer, type TurnRopeTimerProps } from './TurnRopeTimer'
import type { LaneState, Card as CardType, Minion as MinionType } from '../../engine/types'
import { ASSET_MANIFEST } from '../../data/assetsManifest'

export interface CombatAnimationState {
  attacking?: { laneIndex: number; side: 'plants' | 'zombies' } | null
  hit?: { laneIndex: number; side: 'plants' | 'zombies' } | null
  dying?: { laneIndex: number; side: 'plants' | 'zombies' } | null
}

export interface GameBoardProps {
  lanes: LaneState[]
  selectedLaneIndex?: number
  selectedCard?: CardType | null
  selectedCardSide?: 'plants' | 'zombies'
  activeCombatLaneIndex?: number
  combatAnimation?: CombatAnimationState
  projectiles?: Projectile[]
  floatingTexts?: FloatingTextItem[]
  shockwaves?: ShockwaveItem[]
  combatPopups?: CombatPopupItem[]
  turnRope?: TurnRopeTimerProps
  onSelectLane: (laneIndex: number) => void
  onDropCardToLane?: (laneIndex: number, cardId: string) => void
  onInspectMinion?: (minion: MinionType) => void
  onInspectEnvironment?: (cardId: string) => void
}

export const GameBoard: React.FC<GameBoardProps> = ({
  lanes,
  selectedLaneIndex,
  selectedCard,
  selectedCardSide,
  activeCombatLaneIndex,
  combatAnimation,
  projectiles = [],
  floatingTexts = [],
  shockwaves = [],
  combatPopups = [],
  turnRope,
  onSelectLane,
  onDropCardToLane,
  onInspectMinion,
  onInspectEnvironment,
}) => {
  const [boardImgSrc, setBoardImgSrc] = useState<string>(
    ASSET_MANIFEST.board.Board_Combat_Field || '/assets/board/Board_Combat_Field.png'
  )

  return (
    <div className="pvz-gameboard-surface">
      {/* Stadium Combat Field Texture Background */}
      <div className="board-backdrop-texture">
        <img
          src={boardImgSrc}
          alt="Battlefield Board"
          className="board-texture-img"
          onError={() => {
            setBoardImgSrc(
              ASSET_MANIFEST.board.Board_Lawn_5_Lanes || '/assets/board/Board_Lawn_5_Lanes.png'
            )
          }}
        />
        <div className="board-vignette-overlay" />
      </div>

      {/* 5-Lane Battlefield Grid */}
      <div className="battlefield-5lanes-grid">
        {lanes.map((lane) => {
          const isAttackingPlant =
            combatAnimation?.attacking?.laneIndex === lane.index &&
            combatAnimation?.attacking?.side === 'plants'
          const isAttackingZombie =
            combatAnimation?.attacking?.laneIndex === lane.index &&
            combatAnimation?.attacking?.side === 'zombies'
          const isHitPlant =
            combatAnimation?.hit?.laneIndex === lane.index &&
            combatAnimation?.hit?.side === 'plants'
          const isHitZombie =
            combatAnimation?.hit?.laneIndex === lane.index &&
            combatAnimation?.hit?.side === 'zombies'
          const isDyingPlant =
            combatAnimation?.dying?.laneIndex === lane.index &&
            combatAnimation?.dying?.side === 'plants'
          const isDyingZombie =
            combatAnimation?.dying?.laneIndex === lane.index &&
            combatAnimation?.dying?.side === 'zombies'

          return (
            <Lane
              key={lane.index}
              lane={lane}
              isHighlighted={selectedLaneIndex === lane.index}
              selectedCard={selectedCard}
              selectedCardSide={selectedCardSide}
              isCombatLane={activeCombatLaneIndex === lane.index}
              isAttackingPlant={isAttackingPlant}
              isAttackingZombie={isAttackingZombie}
              isHitPlant={isHitPlant}
              isHitZombie={isHitZombie}
              isDyingPlant={isDyingPlant}
              isDyingZombie={isDyingZombie}
              onSelectLane={onSelectLane}
              onDropCardToLane={onDropCardToLane}
              onInspectMinion={onInspectMinion}
              onInspectEnvironment={onInspectEnvironment}
            />
          )
        })}
      </div>

      {/* Combat VFX Layer (Projectiles, Shockwaves & Floating Numbers) */}
      <CombatVFXLayer
        projectiles={projectiles}
        floatingTexts={floatingTexts}
        shockwaves={shockwaves}
      />

      {/* Comic Action Words & Damage Popups (POW/BAM/CRUNCH/ZAP/BLOCKED) */}
      <CombatActionPopups popups={combatPopups} />

      {/* Turn Rope / Fuse Countdown Timer */}
      {turnRope && (
        <TurnRopeTimer
          timeLeft={turnRope.timeLeft}
          maxTime={turnRope.maxTime}
          isActive={turnRope.isActive}
          onTimeout={turnRope.onTimeout}
        />
      )}
    </div>
  )
}

export default GameBoard
