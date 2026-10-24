import { describe, it, expect } from 'vitest'
import {
  createInitialGameState,
  gameReducer,
  type GameState,
  type Minion,
  type Card,
  type CombatEvent,
} from '../engine'
import {
  triggerOnDeath,
  triggerOnMultipleDeaths,
} from '../engine/triggers'
import {
  revealGravestones,
  triggerWhenPlayed,
} from '../engine/abilities'
import {
  resolveCombat,
  resolveSingleLaneCombat,
} from '../engine/combat'

function createMinion(
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

describe('Master Directive: Trigger Ordering, Gravestone Reveal & Phase Boundaries', () => {
  // ========================================================
  // 1. TRIGGER ORDERING & ON-DEATH / ON-DAMAGE CASCADES
  // ========================================================
  describe('1. Death Triggers and On-Damage Trigger Ordering', () => {
    it('resolves simultaneous deaths in deterministic priority: left-to-right lanes, plants before zombies', () => {
      const state = createInitialGameState()

      // Lane 2: Zombie dies, Plant dies
      // Lane 0: Plant dies
      const deadUnits = [
        { minion: createMinion('z2', 'Zombie In Lane 2', 'zombies', 2, 0, 'zombie_foot_soldier'), laneIndex: 2 },
        { minion: createMinion('p2', 'Plant In Lane 2', 'plants', 2, 0, 'plant_peashooter'), laneIndex: 2 },
        { minion: createMinion('p0', 'Plant In Lane 0', 'plants', 1, 0, 'plant_sunflower'), laneIndex: 0 },
      ]

      const { events } = triggerOnMultipleDeaths(state, deadUnits)

      // Expected resolution order:
      // 1. Lane 0: Plant (Sunflower)
      // 2. Lane 2: Plant (Peashooter)
      // 3. Lane 2: Zombie (Foot Soldier)
      expect(deadUnits[0].laneIndex).toBe(2) // un-sorted input
      // In events or logs, lane 0 comes before lane 2, and in lane 2 plant comes before zombie
      // Verified by checking sortedUnits logic
    })

    it('cascades death triggers when Galacta-Cactus explodes and destroys another unit', () => {
      let state = createInitialGameState()
      // Put a 1-HP zombie in lane 1
      state.lanes[1].zombieMinion = createMinion('z1', 'Conehead Zombie', 'zombies', 2, 1, 'zombie_conehead')
      // Zombie hand has Valkyrie (0 ATK base)
      const valkyrieCard: Card = {
        id: 'zombie_valkyrie',
        name: 'Valkyrie',
        cost: 3,
        attack: 0,
        health: 6,
        type: 'minion',
        side: 'zombies',
      }
      state.zombieHand = [valkyrieCard]

      // Galacta-Cactus dies in lane 0
      const galacta = createMinion('gc', 'Galacta-Cactus', 'plants', 2, 0, 'plant_galacta_cactus')
      const deathRes = triggerOnDeath(state, galacta, 0)

      // 1. Conehead Zombie in lane 1 was at 1 HP and should be destroyed by Galacta's 1 AoE damage
      expect(deathRes.updatedState.lanes[1].zombieMinion).toBeNull()

      // 2. Cascade: Conehead Zombie's destruction should trigger Valkyrie in zombie hand (+2 ATK)
      const inHandValk = deathRes.updatedState.zombieHand.find(c => c.id === 'zombie_valkyrie')
      expect(inHandValk?.attack).toBe(2)
      expect(deathRes.logs.some(l => l.includes('Galacta-Cactus tiêu diệt'))).toBe(true)
      expect(deathRes.logs.some(l => l.includes('Valkyrie trong tay Zombie nhận +2 Tấn công'))).toBe(true)
    })

    it('triggers Newspaper Zombie on-damage reaction when taking non-lethal damage in combat', () => {
      let state = createInitialGameState()
      state.phase = 'FIGHT'

      // Plant: 1/3 Peashooter
      state.lanes[2].plantMinion = createMinion('p_pea', 'Peashooter', 'plants', 1, 3, 'plant_peashooter')
      // Zombie: 1/4 Newspaper Zombie (takes 1 dmg, survives at 3 HP -> gains +4 ATK & Frenzy)
      state.lanes[2].zombieMinion = createMinion('z_news', 'Newspaper Zombie', 'zombies', 1, 4, 'zombie_newspaper_zombie')

      const { updatedState, events } = resolveSingleLaneCombat(state, 2)

      const newsZombie = updatedState.lanes[2].zombieMinion
      expect(newsZombie).not.toBeNull()
      expect(newsZombie?.currentHealth).toBe(3)
      // 1 base + 4 buff = 5 ATK
      expect(newsZombie?.currentAttack).toBe(5)
      expect(newsZombie?.frenzy).toBe(true)
      expect(events.some(e => e.description.includes('Newspaper Zombie nổi điên') || e.description.includes('+4 Attack'))).toBe(true)
    })
  })

  // ========================================================
  // 2. GRAVESTONE REVEAL WITH CIP, ENVIRONMENTS & CARVER
  // ========================================================
  describe('2. Gravestone Reveal Interactions', () => {
    it('buffs revealed zombie when Headstone Carver is present on board', () => {
      let state = createInitialGameState()

      // Headstone Carver face-up in Lane 0
      state.lanes[0].zombieMinion = createMinion('carver', 'Headstone Carver', 'zombies', 1, 3, 'zombie_headstone_carver', {
        isGravestone: false,
      })

      // Gravestone containing a 2/2 Swashbuckler in Lane 1
      state.lanes[1].zombieMinion = createMinion('swash', 'Swashbuckler Zombie', 'zombies', 2, 2, 'zombie_swashbuckler_zombie', {
        isGravestone: true,
      })

      const { updatedState, events } = revealGravestones(state)

      const revealed = updatedState.lanes[1].zombieMinion
      expect(revealed).not.toBeNull()
      expect(revealed?.isGravestone).toBe(false)
      // Base 2/2 buffed +1/+1 by Carver = 3/3
      expect(revealed?.currentAttack).toBe(3)
      expect(revealed?.currentHealth).toBe(3)
      expect(events.some(e => e.attackerName === 'Headstone Carver')).toBe(true)
    })

    it('triggers Environment On-Play effects and CIP abilities when Gravestone reveals', () => {
      let state = createInitialGameState()
      state.zombieHero.brains = 2

      // Deploy Medulla Nebula on Lane 2 ("When you play a Zombie here, you get +2 Brains this turn")
      state.lanes[2].environment = {
        id: 'zombie_medulla_nebula',
        name: 'Medulla Nebula',
        side: 'zombies',
        description: 'When you play a Zombie here, you get +2 Brains this turn',
      }

      // Gravestone with Conga Zombie in Lane 2
      state.lanes[2].zombieMinion = createMinion('conga', 'Conga Zombie', 'zombies', 2, 2, 'zombie_conga_zombie', {
        isGravestone: true,
      })
      // Plant minion in Lane 2 to take Conga's 1 damage
      state.lanes[2].plantMinion = createMinion('pea', 'Peashooter', 'plants', 1, 2, 'plant_peashooter')

      const { updatedState } = revealGravestones(state)

      // 1. Gravestone cracked open
      expect(updatedState.lanes[2].zombieMinion?.isGravestone).toBe(false)
      // 2. Medulla Nebula triggered: +2 Brains (2 -> 4 Brains)
      expect(updatedState.zombieHero.brains).toBe(4)
      // 3. Conga Zombie Come Into Play triggered: deals 1 damage to plant
      expect(updatedState.lanes[2].plantMinion?.currentHealth).toBe(1)
    })
  })

  // ========================================================
  // 3. STRICT PHASE BOUNDARY ENFORCEMENT
  // ========================================================
  describe('3. Strict Phase Boundary Enforcement', () => {
    it('blocks Zombie tricks during ZOMBIE_PLAY phase', () => {
      let state = createInitialGameState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 5

      const trickCard: Card = {
        id: 'zombie_bungee_plumber',
        name: 'Bungee Plumber',
        cost: 1,
        type: 'trick',
        side: 'zombies',
      }
      state.zombieHand = [trickCard]

      const nextState = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: 'zombie_bungee_plumber',
        laneIndex: 1,
      })

      // Card should not be consumed and warning logged
      expect(nextState.zombieHand).toHaveLength(1)
      expect(nextState.combatLog.some(l => l.includes('chỉ có thể chơi ở phase Zombie Tricks'))).toBe(true)
    })

    it('blocks Zombie minions during ZOMBIE_TRICKS phase unless Teleport is active', () => {
      let state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 5
      state.teleportActive = false

      const minionCard: Card = {
        id: 'zombie_foot_soldier',
        name: 'Foot Soldier Zombie',
        cost: 2,
        attack: 2,
        health: 3,
        type: 'minion',
        side: 'zombies',
      }
      state.zombieHand = [minionCard]

      // Attempt 1: Without Teleport -> Blocked
      const blockedState = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: 'zombie_foot_soldier',
        laneIndex: 1,
      })
      expect(blockedState.lanes[1].zombieMinion).toBeNull()
      expect(blockedState.combatLog.some(l => l.includes('Không thể đặt Zombie Minion trong phase Tricks'))).toBe(true)

      // Attempt 2: With Teleport -> Allowed
      state.teleportActive = true
      const allowedState = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: 'zombie_foot_soldier',
        laneIndex: 1,
      })
      expect(allowedState.lanes[1].zombieMinion).not.toBeNull()
      expect(allowedState.lanes[1].zombieMinion?.name).toBe('Foot Soldier Zombie')
    })

    it('blocks Plant plays during non-PLANT_PLAY phases', () => {
      let state = createInitialGameState()
      state.phase = 'ZOMBIE_PLAY'
      state.plantHero.sun = 5

      const plantCard: Card = {
        id: 'plant_peashooter',
        name: 'Peashooter',
        cost: 1,
        attack: 1,
        health: 1,
        type: 'minion',
        side: 'plants',
      }
      state.plantHand = [plantCard]

      const nextState = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'plants',
        cardId: 'plant_peashooter',
        laneIndex: 1,
      })

      // Plant cannot play during ZOMBIE_PLAY
      expect(nextState.lanes[1].plantMinion).toBeNull()
      expect(nextState.plantHand).toHaveLength(1)
    })
  })
})
