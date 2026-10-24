import { describe, it, expect } from 'vitest'
import { getAIDecision, getAITurnPlan } from '../engine/ai'
import { createInitialGameState } from '../engine/reducer'
import { ALL_CARDS } from '../data/cards'
import type { GameState, Card, Minion } from '../engine/types'

describe('Smart AI Decision Engine (Phase 5)', () => {
  const FALLBACK_CARDS: Record<string, Card> = {
    zombie_browncoat: {
      id: 'zombie_browncoat',
      name: 'Browncoat Zombie',
      side: 'zombies',
      type: 'minion',
      cost: 1,
      attack: 1,
      health: 1,
      image: '/assets/cards/zombies/browncoat.png',
      traits: [],
    },
    zombie_knight_living_dead: {
      id: 'zombie_knight_living_dead',
      name: 'Knight of the Living Dead',
      side: 'zombies',
      type: 'minion',
      cost: 7,
      attack: 5,
      health: 5,
      image: '/assets/cards/zombies/knight.png',
      armored: 2,
      traits: ['armored'],
    },
    zombie_football_zombie: {
      id: 'zombie_football_zombie',
      name: 'All-Star Zombie',
      side: 'zombies',
      type: 'minion',
      cost: 5,
      attack: 4,
      health: 6,
      image: '/assets/cards/zombies/football.png',
      armored: 1,
      traits: ['armored'],
    },
  }

  function getCard(id: string): Card {
    const card = ALL_CARDS.find((c) => c.id === id)
    if (card) return card as unknown as Card
    if (FALLBACK_CARDS[id]) return FALLBACK_CARDS[id]
    throw new Error(`Card ${id} not found`)
  }

  function createTestMinion(data: { instanceId: string; cardId: string; name: string; side: 'plants' | 'zombies'; currentAttack: number; currentHealth: number }): Minion {
    return {
      baseAttack: data.currentAttack,
      maxHealth: data.currentHealth,
      image: '/assets/mock.png',
      ...data,
    }
  }

  function setupTestState(): GameState {
    const state = createInitialGameState()
    // Give heroes 10 resources to test varied choices
    state.zombieHero.brains = 10
    state.plantHero.sun = 10
    return state
  }

  describe('Zombie Minion Phase (ZOMBIE_PLAY)', () => {
    it('deploys Amphibious units into the Water lane (lane 4)', () => {
      const state = setupTestState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHand = [getCard('zombie_swabbie')]

      const decision = getAIDecision(state, 'zombies', 'normal')
      expect(decision.action).toBe('PLAY_MINION')
      expect(decision.card?.id).toBe('zombie_swabbie')
      expect(decision.laneIndex).toBe(4) // Water lane
    })

    it('deploys Arm Wrestler on Heights (lane 0) for lane advantage', () => {
      const state = setupTestState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHand = [getCard('zombie_arm_wrestler'), getCard('zombie_conga_zombie')]

      const decision = getAIDecision(state, 'zombies', 'normal')
      expect(decision.action).toBe('PLAY_MINION')
      expect(decision.card?.id).toBe('zombie_arm_wrestler')
      expect(decision.laneIndex).toBe(0) // Heights lane
    })

    it('blocks dangerous Plant minions with high attack', () => {
      const state = setupTestState()
      state.phase = 'ZOMBIE_PLAY'
      // Put a dangerous plant in lane 2
      state.lanes[2].plantMinion = createTestMinion({
        instanceId: 'threat_plant',
        cardId: 'plant_dark_matter_dragonfruit',
        name: 'Dark Matter Dragonfruit',
        side: 'plants',
        currentAttack: 5,
        currentHealth: 4,
      })
      state.zombieHand = [getCard('zombie_zombot_1000')]

      const decision = getAIDecision(state, 'zombies', 'normal')
      expect(decision.action).toBe('PLAY_MINION')
      expect(decision.laneIndex).toBe(2) // Blocks lane 2
    })

    it('exploits open lanes to deal direct damage when no threats exist', () => {
      const state = setupTestState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHand = [getCard('zombie_ra_zombie')]

      const decision = getAIDecision(state, 'zombies', 'normal')
      expect(decision.action).toBe('PLAY_MINION')
      expect(decision.card?.id).toBe('zombie_ra_zombie')
      expect(decision.laneIndex).toBeDefined()
    })
  })

  describe('Zombie Tricks Phase (ZOMBIE_TRICKS)', () => {
    it('recognizes lethal direct damage with Bungee Plumber', () => {
      const state = setupTestState()
      state.phase = 'ZOMBIE_TRICKS'
      state.plantHero.hp = 2 // In lethal range
      state.zombieHand = [getCard('zombie_bungee_plumber')]

      const decision = getAIDecision(state, 'zombies', 'expert')
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('zombie_bungee_plumber')
      expect(decision.targetHero).toBe(true)
    })

    it('uses Rocket Science to destroy plants with Attack >= 4', () => {
      const state = setupTestState()
      state.phase = 'ZOMBIE_TRICKS'
      // Dangerous 5 Attack plant in lane 1
      state.lanes[1].plantMinion = createTestMinion({
        instanceId: 'giant_plant',
        cardId: 'plant_bonk_choy',
        name: 'Bonk Choy',
        side: 'plants',
        currentAttack: 5,
        currentHealth: 3,
      })
      state.zombieHand = [getCard('zombie_rocket_science')]

      const decision = getAIDecision(state, 'zombies', 'normal')
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('zombie_rocket_science')
      expect(decision.laneIndex).toBe(1)
    })

    it('uses Weed Spray to wipe swarm of low-attack plants', () => {
      const state = setupTestState()
      state.phase = 'ZOMBIE_TRICKS'
      // 2 small plants with attack <= 2
      state.lanes[1].plantMinion = createTestMinion({
        instanceId: 'p1',
        cardId: 'plant_sunflower',
        name: 'Sunflower',
        side: 'plants',
        currentAttack: 0,
        currentHealth: 1,
      })
      state.lanes[2].plantMinion = createTestMinion({
        instanceId: 'p2',
        cardId: 'plant_peashooter',
        name: 'Peashooter',
        side: 'plants',
        currentAttack: 1,
        currentHealth: 1,
      })
      state.zombieHand = [getCard('zombie_weed_spray')]

      const decision = getAIDecision(state, 'zombies', 'normal')
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('zombie_weed_spray')
    })

    it('unleashes Bad Moon Rising when there are 2 or more zombies on board', () => {
      const state = setupTestState()
      state.phase = 'ZOMBIE_TRICKS'
      state.lanes[1].zombieMinion = createTestMinion({
        instanceId: 'z1',
        cardId: 'zombie_browncoat',
        name: 'Browncoat',
        side: 'zombies',
        currentAttack: 1,
        currentHealth: 1,
      })
      state.lanes[2].zombieMinion = createTestMinion({
        instanceId: 'z2',
        cardId: 'zombie_swabbie',
        name: 'Swabbie',
        side: 'zombies',
        currentAttack: 1,
        currentHealth: 1,
      })
      state.zombieHand = [getCard('zombie_bad_moon_rising')]

      const decision = getAIDecision(state, 'zombies', 'normal')
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('zombie_bad_moon_rising')
    })
  })

  describe('Multi-action Turn Planning (getAITurnPlan)', () => {
    it('plans multi-card turns within resource limits', () => {
      const state = setupTestState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 4
      state.zombieHand = [
        getCard('zombie_swabbie'), // cost 0, amphibious
        getCard('zombie_arm_wrestler'), // cost 1
        getCard('zombie_conga_zombie'), // cost 2
      ]

      const plan = getAITurnPlan(state, 'zombies', 'normal')
      expect(plan.length).toBeGreaterThanOrEqual(2)
      // First should be amphibious in water lane or arm wrestler on heights
      const firstAction = plan[0]
      expect(firstAction.action).toBe('PLAY_MINION')
    })

    it('returns empty plan when out of resources or no valid plays', () => {
      const state = setupTestState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 0
      state.zombieHand = [getCard('zombie_zombot_1000')] // cost 9

      const plan = getAITurnPlan(state, 'zombies', 'normal')
      expect(plan.length).toBe(0)
    })
  })
})
