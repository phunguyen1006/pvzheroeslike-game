import { describe, it, expect } from 'vitest'
import { ZOMBIE_CARDS } from '../data/cards'
import { createInitialGameState } from '../engine/reducer'
import { resolveSingleLaneCombat, resolveCombat } from '../engine/combat'
import { triggerWhenPlayed } from '../engine/abilities'
import { triggerOnDeath } from '../engine/triggers'
import type { GameState, Minion } from '../engine/types'

describe('Zombie Legendary & Super-Rare Cards (Batch 3 & 11)', () => {
  it('all 5 Zombie Legendary & Super-Rare cards exist with authentic stats and attributes', () => {
    // 1. Zombot Sharktronic Sub
    const sharkSub = ZOMBIE_CARDS.find(c => c.id === 'zombie_zombot_sharktronic_sub')
    expect(sharkSub).toBeDefined()
    expect([5, 7]).toContain(sharkSub?.cost)
    expect([3, 4]).toContain(sharkSub?.attack)
    expect([3, 4]).toContain(sharkSub?.hp)
    expect(sharkSub?.rarity).toBe('Legendary')
    expect(sharkSub?.traits?.map(t => t.toLowerCase())).toContain('amphibious')
    expect(sharkSub?.amphibious).toBe(true)

    // 2. Jester
    const jester = ZOMBIE_CARDS.find(c => c.id === 'zombie_jester')
    expect(jester).toBeDefined()
    expect(jester?.cost).toBe(4)
    expect([1, 3]).toContain(jester?.attack)
    expect([4, 5]).toContain(jester?.hp)
    expect(jester?.rarity).toBe('Super-Rare')

    // 3. Smashing Gargantuar
    const smashingGarg = ZOMBIE_CARDS.find(c => c.id === 'zombie_smashing_gargantuar')
    expect(smashingGarg).toBeDefined()
    expect(smashingGarg?.cost).toBe(6)
    expect(smashingGarg?.attack).toBe(6)
    expect(smashingGarg?.hp).toBe(6)
    expect(smashingGarg?.rarity).toBe('Super-Rare')
    expect(smashingGarg?.traits?.map(t => t.toLowerCase())).toContain('frenzy')
    expect(smashingGarg?.frenzy).toBe(true)

    // 4. Turquoise Skull Zombie
    const turquoiseSkull = ZOMBIE_CARDS.find(c => c.id === 'zombie_turquoise_skull_zombie')
    expect(turquoiseSkull).toBeDefined()
    expect(turquoiseSkull?.cost).toBe(5)
    expect(turquoiseSkull?.attack).toBe(5)
    expect(turquoiseSkull?.hp).toBe(5)
    expect(turquoiseSkull?.rarity).toBe('Legendary')

    // 5. Imp-Throwing Gargantuar
    const impGarg = ZOMBIE_CARDS.find(c => c.id === 'zombie_imp_throwing_gargantuar')
    expect(impGarg).toBeDefined()
    expect(impGarg?.cost).toBe(8)
    expect(impGarg?.attack).toBe(8)
    expect(impGarg?.hp).toBe(8)
    expect(impGarg?.rarity).toBe('Legendary')
  })

  it('Zombot Sharktronic Sub: When played, deals 3 damage to up to 3 random plants; if any die, draws 3 cards', () => {
    let state = createInitialGameState()
    state.lanes[0].plantMinion = {
      instanceId: 'p0',
      cardId: 'plant_peashooter',
      name: 'Peashooter',
      side: 'plants',
      currentAttack: 1,
      baseAttack: 1,
      currentHealth: 2,
      maxHealth: 2,
      image: '',
    }
    state.lanes[1].plantMinion = {
      instanceId: 'p1',
      cardId: 'plant_wall_nut',
      name: 'Wall-Nut',
      side: 'plants',
      currentAttack: 0,
      baseAttack: 0,
      currentHealth: 6,
      maxHealth: 6,
      image: '',
    }

    const sharkSubMinion: Minion = {
      instanceId: 'shark1',
      cardId: 'zombie_zombot_sharktronic_sub',
      name: 'Zombot Sharktronic Sub',
      side: 'zombies',
      currentAttack: 3,
      baseAttack: 3,
      currentHealth: 3,
      maxHealth: 3,
      image: '',
    }

    const initialHandCount = state.zombieHand.length
    const res = triggerWhenPlayed(state, sharkSubMinion, 4) // played in water lane 4
    expect(res.updatedState.lanes[0].plantMinion).toBeNull() // Peashooter (2 hp) destroyed by 3 dmg
    expect(res.updatedState.lanes[1].plantMinion?.currentHealth).toBe(3) // Wall-Nut takes 3 dmg (6 - 3 = 3)
    expect(res.updatedState.zombieHand.length).toBe(initialHandCount + 3) // Drew 3 cards!
  })

  it('Jester: Reflects incoming damage back to the attacker', () => {
    let state = createInitialGameState()
    state.lanes[1].plantMinion = {
      instanceId: 'p1',
      cardId: 'plant_repeater',
      name: 'Repeater',
      side: 'plants',
      currentAttack: 2,
      baseAttack: 2,
      currentHealth: 4,
      maxHealth: 4,
      image: '',
    }
    state.lanes[1].zombieMinion = {
      instanceId: 'j1',
      cardId: 'zombie_jester',
      name: 'Jester',
      side: 'zombies',
      currentAttack: 1,
      baseAttack: 1,
      currentHealth: 5,
      maxHealth: 5,
      image: '',
    }

    const res = resolveSingleLaneCombat(state, 1)
    // Repeater attacks Jester for 2. Jester reflects 2 damage back to Repeater.
    // Jester also does normal attack (1 dmg) to Repeater.
    // Total damage to Repeater = 2 (reflected) + 1 (normal) = 3 damage!
    const finalPlant = res.updatedLane?.plantMinion || res.updatedState.lanes[1].plantMinion
    expect(finalPlant?.currentHealth).toBe(1) // 4 - 3 = 1
  })

  it('Smashing Gargantuar: When destroying a Plant, deals 2 damage to all other Plants on board', () => {
    let state = createInitialGameState()
    state.lanes[1].plantMinion = {
      instanceId: 'p1',
      cardId: 'plant_peashooter',
      name: 'Peashooter',
      side: 'plants',
      currentAttack: 1,
      baseAttack: 1,
      currentHealth: 2,
      maxHealth: 2,
      image: '',
    }
    state.lanes[1].zombieMinion = {
      instanceId: 'garg1',
      cardId: 'zombie_smashing_gargantuar',
      name: 'Smashing Gargantuar',
      side: 'zombies',
      currentAttack: 6,
      baseAttack: 6,
      currentHealth: 6,
      maxHealth: 6,
      image: '',
    }

    // Other plants in lane 0 and lane 2
    state.lanes[0].plantMinion = {
      instanceId: 'p0',
      cardId: 'plant_sunflower',
      name: 'Sunflower',
      side: 'plants',
      currentAttack: 0,
      baseAttack: 0,
      currentHealth: 4,
      maxHealth: 4,
      image: '',
    }
    state.lanes[2].plantMinion = {
      instanceId: 'p2',
      cardId: 'plant_sunflower',
      name: 'Sunflower',
      side: 'plants',
      currentAttack: 0,
      baseAttack: 0,
      currentHealth: 2,
      maxHealth: 2,
      image: '',
    }

    const res = resolveSingleLaneCombat(state, 1)
    // Peashooter destroyed by 6 attack Gargantuar
    expect(res.updatedState.lanes[1].plantMinion).toBeNull()
    // Smashing Gargantuar deals 2 shockwave damage to all other plants:
    expect(res.updatedState.lanes[0].plantMinion?.currentHealth).toBe(2) // 4 - 2 = 2
    expect(res.updatedState.lanes[2].plantMinion).toBeNull() // 2 - 2 = 0, destroyed!
  })

  it('Turquoise Skull Zombie: On death, transforms all friendly Zombies on board into 5/5 Turquoise Skull Zombies', () => {
    let state = createInitialGameState()
    const skull: Minion = {
      instanceId: 'skull1',
      cardId: 'zombie_turquoise_skull_zombie',
      name: 'Turquoise Skull Zombie',
      side: 'zombies',
      currentAttack: 5,
      baseAttack: 5,
      currentHealth: 0,
      maxHealth: 5,
      image: '',
    }
    state.lanes[1].zombieMinion = skull

    // Friendlies in lane 0 and 2
    state.lanes[0].zombieMinion = {
      instanceId: 'z0',
      cardId: 'zombie_browncoat',
      name: 'Browncoat Zombie',
      side: 'zombies',
      currentAttack: 1,
      baseAttack: 1,
      currentHealth: 1,
      maxHealth: 1,
      image: '',
    }
    state.lanes[2].zombieMinion = {
      instanceId: 'z2',
      cardId: 'zombie_swabbie',
      name: 'Swabbie',
      side: 'zombies',
      currentAttack: 1,
      baseAttack: 1,
      currentHealth: 1,
      maxHealth: 1,
      image: '',
    }

    const res = triggerOnDeath(state, skull, 1)
    expect(res.updatedState.lanes[0].zombieMinion?.name).toBe('Turquoise Skull Zombie')
    expect(res.updatedState.lanes[0].zombieMinion?.currentAttack).toBe(5)
    expect(res.updatedState.lanes[0].zombieMinion?.currentHealth).toBe(5)

    expect(res.updatedState.lanes[2].zombieMinion?.name).toBe('Turquoise Skull Zombie')
    expect(res.updatedState.lanes[2].zombieMinion?.currentAttack).toBe(5)
    expect(res.updatedState.lanes[2].zombieMinion?.currentHealth).toBe(5)
  })

  it('Imp-Throwing Gargantuar: When damaging Plant Hero, summons a 1/1 Imp in a random empty lane', () => {
    let state = createInitialGameState()
    state.plantHero.hp = 20
    state.lanes[1].zombieMinion = {
      instanceId: 'itg1',
      cardId: 'zombie_imp_throwing_gargantuar',
      name: 'Imp-Throwing Gargantuar',
      side: 'zombies',
      currentAttack: 8,
      baseAttack: 8,
      currentHealth: 8,
      maxHealth: 8,
      image: '',
    }
    // Lane 1 has no plant -> attacks Plant Hero directly
    const res = resolveSingleLaneCombat(state, 1)
    expect(res.updatedState.plantHero.hp).toBe(12) // 20 - 8 = 12

    // Check that an Imp (1/1) was summoned in an empty lane
    const spawnedImpLane = res.updatedState.lanes.find(l => l.zombieMinion?.cardId === 'zombie_swabbie' || l.zombieMinion?.name === 'Imp')
    expect(spawnedImpLane).toBeDefined()
    expect(spawnedImpLane?.zombieMinion?.currentAttack).toBe(1)
    expect(spawnedImpLane?.zombieMinion?.currentHealth).toBe(1)
  })
})
