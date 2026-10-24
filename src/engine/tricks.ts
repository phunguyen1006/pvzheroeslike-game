import type { GameState, HeroState, Side, Card } from './types'
import { applyHeroDamage } from './combat'
import { drawCard } from './reducer'
import { triggerWhenTrickPlayed, isUntrickable } from './abilities'

export interface TrickResult {
  updatedState: GameState
  success: boolean
  message: string
}

export function executeTrick(
  state: GameState,
  card: Card,
  side: Side,
  targetLaneIndex?: number,
  _targetMinionSide?: Side,
  targetHero?: boolean
): TrickResult {
  // Untrickable check for enemy targeted tricks
  if (side === 'plants') {
    if (targetHero && isUntrickable(state.zombieHero)) {
      return {
        updatedState: state,
        success: false,
        message: 'Zombie Hero có đặc tính Untrickable, miễn nhiễm với mọi Trick của Plants!',
      }
    }
    if (targetLaneIndex !== undefined && state.lanes[targetLaneIndex]?.zombieMinion) {
      const targetZombie = state.lanes[targetLaneIndex].zombieMinion!
      const offensivePlantTricks = ['plant_berry_blast', 'plant_squash', 'plant_shamrocket', 'plant_spring_bean']
      if (offensivePlantTricks.includes(card.id) && isUntrickable(targetZombie)) {
        return {
          updatedState: state,
          success: false,
          message: `${targetZombie.name} có đặc tính Untrickable, miễn nhiễm với mọi Trick của Plants!`,
        }
      }
    }
  } else if (side === 'zombies') {
    if (targetHero && isUntrickable(state.plantHero)) {
      return {
        updatedState: state,
        success: false,
        message: 'Plant Hero có đặc tính Untrickable, miễn nhiễm với mọi Trick của Zombies!',
      }
    }
    if (targetLaneIndex !== undefined) {
      const targetPlant = state.lanes[targetLaneIndex]?.plantMinion || state.lanes[targetLaneIndex]?.plantTeamUpMinion
      const offensiveZombieTricks = ['zombie_bungee_plumber', 'zombie_locust_swarm', 'zombie_rocket_science', 'zombie_final_mission']
      if (targetPlant && offensiveZombieTricks.includes(card.id) && isUntrickable(targetPlant)) {
        return {
          updatedState: state,
          success: false,
          message: `${targetPlant.name} có đặc tính Untrickable, miễn nhiễm với mọi Trick của Zombies!`,
        }
      }
    }
  }

  let updatedState = { ...state }
  const hero = side === 'plants' ? state.plantHero : state.zombieHero

  // Deduct cost (accounting for Dark Matter Dragonfruit effect on Zombie Tricks)
  let extraTrickCost = 0
  if (side === 'zombies' && card.type === 'trick') {
    const hasDMD = state.lanes.some(
      l => l.plantMinion?.cardId === 'plant_dark_matter_dragonfruit' || l.plantTeamUpMinion?.cardId === 'plant_dark_matter_dragonfruit'
    )
    if (hasDMD) extraTrickCost = 6
  }
  const totalCost = card.cost + extraTrickCost

  const updatedHero: HeroState = {
    ...hero,
    sun: side === 'plants' ? hero.sun - card.cost : hero.sun,
    brains: side === 'zombies' ? Math.max(0, hero.brains - totalCost) : hero.brains,
  }

  if (side === 'plants') updatedState.plantHero = updatedHero
  else updatedState.zombieHero = updatedHero

  const updatedLanes = updatedState.lanes.map(l => ({ ...l }))
  let message = ''

  switch (card.id) {
    // === PLANT TRICKS ===
    case 'plant_berry_blast': {
      // 3 damage to any zombie or zombie hero
      if (targetHero) {
        const dmg = applyHeroDamage(updatedState.zombieHero, 3, false)
        updatedState.zombieHero = dmg.updatedHero
        message = `Berry Blast đánh trúng Zombie Hero gây ${dmg.actualDamage} sát thương!`
      } else if (targetLaneIndex !== undefined) {
        const lane = updatedLanes[targetLaneIndex]
        if (lane.zombieMinion) {
          lane.zombieMinion = {
            ...lane.zombieMinion,
            currentHealth: Math.max(0, lane.zombieMinion.currentHealth - 3),
          }
          if (lane.zombieMinion.currentHealth <= 0) {
            message = `Berry Blast tiêu diệt ${lane.zombieMinion.name}!`
            lane.zombieMinion = null
          } else {
            message = `Berry Blast gây 3 sát thương lên ${lane.zombieMinion.name} (còn ${lane.zombieMinion.currentHealth} HP).`
          }
        }
      }
      break
    }

    case 'plant_squash': {
      // Destroy a zombie
      if (targetLaneIndex !== undefined && updatedLanes[targetLaneIndex]?.zombieMinion) {
        const target = updatedLanes[targetLaneIndex].zombieMinion!
        updatedLanes[targetLaneIndex].zombieMinion = null
        message = `Squash đè bẹp tiêu diệt ${target.name}!`
      }
      break
    }

    case 'plant_shamrocket': {
      // Destroy a Zombie that has 4 Attack or more
      if (targetLaneIndex !== undefined && updatedLanes[targetLaneIndex]?.zombieMinion) {
        const target = updatedLanes[targetLaneIndex].zombieMinion!
        if (target.currentAttack >= 4) {
          updatedLanes[targetLaneIndex].zombieMinion = null
          message = `Shamrocket bắn nổ tung ${target.name}!`
        } else {
          return { updatedState: state, success: false, message: 'Mục tiêu phải có từ 4 Attack trở lên!' }
        }
      }
      break
    }

    case 'plant_cherry_bomb': {
      // 4 damage to a zombie and zombies next door (skips untrickable)
      if (targetLaneIndex !== undefined) {
        const lanesToHit = [targetLaneIndex - 1, targetLaneIndex, targetLaneIndex + 1]
        let hitNames: string[] = []
        lanesToHit.forEach(idx => {
          if (idx >= 0 && idx < updatedLanes.length && updatedLanes[idx].zombieMinion && !isUntrickable(updatedLanes[idx].zombieMinion)) {
            const z = updatedLanes[idx].zombieMinion!
            z.currentHealth = Math.max(0, z.currentHealth - 4)
            hitNames.push(z.name)
            if (z.currentHealth <= 0) updatedLanes[idx].zombieMinion = null
          }
        })
        message = `Cherry Bomb phát nổ gây 4 sát thương lan lên: ${hitNames.join(', ') || 'không có ai'}!`
      }
      break
    }

    case 'plant_spring_bean': {
      // Bounce a Zombie
      if (targetLaneIndex !== undefined && updatedLanes[targetLaneIndex]?.zombieMinion) {
        const target = updatedLanes[targetLaneIndex].zombieMinion!
        updatedLanes[targetLaneIndex].zombieMinion = null
        // Add back to zombie hand if room
        if (updatedState.zombieHand.length < 10) {
          updatedState.zombieHand = [
            ...updatedState.zombieHand,
            {
              id: target.cardId,
              name: target.name,
              side: 'zombies',
              cost: target.baseAttack, // approximation or card lookup
              attack: target.baseAttack,
              health: target.maxHealth,
              type: 'minion',
              image: target.image,
            },
          ]
        }
        message = `Spring Bean đẩy lùi ${target.name} về lại tay Zombie!`
      }
      break
    }

    // === ZOMBIE TRICKS ===
    case 'zombie_bungee_plumber': {
      // 2 damage to any plant or plant hero
      if (targetHero) {
        const dmg = applyHeroDamage(updatedState.plantHero, 2, false)
        updatedState.plantHero = dmg.updatedHero
        message = `Bungee Plumber ném thông bồn vào Plant Hero gây ${dmg.actualDamage} sát thương!`
      } else if (targetLaneIndex !== undefined) {
        const lane = updatedLanes[targetLaneIndex]
        if (lane.plantMinion) {
          lane.plantMinion = {
            ...lane.plantMinion,
            currentHealth: Math.max(0, lane.plantMinion.currentHealth - 2),
          }
          if (lane.plantMinion.currentHealth <= 0) {
            message = `Bungee Plumber tiêu diệt ${lane.plantMinion.name}!`
            lane.plantMinion = null
          } else {
            message = `Bungee Plumber gây 2 sát thương lên ${lane.plantMinion.name}.`
          }
        }
      }
      break
    }

    case 'zombie_locust_swarm': {
      // Destroy a Plant
      if (targetLaneIndex !== undefined && updatedLanes[targetLaneIndex]?.plantMinion) {
        const target = updatedLanes[targetLaneIndex].plantMinion!
        updatedLanes[targetLaneIndex].plantMinion = null
        message = `Locust Swarm đàn châu chấu ăn sạch ${target.name}!`
      }
      break
    }

    case 'zombie_rocket_science': {
      // Destroy a plant with 4 Attack or more
      if (targetLaneIndex !== undefined && updatedLanes[targetLaneIndex]?.plantMinion) {
        const target = updatedLanes[targetLaneIndex].plantMinion!
        if (target.currentAttack >= 4) {
          updatedLanes[targetLaneIndex].plantMinion = null
          message = `Rocket Science bắn hạ ${target.name} (có ${target.currentAttack} ATK)!`
        } else {
          return { updatedState: state, success: false, message: 'Mục tiêu phải có từ 4 Attack trở lên!' }
        }
      }
      break
    }

    case 'zombie_lurch_for_lunch': {
      // A zombie does a Bonus Attack
      if (targetLaneIndex !== undefined && updatedLanes[targetLaneIndex]?.zombieMinion) {
        const z = updatedLanes[targetLaneIndex].zombieMinion!
        const p = updatedLanes[targetLaneIndex].plantMinion
        if (p) {
          p.currentHealth = Math.max(0, p.currentHealth - z.currentAttack)
          message = `Lurch for Lunch: ${z.name} tấn công bất ngờ gây ${z.currentAttack} dmg lên ${p.name}!`
          if (p.currentHealth <= 0) updatedLanes[targetLaneIndex].plantMinion = null
        } else {
          const dmg = applyHeroDamage(updatedState.plantHero, z.currentAttack, Boolean(z.bullseye))
          updatedState.plantHero = dmg.updatedHero
          message = `Lurch for Lunch: ${z.name} tấn công bất ngờ vào Plant Hero gây ${dmg.actualDamage} sát thương!`
        }
      }
      break
    }

    case 'zombie_weed_spray': {
      // Destroy all plants with 2 Attack or less (skips untrickable)
      let destroyed: string[] = []
      updatedLanes.forEach(lane => {
        if (lane.plantMinion && lane.plantMinion.currentAttack <= 2 && !isUntrickable(lane.plantMinion)) {
          destroyed.push(lane.plantMinion.name)
          lane.plantMinion = null
        }
        if (lane.plantTeamUpMinion && lane.plantTeamUpMinion.currentAttack <= 2 && !isUntrickable(lane.plantTeamUpMinion)) {
          destroyed.push(lane.plantTeamUpMinion.name)
          lane.plantTeamUpMinion = null
        }
      })
      message = `Weed Spray diệt sạch cỏ dại: ${destroyed.join(', ') || 'Không có ai'}!`
      break
    }

    case 'zombie_final_mission': {
      // Destroy a Zombie. Do 4 damage to any Plant or the Plant Hero
      const sacrificeIdx = updatedLanes.findIndex(l => l.zombieMinion)
      if (sacrificeIdx >= 0) {
        const deadZombie = updatedLanes[sacrificeIdx].zombieMinion!
        updatedLanes[sacrificeIdx].zombieMinion = null
        if (targetHero) {
          const dmg = applyHeroDamage(updatedState.plantHero, 4, false)
          updatedState.plantHero = dmg.updatedHero
          message = `Final Mission: Hi sinh ${deadZombie.name} phóng tên lửa 4 dmg vào Plant Hero!`
        } else if (targetLaneIndex !== undefined && updatedLanes[targetLaneIndex]?.plantMinion) {
          const p = updatedLanes[targetLaneIndex].plantMinion!
          p.currentHealth = Math.max(0, p.currentHealth - 4)
          if (p.currentHealth <= 0) updatedLanes[targetLaneIndex].plantMinion = null
          message = `Final Mission: Hi sinh ${deadZombie.name} tiêu diệt ${p.name} với 4 dmg!`
        } else {
          const dmg = applyHeroDamage(updatedState.plantHero, 4, false)
          updatedState.plantHero = dmg.updatedHero
          message = `Final Mission: Hi sinh ${deadZombie.name} bắn 4 dmg vào Plant Hero!`
        }
      } else {
        return { updatedState: state, success: false, message: 'Cần có ít nhất 1 Zombie trên sân để hi sinh!' }
      }
      break
    }

    case 'zombie_teleport': {
      // Draw a card & activate teleportActive for playing a zombie minion during ZOMBIE_TRICKS
      const { newDeck, newHand, drawnCard } = drawCard(updatedState.zombieDeck, updatedState.zombieHand)
      updatedState.zombieDeck = newDeck
      updatedState.zombieHand = newHand
      updatedState.teleportActive = true
      message = `Teleport: Dịch chuyển tức thời và rút 1 lá [${drawnCard?.name || 'bài'}]! Cho phép chơi 1 Zombie minion trong phase Zombie Tricks!`
      break
    }

    case 'zombie_bad_moon_rising': {
      // Transform all Zombies into random 5+ Brain Zombies
      const BMR_POOL: {
        cardId: string
        name: string
        attack: number
        health: number
        armored?: number
        frenzy?: boolean
        amphibious?: boolean
        image: string
      }[] = [
        {
          cardId: 'zombie_zombot_1000',
          name: 'Zombot 1000',
          attack: 9,
          health: 9,
          image: '/assets/cards/zombies/Zombot 1000.png',
        },
        {
          cardId: 'zombie_knight_living_dead',
          name: 'Knight of the Living Dead',
          attack: 5,
          health: 5,
          armored: 2,
          image: '/assets/cards/zombies/Arm Wrestler.png',
        },
        {
          cardId: 'zombie_football_zombie',
          name: 'All-Star Zombie',
          attack: 4,
          health: 6,
          armored: 1,
          frenzy: true,
          image: '/assets/cards/zombies/Disco Zombie.png',
        },
        {
          cardId: 'zombie_disco_tron_3000',
          name: 'Disco-Tron 3000',
          attack: 4,
          health: 4,
          image: '/assets/cards/zombies/Disco Zombie.png',
        },
        {
          cardId: 'zombie_deep_sea_gargantuar',
          name: 'Deep Sea Gargantuar',
          attack: 7,
          health: 8,
          amphibious: true,
          image: '/assets/cards/zombies/Zombot 1000.png',
        },
      ]

      let transformedCount = 0
      const transformedNames: string[] = []

      updatedLanes.forEach(l => {
        if (l.zombieMinion) {
          const pool = l.type === 'water' ? BMR_POOL.filter(z => z.amphibious) : BMR_POOL
          const chosen = pool[Math.floor(Math.random() * pool.length)] || BMR_POOL[0]

          l.zombieMinion = {
            instanceId: `bmr_${Date.now()}_${l.index}_${Math.random()}`,
            cardId: chosen.cardId,
            name: chosen.name,
            side: 'zombies',
            currentAttack: chosen.attack,
            baseAttack: chosen.attack,
            currentHealth: chosen.health,
            maxHealth: chosen.health,
            armored: chosen.armored,
            frenzy: chosen.frenzy,
            amphibious: chosen.amphibious,
            image: chosen.image,
          }
          transformedCount++
          transformedNames.push(`${chosen.name} tại ${l.name}`)
        }
      })

      if (transformedCount > 0) {
        message = `Bad Moon Rising! Trăng máu trỗi dậy: Biến đổi ${transformedCount} Zombie thành các quái vật Cost >= 5 (${transformedNames.join(', ')})!`
      } else {
        message = `Bad Moon Rising được kích hoạt nhưng không có Zombie nào trên sân để biến đổi!`
      }
      break
    }

    case 'zombie_going_viral': {
      // Going Viral: All Zombies get +1/+1 and Frenzy. Draw 1 card. Add 3 Going Virals into deck.
      let buffedCount = 0
      updatedLanes.forEach(lane => {
        if (lane.zombieMinion) {
          const currentTraits = lane.zombieMinion.traits || []
          lane.zombieMinion = {
            ...lane.zombieMinion,
            currentAttack: lane.zombieMinion.currentAttack + 1,
            baseAttack: lane.zombieMinion.baseAttack + 1,
            currentHealth: lane.zombieMinion.currentHealth + 1,
            maxHealth: lane.zombieMinion.maxHealth + 1,
            frenzy: true,
            traits: currentTraits.includes('Frenzy') ? currentTraits : [...currentTraits, 'Frenzy'],
          }
          buffedCount++
        }
      })

      // Draw 1 card
      const { newDeck, newHand, drawnCard } = drawCard(updatedState.zombieDeck, updatedState.zombieHand)
      updatedState.zombieDeck = newDeck
      updatedState.zombieHand = newHand

      // Add 3 Going Viral cards into deck
      const viralTemplate: Card = {
        id: 'zombie_going_viral',
        name: 'Going Viral',
        side: 'zombies',
        cost: 3,
        attack: 0,
        health: 0,
        type: 'trick',
        traits: ['Frenzy'],
        frenzy: true,
        image: '/assets/cards/zombies/Lurch for Lunch.png',
        description: 'Tất cả Zombie nhận +1/+1 và Cuồng nộ (Frenzy). Rút 1 lá bài. Thêm 3 lá Going Viral vào bộ bài của bạn!',
      }
      const virals: Card[] = [
        { ...viralTemplate, id: `zombie_going_viral_${Date.now()}_1` },
        { ...viralTemplate, id: `zombie_going_viral_${Date.now()}_2` },
        { ...viralTemplate, id: `zombie_going_viral_${Date.now()}_3` },
      ]
      updatedState.zombieDeck = [...updatedState.zombieDeck, ...virals]

      message = `Going Viral! Toàn bộ ${buffedCount} Zombie nhận +1/+1 và Cuồng nộ (Frenzy)! Rút 1 lá [${drawnCard?.name || 'bài'}] và hòa trộn thêm 3 lá Going Viral vào bộ bài!`
      break
    }

    default:
      message = `${side === 'plants' ? 'Plant' : 'Zombie'} sử dụng ${card.name}.`
  }

  // Trigger trick reactions (e.g. Black-Eyed Pea gets +1/+1)
  const trickReact = triggerWhenTrickPlayed(updatedState, card, side)
  updatedState = trickReact.updatedState
  if (trickReact.events.length > 0) {
    message += ` (${trickReact.events.join('; ')})`
  }

  // Remove card from hand
  const newHand = side === 'plants'
    ? updatedState.plantHand.filter(c => c.id !== card.id)
    : updatedState.zombieHand.filter(c => c.id !== card.id)

  if (side === 'plants') updatedState.plantHand = newHand
  else updatedState.zombieHand = newHand

  updatedState.lanes = updatedLanes
  updatedState.combatLog = [message, ...updatedState.combatLog]

  return {
    updatedState,
    success: true,
    message,
  }
}
