import { describe, it, expect } from 'vitest'
import {
  createInitialGameState,
  resolveSingleLaneCombat,
  triggerBonusAttack,
  executeTrick,
  executeSuperpower,
} from '../engine/index'
import { resolveCombat } from '../engine/combat'
import type { Minion, Card } from '../engine/types'

describe('Engine Frozen State Mechanics & Bonus Attack Suppression', () => {
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
    type: 'minion' | 'trick' | 'environment' | 'superpower' = 'trick',
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

  // 1. Plant Frozen Minion cannot perform Bonus Attack via triggerBonusAttack
  it('prevents a frozen plant minion from executing a bonus attack via triggerBonusAttack', () => {
    const state = createInitialGameState()
    state.lanes[0].plantMinion = createMockMinion('p1', 'Peashooter', 'plants', 4, 4, { isFrozen: true })
    state.lanes[0].zombieMinion = createMockMinion('z1', 'Regular Zombie', 'zombies', 2, 5)

    const result = triggerBonusAttack(state, 0, 'plants')
    expect(result.events.length).toBe(0)
    expect(result.logs.some(l => l.includes('đang bị đóng băng') || l.includes('Frozen'))).toBe(true)
    expect(result.updatedState.lanes[0].zombieMinion!.currentHealth).toBe(5)
  })

  // 2. Zombie Frozen Minion cannot perform Bonus Attack via triggerBonusAttack
  it('prevents a frozen zombie minion from executing a bonus attack via triggerBonusAttack', () => {
    const state = createInitialGameState()
    state.lanes[1].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 3, 4, { isFrozen: true })
    state.lanes[1].plantMinion = createMockMinion('p1', 'Sunflower', 'plants', 0, 3)

    const result = triggerBonusAttack(state, 1, 'zombies')
    expect(result.events.length).toBe(0)
    expect(result.logs.some(l => l.includes('đang bị đóng băng') || l.includes('Frozen'))).toBe(true)
    expect(result.updatedState.lanes[1].plantMinion!.currentHealth).toBe(3)
  })

  // 3. Lurch for Lunch: Frozen Zombie cannot Bonus Attack
  it('prevents a frozen zombie from bonus attacking when Lurch for Lunch is played', () => {
    const state = createInitialGameState()
    state.lanes[2].zombieMinion = createMockMinion('z_frozen', 'Super Zombie', 'zombies', 5, 5, { isFrozen: true })
    state.lanes[2].plantMinion = createMockMinion('p_target', 'Wall-Nut', 'plants', 0, 6)

    const lurchCard = createMockCard('zombie_lurch_for_lunch', 'Lurch for Lunch', 'zombies', 2, 'trick')
    const result = executeTrick(state, lurchCard, 2)

    expect(result.message).toContain('đang bị đóng băng')
    expect(result.updatedState.lanes[2].plantMinion!.currentHealth).toBe(6)
  })

  // 4. Lurch for Lunch: Non-frozen Zombie successfully Bonus Attacks
  it('allows an unfrozen zombie to bonus attack and deal damage via Lurch for Lunch', () => {
    const state = createInitialGameState()
    state.lanes[2].zombieMinion = createMockMinion('z_active', 'Strong Zombie', 'zombies', 4, 5, { isFrozen: false })
    state.lanes[2].plantMinion = createMockMinion('p_target', 'Tall-Nut', 'plants', 0, 6)

    const lurchCard = createMockCard('zombie_lurch_for_lunch', 'Lurch for Lunch', 'zombies', 2, 'trick')
    const result = executeTrick(state, lurchCard, 2)

    expect(result.message).toContain('tấn công bất ngờ')
    expect(result.updatedState.lanes[2].plantMinion!.currentHealth).toBe(2)
  })

  // 5. Carried Away: Frozen Zombie moves but does NOT Bonus Attack
  it('moves a frozen zombie to destination lane but suppresses its bonus attack in Carried Away', () => {
    const state = createInitialGameState()
    state.lanes[0].zombieMinion = createMockMinion('z_runner', 'Dancer Zombie', 'zombies', 4, 3, { isFrozen: true })
    state.lanes[1].plantMinion = createMockMinion('p1', 'Repeater', 'plants', 2, 4)

    const result = executeSuperpower(state, 'zombie_carried_away', 'zombies', 1)

    // Zombie should be moved to lane 1
    expect(result.updatedState.lanes[0].zombieMinion).toBeNull()
    expect(result.updatedState.lanes[1].zombieMinion).not.toBeNull()
    expect(result.updatedState.lanes[1].zombieMinion!.name).toBe('Dancer Zombie')
    expect(result.message).toContain('không thể Bonus Attack')
    // Opposing plant took no damage
    expect(result.updatedState.lanes[1].plantMinion!.currentHealth).toBe(4)
  })

  // 6. Carried Away: Non-frozen Zombie moves and performs Bonus Attack
  it('moves an unfrozen zombie and executes bonus attack on opposing minion in Carried Away', () => {
    const state = createInitialGameState()
    state.lanes[0].zombieMinion = createMockMinion('z_active', 'Active Zombie', 'zombies', 3, 3, { isFrozen: false })
    state.lanes[2].plantMinion = createMockMinion('p2', 'Cactus', 'plants', 1, 5)

    const result = executeSuperpower(state, 'zombie_carried_away', 'zombies', 2)

    expect(result.updatedState.lanes[0].zombieMinion).toBeNull()
    expect(result.updatedState.lanes[2].zombieMinion).not.toBeNull()
    expect(result.message).toContain('kích hoạt Bonus Attack')
    expect(result.updatedState.lanes[2].plantMinion!.currentHealth).toBe(2)
  })

  // 7. Gadget Scientist: Suppresses Bonus Attack only for frozen Science Zombies
  it('suppresses bonus attack for frozen science zombies while allowing unfrozen ones to attack', () => {
    const state = createInitialGameState()
    state.lanes[1].zombieMinion = createMockMinion('z_sci_frozen', 'Scientist 1', 'zombies', 3, 3, {
      isFrozen: true,
      traits: ['science'],
      tribe: 'Science Zombie',
    })
    state.lanes[1].plantMinion = createMockMinion('p1', 'Pea 1', 'plants', 1, 5)

    state.lanes[2].zombieMinion = createMockMinion('z_sci_active', 'Scientist 2', 'zombies', 4, 3, {
      isFrozen: false,
      traits: ['science'],
      tribe: 'Science Zombie',
    })
    state.lanes[2].plantMinion = createMockMinion('p2', 'Pea 2', 'plants', 1, 6)

    // Trigger Gadget Scientist via triggerBonusAttack directly or play ability
    const resFrozen = triggerBonusAttack(state, 1, 'zombies')
    expect(resFrozen.events.length).toBe(0)
    expect(resFrozen.logs.some(l => l.includes('đang bị đóng băng'))).toBe(true)
    expect(resFrozen.updatedState.lanes[1].plantMinion!.currentHealth).toBe(5)

    const resActive = triggerBonusAttack(state, 2, 'zombies')
    expect(resActive.events.length).toBeGreaterThan(0)
    expect(resActive.updatedState.lanes[2].plantMinion!.currentHealth).toBe(2)
  })

  // 8. Frozen minion defends normally during combat (takes full damage from opponent)
  it('allows a frozen zombie to defend and receive damage from opposing plant while dealing 0 damage', () => {
    const state = createInitialGameState()
    state.lanes[0].plantMinion = createMockMinion('p_atk', 'Bonk Choy', 'plants', 3, 4)
    state.lanes[0].zombieMinion = createMockMinion('z_def', 'Knight Zombie', 'zombies', 4, 6, { isFrozen: true })

    const result = resolveSingleLaneCombat(state, 0)

    // Plant deals 3 damage to Zombie
    expect(result.updatedState.lanes[0].zombieMinion!.currentHealth).toBe(3)
    // Frozen Zombie dealt 0 damage to Plant
    expect(result.updatedState.lanes[0].plantMinion!.currentHealth).toBe(4)
  })

  // 9. Frozen minion unfreezes after skipping its attack in combat
  it('unfreezes a frozen minion after skipping its attack phase in combat resolution', () => {
    const state = createInitialGameState()
    state.lanes[1].plantMinion = createMockMinion('p_frozen', 'Frozen Pea', 'plants', 2, 4, { isFrozen: true })
    state.lanes[1].zombieMinion = createMockMinion('z_atk', 'Imp', 'zombies', 1, 3)

    expect(state.lanes[1].plantMinion!.isFrozen).toBe(true)

    const result = resolveSingleLaneCombat(state, 1)

    // Plant skipped attack and unfroze
    expect(result.updatedState.lanes[1].plantMinion!.isFrozen).toBe(false)
    // Zombie was able to attack
    expect(result.updatedState.lanes[1].plantMinion!.currentHealth).toBe(3)
    // Zombie took 0 damage because plant was frozen
    expect(result.updatedState.lanes[1].zombieMinion!.currentHealth).toBe(3)
  })

  // 10. Previously unfrozen minion attacks normally in the subsequent combat turn
  it('allows an unchilled/unfrozen minion to attack normally in the next combat round', () => {
    const state = createInitialGameState()
    state.lanes[3].plantMinion = createMockMinion('p1', 'Shooter', 'plants', 3, 5, { isFrozen: true })
    state.lanes[3].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 2, 8)

    // Round 1: Plant is frozen -> unfreezes
    const round1 = resolveSingleLaneCombat(state, 3)
    expect(round1.updatedState.lanes[3].plantMinion!.isFrozen).toBe(false)
    expect(round1.updatedState.lanes[3].zombieMinion!.currentHealth).toBe(8) // No damage dealt

    // Prepare Round 2 state with the unfrozen plant
    const state2 = createInitialGameState()
    state2.lanes[3] = round1.updatedState.lanes[3]

    // Round 2: Plant is no longer frozen -> deals full 3 damage
    const round2 = resolveSingleLaneCombat(state2, 3)
    expect(round2.updatedState.lanes[3].zombieMinion!.currentHealth).toBe(5)
  })

  // 11. Frozen minion in an open lane deals 0 face damage to enemy Hero
  it('deals 0 direct face damage to enemy Hero when minion in open lane is frozen', () => {
    const state = createInitialGameState()
    state.zombieHero.hp = 20
    state.lanes[2].plantMinion = createMockMinion('p_open_frozen', 'Mega Plant', 'plants', 6, 4, { isFrozen: true })
    state.lanes[2].zombieMinion = null

    const result = resolveCombat(state)

    // Zombie hero takes 0 damage
    expect(result.updatedState.zombieHero.hp).toBe(20)
    // Plant unfreezes
    expect(result.updatedState.lanes[2].plantMinion!.isFrozen).toBe(false)
  })

  // 12. Snow Pea attack freezes opposing zombie and buffs Snowdrop
  it('freezes enemy zombie on Snow Pea hit and triggers +2/+2 buff on Snowdrop', () => {
    const state = createInitialGameState()
    state.lanes[0].plantMinion = createMockMinion('snowdrop', 'Snowdrop', 'plants', 1, 2, { cardId: 'plant_snowdrop' })
    state.lanes[1].plantMinion = createMockMinion('snow_pea', 'Snow Pea', 'plants', 2, 2, {
      cardId: 'plant_snow_pea',
      freeze: true,
      traits: ['freeze'],
    })
    state.lanes[1].zombieMinion = createMockMinion('z_target', 'Buckethead', 'zombies', 3, 5)

    const result = resolveSingleLaneCombat(state, 1)

    // Zombie should be frozen by Snow Pea
    expect(result.updatedState.lanes[1].zombieMinion!.isFrozen).toBe(true)
    // Snowdrop in lane 0 should be buffed +2/+2
    expect(result.updatedState.lanes[0].plantMinion!.currentAttack).toBe(3)
    expect(result.updatedState.lanes[0].plantMinion!.currentHealth).toBe(4)
  })

  // 13. Winter Squash destroys opposing zombie immediately when it gets frozen
  it('instantly destroys zombie when Winter Squash is present on board and zombie is frozen', () => {
    const state = createInitialGameState()
    state.lanes[0].plantMinion = createMockMinion('winter_squash', 'Winter Squash', 'plants', 2, 6, { cardId: 'plant_winter_squash' })
    state.lanes[2].plantMinion = createMockMinion('snow_pea', 'Snow Pea', 'plants', 2, 2, {
      cardId: 'plant_snow_pea',
      freeze: true,
      traits: ['freeze'],
    })
    state.lanes[2].zombieMinion = createMockMinion('z_gargantuar', 'Gargantuar', 'zombies', 5, 8)

    const result = resolveSingleLaneCombat(state, 2)

    // Zombie should be destroyed immediately (removed / null)
    expect(result.updatedState.lanes[2].zombieMinion).toBeNull()
    expect(result.events.some(e => e.description.includes('Winter Squash tiêu diệt'))).toBe(true)
  })

  // 14. Frozen Plant suppresses Time to Shine or Plant Food bonus attacks
  it('suppresses bonus attack when plant is frozen even if bonus attack is triggered', () => {
    const state = createInitialGameState()
    state.lanes[4].plantMinion = createMockMinion('p_amphibious', 'Frozen Navy Bean', 'plants', 4, 4, { isFrozen: true })
    state.lanes[4].zombieMinion = createMockMinion('z_diver', 'Diver Zombie', 'zombies', 2, 4)

    const bonusRes = triggerBonusAttack(state, 4, 'plants')
    expect(bonusRes.events.length).toBe(0)
    expect(bonusRes.logs.some(l => l.includes('đang bị đóng băng') || l.includes('Frozen'))).toBe(true)
    expect(bonusRes.updatedState.lanes[4].zombieMinion!.currentHealth).toBe(4)
  })
})
