/**
 * PvZ Heroes Replicate - Card Ability Trigger System
 * Handles card triggers: When Played, When Hurt, Start of Turn, Dino-Roar, When Destroyed
 */

import type { GameState, Side, Minion, Card, CombatEvent } from './types'
import { applyHeroDamage } from './combat'

export interface AbilityTriggerResult {
  updatedState: GameState
  events: string[]
}

/**
 * Triggered when a minion is played onto the board
 */
export function triggerWhenPlayed(
  state: GameState,
  minion: Minion,
  laneIndex: number,
  side: Side
): AbilityTriggerResult {
  let updatedState: GameState = {
    ...state,
    lanes: state.lanes.map(l => ({ ...l })),
  }
  const events: string[] = []

  // 1. Minion's own "When played" ability
  switch (minion.cardId) {
    case 'plant_bonk_choy': {
      // Bonk Choy: Gets +1 Attack this turn
      const targetLane = updatedState.lanes[laneIndex]
      if (targetLane.plantMinion && targetLane.plantMinion.instanceId === minion.instanceId) {
        targetLane.plantMinion = {
          ...targetLane.plantMinion,
          currentAttack: targetLane.plantMinion.currentAttack + 1,
        }
        events.push(`Bonk Choy vung nắm đấm: Nhận +1 Tấn công lượt này (${targetLane.plantMinion.currentAttack} ATK)!`)
      }
      break
    }

    case 'plant_kernel_corn': {
      // Kernel Corn: Do 4 damage to each Zombie
      events.push('Kernel Corn khai hỏa: Bắn nổ 4 sát thương lên toàn bộ Zombie!')
      updatedState.lanes.forEach(l => {
        if (l.zombieMinion) {
          l.zombieMinion = {
            ...l.zombieMinion,
            currentHealth: Math.max(0, l.zombieMinion.currentHealth - 4),
          }
          if (l.zombieMinion.currentHealth <= 0) {
            events.push(`💥 ${l.zombieMinion.name} bị Kernel Corn tiêu diệt!`)
            l.zombieMinion = null
          }
        }
      })
      break
    }

    case 'plant_the_great_zucchini': {
      // The Great Zucchini: Transform all Zombies into 1/1 Browncoat Zombies
      events.push('The Great Zucchini biến hóa: Toàn bộ Zombie bị biến thành 1/1 Browncoat Zombie!')
      updatedState.lanes.forEach(l => {
        if (l.zombieMinion) {
          l.zombieMinion = {
            instanceId: `z_transformed_${Date.now()}_${l.index}`,
            cardId: 'zombie_basic',
            name: 'Browncoat Zombie',
            side: 'zombies',
            currentAttack: 1,
            baseAttack: 1,
            currentHealth: 1,
            maxHealth: 1,
            image: '/assets/heroes/zombies/Super Brainz.png',
          }
        }
      })
      break
    }

    case 'zombie_conga_zombie': {
      // Conga Zombie: Do 1 damage to a plant or plant hero
      const targetLane = updatedState.lanes[laneIndex]
      if (targetLane.plantMinion) {
        targetLane.plantMinion = {
          ...targetLane.plantMinion,
          currentHealth: Math.max(0, targetLane.plantMinion.currentHealth - 1),
        }
        events.push(`Conga Zombie gõ trống: Gây 1 sát thương lên ${targetLane.plantMinion.name}!`)
        if (targetLane.plantMinion.currentHealth <= 0) {
          events.push(`💥 ${targetLane.plantMinion.name} đã bị tiêu diệt!`)
          targetLane.plantMinion = null
        }
      } else {
        const dmg = applyHeroDamage(updatedState.plantHero, 1, false)
        updatedState.plantHero = dmg.updatedHero
        events.push(`Conga Zombie gõ trống bắn 1 sát thương vào Plant Hero!`)
      }
      break
    }

    case 'zombie_disco_zombie': {
      // Disco Zombie: Make a 1/1 Backup Dancer in an open lane
      const openLanes = updatedState.lanes.filter(l => !l.zombieMinion && l.type !== 'water')
      if (openLanes.length > 0) {
        const target = openLanes[Math.floor(Math.random() * openLanes.length)]
        updatedState.lanes[target.index].zombieMinion = {
          instanceId: `backup_dancer_${Date.now()}`,
          cardId: 'zombie_backup_dancer',
          name: 'Backup Dancer',
          side: 'zombies',
          currentAttack: 1,
          baseAttack: 1,
          currentHealth: 1,
          maxHealth: 1,
          image: '/assets/cards/zombies/Disco Zombie.png',
        }
        events.push(`Disco Zombie nhảy điệu disco: Triệu hồi 1/1 Backup Dancer tại ${target.name}!`)
      }
      break
    }

    case 'zombie_ra_zombie': {
      // Ra Zombie: The Plant Hero loses 2 Sun this turn
      const lostSun = Math.min(2, updatedState.plantHero.sun)
      updatedState.plantHero = {
        ...updatedState.plantHero,
        sun: Math.max(0, updatedState.plantHero.sun - 2),
      }
      events.push(`Ra Zombie tỏa ánh hào quang mặt trời: Cướp mất ${lostSun} Sun của Plant Hero!`)
      break
    }

    case 'zombie_trickster': {
      // Trickster: When played: Does a bonus attack!
      events.push(`Trickster xuất kích: Lập tức thực hiện 1 đòn Tấn công thêm (Bonus Attack)!`)
      const targetLane = updatedState.lanes[laneIndex]
      if (targetLane.plantMinion) {
        targetLane.plantMinion = {
          ...targetLane.plantMinion,
          currentHealth: Math.max(0, targetLane.plantMinion.currentHealth - 6),
        }
        events.push(`Trickster đánh chớp nhoáng 6 sát thương lên ${targetLane.plantMinion.name}!`)
        if (targetLane.plantMinion.currentHealth <= 0) {
          events.push(`💥 ${targetLane.plantMinion.name} bị tiêu diệt!`)
          targetLane.plantMinion = null
        }
      } else {
        const dmg = applyHeroDamage(updatedState.plantHero, 6, false)
        updatedState.plantHero = dmg.updatedHero
        events.push(`Trickster đánh thẳng mặt Plant Hero gây ${dmg.actualDamage} sát thương!`)
      }
      break
    }

    case 'zombie_zombot_1000': {
      // Zombot 1000: Destroy all Plants!
      events.push('🚨 ZOMBOT 1000 KHỔNG LỒ XUẤT HIỆN: TIÊU DIỆT TOÀN BỘ PLANTS TRÊN SÂN!')
      updatedState.lanes.forEach(l => {
        if (l.plantMinion) {
          events.push(`💥 ${l.plantMinion.name} tại ${l.name} đã bị Zombot nghiền nát!`)
          l.plantMinion = null
        }
        if (l.plantTeamUpMinion) {
          events.push(`💥 ${l.plantTeamUpMinion.name} tại ${l.name} đã bị Zombot nghiền nát!`)
          l.plantTeamUpMinion = null
        }
      })
      break
    }
  }

  // 2. React to other minions on board
  if (side === 'plants') {
    // Astro-Shroom: "When you play another Plant, do 1 Bullseye damage to Zombie Hero"
    updatedState.lanes.forEach(l => {
      if (l.plantMinion && l.plantMinion.cardId === 'plant_astro_shroom' && l.plantMinion.instanceId !== minion.instanceId) {
        const res = applyHeroDamage(updatedState.zombieHero, 1, true) // Bullseye!
        updatedState.zombieHero = res.updatedHero
        events.push(`Astro-Shroom phản ứng với Plant mới: Bắn 1 Bullseye damage vào Zombie Hero!`)
      }
    })

    // Admiral Navy Bean: "When you play another Bean, do 2 damage to Zombie Hero"
    const isBean = minion.name.toLowerCase().includes('bean') || minion.cardId.includes('bean')
    if (isBean) {
      updatedState.lanes.forEach(l => {
        if (l.plantMinion && l.plantMinion.cardId === 'plant_admiral_navy_bean' && l.plantMinion.instanceId !== minion.instanceId) {
          const res = applyHeroDamage(updatedState.zombieHero, 2, false)
          updatedState.zombieHero = res.updatedHero
          events.push(`Admiral Navy Bean bắn tên lửa đậu: Gây 2 sát thương vào Zombie Hero!`)
        }
      })
    }

    // Arm Wrestler (Zombie side reaction): "When a Plant is played in this lane, this gets +1/+1"
    const lane = updatedState.lanes[laneIndex]
    if (lane.zombieMinion && lane.zombieMinion.cardId === 'zombie_arm_wrestler') {
      lane.zombieMinion = {
        ...lane.zombieMinion,
        currentAttack: lane.zombieMinion.currentAttack + 1,
        currentHealth: lane.zombieMinion.currentHealth + 1,
        maxHealth: lane.zombieMinion.maxHealth + 1,
      }
      events.push(`Arm Wrestler thấy Plant xuất hiện cùng làn: Gồng cơ bắp nhận +1/+1 (${lane.zombieMinion.currentAttack}/${lane.zombieMinion.currentHealth})!`)
    }
  }

  return { updatedState, events }
}

/**
 * Triggered when a minion is hurt by combat or trick
 */
export function triggerWhenHurt(
  state: GameState,
  minion: Minion,
  damageDealt: number
): AbilityTriggerResult {
  let updatedState = { ...state }
  const events: string[] = []

  if (damageDealt <= 0) return { updatedState, events }

  // Newspaper Zombie: "When hurt: This gets +4 Attack and Frenzy."
  if (minion.cardId === 'zombie_newspaper_zombie') {
    updatedState.lanes.forEach(l => {
      if (l.zombieMinion && l.zombieMinion.instanceId === minion.instanceId) {
        l.zombieMinion = {
          ...l.zombieMinion,
          currentAttack: l.zombieMinion.currentAttack + 4,
          frenzy: true,
        }
        events.push(`Báo của Newspaper Zombie bị rách! Tức giận nhận +4 Attack và Cuồng nộ (Frenzy) (hiện có ${l.zombieMinion.currentAttack} ATK)!`)
      }
    })
  }

  return { updatedState, events }
}

/**
 * Triggered at the start of a turn (e.g. Sunflower, Doubled Mint)
 */
export function triggerStartOfTurn(state: GameState, side: Side): AbilityTriggerResult {
  let updatedState: GameState = {
    ...state,
    lanes: state.lanes.map(l => ({ ...l })),
  }
  const events: string[] = []

  if (side === 'plants') {
    // 1. Sunflower: "Start of Turn: You get +1 Sun"
    let bonusSun = 0
    updatedState.lanes.forEach(l => {
      if (l.plantMinion && l.plantMinion.cardId === 'plant_sunflower') {
        bonusSun += 1
      }
      if (l.plantTeamUpMinion && l.plantTeamUpMinion.cardId === 'plant_sunflower') {
        bonusSun += 1
      }
    })

    if (bonusSun > 0) {
      updatedState.plantHero = {
        ...updatedState.plantHero,
        sun: updatedState.plantHero.sun + bonusSun,
      }
      events.push(`🌻 Hoa Hướng Dương tỏa sáng: Cung cấp thêm +${bonusSun} Sun đầu lượt!`)
    }

    // 2. Doubled Mint: "Start of Turn: Double this Plant's Attack and Health"
    updatedState.lanes.forEach(l => {
      if (l.plantMinion && l.plantMinion.cardId === 'plant_doubled_mint') {
        const newAtk = l.plantMinion.currentAttack * 2
        const newHp = l.plantMinion.currentHealth * 2
        l.plantMinion = {
          ...l.plantMinion,
          currentAttack: newAtk,
          currentHealth: newHp,
          maxHealth: Math.max(l.plantMinion.maxHealth, newHp),
        }
        events.push(`🌱 Doubled Mint nhân đôi chỉ số: Tăng lên ${newAtk} ATK / ${newHp} HP!`)
      }
    })
  }

  return { updatedState, events }
}

/**
 * Triggered when a card is drawn (Dino-Roar: Bananasaurus Rex)
 */
export function triggerDinoRoar(state: GameState, side: Side): AbilityTriggerResult {
  let updatedState: GameState = {
    ...state,
    lanes: state.lanes.map(l => ({ ...l })),
  }
  const events: string[] = []

  if (side === 'plants') {
    updatedState.lanes.forEach(l => {
      if (l.plantMinion && l.plantMinion.cardId === 'plant_bananasaurus_rex') {
        l.plantMinion = {
          ...l.plantMinion,
          currentAttack: l.plantMinion.currentAttack + 1,
          currentHealth: l.plantMinion.currentHealth + 1,
          maxHealth: l.plantMinion.maxHealth + 1,
        }
        events.push(`🦖 Bananasaurus Rex gầm vang (Dino-Roar): Nhận +1/+1 (hiện là ${l.plantMinion.currentAttack}/${l.plantMinion.currentHealth})!`)
      }
    })
  }

  return { updatedState, events }
}

/**
 * Triggered when a trick is played (Black-Eyed Pea, Trickster discount in hand)
 */
export function triggerWhenTrickPlayed(state: GameState, _trickCard: Card, casterSide: Side): AbilityTriggerResult {
  let updatedState: GameState = {
    ...state,
    lanes: state.lanes.map(l => ({ ...l })),
    zombieHand: state.zombieHand.map(c => ({ ...c })),
  }
  const events: string[] = []

  if (casterSide === 'zombies') {
    // Black-Eyed Pea: "When a Zombie Trick is played, this gets +1/+1."
    updatedState.lanes.forEach(l => {
      if (l.plantMinion && l.plantMinion.cardId === 'plant_black_eyed_pea') {
        l.plantMinion = {
          ...l.plantMinion,
          currentAttack: l.plantMinion.currentAttack + 1,
          currentHealth: l.plantMinion.currentHealth + 1,
          maxHealth: l.plantMinion.maxHealth + 1,
        }
        events.push(`Black-Eyed Pea phản ứng với Zombie Trick: Nhận +1/+1 (${l.plantMinion.currentAttack}/${l.plantMinion.currentHealth})!`)
      }
    })

    // Trickster in Zombie Hand: Costs 1 Brain less
    updatedState.zombieHand = updatedState.zombieHand.map(c => {
      if (c.id === 'zombie_trickster' && c.cost > 0) {
        return { ...c, cost: Math.max(0, c.cost - 1) }
      }
      return c
    })
  }

  return { updatedState, events }
}

/**
 * Triggered when a minion is destroyed on the board
 * Handles:
 * 1. Valkyrie in Zombie hand: gets +2 Attack when a Zombie is destroyed
 * 2. Minion on-death retaliation / triggers (Potato Mine, Punish-Shroom)
 */
export function triggerWhenDestroyed(
  state: GameState,
  destroyedMinion: Minion,
  laneIndex: number,
  destroyedSide: Side
): AbilityTriggerResult {
  let updatedState: GameState = {
    ...state,
    lanes: state.lanes.map(l => ({ ...l })),
    plantHand: state.plantHand.map(c => ({ ...c })),
    zombieHand: state.zombieHand.map(c => ({ ...c })),
  }
  const events: string[] = []

  // 1. Minion's own When Destroyed ability
  if (destroyedMinion.cardId === 'plant_potato_mine') {
    const lane = updatedState.lanes[laneIndex]
    if (lane && lane.zombieMinion) {
      lane.zombieMinion = {
        ...lane.zombieMinion,
        currentHealth: Math.max(0, lane.zombieMinion.currentHealth - 2),
      }
      events.push(`💥 Potato Mine phát nổ khi bị tiêu diệt: Gây 2 sát thương lên ${lane.zombieMinion.name}!`)
      if (lane.zombieMinion.currentHealth <= 0) {
        events.push(`💥 ${lane.zombieMinion.name} đã bị Potato Mine tiêu diệt!`)
        lane.zombieMinion = null
      }
    }
  }

  // 2. Cascade Triggers for other cards
  if (destroyedSide === 'zombies') {
    // Valkyrie: While in Zombie Hero's hand, this gets +2 Attack when a Zombie is destroyed
    let valkCount = 0
    updatedState.zombieHand = updatedState.zombieHand.map(card => {
      if (card.id === 'zombie_valkyrie') {
        valkCount++
        return {
          ...card,
          attack: (card.attack || 0) + 2,
        }
      }
      return card
    })
    if (valkCount > 0) {
      events.push(`⚔️ Valkyrie trên tay Zombie Hero nhận +2 Tấn công khi ${destroyedMinion.name} hy sinh!`)
    }
  }

  if (destroyedSide === 'plants') {
    const isMushroom =
      destroyedMinion.cardId.includes('shroom') ||
      destroyedMinion.name.toLowerCase().includes('shroom') ||
      destroyedMinion.cardId === 'plant_astro_shroom'

    if (isMushroom) {
      updatedState.lanes.forEach(l => {
        if (l.plantMinion && l.plantMinion.cardId === 'plant_punish_shroom') {
          const zombiesOnBoard = updatedState.lanes.filter(lane => lane.zombieMinion)
          if (zombiesOnBoard.length > 0) {
            const targetLane = zombiesOnBoard[Math.floor(Math.random() * zombiesOnBoard.length)]
            if (targetLane.zombieMinion) {
              targetLane.zombieMinion = {
                ...targetLane.zombieMinion,
                currentHealth: Math.max(0, targetLane.zombieMinion.currentHealth - 2),
              }
              events.push(`🍄 Punish-Shroom phẫn nộ vì nấm đồng minh hy sinh: Bắn 2 sát thương lên ${targetLane.zombieMinion.name}!`)
              if (targetLane.zombieMinion.currentHealth <= 0) {
                events.push(`💥 ${targetLane.zombieMinion.name} bị Punish-Shroom tiêu diệt!`)
                targetLane.zombieMinion = null
              }
            }
          } else {
            const res = applyHeroDamage(updatedState.zombieHero, 2, false)
            updatedState.zombieHero = res.updatedHero
            events.push(`🍄 Punish-Shroom phẫn nộ bắn 2 sát thương vào Zombie Hero!`)
          }
        }
      })
    }
  }

  return { updatedState, events }
}

/**
 * Reveals all Gravestones on the board at the beginning of ZOMBIE_TRICKS phase.
 * Gravestones crack open (isGravestone: false), revealing the underlying zombie minion
 * and triggering its "When revealed" / "When played" abilities from left to right.
 */
export function revealGravestones(state: GameState): {
  updatedState: GameState
  events: CombatEvent[]
} {
  let updatedState: GameState = {
    ...state,
    lanes: state.lanes.map(l => ({ ...l })),
    combatLog: [...state.combatLog],
  }
  const events: CombatEvent[] = []

  // Reveal Gravestones lane-by-lane from left to right (lane 0 to 4)
  for (let laneIdx = 0; laneIdx < updatedState.lanes.length; laneIdx++) {
    const lane = updatedState.lanes[laneIdx]
    const minion = lane.zombieMinion
    if (minion && minion.isGravestone) {
      // Crack open gravestone
      const revealedMinion: Minion = {
        ...minion,
        isGravestone: false,
      }
      lane.zombieMinion = revealedMinion

      const revealDesc = `🪦 Bia Mộ vỡ tung tại ${lane.name}: ${revealedMinion.name} (${revealedMinion.currentAttack}/${revealedMinion.currentHealth}) xuất đầu lộ diện!`
      events.push({
        laneIndex: laneIdx,
        attackerSide: 'zombies',
        attackerName: revealedMinion.name,
        target: 'minion',
        targetSide: 'zombies',
        damageDealt: 0,
        isBlocked: false,
        isLethal: false,
        description: revealDesc,
      })
      updatedState.combatLog.unshift(revealDesc)

      // Trigger "When revealed" / "When played" abilities (e.g. Conga Zombie, Ra Zombie)
      const abilityRes = triggerWhenPlayed(updatedState, revealedMinion, laneIdx, 'zombies')
      updatedState = abilityRes.updatedState
      if (abilityRes.events.length > 0) {
        for (const evtDesc of abilityRes.events) {
          events.push({
            laneIndex: laneIdx,
            attackerSide: 'zombies',
            attackerName: revealedMinion.name,
            target: 'minion',
            targetSide: 'plants',
            damageDealt: 0,
            isBlocked: false,
            isLethal: false,
            description: evtDesc,
          })
          updatedState.combatLog.unshift(evtDesc)
        }
      }
    }
  }

  return {
    updatedState,
    events,
  }
}
