import React, { useState } from 'react'
import { Lane } from './Lane'
import { CombatVFXLayer, type Projectile, type FloatingTextItem, type ShockwaveItem } from './CombatVFXLayer'
import { CombatActionPopups, type CombatPopupItem } from './CombatActionPopups'
import { TurnRopeTimer, type TurnRopeTimerProps } from './TurnRopeTimer'
import type { LaneState, Card as CardType, Minion as MinionType } from '../../engine/types'
import { ASSET_MANIFEST } from '../../data/assetsManifest'

export interface GameBoardProps {
  lanes: LaneState[]
  selectedLaneIndex?: number
  selectedCard?: CardType | null
  selectedCardSide?: 'plants' | 'zombies'
  activeCombatLaneIndex?: number
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
        {lanes.map((lane) => (
          <Lane
            key={lane.index}
            lane={lane}
            isHighlighted={selectedLaneIndex === lane.index}
            selectedCard={selectedCard}
            selectedCardSide={selectedCardSide}
            isCombatLane={activeCombatLaneIndex === lane.index}
            onSelectLane={onSelectLane}
            onDropCardToLane={onDropCardToLane}
            onInspectMinion={onInspectMinion}
            onInspectEnvironment={onInspectEnvironment}
          />
        ))}
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
