import { describe, it, expect } from 'vitest'
import {
  createInitialGameState,
  resolveSingleLaneCombat,
  resolveCombat,
  gameReducer,
  isWaterLane,
  isAmphibious,
  hasTeamUp,
  validateAquaticPlacement,
  getValidLanesForCard,
  findAlternativeLaneForCard,
  canPlayCardToLane,
} from '../engine/index'
import type { Minion, Card, GameState } from '../engine/types'

describe('Engine Aquatic Lane Mechanics & Team-Up Trait Suite (Đợt 11)', () => {
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
    attack: number,
    health: number,
    options: Partial<Card> = {}
  ): Card => ({
    id,
    name,
    side,
    cost,
    attack,
    health,
    type: 'minion',
    image: `/assets/${name.toLowerCase().replace(/\s+/g, '_')}.png`,
    traits: [],
    ...options,
  })

  // =========================================================================
  // 1. AQUATIC / AMPHIBIOUS PLACEMENT VALIDATION
  // =========================================================================
  describe('1. Aquatic / Amphibious Lane Placement Validation', () => {
    it('correctly identifies water/aquatic lane using isWaterLane', () => {
      const state = createInitialGameState()
      // Lane 4 is configured as Water in DEFAULT_LANES_CONFIG
      expect(isWaterLane(state.lanes[4])).toBe(true)
      expect(isWaterLane(state.lanes[0])).toBe(false)
      expect(isWaterLane(state.lanes[1])).toBe(false)
      expect(isWaterLane(state.lanes[2])).toBe(false)
      expect(isWaterLane(state.lanes[3])).toBe(false)
    })

    it('identifies amphibious cards via boolean, laneRequirement, or traits', () => {
      const cardBool = createMockCard('c1', 'Navy Bean', 'plants', 3, 2, 2, { amphibious: true })
      const cardReq = createMockCard('c2', 'Fishy Zombie', 'zombies', 2, 3, 1, { laneRequirement: 'water' })
      const cardTrait = createMockCard('c3', 'Snorkel Zombie', 'zombies', 1, 2, 1, { traits: ['Amphibious'] })
      const cardNormal = createMockCard('c4', 'Peashooter', 'plants', 1, 1, 1)

      expect(isAmphibious(cardBool)).toBe(true)
      expect(isAmphibious(cardReq)).toBe(true)
      expect(isAmphibious(cardTrait)).toBe(true)
      expect(isAmphibious(cardNormal)).toBe(false)
    })

    it('allows playing Amphibious plant into Water lane', () => {
      const state = createInitialGameState()
      const waterLane = state.lanes[4]
      const amphibiousPlant = createMockCard('amph_plant', 'Cattail', 'plants', 3, 3, 2, {
        amphibious: true,
      })

      const val = validateAquaticPlacement(amphibiousPlant, waterLane)
      expect(val.allowed).toBe(true)

      const canPlay = canPlayCardToLane(amphibiousPlant, waterLane, 'plants')
      expect(canPlay.allowed).toBe(true)
    })

    it('allows playing Amphibious zombie into Water lane', () => {
      const state = createInitialGameState()
      const waterLane = state.lanes[4]
      const amphibiousZombie = createMockCard('amph_zombie', 'Submarine Zombie', 'zombies', 4, 4, 3, {
        traits: ['Amphibious'],
      })

      const val = validateAquaticPlacement(amphibiousZombie, waterLane)
      expect(val.allowed).toBe(true)

      const canPlay = canPlayCardToLane(amphibiousZombie, waterLane, 'zombies')
      expect(canPlay.allowed).toBe(true)
    })

    it('blocks playing non-Amphibious plant into Water lane with descriptive error', () => {
      const state = createInitialGameState()
      const waterLane = state.lanes[4]
      const groundPlant = createMockCard('ground_plant', 'Repeater', 'plants', 3, 2, 2)

      const val = validateAquaticPlacement(groundPlant, waterLane)
      expect(val.allowed).toBe(false)
      expect(val.reason).toContain('Amphibious')

      const canPlay = canPlayCardToLane(groundPlant, waterLane, 'plants')
      expect(canPlay.allowed).toBe(false)
      expect(canPlay.reason).toContain('Amphibious')
    })

    it('blocks playing non-Amphibious zombie into Water lane', () => {
      const state = createInitialGameState()
      const waterLane = state.lanes[4]
      const groundZombie = createMockCard('ground_zombie', 'Buckethead', 'zombies', 4, 3, 4)

      const val = validateAquaticPlacement(groundZombie, waterLane)
      expect(val.allowed).toBe(false)

      const canPlay = canPlayCardToLane(groundZombie, waterLane, 'zombies')
      expect(canPlay.allowed).toBe(false)
    })

    it('getValidLanesForCard includes water lane only for amphibious minions', () => {
      const state = createInitialGameState()
      const normalPlant = createMockCard('p_normal', 'Peashooter', 'plants', 1, 1, 1)
      const waterPlant = createMockCard('p_water', 'Amphibious Lily', 'plants', 2, 2, 2, { amphibious: true })

      const validNormal = getValidLanesForCard(state, normalPlant, 'plants')
      expect(validNormal).not.toContain(4)
      expect(validNormal).toEqual([0, 1, 2, 3])

      const validWater = getValidLanesForCard(state, waterPlant, 'plants')
      expect(validWater).toContain(4)
      expect(validWater).toEqual([0, 1, 2, 3, 4])
    })

    it('findAlternativeLaneForCard redirects non-amphibious card from water to valid ground lane', () => {
      const state = createInitialGameState()
      const normalPlant = createMockCard('p_normal', 'Bonk Choy', 'plants', 1, 2, 1)

      // Preferred lane 4 is Water -> non-amphibious cannot be placed there
      const altLane = findAlternativeLaneForCard(state, normalPlant, 'plants', 4)
      expect(altLane).not.toBe(4)
      expect(altLane).toBe(0) // First available ground/heights lane
    })
  })

  // =========================================================================
  // 2. TEAM-UP PLACEMENT & DUAL MINION MECHANICS
  // =========================================================================
  describe('2. Team-Up Placement & Dual Minion Mechanics', () => {
    it('allows playing a Team-Up plant into a lane already occupied by a regular plant', () => {
      let state = createInitialGameState()
      state.phase = 'PLANT_PLAY'
      state.plantHero.sun = 5

      const normalCard = createMockCard('p_base', 'Peashooter', 'plants', 1, 1, 1)
      const teamUpCard = createMockCard('p_wallnut', 'Wall-Nut', 'plants', 1, 0, 6, {
        teamUp: true,
        traits: ['teamUp'],
      })
      state.plantHand = [normalCard, teamUpCard]

      // Play normal plant into Lane 1
      state = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'plants',
        cardId: 'p_base',
        laneIndex: 1,
      })
      expect(state.lanes[1].plantMinion?.name).toBe('Peashooter')
      expect(state.lanes[1].plantTeamUpMinion).toBeNull()

      // Play Team-Up plant into same Lane 1
      state = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'plants',
        cardId: 'p_wallnut',
        laneIndex: 1,
      })
      expect(state.lanes[1].plantMinion?.name).toBe('Peashooter')
      expect(state.lanes[1].plantTeamUpMinion).not.toBeNull()
      expect(state.lanes[1].plantTeamUpMinion?.name).toBe('Wall-Nut')
    })

    it('allows playing a regular plant into a lane occupied by a Team-Up plant', () => {
      let state = createInitialGameState()
      state.phase = 'PLANT_PLAY'
      state.plantHero.sun = 5

      const teamUpCard = createMockCard('p_tu', 'Torchwood', 'plants', 1, 0, 3, { teamUp: true })
      const regularCard = createMockCard('p_reg', 'Snow Pea', 'plants', 2, 2, 2)
      state.plantHand = [teamUpCard, regularCard]

      // Play Team-Up plant first
      state = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'plants',
        cardId: 'p_tu',
        laneIndex: 2,
      })
      expect(state.lanes[2].plantMinion?.name).toBe('Torchwood')

      // Play regular plant behind/with Team-Up plant
      state = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'plants',
        cardId: 'p_reg',
        laneIndex: 2,
      })
      expect(state.lanes[2].plantMinion).not.toBeNull()
      expect(state.lanes[2].plantTeamUpMinion).not.toBeNull()
      expect(state.lanes[2].plantTeamUpMinion?.name).toBe('Snow Pea')
    })

    it('blocks playing a 3rd plant when both plantMinion and plantTeamUpMinion slots are full', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p1', 'Peashooter', 'plants', 1, 2)
      state.lanes[1].plantTeamUpMinion = createMockMinion('p2', 'Wall-Nut', 'plants', 0, 6, { teamUp: true })

      const extraTeamUpCard = createMockCard('p3', 'Torchwood', 'plants', 1, 0, 3, { teamUp: true })
      const canPlay = canPlayCardToLane(extraTeamUpCard, state.lanes[1], 'plants')
      expect(canPlay.allowed).toBe(false)
      expect(canPlay.reason).toContain('chiếm chỗ')
    })

    it('blocks playing a regular plant into a lane with a regular plant when neither has Team-Up', () => {
      const state = createInitialGameState()
      state.lanes[2].plantMinion = createMockMinion('p1', 'Repeater', 'plants', 2, 2)

      const regularCard = createMockCard('p2', 'Bonk Choy', 'plants', 1, 2, 1)
      const canPlay = canPlayCardToLane(regularCard, state.lanes[2], 'plants')
      expect(canPlay.allowed).toBe(false)
      expect(canPlay.reason).toContain('không có Team-Up')
    })
  })

  // =========================================================================
  // 3. TEAM-UP COMBAT RESOLUTION & TARGETING PRIORITY
  // =========================================================================
  describe('3. Team-Up Combat Resolution & Targeting Priority', () => {
    it('forces opposing Zombie to attack the non-Team-Up minion first', () => {
      const state = createInitialGameState()
      // Plant non-Team-Up: Repeater (2 ATK, 4 HP)
      state.lanes[1].plantMinion = createMockMinion('p_non_tu', 'Repeater', 'plants', 2, 4)
      // Plant Team-Up: Wall-Nut (0 ATK, 6 HP)
      state.lanes[1].plantTeamUpMinion = createMockMinion('p_tu', 'Wall-Nut', 'plants', 0, 6, { teamUp: true })
      // Zombie: Regular Zombie (3 ATK, 5 HP)
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Regular Zombie', 'zombies', 3, 5)

      const result = resolveSingleLaneCombat(state, 1)

      // Zombie damage (3) must be directed at the non-Team-Up Repeater (4 - 3 = 1 HP)
      expect(result.updatedState.lanes[1].plantMinion!.currentHealth).toBe(1)
      // Team-Up Wall-Nut takes 0 damage and remains full (6 HP)
      expect(result.updatedState.lanes[1].plantTeamUpMinion!.currentHealth).toBe(6)
    })

    it('attacks the non-Team-Up minion even if placed in the plantTeamUpMinion slot', () => {
      const state = createInitialGameState()
      // plantMinion has Team-Up (Torchwood)
      state.lanes[2].plantMinion = createMockMinion('p_torch', 'Torchwood', 'plants', 0, 3, { teamUp: true })
      // plantTeamUpMinion is non-Team-Up (Bonk Choy)
      state.lanes[2].plantTeamUpMinion = createMockMinion('p_bonk', 'Bonk Choy', 'plants', 2, 4)
      // Zombie (2 ATK, 4 HP)
      state.lanes[2].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 2, 4)

      const result = resolveSingleLaneCombat(state, 2)

      // Non-Team-Up Bonk Choy took 2 damage (4 - 2 = 2 HP)
      expect(result.updatedState.lanes[2].plantTeamUpMinion!.currentHealth).toBe(2)
      // Team-Up Torchwood took 0 damage (3 HP)
      expect(result.updatedState.lanes[2].plantMinion!.currentHealth).toBe(3)
    })

    it('resolves simultaneous attack from both plants against opposing Zombie', () => {
      const state = createInitialGameState()
      // Plant 1: 2 ATK, 3 HP
      state.lanes[1].plantMinion = createMockMinion('p1', 'Peashooter', 'plants', 2, 3)
      // Plant 2 (Team-Up): 3 ATK, 3 HP
      state.lanes[1].plantTeamUpMinion = createMockMinion('p2', 'Threepeater', 'plants', 3, 3, { teamUp: true })
      // Zombie: 1 ATK, 6 HP
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Knight Zombie', 'zombies', 1, 6)

      const result = resolveSingleLaneCombat(state, 1)

      // Total plant attack = 2 + 3 = 5 damage to Zombie (6 - 5 = 1 HP)
      expect(result.updatedState.lanes[1].zombieMinion!.currentHealth).toBe(1)
      // Zombie attacked non-Team-Up plant (3 - 1 = 2 HP)
      expect(result.updatedState.lanes[1].plantMinion!.currentHealth).toBe(2)
      // Team-Up plant took 0 damage
      expect(result.updatedState.lanes[1].plantTeamUpMinion!.currentHealth).toBe(3)
      // Verify both attacks generated combat events
      expect(result.events.some(e => e.attackerName === 'Peashooter')).toBe(true)
      expect(result.events.some(e => e.attackerName.includes('Team-Up'))).toBe(true)
    })

    it('suppresses attack of frozen Team-Up plant while allowing unfrozen partner to strike', () => {
      const state = createInitialGameState()
      // Plant 1: Unfrozen, 3 ATK
      state.lanes[3].plantMinion = createMockMinion('p_active', 'Snapdragon', 'plants', 3, 4)
      // Plant 2 (Team-Up): Frozen, 4 ATK
      state.lanes[3].plantTeamUpMinion = createMockMinion('p_frozen', 'Frozen Navy Bean', 'plants', 4, 3, {
        teamUp: true,
        isFrozen: true,
      })
      // Zombie: 2 ATK, 6 HP
      state.lanes[3].zombieMinion = createMockMinion('z1', 'Gargantuar', 'zombies', 2, 6)

      const result = resolveSingleLaneCombat(state, 3)

      // Zombie takes only 3 damage from unfrozen Snapdragon (6 - 3 = 3 HP)
      expect(result.updatedState.lanes[3].zombieMinion!.currentHealth).toBe(3)
      // Frozen Team-Up plant skipped attack and unfroze
      expect(result.updatedState.lanes[3].plantTeamUpMinion!.isFrozen).toBe(false)
      // Snapdragon took 2 damage from Zombie (4 - 2 = 2 HP)
      expect(result.updatedState.lanes[3].plantMinion!.currentHealth).toBe(2)
    })

    it('redirects surviving Frenzy Zombie bonus attack to Team-Up minion after primary defender dies', () => {
      const state = createInitialGameState()
      state.plantHero.hp = 20

      // Zombie: Frenzy (4 ATK, 5 HP)
      state.lanes[1].zombieMinion = createMockMinion('z_frenzy', 'All-Star Zombie', 'zombies', 4, 5, {
        frenzy: true,
        traits: ['frenzy'],
      })
      // Plant front: 2 HP (destroyed by 4 ATK)
      state.lanes[1].plantMinion = createMockMinion('p_front', 'Fragile Pea', 'plants', 1, 2)
      // Plant Team-Up: 6 HP (survives 4 ATK Frenzy strike with 2 HP)
      state.lanes[1].plantTeamUpMinion = createMockMinion('p_teamup', 'Tough Wall-Nut', 'plants', 0, 6, {
        teamUp: true,
      })

      const result = resolveSingleLaneCombat(state, 1)

      // Front plant destroyed
      expect(result.updatedState.lanes[1].plantMinion).toBeNull()
      // Team-Up minion absorbs the Frenzy attack: 6 - 4 = 2 HP
      expect(result.updatedState.lanes[1].plantTeamUpMinion!.currentHealth).toBe(2)
      // Plant Hero remains protected at full 20 HP
      expect(result.updatedState.plantHero.hp).toBe(20)
      // Frenzy combat event recorded
      expect(result.events.some(e => e.traitsTriggered?.includes('frenzy'))).toBe(true)
    })

    it('deals combined direct face damage to Zombie Hero in an unblocked Team-Up lane', () => {
      const state = createInitialGameState()
      state.zombieHero.hp = 20
      // Two plants in unblocked lane 2: 3 ATK and 2 ATK
      state.lanes[2].plantMinion = createMockMinion('p1', 'Repeater', 'plants', 3, 3)
      state.lanes[2].plantTeamUpMinion = createMockMinion('p2', 'Torchwood', 'plants', 2, 3, { teamUp: true })
      state.lanes[2].zombieMinion = null

      const result = resolveSingleLaneCombat(state, 2)

      // Total direct damage = 3 + 2 = 5 -> Zombie Hero HP = 20 - 5 = 15
      expect(result.updatedState.zombieHero.hp).toBe(15)
      expect(result.events.some(e => e.target === 'hero' && e.damageDealt === 5)).toBe(true)
    })
  })

  // =========================================================================
  // 4. MIXED BOARD & WATER LANE FULL COMBAT INTEGRATION
  // =========================================================================
  describe('4. Mixed Board & Water Lane Full Combat Integration', () => {
    it('executes full board combat correctly across Heights, Ground, and Water lanes', () => {
      const state = createInitialGameState()
      state.plantHero.hp = 20
      state.zombieHero.hp = 20

      // Lane 0 (Heights): Heights Plant (3/3) vs Zombie (2/2) -> Zombie dies, Plant survives with 1 HP
      state.lanes[0].plantMinion = createMockMinion('p_h', 'Heights Pea', 'plants', 3, 3)
      state.lanes[0].zombieMinion = createMockMinion('z_h', 'Heights Zombie', 'zombies', 2, 2)

      // Lane 1 (Ground): Team-Up Lane (2/3 + 1/3) vs Zombie (3/4)
      // Total plant ATK = 3 -> Zombie 4 - 3 = 1 HP
      // Zombie hits non-Team-Up (3 - 3 = 0 HP -> destroyed)
      state.lanes[1].plantMinion = createMockMinion('p_g1', 'Ground Pea', 'plants', 2, 3)
      state.lanes[1].plantTeamUpMinion = createMockMinion('p_g2', 'TeamUp Nut', 'plants', 1, 3, { teamUp: true })
      state.lanes[1].zombieMinion = createMockMinion('z_g', 'Arm Wrestler', 'zombies', 3, 4)

      // Lane 4 (Water): Amphibious Plant (4/3) vs Amphibious Zombie (2/5)
      // Plant deals 4 to Zombie (5 - 4 = 1 HP)
      // Zombie deals 2 to Plant (3 - 2 = 1 HP)
      state.lanes[4].plantMinion = createMockMinion('p_water', 'Navy Bean', 'plants', 4, 3, { amphibious: true })
      state.lanes[4].zombieMinion = createMockMinion('z_water', 'Submarine Imp', 'zombies', 2, 5, { traits: ['Amphibious'] })

      const fullCombat = resolveCombat(state)

      // Lane 0: Zombie defeated, plant survives at 1 HP
      expect(fullCombat.updatedState.lanes[0].zombieMinion).toBeNull()
      expect(fullCombat.updatedState.lanes[0].plantMinion!.currentHealth).toBe(1)

      // Lane 1: Front plant destroyed, Team-Up plant survives, Zombie survives at 1 HP
      expect(fullCombat.updatedState.lanes[1].plantMinion).toBeNull()
      expect(fullCombat.updatedState.lanes[1].plantTeamUpMinion!.currentHealth).toBe(3)
      expect(fullCombat.updatedState.lanes[1].zombieMinion!.currentHealth).toBe(1)

      // Lane 4 (Water): Both survive
      expect(fullCombat.updatedState.lanes[4].plantMinion!.currentHealth).toBe(1)
      expect(fullCombat.updatedState.lanes[4].zombieMinion!.currentHealth).toBe(1)
    })
  })
})
