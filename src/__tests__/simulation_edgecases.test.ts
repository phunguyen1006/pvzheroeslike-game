import { describe, it, expect } from 'vitest'
import {
  createInitialGameState,
  gameReducer,
} from '../engine/reducer'
import { resolveCombat } from '../engine/combat'
import { executeTrick } from '../engine/tricks'
import { getCardById } from '../data/cards'
import type { Card, Minion } from '../engine/types'

function convertCard(data: any, side: 'plants' | 'zombies'): Card {
  return {
    id: data.id,
    name: data.name,
    side,
    cost: data.cost ?? 0,
    attack: data.attack ?? 0,
    health: data.hp ?? data.health ?? 0,
    type: data.type === 'plant' || data.type === 'zombie' ? 'minion' : data.type,
    traits: data.traits ?? [],
    amphibious: data.amphibious,
    bullseye: data.bullseye,
    teamUp: data.teamUp,
    frenzy: data.frenzy,
    deadly: data.deadly,
    strikethrough: data.strikethrough,
    armored: data.armored,
    freeze: data.freeze,
    antiHero: data.antiHero,
    doubleStrike: data.doubleStrike,
    gravestone: data.gravestone || data.traits?.includes('Gravestone') || data.traits?.includes('gravestone'),
    image: data.image ?? data.assetPath ?? '',
    description: data.description,
  }
}

const createMockMinion = (
  instanceId: string,
  name: string,
  side: 'plants' | 'zombies',
  attack: number,
  health: number,
  options: Partial<Minion> = {}
): Minion => ({
  instanceId,
  cardId: `card-${instanceId}`,
  name,
  side,
  currentAttack: attack,
  baseAttack: attack,
  currentHealth: health,
  maxHealth: health,
  image: `/assets/${name}.png`,
  traits: [],
  ...options,
})

describe('Full Game Simulation & Complex Edge Cases Test Suite', () => {
  describe('1. Full Game Simulation Integration Test (End-to-End Cycle)', () => {
    it('simulates a complete turn progression: Mulligan -> Zombie Play -> Plant Play -> Zombie Tricks -> Fight -> Super-Block -> Superpower', () => {
      // 1. Initial State & MULLIGAN Phase
      let state = createInitialGameState('hero_green_shadow', 'hero_super_brainz')
      state.phase = 'MULLIGAN'
      expect(state.phase).toBe('MULLIGAN')
      expect(state.turn).toBe(1)
      expect(state.plantHand.length).toBe(5)
      expect(state.zombieHand.length).toBe(5)

      // 2. Perform Mulligan swap for plants and finish
      state = gameReducer(state, {
        type: 'MULLIGAN_SWAP',
        side: 'plants',
        cardIndices: [0, 1],
      })
      expect(state.plantHand.length).toBe(5)

      state = gameReducer(state, {
        type: 'FINISH_MULLIGAN',
        side: 'plants',
      })
      expect(state.phase).toBe('ZOMBIE_PLAY')

      // 3. ZOMBIE_PLAY Phase: Zombie plays a minion on Lane 1
      state.zombieHero.brains = 2
      const coneheadCard = convertCard(getCardById('zombie_conehead')!, 'zombies')
      state.zombieHand = [coneheadCard]

      state = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: coneheadCard.id,
        laneIndex: 1,
      })
      expect(state.lanes[1].zombieMinion?.name).toBe('Conehead Zombie')
      expect(state.zombieHero.brains).toBe(0) // 2 - 2 = 0

      // 4. Transition to PLANT_PLAY
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('PLANT_PLAY')

      // Plant plays Peashooter on Lane 1 (blocking Conehead) and Snow Pea on Lane 2 (open lane)
      state.plantHero.sun = 3
      const peashooterCard = convertCard(getCardById('plant_peashooter')!, 'plants')
      const snowpeaCard = convertCard(getCardById('plant_snow_pea')!, 'plants')
      state.plantHand = [peashooterCard, snowpeaCard]

      state = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'plants',
        cardId: peashooterCard.id,
        laneIndex: 1,
      })
      expect(state.lanes[1].plantMinion?.name).toBe('Peashooter')
      expect(state.plantHero.sun).toBe(2)

      state = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'plants',
        cardId: snowpeaCard.id,
        laneIndex: 2,
      })
      expect(state.lanes[2].plantMinion?.name).toBe('Snow Pea')
      expect(state.plantHero.sun).toBe(0)

      // 5. Transition to ZOMBIE_TRICKS
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('ZOMBIE_TRICKS')

      // Zombie plays Bungee Plumber targeting Peashooter on Lane 1
      state.zombieHero.brains = 1
      const bungeeCard = convertCard(getCardById('zombie_bungee_plumber')!, 'zombies')
      state.zombieHand = [bungeeCard]

      state = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: bungeeCard.id,
        laneIndex: 1,
      })
      // Peashooter (1 HP) takes 2 damage from Bungee Plumber -> Destroyed!
      expect(state.lanes[1].plantMinion).toBeNull()
      expect(state.zombieHero.brains).toBe(0)

      // 6. Transition to FIGHT Phase
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('FIGHT')

      // Configure Zombie Hero block meter to 7/8 so Snow Pea's 2 damage triggers Super-Block!
      state.zombieHero.blockMeter = 7
      state.zombieHero.blockCount = 0

      // 7. Execute Combat
      state = gameReducer(state, { type: 'START_COMBAT' })

      // Lane 1: Conehead is unblocked (Peashooter was destroyed by trick) -> Attacks Plant Hero directly for 2 damage
      expect(state.plantHero.hp).toBe(18)
      expect(state.plantHero.blockMeter).toBeGreaterThanOrEqual(1)

      // Lane 2: Snow Pea attacks Zombie Hero directly for 2 damage.
      // Because blockMeter was 7/8, it charges +1..+3 -> reaches 8/8 -> Super-Block!
      expect(state.pendingSuperBlock).not.toBeNull()
      expect(state.pendingSuperBlock?.side).toBe('zombies')
      // Zombie Hero took 0 damage because Super-Block blocked 100% of damage!
      expect(state.zombieHero.hp).toBe(20)

      // 8. Superpower Play: Zombie plays the granted Super-Block superpower immediately!
      const grantedSuperpower = state.pendingSuperBlock!.superpower
      state = gameReducer(state, {
        type: 'PLAY_SUPERPOWER',
        side: 'zombies',
        superpowerId: grantedSuperpower.id,
        laneIndex: 2,
      })

      // Super-Block resolved and pending cleared
      expect(state.pendingSuperBlock).toBeNull()
      expect(state.combatLog.some(l => l.includes('Carried Away') || l.includes('Super-Block'))).toBe(true)
    })
  })

  describe('2. Edge Case: Simultaneous Lethal with Galacta-Cactus', () => {
    it('results in a draw (winner = null) when Galacta-Cactus death explosion reduces both Heroes to <= 0 HP', () => {
      let state = createInitialGameState()
      // Set both Heroes to 1 HP (critical threshold)
      state.plantHero.hp = 1
      state.zombieHero.hp = 1

      // Place Galacta-Cactus on Lane 1
      const cactusMinion = createMockMinion('gc', 'Galacta-Cactus', 'plants', 2, 2, {
        cardId: 'plant_galacta_cactus',
        bullseye: true,
      })
      state.lanes[1].plantMinion = cactusMinion

      // Place a strong Zombie on Lane 1 (3/3) that will destroy Galacta-Cactus
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 3, 3)

      // Resolve combat
      const { updatedState, result } = resolveCombat(state)

      // Galacta-Cactus took 3 damage and was destroyed
      expect(updatedState.lanes[1].plantMinion).toBeNull()

      // Galacta-Cactus explosion dealt 1 Bullseye damage to BOTH Plant Hero and Zombie Hero
      // Both drop from 1 HP down to 0 HP
      expect(updatedState.plantHero.hp).toBeLessThanOrEqual(0)
      expect(updatedState.zombieHero.hp).toBeLessThanOrEqual(0)

      // Winner MUST be null (simultaneous knockout / tie)
      expect(updatedState.winner).toBeNull()
      expect(result.events.some(e => e.description.includes('Galacta-Cactus'))).toBe(true)
    })

    it('declares Zombie victory if Galacta-Cactus death reduces Plant Hero to 0 while Zombie Hero survives', () => {
      let state = createInitialGameState()
      state.plantHero.hp = 1
      state.zombieHero.hp = 5

      const cactusMinion = createMockMinion('gc', 'Galacta-Cactus', 'plants', 2, 1, {
        cardId: 'plant_galacta_cactus',
        bullseye: true,
      })
      state.lanes[0].plantMinion = cactusMinion
      state.lanes[0].zombieMinion = createMockMinion('z0', 'Zombie', 'zombies', 2, 3)

      const { updatedState } = resolveCombat(state)

      expect(updatedState.plantHero.hp).toBe(0)
      expect(updatedState.zombieHero.hp).toBe(4) // 5 - 1 = 4
      expect(updatedState.winner).toBe('zombies')
    })
  })

  describe('3. Edge Case: 0-Cost Tricks Discounted by Dr. Spacetime or Mechanics', () => {
    it('allows playing a 0-cost trick when Zombie Hero has exactly 0 Brains during ZOMBIE_TRICKS', () => {
      let state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 0 // Completely out of brains

      // Bungee Plumber discounted to 0 cost by Dr. Spacetime / in-hand discounts
      const discountedBungee = convertCard(getCardById('zombie_bungee_plumber')!, 'zombies')
      discountedBungee.cost = 0 // Discounted down to 0 brains!
      state.zombieHand = [discountedBungee]

      // Target Plant Hero directly with 0-cost Bungee Plumber
      state.plantHero.hp = 20

      const nextState = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: discountedBungee.id,
        laneIndex: 0,
        targetHero: true,
      })

      // Brains remain 0 (0 - 0 = 0)
      expect(nextState.zombieHero.brains).toBe(0)
      // Plant Hero took 2 damage (20 -> 18)
      expect(nextState.plantHero.hp).toBe(18)
      // Card was cleanly expended from hand
      expect(nextState.zombieHand.length).toBe(0)
      expect(nextState.combatLog[0]).toContain('Bungee Plumber')
    })

    it('executes Dr. Spacetime conjured 0-cost Going Viral trick when discounted to 0 cost', () => {
      let state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 0

      // Going Viral discounted to 0 cost
      const zeroCostCard = convertCard(getCardById('zombie_going_viral')!, 'zombies')
      zeroCostCard.cost = 0
      state.zombieHand = [zeroCostCard]
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 2, 2)

      const trickResult = executeTrick(state, zeroCostCard, 'zombies')
      expect(trickResult.success).toBe(true)
      expect(trickResult.updatedState.zombieHero.brains).toBe(0)
      // Conehead gained +1/+1 and Frenzy
      expect(trickResult.updatedState.lanes[1].zombieMinion?.currentAttack).toBe(3)
      expect(trickResult.updatedState.lanes[1].zombieMinion?.currentHealth).toBe(3)
      expect(trickResult.updatedState.lanes[1].zombieMinion?.frenzy).toBe(true)
    })
  })

  describe('4. Edge Case: Gravestone Reveal Cascade Across Multiple Lanes', () => {
    it('reveals multiple Gravestones in sequential left-to-right order at start of ZOMBIE_TRICKS', () => {
      let state = createInitialGameState()
      state.phase = 'PLANT_PLAY'

      // Setup Gravestone 1 on Lane 0: Conga Zombie (deals 1 damage when played)
      state.lanes[0].zombieMinion = createMockMinion('gz0', 'Conga Zombie', 'zombies', 2, 2, {
        cardId: 'zombie_conga_zombie',
        isGravestone: true,
      })

      // Setup weak Plant on Lane 0 with 1 HP
      state.lanes[0].plantMinion = createMockMinion('p0', 'Peashooter', 'plants', 1, 1)

      // Setup Gravestone 2 on Lane 2: Ra Zombie (steals 2 Sun from Plant Hero)
      state.lanes[2].zombieMinion = createMockMinion('gz2', 'Ra Zombie', 'zombies', 3, 4, {
        cardId: 'zombie_ra_zombie',
        isGravestone: true,
      })
      state.plantHero.sun = 5

      // Setup regular non-gravestone Zombie on Lane 3
      state.lanes[3].zombieMinion = createMockMinion('z3', 'Buckethead', 'zombies', 3, 4, {
        isGravestone: false,
      })

      // Advance phase from PLANT_PLAY to ZOMBIE_TRICKS
      const tricksState = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(tricksState.phase).toBe('ZOMBIE_TRICKS')

      // 1. Lane 0 Gravestone cracked open!
      expect(tricksState.lanes[0].zombieMinion?.isGravestone).toBe(false)
      expect(tricksState.lanes[0].zombieMinion?.name).toBe('Conga Zombie')

      // Conga Zombie When-Revealed ability triggered: deals 1 damage to Peashooter -> Destroyed!
      expect(tricksState.lanes[0].plantMinion).toBeNull()

      // 2. Lane 2 Gravestone cracked open!
      expect(tricksState.lanes[2].zombieMinion?.isGravestone).toBe(false)
      expect(tricksState.lanes[2].zombieMinion?.name).toBe('Ra Zombie')

      // Ra Zombie stole 2 Sun from Plant Hero: 5 - 2 = 3 Sun
      expect(tricksState.plantHero.sun).toBe(3)

      // 3. Lane 3 regular minion remains intact
      expect(tricksState.lanes[3].zombieMinion?.name).toBe('Buckethead')
      expect(tricksState.lanes[3].zombieMinion?.isGravestone).toBe(false)

      // Combat log captured both reveal events
      expect(tricksState.combatLog.some(l => l.includes('Conga Zombie'))).toBe(true)
      expect(tricksState.combatLog.some(l => l.includes('Ra Zombie'))).toBe(true)
    })

    it('does NOT trigger When-Played abilities while a minion is still hidden inside a Gravestone during ZOMBIE_PLAY', () => {
      let state = createInitialGameState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 3

      // Stealthy Imp has gravestone: true in its card data
      const stealthyCard = convertCard(getCardById('zombie_stealthy_imp')!, 'zombies')
      expect(stealthyCard.gravestone).toBe(true)
      state.zombieHand = [stealthyCard]

      // Plant has a 1-HP Peashooter on lane 1
      state.lanes[1].plantMinion = createMockMinion('p1', 'Peashooter', 'plants', 1, 1)

      // Play Stealthy Imp (has Gravestone trait)
      const nextState = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: stealthyCard.id,
        laneIndex: 1,
      })

      // It is placed as a Gravestone
      expect(nextState.lanes[1].zombieMinion?.isGravestone).toBe(true)
      expect(nextState.lanes[1].zombieMinion?.name).toBe('Stealthy Imp')
      // Anti-Hero attack buff is not applied while inside gravestone
      expect(nextState.lanes[1].zombieMinion?.currentAttack).toBe(2)
      // Plant minion remains intact
      expect(nextState.lanes[1].plantMinion?.currentHealth).toBe(1)
    })
  })

  describe('5. Super-Block Meter Overflow & Maximum Charges', () => {
    it('caps block meter at 8, triggers superpower, and increments blockCount', () => {
      let state = createInitialGameState()
      state.plantHero.hp = 20
      state.plantHero.blockMeter = 7
      state.plantHero.blockCount = 0

      // Enemy zombie deals 3 damage (non-bullseye)
      state.lanes[0].zombieMinion = createMockMinion('z0', 'Zombie', 'zombies', 3, 3)

      const { updatedState } = resolveCombat(state)

      // Block meter was 7, roll +1..+3 guaranteed reaches >= 8 -> Super-Block!
      expect(updatedState.pendingSuperBlock).not.toBeNull()
      expect(updatedState.pendingSuperBlock?.side).toBe('plants')
      // Damage was completely blocked
      expect(updatedState.plantHero.hp).toBe(20)
      // Block count incremented from 0 to 1
      expect(updatedState.plantHero.blockCount).toBe(1)
      // Meter reset to 0 after block
      expect(updatedState.plantHero.blockMeter).toBe(0)
    })

    it('does NOT trigger Super-Block after 3 blocks have already occurred (blockCount >= 3)', () => {
      let state = createInitialGameState()
      state.plantHero.hp = 20
      state.plantHero.blockMeter = 7
      state.plantHero.blockCount = 3 // Max 3 super-blocks already expended!

      state.lanes[0].zombieMinion = createMockMinion('z0', 'Zombie', 'zombies', 4, 3)

      const { updatedState } = resolveCombat(state)

      // Hero takes full 4 damage because shield is depleted (3/3 used)
      expect(updatedState.plantHero.hp).toBe(16)
      // No superpower granted
      expect(updatedState.pendingSuperBlock).toBeNull()
    })

    it('does NOT charge block meter when taking damage from Bullseye attackers', () => {
      let state = createInitialGameState()
      state.plantHero.hp = 20
      state.plantHero.blockMeter = 4

      // Con Man has Bullseye
      state.lanes[1].zombieMinion = createMockMinion('conman', 'Quickdraw Con Man', 'zombies', 1, 3, {
        bullseye: true,
      })

      const { updatedState } = resolveCombat(state)

      // Plant Hero took 1 damage
      expect(updatedState.plantHero.hp).toBe(19)
      // Block meter remains strictly 4 (did not increase)
      expect(updatedState.plantHero.blockMeter).toBe(4)
      expect(updatedState.pendingSuperBlock).toBeNull()
    })
  })
})
