import type { GameState, MatchResult, ChallengeUpdate, DailyChallenge, Side } from './types'

export const DAILY_CHALLENGES_STORAGE_KEY = 'pvz_daily_challenges_v1'
export const DAILY_CHALLENGES_DATE_KEY = 'pvz_daily_challenges_date_v1'

export const DEFAULT_DAILY_CHALLENGES: DailyChallenge[] = [
  {
    id: 'challenge_win_plants',
    title: 'Chiến Thắng Cùng Cây Trồng (Win with Plants hero)',
    description: 'Giành chiến thắng trận đấu với một Anh hùng Cây Trồng (Plant Hero).',
    type: 'win_faction',
    target: 1,
    currentProgress: 0,
    isCompleted: false,
    rewardGems: 100,
    requiredSide: 'plants',
  },
  {
    id: 'challenge_damage_20',
    title: 'Sát Thương Bão Tố (Deal 20+ damage in one turn)',
    description: 'Gây từ 20 sát thương trở lên trong một lượt chơi duy nhất.',
    type: 'damage_in_turn',
    target: 20,
    currentProgress: 0,
    isCompleted: false,
    rewardGems: 150,
    minDamage: 20,
  },
  {
    id: 'challenge_use_superpower_3',
    title: 'Bậc Thầy Siêu Năng Lực (Use Superpower 3 times)',
    description: 'Sử dụng Siêu năng lực (Superpower) 3 lần trong trận đấu.',
    type: 'use_superpower',
    target: 3,
    currentProgress: 0,
    isCompleted: false,
    rewardGems: 120,
    superpowerCount: 3,
  },
  {
    id: 'challenge_win_under_8_turns',
    title: 'Tốc Chiến Tốc Thắng (Win in under 8 turns)',
    description: 'Giành chiến thắng trận đấu trước hoặc trong vòng 8 lượt chơi.',
    type: 'win_turns',
    target: 1,
    currentProgress: 0,
    isCompleted: false,
    rewardGems: 200,
    maxTurns: 8,
  },
]

/**
 * Loads daily challenges from localStorage or returns default set.
 */
export function loadDailyChallenges(): DailyChallenge[] {
  try {
    if (typeof localStorage === 'undefined') {
      return DEFAULT_DAILY_CHALLENGES.map(c => ({ ...c }))
    }
    const raw = localStorage.getItem(DAILY_CHALLENGES_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_DAILY_CHALLENGES.map(c => ({ ...c }))
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_DAILY_CHALLENGES.map(c => ({ ...c }))
    }
    return parsed
  } catch {
    return DEFAULT_DAILY_CHALLENGES.map(c => ({ ...c }))
  }
}

/**
 * Saves current daily challenges state to localStorage.
 */
export function saveDailyChallenges(challenges: DailyChallenge[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DAILY_CHALLENGES_STORAGE_KEY, JSON.stringify(challenges))
      localStorage.setItem(DAILY_CHALLENGES_DATE_KEY, new Date().toISOString().slice(0, 10))
    }
  } catch {
    // Ignore storage write errors in restricted environments
  }
}

/**
 * Resets daily challenges progress to initial state.
 */
export function resetDailyChallenges(): DailyChallenge[] {
  const fresh = DEFAULT_DAILY_CHALLENGES.map(c => ({
    ...c,
    currentProgress: 0,
    isCompleted: false,
  }))
  saveDailyChallenges(fresh)
  return fresh
}

/**
 * Evaluates progress across daily challenges based on current GameState and MatchResult.
 * Detects:
 * - "Win with Plants hero"
 * - "Deal 20+ damage in one turn"
 * - "Use Superpower 3 times"
 * - "Win in under 8 turns"
 *
 * Persists updated progress to localStorage and returns list of ChallengeUpdates.
 */
export function evaluateChallengeProgress(
  state: GameState,
  completedMatch?: Partial<MatchResult>,
  activeChallenges?: DailyChallenge[]
): ChallengeUpdate[] {
  const challenges = activeChallenges && activeChallenges.length > 0
    ? activeChallenges
    : loadDailyChallenges()

  const winner: Side | null = completedMatch?.winner ?? completedMatch?.winningSide ?? state.winner ?? null
  const turnsTaken = completedMatch?.turnsTaken ?? state.turn ?? 1
  const playerSide: Side = completedMatch?.playerSide ?? 'plants'
  const isPlayerWinner = winner !== null && (winner === playerSide || completedMatch?.winner === 'plants')

  // Calculate damage dealt in one turn
  let maxTurnDamage = completedMatch?.maxDamageDealtInOneTurn ?? 0
  if (completedMatch?.damageDealtInTurn) {
    const turnDmgVals = Array.isArray(completedMatch.damageDealtInTurn)
      ? completedMatch.damageDealtInTurn
      : Object.values(completedMatch.damageDealtInTurn)
    for (const val of turnDmgVals) {
      if (typeof val === 'number' && val > maxTurnDamage) {
        maxTurnDamage = val
      }
    }
  }
  // Also scan combat events if damage occurred during turns
  if (state.combatEvents && state.combatEvents.length > 0) {
    const turnDamages: Record<number, number> = {}
    for (const evt of state.combatEvents) {
      if (evt.damageDealt > 0 && evt.attackerSide === playerSide) {
        const r = evt.roundNumber ?? state.turn ?? 1
        turnDamages[r] = (turnDamages[r] || 0) + evt.damageDealt
      }
    }
    for (const dmg of Object.values(turnDamages)) {
      if (dmg > maxTurnDamage) {
        maxTurnDamage = dmg
      }
    }
  }

  // Calculate superpowers used
  let superpowersUsed = completedMatch?.superpowersUsed ?? 0
  if (!superpowersUsed && state.combatLog) {
    // Scan combatLog for superpower invocations
    const spCount = state.combatLog.filter(log =>
      log.toLowerCase().includes('siêu năng lực') ||
      log.toLowerCase().includes('superpower') ||
      log.includes('⚡') ||
      log.includes('✨')
    ).length
    if (spCount > 0) superpowersUsed = spCount
  }

  const updates: ChallengeUpdate[] = []

  for (const challenge of challenges) {
    if (challenge.isCompleted) {
      updates.push({
        challengeId: challenge.id,
        title: challenge.title,
        description: challenge.description,
        progress: challenge.target,
        target: challenge.target,
        isCompleted: true,
        rewardGems: challenge.rewardGems,
      })
      continue
    }

    // 1. Condition: "Win with Plants hero" (or win with specific faction)
    if (challenge.type === 'win_faction' || challenge.id === 'challenge_win_plants') {
      const targetSide = challenge.requiredSide || 'plants'
      if (winner === targetSide) {
        challenge.currentProgress = challenge.target
        challenge.isCompleted = true
      }
    }

    // 2. Condition: "Deal 20+ damage in one turn"
    else if (challenge.type === 'damage_in_turn' || challenge.id === 'challenge_damage_20') {
      const minDmg = challenge.minDamage || 20
      if (maxTurnDamage > challenge.currentProgress) {
        challenge.currentProgress = Math.min(challenge.target, maxTurnDamage)
      }
      if (maxTurnDamage >= minDmg) {
        challenge.currentProgress = challenge.target
        challenge.isCompleted = true
      }
    }

    // 3. Condition: "Use Superpower 3 times"
    else if (challenge.type === 'use_superpower' || challenge.id === 'challenge_use_superpower_3') {
      const newSpCount = Math.min(challenge.target, challenge.currentProgress + superpowersUsed)
      if (newSpCount !== challenge.currentProgress) {
        challenge.currentProgress = newSpCount
      }
      if (challenge.currentProgress >= challenge.target) {
        challenge.isCompleted = true
      }
    }

    // 4. Condition: "Win in under 8 turns"
    else if (challenge.type === 'win_turns' || challenge.id === 'challenge_win_under_8_turns') {
      const maxAllowedTurns = challenge.maxTurns || 8
      if (isPlayerWinner && turnsTaken <= maxAllowedAllowedTurns(maxAllowedTurns)) {
        challenge.currentProgress = challenge.target
        challenge.isCompleted = true
      }
    }

    // Fallback for custom challenges matching title or description
    else {
      const titleLower = challenge.title.toLowerCase()
      if (titleLower.includes('plants') && winner === 'plants') {
        challenge.currentProgress = challenge.target
        challenge.isCompleted = true
      } else if (titleLower.includes('20') && maxTurnDamage >= 20) {
        challenge.currentProgress = challenge.target
        challenge.isCompleted = true
      } else if (titleLower.includes('superpower') && superpowersUsed >= (challenge.superpowerCount || 3)) {
        challenge.currentProgress = challenge.target
        challenge.isCompleted = true
      } else if (titleLower.includes('8') && isPlayerWinner && turnsTaken <= 8) {
        challenge.currentProgress = challenge.target
        challenge.isCompleted = true
      }
    }

    updates.push({
      challengeId: challenge.id,
      title: challenge.title,
      description: challenge.description,
      progress: challenge.currentProgress,
      target: challenge.target,
      isCompleted: challenge.isCompleted,
      rewardGems: challenge.rewardGems,
    })
  }

  saveDailyChallenges(challenges)
  return updates
}

function maxAllowedAllowedTurns(turns: number): number {
  return turns
}

/**
 * Claims gems for a completed challenge and marks it claimed.
 */
export function claimChallengeReward(challengeId: string): { success: boolean; gemsAwarded: number } {
  const challenges = loadDailyChallenges()
  const challenge = challenges.find(c => c.id === challengeId)
  if (!challenge || !challenge.isCompleted) {
    return { success: false, gemsAwarded: 0 }
  }
  const gemsAwarded = challenge.rewardGems || 0
  saveDailyChallenges(challenges)
  return { success: true, gemsAwarded }
}

/**
 * Gets count of currently completed challenges.
 */
export function getCompletedChallengesCount(challenges?: DailyChallenge[]): number {
  const list = challenges || loadDailyChallenges()
  return list.filter(c => c.isCompleted).length
}
