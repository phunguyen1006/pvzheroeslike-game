import { describe, it, expect, beforeEach } from 'vitest'
import {
  createInitialGameState,
  gameReducer,
} from '../engine/reducer'
import {
  resolveSingleLaneCombat,
  resolveCombat,
  applyHeroDamage,
  getPendingSuperBlockForHero,
} from '../engine/combat'
import {
  executeTrick,
} from '../engine/tricks'
import {
  triggerWhenFrozen,
  freezeMinion,
  isUntrickable,
} from '../engine/abilities'
import {
  getAIDecision,
  type AIDifficulty,
  type AIArchetype,
} from '../engine/ai'
import type {
  GameState,
  Side,
  Card,
  Minion,
  LaneState,
  Phase,
} from '../engine/types'

// ========================================================
// MOCK FACTORIES
// ========================================================

const createMockMinion = (
  instanceId: string,
  name: string,
  side: Side,
  attack: number,
  health: number,
  options: Partial<Minion> = {}
): Minion => ({
  instanceId,
  cardId: options.cardId || `${side}_${instanceId}`,
  name,
  side,
  currentAttack: attack,
  baseAttack: attack,
  currentHealth: health,
  maxHealth: health,
  image: '',
  traits: options.traits ?? [],
  bullseye: options.bullseye,
  armored: options.armored,
  strikethrough: options.strikethrough,
  frenzy: options.frenzy,
  deadly: options.deadly,
  doubleStrike: options.doubleStrike,
  amphibious: options.amphibious,
  teamUp: options.teamUp,
  untrickable: options.untrickable,
  isFrozen: options.isFrozen,
  isInvulnerable: options.isInvulnerable,
  invulnerableThisTurn: options.invulnerableThisTurn,
  isGravestone: options.isGravestone,
})

const createMockCard = (
  id: string,
  name: string,
  side: Side,
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
  type: options.type || 'minion',
  image: '',
  traits: options.traits || [],
  untrickable: options.untrickable,
  armored: options.armored,
  deadly: options.deadly,
  frenzy: options.frenzy,
  doubleStrike: options.doubleStrike,
  strikethrough: options.strikethrough,
  bullseye: options.bullseye,
  amphibious: options.amphibious,
})

describe('Round 11: Advanced Interactions & Automated Match Simulation', () => {
  let state: GameState

  beforeEach(() => {
    state = createInitialGameState()
  })

  // ========================================================
  // 1. DOUBLE STRIKE VS FRENZY INTERACTIONS
  // ========================================================
  describe('1. Double Strike vs Frenzy Mechanics', () => {
    it('Double Strike plant should attack twice when opposite lane is empty', () => {
      state.lanes[0].plantMinion = createMockMinion('repeater', 'Repeater', 'plants', 2, 2, {
        doubleStrike: true,
      })
      state.lanes[0].zombieMinion = null
      state.zombieHero.hp = 20
      state.zombieHero.blockMeter = 0

      // In empty lane, main attack hits Zombie Hero. Double strike hits Zombie Hero again.
      const result = resolveSingleLaneCombat(state, 0)
      const dsEvents = result.events.filter(e => e.traitsTriggered?.includes('doubleStrike'))

      expect(dsEvents.length).toBe(1)
      expect(result.updatedState.zombieHero.hp).toBeLessThanOrEqual(16) // 20 - 2 (main) - 2 (double strike)
    })

    it('Double Strike plant should destroy opposing zombie on 1st hit and strike Zombie Hero on 2nd hit', () => {
      // 3 ATK, 4 HP Double Strike plant vs 2 ATK, 2 HP Zombie
      state.lanes[1].plantMinion = createMockMinion('repeater', 'Repeater', 'plants', 3, 4, {
        doubleStrike: true,
      })
      state.lanes[1].zombieMinion = createMockMinion('imp', 'Regular Imp', 'zombies', 2, 2)
      state.zombieHero.hp = 20
      state.zombieHero.blockMeter = 0

      const result = resolveSingleLaneCombat(state, 1)

      // Zombie should be destroyed
      expect(result.updatedState.lanes[1].zombieMinion).toBeNull()
      // Plant took 2 damage (4 -> 2 HP) and survived
      expect(result.updatedState.lanes[1].plantMinion?.currentHealth).toBe(2)
      // Second strike hits Zombie Hero for 3 damage
      const doubleRes = result.events.find(e => e.traitsTriggered?.includes('doubleStrike'))
      expect(doubleRes).toBeDefined()
      expect(doubleRes?.target).toBe('hero')
      expect(doubleRes?.targetSide).toBe('zombies')
      expect(result.updatedState.zombieHero.hp).toBe(17)
    })

    it('Double Strike plant should attack the same bulky zombie twice if zombie survives 1st strike', () => {
      // 2 ATK, 5 HP Double Strike plant vs 1 ATK, 5 HP Zombie
      state.lanes[2].plantMinion = createMockMinion('repeater', 'Repeater', 'plants', 2, 5, {
        doubleStrike: true,
      })
      state.lanes[2].zombieMinion = createMockMinion('knight', 'Bulky Zombie', 'zombies', 1, 5)

      const result = resolveSingleLaneCombat(state, 2)

      // 1st hit deals 2 dmg (5 -> 3), Plant takes 1 dmg (5 -> 4)
      // 2nd hit deals 2 dmg (3 -> 1)
      expect(result.updatedState.lanes[2].zombieMinion?.currentHealth).toBe(1)
      expect(result.updatedState.lanes[2].plantMinion?.currentHealth).toBe(4)
      // Double strike hit the minion, not the hero
      const heroHits = result.events.filter(e => e.target === 'hero' && e.targetSide === 'zombies')
      expect(heroHits.length).toBe(0)
    })

    it('Zombie Frenzy should trigger bonus attack on Plant Hero upon killing opposing plant', () => {
      // 4 ATK, 4 HP Frenzy zombie vs 1 ATK, 2 HP Plant
      state.lanes[0].zombieMinion = createMockMinion('smash_z', 'Vimpyre', 'zombies', 4, 4, {
        frenzy: true,
      })
      state.lanes[0].plantMinion = createMockMinion('weedy', 'Small Plant', 'plants', 1, 2)
      state.plantHero.hp = 20
      state.plantHero.blockMeter = 0

      const result = resolveSingleLaneCombat(state, 0)

      // Plant was destroyed
      expect(result.updatedState.lanes[0].plantMinion).toBeNull()
      // Zombie survived (4 - 1 = 3 HP)
      expect(result.updatedState.lanes[0].zombieMinion?.currentHealth).toBe(3)
      // Frenzy bonus attack triggered against Plant Hero
      const frenzyEvent = result.events.find(e => e.traitsTriggered?.includes('frenzy'))
      expect(frenzyEvent).toBeDefined()
      expect(frenzyEvent?.target).toBe('hero')
      expect(frenzyEvent?.targetSide).toBe('plants')
      expect(result.updatedState.plantHero.hp).toBeLessThanOrEqual(16) // Took 4 damage
    })

    it('Frenzy Zombie should hit Team-Up plant in same lane after destroying front plant', () => {
      // Front plant: 1 ATK, 2 HP; Team-Up plant: 1 ATK, 3 HP
      state.lanes[1].plantMinion = createMockMinion('front_plant', 'Front Plant', 'plants', 1, 2)
      state.lanes[1].plantTeamUpMinion = createMockMinion('teamup_plant', 'TeamUp Nut', 'plants', 0, 3, {
        teamUp: true,
      })
      state.lanes[1].zombieMinion = createMockMinion('frenzy_z', 'Gargantuar', 'zombies', 5, 5, {
        frenzy: true,
      })

      const result = resolveSingleLaneCombat(state, 1)

      // Front plant destroyed
      expect(result.updatedState.lanes[1].plantMinion).toBeNull()
      // Frenzy hit the Team-Up plant for 5 damage (3 HP -> destroyed)
      expect(result.updatedState.lanes[1].plantTeamUpMinion).toBeNull()
      const frenzyHit = result.events.find(e => e.traitsTriggered?.includes('frenzy'))
      expect(frenzyHit).toBeDefined()
      expect(frenzyHit?.isLethal).toBe(true)
    })

    it('Dual Clash: Double Strike plant kills Frenzy zombie on 1st strike -> Zombie dies, Plant double strikes hero', () => {
      // Plant: 5 ATK, 5 HP (Double Strike); Zombie: 4 ATK, 3 HP (Frenzy)
      state.lanes[0].plantMinion = createMockMinion('bananasaurus', 'Bananasaurus', 'plants', 5, 5, {
        doubleStrike: true,
      })
      state.lanes[0].zombieMinion = createMockMinion('frenzy_z', 'Frenzy Imp', 'zombies', 4, 3, {
        frenzy: true,
      })
      state.zombieHero.hp = 20

      const result = resolveSingleLaneCombat(state, 0)

      // Zombie died from 5 dmg, cannot trigger Frenzy
      expect(result.updatedState.lanes[0].zombieMinion).toBeNull()
      // Plant survived with 1 HP (5 - 4 = 1), so Double Strike triggers on Zombie Hero
      expect(result.updatedState.lanes[0].plantMinion?.currentHealth).toBe(1)
      const dsEvent = result.events.find(e => e.traitsTriggered?.includes('doubleStrike'))
      expect(dsEvent).toBeDefined()
      expect(result.updatedState.zombieHero.hp).toBe(15)
    })

    it('Dual Clash: Frenzy zombie kills Double Strike plant on 1st strike -> Plant dies, Zombie triggers Frenzy', () => {
      // Plant: 2 ATK, 2 HP (Double Strike); Zombie: 5 ATK, 5 HP (Frenzy)
      state.lanes[0].plantMinion = createMockMinion('repeater', 'Repeater', 'plants', 2, 2, {
        doubleStrike: true,
      })
      state.lanes[0].zombieMinion = createMockMinion('allstar', 'All-Star Zombie', 'zombies', 5, 5, {
        frenzy: true,
      })
      state.plantHero.hp = 20

      const result = resolveSingleLaneCombat(state, 0)

      // Plant died, cannot trigger Double Strike
      expect(result.updatedState.lanes[0].plantMinion).toBeNull()
      // Zombie survived with 3 HP (5 - 2 = 3), triggers Frenzy bonus attack on Plant Hero
      expect(result.updatedState.lanes[0].zombieMinion?.currentHealth).toBe(3)
      const frenzyEvent = result.events.find(e => e.traitsTriggered?.includes('frenzy'))
      expect(frenzyEvent).toBeDefined()
      expect(result.updatedState.plantHero.hp).toBeLessThanOrEqual(15)
    })

    it('Dual Clash: Mutual lethal destruction cancels both Double Strike and Frenzy', () => {
      // Both minions have 4 ATK and 4 HP
      state.lanes[0].plantMinion = createMockMinion('p1', 'Double Striker', 'plants', 4, 4, {
        doubleStrike: true,
      })
      state.lanes[0].zombieMinion = createMockMinion('z1', 'Frenzy Fighter', 'zombies', 4, 4, {
        frenzy: true,
      })

      const result = resolveSingleLaneCombat(state, 0)

      // Both destroyed
      expect(result.updatedState.lanes[0].plantMinion).toBeNull()
      expect(result.updatedState.lanes[0].zombieMinion).toBeNull()

      // Neither Double Strike nor Frenzy should have fired
      const dsEvents = result.events.filter(e => e.traitsTriggered?.includes('doubleStrike'))
      const frenzyEvents = result.events.filter(e => e.traitsTriggered?.includes('frenzy'))
      expect(dsEvents.length).toBe(0)
      expect(frenzyEvents.length).toBe(0)
    })
  })

  // ========================================================
  // 2. ARMORED COMBINED WITH DEADLY & TRICK MITIGATION
  // ========================================================
  describe('2. Armored & Deadly Trait Interactions', () => {
    it('Armored 1 and Armored 2 should accurately reduce combat attack damage', () => {
      // Armored 1 zombie vs 3 ATK plant -> takes 2 dmg
      state.lanes[0].zombieMinion = createMockMinion('armored1', 'Conehead', 'zombies', 1, 5, {
        armored: 1,
      })
      state.lanes[0].plantMinion = createMockMinion('p1', 'Peashooter', 'plants', 3, 5)

      const res1 = resolveSingleLaneCombat(state, 0)
      expect(res1.updatedState.lanes[0].zombieMinion?.currentHealth).toBe(3) // 5 - (3 - 1) = 3

      // Armored 2 zombie vs 3 ATK plant -> takes 1 dmg
      state.lanes[1].zombieMinion = createMockMinion('armored2', 'Knight', 'zombies', 1, 5, {
        armored: 2,
      })
      state.lanes[1].plantMinion = createMockMinion('p2', 'Peashooter', 'plants', 3, 5)

      const res2 = resolveSingleLaneCombat(state, 1)
      expect(res2.updatedState.lanes[1].zombieMinion?.currentHealth).toBe(4) // 5 - (3 - 2) = 4
    })

    it('Armored minion should soak 100% of damage if incoming attack is <= Armor level', () => {
      state.lanes[0].zombieMinion = createMockMinion('conehead', 'Conehead', 'zombies', 1, 4, {
        armored: 1,
      })
      state.lanes[0].plantMinion = createMockMinion('weak_plant', 'Weak Plant', 'plants', 1, 4)

      const result = resolveSingleLaneCombat(state, 0)
      // 1 ATK vs Armored 1 -> 0 damage dealt
      expect(result.updatedState.lanes[0].zombieMinion?.currentHealth).toBe(4)
    })

    it('Armored 1 should mitigate damage from damage tricks (Bungee Plumber, Berry Blast, Banana Bomb)', () => {
      state.plantHero.sun = 10
      state.zombieHero.brains = 10

      // Zombie with Armored 1
      state.lanes[0].zombieMinion = createMockMinion('conehead', 'Conehead', 'zombies', 2, 4, {
        armored: 1,
      })

      // 1. Banana Bomb (1 dmg) vs Armored 1 -> 0 dmg dealt!
      const bananaBomb = createMockCard('plant_banana_bomb', 'Banana Bomb', 'plants', 1, 0, 0, { type: 'trick' })
      const resBanana = executeTrick(state, bananaBomb, 'plants', 0)
      expect(resBanana.success).toBe(true)
      expect(resBanana.updatedState.lanes[0].zombieMinion?.currentHealth).toBe(4)

      // 2. Berry Blast (3 dmg) vs Armored 1 -> 2 dmg dealt (4 - 2 = 2 HP)
      const berryBlast = createMockCard('plant_berry_blast', 'Berry Blast', 'plants', 2, 0, 0, { type: 'trick' })
      const resBerry = executeTrick(resBanana.updatedState, berryBlast, 'plants', 0)
      expect(resBerry.success).toBe(true)
      expect(resBerry.updatedState.lanes[0].zombieMinion?.currentHealth).toBe(2)
    })

    it('Deadly should instantly destroy Armored 1/2 minion if at least 1 damage penetrates armor', () => {
      // 3 ATK Deadly plant vs 8 HP Armored 2 Zombie
      // 3 ATK - 2 Armor = 1 dmg (>0) -> Deadly destroys target instantly!
      state.lanes[0].plantMinion = createMockMinion('deadly_plant', 'Deadly Sprout', 'plants', 3, 5, {
        deadly: true,
      })
      state.lanes[0].zombieMinion = createMockMinion('heavy_knight', 'Knight of Living Dead', 'zombies', 2, 8, {
        armored: 2,
      })

      const result = resolveSingleLaneCombat(state, 0)
      expect(result.updatedState.lanes[0].zombieMinion).toBeNull()
    })

    it('Deadly should NOT destroy Armored minion if incoming damage is completely reduced to 0 by Armor', () => {
      // 1 ATK Deadly plant vs 5 HP Armored 1 Zombie
      // 1 ATK - 1 Armor = 0 dmg -> No damage dealt -> Deadly does not trigger
      state.lanes[0].plantMinion = createMockMinion('deadly_tiny', 'Tiny Deadly', 'plants', 1, 5, {
        deadly: true,
      })
      state.lanes[0].zombieMinion = createMockMinion('conehead', 'Conehead', 'zombies', 2, 5, {
        armored: 1,
      })

      const result = resolveSingleLaneCombat(state, 0)
      expect(result.updatedState.lanes[0].zombieMinion?.currentHealth).toBe(5)
    })
  })

  // ========================================================
  // 3. STRIKETHROUGH & SUPER BLOCK METER
  // ========================================================
  describe('3. Strikethrough & Super Block Meter', () => {
    it('Strikethrough minion should damage opposing minion AND pierce directly to opposing Hero', () => {
      // Plant with Strikethrough: 3 ATK, 3 HP vs Zombie: 2 ATK, 4 HP
      state.lanes[0].plantMinion = createMockMinion('apple_saucer', 'Apple Saucer', 'plants', 3, 3, {
        strikethrough: true,
      })
      state.lanes[0].zombieMinion = createMockMinion('zombie_regular', 'Browncoat', 'zombies', 2, 4)
      state.zombieHero.hp = 20
      state.zombieHero.blockMeter = 0

      const result = resolveSingleLaneCombat(state, 0)

      // Zombie minion took 3 damage (4 -> 1 HP)
      expect(result.updatedState.lanes[0].zombieMinion?.currentHealth).toBe(1)
      // Zombie Hero took 3 damage via Strikethrough
      expect(result.updatedState.zombieHero.hp).toBe(17)
      // Zombie Hero block meter charged (at least 1 charge)
      expect(result.updatedState.zombieHero.blockMeter).toBeGreaterThanOrEqual(1)
    })

    it('Strikethrough damage should trigger Super-Block when meter reaches 8/8, blocking Hero damage', () => {
      state.lanes[0].plantMinion = createMockMinion('strikethrough_p', 'Power Flower', 'plants', 4, 4, {
        strikethrough: true,
      })
      state.lanes[0].zombieMinion = createMockMinion('z1', 'Gargantuar', 'zombies', 2, 8)
      // Meter is primed at 7/8, guaranteed to trigger Super Block on hit
      state.zombieHero.hp = 15
      state.zombieHero.blockMeter = 7

      const result = resolveSingleLaneCombat(state, 0)

      // Zombie minion still took 4 damage (8 -> 4 HP)
      expect(result.updatedState.lanes[0].zombieMinion?.currentHealth).toBe(4)
      // Super Block triggered: Hero damage was blocked completely (15 HP preserved)
      expect(result.updatedState.zombieHero.hp).toBe(15)
      expect(result.hasSuperBlock).toBe(true)
      expect(result.updatedState.pendingSuperBlock).not.toBeNull()
      expect(result.updatedState.pendingSuperBlock?.side).toBe('zombies')
    })

    it('Zombie Strikethrough should charge Plant Hero block meter and trigger shield block', () => {
      state.lanes[2].zombieMinion = createMockMinion('line_dancer', 'Line Dancing Zombie', 'zombies', 3, 3, {
        strikethrough: true,
      })
      state.lanes[2].plantMinion = createMockMinion('wall_nut', 'Wall-Nut', 'plants', 0, 6)
      state.plantHero.hp = 18
      state.plantHero.blockMeter = 7

      const result = resolveSingleLaneCombat(state, 2)

      // Wall-Nut took 3 damage (6 -> 3 HP)
      expect(result.updatedState.lanes[2].plantMinion?.currentHealth).toBe(3)
      // Plant Hero Super Block triggered!
      expect(result.updatedState.plantHero.hp).toBe(18)
      expect(result.hasSuperBlock).toBe(true)
      expect(result.updatedState.pendingSuperBlock?.side).toBe('plants')
    })

    it('Bullseye + Strikethrough minion should hit Hero directly without charging block meter', () => {
      state.lanes[1].plantMinion = createMockMinion('bullseye_strike', 'Galactic Striker', 'plants', 3, 3, {
        strikethrough: true,
        bullseye: true,
      })
      state.lanes[1].zombieMinion = createMockMinion('target_z', 'Target Zombie', 'zombies', 1, 4)
      state.zombieHero.hp = 20
      state.zombieHero.blockMeter = 2

      const result = resolveSingleLaneCombat(state, 1)

      expect(result.updatedState.zombieHero.hp).toBe(17)
      // Block meter must stay at 2 (Bullseye prevents charging)
      expect(result.updatedState.zombieHero.blockMeter).toBe(2)
    })
  })

  // ========================================================
  // 4. FREEZE & UNFREEZE LIFECYCLE
  // ========================================================
  describe('4. Freeze & Unfreeze Lifecycle', () => {
    it('Frozen minion should skip its attack in combat and automatically unfreeze at end of combat', () => {
      // 5 ATK Frozen Zombie vs 2 ATK Plant
      state.lanes[0].zombieMinion = createMockMinion('frozen_z', 'Frozen Gargantuar', 'zombies', 5, 6, {
        isFrozen: true,
      })
      state.lanes[0].plantMinion = createMockMinion('sprout', 'Sunflower', 'plants', 2, 4)

      const result = resolveSingleLaneCombat(state, 0)

      // Plant dealt 2 damage to Zombie (6 -> 4 HP)
      expect(result.updatedState.lanes[0].zombieMinion?.currentHealth).toBe(4)
      // Frozen zombie could not attack: Plant took 0 damage (stayed at 4 HP)
      expect(result.updatedState.lanes[0].plantMinion?.currentHealth).toBe(4)
      // Zombie automatically unfreezes
      expect(result.updatedState.lanes[0].zombieMinion?.isFrozen).toBe(false)
      // Event log confirms attack skipped and unfrozen
      const freezeSkip = result.events.find(e => e.description.includes('đóng băng') && e.description.includes('tan băng'))
      expect(freezeSkip).toBeDefined()
    })

    it('Snowdrop should gain +2/+2 whenever any Zombie is frozen', () => {
      state.lanes[0].plantMinion = createMockMinion('snowdrop', 'Snowdrop', 'plants', 1, 2, {
        cardId: 'plant_snowdrop',
      })
      state.lanes[1].zombieMinion = createMockMinion('conehead', 'Conehead', 'zombies', 2, 4)

      // Trigger freeze on lane 1 zombie
      const res = triggerWhenFrozen(state, 1)
      expect(res.events.length).toBeGreaterThan(0)

      // Snowdrop should grow from 1/2 to 3/4
      const snowdrop = res.updatedState.lanes[0].plantMinion!
      expect(snowdrop.currentAttack).toBe(3)
      expect(snowdrop.currentHealth).toBe(4)
    })

    it('Multiple Snowdrops on the board should all gain +2/+2 upon a freeze trigger', () => {
      state.lanes[0].plantMinion = createMockMinion('sd1', 'Snowdrop', 'plants', 1, 2, { cardId: 'plant_snowdrop' })
      state.lanes[2].plantMinion = createMockMinion('sd2', 'Snowdrop', 'plants', 1, 2, { cardId: 'plant_snowdrop' })
      state.lanes[1].zombieMinion = createMockMinion('target_z', 'Buckethead', 'zombies', 3, 5)

      const res = triggerWhenFrozen(state, 1)

      expect(res.updatedState.lanes[0].plantMinion?.currentAttack).toBe(3)
      expect(res.updatedState.lanes[0].plantMinion?.currentHealth).toBe(4)
      expect(res.updatedState.lanes[2].plantMinion?.currentAttack).toBe(3)
      expect(res.updatedState.lanes[2].plantMinion?.currentHealth).toBe(4)
    })

    it('Winter Squash should immediately destroy a zombie when it is frozen', () => {
      // Winter Squash in lane 0
      state.lanes[0].plantMinion = createMockMinion('ws', 'Winter Squash', 'plants', 2, 6, {
        cardId: 'plant_winter_squash',
      })
      // Zombie in lane 1
      state.lanes[1].zombieMinion = createMockMinion('big_z', 'Super Zombie', 'zombies', 5, 8)

      const res = triggerWhenFrozen(state, 1)

      // Zombie should be destroyed instantly by Winter Squash trigger
      expect(res.updatedState.lanes[1].zombieMinion).toBeNull()
      expect(res.events.some(e => e.includes('Winter Squash') && e.toLowerCase().includes('tiêu diệt'))).toBe(true)
    })
  })

  // ========================================================
  // 5. BOUNCE MECHANICS & HAND OVERFLOW
  // ========================================================
  describe('5. Bounce Mechanics & Hand Overflow', () => {
    it('Spring Bean should return a zombie minion to zombie hand with original stats and cost', () => {
      state.plantHero.sun = 5
      // Zombie with buffed stats and damage taken
      state.lanes[2].zombieMinion = createMockMinion('z_buffed', 'Buffed Gargantuar', 'zombies', 7, 3, {
        cardId: 'zombie_regular',
      })
      state.zombieHand = []

      const springBean = createMockCard('plant_spring_bean', 'Spring Bean', 'plants', 3, 0, 0, { type: 'trick' })
      const res = executeTrick(state, springBean, 'plants', 2)

      expect(res.success).toBe(true)
      // Zombie removed from lane
      expect(res.updatedState.lanes[2].zombieMinion).toBeNull()
      // Returned to Zombie hand
      expect(res.updatedState.zombieHand.length).toBe(1)
      const returnedCard = res.updatedState.zombieHand[0]
      expect(returnedCard.id).toBe('zombie_regular')
      expect(returnedCard.name).toBe('Buffed Gargantuar')
    })

    it('Spring Bean should permanently destroy bounced minion when Zombie hand is full (10 cards)', () => {
      state.plantHero.sun = 5
      state.lanes[1].zombieMinion = createMockMinion('z_doomed', 'Doomed Zombie', 'zombies', 4, 4, {
        cardId: 'zombie_regular',
      })
      // Fill Zombie hand with 10 cards
      state.zombieHand = Array.from({ length: 10 }, (_, i) =>
        createMockCard(`card_${i}`, `Card ${i}`, 'zombies', 1, 1, 1)
      )
      expect(state.zombieHand.length).toBe(10)

      const springBean = createMockCard('plant_spring_bean', 'Spring Bean', 'plants', 3, 0, 0, { type: 'trick' })
      const res = executeTrick(state, springBean, 'plants', 1)

      expect(res.success).toBe(true)
      // Minion removed from board
      expect(res.updatedState.lanes[1].zombieMinion).toBeNull()
      // Hand was already at max capacity 10, so card could not enter hand and is destroyed
      expect(res.updatedState.zombieHand.length).toBe(10)
      expect(res.updatedState.zombieHand.some(c => c.name === 'Doomed Zombie')).toBe(false)
    })
  })

  // ========================================================
  // 6. UNTRICKABLE MECHANICS (TARGETED VS AOE TRICKS)
  // ========================================================
  describe('6. Untrickable Trait Mechanics', () => {
    it('Untrickable plant should block enemy targeted tricks (Bungee Plumber, Locust Swarm, Rocket Science)', () => {
      state.zombieHero.brains = 15
      state.lanes[1].plantMinion = createMockMinion('parasol', 'Parasol Plant', 'plants', 4, 6, {
        untrickable: true,
      })

      // 1. Bungee Plumber targeted at untrickable plant -> rejected
      const bungee = createMockCard('zombie_bungee_plumber', 'Bungee Plumber', 'zombies', 1, 0, 0, { type: 'trick' })
      const resBungee = executeTrick(state, bungee, 'zombies', 1)
      expect(resBungee.success).toBe(false)
      expect(resBungee.message).toContain('Untrickable')
      expect(resBungee.updatedState.lanes[1].plantMinion?.currentHealth).toBe(6)

      // 2. Locust Swarm targeted at untrickable plant -> rejected
      const locust = createMockCard('zombie_locust_swarm', 'Locust Swarm', 'zombies', 5, 0, 0, { type: 'trick' })
      const resLocust = executeTrick(state, locust, 'zombies', 1)
      expect(resLocust.success).toBe(false)
      expect(resLocust.message).toContain('Untrickable')
      expect(resLocust.updatedState.lanes[1].plantMinion).not.toBeNull()

      // 3. Rocket Science targeted at 4 ATK untrickable plant -> rejected
      const rocket = createMockCard('zombie_rocket_science', 'Rocket Science', 'zombies', 3, 0, 0, { type: 'trick' })
      const resRocket = executeTrick(state, rocket, 'zombies', 1)
      expect(resRocket.success).toBe(false)
      expect(resRocket.message).toContain('Untrickable')
      expect(resRocket.updatedState.lanes[1].plantMinion).not.toBeNull()
    })

    it('Untrickable zombie should block enemy targeted tricks (Squash, Berry Blast, Spring Bean)', () => {
      state.plantHero.sun = 15
      state.lanes[0].zombieMinion = createMockMinion('fossilhead', 'Fossilhead', 'zombies', 4, 5, {
        untrickable: true,
      })

      // 1. Squash
      const squash = createMockCard('plant_squash', 'Squash', 'plants', 5, 0, 0, { type: 'trick' })
      const resSquash = executeTrick(state, squash, 'plants', 0)
      expect(resSquash.success).toBe(false)
      expect(resSquash.message).toContain('Untrickable')
      expect(resSquash.updatedState.lanes[0].zombieMinion).not.toBeNull()

      // 2. Berry Blast
      const berry = createMockCard('plant_berry_blast', 'Berry Blast', 'plants', 2, 0, 0, { type: 'trick' })
      const resBerry = executeTrick(state, berry, 'plants', 0)
      expect(resBerry.success).toBe(false)
      expect(resBerry.message).toContain('Untrickable')
      expect(resBerry.updatedState.lanes[0].zombieMinion?.currentHealth).toBe(5)

      // 3. Spring Bean
      const spring = createMockCard('plant_spring_bean', 'Spring Bean', 'plants', 3, 0, 0, { type: 'trick' })
      const resSpring = executeTrick(state, spring, 'plants', 0)
      expect(resSpring.success).toBe(false)
      expect(resSpring.message).toContain('Untrickable')
      expect(resSpring.updatedState.lanes[0].zombieMinion).not.toBeNull()
    })

    it('The Chickening (AOE trick) should damage all plants, including Untrickable plants', () => {
      state.zombieHero.brains = 6
      // Lane 0: Normal plant (2 HP)
      state.lanes[0].plantMinion = createMockMinion('p0', 'Peashooter', 'plants', 1, 2)
      // Lane 1: Untrickable plant (4 HP)
      state.lanes[1].plantMinion = createMockMinion('p1', 'Parasol Plant', 'plants', 3, 4, {
        untrickable: true,
      })

      const chickening = createMockCard('zombie_the_chickening', 'The Chickening', 'zombies', 4, 0, 0, {
        type: 'trick',
      })
      const res = executeTrick(state, chickening, 'zombies')

      expect(res.success).toBe(true)
      // Normal plant took 2 dmg and was destroyed
      expect(res.updatedState.lanes[0].plantMinion).toBeNull()
      // Untrickable plant took 2 damage (4 -> 2 HP) because Chickening is AOE!
      expect(res.updatedState.lanes[1].plantMinion?.currentHealth).toBe(2)
    })

    it('Doom-Shroom (AOE trick) should destroy all units with 4+ ATK, including Untrickable units', () => {
      state.plantHero.sun = 6
      // Lane 0: Untrickable Zombie with 5 ATK
      state.lanes[0].zombieMinion = createMockMinion('z0', 'Fossilhead Big', 'zombies', 5, 5, {
        untrickable: true,
      })
      // Lane 1: Untrickable Plant with 4 ATK
      state.lanes[1].plantMinion = createMockMinion('p1', 'Apotatosaurus', 'plants', 4, 6, {
        untrickable: true,
      })
      // Lane 2: Untrickable Zombie with 2 ATK (less than 4, should survive)
      state.lanes[2].zombieMinion = createMockMinion('z2', 'Small Fossilhead', 'zombies', 2, 4, {
        untrickable: true,
      })

      const doomShroom = createMockCard('plant_doom_shroom', 'Doom-Shroom', 'plants', 5, 0, 0, {
        type: 'trick',
      })
      const res = executeTrick(state, doomShroom, 'plants')

      expect(res.success).toBe(true)
      // 5 ATK untrickable zombie destroyed
      expect(res.updatedState.lanes[0].zombieMinion).toBeNull()
      // 4 ATK untrickable plant destroyed
      expect(res.updatedState.lanes[1].plantMinion).toBeNull()
      // 2 ATK untrickable zombie spared!
      expect(res.updatedState.lanes[2].zombieMinion).not.toBeNull()
      expect(res.updatedState.lanes[2].zombieMinion?.currentHealth).toBe(4)
    })
  })

  // ========================================================
  // 7. AUTOMATED MULTI-TURN MATCH SIMULATION (15-20 TURNS)
  // ========================================================
  describe('7. Automated Multi-Turn Match Simulation (15-20 Turns)', () => {
    it('should complete a 20-turn simulated match between Plants and Zombies without errors or deadlocks', () => {
      let simState = createInitialGameState()
      const maxTurns = 20
      let turnsSimulated = 0
      const phaseHistory: Phase[] = []

      // Populate decks with varied test cards
      simState.plantDeck = [
        createMockCard('p_pea', 'Peashooter', 'plants', 1, 1, 1),
        createMockCard('p_rep', 'Repeater', 'plants', 3, 2, 2, { doubleStrike: true }),
        createMockCard('p_nut', 'Wall-Nut', 'plants', 1, 0, 6, { teamUp: true }),
        createMockCard('p_berry', 'Berry Blast', 'plants', 2, 0, 0, { type: 'trick' }),
        createMockCard('p_squash', 'Squash', 'plants', 5, 0, 0, { type: 'trick' }),
        createMockCard('p_parasol', 'Parasol Plant', 'plants', 4, 3, 6, { untrickable: true }),
      ]

      simState.zombieDeck = [
        createMockCard('z_brown', 'Browncoat', 'zombies', 1, 1, 1),
        createMockCard('z_cone', 'Conehead', 'zombies', 2, 2, 2, { armored: 1 }),
        createMockCard('z_smash', 'Vimpyre', 'zombies', 3, 2, 3, { frenzy: true }),
        createMockCard('z_bungee', 'Bungee Plumber', 'zombies', 1, 0, 0, { type: 'trick' }),
        createMockCard('z_rocket', 'Rocket Science', 'zombies', 3, 0, 0, { type: 'trick' }),
        createMockCard('z_chick', 'The Chickening', 'zombies', 4, 0, 0, { type: 'trick' }),
      ]

      // Start in ZOMBIE_PLAY
      simState.phase = 'ZOMBIE_PLAY'
      simState.turn = 1

      while (simState.turn <= maxTurns && !simState.winner) {
        turnsSimulated = simState.turn
        phaseHistory.push(simState.phase as Phase)

        // 1. ZOMBIE_PLAY Phase
        if (simState.phase === 'ZOMBIE_PLAY') {
          const decision = getAIDecision(simState, 'zombies', { difficulty: 'medium', archetype: 'aggro' })
          if (decision.action === 'PLAY_MINION' && decision.card && decision.laneIndex !== undefined) {
            simState = gameReducer(simState, {
              type: 'PLAY_CARD',
              side: 'zombies',
              cardId: decision.card.id,
              laneIndex: decision.laneIndex,
            })
          }
          if (!simState.winner) {
            simState = gameReducer(simState, { type: 'NEXT_PHASE' })
          }
        }

        if (simState.winner) break

        // 2. PLANT_PLAY Phase
        if (simState.phase === 'PLANT_PLAY') {
          const decision = getAIDecision(simState, 'plants', { difficulty: 'medium', archetype: 'midrange' })
          if ((decision.action === 'PLAY_MINION' || decision.action === 'PLAY_TRICK') && decision.card && decision.laneIndex !== undefined) {
            simState = gameReducer(simState, {
              type: 'PLAY_CARD',
              side: 'plants',
              cardId: decision.card.id,
              laneIndex: decision.laneIndex,
              targetHero: decision.targetHero,
            })
          }
          if (!simState.winner) {
            simState = gameReducer(simState, { type: 'NEXT_PHASE' })
          }
        }

        if (simState.winner) break

        // 3. ZOMBIE_TRICKS Phase
        if (simState.phase === 'ZOMBIE_TRICKS') {
          const decision = getAIDecision(simState, 'zombies', { difficulty: 'medium', archetype: 'control' })
          if (decision.action === 'PLAY_TRICK' && decision.card) {
            simState = gameReducer(simState, {
              type: 'PLAY_CARD',
              side: 'zombies',
              cardId: decision.card.id,
              laneIndex: decision.laneIndex,
              targetHero: decision.targetHero,
            })
          }
          if (!simState.winner) {
            simState = gameReducer(simState, { type: 'NEXT_PHASE' })
          }
        }

        if (simState.winner) break

        // 4. FIGHT Phase
        if (simState.phase === 'FIGHT') {
          simState = gameReducer(simState, { type: 'RESOLVE_COMBAT' })

          // Handle pending super block if any
          if (simState.pendingSuperBlock) {
            simState = gameReducer(simState, {
              type: 'TRIGGER_SUPER_BLOCK',
              side: simState.pendingSuperBlock.targetHero,
            })
          }

          if (!simState.winner) {
            simState = gameReducer(simState, { type: 'NEXT_PHASE' })
          }
        }
      }

      // Assert engine invariants
      expect(turnsSimulated).toBeGreaterThanOrEqual(1)
      expect(phaseHistory.length).toBeGreaterThanOrEqual(4)
      expect(simState.plantHero.sun).toBeGreaterThanOrEqual(0)
      expect(simState.zombieHero.brains).toBeGreaterThanOrEqual(0)
      expect(simState.plantHero.blockMeter).toBeGreaterThanOrEqual(0)
      expect(simState.plantHero.blockMeter).toBeLessThanOrEqual(8)
      expect(simState.zombieHero.blockMeter).toBeGreaterThanOrEqual(0)
      expect(simState.zombieHero.blockMeter).toBeLessThanOrEqual(8)
      expect(simState.lanes.length).toBe(5)
    })
  })
})
