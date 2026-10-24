import type { GameState, GameAction, ReplaySnapshot } from './types'
import { createInitialGameState } from './reducer'

export const MAX_REPLAY_FRAMES = 50

let replayBuffer: ReplaySnapshot[] = []

/**
 * Deep clones a GameState to ensure immutable preservation in replay history.
 */
export function cloneGameState(state: GameState): GameState {
  try {
    return JSON.parse(JSON.stringify(state))
  } catch {
    // Fallback shallow/sub-clone
    return {
      ...state,
      lanes: state.lanes.map(l => ({ ...l })),
      plantHero: { ...state.plantHero },
      zombieHero: { ...state.zombieHero },
      plantHand: [...state.plantHand],
      zombieHand: [...state.zombieHand],
      plantDeck: [...state.plantDeck],
      zombieDeck: [...state.zombieDeck],
      plantGraveyard: [...state.plantGraveyard],
      zombieGraveyard: [...state.zombieGraveyard],
      combatEvents: [...state.combatEvents],
      combatLog: [...state.combatLog],
    }
  }
}

/**
 * Records a single replay frame containing state and triggering action.
 * Maintains a strict FIFO buffer limit of 50 frames to save memory.
 */
export function recordReplayFrame(state: GameState, action: GameAction): void {
  const snapshot: ReplaySnapshot = {
    turn: state.turn,
    phase: state.phase,
    state: cloneGameState(state),
    action: { ...action },
    timestamp: Date.now(),
  }

  replayBuffer.push(snapshot)

  // Enforce 50 frames buffer limit
  if (replayBuffer.length > MAX_REPLAY_FRAMES) {
    replayBuffer = replayBuffer.slice(-MAX_REPLAY_FRAMES)
  }
}

/**
 * Returns a copy of the current replay history buffer.
 */
export function getReplayHistory(): ReplaySnapshot[] {
  return [...replayBuffer]
}

/**
 * Clears the in-memory replay history.
 */
export function clearReplayHistory(): void {
  replayBuffer = []
}

/**
 * Sets the active replay history buffer (useful for testing or loading replays).
 */
export function setReplayHistory(history: ReplaySnapshot[]): void {
  replayBuffer = history.slice(-MAX_REPLAY_FRAMES)
}

/**
 * Retrieves the GameState at the beginning of a specific turn from replay history.
 * If targetTurn is out of bounds, returns the nearest available frame.
 * If history is empty, returns initial GameState.
 */
export function replayToTurn(history: ReplaySnapshot[], targetTurn: number): GameState {
  if (!history || history.length === 0) {
    return createInitialGameState()
  }

  // Exact match for the earliest frame of the target turn
  const matchingFrame = history.find(frame => frame.turn === targetTurn)
  if (matchingFrame) {
    return cloneGameState(matchingFrame.state)
  }

  // If targetTurn is before the first recorded frame
  if (targetTurn <= history[0].turn) {
    return cloneGameState(history[0].state)
  }

  // If targetTurn is after the last recorded frame
  if (targetTurn >= history[history.length - 1].turn) {
    return cloneGameState(history[history.length - 1].state)
  }

  // Closest previous turn frame
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].turn <= targetTurn) {
      return cloneGameState(history[i].state)
    }
  }

  return cloneGameState(history[0].state)
}

/**
 * Retrieves the GameState at a specific frame index (0-indexed).
 */
export function replayToFrame(history: ReplaySnapshot[], frameIndex: number): GameState {
  if (!history || history.length === 0) {
    return createInitialGameState()
  }
  const index = Math.max(0, Math.min(frameIndex, history.length - 1))
  return cloneGameState(history[index].state)
}

/**
 * Serializes replay history to a JSON string.
 */
export function exportReplay(history?: ReplaySnapshot[]): string {
  const records = history || getReplayHistory()
  return JSON.stringify(records)
}

/**
 * Deserializes replay history from a JSON string.
 */
export function loadReplay(jsonString: string): ReplaySnapshot[] {
  try {
    const parsed = JSON.parse(jsonString)
    if (Array.isArray(parsed)) {
      return parsed
    }
    return []
  } catch {
    return []
  }
}
