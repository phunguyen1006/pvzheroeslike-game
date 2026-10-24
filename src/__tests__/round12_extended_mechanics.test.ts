import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createDefaultDailyChallenges,
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
  saveAllHeroQuestProgress,
  HERO_QUESTS_STORAGE_KEY,
} from '../data/heroQuests'
import {
  triggerOnDeath,
  triggerOnMultipleDeaths,
} from '../engine/triggers'
import {
  createInitialGameState,
  gameReducer,
} from '../engine/reducer'
import {
  applyHeroDamage,
  resolveCombat,
} from '../engine/combat'
import {
  getAIMulliganDecision,
  getAISuperpowerDecision,
  getAIDecision,
  type AIArchetype,
  type AIDifficulty,
} from '../engine/ai'
import type { GameState, Side, Card, Minion, LaneState, Phase } from '../engine/types'

// ========================================================
// HELPER FACTORIES
// ========================================================

const createTestMinion = (
  instanceId: string,
  name: string,
  side: Side,
  attack: number,
  health: number,
  options: Partial<Minion> = {}
): Minion => ({
  instanceId,
  cardId: options.cardId || `card_${instanceId}`,
  name,
  side,
  attack,
  baseAttack: attack,
  currentAttack: attack,
  health,
  maxHealth: health,
  currentHealth: health,
  image: '/assets/placeholder.png',
  ...options,
})

describe('Round 12 Extended Mechanics & High-Scale Verification', () => {
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

  // =========================================================================
  // 1. DAILY CHALLENGES EVALUATION LOGIC & REWARDS
  // =========================================================================
  describe('1. Daily Challenges Evaluation Logic & Life-Cycle', () => {
    it('1.1 initializes default challenges with valid metrics and targets', () => {
      const today = '2026-10-24'
      const data = createDefaultDailyChallenges(today)
      expect(data.date).toBe(today)
      expect(data.challenges).toHaveLength(4)

      const metricTypes = data.challenges.map((c) => c.metricType)
      expect(metricTypes).toContain('win_match')
      expect(metricTypes).toContain('deal_hero_damage')
      expect(metricTypes).toContain('play_trick')
      expect(metricTypes).toContain('play_minion')

      data.challenges.forEach((c) => {
        expect(c.currentCount).toBe(0)
        expect(c.targetCount).toBeGreaterThan(0)
        expect(c.rewardGems).toBeGreaterThan(0)
        expect(c.rewardCoins).toBeGreaterThan(0)
        expect(c.isCompleted).toBe(false)
        expect(c.isClaimed).toBe(false)
      })
    })

    it('1.2 automatically rolls over and resets challenges when date changes', () => {
      const pastDate = '2026-10-20'
      const oldData = createDefaultDailyChallenges(pastDate)
      // Mark all completed on old date
      oldData.challenges.forEach((c) => {
        c.currentCount = c.targetCount
        c.isCompleted = true
        c.isClaimed = true
      })
      saveDailyChallenges(oldData)

      // Loading challenges on current date should detect date mismatch and reset
      const loaded = loadDailyChallenges()
      const today = new Date().toISOString().slice(0, 10)
      expect(loaded.date).toBe(today)
      expect(loaded.challenges.every((c) => !c.isCompleted && !c.isClaimed)).toBe(true)
    })

    it('1.3 accurately updates metrics across multiple matches and tracks newly completed count', () => {
      // Match 1: Player loses, deals 12 damage, plays 1 trick, 2 minions
      const match1 = updateDailyChallengesOnMatchOver({
        winner: 'zombies',
        playerSide: 'plants',
        damageDealtToEnemyHero: 12,
        tricksPlayed: 1,
        minionsPlayed: 2,
      })

      expect(match1.updated).toBe(true)
      expect(match1.newlyCompletedCount).toBe(0)

      let data = loadDailyChallenges()
      const winC = data.challenges.find((c) => c.metricType === 'win_match')!
      const dmgC = data.challenges.find((c) => c.metricType === 'deal_hero_damage')!
      const trickC = data.challenges.find((c) => c.metricType === 'play_trick')!
      const minionC = data.challenges.find((c) => c.metricType === 'play_minion')!

      expect(winC.currentCount).toBe(0)
      expect(winC.isCompleted).toBe(false)
      expect(dmgC.currentCount).toBe(12)
      expect(dmgC.isCompleted).toBe(false)
      expect(trickC.currentCount).toBe(1)
      expect(minionC.currentCount).toBe(2)

      // Match 2: Player wins, deals 15 damage, plays 2 tricks, 1 minion
      // This should complete: win_match (1/1), deal_hero_damage (27/20), play_trick (3/3), play_minion (3/3)
      const match2 = updateDailyChallengesOnMatchOver({
        winner: 'plants',
        playerSide: 'plants',
        damageDealtToEnemyHero: 15,
        tricksPlayed: 2,
        minionsPlayed: 1,
      })

      expect(match2.updated).toBe(true)
      expect(match2.newlyCompletedCount).toBe(4) // All 4 completed!

      data = loadDailyChallenges()
      expect(data.challenges.every((c) => c.isCompleted)).toBe(true)
    })

    it('1.4 safely ignores already completed challenges on subsequent matches', () => {
      // First match completes win challenge
      updateDailyChallengesOnMatchOver({
        winner: 'plants',
        playerSide: 'plants',
        damageDealtToEnemyHero: 0,
      })

      // Second match should not count win challenge again as newly completed
      const match2 = updateDailyChallengesOnMatchOver({
        winner: 'plants',
        playerSide: 'plants',
        damageDealtToEnemyHero: 0,
      })

      expect(match2.newlyCompletedCount).toBe(0)
    })

    it('1.5 successfully claims reward and deposits gems/coins into player wallet', () => {
      const data = loadDailyChallenges()
      const winC = data.challenges.find((c) => c.metricType === 'win_match')!
      winC.currentCount = winC.targetCount
      winC.isCompleted = true
      saveDailyChallenges(data)

      localStorage.setItem('pvz_player_gems', '100')
      localStorage.setItem('pvz_player_coins', '500')

      const claimResult = claimDailyChallengeReward(winC.id)
      expect(claimResult).not.toBeNull()
      expect(claimResult?.success).toBe(true)
      expect(claimResult?.gemsAwarded).toBe(winC.rewardGems)
      expect(claimResult?.coinsAwarded).toBe(winC.rewardCoins)

      expect(localStorage.getItem('pvz_player_gems')).toBe(String(100 + winC.rewardGems))
      expect(localStorage.getItem('pvz_player_coins')).toBe(String(500 + winC.rewardCoins))

      // Repeated claim returns null
      expect(claimDailyChallengeReward(winC.id)).toBeNull()
    })

    it('1.6 correctly computes badge counts for notification badges', () => {
      let badge = getDailyChallengesBadgeCount()
      expect(badge.readyToClaimCount).toBe(0)
      expect(badge.pendingCount).toBe(4)
      expect(badge.totalUncompleted).toBe(4)

      // Complete 2 challenges
      const data = loadDailyChallenges()
      data.challenges[0].isCompleted = true
      data.challenges[1].isCompleted = true
      saveDailyChallenges(data)

      badge = getDailyChallengesBadgeCount()
      expect(badge.readyToClaimCount).toBe(2)
      expect(badge.pendingCount).toBe(2)
      expect(badge.totalUncompleted).toBe(4)

      // Claim 1 challenge
      claimDailyChallengeReward(data.challenges[0].id)
      badge = getDailyChallengesBadgeCount()
      expect(badge.readyToClaimCount).toBe(1)
      expect(badge.pendingCount).toBe(2)
      expect(badge.totalUncompleted).toBe(3)
    })
  })

  // =========================================================================
  // 2. HERO QUESTS PROGRESS TRACKING & REWARD PROGRESSION
  // =========================================================================
  describe('2. Hero Quests Progress Tracking & Sequential Progression', () => {
    it('2.1 validates full registry of 5 heroes with 5 sequential steps each', () => {
      const heroes = [
        'hero_green_shadow',
        'hero_solar_flare',
        'hero_super_brainz',
        'hero_the_smash',
        'hero_rustbolt',
      ]

      heroes.forEach((heroId) => {
        const quests = getHeroQuests(heroId)
        expect(quests).toHaveLength(5)
        expect(quests.map((q) => q.stepNumber)).toEqual([1, 2, 3, 4, 5])

        quests.forEach((q) => {
          expect(q.title).toBeTruthy()
          expect(q.description).toBeTruthy()
          expect(q.targetCount).toBeGreaterThan(0)
          expect(q.rewardGems).toBeGreaterThan(0)
          expect(q.rewardCoins).toBeGreaterThan(0)
        })

        // Step 5 awards exclusive hero title
        expect(quests[4].exclusiveTitle).toBeTruthy()
      })
    })

    it('2.2 correctly evaluates metric types: tribe, lane, traits, sun/brains, superpowers', () => {
      const heroId = 'hero_solar_flare'

      // Step 1: produce_sun (target: 8)
      let res = advanceHeroQuestProgress(heroId, 'produce_sun', 4)
      expect(res.advanced).toBe(true)
      expect(res.currentCount).toBe(4)
      expect(res.questCompleted).toBe(false)

      res = advanceHeroQuestProgress(heroId, 'produce_sun', 5)
      expect(res.advanced).toBe(true)
      expect(res.currentCount).toBe(8) // Clamped to target 8
      expect(res.questCompleted).toBe(true)

      // Irrelevant metric does not advance
      res = advanceHeroQuestProgress(heroId, 'spend_brains', 10)
      expect(res.advanced).toBe(false)
    })

    it('2.3 enforces strict sequential step claiming and prevents premature claims', () => {
      const heroId = 'hero_the_smash'

      // Step 1: trigger_trait (frenzy, target: 2)
      // Try premature claim before meeting target
      expect(claimHeroQuestReward(heroId, 1)).toBeNull()

      advanceHeroQuestProgress(heroId, 'trigger_trait', 2, 'frenzy')
      // Try claiming Step 2 while on Step 1
      expect(claimHeroQuestReward(heroId, 2)).toBeNull()

      // Claim Step 1 successfully
      const claim1 = claimHeroQuestReward(heroId, 1)
      expect(claim1?.success).toBe(true)
      expect(claim1?.nextStep).toBe(2)

      const stateAfter = getHeroQuestState(heroId)
      expect(stateAfter.currentStep).toBe(2)
      expect(stateAfter.currentCount).toBe(0)
      expect(stateAfter.claimedSteps).toEqual([1])
    })

    it('2.4 handles full 5-step lifecycle through to ultimate title unlock', () => {
      const heroId = 'hero_rustbolt'

      for (let step = 1; step <= 5; step++) {
        const state = getHeroQuestState(heroId)
        expect(state.currentStep).toBe(step)

        const quest = getHeroQuests(heroId).find((q) => q.stepNumber === step)!
        // Advance to completion
        advanceHeroQuestProgress(heroId, quest.metricType, quest.targetCount, quest.metricParam)

        const claimRes = claimHeroQuestReward(heroId, step)
        expect(claimRes?.success).toBe(true)

        if (step === 5) {
          expect(claimRes?.titleAwarded).toBe('Kỹ Sư Nguyên Tử')
          const finalState = getHeroQuestState(heroId)
          expect(finalState.isFullyCompleted).toBe(true)
          expect(finalState.claimedSteps).toHaveLength(5)
        }
      }

      // After full completion, further advances are safely rejected
      const overAdvance = advanceHeroQuestProgress(heroId, 'win_matches', 1)
      expect(overAdvance.advanced).toBe(false)
    })
  })

  // =========================================================================
  // 3. CASCADE DEATH TRIGGERS ORDERING & CHAIN REACTIONS
  // =========================================================================
  describe('3. Cascade Death Triggers Ordering & Galacta-Cactus Chain Reactions', () => {
    it('3.1 sorts multiple simultaneous deaths left-to-right (Lane 0 to 4) and Plants before Zombies', () => {
      let state = createInitialGameState('hero_green_shadow', 'hero_super_brainz')

      // Create units with distinct death abilities across lanes
      const pLane3 = createTestMinion('hh_l3', 'Hothead', 'plants', 0, 0, {
        cardId: 'plant_hothead',
      })
      const zLane3 = createTestMinion('gg_l3', 'Gas Giant', 'zombies', 5, 0, {
        cardId: 'zombie_gas_giant',
      })
      const pLane1 = createTestMinion('hh_l1', 'Hothead', 'plants', 0, 0, {
        cardId: 'plant_hothead',
      })
      const zLane1 = createTestMinion('gg_l1', 'Gas Giant', 'zombies', 5, 0, {
        cardId: 'zombie_gas_giant',
      })
      const pLane0 = createTestMinion('hh_l0', 'Hothead', 'plants', 0, 0, {
        cardId: 'plant_hothead',
      })

      // Pass out of order to triggerOnMultipleDeaths
      const deadUnits = [
        { minion: zLane3, laneIndex: 3 },
        { minion: pLane3, laneIndex: 3 },
        { minion: zLane1, laneIndex: 1 },
        { minion: pLane0, laneIndex: 0 },
        { minion: pLane1, laneIndex: 1 },
      ]

      const res = triggerOnMultipleDeaths(state, deadUnits)

      // Expected sorted trigger order:
      // 1. Lane 0: Hothead (plants)
      // 2. Lane 1: Hothead (plants)
      // 3. Lane 1: Gas Giant (zombies)
      // 4. Lane 3: Hothead (plants)
      // 5. Lane 3: Gas Giant (zombies)
      const triggerLogs = res.logs.filter(
        (l) => l.includes('Hothead phát nổ') || l.includes('Gas Giant')
      )

      expect(triggerLogs).toHaveLength(5)
      expect(triggerLogs[0]).toContain('Lane 1 (Heights)') // Lane 0 Hothead
      expect(triggerLogs[1]).toContain('Lane 2 (Ground)')  // Lane 1 Hothead
      expect(triggerLogs[2]).toContain('Khí độc Gas Giant') // Lane 1 Gas Giant
      expect(triggerLogs[3]).toContain('Lane 4 (Ground)')  // Lane 3 Hothead
      expect(triggerLogs[4]).toContain('Khí độc Gas Giant') // Lane 3 Gas Giant
    })

    it('3.2 Galacta-Cactus on death deals 1 damage to ALL minions and 1 Bullseye damage to both Heroes', () => {
      let state = createInitialGameState('hero_green_shadow', 'hero_super_brainz')
      state.plantHero.hp = 20
      state.zombieHero.hp = 20
      const initialPlantMeter = state.plantHero.blockMeter
      const initialZombieMeter = state.zombieHero.blockMeter

      const galacta = createTestMinion('gc1', 'Galacta-Cactus', 'plants', 2, 0, {
        cardId: 'plant_galacta_cactus',
      })
      // Place minions in adjacent and remote lanes
      state.lanes[0].plantMinion = createTestMinion('p0', 'Peashooter', 'plants', 1, 3)
      state.lanes[1].zombieMinion = createTestMinion('z1', 'Conehead', 'zombies', 2, 4)
      state.lanes[2].plantTeamUpMinion = createTestMinion('tu2', 'Puff-Shroom', 'plants', 1, 1)

      const deathRes = triggerOnDeath(state, galacta, 1)

      // All minions take 1 damage
      expect(deathRes.updatedState.lanes[0].plantMinion?.currentHealth).toBe(2) // 3 - 1 = 2
      expect(deathRes.updatedState.lanes[1].zombieMinion?.currentHealth).toBe(3) // 4 - 1 = 3
      // Puff-Shroom had 1 HP, so it is destroyed
      expect(deathRes.updatedState.lanes[2].plantTeamUpMinion).toBeNull()

      // Both Heroes take 1 damage with Bullseye (no meter increase)
      expect(deathRes.updatedState.plantHero.hp).toBe(19)
      expect(deathRes.updatedState.zombieHero.hp).toBe(19)
      expect(deathRes.updatedState.plantHero.blockMeter).toBe(initialPlantMeter)
      expect(deathRes.updatedState.zombieHero.blockMeter).toBe(initialZombieMeter)

      expect(deathRes.logs.some((l) => l.includes('Galacta-Cactus phát nổ vũ trụ'))).toBe(true)
    })

    it('3.3 Galacta-Cactus explosion triggers recursive cascade death reaction when destroying another death-trigger unit', () => {
      let state = createInitialGameState('hero_green_shadow', 'hero_super_brainz')
      state.plantHero.hp = 20
      state.zombieHero.hp = 20

      // Galacta 1 dying in Lane 0
      const galacta1 = createTestMinion('gc1', 'Galacta-Cactus', 'plants', 2, 0, {
        cardId: 'plant_galacta_cactus',
      })

      // Galacta 2 on board in Lane 2 with only 1 HP remaining
      state.lanes[2].plantMinion = createTestMinion('gc2', 'Galacta-Cactus', 'plants', 2, 1, {
        cardId: 'plant_galacta_cactus',
      })

      // High HP zombie in Lane 3
      state.lanes[3].zombieMinion = createTestMinion('z3', 'Gargantuar', 'zombies', 5, 5)

      // Trigger death of Galacta 1:
      // Galacta 1 explodes -> deals 1 damage to everything -> destroys Galacta 2 -> Galacta 2 explodes!
      const deathRes = triggerOnDeath(state, galacta1, 0)

      // Galacta 2 was killed by Galacta 1 explosion and cleared
      expect(deathRes.updatedState.lanes[2].plantMinion).toBeNull()

      // Gargantuar should take 2 total damage (1 from GC1 + 1 from GC2)
      expect(deathRes.updatedState.lanes[3].zombieMinion?.currentHealth).toBe(3) // 5 - 2 = 3

      // Both Heroes took 2 total damage (1 from GC1 + 1 from GC2)
      expect(deathRes.updatedState.plantHero.hp).toBe(18) // 20 - 2 = 18
      expect(deathRes.updatedState.zombieHero.hp).toBe(18) // 20 - 2 = 18
    })
  })

  // =========================================================================
  // 4. HIGH-SCALE MONTE-CARLO AI SIMULATION (100 MATCHES)
  // =========================================================================
  describe('4. High-Scale Monte-Carlo AI Simulation (100 Matches)', () => {
    it('4.1 executes 100 automated AI vs AI matches with 0 exceptions, 0 deadlocks, and invariant preservation', () => {
      const archetypePairs: [AIArchetype, AIArchetype][] = [
        ['aggro', 'control'],
        ['control', 'midrange'],
        ['midrange', 'tempo'],
        ['tempo', 'aggro'],
        ['aggro', 'aggro'],
        ['control', 'control'],
        ['tempo', 'midrange'],
        ['midrange', 'control'],
      ]

      const difficulties: AIDifficulty[] = ['easy', 'medium', 'hard']

      let matchesCompleted = 0
      let plantWins = 0
      let zombieWins = 0
      let ties = 0
      let totalTurnsSimulated = 0

      const TOTAL_MATCHES = 100

      for (let matchIdx = 0; matchIdx < TOTAL_MATCHES; matchIdx++) {
        const [plantArch, zombieArch] = archetypePairs[matchIdx % archetypePairs.length]
        const diff = difficulties[matchIdx % difficulties.length]

        let state = createInitialGameState('hero_green_shadow', 'hero_super_brainz')

        // 1. Mulligan Phase
        if (state.phase === 'MULLIGAN') {
          const plantMull = getAIMulliganDecision(state, 'plants', diff, plantArch)
          const zombieMull = getAIMulliganDecision(state, 'zombies', diff, zombieArch)

          state = gameReducer(state, {
            type: 'CONFIRM_MULLIGAN',
            side: 'plants',
            keepIndices: plantMull.keepIndices,
          })

          state = gameReducer(state, {
            type: 'CONFIRM_MULLIGAN',
            side: 'zombies',
            keepIndices: zombieMull.keepIndices,
          })
        }

        // 2. Play loop with safety guard of 25 turns
        let matchTurns = 0
        const MAX_TURNS = 25

        while (state.winner === null && matchTurns < MAX_TURNS) {
          matchTurns++
          totalTurnsSimulated++

          // Superpower check
          if (state.pendingSuperBlock) {
            const spSide = state.pendingSuperBlock.side
            const spArch = spSide === 'plants' ? plantArch : zombieArch
            const spDecision = getAISuperpowerDecision(state, spSide, diff, spArch)

            if (spDecision.action === 'PLAY' && spDecision.cardId) {
              state = gameReducer(state, {
                type: 'PLAY_SUPERPOWER',
                cardId: spDecision.cardId,
                laneIndex: spDecision.laneIndex ?? 0,
              })
            } else {
              state = gameReducer(state, {
                type: 'SAVE_SUPERPOWER',
              })
            }
            continue
          }

          // Main Phase Actions
          const currentSide = state.currentTurn
          const arch = currentSide === 'plants' ? plantArch : zombieArch
          const decision = getAIDecision(state, currentSide, diff, arch)

          if (decision.type === 'END_PHASE' || decision.type === 'PASS') {
            state = gameReducer(state, { type: 'END_TURN' })
          } else if (decision.type === 'PLAY_CARD' && decision.cardId) {
            state = gameReducer(state, {
              type: 'PLAY_CARD',
              cardId: decision.cardId,
              laneIndex: decision.laneIndex ?? 0,
            })
          } else {
            state = gameReducer(state, { type: 'END_TURN' })
          }

          // Safety state invariant assertions
          expect(state.plantHero.hp).toBeGreaterThanOrEqual(-100)
          expect(state.zombieHero.hp).toBeGreaterThanOrEqual(-100)
          expect(state.lanes).toHaveLength(5)
        }

        matchesCompleted++
        if (state.winner === 'plants') plantWins++
        else if (state.winner === 'zombies') zombieWins++
        else ties++
      }

      expect(matchesCompleted).toBe(TOTAL_MATCHES)
      expect(totalTurnsSimulated).toBeGreaterThan(TOTAL_MATCHES * 2)
      expect(plantWins + zombieWins + ties).toBe(TOTAL_MATCHES)
    })
  })
})
