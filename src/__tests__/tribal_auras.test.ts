import { describe, it, expect } from 'vitest'
import {
  createInitialGameState,
  gameReducer,
  triggerWhenPlayed,
  resolveSingleLaneCombat,
  executeTrick,
  isSportsZombie,
  isScienceZombie,
  isPeaPlant,
  isMushroomPlant,
  type Minion,
  type Card,
} from '../engine'

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

describe('Round 8 - Tribal Synergy Auras & Instant Triggers', () => {
  describe('Tribal Predicates Classification', () => {
    it('isSportsZombie correctly classifies sports zombies and rejects non-sports or plants', () => {
      const coach = createTestMinion('z1', 'Zombie Coach', 'zombies', 3, 3, 'zombie_coach', { tribe: 'Sports Zombie' })
      const wrestler = createTestMinion('z2', 'Arm Wrestler', 'zombies', 2, 2, 'zombie_arm_wrestler', { tribe: 'Sports Zombie' })
      const allStar = createTestMinion('z3', 'All-Star Zombie', 'zombies', 4, 6, 'zombie_football_zombie', { tribe: 'Sports Zombie' })
      const swabbie = createTestMinion('z4', 'Swabbie', 'zombies', 1, 1, 'zombie_swabbie', { tribe: 'Pirate Imp Zombie' })
      const peashooter = createTestMinion('p1', 'Peashooter', 'plants', 1, 1, 'plant_peashooter', { tribe: 'Pea Plant' })

      expect(isSportsZombie(coach)).toBe(true)
      expect(isSportsZombie(wrestler)).toBe(true)
      expect(isSportsZombie(allStar)).toBe(true)
      expect(isSportsZombie(swabbie)).toBe(false)
      expect(isSportsZombie(peashooter)).toBe(false)
    })

    it('isScienceZombie correctly classifies science zombies and rejects non-science', () => {
      const gadget = createTestMinion('z1', 'Gadget Scientist', 'zombies', 2, 3, 'zombie_gadget_scientist', { tribe: 'Science Zombie' })
      const spacetime = createTestMinion('z2', 'Dr. Spacetime', 'zombies', 1, 5, 'zombie_dr_spacetime', { tribe: 'Science Zombie' })
      const interdim = createTestMinion('z3', 'Interdimensional Zombie', 'zombies', 1, 3, 'zombie_interdimensional_zombie', { tribe: 'Science Zombie' })
      const wrestler = createTestMinion('z4', 'Arm Wrestler', 'zombies', 2, 2, 'zombie_arm_wrestler', { tribe: 'Sports Zombie' })

      expect(isScienceZombie(gadget)).toBe(true)
      expect(isScienceZombie(spacetime)).toBe(true)
      expect(isScienceZombie(interdim)).toBe(true)
      expect(isScienceZombie(wrestler)).toBe(false)
    })

    it('isPeaPlant correctly classifies pea plants and rejects non-peas', () => {
      const pea = createTestMinion('p1', 'Peashooter', 'plants', 1, 1, 'plant_peashooter', { tribe: 'Pea Plant' })
      const podfather = createTestMinion('p2', 'The Podfather', 'plants', 2, 2, 'plant_podfather', { tribe: 'Pea Plant' })
      const repeater = createTestMinion('p3', 'Repeater', 'plants', 2, 2, 'plant_repeater', { tribe: 'Pea Plant' })
      const sunflower = createTestMinion('p4', 'Sunflower', 'plants', 0, 1, 'plant_sunflower', { tribe: 'Flower Plant' })

      expect(isPeaPlant(pea)).toBe(true)
      expect(isPeaPlant(podfather)).toBe(true)
      expect(isPeaPlant(repeater)).toBe(true)
      expect(isPeaPlant(sunflower)).toBe(false)
    })

    it('isMushroomPlant correctly classifies mushroom plants and rejects non-mushrooms', () => {
      const buffShroom = createTestMinion('p1', 'Buff-Shroom', 'plants', 1, 1, 'plant_buff_shroom', { tribe: 'Mushroom Plant' })
      const astroShroom = createTestMinion('p2', 'Astro-Shroom', 'plants', 1, 1, 'plant_astro_shroom', { tribe: 'Mushroom Plant' })
      const buttonShroom = createTestMinion('p3', 'Button Mushroom', 'plants', 1, 1, 'plant_button_shroom', { tribe: 'Mushroom Plant' })
      const peashooter = createTestMinion('p4', 'Peashooter', 'plants', 1, 1, 'plant_peashooter', { tribe: 'Pea Plant' })

      expect(isMushroomPlant(buffShroom)).toBe(true)
      expect(isMushroomPlant(astroShroom)).toBe(true)
      expect(isMushroomPlant(buttonShroom)).toBe(true)
      expect(isMushroomPlant(peashooter)).toBe(false)
    })
  })

  describe('1. Sports Synergy: Zombie Coach & Invulnerability', () => {
    it('Zombie Coach grants invulnerability to all friendly Sports Zombies on board this turn', () => {
      let state = createInitialGameState()

      // Lane 1: Arm Wrestler (Sports)
      const wrestler = createTestMinion('z_wrestler', 'Arm Wrestler', 'zombies', 2, 2, 'zombie_arm_wrestler', { tribe: 'Sports Zombie' })
      state.lanes[1].zombieMinion = wrestler

      // Lane 2: Regular Zombie (non-Sports)
      const regularZombie = createTestMinion('z_regular', 'Regular Zombie', 'zombies', 1, 1, 'zombie_regular')
      state.lanes[2].zombieMinion = regularZombie

      // Lane 3: Deploy Zombie Coach (Sports)
      const coach = createTestMinion('z_coach', 'Zombie Coach', 'zombies', 3, 3, 'zombie_coach', { tribe: 'Sports Zombie' })
      state.lanes[3].zombieMinion = coach

      // Trigger Zombie Coach when played
      const triggerRes = triggerWhenPlayed(state, coach, 3, 'zombies')
      state = triggerRes.updatedState

      // Check results:
      // Arm Wrestler must be invulnerable
      expect(state.lanes[1].zombieMinion?.isInvulnerable).toBe(true)
      expect(state.lanes[1].zombieMinion?.invulnerableThisTurn).toBe(true)

      // Regular Zombie must NOT be invulnerable
      expect(state.lanes[2].zombieMinion?.isInvulnerable).toBeFalsy()
      expect(state.lanes[2].zombieMinion?.invulnerableThisTurn).toBeFalsy()

      // Zombie Coach itself must be invulnerable
      expect(state.lanes[3].zombieMinion?.isInvulnerable).toBe(true)
      expect(state.lanes[3].zombieMinion?.invulnerableThisTurn).toBe(true)

      expect(triggerRes.events.some(e => e.includes('Zombie Coach'))).toBe(true)
    })

    it('Invulnerable Sports Zombie takes 0 damage in combat even against lethal/deadly attack', () => {
      let state = createInitialGameState()

      // Plant: 10 Attack with Deadly
      const lethalPlant = createTestMinion('p1', 'Mega Plant', 'plants', 10, 5, 'plant_mega', { deadly: true, traits: ['deadly'] })
      // Zombie: Arm Wrestler with Invulnerability
      const wrestler = createTestMinion('z1', 'Arm Wrestler', 'zombies', 2, 2, 'zombie_arm_wrestler', {
        tribe: 'Sports Zombie',
        isInvulnerable: true,
        invulnerableThisTurn: true,
      })

      state.lanes[1].plantMinion = lethalPlant
      state.lanes[1].zombieMinion = wrestler

      const { updatedState } = resolveSingleLaneCombat(state, 1)

      // Arm Wrestler should take 0 damage and survive with full 2 HP
      expect(updatedState.lanes[1].zombieMinion).not.toBeNull()
      expect(updatedState.lanes[1].zombieMinion?.currentHealth).toBe(2)

      // Lethal plant took 2 damage from Arm Wrestler (5 HP - 2 = 3 HP)
      expect(updatedState.lanes[1].plantMinion?.currentHealth).toBe(3)
    })

    it('Damage tricks deal 0 damage to invulnerable Sports Zombie', () => {
      let state = createInitialGameState()

      const coach = createTestMinion('z1', 'Zombie Coach', 'zombies', 3, 3, 'zombie_coach', {
        tribe: 'Sports Zombie',
        isInvulnerable: true,
        invulnerableThisTurn: true,
      })
      state.lanes[1].zombieMinion = coach

      // Cast Berry Blast (3 damage) on invulnerable Coach
      const berryCard: Card = {
        id: 'plant_berry_blast',
        name: 'Berry Blast',
        side: 'plants',
        cost: 2,
        attack: 0,
        health: 0,
        type: 'trick',
        image: '',
        description: 'Deal 3 damage',
      }

      const res = executeTrick(state, berryCard, 'plants', 1)
      expect(res.success).toBe(true)
      // Coach should remain at full 3 HP
      expect(res.updatedState.lanes[1].zombieMinion?.currentHealth).toBe(3)
      expect(res.message).toContain('Miễn thương')
    })

    it('Invulnerability resets to false when advancing to a new turn', () => {
      let state = createInitialGameState()

      const coach = createTestMinion('z1', 'Zombie Coach', 'zombies', 3, 3, 'zombie_coach', {
        tribe: 'Sports Zombie',
        isInvulnerable: true,
        invulnerableThisTurn: true,
      })
      state.lanes[1].zombieMinion = coach
      state.phase = 'FIGHT'

      // Advance phase to transition to new turn (FIGHT -> ZOMBIE_PLAY)
      const nextTurnState = gameReducer(state, { type: 'NEXT_PHASE' })

      expect(nextTurnState.phase).toBe('ZOMBIE_PLAY')
      expect(nextTurnState.turn).toBe(state.turn + 1)
      expect(nextTurnState.lanes[1].zombieMinion?.isInvulnerable).toBe(false)
      expect(nextTurnState.lanes[1].zombieMinion?.invulnerableThisTurn).toBe(false)
    })
  })

  describe('2. Science Synergy: Gadget Scientist & Bonus Attacks', () => {
    it('Gadget Scientist triggers sequential bonus attacks for all Science Zombies on board', () => {
      let state = createInitialGameState()

      // Lane 0: Science Zombie (Dr. Spacetime 1/5) facing an empty lane (attacks Plant Hero)
      const spacetime = createTestMinion('z0', 'Dr. Spacetime', 'zombies', 1, 5, 'zombie_dr_spacetime', {
        tribe: 'Science Zombie',
      })
      state.lanes[0].zombieMinion = spacetime

      // Lane 1: Science Zombie (Interdimensional Zombie 2/3) facing a Plant (Peashooter 1/2)
      const interdim = createTestMinion('z1', 'Interdimensional Zombie', 'zombies', 2, 3, 'zombie_interdimensional_zombie', {
        tribe: 'Science Zombie',
      })
      const peashooter = createTestMinion('p1', 'Peashooter', 'plants', 1, 2, 'plant_peashooter', {
        tribe: 'Pea Plant',
      })
      state.lanes[1].zombieMinion = interdim
      state.lanes[1].plantMinion = peashooter

      // Lane 2: Non-Science Zombie (Swabbie 1/1)
      const swabbie = createTestMinion('z2', 'Swabbie', 'zombies', 1, 1, 'zombie_swabbie', {
        tribe: 'Pirate Imp Zombie',
      })
      state.lanes[2].zombieMinion = swabbie

      // Lane 3: Deploy Gadget Scientist (2/3 Science Zombie) facing a Wall-Nut (0/6)
      const gadget = createTestMinion('z3', 'Gadget Scientist', 'zombies', 2, 3, 'zombie_gadget_scientist', {
        tribe: 'Science Zombie',
      })
      const wallnut = createTestMinion('p3', 'Wall-Nut', 'plants', 0, 6, 'plant_wall_nut')
      state.lanes[3].zombieMinion = gadget
      state.lanes[3].plantMinion = wallnut

      const initialHeroHealth = state.plantHero.hp

      // Trigger Gadget Scientist when played
      const triggerRes = triggerWhenPlayed(state, gadget, 3, 'zombies')
      const finalState = triggerRes.updatedState

      // 1. Dr. Spacetime in Lane 0 should have performed a bonus attack hitting Plant Hero
      expect(finalState.plantHero.hp).toBeLessThan(initialHeroHealth)

      // 2. Interdimensional Zombie in Lane 1 should have attacked Peashooter for 2 dmg, destroying it
      expect(finalState.lanes[1].plantMinion).toBeNull()

      // 3. Gadget Scientist in Lane 3 should have attacked Wall-Nut (6 HP - 2 = 4 HP)
      expect(finalState.lanes[3].plantMinion?.currentHealth).toBe(4)

      // 4. Events should confirm Gadget Scientist bonus attacks
      expect(triggerRes.events.some(e => e.includes('Gadget Scientist'))).toBe(true)
      expect(triggerRes.events.some(e => e.includes('Bonus Attack'))).toBe(true)
    })
  })

  describe('3. Peas Synergy: The Podfather & Reactive Buffs', () => {
    it('The Podfather buffs any subsequently played Pea minion with +2/+2', () => {
      let state = createInitialGameState()

      // Place Podfather in Lane 1
      const podfather = createTestMinion('p_pod', 'The Podfather', 'plants', 2, 2, 'plant_podfather', {
        tribe: 'Pea Plant',
      })
      state.lanes[1].plantMinion = podfather

      // Now play Peashooter (1/1 Pea) in Lane 2
      const peashooter = createTestMinion('p_pea', 'Peashooter', 'plants', 1, 1, 'plant_peashooter', {
        tribe: 'Pea Plant',
      })
      state.lanes[2].plantMinion = peashooter

      const triggerRes = triggerWhenPlayed(state, peashooter, 2, 'plants')
      const finalState = triggerRes.updatedState

      // Peashooter should now be buffed to 3/3 (+2/+2)
      expect(finalState.lanes[2].plantMinion?.currentAttack).toBe(3)
      expect(finalState.lanes[2].plantMinion?.currentHealth).toBe(3)
      expect(finalState.lanes[2].plantMinion?.baseAttack).toBe(3)
      expect(finalState.lanes[2].plantMinion?.maxHealth).toBe(3)

      // Podfather itself should NOT be buffed (remains 2/2)
      expect(finalState.lanes[1].plantMinion?.currentAttack).toBe(2)
      expect(finalState.lanes[1].plantMinion?.currentHealth).toBe(2)

      expect(triggerRes.events.some(e => e.includes('The Podfather'))).toBe(true)
    })

    it('Non-Pea plants do not receive buff from The Podfather', () => {
      let state = createInitialGameState()

      const podfather = createTestMinion('p_pod', 'The Podfather', 'plants', 2, 2, 'plant_podfather', {
        tribe: 'Pea Plant',
      })
      state.lanes[1].plantMinion = podfather

      // Play Sunflower (0/1 Flower Plant) in Lane 2
      const sunflower = createTestMinion('p_sun', 'Sunflower', 'plants', 0, 1, 'plant_sunflower', {
        tribe: 'Flower Plant',
      })
      state.lanes[2].plantMinion = sunflower

      const triggerRes = triggerWhenPlayed(state, sunflower, 2, 'plants')
      const finalState = triggerRes.updatedState

      // Sunflower should remain 0/1
      expect(finalState.lanes[2].plantMinion?.currentAttack).toBe(0)
      expect(finalState.lanes[2].plantMinion?.currentHealth).toBe(1)
    })

    it('Multiple Podfathers stack (+4/+4 for two Podfathers)', () => {
      let state = createInitialGameState()

      // Podfather 1 in Lane 1
      const pod1 = createTestMinion('p_pod1', 'The Podfather', 'plants', 2, 2, 'plant_podfather', {
        tribe: 'Pea Plant',
      })
      // Podfather 2 in Lane 2
      const pod2 = createTestMinion('p_pod2', 'The Podfather', 'plants', 2, 2, 'plant_podfather', {
        tribe: 'Pea Plant',
      })
      state.lanes[1].plantMinion = pod1
      state.lanes[2].plantMinion = pod2

      // Play Repeater (2/2 Pea) in Lane 3
      const repeater = createTestMinion('p_rep', 'Repeater', 'plants', 2, 2, 'plant_repeater', {
        tribe: 'Pea Plant',
      })
      state.lanes[3].plantMinion = repeater

      const triggerRes = triggerWhenPlayed(state, repeater, 3, 'plants')
      const finalState = triggerRes.updatedState

      // Repeater should receive +4/+4 (2 + 4 = 6 ATK, 2 + 4 = 6 HP)
      expect(finalState.lanes[3].plantMinion?.currentAttack).toBe(6)
      expect(finalState.lanes[3].plantMinion?.currentHealth).toBe(6)
    })
  })

  describe('4. Mushrooms Synergy: Buff-Shroom', () => {
    it('Buff-Shroom grants +1/+1 to all Mushrooms on the board when played', () => {
      let state = createInitialGameState()

      // Lane 1: Button Mushroom (1/1)
      const buttonMushroom = createTestMinion('p1', 'Button Mushroom', 'plants', 1, 1, 'plant_button_shroom', {
        tribe: 'Mushroom Plant',
      })
      state.lanes[1].plantMinion = buttonMushroom

      // Lane 2: Peashooter (1/1 Pea - Non-Mushroom)
      const peashooter = createTestMinion('p2', 'Peashooter', 'plants', 1, 1, 'plant_peashooter', {
        tribe: 'Pea Plant',
      })
      state.lanes[2].plantMinion = peashooter

      // Lane 3: Deploy Buff-Shroom (1/1)
      const buffShroom = createTestMinion('p3', 'Buff-Shroom', 'plants', 1, 1, 'plant_buff_shroom', {
        tribe: 'Mushroom Plant',
      })
      state.lanes[3].plantMinion = buffShroom

      // Lane 3: Team-Up Mushroom in same lane
      const teamUpShroom = createTestMinion('p3_tu', 'Astro-Shroom', 'plants', 1, 1, 'plant_astro_shroom', {
        tribe: 'Mushroom Plant',
        teamUp: true,
      })
      state.lanes[3].plantTeamUpMinion = teamUpShroom

      // Trigger Buff-Shroom ability
      const triggerRes = triggerWhenPlayed(state, buffShroom, 3, 'plants')
      const finalState = triggerRes.updatedState

      // Button Mushroom should be buffed to 2/2 (+1/+1)
      expect(finalState.lanes[1].plantMinion?.currentAttack).toBe(2)
      expect(finalState.lanes[1].plantMinion?.currentHealth).toBe(2)

      // Peashooter should remain 1/1 (not a mushroom)
      expect(finalState.lanes[2].plantMinion?.currentAttack).toBe(1)
      expect(finalState.lanes[2].plantMinion?.currentHealth).toBe(1)

      // Buff-Shroom itself is a Mushroom, so it also gets +1/+1 and becomes 2/2
      expect(finalState.lanes[3].plantMinion?.currentAttack).toBe(2)
      expect(finalState.lanes[3].plantMinion?.currentHealth).toBe(2)

      // Team-up mushroom in Lane 3 also receives +1/+1
      expect(finalState.lanes[3].plantTeamUpMinion?.currentAttack).toBe(2)
      expect(finalState.lanes[3].plantTeamUpMinion?.currentHealth).toBe(2)

      expect(triggerRes.events.some(e => e.includes('Buff-Shroom'))).toBe(true)
    })
  })
})
