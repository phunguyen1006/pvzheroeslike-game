import { describe, it, expect, beforeEach } from 'vitest'
import {
  createInitialGameState,
  gameReducer,
  canPlayCardToLane,
} from '../engine/reducer'
import {
  resolveCombat,
  resolveSingleLaneCombat,
} from '../engine/combat'
import { playEnvironment } from '../engine/environments'
import { soundManager } from '../audio/SoundManager'
import { HERO_EMOTE_OPTIONS } from '../components/hero/HeroEmotesBar'
import type { Card, Minion, Side } from '../engine/types'

// ========================================================
// MOCK STORAGE SETUP
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
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
  configurable: true,
})

beforeEach(() => {
  mockStorage.clear()
})

// ========================================================
// HELPERS
// ========================================================

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
  type: options.type ?? 'minion',
  image: `/assets/${name}.png`,
  traits: options.traits ?? [],
  amphibious: options.amphibious,
  bullseye: options.bullseye,
  teamUp: options.teamUp,
  frenzy: options.frenzy,
  deadly: options.deadly,
  strikethrough: options.strikethrough,
  ...options,
})

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
  traits: options.traits ?? [],
  amphibious: options.amphibious,
  bullseye: options.bullseye,
  teamUp: options.teamUp,
  frenzy: options.frenzy,
  deadly: options.deadly,
  strikethrough: options.strikethrough,
  ...options,
})

describe('Round 10: Amphibious, Environments, Mulligan & Mid-Combat Lethal', () => {
  // ========================================================
  // 1. AMPHIBIOUS & WATER LANE (LANE 4)
  // ========================================================
  describe('1. Amphibious Trait & Water Lane (Lane Index 4)', () => {
    it('disallows non-amphibious plant minions from being placed on Water Lane', () => {
      const state = createInitialGameState()
      const waterLane = state.lanes[4]
      expect(waterLane.type).toBe('water')

      // Peashooter has no amphibious trait
      const regularPlant = createMockCard('plant_peashooter', 'Peashooter', 'plants', 1, 1, 1)
      const check = canPlayCardToLane(regularPlant, waterLane, 'plants')

      expect(check.allowed).toBe(false)
      expect(check.reason).toContain('Amphibious')
    })

    it('disallows non-amphibious zombie minions from being placed on Water Lane', () => {
      const state = createInitialGameState()
      const waterLane = state.lanes[4]
      expect(waterLane.type).toBe('water')

      const regularZombie = createMockCard('zombie_browncoat', 'Browncoat Zombie', 'zombies', 1, 1, 1)
      const check = canPlayCardToLane(regularZombie, waterLane, 'zombies')

      expect(check.allowed).toBe(false)
      expect(check.reason).toContain('Amphibious')
    })

    it('allows amphibious plant minions to be placed on Water Lane', () => {
      const state = createInitialGameState()
      const waterLane = state.lanes[4]

      // Cattail has amphibious: true
      const amphibiousPlant = createMockCard('plant_cattail', 'Cattail', 'plants', 3, 3, 2, {
        amphibious: true,
        traits: ['amphibious'],
      })
      const check = canPlayCardToLane(amphibiousPlant, waterLane, 'plants')

      expect(check.allowed).toBe(true)
    })

    it('allows amphibious zombie minions to be placed on Water Lane', () => {
      const state = createInitialGameState()
      const waterLane = state.lanes[4]

      // Swabbie has amphibious: true
      const swabbie = createMockCard('zombie_swabbie', 'Swabbie', 'zombies', 0, 1, 1, {
        amphibious: true,
        traits: ['amphibious'],
      })
      const check = canPlayCardToLane(swabbie, waterLane, 'zombies')

      expect(check.allowed).toBe(true)
    })

    it('allows amphibious minions to be placed on regular Ground or Heights lanes too', () => {
      const state = createInitialGameState()
      const heightsLane = state.lanes[0] // heights
      const groundLane = state.lanes[1] // ground
      expect(heightsLane.type).toBe('heights')
      expect(groundLane.type).toBe('ground')

      const amphibiousPlant = createMockCard('plant_amphibious', 'Sea-Shroom', 'plants', 2, 2, 2, {
        amphibious: true,
      })

      // Amphibious minions can deploy to land or water
      expect(canPlayCardToLane(amphibiousPlant, heightsLane, 'plants').allowed).toBe(true)
      expect(canPlayCardToLane(amphibiousPlant, groundLane, 'plants').allowed).toBe(true)
    })

    it('resolves direct face combat from amphibious minion on Water Lane when open', () => {
      let state = createInitialGameState()
      state.phase = 'FIGHT'
      state.zombieHero.hp = 20

      // Amphibious Plant (3 ATK) on Water Lane (Lane 4)
      state.lanes[4].plantMinion = createMockMinion('p_water', 'Cattail', 'plants', 3, 2, {
        amphibious: true,
      })
      state.lanes[4].zombieMinion = null

      const { updatedState, events } = resolveSingleLaneCombat(state, 4)

      // Directly strikes Zombie Hero for 3 damage
      expect(updatedState.zombieHero.hp).toBe(17)
      expect(events.some(e => e.target === 'hero' && e.damageDealt === 3)).toBe(true)
    })

    it('resolves combat clash between opposing amphibious minions on Water Lane', () => {
      let state = createInitialGameState()
      state.phase = 'FIGHT'

      // Plant Amphibious: 3/3
      state.lanes[4].plantMinion = createMockMinion('p_water', 'Cattail', 'plants', 3, 3, {
        amphibious: true,
      })
      // Zombie Amphibious: 2/4
      state.lanes[4].zombieMinion = createMockMinion('z_water', 'Toxic Waste Imp', 'zombies', 2, 4, {
        amphibious: true,
      })

      const { updatedState } = resolveSingleLaneCombat(state, 4)

      // Plant took 2 damage (3 -> 1 HP)
      expect(updatedState.lanes[4].plantMinion?.currentHealth).toBe(1)
      // Zombie took 3 damage (4 -> 1 HP)
      expect(updatedState.lanes[4].zombieMinion?.currentHealth).toBe(1)
    })
  })

  // ========================================================
  // 2. ENVIRONMENT OVERWRITING & REPLACEMENT
  // ========================================================
  describe('2. Environment Overwriting & Replacement Mechanics', () => {
    it('successfully deploys an Environment onto a lane with no existing Environment', () => {
      const state = createInitialGameState()
      const spikeweed = createMockCard('plant_spikeweed_sector', 'Spikeweed Sector', 'plants', 2, 0, 0, {
        type: 'environment',
        description: 'Before combat here: Deal 2 damage to a Zombie here.',
      })

      const res = playEnvironment(state, spikeweed, 1, 'plants')
      expect(res.updatedState.lanes[1].environment).not.toBeNull()
      expect(res.updatedState.lanes[1].environment?.id).toBe('plant_spikeweed_sector')
      expect(res.events[0]).toContain('Môi trường mới [Spikeweed Sector]')
      expect(res.events[0]).not.toContain('thay thế')
    })

    it('overwrites existing Environment on the same lane and logs replacement message', () => {
      let state = createInitialGameState()
      // Pre-set existing Environment on Lane 2: Spikeweed Sector
      state.lanes[2].environment = {
        id: 'plant_spikeweed_sector',
        name: 'Spikeweed Sector',
        side: 'plants',
        description: 'Deal 2 damage to a Zombie here.',
        image: '/assets/cards/plants/Spikeweed.png',
      }

      // Zombie plays Area 22 on Lane 2 (overwriting Spikeweed Sector)
      const area22 = createMockCard('zombie_area_22', 'Area 22', 'zombies', 3, 0, 0, {
        type: 'environment',
        description: 'Zombies here get +2/+2 and Frenzy.',
      })

      const res = playEnvironment(state, area22, 2, 'zombies')

      // Previous environment removed and new one installed
      expect(res.updatedState.lanes[2].environment?.id).toBe('zombie_area_22')
      expect(res.updatedState.lanes[2].environment?.side).toBe('zombies')

      // Log explicitly mentions replacing Spikeweed Sector
      expect(res.events.some(e => e.includes('thay thế Spikeweed Sector'))).toBe(true)
    })

    it('immediately applies new environment buffs upon overwriting an existing environment', () => {
      let state = createInitialGameState()
      state.lanes[1].environment = {
        id: 'plant_spikeweed_sector',
        name: 'Spikeweed Sector',
        side: 'plants',
        description: 'Old env',
        image: '',
      }

      // Existing Zombie 2/2 on Lane 1
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Standard Zombie', 'zombies', 2, 2)

      // Play Area 22 over Spikeweed Sector
      const area22 = createMockCard('zombie_area_22', 'Area 22', 'zombies', 3, 0, 0, {
        type: 'environment',
      })
      const res = playEnvironment(state, area22, 1, 'zombies')

      // Zombie gets immediate +2/+2 and Frenzy!
      const zombie = res.updatedState.lanes[1].zombieMinion
      expect(zombie?.currentAttack).toBe(4) // 2 + 2
      expect(zombie?.currentHealth).toBe(4) // 2 + 2
      expect(zombie?.frenzy).toBe(true)
    })

    it('applies Total Eclipse debuff immediately upon placement, destroying 1-HP plants', () => {
      let state = createInitialGameState()
      state.lanes[2].plantMinion = createMockMinion('p2', 'Weak Plant', 'plants', 1, 1)

      const totalEclipse = createMockCard('zombie_total_eclipse', 'Total Eclipse', 'zombies', 2, 0, 0, {
        type: 'environment',
      })
      const res = playEnvironment(state, totalEclipse, 2, 'zombies')

      // 1-HP plant reduced to 0 HP -> destroyed immediately!
      expect(res.updatedState.lanes[2].plantMinion).toBeNull()
      expect(res.events.some(e => e.includes('bị tiêu diệt do hết HP'))).toBe(true)
    })

    it('applies Bog of Sunken Hope, bestowing Amphibious trait to plants on that lane', () => {
      let state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p1', 'Peashooter', 'plants', 1, 1)

      const bog = createMockCard('plant_bog_of_sunken_hope', 'Bog of Sunken Hope', 'plants', 2, 0, 0, {
        type: 'environment',
      })
      const res = playEnvironment(state, bog, 1, 'plants')

      expect(res.updatedState.lanes[1].plantMinion?.amphibious).toBe(true)
    })
  })

  // ========================================================
  // 3. MULLIGAN PHASE & DECK CONSERVATION
  // ========================================================
  describe('3. Mulligan Phase & Deck Conservation', () => {
    it('initializes game in MULLIGAN phase with 5 cards (4 regular + 1 superpower) in hand', () => {
      const state = createInitialGameState()
      state.phase = 'MULLIGAN'
      expect(state.phase).toBe('MULLIGAN')
      // Hand consists of 4 regular cards + 1 starting superpower = 5 cards
      expect(state.plantHand.length).toBe(5)
      expect(state.zombieHand.length).toBe(5)
      // Starter deck has 16 remaining cards (20 total - 4 drawn)
      expect(state.plantDeck.length).toBe(16)
      expect(state.zombieDeck.length).toBe(16)
    })

    it('allows swapping 1 card during Mulligan, preserving exact hand and deck sizes', () => {
      const state = createInitialGameState()
      state.phase = 'MULLIGAN'
      const initialHandSize = state.plantHand.length
      const initialDeckSize = state.plantDeck.length
      const swappedCardId = state.plantHand[0].id

      const nextState = gameReducer(state, {
        type: 'MULLIGAN_SWAP',
        side: 'plants',
        cardIndices: [0],
      })

      // Hand and deck sizes conserved
      expect(nextState.plantHand.length).toBe(initialHandSize)
      expect(nextState.plantDeck.length).toBe(initialDeckSize)
      expect(nextState.plantHand.length + nextState.plantDeck.length).toBe(initialHandSize + initialDeckSize)

      // Swapped card was returned to deck
      const inHand = nextState.plantHand.map(c => c.id)
      const inDeck = nextState.plantDeck.map(c => c.id)
      expect(inHand.includes(swappedCardId) || inDeck.includes(swappedCardId)).toBe(true)
    })

    it('allows swapping multiple cards (2 or 3 cards) and redraws equivalent count', () => {
      const state = createInitialGameState()
      state.phase = 'MULLIGAN'
      const initialHandTotal = state.zombieHand.length
      const initialDeckTotal = state.zombieDeck.length

      const nextState = gameReducer(state, {
        type: 'MULLIGAN_SWAP',
        side: 'zombies',
        cardIndices: [1, 2, 3],
      })

      expect(nextState.zombieHand.length).toBe(initialHandTotal)
      expect(nextState.zombieDeck.length).toBe(initialDeckTotal)
      expect(nextState.combatLog[0]).toContain('Zombie đổi lại 3 lá bài (Mulligan)')
    })

    it('allows full hand swap (all 4 regular cards) and strictly conserves total cards count', () => {
      const state = createInitialGameState()
      state.phase = 'MULLIGAN'
      const plantTotalBefore = state.plantHand.length + state.plantDeck.length
      const zombieTotalBefore = state.zombieHand.length + state.zombieDeck.length

      // Plant full swap of 4 regular cards (indices 0, 1, 2, 3)
      let nextState = gameReducer(state, {
        type: 'MULLIGAN_SWAP',
        side: 'plants',
        cardIndices: [0, 1, 2, 3],
      })
      // Zombie full swap of 4 regular cards
      nextState = gameReducer(nextState, {
        type: 'MULLIGAN_SWAP',
        side: 'zombies',
        cardIndices: [0, 1, 2, 3],
      })

      expect(nextState.plantHand.length).toBe(5)
      expect(nextState.zombieHand.length).toBe(5)
      expect(nextState.plantHand.length + nextState.plantDeck.length).toBe(plantTotalBefore)
      expect(nextState.zombieHand.length + nextState.zombieDeck.length).toBe(zombieTotalBefore)
    })

    it('transitions phase smoothly from MULLIGAN to ZOMBIE_PLAY upon FINISH_MULLIGAN', () => {
      const state = createInitialGameState()
      state.phase = 'MULLIGAN'
      expect(state.phase).toBe('MULLIGAN')

      const afterMulligan = gameReducer(state, {
        type: 'FINISH_MULLIGAN',
        side: 'plants',
      })

      expect(afterMulligan.phase).toBe('ZOMBIE_PLAY')
      expect(afterMulligan.combatLog[0]).toContain('Mulligan hoàn tất!')
    })
  })

  // ========================================================
  // 4. MID-COMBAT LETHAL TERMINATION
  // ========================================================
  describe('4. Mid-Combat Lethal Termination', () => {
    it('terminates resolveCombat immediately at Lane 0 when lethal damage occurs, skipping lanes 1-4', () => {
      let state = createInitialGameState()
      state.phase = 'FIGHT'
      state.zombieHero.hp = 5

      // Lane 0 (Heights): Plant has 10 ATK on open lane -> kills Zombie Hero (5 -> 0 HP)
      state.lanes[0].plantMinion = createMockMinion('p0', 'Heavy Hitter', 'plants', 10, 5)
      state.lanes[0].zombieMinion = null

      // Lane 1: Zombie minion with 20 ATK against empty lane
      state.lanes[1].plantMinion = null
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Doom Zombie', 'zombies', 20, 5)

      // Lane 2: Plant minion with 15 ATK
      state.lanes[2].plantMinion = createMockMinion('p2', 'Late Attacker', 'plants', 15, 5)
      state.lanes[2].zombieMinion = null

      const { updatedState, result } = resolveCombat(state)

      // 1. Zombie Hero is defeated at Lane 0
      expect(updatedState.zombieHero.hp).toBe(0)
      expect(result.winner).toBe('plants')
      expect(updatedState.winner).toBe('plants')

      // 2. Plant Hero took 0 damage because Lane 1 never fired!
      expect(updatedState.plantHero.hp).toBe(20)

      // 3. Combat events only contain Lane 0
      expect(result.events.every(e => e.laneIndex === 0)).toBe(true)
    })

    it('terminates resolveCombat mid-round at Lane 1, leaving Lane 2-4 minions untouched', () => {
      let state = createInitialGameState()
      state.phase = 'FIGHT'
      state.plantHero.hp = 6

      // Lane 0: Clashing minions that do not deal hero damage
      state.lanes[0].plantMinion = createMockMinion('p0', 'Wall', 'plants', 1, 5)
      state.lanes[0].zombieMinion = createMockMinion('z0', 'Wall Zombie', 'zombies', 1, 5)

      // Lane 1: Zombie with 8 ATK on open lane -> Kills Plant Hero (6 HP -> 0 HP)
      state.lanes[1].plantMinion = null
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Killer Zombie', 'zombies', 8, 4)

      // Lane 2: Plant with 20 ATK on open lane
      state.lanes[2].plantMinion = createMockMinion('p2', 'Overkill Plant', 'plants', 20, 4)
      state.lanes[2].zombieMinion = null

      const { updatedState, result } = resolveCombat(state)

      // Plant Hero killed at Lane 1
      expect(updatedState.plantHero.hp).toBe(0)
      expect(result.winner).toBe('zombies')
      expect(updatedState.winner).toBe('zombies')

      // Zombie Hero took NO damage because Lane 2 never executed!
      expect(updatedState.zombieHero.hp).toBe(20)

      // Events should only be from Lane 0 and Lane 1
      expect(result.events.some(e => e.laneIndex === 0)).toBe(true)
      expect(result.events.some(e => e.laneIndex === 1)).toBe(true)
      expect(result.events.some(e => e.laneIndex >= 2)).toBe(false)
    })

    it('declares a draw (winner: null) if both Heroes drop to 0 HP simultaneously on the same lane', () => {
      let state = createInitialGameState()
      state.phase = 'FIGHT'
      state.plantHero.hp = 3
      state.zombieHero.hp = 3

      // Lane 0: Both minions have Strikethrough dealing 5 damage to opposing Heroes
      state.lanes[0].plantMinion = createMockMinion('p0', 'Galacta Plant', 'plants', 5, 2, {
        strikethrough: true,
      })
      state.lanes[0].zombieMinion = createMockMinion('z0', 'Line Zombie', 'zombies', 5, 2, {
        strikethrough: true,
      })

      const { updatedState, result } = resolveCombat(state)

      expect(updatedState.plantHero.hp).toBe(0)
      expect(updatedState.zombieHero.hp).toBe(0)
      expect(result.winner).toBeNull()
      expect(updatedState.winner).toBeNull()
    })

    it('rejects subsequent STEP_COMBAT_LANE actions once a winner is declared in gameReducer', () => {
      let state = createInitialGameState()
      state.phase = 'FIGHT'
      state.plantHero.hp = 20
      state.zombieHero.hp = 2

      // Lane 0: Plant deals 5 lethal damage to Zombie Hero
      state.lanes[0].plantMinion = createMockMinion('p0', 'Fast Striker', 'plants', 5, 5)
      state.lanes[0].zombieMinion = null

      // Step Lane 0
      const step0State = gameReducer(state, {
        type: 'STEP_COMBAT_LANE',
        laneIndex: 0,
      })

      expect(step0State.winner).toBe('plants')
      expect(step0State.zombieHero.hp).toBe(0)

      // Setup Lane 1 with zombie that would hit Plant Hero
      step0State.lanes[1].zombieMinion = createMockMinion('z1', 'Post Mortem Attacker', 'zombies', 10, 5)
      step0State.lanes[1].plantMinion = null

      // Attempting to step Lane 1 after game over must return state unchanged
      const step1State = gameReducer(step0State, {
        type: 'STEP_COMBAT_LANE',
        laneIndex: 1,
      })

      // Plant Hero remains completely untouched at 20 HP
      expect(step1State.plantHero.hp).toBe(20)
      expect(step1State.winner).toBe('plants')
    })
  })

  // ========================================================
  // 5. REGRESSION & INTEGRATION COMPATIBILITY
  // ========================================================
  describe('5. UI & Engine Regression Compatibility', () => {
    it('verifies SoundManager audio settings persistence and mute toggle', () => {
      soundManager.setSettings({
        masterVolume: 75,
        bgmVolume: 50,
        sfxVolume: 90,
        isMuted: false,
      })

      let current = soundManager.getSettings()
      expect(current.masterVolume).toBe(75)
      expect(current.bgmVolume).toBe(50)
      expect(current.sfxVolume).toBe(90)
      expect(current.isMuted).toBe(false)

      // Toggle mute
      soundManager.setMuted(true)
      expect(soundManager.getSettings().isMuted).toBe(true)

      soundManager.setMuted(false)
      expect(soundManager.getSettings().isMuted).toBe(false)
    })

    it('validates HERO_EMOTE_OPTIONS configuration contains 4 distinct emote types', () => {
      expect(HERO_EMOTE_OPTIONS).toHaveLength(4)
      const types = HERO_EMOTE_OPTIONS.map(e => e.type)
      expect(types).toContain('hello')
      expect(types).toContain('taunt')
      expect(types).toContain('oops')
      expect(types).toContain('victory')

      HERO_EMOTE_OPTIONS.forEach(emote => {
        expect(emote.emoji).toBeDefined()
        expect(emote.label).toBeDefined()
        expect(emote.plantSpeech).toBeDefined()
        expect(emote.zombieSpeech).toBeDefined()
        expect(emote.bgClass).toBeDefined()
      })
    })

    it('ensures gameReducer preserves state immutability during full round flow', () => {
      const state = createInitialGameState()
      const frozenBefore = JSON.stringify(state)

      // Dispatch NEXT_PHASE
      const nextState = gameReducer(state, { type: 'NEXT_PHASE' })

      // Original state is completely unmodified
      expect(JSON.stringify(state)).toBe(frozenBefore)
      expect(nextState).not.toBe(state)
    })
  })
})
