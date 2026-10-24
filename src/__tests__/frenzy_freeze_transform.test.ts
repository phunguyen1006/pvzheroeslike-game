import { describe, it, expect } from 'vitest'
import {
  createInitialGameState,
  resolveSingleLaneCombat,
  triggerBonusAttack,
  freezeMinion,
  isUntrickable,
  transformMinion,
  executeTrick,
  executeSuperpower,
} from '../engine/index'
import { resolveCombat } from '../engine/combat'
import type { Minion, Card, CombatEvent } from '../engine/types'

describe('Round 5: Frenzy, Freeze Synergies, Untrickable & Transform Mechanics', () => {
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
    image: `/assets/${id}.png`,
    ...options,
  })

  // ==========================================================
  // 1. FRENZY & BONUS ATTACKS (triggerBonusAttack)
  // ==========================================================
  describe('Frenzy & Bonus Attack Engine', () => {
    it('should allow a minion to execute an out-of-sequence Bonus Attack against an opposing minion', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p1', 'Repeater', 'plants', 2, 4)
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 2, 4)

      const result = triggerBonusAttack(state, 1, 'plants')
      expect(result.events.length).toBeGreaterThan(0)
      // Zombie took 2 damage from Bonus Attack (4 - 2 = 2 HP)
      expect(result.updatedState.lanes[1].zombieMinion?.currentHealth).toBe(2)
      // Defender does not retaliate during a bonus attack! Repeater remains at 4 HP
      expect(result.updatedState.lanes[1].plantMinion?.currentHealth).toBe(4)
    })

    it('should strike enemy Hero directly when executing Bonus Attack in an open lane', () => {
      const state = createInitialGameState()
      state.lanes[2].plantMinion = createMockMinion('p2', 'Gatling Pea', 'plants', 5, 4)
      state.zombieHero.hp = 20

      const result = triggerBonusAttack(state, 2, 'plants')
      expect(result.updatedState.zombieHero.hp).toBe(15)
      expect(result.events.some(e => e.target === 'hero' && e.damageDealt === 5)).toBe(true)
    })

    it('should prevent a frozen minion from performing a Bonus Attack', () => {
      const state = createInitialGameState()
      state.lanes[0].zombieMinion = createMockMinion('z_frozen', 'Frozen Imp', 'zombies', 3, 3, { isFrozen: true })
      state.plantHero.hp = 20

      const result = triggerBonusAttack(state, 0, 'zombies')
      expect(result.events.length).toBe(0)
      expect(result.logs.some(log => log.includes('Frozen') || log.includes('đóng băng'))).toBe(true)
      expect(result.updatedState.plantHero.hp).toBe(20)
    })

    it('should trigger Frenzy follow-up attack during Bonus Attack when defender is destroyed', () => {
      const state = createInitialGameState()
      // Zombie with Frenzy (4 ATK) vs Plant (2 HP)
      state.lanes[1].zombieMinion = createMockMinion('z_frenzy', 'Smashing Gargantuar', 'zombies', 5, 5, { frenzy: true })
      state.lanes[1].plantMinion = createMockMinion('p_chump', 'Puff-shroom', 'plants', 1, 1)
      state.plantHero.hp = 20

      const result = triggerBonusAttack(state, 1, 'zombies')
      // Puff-shroom destroyed
      expect(result.updatedState.lanes[1].plantMinion).toBeNull()
      // Smashing Gargantuar Frenzy triggered follow-up attack into Plant Hero for 5 dmg
      expect(result.updatedState.plantHero.hp).toBe(15)
      expect(result.events.some((e: CombatEvent) => e.traitsTriggered?.includes('frenzy'))).toBe(true)
    })

    it('should trigger Frenzy in standard combat when Zombie destroys Plant and lane becomes clear', () => {
      const state = createInitialGameState()
      state.lanes[0].zombieMinion = createMockMinion('z_frenzy', 'Vimpyre', 'zombies', 3, 4, { frenzy: true })
      state.lanes[0].plantMinion = createMockMinion('p_victim', 'Sunflower', 'plants', 0, 1)
      state.plantHero.hp = 20

      const { updatedState, events } = resolveSingleLaneCombat(state, 0)
      expect(updatedState.lanes[0].plantMinion).toBeNull()
      expect(updatedState.lanes[0].zombieMinion?.currentHealth).toBe(4)
      // Sunflower destroyed -> Frenzy hits Plant Hero for 3
      expect(updatedState.plantHero.hp).toBe(17)
      expect(events.some(e => e.traitsTriggered?.includes('frenzy'))).toBe(true)
    })

    it('should direct Frenzy attack to Team-Up minion if present in the same lane', () => {
      const state = createInitialGameState()
      state.lanes[0].zombieMinion = createMockMinion('z_frenzy', 'All-Star', 'zombies', 4, 6, { frenzy: true })
      state.lanes[0].plantMinion = createMockMinion('p_front', 'Wall-Nut', 'plants', 0, 3)
      state.lanes[0].plantTeamUpMinion = createMockMinion('p_teamup', 'Peashooter', 'plants', 1, 4, { teamUp: true })
      state.plantHero.hp = 20

      const { updatedState, events } = resolveSingleLaneCombat(state, 0)
      // Wall-Nut took 4 dmg and was destroyed
      expect(updatedState.lanes[0].plantMinion).toBeNull()
      // Frenzy attacks and destroys the Team-Up Peashooter in the same lane!
      expect(updatedState.lanes[0].plantTeamUpMinion).toBeNull()
      // Plant Hero remains unharmed because Team-Up absorbed the Frenzy hit
      expect(updatedState.plantHero.hp).toBe(20)
      expect(events.some(e => e.traitsTriggered?.includes('frenzy'))).toBe(true)
    })

    it('should NOT trigger Frenzy if the defender minion survives the attack', () => {
      const state = createInitialGameState()
      state.lanes[2].zombieMinion = createMockMinion('z_frenzy', 'Gargantuar', 'zombies', 3, 5, { frenzy: true })
      state.lanes[2].plantMinion = createMockMinion('p_tank', 'Tall-Nut', 'plants', 0, 6)
      state.plantHero.hp = 20

      const { updatedState } = resolveSingleLaneCombat(state, 2)
      // Tall-Nut took 3 damage, still has 3 HP
      expect(updatedState.lanes[2].plantMinion?.currentHealth).toBe(3)
      // No Frenzy trigger to hero
      expect(updatedState.plantHero.hp).toBe(20)
    })

    it('should NOT trigger Frenzy if the attacker dies during combat exchange', () => {
      const state = createInitialGameState()
      state.lanes[1].zombieMinion = createMockMinion('z_glass', 'Glass Zombie', 'zombies', 5, 2, { frenzy: true })
      state.lanes[1].plantMinion = createMockMinion('p_heavy', 'Heavy Plant', 'plants', 5, 2)
      state.plantHero.hp = 20

      const { updatedState } = resolveSingleLaneCombat(state, 1)
      // Both died
      expect(updatedState.lanes[1].zombieMinion).toBeNull()
      expect(updatedState.lanes[1].plantMinion).toBeNull()
      // Frenzy should not trigger from grave
      expect(updatedState.plantHero.hp).toBe(20)
    })

    it('should trigger Frenzy across full multi-lane resolveCombat', () => {
      const state = createInitialGameState()
      state.lanes[3].zombieMinion = createMockMinion('z_beast', 'Overstuffed Zombie', 'zombies', 4, 5, { frenzy: true })
      state.lanes[3].plantMinion = createMockMinion('p_small', 'Small Nut', 'plants', 0, 2)
      state.plantHero.hp = 20

      const { updatedState, result } = resolveCombat(state)
      expect(updatedState.lanes[3].plantMinion).toBeNull()
      expect(updatedState.plantHero.hp).toBe(16)
      expect(result.events.some((e: CombatEvent) => e.traitsTriggered?.includes('frenzy'))).toBe(true)
    })
  })

  // ==========================================================
  // 2. FREEZE SYNERGIES & THAWING (freezeMinion)
  // ==========================================================
  describe('Freeze Synergies & Thawing Mechanics', () => {
    it('should set isFrozen to true when freezeMinion is called', () => {
      const state = createInitialGameState()
      state.lanes[0].zombieMinion = createMockMinion('z1', 'Basic Zombie', 'zombies', 2, 2)

      const { updatedState, events } = freezeMinion(state, 0, 'zombies')
      expect(updatedState.lanes[0].zombieMinion?.isFrozen).toBe(true)
      expect(events.some(e => e.includes('Đóng băng'))).toBe(true)
    })

    it('should trigger Snowdrop to gain +2/+2 whenever an enemy Zombie is frozen', () => {
      const state = createInitialGameState()
      state.lanes[0].plantMinion = createMockMinion('p_snowdrop', 'Snowdrop', 'plants', 1, 2, {
        cardId: 'plant_snowdrop',
      })
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 2, 3)

      const { updatedState, events } = freezeMinion(state, 1, 'zombies')
      // Snowdrop buffed from 1/2 to 3/4
      const snowdrop = updatedState.lanes[0].plantMinion
      expect(snowdrop?.currentAttack).toBe(3)
      expect(snowdrop?.currentHealth).toBe(4)
      expect(events.some(e => e.includes('Snowdrop') && e.includes('+2/+2'))).toBe(true)
    })

    it('should trigger Winter Squash to instantly destroy any frozen enemy Zombie', () => {
      const state = createInitialGameState()
      state.lanes[0].plantMinion = createMockMinion('p_ws', 'Winter Squash', 'plants', 2, 6, {
        cardId: 'plant_winter_squash',
      })
      state.lanes[2].zombieMinion = createMockMinion('z_garg', 'Gargantuar', 'zombies', 5, 8)

      const { updatedState, events } = freezeMinion(state, 2, 'zombies')
      // Winter Squash crushes the frozen zombie immediately
      expect(updatedState.lanes[2].zombieMinion).toBeNull()
      expect(events.some(e => e.includes('Winter Squash') && e.includes('Tiêu diệt'))).toBe(true)
    })

    it('should execute both Snowdrop buff and Winter Squash destruction concurrently', () => {
      const state = createInitialGameState()
      state.lanes[0].plantMinion = createMockMinion('p_snowdrop', 'Snowdrop', 'plants', 1, 2, {
        cardId: 'plant_snowdrop',
      })
      state.lanes[1].plantMinion = createMockMinion('p_ws', 'Winter Squash', 'plants', 2, 6, {
        cardId: 'plant_winter_squash',
      })
      state.lanes[3].zombieMinion = createMockMinion('z3', 'Buckethead', 'zombies', 3, 5)

      const { updatedState } = freezeMinion(state, 3, 'zombies')
      // Snowdrop got +2/+2
      expect(updatedState.lanes[0].plantMinion?.currentAttack).toBe(3)
      expect(updatedState.lanes[0].plantMinion?.currentHealth).toBe(4)
      // Buckethead destroyed by Winter Squash
      expect(updatedState.lanes[3].zombieMinion).toBeNull()
    })

    it('should NOT trigger Snowdrop buff when a Plant is frozen', () => {
      const state = createInitialGameState()
      state.lanes[0].plantMinion = createMockMinion('p_snowdrop', 'Snowdrop', 'plants', 1, 2, {
        cardId: 'plant_snowdrop',
      })
      state.lanes[1].plantMinion = createMockMinion('p1', 'Peashooter', 'plants', 2, 2)

      const { updatedState } = freezeMinion(state, 1, 'plants')
      expect(updatedState.lanes[1].plantMinion?.isFrozen).toBe(true)
      // Snowdrop should not gain stats from friendly freezes
      expect(updatedState.lanes[0].plantMinion?.currentAttack).toBe(1)
      expect(updatedState.lanes[0].plantMinion?.currentHealth).toBe(2)
    })

    it('should thaw a frozen minion and skip its attack during combat phase', () => {
      const state = createInitialGameState()
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 3, 3, { isFrozen: true })
      state.lanes[1].plantMinion = createMockMinion('p1', 'Peashooter', 'plants', 2, 4)

      const { updatedState, events } = resolveSingleLaneCombat(state, 1)
      // Zombie skipped attack: plant took 0 damage (remains at 4 HP)
      expect(updatedState.lanes[1].plantMinion?.currentHealth).toBe(4)
      // Plant attacked: zombie took 2 damage (3 - 2 = 1 HP)
      expect(updatedState.lanes[1].zombieMinion?.currentHealth).toBe(1)
      // Zombie is now thawed
      expect(updatedState.lanes[1].zombieMinion?.isFrozen).toBe(false)
      expect(events.some(e => e.description.includes('tan băng'))).toBe(true)
    })

    it('should thaw a frozen Plant minion and skip its attack during combat phase', () => {
      const state = createInitialGameState()
      state.lanes[2].plantMinion = createMockMinion('p2', 'Repeater', 'plants', 4, 3, { isFrozen: true })
      state.lanes[2].zombieMinion = createMockMinion('z2', 'Zombie', 'zombies', 2, 5)

      const { updatedState, events } = resolveSingleLaneCombat(state, 2)
      // Plant skipped attack: zombie took 0 damage (remains at 5 HP)
      expect(updatedState.lanes[2].zombieMinion?.currentHealth).toBe(5)
      // Zombie attacked: plant took 2 damage (3 - 2 = 1 HP)
      expect(updatedState.lanes[2].plantMinion?.currentHealth).toBe(1)
      // Plant is now thawed
      expect(updatedState.lanes[2].plantMinion?.isFrozen).toBe(false)
      expect(events.some(e => e.description.includes('tan băng'))).toBe(true)
    })
  })

  // ==========================================================
  // 3. UNTRICKABLE TRAIT (isUntrickable & Trick/Power Immunity)
  // ==========================================================
  describe('Untrickable Trait Protections', () => {
    it('isUntrickable helper should correctly identify untrickable minions and heroes', () => {
      const unit1 = createMockMinion('u1', 'Apotheosis', 'plants', 3, 3, { untrickable: true })
      const unit2 = createMockMinion('u2', 'Dragon', 'plants', 3, 3, { traits: ['untrickable'] })
      const unit3 = createMockMinion('u3', 'Normal', 'plants', 2, 2)

      expect(isUntrickable(unit1)).toBe(true)
      expect(isUntrickable(unit2)).toBe(true)
      expect(isUntrickable(unit3)).toBe(false)
      expect(isUntrickable(null)).toBe(false)
      expect(isUntrickable(undefined)).toBe(false)
    })

    it('should block enemy removal trick Locust Swarm on Untrickable plant', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p_untrick', 'Parasol Plant', 'plants', 3, 6, {
        untrickable: true,
      })
      state.zombieHero.brains = 10

      const locustSwarm = createMockCard('zombie_locust_swarm', 'Locust Swarm', 'zombies', 5, 0, 0, {
        type: 'trick',
      })

      const res = executeTrick(state, locustSwarm, 'zombies', 1)
      expect(res.success).toBe(false)
      expect(res.message).toContain('Untrickable')
      // Plant survived untouched
      expect(res.updatedState.lanes[1].plantMinion).not.toBeNull()
    })

    it('should block enemy damage trick Bungee Plumber on Untrickable plant', () => {
      const state = createInitialGameState()
      state.lanes[0].plantMinion = createMockMinion('p_untrick', 'Untrickable Cactus', 'plants', 2, 4, {
        untrickable: true,
      })
      state.zombieHero.brains = 5

      const bungee = createMockCard('zombie_bungee_plumber', 'Bungee Plumber', 'zombies', 1, 0, 0, {
        type: 'trick',
      })

      const res = executeTrick(state, bungee, 'zombies', 0)
      expect(res.success).toBe(false)
      expect(res.message).toContain('Untrickable')
      expect(res.updatedState.lanes[0].plantMinion?.currentHealth).toBe(4)
    })

    it('should block enemy Squash and Berry Blast on Untrickable zombie', () => {
      const state = createInitialGameState()
      state.lanes[2].zombieMinion = createMockMinion('z_fossil', 'Fossilhead', 'zombies', 4, 5, {
        untrickable: true,
      })
      state.plantHero.sun = 10

      const squash = createMockCard('plant_squash', 'Squash', 'plants', 5, 0, 0, { type: 'trick' })
      const resSquash = executeTrick(state, squash, 'plants', 2)
      expect(resSquash.success).toBe(false)
      expect(resSquash.message).toContain('Untrickable')
      expect(resSquash.updatedState.lanes[2].zombieMinion).not.toBeNull()

      const berryBlast = createMockCard('plant_berry_blast', 'Berry Blast', 'plants', 2, 0, 0, { type: 'trick' })
      const resBerry = executeTrick(state, berryBlast, 'plants', 2)
      expect(resBerry.success).toBe(false)
      expect(resBerry.message).toContain('Untrickable')
    })

    it('should allow friendly buff tricks on friendly Untrickable units', () => {
      const state = createInitialGameState()
      state.lanes[0].zombieMinion = createMockMinion('z_untrick', 'Jurassic Fossilhead', 'zombies', 4, 5, {
        untrickable: true,
      })
      state.zombieHero.brains = 5

      // Zombie friendly trick: Lurch for Lunch (bonus attack) or buff
      const lurch = createMockCard('zombie_lurch_for_lunch', 'Lurch for Lunch', 'zombies', 2, 0, 0, { type: 'trick' })
      const res = executeTrick(state, lurch, 'zombies', 0)
      expect(res.success).toBe(true)
    })

    it('should skip Untrickable units in AOE Weed Spray and Cherry Bomb', () => {
      const state = createInitialGameState()
      // Lane 0: Untrickable plant with 2 ATK
      state.lanes[0].plantMinion = createMockMinion('p_safe', 'Safe Sprout', 'plants', 2, 2, { untrickable: true })
      // Lane 1: Normal plant with 2 ATK
      state.lanes[1].plantMinion = createMockMinion('p_vulnerable', 'Normal Sprout', 'plants', 2, 2)
      state.zombieHero.brains = 5

      const weedSpray = createMockCard('zombie_weed_spray', 'Weed Spray', 'zombies', 3, 0, 0, { type: 'trick' })
      const res = executeTrick(state, weedSpray, 'zombies')
      expect(res.success).toBe(true)
      // Normal plant was destroyed
      expect(res.updatedState.lanes[1].plantMinion).toBeNull()
      // Untrickable plant was spared!
      expect(res.updatedState.lanes[0].plantMinion).not.toBeNull()
      expect(res.updatedState.lanes[0].plantMinion?.name).toBe('Safe Sprout')
    })

    it('should protect Untrickable Hero against enemy direct damage tricks', () => {
      const state = createInitialGameState()
      state.plantHero.untrickable = true
      state.plantHero.hp = 20
      state.zombieHero.brains = 5

      const bungee = createMockCard('zombie_bungee_plumber', 'Bungee Plumber', 'zombies', 1, 0, 0, {
        type: 'trick',
      })
      const res = executeTrick(state, bungee, 'zombies', undefined, undefined, true)
      expect(res.success).toBe(false)
      expect(res.message).toContain('Untrickable')
      expect(res.updatedState.plantHero.hp).toBe(20)
    })

    it('should protect Untrickable units against enemy superpowers like Goatify and Precision Blast', () => {
      const state = createInitialGameState()
      // Lane 2: Middle lane Zombie with Untrickable
      state.lanes[2].zombieMinion = createMockMinion('z_boss', 'Super Zombie', 'zombies', 6, 6, { untrickable: true })

      // Precision Blast on middle lane
      const pbRes = executeSuperpower(state, 'plant_precision_blast', 'plants')
      expect(pbRes.updatedState.lanes[2].zombieMinion?.currentHealth).toBe(6)
      expect(pbRes.message).toContain('Untrickable')

      // Goatify (Rose signature): should not target the untrickable zombie
      const goatRes = executeSuperpower(state, 'sp_goatify', 'plants')
      expect(goatRes.updatedState.lanes[2].zombieMinion?.cardId).not.toBe('zombie_goat')
      expect(goatRes.message).toContain('Untrickable')
    })
  })

  // ==========================================================
  // 4. TRANSFORM MECHANICS (transformMinion)
  // ==========================================================
  describe('Transform Mechanics (transformMinion)', () => {
    it('should transform an existing minion into a new minion based on newCard', () => {
      const state = createInitialGameState()
      // Initial plant: damaged 1/1 Peashooter
      state.lanes[1].plantMinion = createMockMinion('p_old', 'Peashooter', 'plants', 1, 1, {
        currentAttack: 1,
        currentHealth: 1,
        maxHealth: 3,
      })

      const newCard = createMockCard('plant_cornucopia', 'Cornucopia', 'plants', 10, 6, 6, {
        frenzy: true,
        amphibious: true,
      })

      const { updatedState, transformedMinion, events } = transformMinion(state, 1, 'plants', newCard)
      expect(transformedMinion).not.toBeNull()
      expect(transformedMinion?.name).toBe('Cornucopia')
      expect(transformedMinion?.currentAttack).toBe(6)
      expect(transformedMinion?.currentHealth).toBe(6)
      expect(transformedMinion?.frenzy).toBe(true)
      expect(transformedMinion?.amphibious).toBe(true)

      // Verified lane placement updated
      expect(updatedState.lanes[1].plantMinion?.name).toBe('Cornucopia')
      expect(events.some(e => e.includes('Biến hình'))).toBe(true)
    })

    it('should reset previous stat buffs and damage when transformed', () => {
      const state = createInitialGameState()
      state.lanes[0].zombieMinion = createMockMinion('z_buffed', 'Buffed Zombie', 'zombies', 10, 15, {
        isFrozen: true,
        armored: 2,
      })

      const goatCard = createMockCard('zombie_goat', 'Goat', 'zombies', 1, 1, 1)
      const { updatedState } = transformMinion(state, 0, 'zombies', goatCard)

      const transformed = updatedState.lanes[0].zombieMinion!
      expect(transformed.name).toBe('Goat')
      expect(transformed.currentAttack).toBe(1)
      expect(transformed.currentHealth).toBe(1)
      expect(transformed.isFrozen).toBeFalsy()
      expect(transformed.armored).toBe(0)
    })

    it('should apply continuous environment effects when transformed in an active environment', () => {
      const state = createInitialGameState()
      // Environment in lane 3: Laser Base Alpha (gives Zombie Deadly + Strikethrough)
      state.lanes[3].environment = {
        id: 'zombie_laser_base_alpha',
        name: 'Laser Base Alpha',
        side: 'zombies',
        description: 'Zombies here get Deadly and Strikethrough',
        image: '/assets/laser_base.png',
      }
      state.lanes[3].zombieMinion = createMockMinion('z3', 'Regular Zombie', 'zombies', 2, 2)

      const newZombieCard = createMockCard('zombie_all_star', 'All-Star Zombie', 'zombies', 5, 4, 6)
      const { transformedMinion } = transformMinion(state, 3, 'zombies', newZombieCard)

      expect(transformedMinion?.deadly).toBe(true)
      expect(transformedMinion?.strikethrough).toBe(true)
    })

    it('should trigger When Played ability of the newly transformed minion', () => {
      const state = createInitialGameState()
      state.lanes[2].plantMinion = createMockMinion('p_target', 'Target Plant', 'plants', 2, 5)
      state.lanes[2].zombieMinion = createMockMinion('z_dummy', 'Dummy', 'zombies', 1, 1)

      // Transform dummy into Conga Zombie (When Played: Do 1 damage)
      const congaCard = createMockCard('zombie_conga_zombie', 'Conga Zombie', 'zombies', 2, 2, 2)
      const { updatedState, events } = transformMinion(state, 2, 'zombies', congaCard)

      // Conga Zombie When Played dealt 1 damage to Target Plant (5 - 1 = 4 HP)
      expect(updatedState.lanes[2].plantMinion?.currentHealth).toBe(4)
      expect(events.some(e => e.includes('Conga Zombie') && e.includes('1 sát thương'))).toBe(true)
    })
  })
})
