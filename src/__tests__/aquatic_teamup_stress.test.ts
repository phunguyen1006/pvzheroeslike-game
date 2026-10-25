import { describe, it, expect } from 'vitest'
import {
  createInitialGameState,
  resolveSingleLaneCombat,
  canPlayCardToLane,
  gameReducer,
} from '../engine/index'
import { isWaterLane, isAmphibious, hasTeamUp } from '../engine/combat'
import { getCardById, ALL_CARDS } from '../data/cards'
import type { Minion, Card, GameState } from '../engine/types'

describe('Aquatic Mechanics, Team-Up Combat Stress Tests & New Zombie Cards', () => {
  const createMockMinion = (
    instanceId: string,
    name: string,
    side: 'plants' | 'zombies',
    attack: number,
    health: number,
    options: Partial<Minion> = {}
  ): Minion => ({
    instanceId,
    cardId: `card_${instanceId}`,
    name,
    side,
    currentAttack: attack,
    baseAttack: attack,
    currentHealth: health,
    maxHealth: health,
    image: `/assets/${name.toLowerCase().replace(/\s+/g, '_')}.png`,
    ...options,
  })

  const createMockCard = (
    id: string,
    name: string,
    side: 'plants' | 'zombies',
    cost: number,
    type: 'minion' | 'trick' | 'environment' | 'superpower' = 'minion',
    options: Partial<Card> = {}
  ): Card => ({
    id,
    name,
    side,
    cost,
    type,
    image: `/assets/${name.toLowerCase().replace(/\s+/g, '_')}.png`,
    traits: [],
    ...options,
  })

  // =========================================================================
  // 1. AQUATIC / AMPHIBIOUS RESTRICTIONS
  // =========================================================================
  describe('1. Aquatic / Amphibious Placement Restrictions', () => {
    it('identifies water lanes accurately using isWaterLane', () => {
      const state = createInitialGameState()
      // Default PvZ Heroes 5-lane setup: Lane 5 (index 4) is water
      expect(isWaterLane(state.lanes[0])).toBe(false)
      expect(isWaterLane(state.lanes[1])).toBe(false)
      expect(isWaterLane(state.lanes[2])).toBe(false)
      expect(isWaterLane(state.lanes[3])).toBe(false)
      expect(isWaterLane(state.lanes[4])).toBe(true)
    })

    it('blocks non-amphibious minions from being placed in water lanes', () => {
      const state = createInitialGameState()
      const groundPlant = createMockCard('plant_peashooter', 'Peashooter', 'plants', 1, 'minion', {
        amphibious: false,
        laneRequirement: 'ground',
      })

      const check = canPlayCardToLane(groundPlant, state.lanes[4], 'plants')
      expect(check.allowed).toBe(false)
      expect(check.reason).toContain('Amphibious')
    })

    it('allows amphibious minions to be placed in water lanes', () => {
      const state = createInitialGameState()
      const waterZombie = createMockCard('zombie_swabbie', 'Swabbie', 'zombies', 0, 'minion', {
        amphibious: true,
        traits: ['Amphibious'],
      })

      expect(isAmphibious(waterZombie)).toBe(true)
      const check = canPlayCardToLane(waterZombie, state.lanes[4], 'zombies')
      expect(check.allowed).toBe(true)
    })

    it('allows amphibious minions to also be placed in ground lanes', () => {
      const state = createInitialGameState()
      const waterZombie = createMockCard('zombie_swabbie', 'Swabbie', 'zombies', 0, 'minion', {
        amphibious: true,
      })

      // Ground lane (index 0)
      const check = canPlayCardToLane(waterZombie, state.lanes[0], 'zombies')
      expect(check.allowed).toBe(true)
    })
  })

  // =========================================================================
  // 2. TEAM-UP PLACEMENT & DUAL MINION MECHANICS
  // =========================================================================
  describe('2. Team-Up Placement & Dual Minion Mechanics', () => {
    it('allows Team-Up plant to be placed into lane already containing a plant minion', () => {
      let state = createInitialGameState()
      state.phase = 'PLANT_PLAY'
      state.plantHero.sun = 5

      const regularPlant = createMockCard('p_base', 'Peashooter', 'plants', 1, 'minion')
      const teamUpPlant = createMockCard('p_teamup', 'Wall-Nut', 'plants', 1, 'minion', {
        teamUp: true,
        traits: ['Team-Up'],
      })
      state.plantHand = [regularPlant, teamUpPlant]

      // Place initial plant into lane 1
      state = gameReducer(state, {
        type: 'PLAY_CARD',
        card: regularPlant,
        laneIndex: 1,
        side: 'plants',
      })

      expect(state.lanes[1].plantMinion).not.toBeNull()
      expect(state.lanes[1].plantTeamUpMinion).toBeNull()

      const check = canPlayCardToLane(teamUpPlant, state.lanes[1], 'plants')
      expect(check.allowed).toBe(true)

      state = gameReducer(state, {
        type: 'PLAY_CARD',
        card: teamUpPlant,
        laneIndex: 1,
        side: 'plants',
      })

      // Front plant and Team-Up back plant are both present
      expect(state.lanes[1].plantMinion).not.toBeNull()
      expect(state.lanes[1].plantTeamUpMinion).not.toBeNull()
      expect(state.lanes[1].plantTeamUpMinion!.name).toBe('Wall-Nut')
    })

    it('rejects playing a regular plant into an occupied lane when neither has Team-Up', () => {
      const state = createInitialGameState()
      state.lanes[2].plantMinion = createMockMinion('p1', 'Repeater', 'plants', 2, 4)

      const regularPlant = createMockCard('p2', 'Bonk Choy', 'plants', 1, 'minion', {
        teamUp: false,
        traits: [],
      })

      const check = canPlayCardToLane(regularPlant, state.lanes[2], 'plants')
      expect(check.allowed).toBe(false)
      expect(check.reason).toContain('không có Team-Up')
    })

    it('rejects playing into a lane when both plant and plantTeamUp slots are full', () => {
      const state = createInitialGameState()
      state.lanes[0].plantMinion = createMockMinion('p1', 'Peashooter', 'plants', 1, 1)
      state.lanes[0].plantTeamUpMinion = createMockMinion('p2', 'Wall-Nut', 'plants', 0, 6, { teamUp: true })

      const newTeamUp = createMockCard('p3', 'Torchwood', 'plants', 2, 'minion', { teamUp: true })
      const check = canPlayCardToLane(newTeamUp, state.lanes[0], 'plants')
      expect(check.allowed).toBe(false)
    })
  })

  // =========================================================================
  // 3. COMBAT INTERACTION: TEAM-UP WITH DEADLY, FRENZY, STRIKETHROUGH
  // =========================================================================
  describe('3. Team-Up Combat Resolution: Deadly, Frenzy, Strikethrough', () => {
    it('combines attack from both front plant and Team-Up minion against opposing zombie', () => {
      const state = createInitialGameState()
      // Front plant: 2 attack, Team-Up minion: 3 attack -> Combined 5 attack!
      state.lanes[1].plantMinion = createMockMinion('p_front', 'Front Pea', 'plants', 2, 4)
      state.lanes[1].plantTeamUpMinion = createMockMinion('p_back', 'Back Pea', 'plants', 3, 3, { teamUp: true })
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Knight Zombie', 'zombies', 2, 8)

      const result = resolveSingleLaneCombat(state, 1)

      // Zombie takes 2 + 3 = 5 damage (8 - 5 = 3 HP)
      expect(result.updatedState.lanes[1].zombieMinion!.currentHealth).toBe(3)
      // Zombie attacks front plant dealing 2 damage (4 - 2 = 2 HP)
      expect(result.updatedState.lanes[1].plantMinion!.currentHealth).toBe(2)
      // Team-Up minion behind takes 0 damage
      expect(result.updatedState.lanes[1].plantTeamUpMinion!.currentHealth).toBe(3)
    })

    it('destroys front plant instantly when opposing zombie has Deadly trait', () => {
      const state = createInitialGameState()
      state.lanes[2].plantMinion = createMockMinion('p_front', 'High HP Wall', 'plants', 0, 10)
      state.lanes[2].plantTeamUpMinion = createMockMinion('p_back', 'Shooter', 'plants', 4, 3, { teamUp: true })
      // Deadly zombie with 1 attack
      state.lanes[2].zombieMinion = createMockMinion('z_deadly', 'Toxic Waste Imp', 'zombies', 1, 2, {
        deadly: true,
        traits: ['deadly'],
      })

      const result = resolveSingleLaneCombat(state, 2)

      // Front plant destroyed by Deadly (despite having 10 HP)
      expect(result.updatedState.lanes[2].plantMinion).toBeNull()
      // Opposing zombie takes 4 damage from back plant and is destroyed
      expect(result.updatedState.lanes[2].zombieMinion).toBeNull()
      // Team-Up minion survived
      expect(result.updatedState.lanes[2].plantTeamUpMinion).not.toBeNull()
      expect(result.updatedState.lanes[2].plantTeamUpMinion!.currentHealth).toBe(3)
    })

    it('triggers Frenzy attack on Team-Up minion after destroying the front plant', () => {
      const state = createInitialGameState()
      // Front plant: 2 HP (weak)
      state.lanes[0].plantMinion = createMockMinion('p_weak', 'Small Plant', 'plants', 1, 2)
      // Team-Up minion behind: 4 HP
      state.lanes[0].plantTeamUpMinion = createMockMinion('p_behind', 'Protector', 'plants', 0, 4, { teamUp: true })
      // Frenzy zombie: 5 Attack, 6 HP
      state.lanes[0].zombieMinion = createMockMinion('z_frenzy', 'Smashing Gargantuar', 'zombies', 5, 6, {
        frenzy: true,
        traits: ['frenzy'],
      })

      const result = resolveSingleLaneCombat(state, 0)

      // 1. Initial combat: Zombie deals 5 damage to front plant (destroyed)
      expect(result.updatedState.lanes[0].plantMinion).toBeNull()

      // 2. Frenzy triggers: Zombie bonus attacks the Team-Up plant behind dealing 5 damage!
      // Team-Up plant has 4 HP -> destroyed by Frenzy follow-up!
      expect(result.updatedState.lanes[0].plantTeamUpMinion).toBeNull()
      expect(result.events.some(e => e.attackerName.includes('Frenzy'))).toBe(true)
    })

    it('damages front plant and hits Plant Hero directly when opposing zombie has Strikethrough', () => {
      const state = createInitialGameState()
      state.plantHero.hp = 20
      state.lanes[3].plantMinion = createMockMinion('p_front', 'Front Wall', 'plants', 0, 5)
      state.lanes[3].plantTeamUpMinion = createMockMinion('p_back', 'Back Wall', 'plants', 0, 5, { teamUp: true })
      // Strikethrough zombie with 3 attack
      state.lanes[3].zombieMinion = createMockMinion('z_strike', 'Space Cowboy', 'zombies', 3, 5, {
        strikethrough: true,
        traits: ['strikethrough'],
      })

      const result = resolveSingleLaneCombat(state, 3)

      // Front plant takes 3 damage (5 - 3 = 2 HP)
      expect(result.updatedState.lanes[3].plantMinion!.currentHealth).toBe(2)
      // Plant Hero takes 3 strikethrough damage directly!
      expect(result.updatedState.plantHero.hp).toBe(17)
      expect(result.events.some(e => e.attackerName.includes('Space Cowboy') && e.target === 'hero')).toBe(true)
    })
  })

  // =========================================================================
  // 4. NEW ZOMBIE CARDS VERIFICATION
  // =========================================================================
  describe('4. New Zombie Cards Metadata & Traits in cards.ts', () => {
    it('verifies Zombot Sharktronic Sub: 7 cost, 3/3, Amphibious, Beastly', () => {
      const card = getCardById('zombie_zombot_sharktronic_sub')
      expect(card).toBeDefined()
      expect(card!.cost).toBe(7)
      expect(card!.attack).toBe(3)
      expect(card!.hp).toBe(3)
      expect(card!.traits).toContain('Amphibious')
      expect(card!.heroClass).toBe('Beastly')
      expect(card!.laneRequirement).toBe('any')
      expect(card!.tribe).toContain('Science')
      expect(card!.description.length).toBeGreaterThan(10)
    })

    it('verifies Jester: 4 cost, 3/4, Untrickable, Crazy, Party Zombie', () => {
      const card = getCardById('zombie_jester')
      expect(card).toBeDefined()
      expect(card!.cost).toBe(4)
      expect(card!.attack).toBe(3)
      expect(card!.hp).toBe(4)
      expect(card!.traits).toContain('Untrickable')
      expect(card!.heroClass).toBe('Crazy')
      expect(card!.tribe).toContain('Party Zombie')
      expect(card!.description.length).toBeGreaterThan(10)
    })

    it('verifies Smashing Gargantuar: 6 cost, 6/6, Frenzy, Beastly, Gargantuar', () => {
      const card = getCardById('zombie_smashing_gargantuar')
      expect(card).toBeDefined()
      expect(card!.cost).toBe(6)
      expect(card!.attack).toBe(6)
      expect(card!.hp).toBe(6)
      expect(card!.traits).toContain('Frenzy')
      expect(card!.heroClass).toBe('Beastly')
      expect(card!.tribe).toBe('Gargantuar Zombie')
      expect(card!.description).toContain('Frenzy')
    })

    it('verifies Turquoise Skull Zombie: 5 cost, 5/5, Hearty, History Zombie', () => {
      const card = getCardById('zombie_turquoise_skull_zombie')
      expect(card).toBeDefined()
      expect(card!.cost).toBe(5)
      expect(card!.attack).toBe(5)
      expect(card!.hp).toBe(5)
      expect(card!.heroClass).toBe('Hearty')
      expect(card!.tribe).toBe('History Zombie')
      expect(card!.description.length).toBeGreaterThan(10)
    })

    it('verifies Imp-Throwing Gargantuar: 8 cost, 8/8, Crazy, Gargantuar Imp Zombie', () => {
      const card = getCardById('zombie_imp_throwing_gargantuar')
      expect(card).toBeDefined()
      expect(card!.cost).toBe(8)
      expect(card!.attack).toBe(8)
      expect(card!.hp).toBe(8)
      expect(card!.heroClass).toBe('Crazy')
      expect(card!.tribe).toContain('Gargantuar')
      expect(card!.description.length).toBeGreaterThan(10)
    })
  })
})
