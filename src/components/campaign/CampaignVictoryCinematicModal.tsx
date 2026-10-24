import React, { useEffect } from 'react'
import type { CampaignMission } from '../../engine/types'
import { soundManager } from '../../audio/SoundManager'

export interface CampaignVictoryCinematicModalProps {
  isOpen: boolean
  mission: CampaignMission
  starsWon: number
  turnCount: number
  playerHeroAvatar: string
  playerHeroName: string
  bossHeroAvatar: string
  bossHeroName: string
  onContinue: () => void
}

export const CampaignVictoryCinematicModal: React.FC<CampaignVictoryCinematicModalProps> = ({
  isOpen,
  mission,
  starsWon,
  turnCount,
  playerHeroAvatar,
  playerHeroName,
  bossHeroAvatar,
  bossHeroName,
  onContinue,
}) => {
  useEffect(() => {
    if (isOpen) {
      soundManager.playVictory()
    }
  }, [isOpen])

  if (!isOpen) return null

  const isZombieFaction = mission.faction === 'zombies'
  const cinematicTitle = isZombieFaction
    ? 'ZOMBOSS CHIẾN THẮNG: ĐẬP TAN BỨC TƯỜNG CITRON!'
    : 'PLANTS TOÀN THẮNG: PHÁ TAN PHÁO ĐÀI RUSTBOLT!'

  const cinematicSubtitle = isZombieFaction
    ? 'Bạn đã hoàn thành xuất sắc Chiến Dịch Zombie Chapter 2!'
    : 'Bạn đã hoàn thành xuất sắc Chiến Dịch Cây Trồng Chapter 2!'

  return (
    <div className="campaign-cinematic-backdrop">
      {/* Background Animated Rays & Glow */}
      <div className="cinematic-sunburst-rays" />
      <div className="cinematic-particle-dust" />

      <div className="campaign-cinematic-modal-dialog">
        {/* Top Trophy Banner */}
        <div className="cinematic-header-banner">
          <span className="cinematic-trophy-icon">🏆</span>
          <span className="cinematic-eyebrow">CHIẾN THẮNG HUYỀN THOẠI • HẠ GỤC ĐẠI BOSS CUỐI</span>
          <h1 className="cinematic-main-title">{cinematicTitle}</h1>
          <p className="cinematic-subtitle-text">{cinematicSubtitle}</p>
        </div>

        {/* Visual Showcase: Hero vs Defeated Boss */}
        <div className="cinematic-heroes-faceoff">
          <div className="cinematic-hero-card victor-card">
            <div className="hero-crown-badge">👑 KẺ CHIẾN THẮNG</div>
            <div className="hero-cinematic-avatar-wrap victor-avatar-wrap">
              <img src={playerHeroAvatar} alt={playerHeroName} className="cinematic-avatar-img" />
            </div>
            <h3 className="hero-cinematic-name">{playerHeroName}</h3>
            <span className="hero-cinematic-side-badge">
              {isZombieFaction ? '🧟 Phe Thây Ma' : '🌱 Phe Cây Trồng'}
            </span>
          </div>

          <div className="cinematic-vs-lightning">
            <span className="lightning-icon">⚡</span>
            <span className="victory-text">VICTORY</span>
            <span className="turn-stamp">Hạ gục sau {turnCount} lượt</span>
          </div>

          <div className="cinematic-hero-card defeated-card">
            <div className="hero-defeated-badge">💀 ĐÃ BỊ ĐÁNH BẠI</div>
            <div className="hero-cinematic-avatar-wrap defeated-avatar-wrap">
              <img src={bossHeroAvatar} alt={bossHeroName} className="cinematic-avatar-img defeated-img" />
            </div>
            <h3 className="hero-cinematic-name">{bossHeroName}</h3>
            <span className="hero-cinematic-side-badge defeated-side-badge">Boss Chapter 2</span>
          </div>
        </div>

        {/* Star Rating Section */}
        <div className="cinematic-stars-container">
          <div className="cinematic-stars-row">
            {[1, 2, 3].map((starIdx) => (
              <span
                key={starIdx}
                className={`cinematic-big-star ${starIdx <= starsWon ? 'star-earned' : 'star-missed'}`}
              >
                ★
              </span>
            ))}
          </div>
          <span className="cinematic-stars-score">
            {starsWon} / 3 SAO CHIẾN ĐẤU ĐẠT ĐƯỢC
          </span>

          <div className="cinematic-objectives-checklist">
            {mission.starObjectives.map((obj, idx) => (
              <div
                key={idx}
                className={`cinematic-objective-item ${idx + 1 <= starsWon ? 'objective-cleared' : ''}`}
              >
                <span className="obj-check-icon">{idx + 1 <= starsWon ? '✅' : '⚪'}</span>
                <span className="obj-text">{obj}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grand Rewards Panel */}
        <div className="cinematic-rewards-pod">
          <h4 className="rewards-pod-title">🎁 PHẦN THƯỞNG CHIẾN THẮNG TOÀN CHIẾN DỊCH</h4>
          <div className="rewards-pod-chips">
            <div className="reward-pod-item gems-pod">
              <span className="reward-pod-icon">💎</span>
              <div className="reward-pod-content">
                <strong className="reward-val">+{mission.rewards.gems} GEMS</strong>
                <span className="reward-desc">Đá quý chiến dịch</span>
              </div>
            </div>

            {mission.rewards.title && (
              <div className="reward-pod-item title-pod">
                <span className="reward-pod-icon">🏷️</span>
                <div className="reward-pod-content">
                  <strong className="reward-val">"{mission.rewards.title}"</strong>
                  <span className="reward-desc">Danh hiệu vinh danh tối thượng</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="cinematic-action-row">
          <button
            className="cinematic-continue-btn"
            onClick={() => {
              soundManager.playBuff()
              onContinue()
            }}
          >
            ⭐ TIẾP TỤC HÀNH TRÌNH ⭐
          </button>
        </div>
      </div>
    </div>
  )
}

export default CampaignVictoryCinematicModal
