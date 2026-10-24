import React from 'react'

export interface BlockMeterProps {
  side: 'plants' | 'zombies'
  meter: number
  isShieldActive?: boolean
  blockCount?: number
}

export const BlockMeter: React.FC<BlockMeterProps> = ({
  side,
  meter,
  isShieldActive = false,
  blockCount = 0,
}) => {
  const maxBlocks = 3
  const remainingBlocks = Math.max(0, maxBlocks - blockCount)
  const isExhausted = remainingBlocks === 0

  return (
    <div
      className={`pvz-block-meter ${side}-block-meter ${isShieldActive ? 'shield-triggered' : ''} ${
        isExhausted ? 'meter-exhausted' : ''
      }`}
      aria-label={`Super-Block Meter: ${meter}/8, ${remainingBlocks} shields left`}
    >
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
          const isLastFilled = index === meter - 1
          return (
            <div
              key={index}
              className={`meter-segment-pip ${isFilled ? 'pip-filled' : 'pip-empty'} ${
                isLastFilled ? 'pip-newly-charged' : ''
              }`}
            >
              <div className="pip-fill-inner" />
            </div>
          )
        })}
      </div>

      {/* Meter Subtext or Active Shield Banner */}
      {isShieldActive ? (
        <div className="meter-shield-active-burst">
          <span className="burst-sparkle">✨</span>
          <span className="burst-text">SUPER-BLOCK!</span>
          <span className="burst-sparkle">✨</span>
        </div>
      ) : isExhausted ? (
        <div className="meter-status-note exhausted-note">Hết lượt Block</div>
      ) : (
        <div className="meter-status-note">{meter}/8 Vạch</div>
      )}
    </div>
  )
}

export default BlockMeter
