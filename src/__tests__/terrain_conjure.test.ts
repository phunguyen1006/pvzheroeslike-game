import { describe, it, expect } from 'vitest'
import {
  createInitialGameState,
  coordinateTerrainAndLaneBuffs,
  conjureCard,
  resolveCombat,
  getDrSpacetimeDiscount,
  getCardSet,
  executeSuperpower,
  type Minion,
} from '../engine'
import { ALL_CARDS } from '../data/cards'

function createTestMinion(
  id: string,
  name: string,
  side: 'plants' | 'zombies',
  attack: number,
  health: number,
  cardId: string,
  extra: Partial<Minion> = {}
): Minion {
  return {
    instanceId: id,
    cardId,
    name,
    side,
    currentAttack: attack,
    baseAttack: attack,
    currentHealth: health,
    maxHealth: health,
    image: '',
    traits: [],
    ...extra,
  }
}

describe('Round 7 - Special Terrain & Lane Buff Coordinator', () => {
  it('Heights lane grants baseline +1/+1 buff to any deployed minion', () => {
    const state = createInitialGameState()
    const peashooter = createTestMinion('p1', 'Peashooter', 'plants', 1, 1, 'plant_peashooter')

    // Coordinate on Lane 0 (Heights)
    const resultHeights = coordinateTerrainAndLaneBuffs(state, peashooter, 0, 'plants')
    expect(resultHeights.updatedMinion.currentAttack).toBe(2)
    expect(resultHeights.updatedMinion.currentHealth).toBe(2)
    expect(resultHeights.events.some(e => e.includes('Đồi Cao'))).toBe(true)

    // Coordinate on Lane 1 (Ground) - should NOT receive Heights buff
    const resultGround = coordinateTerrainAndLaneBuffs(state, peashooter, 1, 'plants')
    expect(resultGround.updatedMinion.currentAttack).toBe(1)
    expect(resultGround.updatedMinion.currentHealth).toBe(1)
  })

  it('Lily of the Valley grants +2/+2 to Plants played on Heights', () => {
    const state = createInitialGameState()
    // Place Lily of the Valley on Lane 1
    state.lanes[1].plantMinion = createTestMinion(
      'lily1',
      'Lily of the Valley',
      'plants',
      1,
      3,
      'plant_lily_of_the_valley'
    )

    const peashooter = createTestMinion('p1', 'Peashooter', 'plants', 1, 1, 'plant_peashooter')

    // Deploy on Heights (Lane 0): base 1/1 + Heights (1/1) + Lily (2/2) = 4/4
    const res = coordinateTerrainAndLaneBuffs(state, peashooter, 0, 'plants')
    expect(res.updatedMinion.currentAttack).toBe(4)
    expect(res.updatedMinion.currentHealth).toBe(4)
    expect(res.events.some(e => e.includes('Lily of the Valley ban phước'))).toBe(true)
  })

  it('Multiple Lily of the Valley entities stack their +2/+2 buff on Heights', () => {
    const state = createInitialGameState()
    // Place 2 Lilies of the Valley on board (Lane 1 and Lane 2)
    state.lanes[1].plantMinion = createTestMinion(
      'lily1',
      'Lily of the Valley',
      'plants',
      1,
      3,
      'plant_lily_of_the_valley'
    )
    state.lanes[2].plantMinion = createTestMinion(
      'lily2',
      'Lily of the Valley',
      'plants',
      1,
      3,
      'plant_lily_of_the_valley'
    )

    const peashooter = createTestMinion('p1', 'Peashooter', 'plants', 1, 1, 'plant_peashooter')

    // Base 1/1 + Heights (1/1) + 2x Lily (4/4) = 6/6
    const res = coordinateTerrainAndLaneBuffs(state, peashooter, 0, 'plants')
    expect(res.updatedMinion.currentAttack).toBe(6)
    expect(res.updatedMinion.currentHealth).toBe(6)
    expect(res.events.some(e => e.includes('+4/+4'))).toBe(true)
  })

  it('Zombies played on Heights get Heights buff but never receive Lily buffs', () => {
    const state = createInitialGameState()
    state.lanes[1].plantMinion = createTestMinion(
      'lily1',
      'Lily of the Valley',
      'plants',
      1,
      3,
      'plant_lily_of_the_valley'
    )

    const swabbie = createTestMinion('s1', 'Swabbie', 'zombies', 1, 1, 'zombie_swabbie')
    const res = coordinateTerrainAndLaneBuffs(state, swabbie, 0, 'zombies')

    // 1/1 Swabbie + Heights (1/1) = 2/2, no Lily buff
    expect(res.updatedMinion.currentAttack).toBe(2)
    expect(res.updatedMinion.currentHealth).toBe(2)
    expect(res.events.some(e => e.includes('Lily of the Valley'))).toBe(false)
  })

  it('Arm Wrestler gets +1/+1 reaction when a Plant enters its lane', () => {
    const state = createInitialGameState()
    // Place Arm Wrestler on Lane 2
    state.lanes[2].zombieMinion = createTestMinion(
      'arm1',
      'Arm Wrestler',
      'zombies',
      2,
      2,
      'zombie_arm_wrestler'
    )

    const sunflower = createTestMinion('sun1', 'Sunflower', 'plants', 0, 1, 'plant_sunflower')
    const res = coordinateTerrainAndLaneBuffs(state, sunflower, 2, 'plants')

    // Arm Wrestler reacted and grew to 3/3
    expect(res.updatedState.lanes[2].zombieMinion?.currentAttack).toBe(3)
    expect(res.updatedState.lanes[2].zombieMinion?.currentHealth).toBe(3)
    expect(res.events.some(e => e.includes('Arm Wrestler'))).toBe(true)
  })

  it('coordinates Environment buffs (Area 22, Laser Base Alpha, Cone Zone, Total Eclipse, Medulla Nebula)', () => {
    // 1. Area 22 (+2/+2 and Frenzy for Zombies)
    const stateArea = createInitialGameState()
    stateArea.lanes[1].environment = {
      id: 'zombie_area_22',
      name: 'Area 22',
      side: 'zombies',
      description: '',
      image: '',
    }
    const swabbie = createTestMinion('s1', 'Swabbie', 'zombies', 1, 1, 'zombie_swabbie')
    const resArea = coordinateTerrainAndLaneBuffs(stateArea, swabbie, 1, 'zombies')
    expect(resArea.updatedMinion.currentAttack).toBe(3)
    expect(resArea.updatedMinion.currentHealth).toBe(3)
    expect(resArea.updatedMinion.frenzy).toBe(true)

    // 2. Laser Base Alpha (Deadly and Strikethrough)
    const stateLaser = createInitialGameState()
    stateLaser.lanes[1].environment = {
      id: 'zombie_laser_base_alpha',
      name: 'Laser Base Alpha',
      side: 'zombies',
      description: '',
      image: '',
    }
    const resLaser = coordinateTerrainAndLaneBuffs(stateLaser, swabbie, 1, 'zombies')
    expect(resLaser.updatedMinion.deadly).toBe(true)
    expect(resLaser.updatedMinion.strikethrough).toBe(true)

    // 3. Cone Zone (+3 HP)
    const stateCone = createInitialGameState()
    stateCone.lanes[1].environment = {
      id: 'zombie_cone_zone',
      name: 'Cone Zone',
      side: 'zombies',
      description: '',
      image: '',
    }
    const resCone = coordinateTerrainAndLaneBuffs(stateCone, swabbie, 1, 'zombies')
    expect(resCone.updatedMinion.currentHealth).toBe(4)

    // 4. Total Eclipse (-1/-1 for Plants)
    const stateEclipse = createInitialGameState()
    stateEclipse.lanes[1].environment = {
      id: 'zombie_total_eclipse',
      name: 'Total Eclipse',
      side: 'zombies',
      description: '',
      image: '',
    }
    const peashooter = createTestMinion('p1', 'Peashooter', 'plants', 2, 2, 'plant_peashooter')
    const resEclipse = coordinateTerrainAndLaneBuffs(stateEclipse, peashooter, 1, 'plants')
    expect(resEclipse.updatedMinion.currentAttack).toBe(1)
    expect(resEclipse.updatedMinion.currentHealth).toBe(1)

    // 5. Medulla Nebula (+2 Brains on Zombie played)
    const stateMedulla = createInitialGameState()
    stateMedulla.zombieHero.brains = 2
    stateMedulla.lanes[1].environment = {
      id: 'zombie_medulla_nebula',
      name: 'Medulla Nebula',
      side: 'zombies',
      description: '',
      image: '',
    }
    const resMedulla = coordinateTerrainAndLaneBuffs(stateMedulla, swabbie, 1, 'zombies')
    expect(resMedulla.updatedState.zombieHero.brains).toBe(4)
  })
})

describe('Round 7 - Generic Conjure Helper (conjureCard)', () => {
  it('conjures a card into the hand with unique instance ID and metadata', () => {
    const state = createInitialGameState()
    state.plantHand = []

    const res = conjureCard(state, 'plants', { count: 1 })
    expect(res.updatedState.plantHand).toHaveLength(1)
    expect(res.conjuredCards).toHaveLength(1)
    expect(res.conjuredCards[0].id).toContain('_conjured_')
    expect(res.events).toHaveLength(1)
  })

  it('respects maximum hand limit of 10 cards', () => {
    const state = createInitialGameState()
    // Fill plant hand to 9 cards
    state.plantHand = Array(9).fill({
      id: 'card_dummy',
      name: 'Dummy',
      side: 'plants',
      cost: 1,
      attack: 1,
      health: 1,
      type: 'minion',
      image: '',
    })

    // Conjure 3 cards, only 1 should be added
    const res = conjureCard(state, 'plants', { count: 3 })
    expect(res.updatedState.plantHand).toHaveLength(10)
    expect(res.conjuredCards).toHaveLength(1)
    expect(res.events.some(e => e.includes('đã đầy'))).toBe(true)
  })

  it('filters by Tribe (e.g. Pea, Science)', () => {
    const state = createInitialGameState()
    state.plantHand = []

    // Conjure Pea tribe
    const resPea = conjureCard(state, 'plants', {
      count: 1,
      filter: { tribe: 'Pea' },
    })
    expect(resPea.conjuredCards).toHaveLength(1)
    const card = resPea.conjuredCards[0]
    const isPea =
      card.tribe?.toLowerCase().includes('pea') ||
      card.name.toLowerCase().includes('pea') ||
      card.id.toLowerCase().includes('pea')
    expect(isPea).toBe(true)

    // Conjure Science tribe
    state.zombieHand = []
    const resScience = conjureCard(state, 'zombies', {
      count: 1,
      filter: { tribe: 'Science' },
    })
    expect(resScience.conjuredCards).toHaveLength(1)
    const sciCard = resScience.conjuredCards[0]
    const isScience =
      sciCard.tribe?.toLowerCase().includes('science') ||
      sciCard.name.toLowerCase().includes('science') ||
      sciCard.id.toLowerCase().includes('science')
    expect(isScience).toBe(true)
  })

  it('filters by Expansion Set (e.g. Galactic Gardens)', () => {
    const state = createInitialGameState()
    state.zombieHand = []

    const res = conjureCard(state, 'zombies', {
      count: 2,
      filter: { set: 'Galactic Gardens' },
    })
    expect(res.conjuredCards).toHaveLength(2)
    for (const c of res.conjuredCards) {
      expect(c.set).toBe('Galactic Gardens')
    }
  })

  it('Dr. Spacetime continuous passive reduces Zombie conjured card cost by 1 Brain', () => {
    const state = createInitialGameState()
    state.zombieHand = []

    // Put 1 Dr. Spacetime on board
    state.lanes[1].zombieMinion = createTestMinion(
      'dr1',
      'Dr. Spacetime',
      'zombies',
      1,
      5,
      'zombie_dr_spacetime'
    )
    expect(getDrSpacetimeDiscount(state, 'zombies')).toBe(1)

    // Target Intergalactic Warlord (base cost 5)
    const res = conjureCard(state, 'zombies', {
      targetCardId: 'zombie_intergalactic_warlord',
    })
    expect(res.conjuredCards).toHaveLength(1)
    // 5 base cost - 1 Dr. Spacetime discount = 4
    expect(res.conjuredCards[0].cost).toBe(4)
    expect(res.events[0]).toContain('Dr. Spacetime')
  })

  it('Multiple Dr. Spacetime entities stack their -1 Brain discount', () => {
    const state = createInitialGameState()
    state.zombieHand = []

    // Put 2 Dr. Spacetimes on board
    state.lanes[1].zombieMinion = createTestMinion(
      'dr1',
      'Dr. Spacetime',
      'zombies',
      1,
      5,
      'zombie_dr_spacetime'
    )
    state.lanes[2].zombieMinion = createTestMinion(
      'dr2',
      'Dr. Spacetime',
      'zombies',
      1,
      5,
      'zombie_dr_spacetime'
    )
    expect(getDrSpacetimeDiscount(state, 'zombies')).toBe(2)

    const res = conjureCard(state, 'zombies', {
      targetCardId: 'zombie_intergalactic_warlord',
    })
    // 5 base cost - 2 Dr. Spacetime discount = 3
    expect(res.conjuredCards[0].cost).toBe(3)
  })

  it('Dr. Spacetime discounts apply across Eureka superpower conjures', () => {
    const state = createInitialGameState()
    state.zombieHand = []

    // Put Dr. Spacetime on board
    state.lanes[1].zombieMinion = createTestMinion(
      'dr1',
      'Dr. Spacetime',
      'zombies',
      1,
      5,
      'zombie_dr_spacetime'
    )

    // Execute Eureka superpower
    const res = executeSuperpower(state, 'sp_eureka', 'zombies')
    expect(res.updatedState.zombieHand).toHaveLength(3)
    // All 3 conjured cards should be discounted by at least 1 Brain
    for (const card of res.updatedState.zombieHand) {
      const originalCard = ALL_CARDS.find(c => c.name === card.name)
      if (originalCard && originalCard.cost > 0) {
        expect(card.cost).toBe(originalCard.cost - 1)
      }
    }
  })

  it('Dr. Spacetime damage trigger conjures discounted Galactic Gardens card in combat', () => {
    const state = createInitialGameState()
    state.zombieHand = []
    // Open lane 2 with Dr. Spacetime attacking directly
    state.lanes[2].plantMinion = null
    state.lanes[2].zombieMinion = createTestMinion(
      'dr1',
      'Dr. Spacetime',
      'zombies',
      1,
      5,
      'zombie_dr_spacetime'
    )

    const { updatedState, result } = resolveCombat(state)
    expect(updatedState.zombieHand).toHaveLength(1)
    const conjured = updatedState.zombieHand[0]
    expect(conjured.set).toBe('Galactic Gardens')
    expect(
      result.events.some(
        e => e.description.includes('Dr. Spacetime Triệu hồi') && e.description.includes('Galactic Gardens')
      )
    ).toBe(true)
  })

  it('getCardSet correctly classifies cards into their respective expansions', () => {
    expect(getCardSet('zombie_dr_spacetime')).toBe('Galactic Gardens')
    expect(getCardSet('zombie_area_22')).toBe('Galactic Gardens')
    expect(getCardSet('plant_dusk_lobber')).toBe('Colossal Fossils')
    expect(getCardSet('plant_gatling_pea')).toBe('Triassic Triumph')
    expect(getCardSet('plant_peashooter')).toBe('Basic')
    expect(getCardSet('plant_bananasaurus_rex')).toBe('Premium')
  })
})
