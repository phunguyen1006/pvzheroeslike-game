import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  PUZZLE_PARTY_LIST,
  EVENT_SHOWCASE_LIST,
  isPuzzleCompleted,
  markPuzzleCompleted,
  isShowcaseCompleted,
  markShowcaseCompleted,
  loadDailyChallenges,
  saveDailyChallenges,
  updateDailyChallengesOnMatchOver,
  claimDailyChallengeReward,
  getDailyChallengesBadgeCount,
  DAILY_CHALLENGES_STORAGE_KEY,
} from '../data/challenges'
import {
  HERO_QUESTS_REGISTRY,
  getHeroQuests,
  getHeroQuestState,
  advanceHeroQuestProgress,
  claimHeroQuestReward,
  loadAllHeroQuestProgress,
  HERO_QUESTS_STORAGE_KEY,
} from '../data/heroQuests'
import { ALL_CAMPAIGN_MISSIONS, ALL_ZOMBIE_CAMPAIGN_MISSIONS } from '../data/campaign'

describe('Round 10: Puzzle Party, Event Showcase, Daily Challenges & Hero Quests', () => {
  let mockStore: Record<string, string> = {}

  beforeEach(() => {
    mockStore = {}
    const localStorageMock = {
      getItem: vi.fn((key: string) => mockStore[key] || null),
      setItem: vi.fn((key: string, val: string) => {
        mockStore[key] = String(val)
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStore[key]
      }),
      clear: vi.fn(() => {
        mockStore = {}
      }),
    }
    vi.stubGlobal('localStorage', localStorageMock)
  })

  // ========================================================
  // 1. PUZZLE PARTY CONFIGURATIONS & COMPLETION
  // ========================================================
  describe('Puzzle Party System', () => {
    it('should have 4 distinct iconic puzzles defined with valid rules', () => {
      expect(PUZZLE_PARTY_LIST).toHaveLength(4)

      PUZZLE_PARTY_LIST.forEach((puzzle) => {
        expect(puzzle.id).toBeTruthy()
        expect(puzzle.title).toBeTruthy()
        expect(puzzle.puzzleNumber).toBeGreaterThan(0)
        expect(puzzle.playerStartingHp).toBeGreaterThan(0)
        expect(puzzle.opponentStartingHp).toBeGreaterThan(0)
        expect(puzzle.playerStartingMana).toBeGreaterThan(0)
        expect(puzzle.handCardIds.length).toBeGreaterThan(0)
        expect(puzzle.rewardGems).toBeGreaterThanOrEqual(100)
        expect(puzzle.rewardTickets).toBeGreaterThanOrEqual(50)
        expect(puzzle.hint).toBeTruthy()
      })
    })

    it('should track completion in localStorage and retrieve status correctly', () => {
      const puzzleId = 'puzzle_repeat_moss_otk'
      expect(isPuzzleCompleted(puzzleId)).toBe(false)

      markPuzzleCompleted(puzzleId)
      expect(isPuzzleCompleted(puzzleId)).toBe(true)

      // Test idempotent marking
      markPuzzleCompleted(puzzleId)
      expect(isPuzzleCompleted(puzzleId)).toBe(true)
    })
  })

  // ========================================================
  // 2. EVENT SHOWCASE CONFIGURATIONS & COMPLETION
  // ========================================================
  describe('Event Showcase Mutators System', () => {
    it('should have 4 event showcase mutator matches with distinct rules', () => {
      expect(EVENT_SHOWCASE_LIST).toHaveLength(4)

      EVENT_SHOWCASE_LIST.forEach((showcase) => {
        expect(showcase.id).toBeTruthy()
        expect(showcase.title).toBeTruthy()
        expect(showcase.dayIndex).toBeGreaterThan(0)
        expect(showcase.mutator.id).toBeTruthy()
        expect(showcase.mutator.name).toBeTruthy()
        expect(showcase.mutator.description).toBeTruthy()
        expect(showcase.rewardGems).toBeGreaterThanOrEqual(100)
        expect(showcase.rewardTickets).toBeGreaterThanOrEqual(75)
      })
    })

    it('should track event showcase victories and persist in localStorage', () => {
      const showcaseId = 'showcase_dino_roar'
      expect(isShowcaseCompleted(showcaseId)).toBe(false)

      markShowcaseCompleted(showcaseId)
      expect(isShowcaseCompleted(showcaseId)).toBe(true)
    })
  })

  // ========================================================
  // 3. DAILY CHALLENGES & POST-MATCH METRIC TRACKING
  // ========================================================
  describe('Daily Challenges Metric Evaluation & Reward Claiming', () => {
    it('should initialize default daily challenges when storage is empty', () => {
      const data = loadDailyChallenges()
      expect(data.challenges).toHaveLength(4)
      expect(data.challenges.every((c) => !c.isCompleted && !c.isClaimed)).toBe(true)

      const badge = getDailyChallengesBadgeCount()
      expect(badge.readyToClaimCount).toBe(0)
      expect(badge.totalUncompleted).toBe(4)
    })

    it('should advance metrics on match conclusion', () => {
      // 1. Match win for plants
      const updateResult = updateDailyChallengesOnMatchOver({
        winner: 'plants',
        playerSide: 'plants',
        damageDealtToEnemyHero: 15,
        tricksPlayed: 2,
        minionsPlayed: 3,
      })

      expect(updateResult.updated).toBe(true)
      const data = loadDailyChallenges()

      const winChallenge = data.challenges.find((c) => c.metricType === 'win_match')
      expect(winChallenge?.currentCount).toBe(1)
      expect(winChallenge?.isCompleted).toBe(true)

      const dmgChallenge = data.challenges.find((c) => c.metricType === 'deal_hero_damage')
      expect(dmgChallenge?.currentCount).toBe(15)

      const trickChallenge = data.challenges.find((c) => c.metricType === 'play_trick')
      expect(trickChallenge?.currentCount).toBe(2)

      const minionChallenge = data.challenges.find((c) => c.metricType === 'play_minion')
      expect(minionChallenge?.currentCount).toBe(3)
    })

    it('should allow claiming rewards only for completed challenges', () => {
      // Mark win challenge as completed
      const data = loadDailyChallenges()
      const winChallenge = data.challenges.find((c) => c.metricType === 'win_match')!
      winChallenge.currentCount = winChallenge.targetCount
      winChallenge.isCompleted = true
      saveDailyChallenges(data)

      const initialGems = Number(localStorage.getItem('pvz_player_gems') || '0')
      const claimRes = claimDailyChallengeReward(winChallenge.id)

      expect(claimRes).not.toBeNull()
      expect(claimRes?.success).toBe(true)
      expect(claimRes?.gemsAwarded).toBe(winChallenge.rewardGems)

      const newGems = Number(localStorage.getItem('pvz_player_gems') || '0')
      expect(newGems).toBe(initialGems + winChallenge.rewardGems)

      // Cannot claim again
      const claimAgain = claimDailyChallengeReward(winChallenge.id)
      expect(claimAgain).toBeNull()
    })
  })

  // ========================================================
  // 4. HERO QUESTS SEQUENTIAL PROGRESSION
  // ========================================================
  describe('Hero Quests 5-Step Sequential Progression & Claiming', () => {
    it('should have 5-step quest lines defined for core heroes', () => {
      const heroes = ['hero_green_shadow', 'hero_solar_flare', 'hero_super_brainz', 'hero_the_smash']

      heroes.forEach((hId) => {
        const quests = getHeroQuests(hId)
        expect(quests).toHaveLength(5)
        expect(quests.map((q) => q.stepNumber)).toEqual([1, 2, 3, 4, 5])
        expect(quests[4].exclusiveTitle).toBeTruthy()
      })
    })

    it('should advance quest metrics and allow sequential claiming', () => {
      const heroId = 'hero_green_shadow'

      // Step 1: Chơi 3 lá Cây hệ Pea
      advanceHeroQuestProgress(heroId, 'play_tribe', 3, 'Pea')
      let state = getHeroQuestState(heroId)
      expect(state.currentStep).toBe(1)
      expect(state.currentCount).toBe(3)

      // Claim step 1
      const claim1 = claimHeroQuestReward(heroId, 1)
      expect(claim1?.success).toBe(true)
      expect(claim1?.gemsAwarded).toBeGreaterThan(0)

      state = getHeroQuestState(heroId)
      expect(state.currentStep).toBe(2)
      expect(state.currentCount).toBe(0)
      expect(state.claimedSteps).toContain(1)

      // Cannot claim step 2 before completing it
      const claim2Premature = claimHeroQuestReward(heroId, 2)
      expect(claim2Premature).toBeNull()
    })

    it('should unlock the ultimate title upon completing and claiming step 5', () => {
      const heroId = 'hero_super_brainz'

      // Force state to step 5 completed
      const state = getHeroQuestState(heroId)
      state.currentStep = 5
      state.currentCount = 3
      state.claimedSteps = [1, 2, 3, 4]
      localStorage.setItem(
        HERO_QUESTS_STORAGE_KEY,
        JSON.stringify({ [heroId]: state })
      )

      const claim5 = claimHeroQuestReward(heroId, 5)
      expect(claim5?.success).toBe(true)
      expect(claim5?.titleAwarded).toBe('Siêu Não Bất Bại')

      const finalState = getHeroQuestState(heroId)
      expect(finalState.isFullyCompleted).toBe(true)
      expect(finalState.claimedSteps).toHaveLength(5)
    })
  })

  // ========================================================
  // 5. CAMPAIGN CHAPTER 2 BOSS VICTORY CINEMATIC VALIDATION
  // ========================================================
  describe('Campaign Chapter 2 Final Boss Cinematic Conditions', () => {
    it('should correctly configure Chapter 2 final bosses for Citron and Rustbolt', () => {
      // Zombie Campaign Mission 10: Boss Citron
      const citronMission = ALL_ZOMBIE_CAMPAIGN_MISSIONS.find((m) => m.missionNumber === 10)
      expect(citronMission).toBeDefined()
      expect(citronMission?.difficulty).toBe('boss')
      expect(citronMission?.chapter).toBe(2)
      expect(citronMission?.bossHeroId).toBe('hero_citron')
      expect(citronMission?.rewards.gems).toBeGreaterThanOrEqual(500)

      // Plant Campaign Mission 10: Boss Rustbolt
      const rustboltMission = ALL_CAMPAIGN_MISSIONS.find((m) => m.missionNumber === 10)
      expect(rustboltMission).toBeDefined()
      expect(rustboltMission?.difficulty).toBe('boss')
      expect(rustboltMission?.chapter).toBe(2)
      expect(rustboltMission?.bossHeroId).toBe('hero_rustbolt')
      expect(rustboltMission?.rewards.gems).toBeGreaterThanOrEqual(500)
    })
  })
})
