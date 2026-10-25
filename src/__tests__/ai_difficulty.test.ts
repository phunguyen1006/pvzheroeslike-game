import { describe, it, expect } from 'vitest'
import {
  getAIDecision,
  getAIMulliganDecision,
  simulate1TurnLookahead,
  simulate2TurnLookahead,
  getHeroCounterPick,
  createAIPerformanceTracker,
  exportAIPerformanceMetrics,
  PLANT_TO_ZOMBIE_COUNTERS,
  ZOMBIE_TO_PLANT_COUNTERS,
} from '../engine/ai'
import { createInitialGameState } from '../engine/reducer'
import { ALL_CARDS, getCardById } from '../data/cards'
import type { GameState, Card, Minion, AIDecision } from '../engine/types'

describe('AI Difficulty Scaling & Adaptive Learning Suite (Đợt 11)', () => {
  function getCard(id: string): Card {
    const raw = getCardById(id) || ALL_CARDS.find((c) => c.id === id)
    if (!raw) {
      return {
        id,
        name: id,
        side: id.startsWith('plant') ? 'plants' : 'zombies',
        cost: 2,
        attack: 2,
        health: 2,
        type: 'minion',
        image: '',
        traits: [],
      }
    }
    return {
      id: raw.id,
      name: raw.name,
      side: raw.team as any,
      cost: raw.cost,
      attack: raw.attack ?? 0,
      health: (raw as any).hp ?? (raw as any).health ?? 0,
      type: raw.type === 'plant' || raw.type === 'zombie' ? 'minion' : (raw.type as any),
      image: (raw as any).image || (raw as any).assetPath || '',
      traits: raw.traits ?? [],
      amphibious: Boolean(raw.traits?.some((t: string) => t.toLowerCase().includes('amphibious'))),
      bullseye: Boolean(raw.traits?.some((t: string) => t.toLowerCase().includes('bullseye'))),
      teamUp: Boolean(raw.traits?.some((t: string) => t.toLowerCase().includes('team-up'))),
      frenzy: Boolean(raw.traits?.some((t: string) => t.toLowerCase().includes('frenzy'))),
      deadly: Boolean(raw.traits?.some((t: string) => t.toLowerCase().includes('deadly'))),
      strikethrough: Boolean(raw.traits?.some((t: string) => t.toLowerCase().includes('strikethrough'))),
      armored: (raw as any).armored,
      antiHero: (raw as any).antiHero,
      doubleStrike: Boolean(raw.traits?.some((t: string) => t.toLowerCase().includes('double-strike') || t.toLowerCase().includes('doublestrike'))),
    }
  }

  function createTestMinion(data: {
    instanceId: string
    cardId: string
    name: string
    side: 'plants' | 'zombies'
    currentAttack: number
    currentHealth: number
    traits?: string[]
    antiHero?: number
    strikethrough?: boolean
    frenzy?: boolean
    bullseye?: boolean
    armored?: number
    doubleStrike?: boolean
    deadly?: boolean
  }): Minion {
    return {
      baseAttack: data.currentAttack,
      maxHealth: data.currentHealth,
      image: '/assets/mock.png',
      ...data,
    }
  }

  // =========================================================================
  // 1. EASY AI DIFFICULTY MECHANICS
  // =========================================================================
  describe('1. Easy AI Suboptimal Decisions & Behavior', () => {
    it('executes suboptimal decisions when forceSuboptimal is enabled', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 4
      state.zombieHand = [getCard('zombie_browncoat'), getCard('zombie_conehead')]

      const decision = getAIDecision(state, 'zombies', {
        difficulty: 'easy',
        forceSuboptimal: true,
      })

      expect(decision.reason).toContain('Suboptimal')
    })

    it('exhibits random suboptimal play with baseline rate of ~40%', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 4
      state.zombieHand = [getCard('zombie_browncoat'), getCard('zombie_conehead')]

      let suboptimalCount = 0
      const trials = 100

      for (let i = 0; i < trials; i++) {
        const decision = getAIDecision(state, 'zombies', { difficulty: 'easy' })
        if (decision.reason?.includes('Suboptimal')) {
          suboptimalCount++
        }
      }

      // Expected ~40% (allow tolerance [20, 65] across 100 trials)
      expect(suboptimalCount).toBeGreaterThan(15)
      expect(suboptimalCount).toBeLessThan(70)
    })

    it('performs suboptimal mulligan by keeping heavy cards (>=4 cost) and swapping 1-2 cost cards', () => {
      const hand: Card[] = [
        getCard('plant_peashooter'), // cost 1
        getCard('plant_sunflower'), // cost 1
        getCard('plant_repeater'), // cost 3
        getCard('plant_squash'), // cost 5
      ]

      const mulligan = getAIMulliganDecision(hand, 'tempo', 'hero_green_shadow', 'easy')

      expect(mulligan.swapIndices).toContain(0) // swaps peashooter (cost 1)
      expect(mulligan.swapIndices).toContain(1) // swaps sunflower (cost 1)
      expect(mulligan.swapIndices).toContain(2) // swaps repeater (cost 3)
      expect(mulligan.keepIndices).toContain(3) // keeps squash (cost 5)
      expect(mulligan.reason).toContain('Easy AI: Suboptimal mulligan')
    })

    it('skips lethal trick calculations and execution', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.plantHero.hp = 2 // lethal range for Bungee Plumber (deals 2)
      state.zombieHero.brains = 3
      state.zombieHand = [getCard('zombie_bungee_plumber')]

      // Easy AI skips checkLethalPossibility
      const decision = getAIDecision(state, 'zombies', {
        difficulty: 'easy',
        forceSuboptimal: false,
      })

      // Easy AI should either target a minion or fallback, NOT execute direct face lethal
      if (decision.action === 'PLAY_TRICK') {
        expect(decision.targetHero).not.toBe(true)
      } else {
        expect(decision.action).toBe('PASS')
      }
    })

    it('increases suboptimal rate to 60% when player has 3+ consecutive losses', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 4
      state.zombieHand = [getCard('zombie_browncoat')]

      let suboptimalCount = 0
      const trials = 100

      for (let i = 0; i < trials; i++) {
        const decision = getAIDecision(state, 'zombies', {
          difficulty: 'easy',
          playerConsecutiveLosses: 3,
        })
        if (decision.reason?.includes('Suboptimal')) {
          suboptimalCount++
        }
      }

      // 60% suboptimal rate with playerConsecutiveLosses >= 3
      expect(suboptimalCount).toBeGreaterThan(40)
    })
  })

  // =========================================================================
  // 2. ANTI-FRUSTRATION MECHANICS
  // =========================================================================
  describe('2. Anti-Frustration Lethal Mechanics', () => {
    it('intentionally misses lethal every 3 turns when Player HP <= 5 on Normal difficulty', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.turn = 6 // 6 % 3 === 0
      state.plantHero.hp = 2 // Player is at critical HP <= 5
      state.zombieHero.brains = 3
      state.zombieHand = [getCard('zombie_bungee_plumber')] // 2 direct face damage

      const decision = getAIDecision(state, 'zombies', {
        difficulty: 'normal',
      })

      expect(decision.action).toBe('PASS')
      expect(decision.reason).toContain('Anti-Frustration: Intentionally missed lethal')
    })

    it('executes lethal on other turns when turn % 3 !== 0', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.turn = 5 // 5 % 3 !== 0
      state.plantHero.hp = 2
      state.zombieHero.brains = 3
      state.zombieHand = [getCard('zombie_bungee_plumber')]

      const decision = getAIDecision(state, 'zombies', {
        difficulty: 'normal',
      })

      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.targetHero).toBe(true)
      expect(decision.card?.id).toBe('zombie_bungee_plumber')
    })

    it('forces missed lethal when forceMissLethal flag is set', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.turn = 4 // 4 % 3 !== 0
      state.plantHero.hp = 2
      state.zombieHero.brains = 3
      state.zombieHand = [getCard('zombie_bungee_plumber')]

      const decision = getAIDecision(state, 'zombies', {
        difficulty: 'normal',
        forceMissLethal: true,
      })

      expect(decision.action).toBe('PASS')
      expect(decision.reason).toContain('Anti-Frustration: Intentionally missed lethal')
    })

    it('does not apply anti-frustration missed lethal to Hard or Expert difficulty', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.turn = 3 // 3 % 3 === 0
      state.plantHero.hp = 2
      state.zombieHero.brains = 3
      state.zombieHand = [getCard('zombie_bungee_plumber')]

      const hardDecision = getAIDecision(state, 'zombies', { difficulty: 'hard' })
      expect(hardDecision.action).toBe('PLAY_TRICK')
      expect(hardDecision.targetHero).toBe(true)

      const expertDecision = getAIDecision(state, 'zombies', { difficulty: 'expert' })
      expect(expertDecision.action).toBe('PLAY_TRICK')
      expect(expertDecision.targetHero).toBe(true)
    })
  })

  // =========================================================================
  // 3. HARD AI & 1-TURN LOOKAHEAD SIMULATION
  // =========================================================================
  describe('3. Hard AI & 1-Turn Lookahead Simulation', () => {
    it('evaluates favorable minion trade: destroying threat and surviving scores higher than dying', () => {
      const state = createInitialGameState()
      // Lane 1 has a 2/2 enemy Plant
      state.lanes[1].plantMinion = createTestMinion({
        instanceId: 'plant_1',
        cardId: 'plant_peashooter',
        name: 'Peashooter',
        side: 'plants',
        currentAttack: 2,
        currentHealth: 2,
      })

      const survivingCandidate: AIDecision = {
        action: 'PLAY_MINION',
        card: getCard('zombie_conehead'), // 2/4 (deals 2 to kill peashooter, takes 2 and survives with 2 HP)
        laneIndex: 1,
      }

      const dyingCandidate: AIDecision = {
        action: 'PLAY_MINION',
        card: getCard('zombie_browncoat'), // 1/1 (dies to peashooter without killing it)
        laneIndex: 1,
      }

      const surviveScore = simulate1TurnLookahead(state, 'zombies', survivingCandidate)
      const dieScore = simulate1TurnLookahead(state, 'zombies', dyingCandidate)

      expect(surviveScore).toBeGreaterThan(dieScore)
    })

    it('scores open lane face damage and awards >= 1000 for 1-turn lethal', () => {
      const state = createInitialGameState()
      state.plantHero.hp = 4

      const lethalCard: Card = {
        ...getCard('zombie_browncoat'),
        attack: 5,
        health: 4,
      }

      const lethalCandidate: AIDecision = {
        action: 'PLAY_MINION',
        card: lethalCard,
        laneIndex: 1,
      }

      const nonLethalCandidate: AIDecision = {
        action: 'PLAY_MINION',
        card: getCard('zombie_browncoat'), // 1 attack on open lane
        laneIndex: 1,
      }

      const lethalScore = simulate1TurnLookahead(state, 'zombies', lethalCandidate)
      const nonLethalScore = simulate1TurnLookahead(state, 'zombies', nonLethalCandidate)

      expect(lethalScore).toBeGreaterThanOrEqual(1000)
      expect(nonLethalScore).toBeLessThan(100)
    })

    it('evaluates Strikethrough damage bypassing enemy blockers', () => {
      const state = createInitialGameState()
      // Lane 2 has high HP blocker
      state.lanes[2].plantMinion = createTestMinion({
        instanceId: 'wallnut_1',
        cardId: 'plant_wall_nut',
        name: 'Wall-Nut',
        side: 'plants',
        currentAttack: 0,
        currentHealth: 6,
      })

      const strikethroughCard: Card = {
        ...getCard('zombie_line_dancer'),
        strikethrough: true,
        attack: 3,
        health: 1,
      }

      const regularCard: Card = {
        ...getCard('zombie_browncoat'),
        attack: 3,
        health: 1,
      }

      const strikeCandidate: AIDecision = {
        action: 'PLAY_MINION',
        card: strikethroughCard,
        laneIndex: 2,
      }

      const regularCandidate: AIDecision = {
        action: 'PLAY_MINION',
        card: regularCard,
        laneIndex: 2,
      }

      const strikeScore = simulate1TurnLookahead(state, 'zombies', strikeCandidate)
      const regularScore = simulate1TurnLookahead(state, 'zombies', regularCandidate)

      expect(strikeScore).toBeGreaterThan(regularScore)
    })

    it('scores direct trick face burn when enemy hero is within lethal range', () => {
      const state = createInitialGameState()
      state.plantHero.hp = 2

      const burnCandidate: AIDecision = {
        action: 'PLAY_TRICK',
        card: getCard('zombie_bungee_plumber'), // 2 burn
        targetHero: true,
      }

      const burnScore = simulate1TurnLookahead(state, 'zombies', burnCandidate)
      expect(burnScore).toBeGreaterThanOrEqual(1000)
    })
  })

  // =========================================================================
  // 4. EXPERT AI & 2-TURN LOOKAHEAD SIMULATION
  // =========================================================================
  describe('4. Expert AI & 2-Turn Lookahead Simulation', () => {
    it('detects 2-turn lethal setup on open lanes (unblocked attack * 2 >= enemy HP)', () => {
      const state = createInitialGameState()
      state.plantHero.hp = 8 // 4-attack minion over 2 turns deals 4 + 4 = 8 lethal!

      const twoTurnLethalCard: Card = {
        ...getCard('zombie_foot_soldier'),
        attack: 4,
        health: 4,
      }

      const candidate: AIDecision = {
        action: 'PLAY_MINION',
        card: twoTurnLethalCard,
        laneIndex: 1,
      }

      const score = simulate2TurnLookahead(state, 'zombies', candidate)
      // Expect 2-turn lethal bonus (+800)
      expect(score).toBeGreaterThanOrEqual(800)
    })

    it('evaluates persistent threat traits: Frenzy, Double-Strike, Bullseye score higher over 2 turns', () => {
      const state = createInitialGameState()
      state.plantHero.hp = 20

      const vanillaCard: Card = {
        ...getCard('zombie_browncoat'),
        attack: 3,
        health: 4,
      }

      const doubleStrikeCard: Card = {
        ...getCard('plant_repeater'),
        attack: 3,
        health: 4,
        doubleStrike: true,
      }

      const bullseyeCard: Card = {
        ...getCard('zombie_bullseye'),
        attack: 3,
        health: 4,
        bullseye: true,
      }

      const vanillaCandidate: AIDecision = { action: 'PLAY_MINION', card: vanillaCard, laneIndex: 1 }
      const doubleCandidate: AIDecision = { action: 'PLAY_MINION', card: doubleStrikeCard, laneIndex: 1 }
      const bullseyeCandidate: AIDecision = { action: 'PLAY_MINION', card: bullseyeCard, laneIndex: 1 }

      const vanillaScore = simulate2TurnLookahead(state, 'zombies', vanillaCandidate)
      const doubleScore = simulate2TurnLookahead(state, 'plants', doubleCandidate)
      const bullseyeScore = simulate2TurnLookahead(state, 'zombies', bullseyeCandidate)

      expect(doubleScore).toBeGreaterThan(vanillaScore)
      expect(bullseyeScore).toBeGreaterThan(vanillaScore)
    })

    it('projects clearing enemy blocker in turn 1 to deliver lethal face damage in turn 2', () => {
      const state = createInitialGameState()
      state.plantHero.hp = 5

      // Lane 1 has a weak 1/1 plant
      state.lanes[1].plantMinion = createTestMinion({
        instanceId: 'weak_plant',
        cardId: 'plant_peashooter',
        name: 'Peashooter',
        side: 'plants',
        currentAttack: 1,
        currentHealth: 1,
      })

      // Zombie with 5 attack and 3 health will kill the 1/1, survive with 2 HP,
      // and in turn 2 deal 5 unblocked face damage to finish the 5 HP plant hero
      const strongZombie: Card = {
        ...getCard('zombie_foot_soldier'),
        attack: 5,
        health: 3,
      }

      const candidate: AIDecision = {
        action: 'PLAY_MINION',
        card: strongZombie,
        laneIndex: 1,
      }

      const score = simulate2TurnLookahead(state, 'zombies', candidate)
      // Expect 2-turn trade-clear lethal setup bonus (+600)
      expect(score).toBeGreaterThanOrEqual(600)
    })

    it('detects 2-turn burn trick lethal setup (burn * 2 >= enemy HP)', () => {
      const state = createInitialGameState()
      state.plantHero.hp = 6 // Bungee deals 3 or 2; 3 * 2 = 6

      const trickCard: Card = {
        ...getCard('zombie_bungee_plumber'),
        attack: 3,
      }

      const candidate: AIDecision = {
        action: 'PLAY_TRICK',
        card: trickCard,
        targetHero: true,
      }

      const score = simulate2TurnLookahead(state, 'zombies', candidate)
      expect(score).toBeGreaterThanOrEqual(400)
    })
  })

  // =========================================================================
  // 5. HERO COUNTER-PICK STRATEGIC MATCHING
  // =========================================================================
  describe('5. Hero Counter-Picking Matrix', () => {
    it('correctly maps all Plant Heroes to their Zombie counter-heroes', () => {
      expect(getHeroCounterPick('hero_solar_flare', 'zombies')).toBe('hero_rustbolt')
      expect(getHeroCounterPick('hero_wall_knight', 'zombies')).toBe('hero_super_brainz')
      expect(getHeroCounterPick('hero_green_shadow', 'zombies')).toBe('hero_smash')
      expect(getHeroCounterPick('hero_spudow', 'zombies')).toBe('hero_professor_brainstorm')
      expect(getHeroCounterPick('hero_chompzilla', 'zombies')).toBe('hero_immorticia')
      expect(getHeroCounterPick('hero_nightcap', 'zombies')).toBe('hero_z_mech')
      expect(getHeroCounterPick('hero_citron', 'zombies')).toBe('hero_neptuna')
      expect(getHeroCounterPick('hero_grass_knuckles', 'zombies')).toBe('hero_brain_freeze')
      expect(getHeroCounterPick('hero_rose', 'zombies')).toBe('hero_electric_boogaloo')
      expect(getHeroCounterPick('hero_captain_combustible', 'zombies')).toBe('hero_rustbolt')
      expect(getHeroCounterPick('hero_beta_carrotina', 'zombies')).toBe('hero_huge_gigantacus')
    })

    it('correctly maps all Zombie Heroes to their Plant counter-heroes', () => {
      expect(getHeroCounterPick('hero_super_brainz', 'plants')).toBe('hero_spudow')
      expect(getHeroCounterPick('hero_smash', 'plants')).toBe('hero_chompzilla')
      expect(getHeroCounterPick('hero_rustbolt', 'plants')).toBe('hero_solar_flare')
      expect(getHeroCounterPick('hero_impfinity', 'plants')).toBe('hero_solar_flare')
      expect(getHeroCounterPick('hero_professor_brainstorm', 'plants')).toBe('hero_wall_knight')
      expect(getHeroCounterPick('hero_electric_boogaloo', 'plants')).toBe('hero_wall_knight')
      expect(getHeroCounterPick('hero_brain_freeze', 'plants')).toBe('hero_grass_knuckles')
      expect(getHeroCounterPick('hero_immorticia', 'plants')).toBe('hero_green_shadow')
      expect(getHeroCounterPick('hero_z_mech', 'plants')).toBe('hero_rose')
      expect(getHeroCounterPick('hero_neptuna', 'plants')).toBe('hero_citron')
      expect(getHeroCounterPick('hero_huge_gigantacus', 'plants')).toBe('hero_nightcap')
    })

    it('normalizes hero IDs regardless of prefix, spaces, or casing', () => {
      expect(getHeroCounterPick('Solar Flare', 'zombies')).toBe('hero_rustbolt')
      expect(getHeroCounterPick('SUPER-BRAINZ', 'plants')).toBe('hero_spudow')
      expect(getHeroCounterPick('WALL_KNIGHT', 'zombies')).toBe('hero_super_brainz')
    })
  })

  // =========================================================================
  // 6. AI PERFORMANCE METRICS & LOGGING
  // =========================================================================
  describe('6. Performance Metrics Tracking & Export', () => {
    it('creates tracker and records decisions and cards played during gameplay', () => {
      const tracker = createAIPerformanceTracker()
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 4
      state.zombieHand = [getCard('zombie_browncoat')]

      getAIDecision(state, 'zombies', {
        difficulty: 'normal',
        metricsTracker: tracker,
      })

      const metrics = exportAIPerformanceMetrics(tracker)
      expect(metrics.decisionsCount).toBe(1)
      expect(metrics.cardsPlayed).toBe(1)
      expect(metrics.actionsHistory.length).toBe(1)
      expect(metrics.actionsHistory[0].action).toBe('PLAY_MINION')
    })

    it('records lethal plays count and missed lethals count', () => {
      const tracker = createAIPerformanceTracker()
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.turn = 6
      state.plantHero.hp = 2
      state.zombieHero.brains = 3
      state.zombieHand = [getCard('zombie_bungee_plumber')]

      // 1. Missed lethal via anti-frustration
      getAIDecision(state, 'zombies', {
        difficulty: 'normal',
        metricsTracker: tracker,
      })

      let metrics = exportAIPerformanceMetrics(tracker)
      expect(metrics.missedLethalsCount).toBe(1)
      expect(metrics.lethalPlaysCount).toBe(0)

      // 2. Real lethal on turn 5
      state.turn = 5
      getAIDecision(state, 'zombies', {
        difficulty: 'normal',
        metricsTracker: tracker,
      })

      metrics = exportAIPerformanceMetrics(tracker)
      expect(metrics.missedLethalsCount).toBe(1)
      expect(metrics.lethalPlaysCount).toBe(1)
    })

    it('tracks combat damage dealt and taken, superpowers used, and exports clean summary', () => {
      const tracker = createAIPerformanceTracker()

      tracker.recordCombatDamage(12, 5)
      tracker.recordSuperpowerUsed('sunburn')
      tracker.recordTurnEnd(4)

      const summary = tracker.exportSummary()

      expect(summary.totalDamageDealt).toBe(12)
      expect(summary.totalDamageTaken).toBe(5)
      expect(summary.superpowersUsed).toBe(1)
      expect(summary.turnsElapsed).toBe(4)
      expect(summary.suboptimalRate).toBe(0)
    })

    it('resets tracker state cleanly between matches', () => {
      const tracker = createAIPerformanceTracker()
      tracker.recordCombatDamage(20, 10)
      tracker.recordSuperpowerUsed('stayin_alive')

      expect(tracker.getMetrics().totalDamageDealt).toBe(20)

      tracker.reset()

      const resetMetrics = tracker.getMetrics()
      expect(resetMetrics.totalDamageDealt).toBe(0)
      expect(resetMetrics.totalDamageTaken).toBe(0)
      expect(resetMetrics.superpowersUsed).toBe(0)
      expect(resetMetrics.actionsHistory.length).toBe(0)
    })
  })
})
