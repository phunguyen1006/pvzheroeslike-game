/**
 * PvZ Heroes Replicate - Cascade Death Trigger System
 * Handles reactions when minions are destroyed (e.g. Valkyrie in hand, Punish-Shroom on board, Hothead on-death explosion).
 */

import type { GameState, Minion, Card, CombatEvent, DeathTriggerResult } from './types'
import { applyHeroDamage, getPendingSuperBlockForHero } from './combat'

/**
 * Maximum recursive depth for cascading triggers to prevent infinite loops
 */
const MAX_CASCADE_DEPTH = 10

/**
 * Checks if a minion belongs to the Mushroom tribe
 */
export function isMushroomMinion(minion: Minion): boolean {
  const cardId = minion.cardId.toLowerCase()
  const name = minion.name.toLowerCase()
  return (
    cardId.includes('shroom') ||
    cardId.includes('mushroom') ||
    name.includes('shroom') ||
    name.includes('mushroom')
  )
}

/**
 * Converts an active Minion to a Card instance for graveyard storage
 */
export function minionToCard(minion: Minion): Card {
  return {
    id: minion.cardId,
    name: minion.name,
    side: minion.side,
    cost: 0,
    attack: minion.baseAttack,
    health: minion.maxHealth,
    type: 'minion',
    image: minion.image,
    traits: minion.traits,
    amphibious: minion.amphibious,
    bullseye: minion.bullseye,
    teamUp: minion.teamUp,
    frenzy: minion.frenzy,
    deadly: minion.deadly,
    strikethrough: minion.strikethrough,
    armored: minion.armored,
    freeze: minion.freeze,
    antiHero: minion.antiHero,
    doubleStrike: minion.doubleStrike,
  }
}

export interface TriggerDeathOptions {
  depth?: number
  // Optional deterministic target picker for tests or AI simulation:
  // picks 'hero' or minion index among live zombies
  preferredTarget?: 'hero' | 'minion'
  targetLaneIndex?: number
}

/**
 * Main cascade trigger function executed when a minion is destroyed
 *
 * Reactions handled:
 * 1. Self On-Death:
 *    - Hothead (`plant_hothead`): Deals 6 damage to a Zombie here.
 *    - Pear Cub (`plant_pear_cub`): Spawns a 5/4 Grizzly Pear here.
 *    - Gas Giant (`zombie_gas_giant`): Deals 5 damage here and 1 to all other Plants and Plant Hero.
 * 2. In-Hand Reactions:
 *    - Valkyrie (`zombie_valkyrie`): While in hand, gains +2 Attack when any Zombie is destroyed.
 * 3. Board Reactions:
 *    - Punish-Shroom (`plant_punish_shroom`): When a Mushroom is destroyed (including itself),
 *      deals 2 damage to a random Zombie or the Zombie Hero.
 *    - Frankentuar (`zombie_frankentuar`): When any Zombie is destroyed, gets +1/+1.
 *    - Sharktronic Sub (`zombie_zombot_sharktronic_sub`): When a Plant is destroyed, gets +1 Attack.
 *
 * If any reaction destroys another minion, it recursively cascades triggerOnDeath!
 */
export function triggerOnDeath(
  state: GameState,
  deadMinion: Minion,
  deadLaneIndex: number,
  options?: TriggerDeathOptions
): DeathTriggerResult {
  const depth = options?.depth ?? 0
  if (depth > MAX_CASCADE_DEPTH) {
    return { updatedState: state, events: [], logs: [] }
  }

  // Immutable copy of state
  let updatedState: GameState = {
    ...state,
    lanes: state.lanes.map(l => ({ ...l })),
    plantHand: state.plantHand.map(c => ({ ...c })),
    zombieHand: state.zombieHand.map(c => ({ ...c })),
    plantGraveyard: [...state.plantGraveyard],
    zombieGraveyard: [...state.zombieGraveyard],
    plantHero: { ...state.plantHero },
    zombieHero: { ...state.zombieHero },
  }

  const events: CombatEvent[] = []
  const logs: string[] = []

  // Track minion in respective graveyard
  const deadCard = minionToCard(deadMinion)
  if (deadMinion.side === 'plants') {
    updatedState.plantGraveyard.push(deadCard)
  } else {
    updatedState.zombieGraveyard.push(deadCard)
  }

  // Ensure dead minion is removed from board in deadLaneIndex if still present
  if (deadLaneIndex >= 0 && deadLaneIndex < updatedState.lanes.length) {
    const lane = updatedState.lanes[deadLaneIndex]
    if (lane.plantMinion?.instanceId === deadMinion.instanceId) {
      lane.plantMinion = null
    }
    if (lane.plantTeamUpMinion?.instanceId === deadMinion.instanceId) {
      lane.plantTeamUpMinion = null
    }
    if (lane.zombieMinion?.instanceId === deadMinion.instanceId) {
      lane.zombieMinion = null
    }
  }

  // =========================================================================
  // 1. SELF ON-DEATH ABILITIES
  // =========================================================================

  // --- Hothead (plant_hothead) ---
  if (deadMinion.cardId === 'plant_hothead' || deadMinion.name.toLowerCase() === 'hothead') {
    if (deadLaneIndex >= 0 && deadLaneIndex < updatedState.lanes.length) {
      const lane = updatedState.lanes[deadLaneIndex]
      if (lane.zombieMinion && lane.zombieMinion.currentHealth > 0) {
        const targetZ = lane.zombieMinion
        const arm = targetZ.armored ?? (targetZ.traits?.includes('armored') ? 1 : 0)
        const dmg = Math.max(0, 6 - arm)
        targetZ.currentHealth = Math.max(0, targetZ.currentHealth - dmg)

        events.push({
          laneIndex: deadLaneIndex,
          attackerSide: 'plants',
          attackerName: 'Hothead',
          target: 'minion',
          targetSide: 'zombies',
          damageDealt: dmg,
          isBlocked: false,
          isLethal: targetZ.currentHealth <= 0,
          description: `💥 Hothead phát nổ khi bị tiêu diệt: Gây ${dmg} sát thương lên ${targetZ.name}${targetZ.currentHealth <= 0 ? ' (Tiêu diệt!)' : ''}`,
        })
        logs.push(`💥 Hothead phát nổ tại ${lane.name}: Gây ${dmg} sát thương lên ${targetZ.name}!`)

        // If target zombie is destroyed, CASCADE!
        if (targetZ.currentHealth <= 0) {
          lane.zombieMinion = null
          const cascadeRes = triggerOnDeath(updatedState, targetZ, deadLaneIndex, {
            ...options,
            depth: depth + 1,
          })
          updatedState = cascadeRes.updatedState
          events.push(...cascadeRes.events)
          logs.push(...cascadeRes.logs)
        }
      } else {
        logs.push(`💥 Hothead phát nổ tại ${lane.name} nhưng không có Zombie ở làn này.`)
      }
    }
  }

  // --- Pear Cub (plant_pear_cub) ---
  if (deadMinion.cardId === 'plant_pear_cub' || deadMinion.name.toLowerCase() === 'pear cub') {
    if (deadLaneIndex >= 0 && deadLaneIndex < updatedState.lanes.length) {
      const lane = updatedState.lanes[deadLaneIndex]
      if (!lane.plantMinion) {
        lane.plantMinion = {
          instanceId: `grizzly_pear_${Date.now()}_${deadLaneIndex}`,
          cardId: 'plant_grizzly_pear',
          name: 'Grizzly Pear',
          side: 'plants',
          currentAttack: 5,
          baseAttack: 5,
          currentHealth: 4,
          maxHealth: 4,
          image: '/assets/cards/plants/Grizzly Pear.png',
        }
        logs.push(`🐻 Pear Cub bị tiêu diệt: Đánh thức 5/4 Grizzly Pear tại ${lane.name}!`)
      }
    }
  }

  // --- Gas Giant (zombie_gas_giant) ---
  if (deadMinion.cardId === 'zombie_gas_giant' || deadMinion.name.toLowerCase() === 'gas giant') {
    // 5 damage to a Plant here
    if (deadLaneIndex >= 0 && deadLaneIndex < updatedState.lanes.length) {
      const lane = updatedState.lanes[deadLaneIndex]
      if (lane.plantMinion && lane.plantMinion.currentHealth > 0) {
        const p = lane.plantMinion
        const arm = p.armored ?? (p.traits?.includes('armored') ? 1 : 0)
        const dmg = Math.max(0, 5 - arm)
        p.currentHealth = Math.max(0, p.currentHealth - dmg)
        events.push({
          laneIndex: deadLaneIndex,
          attackerSide: 'zombies',
          attackerName: 'Gas Giant',
          target: 'minion',
          targetSide: 'plants',
          damageDealt: dmg,
          isBlocked: false,
          isLethal: p.currentHealth <= 0,
          description: `☣️ Gas Giant phát nổ: Gây ${dmg} sát thương lên ${p.name}!`,
        })
        logs.push(`☣️ Gas Giant phát nổ: Gây ${dmg} sát thương lên ${p.name}!`)
        if (p.currentHealth <= 0) {
          lane.plantMinion = null
          const cascadeRes = triggerOnDeath(updatedState, p, deadLaneIndex, { ...options, depth: depth + 1 })
          updatedState = cascadeRes.updatedState
          events.push(...cascadeRes.events)
          logs.push(...cascadeRes.logs)
        }
      }
    }

    // 1 damage to Plant Hero
    const heroRes = applyHeroDamage(updatedState.plantHero, 1, false)
    updatedState.plantHero = heroRes.updatedHero
    if (heroRes.isSuperBlockTriggered && !updatedState.pendingSuperBlock) {
      updatedState.pendingSuperBlock = getPendingSuperBlockForHero(updatedState.plantHero, 'plants')
    }
    events.push({
      laneIndex: deadLaneIndex,
      attackerSide: 'zombies',
      attackerName: 'Gas Giant',
      target: 'hero',
      targetSide: 'plants',
      damageDealt: heroRes.actualDamage,
      isBlocked: heroRes.blocked,
      isLethal: updatedState.plantHero.hp <= 0,
      description: `☣️ Khí độc Gas Giant gây 1 sát thương lên Plant Hero!`,
    })
    logs.push(`☣️ Khí độc Gas Giant gây 1 sát thương lên Plant Hero!`)
  }

  // =========================================================================
  // 2. IN-HAND CARDS REACTION (Valkyrie)
  // =========================================================================
  if (deadMinion.side === 'zombies') {
    updatedState.zombieHand = updatedState.zombieHand.map(card => {
      if (card.id === 'zombie_valkyrie' || card.name.toLowerCase().includes('valkyrie')) {
        const newAttack = (card.attack ?? 0) + 2
        events.push({
          laneIndex: deadLaneIndex,
          attackerSide: 'zombies',
          attackerName: 'Valkyrie',
          target: 'hero',
          targetSide: 'zombies',
          damageDealt: 0,
          isBlocked: false,
          isLethal: false,
          description: `⚡ Valkyrie trong tay Zombie nhận +2 Tấn công (${newAttack} ATK) do ${deadMinion.name} bị tiêu diệt!`,
        })
        logs.push(`⚡ Valkyrie trong tay Zombie nhận +2 Tấn công (hiện có ${newAttack} ATK) do ${deadMinion.name} bị tiêu diệt!`)
        return {
          ...card,
          attack: newAttack,
        }
      }
      return card
    })
  }

  // =========================================================================
  // 3. BOARD MINIONS REACTION
  // =========================================================================

  // --- Punish-Shroom: "When a Mushroom is destroyed, do 2 damage to a random Zombie or the Zombie Hero" ---
  const isMushroom = isMushroomMinion(deadMinion) && deadMinion.side === 'plants'
  if (isMushroom) {
    // Count active Punish-Shrooms on board
    let punishShroomCount = 0
    updatedState.lanes.forEach(l => {
      if (
        l.plantMinion &&
        (l.plantMinion.cardId === 'plant_punish_shroom' || l.plantMinion.name.toLowerCase().includes('punish-shroom'))
      ) {
        punishShroomCount++
      }
      if (
        l.plantTeamUpMinion &&
        (l.plantTeamUpMinion.cardId === 'plant_punish_shroom' || l.plantTeamUpMinion.name.toLowerCase().includes('punish-shroom'))
      ) {
        punishShroomCount++
      }
    })

    // If the dying minion itself is a Punish-Shroom, it triggers for its own destruction too
    if (
      deadMinion.cardId === 'plant_punish_shroom' ||
      deadMinion.name.toLowerCase().includes('punish-shroom')
    ) {
      punishShroomCount++
    }

    // Execute each Punish-Shroom retaliation trigger
    for (let i = 0; i < punishShroomCount; i++) {
      // Collect live zombies on board
      const liveZombies: { minion: Minion; laneIndex: number }[] = []
      updatedState.lanes.forEach((l, idx) => {
        if (l.zombieMinion && l.zombieMinion.currentHealth > 0) {
          liveZombies.push({ minion: l.zombieMinion, laneIndex: idx })
        }
      })

      // Determine target: random live zombie minion OR Zombie Hero
      let targetType: 'minion' | 'hero' = 'hero'
      let targetZombie: { minion: Minion; laneIndex: number } | null = null

      if (options?.preferredTarget === 'minion' && liveZombies.length > 0) {
        targetType = 'minion'
        if (options.targetLaneIndex !== undefined) {
          targetZombie = liveZombies.find(z => z.laneIndex === options.targetLaneIndex) || liveZombies[0]
        } else {
          targetZombie = liveZombies[0]
        }
      } else if (options?.preferredTarget === 'hero') {
        targetType = 'hero'
      } else {
        // Standard game logic: 50/50 between Zombie Minions (if any) and Zombie Hero
        if (liveZombies.length > 0) {
          const chooseMinion = Math.random() < 0.5
          if (chooseMinion) {
            targetType = 'minion'
            targetZombie = liveZombies[Math.floor(Math.random() * liveZombies.length)]
          } else {
            targetType = 'hero'
          }
        } else {
          targetType = 'hero'
        }
      }

      if (targetType === 'hero') {
        // Punish-Shroom deals 2 damage to Zombie Hero
        const heroRes = applyHeroDamage(updatedState.zombieHero, 2, false)
        updatedState.zombieHero = heroRes.updatedHero
        if (heroRes.isSuperBlockTriggered && !updatedState.pendingSuperBlock) {
          updatedState.pendingSuperBlock = getPendingSuperBlockForHero(updatedState.zombieHero, 'zombies')
        }
        events.push({
          laneIndex: deadLaneIndex >= 0 ? deadLaneIndex : 0,
          attackerSide: 'plants',
          attackerName: 'Punish-Shroom',
          target: 'hero',
          targetSide: 'zombies',
          damageDealt: heroRes.actualDamage,
          isBlocked: heroRes.blocked,
          isLethal: updatedState.zombieHero.hp <= 0,
          description: `🍄 Punish-Shroom phản ứng khi Nấm ${deadMinion.name} bị tiêu diệt: Bắn 2 sát thương vào Zombie Hero${heroRes.blocked ? ' (SUPER-BLOCK!)' : ''}!`,
        })
        logs.push(`🍄 Punish-Shroom bắn 2 sát thương vào Zombie Hero (còn ${updatedState.zombieHero.hp} HP)!`)
      } else if (targetZombie) {
        // Punish-Shroom deals 2 damage to target zombie minion
        const targetLane = updatedState.lanes[targetZombie.laneIndex]
        const zMinion = targetLane.zombieMinion!
        const arm = zMinion.armored ?? (zMinion.traits?.includes('armored') ? 1 : 0)
        const dmg = Math.max(0, 2 - arm)
        zMinion.currentHealth = Math.max(0, zMinion.currentHealth - dmg)

        events.push({
          laneIndex: targetZombie.laneIndex,
          attackerSide: 'plants',
          attackerName: 'Punish-Shroom',
          target: 'minion',
          targetSide: 'zombies',
          damageDealt: dmg,
          isBlocked: false,
          isLethal: zMinion.currentHealth <= 0,
          description: `🍄 Punish-Shroom phản ứng khi Nấm ${deadMinion.name} bị tiêu diệt: Bắn ${dmg} sát thương lên ${zMinion.name}${zMinion.currentHealth <= 0 ? ' (Tiêu diệt!)' : ''}!`,
        })
        logs.push(`🍄 Punish-Shroom bắn ${dmg} sát thương lên ${zMinion.name} tại ${targetLane.name}!`)

        // If target zombie is destroyed, CASCADE!
        if (zMinion.currentHealth <= 0) {
          targetLane.zombieMinion = null
          const cascadeRes = triggerOnDeath(updatedState, zMinion, targetZombie.laneIndex, {
            ...options,
            depth: depth + 1,
          })
          updatedState = cascadeRes.updatedState
          events.push(...cascadeRes.events)
          logs.push(...cascadeRes.logs)
        }
      }
    }
  }

  // --- Frankentuar: "When any Zombie is destroyed, this gets +1/+1" ---
  if (deadMinion.side === 'zombies') {
    updatedState.lanes.forEach(l => {
      if (
        l.zombieMinion &&
        (l.zombieMinion.cardId === 'zombie_frankentuar' || l.zombieMinion.name.toLowerCase().includes('frankentuar')) &&
        l.zombieMinion.instanceId !== deadMinion.instanceId
      ) {
        l.zombieMinion = {
          ...l.zombieMinion,
          currentAttack: l.zombieMinion.currentAttack + 1,
          baseAttack: l.zombieMinion.baseAttack + 1,
          currentHealth: l.zombieMinion.currentHealth + 1,
          maxHealth: l.zombieMinion.maxHealth + 1,
        }
        logs.push(`⚡ Frankentuar hấp thụ năng lượng tử khí: Nhận +1/+1 (${l.zombieMinion.currentAttack}/${l.zombieMinion.currentHealth})!`)
      }
    })
  }

  // --- Sharktronic Sub: "When a Plant is destroyed, this gets +1 Attack" ---
  if (deadMinion.side === 'plants') {
    updatedState.lanes.forEach(l => {
      if (
        l.zombieMinion &&
        (l.zombieMinion.cardId === 'zombie_zombot_sharktronic_sub' || l.zombieMinion.name.toLowerCase().includes('sharktronic'))
      ) {
        l.zombieMinion = {
          ...l.zombieMinion,
          currentAttack: l.zombieMinion.currentAttack + 1,
          baseAttack: l.zombieMinion.baseAttack + 1,
        }
        logs.push(`🦈 Zombot Sharktronic Sub nuốt chửng Plant: Nhận +1 Attack (${l.zombieMinion.currentAttack} ATK)!`)
      }
    })
  }

  // Check victory condition
  let winner = updatedState.winner
  if (updatedState.plantHero.hp <= 0 && updatedState.zombieHero.hp <= 0) {
    winner = null
  } else if (updatedState.plantHero.hp <= 0) {
    winner = 'zombies'
  } else if (updatedState.zombieHero.hp <= 0) {
    winner = 'plants'
  }
  updatedState.winner = winner

  return {
    updatedState,
    events,
    logs,
  }
}

/**
 * Handles multiple simultaneous minion deaths sequentially
 */
export function triggerOnMultipleDeaths(
  state: GameState,
  deadUnits: { minion: Minion; laneIndex: number }[],
  options?: TriggerDeathOptions
): DeathTriggerResult {
  let currentState = state
  const allEvents: CombatEvent[] = []
  const allLogs: string[] = []

  for (const { minion, laneIndex } of deadUnits) {
    const res = triggerOnDeath(currentState, minion, laneIndex, options)
    currentState = res.updatedState
    allEvents.push(...res.events)
    allLogs.push(...res.logs)
  }

  return {
    updatedState: currentState,
    events: allEvents,
    logs: allLogs,
  }
}
