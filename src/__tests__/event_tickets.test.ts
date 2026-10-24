import { describe, it, expect, beforeEach } from 'vitest'
import {
  WEEKLY_EVENT_ROTATION,
  CURRENT_WEEKLY_EVENT,
  loadEventTicketsProgress,
  calculateMatchTickets,
  addEventTickets,
  claimEventCardCopy,
  getWeeklyEventCountdown,
  type WeeklyEventConfig,
} from '../data/eventTickets'
import {
  createInitialGameState,
  gameReducer,
} from '../engine/reducer'
import { resolveSingleLaneCombat } from '../engine/combat'
import { executeTrick } from '../engine/tricks'
import { isUntrickable } from '../engine/abilities'
import { getCardById } from '../data/cards'
import type { Card, Minion, Side } from '../engine/types'

// ========================================================
// MOCK STORAGE SETUP FOR DETERMINISTIC TESTS
// ========================================================

class MockLocalStorage {
  private store: Record<string, string> = {}
  getItem(key: string): string | null {
    return this.store[key] ?? null
  }
  setItem(key: string, value: string): void {
    this.store[key] = String(value)
  }
  removeItem(key: string): void {
    delete this.store[key]
  }
  clear(): void {
    this.store = {}
  }
}

const mockStorage = new MockLocalStorage()

beforeEach(() => {
  mockStorage.clear()
  ;(globalThis as any).localStorage = mockStorage
})

// ========================================================
// CARD & MINION HELPERS
// ========================================================

function convertCard(raw: any, side: Side): Card {
  return {
    id: raw.id,
    name: raw.name,
    side,
    cost: raw.cost ?? 0,
    attack: raw.attack ?? 0,
    health: raw.hp ?? raw.health ?? 0,
    type: raw.type === 'plant' || raw.type === 'zombie' ? 'minion' : raw.type,
    image: raw.image || raw.assetPath || '',
    traits: raw.traits ?? [],
    amphibious: Boolean(raw.amphibious || raw.traits?.some((t: string) => t.toLowerCase().includes('amphibious'))),
    bullseye: Boolean(raw.bullseye || raw.traits?.some((t: string) => t.toLowerCase().includes('bullseye'))),
    teamUp: Boolean(raw.teamUp || raw.traits?.some((t: string) => t.toLowerCase().includes('team-up'))),
    frenzy: Boolean(raw.frenzy || raw.traits?.some((t: string) => t.toLowerCase().includes('frenzy'))),
    deadly: Boolean(raw.deadly || raw.traits?.some((t: string) => t.toLowerCase().includes('deadly'))),
    strikethrough: Boolean(raw.strikethrough || raw.traits?.some((t: string) => t.toLowerCase().includes('strikethrough'))),
    armored: raw.armored,
    antiHero: raw.antiHero,
    doubleStrike: Boolean(raw.doubleStrike),
    gravestone: Boolean(raw.gravestone || raw.traits?.some((t: string) => t.toLowerCase().includes('gravestone'))),
    untrickable: Boolean(raw.untrickable || raw.traits?.some((t: string) => t.toLowerCase().includes('untrickable'))),
    description: raw.description,
  }
}

const createMockMinion = (
  instanceId: string,
  name: string,
  side: Side,
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

// ========================================================
// TEST SUITES
// ========================================================

describe('Round 9: Weekly Event Tickets System & Combat/Trait Edge Cases', () => {
  // ========================================================
  // PART 1: WEEKLY EVENT TICKETS SYSTEM TESTS
  // ========================================================
  describe('1. Weekly Event Tickets Calculation & Progression', () => {
    it('returns 0 tickets when player loses the match or ends in a draw', () => {
      // Plant player lost (zombies won)
      const plantLoss = calculateMatchTickets('zombies', 'plants', 'hero_solar_flare')
      expect(plantLoss.total).toBe(0)
      expect(plantLoss.base).toBe(0)
      expect(plantLoss.boost).toBe(0)
      expect(plantLoss.isBoosted).toBe(false)

      // Zombie player lost (plants won)
      const zombieLoss = calculateMatchTickets('plants', 'zombies', 'hero_super_brainz')
      expect(zombieLoss.total).toBe(0)

      // Simultaneous lethal draw (winner = null)
      const draw = calculateMatchTickets(null, 'plants', 'hero_solar_flare')
      expect(draw.total).toBe(0)
    })

    it('awards base 100 tickets on match victory with a standard non-boosted hero', () => {
      // Green Shadow is not the boosted plant hero in week 1 (Solar Flare is)
      const result = calculateMatchTickets('plants', 'plants', 'hero_green_shadow')
      expect(result.base).toBe(100)
      expect(result.boost).toBe(0)
      expect(result.total).toBe(100)
      expect(result.isBoosted).toBe(false)
      expect(result.heroName).toBeUndefined()
    })

    it('awards doubled 200 tickets (100 base + 100 boost) when winning with the Boosted Plant Hero', () => {
      // Solar Flare is the boosted plant hero in week 1
      const result = calculateMatchTickets('plants', 'plants', CURRENT_WEEKLY_EVENT.boostedPlantHeroId)
      expect(result.base).toBe(100)
      expect(result.boost).toBe(100)
      expect(result.total).toBe(200)
      expect(result.isBoosted).toBe(true)
      expect(result.heroName).toBe(CURRENT_WEEKLY_EVENT.boostedPlantHeroName)
    })

    it('awards doubled 200 tickets (100 base + 100 boost) when winning with the Boosted Zombie Hero', () => {
      // Super Brainz is the boosted zombie hero in week 1
      const result = calculateMatchTickets('zombies', 'zombies', CURRENT_WEEKLY_EVENT.boostedZombieHeroId)
      expect(result.base).toBe(100)
      expect(result.boost).toBe(100)
      expect(result.total).toBe(200)
      expect(result.isBoosted).toBe(true)
      expect(result.heroName).toBe(CURRENT_WEEKLY_EVENT.boostedZombieHeroName)
    })

    it('accumulates tickets toward 1,200 ticket milestones and unlocks copies sequentially', () => {
      expect(loadEventTicketsProgress().tickets).toBe(0)

      // Add 600 tickets (halfway to copy #1)
      let res = addEventTickets(600)
      expect(res.progress.tickets).toBe(600)
      expect(res.progress.unlockedCopies).toBe(0)
      expect(res.newCopiesUnlocked).toBe(0)

      // Add another 600 tickets (total 1,200) -> Unlocks 1st copy!
      res = addEventTickets(600)
      expect(res.progress.tickets).toBe(1200)
      expect(res.progress.unlockedCopies).toBe(1)
      expect(res.newCopiesUnlocked).toBe(1)

      // Add 1,200 more tickets (total 2,400) -> Unlocks 2nd copy!
      res = addEventTickets(1200)
      expect(res.progress.tickets).toBe(2400)
      expect(res.progress.unlockedCopies).toBe(2)
      expect(res.newCopiesUnlocked).toBe(1)

      // Add 2,400 more tickets (total 4,800) -> Unlocks 3rd and 4th copies!
      res = addEventTickets(2400)
      expect(res.progress.tickets).toBe(4800)
      expect(res.progress.unlockedCopies).toBe(4)
      expect(res.newCopiesUnlocked).toBe(2)
    })

    it('caps ticket accumulation at maximum total tickets (4 copies x 1,200 = 4,800 tickets)', () => {
      // Attempt to add 10,000 tickets
      const res = addEventTickets(10000)
      expect(res.progress.tickets).toBe(4800) // Capped at 4,800
      expect(res.progress.unlockedCopies).toBe(4) // Capped at 4

      // Attempting to add further tickets does not exceed maximum
      const overflowRes = addEventTickets(500)
      expect(overflowRes.progress.tickets).toBe(4800)
      expect(overflowRes.newCopiesUnlocked).toBe(0)
    })

    it('claims unlocked card copies sequentially and rejects invalid claims', () => {
      // 0 unlocked copies initially -> claim fails
      let claimRes = claimEventCardCopy()
      expect(claimRes.success).toBe(false)
      expect(claimRes.progress.claimedCopies).toBe(0)

      // Unlock 2 copies by adding 2,400 tickets
      addEventTickets(2400)

      // Claim copy 1
      claimRes = claimEventCardCopy()
      expect(claimRes.success).toBe(true)
      expect(claimRes.progress.claimedCopies).toBe(1)

      // Claim copy 2
      claimRes = claimEventCardCopy()
      expect(claimRes.success).toBe(true)
      expect(claimRes.progress.claimedCopies).toBe(2)

      // Attempting to claim copy 3 fails because only 2 were unlocked
      claimRes = claimEventCardCopy()
      expect(claimRes.success).toBe(false)
      expect(claimRes.progress.claimedCopies).toBe(2)
    })

    it('calculates countdown accurately for future dates and marks expired for past dates', () => {
      // Future date 2 days, 3 hours, 45 minutes ahead (+ 5s buffer to prevent sub-millisecond second boundary drift)
      const future = new Date(Date.now() + (2 * 24 * 3600 + 3 * 3600 + 45 * 60 + 5) * 1000).toISOString()
      const countdownFuture = getWeeklyEventCountdown(future)
      expect(countdownFuture.isExpired).toBe(false)
      expect(countdownFuture.days).toBe(2)
      expect(countdownFuture.hours).toBe(3)
      expect(countdownFuture.minutes).toBeGreaterThanOrEqual(44)
      expect(countdownFuture.minutes).toBeLessThanOrEqual(45)

      // Past date
      const past = new Date(Date.now() - 10000).toISOString()
      const countdownPast = getWeeklyEventCountdown(past)
      expect(countdownPast.isExpired).toBe(true)
      expect(countdownPast.formatted).toBe('Đã kết thúc')
    })

    it('defines 4 complete weekly rotation events with balanced targets', () => {
      expect(WEEKLY_EVENT_ROTATION).toHaveLength(4)
      WEEKLY_EVENT_ROTATION.forEach((event: WeeklyEventConfig) => {
        expect(event.targetTicketsPerCopy).toBe(1200)
        expect(event.maxCopies).toBe(4)
        expect(event.cardId).toBeDefined()
        expect(event.boostedPlantHeroId).toBeDefined()
        expect(event.boostedZombieHeroId).toBeDefined()
      })
    })
  })

  // ========================================================
  // PART 2: COMBAT & TRAIT EDGE CASES
  // ========================================================
  describe('2. Untrickable Trait Edge Cases', () => {
    it('blocks enemy targeted plant tricks (Berry Blast, Squash) against Untrickable Zombie minions', () => {
      let state = createInitialGameState()
      state.phase = 'PLANT_PLAY'
      state.plantHero.sun = 5

      // Deploy Untrickable Zombie on Lane 1
      const untrickableZombie = createMockMinion('z1', 'Fossilhead', 'zombies', 2, 3, {
        untrickable: true,
        traits: ['untrickable'],
      })
      state.lanes[1].zombieMinion = untrickableZombie
      expect(isUntrickable(untrickableZombie)).toBe(true)

      // Plant attempts to target Untrickable Zombie with Berry Blast
      const berryBlast = convertCard(getCardById('plant_berry_blast')!, 'plants')
      const result = executeTrick(state, berryBlast, 'plants', 1)

      // Trick execution must be blocked with immunity message
      expect(result.success).toBe(false)
      expect(result.message).toContain('Untrickable')
      expect(result.updatedState.lanes[1].zombieMinion?.currentHealth).toBe(3) // Untouched
    })

    it('blocks enemy targeted zombie tricks (Bungee Plumber, Locust Swarm) against Untrickable Plant minions', () => {
      let state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 5

      // Deploy Untrickable Plant on Lane 2 (e.g. Apotatosaurus / Umbrella Leaf protected)
      const untrickablePlant = createMockMinion('p2', 'Apotatosaurus', 'plants', 5, 5, {
        untrickable: true,
        traits: ['untrickable'],
      })
      state.lanes[2].plantMinion = untrickablePlant
      expect(isUntrickable(untrickablePlant)).toBe(true)

      // Zombie attempts to target Untrickable Plant with Bungee Plumber
      const bungeePlumber = convertCard(getCardById('zombie_bungee_plumber')!, 'zombies')
      const result = executeTrick(state, bungeePlumber, 'zombies', 2)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Untrickable')
      expect(result.updatedState.lanes[2].plantMinion?.currentHealth).toBe(5)
    })

    it('still applies normal combat damage and Environment damage to Untrickable minions', () => {
      let state = createInitialGameState()
      state.phase = 'FIGHT'

      // Setup Spikeweed Sector Environment on Lane 0 (deals 2 pre-combat damage)
      state.lanes[0].environment = {
        id: 'plant_spikeweed_sector',
        name: 'Spikeweed Sector',
        side: 'plants',
        cost: 2,
        description: 'Trước khi giao tranh: Gây 2 sát thương cho Zombie ở làn này.',
        image: '/assets/cards/plants/Spikeweed Sector.png',
      }

      // Untrickable Zombie on Lane 0 with 5 Health
      state.lanes[0].zombieMinion = createMockMinion('z0', 'Untrickable Zombie', 'zombies', 2, 5, {
        untrickable: true,
      })

      // Plant Minion on Lane 0 with 2 Attack
      state.lanes[0].plantMinion = createMockMinion('p0', 'Peashooter', 'plants', 2, 3)

      const { updatedState, events } = resolveSingleLaneCombat(state, 0)

      // Spikeweed Sector deals 2 damage, Peashooter deals 2 damage -> Zombie takes 4 total damage (5 -> 1)
      expect(updatedState.lanes[0].zombieMinion?.currentHealth).toBe(1)
      expect(events.some(e => e.description.includes('Spikeweed Sector'))).toBe(true)
    })
  })

  describe('3. Frenzy + Strikethrough & Multi-Target Frenzy Mechanics', () => {
    it('executes Strikethrough to Hero during initial strike AND Frenzy bonus attack upon destroying opposing minion', () => {
      let state = createInitialGameState()
      state.plantHero.hp = 20
      state.phase = 'FIGHT'

      // Zombie has both Frenzy AND Strikethrough (e.g. under Laser Base Alpha or Area 22 buff)
      state.lanes[1].zombieMinion = createMockMinion('fz', 'Frenzy Striker', 'zombies', 3, 4, {
        frenzy: true,
        strikethrough: true,
      })

      // Weak Plant on Lane 1 with 2 HP (destroyed by 3 attack)
      state.lanes[1].plantMinion = createMockMinion('p1', 'Weak Plant', 'plants', 1, 2)

      const { updatedState, events } = resolveSingleLaneCombat(state, 1)

      // 1. Plant minion destroyed
      expect(updatedState.lanes[1].plantMinion).toBeNull()

      // 2. Initial Strikethrough dealt 3 damage to Plant Hero
      // 3. Plant was destroyed, so Frenzy triggered bonus attack for another 3 damage to Plant Hero!
      // Total damage to Plant Hero = 3 + 3 = 6 damage (20 -> 14)
      expect(updatedState.plantHero.hp).toBe(14)

      // Assert event descriptions reflect both Strikethrough and Frenzy
      expect(events.some(e => e.traitsTriggered?.includes('strikethrough') || e.description.includes('Strikethrough'))).toBe(true)
      expect(events.some(e => e.traitsTriggered?.includes('frenzy') || e.description.includes('Frenzy'))).toBe(true)
    })

    it('triggers Frenzy attack onto Plant Team-Up minion when primary front plant is destroyed', () => {
      let state = createInitialGameState()
      state.phase = 'FIGHT'

      // Zombie with Frenzy (4 Attack)
      state.lanes[2].zombieMinion = createMockMinion('fz2', 'Vimpyre', 'zombies', 4, 4, {
        frenzy: true,
      })

      // Front Plant (Wall-Nut with 3 HP - destroyed by 4 Attack)
      state.lanes[2].plantMinion = createMockMinion('p2', 'Wall-Nut', 'plants', 0, 3)

      // Back Team-Up Plant (Torchwood with 4 HP)
      state.lanes[2].plantTeamUpMinion = createMockMinion('pt2', 'Torchwood', 'plants', 0, 4, {
        teamUp: true,
      })

      const { updatedState, events } = resolveSingleLaneCombat(state, 2)

      // Front plant destroyed
      expect(updatedState.lanes[2].plantMinion).toBeNull()

      // Frenzy triggers bonus attack against the surviving Team-Up minion!
      // Torchwood (4 HP) receives 4 Frenzy damage -> destroyed!
      expect(updatedState.lanes[2].plantTeamUpMinion).toBeNull()
      expect(events.some(e => e.description.includes('Frenzy') && e.description.includes('Team-Up'))).toBe(true)
    })
  })

  describe('4. Gravestone On-Reveal Timing & Phase Immunity', () => {
    it('deploys Zombie inside Gravestone during ZOMBIE_PLAY and prevents premature ability triggers', () => {
      let state = createInitialGameState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 3

      // Stealthy Imp has gravestone: true in its definition
      const stealthyCard = convertCard(getCardById('zombie_stealthy_imp')!, 'zombies')
      state.zombieHand = [stealthyCard]

      // Plant on lane 1 (ground lane) with 2 HP
      state.lanes[1].plantMinion = createMockMinion('p1', 'Sunflower', 'plants', 0, 2)

      // Play Stealthy Imp on ground lane 1
      const nextState = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: stealthyCard.id,
        laneIndex: 1,
      })

      // Placed as hidden Gravestone
      expect(nextState.lanes[1].zombieMinion?.isGravestone).toBe(true)
      expect(nextState.lanes[1].zombieMinion?.currentAttack).toBe(2) // Base stats maintained internally
      expect(nextState.lanes[1].plantMinion?.currentHealth).toBe(2) // Plant unharmed
    })

    it('cracks open Gravestones sequentially at start of ZOMBIE_TRICKS and executes On-Reveal triggers', () => {
      let state = createInitialGameState()
      state.phase = 'PLANT_PLAY'

      // Lane 1: Conga Zombie inside Gravestone (deals 1 damage when revealed)
      state.lanes[1].zombieMinion = createMockMinion('gz1', 'Conga Zombie', 'zombies', 2, 2, {
        cardId: 'zombie_conga_zombie',
        isGravestone: true,
      })
      // Plant on lane 1 with 1 HP
      state.lanes[1].plantMinion = createMockMinion('p1', 'Peashooter', 'plants', 1, 1)

      // Lane 3: Ra Zombie inside Gravestone (steals 2 Sun from Plant Hero)
      state.lanes[3].zombieMinion = createMockMinion('gz3', 'Ra Zombie', 'zombies', 3, 4, {
        cardId: 'zombie_ra_zombie',
        isGravestone: true,
      })
      state.plantHero.sun = 4

      // Advance from PLANT_PLAY to ZOMBIE_TRICKS
      const tricksState = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(tricksState.phase).toBe('ZOMBIE_TRICKS')

      // Gravestones revealed!
      expect(tricksState.lanes[1].zombieMinion?.isGravestone).toBe(false)
      expect(tricksState.lanes[3].zombieMinion?.isGravestone).toBe(false)

      // Conga Zombie On-Reveal dealt 1 damage to Peashooter (1 -> 0 HP, destroyed!)
      expect(tricksState.lanes[1].plantMinion).toBeNull()

      // Ra Zombie On-Reveal stole 2 Sun from Plant Hero (4 - 2 = 2 Sun)
      expect(tricksState.plantHero.sun).toBe(2)

      // Verified reveal logged in combat log
      expect(tricksState.combatLog.some(l => l.includes('Conga Zombie'))).toBe(true)
      expect(tricksState.combatLog.some(l => l.includes('Ra Zombie'))).toBe(true)
    })
  })
})
