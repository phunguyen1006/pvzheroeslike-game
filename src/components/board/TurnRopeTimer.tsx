import React, { useEffect, useRef } from 'react'
import { soundManager } from '../../audio/SoundManager'

export interface TurnRopeTimerProps {
  timeLeft: number // in seconds
  maxTime?: number // in seconds (default 15)
  isActive: boolean
  onTimeout?: () => void
}

export const TurnRopeTimer: React.FC<TurnRopeTimerProps> = ({
  timeLeft,
  maxTime = 15,
  isActive,
  onTimeout,
}) => {
  const prevTimeRef = useRef<number>(timeLeft)
  const isUrgent = timeLeft <= 5 && timeLeft > 0
  const progressRatio = Math.max(0, Math.min(1, timeLeft / maxTime))

  // Play ticking and sizzle sounds as time elapses
  useEffect(() => {
    if (!isActive || timeLeft <= 0) return

    if (timeLeft !== prevTimeRef.current) {
      soundManager.playTimerTick(isUrgent)
      if (timeLeft % 3 === 0 || isUrgent) {
        soundManager.playFuseSizzle()
      }
      prevTimeRef.current = timeLeft
    }

    if (timeLeft === 0 && prevTimeRef.current > 0) {
      onTimeout?.()
    }
  }, [timeLeft, isActive, isUrgent, onTimeout])

  if (!isActive || timeLeft <= 0) {
    return null
  }

  return (
    <div
      className={`pvz-turn-rope-container ${isUrgent ? 'rope-urgent-mode' : ''}`}
      role="timer"
      aria-label={`Thời gian còn lại: ${timeLeft} giây`}
      aria-live="polite"
    >
      {/* Outer Fuse Track */}
      <div className="turn-rope-track">
        {/* Burning Unspent Rope Segment */}
        <div
          className="turn-rope-fuse"
          style={{
            width: `${progressRatio * 100}%`,
          }}
        >
          {/* Hemp Rope Texture Detail */}
          <div className="rope-texture-strip" />

          {/* Sizzling Burning Spark & Embers at the Burning Tip */}
          <div className="rope-spark-head">
            <div className="spark-flame-core" />
            <div className="spark-flame-glow" />
            <div className="spark-particles">
              <span className="spark-particle p-1" />
              <span className="spark-particle p-2" />
              <span className="spark-particle p-3" />
            </div>
            <div className="spark-smoke-puff" />
          </div>
        </div>

        {/* Ash Trail (already burned) */}
        <div
          className="turn-rope-ash-trail"
          style={{
            width: `${(1 - progressRatio) * 100}%`,
          }}
        />
      </div>

      {/* Comic Countdown Digits Badge */}
      <div className={`turn-rope-countdown-badge ${isUrgent ? 'badge-pulse-urgent' : ''}`}>
        <span className="countdown-fire-icon">🔥</span>
        <span className="countdown-number">{timeLeft}s</span>
      </div>
    </div>
  )
}

export default TurnRopeTimer
