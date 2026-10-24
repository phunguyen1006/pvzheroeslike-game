import type { GameState, Side, Card, LaneState } from './types'
import { canPlayCardToLane } from './reducer'

export interface AIDecision {
  action: 'PLAY_MINION' | 'PLAY_TRICK' | 'PLAY_SUPERPOWER' | 'PASS'
  card?: Card
  laneIndex?: number
  targetHero?: boolean
  reason?: string
}

export type AIDifficulty = 'easy' | 'normal' | 'expert'

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
 * Evaluates the danger of an enemy minion on the board.
 * Higher score = higher priority to block or eliminate.
 */
function evaluateMinionThreat(lane: LaneState, enemySide: Side): number {
  const minion = enemySide === 'plants' ? lane.plantMinion : lane.zombieMinion
  if (!minion) return 0

  let threat = minion.currentAttack * 2 + minion.currentHealth
  if (minion.traits?.some((t: any) => t === 'doubleStrike' || t === 'double-strike')) threat += 5
  if (minion.traits?.includes('strikethrough')) threat += 4
  if (minion.traits?.includes('frenzy')) threat += 4
  if (minion.traits?.includes('deadly')) threat += 4
  if (minion.currentAttack >= 4) threat += 3

  return threat
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

  // 1. Check direct damage tricks
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
  } else {
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
 */
export function getAIDecision(
  state: GameState,
  side: Side,
  difficulty: AIDifficulty = 'normal'
): AIDecision {
  const isZombie = side === 'zombies'
  const hand = isZombie ? state.zombieHand : state.plantHand
  const myHero = isZombie ? state.zombieHero : state.plantHero
  const resource = isZombie ? myHero.brains : myHero.sun

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
    if (playableMinions.length === 0) return { action: 'PASS' }

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

    const shouldPreserveBrains =
      difficulty === 'expert' &&
      highValueTricks.length > 0 &&
      resource <= 6 &&
      state.lanes.some((l) => l.plantMinion && l.plantMinion.currentAttack >= 3)

    if (shouldPreserveBrains) {
      // Find a cheaper minion so we leave at least 2-3 brains for tricks
      const affordableMinions = playableMinions.filter((m) => m.cost <= resource - 2)
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

    // C. Threat Mitigation: Block unblocked dangerous Plant lanes
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

    // D. Aggression: Exploit Open Lanes to hit Plant Hero directly
    const openLanes = state.lanes
      .map((lane, idx) => ({ lane, idx }))
      .filter(({ lane }) => !lane.zombieMinion && !lane.plantMinion)

    if (openLanes.length > 0) {
      // Pick highest attack or Bullseye/Frenzy minion for face pressure
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

    // E. Fallback: Any available open slot
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

    // B. Bad Moon Rising: If we have >= 2 Zombies on board, transform them
    const bmr = playableTricks.find((c) => c.id === 'zombie_bad_moon_rising')
    const zombieCount = state.lanes.filter((l) => l.zombieMinion).length
    if (bmr && zombieCount >= 2) {
      return {
        action: 'PLAY_TRICK',
        card: bmr,
        reason: `Bad Moon Rising transforms ${zombieCount} zombies`,
      }
    }

    // C. Hard Removal: Rocket Science on plants with >= 4 Attack
    const rocket = playableTricks.find((c) => c.id === 'zombie_rocket_science')
    if (rocket) {
      const highAtkPlantIdx = state.lanes.findIndex(
        (l) => l.plantMinion && l.plantMinion.currentAttack >= 4
      )
      if (highAtkPlantIdx !== -1) {
        return {
          action: 'PLAY_TRICK',
          card: rocket,
          laneIndex: highAtkPlantIdx,
          reason: 'Rocket Science neutralizes high attack plant',
        }
      }
    }

    // D. Hard Removal: Locust Swarm on strongest Plant minion
    const locust = playableTricks.find((c) => c.id === 'zombie_locust_swarm')
    if (locust) {
      const strongestPlantIdx = state.lanes.reduce((best, lane, idx) => {
        if (!lane.plantMinion) return best
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
          reason: 'Locust Swarm destroys highest threat plant',
        }
      }
    }

    // E. AOE Wipe: Weed Spray against plants with <= 2 Attack
    const weedSpray = playableTricks.find((c) => c.id === 'zombie_weed_spray')
    if (weedSpray) {
      const smallPlantsCount = state.lanes.filter(
        (l) => l.plantMinion && l.plantMinion.currentAttack <= 2
      ).length
      if (smallPlantsCount >= 2 || (smallPlantsCount >= 1 && difficulty === 'expert')) {
        return {
          action: 'PLAY_TRICK',
          card: weedSpray,
          reason: `Weed Spray eliminates ${smallPlantsCount} swarm plants`,
        }
      }
    }

    // F. Direct Damage: Bungee Plumber to eliminate low HP plant
    const bungee = playableTricks.find((c) => c.id === 'zombie_bungee_plumber')
    if (bungee) {
      const killablePlantIdx = state.lanes.findIndex(
        (l) => l.plantMinion && l.plantMinion.currentHealth <= 2
      )
      if (killablePlantIdx !== -1) {
        return {
          action: 'PLAY_TRICK',
          card: bungee,
          laneIndex: killablePlantIdx,
          reason: 'Bungee Plumber finishes off low health plant',
        }
      }
    }

    // G. Buff / Bonus Attack: Lurch for Lunch on high damage Zombie
    const lurch = playableTricks.find((c) => c.id === 'zombie_lurch_for_lunch')
    if (lurch) {
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

    // H. Environment: Area 22 (+2/+2 & Frenzy)
    const area22 = playableTricks.find((c) => c.id === 'zombie_area_22')
    if (area22) {
      const livingZombieLane = state.lanes.findIndex((l) => l.zombieMinion && !l.environment)
      if (livingZombieLane !== -1) {
        return {
          action: 'PLAY_TRICK',
          card: area22,
          laneIndex: livingZombieLane,
          reason: 'Area 22 empowers zombie with +2/+2 & Frenzy',
        }
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

    // B. Removal Tricks (Squash, Shamrocket, Cherry Bomb, Berry Blast)
    const squash = playableCards.find((c) => c.id === 'plant_squash')
    if (squash) {
      const dangerousZombieIdx = state.lanes.findIndex(
        (l) => l.zombieMinion && evaluateMinionThreat(l, 'zombies') >= 6
      )
      if (dangerousZombieIdx !== -1) {
        return {
          action: 'PLAY_TRICK',
          card: squash,
          laneIndex: dangerousZombieIdx,
          reason: 'Squash crushes high threat zombie',
        }
      }
    }

    const shamrocket = playableCards.find((c) => c.id === 'plant_shamrocket')
    if (shamrocket) {
      const bigZombieIdx = state.lanes.findIndex(
        (l) => l.zombieMinion && l.zombieMinion.currentAttack >= 4
      )
      if (bigZombieIdx !== -1) {
        return {
          action: 'PLAY_TRICK',
          card: shamrocket,
          laneIndex: bigZombieIdx,
          reason: 'Shamrocket destroys 4+ attack zombie',
        }
      }
    }

    const berryBlast = playableCards.find((c) => c.id === 'plant_berry_blast')
    if (berryBlast) {
      const targetZombieIdx = state.lanes.findIndex(
        (l) => l.zombieMinion && l.zombieMinion.currentHealth <= 3
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

    // C. Environments: Spikeweed Sector & Planet of the Grapes
    const spikeweed = playableCards.find((c) => c.id === 'plant_spikeweed_sector')
    if (spikeweed) {
      const targetLane = state.lanes.findIndex((l) => l.zombieMinion && !l.environment)
      if (targetLane !== -1) {
        return {
          action: 'PLAY_TRICK',
          card: spikeweed,
          laneIndex: targetLane,
          reason: 'Spikeweed Sector damages zombie before combat',
        }
      }
    }

    // D. Minions Placement
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
  difficulty: AIDifficulty = 'normal',
  maxActions = 4
): AIDecision[] {
  const plan: AIDecision[] = []
  let simulatedState = { ...initialState }
  let remainingActions = maxActions

  while (remainingActions > 0) {
    const decision = getAIDecision(simulatedState, side, difficulty)
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
