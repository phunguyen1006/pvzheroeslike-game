import type { GameState, Side, Card, LaneState } from './types'
import { canPlayCardToLane } from './reducer'
import { isUntrickable } from './abilities'

export interface AIDecision {
  action: 'PLAY_MINION' | 'PLAY_TRICK' | 'PLAY_SUPERPOWER' | 'SAVE_SUPERPOWER' | 'PASS'
  card?: Card
  superpowerId?: string
  laneIndex?: number
  targetHero?: boolean
  reason?: string
}

export type AIDifficulty = 'easy' | 'normal' | 'hard' | 'expert'

export type AIArchetype = 'aggro' | 'control' | 'tempo'

export interface AIDecisionOptions {
  difficulty?: AIDifficulty
  archetype?: AIArchetype
  bossMode?: boolean
}

export interface BoardEvaluation {
  friendlyTotalAttack: number
  enemyTotalAttack: number
  friendlyTotalHealth: number
  enemyTotalHealth: number
  friendlyFaceThreat: number
  enemyFaceThreat: number
  friendlyCardCount: number
  enemyCardCount: number
  cardAdvantage: number
  friendlyHeroHp: number
  enemyHeroHp: number
  friendlyBlockMeter: number
  enemyBlockMeter: number
  hasLethal: boolean
  threatensLethal: boolean
  environmentAdvantage: number
  score: number
}

export interface MulliganDecision {
  keepIndices: number[]
  swapIndices: number[]
  reason: string
}

export interface SuperpowerDecision {
  action: 'PLAY_SUPERPOWER' | 'SAVE_SUPERPOWER'
  superpowerId: string
  targetLaneIndex?: number
  targetHero?: boolean
  reason: string
}

/**
 * Checks whether a card is a minion/creature card regardless of data schema origin.
 */
export function isMinionCard(c: Card): boolean {
  return c.type === 'minion' || (c.type as string) === 'zombie' || (c.type as string) === 'plant'
}

/**
 * Checks whether a card possesses the Amphibious trait.
 */
export function hasAmphibiousTrait(c: Card): boolean {
  return Boolean(
    c.amphibious ||
    c.laneRequirement === 'water' ||
    c.traits?.some((t: any) => typeof t === 'string' && t.toLowerCase().includes('amphibious'))
  )
}

/**
 * Checks whether a card possesses a specific trait case-insensitively.
 */
export function hasCardTrait(c: Card, traitName: string): boolean {
  const tLower = traitName.toLowerCase()
  return Boolean(
    (c as any)[traitName] ||
    (c as any)[tLower] ||
    c.traits?.some((t: any) => typeof t === 'string' && t.toLowerCase().includes(tLower))
  )
}

/**
 * Maps Hero IDs to their native archetype playbook.
 */
export function getHeroDefaultArchetype(heroId?: string): AIArchetype {
  if (!heroId) return 'tempo'
  const idLower = heroId.toLowerCase()

  // Aggro Heroes
  if (
    idLower.includes('super_brainz') ||
    idLower.includes('impfinity') ||
    idLower.includes('electric_boogaloo') ||
    idLower.includes('solar_flare') ||
    idLower.includes('nightcap') ||
    idLower.includes('captain_combustible')
  ) {
    return 'aggro'
  }

  // Control Heroes
  if (
    idLower.includes('rustbolt') ||
    idLower.includes('brainstorm') ||
    idLower.includes('immorticia') ||
    idLower.includes('rose') ||
    idLower.includes('wall_knight') ||
    idLower.includes('citron')
  ) {
    return 'control'
  }

  // Tempo Heroes (The Smash, Z-Mech, Neptuna, Grass Knuckles, Chompzilla, Green Shadow, etc.)
  return 'tempo'
}

/**
 * Evaluates the danger of an enemy minion on the board.
 * Higher score = higher priority to block or eliminate.
 */
export function evaluateMinionThreat(lane: LaneState, enemySide: Side): number {
  const minion = enemySide === 'plants' ? lane.plantMinion : lane.zombieMinion
  if (!minion) return 0

  let threat = minion.currentAttack * 2 + minion.currentHealth
  if (minion.traits?.some((t: any) => t === 'doubleStrike' || t === 'double-strike')) threat += 5
  if (minion.traits?.includes('strikethrough') || minion.strikethrough) threat += 4
  if (minion.traits?.includes('frenzy') || minion.frenzy) threat += 4
  if (minion.traits?.includes('deadly') || minion.deadly) threat += 4
  if (minion.currentAttack >= 4) threat += 3
  if (minion.antiHero && !lane.zombieMinion && !lane.plantMinion) threat += minion.antiHero * 2

  return threat
}

/**
 * Checks whether an environment is considered dangerous and high-priority to override.
 */
export function isDangerousEnvironment(envId: string, side: Side): boolean {
  const id = envId.toLowerCase()
  if (side === 'zombies') {
    // Dangerous Plant environments that Zombies want to override
    return (
      id.includes('spikeweed') ||
      id.includes('bog_of') ||
      id.includes('grapes') ||
      id.includes('solar_winds') ||
      id.includes('red_plant_it')
    )
  } else {
    // Dangerous Zombie environments that Plants want to override
    return (
      id.includes('laser_base') ||
      id.includes('area_22') ||
      id.includes('total_eclipse') ||
      id.includes('medulla_nebula') ||
      id.includes('moon_base')
    )
  }
}

/**
 * Evaluates full board state to produce a strategic score and tactical insights.
 */
export function evaluateBoardState(
  state: GameState,
  side: Side,
  archetype: AIArchetype = 'tempo'
): BoardEvaluation {
  const isZombie = side === 'zombies'
  const friendlyHero = isZombie ? state.zombieHero : state.plantHero
  const enemyHero = isZombie ? state.plantHero : state.zombieHero
  const friendlyHand = isZombie ? state.zombieHand : state.plantHand
  const enemyHand = isZombie ? state.plantHand : state.zombieHand

  let friendlyTotalAttack = 0
  let enemyTotalAttack = 0
  let friendlyTotalHealth = 0
  let enemyTotalHealth = 0
  let friendlyFaceThreat = 0
  let enemyFaceThreat = 0
  let environmentAdvantage = 0

  state.lanes.forEach((lane) => {
    const fMinion = isZombie ? lane.zombieMinion : lane.plantMinion
    const eMinion = isZombie ? lane.plantMinion : lane.zombieMinion
    const teamUpMinion = !isZombie ? lane.plantTeamUpMinion : null

    // Friendly stats
    if (fMinion) {
      friendlyTotalAttack += fMinion.currentAttack
      friendlyTotalHealth += fMinion.currentHealth
      if (!eMinion) {
        let faceDmg = fMinion.currentAttack
        if (fMinion.antiHero) faceDmg += fMinion.antiHero
        friendlyFaceThreat += faceDmg
      } else if (fMinion.strikethrough) {
        friendlyFaceThreat += fMinion.currentAttack
      }
    }
    if (teamUpMinion && !isZombie) {
      friendlyTotalAttack += teamUpMinion.currentAttack
      friendlyTotalHealth += teamUpMinion.currentHealth
      if (!eMinion) friendlyFaceThreat += teamUpMinion.currentAttack
      else if (teamUpMinion.strikethrough) friendlyFaceThreat += teamUpMinion.currentAttack
    }

    // Enemy stats
    if (eMinion) {
      enemyTotalAttack += eMinion.currentAttack
      enemyTotalHealth += eMinion.currentHealth
      if (!fMinion) {
        let eFaceDmg = eMinion.currentAttack
        if (eMinion.antiHero) eFaceDmg += eMinion.antiHero
        enemyFaceThreat += eFaceDmg
      } else if (eMinion.strikethrough) {
        enemyFaceThreat += eMinion.currentAttack
      }
    }

    // Environment evaluation
    if (lane.environment) {
      if (lane.environment.side === side) {
        environmentAdvantage += 2
      } else {
        environmentAdvantage -= 2
        if (isDangerousEnvironment(lane.environment.id, side)) {
          environmentAdvantage -= 2
        }
      }
    }
  })

  const friendlyCardCount = friendlyHand.length
  const enemyCardCount = enemyHand.length
  const cardAdvantage = friendlyCardCount - enemyCardCount

  // Check lethal conditions
  const hasLethal = friendlyFaceThreat >= enemyHero.hp
  const threatensLethal = enemyFaceThreat >= friendlyHero.hp

  // Composite Score calculation based on Archetype
  let score = 0
  const hpDiff = friendlyHero.hp - enemyHero.hp

  switch (archetype) {
    case 'aggro':
      score =
        friendlyFaceThreat * 4.5 +
        friendlyTotalAttack * 2.0 -
        enemyHero.hp * 3.0 +
        (hasLethal ? 500 : 0) -
        (threatensLethal ? 400 : 0) +
        friendlyHero.hp * 0.5 -
        enemyFaceThreat * 1.5 +
        cardAdvantage * 1.0 +
        environmentAdvantage * 1.0
      break

    case 'control':
      score =
        friendlyHero.hp * 2.5 -
        enemyTotalAttack * 3.5 -
        enemyFaceThreat * 3.5 +
        cardAdvantage * 3.5 +
        friendlyTotalHealth * 1.5 -
        enemyTotalHealth * 1.5 +
        friendlyTotalAttack * 1.2 +
        (hasLethal ? 500 : 0) -
        (threatensLethal ? 600 : 0) +
        environmentAdvantage * 2.0
      break

    case 'tempo':
    default:
      score =
        (friendlyTotalAttack - enemyTotalAttack) * 2.5 +
        (friendlyTotalHealth - enemyTotalHealth) * 2.0 +
        friendlyFaceThreat * 2.5 -
        enemyFaceThreat * 2.5 +
        hpDiff * 1.5 +
        cardAdvantage * 2.0 +
        environmentAdvantage * 2.0 +
        (hasLethal ? 500 : 0) -
        (threatensLethal ? 500 : 0)
      break
  }

  return {
    friendlyTotalAttack,
    enemyTotalAttack,
    friendlyTotalHealth,
    enemyTotalHealth,
    friendlyFaceThreat,
    enemyFaceThreat,
    friendlyCardCount,
    enemyCardCount,
    cardAdvantage,
    friendlyHeroHp: friendlyHero.hp,
    enemyHeroHp: enemyHero.hp,
    friendlyBlockMeter: friendlyHero.blockMeter,
    enemyBlockMeter: enemyHero.blockMeter,
    hasLethal,
    threatensLethal,
    environmentAdvantage,
    score: Math.round(score * 10) / 10,
  }
}

/**
 * Evaluates the starting hand during MULLIGAN phase.
 * Automatically keeps low-curve cards (1-3 Cost) and swaps heavy cards (5+ Cost).
 * Handles special combo exceptions (Ramp, Valkyrie, Trickster synergies).
 */
export function getAIMulliganDecision(
  hand: Card[],
  archetype: AIArchetype = 'tempo',
  _heroId?: string
): MulliganDecision {
  const keepIndices: number[] = []
  const swapIndices: number[] = []

  // Check for combo/ramp exceptions
  const hasRamp = hand.some(
    (c) =>
      c.id === 'plant_sunflower' ||
      c.id === 'plant_twin_sunflower' ||
      c.id === 'plant_solar_winds' ||
      c.id === 'zombie_medulla_nebula'
  )

  const cheapTricksCount = hand.filter(
    (c) => (c.type === 'trick' || c.type === 'superpower') && c.cost <= 2
  ).length

  hand.forEach((card, idx) => {
    // 0-cost Superpowers are never swapped
    if (card.type === 'superpower' || card.cost === 0) {
      keepIndices.push(idx)
      return
    }

    // Special Combo Exception 1: Valkyrie wants to be in hand from turn 1 to accumulate death buffs
    if (card.id === 'zombie_valkyrie') {
      keepIndices.push(idx)
      return
    }

    // Special Combo Exception 2: Trickster kept if holding multiple cheap tricks to discount it
    if (card.id === 'zombie_trickster' && cheapTricksCount >= 2) {
      keepIndices.push(idx)
      return
    }

    // Special Combo Exception 3: Ramp allows keeping one 4-5 cost bomb
    if (hasRamp && (card.cost === 4 || card.cost === 5) && !keepIndices.some((i) => hand[i].cost >= 4)) {
      keepIndices.push(idx)
      return
    }

    // Standard Curve Rules
    if (card.cost <= 3) {
      // Curve 1-3: Keep
      keepIndices.push(idx)
    } else if (card.cost >= 5) {
      // Curve 5+: Swap
      swapIndices.push(idx)
    } else {
      // Cost 4 cards:
      // Aggro always swaps 4-cost cards to ensure 1-2-3 turn aggression
      // Control keeps high-value removal like Rocket Science (cost 3) or Shamrocket/Squash
      // Tempo keeps at most one 4-cost card if a 1 or 2-cost play is already secured
      if (archetype === 'aggro') {
        swapIndices.push(idx)
      } else {
        const hasEarlyCurve = keepIndices.some((i) => hand[i].cost <= 2)
        const alreadyKept4Cost = keepIndices.some((i) => hand[i].cost === 4)
        if (hasEarlyCurve && !alreadyKept4Cost) {
          keepIndices.push(idx)
        } else {
          swapIndices.push(idx)
        }
      }
    }
  })

  return {
    keepIndices,
    swapIndices,
    reason: `Mulligan analysis (${archetype}): Kept ${keepIndices.length} curve/combo cards, swapped ${swapIndices.length} heavy cards`,
  }
}

/**
 * Superpower Decision Matrix:
 * Decides whether to play a Superpower immediately on Super-Block trigger, or save it to hand for later.
 */
export function getAISuperpowerDecision(
  state: GameState,
  side: Side,
  superpower: Card,
  archetype: AIArchetype = 'tempo'
): SuperpowerDecision {
  const isZombie = side === 'zombies'
  const lanes = state.lanes
  const spId = superpower.id.toLowerCase()

  // 1. Cut Down to Size (Destroy a Plant with 5 Attack or more)
  if (spId.includes('cut_down_to_size')) {
    const bigPlantLaneIdx = lanes.findIndex(
      (l) => l.plantMinion && l.plantMinion.currentAttack >= 5 && !isUntrickable(l.plantMinion)
    )
    if (bigPlantLaneIdx !== -1) {
      const targetPlant = lanes[bigPlantLaneIdx].plantMinion!
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        targetLaneIndex: bigPlantLaneIdx,
        reason: `Cut Down to Size destroys high threat plant ${targetPlant.name} (${targetPlant.currentAttack} ATK >= 5)`,
      }
    }
    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Cut Down to Size until Plant Hero summons a minion with >= 5 Attack',
    }
  }

  // 2. Slammin' Smash (Destroy a Plant with 4 Attack or less)
  if (spId.includes('slammin')) {
    // Find highest threat plant minion with <= 4 Attack
    let bestTargetIdx = -1
    let highestThreat = -1

    lanes.forEach((l, idx) => {
      if (l.plantMinion && l.plantMinion.currentAttack <= 4 && !isUntrickable(l.plantMinion)) {
        const threat = evaluateMinionThreat(l, 'plants')
        if (threat > highestThreat) {
          highestThreat = threat
          bestTargetIdx = idx
        }
      }
    })

    if (bestTargetIdx !== -1 && highestThreat >= 3) {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        targetLaneIndex: bestTargetIdx,
        reason: `Slammin' Smash destroys plant in lane ${bestTargetIdx + 1} with threat rating ${highestThreat}`,
      }
    }
    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Slammin\' Smash for higher value plant targets',
    }
  }

  // 3. Sunburn (2 damage + permanent +1 Sun ramp)
  if (spId.includes('sunburn')) {
    // Ramp is always valuable immediately!
    const killableZombieIdx = lanes.findIndex(
      (l) => l.zombieMinion && l.zombieMinion.currentHealth <= 2 && !isUntrickable(l.zombieMinion)
    )
    if (killableZombieIdx !== -1) {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        targetLaneIndex: killableZombieIdx,
        reason: `Sunburn eliminates zombie in lane ${killableZombieIdx + 1} and grants permanent +1 Sun ramp`,
      }
    }
    return {
      action: 'PLAY_SUPERPOWER',
      superpowerId: superpower.id,
      targetHero: true,
      reason: 'Sunburn deals 2 damage to Zombie Hero and secures permanent +1 Sun ramp immediately',
    }
  }

  // 4. Precision Blast (5 damage in middle lane / Lane index 2)
  if (spId.includes('precision_blast')) {
    const middleLane = lanes[2]
    if (middleLane.zombieMinion || archetype === 'aggro') {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        targetLaneIndex: 2,
        reason: 'Precision Blast strikes middle lane with 5 burst damage',
      }
    }
    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Precision Blast for optimal middle lane timing',
    }
  }

  // 5. Eureka (Conjure 3 cards)
  if (spId.includes('eureka')) {
    const hand = isZombie ? state.zombieHand : state.plantHand
    if (hand.length <= 7) {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        reason: 'Eureka conjures 3 random cards for massive card advantage',
      }
    }
    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Eureka to prevent hand overflow (hand near maximum)',
    }
  }

  // 6. Carried Away (Move a Zombie and Bonus Attack)
  if (spId.includes('carried_away')) {
    const zombieLanes = lanes
      .map((l, idx) => ({ lane: l, idx }))
      .filter(({ lane }) => lane.zombieMinion && lane.zombieMinion.currentAttack >= 2)
      .sort((a, b) => b.lane.zombieMinion!.currentAttack - a.lane.zombieMinion!.currentAttack)

    const openLanes = lanes.map((l, idx) => ({ lane: l, idx })).filter(({ lane }) => !lane.plantMinion)

    if (zombieLanes.length > 0) {
      const bestZombie = zombieLanes[0]
      const targetOpen = openLanes.find(({ idx }) => idx !== bestZombie.idx)
      const targetIdx = targetOpen ? targetOpen.idx : bestZombie.idx
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        targetLaneIndex: targetIdx,
        reason: `Carried Away moves ${bestZombie.lane.zombieMinion!.name} to lane ${targetIdx + 1} for bonus attack`,
      }
    }
    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Carried Away until a strong zombie is on board',
    }
  }

  // 7. Brute Strength (+3 Attack to Zombie)
  if (spId.includes('brute_strength')) {
    const activeZombieIdx = lanes.findIndex((l) => l.zombieMinion && !l.zombieMinion.isFrozen)
    if (activeZombieIdx !== -1) {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        targetLaneIndex: activeZombieIdx,
        reason: `Brute Strength buffs zombie in lane ${activeZombieIdx + 1} with +3 Attack`,
      }
    }
    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Brute Strength until a zombie is deployed',
    }
  }

  // 8. Triple Threat (Summon two 2/1 Imps with Amphibious)
  if (spId.includes('triple_threat')) {
    const openLanesCount = lanes.filter((l) => !l.zombieMinion).length
    if (openLanesCount >= 1) {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        reason: 'Triple Threat floods lanes with two 2/1 Amphibious Imp Clones',
      }
    }
    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Triple Threat until lanes open up',
    }
  }

  // 9. Shrink Ray (-3 Attack to a Plant and draw a card)
  if (spId.includes('shrink_ray')) {
    const highAtkPlantIdx = lanes.findIndex(
      (l) => l.plantMinion && l.plantMinion.currentAttack >= 2 && !isUntrickable(l.plantMinion)
    )
    if (highAtkPlantIdx !== -1) {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        targetLaneIndex: highAtkPlantIdx,
        reason: `Shrink Ray suppresses plant in lane ${highAtkPlantIdx + 1} with -3 Attack and draws a card`,
      }
    }
    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Shrink Ray for dangerous plant attackers',
    }
  }

  // 10. Default heuristic: If immediate board advantage is available, play; otherwise save
  const hasEnemyMinions = lanes.some((l) => (isZombie ? l.plantMinion : l.zombieMinion))
  if (hasEnemyMinions || archetype === 'aggro') {
    return {
      action: 'PLAY_SUPERPOWER',
      superpowerId: superpower.id,
      reason: `Play ${superpower.name} for immediate tactical value`,
    }
  }

  return {
    action: 'SAVE_SUPERPOWER',
    superpowerId: superpower.id,
    reason: `Save ${superpower.name} into hand for optimal phase timing`,
  }
}

/**
 * Calculates whether the current side has a direct lethal line of play.
 */
function checkLethalPossibility(
  state: GameState,
  side: Side,
  hand: Card[],
  resource: number
): AIDecision | null {
  const enemyHero = side === 'zombies' ? state.plantHero : state.zombieHero

  // 1. Check direct damage tricks & buff lines to face
  if (side === 'zombies') {
    // Bungee Plumber (2 dmg, cost 1)
    const bungee = hand.find((c) => c.id === 'zombie_bungee_plumber' && c.cost <= resource)
    if (bungee && enemyHero.hp <= 2) {
      return { action: 'PLAY_TRICK', card: bungee, targetHero: true, reason: 'Lethal Bungee Plumber to face' }
    }

    // Final Mission (4 dmg, cost 2)
    const finalMission = hand.find((c) => c.id === 'zombie_final_mission' && c.cost <= resource)
    if (finalMission && enemyHero.hp <= 4) {
      return { action: 'PLAY_TRICK', card: finalMission, targetHero: true, reason: 'Lethal Final Mission to face' }
    }

    // 2. Lethal Buffs / Bonus Attacks on Unblocked Zombie Attackers
    for (let idx = 0; idx < state.lanes.length; idx++) {
      const lane = state.lanes[idx]
      if (lane.zombieMinion && !lane.plantMinion && !lane.zombieMinion.isFrozen) {
        const currentAtk = lane.zombieMinion.currentAttack

        // Lurch for Lunch (bonus attack immediately for currentAtk damage)
        const lurch = hand.find((c) => c.id === 'zombie_lurch_for_lunch' && c.cost <= resource)
        if (lurch && currentAtk >= enemyHero.hp) {
          return {
            action: 'PLAY_TRICK',
            card: lurch,
            laneIndex: idx,
            reason: `Lethal Lurch for Lunch bonus attack to face from lane ${idx + 1}`,
          }
        }

        // Brute Strength (+3 Attack to Zombie)
        const brute = hand.find(
          (c) => (c.id === 'zombie_brute_strength' || c.id === 'sp_brute_strength') && c.cost <= resource
        )
        if (brute && currentAtk + 3 >= enemyHero.hp) {
          return {
            action: 'PLAY_TRICK',
            card: brute,
            laneIndex: idx,
            reason: `Lethal Brute Strength on unblocked zombie in lane ${idx + 1} for face damage`,
          }
        }

        // Area 22 (+2 Attack & Frenzy)
        const area22 = hand.find((c) => c.id === 'zombie_area_22' && c.cost <= resource)
        if (area22 && currentAtk + 2 >= enemyHero.hp) {
          return {
            action: 'PLAY_TRICK',
            card: area22,
            laneIndex: idx,
            reason: `Lethal Area 22 on unblocked zombie in lane ${idx + 1} for face damage`,
          }
        }
      }

      // Laser Base Alpha: Strikethrough on high-attack Zombie pierces blocker directly to face!
      if (lane.zombieMinion && lane.plantMinion && !lane.zombieMinion.isFrozen && !lane.zombieMinion.strikethrough) {
        const laserBase = hand.find((c) => c.id === 'zombie_laser_base_alpha' && c.cost <= resource)
        if (laserBase && lane.zombieMinion.currentAttack >= enemyHero.hp) {
          return {
            action: 'PLAY_TRICK',
            card: laserBase,
            laneIndex: idx,
            reason: `Lethal Laser Base Alpha grants Strikethrough to pierce through blocker for face lethal`,
          }
        }
      }
    }

    // Going Viral: all zombies get +1 attack
    const viral = hand.find((c) => c.id === 'zombie_going_viral' && c.cost <= resource)
    if (viral) {
      let totalUnblockedAtk = 0
      state.lanes.forEach((l) => {
        if (l.zombieMinion && !l.plantMinion && !l.zombieMinion.isFrozen) {
          totalUnblockedAtk += l.zombieMinion.currentAttack + 1
        }
      })
      if (totalUnblockedAtk >= enemyHero.hp && totalUnblockedAtk > 0) {
        return {
          action: 'PLAY_TRICK',
          card: viral,
          reason: 'Lethal Going Viral push across open lanes',
        }
      }
    }
  } else {
    // Plant side lethal check
    // Berry Blast (3 dmg, cost 2)
    const berryBlast = hand.find((c) => c.id === 'plant_berry_blast' && c.cost <= resource)
    if (berryBlast && enemyHero.hp <= 3) {
      return { action: 'PLAY_TRICK', card: berryBlast, targetHero: true, reason: 'Lethal Berry Blast to face' }
    }
  }

  return null
}

/**
 * Main Heuristic AI Decision Engine for PvZ Heroes.
 * Evaluates tactical options and returns the single next best move.
 * Supports Difficulty and 3 Distinct Boss Archetypes (Aggro, Control, Tempo).
 */
export function getAIDecision(
  state: GameState,
  side: Side,
  difficultyOrOptions: AIDifficulty | AIDecisionOptions = 'normal'
): AIDecision {
  const difficulty: AIDifficulty =
    typeof difficultyOrOptions === 'string'
      ? difficultyOrOptions
      : (difficultyOrOptions.difficulty ?? 'normal')

  const isZombie = side === 'zombies'
  const myHero = isZombie ? state.zombieHero : state.plantHero

  // When archetype is explicitly provided, use it.
  // In bossMode without explicit archetype, infer from hero.
  // Otherwise, default to 'tempo' (balanced tactical baseline) for backwards compatibility with existing suites.
  const archetype: AIArchetype =
    typeof difficultyOrOptions === 'object' && difficultyOrOptions.archetype
      ? difficultyOrOptions.archetype
      : (typeof difficultyOrOptions === 'object' && difficultyOrOptions.bossMode
          ? getHeroDefaultArchetype(myHero.id)
          : 'tempo')

  const hand = isZombie ? state.zombieHand : state.plantHand
  const resource = isZombie ? myHero.brains : myHero.sun

  // Handle pending Super-Block trigger if active
  if (state.pendingSuperBlock && state.pendingSuperBlock.side === side) {
    const spDecision = getAISuperpowerDecision(state, side, state.pendingSuperBlock.superpower, archetype)
    return spDecision
  }

  // Filter playable cards within current energy budget
  const playableCards = hand.filter((c) => c.cost <= resource)
  if (playableCards.length === 0) {
    return { action: 'PASS', reason: 'No playable cards or out of resources' }
  }

  // ========================================================
  // EASY DIFFICULTY: Relaxed, partially random behavior
  // ========================================================
  if (difficulty === 'easy') {
    if (Math.random() < 0.25) {
      return { action: 'PASS', reason: 'Easy AI random pass' }
    }

    const randomCard = playableCards[Math.floor(Math.random() * playableCards.length)]
    if (isMinionCard(randomCard)) {
      const openLanes = state.lanes
        .map((lane, idx) => ({ lane, idx }))
        .filter(({ lane }) => canPlayCardToLane(randomCard, lane, side).allowed)

      if (openLanes.length > 0) {
        const target = openLanes[Math.floor(Math.random() * openLanes.length)]
        return { action: 'PLAY_MINION', card: randomCard, laneIndex: target.idx }
      }
    } else if (randomCard.type === 'trick' || randomCard.type === 'environment') {
      const targetLane = Math.floor(Math.random() * state.lanes.length)
      return { action: 'PLAY_TRICK', card: randomCard, laneIndex: targetLane }
    }

    return { action: 'PASS' }
  }

  // ========================================================
  // 1. ZOMBIE AI: MINION PHASE (ZOMBIE_PLAY)
  // ========================================================
  if (isZombie && state.phase === 'ZOMBIE_PLAY') {
    const playableMinions = playableCards.filter(isMinionCard)
    if (playableMinions.length === 0) {
      const hasHighValueTricks = hand.some(
        (c) =>
          (c.type === 'trick' || c.type === 'superpower' || c.type === 'environment') &&
          c.cost <= resource
      )
      return {
        action: 'PASS',
        reason: hasHighValueTricks
          ? 'Preserving brains for high-value Tricks in ZOMBIE_TRICKS phase'
          : 'No playable minions during ZOMBIE_PLAY',
      }
    }

    // Check if we should hold back some Brains for a strong Trick in hand
    const highValueTricks = hand.filter(
      (c) =>
        (c.type === 'trick' || c.type === 'superpower' || c.type === 'environment') &&
        (c.id === 'zombie_locust_swarm' ||
          c.id === 'zombie_rocket_science' ||
          c.id === 'zombie_area_22' ||
          c.id === 'zombie_bad_moon_rising' ||
          c.id === 'zombie_bungee_plumber')
    )

    // Control archetype is significantly more disciplined about preserving brains
    const shouldPreserveBrains =
      (difficulty === 'expert' || difficulty === 'normal') &&
      highValueTricks.length > 0 &&
      (archetype === 'control' ? resource <= 8 : resource <= 6) &&
      state.lanes.some(
        (l) =>
          l.plantMinion &&
          (l.plantMinion.currentAttack >= (archetype === 'control' ? 2 : 3) ||
            l.plantMinion.currentHealth >= 4)
      )

    if (shouldPreserveBrains && (archetype !== 'aggro' || state.lanes.some(l => l.plantMinion && l.plantMinion.currentAttack >= 4))) {
      const targetTrickCost = Math.min(...highValueTricks.map((t) => t.cost))
      const affordableMinions = playableMinions.filter((m) => m.cost <= resource - targetTrickCost)
      if (affordableMinions.length > 0) {
        const cheapMinion = affordableMinions.sort((a, b) => b.health - a.health)[0]
        const openLane = state.lanes.findIndex(
          (l) => !l.zombieMinion && canPlayCardToLane(cheapMinion, l, 'zombies').allowed
        )
        if (openLane !== -1) {
          return {
            action: 'PLAY_MINION',
            card: cheapMinion,
            laneIndex: openLane,
            reason: 'Preserving brains for high-value Tricks',
          }
        }
      } else {
        return {
          action: 'PASS',
          reason: 'Preserving all brains for high-value Tricks in ZOMBIE_TRICKS phase',
        }
      }
    }

    // A. Priority: Amphibious on Water Lane (Lane index 4)
    const amphMinion = playableMinions.find(hasAmphibiousTrait)
    const waterLane = state.lanes[4]
    if (amphMinion && !waterLane.zombieMinion) {
      return {
        action: 'PLAY_MINION',
        card: amphMinion,
        laneIndex: 4,
        reason: 'Deploy Amphibious unit to Water lane',
      }
    }

    // B. Priority: Heights lane (Lane index 0) for Arm Wrestler
    const armWrestler = playableMinions.find((c) => c.id === 'zombie_arm_wrestler')
    if (armWrestler && !state.lanes[0].zombieMinion) {
      return {
        action: 'PLAY_MINION',
        card: armWrestler,
        laneIndex: 0,
        reason: 'Deploy Arm Wrestler on Heights for lane advantage',
      }
    }

    // Open lanes detection
    const openLanes = state.lanes
      .map((lane, idx) => ({ lane, idx }))
      .filter(({ lane }) => !lane.zombieMinion && !lane.plantMinion)

    // B2. Priority: Anti-Hero minion on Open Lane for direct Plant Hero face damage
    const antiHeroMinion = playableMinions.find(
      (c) => Boolean(c.antiHero) || hasCardTrait(c, 'antiHero') || hasCardTrait(c, 'anti-hero')
    )
    if (antiHeroMinion && openLanes.length > 0) {
      for (const { lane, idx } of openLanes) {
        const validation = canPlayCardToLane(antiHeroMinion, lane, 'zombies')
        if (validation.allowed) {
          return {
            action: 'PLAY_MINION',
            card: antiHeroMinion,
            laneIndex: idx,
            reason: `Deploy Anti-Hero minion to open lane ${idx + 1} for direct Plant Hero face damage`,
          }
        }
      }
    }

    // C. ARCHETYPE SPECIFIC LOGIC:
    // AGGRO ARCHETYPE: Prioritize open lanes first and foremost for direct face damage (unless facing severe threat >= 4 attack)!
    const severeThreatLanes = state.lanes.filter(
      (l) => l.plantMinion && !l.zombieMinion && (l.plantMinion.currentAttack >= 4 || evaluateMinionThreat(l, 'plants') >= 12)
    )
    if (archetype === 'aggro' && openLanes.length > 0 && severeThreatLanes.length === 0) {
      const topAggressor = [...playableMinions].sort((a, b) => {
        const aScore = a.attack * 2 + (hasCardTrait(a, 'bullseye') ? 2 : 0) + (hasCardTrait(a, 'frenzy') ? 2 : 0)
        const bScore = b.attack * 2 + (hasCardTrait(b, 'bullseye') ? 2 : 0) + (hasCardTrait(b, 'frenzy') ? 2 : 0)
        return bScore - aScore
      })[0]

      for (const { lane, idx } of openLanes) {
        if (canPlayCardToLane(topAggressor, lane, 'zombies').allowed) {
          return {
            action: 'PLAY_MINION',
            card: topAggressor,
            laneIndex: idx,
            reason: `Aggro Boss strikes open lane ${idx + 1} directly at Plant Hero`,
          }
        }
      }
    }

    // TEMPO ARCHETYPE: Prioritizes Armored and Frenzy stat monsters
    if (archetype === 'tempo') {
      const tempoMinion = [...playableMinions].sort((a, b) => {
        const aBuff = (hasCardTrait(a, 'armored') ? 4 : 0) + (hasCardTrait(a, 'frenzy') ? 3 : 0)
        const bBuff = (hasCardTrait(b, 'armored') ? 4 : 0) + (hasCardTrait(b, 'frenzy') ? 3 : 0)
        return b.attack + b.health + bBuff - (a.attack + a.health + aBuff)
      })[0]

      // Check if placing in an occupied plant lane wins the trade
      for (let i = 0; i < state.lanes.length; i++) {
        const lane = state.lanes[i]
        if (!lane.zombieMinion && lane.plantMinion) {
          const plant = lane.plantMinion
          const validation = canPlayCardToLane(tempoMinion, lane, 'zombies')
          // Favorable trade: Zombie kills plant or survives
          if (validation.allowed && tempoMinion.attack >= plant.currentHealth) {
            return {
              action: 'PLAY_MINION',
              card: tempoMinion,
              laneIndex: i,
              reason: `Tempo AI contests lane ${i + 1} with favorable minion trade`,
            }
          }
        }
      }
    }

    // D. Threat Mitigation: Block unblocked dangerous Plant lanes
    const threatenedLanes = state.lanes
      .map((lane, idx) => ({ lane, idx, threat: evaluateMinionThreat(lane, 'plants') }))
      .filter(({ lane }) => lane.plantMinion && !lane.zombieMinion)
      .sort((a, b) => b.threat - a.threat)

    if (threatenedLanes.length > 0 && threatenedLanes[0].threat >= 3) {
      for (const { lane, idx } of threatenedLanes) {
        // Find best blocker (highest HP or Armored/Deadly)
        const sortedBlockers = [...playableMinions].sort((a, b) => {
          const aArmored = hasCardTrait(a, 'armored') ? 3 : 0
          const bArmored = hasCardTrait(b, 'armored') ? 3 : 0
          return b.health + bArmored - (a.health + aArmored)
        })

        for (const candidate of sortedBlockers) {
          const validation = canPlayCardToLane(candidate, lane, 'zombies')
          if (validation.allowed) {
            return {
              action: 'PLAY_MINION',
              card: candidate,
              laneIndex: idx,
              reason: `Block dangerous plant in lane ${idx + 1}`,
            }
          }
        }
      }
    }

    // E. Aggression: Exploit Open Lanes to hit Plant Hero directly
    if (openLanes.length > 0) {
      const aggressor = [...playableMinions].sort((a, b) => {
        const aBullseye = hasCardTrait(a, 'bullseye') ? 2 : 0
        const bBullseye = hasCardTrait(b, 'bullseye') ? 2 : 0
        return b.attack + bBullseye - (a.attack + aBullseye)
      })[0]

      for (const { lane, idx } of openLanes) {
        const validation = canPlayCardToLane(aggressor, lane, 'zombies')
        if (validation.allowed) {
          return {
            action: 'PLAY_MINION',
            card: aggressor,
            laneIndex: idx,
            reason: `Aggressive open lane strike on lane ${idx + 1}`,
          }
        }
      }
    }

    // F. Fallback: Any available open slot
    for (let idx = 0; idx < state.lanes.length; idx++) {
      const lane = state.lanes[idx]
      if (!lane.zombieMinion) {
        for (const candidate of playableMinions) {
          if (canPlayCardToLane(candidate, lane, 'zombies').allowed) {
            return { action: 'PLAY_MINION', card: candidate, laneIndex: idx }
          }
        }
      }
    }
  }

  // ========================================================
  // 2. ZOMBIE AI: TRICKS PHASE (ZOMBIE_TRICKS)
  // ========================================================
  if (isZombie && state.phase === 'ZOMBIE_TRICKS') {
    const playableTricks = playableCards.filter(
      (c) => c.type === 'trick' || c.type === 'superpower' || c.type === 'environment'
    )
    if (playableTricks.length === 0) return { action: 'PASS' }

    // A. Check Lethal
    const lethal = checkLethalPossibility(state, 'zombies', playableTricks, resource)
    if (lethal) return lethal

    // B. Environment Overwrite & Strategic Placement Tactics:
    const envCard = playableTricks.find((c) => c.type === 'environment')
    if (envCard) {
      // Priority 1: Overwrite an active, dangerous plant environment (e.g., Spikeweed Sector, Bog of Hope)
      const dangerousPlantEnvLaneIdx = state.lanes.findIndex(
        (l) => l.environment && l.environment.side === 'plants' && isDangerousEnvironment(l.environment.id, 'zombies')
      )
      if (dangerousPlantEnvLaneIdx !== -1) {
        return {
          action: 'PLAY_TRICK',
          card: envCard,
          laneIndex: dangerousPlantEnvLaneIdx,
          reason: `Environment Tactics: ${envCard.name} overrides dangerous plant environment ${state.lanes[dangerousPlantEnvLaneIdx].environment!.name} in lane ${dangerousPlantEnvLaneIdx + 1}`,
        }
      }

      // Priority 1b: Overwrite ANY plant environment to deny opponent their advantage!
      const anyPlantEnvLaneIdx = state.lanes.findIndex(
        (l) => l.environment && l.environment.side === 'plants'
      )
      if (anyPlantEnvLaneIdx !== -1) {
        return {
          action: 'PLAY_TRICK',
          card: envCard,
          laneIndex: anyPlantEnvLaneIdx,
          reason: `Environment Tactics: ${envCard.name} overrides beneficial plant environment ${state.lanes[anyPlantEnvLaneIdx].environment!.name} in lane ${anyPlantEnvLaneIdx + 1}`,
        }
      }

      // Priority 2: Optimal Placement for Laser Base Alpha (Deadly and Strikethrough)
      if (envCard.id === 'zombie_laser_base_alpha') {
        const candidateZombieLanes = state.lanes
          .map((l, idx) => ({ l, idx }))
          .filter((x) => x.l.zombieMinion && x.l.environment?.id !== 'zombie_laser_base_alpha')
          .sort((a, b) => b.l.zombieMinion!.currentAttack - a.l.zombieMinion!.currentAttack)

        if (candidateZombieLanes.length > 0) {
          const target = candidateZombieLanes[0]
          return {
            action: 'PLAY_TRICK',
            card: envCard,
            laneIndex: target.idx,
            reason: `Environment Tactics: Laser Base Alpha placed on highest attack zombie ${target.l.zombieMinion!.name} (${target.l.zombieMinion!.currentAttack} ATK) in lane ${target.idx + 1} for Deadly and Strikethrough`,
          }
        }
      }

      // Priority 3: Optimal Placement for Area 22 (+2/+2 & Frenzy)
      if (envCard.id === 'zombie_area_22') {
        const candidateZombieLanes = state.lanes
          .map((l, idx) => ({ l, idx }))
          .filter((x) => x.l.zombieMinion && x.l.environment?.id !== 'zombie_area_22')
          .sort((a, b) => {
            const aBonus = !a.l.plantMinion ? 4 : 0
            const bBonus = !b.l.plantMinion ? 4 : 0
            return (b.l.zombieMinion!.currentAttack + bBonus) - (a.l.zombieMinion!.currentAttack + aBonus)
          })

        if (candidateZombieLanes.length > 0) {
          const target = candidateZombieLanes[0]
          return {
            action: 'PLAY_TRICK',
            card: envCard,
            laneIndex: target.idx,
            reason: `Environment Tactics: Area 22 empowers ${target.l.zombieMinion!.name} in lane ${target.idx + 1} with +2/+2 & Frenzy`,
          }
        }
      }

      // Priority 4: Place environment in an unoccupied environment lane where we have a living zombie
      const livingZombieLane = state.lanes.findIndex((l) => l.zombieMinion && !l.environment)
      if (livingZombieLane !== -1) {
        return {
          action: 'PLAY_TRICK',
          card: envCard,
          laneIndex: livingZombieLane,
          reason: `Environment Tactics: Deploys ${envCard.name} to empower zombie in lane ${livingZombieLane + 1}`,
        }
      }
    }

    // C. Hard Removal: Rocket Science on highest threat plant with >= 4 Attack
    const rocket = playableTricks.find((c) => c.id === 'zombie_rocket_science')
    if (rocket) {
      const highAtkPlantIdx = state.lanes.reduce((best, lane, idx) => {
        if (!lane.plantMinion || lane.plantMinion.currentAttack < 4 || isUntrickable(lane.plantMinion)) return best
        if (best === -1) return idx
        return evaluateMinionThreat(lane, 'plants') > evaluateMinionThreat(state.lanes[best], 'plants')
          ? idx
          : best
      }, -1)
      if (highAtkPlantIdx !== -1) {
        return {
          action: 'PLAY_TRICK',
          card: rocket,
          laneIndex: highAtkPlantIdx,
          reason: `Rocket Science destroys highest threat 4+ attack plant ${state.lanes[highAtkPlantIdx].plantMinion!.name} in lane ${highAtkPlantIdx + 1}`,
        }
      }
    }

    // D. Hard Removal: Locust Swarm on highest threat Plant minion
    const locust = playableTricks.find((c) => c.id === 'zombie_locust_swarm')
    if (locust) {
      const strongestPlantIdx = state.lanes.reduce((best, lane, idx) => {
        if (!lane.plantMinion || isUntrickable(lane.plantMinion)) return best
        if (best === -1) return idx
        return evaluateMinionThreat(lane, 'plants') > evaluateMinionThreat(state.lanes[best], 'plants')
          ? idx
          : best
      }, -1)
      if (strongestPlantIdx !== -1) {
        return {
          action: 'PLAY_TRICK',
          card: locust,
          laneIndex: strongestPlantIdx,
          reason: `Locust Swarm destroys highest threat plant ${state.lanes[strongestPlantIdx].plantMinion!.name}`,
        }
      }
    }

    // E. Team Buff: Going Viral (+1/+1 and Frenzy to all zombies, draw 1, shuffle 3 virals)
    const viral = playableTricks.find((c) => c.id === 'zombie_going_viral')
    const livingZombies = state.lanes.filter((l) => l.zombieMinion)
    if (viral && livingZombies.length >= 1) {
      return {
        action: 'PLAY_TRICK',
        card: viral,
        reason: `Going Viral buffs ${livingZombies.length} zombies with +1/+1 and Frenzy`,
      }
    }

    // F. Direct Buff: Brute Strength (+3 Attack to Zombie, prioritizing unblocked lanes)
    const brute = playableTricks.find(
      (c) => c.id === 'zombie_brute_strength' || c.id === 'sp_brute_strength'
    )
    if (brute) {
      // Prioritize unblocked zombie for massive face damage
      const unblockedZombie = state.lanes
        .map((l, idx) => ({ l, idx }))
        .filter((x) => x.l.zombieMinion && !x.l.plantMinion && !x.l.zombieMinion.isFrozen)
        .sort((a, b) => b.l.zombieMinion!.currentAttack - a.l.zombieMinion!.currentAttack)[0]

      if (unblockedZombie) {
        return {
          action: 'PLAY_TRICK',
          card: brute,
          laneIndex: unblockedZombie.idx,
          reason: `Brute Strength buffs unblocked zombie ${unblockedZombie.l.zombieMinion!.name} in lane ${unblockedZombie.idx + 1} with +3 Attack for face damage`,
        }
      }

      // Fallback: Contested zombie to swing the trade
      const contestedZombie = state.lanes
        .map((l, idx) => ({ l, idx }))
        .filter((x) => x.l.zombieMinion && !x.l.zombieMinion.isFrozen)
        .sort((a, b) => b.l.zombieMinion!.currentAttack - a.l.zombieMinion!.currentAttack)[0]

      if (contestedZombie) {
        return {
          action: 'PLAY_TRICK',
          card: brute,
          laneIndex: contestedZombie.idx,
          reason: `Brute Strength buffs zombie in lane ${contestedZombie.idx + 1} with +3 Attack`,
        }
      }
    }

    // G. AOE Wipe: Weed Spray against plants with <= 2 Attack
    const weedSpray = playableTricks.find((c) => c.id === 'zombie_weed_spray')
    if (weedSpray) {
      const smallPlantsCount = state.lanes.filter(
        (l) => l.plantMinion && l.plantMinion.currentAttack <= 2 && !isUntrickable(l.plantMinion)
      ).length
      if (smallPlantsCount >= 2 || (smallPlantsCount >= 1 && (difficulty === 'expert' || archetype === 'control'))) {
        return {
          action: 'PLAY_TRICK',
          card: weedSpray,
          reason: `Weed Spray eliminates ${smallPlantsCount} swarm plants`,
        }
      }
    }

    // H. Direct Damage: Bungee Plumber to eliminate low HP plant or push face
    const bungee = playableTricks.find((c) => c.id === 'zombie_bungee_plumber')
    if (bungee) {
      const killablePlantIdx = state.lanes.findIndex(
        (l) => l.plantMinion && l.plantMinion.currentHealth <= 2 && !isUntrickable(l.plantMinion)
      )
      if (killablePlantIdx !== -1) {
        return {
          action: 'PLAY_TRICK',
          card: bungee,
          laneIndex: killablePlantIdx,
          reason: 'Bungee Plumber finishes off low health plant',
        }
      }
      if (archetype === 'aggro' && state.plantHero.hp <= 6) {
        return {
          action: 'PLAY_TRICK',
          card: bungee,
          targetHero: true,
          reason: 'Aggro Bungee Plumber face burn',
        }
      }
    }

    // I. Buff / Bonus Attack: Lurch for Lunch on high damage Zombie
    const lurch = playableTricks.find((c) => c.id === 'zombie_lurch_for_lunch')
    if (lurch) {
      // Priority 1: Unblocked zombie with >= 2 attack for direct face smash
      const unblockedZombie = state.lanes
        .map((l, idx) => ({ l, idx }))
        .filter(
          (x) => x.l.zombieMinion && !x.l.plantMinion && !x.l.zombieMinion.isFrozen && x.l.zombieMinion.currentAttack >= 2
        )
        .sort((a, b) => b.l.zombieMinion!.currentAttack - a.l.zombieMinion!.currentAttack)[0]

      if (unblockedZombie) {
        return {
          action: 'PLAY_TRICK',
          card: lurch,
          laneIndex: unblockedZombie.idx,
          reason: `Lurch for Lunch grants bonus attack to unblocked zombie ${unblockedZombie.l.zombieMinion!.name} for face damage`,
        }
      }

      // Priority 2: Highest attack zombie with >= 3 attack
      const bestZombieLane = state.lanes.reduce((best, lane, idx) => {
        if (!lane.zombieMinion || lane.zombieMinion.isFrozen) return best
        if (best === -1) return idx
        return lane.zombieMinion.currentAttack > (state.lanes[best].zombieMinion?.currentAttack ?? 0)
          ? idx
          : best
      }, -1)
      if (bestZombieLane !== -1 && (state.lanes[bestZombieLane].zombieMinion?.currentAttack ?? 0) >= 3) {
        return {
          action: 'PLAY_TRICK',
          card: lurch,
          laneIndex: bestZombieLane,
          reason: 'Lurch for Lunch grants bonus attack to strongest zombie',
        }
      }
    }

    // J. Bad Moon Rising: If we have >= 2 Zombies on board, transform them
    const bmr = playableTricks.find((c) => c.id === 'zombie_bad_moon_rising')
    const zombieCount = state.lanes.filter((l) => l.zombieMinion).length
    if (bmr && zombieCount >= 2) {
      return {
        action: 'PLAY_TRICK',
        card: bmr,
        reason: `Bad Moon Rising transforms ${zombieCount} zombies`,
      }
    }
  }

  // ========================================================
  // 3. PLANT AI: (When Player chooses Zombies, AI plays Plants)
  // ========================================================
  if (!isZombie && state.phase === 'PLANT_PLAY') {
    // A. Check Lethal
    const lethal = checkLethalPossibility(state, 'plants', playableCards, resource)
    if (lethal) return lethal

    // B. Environment Overwrite Tactics: Neutralize dangerous Zombie environments!
    const plantEnv = playableCards.find((c) => c.type === 'environment')
    if (plantEnv) {
      // Priority 1: Overwrite dangerous zombie environment
      const dangerousZombieEnvLaneIdx = state.lanes.findIndex(
        (l) => l.environment && l.environment.side === 'zombies' && isDangerousEnvironment(l.environment.id, 'plants')
      )
      if (dangerousZombieEnvLaneIdx !== -1) {
        return {
          action: 'PLAY_TRICK',
          card: plantEnv,
          laneIndex: dangerousZombieEnvLaneIdx,
          reason: `Environment Tactics: ${plantEnv.name} overrides dangerous zombie environment ${state.lanes[dangerousZombieEnvLaneIdx].environment!.name} in lane ${dangerousZombieEnvLaneIdx + 1}`,
        }
      }

      // Priority 1b: Overwrite ANY zombie environment to deny opponent value
      const anyZombieEnvLaneIdx = state.lanes.findIndex(
        (l) => l.environment && l.environment.side === 'zombies'
      )
      if (anyZombieEnvLaneIdx !== -1) {
        return {
          action: 'PLAY_TRICK',
          card: plantEnv,
          laneIndex: anyZombieEnvLaneIdx,
          reason: `Environment Tactics: ${plantEnv.name} overrides beneficial zombie environment ${state.lanes[anyZombieEnvLaneIdx].environment!.name} in lane ${anyZombieEnvLaneIdx + 1}`,
        }
      }
    }

    // C. Removal Tricks (Squash, Shamrocket, Cherry Bomb, Berry Blast)
    const squash = playableCards.find((c) => c.id === 'plant_squash')
    if (squash) {
      const highestThreatZombieIdx = state.lanes.reduce((best, lane, idx) => {
        if (!lane.zombieMinion || isUntrickable(lane.zombieMinion)) return best
        if (best === -1) return idx
        return evaluateMinionThreat(lane, 'zombies') > evaluateMinionThreat(state.lanes[best], 'zombies')
          ? idx
          : best
      }, -1)
      if (highestThreatZombieIdx !== -1 && evaluateMinionThreat(state.lanes[highestThreatZombieIdx], 'zombies') >= 5) {
        return {
          action: 'PLAY_TRICK',
          card: squash,
          laneIndex: highestThreatZombieIdx,
          reason: `Squash crushes high threat zombie ${state.lanes[highestThreatZombieIdx].zombieMinion!.name} in lane ${highestThreatZombieIdx + 1}`,
        }
      }
    }

    const shamrocket = playableCards.find((c) => c.id === 'plant_shamrocket')
    if (shamrocket) {
      const bigZombieIdx = state.lanes.reduce((best, lane, idx) => {
        if (!lane.zombieMinion || lane.zombieMinion.currentAttack < 4 || isUntrickable(lane.zombieMinion)) return best
        if (best === -1) return idx
        return evaluateMinionThreat(lane, 'zombies') > evaluateMinionThreat(state.lanes[best], 'zombies')
          ? idx
          : best
      }, -1)
      if (bigZombieIdx !== -1) {
        return {
          action: 'PLAY_TRICK',
          card: shamrocket,
          laneIndex: bigZombieIdx,
          reason: `Shamrocket destroys 4+ attack zombie ${state.lanes[bigZombieIdx].zombieMinion!.name} in lane ${bigZombieIdx + 1}`,
        }
      }
    }

    const berryBlast = playableCards.find((c) => c.id === 'plant_berry_blast')
    if (berryBlast) {
      const targetZombieIdx = state.lanes.findIndex(
        (l) => l.zombieMinion && l.zombieMinion.currentHealth <= 3 && !isUntrickable(l.zombieMinion)
      )
      if (targetZombieIdx !== -1) {
        return {
          action: 'PLAY_TRICK',
          card: berryBlast,
          laneIndex: targetZombieIdx,
          reason: 'Berry Blast snipes zombie',
        }
      }
    }

    // D. Environments: Spikeweed Sector
    const spikeweed = playableCards.find((c) => c.id === 'plant_spikeweed_sector')
    if (spikeweed) {
      // Prioritize placing under strongest zombie
      const strongestZombieLane = state.lanes.reduce((best, lane, idx) => {
        if (!lane.zombieMinion || lane.environment?.id === 'plant_spikeweed_sector') return best
        if (best === -1) return idx
        return evaluateMinionThreat(lane, 'zombies') > evaluateMinionThreat(state.lanes[best], 'zombies')
          ? idx
          : best
      }, -1)
      if (strongestZombieLane !== -1) {
        return {
          action: 'PLAY_TRICK',
          card: spikeweed,
          laneIndex: strongestZombieLane,
          reason: `Spikeweed Sector damages zombie ${state.lanes[strongestZombieLane].zombieMinion!.name} before combat in lane ${strongestZombieLane + 1}`,
        }
      }
    }

    // E. Minions Placement
    const playableMinions = playableCards.filter(isMinionCard)
    if (playableMinions.length > 0) {
      // Prioritize Amphibious on Water Lane
      const amph = playableMinions.find(hasAmphibiousTrait)
      if (amph && !state.lanes[4].plantMinion) {
        return {
          action: 'PLAY_MINION',
          card: amph,
          laneIndex: 4,
          reason: 'Deploy Amphibious plant to Water lane',
        }
      }

      // Prioritize Cabbage-Pult on Heights
      const cabbage = playableMinions.find((c) => c.id === 'plant_cabbage_pult')
      if (cabbage && !state.lanes[0].plantMinion) {
        return {
          action: 'PLAY_MINION',
          card: cabbage,
          laneIndex: 0,
          reason: 'Deploy Cabbage-Pult on Heights for +1/+1 buff',
        }
      }

      // Aggro Plant AI: Prioritize open lanes to blast Zombie Hero
      if (archetype === 'aggro') {
        for (let i = 0; i < state.lanes.length; i++) {
          const lane = state.lanes[i]
          if (!lane.plantMinion && !lane.zombieMinion) {
            const strongest = [...playableMinions].sort((a, b) => b.attack - a.attack)[0]
            if (canPlayCardToLane(strongest, lane, 'plants').allowed) {
              return {
                action: 'PLAY_MINION',
                card: strongest,
                laneIndex: i,
                reason: `Aggro Plant AI pushes face damage on open lane ${i + 1}`,
              }
            }
          }
        }
      }

      // Counter Zombies in lane
      for (let i = 0; i < state.lanes.length; i++) {
        const lane = state.lanes[i]
        if (lane.zombieMinion && !lane.plantMinion) {
          const sortedMinions = [...playableMinions].sort((a, b) => b.health - a.health)
          for (const candidate of sortedMinions) {
            if (canPlayCardToLane(candidate, lane, 'plants').allowed) {
              return {
                action: 'PLAY_MINION',
                card: candidate,
                laneIndex: i,
                reason: `Deploy plant to block zombie in lane ${i + 1}`,
              }
            }
          }
        }
      }

      // Otherwise place on open lane to push face damage
      for (let i = 0; i < state.lanes.length; i++) {
        const lane = state.lanes[i]
        if (!lane.plantMinion && !lane.zombieMinion) {
          const strongest = [...playableMinions].sort((a, b) => b.attack - a.attack)[0]
          if (canPlayCardToLane(strongest, lane, 'plants').allowed) {
            return {
              action: 'PLAY_MINION',
              card: strongest,
              laneIndex: i,
              reason: `Push face damage on open lane ${i + 1}`,
            }
          }
        }
      }
    }
  }

  return { action: 'PASS', reason: 'Tactical pass' }
}

/**
 * Plans a full turn of actions for the AI in the current phase.
 * Simulates plays sequentially so the AI can execute multi-card combos.
 */
export function getAITurnPlan(
  initialState: GameState,
  side: Side,
  difficultyOrOptions: AIDifficulty | AIDecisionOptions = 'normal',
  maxActions = 4
): AIDecision[] {
  const plan: AIDecision[] = []
  let simulatedState = { ...initialState }
  let remainingActions = maxActions

  while (remainingActions > 0) {
    const decision = getAIDecision(simulatedState, side, difficultyOrOptions)
    if (decision.action === 'PASS') break

    plan.push(decision)
    remainingActions--

    // Deduct resource in simulated state so next decision knows remaining budget
    const isZombie = side === 'zombies'
    const hero = isZombie ? simulatedState.zombieHero : simulatedState.plantHero
    const cardCost = decision.card?.cost ?? 0

    const updatedHero = {
      ...hero,
      sun: !isZombie ? Math.max(0, hero.sun - cardCost) : hero.sun,
      brains: isZombie ? Math.max(0, hero.brains - cardCost) : hero.brains,
    }

    const updatedHand = isZombie
      ? simulatedState.zombieHand.filter((c) => c.id !== decision.card?.id)
      : simulatedState.plantHand.filter((c) => c.id !== decision.card?.id)

    // Mark lane as occupied in simulation
    const updatedLanes = simulatedState.lanes.map((l) => ({ ...l }))
    if (decision.laneIndex !== undefined && decision.card && isMinionCard(decision.card)) {
      const targetLane = updatedLanes[decision.laneIndex]
      if (isZombie) {
        targetLane.zombieMinion = {
          instanceId: `sim_${decision.card.id}`,
          cardId: decision.card.id,
          name: decision.card.name,
          side: 'zombies',
          currentAttack: decision.card.attack,
          baseAttack: decision.card.attack,
          currentHealth: decision.card.health,
          maxHealth: decision.card.health,
          image: decision.card.image || '',
        }
      } else {
        targetLane.plantMinion = {
          instanceId: `sim_${decision.card.id}`,
          cardId: decision.card.id,
          name: decision.card.name,
          side: 'plants',
          currentAttack: decision.card.attack,
          baseAttack: decision.card.attack,
          currentHealth: decision.card.health,
          maxHealth: decision.card.health,
          image: decision.card.image || '',
        }
      }
    }

    simulatedState = {
      ...simulatedState,
      plantHero: !isZombie ? updatedHero : simulatedState.plantHero,
      zombieHero: isZombie ? updatedHero : simulatedState.zombieHero,
      plantHand: !isZombie ? updatedHand : simulatedState.plantHand,
      zombieHand: isZombie ? updatedHand : simulatedState.zombieHand,
      lanes: updatedLanes,
    }
  }

  return plan
}
