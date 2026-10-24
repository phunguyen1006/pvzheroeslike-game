import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  evaluateChallengeProgress,
  loadDailyChallenges,
  saveDailyChallenges,
  resetDailyChallenges,
  claimChallengeReward,
  getCompletedChallengesCount,
  DEFAULT_DAILY_CHALLENGES,
  DAILY_CHALLENGES_STORAGE_KEY,
} from '../engine/challenges'
import { formatCombatLog, resolveSingleLaneCombat, resolveCombat } from '../engine/combat'
import { createInitialGameState } from '../engine/reducer'
import type { GameState, MatchResult, CombatEvent } from '../engine/types'

describe('Daily Challenge Engine (src/engine/challenges.ts)', () => {
  let mockStorage: Record<string, string> = {}

  beforeEach(() => {
    mockStorage = {}
    const localStorageMock = {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, val: string) => {
        mockStorage[key] = val
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key]
      }),
      clear: vi.fn(() => {
        mockStorage = {}
      }),
    }
    vi.stubGlobal('localStorage', localStorageMock)
    resetDailyChallenges()
  })

  it('1. should load default daily challenges when localStorage is empty', () => {
    mockStorage = {}
    const challenges = loadDailyChallenges()
    expect(challenges.length).toBe(DEFAULT_DAILY_CHALLENGES.length)
    expect(challenges.map(c => c.id)).toContain('challenge_win_plants')
    expect(challenges.map(c => c.id)).toContain('challenge_damage_20')
    expect(challenges.map(c => c.id)).toContain('challenge_use_superpower_3')
    expect(challenges.map(c => c.id)).toContain('challenge_win_under_8_turns')
  })

  it('2. should persist daily challenges to localStorage correctly', () => {
    const list = loadDailyChallenges()
    list[0].currentProgress = 1
    list[0].isCompleted = true
    saveDailyChallenges(list)

    const reloaded = loadDailyChallenges()
    expect(reloaded[0].isCompleted).toBe(true)
    expect(reloaded[0].currentProgress).toBe(1)
    expect(mockStorage[DAILY_CHALLENGES_STORAGE_KEY]).toBeDefined()
  })

  it('3. should reset all challenges to zero progress and uncompleted status', () => {
    const list = loadDailyChallenges()
    list[0].currentProgress = 1
    list[0].isCompleted = true
    saveDailyChallenges(list)

    const resetList = resetDailyChallenges()
    expect(resetList.every(c => c.currentProgress === 0 && !c.isCompleted)).toBe(true)
    expect(getCompletedChallengesCount(resetList)).toBe(0)
  })

  it('4. should detect and complete "Win with Plants hero" condition when Plants win', () => {
    const state = createInitialGameState()
    state.winner = 'plants'

    const matchResult: MatchResult = {
      winner: 'plants',
      turnsTaken: 6,
      playerSide: 'plants',
    }

    const updates = evaluateChallengeProgress(state, matchResult)
    const plantWin = updates.find(u => u.challengeId === 'challenge_win_plants')
    expect(plantWin).toBeDefined()
    expect(plantWin?.isCompleted).toBe(true)
    expect(plantWin?.progress).toBe(1)
  })

  it('5. should NOT complete "Win with Plants hero" when Zombies win', () => {
    const state = createInitialGameState()
    state.winner = 'zombies'

    const matchResult: MatchResult = {
      winner: 'zombies',
      turnsTaken: 5,
      playerSide: 'plants',
    }

    const updates = evaluateChallengeProgress(state, matchResult)
    const plantWin = updates.find(u => u.challengeId === 'challenge_win_plants')
    expect(plantWin).toBeDefined()
    expect(plantWin?.isCompleted).toBe(false)
  })

  it('6. should detect and complete "Deal 20+ damage in one turn" from maxDamageDealtInOneTurn', () => {
    const state = createInitialGameState()
    const matchResult: MatchResult = {
      winner: 'plants',
      turnsTaken: 5,
      maxDamageDealtInOneTurn: 24,
    }

    const updates = evaluateChallengeProgress(state, matchResult)
    const dmgChallenge = updates.find(u => u.challengeId === 'challenge_damage_20')
    expect(dmgChallenge).toBeDefined()
    expect(dmgChallenge?.isCompleted).toBe(true)
    expect(dmgChallenge?.progress).toBe(20)
  })

  it('7. should detect "Deal 20+ damage in one turn" from damageDealtInTurn array', () => {
    const state = createInitialGameState()
    const matchResult: MatchResult = {
      winner: 'plants',
      turnsTaken: 6,
      damageDealtInTurn: [0, 4, 6, 21, 5],
    }

    const updates = evaluateChallengeProgress(state, matchResult)
    const dmgChallenge = updates.find(u => u.challengeId === 'challenge_damage_20')
    expect(dmgChallenge?.isCompleted).toBe(true)
  })

  it('8. should detect "Deal 20+ damage in one turn" from state.combatEvents', () => {
    const state = createInitialGameState()
    state.combatEvents = [
      {
        laneIndex: 0,
        attackerSide: 'plants',
        attackerName: 'Repeater',
        target: 'hero',
        targetSide: 'zombies',
        damageDealt: 12,
        isBlocked: false,
        isLethal: false,
        roundNumber: 4,
        description: '',
      },
      {
        laneIndex: 1,
        attackerSide: 'plants',
        attackerName: 'Gatling Pea',
        target: 'hero',
        targetSide: 'zombies',
        damageDealt: 10,
        isBlocked: false,
        isLethal: false,
        roundNumber: 4,
        description: '',
      },
    ]

    const updates = evaluateChallengeProgress(state, { turnsTaken: 4, playerSide: 'plants' })
    const dmgChallenge = updates.find(u => u.challengeId === 'challenge_damage_20')
    expect(dmgChallenge?.isCompleted).toBe(true)
  })

  it('9. should track incremental progress for "Use Superpower 3 times"', () => {
    const state = createInitialGameState()
    // First match: 2 superpowers used
    const matchResult1: MatchResult = {
      winner: 'plants',
      turnsTaken: 5,
      superpowersUsed: 2,
    }
    let updates = evaluateChallengeProgress(state, matchResult1)
    let spChallenge = updates.find(u => u.challengeId === 'challenge_use_superpower_3')
    expect(spChallenge?.progress).toBe(2)
    expect(spChallenge?.isCompleted).toBe(false)

    // Second match: 1 more superpower used
    const matchResult2: MatchResult = {
      winner: 'plants',
      turnsTaken: 4,
      superpowersUsed: 1,
    }
    updates = evaluateChallengeProgress(state, matchResult2)
    spChallenge = updates.find(u => u.challengeId === 'challenge_use_superpower_3')
    expect(spChallenge?.progress).toBe(3)
    expect(spChallenge?.isCompleted).toBe(true)
  })

  it('10. should detect superpowers from combatLog if superpowersUsed count not provided', () => {
    const state = createInitialGameState()
    state.combatLog = [
      'Green Shadow thi triển Siêu Năng Lực Precision Blast!',
      'Solar Flare dùng Siêu Năng Lực Sunburn!',
      'Spudow kích hoạt Siêu Năng Lực Tater Toss!',
    ]

    const updates = evaluateChallengeProgress(state, { turnsTaken: 5 })
    const spChallenge = updates.find(u => u.challengeId === 'challenge_use_superpower_3')
    expect(spChallenge?.isCompleted).toBe(true)
    expect(spChallenge?.progress).toBe(3)
  })

  it('11. should complete "Win in under 8 turns" when winning in 6 turns', () => {
    const state = createInitialGameState()
    const matchResult: MatchResult = {
      winner: 'plants',
      turnsTaken: 6,
      playerSide: 'plants',
    }

    const updates = evaluateChallengeProgress(state, matchResult)
    const turnChallenge = updates.find(u => u.challengeId === 'challenge_win_under_8_turns')
    expect(turnChallenge?.isCompleted).toBe(true)
  })

  it('12. should NOT complete "Win in under 8 turns" when match takes 9 turns', () => {
    const state = createInitialGameState()
    const matchResult: MatchResult = {
      winner: 'plants',
      turnsTaken: 9,
      playerSide: 'plants',
    }

    const updates = evaluateChallengeProgress(state, matchResult)
    const turnChallenge = updates.find(u => u.challengeId === 'challenge_win_under_8_turns')
    expect(turnChallenge?.isCompleted).toBe(false)
  })

  it('13. should successfully claim rewards for completed challenges', () => {
    const state = createInitialGameState()
    evaluateChallengeProgress(state, { winner: 'plants', playerSide: 'plants', turnsTaken: 4 })

    const claimResult = claimChallengeReward('challenge_win_plants')
    expect(claimResult.success).toBe(true)
    expect(claimResult.gemsAwarded).toBe(100)
  })

  it('14. should reject claiming rewards for incomplete challenges', () => {
    const claimResult = claimChallengeReward('challenge_win_under_8_turns')
    expect(claimResult.success).toBe(false)
    expect(claimResult.gemsAwarded).toBe(0)
  })

  it('15. should maintain completed challenges when subsequent matches are evaluated', () => {
    const state = createInitialGameState()
    evaluateChallengeProgress(state, { winner: 'plants', playerSide: 'plants', turnsTaken: 5 })
    expect(loadDailyChallenges().find(c => c.id === 'challenge_win_plants')?.isCompleted).toBe(true)

    // Next match where Zombies win
    evaluateChallengeProgress(state, { winner: 'zombies', playerSide: 'plants', turnsTaken: 10 })
    expect(loadDailyChallenges().find(c => c.id === 'challenge_win_plants')?.isCompleted).toBe(true)
  })

  describe('Enhanced Combat Log & CombatEvent metadata', () => {
    it('16. should automatically stamp timestamp and roundNumber on combat events in single lane combat', () => {
      const state = createInitialGameState()
      state.turn = 3
      state.lanes[0].plantMinion = {
        instanceId: 'p1',
        cardId: 'plant_peashooter',
        name: 'Peashooter',
        side: 'plants',
        currentAttack: 1,
        baseAttack: 1,
        currentHealth: 1,
        maxHealth: 1,
        image: '',
      }

      const res = resolveSingleLaneCombat(state, 0)
      expect(res.events.length).toBeGreaterThan(0)
      const event = res.events[0]
      expect(event.timestamp).toBeTypeOf('number')
      expect(event.roundNumber).toBe(3)
    })

    it('17. should automatically stamp timestamp and roundNumber in full resolveCombat', () => {
      const state = createInitialGameState()
      state.turn = 5
      state.lanes[1].plantMinion = {
        instanceId: 'p2',
        cardId: 'plant_repeater',
        name: 'Repeater',
        side: 'plants',
        currentAttack: 2,
        baseAttack: 2,
        currentHealth: 2,
        maxHealth: 2,
        image: '',
      }

      const res = resolveCombat(state)
      expect(res.result.events.length).toBeGreaterThan(0)
      for (const evt of res.result.events) {
        expect(evt.timestamp).toBeTypeOf('number')
        expect(evt.roundNumber).toBe(5)
      }
    })

    it('18. should format combat events into readable log summaries via formatCombatLog', () => {
      const events: CombatEvent[] = [
        {
          laneIndex: 0,
          attackerSide: 'plants',
          attackerName: 'Peashooter',
          target: 'hero',
          targetSide: 'zombies',
          damageDealt: 1,
          isBlocked: false,
          isLethal: false,
          roundNumber: 2,
          timestamp: Date.now(),
          description: 'Peashooter bắn trúng Zombie Hero!',
        },
        {
          laneIndex: 1,
          attackerSide: 'zombies',
          attackerName: 'Foot Soldier',
          target: 'minion',
          targetSide: 'plants',
          damageDealt: 3,
          isBlocked: true,
          isLethal: false,
          roundNumber: 2,
          timestamp: Date.now(),
          description: '',
        },
      ]

      const formatted = formatCombatLog(events)
      expect(formatted.length).toBe(2)
      expect(formatted[0]).toContain('[Lượt 2]')
      expect(formatted[0]).toContain('[Làn 1]')
      expect(formatted[0]).toContain('Peashooter')
      expect(formatted[0]).toContain('Zombie Hero')

      expect(formatted[1]).toContain('[Lượt 2]')
      expect(formatted[1]).toContain('[Làn 2]')
      expect(formatted[1]).toContain('Blocked')
    })
  })
})

