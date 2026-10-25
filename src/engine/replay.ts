import type { GameState, GameAction, ReplaySnapshot, Side } from './types'
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

// ==========================================
// Match Replay System (Task 1)
// ==========================================

export type RecordedActionType =
  | 'play_card'
  | 'attack'
  | 'trick'
  | 'superpower'
  | 'hero_damage'
  | 'super_block'
  | 'phase_change'
  | 'draw_card'
  | string

export interface RecordedAction {
  type: RecordedActionType
  turn: number
  side?: Side
  timestamp?: number
  cardId?: string
  cardName?: string
  laneIndex?: number
  cost?: number
  target?: string
  targetName?: string
  targetSide?: Side
  attackerName?: string
  damage?: number
  isBlocked?: boolean
  isLethal?: boolean
  superpowerId?: string
  sourceName?: string
  remainingHp?: number
  description?: string
  [key: string]: any
}

export interface ReplayHeroIds {
  plant: string
  zombie: string
  plants?: string
  zombies?: string
}

export interface ReplayFinalHPs {
  plant: number
  zombie: number
  plants?: number
  zombies?: number
}

export interface ReplaySession {
  seed: number | string
  heroIds: ReplayHeroIds
  actions: RecordedAction[]
  winner: Side | null | 'draw'
  turnsPlayed: number
  finalHPs: ReplayFinalHPs
  timestamp?: number
  version?: string
  allActions?: RecordedAction[]
}

export const PVZ_LAST_REPLAY_KEY = 'pvz_last_replay'
export const REPLAY_SERIALIZE_PREFIX = 'PVZ_REPLAY:'

let inMemoryLastReplay: string | null = null

/**
 * Creates a new ReplaySession object.
 */
export function createReplaySession(
  seed: number | string,
  heroIds: { plant: string; zombie: string },
  initialHPs: { plant: number; zombie: number } = { plant: 20, zombie: 20 }
): ReplaySession {
  return {
    seed,
    heroIds: { ...heroIds },
    actions: [],
    winner: null,
    turnsPlayed: 1,
    finalHPs: { ...initialHPs },
    timestamp: Date.now(),
    version: '1.0.0',
  }
}

/**
 * Appends an action to the replay session.
 */
export function recordAction(session: ReplaySession, action: RecordedAction): void {
  if (!session.actions) {
    session.actions = []
  }
  const recorded: RecordedAction = {
    ...action,
    timestamp: action.timestamp ?? Date.now(),
  }
  session.actions.push(recorded)
  if (session.allActions) {
    session.allActions.push(recorded)
  }
}

/**
 * Base64 encode string (supports Node and browser).
 */
function toBase64(str: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(unescape(encodeURIComponent(str)))
  }
  const buf = (globalThis as any)?.Buffer
  if (buf) {
    return buf.from(str, 'utf-8').toString('base64')
  }
  throw new Error('No base64 encoder available')
}

/**
 * Base64 decode string (supports Node and browser).
 */
function fromBase64(b64: string): string {
  if (typeof atob !== 'undefined') {
    return decodeURIComponent(escape(atob(b64)))
  }
  const buf = (globalThis as any)?.Buffer
  if (buf) {
    return buf.from(b64, 'base64').toString('utf-8')
  }
  throw new Error('No base64 decoder available')
}

/**
 * Serializes a ReplaySession to a base64-encoded string prefixed with 'PVZ_REPLAY:'.
 * Also stores the serialized replay in localStorage key 'pvz_last_replay'.
 */
export function serializeReplay(session: ReplaySession): string {
  const json = JSON.stringify(session)
  const base64 = toBase64(json)
  const result = `${REPLAY_SERIALIZE_PREFIX}${base64}`

  saveLastReplay(result)

  return result
}

/**
 * Deserializes a base64-encoded replay string back into a ReplaySession object.
 * Returns null if invalid or corrupted.
 */
export function deserializeReplay(str: string): ReplaySession | null {
  if (!str || typeof str !== 'string') {
    return null
  }

  let payload = str.trim()
  if (payload.startsWith(REPLAY_SERIALIZE_PREFIX)) {
    payload = payload.slice(REPLAY_SERIALIZE_PREFIX.length)
  }

  try {
    const json = fromBase64(payload)
    const parsed = JSON.parse(json)

    if (
      parsed &&
      typeof parsed === 'object' &&
      'seed' in parsed &&
      'heroIds' in parsed &&
      Array.isArray(parsed.actions) &&
      'turnsPlayed' in parsed &&
      'finalHPs' in parsed
    ) {
      return parsed as ReplaySession
    }

    return null
  } catch {
    return null
  }
}

/**
 * Saves a serialized replay or ReplaySession into localStorage under 'pvz_last_replay'.
 */
export function saveLastReplay(replayOrSession: string | ReplaySession): void {
  const serialized = typeof replayOrSession === 'string'
    ? replayOrSession
    : serializeReplay(replayOrSession)

  inMemoryLastReplay = serialized

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(PVZ_LAST_REPLAY_KEY, serialized)
    } catch {
      // Ignore localStorage write failures (quota/private mode)
    }
  }
}

/**
 * Retrieves the last stored replay from localStorage or in-memory fallback.
 */
export function getLastReplay(): ReplaySession | null {
  let stored: string | null = null
  if (typeof localStorage !== 'undefined') {
    try {
      stored = localStorage.getItem(PVZ_LAST_REPLAY_KEY)
    } catch {
      stored = null
    }
  }
  if (!stored) {
    stored = inMemoryLastReplay
  }
  return stored ? deserializeReplay(stored) : null
}

/**
 * Converts a ReplaySession actions list into a human-readable event log array.
 */
export function replayToEventLog(session: ReplaySession): string[] {
  if (!session || !session.actions || !Array.isArray(session.actions)) {
    return []
  }

  return session.actions.map(action => {
    const turnPrefix = `Turn ${action.turn ?? 1}:`
    const sideName = action.side === 'plants' ? 'Plants' : action.side === 'zombies' ? 'Zombies' : ''

    switch (action.type) {
      case 'play_card': {
        const cardDisplay = action.cardName || action.cardId || 'a card'
        const laneDisplay = action.laneIndex !== undefined ? ` in lane ${action.laneIndex + 1}` : ''
        const costDisplay = action.cost !== undefined ? ` (Cost: ${action.cost})` : ''
        return `${turnPrefix} [${sideName || 'Player'}] played ${cardDisplay}${laneDisplay}${costDisplay}.`
      }
      case 'attack': {
        const attacker = action.attackerName || (action.side ? `${sideName} Minion` : 'Attacker')
        const target = action.targetName || action.target || 'target'
        const laneDisplay = action.laneIndex !== undefined ? ` in lane ${action.laneIndex + 1}` : ''
        const blockedText = action.isBlocked ? ' (Blocked!)' : ''
        const lethalText = action.isLethal ? ' (Lethal!)' : ''
        return `${turnPrefix} ${attacker} attacked ${target}${laneDisplay} for ${action.damage ?? 0} damage${blockedText}${lethalText}.`
      }
      case 'trick': {
        const trickName = action.cardName || action.cardId || 'a trick'
        const targetText = action.target ? ` on ${action.target}` : ''
        return `${turnPrefix} [${sideName || 'Player'}] cast trick ${trickName}${targetText}.`
      }
      case 'superpower': {
        const spName = action.cardName || action.cardId || action.superpowerId || 'Superpower'
        const targetText = action.target ? ` on ${action.target}` : ''
        return `${turnPrefix} [${sideName || 'Player'}] used superpower ${spName}${targetText}.`
      }
      case 'hero_damage': {
        const targetHero = action.targetSide === 'plants' ? 'Plant Hero' : action.targetSide === 'zombies' ? 'Zombie Hero' : 'Hero'
        const fromSource = action.sourceName ? ` from ${action.sourceName}` : ''
        const hpDisplay = action.remainingHp !== undefined ? ` (Remaining HP: ${action.remainingHp})` : ''
        const blockedDisplay = action.isBlocked ? ' (Blocked by Shield!)' : ''
        return `${turnPrefix} ${targetHero} took ${action.damage ?? 0} damage${fromSource}${blockedDisplay}${hpDisplay}.`
      }
      case 'super_block': {
        return `${turnPrefix} [${sideName || 'Player'}] Hero triggered Super-Block!`
      }
      default: {
        if (action.description) {
          return `${turnPrefix} ${action.description}`
        }
        return `${turnPrefix} [${sideName || 'Game'}] Action: ${action.type}`
      }
    }
  })
}
