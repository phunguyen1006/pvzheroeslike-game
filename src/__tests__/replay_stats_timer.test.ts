import { describe, it, expect, beforeEach } from 'vitest'
import {
  createReplaySession,
  recordAction,
  serializeReplay,
  deserializeReplay,
  saveLastReplay,
  getLastReplay,
  replayToEventLog,
  PVZ_LAST_REPLAY_KEY,
  REPLAY_SERIALIZE_PREFIX,
  type ReplaySession,
  type RecordedAction,
} from '../engine/replay'
import {
  createTurnTimer,
  tickTimer,
  resetTimer,
  getRopeProgress,
  getTimerUrgencyLevel,
  getRemainingSeconds,
} from '../engine/timer'
import {
  createMatchStats,
  recordCardPlayed,
  recordDamage,
  recordDamageBlocked,
  recordSuperBlock,
  recordMVPDamage,
  recordTurn,
  getMatchSummary,
} from '../engine/stats'

describe('Match Replay System (src/engine/replay.ts)', () => {
  let session: ReplaySession

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
    }
    session = createReplaySession(12345, { plant: 'green_shadow', zombie: 'super_brainz' }, { plant: 20, zombie: 20 })
  })

  it('1. should initialize ReplaySession with correct structure and metadata', () => {
    expect(session.seed).toBe(12345)
    expect(session.heroIds.plant).toBe('green_shadow')
    expect(session.heroIds.zombie).toBe('super_brainz')
    expect(session.actions).toEqual([])
    expect(session.turnsPlayed).toBe(1)
    expect(session.finalHPs).toEqual({ plant: 20, zombie: 20 })
    expect(session.winner).toBeNull()
  })

  it('2. should record actions into ReplaySession via recordAction', () => {
    const action1: RecordedAction = {
      type: 'play_card',
      turn: 1,
      side: 'plants',
      cardId: 'peashooter',
      cardName: 'Peashooter',
      laneIndex: 0,
      cost: 1,
    }

    const action2: RecordedAction = {
      type: 'attack',
      turn: 1,
      side: 'plants',
      laneIndex: 0,
      attackerName: 'Peashooter',
      target: 'hero',
      damage: 1,
      isBlocked: false,
    }

    recordAction(session, action1)
    recordAction(session, action2)

    expect(session.actions.length).toBe(2)
    expect(session.actions[0].type).toBe('play_card')
    expect(session.actions[0].cardId).toBe('peashooter')
    expect(session.actions[0].timestamp).toBeDefined()
    expect(session.actions[1].type).toBe('attack')
    expect(session.actions[1].damage).toBe(1)
  })

  it('3. should serialize replay session to base64 string prefixed with PVZ_REPLAY:', () => {
    recordAction(session, {
      type: 'play_card',
      turn: 1,
      side: 'plants',
      cardId: 'peashooter',
    })

    const serialized = serializeReplay(session)
    expect(typeof serialized).toBe('string')
    expect(serialized.startsWith(REPLAY_SERIALIZE_PREFIX)).toBe(true)

    // Should also store to localStorage key pvz_last_replay
    if (typeof localStorage !== 'undefined') {
      expect(localStorage.getItem(PVZ_LAST_REPLAY_KEY)).toBe(serialized)
    }
  })

  it('4. should deserialize serialized replay string back into a valid ReplaySession', () => {
    session.winner = 'plants'
    session.turnsPlayed = 5
    session.finalHPs = { plant: 15, zombie: 0 }
    recordAction(session, {
      type: 'superpower',
      turn: 2,
      side: 'plants',
      cardName: 'Precision Blast',
      damage: 5,
    })

    const serialized = serializeReplay(session)
    const deserialized = deserializeReplay(serialized)

    expect(deserialized).not.toBeNull()
    expect(deserialized?.seed).toBe(session.seed)
    expect(deserialized?.winner).toBe('plants')
    expect(deserialized?.turnsPlayed).toBe(5)
    expect(deserialized?.finalHPs).toEqual({ plant: 15, zombie: 0 })
    expect(deserialized?.actions.length).toBe(1)
    expect(deserialized?.actions[0].cardName).toBe('Precision Blast')
  })

  it('5. should return null when deserializing corrupted or invalid strings', () => {
    expect(deserializeReplay('')).toBeNull()
    expect(deserializeReplay('random_gibberish_string')).toBeNull()
    expect(deserializeReplay('PVZ_REPLAY:invalid_base64_!@#$')).toBeNull()
    expect(deserializeReplay('PVZ_REPLAY:' + Buffer.from('{"invalid":"object"}').toString('base64'))).toBeNull()
  })

  it('6. should save and retrieve last replay using saveLastReplay and getLastReplay', () => {
    session.turnsPlayed = 7
    recordAction(session, {
      type: 'hero_damage',
      turn: 7,
      targetSide: 'zombies',
      damage: 6,
      remainingHp: 0,
    })

    saveLastReplay(session)
    const last = getLastReplay()

    expect(last).not.toBeNull()
    expect(last?.turnsPlayed).toBe(7)
    expect(last?.actions.length).toBe(1)
    expect(last?.actions[0].damage).toBe(6)
  })

  it('7. should convert replay actions into human-readable event log array via replayToEventLog', () => {
    recordAction(session, {
      type: 'play_card',
      turn: 1,
      side: 'plants',
      cardName: 'Peashooter',
      laneIndex: 2,
      cost: 1,
    })
    recordAction(session, {
      type: 'trick',
      turn: 1,
      side: 'zombies',
      cardName: 'Bungee Plumber',
      target: 'Peashooter',
    })
    recordAction(session, {
      type: 'attack',
      turn: 1,
      side: 'plants',
      attackerName: 'Repeater',
      target: 'Zombie Hero',
      laneIndex: 1,
      damage: 4,
      isBlocked: false,
      isLethal: false,
    })
    recordAction(session, {
      type: 'hero_damage',
      turn: 1,
      targetSide: 'zombies',
      damage: 4,
      remainingHp: 16,
    })
    recordAction(session, {
      type: 'superpower',
      turn: 2,
      side: 'plants',
      cardName: 'Precision Blast',
    })
    recordAction(session, {
      type: 'super_block',
      turn: 2,
      side: 'zombies',
    })

    const logs = replayToEventLog(session)
    expect(logs.length).toBe(6)
    expect(logs[0]).toContain('[Plants] played Peashooter in lane 3 (Cost: 1)')
    expect(logs[1]).toContain('[Zombies] cast trick Bungee Plumber on Peashooter')
    expect(logs[2]).toContain('Repeater attacked Zombie Hero in lane 2 for 4 damage')
    expect(logs[3]).toContain('Zombie Hero took 4 damage')
    expect(logs[3]).toContain('Remaining HP: 16')
    expect(logs[4]).toContain('[Plants] used superpower Precision Blast')
    expect(logs[5]).toContain('[Zombies] Hero triggered Super-Block!')
  })

  it('8. should return empty array when replayToEventLog is called on session with no actions', () => {
    expect(replayToEventLog(session)).toEqual([])
    expect(replayToEventLog({} as any)).toEqual([])
  })
})

describe('Turn Timer Engine (src/engine/timer.ts)', () => {
  it('9. should create TurnTimer with default 20s total and 15s rope ignition', () => {
    const timer = createTurnTimer('plants')
    expect(timer.totalSeconds).toBe(20)
    expect(timer.ropeIgniteAt).toBe(15)
    expect(timer.elapsedSeconds).toBe(0)
    expect(timer.isBurning).toBe(false)
    expect(timer.isExpired).toBe(false)
    expect(timer.side).toBe('plants')
    expect(getRemainingSeconds(timer)).toBe(20)
  })

  it('10. should advance elapsedSeconds and clamp at totalSeconds when ticked', () => {
    const timer = createTurnTimer('zombies')
    tickTimer(timer, 5)
    expect(timer.elapsedSeconds).toBe(5)
    expect(timer.isBurning).toBe(false)
    expect(timer.isExpired).toBe(false)

    tickTimer(timer, 20)
    expect(timer.elapsedSeconds).toBe(20)
    expect(timer.isExpired).toBe(true)
  })

  it('11. should ignite rope (isBurning = true) when elapsed reaches ropeIgniteAt', () => {
    const timer = createTurnTimer('plants')
    tickTimer(timer, 14.9)
    expect(timer.isBurning).toBe(false)

    tickTimer(timer, 0.2) // elapsed = 15.1
    expect(timer.isBurning).toBe(true)
    expect(timer.isExpired).toBe(false)
  })

  it('12. should calculate rope progress from 0.0 to 1.0 correctly via getRopeProgress', () => {
    const timer = createTurnTimer('plants', 20, 15)

    // Before rope ignites
    tickTimer(timer, 10)
    expect(getRopeProgress(timer)).toBe(0)

    // At rope ignition (15s)
    tickTimer(timer, 5) // elapsed = 15
    expect(getRopeProgress(timer)).toBe(0)

    // Halfway through burning (17.5s -> 2.5s into 5s rope)
    tickTimer(timer, 2.5) // elapsed = 17.5
    expect(getRopeProgress(timer)).toBeCloseTo(0.5, 2)

    // Expired (20s)
    tickTimer(timer, 2.5) // elapsed = 20
    expect(getRopeProgress(timer)).toBe(1)
  })

  it('13. should report correct urgency levels: normal, burning, and critical', () => {
    // Normal level: plenty of time remaining before rope
    const timerNormal = createTurnTimer('plants', 30, 15)
    tickTimer(timerNormal, 5) // remaining 25s > 5s, elapsed < 15s
    expect(getTimerUrgencyLevel(timerNormal)).toBe('normal')

    // Burning level: rope ignited at 15s, but remaining > 5s
    tickTimer(timerNormal, 12) // elapsed = 17s, remaining = 13s > 5s
    expect(timerNormal.isBurning).toBe(true)
    expect(getTimerUrgencyLevel(timerNormal)).toBe('burning')

    // Critical level: last 5 seconds (remaining <= 5s)
    tickTimer(timerNormal, 9) // elapsed = 26s, remaining = 4s <= 5s
    expect(getTimerUrgencyLevel(timerNormal)).toBe('critical')

    // Default 20s timer in last 5 seconds
    const defaultTimer = createTurnTimer('zombies')
    tickTimer(defaultTimer, 16) // elapsed = 16s, remaining = 4s <= 5s
    expect(getTimerUrgencyLevel(defaultTimer)).toBe('critical')

    // Expired timer is critical
    tickTimer(defaultTimer, 10) // elapsed clamped to 20s
    expect(getTimerUrgencyLevel(defaultTimer)).toBe('critical')
  })

  it('14. should reset timer state and switch side via resetTimer', () => {
    const timer = createTurnTimer('plants')
    tickTimer(timer, 18)
    expect(timer.elapsedSeconds).toBe(18)
    expect(timer.isBurning).toBe(true)

    resetTimer(timer, 'zombies')
    expect(timer.elapsedSeconds).toBe(0)
    expect(timer.isBurning).toBe(false)
    expect(timer.isExpired).toBe(false)
    expect(timer.side).toBe('zombies')
  })
})

describe('In-Match Statistics (src/engine/stats.ts)', () => {
  it('15. should create fresh MatchStats with all metrics initialized to zero and mvpCard to null', () => {
    const stats = createMatchStats()
    expect(stats.turns).toBe(0)
    expect(stats.cardsPlayed).toBe(0)
    expect(stats.totalDamageDealt).toBe(0)
    expect(stats.totalDamageBlocked).toBe(0)
    expect(stats.superBlocksTriggered).toBe(0)
    expect(stats.minionsPlayed).toBe(0)
    expect(stats.tricksPlayed).toBe(0)
    expect(stats.superpowersUsed).toBe(0)
    expect(stats.mvpCard).toBeNull()
    expect(stats.longestTrickChain).toBe(0)
    expect(stats.largestSingleAttack).toBe(0)
  })

  it('16. should track cards played by type and reset/update longest trick chain', () => {
    const stats = createMatchStats()

    // Play a minion
    recordCardPlayed(stats, { type: 'minion', id: 'peashooter', name: 'Peashooter' })
    expect(stats.cardsPlayed).toBe(1)
    expect(stats.minionsPlayed).toBe(1)
    expect(stats.longestTrickChain).toBe(0)

    // Play 3 consecutive tricks
    recordCardPlayed(stats, { type: 'trick', id: 'fertilize', name: 'Fertilize' })
    recordCardPlayed(stats, { type: 'trick', id: 'embiggen', name: 'Embiggen' })
    recordCardPlayed(stats, 'trick')
    expect(stats.cardsPlayed).toBe(4)
    expect(stats.tricksPlayed).toBe(3)
    expect(stats.longestTrickChain).toBe(3)

    // Play another minion which breaks trick chain
    recordCardPlayed(stats, 'minion')
    expect(stats.minionsPlayed).toBe(2)
    expect(stats.longestTrickChain).toBe(3) // Preserved highest chain

    // Play 2 tricks (does not exceed previous 3)
    recordCardPlayed(stats, 'trick')
    recordCardPlayed(stats, 'trick')
    expect(stats.longestTrickChain).toBe(3)

    // Play superpower
    recordCardPlayed(stats, { type: 'superpower', id: 'sp1', name: 'Precision Blast' })
    expect(stats.superpowersUsed).toBe(1)
    expect(stats.cardsPlayed).toBe(8)
  })

  it('17. should track total damage dealt and largest single attack', () => {
    const stats = createMatchStats()

    recordDamage(stats, 3)
    recordDamage(stats, 7)
    recordDamage(stats, 4)

    expect(stats.totalDamageDealt).toBe(14)
    expect(stats.largestSingleAttack).toBe(7)
  })

  it('18. should record blocked damage and not treat it as damage dealt', () => {
    const stats = createMatchStats()

    recordDamage(stats, 5)
    recordDamage(stats, 3, true) // blocked
    recordDamageBlocked(stats, 4)

    expect(stats.totalDamageDealt).toBe(5)
    expect(stats.totalDamageBlocked).toBe(7)
    expect(stats.largestSingleAttack).toBe(5)
  })

  it('19. should record super block activations', () => {
    const stats = createMatchStats()
    recordSuperBlock(stats)
    recordSuperBlock(stats)
    expect(stats.superBlocksTriggered).toBe(2)
  })

  it('20. should track card damage and determine the match MVP card correctly', () => {
    const stats = createMatchStats()

    recordMVPDamage(stats, 'peashooter', 'Peashooter', 4)
    expect(stats.mvpCard?.name).toBe('Peashooter')
    expect(stats.mvpCard?.damage).toBe(4)

    recordMVPDamage(stats, 'repeater', 'Repeater', 6)
    expect(stats.mvpCard?.name).toBe('Repeater')
    expect(stats.mvpCard?.damage).toBe(6)

    // Peashooter deals 4 more damage (total 8) -> Peashooter becomes MVP again
    recordMVPDamage(stats, 'peashooter', 'Peashooter', 4)
    expect(stats.mvpCard?.name).toBe('Peashooter')
    expect(stats.mvpCard?.damage).toBe(8)
  })

  it('21. should generate comprehensive match summary via getMatchSummary', () => {
    const stats = createMatchStats()
    recordTurn(stats, 6)
    recordCardPlayed(stats, 'minion')
    recordCardPlayed(stats, 'minion')
    recordCardPlayed(stats, 'trick')
    recordCardPlayed(stats, 'trick')
    recordCardPlayed(stats, 'superpower')
    recordDamage(stats, 15)
    recordDamage(stats, 5, true)
    recordSuperBlock(stats)
    recordMVPDamage(stats, 'snow_pea', 'Snow Pea', 10)

    const summary = getMatchSummary(stats)
    expect(summary.turns).toBe(6)
    expect(summary.cardsPlayed).toBe(5)
    expect(summary.minionsPlayed).toBe(2)
    expect(summary.tricksPlayed).toBe(2)
    expect(summary.superpowersUsed).toBe(1)
    expect(summary.totalDamageDealt).toBe(15)
    expect(summary.totalDamageBlocked).toBe(5)
    expect(summary.superBlocksTriggered).toBe(1)
    expect(summary.mvpCard?.name).toBe('Snow Pea')
    expect(summary.mvpCard?.damage).toBe(10)

    // Check formatted text representation
    const text = summary.text
    expect(text).toContain('=== MATCH SUMMARY ===')
    expect(text).toContain('Turns: 6')
    expect(text).toContain('Damage Dealt: 15')
    expect(text).toContain('Damage Blocked: 5')
    expect(text).toContain('Snow Pea (10 dmg)')
    expect(summary.toString()).toBe(text)
  })
})
