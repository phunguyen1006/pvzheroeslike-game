import { describe, it, expect } from 'vitest'
import {
  evaluateBoardState,
  getAIMulliganDecision,
  chooseMulliganCards,
  getAISuperpowerDecision,
  getAIDecision,
  calculateMultiLaneLethal,
  isDangerousEnvironment,
  isEnvironmentHazardousForMinion,
} from '../engine/ai'
import { createInitialGameState } from '../engine/reducer'
import { ALL_CARDS, getCardById } from '../data/cards'
import type { GameState, Card, Minion, LaneState } from '../engine/types'

describe('Round 10: AI Campaign Tactics, Multi-Lane Lethal & Boss Intelligence', () => {
  function getCard(id: string): Card {
    const raw = getCardById(id) || ALL_CARDS.find((c) => c.id === id)
    if (!raw) {
      // Fallback for custom or synthetic cards in tests
      return {
        id,
        name: id,
        side: id.startsWith('plant') ? 'plants' : 'zombies',
        cost: 2,
        attack: 2,
        health: 2,
        type: 'minion',
        image: '/assets/mock.png',
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
  }): Minion {
    return {
      baseAttack: data.currentAttack,
      maxHealth: data.currentHealth,
      image: '/assets/mock.png',
      traits: (data.traits as any) ?? [],
      ...data,
    }
  }

  function setupState(): GameState {
    const state = createInitialGameState()
    state.zombieHero.brains = 10
    state.plantHero.sun = 10
    return state
  }

  // =========================================================================
  // 1. SMART MULLIGAN STRATEGY
  // =========================================================================
  describe('1. Smart Mulligan Strategy (chooseMulliganCards)', () => {
    it('should swap cards costing 4 or more to establish a smooth early curve', () => {
      const hand: Card[] = [
        getCard('plant_peashooter'), // cost 1 -> keep
        getCard('plant_sunflower'), // cost 1 -> keep
        getCard('plant_repeater'), // cost 3 -> keep (curve)
        getCard('plant_threepeater'), // cost 5 -> swap
      ]

      const swapIndices = chooseMulliganCards(hand, 'tempo')
      expect(swapIndices).toContain(3)
      expect(swapIndices).not.toContain(0)
      expect(swapIndices).not.toContain(1)
    })

    it('should keep 1-2 cost curve cards and 0-cost Superpowers', () => {
      const superPowerCard: Card = {
        id: 'super_precision_blast',
        name: 'Precision Blast',
        side: 'plants',
        cost: 0,
        attack: 0,
        health: 0,
        type: 'superpower',
        image: '/assets/sp.png',
        traits: [],
      }

      const hand: Card[] = [
        superPowerCard, // cost 0 -> keep
        getCard('zombie_arm_wrestler'), // cost 1 -> keep
        getCard('zombie_conehead'), // cost 2 -> keep
        getCard('zombie_foot_soldier'), // cost 5 -> swap
      ]

      const swapIndices = chooseMulliganCards(hand, 'tempo')
      expect(swapIndices).not.toContain(0)
      expect(swapIndices).not.toContain(1)
      expect(swapIndices).not.toContain(2)
      expect(swapIndices).toContain(3)
    })

    it('should keep high-cost cards when holding a Ramp card (Sunflower / Medulla Nebula)', () => {
      const hand: Card[] = [
        getCard('plant_sunflower'), // Ramp card
        getCard('plant_threepeater'), // Cost 5, but ramp enables it early
        getCard('plant_wall_nut'), // Cost 1
        getCard('plant_cabbage_pult'), // Cost 2
      ]

      const decision = getAIMulliganDecision(hand, 'ramp')
      // With Sunflower on hand, the AI is allowed to keep a bomb
      expect(decision.swapIndices.length).toBeLessThanOrEqual(1)
      expect(decision.keepCards.some((c) => c.id === 'plant_sunflower')).toBe(true)
    })

    it('should keep key combo cards like Valkyrie or Trickster with cheap tricks', () => {
      const hand: Card[] = [
        getCard('zombie_valkyrie'), // Core combo piece
        getCard('zombie_bungee_plumber'), // Cheap trick
        getCard('zombie_arm_wrestler'), // Early minion
        getCard('zombie_foot_soldier'), // Non-combo expensive card
      ]

      const swapIndices = chooseMulliganCards(hand, 'combo')
      expect(swapIndices).not.toContain(0) // Valkyrie preserved!
      expect(swapIndices).not.toContain(1) // Bungee preserved!
    })

    it('should adapt mulligan aggression for Aggro archetype vs Control archetype', () => {
      const hand: Card[] = [
        getCard('plant_peashooter'), // cost 1
        getCard('plant_snow_pea'), // cost 2
        getCard('plant_repeater'), // cost 3
        getCard('plant_bonk_choy'), // cost 1
      ]

      const aggroSwaps = chooseMulliganCards(hand, 'aggro')
      // Aggro prioritizes hyper-efficient 1-cost minions
      expect(aggroSwaps).not.toContain(0)
      expect(aggroSwaps).not.toContain(3)
    })
  })

  // =========================================================================
  // 2. MULTI-LANE LETHAL CALCULATION ENGINE
  // =========================================================================
  describe('2. Multi-Lane Lethal Calculation Engine (calculateMultiLaneLethal)', () => {
    it('should detect guaranteed face lethal across multiple unblocked lanes', () => {
      const state = setupState()
      state.plantHero.hp = 14

      // Lane 0: 5 attack zombie unblocked
      state.lanes[0].zombieMinion = createTestMinion({
        instanceId: 'z1',
        cardId: 'zombie_foot_soldier',
        name: 'Foot Soldier',
        side: 'zombies',
        currentAttack: 5,
        currentHealth: 4,
      })
      // Lane 2: 5 attack zombie unblocked
      state.lanes[2].zombieMinion = createTestMinion({
        instanceId: 'z2',
        cardId: 'zombie_foot_soldier',
        name: 'Foot Soldier',
        side: 'zombies',
        currentAttack: 5,
        currentHealth: 4,
      })
      // Lane 4: 5 attack zombie unblocked
      state.lanes[4].zombieMinion = createTestMinion({
        instanceId: 'z3',
        cardId: 'zombie_foot_soldier',
        name: 'Foot Soldier',
        side: 'zombies',
        currentAttack: 5,
        currentHealth: 4,
      })

      // Total guaranteed board damage = 5 + 5 + 5 = 15 >= 14
      const result = calculateMultiLaneLethal(state, 'zombies', [], 0)
      expect(result.hasLethal).toBe(true)
      expect(result.totalProjectedDamage).toBe(15)
      expect(result.unblockedLanes).toEqual([0, 2, 4])
      expect(result.lethalSteps.length).toBeGreaterThan(0)
    })

    it('should include Strikethrough minion damage even when blocked by enemy minions', () => {
      const state = setupState()
      state.zombieHero.hp = 7

      // Lane 1: 4 attack plant with Strikethrough, blocked by a 10-HP Zombie
      state.lanes[1].plantMinion = createTestMinion({
        instanceId: 'p1',
        cardId: 'plant_laser_cattail',
        name: 'Laser Cattail',
        side: 'plants',
        currentAttack: 4,
        currentHealth: 4,
        strikethrough: true,
      })
      state.lanes[1].zombieMinion = createTestMinion({
        instanceId: 'z_blocker',
        cardId: 'zombie_knight',
        name: 'Knight Zombie',
        side: 'zombies',
        currentAttack: 1,
        currentHealth: 10,
      })

      // Lane 3: 4 attack plant unblocked
      state.lanes[3].plantMinion = createTestMinion({
        instanceId: 'p2',
        cardId: 'plant_repeater',
        name: 'Repeater',
        side: 'plants',
        currentAttack: 4,
        currentHealth: 4,
      })

      // Total guaranteed damage = 4 (strikethrough) + 4 (unblocked) = 8 >= 7
      const result = calculateMultiLaneLethal(state, 'plants', [], 0)
      expect(result.hasLethal).toBe(true)
      expect(result.totalProjectedDamage).toBe(8)
      expect(result.strikethroughLanes).toContain(1)
      expect(result.unblockedLanes).toContain(3)
    })

    it('should combine board damage with direct burn trick (Bungee Plumber / Berry Blast) for lethal', () => {
      const state = setupState()
      state.plantHero.hp = 7

      // Lane 0: 5 attack zombie unblocked (5 damage, 2 short of lethal)
      state.lanes[0].zombieMinion = createTestMinion({
        instanceId: 'z1',
        cardId: 'zombie_super_vamp',
        name: 'Vampire Zombie',
        side: 'zombies',
        currentAttack: 5,
        currentHealth: 4,
      })

      // Hand has Bungee Plumber (2 direct burn damage) with 1 brain available
      const bungee = getCard('zombie_bungee_plumber')
      const result = calculateMultiLaneLethal(state, 'zombies', [bungee], 1)

      expect(result.hasLethal).toBe(true)
      expect(result.totalProjectedDamage).toBe(7) // 5 board + 2 burn
      expect(result.decision).toBeDefined()
      expect(result.decision?.card.id).toBe('zombie_bungee_plumber')
    })

    it('should execute Bonus Attack trick (Lurch for Lunch / Plant Food) on unblocked minion for lethal', () => {
      const state = setupState()
      state.plantHero.hp = 10

      // Lane 2: 5 attack zombie unblocked (deals 5 damage at combat, needs bonus attack to deal 5 + 5 = 10)
      state.lanes[2].zombieMinion = createTestMinion({
        instanceId: 'z1',
        cardId: 'zombie_football_zombie',
        name: 'All-Star Zombie',
        side: 'zombies',
        currentAttack: 5,
        currentHealth: 6,
      })

      const lurch = getCard('zombie_lurch_for_lunch')
      const result = calculateMultiLaneLethal(state, 'zombies', [lurch], 2)

      expect(result.hasLethal).toBe(true)
      expect(result.totalProjectedDamage).toBe(10)
      expect(result.decision?.card.id).toBe('zombie_lurch_for_lunch')
      expect(result.decision?.targetLane).toBe(2)
    })

    it('should execute Attack Buff trick (Brute Strength) on unblocked minion to achieve exact lethal', () => {
      const state = setupState()
      state.plantHero.hp = 6

      // Lane 1: 3 attack zombie unblocked (deals 3 damage, needs +3 from Brute Strength)
      state.lanes[1].zombieMinion = createTestMinion({
        instanceId: 'z1',
        cardId: 'zombie_arm_wrestler',
        name: 'Arm Wrestler',
        side: 'zombies',
        currentAttack: 3,
        currentHealth: 4,
      })

      const bruteStrength = getCard('zombie_brute_strength')
      const result = calculateMultiLaneLethal(state, 'zombies', [bruteStrength], 2)

      expect(result.hasLethal).toBe(true)
      expect(result.totalProjectedDamage).toBe(6) // 3 + 3
      expect(result.decision?.card.id).toBe('zombie_brute_strength')
      expect(result.decision?.targetLane).toBe(1)
    })
  })

  // =========================================================================
  // 3. ZOMBIE CAMPAIGN CHAPTER 2 ENVIRONMENT TACTICS (Z6 - Z10)
  // =========================================================================
  describe('3. Campaign Chapter 2 Environment Hazards & Synergies (Z6 - Z10)', () => {
    it('Mission Z7 (Wall-Knight): should identify Spikeweed Sector as lethal hazard for fragile zombies (<= 2 HP without Armored)', () => {
      const lane: LaneState = {
        type: 'ground',
        environment: {
          id: 'plant_spikeweed_sector',
          name: 'Spikeweed Sector',
          side: 'plants',
          cost: 2,
          type: 'environment',
          description: 'Start of turn: Deal 2 damage to Zombies here',
          image: '/assets/env.png',
        },
      }

      const fragileZombie = getCard('zombie_swabbie') // 1/1
      const hazardCheck = isEnvironmentHazardousForMinion(lane, fragileZombie, 'zombies')

      expect(hazardCheck.hazardous).toBe(true)
      expect(hazardCheck.reason).toContain('Spikeweed Sector')
    })

    it('Mission Z7 (Wall-Knight): should allow Armored or high-HP zombies in Spikeweed Sector', () => {
      const lane: LaneState = {
        type: 'ground',
        environment: {
          id: 'plant_spikeweed_sector',
          name: 'Spikeweed Sector',
          side: 'plants',
          cost: 2,
          type: 'environment',
          description: 'Start of turn: Deal 2 damage to Zombies here',
          image: '/assets/env.png',
        },
      }

      const armoredZombie = getCard('zombie_conehead') // 2/2 Armored 1
      armoredZombie.armored = 1
      const hazardArmored = isEnvironmentHazardousForMinion(lane, armoredZombie, 'zombies')
      expect(hazardArmored.hazardous).toBe(false)

      const bulkyZombie = getCard('zombie_knight') // 5/5
      const hazardBulky = isEnvironmentHazardousForMinion(lane, bulkyZombie, 'zombies')
      expect(hazardBulky.hazardous).toBe(false)
    })

    it('Mission Z8 (Spudow): should identify Hot Lava as lethal hazard for 1-HP zombies without Armored', () => {
      const lane: LaneState = {
        type: 'ground',
        environment: {
          id: 'plant_hot_lava',
          name: 'Hot Lava',
          side: 'plants',
          cost: 1,
          type: 'environment',
          description: 'Before combat here: Deal 1 damage to each minion here',
          image: '/assets/env.png',
        },
      }

      const fragileZombie = getCard('zombie_swabbie') // 1 HP
      const check = isEnvironmentHazardousForMinion(lane, fragileZombie, 'zombies')
      expect(check.hazardous).toBe(true)
      expect(check.reason).toContain('Hot Lava')

      const twoHpZombie = getCard('zombie_arm_wrestler') // 2 HP
      const check2 = isEnvironmentHazardousForMinion(lane, twoHpZombie, 'zombies')
      expect(check2.hazardous).toBe(false)
    })

    it('Mission Z6 (Solar Flare): Plant AI should prioritize playing high-value minion in Pair Pearadise for cloning', () => {
      const state = setupState()
      state.phase = 'PLANT_PLAY'
      state.plantHero.sun = 5

      // Lane 1 has Pair Pearadise
      state.lanes[1].environment = {
        id: 'plant_pair_pearadise',
        name: 'Pair Pearadise',
        side: 'plants',
        cost: 4,
        type: 'environment',
        description: 'When you play a Plant here, make a duplicate with Team-Up',
        image: '/assets/env.png',
      }

      const strongMinion = getCard('plant_repeater')
      state.plantHand = [strongMinion]

      const decision = getAIDecision(state, 'plants')
      expect(decision).toBeDefined()
      expect(decision?.card.id).toBe('plant_repeater')
      expect(decision?.targetLane).toBe(1) // Placed in Pair Pearadise!
    })

    it('Mission Z9 (Chompzilla): Plant AI should prioritize playing high-attack minion in Venus Flytrap Planet for healing', () => {
      const state = setupState()
      state.phase = 'PLANT_PLAY'
      state.plantHero.hp = 10 // Damaged hero
      state.plantHero.sun = 4

      // Lane 3 has Venus Flytrap Planet
      state.lanes[3].environment = {
        id: 'plant_venus_flytrap_planet',
        name: 'Venus Flytrap Planet',
        side: 'plants',
        cost: 3,
        type: 'environment',
        description: 'When a Plant here deals damage, heal your Hero for that amount',
        image: '/assets/env.png',
      }

      const attacker = getCard('plant_repeater') // 2/2 double strike / high attack
      state.plantHand = [attacker]

      const decision = getAIDecision(state, 'plants')
      expect(decision).toBeDefined()
      expect(decision?.targetLane).toBe(3) // Deploys to Venus Flytrap Planet!
    })

    it('should correctly flag Chapter 2 environments as dangerous to opposing side in isDangerousEnvironment', () => {
      expect(isDangerousEnvironment('plant_pair_pearadise', 'zombies')).toBe(true)
      expect(isDangerousEnvironment('plant_spikeweed_sector', 'zombies')).toBe(true)
      expect(isDangerousEnvironment('plant_hot_lava', 'zombies')).toBe(true)
      expect(isDangerousEnvironment('plant_venus_flytrap_planet', 'zombies')).toBe(true)

      expect(isDangerousEnvironment('zombie_laser_base_alpha', 'plants')).toBe(true)
      expect(isDangerousEnvironment('zombie_area_22', 'plants')).toBe(true)
    })
  })

  // =========================================================================
  // 4. SUPERPOWER LETHAL EXECUTION MATRIX
  // =========================================================================
  describe('4. Superpower Lethal Execution (getAISuperpowerDecision)', () => {
    it('Electric Boogaloo should fire Stayin Alive directly at Plant Hero when HP <= 3 for instant lethal', () => {
      const state = setupState()
      state.plantHero.hp = 3

      const stayinAlive: Card = {
        id: 'super_stayin_alive',
        name: "Stayin' Alive",
        side: 'zombies',
        cost: 0,
        attack: 0,
        health: 0,
        type: 'superpower',
        image: '/assets/sp.png',
        traits: [],
      }

      const decision = getAISuperpowerDecision(stayinAlive, state, 'zombies', 'hero_electric_boogaloo')
      expect(decision.action).toBe('PLAY_SUPERPOWER')
      expect(decision.targetHero).toBe(true)
      expect(decision.reason).toContain('Lethal Stayin\' Alive')
    })

    it('Solar Flare should fire Sunburn directly at Zombie Hero when HP <= 2 for instant lethal', () => {
      const state = setupState()
      state.zombieHero.hp = 2

      const sunburn: Card = {
        id: 'super_sunburn',
        name: 'Sunburn',
        side: 'plants',
        cost: 0,
        attack: 0,
        health: 0,
        type: 'superpower',
        image: '/assets/sp.png',
        traits: [],
      }

      const decision = getAISuperpowerDecision(sunburn, state, 'plants', 'hero_solar_flare')
      expect(decision.action).toBe('PLAY_SUPERPOWER')
      expect(decision.targetHero).toBe(true)
      expect(decision.reason).toContain('Lethal Sunburn')
    })

    it('Green Shadow should fire Precision Blast in middle lane when Zombie Hero HP <= 5 and middle lane is open', () => {
      const state = setupState()
      state.zombieHero.hp = 5
      // Lane 2 is open

      const precisionBlast: Card = {
        id: 'super_precision_blast',
        name: 'Precision Blast',
        side: 'plants',
        cost: 0,
        attack: 0,
        health: 0,
        type: 'superpower',
        image: '/assets/sp.png',
        traits: [],
      }

      const decision = getAISuperpowerDecision(precisionBlast, state, 'plants', 'hero_green_shadow')
      expect(decision.action).toBe('PLAY_SUPERPOWER')
      expect(decision.targetLane).toBe(2)
      expect(decision.reason).toContain('Lethal Precision Blast')
    })

    it('Z-Mech should strike Plant Hero with Missile Madness when HP <= 3 for lethal win', () => {
      const state = setupState()
      state.plantHero.hp = 3

      const missileMadness: Card = {
        id: 'super_missile_madness',
        name: 'Missile Madness',
        side: 'zombies',
        cost: 0,
        attack: 0,
        health: 0,
        type: 'superpower',
        image: '/assets/sp.png',
        traits: [],
      }

      const decision = getAISuperpowerDecision(missileMadness, state, 'zombies', 'hero_zmech')
      expect(decision.action).toBe('PLAY_SUPERPOWER')
      expect(decision.targetHero).toBe(true)
      expect(decision.reason).toContain('Lethal Missile Madness')
    })

    it('Super Brainz should move high-attack zombie to open lane with Carried Away for lethal bonus attack', () => {
      const state = setupState()
      state.plantHero.hp = 4

      // Lane 0: 4 attack zombie blocked by a Wall-Nut
      state.lanes[0].zombieMinion = createTestMinion({
        instanceId: 'z1',
        cardId: 'zombie_foot_soldier',
        name: 'Foot Soldier',
        side: 'zombies',
        currentAttack: 4,
        currentHealth: 4,
      })
      state.lanes[0].plantMinion = createTestMinion({
        instanceId: 'p_wall',
        cardId: 'plant_wall_nut',
        name: 'Wall-Nut',
        side: 'plants',
        currentAttack: 0,
        currentHealth: 6,
      })

      // Lane 1 is open!
      const carriedAway: Card = {
        id: 'super_carried_away',
        name: 'Carried Away',
        side: 'zombies',
        cost: 0,
        attack: 0,
        health: 0,
        type: 'superpower',
        image: '/assets/sp.png',
        traits: [],
      }

      const decision = getAISuperpowerDecision(carriedAway, state, 'zombies', 'hero_super_brainz')
      expect(decision.action).toBe('PLAY_SUPERPOWER')
      expect(decision.targetMinionId).toBe('z1')
      expect(decision.targetLane).toBe(1)
      expect(decision.reason).toContain('Lethal Carried Away')
    })
  })

  // =========================================================================
  // 5. AGGRO ALL-OUT MODE & DEFENSIVE SURVIVAL MODE
  // =========================================================================
  describe('5. Aggro All-Out Mode vs Defensive Survival Mode', () => {
    it('Aggro Mode: should prioritize deploying minion into open lane when enemy hero HP <= 10', () => {
      const state = setupState()
      state.phase = 'ZOMBIE_PLAY'
      state.plantHero.hp = 8 // Triggers All-Out Aggression Mode!

      // Lane 0 and 1 have defenders
      state.lanes[0].plantMinion = createTestMinion({
        instanceId: 'p0',
        cardId: 'plant_wall_nut',
        name: 'Wall-Nut',
        side: 'plants',
        currentAttack: 0,
        currentHealth: 6,
      })
      state.lanes[1].plantMinion = createTestMinion({
        instanceId: 'p1',
        cardId: 'plant_repeater',
        name: 'Repeater',
        side: 'plants',
        currentAttack: 2,
        currentHealth: 2,
      })

      // Lanes 2, 3, 4 are open
      const attacker = getCard('zombie_arm_wrestler')
      state.zombieHand = [attacker]

      const decision = getAIDecision(state, 'zombies', 'aggro')
      expect(decision).toBeDefined()
      expect(decision?.card.id).toBe('zombie_arm_wrestler')
      // Deploys to an open ground lane (lane 2 or 3) to hit face!
      expect([2, 3]).toContain(decision?.targetLane)
    })

    it('Aggro Mode: should target enemy hero with direct burn trick in ZOMBIE_TRICKS when enemy HP <= 10', () => {
      const state = setupState()
      state.phase = 'ZOMBIE_TRICKS'
      state.plantHero.hp = 6 // Aggro burn range
      state.zombieHero.brains = 4

      // Lane 0 has a plant minion
      state.lanes[0].plantMinion = createTestMinion({
        instanceId: 'p0',
        cardId: 'plant_peashooter',
        name: 'Peashooter',
        side: 'plants',
        currentAttack: 1,
        currentHealth: 1,
      })

      const plumber = getCard('zombie_bungee_plumber')
      state.zombieHand = [plumber]

      const decision = getAIDecision(state, 'zombies', 'aggro')
      expect(decision).toBeDefined()
      expect(decision?.card.id).toBe('zombie_bungee_plumber')
      // Chooses direct face damage over trading minion
      expect(decision?.targetHero).toBe(true)
    })

    it('Defensive Mode: should prioritize deploying blocker in front of dangerous attacker when AI HP <= 8', () => {
      const state = setupState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.hp = 5 // Critical health! Triggers Defensive Survival Mode!

      // Lane 1 has a lethal 6-attack Plant
      state.lanes[1].plantMinion = createTestMinion({
        instanceId: 'big_plant',
        cardId: 'plant_threepeater',
        name: 'Threepeater',
        side: 'plants',
        currentAttack: 6,
        currentHealth: 5,
      })

      const defender = getCard('zombie_conehead') // 2/2 Armored 1
      state.zombieHand = [defender]

      const decision = getAIDecision(state, 'zombies', 'control')
      expect(decision).toBeDefined()
      expect(decision?.card.id).toBe('zombie_conehead')
      expect(decision?.targetLane).toBe(1) // Blocks incoming fatal damage in Lane 1!
    })

    it('Defensive Mode: should cast emergency removal trick (Locust Swarm / Rocket Science) on fatal attacker', () => {
      const state = setupState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.hp = 4 // In immediate lethal danger
      state.zombieHero.brains = 5

      // Lane 2 has a 6-attack unblocked plant
      state.lanes[2].plantMinion = createTestMinion({
        instanceId: 'boss_plant',
        cardId: 'plant_repeater',
        name: 'Gigantic Repeater',
        side: 'plants',
        currentAttack: 6,
        currentHealth: 5,
      })

      const locust = getCard('zombie_locust_swarm')
      state.zombieHand = [locust]

      const decision = getAIDecision(state, 'zombies', 'control')
      expect(decision).toBeDefined()
      expect(decision?.card.id).toBe('zombie_locust_swarm')
      expect(decision?.targetMinionId).toBe('boss_plant')
    })
  })
})
