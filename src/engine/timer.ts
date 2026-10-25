import type { Side } from './types'

export type TimerUrgencyLevel = 'normal' | 'burning' | 'critical'

export interface TurnTimer {
  totalSeconds: number
  ropeIgniteAt: number
  elapsedSeconds: number
  isBurning: boolean
  isExpired: boolean
  side: Side
}

/**
 * Creates a new TurnTimer with default 20s total duration and rope ignite at 15s.
 */
export function createTurnTimer(
  side: Side,
  totalSeconds = 20,
  ropeIgniteAt = 15
): TurnTimer {
  return {
    totalSeconds,
    ropeIgniteAt,
    elapsedSeconds: 0,
    isBurning: false,
    isExpired: false,
    side,
  }
}

/**
 * Advances the timer by deltaSec seconds and updates isBurning and isExpired flags.
 */
export function tickTimer(timer: TurnTimer, deltaSec: number): TurnTimer {
  if (deltaSec <= 0) {
    return timer
  }

  timer.elapsedSeconds = Math.min(timer.totalSeconds, Math.max(0, timer.elapsedSeconds + deltaSec))
  timer.isBurning = timer.elapsedSeconds >= timer.ropeIgniteAt && timer.elapsedSeconds < timer.totalSeconds
  timer.isExpired = timer.elapsedSeconds >= timer.totalSeconds

  return timer
}

/**
 * Resets the timer back to 0 elapsed seconds, optionally switching the active side.
 */
export function resetTimer(timer: TurnTimer, newSide?: Side): TurnTimer {
  timer.elapsedSeconds = 0
  timer.isBurning = false
  timer.isExpired = false
  if (newSide) {
    timer.side = newSide
  }
  return timer
}

/**
 * Returns remaining seconds on the timer, clamped to >= 0.
 */
export function getRemainingSeconds(timer: TurnTimer): number {
  return Math.max(0, timer.totalSeconds - timer.elapsedSeconds)
}

/**
 * Calculates the progress of the burning rope from 0.0 (unignited) to 1.0 (fully burned).
 */
export function getRopeProgress(timer: TurnTimer): number {
  if (timer.totalSeconds <= timer.ropeIgniteAt) {
    return timer.isExpired ? 1 : 0
  }

  if (timer.elapsedSeconds <= timer.ropeIgniteAt) {
    return 0
  }

  if (timer.elapsedSeconds >= timer.totalSeconds) {
    return 1
  }

  const ropeDuration = timer.totalSeconds - timer.ropeIgniteAt
  const progress = (timer.elapsedSeconds - timer.ropeIgniteAt) / ropeDuration
  return Math.min(1, Math.max(0, progress))
}

/**
 * Determines timer urgency level:
 * - 'critical': last 5 seconds (remaining <= 5s) or expired
 * - 'burning': rope is ignited and burning, but not yet critical
 * - 'normal': before rope ignition with plenty of time remaining
 */
export function getTimerUrgencyLevel(timer: TurnTimer): TimerUrgencyLevel {
  const remaining = timer.totalSeconds - timer.elapsedSeconds

  if (timer.isExpired || remaining <= 0) {
    return 'critical'
  }

  if (remaining <= 5) {
    return 'critical'
  }

  if (timer.isBurning || timer.elapsedSeconds >= timer.ropeIgniteAt) {
    return 'burning'
  }

  return 'normal'
}
