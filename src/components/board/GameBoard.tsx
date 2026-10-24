import React, { useState } from 'react'
import { Lane } from './Lane'
import { CombatVFXLayer, type Projectile, type FloatingTextItem } from './CombatVFXLayer'
import type { LaneState, Card as CardType } from '../../engine/types'
import { ASSET_MANIFEST } from '../../data/assetsManifest'

export interface GameBoardProps {
  lanes: LaneState[]
  selectedLaneIndex?: number
  selectedCard?: CardType | null
  selectedCardSide?: 'plants' | 'zombies'
  activeCombatLaneIndex?: number
  projectiles?: Projectile[]
  floatingTexts?: FloatingTextItem[]
  onSelectLane: (laneIndex: number) => void
  onDropCardToLane?: (laneIndex: number, cardId: string) => void
}

export const GameBoard: React.FC<GameBoardProps> = ({
  lanes,
  selectedLaneIndex,
  selectedCard,
  selectedCardSide,
  activeCombatLaneIndex,
  projectiles = [],
  floatingTexts = [],
  onSelectLane,
  onDropCardToLane,
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
          />
        ))}
      </div>

      {/* Combat VFX Layer (Projectiles & Floating Numbers) */}
      <CombatVFXLayer
        projectiles={projectiles}
        floatingTexts={floatingTexts}
      />
    </div>
  )
}

export default GameBoard
