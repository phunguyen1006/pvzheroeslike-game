import React, { useState, useEffect, useRef } from 'react'
import type { Phase } from '../../engine/types'
import { soundManager } from '../../audio/SoundManager'

export interface PhaseBannerProps {
  phase: Phase
  turn?: number
  isCombatResolving?: boolean
  onNextPhase?: () => void
  onStartCombat?: () => void
}

interface ComicPhaseConfig {
  title: string
  subtitle: string
  icon: string
  themeClass: string
  accentColor: string
}

const PHASE_CONFIGS: Record<Phase, ComicPhaseConfig | null> = {
  MULLIGAN: null,
  ZOMBIE_PLAY: {
    title: 'ZOMBIES TURN',
    subtitle: 'Zombie xuất quân ẩn danh!',
    icon: '🧟',
    themeClass: 'theme-zombie-play',
    accentColor: '#a855f7',
  },
  PLANT_PLAY: {
    title: 'PLANTS TURN',
    subtitle: 'Đến lượt Plants phản công!',
    icon: '🌱',
    themeClass: 'theme-plant-play',
    accentColor: '#22c55e',
  },
  ZOMBIE_TRICKS: {
    title: 'ZOMBIE TRICKS',
    subtitle: 'Kích hoạt Bia Mộ & Phép thuật!',
    icon: '🔮',
    themeClass: 'theme-zombie-tricks',
    accentColor: '#f59e0b',
  },
  FIGHT: {
    title: 'FIGHT! GIAO TRANH',
    subtitle: '5 làn đấu nổ súng toàn diện!',
    icon: '⚔️',
    themeClass: 'theme-fight',
    accentColor: '#ef4444',
  },
  GAME_OVER: null,
}

/**
 * PhaseBanner (Comic Phase Banner chuẩn PvZ Heroes)
 * - Tự động bật dải banner comic 3D trượt ngang màn hình khi đổi Phase
 * - Typography 3D nghiêng đậm chất comic viền đen dày, màu sắc đặc trưng
 * - Tích hợp âm thanh Web Audio API soundManager.playFightHorn() cho FIGHT
 *   và soundManager.playPhaseChange() cho các phase khác
 * - Có thanh chỉ báo tiến trình phase nhỏ gọn
 */
export const PhaseBanner: React.FC<PhaseBannerProps> = ({
  phase,
  turn,
  isCombatResolving = false,
  onNextPhase,
  onStartCombat,
}) => {
  const [comicBanner, setComicBanner] = useState<ComicPhaseConfig | null>(null)
  const prevPhaseRef = useRef<Phase>(phase)

  useEffect(() => {
    // Only pop comic banner when phase genuinely changes to a gameplay phase
    if (phase !== 'MULLIGAN' && phase !== prevPhaseRef.current) {
      const config = PHASE_CONFIGS[phase]
      if (config) {
        setComicBanner(config)

        // Web Audio SFX: Play Fight Horn on FIGHT, otherwise phase whoosh
        if (phase === 'FIGHT') {
          soundManager.playFightHorn()
        } else {
          soundManager.playPhaseChange()
        }

        const timer = setTimeout(() => {
          setComicBanner(null)
        }, 1500)

        prevPhaseRef.current = phase
        return () => clearTimeout(timer)
      }
    }
    prevPhaseRef.current = phase
  }, [phase])

  const phasesList: { id: Phase; label: string; activeColor: string }[] = [
    { id: 'ZOMBIE_PLAY', label: '1. Zombie Minions', activeColor: '#a855f7' },
    { id: 'PLANT_PLAY', label: '2. Plant Turn', activeColor: '#22c55e' },
    { id: 'ZOMBIE_TRICKS', label: '3. Zombie Tricks', activeColor: '#eab308' },
    { id: 'FIGHT', label: '4. Giao tranh', activeColor: '#ef4444' },
  ]

  const isPlayerPlantTurn = phase === 'PLANT_PLAY'

  return (
    <>
      {/* 1. Dramatic Comic Banner Overlay (Pop-in & Slide-Across) */}
      {comicBanner && (
        <div className="comic-phase-overlay" aria-live="assertive" role="alert">
          <div className="comic-speed-lines" aria-hidden="true" />
          <div className={`comic-banner-ribbon ${comicBanner.themeClass}`}>
            <div className="comic-ribbon-shine" />
            <div className="comic-banner-content">
              <span className="comic-phase-icon">{comicBanner.icon}</span>
              <div className="comic-text-group">
                <h2 className="comic-phase-title">{comicBanner.title}</h2>
                <span className="comic-phase-subtitle">{comicBanner.subtitle}</span>
              </div>
              <span className="comic-phase-icon-tail">{comicBanner.icon}</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Top Phase Flow Control Bar (Always accessible) */}
      <div className="phase-banner-wrapper">
        {turn !== undefined && (
          <div className="turn-counter-badge" title={`Lượt đấu thứ ${turn}`}>
            <span className="turn-icon">⏱️</span>
            <span className="turn-label">LƯỢT</span>
            <span className="turn-number">{turn} <span className="turn-infinity-total">/ ∞</span></span>
          </div>
        )}

        <div className="phases-flow-bar">
          {phasesList.map((p) => {
            const isCurrent = phase === p.id
            return (
              <div
                key={p.id}
                className={`phase-step ${isCurrent ? 'active-phase-step' : ''}`}
                style={{
                  borderColor: isCurrent ? p.activeColor : 'rgba(255,255,255,0.15)',
                  boxShadow: isCurrent ? `0 0 16px ${p.activeColor}` : 'none',
                }}
              >
                <span className="phase-step-pill-indicator" />
                <span className="phase-step-text">{p.label}</span>
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
    </>
  )
}

export default PhaseBanner
