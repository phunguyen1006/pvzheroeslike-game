/**
 * PvZ Heroes Replicate - Environment Engine
 * Manages Environment placement, passives, combat triggers, and end-of-turn effects
 */

import type { GameState, Side, Card, Minion, EnvironmentState, TerrainCoordinationResult } from './types'
import { applyHeroDamage } from './combat'
import { drawCard } from './reducer'

export interface EnvironmentTriggerResult {
  updatedState: GameState
  events: string[]
}

/**
 * Play an Environment card onto a specific lane (replaces any existing Environment)
 */
export function playEnvironment(
  state: GameState,
  card: Card,
  laneIndex: number,
  side: Side
): EnvironmentTriggerResult {
  let updatedState: GameState = {
    ...state,
    lanes: state.lanes.map(l => ({ ...l })),
  }
  const events: string[] = []

  const targetLane = updatedState.lanes[laneIndex]
  if (!targetLane) return { updatedState: state, events }

  const prevEnv = targetLane.environment

  // Create environment record
  const newEnv: EnvironmentState = {
    id: card.id,
    name: card.name,
    side,
    description: card.description || '',
    image: card.image,
  }

  targetLane.environment = newEnv
  events.push(`Môi trường mới [${card.name}] đã được triển khai tại ${targetLane.name}${prevEnv ? ` (thay thế ${prevEnv.name})` : ''}!`)

  // Apply continuous or immediate stat modifiers
  if (card.id === 'zombie_area_22') {
    // Zombies here get +2/+2 and Frenzy
    if (targetLane.zombieMinion) {
      targetLane.zombieMinion = {
        ...targetLane.zombieMinion,
        currentAttack: targetLane.zombieMinion.currentAttack + 2,
        currentHealth: targetLane.zombieMinion.currentHealth + 2,
        maxHealth: targetLane.zombieMinion.maxHealth + 2,
        frenzy: true,
      }
      events.push(`Area 22 ban phước: ${targetLane.zombieMinion.name} nhận +2/+2 và Cuồng nộ (Frenzy)!`)
    }
  } else if (card.id === 'zombie_total_eclipse') {
    // Plants here get -1/-1
    if (targetLane.plantMinion) {
      targetLane.plantMinion = {
        ...targetLane.plantMinion,
        currentAttack: Math.max(0, targetLane.plantMinion.currentAttack - 1),
        currentHealth: targetLane.plantMinion.currentHealth - 1,
      }
      events.push(`Nhật thực toàn phần Total Eclipse: Làm suy yếu ${targetLane.plantMinion.name} (-1/-1)!`)
      if (targetLane.plantMinion.currentHealth <= 0) {
        events.push(`💥 ${targetLane.plantMinion.name} bị tiêu diệt do hết HP!`)
        targetLane.plantMinion = null
      }
    }
  } else if (card.id === 'plant_bog_of_sunken_hope') {
    if (targetLane.plantMinion) {
      const isAlreadyAmphibious = Boolean(targetLane.plantMinion.amphibious || targetLane.plantMinion.traits?.includes('amphibious'))
      targetLane.plantMinion = {
        ...targetLane.plantMinion,
        amphibious: true,
        currentAttack: isAlreadyAmphibious ? targetLane.plantMinion.currentAttack + 2 : targetLane.plantMinion.currentAttack,
        baseAttack: isAlreadyAmphibious ? targetLane.plantMinion.baseAttack + 2 : targetLane.plantMinion.baseAttack,
        currentHealth: isAlreadyAmphibious ? targetLane.plantMinion.currentHealth + 2 : targetLane.plantMinion.currentHealth,
        maxHealth: isAlreadyAmphibious ? targetLane.plantMinion.maxHealth + 2 : targetLane.plantMinion.maxHealth,
      }
      events.push(`Đầm lầy Bog of Sunken Hope: ${targetLane.plantMinion.name} nhận đặc tính Thủy quân (Amphibious)${isAlreadyAmphibious ? ' và nhận +2/+2' : ''}!`)
    }
    if (targetLane.plantTeamUpMinion) {
      const isAlreadyAmphibious = Boolean(targetLane.plantTeamUpMinion.amphibious || targetLane.plantTeamUpMinion.traits?.includes('amphibious'))
      targetLane.plantTeamUpMinion = {
        ...targetLane.plantTeamUpMinion,
        amphibious: true,
        currentAttack: isAlreadyAmphibious ? targetLane.plantTeamUpMinion.currentAttack + 2 : targetLane.plantTeamUpMinion.currentAttack,
        baseAttack: isAlreadyAmphibious ? targetLane.plantTeamUpMinion.baseAttack + 2 : targetLane.plantTeamUpMinion.baseAttack,
        currentHealth: isAlreadyAmphibious ? targetLane.plantTeamUpMinion.currentHealth + 2 : targetLane.plantTeamUpMinion.currentHealth,
        maxHealth: isAlreadyAmphibious ? targetLane.plantTeamUpMinion.maxHealth + 2 : targetLane.plantTeamUpMinion.maxHealth,
      }
      events.push(`Đầm lầy Bog of Sunken Hope: Đồng đội ${targetLane.plantTeamUpMinion.name} nhận đặc tính Thủy quân (Amphibious)${isAlreadyAmphibious ? ' và nhận +2/+2' : ''}!`)
    }
    if (targetLane.zombieMinion && !targetLane.zombieMinion.amphibious && !targetLane.zombieMinion.traits?.includes('amphibious')) {
      targetLane.zombieMinion = {
        ...targetLane.zombieMinion,
        currentAttack: Math.max(0, targetLane.zombieMinion.currentAttack - 2),
      }
      events.push(`Đầm lầy Bog of Sunken Hope làm sa lầy: ${targetLane.zombieMinion.name} bị giảm 2 Tấn công (-2 ATK)!`)
    }
  } else if (card.id === 'zombie_laser_base_alpha') {
    if (targetLane.zombieMinion) {
      targetLane.zombieMinion = {
        ...targetLane.zombieMinion,
        deadly: true,
        strikethrough: true,
      }
      events.push(`Laser Base Alpha kích hoạt: ${targetLane.zombieMinion.name} nhận Deadly và Strikethrough!`)
    }
  } else if (card.id === 'zombie_cone_zone') {
    if (targetLane.zombieMinion) {
      targetLane.zombieMinion = {
        ...targetLane.zombieMinion,
        currentHealth: targetLane.zombieMinion.currentHealth + 3,
        maxHealth: targetLane.zombieMinion.maxHealth + 3,
      }
      events.push(`Cone Zone trang bị nón bảo hộ: ${targetLane.zombieMinion.name} nhận thêm +3 Máu (+3 HP)!`)
    }
  } else if (card.id === 'zombie_haunted_castle') {
    if (targetLane.zombieMinion) {
      targetLane.zombieMinion = {
        ...targetLane.zombieMinion,
        currentAttack: targetLane.zombieMinion.currentAttack + 1,
        baseAttack: targetLane.zombieMinion.baseAttack + 1,
      }
      events.push(`Haunted Castle: Lâu đài ma quái tăng +1 Tấn công cho ${targetLane.zombieMinion.name}!`)
    }
  } else if (card.id === 'plant_mushroom_grotto') {
    if (targetLane.plantMinion) {
      targetLane.plantMinion = {
        ...targetLane.plantMinion,
        currentHealth: targetLane.plantMinion.currentHealth + 2,
        maxHealth: targetLane.plantMinion.maxHealth + 2,
      }
      events.push(`Mushroom Grotto: Hang nấm tăng +2 Máu cho ${targetLane.plantMinion.name}!`)
    }
  }

  return { updatedState, events }
}

/**
 * Triggers before combat in a lane (Spikeweed Sector, Moon Base Z)
 */
export function applyEnvironmentBeforeCombat(
  state: GameState,
  laneIndex: number
): EnvironmentTriggerResult {
  let updatedState: GameState = {
    ...state,
    lanes: state.lanes.map(l => ({ ...l })),
  }
  const events: string[] = []
  const lane = updatedState.lanes[laneIndex]

  if (!lane || !lane.environment) return { updatedState, events }

  switch (lane.environment.id) {
    case 'plant_spikeweed_sector': {
      // "Before combat here, do 2 damage to a Zombie here."
      if (lane.zombieMinion) {
        lane.zombieMinion = {
          ...lane.zombieMinion,
          currentHealth: Math.max(0, lane.zombieMinion.currentHealth - 2),
        }
        events.push(`Gai nhọn Spikeweed Sector đâm xuyên: Gây 2 sát thương lên ${lane.zombieMinion.name}!`)
        if (lane.zombieMinion.currentHealth <= 0) {
          events.push(`💥 ${lane.zombieMinion.name} bị gai nhọn Spikeweed đâm chết trước giao tranh!`)
          lane.zombieMinion = null
        }
      }
      break
    }

    case 'zombie_moon_base_z': {
      // "Before combat here, Zombies here do 3 damage to the Plant Hero (Overshoot 3)."
      if (lane.zombieMinion) {
        const dmg = applyHeroDamage(updatedState.plantHero, 3, false)
        updatedState.plantHero = dmg.updatedHero
        events.push(`Căn cứ mặt trăng Moon Base Z kích hoạt Overshoot 3: Bắn 3 sát thương thẳng vào Plant Hero (còn ${dmg.updatedHero.hp} HP)!`)
      }
      break
    }
  }

  return { updatedState, events }
}

/**
 * Triggers when a unit is played onto an environment lane (Medulla Nebula)
 */
export function applyEnvironmentOnPlay(
  state: GameState,
  laneIndex: number,
  side: Side
): EnvironmentTriggerResult {
  let updatedState = { ...state }
  const events: string[] = []
  const lane = updatedState.lanes[laneIndex]

  if (!lane || !lane.environment) return { updatedState, events }

  if (lane.environment.id === 'zombie_medulla_nebula' && side === 'zombies') {
    // "When you play a Zombie here, you get +2 Brains this turn."
    updatedState.zombieHero = {
      ...updatedState.zombieHero,
      brains: updatedState.zombieHero.brains + 2,
    }
    events.push(`Tinh vân não Medulla Nebula nạp năng lượng: Cung cấp thêm +2 Brains (${updatedState.zombieHero.brains} Brains)!`)
  } else if (lane.environment.id === 'plant_bog_of_sunken_hope') {
    if (side === 'plants' && lane.plantMinion) {
      if (lane.plantMinion.amphibious || lane.plantMinion.traits?.includes('amphibious')) {
        lane.plantMinion = {
          ...lane.plantMinion,
          currentAttack: lane.plantMinion.currentAttack + 2,
          baseAttack: lane.plantMinion.baseAttack + 2,
          currentHealth: lane.plantMinion.currentHealth + 2,
          maxHealth: lane.plantMinion.maxHealth + 2,
        }
        events.push(`Bog of Sunken Hope: Thủy quân ${lane.plantMinion.name} nhận +2/+2!`)
      }
    } else if (side === 'zombies' && lane.zombieMinion && !lane.zombieMinion.amphibious && !lane.zombieMinion.traits?.includes('amphibious')) {
      lane.zombieMinion = {
        ...lane.zombieMinion,
        currentAttack: Math.max(0, lane.zombieMinion.currentAttack - 2),
      }
      events.push(`Bog of Sunken Hope làm sa lầy: ${lane.zombieMinion.name} bị giảm 2 Tấn công (-2 ATK)!`)
    }
  } else if (lane.environment.id === 'zombie_laser_base_alpha' && side === 'zombies' && lane.zombieMinion) {
    lane.zombieMinion = {
      ...lane.zombieMinion,
      deadly: true,
      strikethrough: true,
    }
    events.push(`Laser Base Alpha: ${lane.zombieMinion.name} nhận Deadly và Strikethrough!`)
  } else if (lane.environment.id === 'zombie_cone_zone' && side === 'zombies' && lane.zombieMinion) {
    lane.zombieMinion = {
      ...lane.zombieMinion,
      currentHealth: lane.zombieMinion.currentHealth + 3,
      maxHealth: lane.zombieMinion.maxHealth + 3,
    }
    events.push(`Cone Zone: ${lane.zombieMinion.name} nhận thêm +3 Máu (+3 HP)!`)
  } else if (lane.environment.id === 'zombie_haunted_castle' && side === 'zombies' && lane.zombieMinion) {
    lane.zombieMinion = {
      ...lane.zombieMinion,
      currentAttack: lane.zombieMinion.currentAttack + 1,
      baseAttack: lane.zombieMinion.baseAttack + 1,
    }
    events.push(`Haunted Castle: ${lane.zombieMinion.name} nhận +1 Tấn công (+1/+0)!`)
  } else if (lane.environment.id === 'plant_mushroom_grotto' && side === 'plants' && lane.plantMinion) {
    lane.plantMinion = {
      ...lane.plantMinion,
      currentHealth: lane.plantMinion.currentHealth + 2,
      maxHealth: lane.plantMinion.maxHealth + 2,
    }
    events.push(`Mushroom Grotto: ${lane.plantMinion.name} nhận +2 Máu (+0/+2)!`)
  }

  return { updatedState, events }
}

/**
 * Triggers when a minion on an environment hurts the enemy hero (Planet of the Grapes)
 */
export function applyEnvironmentOnHeroDamage(
  state: GameState,
  laneIndex: number,
  attackerSide: Side
): EnvironmentTriggerResult {
  let updatedState = { ...state }
  const events: string[] = []
  const lane = updatedState.lanes[laneIndex]

  if (!lane || !lane.environment) return { updatedState, events }

  if (lane.environment.id === 'plant_planet_of_the_grapes' && attackerSide === 'plants') {
    // "When a Plant here hurts the Zombie Hero, draw a card."
    const { newDeck, newHand, drawnCard } = drawCard(updatedState.plantDeck, updatedState.plantHand)
    updatedState.plantDeck = newDeck
    updatedState.plantHand = newHand
    if (drawnCard) {
      events.push(`Hành tinh nho Planet of the Grapes kích hoạt: Rút thêm 1 lá [${drawnCard.name}]!`)
    }
  }

  return { updatedState, events }
}

/**
 * Triggers at end of turn (Solar Winds)
 */
export function applyEnvironmentEndOfTurn(state: GameState): EnvironmentTriggerResult {
  let updatedState: GameState = {
    ...state,
    lanes: state.lanes.map(l => ({ ...l })),
  }
  const events: string[] = []

  updatedState.lanes.forEach(l => {
    if (l.environment && l.environment.id === 'plant_solar_winds') {
      // "End of Turn: If there are no Zombies here, make a Sunflower here."
      if (!l.zombieMinion && !l.plantMinion) {
        l.plantMinion = {
          instanceId: `sunflower_spawn_${Date.now()}_${l.index}`,
          cardId: 'plant_sunflower',
          name: 'Sunflower',
          side: 'plants',
          currentAttack: 0,
          baseAttack: 0,
          currentHealth: 1,
          maxHealth: 1,
          image: '/assets/cards/plants/Sunflower.png',
          teamUp: true,
        }
        events.push(`Gió mặt trời Solar Winds thổi qua: Nảy mầm 1 Hoa Hướng Dương (Sunflower) tại ${l.name}!`)
      }
    }
  })

  return { updatedState, events }
}

/**
 * Coordinates automated stat buffs and reactions when a minion appears on a lane/terrain.
 * Handles:
 * 1. Heights Terrain base rule (+1/+1).
 * 2. Active Lily of the Valley entities (+2/+2 per Lily for Plants played on Heights).
 * 3. Reactive enemy reactions (Arm Wrestler gaining +1/+1 when a Plant enters its lane).
 * 4. Active Environment on-play triggers (Area 22, Bog of Sunken Hope, Laser Base Alpha, Cone Zone, Total Eclipse, Medulla Nebula).
 */
export function coordinateTerrainAndLaneBuffs(
  state: GameState,
  minion: Minion,
  laneIndex: number,
  side: Side,
  options?: { skipEnemyReactions?: boolean }
): TerrainCoordinationResult {
  let updatedMinion: Minion = { ...minion }
  let updatedState: GameState = {
    ...state,
    lanes: state.lanes.map(l => ({ ...l })),
  }
  const events: string[] = []

  const targetLane = updatedState.lanes[laneIndex]
  if (!targetLane) {
    return { updatedMinion, updatedState: state, events }
  }

  const isHeights = targetLane.type === 'heights' || laneIndex === 0

  // 1. Heights Terrain Base Rule (+1/+1)
  if (isHeights) {
    updatedMinion = {
      ...updatedMinion,
      currentAttack: updatedMinion.currentAttack + 1,
      baseAttack: updatedMinion.baseAttack + 1,
      currentHealth: updatedMinion.currentHealth + 1,
      maxHealth: updatedMinion.maxHealth + 1,
    }
    events.push(`🏔️ Địa hình Đồi Cao (Heights): ${updatedMinion.name} nhận +1/+1 (${updatedMinion.currentAttack}/${updatedMinion.currentHealth})!`)
  }

  // 2. Lily of the Valley (+2/+2 per Lily of the Valley on board when a Plant is played on Heights)
  if (side === 'plants' && isHeights) {
    let lilyCount = 0
    for (const l of updatedState.lanes) {
      if (l.plantMinion?.cardId === 'plant_lily_of_the_valley') lilyCount++
      if (l.plantTeamUpMinion?.cardId === 'plant_lily_of_the_valley') lilyCount++
    }
    if (lilyCount > 0) {
      const bonus = 2 * lilyCount
      updatedMinion = {
        ...updatedMinion,
        currentAttack: updatedMinion.currentAttack + bonus,
        baseAttack: updatedMinion.baseAttack + bonus,
        currentHealth: updatedMinion.currentHealth + bonus,
        maxHealth: updatedMinion.maxHealth + bonus,
      }
      events.push(`🌸 Lily of the Valley ban phước! Plant đặt ${updatedMinion.name} lên Đồi Cao (${targetLane.name}) nhận thêm +${bonus}/+${bonus} (${updatedMinion.currentAttack}/${updatedMinion.currentHealth})!`)
    }
  }

  // 3. Enemy Reaction: Arm Wrestler (+1/+1 when a Plant enters its lane)
  if (!options?.skipEnemyReactions && side === 'plants' && targetLane.zombieMinion?.cardId === 'zombie_arm_wrestler') {
    targetLane.zombieMinion = {
      ...targetLane.zombieMinion,
      currentAttack: targetLane.zombieMinion.currentAttack + 1,
      baseAttack: targetLane.zombieMinion.baseAttack + 1,
      currentHealth: targetLane.zombieMinion.currentHealth + 1,
      maxHealth: targetLane.zombieMinion.maxHealth + 1,
    }
    events.push(`💪 Arm Wrestler (${targetLane.zombieMinion.name}) nhận +1/+1 khi Plant xuất hiện cùng làn (${targetLane.zombieMinion.currentAttack}/${targetLane.zombieMinion.currentHealth})!`)
  }

  // 4. Environment on-play triggers
  if (targetLane.environment) {
    const envId = targetLane.environment.id
    if (envId === 'zombie_area_22' && side === 'zombies') {
      updatedMinion = {
        ...updatedMinion,
        currentAttack: updatedMinion.currentAttack + 2,
        baseAttack: updatedMinion.baseAttack + 2,
        currentHealth: updatedMinion.currentHealth + 2,
        maxHealth: updatedMinion.maxHealth + 2,
        frenzy: true,
      }
      events.push(`Area 22 ban phước: ${updatedMinion.name} nhận +2/+2 và Cuồng nộ (Frenzy)!`)
    } else if (envId === 'zombie_laser_base_alpha' && side === 'zombies') {
      updatedMinion = {
        ...updatedMinion,
        deadly: true,
        strikethrough: true,
      }
      events.push(`Laser Base Alpha: ${updatedMinion.name} nhận Deadly và Strikethrough!`)
    } else if (envId === 'zombie_cone_zone' && side === 'zombies') {
      updatedMinion = {
        ...updatedMinion,
        currentHealth: updatedMinion.currentHealth + 3,
        maxHealth: updatedMinion.maxHealth + 3,
      }
      events.push(`Cone Zone: ${updatedMinion.name} nhận thêm +3 Máu (+3 HP)!`)
    } else if (envId === 'zombie_total_eclipse' && side === 'plants') {
      updatedMinion = {
        ...updatedMinion,
        currentAttack: Math.max(0, updatedMinion.currentAttack - 1),
        currentHealth: updatedMinion.currentHealth - 1,
      }
      events.push(`Total Eclipse làm suy yếu: ${updatedMinion.name} (-1/-1)!`)
    } else if (envId === 'plant_bog_of_sunken_hope') {
      if (side === 'plants') {
        const isAlreadyAmphibious = Boolean(updatedMinion.amphibious || updatedMinion.traits?.includes('amphibious'))
        updatedMinion = {
          ...updatedMinion,
          amphibious: true,
          currentAttack: isAlreadyAmphibious ? updatedMinion.currentAttack + 2 : updatedMinion.currentAttack,
          baseAttack: isAlreadyAmphibious ? updatedMinion.baseAttack + 2 : updatedMinion.baseAttack,
          currentHealth: isAlreadyAmphibious ? updatedMinion.currentHealth + 2 : updatedMinion.currentHealth,
          maxHealth: isAlreadyAmphibious ? updatedMinion.maxHealth + 2 : updatedMinion.maxHealth,
        }
        events.push(`Bog of Sunken Hope: Thủy quân ${updatedMinion.name} nhận +2/+2!`)
      } else if (side === 'zombies' && !updatedMinion.amphibious && !updatedMinion.traits?.includes('amphibious')) {
        updatedMinion = {
          ...updatedMinion,
          currentAttack: Math.max(0, updatedMinion.currentAttack - 2),
        }
        events.push(`Bog of Sunken Hope làm sa lầy: ${updatedMinion.name} bị giảm 2 Tấn công (-2 ATK)!`)
      }
    } else if (envId === 'zombie_medulla_nebula' && side === 'zombies') {
      updatedState = {
        ...updatedState,
        zombieHero: {
          ...updatedState.zombieHero,
          brains: updatedState.zombieHero.brains + 2,
        },
      }
      events.push(`Tinh vân não Medulla Nebula nạp năng lượng: Cung cấp thêm +2 Brains (${updatedState.zombieHero.brains} Brains)!`)
    }
  }

  return { updatedMinion, updatedState, events }
}

