import { describe, it, expect } from 'vitest'
import {
  evaluateBoardState,
  getAIMulliganDecision,
  getAISuperpowerDecision,
  getAIDecision,
  getAITurnPlan,
  getHeroDefaultArchetype,
  isDangerousEnvironment,
  reserveBrainsForTricks,
} from '../engine/ai'
import { createInitialGameState } from '../engine/reducer'
import { ALL_CARDS, getCardById } from '../data/cards'
import type { GameState, Card, Minion } from '../engine/types'

describe('AI Opponent Engine Tactics Suite (Phase 7)', () => {
  function getCard(id: string): Card {
    const raw = getCardById(id) || ALL_CARDS.find((c) => c.id === id)
    if (!raw) throw new Error(`Card ${id} not found in database`)
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
  // 1. BOARD STATE EVALUATION (Total Attack, Health, Lethal, Card Advantage)
  // =========================================================================
  describe('1. Board State Evaluation (evaluateBoardState)', () => {
    it('accurately calculates total attack and total health across all lanes', () => {
      const state = setupState()
      // Plant has minions in lane 1 and 2
      state.lanes[1].plantMinion = createTestMinion({
        instanceId: 'p1',
        cardId: 'plant_peashooter',
        name: 'Peashooter',
        side: 'plants',
        currentAttack: 1,
        currentHealth: 1,
      })
      state.lanes[2].plantMinion = createTestMinion({
        instanceId: 'p2',
        cardId: 'plant_bonk_choy',
        name: 'Bonk Choy',
        side: 'plants',
        currentAttack: 4,
        currentHealth: 3,
      })

      // Zombie has minion in lane 2
      state.lanes[2].zombieMinion = createTestMinion({
        instanceId: 'z2',
        cardId: 'zombie_arm_wrestler',
        name: 'Arm Wrestler',
        side: 'zombies',
        currentAttack: 2,
        currentHealth: 2,
      })

      const evalZombies = evaluateBoardState(state, 'zombies', 'tempo')
      expect(evalZombies.friendlyTotalAttack).toBe(2)
      expect(evalZombies.friendlyTotalHealth).toBe(2)
      expect(evalZombies.enemyTotalAttack).toBe(5) // 1 + 4
      expect(evalZombies.enemyTotalHealth).toBe(4) // 1 + 3

      const evalPlants = evaluateBoardState(state, 'plants', 'tempo')
      expect(evalPlants.friendlyTotalAttack).toBe(5)
      expect(evalPlants.friendlyTotalHealth).toBe(4)
      expect(evalPlants.enemyTotalAttack).toBe(2)
      expect(evalPlants.enemyTotalHealth).toBe(2)
    })

    it('calculates unblocked face threat including Anti-Hero bonuses', () => {
      const state = setupState()
      // Zombie with Anti-Hero 4 in empty Lane 3
      state.lanes[3].zombieMinion = createTestMinion({
        instanceId: 'z_anti',
        cardId: 'zombie_stealthy_imp',
        name: 'Stealthy Imp',
        side: 'zombies',
        currentAttack: 2,
        currentHealth: 2,
        antiHero: 4,
      })

      const evaluation = evaluateBoardState(state, 'zombies', 'aggro')
      // Face threat should be base attack 2 + anti-hero 4 = 6
      expect(evaluation.friendlyFaceThreat).toBe(6)
    })

    it('detects Strikethrough face threat even when an opposing minion is present', () => {
      const state = setupState()
      // Plant with Strikethrough in Lane 0 facing a high-health Zombie
      state.lanes[0].plantMinion = createTestMinion({
        instanceId: 'p_strike',
        cardId: 'plant_laser_cattail',
        name: 'Laser Cattail',
        side: 'plants',
        currentAttack: 3,
        currentHealth: 3,
        strikethrough: true,
      })
      state.lanes[0].zombieMinion = createTestMinion({
        instanceId: 'z_tank',
        cardId: 'zombie_knight',
        name: 'Knight of the Living Dead',
        side: 'zombies',
        currentAttack: 5,
        currentHealth: 5,
      })

      const plantEval = evaluateBoardState(state, 'plants', 'aggro')
      expect(plantEval.friendlyFaceThreat).toBe(3) // Pierces through to face
    })

    it('identifies direct Lethal conditions for friendly and threatening enemy lethal', () => {
      const state = setupState()
      state.plantHero.hp = 5
      // Zombie has 6 unblocked face damage in lane 1
      state.lanes[1].zombieMinion = createTestMinion({
        instanceId: 'z_lethal',
        cardId: 'zombie_all_star',
        name: 'All-Star Zombie',
        side: 'zombies',
        currentAttack: 6,
        currentHealth: 6,
      })

      const evalZombies = evaluateBoardState(state, 'zombies', 'aggro')
      expect(evalZombies.hasLethal).toBe(true)

      const evalPlants = evaluateBoardState(state, 'plants', 'control')
      expect(evalPlants.threatensLethal).toBe(true)
    })

    it('tracks Card Advantage based on hand sizes', () => {
      const state = setupState()
      state.zombieHand = [getCard('zombie_swabbie'), getCard('zombie_arm_wrestler'), getCard('zombie_bungee_plumber')]
      state.plantHand = [getCard('plant_peashooter')]

      const evalZombies = evaluateBoardState(state, 'zombies')
      expect(evalZombies.friendlyCardCount).toBe(3)
      expect(evalZombies.enemyCardCount).toBe(1)
      expect(evalZombies.cardAdvantage).toBe(2)

      const evalPlants = evaluateBoardState(state, 'plants')
      expect(evalPlants.cardAdvantage).toBe(-2)
    })

    it('penalizes environmental disadvantage when enemy controls Spikeweed Sector or Laser Base Alpha', () => {
      const state = setupState()
      state.lanes[1].environment = {
        id: 'plant_spikeweed_sector',
        name: 'Spikeweed Sector',
        side: 'plants',
        description: '2 pre-combat damage',
        image: '/assets/env/spikeweed.png',
      }

      const evalZombies = evaluateBoardState(state, 'zombies')
      expect(evalZombies.environmentAdvantage).toBeLessThan(0)

      const evalPlants = evaluateBoardState(state, 'plants')
      expect(evalPlants.environmentAdvantage).toBeGreaterThan(0)
    })
  })

  // =========================================================================
  // 2. MULLIGAN HEURISTIC (Curve 1-3 Keep, 5+ Swap, Combo Synergies)
  // =========================================================================
  describe('2. Mulligan Heuristic (getAIMulliganDecision)', () => {
    it('keeps low-curve cards (1-3 Cost) and swaps heavy cards (5+ Cost)', () => {
      const hand: Card[] = [
        getCard('zombie_arm_wrestler'), // Cost 1 -> Keep
        getCard('zombie_conga_zombie'), // Cost 2 -> Keep
        getCard('zombie_knight_living_dead'), // Cost 7 -> Swap
        getCard('zombie_zombot_1000'), // Cost 9 -> Swap
      ]

      const decision = getAIMulliganDecision(hand, 'tempo')
      expect(decision.keepIndices).toContain(0) // arm wrestler
      expect(decision.keepIndices).toContain(1) // conga zombie
      expect(decision.swapIndices).toContain(2) // knight
      expect(decision.swapIndices).toContain(3) // zombot
      expect(decision.swapIndices.length).toBe(2)
      expect(decision.keepIndices.length).toBe(2)
    })

    it('in Aggro archetype, strictly swaps 4-cost cards to guarantee turn 1-3 dominance', () => {
      const hand: Card[] = [
        getCard('zombie_swabbie'), // Cost 0 -> Keep
        getCard('zombie_arm_wrestler'), // Cost 1 -> Keep
        { ...getCard('zombie_football_zombie'), cost: 4 }, // Cost 4 in Aggro -> Swap
        getCard('zombie_locust_swarm'), // Cost 5 -> Swap
      ]

      const decision = getAIMulliganDecision(hand, 'aggro')
      expect(decision.keepIndices).toContain(0)
      expect(decision.keepIndices).toContain(1)
      expect(decision.swapIndices).toContain(2) // 4-cost swapped in Aggro
      expect(decision.swapIndices).toContain(3) // 5-cost swapped
    })

    it('retains Valkyrie in starting hand to accumulate death-triggers from Turn 1', () => {
      const hand: Card[] = [
        getCard('zombie_valkyrie'), // Cost 4 -> Special Combo Exception: KEEP!
        getCard('zombie_zombot_1000'), // Cost 9 -> Swap
        getCard('zombie_arm_wrestler'), // Cost 1 -> Keep
        getCard('zombie_ra_zombie'), // Cost 6 -> Swap
      ]

      const decision = getAIMulliganDecision(hand, 'control')
      expect(decision.keepIndices).toContain(0) // Valkyrie kept
      expect(decision.keepIndices).toContain(2) // Arm wrestler kept
      expect(decision.swapIndices).toContain(1) // Zombot swapped
      expect(decision.swapIndices).toContain(3) // Ra Zombie swapped
    })

    it('keeps Trickster when accompanied by 2 or more cheap tricks', () => {
      const hand: Card[] = [
        getCard('zombie_trickster'), // Cost 10, but has cheap tricks -> KEEP
        getCard('zombie_bungee_plumber'), // Cost 1 trick -> Keep
        getCard('zombie_lurch_for_lunch'), // Cost 2 trick -> Keep
        getCard('zombie_zombot_1000'), // Cost 9 -> Swap
      ]

      const decision = getAIMulliganDecision(hand, 'control')
      expect(decision.keepIndices).toContain(0) // Trickster kept
      expect(decision.keepIndices).toContain(1) // Bungee kept
      expect(decision.keepIndices).toContain(2) // Lurch kept
      expect(decision.swapIndices).toContain(3) // Zombot swapped
    })

    it('keeps one 4-5 cost bomb when starting hand contains Ramp generators', () => {
      const hand: Card[] = [
        getCard('plant_sunflower'), // Cost 1 Ramp -> Keep
        getCard('plant_repeater'), // Cost 3 -> Keep
        getCard('plant_squash'), // Cost 5 Bomb with Ramp -> Keep
        getCard('plant_dark_matter_dragonfruit'), // Cost 8 -> Swap
      ]

      const decision = getAIMulliganDecision(hand, 'tempo')
      expect(decision.keepIndices).toContain(0) // Sunflower kept
      expect(decision.keepIndices).toContain(1) // Repeater kept
      expect(decision.keepIndices).toContain(2) // 5-cost Squash kept due to Ramp!
      expect(decision.swapIndices).toContain(3) // 8-cost Dragonfruit swapped
    })
  })

  // =========================================================================
  // 3. SUPERPOWER DECISION MATRIX (Cut Down to Size, Slammin' Smash, Eureka, etc.)
  // =========================================================================
  describe('3. Superpower Decision Matrix (getAISuperpowerDecision)', () => {
    it('uses Cut Down to Size immediately when Plant Hero has a minion with >= 5 ATK', () => {
      const state = setupState()
      // Plant has a 5-ATK Gatling Pea in Lane 2
      state.lanes[2].plantMinion = createTestMinion({
        instanceId: 'p_boss',
        cardId: 'plant_gatling_pea',
        name: 'Gatling Pea',
        side: 'plants',
        currentAttack: 5,
        currentHealth: 4,
      })

      const superpower: Card = {
        id: 'sp_cut_down_to_size',
        name: 'Cut Down to Size',
        side: 'zombies',
        cost: 0,
        attack: 0,
        health: 0,
        type: 'superpower',
        image: '/assets/sp.png',
      }

      const decision = getAISuperpowerDecision(state, 'zombies', superpower, 'control')
      expect(decision.action).toBe('PLAY_SUPERPOWER')
      expect(decision.superpowerId).toBe('sp_cut_down_to_size')
      expect(decision.targetLaneIndex).toBe(2) // Targets Lane 2
      expect(decision.reason).toContain('Gatling Pea')
    })

    it('saves Cut Down to Size into hand when no Plant minion has >= 5 ATK', () => {
      const state = setupState()
      // Plants on board are only 1-2 ATK
      state.lanes[1].plantMinion = createTestMinion({
        instanceId: 'p_weak',
        cardId: 'plant_sunflower',
        name: 'Sunflower',
        side: 'plants',
        currentAttack: 0,
        currentHealth: 1,
      })
      state.lanes[2].plantMinion = createTestMinion({
        instanceId: 'p_mid',
        cardId: 'plant_repeater',
        name: 'Repeater',
        side: 'plants',
        currentAttack: 2,
        currentHealth: 2,
      })

      const superpower: Card = {
        id: 'sp_cut_down_to_size',
        name: 'Cut Down to Size',
        side: 'zombies',
        cost: 0,
        attack: 0,
        health: 0,
        type: 'superpower',
        image: '/assets/sp.png',
      }

      const decision = getAISuperpowerDecision(state, 'zombies', superpower, 'control')
      expect(decision.action).toBe('SAVE_SUPERPOWER')
      expect(decision.reason).toContain('Save Cut Down to Size')
    })

    it('uses Slammin\' Smash to crush highest-threat plant with <= 4 ATK', () => {
      const state = setupState()
      state.lanes[0].plantMinion = createTestMinion({
        instanceId: 'p_small',
        cardId: 'plant_peashooter',
        name: 'Peashooter',
        side: 'plants',
        currentAttack: 1,
        currentHealth: 1,
      })
      state.lanes[1].plantMinion = createTestMinion({
        instanceId: 'p_threat',
        cardId: 'plant_bonk_choy',
        name: 'Bonk Choy',
        side: 'plants',
        currentAttack: 4,
        currentHealth: 3,
      })

      const superpower: Card = {
        id: 'sp_slammin_pumpkin',
        name: 'Slammin\' Smash',
        side: 'zombies',
        cost: 0,
        attack: 0,
        health: 0,
        type: 'superpower',
        image: '/assets/sp.png',
      }

      const decision = getAISuperpowerDecision(state, 'zombies', superpower, 'tempo')
      expect(decision.action).toBe('PLAY_SUPERPOWER')
      expect(decision.targetLaneIndex).toBe(1) // Targets Bonk Choy lane
    })

    it('plays Sunburn immediately for permanent +1 Sun resource ramp', () => {
      const state = setupState()
      const superpower: Card = {
        id: 'sp_sunburn',
        name: 'Sunburn',
        side: 'plants',
        cost: 0,
        attack: 0,
        health: 0,
        type: 'superpower',
        image: '/assets/sp.png',
      }

      const decision = getAISuperpowerDecision(state, 'plants', superpower, 'aggro')
      expect(decision.action).toBe('PLAY_SUPERPOWER')
      expect(decision.reason).toContain('Sunburn')
    })

    it('plays Eureka immediately when hand has ample space (<= 7 cards)', () => {
      const state = setupState()
      state.zombieHand = [getCard('zombie_swabbie'), getCard('zombie_arm_wrestler')]

      const superpower: Card = {
        id: 'sp_eureka',
        name: 'Eureka',
        side: 'zombies',
        cost: 0,
        attack: 0,
        health: 0,
        type: 'superpower',
        image: '/assets/sp.png',
      }

      const decision = getAISuperpowerDecision(state, 'zombies', superpower, 'control')
      expect(decision.action).toBe('PLAY_SUPERPOWER')
      expect(decision.reason).toContain('Eureka')
    })

    it('saves Eureka into hand when hand is near capacity (>= 8 cards) to prevent card burn', () => {
      const state = setupState()
      state.zombieHand = Array(8).fill(getCard('zombie_swabbie'))

      const superpower: Card = {
        id: 'sp_eureka',
        name: 'Eureka',
        side: 'zombies',
        cost: 0,
        attack: 0,
        health: 0,
        type: 'superpower',
        image: '/assets/sp.png',
      }

      const decision = getAISuperpowerDecision(state, 'zombies', superpower, 'control')
      expect(decision.action).toBe('SAVE_SUPERPOWER')
      expect(decision.reason).toContain('hand overflow')
    })

    it('uses Carried Away when a strong zombie is on board, or saves if board is empty', () => {
      const state = setupState()
      const superpower: Card = {
        id: 'sp_carried_away',
        name: 'Carried Away',
        side: 'zombies',
        cost: 0,
        attack: 0,
        health: 0,
        type: 'superpower',
        image: '/assets/sp.png',
      }

      // Empty board -> Save
      const decisionEmpty = getAISuperpowerDecision(state, 'zombies', superpower, 'aggro')
      expect(decisionEmpty.action).toBe('SAVE_SUPERPOWER')

      // With active zombie -> Play
      state.lanes[1].zombieMinion = createTestMinion({
        instanceId: 'z_boss',
        cardId: 'zombie_all_star',
        name: 'All-Star Zombie',
        side: 'zombies',
        currentAttack: 4,
        currentHealth: 6,
      })

      const decisionWithZombie = getAISuperpowerDecision(state, 'zombies', superpower, 'aggro')
      expect(decisionWithZombie.action).toBe('PLAY_SUPERPOWER')
      expect(decisionWithZombie.reason).toContain('Carried Away')
    })
  })

  // =========================================================================
  // 4. ENVIRONMENT TACTICS (Overriding Spikeweed Sector / Bog of Hope)
  // =========================================================================
  describe('4. Environment Tactics (Overriding & Placement)', () => {
    it('recognizes dangerous environments correctly', () => {
      expect(isDangerousEnvironment('plant_spikeweed_sector', 'zombies')).toBe(true)
      expect(isDangerousEnvironment('plant_bog_of_sunken_hope', 'zombies')).toBe(true)
      expect(isDangerousEnvironment('plant_planet_of_the_grapes', 'zombies')).toBe(true)
      expect(isDangerousEnvironment('zombie_laser_base_alpha', 'plants')).toBe(true)
      expect(isDangerousEnvironment('zombie_area_22', 'plants')).toBe(true)
      expect(isDangerousEnvironment('zombie_cone_zone', 'plants')).toBe(false)
    })

    it('Zombie AI prioritizes overriding Spikeweed Sector with Laser Base Alpha / Area 22', () => {
      const state = setupState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 5

      // Plant Hero placed Spikeweed Sector in Lane 2
      state.lanes[2].environment = {
        id: 'plant_spikeweed_sector',
        name: 'Spikeweed Sector',
        side: 'plants',
        description: 'Before combat here: Do 2 damage to a Zombie here.',
        image: '/assets/env/spikeweed.png',
      }

      // Zombie AI has Laser Base Alpha in hand
      const laserBase = getCard('zombie_laser_base_alpha')
      state.zombieHand = [laserBase]

      const decision = getAIDecision(state, 'zombies', { difficulty: 'expert', archetype: 'control' })
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('zombie_laser_base_alpha')
      expect(decision.laneIndex).toBe(2) // Strictly targets Lane 2 to overwrite Spikeweed Sector!
      expect(decision.reason).toContain('overrides dangerous plant environment')
    })

    it('Zombie AI overrides Bog of Sunken Hope with Area 22', () => {
      const state = setupState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 5

      // Plant has Bog of Sunken Hope in Lane 1
      state.lanes[1].environment = {
        id: 'plant_bog_of_sunken_hope',
        name: 'Bog of Sunken Hope',
        side: 'plants',
        description: 'Zombies here get -2 Attack',
        image: '/assets/env/bog.png',
      }

      const area22 = getCard('zombie_area_22')
      state.zombieHand = [area22]

      const decision = getAIDecision(state, 'zombies', { difficulty: 'normal', archetype: 'tempo' })
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('zombie_area_22')
      expect(decision.laneIndex).toBe(1) // Overrides Bog of Sunken Hope in Lane 1
      expect(decision.reason).toContain('overrides')
    })

    it('Plant AI overrides Laser Base Alpha with Spikeweed Sector during PLANT_PLAY', () => {
      const state = setupState()
      state.phase = 'PLANT_PLAY'
      state.plantHero.sun = 4

      // Zombie has Laser Base Alpha in Lane 3
      state.lanes[3].environment = {
        id: 'zombie_laser_base_alpha',
        name: 'Laser Base Alpha',
        side: 'zombies',
        description: 'Zombies here get Deadly and Strikethrough.',
        image: '/assets/env/laser.png',
      }

      const spikeweed = getCard('plant_spikeweed_sector')
      state.plantHand = [spikeweed]

      const decision = getAIDecision(state, 'plants', { difficulty: 'expert', archetype: 'control' })
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('plant_spikeweed_sector')
      expect(decision.laneIndex).toBe(3) // Targets Lane 3 to override Laser Base Alpha
      expect(decision.reason).toContain('overrides')
    })
  })

  // =========================================================================
  // 5. THREE ARCHETYPE BOSS AIS (Aggro, Control, Tempo)
  // =========================================================================
  describe('5. Three Archetype Boss AIs (Aggro, Control, Tempo)', () => {
    it('maps iconic Hero IDs to their designated Archetypes', () => {
      expect(getHeroDefaultArchetype('hero_super_brainz')).toBe('aggro')
      expect(getHeroDefaultArchetype('hero_impfinity')).toBe('aggro')
      expect(getHeroDefaultArchetype('hero_solar_flare')).toBe('aggro')

      expect(getHeroDefaultArchetype('hero_rustbolt')).toBe('control')
      expect(getHeroDefaultArchetype('hero_professor_brainstorm')).toBe('control')
      expect(getHeroDefaultArchetype('hero_rose')).toBe('control')

      expect(getHeroDefaultArchetype('hero_the_smash')).toBe('tempo')
      expect(getHeroDefaultArchetype('hero_grass_knuckles')).toBe('tempo')
    })

    it('Aggro AI prioritizes unblocked open lanes to maximize direct face pressure', () => {
      const state = setupState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 4

      // Lane 1 has a 1/1 Peashooter
      state.lanes[1].plantMinion = createTestMinion({
        instanceId: 'p_blocker',
        cardId: 'plant_peashooter',
        name: 'Peashooter',
        side: 'plants',
        currentAttack: 1,
        currentHealth: 1,
      })

      // Zombie hand has a 4/1 aggressor minion
      const aggressor: Card = {
        id: 'zombie_stealthy_aggressor',
        name: 'Stealthy Aggressor',
        side: 'zombies',
        type: 'minion',
        cost: 3,
        attack: 4,
        health: 1,
        image: '/assets/aggro.png',
      }
      state.zombieHand = [aggressor]

      const decision = getAIDecision(state, 'zombies', { difficulty: 'expert', archetype: 'aggro' })
      expect(decision.action).toBe('PLAY_MINION')
      // Must NOT place in Lane 1 where Peashooter blocks; must choose an open ground lane (e.g. 0, 2, 3)
      expect(decision.laneIndex).not.toBe(1)
      expect(state.lanes[decision.laneIndex!].plantMinion).toBeNull()
      expect(decision.reason).toContain('Aggro Boss strikes open lane')
    })

    it('Control AI strictly preserves Brains during ZOMBIE_PLAY when holding removal tricks', () => {
      const state = setupState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 6

      // Threat plant on board
      state.lanes[2].plantMinion = createTestMinion({
        instanceId: 'p_danger',
        cardId: 'plant_bonk_choy',
        name: 'Bonk Choy',
        side: 'plants',
        currentAttack: 3,
        currentHealth: 4,
      })

      // Hand has an expensive 5-cost minion and a 5-cost Locust Swarm
      state.zombieHand = [getCard('zombie_knight_living_dead'), getCard('zombie_locust_swarm')]

      const decision = getAIDecision(state, 'zombies', { difficulty: 'expert', archetype: 'control' })
      // Control AI passes minion phase to guarantee 5 Brains for Locust Swarm
      expect(decision.action).toBe('PASS')
      expect(decision.reason).toContain('Preserving')
    })

    it('Tempo AI chooses favorable minion trades (killing plant and surviving)', () => {
      const state = setupState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 4

      // Lane 2 has a 2/2 Plant
      state.lanes[2].plantMinion = createTestMinion({
        instanceId: 'p_trade',
        cardId: 'plant_cabbage_pult',
        name: 'Cabbage-Pult',
        side: 'plants',
        currentAttack: 2,
        currentHealth: 2,
      })

      // Zombie hand has a 3/3 Armored minion
      const armoredZombie: Card = {
        id: 'zombie_armored_guard',
        name: 'Armored Guard',
        side: 'zombies',
        type: 'minion',
        cost: 3,
        attack: 3,
        health: 3,
        image: '/assets/guard.png',
        armored: 1,
        traits: ['armored'],
      }
      state.zombieHand = [armoredZombie]

      const decision = getAIDecision(state, 'zombies', { difficulty: 'expert', archetype: 'tempo' })
      expect(decision.action).toBe('PLAY_MINION')
      expect(decision.laneIndex).toBe(2) // Contests lane 2 for favorable trade
      expect(decision.reason).toContain('favorable minion trade')
    })

    it('executes a sequential multi-action turn plan with getAITurnPlan', () => {
      const state = setupState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 4

      state.zombieHand = [
        getCard('zombie_swabbie'), // cost 0, amphibious -> goes to lane 4 (water)
        getCard('zombie_arm_wrestler'), // cost 1 -> goes to lane 0 (heights)
        getCard('zombie_conga_zombie'), // cost 2
      ]

      const plan = getAITurnPlan(state, 'zombies', { difficulty: 'normal', archetype: 'tempo' })
      expect(plan.length).toBeGreaterThanOrEqual(2)
      expect(plan[0].action).toBe('PLAY_MINION')
      // Consecutive actions deduct brains in simulation
      const totalCostPlanned = plan.reduce((sum, d) => sum + (d.card?.cost ?? 0), 0)
      expect(totalCostPlanned).toBeLessThanOrEqual(4)
    })
  })

  // =========================================================================
  // 6. ROUND 7 ENHANCEMENTS: ENVIRONMENT PLACEMENT & TRICK TACTICS
  // =========================================================================
  describe('6. Round 7 Enhancements (Environment Placement & Trick Tactics)', () => {
    it('Laser Base Alpha targets the highest attack zombie on board for Deadly and Strikethrough', () => {
      const state = setupState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 3

      // Lane 1 has a 2/3 Zombie
      state.lanes[1].zombieMinion = createTestMinion({
        instanceId: 'z_small',
        cardId: 'zombie_swabbie',
        name: 'Swabbie',
        side: 'zombies',
        currentAttack: 2,
        currentHealth: 3,
      })

      // Lane 3 has a 6/5 Zombie
      state.lanes[3].zombieMinion = createTestMinion({
        instanceId: 'z_big',
        cardId: 'zombie_all_star',
        name: 'All-Star Zombie',
        side: 'zombies',
        currentAttack: 6,
        currentHealth: 5,
      })

      state.zombieHand = [getCard('zombie_laser_base_alpha')]

      const decision = getAIDecision(state, 'zombies', { difficulty: 'expert', archetype: 'tempo' })
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('zombie_laser_base_alpha')
      // Must target lane 3 because 6 ATK > 2 ATK
      expect(decision.laneIndex).toBe(3)
      expect(decision.reason).toContain('highest attack zombie')
    })

    it('Area 22 empowers highest attack / unblocked zombie with +2/+2 & Frenzy', () => {
      const state = setupState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 3

      // Lane 1 has a 3/3 Zombie blocked by a Plant
      state.lanes[1].zombieMinion = createTestMinion({
        instanceId: 'z_blocked',
        cardId: 'zombie_arm_wrestler',
        name: 'Arm Wrestler',
        side: 'zombies',
        currentAttack: 3,
        currentHealth: 3,
      })
      state.lanes[1].plantMinion = createTestMinion({
        instanceId: 'p_blocker',
        cardId: 'plant_wall_nut',
        name: 'Wall-Nut',
        side: 'plants',
        currentAttack: 0,
        currentHealth: 6,
      })

      // Lane 2 has a 4/4 unblocked Zombie
      state.lanes[2].zombieMinion = createTestMinion({
        instanceId: 'z_unblocked',
        cardId: 'zombie_super_vampire',
        name: 'Vampire Zombie',
        side: 'zombies',
        currentAttack: 4,
        currentHealth: 4,
      })

      state.zombieHand = [getCard('zombie_area_22')]

      const decision = getAIDecision(state, 'zombies', { difficulty: 'expert', archetype: 'tempo' })
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('zombie_area_22')
      expect(decision.laneIndex).toBe(2)
      expect(decision.reason).toContain('Area 22')
    })

    it('Rocket Science prioritizes destroying the highest-threat 4+ attack plant', () => {
      const state = setupState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 3

      // Lane 1: 4/1 Plant (threat ~ 4 + 1 = 5)
      state.lanes[1].plantMinion = createTestMinion({
        instanceId: 'p_threat_low',
        cardId: 'plant_repeater',
        name: 'Repeater',
        side: 'plants',
        currentAttack: 4,
        currentHealth: 1,
      })

      // Lane 3: 8/8 Plant (threat ~ 8*1.5 + 8 = 20)
      state.lanes[3].plantMinion = createTestMinion({
        instanceId: 'p_threat_high',
        cardId: 'plant_gatling_pea',
        name: 'Gatling Pea',
        side: 'plants',
        currentAttack: 8,
        currentHealth: 8,
      })

      state.zombieHand = [getCard('zombie_rocket_science')]

      const decision = getAIDecision(state, 'zombies', { difficulty: 'expert', archetype: 'control' })
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('zombie_rocket_science')
      // Must target Lane 3 (Gatling Pea) instead of arbitrarily picking Lane 1
      expect(decision.laneIndex).toBe(3)
      expect(decision.reason).toContain('highest threat 4+ attack plant')
    })

    it('Locust Swarm destroys the highest-threat plant minion on board', () => {
      const state = setupState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 5

      // Lane 0: 2/2 Peashooter
      state.lanes[0].plantMinion = createTestMinion({
        instanceId: 'p_small',
        cardId: 'plant_peashooter',
        name: 'Peashooter',
        side: 'plants',
        currentAttack: 2,
        currentHealth: 2,
      })

      // Lane 2: 7/7 Boss Plant
      state.lanes[2].plantMinion = createTestMinion({
        instanceId: 'p_giant',
        cardId: 'plant_dark_matter_dragonfruit',
        name: 'Dark Matter Dragonfruit',
        side: 'plants',
        currentAttack: 7,
        currentHealth: 7,
      })

      state.zombieHand = [getCard('zombie_locust_swarm')]

      const decision = getAIDecision(state, 'zombies', { difficulty: 'expert', archetype: 'control' })
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('zombie_locust_swarm')
      expect(decision.laneIndex).toBe(2)
      expect(decision.reason).toContain('highest threat plant')
    })

    it('Calculates lethal face damage with Brute Strength on an unblocked zombie', () => {
      const state = setupState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 3
      state.plantHero.hp = 5 // Plant hero has 5 HP remaining

      // Lane 2 has an unblocked 2-attack zombie. With Brute Strength (+3), it hits for 5 damage (Lethal!)
      state.lanes[2].zombieMinion = createTestMinion({
        instanceId: 'z_finisher',
        cardId: 'zombie_arm_wrestler',
        name: 'Arm Wrestler',
        side: 'zombies',
        currentAttack: 2,
        currentHealth: 2,
      })

      state.zombieHand = [getCard('zombie_brute_strength')]

      const decision = getAIDecision(state, 'zombies', { difficulty: 'expert', archetype: 'aggro' })
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('zombie_brute_strength')
      expect(decision.laneIndex).toBe(2)
      expect(decision.reason).toContain('Lethal Brute Strength')
    })

    it('Calculates lethal face damage with Lurch for Lunch on an unblocked zombie', () => {
      const state = setupState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 2
      state.plantHero.hp = 4

      // Lane 1 has an unblocked 4-attack zombie. Lurch for Lunch bonus attack does 4 damage immediately (Lethal!)
      state.lanes[1].zombieMinion = createTestMinion({
        instanceId: 'z_striker',
        cardId: 'zombie_stealthy_imp',
        name: 'Stealthy Imp',
        side: 'zombies',
        currentAttack: 4,
        currentHealth: 2,
      })

      state.zombieHand = [getCard('zombie_lurch_for_lunch')]

      const decision = getAIDecision(state, 'zombies', { difficulty: 'expert', archetype: 'aggro' })
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('zombie_lurch_for_lunch')
      expect(decision.laneIndex).toBe(1)
      expect(decision.reason).toContain('Lethal Lurch for Lunch bonus attack')
    })

    it('Deploys Going Viral when zombies are present to grant +1/+1 and Frenzy', () => {
      const state = setupState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 3

      state.lanes[1].zombieMinion = createTestMinion({
        instanceId: 'z_1',
        cardId: 'zombie_swabbie',
        name: 'Swabbie',
        side: 'zombies',
        currentAttack: 1,
        currentHealth: 1,
      })
      state.lanes[3].zombieMinion = createTestMinion({
        instanceId: 'z_2',
        cardId: 'zombie_conga_zombie',
        name: 'Conga Zombie',
        side: 'zombies',
        currentAttack: 2,
        currentHealth: 2,
      })

      state.zombieHand = [getCard('zombie_going_viral')]

      const decision = getAIDecision(state, 'zombies', { difficulty: 'normal', archetype: 'tempo' })
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('zombie_going_viral')
      expect(decision.reason).toContain('Going Viral buffs 2 zombies')
    })
  })

  // =========================================================================
  // 7. ROUND 8 ENHANCEMENTS: ADVANCED TACTICS, BRAIN RESERVATION, SUPERPOWERS & COMBO
  // =========================================================================
  describe('7. Round 8 Enhancements (Brain Reservation, Superpower Decisions, Mulligan & Combo)', () => {
    // -----------------------------------------------------------------------
    // A. Brain Reservation (reserveBrainsForTricks)
    // -----------------------------------------------------------------------
    describe('A. Brain Reservation for Tricks', () => {
      it('reserves brains for Rocket Science against 4+ attack plant and passes if only expensive minion in hand', () => {
        const state = setupState()
        state.phase = 'ZOMBIE_PLAY'
        state.zombieHero.brains = 4

        // 4+ Attack Plant threatens Lane 2
        state.lanes[2].plantMinion = createTestMinion({
          instanceId: 'p_danger',
          cardId: 'plant_gatling_pea',
          name: 'Gatling Pea',
          side: 'plants',
          currentAttack: 5,
          currentHealth: 4,
        })

        // Hand has Rocket Science (cost 3) and an expensive minion (cost 4)
        const rocket = getCard('zombie_rocket_science')
        const football = getCard('zombie_football_zombie') // cost 5
        football.cost = 4
        state.zombieHand = [rocket, football]

        const reservation = reserveBrainsForTricks(state, state.zombieHand, 4, 'control', 'expert')
        expect(reservation.reservedBrains).toBe(3)
        expect(reservation.targetTrick?.id).toBe('zombie_rocket_science')

        // AI decision in ZOMBIE_PLAY should pass to preserve brains
        const decision = getAIDecision(state, 'zombies', { difficulty: 'expert', archetype: 'control' })
        expect(decision.action).toBe('PASS')
        expect(decision.reason).toContain('Reserving brains for Rocket Science')
      })

      it('plays affordable cheap minion while preserving remaining brains for Going Viral', () => {
        const state = setupState()
        state.phase = 'ZOMBIE_PLAY'
        state.zombieHero.brains = 4

        // Have a zombie on board so Going Viral reservation triggers
        state.lanes[1].zombieMinion = createTestMinion({
          instanceId: 'z_troop',
          cardId: 'zombie_swabbie',
          name: 'Swabbie',
          side: 'zombies',
          currentAttack: 1,
          currentHealth: 1,
        })

        const viral = getCard('zombie_going_viral') // cost 3
        const armWrestler = getCard('zombie_arm_wrestler') // cost 1
        state.zombieHand = [viral, armWrestler]

        // Reservation should ask for 3 brains
        const reservation = reserveBrainsForTricks(state, state.zombieHand, 4, 'tempo', 'expert')
        expect(reservation.reservedBrains).toBe(3)

        // AI should play Arm Wrestler (cost 1 <= 4 - 3) while reserving 3 brains
        const decision = getAIDecision(state, 'zombies', { difficulty: 'expert', archetype: 'tempo' })
        expect(decision.action).toBe('PLAY_MINION')
        expect(decision.card?.id).toBe('zombie_arm_wrestler')
        expect(decision.reason).toContain('Preserving 3 brains for tricks')
      })

      it('reserves brains for lethal Brute Strength buff on an unblocked zombie', () => {
        const state = setupState()
        state.phase = 'ZOMBIE_PLAY'
        state.zombieHero.brains = 3
        state.plantHero.hp = 5

        // Unblocked zombie with 2 attack (2 + 3 = 5 damage = lethal!)
        state.lanes[2].zombieMinion = createTestMinion({
          instanceId: 'z_finisher',
          cardId: 'zombie_arm_wrestler',
          name: 'Arm Wrestler',
          side: 'zombies',
          currentAttack: 2,
          currentHealth: 2,
        })

        const brute = getCard('zombie_brute_strength') // cost 1
        state.zombieHand = [brute]

        const reservation = reserveBrainsForTricks(state, state.zombieHand, 3, 'aggro', 'expert')
        expect(reservation.reservedBrains).toBe(brute.cost)
        expect(reservation.targetTrick?.id).toBe('zombie_brute_strength')
      })
    })

    // -----------------------------------------------------------------------
    // B. Superpower & Super-Block Decisions (getAISuperpowerDecision)
    // -----------------------------------------------------------------------
    describe('B. Superpower Decisions & Threshold Rules', () => {
      it('Heroic Health: saves when Zombie Hero is at 20 HP, plays when HP <= 15', () => {
        const state = setupState()
        const heroicHealth: Card = {
          id: 'sp_heroic_health',
          name: 'Heroic Health',
          side: 'zombies',
          cost: 0,
          attack: 0,
          health: 0,
          type: 'superpower',
          image: '/assets/sp.png',
        }

        // Full health: save
        state.zombieHero.hp = 20
        const saveDecision = getAISuperpowerDecision(state, 'zombies', heroicHealth, 'control')
        expect(saveDecision.action).toBe('SAVE_SUPERPOWER')
        expect(saveDecision.reason).toContain('Save Heroic Health')

        // Damaged health (12 HP): play immediately
        state.zombieHero.hp = 12
        const playDecision = getAISuperpowerDecision(state, 'zombies', heroicHealth, 'control')
        expect(playDecision.action).toBe('PLAY_SUPERPOWER')
        expect(playDecision.reason).toContain('Heroic Health restores 6 HP')
      })

      it('Geyser: saves when Plant Hero is full HP and no plants damaged, plays when damaged', () => {
        const state = setupState()
        const geyser: Card = {
          id: 'sp_geyser',
          name: 'Geyser',
          side: 'plants',
          cost: 0,
          attack: 0,
          health: 0,
          type: 'superpower',
          image: '/assets/sp.png',
        }

        // Full health: save
        state.plantHero.hp = 20
        const saveDecision = getAISuperpowerDecision(state, 'plants', geyser, 'tempo')
        expect(saveDecision.action).toBe('SAVE_SUPERPOWER')

        // Damaged hero (14 HP): play
        state.plantHero.hp = 14
        const playDecision = getAISuperpowerDecision(state, 'plants', geyser, 'tempo')
        expect(playDecision.action).toBe('PLAY_SUPERPOWER')
        expect(playDecision.reason).toContain('Geyser heals')
      })

      it('Uncrackable: plays when facing massive incoming damage, saves when board is safe', () => {
        const state = setupState()
        const uncrackable: Card = {
          id: 'sp_uncrackable',
          name: 'Uncrackable',
          side: 'plants',
          cost: 0,
          attack: 0,
          health: 0,
          type: 'superpower',
          image: '/assets/sp.png',
        }

        // Safe board, full HP: save
        state.plantHero.hp = 20
        const saveDecision = getAISuperpowerDecision(state, 'plants', uncrackable, 'control')
        expect(saveDecision.action).toBe('SAVE_SUPERPOWER')

        // Lethal/Heavy danger: 6 unblocked zombie attack
        state.lanes[1].zombieMinion = createTestMinion({
          instanceId: 'z_danger',
          cardId: 'zombie_all_star',
          name: 'All-Star',
          side: 'zombies',
          currentAttack: 6,
          currentHealth: 5,
        })
        const playDecision = getAISuperpowerDecision(state, 'plants', uncrackable, 'control')
        expect(playDecision.action).toBe('PLAY_SUPERPOWER')
        expect(playDecision.reason).toContain('Uncrackable shields Plant Hero')
      })

      it('Telepathy / Holoflora: plays when hand <= 8, saves when hand >= 9 to prevent hand overflow', () => {
        const state = setupState()
        const telepathy: Card = {
          id: 'sp_telepathy',
          name: 'Telepathy',
          side: 'zombies',
          cost: 0,
          attack: 0,
          health: 0,
          type: 'superpower',
          image: '/assets/sp.png',
        }

        // Hand has 4 cards (safe to draw 2)
        state.zombieHand = [getCard('zombie_swabbie'), getCard('zombie_swabbie'), getCard('zombie_swabbie'), getCard('zombie_swabbie')]
        const playDecision = getAISuperpowerDecision(state, 'zombies', telepathy, 'tempo')
        expect(playDecision.action).toBe('PLAY_SUPERPOWER')
        expect(playDecision.reason).toContain('draws 2 cards')

        // Hand has 9 cards (drawing 2 would overflow 10-card hand limit)
        state.zombieHand = Array(9).fill(getCard('zombie_swabbie'))
        const saveDecision = getAISuperpowerDecision(state, 'zombies', telepathy, 'tempo')
        expect(saveDecision.action).toBe('SAVE_SUPERPOWER')
        expect(saveDecision.reason).toContain('avoid hand overflow')
      })

      it('Electrobolt: saves when enemy board is empty, strikes when target plant exists', () => {
        const state = setupState()
        const electrobolt: Card = {
          id: 'sp_electrobolt',
          name: 'Electrobolt',
          side: 'zombies',
          cost: 0,
          attack: 0,
          health: 0,
          type: 'superpower',
          image: '/assets/sp.png',
        }

        // Empty board: save
        const saveDecision = getAISuperpowerDecision(state, 'zombies', electrobolt, 'control')
        expect(saveDecision.action).toBe('SAVE_SUPERPOWER')
        expect(saveDecision.reason).toContain('Save Electrobolt')

        // Plant target present
        state.lanes[2].plantMinion = createTestMinion({
          instanceId: 'p_target',
          cardId: 'plant_peashooter',
          name: 'Peashooter',
          side: 'plants',
          currentAttack: 1,
          currentHealth: 1,
        })
        const playDecision = getAISuperpowerDecision(state, 'zombies', electrobolt, 'control')
        expect(playDecision.action).toBe('PLAY_SUPERPOWER')
        expect(playDecision.targetLaneIndex).toBe(2)
      })
    })

    // -----------------------------------------------------------------------
    // C. Mulligan Strategy (getAIMulliganDecision)
    // -----------------------------------------------------------------------
    describe('C. Mulligan Decision & Curve Optimization', () => {
      it('Aggro mulligans away 3-cost and 4-cost cards when missing a 1-drop', () => {
        const c1_cost3 = { ...getCard('zombie_rocket_science'), cost: 3 }
        const c2_cost4 = { ...getCard('zombie_football_zombie'), cost: 4 }
        const c3_cost2 = { ...getCard('zombie_conga_zombie'), cost: 2 }
        const c4_cost5 = { ...getCard('zombie_locust_swarm'), cost: 5 }

        const hand = [c1_cost3, c2_cost4, c3_cost2, c4_cost5]
        const decision = getAIMulliganDecision(hand, 'aggro')

        // No 1-drop in hand -> Aggro swaps 3, 4, 5 cost cards to aggressively dig for 1-drop!
        expect(decision.keepIndices).toEqual([2]) // keeps only the 2-cost card
        expect(decision.swapIndices).toContain(0) // swaps 3-cost
        expect(decision.swapIndices).toContain(1) // swaps 4-cost
        expect(decision.swapIndices).toContain(3) // swaps 5-cost
      })

      it('Control keeps key removal spells when holding early defense', () => {
        const c1_def = { ...getCard('zombie_arm_wrestler'), cost: 1 }
        const c2_removal = { ...getCard('zombie_rocket_science'), cost: 3 }
        const c3_cost5 = { ...getCard('zombie_football_zombie'), cost: 5 }

        const hand = [c1_def, c2_removal, c3_cost5]
        const decision = getAIMulliganDecision(hand, 'control')

        // With 1-cost defense in hand, Control keeps Rocket Science and swaps heavy non-removal
        expect(decision.keepIndices).toContain(0)
        expect(decision.keepIndices).toContain(1)
        expect(decision.swapIndices).toContain(2)
      })

      it('Combo keeps core synergy pieces Valkyrie and Trickster (with cheap tricks)', () => {
        const valkyrie = { ...getCard('zombie_valkyrie'), cost: 4 }
        const trickster = { ...getCard('zombie_trickster'), cost: 10 }
        const cheapTrick = { ...getCard('zombie_bungee_plumber'), cost: 1, type: 'trick' as const }
        const heavyMinion = { ...getCard('zombie_football_zombie'), cost: 5 }

        const hand = [valkyrie, trickster, cheapTrick, heavyMinion]
        const decision = getAIMulliganDecision(hand, 'combo')

        expect(decision.keepIndices).toContain(0) // Valkyrie kept
        expect(decision.keepIndices).toContain(1) // Trickster kept (holding cheapTrick)
        expect(decision.keepIndices).toContain(2) // Cheap trick kept
        expect(decision.swapIndices).toContain(3) // 5-cost swapped
      })
    })

    // -----------------------------------------------------------------------
    // D. Four Archetypes & Combo Integration
    // -----------------------------------------------------------------------
    describe('D. Four Archetypes & Combo Behavior', () => {
      it('maps Huge-Gigantacus and Beta-Carrotina to the combo archetype', () => {
        expect(getHeroDefaultArchetype('hero_huge_gigantacus')).toBe('combo')
        expect(getHeroDefaultArchetype('hero_beta_carrotina')).toBe('combo')
      })

      it('evaluateBoardState evaluates combo archetype with card advantage weighting', () => {
        const state = setupState()
        state.zombieHand = [getCard('zombie_swabbie'), getCard('zombie_swabbie'), getCard('zombie_swabbie')]
        state.plantHand = [] // Plant has 0 cards, Zombie has 3 cards (huge card advantage)

        const scoreCombo = evaluateBoardState(state, 'zombies', 'combo')
        const scoreAggro = evaluateBoardState(state, 'zombies', 'aggro')

        // Combo heavily rewards card advantage (+4.0 per card difference)
        expect(scoreCombo.score).toBeGreaterThan(scoreAggro.score)
        expect(typeof scoreCombo.score).toBe('number')
      })

      it('Combo AI deploys engine minion Dr. Spacetime into a safe open lane', () => {
        const state = setupState()
        state.phase = 'ZOMBIE_PLAY'
        state.zombieHero.brains = 3

        // Lane 0 has a strong Plant
        state.lanes[0].plantMinion = createTestMinion({
          instanceId: 'p_danger',
          cardId: 'plant_peashooter',
          name: 'Peashooter',
          side: 'plants',
          currentAttack: 3,
          currentHealth: 3,
        })

        // Lane 1, 2, 3 are open
        const drSpacetime = getCard('zombie_dr_spacetime')
        state.zombieHand = [drSpacetime]

        const decision = getAIDecision(state, 'zombies', { difficulty: 'expert', archetype: 'combo' })
        expect(decision.action).toBe('PLAY_MINION')
        expect(decision.card?.id).toBe('zombie_dr_spacetime')
        expect(decision.laneIndex).not.toBe(0) // Avoids lane 0, plays in safe open lane
        expect(decision.reason).toContain('Combo AI deploys engine minion')
      })
    })
  })
})
