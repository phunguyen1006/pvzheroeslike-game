import React, { useState, useEffect } from 'react'
import {
  PUZZLE_PARTY_LIST,
  EVENT_SHOWCASE_LIST,
  isPuzzleCompleted,
  isShowcaseCompleted,
  type PuzzlePartyConfig,
  type EventShowcaseConfig,
} from '../../data/challenges'
import {
  HERO_QUESTS_REGISTRY,
  loadAllHeroQuestProgress,
  claimHeroQuestReward,
  type HeroQuestState,
} from '../../data/heroQuests'
import { soundManager } from '../../audio/SoundManager'

export interface DailyChallengesModalProps {
  isOpen: boolean
  onClose: () => void
  onStartPuzzle?: (puzzle: PuzzlePartyConfig) => void
  onStartShowcase?: (showcase: EventShowcaseConfig) => void
}

export const DailyChallengesModal: React.FC<DailyChallengesModalProps> = ({
  isOpen,
  onClose,
  onStartPuzzle,
  onStartShowcase,
}) => {
  const [activeTab, setActiveTab] = useState<'puzzle' | 'showcase' | 'quests'>('puzzle')
  const [selectedHeroId, setSelectedHeroId] = useState<string>('hero_green_shadow')
  const [showHintMap, setShowHintMap] = useState<Record<string, boolean>>({})
  const [questProgressMap, setQuestProgressMap] = useState<Record<string, HeroQuestState>>({})
  const [claimToast, setClaimToast] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setQuestProgressMap(loadAllHeroQuestProgress())
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleToggleHint = (puzzleId: string) => {
    setShowHintMap((prev) => ({ ...prev, [puzzleId]: !prev[puzzleId] }))
    soundManager.playCardDrop()
  }

  const handleClaimQuest = (heroId: string, stepNumber: number) => {
    const result = claimHeroQuestReward(heroId, stepNumber)
    if (result && result.success) {
      soundManager.playBuff()
      setQuestProgressMap(loadAllHeroQuestProgress())
      setClaimToast(`Đã nhận +${result.gemsAwarded} Gems & +${result.coinsAwarded} Coins!`)
      setTimeout(() => setClaimToast(null), 3000)
    }
  }

  const heroList = Object.keys(HERO_QUESTS_REGISTRY).map((heroId) => {
    const firstQuest = HERO_QUESTS_REGISTRY[heroId][0]
    return {
      id: heroId,
      name: firstQuest?.heroName || heroId,
      avatar: firstQuest?.heroAvatar || '',
    }
  })

  const currentHeroQuests = HERO_QUESTS_REGISTRY[selectedHeroId] || []
  const currentHeroState = questProgressMap[selectedHeroId] || {
    currentStep: 1,
    currentCount: 0,
    claimedSteps: [],
    isFullyCompleted: false,
    lastUpdated: '',
  }

  return (
    <div className="challenges-modal-backdrop" onClick={onClose}>
      <div className="challenges-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="challenges-modal-header">
          <div className="challenges-header-info">
            <span className="challenges-header-badge">HỆ THỐNG MỚI • ĐỢT 10</span>
            <h2 className="challenges-modal-title">🏆 THỬ THÁCH & NHIỆM VỤ ANH HÙNG</h2>
          </div>
          <button className="challenges-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="challenges-tab-nav">
          <button
            className={`challenges-tab-btn ${activeTab === 'puzzle' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('puzzle')
              soundManager.playCardDrop()
            }}
          >
            🧩 Tiệc Giải Đố (Puzzle Party)
          </button>
          <button
            className={`challenges-tab-btn ${activeTab === 'showcase' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('showcase')
              soundManager.playCardDrop()
            }}
          >
            ⭐ Trận Đấu Sự Kiện (Event Showcase)
          </button>
          <button
            className={`challenges-tab-btn ${activeTab === 'quests' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('quests')
              soundManager.playCardDrop()
            }}
          >
            📜 Nhiệm Vụ Anh Hùng (Hero Quests)
          </button>
        </div>

        {claimToast && <div className="challenges-toast-notification">{claimToast}</div>}

        {/* Content Body */}
        <div className="challenges-modal-body">
          {/* TAB 1: PUZZLE PARTY */}
          {activeTab === 'puzzle' && (
            <div className="puzzle-party-container">
              <div className="tab-intro-banner">
                <span className="banner-icon">💡</span>
                <div className="banner-text">
                  <h4>Quy Tắc Tiệc Giải Đố (Puzzle Party)</h4>
                  <p>
                    Bàn cờ và quân bài được sắp xếp sẵn. Tìm ra nước đi chiến thuật hoàn hảo để giành chiến thắng ngay trong 1 lượt đấu duy nhất!
                  </p>
                </div>
              </div>

              <div className="puzzle-cards-grid">
                {PUZZLE_PARTY_LIST.map((puzzle) => {
                  const completed = isPuzzleCompleted(puzzle.id)
                  const showHint = showHintMap[puzzle.id]

                  return (
                    <div key={puzzle.id} className={`puzzle-card-item ${completed ? 'is-completed' : ''}`}>
                      <div className="puzzle-card-header">
                        <div className="puzzle-title-box">
                          <span className="puzzle-num-badge">PUZZLE #{puzzle.puzzleNumber}</span>
                          <h3 className="puzzle-title">{puzzle.title}</h3>
                          <span className="puzzle-subtitle">{puzzle.subtitle}</span>
                        </div>
                        {completed && <span className="puzzle-completed-stamp">✅ ĐÃ GIẢI</span>}
                      </div>

                      <p className="puzzle-desc">{puzzle.description}</p>

                      <div className="puzzle-stats-row">
                        <div className="hero-stat-pill player-pill">
                          <img src={puzzle.playerHeroAvatar} alt={puzzle.playerHeroName} className="hero-pill-avatar" />
                          <span>{puzzle.playerHeroName}</span>
                          <strong className="hp-tag">❤️ {puzzle.playerStartingHp} HP</strong>
                          <strong className="mana-tag">
                            {puzzle.playerSide === 'plants' ? '☀️' : '🧠'} {puzzle.playerStartingMana}
                          </strong>
                        </div>
                        <span className="vs-badge">VS</span>
                        <div className="hero-stat-pill opponent-pill">
                          <img src={puzzle.opponentHeroAvatar} alt={puzzle.opponentHeroName} className="hero-pill-avatar" />
                          <span>{puzzle.opponentHeroName}</span>
                          <strong className="hp-tag">❤️ {puzzle.opponentStartingHp} HP</strong>
                        </div>
                      </div>

                      <div className="puzzle-rewards-row">
                        <span className="reward-tag gems">💎 +{puzzle.rewardGems} Gems</span>
                        <span className="reward-tag tickets">🎟️ +{puzzle.rewardTickets} Vé</span>
                      </div>

                      {showHint && (
                        <div className="puzzle-hint-box">
                          <strong>Gợi ý: </strong>
                          {puzzle.hint}
                        </div>
                      )}

                      <div className="puzzle-actions-row">
                        <button
                          className="puzzle-hint-btn"
                          onClick={() => handleToggleHint(puzzle.id)}
                        >
                          {showHint ? 'Ẩn Gợi Ý' : '💡 Xem Gợi Ý'}
                        </button>
                        <button
                          className="puzzle-play-btn"
                          onClick={() => {
                            soundManager.playBuff()
                            onStartPuzzle?.(puzzle)
                          }}
                        >
                          {completed ? '🔄 GIẢI LẠI' : '▶️ VÀO GIẢI ĐỐ'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 2: EVENT SHOWCASE */}
          {activeTab === 'showcase' && (
            <div className="event-showcase-container">
              <div className="tab-intro-banner">
                <span className="banner-icon">⭐</span>
                <div className="banner-text">
                  <h4>Trận Đấu Sự Kiện Biến Đổi (Event Showcase)</h4>
                  <p>
                    Mỗi ngày một luật chơi biến dị độc lạ! Chiến thắng để thu thập số lượng lớn Vé Sự Kiện và Đá Quý.
                  </p>
                </div>
              </div>

              <div className="showcase-cards-grid">
                {EVENT_SHOWCASE_LIST.map((showcase) => {
                  const completed = isShowcaseCompleted(showcase.id)

                  return (
                    <div key={showcase.id} className={`showcase-card-item ${completed ? 'is-completed' : ''}`}>
                      <div className="showcase-header">
                        <span className="showcase-mutator-icon">{showcase.mutator.icon}</span>
                        <div className="showcase-title-box">
                          <span className="showcase-day-badge">NGÀY #{showcase.dayIndex}</span>
                          <h3 className="showcase-title">{showcase.title}</h3>
                          <span className="showcase-subtitle">{showcase.subtitle}</span>
                        </div>
                        {completed && <span className="puzzle-completed-stamp">✅ ĐÃ THẮNG</span>}
                      </div>

                      <div className="mutator-rule-box">
                        <span className="mutator-label">Luật Đặc Biệt:</span>
                        <strong className="mutator-name">{showcase.mutator.name}</strong>
                        <p className="mutator-desc">{showcase.mutator.description}</p>
                      </div>

                      <p className="showcase-desc">{showcase.description}</p>

                      <div className="showcase-heroes-row">
                        <span className="faction-tag player">Người chơi: {showcase.playerHeroName}</span>
                        <span className="vs-badge">VS</span>
                        <span className="faction-tag opponent">Đối thủ: {showcase.opponentHeroName}</span>
                      </div>

                      <div className="showcase-footer">
                        <div className="puzzle-rewards-row">
                          <span className="reward-tag gems">💎 +{showcase.rewardGems} Gems</span>
                          <span className="reward-tag tickets">🎟️ +{showcase.rewardTickets} Vé</span>
                        </div>

                        <button
                          className="showcase-play-btn"
                          onClick={() => {
                            soundManager.playBuff()
                            onStartShowcase?.(showcase)
                          }}
                        >
                          {completed ? '🔄 ĐẤU LẠI' : '⚔️ THÁCH ĐẤU NGAY'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 3: HERO QUESTS */}
          {activeTab === 'quests' && (
            <div className="hero-quests-container">
              {/* Hero Selector Tabs */}
              <div className="hero-quest-picker">
                {heroList.map((hero) => {
                  const state = questProgressMap[hero.id]
                  const isDone = state?.isFullyCompleted

                  return (
                    <button
                      key={hero.id}
                      className={`hero-quest-chip ${selectedHeroId === hero.id ? 'active' : ''} ${isDone ? 'is-done' : ''}`}
                      onClick={() => {
                        setSelectedHeroId(hero.id)
                        soundManager.playCardDrop()
                      }}
                    >
                      <img src={hero.avatar} alt={hero.name} className="hero-chip-avatar" />
                      <span className="hero-chip-name">{hero.name}</span>
                      {isDone && <span className="done-star">⭐</span>}
                    </button>
                  )
                })}
              </div>

              {/* Active Hero Questline */}
              <div className="hero-questline-box">
                <div className="questline-header">
                  <div className="questline-title-info">
                    <h3>Chuỗi Nhiệm Vụ: {HERO_QUESTS_REGISTRY[selectedHeroId]?.[0]?.heroName}</h3>
                    <span className="questline-subtext">
                      Hoàn thành 5 chặng nhiệm vụ để nhận phần thưởng tích lũy và danh hiệu tối thượng!
                    </span>
                  </div>
                  <div className="questline-progress-badge">
                    {currentHeroState.isFullyCompleted ? (
                      <span className="all-completed-tag">🎉 TOÀN BỘ HOÀN THÀNH</span>
                    ) : (
                      <span>Chặng {Math.min(5, currentHeroState.currentStep)}/5</span>
                    )}
                  </div>
                </div>

                <div className="quests-steps-list">
                  {currentHeroQuests.map((quest) => {
                    const isClaimed = currentHeroState.claimedSteps.includes(quest.stepNumber)
                    const isCurrent = currentHeroState.currentStep === quest.stepNumber && !currentHeroState.isFullyCompleted
                    const isPassed = currentHeroState.currentStep > quest.stepNumber || currentHeroState.isFullyCompleted
                    const currentVal = isPassed ? quest.targetCount : isCurrent ? currentHeroState.currentCount : 0
                    const percent = Math.min(100, Math.round((currentVal / quest.targetCount) * 100))
                    const canClaim = isCurrent && currentVal >= quest.targetCount && !isClaimed

                    return (
                      <div
                        key={quest.id}
                        className={`quest-step-item ${isCurrent ? 'is-active' : ''} ${isClaimed ? 'is-claimed' : ''} ${isPassed && !isClaimed ? 'can-claim' : ''}`}
                      >
                        <div className="quest-step-marker">
                          {isClaimed ? '✓' : quest.stepNumber}
                        </div>

                        <div className="quest-step-content">
                          <div className="quest-step-header">
                            <h4 className="quest-step-title">{quest.title}</h4>
                            <span className="quest-step-target">
                              {currentVal} / {quest.targetCount}
                            </span>
                          </div>
                          <p className="quest-step-desc">{quest.description}</p>

                          {/* Progress bar */}
                          <div className="quest-progress-track">
                            <div className="quest-progress-fill" style={{ width: `${percent}%` }} />
                          </div>

                          <div className="quest-step-rewards">
                            <span className="reward-tag gems">💎 +{quest.rewardGems} Gems</span>
                            <span className="reward-tag coins">🪙 +{quest.rewardCoins} Coins</span>
                            {quest.exclusiveTitle && (
                              <span className="reward-tag title">🏷️ Danh hiệu: "{quest.exclusiveTitle}"</span>
                            )}
                          </div>
                        </div>

                        <div className="quest-step-actions">
                          {isClaimed ? (
                            <span className="claimed-badge">Đã nhận</span>
                          ) : canClaim ? (
                            <button
                              className="claim-quest-btn"
                              onClick={() => handleClaimQuest(selectedHeroId, quest.stepNumber)}
                            >
                              🎁 NHẬN THƯỞNG
                            </button>
                          ) : (
                            <span className="locked-badge">
                              {isCurrent ? `${percent}%` : 'Chưa mở'}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DailyChallengesModal
