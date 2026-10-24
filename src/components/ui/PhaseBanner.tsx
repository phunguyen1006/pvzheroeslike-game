import React from 'react'
import type { Phase } from '../../engine/types'

export interface PhaseBannerProps {
  phase: Phase
  turn: number
  isCombatResolving?: boolean
  onNextPhase?: () => void
  onStartCombat?: () => void
}

export const PhaseBanner: React.FC<PhaseBannerProps> = ({
  phase,
  turn,
  isCombatResolving = false,
  onNextPhase,
  onStartCombat,
}) => {
  const phases: { id: Phase; label: string; activeColor: string }[] = [
    { id: 'ZOMBIE_PLAY', label: '1. Zombie Minions', activeColor: '#a855f7' },
    { id: 'PLANT_PLAY', label: '2. Plant Turn', activeColor: '#22c55e' },
    { id: 'ZOMBIE_TRICKS', label: '3. Zombie Tricks', activeColor: '#eab308' },
    { id: 'FIGHT', label: '4. Giao tranh', activeColor: '#ef4444' },
  ]

  const isPlayerPlantTurn = phase === 'PLANT_PLAY'

  return (
    <div className="phase-banner-wrapper">
      <div className="turn-counter-badge">
        <span className="turn-label">ROUND</span>
        <span className="turn-number">{turn}</span>
      </div>

      <div className="phases-flow-bar">
        {phases.map((p) => {
          const isCurrent = phase === p.id
          return (
            <div
              key={p.id}
              className={`phase-step ${isCurrent ? 'active-phase-step' : ''}`}
              style={{
                borderColor: isCurrent ? p.activeColor : 'rgba(255,255,255,0.15)',
                boxShadow: isCurrent ? `0 0 14px ${p.activeColor}` : 'none',
              }}
            >
              <span>{p.label}</span>
            </div>
          )
        })}
      </div>

      <div className="phase-control-buttons">
        {phase === 'FIGHT' ? (
          <button
            className={`phase-action-btn fight-btn ${isCombatResolving ? 'is-fighting-active' : ''}`}
            onClick={onStartCombat}
            disabled={isCombatResolving}
          >
            {isCombatResolving ? '⚔️ ĐANG GIAO TRANH...' : '⚔️ GIAO TRANH!'}
          </button>
        ) : isPlayerPlantTurn ? (
          <button className="phase-action-btn plant-end-turn-btn" onClick={onNextPhase}>
            XONG LƯỢT PLANT ⏩
          </button>
        ) : (
          <div className="phase-waiting-pill">
            <span className="waiting-spinner">⏳</span>
            <span>{phase === 'ZOMBIE_PLAY' ? 'Zombie xuất quân...' : 'Zombie dùng Tricks...'}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default PhaseBanner
