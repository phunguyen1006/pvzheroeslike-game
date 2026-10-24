import React, { useState, useEffect } from 'react'
import {
  getHeroQuests,
  getHeroQuestState,
  claimHeroQuestReward,
  type HeroQuest,
  type HeroQuestState,
} from '../../data/heroQuests'
import { soundManager } from '../../audio/SoundManager'

export interface HeroQuestsModalProps {
  isOpen: boolean
  onClose: () => void
  heroId: string
  heroName?: string
  heroAvatar?: string
}

export const HeroQuestsModal: React.FC<HeroQuestsModalProps> = ({
  isOpen,
  onClose,
  heroId,
  heroName,
  heroAvatar,
}) => {
  const [questState, setQuestState] = useState<HeroQuestState | null>(null)
  const [claimToast, setClaimToast] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && heroId) {
      setQuestState(getHeroQuestState(heroId))
    }
  }, [isOpen, heroId])

  if (!isOpen) return null

  const quests: HeroQuest[] = getHeroQuests(heroId)
  const state: HeroQuestState = questState || {
    currentStep: 1,
    currentCount: 0,
    claimedSteps: [],
    isFullyCompleted: false,
    lastUpdated: '',
  }

  const effectiveHeroName = heroName || quests[0]?.heroName || 'Anh Hùng'
  const effectiveHeroAvatar = heroAvatar || quests[0]?.heroAvatar || ''

  const handleClaim = (stepNumber: number) => {
    const result = claimHeroQuestReward(heroId, stepNumber)
    if (result && result.success) {
      soundManager.playBuff()
      setQuestState(getHeroQuestState(heroId))
      setClaimToast(
        `Chúc mừng! Bạn nhận được +${result.gemsAwarded} Gems, +${result.coinsAwarded} Coins${
          result.titleAwarded ? ` & Danh hiệu "${result.titleAwarded}"!` : '!'
        }`
      )
      setTimeout(() => setClaimToast(null), 3500)
    }
  }

  const completedStepsCount = state.claimedSteps.length
  const ultimateQuest = quests[quests.length - 1]

  return (
    <div className="challenges-modal-backdrop" onClick={onClose}>
      <div className="hero-quests-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="hero-quests-modal-header">
          <div className="hero-profile-cluster">
            {effectiveHeroAvatar && (
              <img
                src={effectiveHeroAvatar}
                alt={effectiveHeroName}
                className="hero-quests-modal-avatar"
              />
            )}
            <div className="hero-profile-titles">
              <span className="hero-quest-badge">CHUỖI NHIỆM VỤ ANH HÙNG (5 CHẶNG)</span>
              <h2 className="hero-quests-modal-name">{effectiveHeroName}</h2>
            </div>
          </div>
          <button className="challenges-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {claimToast && <div className="challenges-toast-notification">{claimToast}</div>}

        {/* Milestone Banner */}
        <div className="hero-quest-grand-banner">
          <div className="grand-banner-left">
            <span className="grand-banner-icon">👑</span>
            <div className="grand-banner-info">
              <h4>Phần Thưởng Tối Thượng: Danh Hiệu & Skin Unlock</h4>
              <p>
                Hoàn thành toàn bộ 5 chặng thử thách để mở khóa danh hiệu độc quyền{' '}
                <strong>"{ultimateQuest?.exclusiveTitle || 'Anh Hùng Bất Bại'}"</strong> và kho báu
                hơn 600 Gems!
              </p>
            </div>
          </div>
          <div className="grand-banner-progress">
            <span className="grand-progress-num">
              {state.isFullyCompleted ? '5 / 5' : `${completedStepsCount} / 5`}
            </span>
            <span className="grand-progress-label">Chặng đã xong</span>
          </div>
        </div>

        {/* Quest Steps List */}
        <div className="hero-quest-steps-scrollable">
          {quests.map((quest) => {
            const isClaimed = state.claimedSteps.includes(quest.stepNumber)
            const isCurrent = state.currentStep === quest.stepNumber && !state.isFullyCompleted
            const isPassed = state.currentStep > quest.stepNumber || state.isFullyCompleted
            const currentVal = isPassed ? quest.targetCount : isCurrent ? state.currentCount : 0
            const percent = Math.min(100, Math.round((currentVal / quest.targetCount) * 100))
            const canClaim = isCurrent && currentVal >= quest.targetCount && !isClaimed

            return (
              <div
                key={quest.id}
                className={`hero-quest-step-card ${isCurrent ? 'step-current' : ''} ${
                  isClaimed ? 'step-claimed' : ''
                } ${canClaim ? 'step-can-claim' : ''}`}
              >
                <div className="step-badge-col">
                  <div className="step-circle-badge">
                    {isClaimed ? '✓' : `CHẶNG ${quest.stepNumber}`}
                  </div>
                </div>

                <div className="step-info-col">
                  <div className="step-header-line">
                    <h3 className="step-title">{quest.title}</h3>
                    <span className="step-ratio-tag">
                      {currentVal} / {quest.targetCount}
                    </span>
                  </div>
                  <p className="step-description">{quest.description}</p>

                  <div className="step-progress-track">
                    <div className="step-progress-bar" style={{ width: `${percent}%` }} />
                  </div>

                  <div className="step-rewards-row">
                    <span className="reward-chip gem-chip">💎 +{quest.rewardGems} Gems</span>
                    <span className="reward-chip coin-chip">🪙 +{quest.rewardCoins} Coins</span>
                    {quest.exclusiveTitle && (
                      <span className="reward-chip title-chip">
                        ⭐ Danh hiệu: "{quest.exclusiveTitle}"
                      </span>
                    )}
                  </div>
                </div>

                <div className="step-action-col">
                  {isClaimed ? (
                    <span className="step-badge-claimed">✅ ĐÃ NHẬN</span>
                  ) : canClaim ? (
                    <button
                      className="step-claim-action-btn"
                      onClick={() => handleClaim(quest.stepNumber)}
                    >
                      🎁 NHẬN THƯỞNG
                    </button>
                  ) : (
                    <div className="step-locked-box">
                      <span className="lock-icon">{isCurrent ? '⏳' : '🔒'}</span>
                      <span className="lock-text">
                        {isCurrent ? `${percent}%` : 'Chưa mở'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Modal Footer */}
        <div className="hero-quests-modal-footer">
          <button className="hero-quests-modal-close-btn" onClick={onClose}>
            ĐÓNG
          </button>
        </div>
      </div>
    </div>
  )
}

export default HeroQuestsModal
