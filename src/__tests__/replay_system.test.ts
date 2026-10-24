import { describe, it, expect, beforeEach } from 'vitest'
import {
  recordReplayFrame,
  getReplayHistory,
  clearReplayHistory,
  replayToTurn,
  replayToFrame,
  exportReplay,
  loadReplay,
  MAX_REPLAY_FRAMES,
} from '../engine/replay'
import { createInitialGameState } from '../engine/reducer'
import type { GameState, GameAction, ReplaySnapshot } from '../engine/types'

describe('Replay System (src/engine/replay.ts)', () => {
  beforeEach(() => {
    clearReplayHistory()
  })

  it('1. should record replay frame containing turn, phase, state and action', () => {
    const state = createInitialGameState()
    state.turn = 1
    state.phase = 'ZOMBIE_PLAY'

    const action: GameAction = {
      type: 'PLAY_CARD',
      side: 'zombies',
      cardId: 'zombie_basic',
      laneIndex: 1,
    }

    recordReplayFrame(state, action)
    const history = getReplayHistory()
    expect(history.length).toBe(1)

    const frame = history[0]
    expect(frame.turn).toBe(1)
    expect(frame.phase).toBe('ZOMBIE_PLAY')
    expect(frame.action.type).toBe('PLAY_CARD')
    expect(frame.state.turn).toBe(1)
    expect(frame.timestamp).toBeDefined()
  })

  it('2. should retrieve recorded replay frames via getReplayHistory', () => {
    const state = createInitialGameState()
    recordReplayFrame(state, { type: 'NEXT_PHASE' })
    recordReplayFrame(state, { type: 'START_COMBAT' })

    const history = getReplayHistory()
    expect(history.length).toBe(2)
    expect(history[0].action.type).toBe('NEXT_PHASE')
    expect(history[1].action.type).toBe('START_COMBAT')
  })

  it('3. should clear replay history via clearReplayHistory', () => {
    const state = createInitialGameState()
    recordReplayFrame(state, { type: 'NEXT_PHASE' })
    expect(getReplayHistory().length).toBe(1)

    clearReplayHistory()
    expect(getReplayHistory().length).toBe(0)
  })

  it('4. should strictly enforce maximum 50 frames buffer limit (FIFO oldest dropped)', () => {
    const state = createInitialGameState()

    // Record 60 frames
    for (let i = 1; i <= 60; i++) {
      state.turn = i
      recordReplayFrame(state, { type: 'STEP_COMBAT_LANE', laneIndex: i % 5 })
    }

    const history = getReplayHistory()
    expect(history.length).toBe(MAX_REPLAY_FRAMES)
    expect(history.length).toBe(50)
    // The first 10 frames should have been dropped, earliest frame should be turn 11
    expect(history[0].turn).toBe(11)
    expect(history[history.length - 1].turn).toBe(60)
  })

  it('5. should replay to exact target turn via replayToTurn', () => {
    const state1 = createInitialGameState()
    state1.turn = 1
    state1.plantHero.hp = 20

    const state2 = createInitialGameState()
    state2.turn = 2
    state2.plantHero.hp = 18

    const state3 = createInitialGameState()
    state3.turn = 3
    state3.plantHero.hp = 15

    recordReplayFrame(state1, { type: 'NEXT_PHASE' })
    recordReplayFrame(state2, { type: 'NEXT_PHASE' })
    recordReplayFrame(state3, { type: 'NEXT_PHASE' })

    const history = getReplayHistory()
    const targetState = replayToTurn(history, 2)
    expect(targetState.turn).toBe(2)
    expect(targetState.plantHero.hp).toBe(18)
  })

  it('6. should clamp replayToTurn when targetTurn is below minimum or above maximum', () => {
    const state1 = createInitialGameState()
    state1.turn = 5
    state1.plantHero.hp = 16

    const state2 = createInitialGameState()
    state2.turn = 8
    state2.plantHero.hp = 12

    recordReplayFrame(state1, { type: 'NEXT_PHASE' })
    recordReplayFrame(state2, { type: 'NEXT_PHASE' })

    const history = getReplayHistory()

    // Target turn 1 (less than earliest turn 5) -> returns frame 1
    const clampedEarly = replayToTurn(history, 1)
    expect(clampedEarly.turn).toBe(5)
    expect(clampedEarly.plantHero.hp).toBe(16)

    // Target turn 20 (greater than latest turn 8) -> returns frame 2
    const clampedLate = replayToTurn(history, 20)
    expect(clampedLate.turn).toBe(8)
    expect(clampedLate.plantHero.hp).toBe(12)
  })

  it('7. should return initial GameState when replayToTurn is called on empty history', () => {
    const state = replayToTurn([], 1)
    expect(state).toBeDefined()
    expect(state.turn).toBe(1)
    expect(state.lanes.length).toBe(5)
  })

  it('8. should replay to specific frame index via replayToFrame', () => {
    const state1 = createInitialGameState()
    state1.plantHero.hp = 20
    const state2 = createInitialGameState()
    state2.plantHero.hp = 10

    recordReplayFrame(state1, { type: 'NEXT_PHASE' })
    recordReplayFrame(state2, { type: 'NEXT_PHASE' })

    const history = getReplayHistory()
    const frame0State = replayToFrame(history, 0)
    expect(frame0State.plantHero.hp).toBe(20)

    const frame1State = replayToFrame(history, 1)
    expect(frame1State.plantHero.hp).toBe(10)
  })

  it('9. should export replay to JSON and load replay from JSON string', () => {
    const state = createInitialGameState()
    state.turn = 3
    recordReplayFrame(state, { type: 'START_COMBAT' })

    const json = exportReplay()
    expect(typeof json).toBe('string')
    expect(json.includes('START_COMBAT')).toBe(true)

    const loaded = loadReplay(json)
    expect(loaded.length).toBe(1)
    expect(loaded[0].turn).toBe(3)
    expect(loaded[0].action.type).toBe('START_COMBAT')
  })

  it('10. should ensure recorded replay frame is deeply cloned and immune to subsequent state mutations', () => {
    const state = createInitialGameState()
    state.plantHero.hp = 20

    recordReplayFrame(state, { type: 'NEXT_PHASE' })

    // Mutate state after recording
    state.plantHero.hp = 5
    state.lanes[0].name = 'Mutated Lane'

    const history = getReplayHistory()
    expect(history[0].state.plantHero.hp).toBe(20)
    expect(history[0].state.lanes[0].name).not.toBe('Mutated Lane')
  })
})
