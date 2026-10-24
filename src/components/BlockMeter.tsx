import React, { useState, useEffect, useRef } from 'react'
import { soundManager } from '../audio/SoundManager'

export interface BlockMeterProps {
  side: 'plants' | 'zombies'
  meter: number
  isShieldActive?: boolean
  blockCount?: number
  lastCharge?: number
}

export const BlockMeter: React.FC<BlockMeterProps> = ({
  side,
  meter,
  isShieldActive = false,
  blockCount = 0,
  lastCharge,
}) => {
  const maxBlocks = 3
  const remainingBlocks = Math.max(0, maxBlocks - blockCount)
  const isExhausted = remainingBlocks === 0
  const isReady = isShieldActive || meter >= 8

  const [activeChargeRoll, setActiveChargeRoll] = useState<number | null>(null)
  const [flashingSegments, setFlashingSegments] = useState<number[]>([])
  const prevMeterRef = useRef(meter)

  useEffect(() => {
    const prev = prevMeterRef.current
    if (meter > prev && prev < 8) {
      const diff = lastCharge || Math.min(3, meter - prev)
      setActiveChargeRoll(diff)
      const chargedList: number[] = []
      for (let i = prev; i < meter && i < 8; i++) {
        chargedList.push(i)
      }
      setFlashingSegments(chargedList)
      soundManager.playBlockCharge(diff)

      const timer = setTimeout(() => {
        setActiveChargeRoll(null)
        setFlashingSegments([])
      }, 1000)

      prevMeterRef.current = meter
      return () => clearTimeout(timer)
    }
    prevMeterRef.current = meter
  }, [meter, lastCharge])

  return (
    <div
      className={`pvz-block-meter ${side}-block-meter ${isReady ? 'shield-triggered' : ''} ${
        isExhausted ? 'meter-exhausted' : ''
      } ${activeChargeRoll ? 'meter-is-charging' : ''}`}
      aria-label={`Super-Block Meter: ${meter}/8, ${remainingBlocks} shields left`}
    >
      {/* Floating 1-3 Roll Number Badge (Bounces with Sparkles) */}
      {activeChargeRoll !== null && (
        <div className="meter-roll-bounce-badge" key={`roll-${activeChargeRoll}-${meter}`}>
          <span className="roll-sparkle-icon">⚡</span>
          <span className="roll-number-text">+{activeChargeRoll}</span>
          <span className="roll-label">BLOCK</span>
        </div>
      )}

      {/* Meter Header: Title & Shield Charges */}
      <div className="meter-top-row">
        <span className="meter-badge-title">SUPER-BLOCK</span>
        <div className="shield-charges-row" title={`${remainingBlocks}/3 Lượt chặn Super-Block còn lại`}>
          {Array.from({ length: maxBlocks }).map((_, i) => {
            const hasShield = i < remainingBlocks
            return (
              <span
                key={i}
                className={`shield-charge-pip ${hasShield ? 'has-charge' : 'spent-charge'}`}
                title={hasShield ? 'Shield sẵn sàng' : 'Đã sử dụng'}
              >
                {hasShield ? '🛡️' : '⚪'}
              </span>
            )
          })}
        </div>
      </div>

      {/* 8-Segment Gauge Arc */}
      <div className="meter-segments-strip">
        {Array.from({ length: 8 }).map((_, index) => {
          const isFilled = index < meter
          const isNewlyCharged = flashingSegments.includes(index)
          const isLastFilled = index === meter - 1

          return (
            <div
              key={index}
              className={`meter-segment-pip ${isFilled ? 'pip-filled' : 'pip-empty'} ${
                isNewlyCharged ? 'pip-charging-flash' : isLastFilled ? 'pip-newly-charged' : ''
              }`}
            >
              <div className="pip-fill-inner" />
            </div>
          )
        })}
      </div>

      {/* Meter Subtext or Active Shield Banner */}
      {isReady ? (
        <div className="meter-shield-active-burst">
          <span className="burst-sparkle">✨</span>
          <span className="burst-text">SUPER-BLOCK READY!</span>
          <span className="burst-sparkle">✨</span>
        </div>
      ) : isExhausted ? (
        <div className="meter-status-note exhausted-note">Hết lượt Block (0/3)</div>
      ) : (
        <div className="meter-status-note">{meter}/8 Vạch</div>
      )}
    </div>
  )
}

export default BlockMeter
