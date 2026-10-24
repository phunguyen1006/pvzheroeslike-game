import { describe, it, expect } from 'vitest'
import {
  createInitialGameState,
  triggerWhenPlayed,
  triggerWhenTrickPlayed,
  triggerStartOfTurn,
  resolveSingleLaneCombat,
  resolveCombat,
  executeBonusAttack,
  executeTrick,
  type Minion,
  type Card,
  type GameState,
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

describe('Round 8 - Reaction Triggers System', () => {
  describe('1. Interdimensional Zombie: Science Reactions & 3-Cost Zombie Transformation', () => {
    it('transforms into a random 3-cost Zombie when a Science minion is played', () => {
      let state = createInitialGameState()
      // Place Interdimensional Zombie in Lane 0
      const idz = createTestMinion(
        'idz-1',
        'Interdimensional Zombie',
        'zombies',
        1,
        3,
        'zombie_interdimensional_zombie',
        { tribe: 'Science Zombie' }
      )
      state.lanes[0].zombieMinion = idz

      // Play a Science minion (e.g. Gadget Scientist) in Lane 1
      const scienceCard: Card = {
        id: 'zombie_gadget_scientist_test',
        name: 'Gadget Scientist',
        side: 'zombies',
        team: 'zombies',
        type: 'zombie',
        cost: 5,
        attack: 2,
        health: 3,
        tribe: 'Science Zombie',
        traits: [],
      }

      const playedMinion = createTestMinion(
        'gs-1',
        'Gadget Scientist',
        'zombies',
        2,
        3,
        'zombie_gadget_scientist',
        { tribe: 'Science Zombie' }
      )
      state.lanes[1].zombieMinion = playedMinion

      // Trigger when played
      const result = triggerWhenPlayed(state, playedMinion, 1, 'zombies')
      const lane0Zombie = result.updatedState.lanes[0].zombieMinion

      expect(lane0Zombie).not.toBeNull()
      // Must have transformed away from Interdimensional Zombie
      expect(lane0Zombie!.cardId).not.toBe('zombie_interdimensional_zombie')
      // Transformed zombie must be 3 cost
      const transformedCardDef = ALL_CARDS.find(c => c.id === lane0Zombie!.cardId)
      if (transformedCardDef) {
        expect(transformedCardDef.cost).toBe(3)
      }
      expect(result.events.some(e => (typeof e === 'string' ? e : (e as any)?.description || '').toLowerCase().includes('biến hình'))).toBe(true)
    })

    it('transforms into a random 3-cost Zombie when a Science trick is played', () => {
      let state = createInitialGameState()
      const idz = createTestMinion(
        'idz-2',
        'Interdimensional Zombie',
        'zombies',
        1,
        3,
        'zombie_interdimensional_zombie',
        { tribe: 'Science Zombie' }
      )
      state.lanes[0].zombieMinion = idz

      // Science trick: Rocket Science
      const rocketScienceCard: Card = {
        id: 'zombie_rocket_science',
        name: 'Rocket Science',
        side: 'zombies',
        team: 'zombies',
        type: 'trick',
        cost: 3,
        attack: 0,
        health: 0,
        tribe: 'Science Trick',
        traits: [],
      }

      const result = triggerWhenTrickPlayed(state, rocketScienceCard, 'zombies')
      const lane0Zombie = result.updatedState.lanes[0].zombieMinion

      expect(lane0Zombie).not.toBeNull()
      expect(lane0Zombie!.cardId).not.toBe('zombie_interdimensional_zombie')
      const catalogEntry = ALL_CARDS.find(c => c.id === lane0Zombie!.cardId)
      if (catalogEntry) {
        expect(catalogEntry.cost).toBe(3)
      }
    })

    it('does NOT transform when playing a non-Science minion or trick', () => {
      let state = createInitialGameState()
      const idz = createTestMinion(
        'idz-3',
        'Interdimensional Zombie',
        'zombies',
        1,
        3,
        'zombie_interdimensional_zombie',
        { tribe: 'Science Zombie' }
      )
      state.lanes[0].zombieMinion = idz

      // Non-science minion: Swabbie (Pirate Imp)
      const swabbieCard: Card = {
        id: 'zombie_swabbie_test',
        name: 'Swabbie',
        side: 'zombies',
        team: 'zombies',
        type: 'zombie',
        cost: 0,
        attack: 1,
        health: 1,
        tribe: 'Pirate Imp Zombie',
        traits: ['Amphibious'],
      }

      state.lanes[1].zombieMinion = createTestMinion(
        'sw-1',
        'Swabbie',
        'zombies',
        1,
        1,
        'zombie_swabbie',
        { tribe: 'Pirate Imp Zombie' }
      )

      let result = triggerWhenPlayed(state, state.lanes[1].zombieMinion!, 1, 'zombies')
      expect(result.updatedState.lanes[0].zombieMinion?.cardId).toBe('zombie_interdimensional_zombie')

      // Non-science trick: Bungee Plumber (Professional Trick)
      const bungeeCard: Card = {
        id: 'zombie_bungee_plumber',
        name: 'Bungee Plumber',
        side: 'zombies',
        team: 'zombies',
        type: 'trick',
        cost: 1,
        attack: 0,
        health: 0,
        tribe: 'Professional Trick',
        traits: [],
      }
      result = triggerWhenTrickPlayed(result.updatedState, bungeeCard, 'zombies')
      expect(result.updatedState.lanes[0].zombieMinion?.cardId).toBe('zombie_interdimensional_zombie')
    })

    it('does not transform itself when Interdimensional Zombie enters the board', () => {
      let state = createInitialGameState()
      const idzCard: Card = {
        id: 'zombie_interdimensional_zombie',
        name: 'Interdimensional Zombie',
        side: 'zombies',
        team: 'zombies',
        type: 'zombie',
        cost: 1,
        attack: 1,
        health: 3,
        tribe: 'Science Zombie',
        traits: [],
      }

      const idzMinion = createTestMinion(
        'idz-self',
        'Interdimensional Zombie',
        'zombies',
        1,
        3,
        'zombie_interdimensional_zombie',
        { tribe: 'Science Zombie' }
      )
      state.lanes[0].zombieMinion = idzMinion

      // Triggering when played for this new IDZ
      const result = triggerWhenPlayed(state, idzMinion, 0, 'zombies')
      // It should still be Interdimensional Zombie
      expect(result.updatedState.lanes[0].zombieMinion?.cardId).toBe('zombie_interdimensional_zombie')
    })

    it('transforms multiple active Interdimensional Zombies when a Science card is played', () => {
      let state = createInitialGameState()
      const idz1 = createTestMinion(
        'idz-m1',
        'Interdimensional Zombie',
        'zombies',
        1,
        3,
        'zombie_interdimensional_zombie',
        { tribe: 'Science Zombie' }
      )
      const idz2 = createTestMinion(
        'idz-m2',
        'Interdimensional Zombie',
        'zombies',
        1,
        3,
        'zombie_interdimensional_zombie',
        { tribe: 'Science Zombie' }
      )
      state.lanes[0].zombieMinion = idz1
      state.lanes[1].zombieMinion = idz2

      const scienceCard: Card = {
        id: 'zombie_teleport',
        name: 'Teleport',
        side: 'zombies',
        team: 'zombies',
        type: 'trick',
        cost: 1,
        attack: 0,
        health: 0,
        tribe: 'Science Trick',
        traits: [],
      }

      const result = triggerWhenTrickPlayed(state, scienceCard, 'zombies')
      expect(result.updatedState.lanes[0].zombieMinion?.cardId).not.toBe('zombie_interdimensional_zombie')
      expect(result.updatedState.lanes[1].zombieMinion?.cardId).not.toBe('zombie_interdimensional_zombie')
    })
  })

  describe('2. Banana Launcher: Start of Turn Banana Bomb Generation', () => {
    it('generates a 1-cost Banana Bomb trick in Plant Hero hand at start of turn', () => {
      let state = createInitialGameState()
      state.plantHand = []
      const launcher = createTestMinion(
        'bl-1',
        'Banana Launcher',
        'plants',
        0,
        3,
        'plant_banana_launcher',
        { tribe: 'Banana Plant' }
      )
      state.lanes[2].plantMinion = launcher

      const result = triggerStartOfTurn(state)
      expect(result.updatedState.plantHand.length).toBe(1)

      const generatedCard = result.updatedState.plantHand[0]
      expect(generatedCard.id.startsWith('plant_banana_bomb')).toBe(true)
      expect(generatedCard.name).toBe('Banana Bomb')
      expect(generatedCard.cost).toBe(1)
      expect(generatedCard.type).toBe('trick')
      expect(result.events.some(e => (typeof e === 'string' ? e : (e as any)?.description || '').includes('Banana Launcher'))).toBe(true)
    })

    it('respects 10-card hand limit and does not add Banana Bomb when hand is full', () => {
      let state = createInitialGameState()
      const dummyCard: Card = {
        id: 'dummy_card',
        name: 'Dummy',
        side: 'plants',
        team: 'plants',
        type: 'plant',
        cost: 1,
        attack: 1,
        health: 1,
        traits: [],
      }
      state.plantHand = Array(10).fill(dummyCard)
      const launcher = createTestMinion(
        'bl-2',
        'Banana Launcher',
        'plants',
        0,
        3,
        'plant_banana_launcher'
      )
      state.lanes[1].plantMinion = launcher

      const result = triggerStartOfTurn(state)
      expect(result.updatedState.plantHand.length).toBe(10)
    })

    it('generates 2 Banana Bombs if 2 Banana Launchers are on board', () => {
      let state = createInitialGameState()
      state.plantHand = []
      state.lanes[0].plantMinion = createTestMinion('bl-a', 'Banana Launcher', 'plants', 0, 3, 'plant_banana_launcher')
      state.lanes[2].plantMinion = createTestMinion('bl-b', 'Banana Launcher', 'plants', 0, 3, 'plant_banana_launcher')

      const result = triggerStartOfTurn(state)
      expect(result.updatedState.plantHand.length).toBe(2)
      expect(result.updatedState.plantHand.every(c => c.name === 'Banana Bomb')).toBe(true)
    })

    it('executes generated Banana Bomb trick to deal 1 damage to target zombie', () => {
      let state = createInitialGameState()
      const targetZombie = createTestMinion('target-z', 'Conehead', 'zombies', 2, 4, 'zombie_conehead')
      state.lanes[1].zombieMinion = targetZombie

      const bombCard: Card = {
        id: 'plant_banana_bomb_exec',
        name: 'Banana Bomb',
        side: 'plants',
        team: 'plants',
        type: 'trick',
        cost: 1,
        attack: 0,
        health: 0,
        traits: [],
      }

      const res = executeTrick(state, bombCard, 1)
      expect(res.success).toBe(true)
      expect(res.updatedState.lanes[1].zombieMinion?.currentHealth).toBe(3)
    })
  })

  describe('3. Space Cowboy: Strikethrough & Rightward Lane Movement Trigger', () => {
    it('deals Strikethrough damage to Plant Hero and moves to the right lane (laneIndex + 1)', () => {
      let state = createInitialGameState()
      state.plantHero.hp = 20
      // Place Plant on Lane 1
      state.lanes[1].plantMinion = createTestMinion('p-wall', 'Wall-Nut', 'plants', 0, 6, 'plant_wall_nut')
      // Place Space Cowboy on Lane 1 (3 ATK, 5 HP, Strikethrough)
      const cowboy = createTestMinion(
        'cowboy-1',
        'Space Cowboy',
        'zombies',
        3,
        5,
        'zombie_space_cowboy',
        { traits: ['Strikethrough', 'Amphibious'], strikethrough: true, amphibious: true }
      )
      state.lanes[1].zombieMinion = cowboy

      const combatRes = resolveSingleLaneCombat(state, 1)

      // Plant Hero took 3 Strikethrough damage
      expect(combatRes.updatedState.plantHero.hp).toBe(17)
      // Space Cowboy moved from Lane 1 to Lane 2
      expect(combatRes.updatedState.lanes[1].zombieMinion).toBeNull()
      expect(combatRes.updatedState.lanes[2].zombieMinion).not.toBeNull()
      expect(combatRes.updatedState.lanes[2].zombieMinion?.cardId).toBe('zombie_space_cowboy')
    })

    it('deals direct open lane damage to Plant Hero and moves to the right lane', () => {
      let state = createInitialGameState()
      state.plantHero.hp = 20
      // Open lane 0
      state.lanes[0].plantMinion = null
      const cowboy = createTestMinion(
        'cowboy-2',
        'Space Cowboy',
        'zombies',
        3,
        5,
        'zombie_space_cowboy',
        { traits: ['Strikethrough', 'Amphibious'], strikethrough: true, amphibious: true }
      )
      state.lanes[0].zombieMinion = cowboy

      const combatRes = resolveSingleLaneCombat(state, 0)
      expect(combatRes.updatedState.plantHero.hp).toBe(17)
      expect(combatRes.updatedState.lanes[0].zombieMinion).toBeNull()
      expect(combatRes.updatedState.lanes[1].zombieMinion?.cardId).toBe('zombie_space_cowboy')
    })

    it('does NOT move to the right if the destination lane is already occupied by a Zombie', () => {
      let state = createInitialGameState()
      state.plantHero.hp = 20
      // Lane 1 has Space Cowboy
      const cowboy = createTestMinion('cowboy-3', 'Space Cowboy', 'zombies', 3, 5, 'zombie_space_cowboy', {
        traits: ['Strikethrough'],
        strikethrough: true,
      })
      state.lanes[1].zombieMinion = cowboy
      // Lane 2 already has an Imp
      const imp = createTestMinion('imp-blocker', 'Imp', 'zombies', 1, 1, 'zombie_imp')
      state.lanes[2].zombieMinion = imp

      const combatRes = resolveSingleLaneCombat(state, 1)
      expect(combatRes.updatedState.plantHero.hp).toBe(17)
      // Lane 1 retains Space Cowboy because Lane 2 is occupied
      expect(combatRes.updatedState.lanes[1].zombieMinion?.cardId).toBe('zombie_space_cowboy')
      expect(combatRes.updatedState.lanes[2].zombieMinion?.cardId).toBe('zombie_imp')
    })

    it('cannot move further right when already at the rightmost lane (Lane 4)', () => {
      let state = createInitialGameState()
      state.plantHero.hp = 20
      const cowboy = createTestMinion('cowboy-4', 'Space Cowboy', 'zombies', 3, 5, 'zombie_space_cowboy', {
        traits: ['Strikethrough', 'Amphibious'],
        strikethrough: true,
        amphibious: true,
      })
      state.lanes[4].zombieMinion = cowboy

      const combatRes = resolveSingleLaneCombat(state, 4)
      expect(combatRes.updatedState.plantHero.hp).toBe(17)
      // Stays in Lane 4
      expect(combatRes.updatedState.lanes[4].zombieMinion?.cardId).toBe('zombie_space_cowboy')
    })

    it('does NOT move if Space Cowboy is destroyed during combat (e.g. against lethal Plant)', () => {
      let state = createInitialGameState()
      state.plantHero.hp = 20
      // Plant has 5 attack (lethal to 5 HP Cowboy)
      state.lanes[1].plantMinion = createTestMinion('p-heavy', 'Cactus', 'plants', 5, 2, 'plant_cactus')
      const cowboy = createTestMinion('cowboy-5', 'Space Cowboy', 'zombies', 3, 5, 'zombie_space_cowboy', {
        traits: ['Strikethrough'],
        strikethrough: true,
      })
      state.lanes[1].zombieMinion = cowboy

      const combatRes = resolveSingleLaneCombat(state, 1)
      // Plant Hero still took 3 strikethrough damage
      expect(combatRes.updatedState.plantHero.hp).toBe(17)
      // But Cowboy is destroyed (HP <= 0), so it does NOT move to lane 2
      expect(combatRes.updatedState.lanes[2].zombieMinion).toBeNull()
      expect(combatRes.updatedState.lanes[1].zombieMinion).toBeNull()
    })

    it('does NOT move if damage to Plant Hero is completely blocked by Super-Block', () => {
      let state = createInitialGameState()
      // Setup hero with full block meter ready to block
      state.plantHero.hp = 20
      state.plantHero.blockMeter = 7 // Will trigger super-block next hit
      state.plantHero.superBlocksRemaining = 3

      const cowboy = createTestMinion('cowboy-6', 'Space Cowboy', 'zombies', 3, 5, 'zombie_space_cowboy', {
        traits: ['Strikethrough'],
        strikethrough: true,
      })
      state.lanes[0].zombieMinion = cowboy

      const combatRes = resolveSingleLaneCombat(state, 0)
      // Blocked: actual damage dealt to hero was 0
      expect(combatRes.hasSuperBlock).toBe(true)
      expect(combatRes.updatedState.plantHero.hp).toBe(20)
      // Did not hurt Hero -> does NOT move
      expect(combatRes.updatedState.lanes[0].zombieMinion?.cardId).toBe('zombie_space_cowboy')
      expect(combatRes.updatedState.lanes[1].zombieMinion).toBeNull()
    })

    it('moves rightward when executing a Bonus Attack on Plant Hero', () => {
      let state = createInitialGameState()
      state.plantHero.hp = 20
      const cowboy = createTestMinion('cowboy-7', 'Space Cowboy', 'zombies', 3, 5, 'zombie_space_cowboy', {
        traits: ['Strikethrough'],
        strikethrough: true,
      })
      state.lanes[1].zombieMinion = cowboy

      const bonusRes = executeBonusAttack(state, cowboy, 1, 'zombies')
      expect(bonusRes.updatedState.plantHero.hp).toBe(17)
      expect(bonusRes.updatedState.lanes[1].zombieMinion).toBeNull()
      expect(bonusRes.updatedState.lanes[2].zombieMinion?.cardId).toBe('zombie_space_cowboy')
    })

    it('attacks sequentially across multiple lanes in full resolveCombat', () => {
      let state = createInitialGameState()
      state.plantHero.hp = 20
      // Lane 0 open with Space Cowboy
      const cowboy = createTestMinion('cowboy-8', 'Space Cowboy', 'zombies', 3, 5, 'zombie_space_cowboy', {
        traits: ['Strikethrough', 'Amphibious'],
        strikethrough: true,
        amphibious: true,
      })
      state.lanes[0].zombieMinion = cowboy
      // Lane 1 also open!
      state.lanes[1].zombieMinion = null

      const { updatedState, result } = resolveCombat(state)
      // Space Cowboy attacks in Lane 0 (-3 dmg), moves to Lane 1, attacks in Lane 1 (-3 dmg), moves to Lane 2...
      // Plant Hero took multiple hits
      expect(updatedState.plantHero.hp).toBeLessThan(17)
      expect(result.events.some(e => e.description.includes('di chuyển'))).toBe(true)
    })
  })
})
