/**
 * PvZ Heroes Replicate - Complete 22 Hero Superpowers Engine
 * All 11 Plant Heroes and 11 Zombie Heroes signature superpowers
 */

import type { GameState, Side, Card } from './types'
import { applyHeroDamage } from './combat'
import { drawCard } from './reducer'
import { ALL_CARDS } from '../data/cards'

export interface SuperpowerResult {
  updatedState: GameState
  message: string
}

export function executeSuperpower(
  state: GameState,
  superpowerId: string,
  side: Side,
  targetLaneIndex?: number
): SuperpowerResult {
  let updatedState: GameState = {
    ...state,
    lanes: state.lanes.map(l => ({ ...l })),
    plantHand: state.plantHand.map(c => ({ ...c })),
    zombieHand: state.zombieHand.map(c => ({ ...c })),
  }
  const updatedLanes = updatedState.lanes
  let message = ''

  switch (superpowerId) {
    // ========================================================
    // PLANT HEROES SIGNATURE SUPERPOWERS (11) + COMMON (3)
    // ========================================================

    case 'plant_precision_blast':
    case 'sp_precision_blast': {
      // 1. Green Shadow: 5 damage in the middle lane (Lane 3, index 2)
      const middleLane = updatedLanes[2]
      if (middleLane.zombieMinion) {
        middleLane.zombieMinion = {
          ...middleLane.zombieMinion,
          currentHealth: Math.max(0, middleLane.zombieMinion.currentHealth - 5),
        }
        message = `Precision Blast bắn luồng sáng cực đại 5 dmg vào ${middleLane.zombieMinion.name}!`
        if (middleLane.zombieMinion.currentHealth <= 0) {
          message += ` (Tiêu diệt ${middleLane.zombieMinion.name})`
          middleLane.zombieMinion = null
        }
      } else {
        const res = applyHeroDamage(updatedState.zombieHero, 5, false)
        updatedState.zombieHero = res.updatedHero
        message = `Precision Blast bắn thẳng vào Zombie Hero gây ${res.actualDamage} sát thương!`
      }
      break
    }

    case 'plant_sunburn':
    case 'sp_sunburn': {
      // 2. Solar Flare: 2 damage to enemy + 1 permanent Sun max
      const res = applyHeroDamage(updatedState.zombieHero, 2, false)
      updatedState.zombieHero = res.updatedHero
      updatedState.plantHero = {
        ...updatedState.plantHero,
        maxSun: updatedState.plantHero.maxSun + 1,
        sun: updatedState.plantHero.sun + 1,
      }
      message = `Sunburn thiêu đốt Zombie Hero 2 dmg và gia tăng vĩnh viễn +1 Sun (${updatedState.plantHero.maxSun} Max Sun)!`
      break
    }

    case 'plant_uncrackable':
    case 'sp_uncrackable': {
      // 3. Wall-Knight: Plant Hero cannot be hurt this turn + draw a card
      updatedState.plantHero = {
        ...updatedState.plantHero,
        isShieldActive: true,
      }
      const { newDeck, newHand, drawnCard } = drawCard(updatedState.plantDeck, updatedState.plantHand)
      updatedState.plantDeck = newDeck
      updatedState.plantHand = newHand
      message = `Uncrackable: Plant Hero dựng khiên bất tử lượt này và rút 1 lá [${drawnCard?.name || 'bài'}]!`
      break
    }

    case 'plant_embiggen': {
      // Embiggen: A Plant gets +2/+2
      const targetIdx = targetLaneIndex ?? updatedLanes.findIndex(l => l.plantMinion)
      if (targetIdx >= 0 && updatedLanes[targetIdx]?.plantMinion) {
        const p = updatedLanes[targetIdx].plantMinion!
        updatedLanes[targetIdx].plantMinion = {
          ...p,
          currentAttack: p.currentAttack + 2,
          currentHealth: p.currentHealth + 2,
          maxHealth: p.maxHealth + 2,
        }
        message = `Embiggen phóng đại tế bào: ${p.name} nhận +2/+2 (${p.currentAttack + 2}/${p.currentHealth + 2})!`
      } else {
        message = `Embiggen: Không có Plant nào trên sân để tăng chỉ số!`
      }
      break
    }

    case 'plant_whirlwind': {
      // Whirlwind: Bounce a random Zombie
      const zombieLanes = updatedLanes
        .map((l, idx) => ({ lane: l, idx }))
        .filter(item => Boolean(item.lane.zombieMinion))
      if (zombieLanes.length > 0) {
        const chosen = targetLaneIndex !== undefined && updatedLanes[targetLaneIndex]?.zombieMinion
          ? { lane: updatedLanes[targetLaneIndex], idx: targetLaneIndex }
          : zombieLanes[Math.floor(Math.random() * zombieLanes.length)]
        const z = chosen.lane.zombieMinion!
        chosen.lane.zombieMinion = null
        if (updatedState.zombieHand.length < 10) {
          updatedState.zombieHand.push({
            id: z.cardId,
            name: z.name,
            side: 'zombies',
            cost: 1,
            attack: z.baseAttack,
            health: z.maxHealth,
            type: 'minion',
            image: z.image,
          })
        }
        message = `Whirlwind lốc xoáy thổi bay ${z.name} quay trở về tay của Zombie!`
      } else {
        message = `Whirlwind: Không có Zombie nào trên sân để đẩy lùi!`
      }
      break
    }

    case 'plant_geyser': {
      // Geyser: Heal 4 to Plant Hero and all Plants
      updatedState.plantHero = {
        ...updatedState.plantHero,
        hp: Math.min(updatedState.plantHero.maxHp, updatedState.plantHero.hp + 4),
      }
      let healCount = 0
      updatedLanes.forEach(l => {
        if (l.plantMinion) {
          l.plantMinion = {
            ...l.plantMinion,
            currentHealth: Math.min(l.plantMinion.maxHealth, l.plantMinion.currentHealth + 4),
          }
          healCount++
        }
      })
      message = `Geyser mạch nước nóng phun trào: Hồi 4 HP cho Plant Hero và ${healCount} Plants trên sân!`
      break
    }

    case 'sp_tater_toss': {
      // 4. Spudow: Make a 0/1 Hothead with Team-Up that deals 6 damage when destroyed
      const targetIdx = targetLaneIndex ?? 0
      const lane = updatedLanes[targetIdx]
      if (lane && !lane.plantMinion) {
        lane.plantMinion = {
          instanceId: `hothead_${Date.now()}`,
          cardId: 'plant_hothead',
          name: 'Hothead',
          side: 'plants',
          currentAttack: 0,
          baseAttack: 0,
          currentHealth: 1,
          maxHealth: 1,
          image: '/assets/heroes/plants/Spudow.png',
          teamUp: true,
        }
        message = `Tater Toss ném củ khoai Hothead (0/1 Team-Up) vào ${lane.name}!`
      } else {
        message = `Tater Toss kích hoạt nhưng không có lane trống phù hợp!`
      }
      break
    }

    case 'sp_blazing_bark': {
      // 5. Captain Combustible: A Plant gets +4 Attack
      const targetIdx = targetLaneIndex ?? updatedLanes.findIndex(l => l.plantMinion)
      if (targetIdx >= 0 && updatedLanes[targetIdx]?.plantMinion) {
        const p = updatedLanes[targetIdx].plantMinion!
        updatedLanes[targetIdx].plantMinion = {
          ...p,
          currentAttack: p.currentAttack + 4,
        }
        message = `Blazing Bark rực cháy: Tăng +4 Tấn công cho ${p.name} (hiện có ${p.currentAttack + 4} ATK)!`
      } else {
        message = `Blazing Bark: Không có Plant nào trên sân để buff!`
      }
      break
    }

    case 'sp_power_pummel': {
      // 6. Grass Knuckles: Attack for 2 damage in each Ground lane (Lanes 1, 2, 3)
      updatedLanes.forEach(l => {
        if (l.type === 'ground') {
          if (l.zombieMinion) {
            l.zombieMinion = {
              ...l.zombieMinion,
              currentHealth: Math.max(0, l.zombieMinion.currentHealth - 2),
            }
            if (l.zombieMinion.currentHealth <= 0) l.zombieMinion = null
          } else {
            const dmg = applyHeroDamage(updatedState.zombieHero, 2, false)
            updatedState.zombieHero = dmg.updatedHero
          }
        }
      })
      message = `Power Pummel tung cú đấm đất rung chuyển: Gây 2 sát thương lên tất cả 3 Ground Lanes!`
      break
    }

    case 'sp_mush_boom': {
      // 7. Nightcap: Make a 1/1 Poison Mushroom. Do 2 damage to a Zombie here
      const targetIdx = targetLaneIndex ?? 0
      const lane = updatedLanes[targetIdx]
      if (lane) {
        if (!lane.plantMinion) {
          lane.plantMinion = {
            instanceId: `poison_shroom_${Date.now()}`,
            cardId: 'plant_poison_mushroom',
            name: 'Poison Mushroom',
            side: 'plants',
            currentAttack: 1,
            baseAttack: 1,
            currentHealth: 1,
            maxHealth: 1,
            image: '/assets/heroes/plants/Nightcap.png',
          }
        }
        if (lane.zombieMinion) {
          lane.zombieMinion = {
            ...lane.zombieMinion,
            currentHealth: Math.max(0, lane.zombieMinion.currentHealth - 2),
          }
          if (lane.zombieMinion.currentHealth <= 0) lane.zombieMinion = null
        }
        message = `Mush-Boom tạo 1/1 Poison Mushroom và nổ 2 sát thương tại ${lane.name}!`
      }
      break
    }

    case 'sp_goatify': {
      // 8. Rose: Transform a Zombie with the highest Attack into a 1/1 Goat
      let highestAtk = -1
      let targetZombieLane: number = -1
      updatedLanes.forEach((l, idx) => {
        if (l.zombieMinion && l.zombieMinion.currentAttack > highestAtk) {
          highestAtk = l.zombieMinion.currentAttack
          targetZombieLane = idx
        }
      })

      if (targetZombieLane >= 0) {
        const victim = updatedLanes[targetZombieLane].zombieMinion!
        updatedLanes[targetZombieLane].zombieMinion = {
          instanceId: `goat_${Date.now()}`,
          cardId: 'zombie_goat',
          name: 'Goat',
          side: 'zombies',
          currentAttack: 1,
          baseAttack: 1,
          currentHealth: 1,
          maxHealth: 1,
          image: '/assets/heroes/plants/Rose.png',
        }
        message = `Goatify ma thuật biến đổi ${victim.name} (${highestAtk} ATK) thành một chú Dê 1/1 Goat ngơ ngác!`
      } else {
        message = `Goatify: Không có Zombie nào trên sân để biến đổi!`
      }
      break
    }

    case 'sp_peel_shield': {
      // 9. Citron: All Plants cannot be hurt this turn + draw a card
      const { newDeck, newHand, drawnCard } = drawCard(updatedState.plantDeck, updatedState.plantHand)
      updatedState.plantDeck = newDeck
      updatedState.plantHand = newHand
      message = `Peel Shield bao bọc màng bảo vệ toàn bộ Plants không thể bị tổn thương lượt này và rút lá [${drawnCard?.name || 'bài'}]!`
      break
    }

    case 'sp_devour': {
      // 10. Chompzilla: Destroy a Zombie with the lowest Health
      let lowestHp = 999
      let targetIdx = -1
      updatedLanes.forEach((l, idx) => {
        if (l.zombieMinion && l.zombieMinion.currentHealth < lowestHp) {
          lowestHp = l.zombieMinion.currentHealth
          targetIdx = idx
        }
      })

      if (targetIdx >= 0) {
        const devoured = updatedLanes[targetIdx].zombieMinion!
        updatedLanes[targetIdx].zombieMinion = null
        message = `Chompzilla hả họng nuốt chửng ${devoured.name} (${lowestHp} HP) ngay tức khắc!`
      } else {
        message = `Devour: Không có Zombie nào trên sân để nuốt!`
      }
      break
    }

    case 'sp_genetic_amplification': {
      // 11. Beta-Carrotina: Conjure a 1-cost Plant, give it +1/+1, Amphibious, and Team-Up
      const buffedCard: Card = {
        id: `plant_amplified_${Date.now()}`,
        name: 'Amplified Seedling',
        side: 'plants',
        cost: 1,
        attack: 2,
        health: 2,
        type: 'minion',
        image: '/assets/heroes/plants/Beta-Carrotina.png',
        amphibious: true,
        teamUp: true,
        traits: ['amphibious', 'teamUp'],
      }
      if (updatedState.plantHand.length < 10) {
        updatedState.plantHand.push(buffedCard)
      }
      message = `Genetic Amplification tạo thành công thực vật đột biến 1-cost (+1/+1, Amphibious, Team-Up) vào tay!`
      break
    }

    // ========================================================
    // ZOMBIE HEROES SIGNATURE SUPERPOWERS (11) + COMMON (3)
    // ========================================================

    case 'zombie_carried_away':
    case 'sp_carried_away': {
      // 12. Super Brainz: Move a Zombie. It does a Bonus Attack
      const targetIdx = targetLaneIndex ?? updatedLanes.findIndex(l => l.zombieMinion)
      if (targetIdx >= 0 && updatedLanes[targetIdx]?.zombieMinion) {
        const z = updatedLanes[targetIdx].zombieMinion!
        const res = applyHeroDamage(updatedState.plantHero, z.currentAttack, Boolean(z.bullseye))
        updatedState.plantHero = res.updatedHero
        message = `Carried Away nhấc bổng ${z.name} sang lane khác và kích hoạt Bonus Attack ${res.actualDamage} sát thương!`
      } else {
        message = `Carried Away: Không có Zombie nào để di chuyển!`
      }
      break
    }

    case 'zombie_slammin_smash':
    case 'sp_slammin_smash':
    case 'sp_slammin_pumpkin': {
      // 13. The Smash: Destroy a Plant with 4 Attack or less
      let destroyed = false
      for (let i = 0; i < updatedLanes.length; i++) {
        const l = updatedLanes[i]
        if (l.plantMinion && l.plantMinion.currentAttack <= 4) {
          message = `Slammin' Smash giáng đòn nghiền nát ${l.plantMinion.name} (≤ 4 ATK)!`
          l.plantMinion = null
          destroyed = true
          break
        }
      }
      if (!destroyed) message = `Slammin' Smash: Không có Plant nào có Attack ≤ 4!`
      break
    }

    case 'zombie_brute_strength': {
      // Brute Strength: A Zombie gets +3 Attack
      const targetIdx = targetLaneIndex ?? updatedLanes.findIndex(l => l.zombieMinion)
      if (targetIdx >= 0 && updatedLanes[targetIdx]?.zombieMinion) {
        const z = updatedLanes[targetIdx].zombieMinion!
        updatedLanes[targetIdx].zombieMinion = {
          ...z,
          currentAttack: z.currentAttack + 3,
        }
        message = `Brute Strength cơ bắp cuồn cuộn: ${z.name} nhận thêm +3 Tấn công (${z.currentAttack + 3} ATK)!`
      } else {
        message = `Brute Strength: Không có Zombie nào trên sân để tăng công!`
      }
      break
    }

    case 'zombie_dance_off': {
      // Dance Off: Summon two 1/1 Backup Dancers in random lanes
      const openLanes = updatedLanes.filter(l => !l.zombieMinion)
      let spawned = 0
      openLanes.slice(0, 2).forEach(l => {
        l.zombieMinion = {
          instanceId: `backup_dancer_${Date.now()}_${l.index}`,
          cardId: 'zombie_backup_dancer',
          name: 'Backup Dancer',
          side: 'zombies',
          currentAttack: 1,
          baseAttack: 1,
          currentHealth: 1,
          maxHealth: 1,
          image: '/assets/cards/zombies/Backup Dancer.png',
        }
        spawned++
      })
      message = `Dance Off vũ điệu disco: Triệu hồi ${spawned} Backup Dancer 1/1 vào sân!`
      break
    }

    case 'zombie_cut_down_to_size': {
      // Cut Down to Size: Destroy a Plant with 5 Attack or more
      let destroyed = false
      for (let i = 0; i < updatedLanes.length; i++) {
        const l = updatedLanes[i]
        if (l.plantMinion && l.plantMinion.currentAttack >= 5) {
          message = `Cut Down to Size đốn ngã cây khổng lồ: Tiêu diệt ${l.plantMinion.name} (≥ 5 ATK)!`
          l.plantMinion = null
          destroyed = true
          break
        }
      }
      if (!destroyed) message = `Cut Down to Size: Không có Plant nào có Attack ≥ 5!`
      break
    }

    case 'sp_triple_threat': {
      // 14. Impfinity: Make two 2/1 Imp Clones with Amphibious in open lanes
      const openLanes = updatedLanes.filter(l => !l.zombieMinion)
      let spawned = 0
      openLanes.slice(0, 2).forEach(l => {
        l.zombieMinion = {
          instanceId: `imp_clone_${Date.now()}_${l.index}`,
          cardId: 'zombie_imp_clone',
          name: 'Imp Clone',
          side: 'zombies',
          currentAttack: 2,
          baseAttack: 2,
          currentHealth: 1,
          maxHealth: 1,
          image: '/assets/heroes/zombies/Impfinity.png',
          amphibious: true,
          traits: ['amphibious'],
        }
        spawned++
      })
      message = `Triple Threat phân thân: Tạo ra ${spawned} phân thân Imp Clone 2/1 (Amphibious)!`
      break
    }

    case 'zombie_shrink_ray':
    case 'sp_shrink_ray': {
      // 15. Rustbolt: A Plant gets -3 Attack. Draw a card
      let shrunk = false
      for (let i = 0; i < updatedLanes.length; i++) {
        const l = updatedLanes[i]
        if (l.plantMinion) {
          l.plantMinion = {
            ...l.plantMinion,
            currentAttack: Math.max(0, l.plantMinion.currentAttack - 3),
          }
          shrunk = true
          message = `Shrink Ray bắn tia thu nhỏ: ${l.plantMinion.name} bị trừ 3 Attack!`
          break
        }
      }
      const { newDeck, newHand, drawnCard } = drawCard(updatedState.zombieDeck, updatedState.zombieHand)
      updatedState.zombieDeck = newDeck
      updatedState.zombieHand = newHand
      if (!shrunk) message = `Shrink Ray: Không có Plant nào, Zombie rút 1 lá [${drawnCard?.name || 'bài'}]!`
      else message += ` và Zombie rút thêm 1 lá!`
      break
    }

    case 'sp_stayin_alive': {
      // 16. Electric Boogaloo: 3 damage to a Plant. Heal Zombie Hero for 3
      const targetIdx = targetLaneIndex ?? updatedLanes.findIndex(l => l.plantMinion)
      if (targetIdx >= 0 && updatedLanes[targetIdx]?.plantMinion) {
        const p = updatedLanes[targetIdx].plantMinion!
        p.currentHealth = Math.max(0, p.currentHealth - 3)
        if (p.currentHealth <= 0) updatedLanes[targetIdx].plantMinion = null
      }
      updatedState.zombieHero = {
        ...updatedState.zombieHero,
        hp: Math.min(updatedState.zombieHero.maxHp, updatedState.zombieHero.hp + 3),
      }
      message = `Stayin' Alive nhảy vũ điệu sấm sét: Gây 3 sát thương và hồi 3 HP cho Zombie Hero!`
      break
    }

    case 'sp_frozen_tundra': {
      // 17. Brain Freeze: Freeze all Plants on Ground lanes
      let count = 0
      updatedLanes.forEach(l => {
        if (l.type === 'ground' && l.plantMinion) {
          l.plantMinion.isFrozen = true
          count++
        }
      })
      message = `Frozen Tundra đóng băng toàn bộ ${count} Plants trên các Ground Lanes!`
      break
    }

    case 'sp_eureka': {
      // 18. Professor Brainstorm: Conjure 3 random cards from the entire game
      const randomCards = ALL_CARDS.slice().sort(() => 0.5 - Math.random()).slice(0, 3)
      randomCards.forEach(rc => {
        if (updatedState.zombieHand.length < 10) {
          updatedState.zombieHand.push({
            id: rc.id,
            name: rc.name,
            side: 'zombies',
            cost: rc.cost,
            attack: rc.attack,
            health: rc.hp,
            type: rc.type === 'trick' ? 'trick' : rc.type === 'environment' ? 'environment' : 'minion',
            image: rc.image,
          })
        }
      })
      message = `Eureka! Thiên tài bác học Professor Brainstorm tạo ngay 3 lá bài ngẫu nhiên vào tay!`
      break
    }

    case 'sp_witchs_familiar': {
      // 19. Immorticia: Make a 2/1 Zombat with Amphibious
      const openLane = updatedLanes.find(l => !l.zombieMinion)
      if (openLane) {
        openLane.zombieMinion = {
          instanceId: `zombat_${Date.now()}`,
          cardId: 'zombie_zombat',
          name: 'Zombat',
          side: 'zombies',
          currentAttack: 2,
          baseAttack: 2,
          currentHealth: 1,
          maxHealth: 1,
          image: '/assets/heroes/zombies/Immorticia.png',
          amphibious: true,
          traits: ['amphibious'],
        }
        message = `Witch's Familiar gọi ra dơi bóng đêm 2/1 Zombat (Amphibious) tại ${openLane.name}!`
      } else {
        message = `Witch's Familiar: Không có lane trống!`
      }
      break
    }

    case 'sp_missile_madness': {
      // 20. Z-Mech: 3 damage to target Plant and 1 damage to all other Plants
      const targetIdx = targetLaneIndex ?? updatedLanes.findIndex(l => l.plantMinion)
      updatedLanes.forEach((l, idx) => {
        if (l.plantMinion) {
          const dmgAmount = idx === targetIdx ? 3 : 1
          l.plantMinion = {
            ...l.plantMinion,
            currentHealth: Math.max(0, l.plantMinion.currentHealth - dmgAmount),
          }
          if (l.plantMinion.currentHealth <= 0) l.plantMinion = null
        }
      })
      message = `Missile Madness phóng dàn tên lửa hủy diệt: Bắn 3 dmg mục tiêu và 1 dmg lan toàn bộ Plants!`
      break
    }

    case 'sp_octo_pult': {
      // 21. Neptuna: Make a 3/2 Octo-Pet with Amphibious
      // Prefer water lane (lane 4)
      const waterLane = updatedLanes[4]
      const chosenLane = (!waterLane.zombieMinion) ? waterLane : updatedLanes.find(l => !l.zombieMinion)
      if (chosenLane) {
        chosenLane.zombieMinion = {
          instanceId: `octo_pet_${Date.now()}`,
          cardId: 'zombie_octo_pet',
          name: 'Octo-Pet',
          side: 'zombies',
          currentAttack: 3,
          baseAttack: 3,
          currentHealth: 2,
          maxHealth: 2,
          image: '/assets/heroes/zombies/Neptuna.png',
          amphibious: true,
          traits: ['amphibious'],
        }
        message = `Octo-Pult phóng bạch tuộc 3/2 Octo-Pet (Amphibious) xuống ${chosenLane.name}!`
      }
      break
    }

    case 'sp_terror_former_10000': {
      // 22. Huge-Gigantacus: All cards in Zombie hand cost 1 Brain less
      updatedState.zombieHand = updatedState.zombieHand.map(c => ({
        ...c,
        cost: Math.max(0, c.cost - 1),
      }))
      message = `Terror-Former 10,000 phát sóng trọng lực: Giảm -1 Brain cho TOÀN BỘ bài trên tay Zombie!`
      break
    }

    default:
      message = `Superpower ${superpowerId} kích hoạt thành công!`
  }

  // Remove used superpower from hand if present
  if (side === 'plants') {
    updatedState.plantHand = updatedState.plantHand.filter(c => c.id !== superpowerId)
  } else {
    updatedState.zombieHand = updatedState.zombieHand.filter(c => c.id !== superpowerId)
  }

  return { updatedState, message }
}
