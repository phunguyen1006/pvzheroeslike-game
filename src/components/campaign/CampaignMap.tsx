import React, { useState, useEffect } from 'react'
import {
  CHAPTER_1_MISSIONS,
  loadCampaignProgress,
  saveCampaignProgress,
  getInitialCampaignProgress,
} from '../../data/campaign'
import type { CampaignMission, CampaignProgress } from '../../engine/types'
import { soundManager } from '../../audio/SoundManager'

export interface CampaignMapProps {
  onStartMission: (mission: CampaignMission) => void
  onBack: () => void
}

export const CampaignMap: React.FC<CampaignMapProps> = ({ onStartMission, onBack }) => {
  const [progress, setProgress] = useState<CampaignProgress>(loadCampaignProgress)
  const [selectedMission, setSelectedMission] = useState<CampaignMission | null>(null)

  useEffect(() => {
    setProgress(loadCampaignProgress())
  }, [])

  // Calculate total stars earned
  const totalStars = Object.values(progress.completedMissions).reduce(
    (sum, m) => sum + (m.stars || 0),
    0
  )
  const maxStars = CHAPTER_1_MISSIONS.length * 3
  const completedCount = Object.keys(progress.completedMissions).length

  // Select a mission to view briefing
  const handleSelectMission = (mission: CampaignMission) => {
    const isUnlocked = mission.missionNumber <= progress.unlockedMissionNumber
    if (!isUnlocked) {
      soundManager.playCardDrop()
      return
    }
    soundManager.playBuff()
    setSelectedMission(mission)
  }

  // Start the mission
  const handleLaunchBattle = (mission: CampaignMission) => {
    soundManager.playBuff()
    onStartMission(mission)
  }

  // Reset progress (useful for players to replay the whole campaign)
  const handleResetProgress = () => {
    if (window.confirm('Bạn có chắc chắn muốn đặt lại toàn bộ tiến độ Campaign Chapter 1 không?')) {
      const reset = getInitialCampaignProgress()
      saveCampaignProgress(reset)
      setProgress(reset)
      setSelectedMission(null)
      soundManager.playCardDrop()
    }
  }

  return (
    <div className="campaign-map-screen-layout">
      {/* Top Navigation & Status Bar */}
      <header className="campaign-top-bar">
        <button className="back-btn" onClick={onBack}>
          ⬅ QUAY LẠI MENU
        </button>

        <div className="campaign-title-group">
          <h1 className="campaign-main-heading">CHIẾN DỊCH (CAMPAIGN MODE)</h1>
          <span className="campaign-sub-heading">
            Chapter 1: Suburban Crisis (Khủng Hoảng Ngoại Ô)
          </span>
        </div>

        <div className="campaign-stats-pill">
          <div className="stat-star-item">
            <span className="star-icon">⭐</span>
            <span className="star-count">
              {totalStars} / {maxStars}
            </span>
          </div>
          <div className="stat-mission-item">
            <span className="mission-icon">🗺️</span>
            <span className="mission-count">
              {completedCount} / {CHAPTER_1_MISSIONS.length} Màn
            </span>
          </div>
          <button
            className="campaign-reset-btn"
            onClick={handleResetProgress}
            title="Đặt lại tiến trình Chapter 1"
          >
            🔄
          </button>
        </div>
      </header>

      {/* Main Campaign Canvas */}
      <main className="campaign-map-content">
        {/* Story Chapter Banner */}
        <div className="chapter-story-banner">
          <div className="chapter-banner-badge">CHAPTER 1</div>
          <h2 className="chapter-banner-title">KHỦNG HOẢNG NGOẠI Ô (SUBURBAN CRISIS)</h2>
          <p className="chapter-banner-desc">
            Tiến sĩ Zomboss đã phái 5 tướng lĩnh Zombie sừng sỏ nhất tràn vào khu phố ngoại ô! Hãy
            sát cánh cùng Dave và các chiến binh Cây Trồng để đập tan âm mưu thôn tính sân vườn!
          </p>
        </div>

        {/* Roadmap Nodes Sequence */}
        <div className="campaign-nodes-timeline">
          {CHAPTER_1_MISSIONS.map((mission, index) => {
            const isUnlocked = mission.missionNumber <= progress.unlockedMissionNumber
            const missionRecord = progress.completedMissions[mission.id]
            const starsWon = missionRecord?.stars || 0
            const isCompleted = starsWon > 0
            const isSelected = selectedMission?.id === mission.id
            const isBoss = mission.difficulty === 'boss'

            return (
              <React.Fragment key={mission.id}>
                {/* Connecting road segment between nodes */}
                {index > 0 && (
                  <div
                    className={`node-connector-line ${
                      mission.missionNumber <= progress.unlockedMissionNumber
                        ? 'connector-unlocked'
                        : 'connector-locked'
                    }`}
                  >
                    <div className="connector-road-dashes" />
                  </div>
                )}

                {/* Node Card / Avatar */}
                <div
                  className={`campaign-node-card ${isUnlocked ? 'node-unlocked' : 'node-locked'} ${
                    isSelected ? 'node-selected' : ''
                  } ${isBoss ? 'boss-finale-node' : ''} ${isCompleted ? 'node-completed' : ''}`}
                  onClick={() => handleSelectMission(mission)}
                >
                  {/* Boss Avatar & Lock overlay */}
                  <div className="node-avatar-frame">
                    <img
                      src={mission.bossHeroAvatar}
                      alt={mission.bossHeroName}
                      className="node-boss-avatar-img"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                    {!isUnlocked && (
                      <div className="node-lock-overlay">
                        <span className="lock-icon">🔒</span>
                      </div>
                    )}
                    {isCompleted && (
                      <div className="node-cleared-badge">
                        <span>✓</span>
                      </div>
                    )}
                    <div className="node-level-tag">Màn {mission.missionNumber}</div>
                  </div>

                  {/* Node Information */}
                  <div className="node-meta-box">
                    <span className="node-boss-name">{mission.bossHeroName}</span>
                    <span className="node-mission-title">{mission.title}</span>

                    {/* Difficulty Badge */}
                    <span className={`node-difficulty-badge diff-${mission.difficulty}`}>
                      {mission.difficulty === 'boss'
                        ? '👑 BOSS CUỐI'
                        : mission.difficulty === 'hard'
                          ? '🔥 KHÓ'
                          : mission.difficulty === 'normal'
                            ? '⚡ TRUNG BÌNH'
                            : '🌱 DỄ'}
                    </span>

                    {/* Stars earned display */}
                    <div className="node-stars-row">
                      {[1, 2, 3].map((starIdx) => (
                        <span
                          key={starIdx}
                          className={`node-star-pip ${starIdx <= starsWon ? 'star-filled' : 'star-empty'}`}
                        >
                          ⭐
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            )
          })}
        </div>

        {/* Selected Mission Briefing Modal / Drawer */}
        {selectedMission && (
          <div className="mission-briefing-drawer-backdrop" onClick={() => setSelectedMission(null)}>
            <div
              className="mission-briefing-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="briefing-header">
                <div className="briefing-header-left">
                  <span className={`briefing-diff-tag diff-${selectedMission.difficulty}`}>
                    {selectedMission.difficulty === 'boss'
                      ? '👑 BOSS CUỐI CHAPTER'
                      : `MÀN ${selectedMission.missionNumber}`}
                  </span>
                  <h3 className="briefing-title">{selectedMission.title}</h3>
                  <span className="briefing-subtitle">{selectedMission.subtitle}</span>
                </div>
                <button
                  className="briefing-close-btn"
                  onClick={() => setSelectedMission(null)}
                >
                  ✕
                </button>
              </div>

              <div className="briefing-body">
                {/* Boss Spotlight & Story Intro */}
                <div className="briefing-boss-section">
                  <div className="briefing-boss-portrait-box">
                    <img
                      src={selectedMission.bossHeroAvatar}
                      alt={selectedMission.bossHeroName}
                      className="briefing-boss-img"
                    />
                    <span className="briefing-boss-name-label">
                      {selectedMission.bossHeroName}
                    </span>
                  </div>
                  <div className="briefing-story-speech-bubble">
                    <div className="speech-quote-icon">“</div>
                    <p className="briefing-story-text">{selectedMission.storyIntro}</p>
                  </div>
                </div>

                {/* Special Mission Rule Modifier */}
                <div className="briefing-rule-box">
                  <div className="rule-header">
                    <span className="rule-badge-icon">⚡</span>
                    <span className="rule-title">
                      LUẬT CHƠI ĐẶC BIỆT: {selectedMission.rule.name}
                    </span>
                  </div>
                  <p className="rule-description">{selectedMission.rule.description}</p>
                </div>

                {/* 3-Star Objectives */}
                <div className="briefing-stars-box">
                  <span className="stars-box-title">MỤC TIÊU ĐẠT SAO:</span>
                  <div className="stars-objectives-list">
                    {selectedMission.starObjectives.map((objText, idx) => {
                      const isAccomplished =
                        (progress.completedMissions[selectedMission.id]?.stars || 0) >= idx + 1

                      return (
                        <div
                          key={idx}
                          className={`star-obj-row ${isAccomplished ? 'obj-accomplished' : ''}`}
                        >
                          <span className="obj-star-icon">
                            {isAccomplished ? '🌟' : '⭐'}
                          </span>
                          <span className="obj-text">{objText}</span>
                          {isAccomplished && <span className="obj-cleared-tag">ĐÃ ĐẠT</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Rewards Preview */}
                <div className="briefing-rewards-row">
                  <span className="rewards-label">Phần thưởng vượt ải:</span>
                  <div className="reward-item">
                    <span className="gem-icon">💎</span>
                    <span className="reward-val">+{selectedMission.rewards.gems} Gems</span>
                  </div>
                  {selectedMission.rewards.title && (
                    <div className="reward-item title-reward">
                      <span className="trophy-icon">🏆</span>
                      <span className="reward-val">
                        Danh hiệu: &quot;{selectedMission.rewards.title}&quot;
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Briefing Footer Action */}
              <div className="briefing-footer">
                <button
                  className="briefing-cancel-btn"
                  onClick={() => setSelectedMission(null)}
                >
                  Đóng
                </button>
                <button
                  className="briefing-start-battle-btn"
                  onClick={() => handleLaunchBattle(selectedMission)}
                >
                  ⚔️ XUẤT TRẬN NGAY (START BATTLE)
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default CampaignMap
