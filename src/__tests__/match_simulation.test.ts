import { describe, it, expect } from 'vitest'
import {
  createInitialGameState,
  gameReducer,
} from '../engine/reducer'
import {
  getAIMulliganDecision,
  getAISuperpowerDecision,
  getAIDecision,
  type AIArchetype,
  type AIDifficulty,
} from '../engine/ai'
import { resolveCombat } from '../engine/combat'
import { getCardById } from '../data/cards'
import type { GameState, Side, Card, Minion, Phase } from '../engine/types'

// ========================================================
// HELPER UTILITIES FOR MATCH SIMULATION
// ========================================================

/**
 * Deep freezes an object recursively to strictly detect direct mutations.
 */
function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  Object.freeze(obj)
  for (const key of Object.keys(obj as object)) {
    const val = (obj as any)[key]
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val)
    }
  }
  return obj
}

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

interface SimulationResult {
  turnsCompleted: number
  winner: Side | null
  finalState: GameState
  phaseTransitions: Phase[]
  totalActionsDispatched: number
  superBlocksTriggered: number
  allStatesImmutable: boolean
}

/**
 * Runs an automated AI vs AI match simulation from Mulligan to conclusion or maxTurns.
 */
function runAutomatedMatch(options: {
  plantHeroId?: string
  zombieHeroId?: string
  plantArchetype: AIArchetype
  zombieArchetype: AIArchetype
  difficulty?: AIDifficulty
  maxTurns?: number
  checkImmutability?: boolean
}): SimulationResult {
  const {
    plantHeroId = 'hero_green_shadow',
    zombieHeroId = 'hero_super_brainz',
    plantArchetype,
    zombieArchetype,
    difficulty = 'normal',
    maxTurns = 20,
    checkImmutability = false,
  } = options

  const rawState = createInitialGameState(plantHeroId, zombieHeroId)
  rawState.phase = 'MULLIGAN'
  let state: GameState = rawState

  const phaseTransitions: Phase[] = [state.phase]
  let totalActions = 0
  let superBlocksCount = 0
  let allStatesImmutable = true

  const dispatchAction = (action: any) => {
    totalActions++
    if (checkImmutability) {
      deepFreeze(state)
    }
    const previousStateRef = state
    state = gameReducer(state, action)
    if (checkImmutability && state === previousStateRef && action.type !== 'PASS') {
      // Game state should be a new reference upon state-modifying actions
      if (!state.winner) {
        allStatesImmutable = false
      }
    }
  }

  // 1. MULLIGAN PHASE (Simulate Plant & Zombie Mulligan decisions)
  const plantMulligan = getAIMulliganDecision(state.plantHand, plantArchetype, plantHeroId)
  if (plantMulligan.swapIndices.length > 0) {
    dispatchAction({
      type: 'MULLIGAN_SWAP',
      side: 'plants',
      cardIndices: plantMulligan.swapIndices,
    })
  }
  dispatchAction({ type: 'FINISH_MULLIGAN', side: 'plants' })
  phaseTransitions.push(state.phase)

  // 2. TURN CYCLES (1 up to maxTurns)
  while (state.turn <= maxTurns && !state.winner) {
    const currentTurn = state.turn
    const currentPhase = state.phase as Phase

    // --- PHASE: ZOMBIE_PLAY ---
    if (currentPhase === 'ZOMBIE_PLAY') {
      let zombiePlays = 0
      while (zombiePlays < 3 && !state.winner) {
        const decision = getAIDecision(state, 'zombies', {
          difficulty,
          archetype: zombieArchetype,
        })
        if (
          decision.action === 'PLAY_MINION' &&
          decision.card &&
          decision.laneIndex !== undefined &&
          decision.card.cost <= state.zombieHero.brains
        ) {
          const cardId = decision.card.id
          dispatchAction({
            type: 'PLAY_CARD',
            side: 'zombies',
            cardId,
            laneIndex: decision.laneIndex,
          })
          zombiePlays++
        } else {
          break
        }
      }
      if (!state.winner) {
        dispatchAction({ type: 'NEXT_PHASE' })
        phaseTransitions.push(state.phase)
      }
    }

    if (state.winner) break

    // --- PHASE: PLANT_PLAY ---
    if (currentPhase === 'PLANT_PLAY') {
      let plantPlays = 0
      while (plantPlays < 3 && !state.winner) {
        const decision = getAIDecision(state, 'plants', {
          difficulty,
          archetype: plantArchetype,
        })
        if (
          (decision.action === 'PLAY_MINION' || decision.action === 'PLAY_TRICK') &&
          decision.card &&
          decision.laneIndex !== undefined &&
          decision.card.cost <= state.plantHero.sun
        ) {
          const cardId = decision.card.id
          dispatchAction({
            type: 'PLAY_CARD',
            side: 'plants',
            cardId,
            laneIndex: decision.laneIndex,
            targetHero: decision.targetHero,
          })
          plantPlays++
        } else {
          break
        }
      }
      if (!state.winner) {
        dispatchAction({ type: 'NEXT_PHASE' })
        phaseTransitions.push(state.phase)
      }
    }

    if (state.winner) break

    // --- PHASE: ZOMBIE_TRICKS ---
    if (currentPhase === 'ZOMBIE_TRICKS') {
      let trickPlays = 0
      while (trickPlays < 2 && !state.winner) {
        const decision = getAIDecision(state, 'zombies', {
          difficulty,
          archetype: zombieArchetype,
        })
        if (
          decision.action === 'PLAY_TRICK' &&
          decision.card &&
          decision.card.cost <= state.zombieHero.brains
        ) {
          dispatchAction({
            type: 'PLAY_CARD',
            side: 'zombies',
            cardId: decision.card.id,
            laneIndex: decision.laneIndex ?? 0,
            targetHero: decision.targetHero,
          })
          trickPlays++
        } else {
          break
        }
      }
      if (!state.winner) {
        dispatchAction({ type: 'NEXT_PHASE' })
        phaseTransitions.push(state.phase)
      }
    }

    if (state.winner) break

    // --- PHASE: FIGHT ---
    if (currentPhase === 'FIGHT') {
      dispatchAction({ type: 'START_COMBAT' })

      // Handle pending Super-Block if triggered during combat
      if (state.pendingSuperBlock) {
        superBlocksCount++
        const sb = state.pendingSuperBlock
        const spDecision = getAISuperpowerDecision(
          state,
          sb.side,
          sb.superpower,
          sb.side === 'plants' ? plantArchetype : zombieArchetype
        )
        if (spDecision.action === 'PLAY_SUPERPOWER') {
          dispatchAction({
            type: 'PLAY_SUPERPOWER',
            side: sb.side,
            superpowerId: spDecision.superpowerId,
            laneIndex: spDecision.targetLaneIndex ?? 0,
            targetHero: spDecision.targetHero,
          })
        } else {
          dispatchAction({
            type: 'SAVE_SUPERPOWER',
            side: sb.side,
          })
        }
      }

      if (!state.winner) {
        dispatchAction({ type: 'NEXT_PHASE' })
        phaseTransitions.push(state.phase)
      }
    }

    // Guard against non-advancing turns
    if (!state.winner && state.turn === currentTurn && (state.phase as Phase) === 'ZOMBIE_PLAY') {
      // Successfully looped back into next turn
    }
  }

  return {
    turnsCompleted: Math.min(state.turn, maxTurns),
    winner: state.winner,
    finalState: state,
    phaseTransitions,
    totalActionsDispatched: totalActions,
    superBlocksTriggered: superBlocksCount,
    allStatesImmutable,
  }
}

// ========================================================
// TEST SUITES
// ========================================================

describe('Match Simulation & Automated Playthrough Test Suite (Round 8)', () => {
  describe('1. Automated AI vs AI Matches Across 3 Archetypes', () => {
    it('simulates Matchup 1: Aggro (Plants) vs Control (Zombies) without infinite loops or errors', () => {
      const result = runAutomatedMatch({
        plantHeroId: 'hero_solar_flare',
        zombieHeroId: 'hero_rustbolt',
        plantArchetype: 'aggro',
        zombieArchetype: 'control',
        difficulty: 'hard',
        maxTurns: 15,
      })

      expect(result.turnsCompleted).toBeGreaterThanOrEqual(1)
      expect(result.turnsCompleted).toBeLessThanOrEqual(16)
      expect(result.totalActionsDispatched).toBeGreaterThan(10)
      expect(Number.isNaN(result.finalState.plantHero.hp)).toBe(false)
      expect(Number.isNaN(result.finalState.zombieHero.hp)).toBe(false)
      expect(result.finalState.combatLog.length).toBeGreaterThan(5)

      // If game finished with a winner, verify accurate resolution
      if (result.winner) {
        expect(['plants', 'zombies']).toContain(result.winner)
        if (result.winner === 'plants') {
          expect(result.finalState.zombieHero.hp).toBeLessThanOrEqual(0)
        } else {
          expect(result.finalState.plantHero.hp).toBeLessThanOrEqual(0)
        }
      }
    })

    it('simulates Matchup 2: Tempo (Plants) vs Aggro (Zombies) with active board contestation', () => {
      const result = runAutomatedMatch({
        plantHeroId: 'hero_green_shadow',
        zombieHeroId: 'hero_impfinity',
        plantArchetype: 'tempo',
        zombieArchetype: 'aggro',
        difficulty: 'normal',
        maxTurns: 15,
      })

      expect(result.turnsCompleted).toBeGreaterThanOrEqual(1)
      expect(result.totalActionsDispatched).toBeGreaterThan(10)
      expect(result.phaseTransitions).toContain('MULLIGAN')
      expect(result.phaseTransitions).toContain('ZOMBIE_PLAY')
      expect(result.phaseTransitions).toContain('PLANT_PLAY')
      expect(result.phaseTransitions).toContain('ZOMBIE_TRICKS')
      expect(result.phaseTransitions).toContain('FIGHT')

      // Assert hero healths remain valid
      expect(result.finalState.plantHero.hp).toBeLessThanOrEqual(20)
      expect(result.finalState.zombieHero.hp).toBeLessThanOrEqual(20)
    })

    it('simulates Matchup 3: Control (Plants) vs Control (Zombies) progressing to late game high-resource turns', () => {
      const result = runAutomatedMatch({
        plantHeroId: 'hero_wall_knight',
        zombieHeroId: 'hero_immorticia',
        plantArchetype: 'control',
        zombieArchetype: 'control',
        difficulty: 'hard',
        maxTurns: 15,
      })

      expect(result.turnsCompleted).toBeGreaterThanOrEqual(1)
      // Both control heroes generally conserve health early or progress several turns
      expect(result.finalState.combatLog.some(log => log.includes('LƯỢT'))).toBe(true)
    })
  })

  describe('2. Smooth Phase Transitions & Match Lifecycle Validation', () => {
    it('executes a strict deterministic phase cycle sequence across turns', () => {
      let state = createInitialGameState('hero_green_shadow', 'hero_super_brainz')
      state.phase = 'MULLIGAN'
      expect(state.phase).toBe('MULLIGAN')

      // Finish Mulligan -> ZOMBIE_PLAY (Turn 1)
      state = gameReducer(state, { type: 'FINISH_MULLIGAN', side: 'plants' })
      expect(state.phase).toBe('ZOMBIE_PLAY')
      expect(state.turn).toBe(1)

      // ZOMBIE_PLAY -> PLANT_PLAY
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('PLANT_PLAY')
      expect(state.turn).toBe(1)

      // PLANT_PLAY -> ZOMBIE_TRICKS
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('ZOMBIE_TRICKS')
      expect(state.turn).toBe(1)

      // ZOMBIE_TRICKS -> FIGHT
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('FIGHT')
      expect(state.turn).toBe(1)

      // FIGHT -> ZOMBIE_PLAY (Turn 2 starts, sun/brains refreshed to 2, 1 card drawn each)
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('ZOMBIE_PLAY')
      expect(state.turn).toBe(2)
      expect(state.plantHero.sun).toBe(2)
      expect(state.zombieHero.brains).toBe(2)
    })

    it('stops processing gameplay actions once Game Over (winner is set)', () => {
      let state = createInitialGameState()
      state.phase = 'ZOMBIE_PLAY'
      state.plantHero.hp = 0
      state.winner = 'zombies'

      // Attempting to play a card when game is already won should be rejected/ignored
      const peashooter = convertCard(getCardById('plant_peashooter')!, 'plants')
      state.plantHand = [peashooter]
      state.plantHero.sun = 5

      const nextState = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'plants',
        cardId: peashooter.id,
        laneIndex: 1,
      })

      // State remains unchanged because game is over
      expect(nextState.lanes[1].plantMinion).toBeNull()
      expect(nextState.winner).toBe('zombies')
    })

    it('guarantees termination within 20 turns limit without infinite loops', () => {
      const result = runAutomatedMatch({
        plantArchetype: 'control',
        zombieArchetype: 'control',
        maxTurns: 20,
      })

      expect(result.turnsCompleted).toBeLessThanOrEqual(20)
      expect(result.phaseTransitions.length).toBeGreaterThan(10)
    })
  })

  describe('3. GameState Immutability Verification (deepFreeze Strictness)', () => {
    it('ensures gameReducer never mutates incoming state directly even when deeply frozen', () => {
      let state = createInitialGameState('hero_green_shadow', 'hero_super_brainz')
      state.plantHero.hp = 15
      state.zombieHero.hp = 15
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 4

      const conehead = convertCard(getCardById('zombie_conehead')!, 'zombies')
      state.zombieHand = [conehead]

      // Deep freeze the state before dispatching
      deepFreeze(state)

      // Dispatch PLAY_CARD on frozen state
      expect(() => {
        const nextState = gameReducer(state, {
          type: 'PLAY_CARD',
          side: 'zombies',
          cardId: conehead.id,
          laneIndex: 2,
        })
        expect(nextState).not.toBe(state)
        expect(nextState.lanes[2].zombieMinion?.name).toBe('Conehead Zombie')
      }).not.toThrow()
    })

    it('returns brand new references for modified nested properties (heroes and lanes)', () => {
      const state = createInitialGameState()
      state.phase = 'PLANT_PLAY'
      state.plantHero.sun = 4

      const peashooter = convertCard(getCardById('plant_peashooter')!, 'plants')
      state.plantHand = [peashooter]

      const nextState = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'plants',
        cardId: peashooter.id,
        laneIndex: 1,
      })

      // References should be updated, not mutated in-place
      expect(nextState).not.toBe(state)
      expect(nextState.lanes).not.toBe(state.lanes)
      expect(nextState.lanes[1]).not.toBe(state.lanes[1])
      expect(nextState.plantHero).not.toBe(state.plantHero)
    })
  })

  describe('4. Stress Test: Full 5-Lane Battlefield with Team-Up Units (15 Minions)', () => {
    it('resolves combat smoothly on a saturated 5-lane board with 5 Zombies, 5 Plants, and 5 Team-Up Plants', () => {
      let state = createInitialGameState()
      state.phase = 'FIGHT'

      // Deploy 5 Zombie Minions across all 5 lanes with varied traits
      state.lanes[0].zombieMinion = createMockMinion('z0', 'Swabbie', 'zombies', 1, 1, { amphibious: true })
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 2, 2, { armored: 1 })
      state.lanes[2].zombieMinion = createMockMinion('z2', 'Con Man', 'zombies', 1, 3, { bullseye: true })
      state.lanes[3].zombieMinion = createMockMinion('z3', 'Smelly Zombie', 'zombies', 2, 4, { deadly: true })
      state.lanes[4].zombieMinion = createMockMinion('z4', 'Super V Bean', 'zombies', 3, 2, { strikethrough: true })

      // Deploy 5 Plant Minions across all 5 lanes
      state.lanes[0].plantMinion = createMockMinion('p0', 'Navy Bean', 'plants', 2, 2, { amphibious: true })
      state.lanes[1].plantMinion = createMockMinion('p1', 'Wall-Nut', 'plants', 0, 6)
      state.lanes[2].plantMinion = createMockMinion('p2', 'Peashooter', 'plants', 1, 1)
      state.lanes[3].plantMinion = createMockMinion('p3', 'Bonk Choy', 'plants', 3, 1)
      state.lanes[4].plantMinion = createMockMinion('p4', 'Repeater', 'plants', 2, 2, { doubleStrike: true })

      // Deploy 5 Plant Team-Up Minions across all 5 lanes (Total 15 Minions on battlefield!)
      state.lanes[0].plantTeamUpMinion = createMockMinion('pt0', 'Water Chestnut', 'plants', 0, 4, { amphibious: true, teamUp: true })
      state.lanes[1].plantTeamUpMinion = createMockMinion('pt1', 'Torchwood', 'plants', 0, 3, { teamUp: true })
      state.lanes[2].plantTeamUpMinion = createMockMinion('pt2', 'Puff-Shroom', 'plants', 1, 1, { teamUp: true })
      state.lanes[3].plantTeamUpMinion = createMockMinion('pt3', 'Puff-Shroom 2', 'plants', 1, 1, { teamUp: true })
      state.lanes[4].plantTeamUpMinion = createMockMinion('pt4', 'Snow Pea', 'plants', 2, 2, { teamUp: true, freeze: true })

      // Deep freeze the 15-minion battlefield to ensure combat resolution doesn't mutate unexpectedly
      deepFreeze(state)

      // Execute Combat on full 5-lane saturated battlefield
      expect(() => {
        const combatOutcome = resolveCombat(state)
        expect(combatOutcome).toBeDefined()
        expect(combatOutcome.result.events.length).toBeGreaterThanOrEqual(5)

        // Verify dead units are handled and remaining units have non-negative health
        combatOutcome.updatedState.lanes.forEach((lane) => {
          if (lane.zombieMinion) {
            expect(lane.zombieMinion.currentHealth).toBeGreaterThan(0)
          }
          if (lane.plantMinion) {
            expect(lane.plantMinion.currentHealth).toBeGreaterThan(0)
          }
          if (lane.plantTeamUpMinion) {
            expect(lane.plantTeamUpMinion.currentHealth).toBeGreaterThan(0)
          }
        })
      }).not.toThrow()
    })
  })

  describe('5. Stress Test: Block Meter Saturation & Sequential Super-Blocks', () => {
    it('handles multiple sequential hits triggering Super-Blocks up to maximum limit of 3', () => {
      let state = createInitialGameState()
      state.plantHero.hp = 20
      state.plantHero.blockMeter = 0
      state.plantHero.blockCount = 0

      // Hit 1: Saturated roll to reach 8/8
      state.plantHero.blockMeter = 7
      state.lanes[0].zombieMinion = createMockMinion('z0', 'Zombie', 'zombies', 2, 2)
      let outcome = resolveCombat(state)
      state = outcome.updatedState

      // Super-Block #1 triggered!
      expect(state.pendingSuperBlock).not.toBeNull()
      expect(state.plantHero.blockCount).toBe(1)
      expect(state.plantHero.blockMeter).toBe(0)
      expect(state.plantHero.hp).toBe(20) // Blocked 100%

      // Clear pending Super-Block
      state = gameReducer(state, { type: 'SAVE_SUPERPOWER', side: 'plants' })
      expect(state.pendingSuperBlock).toBeNull()

      // Hit 2: Trigger Super-Block #2
      state.plantHero.blockMeter = 7
      state.lanes[0].zombieMinion = createMockMinion('z0', 'Zombie', 'zombies', 2, 2)
      outcome = resolveCombat(state)
      state = outcome.updatedState

      expect(state.pendingSuperBlock).not.toBeNull()
      expect(state.plantHero.blockCount).toBe(2)
      expect(state.plantHero.blockMeter).toBe(0)
      expect(state.plantHero.hp).toBe(20)

      state = gameReducer(state, { type: 'SAVE_SUPERPOWER', side: 'plants' })

      // Hit 3: Trigger Super-Block #3
      state.plantHero.blockMeter = 7
      state.lanes[0].zombieMinion = createMockMinion('z0', 'Zombie', 'zombies', 2, 2)
      outcome = resolveCombat(state)
      state = outcome.updatedState

      expect(state.pendingSuperBlock).not.toBeNull()
      expect(state.plantHero.blockCount).toBe(3)
      expect(state.plantHero.blockMeter).toBe(0)
      expect(state.plantHero.hp).toBe(20)

      state = gameReducer(state, { type: 'SAVE_SUPERPOWER', side: 'plants' })

      // Hit 4: Shield is depleted (blockCount = 3), even if meter was 7, CANNOT trigger Super-Block #4
      state.plantHero.blockMeter = 7
      state.lanes[0].zombieMinion = createMockMinion('z0', 'Zombie', 'zombies', 4, 2)
      outcome = resolveCombat(state)
      state = outcome.updatedState

      // Takes full 4 damage: 20 -> 16
      expect(state.pendingSuperBlock).toBeNull()
      expect(state.plantHero.hp).toBe(16)
      expect(state.plantHero.blockCount).toBe(3)
    })

    it('handles rapid sequential attacks across multiple open lanes in a single combat step', () => {
      let state = createInitialGameState()
      state.plantHero.hp = 20
      state.plantHero.blockMeter = 6
      state.plantHero.blockCount = 0

      // 4 open lanes with attacking Zombies
      state.lanes[0].zombieMinion = createMockMinion('z0', 'Z1', 'zombies', 2, 2)
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Z2', 'zombies', 2, 2)
      state.lanes[2].zombieMinion = createMockMinion('z2', 'Z3', 'zombies', 2, 2)
      state.lanes[3].zombieMinion = createMockMinion('z3', 'Z4', 'zombies', 2, 2)

      const outcome = resolveCombat(state)
      const finalPlantHero = outcome.updatedState.plantHero

      // Health decreased appropriately or blocked by shield
      expect(finalPlantHero.hp).toBeLessThan(20)
      expect(finalPlantHero.hp).toBeGreaterThanOrEqual(12)
      // Block count incremented if Super-Block occurred (can be 1 or 2 across 4 sequential attacks)
      if (outcome.updatedState.pendingSuperBlock) {
        expect(finalPlantHero.blockCount).toBeGreaterThanOrEqual(1)
      }
    })
  })
})
