import React, { useEffect, useRef } from 'react'
import { soundManager } from '../../audio/SoundManager'

export type TimerUrgency = 'safe' | 'warning' | 'critical'

export interface TurnTimerBarProps {
  timeLeft: number // in seconds
  maxTime?: number // in seconds (default: 15)
  isActive?: boolean
  onTimeout?: () => void
  side?: 'plants' | 'zombies'
  soundEnabled?: boolean
  className?: string
  showBadge?: boolean
}

/**
 * Returns the urgency level based on remaining time and max time:
 * - 'critical': last 5 seconds (or <= 5s)
 * - 'warning': between 6s and 10s (or burning middle phase)
 * - 'safe': plenty of time remaining (> 10s or top half)
 */
export function getTimerUrgency(timeLeft: number, maxTime: number = 15): TimerUrgency {
  if (timeLeft <= 5 && timeLeft > 0) {
    return 'critical'
  }
  const ratio = Math.max(0, Math.min(1, timeLeft / maxTime))
  if (timeLeft <= 10 || ratio <= 0.6) {
    return 'warning'
  }
  return 'safe'
}

/**
 * Color gradients:
 * - Green (safe): vibrant emerald to lime
 * - Orange/Yellow (warning / burning rope): amber to glowing orange/yellow
 * - Pulsing Red (critical last 5s): deep crimson to vivid red
 */
export function getTimerGradient(urgency: TimerUrgency): string {
  switch (urgency) {
    case 'critical':
      return 'linear-gradient(90deg, #991b1b 0%, #ef4444 65%, #f87171 100%)'
    case 'warning':
      return 'linear-gradient(90deg, #b45309 0%, #f59e0b 50%, #facc15 100%)'
    case 'safe':
    default:
      return 'linear-gradient(90deg, #15803d 0%, #22c55e 60%, #86efac 100%)'
  }
}

export function getTimerColor(urgency: TimerUrgency): string {
  switch (urgency) {
    case 'critical':
      return '#ef4444' // Red
    case 'warning':
      return '#f59e0b' // Orange / Amber
    case 'safe':
    default:
      return '#22c55e' // Green
  }
}

/**
 * TurnTimerBar - Authentic PvZ Heroes Rope Timer Component
 * - Green -> Orange/Yellow (burning rope) -> Pulsing Red (critical last 5s)
 * - Flame/spark particle CSS animation at the burning tip of the rope
 * - Sizzle audio trigger & visual sizzle indicator
 */
export const TurnTimerBar: React.FC<TurnTimerBarProps> = ({
  timeLeft,
  maxTime = 15,
  isActive = true,
  onTimeout,
  side,
  soundEnabled = true,
  className = '',
  showBadge = true,
}) => {
  const prevTimeRef = useRef<number>(timeLeft)
  const safeMax = Math.max(1, maxTime)
  const clampedTime = Math.max(0, Math.min(safeMax, timeLeft))
  const progressRatio = clampedTime / safeMax
  const progressPercent = Math.max(0, Math.min(100, progressRatio * 100))

  const urgency = getTimerUrgency(clampedTime, safeMax)
  const isCritical = urgency === 'critical'
  const isWarning = urgency === 'warning'
  const urgencyGradient = getTimerGradient(urgency)
  const urgencyColor = getTimerColor(urgency)

  // Audio trigger for timer tick and fuse sizzle
  useEffect(() => {
    if (!isActive || clampedTime <= 0 || !soundEnabled) return

    if (clampedTime !== prevTimeRef.current) {
      soundManager.playTimerTick(isCritical)
      if (isCritical || clampedTime % 3 === 0) {
        soundManager.playFuseSizzle()
      }
      prevTimeRef.current = clampedTime
    }

    if (clampedTime === 0 && prevTimeRef.current > 0) {
      onTimeout?.()
    }
  }, [clampedTime, isActive, isCritical, soundEnabled, onTimeout])

  if (!isActive || clampedTime <= 0) {
    return null
  }

  const urgencyClass = `timer-${urgency} urgency-${urgency}`
  const sideClass = side ? `side-${side}` : ''

  return (
    <div
      className={`pvz-turn-rope-container turn-timer-bar-container ${urgencyClass} ${
        isCritical ? 'rope-urgent-mode timer-pulsing-red' : ''
      } ${sideClass} ${className}`.trim()}
      role="timer"
      aria-label={`Thời gian lượt còn lại: ${clampedTime} giây`}
      aria-valuenow={clampedTime}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      data-testid="turn-timer-bar"
      data-urgency={urgency}
      data-time-left={clampedTime}
      data-progress={progressRatio}
    >
      {/* Outer Fuse Track */}
      <div className="turn-rope-track" data-testid="turn-timer-track">
        {/* Burning Rope Segment */}
        <div
          className={`turn-rope-fuse turn-timer-rope-fuse ${urgencyClass}`}
          data-testid="turn-timer-fuse"
          style={{
            width: `${progressPercent}%`,
            background: urgencyGradient,
            boxShadow: isCritical
              ? '0 0 14px rgba(239, 68, 68, 0.8), 0 0 28px rgba(220, 38, 38, 0.5)'
              : isWarning
              ? '0 0 10px rgba(245, 158, 11, 0.7)'
              : '0 0 8px rgba(34, 197, 94, 0.6)',
          }}
        >
          {/* Hemp Rope Texture Detail */}
          <div className="rope-texture-strip" />

          {/* Sizzling Burning Spark & Embers at the Burning Tip */}
          <div
            className="rope-spark-head rope-burning-tip"
            data-testid="rope-burning-tip"
            style={{
              borderColor: urgencyColor,
            }}
          >
            <div className="spark-flame-core" data-testid="flame-core" />
            <div className="spark-flame-glow" />
            <div className="spark-particles" data-testid="spark-particles">
              <span className="spark-particle p-1" />
              <span className="spark-particle p-2" />
              <span className="spark-particle p-3" />
              <span className="spark-particle p-4" />
            </div>
            <div className="spark-smoke-puff" />
          </div>
        </div>

        {/* Ash Trail (already burned) */}
        <div
          className="turn-rope-ash-trail"
          data-testid="turn-timer-ash-trail"
          style={{
            width: `${100 - progressPercent}%`,
          }}
        />
      </div>

      {/* Visual Sizzle Sound Indication */}
      <div
        className={`visual-sizzle-indicator ${isCritical ? 'sizzle-pulsing' : ''}`}
        data-testid="visual-sizzle-indicator"
        title="Visual sizzle sound indicator"
      >
        <span className="sizzle-spark-icon">{isCritical ? '💥' : '⚡'}</span>
        <span className="sizzle-text">{isCritical ? 'SIZZLE!' : 'Sizzle'}</span>
      </div>

      {/* Comic Countdown Digits Badge */}
      {showBadge && (
        <div
          className={`turn-rope-countdown-badge ${isCritical ? 'badge-pulse-urgent' : ''}`}
          data-testid="turn-timer-badge"
          style={{
            borderColor: urgencyColor,
          }}
        >
          <span className="countdown-fire-icon">{isCritical ? '💥' : '🔥'}</span>
          <span className="countdown-number" data-testid="countdown-number">
            {clampedTime}s
          </span>
        </div>
      )}
    </div>
  )
}

export default TurnTimerBar
