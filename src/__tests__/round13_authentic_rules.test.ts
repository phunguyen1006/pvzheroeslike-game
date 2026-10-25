import { describe, it, expect } from 'vitest'
import {
  createInitialGameState,
  resolveSingleLaneCombat,
  triggerBonusAttack,
  executeTrick,
  executeSuperpower,
} from '../engine/index'
import { resolveCombat, applyHeroDamage } from '../engine/combat'
import { triggerOnMultipleDeaths } from '../engine/triggers'
import { isUntrickable } from '../engine/abilities'
import { ALL_CARDS, ALL_HEROES, getCardById } from '../data/cards'
import { validateDeckForHero, createCustomDeck } from '../data/decks'
import {
  ALL_CAMPAIGN_MISSIONS,
  ALL_ZOMBIE_CAMPAIGN_MISSIONS,
  calculateMissionStars,
} from '../data/campaign'
import type { Minion, Card, GameState } from '../engine/types'

describe('Round 13: Authentic Rules & Mechanics Verification', () => {
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

  // =========================================================================
  // 1. FREEZE + BONUS ATTACK SUPPRESSION
  // =========================================================================
  describe('1. Freeze + Bonus Attack Suppression', () => {
    it('prevents frozen zombie from bonus attacking via Lurch for Lunch', () => {
      const state = createInitialGameState()
      state.lanes[0].zombieMinion = createMockMinion('z1', 'Disco Zombie', 'zombies', 3, 3, { isFrozen: true })
      state.lanes[0].plantMinion = createMockMinion('p1', 'Repeater', 'plants', 2, 4)

      const lurch = createMockCard('zombie_lurch_for_lunch', 'Lurch for Lunch', 'zombies', 2, 'trick')
      const res = executeTrick(state, lurch, 0)

      expect(res.message).toContain('đang bị đóng băng')
      expect(res.updatedState.lanes[0].plantMinion!.currentHealth).toBe(4)
    })

    it('prevents frozen zombie from bonus attacking via Carried Away superpower', () => {
      const state = createInitialGameState()
      state.lanes[0].zombieMinion = createMockMinion('z1', 'Imp', 'zombies', 2, 2, { isFrozen: true })
      state.lanes[2].plantMinion = createMockMinion('p1', 'Cactus', 'plants', 1, 5)

      const carriedAway = createMockCard('zombie_carried_away', 'Carried Away', 'zombies', 1, 'superpower')
      const res = executeSuperpower(state, 'zombie_carried_away', 'zombies', 2)

      expect(res.updatedState.lanes[0].zombieMinion).toBeNull()
      expect(res.updatedState.lanes[2].zombieMinion).not.toBeNull()
      expect(res.message).toContain('không thể Bonus Attack')
      expect(res.updatedState.lanes[2].plantMinion!.currentHealth).toBe(5)
    })

    it('prevents frozen minions from executing triggerBonusAttack for both Plants and Zombies', () => {
      const state = createInitialGameState()
      state.lanes[0].plantMinion = createMockMinion('p1', 'Bonk Choy', 'plants', 3, 3, { isFrozen: true })
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 2, 4, { isFrozen: true })

      const plantBonus = triggerBonusAttack(state, 0, 'plants')
      expect(plantBonus.events.length).toBe(0)
      expect(plantBonus.logs.some(l => l.includes('đang bị đóng băng') || l.includes('Frozen'))).toBe(true)

      const zombieBonus = triggerBonusAttack(state, 1, 'zombies')
      expect(zombieBonus.events.length).toBe(0)
      expect(zombieBonus.logs.some(l => l.includes('đang bị đóng băng') || l.includes('Frozen'))).toBe(true)
    })
  })

  // =========================================================================
  // 2. UNTRICKABLE VS ENVIRONMENTAL & MINION ABILITIES
  // =========================================================================
  describe('2. Untrickable vs Environmental Hazards & Minion Abilities', () => {
    it('protects untrickable plant from direct single-target zombie trick (Locust Swarm)', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p_untrickable', 'Apotheosis', 'plants', 5, 5, {
        untrickable: true,
        traits: ['untrickable'],
      })

      expect(isUntrickable(state.lanes[1].plantMinion)).toBe(true)

      const locust = createMockCard('zombie_locust_swarm', 'Locust Swarm', 'zombies', 5, 'trick')
      const res = executeTrick(state, locust, 1)

      expect(res.message).toContain('Untrickable')
      expect(res.updatedState.lanes[1].plantMinion).not.toBeNull()
      expect(res.updatedState.lanes[1].plantMinion!.currentHealth).toBe(5)
    })

    it('protects untrickable zombie from direct single-target plant trick (Berry Blast)', () => {
      const state = createInitialGameState()
      state.lanes[2].zombieMinion = createMockMinion('z_untrickable', 'Jurassic Fossilhead', 'zombies', 3, 5, {
        untrickable: true,
        traits: ['untrickable'],
      })

      expect(isUntrickable(state.lanes[2].zombieMinion)).toBe(true)

      const berryBlast = createMockCard('plant_berry_blast', 'Berry Blast', 'plants', 2, 'trick')
      const res = executeTrick(state, berryBlast, 2)

      expect(res.message).toContain('Untrickable')
      expect(res.updatedState.lanes[2].zombieMinion!.currentHealth).toBe(5)
    })

    it('damages untrickable zombie from Environmental Hazard (Spikeweed Sector dealing 2 damage at combat start)', () => {
      const state = createInitialGameState()
      state.lanes[0].environment = {
        id: 'plant_spikeweed_sector',
        name: 'Spikeweed Sector',
        type: 'ground',
        cardId: 'plant_spikeweed_sector',
      }
      state.lanes[0].zombieMinion = createMockMinion('z_untrickable', 'Untrickable Zombie', 'zombies', 2, 4, {
        untrickable: true,
        traits: ['untrickable'],
      })

      const combatRes = resolveSingleLaneCombat(state, 0)
      expect(combatRes.updatedState.lanes[0].zombieMinion!.currentHealth).toBe(2)
      expect(combatRes.events.some(e => e.attackerName.includes('Spikeweed Sector'))).toBe(true)
    })

    it('damages untrickable minion from Minion Ability (Galacta-Cactus on-death cosmic explosion)', () => {
      const state = createInitialGameState()
      state.lanes[0].plantMinion = createMockMinion('gc', 'Galacta-Cactus', 'plants', 2, 1, {
        cardId: 'plant_galacta_cactus',
      })
      state.lanes[1].zombieMinion = createMockMinion('z_untrick', 'Untrickable Zombie', 'zombies', 3, 5, {
        untrickable: true,
        traits: ['untrickable'],
      })

      // Trigger death explosion
      const triggerRes = triggerOnMultipleDeaths(state, [{ minion: state.lanes[0].plantMinion!, laneIndex: 0 }])

      // Untrickable zombie must take 1 cosmic damage
      expect(triggerRes.updatedState.lanes[1].zombieMinion!.currentHealth).toBe(4)
      expect(triggerRes.logs.some(l => l.includes('Galacta-Cactus') && l.includes('1 sát thương'))).toBe(true)
    })

    it('damages untrickable adjacent minion from Minion Ability (Cob Cannon Splash 4)', () => {
      const state = createInitialGameState()
      state.lanes[2].plantMinion = createMockMinion('cob', 'Cob Cannon', 'plants', 6, 6, {
        cardId: 'plant_cob_cannon',
        splashDamage: 4,
        traits: ['Splash Damage 4'],
      })
      state.lanes[2].zombieMinion = createMockMinion('z_center', 'Center Zombie', 'zombies', 2, 8)
      // Adjacent lane 1 has untrickable zombie
      state.lanes[1].zombieMinion = createMockMinion('z_adj_untrick', 'Adjacent Untrickable', 'zombies', 2, 6, {
        untrickable: true,
        traits: ['untrickable'],
      })

      const combatRes = resolveSingleLaneCombat(state, 2)

      // Adjacent untrickable zombie takes 4 splash damage -> 6 - 4 = 2 HP
      expect(combatRes.updatedState.lanes[1].zombieMinion!.currentHealth).toBe(2)
      expect(combatRes.events.some(e => e.attackerName.includes('Splash Damage 4'))).toBe(true)
    })
  })

  // =========================================================================
  // 3. ANTI-HERO & TEAM-UP DYNAMIC TOGGLE
  // =========================================================================
  describe('3. Anti-Hero & Team-Up Dynamic Toggle', () => {
    it('activates Anti-Hero bonus damage against enemy Hero when opposing lane is completely empty', () => {
      const state = createInitialGameState()
      state.zombieHero.hp = 20
      // Plant with Anti-Hero 2 and 2 base attack
      state.lanes[1].plantMinion = createMockMinion('p_anti', 'Poison Ivy', 'plants', 1, 3, {
        antiHero: 2,
        traits: ['Anti-Hero 2'],
      })
      state.lanes[1].zombieMinion = null

      const combatRes = resolveSingleLaneCombat(state, 1)

      // Total damage to Zombie Hero = 1 (base attack) + 2 (Anti-Hero) = 3 damage!
      expect(combatRes.updatedState.zombieHero.hp).toBe(17)
      expect(combatRes.events.some(e => e.target === 'hero' && e.damageDealt === 3)).toBe(true)
    })

    it('immediately deactivates Anti-Hero bonus when an opposing enemy minion enters the lane', () => {
      const state = createInitialGameState()
      state.zombieHero.hp = 20
      state.lanes[1].plantMinion = createMockMinion('p_anti', 'Poison Ivy', 'plants', 1, 3, {
        antiHero: 2,
        traits: ['Anti-Hero 2'],
      })
      // Enemy minion enters lane 1
      state.lanes[1].zombieMinion = createMockMinion('z_blocker', 'Blocker Zombie', 'zombies', 1, 5)

      const combatRes = resolveSingleLaneCombat(state, 1)

      // Poison Ivy deals only base 1 damage to Zombie minion (Anti-Hero 2 does NOT apply against minions)
      expect(combatRes.updatedState.lanes[1].zombieMinion!.currentHealth).toBe(4)
      // Zombie Hero took 0 damage
      expect(combatRes.updatedState.zombieHero.hp).toBe(20)
    })

    it('deactivates Zombie Anti-Hero bonus when a Team-Up Plant minion is present in the lane', () => {
      const state = createInitialGameState()
      state.plantHero.hp = 20
      // Zombie with Anti-Hero 3 and 3 base attack
      state.lanes[3].zombieMinion = createMockMinion('z_anti', 'Stealthy Imp', 'zombies', 3, 2, {
        antiHero: 3,
        traits: ['Anti-Hero 3'],
      })
      // Team-Up plant in lane 3
      state.lanes[3].plantMinion = createMockMinion('p_teamup', 'Wall-Nut', 'plants', 0, 6, {
        traits: ['Team-Up'],
      })

      const combatRes = resolveSingleLaneCombat(state, 3)

      // Stealthy Imp deals only base 3 damage to Wall-Nut (Anti-Hero 3 deactivated by blocker)
      expect(combatRes.updatedState.lanes[3].plantMinion!.currentHealth).toBe(3)
      // Plant Hero takes 0 damage
      expect(combatRes.updatedState.plantHero.hp).toBe(20)
    })
  })

  // =========================================================================
  // 4. DOUBLE STRIKE VS SUPER-BLOCK TIMING
  // =========================================================================
  describe('4. Double Strike vs Super-Block Timing', () => {
    it('triggers Super-Block on Strike 1, then executes Strike 2 against the reset block meter', () => {
      const state = createInitialGameState()
      // Zombie hero starts with 7/8 meter (1 away from super-block)
      state.zombieHero.blockMeter = 7
      state.zombieHero.blockCount = 0
      state.zombieHero.hp = 20

      // Plant with Double Strike, 3 Attack in open lane
      state.lanes[2].plantMinion = createMockMinion('p_repeater', 'Repeater', 'plants', 3, 4, {
        doubleStrike: true,
        traits: ['Double Strike'],
      })
      state.lanes[2].zombieMinion = null

      const combatRes = resolveSingleLaneCombat(state, 2)

      // Strike 1 triggered Super-Block (0 damage dealt to Hero)
      const strike1Event = combatRes.events.find(e => e.attackerName === 'Repeater' && e.target === 'hero')
      expect(strike1Event).toBeDefined()
      expect(strike1Event?.isBlocked).toBe(true)
      expect(strike1Event?.damageDealt).toBe(0)

      // Super-Block was triggered
      expect(combatRes.hasSuperBlock).toBe(true)

      // Strike 2 resolves sequentially: Zombie Hero takes 3 damage
      const strike2Event = combatRes.events.find(e => e.attackerName.includes('Double Strike') && e.target === 'hero')
      expect(strike2Event).toBeDefined()
      expect(strike2Event?.isBlocked).toBe(false)
      expect(strike2Event?.damageDealt).toBe(3)

      // Overall HP was reduced by Strike 2 (20 - 3 = 17)
      expect(combatRes.updatedState.zombieHero.hp).toBe(17)
    })

    it('executes both strikes cleanly when meter does not hit 8/8', () => {
      const state = createInitialGameState()
      state.zombieHero.blockMeter = 0
      state.zombieHero.blockCount = 0
      state.zombieHero.hp = 20

      state.lanes[1].plantMinion = createMockMinion('p_gatling', 'Gatling Pea', 'plants', 4, 4, {
        doubleStrike: true,
        traits: ['Double Strike'],
      })
      state.lanes[1].zombieMinion = null

      const combatRes = resolveSingleLaneCombat(state, 1)

      const heroHits = combatRes.events.filter(e => e.target === 'hero')
      expect(heroHits.length).toBe(2)
      // Both attacks dealt 4 damage each (total 8)
      expect(combatRes.updatedState.zombieHero.hp).toBe(12)
    })
  })

  // =========================================================================
  // 5. DECK HERO CLASS ALIGNMENT
  // =========================================================================
  describe('5. Deck Hero Class Alignment & Team Verification', () => {
    it('validates that Green Shadow can only include Mega-Grow and Smarty cards', () => {
      const validCards = [
        'plant_peashooter', // Mega-Grow
        'plant_snow_pea',   // Smarty
        'plant_shooting_starfruit', // Smarty
        'plant_gatling_pea', // Mega-Grow
      ]
      const deck = createCustomDeck(validCards)
      const res = validateDeckForHero('hero_green_shadow', deck)
      expect(res.valid).toBe(true)
      expect(res.errors.length).toBe(0)
    })

    it('rejects cards outside Green Shadow classes (e.g. Solar, Kabloom, Guardian)', () => {
      const invalidCards = [
        'plant_sunflower', // Solar
        'plant_wall_nut',   // Guardian
        'plant_berry_blast', // Kabloom
      ]
      const deck = createCustomDeck(invalidCards)
      const res = validateDeckForHero('hero_green_shadow', deck)
      expect(res.valid).toBe(false)
      expect(res.errors.length).toBe(3)
      expect(res.errors.some(e => e.includes('Solar'))).toBe(true)
      expect(res.errors.some(e => e.includes('Guardian'))).toBe(true)
      expect(res.errors.some(e => e.includes('Kabloom'))).toBe(true)
    })

    it('validates that Super Brainz can only include Brainy and Sneaky zombie cards', () => {
      const sbValidCards = [
        'zombie_trickster', // Brainy
        'zombie_dr_spacetime', // Sneaky
      ]
      const validDeck = createCustomDeck(sbValidCards)
      const validRes = validateDeckForHero('hero_super_brainz', validDeck)
      expect(validRes.valid).toBe(true)

      const sbInvalidCards = [
        'zombie_locust_swarm', // Beastly
        'zombie_weed_spray', // Hearty
        'zombie_bungee_plumber', // Crazy
      ]
      const invalidDeck = createCustomDeck(sbInvalidCards)
      const invalidRes = validateDeckForHero('hero_super_brainz', invalidDeck)
      expect(invalidRes.valid).toBe(false)
      expect(invalidRes.errors.length).toBe(3)
    })

    it('strictly enforces team alignment between cards and hero', () => {
      // Trying to put Plant cards into a Zombie deck
      const mixedDeck = createCustomDeck(['plant_peashooter'])
      const res = validateDeckForHero('hero_super_brainz', mixedDeck)
      expect(res.valid).toBe(false)
      expect(res.errors.some(e => e.includes('does not match Hero'))).toBe(true)
    })

    it('enforces maximum 4-copy rule per unique card in a deck', () => {
      const fiveCopies = createCustomDeck([
        'plant_peashooter',
        'plant_peashooter',
        'plant_peashooter',
        'plant_peashooter',
        'plant_peashooter',
      ])
      const res = validateDeckForHero('hero_green_shadow', fiveCopies)
      expect(res.valid).toBe(false)
      expect(res.errors.some(e => e.includes('maximum limit of 4 copies'))).toBe(true)
    })
  })

  // =========================================================================
  // 6. FULL 20-MISSION CAMPAIGN STAR VERIFICATION
  // =========================================================================
  describe('6. Full 20-Mission Campaign Star Verification', () => {
    // 10 Plant Campaign Missions
    const plantMissions = ALL_CAMPAIGN_MISSIONS.slice(0, 10)
    // 10 Zombie Campaign Missions
    const zombieMissions = ALL_ZOMBIE_CAMPAIGN_MISSIONS.slice(0, 10)

    it('verifies all 10 Plant missions have distinct IDs and clear objectives', () => {
      expect(plantMissions.length).toBe(10)
      plantMissions.forEach((m, idx) => {
        expect(m.id).toBe(`mission_${idx + 1}`)
        expect(m.faction).toBe('plants')
        expect(m.starObjectives.length).toBe(3)
      })
    })

    it('verifies all 10 Zombie missions have distinct IDs and clear objectives', () => {
      expect(zombieMissions.length).toBe(10)
      zombieMissions.forEach((m, idx) => {
        expect(m.id).toBe(`zombie_mission_${idx + 1}`)
        expect(m.faction).toBe('zombies')
        expect(m.starObjectives.length).toBe(3)
      })
    })

    it('evaluates calculateMissionStars correctly for all 10 Plant Missions across all outcomes', () => {
      plantMissions.forEach(mission => {
        // Outcome 1: Defeat -> 0 stars
        expect(calculateMissionStars(mission, 'zombies', 20, 5)).toBe(0)
        expect(calculateMissionStars(mission, null, 20, 5)).toBe(0)

        // Outcome 2: Bare victory (low HP, high turn count) -> 1 star
        expect(calculateMissionStars(mission, 'plants', 1, 99)).toBe(1)

        // Outcome 3: Perfect victory (high HP, low turn count) -> 3 stars
        expect(calculateMissionStars(mission, 'plants', 20, 5)).toBe(3)
      })
    })

    it('evaluates calculateMissionStars correctly for all 10 Zombie Missions across all outcomes', () => {
      zombieMissions.forEach(mission => {
        // Outcome 1: Defeat -> 0 stars
        expect(calculateMissionStars(mission, 'plants', 20, 5)).toBe(0)
        expect(calculateMissionStars(mission, null, 20, 5)).toBe(0)

        // Outcome 2: Bare victory (low HP, high turn count) -> 1 star
        expect(calculateMissionStars(mission, 'zombies', 1, 99)).toBe(1)

        // Outcome 3: Perfect victory (high HP, low turn count) -> 3 stars
        expect(calculateMissionStars(mission, 'zombies', 20, 5)).toBe(3)
      })
    })

    it('validates partial 2-star threshold achievements for specific campaign missions', () => {
      // Mission 1: Plant win with HP >= 12 but turns > 8 -> 2 stars
      const m1 = plantMissions[0]
      expect(calculateMissionStars(m1, 'plants', 15, 12)).toBe(2)

      // Mission 1: Plant win with HP < 12 but turns <= 8 -> 2 stars
      expect(calculateMissionStars(m1, 'plants', 8, 6)).toBe(2)

      // Zombie Mission 1: Zombie win with HP >= 12 but turns > 8 -> 2 stars
      const zm1 = zombieMissions[0]
      expect(calculateMissionStars(zm1, 'zombies', 14, 12)).toBe(2)

      // Zombie Mission 1: Zombie win with HP < 12 but turns <= 8 -> 2 stars
      expect(calculateMissionStars(zm1, 'zombies', 8, 6)).toBe(2)
    })
  })
})
