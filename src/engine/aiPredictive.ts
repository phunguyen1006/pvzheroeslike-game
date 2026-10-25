/**
 * PvZ Heroes Replicate - Advanced AI Predictive Engine
 * 1. Predictive Trick Evaluation: Evaluates opponent's unspent Brains/Sun to anticipate lethal combat or board wipes.
 * 2. Threat Assessment Heuristic: Identifies high-priority target minions (Frenzy, Deadly, Double Strike, Dino-Roar, etc.).
 * 3. Super-Block Management AI: Intentionally accepts chip damage when block meter is 6/8 or 7/8 to trigger Super-Block before heavy attacks.
 * 4. Tournament Grandmaster Archetype: Master tournament tactical profile combining optimal placement, combo anticipation, and predictive restraint.
 */

import type { GameState, Side, Card, Minion } from './types'
import { isUntrickable } from './abilities'

// =========================================================================
// 1. THREAT ASSESSMENT HEURISTICS
// =========================================================================

export interface PriorityTarget {
  laneIndex: number
  minion: Minion
  priorityScore: number
  reasons: string[]
  isHighPriority: boolean
  hasFrenzy: boolean
  hasDeadly: boolean
  hasDoubleStrike: boolean
  hasDinoRoar: boolean
  hasStrikethrough: boolean
  hasBullseye: boolean
  recommendedCounters: ('BLOCK_LANE' | 'HARD_REMOVAL' | 'DAMAGE_TRICK' | 'BOUNCE')[]
}

/**
 * Checks whether a minion or card has the Dino-Roar ability / keyword.
 */
export function isDinoRoarMinion(minion: Minion | Card): boolean {
  const id = ((minion as any).cardId || (minion as any).id || '').toLowerCase()
  const traits = (minion as any).traits || []
  return (
    id.includes('aloeosaurus') ||
    id.includes('tricarrotops') ||
    id.includes('velociradish') ||
    id.includes('bananasaurus') ||
    id.includes('raiding_raptor') ||
    id.includes('tankylosaurus') ||
    id.includes('mondo_bronto') ||
    Boolean((minion as any).dinoRoar) ||
    traits.some((t: any) => typeof t === 'string' && t.toLowerCase().includes('dino'))
  )
}

/**
 * Checks whether a minion or card possesses the Double Strike trait.
 */
export function isDoubleStrikeMinion(minion: Minion | Card): boolean {
  const id = ((minion as any).cardId || (minion as any).id || '').toLowerCase()
  const traits = (minion as any).traits || []
  return (
    Boolean((minion as any).doubleStrike) ||
    id.includes('repeater') ||
    id.includes('bananasaurus') ||
    traits.some(
      (t: any) =>
        typeof t === 'string' &&
        (t === 'doubleStrike' || t === 'double-strike' || t.toLowerCase().includes('double'))
    )
  )
}

/**
 * Checks whether a minion or card possesses the Frenzy trait.
 */
export function isFrenzyMinion(minion: Minion | Card): boolean {
  const traits = (minion as any).traits || []
  return (
    Boolean((minion as any).frenzy) ||
    traits.some((t: any) => typeof t === 'string' && t.toLowerCase().includes('frenzy'))
  )
}

/**
 * Checks whether a minion or card possesses the Deadly trait.
 */
export function isDeadlyMinion(minion: Minion | Card): boolean {
  const traits = (minion as any).traits || []
  return (
    Boolean((minion as any).deadly) ||
    traits.some((t: any) => typeof t === 'string' && t.toLowerCase().includes('deadly'))
  )
}

/**
 * Checks whether a minion or card possesses the Strikethrough trait.
 */
export function isStrikethroughMinion(minion: Minion | Card): boolean {
  const traits = (minion as any).traits || []
  return (
    Boolean((minion as any).strikethrough) ||
    traits.some((t: any) => typeof t === 'string' && t.toLowerCase().includes('strikethrough'))
  )
}

/**
 * Checks whether a minion or card possesses the Bullseye trait.
 */
export function isBullseyeMinion(minion: Minion | Card): boolean {
  const traits = (minion as any).traits || []
  return (
    Boolean((minion as any).bullseye) ||
    traits.some((t: any) => typeof t === 'string' && t.toLowerCase().includes('bullseye'))
  )
}

/**
 * Evaluates the threat rating of a single minion based on keywords, stats, and synergy potential.
 * Higher score = higher priority to eliminate, debuff, or block.
 */
export function evaluateMinionPriorityScore(minion: Minion): {
  score: number
  reasons: string[]
  isHighPriority: boolean
  hasFrenzy: boolean
  hasDeadly: boolean
  hasDoubleStrike: boolean
  hasDinoRoar: boolean
  hasStrikethrough: boolean
  hasBullseye: boolean
} {
  const reasons: string[] = []
  let score = minion.currentAttack * 2 + minion.currentHealth

  const hasDouble = isDoubleStrikeMinion(minion)
  const hasDino = isDinoRoarMinion(minion)
  const hasFrenz = isFrenzyMinion(minion)
  const hasDeadl = isDeadlyMinion(minion)
  const hasStrike = isStrikethroughMinion(minion)
  const hasBull = isBullseyeMinion(minion)

  if (hasDouble) {
    score += 10
    reasons.push('Double Strike (attacks twice per turn for lethal burst)')
  }
  if (hasDino) {
    score += 9
    reasons.push('Dino-Roar (snowballing stat and ability engine)')
  }
  if (hasFrenz) {
    score += 8
    reasons.push('Frenzy (extra attack on destroying minion)')
  }
  if (hasDeadl) {
    score += 7
    reasons.push('Deadly (instantly destroys any blocking minion)')
  }
  if (hasStrike) {
    score += 6
    reasons.push('Strikethrough (pierces lane for unpreventable face damage)')
  }
  if (hasBull) {
    score += 4
    reasons.push('Bullseye (deals damage without charging Super-Block meter)')
  }
  if (minion.currentAttack >= 4) {
    score += 5
    reasons.push(`High Attack (${minion.currentAttack} ATK heavy threat)`)
  }
  if (minion.antiHero) {
    score += minion.antiHero * 2
    reasons.push(`Anti-Hero (+${minion.antiHero} burst when unblocked)`)
  }

  // Key synergy and engine minions
  const idLower = (minion.cardId || minion.name || '').toLowerCase()
  if (
    idLower.includes('dr_spacetime') ||
    idLower.includes('valkyrie') ||
    idLower.includes('trickster') ||
    idLower.includes('black_eyed_pea') ||
    idLower.includes('astro_shroom') ||
    idLower.includes('captain_cucumber') ||
    idLower.includes('zombology_teacher')
  ) {
    score += 6
    reasons.push('High-value synergy engine minion')
  }

  const isHighPriority = score >= 14 || hasDouble || hasDino || hasFrenz || hasDeadl

  return {
    score,
    reasons,
    isHighPriority,
    hasFrenzy: hasFrenz,
    hasDeadly: hasDeadl,
    hasDoubleStrike: hasDouble,
    hasDinoRoar: hasDino,
    hasStrikethrough: hasStrike,
    hasBullseye: hasBull,
  }
}

/**
 * Ranks all opposing minions on board by priority threat score.
 * Returns sorted list with tactical counter recommendations.
 */
export function getPriorityThreatTargets(state: GameState, mySide: Side): PriorityTarget[] {
  const isZombie = mySide === 'zombies'
  const targets: PriorityTarget[] = []

  state.lanes.forEach((lane, idx) => {
    const enemyMinions: { minion: Minion | null; isTeamUp?: boolean }[] = isZombie
      ? [{ minion: lane.plantMinion }, { minion: lane.plantTeamUpMinion ?? null, isTeamUp: true }]
      : [{ minion: lane.zombieMinion }]

    enemyMinions.forEach(({ minion }) => {
      if (!minion || minion.currentHealth <= 0) return

      const evalResult = evaluateMinionPriorityScore(minion)
      const myMinion = isZombie ? lane.zombieMinion : lane.plantMinion
      const isUnblocked = !myMinion

      const recommendedCounters: ('BLOCK_LANE' | 'HARD_REMOVAL' | 'DAMAGE_TRICK' | 'BOUNCE')[] = []

      // If minion has 4+ attack and is trickable, hard removal is ideal
      if (minion.currentAttack >= 4 && !isUntrickable(minion)) {
        recommendedCounters.push('HARD_REMOVAL')
      }
      // If minion has deadly or frenzy, avoid chump blocking unless armored; prefer removal or bounce
      if ((evalResult.hasDeadly || evalResult.hasFrenzy) && !isUntrickable(minion)) {
        recommendedCounters.push('HARD_REMOVAL', 'BOUNCE', 'DAMAGE_TRICK')
      }
      // If unblocked and threatening high damage, block lane
      if (isUnblocked) {
        recommendedCounters.push('BLOCK_LANE')
      }
      if (minion.currentHealth <= 3 && !isUntrickable(minion)) {
        recommendedCounters.push('DAMAGE_TRICK')
      }

      targets.push({
        laneIndex: idx,
        minion,
        priorityScore: evalResult.score,
        reasons: evalResult.reasons,
        isHighPriority: evalResult.isHighPriority,
        hasFrenzy: evalResult.hasFrenzy,
        hasDeadly: evalResult.hasDeadly,
        hasDoubleStrike: evalResult.hasDoubleStrike,
        hasDinoRoar: evalResult.hasDinoRoar,
        hasStrikethrough: evalResult.hasStrikethrough,
        hasBullseye: evalResult.hasBullseye,
        recommendedCounters: Array.from(new Set(recommendedCounters)),
      })
    })
  })

  return targets.sort((a, b) => b.priorityScore - a.priorityScore)
}

export const rankThreatMinions = getPriorityThreatTargets

// =========================================================================
// 2. PREDICTIVE TRICK EVALUATION & SWARM HOLDING LOGIC
// =========================================================================

export interface OpponentTrickAnticipation {
  unspentResource: number
  canWipeBoard: boolean
  canBuffSwarm: boolean
  hasLethalCombatPotential: boolean
  threatenedTricks: string[]
  dangerLevel: 'low' | 'medium' | 'high' | 'critical'
  recommendedAction: 'HOLD_SWARM' | 'HOLD_HEAVY' | 'PREPARE_DEFENSE' | 'PROCEED'
  reasons: string[]
}

/**
 * Predicts opponent's potential tricks based on unspent Brains or Sun.
 * Anticipates board wipes (Doom-Shroom, Tactical Cuke, Weed Spray),
 * team buffs (Going Viral), and lethal burst lines (Plant Food, Lurch for Lunch, Berry Blast).
 */
export function anticipateOpponentTricks(
  state: GameState,
  side: Side
): OpponentTrickAnticipation {
  const isZombie = side === 'zombies'
  const enemyHero = isZombie ? state.plantHero : state.zombieHero
  const myHero = isZombie ? state.zombieHero : state.plantHero
  const unspentResource = isZombie ? enemyHero.sun : enemyHero.brains

  const threatenedTricks: string[] = []
  const reasons: string[] = []
  let canWipeBoard = false
  let canBuffSwarm = false
  let hasLethalCombatPotential = false

  const livingFriendlyMinions = state.lanes
    .map((l) => (isZombie ? l.zombieMinion : l.plantMinion))
    .filter((m): m is Minion => Boolean(m && m.currentHealth > 0))

  const livingEnemyMinions = state.lanes
    .map((l) => (isZombie ? l.plantMinion : l.zombieMinion))
    .filter((m): m is Minion => Boolean(m && m.currentHealth > 0))

  const unblockedEnemyMinions = state.lanes
    .filter((l) => (isZombie ? l.plantMinion && !l.zombieMinion : l.zombieMinion && !l.plantMinion))
    .map((l) => (isZombie ? l.plantMinion! : l.zombieMinion!))

  if (isZombie) {
    // AI is Zombie: evaluates opponent Plant reactions during upcoming PLANT_PLAY
    // Doom-Shroom (5 Sun): Destroys all plants & zombies with 4+ Attack
    if (unspentResource >= 5) {
      threatenedTricks.push('Doom-Shroom', 'Squash')
      const heavyZombiesCount = livingFriendlyMinions.filter((m) => m.currentAttack >= 4).length
      if (heavyZombiesCount >= 2) {
        canWipeBoard = true
        reasons.push(
          `Plant has ${unspentResource} Sun: Doom-Shroom threatens ${heavyZombiesCount} heavy zombies (>= 4 ATK)`
        )
      }
    }
    // Cherry Bomb (6 Sun) / Tactical Cuke (6 Sun)
    if (unspentResource >= 6) {
      threatenedTricks.push('Cherry Bomb', 'Tactical Cuke')
      if (livingFriendlyMinions.length >= 3) {
        canWipeBoard = true
        reasons.push(`Plant has ${unspentResource} Sun: Tactical Cuke or Cherry Bomb can wipe ground swarm`)
      }
    }
    // Plant Food (4 Sun): +1/+1 and Bonus Attack
    if (unspentResource >= 4 && livingEnemyMinions.length > 0) {
      threatenedTricks.push('Plant Food')
      const maxPlantAtk = Math.max(...livingEnemyMinions.map((m) => m.currentAttack))
      if (unblockedEnemyMinions.length > 0 || maxPlantAtk + 1 >= myHero.hp) {
        hasLethalCombatPotential = true
        reasons.push(`Plant has ${unspentResource} Sun: Plant Food bonus attack can deliver surprise lethal`)
      }
    }
    // Shamrocket (3 Sun): Destroys a zombie with 4+ Attack
    if (unspentResource >= 3) {
      threatenedTricks.push('Shamrocket')
    }
    // Berry Blast (2 Sun): 3 direct damage
    if (unspentResource >= 2) {
      threatenedTricks.push('Berry Blast')
      if (myHero.hp <= 3) {
        hasLethalCombatPotential = true
        reasons.push(`Plant has ${unspentResource} Sun: Berry Blast face burn can finish Hero`)
      }
    }
  } else {
    // AI is Plant: evaluates opponent Zombie tricks during upcoming ZOMBIE_TRICKS
    // Bad Moon Rising (7 Brains)
    if (unspentResource >= 7 && livingEnemyMinions.length >= 2) {
      threatenedTricks.push('Bad Moon Rising')
      canBuffSwarm = true
      canWipeBoard = true
      hasLethalCombatPotential = true
      reasons.push(
        `Zombie has ${unspentResource} Brains and ${livingEnemyMinions.length} minions: Bad Moon Rising can transform board into lethal bosses`
      )
    }
    // Locust Swarm (5 Brains)
    if (unspentResource >= 5) {
      threatenedTricks.push('Locust Swarm')
    }
    // Weed Spray (3 Brains): Destroys all plants with <= 2 Attack
    if (unspentResource >= 3) {
      threatenedTricks.push('Weed Spray', 'Rocket Science')
      const smallPlantsCount = livingFriendlyMinions.filter(
        (m) => m.currentAttack <= 2 && !isUntrickable(m)
      ).length
      if (smallPlantsCount >= 2) {
        canWipeBoard = true
        reasons.push(
          `Zombie has ${unspentResource} Brains: Weed Spray threatens ${smallPlantsCount} swarm plants (<= 2 ATK)`
        )
      }
    }
    // Going Viral (3 Brains): +1/+1 and Frenzy to all zombies
    if (unspentResource >= 3 && livingEnemyMinions.length >= 2) {
      threatenedTricks.push('Going Viral')
      canBuffSwarm = true
      reasons.push(
        `Zombie has ${unspentResource} Brains and ${livingEnemyMinions.length} zombies: Going Viral can grant team-wide Frenzy and stats`
      )
      const projectedDamage = livingEnemyMinions.reduce((acc, z) => acc + z.currentAttack + 1, 0)
      if (projectedDamage >= myHero.hp) {
        hasLethalCombatPotential = true
      }
    }
    // Lurch for Lunch (2 Brains): Bonus attack
    if (unspentResource >= 2 && livingEnemyMinions.length > 0) {
      threatenedTricks.push('Lurch for Lunch')
      const dangerousZombie = livingEnemyMinions.find((z) => z.currentAttack >= myHero.hp)
      if (dangerousZombie || unblockedEnemyMinions.length > 0) {
        hasLethalCombatPotential = true
        reasons.push(`Zombie has ${unspentResource} Brains: Lurch for Lunch bonus attack threatens lethal blow`)
      }
    }
    // Bungee Plumber (1 Brain): 2 damage
    if (unspentResource >= 1) {
      threatenedTricks.push('Bungee Plumber')
      if (myHero.hp <= 2) {
        hasLethalCombatPotential = true
        reasons.push(`Zombie has ${unspentResource} Brains: Bungee Plumber face snipe deals lethal damage`)
      }
    }
  }

  // Determine Danger Level & Recommended Action
  let dangerLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  let recommendedAction: 'HOLD_SWARM' | 'HOLD_HEAVY' | 'PREPARE_DEFENSE' | 'PROCEED' = 'PROCEED'

  if (hasLethalCombatPotential) {
    dangerLevel = 'critical'
    recommendedAction = 'PREPARE_DEFENSE'
  } else if (canWipeBoard) {
    dangerLevel = 'high'
    const hasHeavyZombies = livingFriendlyMinions.some((m) => m.currentAttack >= 4)
    recommendedAction = isZombie && hasHeavyZombies && unspentResource >= 5 ? 'HOLD_HEAVY' : 'HOLD_SWARM'
  } else if (canBuffSwarm || unspentResource >= 4) {
    dangerLevel = 'medium'
    recommendedAction = 'PREPARE_DEFENSE'
  }

  return {
    unspentResource,
    canWipeBoard,
    canBuffSwarm,
    hasLethalCombatPotential,
    threatenedTricks,
    dangerLevel,
    recommendedAction,
    reasons,
  }
}

/**
 * Determines whether the AI should hold back deploying additional swarm minions
 * to prevent overextending into an opponent board wipe or wipe trick.
 */
export function shouldHoldBackSwarm(
  state: GameState,
  side: Side,
  cardToPlay?: Card
): { hold: boolean; reason?: string } {
  const anticipation = anticipateOpponentTricks(state, side)
  const isZombie = side === 'zombies'

  const livingFriendlyMinions = state.lanes
    .map((l) => (isZombie ? l.zombieMinion : l.plantMinion))
    .filter((m): m is Minion => Boolean(m && m.currentHealth > 0))

  if (isZombie) {
    // When opponent Plant has 5+ Sun (Doom-Shroom / Cherry Bomb / Tactical Cuke)
    // Holding back swarm if board already has 2+ minions or card is vulnerable
    if (anticipation.unspentResource >= 5 && livingFriendlyMinions.length >= 2) {
      if (cardToPlay && cardToPlay.health <= 2) {
        return {
          hold: true,
          reason: `Holding back swarm minion ${cardToPlay.name}: Opponent has ${anticipation.unspentResource} Sun for potential board wipe (Doom-Shroom / Cherry Bomb)`,
        }
      }
      if (livingFriendlyMinions.length >= 3) {
        return {
          hold: true,
          reason: `Holding back additional swarm: Already commanding ${livingFriendlyMinions.length} zombies into ${anticipation.unspentResource} Plant Sun`,
        }
      }
    }
    // Against 4+ Sun, Plant Food or Lawnmower could punish overextending
    if (anticipation.unspentResource >= 4 && livingFriendlyMinions.length >= 3) {
      return {
        hold: true,
        reason: `Holding back swarm: Plant player holds ${anticipation.unspentResource} Sun for high-value removal or AOE`,
      }
    }
  } else {
    // When opponent Zombie has 3+ Brains (Weed Spray wipes <= 2 ATK plants)
    if (anticipation.unspentResource >= 3) {
      const smallPlants = livingFriendlyMinions.filter((m) => m.currentAttack <= 2 && !isUntrickable(m))
      if (smallPlants.length >= 2 && cardToPlay && cardToPlay.attack <= 2) {
        return {
          hold: true,
          reason: `Holding back small plant ${cardToPlay.name} (<= 2 ATK): Opponent has ${anticipation.unspentResource} unspent Brains for Weed Spray wipe`,
        }
      }
    }
    // Against 7+ Brains (Bad Moon Rising), plant AI should hold back fragile minions and prioritize blocking
    if (anticipation.unspentResource >= 7) {
      const enemyZombies = state.lanes.filter((l) => l.zombieMinion).length
      if (enemyZombies >= 2 && livingFriendlyMinions.length >= 3) {
        return {
          hold: true,
          reason: `Holding back swarm: Zombie has ${anticipation.unspentResource} Brains for Bad Moon Rising`,
        }
      }
    }
  }

  return { hold: false }
}

/**
 * Calculates whether the opponent currently threatens lethal through combat damage
 * combined with trick burst based on unspent resources.
 */
export function anticipateOpponentLethalTrick(
  state: GameState,
  side: Side
): { hasLethalThreat: boolean; projectedDamage: number; reason?: string } {
  const isZombie = side === 'zombies'
  const myHero = isZombie ? state.zombieHero : state.plantHero
  const enemyHero = isZombie ? state.plantHero : state.zombieHero
  const unspentResource = isZombie ? enemyHero.sun : enemyHero.brains

  let projectedDamage = 0
  const reasons: string[] = []

  state.lanes.forEach((lane, idx) => {
    const enemyMinion = isZombie ? lane.plantMinion : lane.zombieMinion
    const myMinion = isZombie ? lane.zombieMinion : lane.plantMinion
    if (!enemyMinion || enemyMinion.currentAttack <= 0) return

    if (!myMinion) {
      let faceDmg = enemyMinion.currentAttack
      if (enemyMinion.antiHero) faceDmg += enemyMinion.antiHero
      projectedDamage += faceDmg
      reasons.push(`Unblocked enemy in lane ${idx + 1} (${faceDmg} dmg)`)
    } else if (enemyMinion.strikethrough) {
      projectedDamage += enemyMinion.currentAttack
      reasons.push(`Strikethrough in lane ${idx + 1} (${enemyMinion.currentAttack} dmg)`)
    }
  })

  // Add potential trick damage based on unspent resource
  if (isZombie) {
    if (unspentResource >= 2) {
      projectedDamage += 3 // Berry blast
    }
    if (unspentResource >= 4 && state.lanes.some((l) => l.plantMinion && !l.zombieMinion)) {
      projectedDamage += 5 // Plant food bonus attack
    }
  } else {
    if (unspentResource >= 1) {
      projectedDamage += 2 // Bungee plumber
    }
    if (unspentResource >= 2) {
      const unblockedZombie = state.lanes.find((l) => l.zombieMinion && !l.plantMinion)
      if (unblockedZombie) {
        projectedDamage += unblockedZombie.zombieMinion!.currentAttack // Lurch bonus attack
      }
    }
    if (unspentResource >= 3) {
      const livingZombies = state.lanes.filter((l) => l.zombieMinion).length
      projectedDamage += livingZombies // Going viral buff
    }
  }

  const hasLethalThreat = projectedDamage >= myHero.hp
  return {
    hasLethalThreat,
    projectedDamage,
    reason: hasLethalThreat
      ? `Opponent threatens lethal combat + trick burst (${projectedDamage} >= ${myHero.hp} HP): ${reasons.join(', ')}`
      : undefined,
  }
}

// =========================================================================
// 3. SUPER-BLOCK MANAGEMENT AI (PRIMING & CHIP DAMAGE ABSORPTION)
// =========================================================================

export interface SuperBlockPrimingDecision {
  laneIndex: number
  acceptChip: boolean
  blockMeter: number
  incomingDamage: number
  isGuaranteedTrigger: boolean
  isProbableTrigger: boolean
  heavierLaterThreatLane?: number
  heavierLaterThreatDamage?: number
  reason: string
}

/**
 * Super-Block Priming Decision Engine:
 * When Hero block meter is 6/8 or 7/8, intentionally accepts small chip damage (<= 2-3 HP)
 * in an earlier lane to pop the Super-Block and acquire a Superpower before a heavier attack
 * hits in a subsequent lane.
 */
export function shouldAcceptChipDamageForBlock(
  state: GameState,
  side: Side,
  laneIndex: number
): SuperBlockPrimingDecision {
  const isZombie = side === 'zombies'
  const myHero = isZombie ? state.zombieHero : state.plantHero
  const targetLane = state.lanes[laneIndex]

  const defaultNo = (reason: string): SuperBlockPrimingDecision => ({
    laneIndex,
    acceptChip: false,
    blockMeter: myHero.blockMeter,
    incomingDamage: 0,
    isGuaranteedTrigger: false,
    isProbableTrigger: false,
    reason,
  })

  // Hero can only trigger 3 superblocks per match
  if (myHero.blockCount >= 3) {
    return defaultNo('Hero has already triggered maximum 3 Super-Blocks')
  }

  // Block meter must be primed at 6/8 or 7/8
  if (myHero.blockMeter < 6 || myHero.blockMeter >= 8) {
    return defaultNo(`Block meter (${myHero.blockMeter}/8) is not in primed range (6/8 or 7/8)`)
  }

  // Already shielded?
  if (myHero.isShieldActive) {
    return defaultNo('Hero Super-Block shield is already active')
  }

  const enemyMinion = isZombie ? targetLane?.plantMinion : targetLane?.zombieMinion
  if (!enemyMinion) {
    return defaultNo('No enemy minion in targeted lane')
  }

  // Bullseye minions never charge block meter!
  const hasBullseye = isBullseyeMinion(enemyMinion)
  if (hasBullseye) {
    return defaultNo(`Attacking minion ${enemyMinion.name} has Bullseye; cannot charge block meter`)
  }

  const incomingDamage = enemyMinion.currentAttack
  if (incomingDamage <= 0) {
    return defaultNo('Attacking minion has 0 attack')
  }

  // Chip damage threshold: 1-2 damage (or 3 if hero HP >= 14)
  const isChipDamage = incomingDamage <= (myHero.hp >= 14 ? 3 : 2)
  if (!isChipDamage) {
    return defaultNo(`Incoming damage (${incomingDamage}) is too heavy to safely absorb as chip damage`)
  }

  // Absorbing chip damage must not drop Hero to dangerously low HP (<= 3)
  if (myHero.hp - incomingDamage <= 3) {
    return defaultNo(`Hero HP (${myHero.hp}) too fragile to accept chip damage`)
  }

  // Check if there is a heavier threat in a later combat lane (lanes resolve 0 -> 4)
  let heavierThreatLane: number | undefined
  let heavierThreatDamage: number | undefined

  for (let laterIdx = laneIndex + 1; laterIdx < state.lanes.length; laterIdx++) {
    const laterLane = state.lanes[laterIdx]
    const laterEnemy = isZombie ? laterLane.plantMinion : laterLane.zombieMinion
    const laterFriendly = isZombie ? laterLane.zombieMinion : laterLane.plantMinion

    if (laterEnemy && laterEnemy.currentAttack >= 3) {
      // If unblocked or has strikethrough, it threatens big face damage!
      if (!laterFriendly || isStrikethroughMinion(laterEnemy)) {
        heavierThreatLane = laterIdx
        heavierThreatDamage = laterEnemy.currentAttack
        break
      }
    }
  }

  const isGuaranteed = myHero.blockMeter === 7 // Rolling 1, 2, or 3 will trigger 8/8!
  const isProbable = myHero.blockMeter === 6 // Rolling 2 or 3 (66.7%) triggers 8/8!

  if (heavierThreatLane !== undefined) {
    const triggerDesc = isGuaranteed
      ? 'Guaranteed Super-Block (100% on 7/8)'
      : 'Primed Super-Block (66.7% on 6/8)'

    return {
      laneIndex,
      acceptChip: true,
      blockMeter: myHero.blockMeter,
      incomingDamage,
      isGuaranteedTrigger: isGuaranteed,
      isProbableTrigger: isProbable,
      heavierLaterThreatLane: heavierThreatLane,
      heavierLaterThreatDamage: heavierThreatDamage,
      reason: `${triggerDesc}: Intentionally accepting ${incomingDamage} chip damage from ${enemyMinion.name} in lane ${laneIndex + 1} to trigger Super-Block shield & superpower before heavier threat (${heavierThreatDamage} ATK in lane ${heavierThreatLane + 1})`,
    }
  }

  // Even without immediate later threat in this combat, if meter is 7/8 and chip is 1, popping the block for free superpower is high EV
  if (isGuaranteed && incomingDamage === 1 && myHero.hp >= 10) {
    return {
      laneIndex,
      acceptChip: true,
      blockMeter: myHero.blockMeter,
      incomingDamage,
      isGuaranteedTrigger: true,
      isProbableTrigger: true,
      reason: `Guaranteed Super-Block (7/8): Accepting 1 chip damage from ${enemyMinion.name} in lane ${laneIndex + 1} to pop shield and draw free superpower`,
    }
  }

  return defaultNo('No heavier subsequent threat justifies absorbing chip damage')
}

/**
 * Evaluates Super-Block priming decisions across all 5 lanes.
 */
export function evaluateSuperBlockPriming(
  state: GameState,
  side: Side
): SuperBlockPrimingDecision[] {
  const decisions: SuperBlockPrimingDecision[] = []
  for (let i = 0; i < state.lanes.length; i++) {
    decisions.push(shouldAcceptChipDamageForBlock(state, side, i))
  }
  return decisions
}
