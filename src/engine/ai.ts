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

export type AIArchetype = 'aggro' | 'control' | 'tempo' | 'combo'

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

  // Combo Heroes (Complex synergy, environments, or combo finishers)
  if (
    idLower.includes('huge_gigantacus') ||
    idLower.includes('beta_carrotina')
  ) {
    return 'combo'
  }

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

  // Tempo Heroes (The Smash, Z-Mech, Neptuna, Grass Knuckles, Chompzilla, Green Shadow, Brain Freeze, etc.)
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

    case 'combo':
      score =
        cardAdvantage * 4.0 +
        friendlyTotalHealth * 1.5 +
        friendlyHero.hp * 1.8 -
        enemyFaceThreat * 3.0 +
        environmentAdvantage * 2.5 +
        (hasLethal ? 600 : 0) -
        (threatensLethal ? 550 : 0) +
        friendlyTotalAttack * 1.8 -
        enemyTotalAttack * 2.0
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

  const hasOneDrop = hand.some((c) => c.cost === 1 && c.type !== 'superpower')

  const cheapTricksCount = hand.filter(
    (c) => (c.type === 'trick' || c.type === 'superpower') && c.cost <= 2
  ).length

  hand.forEach((card, idx) => {
    // 0-cost Superpowers are never swapped
    if (card.type === 'superpower' || card.cost === 0) {
      keepIndices.push(idx)
      return
    }

    // Combo Core Piece 1: Valkyrie wants to be in hand from turn 1 to accumulate death buffs
    if (card.id === 'zombie_valkyrie') {
      keepIndices.push(idx)
      return
    }

    // Combo Core Piece 2: Trickster kept if holding cheap tricks to discount it
    if (card.id === 'zombie_trickster' && cheapTricksCount >= 1) {
      keepIndices.push(idx)
      return
    }

    // Combo Core Piece 3: Going Viral is a core combo/tempo buff engine
    if (card.id === 'zombie_going_viral' && (archetype === 'combo' || archetype === 'tempo')) {
      keepIndices.push(idx)
      return
    }

    // Combo Core Piece 4: Bad Moon Rising kept if Ramp or cheap swarm minions are in hand
    if (card.id === 'zombie_bad_moon_rising' && (hasRamp || hand.filter((c) => c.cost <= 2 && c.type === 'minion').length >= 2)) {
      keepIndices.push(idx)
      return
    }

    // Ramp Exception: allows keeping one 4-5 cost bomb
    if (hasRamp && (card.cost === 4 || card.cost === 5) && !keepIndices.some((i) => hand[i].cost >= 4)) {
      keepIndices.push(idx)
      return
    }

    // Aggro Curve Rules:
    // Strictly prioritize 1-drops and 2-drops; swap 3+ cost cards if missing a 1-drop
    if (archetype === 'aggro') {
      if (card.cost <= 2) {
        keepIndices.push(idx)
      } else if (card.cost === 3) {
        if (!hasOneDrop) {
          swapIndices.push(idx) // Dig aggressively for turn 1 minion
        } else {
          // Keep at most one 3-cost card
          const alreadyKept3Cost = keepIndices.some((i) => hand[i].cost === 3)
          if (!alreadyKept3Cost) {
            keepIndices.push(idx)
          } else {
            swapIndices.push(idx)
          }
        }
      } else {
        // Cost 4+: always swap in Aggro
        swapIndices.push(idx)
      }
      return
    }

    // Control Curve Rules:
    // Can keep key removal (Rocket Science, Shamrocket, Squash) if early defense exists
    if (archetype === 'control') {
      const isKeyRemoval =
        card.id === 'zombie_rocket_science' ||
        card.id === 'plant_shamrocket' ||
        card.id === 'plant_squash' ||
        card.id === 'zombie_locust_swarm'
      const hasEarlyDefense = keepIndices.some((i) => hand[i].cost <= 2)

      if (card.cost <= 2) {
        keepIndices.push(idx)
      } else if (isKeyRemoval && hasEarlyDefense) {
        keepIndices.push(idx)
      } else if (card.cost === 3 && card.type === 'minion') {
        keepIndices.push(idx)
      } else {
        swapIndices.push(idx)
      }
      return
    }

    // Standard Curve Rules (Tempo, Combo):
    if (card.cost <= 3) {
      // Curve 1-3: Keep
      keepIndices.push(idx)
    } else if (card.cost >= 5) {
      // Curve 5+: Swap unless combo piece already kept
      swapIndices.push(idx)
    } else {
      // Cost 4 cards: Keep at most one 4-cost if a 1 or 2-cost play is already secured
      const hasEarlyCurve = keepIndices.some((i) => hand[i].cost <= 2)
      const alreadyKept4Cost = keepIndices.some((i) => hand[i].cost === 4)
      if (hasEarlyCurve && !alreadyKept4Cost) {
        keepIndices.push(idx)
      } else {
        swapIndices.push(idx)
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

  // 10. Heroic Health (Heal Zombie Hero for 6 HP)
  if (spId.includes('heroic_health')) {
    const zombieHp = state.zombieHero.hp
    if (zombieHp <= 15) {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        reason: `Heroic Health restores 6 HP to Zombie Hero (current HP: ${zombieHp})`,
      }
    }
    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: `Save Heroic Health until Zombie Hero loses at least 5 HP (current HP: ${zombieHp})`,
    }
  }

  // 11. Geyser (Heal Plant Hero and all Plants for 4 HP)
  if (spId.includes('geyser')) {
    const plantHp = state.plantHero.hp
    const hasDamagedPlants = lanes.some(
      (l) => l.plantMinion && l.plantMinion.currentHealth < l.plantMinion.maxHealth
    )
    if (plantHp <= 16 || hasDamagedPlants) {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        reason: 'Geyser heals damaged Plant Hero and friendly plants',
      }
    }
    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Geyser until Hero or friendly plants are damaged',
    }
  }

  // 12. Uncrackable (Your Hero cannot be hurt this turn. Draw a card.)
  if (spId.includes('uncrackable')) {
    const incomingFaceDamage = lanes.reduce((sum, l) => {
      if (l.zombieMinion && !l.plantMinion && !l.zombieMinion.isFrozen) {
        return sum + l.zombieMinion.currentAttack
      }
      return sum
    }, 0)

    const isHeroInDanger =
      incomingFaceDamage >= 5 ||
      incomingFaceDamage >= state.plantHero.hp ||
      state.plantHero.hp <= 6

    if (isHeroInDanger) {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        reason: `Uncrackable shields Plant Hero from ${incomingFaceDamage} incoming face damage this turn`,
      }
    }

    if (state.plantHero.hp >= 15 && incomingFaceDamage <= 2) {
      return {
        action: 'SAVE_SUPERPOWER',
        superpowerId: superpower.id,
        reason: 'Save Uncrackable for high-danger or lethal combat turns',
      }
    }

    return {
      action: 'PLAY_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Uncrackable provides defense and draws a card',
    }
  }

  // 13. Telepathy / Holoflora (Draw 2 cards)
  if (spId.includes('telepathy') || spId.includes('holoflora')) {
    const hand = isZombie ? state.zombieHand : state.plantHand
    if (hand.length <= 8) {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        reason: `${superpower.name} draws 2 cards for card advantage`,
      }
    }
    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: `Save ${superpower.name} to avoid hand overflow (hand >= 9)`,
    }
  }

  // 14. Electrobolt (Deal 3 damage to a Plant)
  if (spId.includes('electrobolt')) {
    const targetPlants = lanes
      .map((l, idx) => ({ l, idx }))
      .filter((x) => x.l.plantMinion && !isUntrickable(x.l.plantMinion))

    if (targetPlants.length > 0) {
      // Prioritize clean kills or highest threat
      const bestKill = targetPlants.find((x) => x.l.plantMinion!.currentHealth <= 3)
      const target = bestKill || targetPlants.sort((a, b) => evaluateMinionThreat(b.l, 'plants') - evaluateMinionThreat(a.l, 'plants'))[0]
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        targetLaneIndex: target.idx,
        reason: `Electrobolt strikes plant ${target.l.plantMinion!.name} in lane ${target.idx + 1} for 3 damage`,
      }
    }
    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Electrobolt until enemy plants are deployed',
    }
  }

  // 15. Acid Rain (All Plants on the Ground get -1/-1)
  if (spId.includes('acid_rain')) {
    const groundLanes = [lanes[1], lanes[2], lanes[3]]
    const groundPlants = groundLanes.filter((l) => l.plantMinion && !isUntrickable(l.plantMinion))
    if (groundPlants.length >= 2 || groundPlants.some((l) => l.plantMinion!.currentHealth <= 1)) {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        reason: `Acid Rain weakens ${groundPlants.length} ground plants with -1/-1`,
      }
    }
    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Acid Rain until multiple plants occupy ground lanes',
    }
  }

  // 16. Whirlwind (Bounce a random Zombie)
  if (spId.includes('whirlwind')) {
    const hasZombie = lanes.some((l) => l.zombieMinion && !isUntrickable(l.zombieMinion))
    if (hasZombie) {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        reason: 'Whirlwind bounces an enemy zombie back to hand',
      }
    }
    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Whirlwind until enemy zombies are deployed',
    }
  }

  // 17. Missile Madness (Deal 3 damage to a Plant and 1 damage to all other Plants)
  if (spId.includes('missile_madness')) {
    const hasPlants = lanes.some((l) => l.plantMinion && !isUntrickable(l.plantMinion))
    if (hasPlants) {
      const bestTargetIdx = lanes.reduce((best, l, idx) => {
        if (!l.plantMinion || isUntrickable(l.plantMinion)) return best
        if (best === -1) return idx
        return evaluateMinionThreat(l, 'plants') > evaluateMinionThreat(lanes[best], 'plants') ? idx : best
      }, -1)
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        targetLaneIndex: bestTargetIdx !== -1 ? bestTargetIdx : undefined,
        reason: 'Missile Madness barrages all enemy plants with rockets',
      }
    }
    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Missile Madness until enemy plants are deployed',
    }
  }

  // 18. Devour (Chompzilla - Destroy a Zombie with the lowest Health)
  if (spId.includes('devour')) {
    const targetZombies = lanes
      .map((l, idx) => ({ l, idx }))
      .filter((x) => x.l.zombieMinion && !isUntrickable(x.l.zombieMinion))

    if (targetZombies.length > 0) {
      // Sort by lowest health; if tied, sort by highest attack
      targetZombies.sort((a, b) => {
        const hpDiff = a.l.zombieMinion!.currentHealth - b.l.zombieMinion!.currentHealth
        if (hpDiff !== 0) return hpDiff
        return b.l.zombieMinion!.currentAttack - a.l.zombieMinion!.currentAttack
      })
      const target = targetZombies[0]
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        targetLaneIndex: target.idx,
        reason: `Devour destroys lowest-health zombie ${target.l.zombieMinion!.name} (${target.l.zombieMinion!.currentHealth} HP) in lane ${target.idx + 1}`,
      }
    }
    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Devour until enemy zombies are deployed',
    }
  }

  // 19. Tater Toss (Spudow - Make a 0/1 Hothead with Team-Up that deals 6 damage when destroyed)
  if (spId.includes('tater_toss')) {
    // Optimal placement: Lane facing dangerous enemy zombie (>= 2 ATK) to absorb damage and retaliate for 6 dmg
    const dangerousZombieLanes = lanes
      .map((l, idx) => ({ l, idx }))
      .filter((x) => x.l.zombieMinion && x.l.zombieMinion.currentAttack >= 2 && !x.l.plantMinion)
      .sort((a, b) => b.l.zombieMinion!.currentAttack - a.l.zombieMinion!.currentAttack)

    if (dangerousZombieLanes.length > 0) {
      const target = dangerousZombieLanes[0]
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        targetLaneIndex: target.idx,
        reason: `Tater Toss deploys Hothead in lane ${target.idx + 1} to absorb ${target.l.zombieMinion!.name} and retaliate for 6 damage`,
      }
    }

    const openLaneIdx = lanes.findIndex((l) => !l.plantMinion)
    if (openLaneIdx !== -1) {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        targetLaneIndex: openLaneIdx,
        reason: `Tater Toss places defensive Hothead in lane ${openLaneIdx + 1}`,
      }
    }

    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Tater Toss until a lane opens for planting Hothead',
    }
  }

  // 20. Peel Shield (Citron - Plants cannot be hurt this turn. Draw a card)
  if (spId.includes('peel_shield')) {
    const friendlyPlants = lanes.filter((l) => l.plantMinion)
    const plantsInCombat = lanes.filter(
      (l) => l.plantMinion && l.zombieMinion && !l.zombieMinion.isFrozen && l.zombieMinion.currentAttack > 0
    )
    const hand = isZombie ? state.zombieHand : state.plantHand

    if (plantsInCombat.length >= 1 || friendlyPlants.length >= 2 || (friendlyPlants.length >= 1 && hand.length <= 8)) {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        reason: `Peel Shield grants invulnerability to ${friendlyPlants.length} plants and draws a card`,
      }
    }

    if (friendlyPlants.length === 0 && hand.length <= 7) {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        reason: 'Peel Shield cycles a card to maintain card advantage',
      }
    }

    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Peel Shield for a turn when multiple plants are in danger',
    }
  }

  // 21. Power Pummel (Grass Knuckles - Attack for 2 damage in each Ground lane: 1, 2, 3)
  if (spId.includes('power_pummel')) {
    const groundLanes = [lanes[1], lanes[2], lanes[3]]
    const groundZombies = groundLanes.filter((l) => l.zombieMinion)
    const killableZombies = groundZombies.filter((l) => l.zombieMinion!.currentHealth <= 2)
    const openGroundLanes = groundLanes.filter((l) => !l.zombieMinion)

    if (groundZombies.length >= 1 || openGroundLanes.length >= 2 || archetype === 'aggro') {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        reason: `Power Pummel attacks across all 3 ground lanes (affecting ${groundZombies.length} zombies, ${killableZombies.length} lethal kills)`,
      }
    }

    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Power Pummel until enemy zombies or aggressive face opportunities emerge on ground lanes',
    }
  }

  // 22. Mush-Boom (Nightcap - Make 1/1 Poison Mushroom with Anti-Hero 2. Do 2 damage to a Zombie here)
  if (spId.includes('mush_boom')) {
    const availableLanes = lanes.map((l, idx) => ({ l, idx })).filter((x) => !x.l.plantMinion)

    // Priority 1: Clean kill on zombie with <= 2 HP
    const killTarget = availableLanes.find(
      (x) => x.l.zombieMinion && x.l.zombieMinion.currentHealth <= 2 && !isUntrickable(x.l.zombieMinion)
    )
    if (killTarget) {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        targetLaneIndex: killTarget.idx,
        reason: `Mush-Boom deals 2 lethal damage to ${killTarget.l.zombieMinion!.name} in lane ${killTarget.idx + 1} and spawns Poison Mushroom`,
      }
    }

    // Priority 2: Damage any opposing zombie
    const damageTarget = availableLanes.find(
      (x) => x.l.zombieMinion && !isUntrickable(x.l.zombieMinion)
    )
    if (damageTarget) {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        targetLaneIndex: damageTarget.idx,
        reason: `Mush-Boom deals 2 damage to ${damageTarget.l.zombieMinion!.name} in lane ${damageTarget.idx + 1}`,
      }
    }

    // Priority 3: Open lane for Anti-Hero 2 face burst (3 damage)
    const openTarget = availableLanes.find((x) => !x.l.zombieMinion)
    if (openTarget) {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        targetLaneIndex: openTarget.idx,
        reason: `Mush-Boom summons Poison Mushroom in open lane ${openTarget.idx + 1} for 3 Anti-Hero face damage`,
      }
    }

    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Mush-Boom until a plant slot opens',
    }
  }

  // 23. Goatify (Rose - Transform Zombie with highest Attack into a 1/1 Goat)
  if (spId.includes('goatify')) {
    const targetZombies = lanes
      .map((l, idx) => ({ l, idx }))
      .filter((x) => x.l.zombieMinion && !isUntrickable(x.l.zombieMinion))

    if (targetZombies.length > 0) {
      targetZombies.sort((a, b) => b.l.zombieMinion!.currentAttack - a.l.zombieMinion!.currentAttack)
      const highestAtkZombie = targetZombies[0]

      if (highestAtkZombie.l.zombieMinion!.currentAttack >= 3 || evaluateMinionThreat(highestAtkZombie.l, 'zombies') >= 5) {
        return {
          action: 'PLAY_SUPERPOWER',
          superpowerId: superpower.id,
          targetLaneIndex: highestAtkZombie.idx,
          reason: `Goatify transforms highest attack zombie ${highestAtkZombie.l.zombieMinion!.name} (${highestAtkZombie.l.zombieMinion!.currentAttack} ATK) into a 1/1 Goat`,
        }
      }

      return {
        action: 'SAVE_SUPERPOWER',
        superpowerId: superpower.id,
        reason: `Save Goatify for stronger threats (highest current zombie ATK is only ${highestAtkZombie.l.zombieMinion!.currentAttack})`,
      }
    }

    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Goatify until enemy zombies are deployed',
    }
  }

  // 24. Blazing Bark (Captain Combustible - A Plant gets +4 Attack)
  if (spId.includes('blazing_bark')) {
    const friendlyPlantLanes = lanes
      .map((l, idx) => ({ l, idx }))
      .filter((x) => x.l.plantMinion && !x.l.plantMinion.isFrozen)

    if (friendlyPlantLanes.length > 0) {
      // Priority 1: Unblocked plant (direct face burst)
      const unblocked = friendlyPlantLanes.find((x) => !x.l.zombieMinion)
      if (unblocked) {
        return {
          action: 'PLAY_SUPERPOWER',
          superpowerId: superpower.id,
          targetLaneIndex: unblocked.idx,
          reason: `Blazing Bark grants +4 Attack to unblocked ${unblocked.l.plantMinion!.name} in lane ${unblocked.idx + 1} for face burst`,
        }
      }

      // Priority 2: Plant that can trade favorably or eliminate opposing zombie
      const trading = friendlyPlantLanes.find(
        (x) => x.l.zombieMinion && x.l.plantMinion!.currentAttack + 4 >= x.l.zombieMinion.currentHealth
      )
      const target = trading || friendlyPlantLanes[0]

      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        targetLaneIndex: target.idx,
        reason: `Blazing Bark buffs ${target.l.plantMinion!.name} in lane ${target.idx + 1} with +4 Attack`,
      }
    }

    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Blazing Bark until friendly plants are deployed',
    }
  }

  // 25. Stayin' Alive (Electric Boogaloo - Do 3 damage to a Plant. Heal your Hero for 3)
  if (spId.includes('stayin_alive')) {
    const targetPlants = lanes
      .map((l, idx) => ({ l, idx }))
      .filter((x) => x.l.plantMinion && !isUntrickable(x.l.plantMinion))

    if (targetPlants.length > 0) {
      const killTarget = targetPlants.find((x) => x.l.plantMinion!.currentHealth <= 3)
      const threatTarget = targetPlants.sort(
        (a, b) => evaluateMinionThreat(b.l, 'plants') - evaluateMinionThreat(a.l, 'plants')
      )[0]
      const target = killTarget || threatTarget

      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        targetLaneIndex: target.idx,
        reason: `Stayin' Alive deals 3 damage to ${target.l.plantMinion!.name} in lane ${target.idx + 1} and heals Zombie Hero for 3 HP`,
      }
    }

    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Stayin\' Alive until enemy plants are deployed',
    }
  }

  // 26. Frozen Tundra (Brain Freeze - Freeze all Plants on the Ground)
  if (spId.includes('frozen_tundra')) {
    const groundLanes = [lanes[1], lanes[2], lanes[3]]
    const unfrozenPlants = groundLanes.filter(
      (l) => l.plantMinion && !l.plantMinion.isFrozen && !isUntrickable(l.plantMinion)
    )

    if (unfrozenPlants.length >= 1) {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        reason: `Frozen Tundra freezes ${unfrozenPlants.length} plants on ground lanes to nullify enemy combat`,
      }
    }

    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Frozen Tundra until plants occupy ground lanes',
    }
  }

  // 27. Witch's Familiar (Immorticia - Make a 2/1 Zombat with Amphibious that draws a card when it hurts a Plant)
  if (spId.includes('witchs_familiar')) {
    const availableLanes = lanes.map((l, idx) => ({ l, idx })).filter((x) => !x.l.zombieMinion)

    if (availableLanes.length > 0) {
      // Priority 1: Water lane (lane 4 / amphibious)
      const waterLane = availableLanes.find((x) => x.idx === 4)
      // Priority 2: Lane facing a 1-2 HP plant to kill and draw card immediately
      const tradeLane = availableLanes.find(
        (x) => x.l.plantMinion && x.l.plantMinion.currentHealth <= 2
      )
      const target = waterLane || tradeLane || availableLanes[0]

      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        targetLaneIndex: target.idx,
        reason: `Witch's Familiar summons 2/1 Amphibious Zombat in lane ${target.idx + 1}`,
      }
    }

    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Witch\'s Familiar until a lane opens for zombie deployment',
    }
  }

  // 28. Octo-Pult (Neptuna - Make a 3/2 Octo-Pet with Amphibious)
  if (spId.includes('octo_pult')) {
    const availableLanes = lanes.map((l, idx) => ({ l, idx })).filter((x) => !x.l.zombieMinion)

    if (availableLanes.length > 0) {
      const waterLane = availableLanes.find((x) => x.idx === 4)
      const tradeLane = availableLanes.find(
        (x) => x.l.plantMinion && x.l.plantMinion.currentHealth <= 3
      )
      const target = waterLane || tradeLane || availableLanes[0]

      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        targetLaneIndex: target.idx,
        reason: `Octo-Pult launches 3/2 Amphibious Octo-Pet in lane ${target.idx + 1}`,
      }
    }

    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Octo-Pult until a lane opens for zombie deployment',
    }
  }

  // 29. Genetic Amplification (Beta-Carrotina - Conjure 1-cost Plant with +1/+1, Amphibious, Team-Up)
  if (spId.includes('genetic_amplification')) {
    const hand = isZombie ? state.zombieHand : state.plantHand
    if (hand.length <= 9) {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        reason: 'Genetic Amplification conjures an enhanced +1/+1 Amphibious Team-Up 1-cost plant',
      }
    }
    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Genetic Amplification to avoid hand overflow',
    }
  }

  // 30. Terror-Former 10,000 (Huge-Gigantacus - All cards cost 1 less, conjure environment)
  if (spId.includes('terror_former')) {
    return {
      action: 'PLAY_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Terror-Former 10,000 reduces the cost of all cards in hand by 1 and conjures an environment',
    }
  }

  // 31. Embiggen (A Plant gets +2/+2)
  if (spId.includes('embiggen')) {
    const friendlyPlants = lanes
      .map((l, idx) => ({ l, idx }))
      .filter((x) => x.l.plantMinion && !x.l.plantMinion.isFrozen)

    if (friendlyPlants.length > 0) {
      const bestTarget = friendlyPlants.sort(
        (a, b) => b.l.plantMinion!.currentAttack - a.l.plantMinion!.currentAttack
      )[0]
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        targetLaneIndex: bestTarget.idx,
        reason: `Embiggen buffs ${bestTarget.l.plantMinion!.name} in lane ${bestTarget.idx + 1} with +2/+2`,
      }
    }
    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Embiggen until friendly plants are deployed',
    }
  }

  // 32. Dance Off (Summon two 1/1 Backup Dancers)
  if (spId.includes('dance_off')) {
    const openLanesCount = lanes.filter((l) => !l.zombieMinion).length
    if (openLanesCount >= 1) {
      return {
        action: 'PLAY_SUPERPOWER',
        superpowerId: superpower.id,
        reason: 'Dance Off summons two 1/1 Backup Dancers across open lanes',
      }
    }
    return {
      action: 'SAVE_SUPERPOWER',
      superpowerId: superpower.id,
      reason: 'Save Dance Off until lanes open up for zombie dancers',
    }
  }

  // 18. Default heuristic: If immediate board advantage is available, play; otherwise save
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
 * Calculates the number of Brains the Zombie AI should reserve during ZOMBIE_PLAY
 * for the upcoming ZOMBIE_TRICKS phase.
 *
 * In PvZ Heroes, Zombies must deploy minions before Plants react.
 * If the Zombie AI spends all brains on minions, it cannot cast critical tricks
 * (Rocket Science, Locust Swarm, Lurch for Lunch, Going Viral, Cut Down to Size, Bungee Plumber).
 */
export function reserveBrainsForTricks(
  state: GameState,
  hand: Card[],
  resource: number,
  archetype: AIArchetype = 'tempo',
  difficulty: AIDifficulty = 'normal'
): { reservedBrains: number; targetTrick?: Card; reason?: string } {
  if (difficulty === 'easy') {
    return { reservedBrains: 0 }
  }

  // Filter playable/affordable tricks within current total brain resource
  const playableTricks = hand.filter(
    (c) =>
      (c.type === 'trick' || c.type === 'superpower' || c.type === 'environment') &&
      c.cost <= resource
  )

  if (playableTricks.length === 0) {
    return { reservedBrains: 0 }
  }

  const plantHero = state.plantHero
  const lanes = state.lanes

  // 1. Lethal / Direct Face Damage Buff Reservation:
  // If we have an unblocked zombie with decent attack and a buff trick that can deal massive face damage
  const unblockedZombies = lanes.filter((l) => l.zombieMinion && !l.plantMinion && !l.zombieMinion.isFrozen)
  if (unblockedZombies.length > 0) {
    // Check Lurch for Lunch (cost 2)
    const lurch = playableTricks.find((c) => c.id === 'zombie_lurch_for_lunch' && c.cost <= resource)
    if (lurch && unblockedZombies.some((l) => l.zombieMinion!.currentAttack >= 2)) {
      return {
        reservedBrains: lurch.cost,
        targetTrick: lurch,
        reason: 'Reserving brains for Lurch for Lunch bonus face attack on unblocked zombie',
      }
    }

    // Check Brute Strength (cost 2 or 1 for superpower)
    const brute = playableTricks.find(
      (c) => (c.id === 'zombie_brute_strength' || c.id === 'sp_brute_strength') && c.cost <= resource
    )
    if (brute) {
      return {
        reservedBrains: brute.cost,
        targetTrick: brute,
        reason: 'Reserving brains for Brute Strength (+3 ATK) face damage',
      }
    }

    // Check Going Viral (cost 3)
    const viral = playableTricks.find((c) => c.id === 'zombie_going_viral' && c.cost <= resource)
    if (viral && (archetype === 'tempo' || archetype === 'combo' || archetype === 'aggro')) {
      return {
        reservedBrains: viral.cost,
        targetTrick: viral,
        reason: 'Reserving brains for Going Viral team-wide frenzy buff',
      }
    }
  }

  // 2. High-Threat Removal Reservation:
  // If opposing plant minion has >= 5 Attack, reserve for Cut Down to Size (cost 1)
  const cutDown = playableTricks.find((c) => c.id.includes('cut_down_to_size') && c.cost <= resource)
  const has5AtkPlant = lanes.some((l) => l.plantMinion && l.plantMinion.currentAttack >= 5 && !isUntrickable(l.plantMinion))
  if (cutDown && has5AtkPlant) {
    return {
      reservedBrains: cutDown.cost,
      targetTrick: cutDown,
      reason: 'Reserving brains for Cut Down to Size removal',
    }
  }

  // Rocket Science (cost 3) against 4+ Attack plants
  const rocket = playableTricks.find((c) => c.id === 'zombie_rocket_science' && c.cost <= resource)
  const has4AtkPlant = lanes.some((l) => l.plantMinion && l.plantMinion.currentAttack >= 4 && !isUntrickable(l.plantMinion))
  if (rocket && (has4AtkPlant || (archetype === 'control' && plantHero.sun >= 4))) {
    return {
      reservedBrains: rocket.cost,
      targetTrick: rocket,
      reason: 'Reserving brains for Rocket Science against 4+ attack plants',
    }
  }

  // Locust Swarm (cost 5): Unconditional hard removal for high-threat plants
  const locust = playableTricks.find((c) => c.id === 'zombie_locust_swarm' && c.cost <= resource)
  const highThreatPlant = lanes.some(
    (l) =>
      l.plantMinion &&
      (evaluateMinionThreat(l, 'plants') >= 5 ||
        l.plantMinion.currentAttack >= (archetype === 'control' ? 2 : 3) ||
        l.plantMinion.currentHealth >= 4) &&
      !isUntrickable(l.plantMinion)
  )
  if (locust && (highThreatPlant || (archetype === 'control' && resource <= 8 && plantHero.sun >= 5))) {
    return {
      reservedBrains: locust.cost,
      targetTrick: locust,
      reason: 'Preserving all brains for high-value Tricks in ZOMBIE_TRICKS phase',
    }
  }

  // Weed Spray (cost 3): Wipe small swarms
  const weedSpray = playableTricks.find((c) => c.id === 'zombie_weed_spray' && c.cost <= resource)
  const smallPlantsCount = lanes.filter((l) => l.plantMinion && l.plantMinion.currentAttack <= 2 && !isUntrickable(l.plantMinion)).length
  if (weedSpray && (smallPlantsCount >= 2 || (smallPlantsCount >= 1 && archetype === 'control'))) {
    return {
      reservedBrains: weedSpray.cost,
      targetTrick: weedSpray,
      reason: 'Reserving brains for Weed Spray against small plants',
    }
  }

  // Bungee Plumber (cost 1): Snipe low health plant or burn face
  const bungee = playableTricks.find((c) => c.id === 'zombie_bungee_plumber' && c.cost <= resource)
  const killablePlant = lanes.some((l) => l.plantMinion && l.plantMinion.currentHealth <= 2 && !isUntrickable(l.plantMinion))
  if (bungee && killablePlant && (archetype === 'control' || archetype === 'tempo')) {
    return {
      reservedBrains: bungee.cost,
      targetTrick: bungee,
      reason: 'Reserving brains for Bungee Plumber snipe',
    }
  }

  // Bad Moon Rising (cost 7): In combo archetype with >= 2 zombies on board
  const bmr = playableTricks.find((c) => c.id === 'zombie_bad_moon_rising' && c.cost <= resource)
  const zombieCount = lanes.filter((l) => l.zombieMinion).length
  if (bmr && zombieCount >= 2 && (archetype === 'combo' || archetype === 'control')) {
    return {
      reservedBrains: bmr.cost,
      targetTrick: bmr,
      reason: `Reserving brains for Bad Moon Rising to transform ${zombieCount} zombies`,
    }
  }

  return { reservedBrains: 0 }
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

    // Calculate dynamic brain reservation for upcoming ZOMBIE_TRICKS
    const reservation = reserveBrainsForTricks(state, hand, resource, archetype, difficulty)
    if (reservation.reservedBrains > 0) {
      const availableBrainsForMinions = resource - reservation.reservedBrains
      const affordableMinions = playableMinions.filter((m) => m.cost <= availableBrainsForMinions)
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
            reason: `Preserving ${reservation.reservedBrains} brains for tricks while deploying ${cheapMinion.name}`,
          }
        }
      } else {
        return {
          action: 'PASS',
          reason: reservation.reason || 'Preserving all brains for high-value Tricks in ZOMBIE_TRICKS phase',
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

    // COMBO ARCHETYPE: Prioritizes protecting high-synergy engines (Dr. Spacetime, Valkyrie)
    // or deploying cheap swarm units into open lanes to prepare for Going Viral / BMR finishers
    if (archetype === 'combo') {
      const comboEngine = playableMinions.find(
        (m) =>
          m.id === 'zombie_dr_spacetime' ||
          m.id === 'zombie_valkyrie' ||
          m.id === 'zombie_interdimensional_zombie' ||
          m.id === 'zombie_zombology_teacher'
      )
      if (comboEngine) {
        // Place engine in safe open lane if possible
        const safeOpenLane = openLanes.find(({ lane }) => canPlayCardToLane(comboEngine, lane, 'zombies').allowed)
        if (safeOpenLane) {
          return {
            action: 'PLAY_MINION',
            card: comboEngine,
            laneIndex: safeOpenLane.idx,
            reason: `Combo AI deploys engine minion ${comboEngine.name} in safe open lane ${safeOpenLane.idx + 1}`,
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

// ========================================================
// 4. DYNAMIC BOSS & HERO DIALOGUE TRIGGERS
// ========================================================

export type DialogueTriggerType =
  | 'SIGNATURE_SUPERPOWER'
  | 'LOW_HP'
  | 'DESTROY_KEY_MINION'
  | 'TAUNT_VICTORY'

export interface DialogueContext {
  superpowerId?: string
  superpowerName?: string
  heroHp?: number
  destroyedMinionName?: string
  laneIndex?: number
}

export interface AIDialogueOutput {
  text: string
  emoji: string
  trigger: DialogueTriggerType
  heroId: string
}

export interface HeroDialogueSet {
  superpower: { text: string; emoji: string }
  lowHp: { text: string; emoji: string }
  destroyMinion: { text: string; emoji: string }
  victoryTaunt?: { text: string; emoji: string }
}

/**
 * Authentic personality dialogues for all 20 PvZ Heroes (10 Plants, 10 Zombies)
 * plus Beta-Carrotina and Huge-Gigantacus.
 */
export const HERO_DYNAMIC_DIALOGUES: Record<string, HeroDialogueSet> = {
  // --- 10 PLANT HEROES ---
  hero_green_shadow: {
    superpower: {
      text: 'Tia đạn Precision Blast chuẩn xác vào hồng tâm! Đừng hòng trốn thoát!',
      emoji: '🎯',
    },
    lowHp: {
      text: 'Lá chắn rách nhưng ý chí xạ thủ không lùi bước! Một phát bắn nữa là định đoạt!',
      emoji: '🏹',
    },
    destroyMinion: {
      text: 'Hạ gục mục tiêu nguy hiểm! Chiến tuyến thảo mộc đã an toàn trở lại.',
      emoji: '🌿',
    },
    victoryTaunt: {
      text: 'Bắn tỉa bách phát bách trúng. Công lý luôn thuộc về thảo mộc!',
      emoji: '🏆',
    },
  },

  hero_solar_flare: {
    superpower: {
      text: 'Cháy rực rỡ nào! Tia nắng Sunburn thiêu đốt và tiếp thêm ánh dương vĩnh cửu!',
      emoji: '☀️',
    },
    lowHp: {
      text: 'Nóng thế này mà đã bỏ cuộc sao? Bão mặt trời sắp bùng nổ rồi đấy!',
      emoji: '🔥',
    },
    destroyMinion: {
      text: 'Bùm! Biến thành tro bụi trước sức nóng của ánh mặt trời nhé cưng!',
      emoji: '💥',
    },
    victoryTaunt: {
      text: 'Mặt trời luôn chiếu sáng rực rỡ nhất sau cơn bão lửa!',
      emoji: '🌻',
    },
  },

  hero_wall_knight: {
    superpower: {
      text: 'Bất khả xâm phạm! Lớp vỏ Uncrackable này đao thương bất nhập!',
      emoji: '🛡️',
    },
    lowHp: {
      text: 'Vỏ có nứt nhưng ruột quả hạch vẫn cứng như thép! Đố đập vỡ được ta!',
      emoji: '🌰',
    },
    destroyMinion: {
      text: 'Một cú lăn nghiền nát! Không ai vượt qua được bức tường kiên cố này.',
      emoji: '🧱',
    },
    victoryTaunt: {
      text: 'Kiên cố như tường thành ngàn năm! Cố thêm chút nữa xem nào.',
      emoji: '🏰',
    },
  },

  hero_chompzilla: {
    superpower: {
      text: 'Ngoạm một phát nuốt chửng! Devour không chừa lại một mẩu xương nào!',
      emoji: '🦖',
    },
    lowHp: {
      text: 'Grrrr... Càng đói bụng thì cú cắn của Chompzilla lại càng hung dữ!',
      emoji: '🦷',
    },
    destroyMinion: {
      text: 'Ngon tuyệt cú mèo! Cảm ơn vì bữa trưa giàu đạm nhé Zombie!',
      emoji: '🍽️',
    },
    victoryTaunt: {
      text: 'Ục ục... No nê cả bụng! Sân vườn này là địa bàn săn mồi của ta!',
      emoji: '🍖',
    },
  },

  hero_spudow: {
    superpower: {
      text: 'Củ khoai tây Hothead nổ tanh bành! Ai dám chạm vào là lãnh đủ 6 sát thương!',
      emoji: '🥔',
    },
    lowHp: {
      text: 'Sắp nổ tung rồi! Nhưng củ khoai này sẽ kéo theo cả nghĩa địa xuống mồ!',
      emoji: '💣',
    },
    destroyMinion: {
      text: 'KABOOM! Củ khoai phát nổ và mục tiêu biến mất không dấu vết!',
      emoji: '💥',
    },
    victoryTaunt: {
      text: 'Nổ to thế mới đã tai chứ! Khoai tây củ bự bất khả chiến bại!',
      emoji: '🎆',
    },
  },

  hero_citron: {
    superpower: {
      text: 'Kích hoạt Peel Shield tương lai! Toàn bộ đội hình thảo mộc bất tử!',
      emoji: '🍊',
    },
    lowHp: {
      text: 'Hệ thống phòng thủ báo động đỏ! Khởi động giao thức phản công lượng tử!',
      emoji: '⚡',
    },
    destroyMinion: {
      text: 'Vũ khí công nghệ cao đã vô hiệu hóa mối đe dọa sinh học!',
      emoji: '🛸',
    },
    victoryTaunt: {
      text: 'Nhiệm vụ bảo vệ dòng thời gian thành công tốt đẹp!',
      emoji: '🚀',
    },
  },

  hero_grass_knuckles: {
    superpower: {
      text: 'Nắm đấm Power Pummel chấn động cả 3 làn đất! Đỡ đòn này xem!',
      emoji: '👊',
    },
    lowHp: {
      text: 'Cơ bắp này chưa biết đầu hàng là gì! Hiệp cuối cùng mới là lúc ta đấm hăng nhất!',
      emoji: '🥊',
    },
    destroyMinion: {
      text: 'Knockout một phát đo ván! Cỏ cơ bắp không có đối thủ trên võ đài!',
      emoji: '🏆',
    },
    victoryTaunt: {
      text: 'Một hai ba đếm lùi! Nhà vô địch tuyệt đối của sàn đấu!',
      emoji: '🥇',
    },
  },

  hero_nightcap: {
    superpower: {
      text: 'Từ trong bóng tối, Mush-Boom trỗi dậy và phun chất độc hạ gục kẻ địch!',
      emoji: '🍄',
    },
    lowHp: {
      text: 'Ninja ẩn mình trong bóng đêm... Ngươi tưởng thấy ta nhưng ngươi đã lầm!',
      emoji: '🥷',
    },
    destroyMinion: {
      text: 'Một đòn chí mạng thầm lặng. Kẻ thù ngã xuống mà không kịp kêu lên một tiếng.',
      emoji: '🗡️',
    },
    victoryTaunt: {
      text: 'Bóng đêm đã nuốt chửng tất cả. Nghệ thuật nhẫn giả là bất bại.',
      emoji: '🌑',
    },
  },

  hero_rose: {
    superpower: {
      text: 'Úm ba la! Goatify biến quái vật to xác thành chú dê con be he ngốc nghếch!',
      emoji: '🐐',
    },
    lowHp: {
      text: 'Cánh hoa có rơi rụng nhưng gai nhọn ma thuật vẫn sẽ cào nát đối thủ!',
      emoji: '🌹',
    },
    destroyMinion: {
      text: 'Phép thuật cổ xưa thanh tẩy chiến trường! Quá dễ dàng cho quý cô Rose.',
      emoji: '✨',
    },
    victoryTaunt: {
      text: 'Một kết cục quý phái và thanh lịch. Không ai cưỡng lại được phép màu!',
      emoji: '👑',
    },
  },

  hero_captain_combustible: {
    superpower: {
      text: 'Bùng cháy lên! Blazing Bark gia tăng +4 sức mạnh công phá hủy diệt!',
      emoji: '🪵',
    },
    lowHp: {
      text: 'NGỌN LỬA CUỒNG NỘ BÙNG CHÁY! Thân gỗ này sẽ thiêu rụi toàn bộ kẻ thù!',
      emoji: '🔥',
    },
    destroyMinion: {
      text: 'THIÊU CHÁY THÀNH TRO! Không gì cản nổi sức mạnh của ngọn lửa!',
      emoji: '🌋',
    },
    victoryTaunt: {
      text: 'HỎA NGỤC THIÊU RỤI TẤT CẢ! Thuyền trưởng luôn là ngọn đuốc sáng nhất!',
      emoji: '🎇',
    },
  },

  // --- 10 ZOMBIE HEROES ---
  hero_super_brainz: {
    superpower: {
      text: 'Vút bay trên không trung! Carried Away mang Zombie đến thẳng mặt đối thủ và tung cú đấm bất ngờ!',
      emoji: '🦸‍♂️',
    },
    lowHp: {
      text: 'Tóc vuốt keo của ta có thể rối, nhưng nụ cười anh hùng này không bao giờ vụt tắt!',
      emoji: '✨',
    },
    destroyMinion: {
      text: 'Cú đấm siêu anh hùng! Ngắm nhìn cơ bắp cuồn cuộn này mà học tập đi lũ cây cỏ!',
      emoji: '💪',
    },
    victoryTaunt: {
      text: 'Chiến thắng hoàn hảo không một vết ố trên áo choàng!',
      emoji: '🦸‍♂️',
    },
  },

  hero_the_smash: {
    superpower: {
      text: 'SMASH ĐẬP BẸP! Slammin\' Smash nghiền nát cây cỏ dưới gót chân khổng lồ!',
      emoji: '🤼',
    },
    lowHp: {
      text: 'The Smash đang NỔI ĐIÊN! Ai dám làm trầy da nhà vô địch đô vật?',
      emoji: '😡',
    },
    destroyMinion: {
      text: 'Bẹp như bánh tráng! Không một ngọn cỏ nào chịu nổi một cú đè của ta!',
      emoji: '💥',
    },
    victoryTaunt: {
      text: 'THE SMASH LÀ SỐ MỘT! ĐẬP NÁT MỌI THỨ!',
      emoji: '🥇',
    },
  },

  hero_impfinity: {
    superpower: {
      text: 'Hehehe! Triple Threat nhân bản thành binh đoàn tí hon quậy phá khắp các làn!',
      emoji: '😈',
    },
    lowHp: {
      text: 'Tụi tao đông như kiến! Ngươi đập một con, mười con khác sẽ nhảy vào cắn xé!',
      emoji: '🏃',
    },
    destroyMinion: {
      text: 'Lũ cây to xác ngã rồi! Tí hon nhưng đấm hơi bị đau đấy nhé!',
      emoji: '🎉',
    },
    victoryTaunt: {
      text: 'Nhìn quanh mà xem! Đâu đâu cũng là bản sao quậy phá của Impfinity!',
      emoji: '🤡',
    },
  },

  hero_rustbolt: {
    superpower: {
      text: 'Kích hoạt tia Shrink Ray! Thu nhỏ sức mạnh và sạc thêm dữ liệu khoa học!',
      emoji: '🤖',
    },
    lowHp: {
      text: 'Bộ giáp sắt rỉ sét nhưng lõi năng lượng vẫn hoạt động 100%! Bắt đầu phản công!',
      emoji: '⚙️',
    },
    destroyMinion: {
      text: 'Khoa học Zombie chính xác tuyệt đối! Mối đe dọa thực vật đã bị triệt tiêu.',
      emoji: '🧪',
    },
    victoryTaunt: {
      text: 'Phương trình đã giải xong. Kết quả duy nhất: Chiến thắng tuyệt đối!',
      emoji: '🔋',
    },
  },

  hero_electric_boogaloo: {
    superpower: {
      text: 'Stayin\' Alive! Giật điện 3 sát thương và nhảy múa hồi phục 3 máu cực sung!',
      emoji: '🕺',
    },
    lowHp: {
      text: 'Nhạc chưa tàn thì sàn nhảy chưa dừng! Hãy xem điệu nhảy lật kèo của Boogaloo!',
      emoji: '⚡',
    },
    destroyMinion: {
      text: 'Một cú giật điện tê tái! Cháy đen thành than trên sàn nhảy Disco rồi nhé!',
      emoji: '🪩',
    },
    victoryTaunt: {
      text: 'Disco thập niên 70 bất tử! Vỗ tay cho ông hoàng sàn nhảy nào!',
      emoji: '🕺',
    },
  },

  hero_brain_freeze: {
    superpower: {
      text: 'Cơn bão tuyết Frozen Tundra đóng băng toàn bộ cây cỏ trên các làn đất!',
      emoji: '❄️',
    },
    lowHp: {
      text: 'Hàn khí ngàn năm sắp bùng phát! Một khối băng vĩnh cửu không dễ tan chảy đâu!',
      emoji: '🥶',
    },
    destroyMinion: {
      text: 'Đóng băng và vỡ vụn! Mùa đông bất tận đã chôn vùi đối thủ.',
      emoji: '🧊',
    },
    victoryTaunt: {
      text: 'Kỷ Băng Hà đã bao trùm sân cỏ. Lạnh lẽo và cô độc!',
      emoji: '🌨️',
    },
  },

  hero_professor_brainstorm: {
    superpower: {
      text: 'EUREKA! Bộ não thiên tài phát minh ra 3 bảo bối khoa học đỉnh cao!',
      emoji: '🧠',
    },
    lowHp: {
      text: 'Tỉ lệ sống sót còn 5%? Đúng theo tính toán của ta, thời khắc lật ngược thế cờ đã tới!',
      emoji: '🔬',
    },
    destroyMinion: {
      text: 'Thí nghiệm thành công mĩ mãn! Cây cỏ không có cửa đọ trí thông minh với ta.',
      emoji: '💡',
    },
    victoryTaunt: {
      text: 'Khoa học luôn luôn chiến thắng mê tín dị đoan và rau cỏ!',
      emoji: '⚗️',
    },
  },

  hero_immorticia: {
    superpower: {
      text: 'Bay đi dơi đêm Zombat! Witch\'s Familiar rình rập và hút cạn chất xám của đối thủ!',
      emoji: '🧙‍♀️',
    },
    lowHp: {
      text: 'Hắc ma thuật cổ đại đang trỗi dậy từ cõi chết! Ngươi chưa thắng được ta đâu!',
      emoji: '🦇',
    },
    destroyMinion: {
      text: 'Một linh hồn nữa về với nghĩa địa. Lời nguyền của Immorticia đã ứng nghiệm!',
      emoji: '🔮',
    },
    victoryTaunt: {
      text: 'Đêm nay thuộc về phù thủy tối thượng. Trăng máu muôn năm!',
      emoji: '🌙',
    },
  },

  hero_z_mech: {
    superpower: {
      text: 'Phóng toàn bộ hỏa lực Missile Madness! Mưa tên lửa hủy diệt mọi mục tiêu!',
      emoji: '🚀',
    },
    lowHp: {
      text: 'Hệ thống giáp cảnh báo nguy cấp! Tự động chuyển sang chế độ đồ sát liều mạng!',
      emoji: '⚠️',
    },
    destroyMinion: {
      text: 'Mục tiêu bị xóa sổ hoàn toàn! Đừng bao giờ đùa với hỏa lực hạng nặng của Z-Mech!',
      emoji: '💥',
    },
    victoryTaunt: {
      text: 'Mọi chướng ngại vật đã bị nghiền nát dưới bánh xích thép!',
      emoji: '🤖',
    },
  },

  hero_neptuna: {
    superpower: {
      text: 'Bạch tuộc Octo-Pult xuất kích! Chiếm lĩnh làn nước và siết chặt chiến trường!',
      emoji: '🐙',
    },
    lowHp: {
      text: 'Sóng ngầm biển sâu đang cuộn trào! Cơn thịnh nộ của nữ hoàng đại dương sắp giáng xuống!',
      emoji: '🌊',
    },
    destroyMinion: {
      text: 'Bị xúc tu kéo xuống đáy biển sâu! Làn nước thuộc về quyền năng của Neptuna.',
      emoji: '🔱',
    },
    victoryTaunt: {
      text: 'Toàn bộ thế giới đã bị chìm trong thủy cung bất tận!',
      emoji: '🐚',
    },
  },

  // --- BONUS HEROES ---
  hero_beta_carrotina: {
    superpower: {
      text: 'Khuếch đại gen Genetic Amplification! Chiến binh tí hon sẵn sàng cứu rỗi thiên hà!',
      emoji: '🥕',
    },
    lowHp: {
      text: 'Bảo vệ hạm đội đến hơi thở cuối cùng! Ánh sáng công lý sẽ không bao giờ tắt!',
      emoji: '🚀',
    },
    destroyMinion: {
      text: 'Quét sạch mục tiêu xâm lăng! Thiên hà xanh lại yên bình.',
      emoji: '🌟',
    },
    victoryTaunt: {
      text: 'Hạm đội Beta-Carrotina đã hoàn thành sứ mệnh ngân hà!',
      emoji: '🛸',
    },
  },

  hero_huge_gigantacus: {
    superpower: {
      text: 'Terror-Former 10,000 kích hoạt! Toàn bộ công nghệ tối thượng giảm giá sập sàn!',
      emoji: '👾',
    },
    lowHp: {
      text: 'Chúa tể tí hon chưa bao giờ chịu khuất phục! Cỗ máy ngày tận thế sắp khai hỏa!',
      emoji: '🛸',
    },
    destroyMinion: {
      text: 'Tiêu diệt chướng ngại vật! Thành phố này sắp hoàn toàn thuộc về ta!',
      emoji: '🏙️',
    },
    victoryTaunt: {
      text: 'Ngước nhìn lên đi! Huge-Gigantacus là kẻ thống trị vĩ đại nhất!',
      emoji: '👑',
    },
  },
}

/**
 * Returns dynamic dialogue bubble content for an AI Hero or Boss based on game events:
 * 1. SIGNATURE_SUPERPOWER: When activating their signature superpower
 * 2. LOW_HP: When Hero HP drops to <= 5 (critical survival condition)
 * 3. DESTROY_KEY_MINION: When eliminating an enemy minion of high threat
 * 4. TAUNT_VICTORY: Optional victory/taunt emote
 */
export function getAIDynamicDialogue(
  heroId: string,
  trigger: DialogueTriggerType,
  context?: DialogueContext
): AIDialogueOutput {
  // Normalize hero ID (e.g., 'hero_green_shadow', 'green_shadow', 'Green Shadow')
  const cleanId = heroId.toLowerCase().replace(/[\s-]/g, '_')
  const standardKey = cleanId.startsWith('hero_') ? cleanId : `hero_${cleanId}`

  const heroQuotes = HERO_DYNAMIC_DIALOGUES[standardKey] || HERO_DYNAMIC_DIALOGUES[cleanId]

  if (heroQuotes) {
    switch (trigger) {
      case 'SIGNATURE_SUPERPOWER':
        return {
          text: heroQuotes.superpower.text,
          emoji: heroQuotes.superpower.emoji,
          trigger,
          heroId,
        }
      case 'LOW_HP':
        return {
          text: heroQuotes.lowHp.text,
          emoji: heroQuotes.lowHp.emoji,
          trigger,
          heroId,
        }
      case 'DESTROY_KEY_MINION': {
        const text = context?.destroyedMinionName
          ? `${context.destroyedMinionName} đã bị tiêu diệt! ${heroQuotes.destroyMinion.text}`
          : heroQuotes.destroyMinion.text
        return {
          text,
          emoji: heroQuotes.destroyMinion.emoji,
          trigger,
          heroId,
        }
      }
      case 'TAUNT_VICTORY':
        return {
          text: heroQuotes.victoryTaunt?.text || 'Chiến thắng không thể chối cãi!',
          emoji: heroQuotes.victoryTaunt?.emoji || '🏆',
          trigger,
          heroId,
        }
    }
  }

  // Thematic fallback if hero is custom or not in database
  switch (trigger) {
    case 'SIGNATURE_SUPERPOWER':
      return {
        text: 'Khai hỏa Siêu Năng Lực tối thượng! Hãy xem sức mạnh thực sự của ta!',
        emoji: '⚡',
        trigger,
        heroId,
      }
    case 'LOW_HP':
      return {
        text: 'Máu sắp cạn nhưng tinh thần chiến đấu vẫn rực cháy! Lật kèo nào!',
        emoji: '💥',
        trigger,
        heroId,
      }
    case 'DESTROY_KEY_MINION':
      return {
        text: context?.destroyedMinionName
          ? `Mục tiêu ${context.destroyedMinionName} đã bị hạ gục không thương tiếc!`
          : 'Một mục tiêu then chốt đã ngã gục! Chiến thắng đang trong tầm tay!',
        emoji: '🎯',
        trigger,
        heroId,
      }
    case 'TAUNT_VICTORY':
      return {
        text: 'Không ai có thể đánh bại được ta trên đấu trường này!',
        emoji: '🏆',
        trigger,
        heroId,
      }
  }
}

