import React from 'react'
import type { LaneState } from '../../engine/types'

export interface LaneEnvironmentFXProps {
  lane: LaneState
  isGravestoneRevealing?: boolean
}

export const LaneEnvironmentFX: React.FC<LaneEnvironmentFXProps> = ({
  lane,
  isGravestoneRevealing = false,
}) => {
  const isHeights = lane.type === 'heights'
  const isWater = lane.type === 'water'
  const hasPlant = Boolean(lane.plantMinion)
  const hasZombie = Boolean(lane.zombieMinion)
  const hasMinion = hasPlant || hasZombie
  const isGravestone = Boolean(lane.zombieMinion?.isGravestone)

  return (
    <div className={`lane-living-fx-container lane-fx-${lane.type}`} aria-hidden="true">
      {/* 1. Heights Lane (Lane 1): High Altitude Cliff, Drifting Wind Streaks & Minion Elevation Aura */}
      {isHeights && (
        <div className="heights-living-fx">
          {/* Drifting Breeze / Cloud Streaks */}
          <div className="heights-wind-layer">
            <div className="heights-wind-streak streak-1" />
            <div className="heights-wind-streak streak-2" />
            <div className="heights-wind-streak streak-3" />
          </div>

          {/* Altitude Cliff Edge Indicator */}
          <div className="heights-altitude-badge">
            <span className="altitude-icon">🏔️</span>
            <span className="altitude-label">HEIGHTS +20m</span>
          </div>

          {/* Minion Elevated Perch Aura */}
          {hasMinion && (
            <div className="heights-elevation-aura">
              <div className="aura-sunbeam" />
              <div className="aura-dust-motes" />
            </div>
          )}
        </div>
      )}

      {/* 2. Water / Amphibious Lane (Lane 5): Concentric Ripples, Water Caustics & Splash Foam */}
      {isWater && (
        <div className="water-living-fx">
          {/* Animated Water Surface Waves & Caustics */}
          <div className="water-caustics-layer">
            <div className="water-wave-line wave-top" />
            <div className="water-wave-line wave-mid" />
            <div className="water-wave-line wave-bottom" />
          </div>

          {/* Concentric Water Ripples */}
          <div className="water-ripples-emitter">
            <div className="water-ripple-ring ring-1" />
            <div className="water-ripple-ring ring-2" />
            <div className="water-ripple-ring ring-3" />
          </div>

          {/* Water Splash Foam when Minion is Submerged/Swimming */}
          {hasMinion && (
            <div className="water-splash-foam-emitter">
              <div className="splash-foam-bubble bubble-1" />
              <div className="splash-foam-bubble bubble-2" />
              <div className="splash-foam-bubble bubble-3" />
              <div className="splash-foam-ring" />
            </div>
          )}
        </div>
      )}

      {/* 3. Gravestone Crack & Ground Eruption Reveal FX */}
      {(isGravestoneRevealing || isGravestone) && (
        <div className={`gravestone-ground-fx ${isGravestoneRevealing ? 'is-erupting' : 'is-sealed'}`}>
          <div className="stone-crack-lines">
            <svg viewBox="0 0 100 60" className="crack-svg">
              <path
                d="M 50 50 L 45 35 L 30 25 L 15 20 M 50 50 L 58 38 L 70 30 L 85 22 M 50 50 L 48 20"
                stroke="rgba(40, 25, 15, 0.75)"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>
          {isGravestoneRevealing && (
            <div className="stone-debris-burst">
              <div className="pebble-shard shard-1" />
              <div className="pebble-shard shard-2" />
              <div className="pebble-shard shard-3" />
              <div className="pebble-shard shard-4" />
              <div className="dust-cloud-puff" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default LaneEnvironmentFX
