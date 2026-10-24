import React, { useState, useEffect } from 'react'
import {
  CAMPAIGN_CHAPTERS,
  ALL_CAMPAIGN_MISSIONS,
  ZOMBIE_CAMPAIGN_CHAPTERS,
  ALL_ZOMBIE_CAMPAIGN_MISSIONS,
  loadCampaignProgress,
  saveCampaignProgress,
  getInitialCampaignProgress,
  loadZombieCampaignProgress,
  saveZombieCampaignProgress,
  getInitialZombieCampaignProgress,
  loadSavedDecks,
  buildEngineDeckFromMap,
  CAMPAIGN_STAR_MILESTONES,
  loadClaimedMilestones,
  claimMilestoneReward,
  getTotalCampaignStars,
} from '../../data/campaign'
import {
  CURRENT_WEEKLY_EVENT,
  loadEventTicketsProgress,
  claimEventCardCopy,
  getWeeklyEventCountdown,
  type WeeklyEventProgress,
} from '../../data/eventTickets'
import type { CampaignMission, CampaignProgress, Side, Card as EngineCard, SavedDeck } from '../../engine/types'
import { soundManager } from '../../audio/SoundManager'

export interface CampaignMapProps {
  onStartMission: (mission: CampaignMission, customDeck?: EngineCard[]) => void
  onBack: () => void
}

export const CampaignMap: React.FC<CampaignMapProps> = ({ onStartMission, onBack }) => {
  const [campaignFaction, setCampaignFaction] = useState<Side>('plants')
  const [plantProgress, setPlantProgress] = useState<CampaignProgress>(loadCampaignProgress)
  const [zombieProgress, setZombieProgress] = useState<CampaignProgress>(loadZombieCampaignProgress)
  const [activeChapterId, setActiveChapterId] = useState<number>(1)
  const [selectedMission, setSelectedMission] = useState<CampaignMission | null>(null)

  // Custom Deck Selection state for Mission Briefing
  const [availableSavedDecks, setAvailableSavedDecks] = useState<SavedDeck[]>([])
  const [selectedDeckId, setSelectedDeckId] = useState<string>('starter')

  // Star Milestone Rewards Modal state
  const [showRewardsModal, setShowRewardsModal] = useState<boolean>(false)
  const [claimedMilestones, setClaimedMilestones] = useState<number[]>(loadClaimedMilestones)
  const [milestoneRewardMessage, setMilestoneRewardMessage] = useState<string | null>(null)

  // Weekly Event state
  const [eventProgress, setEventProgress] = useState<WeeklyEventProgress>(loadEventTicketsProgress)
  const [showEventModal, setShowEventModal] = useState<boolean>(false)
  const [claimSuccessMessage, setClaimSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    setPlantProgress(loadCampaignProgress())
    setZombieProgress(loadZombieCampaignProgress())
    setEventProgress(loadEventTicketsProgress())
    setClaimedMilestones(loadClaimedMilestones())
  }, [])

  const isZombie = campaignFaction === 'zombies'
  const currentProgress = isZombie ? zombieProgress : plantProgress
  const availableChapters = isZombie ? ZOMBIE_CAMPAIGN_CHAPTERS : CAMPAIGN_CHAPTERS
  const allMissions = isZombie ? ALL_ZOMBIE_CAMPAIGN_MISSIONS : ALL_CAMPAIGN_MISSIONS

  const currentChapter =
    availableChapters.find((c) => c.id === activeChapterId) || availableChapters[0]

  // Calculate total stars earned across active faction campaign
  const totalStars = Object.values(currentProgress.completedMissions).reduce(
    (sum, m) => sum + (m.stars || 0),
    0
  )
  const maxStars = allMissions.length * 3
  const completedCount = Object.keys(currentProgress.completedMissions).length

  // Overall combined stars across both campaigns
  const combinedCampaignStars = getTotalCampaignStars(plantProgress, zombieProgress)

  // Select a mission to view briefing
  const handleSelectMission = (mission: CampaignMission) => {
    const isUnlocked = mission.missionNumber <= currentProgress.unlockedMissionNumber
    if (!isUnlocked) {
      soundManager.playCardDrop()
      return
    }
    soundManager.playBuff()
    const playerSide = mission.faction === 'zombies' ? 'zombies' : 'plants'
    const decks = loadSavedDecks(playerSide)
    setAvailableSavedDecks(decks)
    setSelectedDeckId('starter')
    setSelectedMission(mission)
  }

  // Start the mission with optional custom deck
  const handleLaunchBattle = (mission: CampaignMission) => {
    soundManager.playBuff()
    const playerSide = mission.faction === 'zombies' ? 'zombies' : 'plants'
    let customDeck: EngineCard[] | undefined = undefined

    if (selectedDeckId !== 'starter') {
      const chosenDeck = availableSavedDecks.find((d) => d.id === selectedDeckId)
      if (chosenDeck && chosenDeck.cardIds) {
        customDeck = buildEngineDeckFromMap(chosenDeck.cardIds, playerSide)
      }
    }

    onStartMission(mission, customDeck)
  }

  // Claim a star milestone reward
  const handleClaimMilestone = (requiredStars: number) => {
    const starsData = getTotalCampaignStars(plantProgress, zombieProgress)
    const res = claimMilestoneReward(requiredStars, starsData.totalStars)
    if (res && res.success) {
      setClaimedMilestones(loadClaimedMilestones())
      setMilestoneRewardMessage(`Chúc mừng! Bạn đã nhận ${res.gemsAwarded || res.gems} Gems và danh hiệu "${res.badge}"!`)
      soundManager.playBuff()
      setTimeout(() => setMilestoneRewardMessage(null), 4500)
    } else if (res && res.error) {
      setMilestoneRewardMessage(res.error)
      soundManager.playCardDrop()
      setTimeout(() => setMilestoneRewardMessage(null), 3000)
    }
  }

  // Switch active chapter
  const handleSwitchChapter = (chapterId: number) => {
    soundManager.playCardDrop()
    setActiveChapterId(chapterId)
    setSelectedMission(null)
  }

  // Switch faction (Plants vs Zombies)
  const handleSwitchFaction = (faction: Side) => {
    if (faction === campaignFaction) return
    soundManager.playCardDrop()
    setCampaignFaction(faction)
    setActiveChapterId(1)
    setSelectedMission(null)
  }

  // Reset progress (useful for players to replay the active campaign)
  const handleResetProgress = () => {
    const factionName = isZombie ? 'Chiến Dịch Thây Ma' : 'Chiến Dịch Cây Trồng'
    if (
      window.confirm(
        `Bạn có chắc chắn muốn đặt lại toàn bộ tiến độ ${factionName} không?`
      )
    ) {
      if (isZombie) {
        const reset = getInitialZombieCampaignProgress()
        saveZombieCampaignProgress(reset)
        setZombieProgress(reset)
      } else {
        const reset = getInitialCampaignProgress()
        saveCampaignProgress(reset)
        setPlantProgress(reset)
      }
      setSelectedMission(null)
      soundManager.playCardDrop()
    }
  }

  // Handle claiming an unlocked event card copy
  const handleClaimEventCard = () => {
    const res = claimEventCardCopy(CURRENT_WEEKLY_EVENT)
    if (res.success) {
      setEventProgress(res.progress)
      setClaimSuccessMessage(`Chúc mừng! Bạn đã nhận 1 bản sao ${CURRENT_WEEKLY_EVENT.cardName}!`)
      soundManager.playBuff()
      setTimeout(() => setClaimSuccessMessage(null), 4000)
    }
  }

  const countdown = getWeeklyEventCountdown(CURRENT_WEEKLY_EVENT.endDate)
  const canClaim = eventProgress.unlockedCopies > eventProgress.claimedCopies

  return (
    <div
      className={`campaign-map-screen-layout ${
        isZombie ? 'campaign-theme-zombies' : 'campaign-theme-plants'
      }`}
    >
      {/* Top Navigation & Status Bar */}
      <header className="campaign-top-bar">
        <button className="back-btn" onClick={onBack}>
          ⬅ QUAY LẠI MENU
        </button>

        <div className="campaign-title-group">
          <h1 className="campaign-main-heading">
            {isZombie ? '🧟 CHIẾN DỊCH THÂY MA' : '🌱 CHIẾN DỊCH CÂY TRỒNG'}
          </h1>
          <span className="campaign-sub-heading">{currentChapter.title}</span>
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
              {completedCount} / {allMissions.length} Màn
            </span>
          </div>
          <button
            className="campaign-rewards-pill-btn"
            onClick={() => {
              setClaimedMilestones(loadClaimedMilestones())
              setShowRewardsModal(true)
            }}
            title="Xem và nhận phần thưởng mốc sao chiến dịch"
          >
            🏆 THƯỞNG ({combinedCampaignStars.totalStars}/45 ⭐)
          </button>
          <button
            className="campaign-reset-btn"
            onClick={handleResetProgress}
            title="Đặt lại toàn bộ tiến trình phe này"
          >
            🔄
          </button>
        </div>
      </header>

      {/* Main Campaign Canvas */}
      <main className="campaign-map-content">
        {/* Campaign Faction Toggle & Weekly Event Banner Bar */}
        <div className="campaign-controls-header-bar">
          {/* Dual-Faction Toggle Switch */}
          <div className="campaign-faction-switcher" role="tablist">
            <button
              className={`faction-toggle-btn faction-btn-plants ${
                !isZombie ? 'active' : ''
              }`}
              onClick={() => handleSwitchFaction('plants')}
            >
              <span className="faction-emoji">🌿</span>
              <span className="faction-label">Chiến Dịch Cây Trồng</span>
              <span className="faction-star-pill">
                ⭐{' '}
                {Object.values(plantProgress.completedMissions).reduce(
                  (s, m) => s + (m.stars || 0),
                  0
                )}
                /30
              </span>
            </button>

            <button
              className={`faction-toggle-btn faction-btn-zombies ${
                isZombie ? 'active' : ''
              }`}
              onClick={() => handleSwitchFaction('zombies')}
            >
              <span className="faction-emoji">🧟</span>
              <span className="faction-label">Chiến Dịch Thây Ma</span>
              <span className="faction-star-pill">
                ⭐{' '}
                {Object.values(zombieProgress.completedMissions).reduce(
                  (s, m) => s + (m.stars || 0),
                  0
                )}
                /15
              </span>
            </button>
          </div>

          {/* Weekly Event Ticket Pill */}
          <div
            className="weekly-event-summary-pill"
            onClick={() => setShowEventModal(true)}
            title="Nhấn để xem chi tiết Sự Kiện Tuần"
          >
            <div className="event-pill-avatar-wrap">
              <img
                src={CURRENT_WEEKLY_EVENT.cardAvatar}
                alt={CURRENT_WEEKLY_EVENT.cardName}
                className="event-pill-avatar"
              />
              <span className="event-tag-badge">EVENT</span>
            </div>
            <div className="event-pill-info">
              <span className="event-pill-name">{CURRENT_WEEKLY_EVENT.cardName}</span>
              <span className="event-pill-tickets">
                🎟️ {eventProgress.tickets % CURRENT_WEEKLY_EVENT.targetTicketsPerCopy} /{' '}
                {CURRENT_WEEKLY_EVENT.targetTicketsPerCopy} Vé
              </span>
            </div>
            <div className="event-pill-copies">
              <span className="copies-count">
                {eventProgress.claimedCopies}/{CURRENT_WEEKLY_EVENT.maxCopies} Đã nhận
              </span>
              {canClaim && (
                <span className="claim-ready-pulse">Nhận Ngay!</span>
              )}
            </div>
          </div>
        </div>

        {/* Claim Success Banner Notification */}
        {claimSuccessMessage && (
          <div className="event-claim-banner-notif">
            <span>🎉 {claimSuccessMessage}</span>
          </div>
        )}

        {/* Chapter Selection Tab Pills */}
        <div className="campaign-chapter-tabs-strip">
          {availableChapters.map((ch) => {
            const isChUnlocked =
              ch.id === 1 || currentProgress.unlockedMissionNumber >= (ch.id - 1) * 5 + 1
            const isChActive = ch.id === activeChapterId
            const chStars = ch.missions.reduce(
              (sum, m) => sum + (currentProgress.completedMissions[m.id]?.stars || 0),
              0
            )

            return (
              <button
                key={ch.id}
                className={`chapter-selector-tab ${isChActive ? 'tab-active' : ''} ${
                  isChUnlocked ? 'tab-unlocked' : 'tab-locked'
                }`}
                onClick={() => handleSwitchChapter(ch.id)}
              >
                <span className="chapter-tab-badge">{ch.badgeText}</span>
                <span className="chapter-tab-name">
                  {isZombie
                    ? 'Tiến Công Ngoại Ô'
                    : ch.id === 1
                      ? 'Khủng Hoảng Ngoại Ô'
                      : 'Đô Thị Zombie'}
                </span>
                <span className="chapter-tab-stars">⭐ {chStars}/15</span>
                {!isChUnlocked && <span className="chapter-tab-lock">🔒</span>}
              </button>
            )
          })}
        </div>

        {/* Story Chapter Banner */}
        <div className="chapter-story-banner">
          <div className="chapter-banner-badge">{currentChapter.badgeText}</div>
          <h2 className="chapter-banner-title">{currentChapter.title}</h2>
          <p className="chapter-banner-desc">{currentChapter.description}</p>
        </div>

        {/* Roadmap Nodes Sequence */}
        <div className="campaign-nodes-timeline">
          {currentChapter.missions.map((mission, index) => {
            const isUnlocked = mission.missionNumber <= currentProgress.unlockedMissionNumber
            const missionRecord = currentProgress.completedMissions[mission.id]
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
                      mission.missionNumber <= currentProgress.unlockedMissionNumber
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
                        (currentProgress.completedMissions[selectedMission.id]?.stars || 0) >= idx + 1

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

                {/* Custom Deck Selector */}
                <div className="briefing-deck-selector-box">
                  <div className="deck-selector-label-row">
                    <span className="deck-selector-title">🃏 BỘ BÀI CHIẾN ĐẤU:</span>
                    <span className="deck-selector-faction">
                      {selectedMission.faction === 'zombies' ? '🧟 Phe Thây Ma' : '🌱 Phe Cây Trồng'}
                    </span>
                  </div>
                  <select
                    className="briefing-deck-select-dropdown"
                    value={selectedDeckId}
                    onChange={(e) => setSelectedDeckId(e.target.value)}
                  >
                    <option value="starter">Bộ bài Starter mặc định</option>
                    {availableSavedDecks.map((deck) => {
                      const cardCount = Object.values(deck.cardIds || {}).reduce((a, b) => a + b, 0)
                      return (
                        <option key={deck.id} value={deck.id}>
                          {deck.name} ({cardCount} lá)
                        </option>
                      )
                    })}
                  </select>
                  {selectedDeckId !== 'starter' ? (
                    <span className="deck-selected-hint active">
                      ✅ Đang dùng bộ bài tùy chỉnh: {availableSavedDecks.find((d) => d.id === selectedDeckId)?.name}
                    </span>
                  ) : (
                    <span className="deck-selected-hint">
                      ℹ️ Bạn có thể tạo bộ bài tùy chỉnh tại Deck Builder và chọn tại đây
                    </span>
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

        {/* Weekly Event Details Modal */}
        {showEventModal && (
          <div
            className="mission-briefing-drawer-backdrop"
            onClick={() => setShowEventModal(false)}
          >
            <div
              className="weekly-event-modal-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="event-modal-header">
                <div className="event-modal-badge">SỰ KIỆN TUẦN #{CURRENT_WEEKLY_EVENT.weekNumber}</div>
                <h3 className="event-modal-title">THẺ BÀI SỰ KIỆN: {CURRENT_WEEKLY_EVENT.cardName}</h3>
                <span className="event-modal-countdown">
                  ⏳ Thời gian còn lại: <strong>{countdown.formatted}</strong>
                </span>
                <button
                  className="briefing-close-btn"
                  onClick={() => setShowEventModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="event-modal-body">
                {/* Event Card Spotlight */}
                <div className="event-card-spotlight">
                  <img
                    src={CURRENT_WEEKLY_EVENT.cardAvatar}
                    alt={CURRENT_WEEKLY_EVENT.cardName}
                    className="event-card-large-avatar"
                  />
                  <div className="event-card-specs">
                    <h4 className="card-name-title">{CURRENT_WEEKLY_EVENT.cardName}</h4>
                    <span className="card-tribe-cost">
                      Tribe: {CURRENT_WEEKLY_EVENT.cardTribe} | Cost: {CURRENT_WEEKLY_EVENT.cardCost}
                    </span>
                    <p className="card-desc-text">{CURRENT_WEEKLY_EVENT.description}</p>
                    <span className="card-rarity-pill">Độ hiếm: EVENT</span>
                  </div>
                </div>

                {/* Ticket Progress Meter */}
                <div className="event-progress-meter-box">
                  <div className="meter-label-row">
                    <span className="meter-title">Tiến trình tích lũy vé:</span>
                    <span className="meter-val">
                      🎟️ {eventProgress.tickets} /{' '}
                      {CURRENT_WEEKLY_EVENT.targetTicketsPerCopy * CURRENT_WEEKLY_EVENT.maxCopies} Tổng vé
                    </span>
                  </div>

                  <div className="event-progress-track">
                    <div
                      className="event-progress-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          (eventProgress.tickets /
                            (CURRENT_WEEKLY_EVENT.targetTicketsPerCopy *
                              CURRENT_WEEKLY_EVENT.maxCopies)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>

                  {/* 4 Milestones markers */}
                  <div className="milestones-row">
                    {[1, 2, 3, 4].map((copyNum) => {
                      const reqTickets = copyNum * CURRENT_WEEKLY_EVENT.targetTicketsPerCopy
                      const isReached = eventProgress.tickets >= reqTickets
                      const isClaimed = copyNum <= eventProgress.claimedCopies

                      return (
                        <div
                          key={copyNum}
                          className={`milestone-step ${
                            isClaimed ? 'step-claimed' : isReached ? 'step-unlocked' : 'step-locked'
                          }`}
                        >
                          <span className="step-icon">
                            {isClaimed ? '✅' : isReached ? '🎁' : '🔒'}
                          </span>
                          <span className="step-copy-text">Bản sao #{copyNum}</span>
                          <span className="step-ticket-text">{reqTickets} Vé</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Boosted Heroes Row */}
                <div className="event-boosted-heroes-section">
                  <h4 className="boosted-section-title">
                    ⚡ HERO TĂNG TỐC VÉ (X2 VÉ SỰ KIỆN - 200 VÉ/TRẬN THẮNG):
                  </h4>
                  <div className="boosted-heroes-cards-row">
                    <div className="boosted-hero-card">
                      <img
                        src={CURRENT_WEEKLY_EVENT.boostedPlantHeroAvatar}
                        alt={CURRENT_WEEKLY_EVENT.boostedPlantHeroName}
                        className="boosted-avatar-img"
                      />
                      <div className="boosted-hero-info">
                        <span className="hero-side-tag plant-tag">🌿 CÂY TRỒNG</span>
                        <span className="hero-name-label">
                          {CURRENT_WEEKLY_EVENT.boostedPlantHeroName}
                        </span>
                        <span className="boost-badge">+100 Vé Thưởng</span>
                      </div>
                    </div>

                    <div className="boosted-hero-card">
                      <img
                        src={CURRENT_WEEKLY_EVENT.boostedZombieHeroAvatar}
                        alt={CURRENT_WEEKLY_EVENT.boostedZombieHeroName}
                        className="boosted-avatar-img"
                      />
                      <div className="boosted-hero-info">
                        <span className="hero-side-tag zombie-tag">🧟 THÂY MA</span>
                        <span className="hero-name-label">
                          {CURRENT_WEEKLY_EVENT.boostedZombieHeroName}
                        </span>
                        <span className="boost-badge">+100 Vé Thưởng</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Modal Footer */}
              <div className="event-modal-footer">
                <button
                  className="briefing-cancel-btn"
                  onClick={() => setShowEventModal(false)}
                >
                  Đóng
                </button>
                {canClaim ? (
                  <button
                    className="event-claim-btn"
                    onClick={handleClaimEventCard}
                  >
                    🎁 NHẬN BẢN SAO THẺ BÀI ({eventProgress.unlockedCopies - eventProgress.claimedCopies} Khả dụng)
                  </button>
                ) : (
                  <button className="event-claim-btn disabled" disabled>
                    Chưa Đủ Vé Mở Khóa ({eventProgress.tickets % CURRENT_WEEKLY_EVENT.targetTicketsPerCopy} / {CURRENT_WEEKLY_EVENT.targetTicketsPerCopy})
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Campaign Star Milestone Rewards Modal */}
        {showRewardsModal && (
          <div
            className="mission-briefing-drawer-backdrop"
            onClick={() => setShowRewardsModal(false)}
          >
            <div
              className="campaign-rewards-modal-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rewards-modal-header">
                <div className="rewards-modal-badge">TIẾN ĐỘ CHIẾN DỊCH</div>
                <h3 className="rewards-modal-title">🏆 PHẦN THƯỞNG MỐC SAO & HUY HIỆU</h3>
                <button
                  className="briefing-close-btn"
                  onClick={() => setShowRewardsModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="rewards-modal-body">
                {/* Combined Stars Summary Cards */}
                <div className="rewards-stars-summary-grid">
                  <div className="stars-summary-card plant-stars-card">
                    <span className="summary-card-emoji">🌿</span>
                    <span className="summary-card-label">Sao Cây Trồng</span>
                    <span className="summary-card-val">
                      {combinedCampaignStars.plantStars} / 30 ⭐
                    </span>
                  </div>
                  <div className="stars-summary-card zombie-stars-card">
                    <span className="summary-card-emoji">🧟</span>
                    <span className="summary-card-label">Sao Thây Ma</span>
                    <span className="summary-card-val">
                      {combinedCampaignStars.zombieStars} / 30 ⭐
                    </span>
                  </div>
                  <div className="stars-summary-card total-stars-card">
                    <span className="summary-card-emoji">⭐</span>
                    <span className="summary-card-label">Tổng Sao Thu Thập</span>
                    <span className="summary-card-val">
                      {combinedCampaignStars.totalStars} / 60 ⭐
                    </span>
                  </div>
                </div>

                {/* Milestone Reward Message Notification */}
                {milestoneRewardMessage && (
                  <div className="milestone-claim-alert">
                    🎉 {milestoneRewardMessage}
                  </div>
                )}

                {/* Milestones List */}
                <div className="rewards-milestones-list">
                  <h4 className="milestones-list-title">
                    MỐC PHẦN THƯỞNG GEMS VÀ HUY HIỆU DANH HIỆU:
                  </h4>
                  {CAMPAIGN_STAR_MILESTONES.map((m) => {
                    const isClaimed = claimedMilestones.includes(m.requiredStars)
                    const canClaim =
                      !isClaimed && combinedCampaignStars.totalStars >= m.requiredStars

                    return (
                      <div
                        key={m.requiredStars}
                        className={`reward-milestone-row ${
                          isClaimed
                            ? 'row-claimed'
                            : canClaim
                              ? 'row-ready'
                              : 'row-locked'
                        }`}
                      >
                        <div className="milestone-stars-badge">
                          <span className="star-req-num">{m.requiredStars}</span>
                          <span className="star-req-icon">⭐</span>
                        </div>

                        <div className="milestone-info-col">
                          <div className="milestone-badge-title">
                            <span className="badge-name">🎖️ {m.badge}</span>
                            <span className="reward-gems-pill">💎 +{m.gems} Gems</span>
                          </div>
                          <p className="milestone-desc-text">{m.description}</p>
                        </div>

                        <div className="milestone-action-col">
                          {isClaimed ? (
                            <span className="claimed-status-pill">✅ Đã nhận</span>
                          ) : canClaim ? (
                            <button
                              className="claim-reward-action-btn"
                              onClick={() => handleClaimMilestone(m.requiredStars)}
                            >
                              🎁 NHẬN THƯỞNG!
                            </button>
                          ) : (
                            <span className="locked-stars-needed">
                              🔒 Cần {m.requiredStars - combinedCampaignStars.totalStars} ⭐ nữa
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="event-modal-footer">
                <button
                  className="briefing-cancel-btn"
                  onClick={() => setShowRewardsModal(false)}
                >
                  Đóng
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
