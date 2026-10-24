import React, { useEffect } from 'react'
import type { Card as CardType, Side } from '../../engine/types'
import { Card } from '../cards/Card'
import { soundManager } from '../../audio/SoundManager'

export interface SuperpowerModalProps {
  side: Side
  superpower: CardType
  onPlaySuperpower: () => void
  onSaveSuperpower: () => void
}

/**
 * SuperpowerModal (Superpower Block Prompt)
 * Triggered when a Hero's 8-segment Super-Block charges completely.
 * Features:
 * - 360-degree radiant sunburst background rotation
 * - Pulsing heroic shield aura & energy particles
 * - Superpower card spotlight with animated holographic foil
 * - Authentic 2 options: "DÙNG NGAY MIỄN PHÍ" (Play For Free - 0 Cost) vs "LƯU VÀO TAY" (Keep in Hand)
 * - Triumphant Web Audio API fanfare `soundManager.playSuperBlock()`
 */
export const SuperpowerModal: React.FC<SuperpowerModalProps> = ({
  side,
  superpower,
  onPlaySuperpower,
  onSaveSuperpower,
}) => {
  const isPlant = side === 'plants'

  // Play heroic Super-Block fanfare on mount
  useEffect(() => {
    soundManager.playSuperBlock()
  }, [])

  const handlePlay = () => {
    soundManager.playBuff()
    onPlaySuperpower()
  }

  const handleSave = () => {
    soundManager.playCardPickup()
    onSaveSuperpower()
  }

  return (
    <div className="pvz-modal-backdrop superpower-modal-backdrop" role="dialog" aria-modal="true">
      {/* 1. Radiant Background Sunburst Rays */}
      <div className="superpower-sunburst-container" aria-hidden="true">
        <div className={`superpower-sunburst-rays ${isPlant ? 'plant-rays' : 'zombie-rays'}`} />
        <div className="superpower-ambient-glow" />
      </div>

      {/* 2. Modal Dialog Card */}
      <div className={`superpower-dialog-card ${side}-dialog`}>
        {/* Pulsing Energy Shield Halo */}
        <div className="superpower-shield-header">
          <div className="shield-emblem-wrapper">
            <span className="shield-emblem-icon">🛡️</span>
            <div className="shield-energy-ring ring-1" />
            <div className="shield-energy-ring ring-2" />
            <div className="shield-spark-particle spark-1" />
            <div className="shield-spark-particle spark-2" />
            <div className="shield-spark-particle spark-3" />
          </div>
          <h2 className="superpower-prompt-title">SUPER-BLOCK ĐÃ KÍCH HOẠT!</h2>
          <p className="superpower-prompt-subtitle">
            Khiên siêu năng lượng đã chặn <strong>100%</strong> sát thương! Bạn nhận được Siêu Năng Lực độc quyền:
          </p>
        </div>

        {/* Superpower Card Spotlight with Holographic Aura */}
        <div className="superpower-card-stage">
          <div className="card-stage-spotlight" />
          <div className="card-stage-pedestal" />
          <div className="superpower-card-wrapper">
            <Card
              card={superpower}
              isPlayable={true}
              size="lg"
              showTooltip={false}
              interactive={false}
            />
            {/* Free Cost Floating Tag */}
            <div className="superpower-free-cost-tag">
              <span className="free-tag-icon">⚡</span>
              <span className="free-tag-text">MIỄN PHÍ 0 {isPlant ? 'SUN' : 'BRAIN'}</span>
            </div>
          </div>
        </div>

        {/* Detailed Ability Description Box */}
        <div className="superpower-info-panel">
          <div className="superpower-name-row">
            <span className="superpower-rarity-chip">SIÊU NĂNG LỰC</span>
            <span className="superpower-name-text">{superpower.name}</span>
          </div>
          <p className="superpower-desc-text">
            {superpower.description || 'Kích hoạt ngay lập tức mà không tiêu tốn tài nguyên lượt này!'}
          </p>
        </div>

        {/* Decision Action Buttons */}
        <div className="superpower-choice-actions">
          {/* Golden Radiant Button: DÙNG NGAY MIỄN PHÍ */}
          <button
            className={`pvz-btn superpower-btn-play-free ${isPlant ? 'plant-gold-btn' : 'zombie-gold-btn'}`}
            onClick={handlePlay}
            autoFocus
          >
            <span className="btn-shine-sweep" />
            <span className="btn-icon">⚡</span>
            <div className="btn-text-group">
              <span className="btn-main-label">DÙNG NGAY MIỄN PHÍ</span>
              <span className="btn-sub-label">(0 {isPlant ? 'Mặt Trời' : 'Bộ Não'})</span>
            </div>
          </button>

          {/* Emerald Green / Blue Button: LƯU VÀO TAY */}
          <button
            className="pvz-btn superpower-btn-keep"
            onClick={handleSave}
          >
            <span className="btn-icon">📥</span>
            <div className="btn-text-group">
              <span className="btn-main-label">LƯU VÀO TAY</span>
              <span className="btn-sub-label">(Dùng sau này)</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default SuperpowerModal
