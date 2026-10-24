/**
 * PvZ Heroes Replicate - Card Ability Trigger System
 * Handles card triggers: When Played, When Hurt, Start of Turn, Dino-Roar, When Destroyed
 */

import type { GameState, Side, Minion, Card, CombatEvent, HeroState } from './types'
import { applyHeroDamage, triggerBonusAttack } from './combat'

export interface AbilityTriggerResult {
  updatedState: GameState
  events: string[]
}

export function isSportsZombie(minion: Minion): boolean {
  const tribe = (minion.tribe || '').toLowerCase()
  const id = minion.cardId.toLowerCase()
  const name = minion.name.toLowerCase()
  return (
    tribe.includes('sports') ||
    id.includes('football') ||
    id.includes('coach') ||
    id.includes('all_star') ||
    id.includes('arm_wrestler') ||
    name.includes('coach') ||
    name.includes('football')
  )
}

export function isScienceZombie(minion: Minion): boolean {
  const tribe = (minion.tribe || '').toLowerCase()
  const id = minion.cardId.toLowerCase()
  const name = minion.name.toLowerCase()
  return (
    tribe.includes('science') ||
    id.includes('scientist') ||
    id.includes('drone') ||
    id.includes('spacetime') ||
    id.includes('interdimensional') ||
    name.includes('scientist')
  )
}

export function isMushroomPlant(minion: Minion): boolean {
  const tribe = (minion.tribe || '').toLowerCase()
  const id = minion.cardId.toLowerCase()
  const name = minion.name.toLowerCase()
  return (
    tribe.includes('mushroom') ||
    id.includes('shroom') ||
    name.includes('shroom') ||
    name.includes('mushroom')
  )
}

export function isPeaPlant(minion: Minion): boolean {
  const tribe = (minion.tribe || '').toLowerCase()
  const id = minion.cardId.toLowerCase()
  const name = minion.name.toLowerCase()
  return (
    tribe.includes('pea') ||
    id.includes('pea') ||
    name.includes('pea')
  )
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

    case 'plant_brainana': {
      // Brainana: When played: Zombie Hero loses all their Brains
      const lostBrains = updatedState.zombieHero.brains
      updatedState.zombieHero = {
        ...updatedState.zombieHero,
        brains: 0,
      }
      events.push(`🍌 Brainana xuất trận: Hút sạch toàn bộ ${lostBrains} Não (Brains) của Zombie Hero!`)
      break
    }

    case 'plant_cornucopia': {
      // Cornucopia: Make a random Plant in each other open lane
      const CORNUCOPIA_PLANT_POOL: {
        cardId: string
        name: string
        attack: number
        health: number
        amphibious?: boolean
        teamUp?: boolean
        bullseye?: boolean
        doubleStrike?: boolean
        armored?: number
        image: string
      }[] = [
        { cardId: 'plant_kernel_corn', name: 'Kernel Corn', attack: 6, health: 6, image: '/assets/cards/plants/Kernel Corn.png' },
        { cardId: 'plant_briar_rose', name: 'Briar Rose', attack: 3, health: 4, image: '/assets/heroes/plants/Rose.png' },
        { cardId: 'plant_doubled_mint', name: 'Doubled Mint', attack: 1, health: 2, image: '/assets/cards/plants/Doubled Mint.png' },
        { cardId: 'plant_repeater', name: 'Repeater', attack: 2, health: 2, doubleStrike: true, image: '/assets/cards/plants/Repeater.png' },
        { cardId: 'plant_bonk_choy', name: 'Bonk Choy', attack: 2, health: 1, image: '/assets/cards/plants/Bonk Choy.png' },
        { cardId: 'plant_snow_pea', name: 'Snow Pea', attack: 2, health: 2, image: '/assets/cards/plants/Snow Pea.png' },
        { cardId: 'plant_peashooter', name: 'Peashooter', attack: 1, health: 1, image: '/assets/cards/plants/Peashooter.png' },
        { cardId: 'plant_black_eyed_pea', name: 'Black-Eyed Pea', attack: 2, health: 3, image: '/assets/cards/plants/Black-Eyed Pea.png' },
        { cardId: 'plant_sunflower', name: 'Sunflower', attack: 0, health: 1, teamUp: true, image: '/assets/cards/plants/Sunflower.png' },
        { cardId: 'plant_the_great_zucchini', name: 'The Great Zucchini', attack: 7, health: 7, amphibious: true, image: '/assets/cards/plants/The Great Zucchini.png' },
        { cardId: 'plant_admiral_navy_bean', name: 'Admiral Navy Bean', attack: 1, health: 1, amphibious: true, teamUp: true, image: '/assets/cards/plants/Admiral Navy Bean.png' },
      ]

      let spawnedCount = 0
      updatedState.lanes.forEach(l => {
        if (l.index !== laneIndex && !l.plantMinion) {
          const pool = l.type === 'water'
            ? CORNUCOPIA_PLANT_POOL.filter(p => p.amphibious)
            : CORNUCOPIA_PLANT_POOL.filter(p => !p.amphibious)
          if (pool.length > 0) {
            const chosen = pool[Math.floor(Math.random() * pool.length)]
            l.plantMinion = {
              instanceId: `cornucopia_${Date.now()}_${l.index}_${Math.random()}`,
              cardId: chosen.cardId,
              name: chosen.name,
              side: 'plants',
              currentAttack: chosen.attack,
              baseAttack: chosen.attack,
              currentHealth: chosen.health,
              maxHealth: chosen.health,
              amphibious: chosen.amphibious,
              teamUp: chosen.teamUp,
              bullseye: chosen.bullseye,
              doubleStrike: chosen.doubleStrike,
              armored: chosen.armored,
              image: chosen.image,
            }
            spawnedCount++
            events.push(`🌽 Sừng Dê Thịnh Vượng Cornucopia: Triệu hồi ${chosen.name} (${chosen.attack}/${chosen.health}) tại ${l.name}!`)
          }
        }
      })
      if (spawnedCount === 0) {
        events.push('Cornucopia xuất trận nhưng không còn làn nào trống để triệu hồi thêm Plant!')
      }
      break
    }

    case 'plant_gatling_pea': {
      // Gatling Pea: Pea Evolution / Bonus Attack
      events.push(`🌱 Gatling Pea nã đạn liên thanh: Lập tức thực hiện 1 đòn Tấn công thêm (Bonus Attack)!`)
      const targetLane = updatedState.lanes[laneIndex]
      const attackDmg = minion.currentAttack
      if (targetLane.zombieMinion) {
        targetLane.zombieMinion = {
          ...targetLane.zombieMinion,
          currentHealth: Math.max(0, targetLane.zombieMinion.currentHealth - attackDmg),
        }
        events.push(`Gatling Pea xả ${attackDmg} sát thương đòn đánh thêm lên ${targetLane.zombieMinion.name}!`)
        if (targetLane.zombieMinion.currentHealth <= 0) {
          events.push(`💥 ${targetLane.zombieMinion.name} bị tiêu diệt bởi Gatling Pea!`)
          targetLane.zombieMinion = null
        }
      } else {
        const dmg = applyHeroDamage(updatedState.zombieHero, attackDmg, Boolean(minion.bullseye))
        updatedState.zombieHero = dmg.updatedHero
        events.push(`Gatling Pea bắn thẳng mặt Zombie Hero gây ${dmg.actualDamage} sát thương!`)
      }
      break
    }

    case 'plant_pineclone': {
      // Pineclone: Transform all other friendly plants into 3/3 Pineclones
      events.push(`🌲 Pineclone nhân bản: Biến hóa tất cả cây trồng khác của bạn thành bản sao Pineclone 3/3!`)
      let transformedCount = 0
      updatedState.lanes.forEach(l => {
        if (l.plantMinion && l.plantMinion.instanceId !== minion.instanceId) {
          l.plantMinion = {
            instanceId: `pineclone_${Date.now()}_${l.index}_main`,
            cardId: 'plant_pineclone',
            name: 'Pineclone',
            side: 'plants',
            currentAttack: 3,
            baseAttack: 3,
            currentHealth: 3,
            maxHealth: 3,
            tribe: 'Pinecone Plant',
            image: '/assets/cards/plants/Cherry Bomb.png',
            traits: [],
          }
          transformedCount++
        }
        if (l.plantTeamUpMinion && l.plantTeamUpMinion.instanceId !== minion.instanceId) {
          l.plantTeamUpMinion = {
            instanceId: `pineclone_${Date.now()}_${l.index}_teamup`,
            cardId: 'plant_pineclone',
            name: 'Pineclone',
            side: 'plants',
            currentAttack: 3,
            baseAttack: 3,
            currentHealth: 3,
            maxHealth: 3,
            tribe: 'Pinecone Plant',
            image: '/assets/cards/plants/Cherry Bomb.png',
            traits: [],
          }
          transformedCount++
        }
      })
      if (transformedCount > 0) {
        events.push(`Đã biến hóa thành công ${transformedCount} cây trồng thành Pineclone 3/3!`)
      }
      break
    }

    case 'zombie_intergalactic_warlord': {
      // Intergalactic Warlord: Zombie Evolution: All Zombies get +1/+1
      events.push(`🛸 Intergalactic Warlord xuất trận (Zombie Evolution): Toàn bộ Zombie trên sân và rút về sau nhận vĩnh viễn +1/+1!`)
      updatedState.lanes.forEach(l => {
        if (l.zombieMinion) {
          l.zombieMinion = {
            ...l.zombieMinion,
            currentAttack: l.zombieMinion.currentAttack + 1,
            baseAttack: l.zombieMinion.baseAttack + 1,
            currentHealth: l.zombieMinion.currentHealth + 1,
            maxHealth: l.zombieMinion.maxHealth + 1,
          }
        }
      })
      updatedState.zombieHand = updatedState.zombieHand.map(c => {
        if (c.type === 'minion') {
          return {
            ...c,
            attack: c.attack + 1,
            health: c.health + 1,
          }
        }
        return c
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

    case 'zombie_disco_tron_3000': {
      // Disco-Tron 3000: Make two 1/1 Backup Dancers in other random lanes
      let dancersCreated = 0
      for (let i = 0; i < 2; i++) {
        const availableLanes = updatedState.lanes.filter(
          l => !l.zombieMinion && l.type !== 'water' && l.index !== laneIndex
        )
        if (availableLanes.length > 0) {
          const chosenLane = availableLanes[Math.floor(Math.random() * availableLanes.length)]
          updatedState.lanes[chosenLane.index].zombieMinion = {
            instanceId: `backup_dancer_${Date.now()}_${i}_${Math.random()}`,
            cardId: 'zombie_backup_dancer',
            name: 'Backup Dancer',
            side: 'zombies',
            currentAttack: 1,
            baseAttack: 1,
            currentHealth: 1,
            maxHealth: 1,
            image: '/assets/cards/zombies/Disco Zombie.png',
          }
          dancersCreated++
          events.push(`🪩 Disco-Tron 3000 bật đèn laser: Triệu hồi 1/1 Backup Dancer tại ${chosenLane.name}!`)
        }
      }
      if (dancersCreated === 0) {
        events.push('Disco-Tron 3000 xuất hiện nhưng các làn khác đã kín chỗ!')
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

    case 'zombie_synchronized_swimmer': {
      // Synchronized Swimmer: Copy the stats of another Zombie with highest stats on board
      const otherZombies = updatedState.lanes
        .map(l => l.zombieMinion)
        .filter((z): z is Minion => Boolean(z && z.instanceId !== minion.instanceId))
      if (otherZombies.length > 0) {
        otherZombies.sort((a, b) => (b.currentAttack + b.currentHealth) - (a.currentAttack + a.currentHealth))
        const target = otherZombies[0]
        const currentLane = updatedState.lanes[laneIndex]
        if (currentLane.zombieMinion) {
          currentLane.zombieMinion = {
            ...currentLane.zombieMinion,
            currentAttack: target.currentAttack,
            baseAttack: target.currentAttack,
            currentHealth: target.currentHealth,
            maxHealth: target.currentHealth,
          }
          events.push(`🏊 Synchronized Swimmer sao chép chỉ số của ${target.name}: Tăng chỉ số thành ${target.currentAttack}/${target.currentHealth}!`)
        }
      }
      break
    }

    case 'zombie_coach': {
      // Zombie Coach: All Sports Zombies cannot be hurt this turn
      let sportsCount = 0
      updatedState.lanes.forEach(l => {
        if (l.zombieMinion && isSportsZombie(l.zombieMinion)) {
          l.zombieMinion = {
            ...l.zombieMinion,
            isInvulnerable: true,
            invulnerableThisTurn: true,
          }
          sportsCount++
        }
      })
      events.push(`🏈 Zombie Coach thổi còi huấn luyện: ${sportsCount} Zombie thuộc tộc Thể thao (Sports) không thể bị tổn thương trong lượt này!`)
      break
    }

    case 'zombie_gadget_scientist': {
      // Gadget Scientist: All Science Zombies do a bonus attack
      events.push(`🔬 Gadget Scientist kích hoạt phát minh: Toàn bộ Science Zombies trên sân lập tức tung đòn Bonus Attack!`)
      for (let i = 0; i < updatedState.lanes.length; i++) {
        if (updatedState.winner) break
        const currentZ = updatedState.lanes[i].zombieMinion
        if (currentZ && isScienceZombie(currentZ) && currentZ.currentHealth > 0) {
          const bonusRes = triggerBonusAttack(updatedState, i, 'zombies')
          updatedState = bonusRes.updatedState
          events.push(...bonusRes.logs)
        }
      }
      break
    }

    case 'plant_buff_shroom': {
      // Buff-Shroom: All Mushrooms get +1/+1
      let mushroomCount = 0
      updatedState.lanes.forEach(l => {
        if (l.plantMinion && isMushroomPlant(l.plantMinion)) {
          l.plantMinion = {
            ...l.plantMinion,
            currentAttack: l.plantMinion.currentAttack + 1,
            baseAttack: l.plantMinion.baseAttack + 1,
            currentHealth: l.plantMinion.currentHealth + 1,
            maxHealth: l.plantMinion.maxHealth + 1,
          }
          mushroomCount++
        }
        if (l.plantTeamUpMinion && isMushroomPlant(l.plantTeamUpMinion)) {
          l.plantTeamUpMinion = {
            ...l.plantTeamUpMinion,
            currentAttack: l.plantTeamUpMinion.currentAttack + 1,
            baseAttack: l.plantTeamUpMinion.baseAttack + 1,
            currentHealth: l.plantTeamUpMinion.currentHealth + 1,
            maxHealth: l.plantTeamUpMinion.maxHealth + 1,
          }
          mushroomCount++
        }
      })
      events.push(`🍄 Buff-Shroom giải phóng bào tử: Tăng +1/+1 cho ${mushroomCount} Mushroom trên sân!`)
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

    // The Podfather: "When you play another Pea, that Pea gets +2/+2"
    const isPea = minion.name.toLowerCase().includes('pea') || minion.cardId.includes('pea')
    if (isPea) {
      let podfatherCount = 0
      updatedState.lanes.forEach(l => {
        if (l.plantMinion && l.plantMinion.cardId === 'plant_podfather' && l.plantMinion.instanceId !== minion.instanceId) {
          podfatherCount++
        }
        if (l.plantTeamUpMinion && l.plantTeamUpMinion.cardId === 'plant_podfather' && l.plantTeamUpMinion.instanceId !== minion.instanceId) {
          podfatherCount++
        }
      })

      if (podfatherCount > 0) {
        const buff = podfatherCount * 2
        const targetLane = updatedState.lanes[laneIndex]
        if (targetLane.plantMinion?.instanceId === minion.instanceId) {
          targetLane.plantMinion = {
            ...targetLane.plantMinion,
            currentAttack: targetLane.plantMinion.currentAttack + buff,
            baseAttack: targetLane.plantMinion.baseAttack + buff,
            currentHealth: targetLane.plantMinion.currentHealth + buff,
            maxHealth: targetLane.plantMinion.maxHealth + buff,
          }
          events.push(`🌱 The Podfather ban sức mạnh (+${buff}/+${buff}) cho ${targetLane.plantMinion.name} (${targetLane.plantMinion.currentAttack}/${targetLane.plantMinion.currentHealth})!`)
        } else if (targetLane.plantTeamUpMinion?.instanceId === minion.instanceId) {
          targetLane.plantTeamUpMinion = {
            ...targetLane.plantTeamUpMinion,
            currentAttack: targetLane.plantTeamUpMinion.currentAttack + buff,
            baseAttack: targetLane.plantTeamUpMinion.baseAttack + buff,
            currentHealth: targetLane.plantTeamUpMinion.currentHealth + buff,
            maxHealth: targetLane.plantTeamUpMinion.maxHealth + buff,
          }
          events.push(`🌱 The Podfather ban sức mạnh (+${buff}/+${buff}) cho ${targetLane.plantTeamUpMinion.name} (${targetLane.plantTeamUpMinion.currentAttack}/${targetLane.plantTeamUpMinion.currentHealth})!`)
        }
      }
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
 * Checks whether a minion belongs to the Flower tribe
 */
export function isFlowerPlant(minion: Minion): boolean {
  if (minion.side !== 'plants') return false
  if (minion.tribe?.toLowerCase().includes('flower')) return true
  const id = minion.cardId.toLowerCase()
  const name = minion.name.toLowerCase()
  return (
    id === 'plant_briar_rose' ||
    id === 'plant_sunflower' ||
    id === 'plant_snowdrop' ||
    name.includes('flower') ||
    name.includes('rose') ||
    name.includes('sunflower')
  )
}

/**
 * Triggered when a minion is hurt by combat or trick
 */
export function triggerWhenHurt(
  state: GameState,
  minion: Minion,
  damageDealt: number,
  attackerMinion?: Minion,
  laneIndex?: number
): AbilityTriggerResult {
  let updatedState: GameState = {
    ...state,
    lanes: state.lanes.map(l => ({ ...l })),
  }
  const events: string[] = []

  if (damageDealt <= 0) return { updatedState, events }

  // 1. Newspaper Zombie: "When hurt: This gets +4 Attack and Frenzy."
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

  // 2. Briar Rose: "When a Zombie hurts a Flower, destroy that Zombie."
  if (isFlowerPlant(minion)) {
    const hasBriarRose = updatedState.lanes.some(
      l => l.plantMinion?.cardId === 'plant_briar_rose' || l.plantTeamUpMinion?.cardId === 'plant_briar_rose'
    )
    if (hasBriarRose) {
      if (attackerMinion && attackerMinion.side === 'zombies') {
        updatedState.lanes.forEach(l => {
          if (l.zombieMinion && l.zombieMinion.instanceId === attackerMinion.instanceId) {
            events.push(`🌹 Briar Rose trả đũa bằng gai nhọn: Zombie ${l.zombieMinion.name} làm tổn thương loài Hoa (${minion.name}), lập tức bị tiêu diệt!`)
            l.zombieMinion = null
          }
        })
      } else if (laneIndex !== undefined && updatedState.lanes[laneIndex]?.zombieMinion) {
        const opposingZombie = updatedState.lanes[laneIndex].zombieMinion
        if (opposingZombie) {
          events.push(`🌹 Briar Rose trả đũa bằng gai nhọn: Zombie ${opposingZombie.name} làm tổn thương loài Hoa (${minion.name}), lập tức bị tiêu diệt!`)
          updatedState.lanes[laneIndex].zombieMinion = null
        }
      }
    }
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
      if (l.plantTeamUpMinion && l.plantTeamUpMinion.cardId === 'plant_bananasaurus_rex') {
        l.plantTeamUpMinion = {
          ...l.plantTeamUpMinion,
          currentAttack: l.plantTeamUpMinion.currentAttack + 1,
          currentHealth: l.plantTeamUpMinion.currentHealth + 1,
          maxHealth: l.plantTeamUpMinion.maxHealth + 1,
        }
        events.push(`🦖 Bananasaurus Rex Team-Up gầm vang (Dino-Roar): Nhận +1/+1 (hiện là ${l.plantTeamUpMinion.currentAttack}/${l.plantTeamUpMinion.currentHealth})!`)
      }
      // Aloesaurus: Dino-Roar: Heal all Plants and the Plant Hero for 2!
      const hasAloe = (l.plantMinion && l.plantMinion.cardId === 'plant_aloeosaurus') || (l.plantTeamUpMinion && l.plantTeamUpMinion.cardId === 'plant_aloeosaurus')
      if (hasAloe) {
        updatedState.lanes.forEach(lane => {
          if (lane.plantMinion) {
            lane.plantMinion = {
              ...lane.plantMinion,
              currentHealth: Math.min(lane.plantMinion.maxHealth, lane.plantMinion.currentHealth + 2),
            }
          }
          if (lane.plantTeamUpMinion) {
            lane.plantTeamUpMinion = {
              ...lane.plantTeamUpMinion,
              currentHealth: Math.min(lane.plantTeamUpMinion.maxHealth, lane.plantTeamUpMinion.currentHealth + 2),
            }
          }
        })
        updatedState.plantHero = {
          ...updatedState.plantHero,
          hp: Math.min(updatedState.plantHero.maxHp, updatedState.plantHero.hp + 2),
        }
        events.push(`🦕 Aloesaurus gầm vang (Dino-Roar): Hồi 2 Máu cho toàn bộ Plants và Plant Hero!`)
      }
    })

    // Quickdraw Con Man: When Plant Hero draws a card, shoot 1 Bullseye damage to Plant Hero!
    updatedState.lanes.forEach(lane => {
      if (lane.zombieMinion && lane.zombieMinion.cardId === 'zombie_quickdraw_con_man') {
        const dmg = applyHeroDamage(updatedState.plantHero, 1, true)
        updatedState.plantHero = dmg.updatedHero
        events.push(`🎯 Quickdraw Con Man nổ súng: Bắn 1 sát thương Bullseye vào Plant Hero (Máu Hero còn ${updatedState.plantHero.hp})!`)
      }
    })
  } else if (side === 'zombies') {
    // Raiding Raptor: Dino-Roar: Gets +2 Attack!
    updatedState.lanes.forEach(l => {
      if (l.zombieMinion && l.zombieMinion.cardId === 'zombie_raiding_raptor') {
        l.zombieMinion = {
          ...l.zombieMinion,
          currentAttack: l.zombieMinion.currentAttack + 2,
          baseAttack: l.zombieMinion.baseAttack + 2,
        }
        events.push(`🦖 Raiding Raptor gầm vang (Dino-Roar): Nhận +2 Tấn công (+2 ATK, hiện là ${l.zombieMinion.currentAttack})!`)
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
    let tricksterDiscounted = false
    updatedState.zombieHand = updatedState.zombieHand.map(c => {
      if (c.id === 'zombie_trickster' && c.cost > 0) {
        tricksterDiscounted = true
        return { ...c, cost: Math.max(0, c.cost - 1) }
      }
      return c
    })
    if (tricksterDiscounted) {
      events.push('🃏 Trickster trên tay Zombie được giảm 1 Brain chi phí!')
    }

    // Sportacus: "When a Zombie Trick is played, do 2 damage to Zombie Hero"
    updatedState.lanes.forEach(l => {
      const hasSportacus =
        (l.plantMinion && l.plantMinion.cardId === 'plant_sportacus') ||
        (l.plantTeamUpMinion && l.plantTeamUpMinion.cardId === 'plant_sportacus')
      if (hasSportacus) {
        const res = applyHeroDamage(updatedState.zombieHero, 2, false)
        updatedState.zombieHero = res.updatedHero
        events.push('🍄 Sportacus phản ứng với Zombie Trick: Bắn 2 sát thương vào Zombie Hero!')
      }
    })

    // Trick-or-Treater: "When you play a Trick, add a Treat trick to your hand"
    const hasTrickOrTreater = updatedState.lanes.some(l => l.zombieMinion?.cardId === 'zombie_trick_or_treater')
    if (hasTrickOrTreater && updatedState.zombieHand.length < 10) {
      const TREAT_POOL: Card[] = [
        {
          id: `zombie_healthy_treat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: 'Healthy Treat',
          side: 'zombies',
          cost: 1,
          attack: 0,
          health: 0,
          type: 'trick',
          image: '/assets/cards/zombies/Lurch for Lunch.png',
          description: 'Một Zombie nhận +1 Tấn công và +3 Máu (+1/+3).',
        },
        {
          id: `zombie_sugary_treat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: 'Sugary Treat',
          side: 'zombies',
          cost: 1,
          attack: 0,
          health: 0,
          type: 'trick',
          image: '/assets/cards/zombies/Bungee Plumber.png',
          description: 'Một Zombie nhận +3 Tấn công và +1 Máu (+3/+1).',
        },
      ]
      const treat = TREAT_POOL[Math.floor(Math.random() * TREAT_POOL.length)]
      updatedState.zombieHand = [...updatedState.zombieHand, treat]
      events.push(`🍬 Trick-or-Treater phát kẹo Treat: Thêm 1 lá [${treat.name}] vào tay Zombie!`)
    }
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

  if (destroyedMinion.cardId === 'plant_galacta_cactus') {
    events.push(`🌌 Galacta-Cactus phát nổ vũ trụ khi bị tiêu diệt: Gây 1 sát thương lên TẤT CẢ mọi thứ!`)
    updatedState.lanes.forEach(lane => {
      if (lane.plantMinion && lane.plantMinion.instanceId !== destroyedMinion.instanceId) {
        lane.plantMinion = {
          ...lane.plantMinion,
          currentHealth: Math.max(0, lane.plantMinion.currentHealth - 1),
        }
        if (lane.plantMinion.currentHealth <= 0) {
          events.push(`💥 ${lane.plantMinion.name} bị Galacta-Cactus tiêu diệt!`)
          lane.plantMinion = null
        }
      }
      if (lane.plantTeamUpMinion && lane.plantTeamUpMinion.instanceId !== destroyedMinion.instanceId) {
        lane.plantTeamUpMinion = {
          ...lane.plantTeamUpMinion,
          currentHealth: Math.max(0, lane.plantTeamUpMinion.currentHealth - 1),
        }
        if (lane.plantTeamUpMinion.currentHealth <= 0) {
          events.push(`💥 ${lane.plantTeamUpMinion.name} bị Galacta-Cactus tiêu diệt!`)
          lane.plantTeamUpMinion = null
        }
      }
      if (lane.zombieMinion) {
        const armor = lane.zombieMinion.armored || 0
        const dmg = Math.max(0, 1 - armor)
        lane.zombieMinion = {
          ...lane.zombieMinion,
          currentHealth: Math.max(0, lane.zombieMinion.currentHealth - dmg),
        }
        if (lane.zombieMinion.currentHealth <= 0) {
          events.push(`💥 ${lane.zombieMinion.name} bị Galacta-Cactus tiêu diệt!`)
          lane.zombieMinion = null
        }
      }
    })

    const plantHeroDmg = applyHeroDamage(updatedState.plantHero, 1, true)
    updatedState.plantHero = plantHeroDmg.updatedHero
    const zombieHeroDmg = applyHeroDamage(updatedState.zombieHero, 1, true)
    updatedState.zombieHero = zombieHeroDmg.updatedHero
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

export interface FreezeResult {
  updatedState: GameState
  events: string[]
}

/**
 * Freeze a minion at laneIndex for side
 * - Sets isFrozen: true
 * - If target is a Zombie:
 *   + All Snowdrops on Plants side get +2/+2
 *   + If Winter Squash is on Plants side, the frozen Zombie is destroyed immediately
 */
export function freezeMinion(
  state: GameState,
  laneIndex: number,
  side: Side
): FreezeResult {
  let updatedState: GameState = {
    ...state,
    lanes: state.lanes.map(l => ({ ...l })),
  }
  const events: string[] = []
  const lane = updatedState.lanes[laneIndex]

  if (!lane) {
    events.push(`Làn ${laneIndex} không tồn tại!`)
    return { updatedState: state, events }
  }

  const targetMinion = side === 'zombies' ? lane.zombieMinion : (lane.plantMinion || lane.plantTeamUpMinion)
  if (!targetMinion) {
    events.push(`Không có minion ${side} tại ${lane.name} để đóng băng!`)
    return { updatedState: state, events }
  }

  targetMinion.isFrozen = true
  events.push(`❄️ ${targetMinion.name} tại ${lane.name} đã bị Đóng băng (Frozen)!`)

  // Freeze Synergies (when a Zombie is frozen)
  if (side === 'zombies') {
    // 1. Snowdrop synergy (+2/+2 to every Snowdrop)
    updatedState.lanes.forEach(l => {
      if (l.plantMinion && (l.plantMinion.cardId === 'plant_snowdrop' || l.plantMinion.name.toLowerCase().includes('snowdrop'))) {
        l.plantMinion = {
          ...l.plantMinion,
          currentAttack: l.plantMinion.currentAttack + 2,
          baseAttack: l.plantMinion.baseAttack + 2,
          currentHealth: l.plantMinion.currentHealth + 2,
          maxHealth: l.plantMinion.maxHealth + 2,
        }
        events.push(`🌸 Snowdrop (${l.plantMinion.name}) hấp thụ sương tuyết: Nhận +2/+2 (${l.plantMinion.currentAttack}/${l.plantMinion.currentHealth})!`)
      }
      if (l.plantTeamUpMinion && (l.plantTeamUpMinion.cardId === 'plant_snowdrop' || l.plantTeamUpMinion.name.toLowerCase().includes('snowdrop'))) {
        l.plantTeamUpMinion = {
          ...l.plantTeamUpMinion,
          currentAttack: l.plantTeamUpMinion.currentAttack + 2,
          baseAttack: l.plantTeamUpMinion.baseAttack + 2,
          currentHealth: l.plantTeamUpMinion.currentHealth + 2,
          maxHealth: l.plantTeamUpMinion.maxHealth + 2,
        }
        events.push(`🌸 Snowdrop Team-Up (${l.plantTeamUpMinion.name}) hấp thụ sương tuyết: Nhận +2/+2 (${l.plantTeamUpMinion.currentAttack}/${l.plantTeamUpMinion.currentHealth})!`)
      }
    })

    // 2. Winter Squash synergy (destroy the frozen zombie immediately)
    const hasWinterSquash = updatedState.lanes.some(
      l => (l.plantMinion && (l.plantMinion.cardId === 'plant_winter_squash' || l.plantMinion.name.toLowerCase().includes('winter squash'))) ||
           (l.plantTeamUpMinion && (l.plantTeamUpMinion.cardId === 'plant_winter_squash' || l.plantTeamUpMinion.name.toLowerCase().includes('winter squash')))
    )
    if (hasWinterSquash) {
      events.push(`🎃 Winter Squash giáng đòn nghiền nát: Tiêu diệt ngay Zombie bị đóng băng (${targetMinion.name})!`)
      lane.zombieMinion = null
    }
  }

  return { updatedState, events }
}

/**
 * Checks if a minion or hero has the untrickable trait (immune to enemy tricks and superpowers)
 */
export function isUntrickable(unit: Minion | HeroState | null | undefined): boolean {
  if (!unit) return false
  if ('traits' in unit && Array.isArray(unit.traits) && unit.traits.includes('untrickable')) return true
  return Boolean(unit.untrickable)
}

export interface TransformResult {
  updatedState: GameState
  transformedMinion: Minion | null
  events: string[]
}

/**
 * Transforms a minion into a new minion based on newCard
 * Preserves lane status, resets buffs/damage, triggers lane environment & When Played abilities
 */
export function transformMinion(
  state: GameState,
  laneIndex: number,
  side: Side,
  newCard: Card
): TransformResult {
  let updatedState: GameState = {
    ...state,
    lanes: state.lanes.map(l => ({ ...l })),
  }
  const events: string[] = []
  const lane = updatedState.lanes[laneIndex]

  if (!lane) {
    events.push(`Làn ${laneIndex} không tồn tại để biến hình!`)
    return { updatedState: state, transformedMinion: null, events }
  }

  const oldMinion = side === 'plants' ? lane.plantMinion : lane.zombieMinion
  if (!oldMinion) {
    events.push(`Không có minion ${side} tại ${lane.name} để biến hình!`)
    return { updatedState: state, transformedMinion: null, events }
  }

  const transformedMinion: Minion = {
    instanceId: `${newCard.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    cardId: newCard.id,
    name: newCard.name,
    side,
    currentAttack: newCard.attack,
    baseAttack: newCard.attack,
    currentHealth: newCard.health,
    maxHealth: newCard.health,
    image: newCard.image,
    traits: newCard.traits ? [...newCard.traits] : [],
    amphibious: Boolean(newCard.amphibious || newCard.traits?.includes('amphibious')),
    bullseye: Boolean(newCard.bullseye || newCard.traits?.includes('bullseye')),
    teamUp: Boolean(newCard.teamUp || newCard.traits?.includes('teamUp')),
    frenzy: Boolean(newCard.frenzy || newCard.traits?.includes('frenzy')),
    deadly: Boolean(newCard.deadly || newCard.traits?.includes('deadly')),
    strikethrough: Boolean(newCard.strikethrough || newCard.traits?.includes('strikethrough')),
    armored: newCard.armored ?? (newCard.traits?.includes('armored') ? 1 : 0),
    freeze: Boolean(newCard.freeze || newCard.traits?.includes('freeze')),
    antiHero: newCard.antiHero,
    doubleStrike: Boolean(newCard.doubleStrike || newCard.traits?.includes('doubleStrike')),
    gravestone: Boolean(newCard.gravestone || newCard.traits?.includes('gravestone')),
    untrickable: Boolean(newCard.untrickable || newCard.traits?.includes('untrickable')),
  }

  if (side === 'plants') {
    lane.plantMinion = transformedMinion
  } else {
    lane.zombieMinion = transformedMinion
  }

  events.push(`🌀 Biến hình: ${oldMinion.name} tại ${lane.name} đã biến đổi thành [${transformedMinion.name}] (${transformedMinion.currentAttack}/${transformedMinion.currentHealth})!`)

  // Check lane environment continuous effects on newly transformed minion
  if (lane.environment) {
    if (lane.environment.id === 'zombie_laser_base_alpha' && side === 'zombies') {
      transformedMinion.deadly = true
      transformedMinion.strikethrough = true
      events.push(`Laser Base Alpha: ${transformedMinion.name} nhận Deadly và Strikethrough!`)
    } else if (lane.environment.id === 'zombie_cone_zone' && side === 'zombies') {
      transformedMinion.currentHealth += 3
      transformedMinion.maxHealth += 3
      events.push(`Cone Zone: ${transformedMinion.name} nhận thêm +3 Máu!`)
    } else if (lane.environment.id === 'plant_bog_of_sunken_hope') {
      if (side === 'plants' && (transformedMinion.amphibious || transformedMinion.traits?.includes('amphibious'))) {
        transformedMinion.currentAttack += 2
        transformedMinion.baseAttack += 2
        transformedMinion.currentHealth += 2
        transformedMinion.maxHealth += 2
        events.push(`Bog of Sunken Hope: Thủy quân ${transformedMinion.name} nhận +2/+2!`)
      } else if (side === 'zombies' && !transformedMinion.amphibious && !transformedMinion.traits?.includes('amphibious')) {
        transformedMinion.currentAttack = Math.max(0, transformedMinion.currentAttack - 2)
        events.push(`Bog of Sunken Hope làm sa lầy: ${transformedMinion.name} bị giảm 2 Tấn công (-2 ATK)!`)
      }
    }
  }

  // Trigger When Played abilities of the newly transformed minion
  const whenPlayedRes = triggerWhenPlayed(updatedState, transformedMinion, laneIndex, side)
  updatedState = whenPlayedRes.updatedState
  if (whenPlayedRes.events.length > 0) {
    events.push(...whenPlayedRes.events)
  }

  return { updatedState, transformedMinion, events }
}
