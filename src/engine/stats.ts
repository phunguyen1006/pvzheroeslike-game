import type { Card, CardType } from './types'

export interface MVPCard {
  id: string
  name: string
  damage: number
  damageDealt?: number
}

export interface MatchStats {
  turns: number
  cardsPlayed: number
  totalDamageDealt: number
  totalDamageBlocked: number
  superBlocksTriggered: number
  minionsPlayed: number
  tricksPlayed: number
  superpowersUsed: number
  mvpCard: MVPCard | null
  longestTrickChain: number
  largestSingleAttack: number
  currentTrickChain?: number
  cardDamageMap?: Record<string, MVPCard>
}

export interface MatchSummary {
  turns: number
  cardsPlayed: number
  totalDamageDealt: number
  totalDamageBlocked: number
  superBlocksTriggered: number
  minionsPlayed: number
  tricksPlayed: number
  superpowersUsed: number
  mvpCard: MVPCard | null
  longestTrickChain: number
  largestSingleAttack: number
  text: string
  formatted: string
  toString: () => string
}

/**
 * Creates a fresh MatchStats tracking instance with all counters initialized to 0.
 */
export function createMatchStats(): MatchStats {
  return {
    turns: 0,
    cardsPlayed: 0,
    totalDamageDealt: 0,
    totalDamageBlocked: 0,
    superBlocksTriggered: 0,
    minionsPlayed: 0,
    tricksPlayed: 0,
    superpowersUsed: 0,
    mvpCard: null,
    longestTrickChain: 0,
    largestSingleAttack: 0,
    currentTrickChain: 0,
    cardDamageMap: {},
  }
}

/**
 * Records a card played. Accepts a Card object, a card type string, or a partial card representation.
 * Updates cardsPlayed, category counts (minionsPlayed, tricksPlayed, superpowersUsed),
 * and tracks the longest consecutive trick chain.
 */
export function recordCardPlayed(
  stats: MatchStats,
  cardOrType: Card | string | { type?: CardType | string; id?: string; name?: string },
  count = 1
): MatchStats {
  stats.cardsPlayed += count

  const rawType = typeof cardOrType === 'string'
    ? cardOrType
    : (cardOrType.type || '')

  const type = rawType.toLowerCase().trim()

  if (type === 'minion') {
    stats.minionsPlayed += count
    stats.currentTrickChain = 0
  } else if (type === 'trick') {
    stats.tricksPlayed += count
    stats.currentTrickChain = (stats.currentTrickChain || 0) + count
    if (stats.currentTrickChain > stats.longestTrickChain) {
      stats.longestTrickChain = stats.currentTrickChain
    }
  } else if (type === 'superpower') {
    stats.superpowersUsed += count
    stats.currentTrickChain = 0
  } else {
    stats.currentTrickChain = 0
  }

  return stats
}

/**
 * Records damage dealt or blocked during combat or tricks.
 * If isBlocked is true (or options.isBlocked is true), updates totalDamageBlocked.
 * Otherwise, updates totalDamageDealt and checks largestSingleAttack.
 */
export function recordDamage(
  stats: MatchStats,
  amount: number,
  isBlockedOrOptions?: boolean | { isBlocked?: boolean; blockedAmount?: number; attacker?: string }
): MatchStats {
  if (amount <= 0 && (!isBlockedOrOptions || typeof isBlockedOrOptions !== 'object')) {
    return stats
  }

  const isBlocked = typeof isBlockedOrOptions === 'boolean'
    ? isBlockedOrOptions
    : !!isBlockedOrOptions?.isBlocked

  if (isBlocked) {
    const blockedAmount = (typeof isBlockedOrOptions === 'object' && isBlockedOrOptions?.blockedAmount !== undefined)
      ? isBlockedOrOptions.blockedAmount
      : amount
    stats.totalDamageBlocked += blockedAmount
  } else {
    stats.totalDamageDealt += amount
    if (amount > stats.largestSingleAttack) {
      stats.largestSingleAttack = amount
    }
  }

  return stats
}

/**
 * Records damage explicitly blocked by hero shield or armor.
 */
export function recordDamageBlocked(stats: MatchStats, amount: number): MatchStats {
  if (amount > 0) {
    stats.totalDamageBlocked += amount
  }
  return stats
}

/**
 * Records a super-block activation.
 */
export function recordSuperBlock(stats: MatchStats): MatchStats {
  stats.superBlocksTriggered += 1
  return stats
}

/**
 * Records damage dealt by a specific card to track and determine the MVP card of the match.
 * Supports:
 * - recordMVPDamage(stats, cardId, cardName, damage)
 * - recordMVPDamage(stats, cardObj, damage)
 * - recordMVPDamage(stats, cardName, damage)
 */
export function recordMVPDamage(
  stats: MatchStats,
  cardOrId: string | { id?: string; name?: string },
  nameOrDamage: string | number,
  maybeDamage?: number
): MatchStats {
  let id: string
  let name: string
  let damage: number

  if (typeof nameOrDamage === 'number') {
    if (typeof cardOrId === 'string') {
      id = cardOrId
      name = cardOrId
    } else {
      id = cardOrId.id || cardOrId.name || 'card'
      name = cardOrId.name || cardOrId.id || 'Card'
    }
    damage = nameOrDamage
  } else {
    id = String(cardOrId)
    name = String(nameOrDamage)
    damage = maybeDamage ?? 0
  }

  if (damage <= 0) {
    return stats
  }

  if (!stats.cardDamageMap) {
    stats.cardDamageMap = {}
  }

  if (!stats.cardDamageMap[id]) {
    stats.cardDamageMap[id] = { id, name, damage: 0, damageDealt: 0 }
  }

  stats.cardDamageMap[id].damage += damage
  stats.cardDamageMap[id].damageDealt = stats.cardDamageMap[id].damage

  // Update MVP Card
  let best: MVPCard | null = null
  for (const entry of Object.values(stats.cardDamageMap)) {
    if (!best || entry.damage > best.damage) {
      best = entry
    }
  }

  if (best) {
    stats.mvpCard = { ...best }
  }

  return stats
}

/**
 * Records a turn increment.
 */
export function recordTurn(stats: MatchStats, turnsToAdd = 1): MatchStats {
  stats.turns += turnsToAdd
  return stats
}

/**
 * Formats match stats into a human-readable text block.
 */
export function formatMatchSummary(stats: MatchStats): string {
  const mvpDisplay = stats.mvpCard
    ? `${stats.mvpCard.name} (${stats.mvpCard.damage} dmg)`
    : 'None'

  return [
    '=== MATCH SUMMARY ===',
    `Turns: ${stats.turns}`,
    `Cards Played: ${stats.cardsPlayed} (Minions: ${stats.minionsPlayed}, Tricks: ${stats.tricksPlayed}, Superpowers: ${stats.superpowersUsed})`,
    `Total Damage Dealt: ${stats.totalDamageDealt}`,
    `Total Damage Blocked: ${stats.totalDamageBlocked}`,
    `Super-Blocks Triggered: ${stats.superBlocksTriggered}`,
    `MVP Card: ${mvpDisplay}`,
    `Longest Trick Chain: ${stats.longestTrickChain}`,
    `Largest Single Attack: ${stats.largestSingleAttack}`,
  ].join('\n')
}

/**
 * Returns structured summary data along with formatted string representations.
 */
export function getMatchSummary(stats: MatchStats): MatchSummary {
  const text = formatMatchSummary(stats)
  return {
    turns: stats.turns,
    cardsPlayed: stats.cardsPlayed,
    totalDamageDealt: stats.totalDamageDealt,
    totalDamageBlocked: stats.totalDamageBlocked,
    superBlocksTriggered: stats.superBlocksTriggered,
    minionsPlayed: stats.minionsPlayed,
    tricksPlayed: stats.tricksPlayed,
    superpowersUsed: stats.superpowersUsed,
    mvpCard: stats.mvpCard ? { ...stats.mvpCard } : null,
    longestTrickChain: stats.longestTrickChain,
    largestSingleAttack: stats.largestSingleAttack,
    formatted: text,
    text,
    toString: () => text,
  }
}
