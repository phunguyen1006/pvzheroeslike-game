import type { HeroState, GameState, CombatResult, CombatEvent, Side, Card, Minion } from './types'
import { SUPERPOWERS } from '../data/superpowers'
import { triggerOnMultipleDeaths } from './triggers'
import { isFlowerPlant } from './abilities'
import { conjureCard } from './conjure'

export interface HeroDamageResult {
  updatedHero: HeroState
  actualDamage: number
  blocked: boolean
  isSuperBlockTriggered?: boolean
  meterGained: number
}

/**
 * Applies damage to a hero, evaluating Super-Block meter mechanics:
 * - 8 segments total.
 * - Charges 1-3 segments randomly per non-Bullseye hit.
 * - Max 3 Super-Blocks per match (blockCount <= 3).
 * - Bullseye damage bypasses charging the block meter entirely.
 * - Reaching 8 or more segments triggers a Super-Block, completely negating damage (0 damage taken).
 */
export function applyHeroDamage(
  hero: HeroState,
  damage: number,
  hasBullseye: boolean = false
): HeroDamageResult {
  if (hero.hp <= 0 || damage <= 0) {
    return {
      updatedHero: hero,
      actualDamage: 0,
      blocked: false,
      isSuperBlockTriggered: false,
      meterGained: 0,
    }
  }

  // Invulnerable hero completely ignores damage and cannot be hurt
  if (hero.invulnerable) {
    return {
      updatedHero: hero,
      actualDamage: 0,
      blocked: true,
      isSuperBlockTriggered: false,
      meterGained: 0,
    }
  }

  // Active shield absorbs damage completely
  if (hero.isShieldActive) {
    return {
      updatedHero: {
        ...hero,
        isShieldActive: false,
      },
      actualDamage: 0,
      blocked: true,
      isSuperBlockTriggered: false,
      meterGained: 0,
    }
  }

  // If Bullseye or already triggered 3 blocks, take full damage and do not gain meter
  if (hasBullseye || hero.blockCount >= 3) {
    const newHp = Math.max(0, hero.hp - damage)
    return {
      updatedHero: {
        ...hero,
        hp: newHp,
      },
      actualDamage: damage,
      blocked: false,
      isSuperBlockTriggered: false,
      meterGained: 0,
    }
  }

  // Standard hit charges 1 to 3 block segments
  const roll = Math.floor(Math.random() * 3) + 1
  const newMeter = hero.blockMeter + roll

  if (newMeter >= 8) {
    // Super-Block triggered: 100% damage blocked, meter resets, block count increments
    return {
      updatedHero: {
        ...hero,
        blockMeter: 0,
        isShieldActive: false,
        blockCount: hero.blockCount + 1,
      },
      actualDamage: 0,
      blocked: true,
      isSuperBlockTriggered: true,
      meterGained: roll,
    }
  }

  // Damage applied normally, meter increased
  const newHp = Math.max(0, hero.hp - damage)
  return {
    updatedHero: {
      ...hero,
      hp: newHp,
      blockMeter: newMeter,
    },
    actualDamage: damage,
    blocked: false,
    isSuperBlockTriggered: false,
    meterGained: roll,
  }
}

/**
 * Creates a 0-cost Superpower card for a hero when Super-Block is triggered.
 */
export function getPendingSuperBlockForHero(hero: HeroState, side: Side): { side: Side; superpower: Card } {
  const spData =
    SUPERPOWERS.find(sp => sp.heroId === hero.id) ||
    SUPERPOWERS.find(sp => sp.name.toLowerCase() === hero.superPower?.toLowerCase()) ||
    SUPERPOWERS.find(sp => (side === 'plants' ? sp.id.startsWith('sp_') : sp.id.startsWith('sp_')))

  return {
    side,
    superpower: {
      id: spData?.id || (side === 'plants' ? 'sp_precision_blast' : 'sp_carried_away'),
      name: spData?.name || hero.superPower || 'Superpower',
      side,
      cost: 0,
      attack: 0,
      health: 0,
      type: 'superpower',
      image: spData?.assetPath || hero.avatar,
      description: spData?.description || hero.superPowerDescription,
    },
  }
}

export interface SingleLaneCombatResult {
  updatedState: GameState
  events: CombatEvent[]
  hasSuperBlock: boolean
  winner: Side | null
}

/**
 * Resolves combat for a single lane (0 to 4):
 * - Pre-combat environments (Spikeweed Sector, Moon Base Z)
 * - Freeze trait & frozen skipping
 * - Minion vs Minion with Armored, Deadly, Hurt abilities (Newspaper Zombie)
 * - Strikethrough, Frenzy, Bullseye
 * - Team-Up plants
 * - Direct face hits on open lanes
 * - Super-Block triggering & 0-cost superpower granting
 * - Environment on Hero damage (Planet of the Grapes)
 */
export function resolveSingleLaneCombat(
  gameState: GameState,
  laneIndex: number
): SingleLaneCombatResult {
  if (laneIndex < 0 || laneIndex >= gameState.lanes.length) {
    return {
      updatedState: gameState,
      events: [],
      hasSuperBlock: false,
      winner: gameState.winner,
    }
  }

  let currentPlantHero: HeroState = { ...gameState.plantHero }
  let currentZombieHero: HeroState = { ...gameState.zombieHero }
  let updatedPlantDeck = [...gameState.plantDeck]
  let updatedPlantHand = [...gameState.plantHand]
  let updatedZombieHand = [...gameState.zombieHand]
  let pendingSuperBlock = gameState.pendingSuperBlock || null
  const updatedLanes = gameState.lanes.map((l, idx) => (idx === laneIndex ? { ...l } : l))
  const lane = updatedLanes[laneIndex]
  let plant = lane.plantMinion ? { ...lane.plantMinion } : null
  let plantTeamUp = lane.plantTeamUpMinion ? { ...lane.plantTeamUpMinion } : null
  let zombie = lane.zombieMinion ? { ...lane.zombieMinion } : null
  const events: CombatEvent[] = []
  const deadUnits: { minion: Minion; laneIndex: number }[] = []

  // ========================================================
  // 1. PRE-COMBAT ENVIRONMENT TRIGGERS
  // ========================================================
  if (lane.environment) {
    if (lane.environment.id === 'plant_spikeweed_sector' && zombie) {
      // Spikeweed Sector: 2 damage to zombie before combat
      zombie.currentHealth = Math.max(0, zombie.currentHealth - 2)
      events.push({
        laneIndex,
        attackerSide: 'plants',
        attackerName: 'Spikeweed Sector',
        target: 'minion',
        targetSide: 'zombies',
        damageDealt: 2,
        isBlocked: false,
        isLethal: zombie.currentHealth <= 0,
        description: `Spikeweed Sector gây 2 sát thương lên ${zombie.name}${zombie.currentHealth <= 0 ? ' (Tiêu diệt trước giao tranh!)' : ''}`,
      })
      if (zombie.currentHealth <= 0) {
        deadUnits.push({ minion: zombie, laneIndex })
        zombie = null
      }
    } else if (lane.environment.id === 'zombie_moon_base_z' && zombie) {
      // Moon Base Z: Overshoot 3 (3 damage to Plant Hero before combat)
      const overshootRes = applyHeroDamage(currentPlantHero, 3, false)
      currentPlantHero = overshootRes.updatedHero
      events.push({
        laneIndex,
        attackerSide: 'zombies',
        attackerName: `${zombie.name} (Moon Base Z)`,
        target: 'hero',
        targetSide: 'plants',
        damageDealt: overshootRes.actualDamage,
        isBlocked: overshootRes.blocked,
        isLethal: currentPlantHero.hp <= 0,
        description: `Moon Base Z kích hoạt Overshoot 3: Bắn 3 dmg vào Plant Hero${overshootRes.blocked ? ' (SUPER-BLOCK!)' : ''}`,
      })
      if (overshootRes.isSuperBlockTriggered && !pendingSuperBlock) {
        pendingSuperBlock = getPendingSuperBlockForHero(currentPlantHero, 'plants')
      }
    }
  }

  // ========================================================
  // 2. FREEZE CHECK (Frozen minions skip attack & unfreeze)
  // ========================================================
  const plantCanAttack = plant !== null && !plant.isFrozen && plant.currentAttack > 0
  if (plant?.isFrozen) {
    plant.isFrozen = false
    events.push({
      laneIndex,
      attackerSide: 'plants',
      attackerName: plant.name,
      target: 'minion',
      targetSide: 'zombies',
      damageDealt: 0,
      isBlocked: false,
      isLethal: false,
      description: `❄️ ${plant.name} bị đóng băng nên bỏ lỡ lượt tấn công và tan băng!`,
    })
  }

  if (plantTeamUp?.isFrozen) {
    plantTeamUp.isFrozen = false
    events.push({
      laneIndex,
      attackerSide: 'plants',
      attackerName: `${plantTeamUp.name} (Team-Up)`,
      target: 'minion',
      targetSide: 'zombies',
      damageDealt: 0,
      isBlocked: false,
      isLethal: false,
      description: `❄️ ${plantTeamUp.name} Team-Up bị đóng băng nên bỏ lỡ lượt tấn công và tan băng!`,
    })
  }

  const zombieCanAttack = zombie !== null && !zombie.isFrozen && zombie.currentAttack > 0
  if (zombie?.isFrozen) {
    zombie.isFrozen = false
    events.push({
      laneIndex,
      attackerSide: 'zombies',
      attackerName: zombie.name,
      target: 'minion',
      targetSide: 'plants',
      damageDealt: 0,
      isBlocked: false,
      isLethal: false,
      description: `❄️ ${zombie.name} bị đóng băng nên bỏ lỡ lượt tấn công và tan băng!`,
    })
  }

  // ========================================================
  // 3. MINION VS MINION COMBAT
  // ========================================================
  if (plant && zombie) {
    const plantArmored = plant.armored ?? (plant.traits?.includes('armored') ? 1 : 0)
    const zombieArmored = zombie.armored ?? (zombie.traits?.includes('armored') ? 1 : 0)

    let totalPlantAtk = plantCanAttack ? plant.currentAttack : 0
    if (plantTeamUp && !plantTeamUp.isFrozen && plantTeamUp.currentAttack > 0) {
      totalPlantAtk += plantTeamUp.currentAttack
    }

    const dmgToZombie = Math.max(0, totalPlantAtk - zombieArmored)
    const dmgToPlant = zombieCanAttack ? Math.max(0, zombie.currentAttack - plantArmored) : 0

    const plantHasDeadly = Boolean(plant.deadly || plant.traits?.includes('deadly'))
    const zombieHasDeadly = Boolean(zombie.deadly || zombie.traits?.includes('deadly') || lane.environment?.id === 'zombie_laser_base_alpha')
    const plantHasBullseye = Boolean(plant.bullseye || plant.traits?.includes('bullseye'))
    const zombieHasBullseye = Boolean(zombie.bullseye || zombie.traits?.includes('bullseye'))
    const plantHasStrikethrough = Boolean(plant.strikethrough || plant.traits?.includes('strikethrough'))
    const zombieHasStrikethrough = Boolean(zombie.strikethrough || zombie.traits?.includes('strikethrough') || lane.environment?.id === 'zombie_laser_base_alpha')
    const zombieHasFrenzy = Boolean(zombie.frenzy || zombie.traits?.includes('frenzy'))
    const plantHasFreezeTrait = Boolean(plant.freeze || plant.traits?.includes('freeze'))
    const plantHasDoubleStrike = Boolean(plant.doubleStrike || plant.traits?.includes('doubleStrike'))

    // Apply minion damage
    if (dmgToZombie > 0) {
      zombie.currentHealth = plantHasDeadly ? 0 : Math.max(0, zombie.currentHealth - dmgToZombie)
      // Snow Pea / Freeze trait
      if (plantHasFreezeTrait && zombie.currentHealth > 0) {
        zombie.isFrozen = true
        // Freeze triggers: Snowdrop buff and Winter Squash destruction
        updatedLanes.forEach(l => {
          if (l.plantMinion && (l.plantMinion.cardId === 'plant_snowdrop' || l.plantMinion.name.toLowerCase().includes('snowdrop'))) {
            l.plantMinion.currentAttack += 2
            l.plantMinion.baseAttack += 2
            l.plantMinion.currentHealth += 2
            l.plantMinion.maxHealth += 2
            events.push({
              laneIndex,
              attackerSide: 'plants',
              attackerName: 'Snowdrop',
              target: 'minion',
              targetSide: 'plants',
              damageDealt: 0,
              isBlocked: false,
              isLethal: false,
              description: `🌸 Snowdrop nhận +2/+2 từ hiệu ứng Đóng băng (${l.plantMinion.currentAttack}/${l.plantMinion.currentHealth})!`,
            })
          }
        })
        const hasWinterSquash = updatedLanes.some(
          l => (l.plantMinion && (l.plantMinion.cardId === 'plant_winter_squash' || l.plantMinion.name.toLowerCase().includes('winter squash'))) ||
               (l.plantTeamUpMinion && (l.plantTeamUpMinion.cardId === 'plant_winter_squash' || l.plantTeamUpMinion.name.toLowerCase().includes('winter squash')))
        )
        if (hasWinterSquash) {
          zombie.currentHealth = 0
          events.push({
            laneIndex,
            attackerSide: 'plants',
            attackerName: 'Winter Squash',
            target: 'minion',
            targetSide: 'zombies',
            damageDealt: 0,
            isBlocked: false,
            isLethal: true,
            description: `🎃 Winter Squash tiêu diệt tức thì Zombie bị đóng băng (${zombie.name})!`,
          })
        }
      }
      // Newspaper Zombie hurt trigger
      if (zombie.cardId === 'zombie_newspaper_zombie' && zombie.currentHealth > 0) {
        zombie.currentAttack += 4
        zombie.frenzy = true
        events.push({
          laneIndex,
          attackerSide: 'zombies',
          attackerName: zombie.name,
          target: 'minion',
          targetSide: 'plants',
          damageDealt: 0,
          isBlocked: false,
          isLethal: false,
          description: `🗞️ Newspaper Zombie bị rách báo! Tăng +4 Attack (${zombie.currentAttack} ATK) và Cuồng nộ (Frenzy)!`,
        })
      }
    }

    if (dmgToPlant > 0) {
      plant.currentHealth = zombieHasDeadly ? 0 : Math.max(0, plant.currentHealth - dmgToPlant)

      // Briar Rose: When a Zombie hurts a Flower Plant, destroy that Zombie immediately
      const hasBriarRose = updatedLanes.some(
        l => l.plantMinion?.cardId === 'plant_briar_rose' || l.plantTeamUpMinion?.cardId === 'plant_briar_rose'
      )
      if (hasBriarRose && isFlowerPlant(plant) && zombie.currentHealth > 0) {
        zombie.currentHealth = 0
        events.push({
          laneIndex,
          attackerSide: 'plants',
          attackerName: 'Briar Rose',
          target: 'minion',
          targetSide: 'zombies',
          damageDealt: 0,
          isBlocked: false,
          isLethal: true,
          description: `🌹 Briar Rose trả đũa bằng gai nhọn: Zombie ${zombie.name} đã làm tổn thương loài Hoa (${plant.name}), lập tức bị tiêu diệt!`,
        })
      }
    }

    events.push({
      laneIndex,
      attackerSide: 'plants',
      attackerName: plant.name,
      target: 'minion',
      targetSide: 'zombies',
      damageDealt: dmgToZombie,
      isBlocked: false,
      isLethal: zombie.currentHealth <= 0,
      description: `${plant.name} dealt ${dmgToZombie} damage to ${zombie.name}${zombie.currentHealth <= 0 ? ' (Destroyed)' : ''}`,
    })

    events.push({
      laneIndex,
      attackerSide: 'zombies',
      attackerName: zombie.name,
      target: 'minion',
      targetSide: 'plants',
      damageDealt: dmgToPlant,
      isBlocked: false,
      isLethal: plant.currentHealth <= 0,
      description: `${zombie.name} dealt ${dmgToPlant} damage to ${plant.name}${plant.currentHealth <= 0 ? ' (Destroyed)' : ''}`,
    })

    // Splash Damage (Dark Matter Dragonfruit / Splash Damage trait)
    const splashTrait = plant.traits?.find(t => t.toLowerCase().includes('splash damage'))
    let splashDmg = 0
    if (plant.cardId === 'plant_dark_matter_dragonfruit' || splashTrait) {
      splashDmg = 6
      if (splashTrait) {
        const match = splashTrait.match(/\d+/)
        if (match) splashDmg = parseInt(match[0], 10)
      }
    }
    if (splashDmg > 0 && plantCanAttack) {
      const adjIndices = [laneIndex - 1, laneIndex + 1].filter(idx => idx >= 0 && idx < updatedLanes.length)
      adjIndices.forEach(adjIdx => {
        const adjLane = updatedLanes[adjIdx]
        if (adjLane.zombieMinion && adjLane.zombieMinion.currentHealth > 0) {
          adjLane.zombieMinion = {
            ...adjLane.zombieMinion,
            currentHealth: Math.max(0, adjLane.zombieMinion.currentHealth - splashDmg),
          }
          events.push({
            laneIndex: adjIdx,
            attackerSide: 'plants',
            attackerName: `${plant.name} (Splash Damage ${splashDmg})`,
            target: 'minion',
            targetSide: 'zombies',
            damageDealt: splashDmg,
            isBlocked: false,
            isLethal: adjLane.zombieMinion.currentHealth <= 0,
            description: `💥 ${plant.name} gây ${splashDmg} Splash Damage lan sang ${adjLane.zombieMinion.name} tại làn ${adjIdx}!`,
          })
          if (adjLane.zombieMinion.currentHealth <= 0) {
            deadUnits.push({ minion: adjLane.zombieMinion, laneIndex: adjIdx })
            adjLane.zombieMinion = null
          }
        }
      })
    }

    // Dusk Lobber: If on an Environment, attacks adjacent lanes as well!
    if (plant.cardId === 'plant_dusk_lobber' && lane.environment && plantCanAttack) {
      const adjIndices = [laneIndex - 1, laneIndex + 1].filter(idx => idx >= 0 && idx < updatedLanes.length)
      adjIndices.forEach(adjIdx => {
        const adjLane = updatedLanes[adjIdx]
        if (adjLane.zombieMinion && adjLane.zombieMinion.currentHealth > 0) {
          const dmg = plant.currentAttack
          adjLane.zombieMinion = {
            ...adjLane.zombieMinion,
            currentHealth: Math.max(0, adjLane.zombieMinion.currentHealth - dmg),
          }
          events.push({
            laneIndex: adjIdx,
            attackerSide: 'plants',
            attackerName: `${plant.name} (Bắn 3 làn)`,
            target: 'minion',
            targetSide: 'zombies',
            damageDealt: dmg,
            isBlocked: false,
            isLethal: adjLane.zombieMinion.currentHealth <= 0,
            description: `🌸 ${plant.name} trên Môi trường bắn sang làn ${adjIdx} gây ${dmg} sát thương lên ${adjLane.zombieMinion.name}!`,
          })
          if (adjLane.zombieMinion.currentHealth <= 0) {
            deadUnits.push({ minion: adjLane.zombieMinion, laneIndex: adjIdx })
            adjLane.zombieMinion = null
          }
        } else {
          const res = applyHeroDamage(currentZombieHero, plant.currentAttack, plantHasBullseye)
          currentZombieHero = res.updatedHero
          events.push({
            laneIndex: adjIdx,
            attackerSide: 'plants',
            attackerName: `${plant.name} (Bắn 3 làn)`,
            target: 'hero',
            targetSide: 'zombies',
            damageDealt: res.actualDamage,
            isBlocked: res.blocked,
            isLethal: currentZombieHero.hp <= 0,
            description: `🌸 ${plant.name} bắn xuyên qua làn ${adjIdx} trúng Zombie Hero gây ${res.actualDamage} sát thương!`,
          })
          if (res.isSuperBlockTriggered && !pendingSuperBlock) {
            pendingSuperBlock = getPendingSuperBlockForHero(currentZombieHero, 'zombies')
          }
        }
      })
    }

    // Strikethrough handling
    if (plantHasStrikethrough && plantCanAttack) {
      const res = applyHeroDamage(currentZombieHero, plant.currentAttack, plantHasBullseye)
      currentZombieHero = res.updatedHero
      events.push({
        laneIndex,
        attackerSide: 'plants',
        attackerName: plant.name,
        target: 'hero',
        targetSide: 'zombies',
        damageDealt: res.actualDamage,
        isBlocked: res.blocked,
        isLethal: currentZombieHero.hp <= 0,
        traitsTriggered: ['strikethrough'],
        description: `${plant.name} hit Zombie Hero via Strikethrough for ${res.actualDamage} dmg${res.blocked ? ' (SUPER-BLOCK!)' : ''}`,
      })
      if (res.isSuperBlockTriggered && !pendingSuperBlock) {
        pendingSuperBlock = getPendingSuperBlockForHero(currentZombieHero, 'zombies')
      }
      // Planet of the Grapes
      if (lane.environment?.id === 'plant_planet_of_the_grapes' && res.actualDamage > 0) {
        if (updatedPlantDeck.length > 0 && updatedPlantHand.length < 10) {
          const [drawn, ...rest] = updatedPlantDeck
          updatedPlantDeck = rest
          updatedPlantHand = [...updatedPlantHand, drawn]
          events.push({
            laneIndex,
            attackerSide: 'plants',
            attackerName: 'Planet of the Grapes',
            target: 'hero',
            targetSide: 'plants',
            damageDealt: 0,
            isBlocked: false,
            isLethal: false,
            description: `🍇 Planet of the Grapes: Rút thêm 1 lá [${drawn.name}]!`,
          })
        }
      }
    }

    if (zombieHasStrikethrough && zombieCanAttack) {
      const res = applyHeroDamage(currentPlantHero, zombie.currentAttack, zombieHasBullseye)
      currentPlantHero = res.updatedHero
      events.push({
        laneIndex,
        attackerSide: 'zombies',
        attackerName: zombie.name,
        target: 'hero',
        targetSide: 'plants',
        damageDealt: res.actualDamage,
        isBlocked: res.blocked,
        isLethal: currentPlantHero.hp <= 0,
        traitsTriggered: ['strikethrough'],
        description: `${zombie.name} hit Plant Hero via Strikethrough for ${res.actualDamage} dmg${res.blocked ? ' (SUPER-BLOCK!)' : ''}`,
      })
      if (res.isSuperBlockTriggered && !pendingSuperBlock) {
        pendingSuperBlock = getPendingSuperBlockForHero(currentPlantHero, 'plants')
      }
    }

    // Frenzy handling (if Zombie destroyed Plant and survived)
    if (zombieHasFrenzy && plant.currentHealth <= 0 && zombie.currentHealth > 0) {
      if (plantTeamUp && plantTeamUp.currentHealth > 0) {
        // Frenzy bonus attack targets the Team-Up plant in the same lane!
        const teamUpArmored = plantTeamUp.armored ?? (plantTeamUp.traits?.includes('armored') ? 1 : 0)
        const frenzyDmg = Math.max(0, zombie.currentAttack - teamUpArmored)
        plantTeamUp.currentHealth = zombieHasDeadly ? 0 : Math.max(0, plantTeamUp.currentHealth - frenzyDmg)
        events.push({
          laneIndex,
          attackerSide: 'zombies',
          attackerName: `${zombie.name} (Frenzy)`,
          target: 'minion',
          targetSide: 'plants',
          damageDealt: frenzyDmg,
          isBlocked: false,
          isLethal: plantTeamUp.currentHealth <= 0,
          traitsTriggered: ['frenzy'],
          description: `⚡ ${zombie.name} kích hoạt Frenzy tấn công bồi tiếp tục lên ${plantTeamUp.name} Team-Up gây ${frenzyDmg} damage${plantTeamUp.currentHealth <= 0 ? ' (Tiêu diệt!)' : ''}`,
        })
      } else {
        const frenzyRes = applyHeroDamage(currentPlantHero, zombie.currentAttack, zombieHasBullseye)
        currentPlantHero = frenzyRes.updatedHero
        events.push({
          laneIndex,
          attackerSide: 'zombies',
          attackerName: zombie.name,
          target: 'hero',
          targetSide: 'plants',
          damageDealt: frenzyRes.actualDamage,
          isBlocked: frenzyRes.blocked,
          isLethal: currentPlantHero.hp <= 0,
          traitsTriggered: ['frenzy'],
          description: `${zombie.name} triggered Frenzy bonus attack on Plant Hero for ${frenzyRes.actualDamage} dmg${frenzyRes.blocked ? ' (SUPER-BLOCK!)' : ''}`,
        })
        if (frenzyRes.isSuperBlockTriggered && !pendingSuperBlock) {
          pendingSuperBlock = getPendingSuperBlockForHero(currentPlantHero, 'plants')
        }
      }
    }

    // Plant Frenzy handling (if Plant with Frenzy destroyed Zombie and survived)
    const plantHasFrenzy = Boolean(plant.frenzy || plant.traits?.includes('frenzy'))
    if (plantHasFrenzy && plantCanAttack && plant.currentHealth > 0 && zombie.currentHealth <= 0) {
      const frenzyRes = applyHeroDamage(currentZombieHero, plant.currentAttack, plantHasBullseye)
      currentZombieHero = frenzyRes.updatedHero
      events.push({
        laneIndex,
        attackerSide: 'plants',
        attackerName: plant.name,
        target: 'hero',
        targetSide: 'zombies',
        damageDealt: frenzyRes.actualDamage,
        isBlocked: frenzyRes.blocked,
        isLethal: currentZombieHero.hp <= 0,
        traitsTriggered: ['frenzy'],
        description: `${plant.name} triggered Frenzy bonus attack on Zombie Hero for ${frenzyRes.actualDamage} dmg${frenzyRes.blocked ? ' (SUPER-BLOCK!)' : ''}`,
      })
      if (frenzyRes.isSuperBlockTriggered && !pendingSuperBlock) {
        pendingSuperBlock = getPendingSuperBlockForHero(currentZombieHero, 'zombies')
      }
    }

    // Double Strike handling (Plant bonus attack after combat)
    if (plantHasDoubleStrike && plantCanAttack && plant.currentHealth > 0) {
      if (zombie.currentHealth <= 0) {
        // Zombie destroyed, Double Strike attacks Zombie Hero directly
        const doubleRes = applyHeroDamage(currentZombieHero, plant.currentAttack, plantHasBullseye)
        currentZombieHero = doubleRes.updatedHero
        events.push({
          laneIndex,
          attackerSide: 'plants',
          attackerName: `${plant.name} (Double Strike)`,
          target: 'hero',
          targetSide: 'zombies',
          damageDealt: doubleRes.actualDamage,
          isBlocked: doubleRes.blocked,
          isLethal: currentZombieHero.hp <= 0,
          traitsTriggered: ['doubleStrike'],
          description: `⚡ ${plant.name} kích hoạt Double Strike bắn trực tiếp vào Zombie Hero gây ${doubleRes.actualDamage} dmg${doubleRes.blocked ? ' (SUPER-BLOCK!)' : ''}`,
        })
        if (doubleRes.isSuperBlockTriggered && !pendingSuperBlock) {
          pendingSuperBlock = getPendingSuperBlockForHero(currentZombieHero, 'zombies')
        }
        if (lane.environment?.id === 'plant_planet_of_the_grapes' && doubleRes.actualDamage > 0) {
          if (updatedPlantDeck.length > 0 && updatedPlantHand.length < 10) {
            const [drawn, ...rest] = updatedPlantDeck
            updatedPlantDeck = rest
            updatedPlantHand = [...updatedPlantHand, drawn]
            events.push({
              laneIndex,
              attackerSide: 'plants',
              attackerName: 'Planet of the Grapes',
              target: 'hero',
              targetSide: 'plants',
              damageDealt: 0,
              isBlocked: false,
              isLethal: false,
              description: `🍇 Planet of the Grapes: Rút thêm 1 lá [${drawn.name}] từ Double Strike!`,
            })
          }
        }
      } else {
        // Zombie still alive, Double Strike attacks the zombie minion again
        const secondDmg = Math.max(0, plant.currentAttack - zombieArmored)
        if (secondDmg > 0) {
          zombie.currentHealth = plantHasDeadly ? 0 : Math.max(0, zombie.currentHealth - secondDmg)
          if (plantHasFreezeTrait && zombie.currentHealth > 0) {
            zombie.isFrozen = true
          }
        }
        events.push({
          laneIndex,
          attackerSide: 'plants',
          attackerName: `${plant.name} (Double Strike)`,
          target: 'minion',
          targetSide: 'zombies',
          damageDealt: secondDmg,
          isBlocked: false,
          isLethal: zombie.currentHealth <= 0,
          traitsTriggered: ['doubleStrike'],
          description: `⚡ ${plant.name} kích hoạt Double Strike gây thêm ${secondDmg} damage lên ${zombie.name}${zombie.currentHealth <= 0 ? ' (Tiêu diệt!)' : ''}`,
        })
        if (plantHasStrikethrough) {
          const doubleStrikeRes = applyHeroDamage(currentZombieHero, plant.currentAttack, plantHasBullseye)
          currentZombieHero = doubleStrikeRes.updatedHero
          events.push({
            laneIndex,
            attackerSide: 'plants',
            attackerName: `${plant.name} (Double Strike + Strikethrough)`,
            target: 'hero',
            targetSide: 'zombies',
            damageDealt: doubleStrikeRes.actualDamage,
            isBlocked: doubleStrikeRes.blocked,
            isLethal: currentZombieHero.hp <= 0,
            traitsTriggered: ['doubleStrike', 'strikethrough'],
            description: `⚡ ${plant.name} Double Strike xuyên thấu gây ${doubleStrikeRes.actualDamage} dmg vào Zombie Hero${doubleStrikeRes.blocked ? ' (SUPER-BLOCK!)' : ''}`,
          })
          if (doubleStrikeRes.isSuperBlockTriggered && !pendingSuperBlock) {
            pendingSuperBlock = getPendingSuperBlockForHero(currentZombieHero, 'zombies')
          }
        }
      }
    }
  } else if (plant && !zombie) {
    // ========================================================
    // 4. OPEN LANE PLANT -> ATTACKS ZOMBIE HERO DIRECTLY
    // ========================================================
    if (plantCanAttack) {
      const plantHasBullseye = Boolean(plant.bullseye || plant.traits?.includes('bullseye'))
      const plantHasDoubleStrike = Boolean(plant.doubleStrike || plant.traits?.includes('doubleStrike'))
      let plantAntiHero = plant.antiHero ?? 0
      if (!plantAntiHero && plant.traits) {
        const trait = plant.traits.find(t => t.toLowerCase().includes('anti-hero') || t.toLowerCase().includes('antihero'))
        if (trait) {
          const match = trait.match(/\d+/)
          plantAntiHero = match ? parseInt(match[0], 10) : 2
        }
      }
      let totalDmg = plant.currentAttack + plantAntiHero
      if (plantTeamUp && !plantTeamUp.isFrozen) {
        totalDmg += plantTeamUp.currentAttack
      }

      const res = applyHeroDamage(currentZombieHero, totalDmg, plantHasBullseye)
      currentZombieHero = res.updatedHero
      events.push({
        laneIndex,
        attackerSide: 'plants',
        attackerName: plant.name,
        target: 'hero',
        targetSide: 'zombies',
        damageDealt: res.actualDamage,
        isBlocked: res.blocked,
        isLethal: currentZombieHero.hp <= 0,
        description: `${plant.name} attacked Zombie Hero directly for ${res.actualDamage} dmg${res.blocked ? ' (SUPER-BLOCK!)' : ''}`,
      })
      if (res.isSuperBlockTriggered && !pendingSuperBlock) {
        pendingSuperBlock = getPendingSuperBlockForHero(currentZombieHero, 'zombies')
      }
      // Planet of the Grapes
      if (lane.environment?.id === 'plant_planet_of_the_grapes' && res.actualDamage > 0) {
        if (updatedPlantDeck.length > 0 && updatedPlantHand.length < 10) {
          const [drawn, ...rest] = updatedPlantDeck
          updatedPlantDeck = rest
          updatedPlantHand = [...updatedPlantHand, drawn]
          events.push({
            laneIndex,
            attackerSide: 'plants',
            attackerName: 'Planet of the Grapes',
            target: 'hero',
            targetSide: 'plants',
            damageDealt: 0,
            isBlocked: false,
            isLethal: false,
            description: `🍇 Planet of the Grapes: Rút thêm 1 lá [${drawn.name}]!`,
          })
        }
      }

      // Double Strike bonus direct attack in open lane
      if (plantHasDoubleStrike && plant.currentHealth > 0) {
        const doubleRes = applyHeroDamage(currentZombieHero, plant.currentAttack, plantHasBullseye)
        currentZombieHero = doubleRes.updatedHero
        events.push({
          laneIndex,
          attackerSide: 'plants',
          attackerName: `${plant.name} (Double Strike)`,
          target: 'hero',
          targetSide: 'zombies',
          damageDealt: doubleRes.actualDamage,
          isBlocked: doubleRes.blocked,
          isLethal: currentZombieHero.hp <= 0,
          traitsTriggered: ['doubleStrike'],
          description: `⚡ ${plant.name} kích hoạt Double Strike tấn công trực tiếp Zombie Hero lần 2 gây ${doubleRes.actualDamage} dmg${doubleRes.blocked ? ' (SUPER-BLOCK!)' : ''}`,
        })
        if (doubleRes.isSuperBlockTriggered && !pendingSuperBlock) {
          pendingSuperBlock = getPendingSuperBlockForHero(currentZombieHero, 'zombies')
        }
        if (lane.environment?.id === 'plant_planet_of_the_grapes' && doubleRes.actualDamage > 0) {
          if (updatedPlantDeck.length > 0 && updatedPlantHand.length < 10) {
            const [drawn, ...rest] = updatedPlantDeck
            updatedPlantDeck = rest
            updatedPlantHand = [...updatedPlantHand, drawn]
            events.push({
              laneIndex,
              attackerSide: 'plants',
              attackerName: 'Planet of the Grapes',
              target: 'hero',
              targetSide: 'plants',
              damageDealt: 0,
              isBlocked: false,
              isLethal: false,
              description: `🍇 Planet of the Grapes: Rút thêm 1 lá [${drawn.name}] từ Double Strike!`,
            })
          }
        }
      }

      // Dusk Lobber: If on an Environment, attacks adjacent lanes as well!
      if (plant.cardId === 'plant_dusk_lobber' && lane.environment && plantCanAttack) {
        const adjIndices = [laneIndex - 1, laneIndex + 1].filter(idx => idx >= 0 && idx < updatedLanes.length)
        adjIndices.forEach(adjIdx => {
          const adjLane = updatedLanes[adjIdx]
          if (adjLane.zombieMinion && adjLane.zombieMinion.currentHealth > 0) {
            const dmg = plant.currentAttack
            adjLane.zombieMinion = {
              ...adjLane.zombieMinion,
              currentHealth: Math.max(0, adjLane.zombieMinion.currentHealth - dmg),
            }
            events.push({
              laneIndex: adjIdx,
              attackerSide: 'plants',
              attackerName: `${plant.name} (Bắn 3 làn)`,
              target: 'minion',
              targetSide: 'zombies',
              damageDealt: dmg,
              isBlocked: false,
              isLethal: adjLane.zombieMinion.currentHealth <= 0,
              description: `🌸 ${plant.name} trên Môi trường bắn sang làn ${adjIdx} gây ${dmg} sát thương lên ${adjLane.zombieMinion.name}!`,
            })
            if (adjLane.zombieMinion.currentHealth <= 0) {
              deadUnits.push({ minion: adjLane.zombieMinion, laneIndex: adjIdx })
              adjLane.zombieMinion = null
            }
          } else {
            const res = applyHeroDamage(currentZombieHero, plant.currentAttack, plantHasBullseye)
            currentZombieHero = res.updatedHero
            events.push({
              laneIndex: adjIdx,
              attackerSide: 'plants',
              attackerName: `${plant.name} (Bắn 3 làn)`,
              target: 'hero',
              targetSide: 'zombies',
              damageDealt: res.actualDamage,
              isBlocked: res.blocked,
              isLethal: currentZombieHero.hp <= 0,
              description: `🌸 ${plant.name} bắn xuyên qua làn ${adjIdx} trúng Zombie Hero gây ${res.actualDamage} sát thương!`,
            })
            if (res.isSuperBlockTriggered && !pendingSuperBlock) {
              pendingSuperBlock = getPendingSuperBlockForHero(currentZombieHero, 'zombies')
            }
          }
        })
      }
    }
  } else if (!plant && zombie) {
    // ========================================================
    // 5. OPEN LANE ZOMBIE -> ATTACKS PLANT HERO DIRECTLY
    // ========================================================
    if (zombieCanAttack) {
      const zombieHasBullseye = Boolean(zombie.bullseye || zombie.traits?.includes('bullseye'))
      let zombieAntiHero = zombie.antiHero ?? 0
      if (!zombieAntiHero && zombie.traits) {
        const trait = zombie.traits.find(t => t.toLowerCase().includes('anti-hero') || t.toLowerCase().includes('antihero'))
        if (trait) {
          const match = trait.match(/\d+/)
          zombieAntiHero = match ? parseInt(match[0], 10) : 2
        }
      }
      const totalAttack = zombie.currentAttack + zombieAntiHero
      const res = applyHeroDamage(currentPlantHero, totalAttack, zombieHasBullseye)
      currentPlantHero = res.updatedHero
      events.push({
        laneIndex,
        attackerSide: 'zombies',
        attackerName: zombie.name,
        target: 'hero',
        targetSide: 'plants',
        damageDealt: res.actualDamage,
        isBlocked: res.blocked,
        isLethal: currentPlantHero.hp <= 0,
        description: `${zombie.name} attacked Plant Hero directly for ${res.actualDamage} dmg${res.blocked ? ' (SUPER-BLOCK!)' : ''}`,
      })
      if (res.isSuperBlockTriggered && !pendingSuperBlock) {
        pendingSuperBlock = getPendingSuperBlockForHero(currentPlantHero, 'plants')
      }

      // Dr. Spacetime: Conjure Galactic Gardens card discounted by 1 Brain on damage to Plant Hero
      if (zombie.cardId === 'zombie_dr_spacetime' && res.actualDamage > 0 && updatedZombieHand.length < 10) {
        const dummyState: GameState = {
          ...gameState,
          zombieHand: updatedZombieHand,
        }
        const conjureRes = conjureCard(dummyState, 'zombies', {
          count: 1,
          filter: { set: 'Galactic Gardens' },
          sourceName: 'Dr. Spacetime',
        })
        updatedZombieHand = conjureRes.updatedState.zombieHand
        if (conjureRes.conjuredCards.length > 0) {
          const conjured = conjureRes.conjuredCards[0]
          events.push({
            laneIndex,
            attackerSide: 'zombies',
            attackerName: 'Dr. Spacetime',
            target: 'hero',
            targetSide: 'zombies',
            damageDealt: 0,
            isBlocked: false,
            isLethal: false,
            description: `🌌 Dr. Spacetime Triệu hồi (Conjure) lá Galactic Gardens [${conjured.name}] và giảm 1 Não (Giá: ${conjured.cost})!`,
          })
        }
      }
    }
  }

  if (plant && plant.currentHealth <= 0) {
    deadUnits.push({ minion: plant, laneIndex })
  }
  if (plantTeamUp && plantTeamUp.currentHealth <= 0) {
    deadUnits.push({ minion: plantTeamUp, laneIndex })
  }
  if (zombie && zombie.currentHealth <= 0) {
    deadUnits.push({ minion: zombie, laneIndex })
  }

  // Update lane state, clearing defeated minions
  lane.plantMinion = plant && plant.currentHealth > 0 ? plant : null
  lane.plantTeamUpMinion = plantTeamUp && plantTeamUp.currentHealth > 0 ? plantTeamUp : null
  lane.zombieMinion = zombie && zombie.currentHealth > 0 ? zombie : null

  // Determine game winner
  let winner: Side | null = null
  if (currentPlantHero.hp <= 0 && currentZombieHero.hp <= 0) {
    winner = null
  } else if (currentPlantHero.hp <= 0) {
    winner = 'zombies'
  } else if (currentZombieHero.hp <= 0) {
    winner = 'plants'
  }

  let finalState: GameState = {
    ...gameState,
    plantHero: currentPlantHero,
    zombieHero: currentZombieHero,
    plantDeck: updatedPlantDeck,
    plantHand: updatedPlantHand,
    zombieHand: updatedZombieHand,
    lanes: updatedLanes,
    winner,
    pendingSuperBlock,
  }

  if (deadUnits.length > 0) {
    const deathRes = triggerOnMultipleDeaths(finalState, deadUnits)
    finalState = deathRes.updatedState
    events.push(...deathRes.events)
    winner = finalState.winner
  }

  return {
    updatedState: finalState,
    events,
    hasSuperBlock: finalState.pendingSuperBlock !== null && finalState.pendingSuperBlock !== gameState.pendingSuperBlock,
    winner,
  }
}

/**
 * Resolves combat across all 5 lanes sequentially:
 * Lane 1 (Heights, index 0) -> Lane 5 (Water, index 4).
 * Supports mechanics:
 * - Pre-combat environments (Spikeweed Sector, Moon Base Z)
 * - Freeze trait & frozen skipping
 * - Minion vs Minion with Armored, Deadly, Hurt abilities (Newspaper Zombie)
 * - Strikethrough, Frenzy, Bullseye
 * - Team-Up plants
 * - Direct face hits on open lanes
 * - Super-Block triggering & 0-cost superpower granting
 * - Environment on Hero damage (Planet of the Grapes)
 */
export function resolveCombat(gameState: GameState): { updatedState: GameState; result: CombatResult } {
  let currentPlantHero: HeroState = { ...gameState.plantHero }
  let currentZombieHero: HeroState = { ...gameState.zombieHero }
  let updatedPlantDeck = [...gameState.plantDeck]
  let updatedPlantHand = [...gameState.plantHand]
  let updatedZombieHand = [...gameState.zombieHand]
  let updatedPlantGraveyard = [...gameState.plantGraveyard]
  let updatedZombieGraveyard = [...gameState.zombieGraveyard]
  let pendingSuperBlock = gameState.pendingSuperBlock || null
  let updatedLanes = gameState.lanes.map(l => ({ ...l }))
  const events: CombatEvent[] = []
  let plantHeroDamageTaken = 0
  let zombieHeroDamageTaken = 0

  for (let i = 0; i < updatedLanes.length; i++) {
    const lane = updatedLanes[i]
    let plant = lane.plantMinion ? { ...lane.plantMinion } : null
    let plantTeamUp = lane.plantTeamUpMinion ? { ...lane.plantTeamUpMinion } : null
    let zombie = lane.zombieMinion ? { ...lane.zombieMinion } : null
    const deadUnitsThisLane: { minion: Minion; laneIndex: number }[] = []

    // ========================================================
    // 1. PRE-COMBAT ENVIRONMENT TRIGGERS
    // ========================================================
    if (lane.environment) {
      if (lane.environment.id === 'plant_spikeweed_sector' && zombie) {
        // Spikeweed Sector: 2 damage to zombie before combat
        zombie.currentHealth = Math.max(0, zombie.currentHealth - 2)
        events.push({
          laneIndex: i,
          attackerSide: 'plants',
          attackerName: 'Spikeweed Sector',
          target: 'minion',
          targetSide: 'zombies',
          damageDealt: 2,
          isBlocked: false,
          isLethal: zombie.currentHealth <= 0,
          description: `Spikeweed Sector gây 2 sát thương lên ${zombie.name}${zombie.currentHealth <= 0 ? ' (Tiêu diệt trước giao tranh!)' : ''}`,
        })
        if (zombie.currentHealth <= 0) {
          deadUnitsThisLane.push({ minion: zombie, laneIndex: i })
          zombie = null
        }
      } else if (lane.environment.id === 'zombie_moon_base_z' && zombie) {
        // Moon Base Z: Overshoot 3 (3 damage to Plant Hero before combat)
        const overshootRes = applyHeroDamage(currentPlantHero, 3, false)
        currentPlantHero = overshootRes.updatedHero
        plantHeroDamageTaken += overshootRes.actualDamage
        events.push({
          laneIndex: i,
          attackerSide: 'zombies',
          attackerName: `${zombie.name} (Moon Base Z)`,
          target: 'hero',
          targetSide: 'plants',
          damageDealt: overshootRes.actualDamage,
          isBlocked: overshootRes.blocked,
          isLethal: currentPlantHero.hp <= 0,
          description: `Moon Base Z kích hoạt Overshoot 3: Bắn 3 dmg vào Plant Hero${overshootRes.blocked ? ' (SUPER-BLOCK!)' : ''}`,
        })
        if (overshootRes.isSuperBlockTriggered && !pendingSuperBlock) {
          pendingSuperBlock = getPendingSuperBlockForHero(currentPlantHero, 'plants')
        }
      }
    }

    // ========================================================
    // 2. FREEZE CHECK (Frozen minions skip attack & unfreeze)
    // ========================================================
    const plantCanAttack = plant !== null && !plant.isFrozen && plant.currentAttack > 0
    if (plant?.isFrozen) {
      plant.isFrozen = false
      events.push({
        laneIndex: i,
        attackerSide: 'plants',
        attackerName: plant.name,
        target: 'minion',
        targetSide: 'zombies',
        damageDealt: 0,
        isBlocked: false,
        isLethal: false,
        description: `❄️ ${plant.name} bị đóng băng nên bỏ lỡ lượt tấn công và tan băng!`,
      })
    }

    if (plantTeamUp?.isFrozen) {
      plantTeamUp.isFrozen = false
      events.push({
        laneIndex: i,
        attackerSide: 'plants',
        attackerName: `${plantTeamUp.name} (Team-Up)`,
        target: 'minion',
        targetSide: 'zombies',
        damageDealt: 0,
        isBlocked: false,
        isLethal: false,
        description: `❄️ ${plantTeamUp.name} Team-Up bị đóng băng nên bỏ lỡ lượt tấn công và tan băng!`,
      })
    }

    const zombieCanAttack = zombie !== null && !zombie.isFrozen && zombie.currentAttack > 0
    if (zombie?.isFrozen) {
      zombie.isFrozen = false
      events.push({
        laneIndex: i,
        attackerSide: 'zombies',
        attackerName: zombie.name,
        target: 'minion',
        targetSide: 'plants',
        damageDealt: 0,
        isBlocked: false,
        isLethal: false,
        description: `❄️ ${zombie.name} bị đóng băng nên bỏ lỡ lượt tấn công và tan băng!`,
      })
    }

    // ========================================================
    // 3. MINION VS MINION COMBAT
    // ========================================================
    if (plant && zombie) {
      const plantArmored = plant.armored ?? (plant.traits?.includes('armored') ? 1 : 0)
      const zombieArmored = zombie.armored ?? (zombie.traits?.includes('armored') ? 1 : 0)

      let totalPlantAtk = plantCanAttack ? plant.currentAttack : 0
      if (plantTeamUp && !plantTeamUp.isFrozen && plantTeamUp.currentAttack > 0) {
        totalPlantAtk += plantTeamUp.currentAttack
      }

      const dmgToZombie = Math.max(0, totalPlantAtk - zombieArmored)
      const dmgToPlant = zombieCanAttack ? Math.max(0, zombie.currentAttack - plantArmored) : 0

      const plantHasDeadly = Boolean(plant.deadly || plant.traits?.includes('deadly'))
      const zombieHasDeadly = Boolean(zombie.deadly || zombie.traits?.includes('deadly') || lane.environment?.id === 'zombie_laser_base_alpha')
      const plantHasBullseye = Boolean(plant.bullseye || plant.traits?.includes('bullseye'))
      const zombieHasBullseye = Boolean(zombie.bullseye || zombie.traits?.includes('bullseye'))
      const plantHasStrikethrough = Boolean(plant.strikethrough || plant.traits?.includes('strikethrough'))
      const zombieHasStrikethrough = Boolean(zombie.strikethrough || zombie.traits?.includes('strikethrough') || lane.environment?.id === 'zombie_laser_base_alpha')
      const zombieHasFrenzy = Boolean(zombie.frenzy || zombie.traits?.includes('frenzy'))
      const plantHasFreezeTrait = Boolean(plant.freeze || plant.traits?.includes('freeze'))
      const plantHasDoubleStrike = Boolean(plant.doubleStrike || plant.traits?.includes('doubleStrike'))

      // Apply minion damage
      if (dmgToZombie > 0) {
        zombie.currentHealth = plantHasDeadly ? 0 : Math.max(0, zombie.currentHealth - dmgToZombie)
        // Snow Pea / Freeze trait
        if (plantHasFreezeTrait && zombie.currentHealth > 0) {
          zombie.isFrozen = true
          // Freeze triggers: Snowdrop buff and Winter Squash destruction
          updatedLanes.forEach(l => {
            if (l.plantMinion && (l.plantMinion.cardId === 'plant_snowdrop' || l.plantMinion.name.toLowerCase().includes('snowdrop'))) {
              l.plantMinion.currentAttack += 2
              l.plantMinion.baseAttack += 2
              l.plantMinion.currentHealth += 2
              l.plantMinion.maxHealth += 2
              events.push({
                laneIndex: i,
                attackerSide: 'plants',
                attackerName: 'Snowdrop',
                target: 'minion',
                targetSide: 'plants',
                damageDealt: 0,
                isBlocked: false,
                isLethal: false,
                description: `🌸 Snowdrop nhận +2/+2 từ hiệu ứng Đóng băng (${l.plantMinion.currentAttack}/${l.plantMinion.currentHealth})!`,
              })
            }
          })
          const hasWinterSquash = updatedLanes.some(
            l => (l.plantMinion && (l.plantMinion.cardId === 'plant_winter_squash' || l.plantMinion.name.toLowerCase().includes('winter squash'))) ||
                 (l.plantTeamUpMinion && (l.plantTeamUpMinion.cardId === 'plant_winter_squash' || l.plantTeamUpMinion.name.toLowerCase().includes('winter squash')))
          )
          if (hasWinterSquash) {
            zombie.currentHealth = 0
            events.push({
              laneIndex: i,
              attackerSide: 'plants',
              attackerName: 'Winter Squash',
              target: 'minion',
              targetSide: 'zombies',
              damageDealt: 0,
              isBlocked: false,
              isLethal: true,
              description: `🎃 Winter Squash tiêu diệt tức thì Zombie bị đóng băng (${zombie.name})!`,
            })
          }
        }
        // Newspaper Zombie hurt trigger
        if (zombie.cardId === 'zombie_newspaper_zombie' && zombie.currentHealth > 0) {
          zombie.currentAttack += 4
          zombie.frenzy = true
          events.push({
            laneIndex: i,
            attackerSide: 'zombies',
            attackerName: zombie.name,
            target: 'minion',
            targetSide: 'plants',
            damageDealt: 0,
            isBlocked: false,
            isLethal: false,
            description: `🗞️ Newspaper Zombie bị rách báo! Tăng +4 Attack (${zombie.currentAttack} ATK) và Cuồng nộ (Frenzy)!`,
          })
        }
      }

      if (dmgToPlant > 0) {
        plant.currentHealth = zombieHasDeadly ? 0 : Math.max(0, plant.currentHealth - dmgToPlant)

        // Briar Rose: When a Zombie hurts a Flower Plant, destroy that Zombie immediately
        const hasBriarRose = updatedLanes.some(
          l => l.plantMinion?.cardId === 'plant_briar_rose' || l.plantTeamUpMinion?.cardId === 'plant_briar_rose'
        )
        if (hasBriarRose && isFlowerPlant(plant) && zombie.currentHealth > 0) {
          zombie.currentHealth = 0
          events.push({
            laneIndex: i,
            attackerSide: 'plants',
            attackerName: 'Briar Rose',
            target: 'minion',
            targetSide: 'zombies',
            damageDealt: 0,
            isBlocked: false,
            isLethal: true,
            description: `🌹 Briar Rose trả đũa bằng gai nhọn: Zombie ${zombie.name} đã làm tổn thương loài Hoa (${plant.name}), lập tức bị tiêu diệt!`,
          })
        }
      }

      events.push({
        laneIndex: i,
        attackerSide: 'plants',
        attackerName: plant.name,
        target: 'minion',
        targetSide: 'zombies',
        damageDealt: dmgToZombie,
        isBlocked: false,
        isLethal: zombie.currentHealth <= 0,
        description: `${plant.name} dealt ${dmgToZombie} damage to ${zombie.name}${zombie.currentHealth <= 0 ? ' (Destroyed)' : ''}`,
      })

      events.push({
        laneIndex: i,
        attackerSide: 'zombies',
        attackerName: zombie.name,
        target: 'minion',
        targetSide: 'plants',
        damageDealt: dmgToPlant,
        isBlocked: false,
        isLethal: plant.currentHealth <= 0,
        description: `${zombie.name} dealt ${dmgToPlant} damage to ${plant.name}${plant.currentHealth <= 0 ? ' (Destroyed)' : ''}`,
      })

      // Blooming Heart: Gets +1 Attack when it deals damage
      if (plant.cardId === 'plant_blooming_heart' && dmgToZombie > 0 && plant.currentHealth > 0) {
        plant.currentAttack += 1
        plant.baseAttack += 1
        events.push({
          laneIndex: i,
          attackerSide: 'plants',
          attackerName: 'Blooming Heart',
          target: 'minion',
          targetSide: 'plants',
          damageDealt: 0,
          isBlocked: false,
          isLethal: false,
          description: `🌸 Blooming Heart nhận +1 Tấn công sau khi gây sát thương (hiện là ${plant.currentAttack} ATK)!`,
        })
      }

      // Dusk Lobber: If on an Environment, attacks adjacent lanes as well!
      if (plant.cardId === 'plant_dusk_lobber' && lane.environment && plantCanAttack) {
        const adjIndices = [i - 1, i + 1].filter(idx => idx >= 0 && idx < updatedLanes.length)
        adjIndices.forEach(adjIdx => {
          const adjLane = updatedLanes[adjIdx]
          if (adjLane.zombieMinion && adjLane.zombieMinion.currentHealth > 0) {
            const dmg = plant.currentAttack
            adjLane.zombieMinion = {
              ...adjLane.zombieMinion,
              currentHealth: Math.max(0, adjLane.zombieMinion.currentHealth - dmg),
            }
            events.push({
              laneIndex: adjIdx,
              attackerSide: 'plants',
              attackerName: `${plant.name} (Bắn 3 làn)`,
              target: 'minion',
              targetSide: 'zombies',
              damageDealt: dmg,
              isBlocked: false,
              isLethal: adjLane.zombieMinion.currentHealth <= 0,
              description: `🌸 ${plant.name} trên Môi trường bắn sang làn ${adjIdx} gây ${dmg} sát thương lên ${adjLane.zombieMinion.name}!`,
            })
            if (adjLane.zombieMinion.currentHealth <= 0) {
              adjLane.zombieMinion = null
            }
          } else {
            const res = applyHeroDamage(currentZombieHero, plant.currentAttack, plantHasBullseye)
            currentZombieHero = res.updatedHero
            zombieHeroDamageTaken += res.actualDamage
            events.push({
              laneIndex: adjIdx,
              attackerSide: 'plants',
              attackerName: `${plant.name} (Bắn 3 làn)`,
              target: 'hero',
              targetSide: 'zombies',
              damageDealt: res.actualDamage,
              isBlocked: res.blocked,
              isLethal: currentZombieHero.hp <= 0,
              description: `🌸 ${plant.name} bắn xuyên qua làn ${adjIdx} trúng Zombie Hero gây ${res.actualDamage} sát thương!`,
            })
            if (res.isSuperBlockTriggered && !pendingSuperBlock) {
              pendingSuperBlock = getPendingSuperBlockForHero(currentZombieHero, 'zombies')
            }
          }
        })
      }

      // Strikethrough handling
      if (plantHasStrikethrough && plantCanAttack) {
        const res = applyHeroDamage(currentZombieHero, plant.currentAttack, plantHasBullseye)
        currentZombieHero = res.updatedHero
        zombieHeroDamageTaken += res.actualDamage
        events.push({
          laneIndex: i,
          attackerSide: 'plants',
          attackerName: plant.name,
          target: 'hero',
          targetSide: 'zombies',
          damageDealt: res.actualDamage,
          isBlocked: res.blocked,
          isLethal: currentZombieHero.hp <= 0,
          traitsTriggered: ['strikethrough'],
          description: `${plant.name} hit Zombie Hero via Strikethrough for ${res.actualDamage} dmg${res.blocked ? ' (SUPER-BLOCK!)' : ''}`,
        })
        if (res.isSuperBlockTriggered && !pendingSuperBlock) {
          pendingSuperBlock = getPendingSuperBlockForHero(currentZombieHero, 'zombies')
        }
        // Planet of the Grapes
        if (lane.environment?.id === 'plant_planet_of_the_grapes' && res.actualDamage > 0) {
          if (updatedPlantDeck.length > 0 && updatedPlantHand.length < 10) {
            const [drawn, ...rest] = updatedPlantDeck
            updatedPlantDeck = rest
            updatedPlantHand = [...updatedPlantHand, drawn]
            events.push({
              laneIndex: i,
              attackerSide: 'plants',
              attackerName: 'Planet of the Grapes',
              target: 'hero',
              targetSide: 'plants',
              damageDealt: 0,
              isBlocked: false,
              isLethal: false,
              description: `🍇 Planet of the Grapes: Rút thêm 1 lá [${drawn.name}]!`,
            })
          }
        }
      }

      if (zombieHasStrikethrough && zombieCanAttack) {
        const res = applyHeroDamage(currentPlantHero, zombie.currentAttack, zombieHasBullseye)
        currentPlantHero = res.updatedHero
        plantHeroDamageTaken += res.actualDamage
        events.push({
          laneIndex: i,
          attackerSide: 'zombies',
          attackerName: zombie.name,
          target: 'hero',
          targetSide: 'plants',
          damageDealt: res.actualDamage,
          isBlocked: res.blocked,
          isLethal: currentPlantHero.hp <= 0,
          traitsTriggered: ['strikethrough'],
          description: `${zombie.name} hit Plant Hero via Strikethrough for ${res.actualDamage} dmg${res.blocked ? ' (SUPER-BLOCK!)' : ''}`,
        })
        if (res.isSuperBlockTriggered && !pendingSuperBlock) {
          pendingSuperBlock = getPendingSuperBlockForHero(currentPlantHero, 'plants')
        }
      }

      // Frenzy handling (if Zombie destroyed Plant and survived)
      if (zombieHasFrenzy && plant.currentHealth <= 0 && zombie.currentHealth > 0) {
        const frenzyRes = applyHeroDamage(currentPlantHero, zombie.currentAttack, zombieHasBullseye)
        currentPlantHero = frenzyRes.updatedHero
        plantHeroDamageTaken += frenzyRes.actualDamage
        events.push({
          laneIndex: i,
          attackerSide: 'zombies',
          attackerName: zombie.name,
          target: 'hero',
          targetSide: 'plants',
          damageDealt: frenzyRes.actualDamage,
          isBlocked: frenzyRes.blocked,
          isLethal: currentPlantHero.hp <= 0,
          traitsTriggered: ['frenzy'],
          description: `${zombie.name} triggered Frenzy bonus attack on Plant Hero for ${frenzyRes.actualDamage} dmg${frenzyRes.blocked ? ' (SUPER-BLOCK!)' : ''}`,
        })
        if (frenzyRes.isSuperBlockTriggered && !pendingSuperBlock) {
          pendingSuperBlock = getPendingSuperBlockForHero(currentPlantHero, 'plants')
        }
      }

      // Plant Frenzy handling (if Plant destroyed Zombie and survived)
      const plantHasFrenzy = Boolean(plant.frenzy || plant.traits?.includes('frenzy'))
      if (plantHasFrenzy && plantCanAttack && plant.currentHealth > 0 && zombie.currentHealth <= 0) {
        const frenzyRes = applyHeroDamage(currentZombieHero, plant.currentAttack, plantHasBullseye)
        currentZombieHero = frenzyRes.updatedHero
        zombieHeroDamageTaken += frenzyRes.actualDamage
        events.push({
          laneIndex: i,
          attackerSide: 'plants',
          attackerName: plant.name,
          target: 'hero',
          targetSide: 'zombies',
          damageDealt: frenzyRes.actualDamage,
          isBlocked: frenzyRes.blocked,
          isLethal: currentZombieHero.hp <= 0,
          traitsTriggered: ['frenzy'],
          description: `${plant.name} triggered Frenzy bonus attack on Zombie Hero for ${frenzyRes.actualDamage} dmg${frenzyRes.blocked ? ' (SUPER-BLOCK!)' : ''}`,
        })
        if (frenzyRes.isSuperBlockTriggered && !pendingSuperBlock) {
          pendingSuperBlock = getPendingSuperBlockForHero(currentZombieHero, 'zombies')
        }
      }

      // Double Strike handling (Plant bonus attack after combat)
      if (plantHasDoubleStrike && plantCanAttack && plant.currentHealth > 0) {
        if (zombie.currentHealth <= 0) {
          // Zombie destroyed, Double Strike attacks Zombie Hero directly
          const doubleRes = applyHeroDamage(currentZombieHero, plant.currentAttack, plantHasBullseye)
          currentZombieHero = doubleRes.updatedHero
          zombieHeroDamageTaken += doubleRes.actualDamage
          events.push({
            laneIndex: i,
            attackerSide: 'plants',
            attackerName: `${plant.name} (Double Strike)`,
            target: 'hero',
            targetSide: 'zombies',
            damageDealt: doubleRes.actualDamage,
            isBlocked: doubleRes.blocked,
            isLethal: currentZombieHero.hp <= 0,
            traitsTriggered: ['doubleStrike'],
            description: `⚡ ${plant.name} kích hoạt Double Strike bắn trực tiếp vào Zombie Hero gây ${doubleRes.actualDamage} dmg${doubleRes.blocked ? ' (SUPER-BLOCK!)' : ''}`,
          })
          if (doubleRes.isSuperBlockTriggered && !pendingSuperBlock) {
            pendingSuperBlock = getPendingSuperBlockForHero(currentZombieHero, 'zombies')
          }
          if (lane.environment?.id === 'plant_planet_of_the_grapes' && doubleRes.actualDamage > 0) {
            if (updatedPlantDeck.length > 0 && updatedPlantHand.length < 10) {
              const [drawn, ...rest] = updatedPlantDeck
              updatedPlantDeck = rest
              updatedPlantHand = [...updatedPlantHand, drawn]
              events.push({
                laneIndex: i,
                attackerSide: 'plants',
                attackerName: 'Planet of the Grapes',
                target: 'hero',
                targetSide: 'plants',
                damageDealt: 0,
                isBlocked: false,
                isLethal: false,
                description: `🍇 Planet of the Grapes: Rút thêm 1 lá [${drawn.name}] từ Double Strike!`,
              })
            }
          }
        } else {
          // Zombie still alive, Double Strike attacks the zombie minion again
          const secondDmg = Math.max(0, plant.currentAttack - zombieArmored)
          if (secondDmg > 0) {
            zombie.currentHealth = plantHasDeadly ? 0 : Math.max(0, zombie.currentHealth - secondDmg)
            if (plantHasFreezeTrait && zombie.currentHealth > 0) {
              zombie.isFrozen = true
            }
          }
          events.push({
            laneIndex: i,
            attackerSide: 'plants',
            attackerName: `${plant.name} (Double Strike)`,
            target: 'minion',
            targetSide: 'zombies',
            damageDealt: secondDmg,
            isBlocked: false,
            isLethal: zombie.currentHealth <= 0,
            traitsTriggered: ['doubleStrike'],
            description: `⚡ ${plant.name} kích hoạt Double Strike gây thêm ${secondDmg} damage lên ${zombie.name}${zombie.currentHealth <= 0 ? ' (Tiêu diệt!)' : ''}`,
          })
          if (plantHasStrikethrough) {
            const doubleStrikeRes = applyHeroDamage(currentZombieHero, plant.currentAttack, plantHasBullseye)
            currentZombieHero = doubleStrikeRes.updatedHero
            zombieHeroDamageTaken += doubleStrikeRes.actualDamage
            events.push({
              laneIndex: i,
              attackerSide: 'plants',
              attackerName: `${plant.name} (Double Strike + Strikethrough)`,
              target: 'hero',
              targetSide: 'zombies',
              damageDealt: doubleStrikeRes.actualDamage,
              isBlocked: doubleStrikeRes.blocked,
              isLethal: currentZombieHero.hp <= 0,
              traitsTriggered: ['doubleStrike', 'strikethrough'],
              description: `⚡ ${plant.name} Double Strike xuyên thấu gây ${doubleStrikeRes.actualDamage} dmg vào Zombie Hero${doubleStrikeRes.blocked ? ' (SUPER-BLOCK!)' : ''}`,
            })
            if (doubleStrikeRes.isSuperBlockTriggered && !pendingSuperBlock) {
              pendingSuperBlock = getPendingSuperBlockForHero(currentZombieHero, 'zombies')
            }
          }
        }
      }
    } else if (plant && !zombie) {
      // ========================================================
      // 4. OPEN LANE PLANT -> ATTACKS ZOMBIE HERO DIRECTLY
      // ========================================================
      if (plantCanAttack) {
        const plantHasBullseye = Boolean(plant.bullseye || plant.traits?.includes('bullseye'))
        const plantHasDoubleStrike = Boolean(plant.doubleStrike || plant.traits?.includes('doubleStrike'))
        let totalDmg = plant.currentAttack
        if (plantTeamUp && !plantTeamUp.isFrozen) {
          totalDmg += plantTeamUp.currentAttack
        }

        const res = applyHeroDamage(currentZombieHero, totalDmg, plantHasBullseye)
        currentZombieHero = res.updatedHero
        zombieHeroDamageTaken += res.actualDamage
        events.push({
          laneIndex: i,
          attackerSide: 'plants',
          attackerName: plant.name,
          target: 'hero',
          targetSide: 'zombies',
          damageDealt: res.actualDamage,
          isBlocked: res.blocked,
          isLethal: currentZombieHero.hp <= 0,
          description: `${plant.name} attacked Zombie Hero directly for ${res.actualDamage} dmg${res.blocked ? ' (SUPER-BLOCK!)' : ''}`,
        })
        if (res.isSuperBlockTriggered && !pendingSuperBlock) {
          pendingSuperBlock = getPendingSuperBlockForHero(currentZombieHero, 'zombies')
        }
        // Planet of the Grapes
        if (lane.environment?.id === 'plant_planet_of_the_grapes' && res.actualDamage > 0) {
          if (updatedPlantDeck.length > 0 && updatedPlantHand.length < 10) {
            const [drawn, ...rest] = updatedPlantDeck
            updatedPlantDeck = rest
            updatedPlantHand = [...updatedPlantHand, drawn]
            events.push({
              laneIndex: i,
              attackerSide: 'plants',
              attackerName: 'Planet of the Grapes',
              target: 'hero',
              targetSide: 'plants',
              damageDealt: 0,
              isBlocked: false,
              isLethal: false,
              description: `🍇 Planet of the Grapes: Rút thêm 1 lá [${drawn.name}]!`,
            })
          }
        }

        // Blooming Heart: Gets +1 Attack when it deals damage
        if (plant.cardId === 'plant_blooming_heart' && res.actualDamage > 0 && plant.currentHealth > 0) {
          plant.currentAttack += 1
          plant.baseAttack += 1
          events.push({
            laneIndex: i,
            attackerSide: 'plants',
            attackerName: 'Blooming Heart',
            target: 'hero',
            targetSide: 'plants',
            damageDealt: 0,
            isBlocked: false,
            isLethal: false,
            description: `🌸 Blooming Heart nhận +1 Tấn công sau khi đánh trúng Zombie Hero (hiện là ${plant.currentAttack} ATK)!`,
          })
        }

        // Double Strike bonus direct attack in open lane
        if (plantHasDoubleStrike && plant.currentHealth > 0) {
          const doubleRes = applyHeroDamage(currentZombieHero, plant.currentAttack, plantHasBullseye)
          currentZombieHero = doubleRes.updatedHero
          zombieHeroDamageTaken += doubleRes.actualDamage
          events.push({
            laneIndex: i,
            attackerSide: 'plants',
            attackerName: `${plant.name} (Double Strike)`,
            target: 'hero',
            targetSide: 'zombies',
            damageDealt: doubleRes.actualDamage,
            isBlocked: doubleRes.blocked,
            isLethal: currentZombieHero.hp <= 0,
            traitsTriggered: ['doubleStrike'],
            description: `⚡ ${plant.name} kích hoạt Double Strike tấn công trực tiếp Zombie Hero lần 2 gây ${doubleRes.actualDamage} dmg${doubleRes.blocked ? ' (SUPER-BLOCK!)' : ''}`,
          })
          if (doubleRes.isSuperBlockTriggered && !pendingSuperBlock) {
            pendingSuperBlock = getPendingSuperBlockForHero(currentZombieHero, 'zombies')
          }
          if (lane.environment?.id === 'plant_planet_of_the_grapes' && doubleRes.actualDamage > 0) {
            if (updatedPlantDeck.length > 0 && updatedPlantHand.length < 10) {
              const [drawn, ...rest] = updatedPlantDeck
              updatedPlantDeck = rest
              updatedPlantHand = [...updatedPlantHand, drawn]
              events.push({
                laneIndex: i,
                attackerSide: 'plants',
                attackerName: 'Planet of the Grapes',
                target: 'hero',
                targetSide: 'plants',
                damageDealt: 0,
                isBlocked: false,
                isLethal: false,
                description: `🍇 Planet of the Grapes: Rút thêm 1 lá [${drawn.name}] từ Double Strike!`,
              })
            }
          }
        }

        // Dusk Lobber: If on an Environment, attacks adjacent lanes as well!
        if (plant.cardId === 'plant_dusk_lobber' && lane.environment && plantCanAttack) {
          const adjIndices = [i - 1, i + 1].filter(idx => idx >= 0 && idx < updatedLanes.length)
          adjIndices.forEach(adjIdx => {
            const adjLane = updatedLanes[adjIdx]
            if (adjLane.zombieMinion && adjLane.zombieMinion.currentHealth > 0) {
              const dmg = plant.currentAttack
              adjLane.zombieMinion = {
                ...adjLane.zombieMinion,
                currentHealth: Math.max(0, adjLane.zombieMinion.currentHealth - dmg),
              }
              events.push({
                laneIndex: adjIdx,
                attackerSide: 'plants',
                attackerName: `${plant.name} (Bắn 3 làn)`,
                target: 'minion',
                targetSide: 'zombies',
                damageDealt: dmg,
                isBlocked: false,
                isLethal: adjLane.zombieMinion.currentHealth <= 0,
                description: `🌸 ${plant.name} trên Môi trường bắn sang làn ${adjIdx} gây ${dmg} sát thương lên ${adjLane.zombieMinion.name}!`,
              })
              if (adjLane.zombieMinion.currentHealth <= 0) {
                adjLane.zombieMinion = null
              }
            } else {
              const res = applyHeroDamage(currentZombieHero, plant.currentAttack, plantHasBullseye)
              currentZombieHero = res.updatedHero
              zombieHeroDamageTaken += res.actualDamage
              events.push({
                laneIndex: adjIdx,
                attackerSide: 'plants',
                attackerName: `${plant.name} (Bắn 3 làn)`,
                target: 'hero',
                targetSide: 'zombies',
                damageDealt: res.actualDamage,
                isBlocked: res.blocked,
                isLethal: currentZombieHero.hp <= 0,
                description: `🌸 ${plant.name} bắn xuyên qua làn ${adjIdx} trúng Zombie Hero gây ${res.actualDamage} sát thương!`,
              })
              if (res.isSuperBlockTriggered && !pendingSuperBlock) {
                pendingSuperBlock = getPendingSuperBlockForHero(currentZombieHero, 'zombies')
              }
            }
          })
        }
      }
    } else if (!plant && zombie) {
      // ========================================================
      // 5. OPEN LANE ZOMBIE -> ATTACKS PLANT HERO DIRECTLY
      // ========================================================
      if (zombieCanAttack) {
        const zombieHasBullseye = Boolean(zombie.bullseye || zombie.traits?.includes('bullseye'))
        const res = applyHeroDamage(currentPlantHero, zombie.currentAttack, zombieHasBullseye)
        currentPlantHero = res.updatedHero
        plantHeroDamageTaken += res.actualDamage
        events.push({
          laneIndex: i,
          attackerSide: 'zombies',
          attackerName: zombie.name,
          target: 'hero',
          targetSide: 'plants',
          damageDealt: res.actualDamage,
          isBlocked: res.blocked,
          isLethal: currentPlantHero.hp <= 0,
          description: `${zombie.name} attacked Plant Hero directly for ${res.actualDamage} dmg${res.blocked ? ' (SUPER-BLOCK!)' : ''}`,
        })
        if (res.isSuperBlockTriggered && !pendingSuperBlock) {
          pendingSuperBlock = getPendingSuperBlockForHero(currentPlantHero, 'plants')
        }

        // Dr. Spacetime: Conjure Galactic Gardens card discounted by 1 Brain on damage to Plant Hero
        if (zombie.cardId === 'zombie_dr_spacetime' && res.actualDamage > 0 && updatedZombieHand.length < 10) {
          const dummyState: GameState = {
            ...gameState,
            zombieHand: updatedZombieHand,
          }
          const conjureRes = conjureCard(dummyState, 'zombies', {
            count: 1,
            filter: { set: 'Galactic Gardens' },
            sourceName: 'Dr. Spacetime',
          })
          updatedZombieHand = conjureRes.updatedState.zombieHand
          if (conjureRes.conjuredCards.length > 0) {
            const conjured = conjureRes.conjuredCards[0]
            events.push({
              laneIndex: i,
              attackerSide: 'zombies',
              attackerName: 'Dr. Spacetime',
              target: 'hero',
              targetSide: 'zombies',
              damageDealt: 0,
              isBlocked: false,
              isLethal: false,
              description: `🌌 Dr. Spacetime Triệu hồi (Conjure) lá Galactic Gardens [${conjured.name}] và giảm 1 Não (Giá: ${conjured.cost})!`,
            })
          }
        }
      }
    }

    if (plant && plant.currentHealth <= 0) {
      deadUnitsThisLane.push({ minion: plant, laneIndex: i })
    }
    if (plantTeamUp && plantTeamUp.currentHealth <= 0) {
      deadUnitsThisLane.push({ minion: plantTeamUp, laneIndex: i })
    }
    if (zombie && zombie.currentHealth <= 0) {
      deadUnitsThisLane.push({ minion: zombie, laneIndex: i })
    }

    // Update lane state, clearing defeated minions
    lane.plantMinion = plant && plant.currentHealth > 0 ? plant : null
    lane.plantTeamUpMinion = plantTeamUp && plantTeamUp.currentHealth > 0 ? plantTeamUp : null
    lane.zombieMinion = zombie && zombie.currentHealth > 0 ? zombie : null

    if (deadUnitsThisLane.length > 0) {
      const intermediateState: GameState = {
        ...gameState,
        plantHero: currentPlantHero,
        zombieHero: currentZombieHero,
        plantDeck: updatedPlantDeck,
        plantHand: updatedPlantHand,
        zombieHand: updatedZombieHand,
        plantGraveyard: updatedPlantGraveyard,
        zombieGraveyard: updatedZombieGraveyard,
        lanes: updatedLanes,
        pendingSuperBlock,
        winner: null,
      }
      const deathRes = triggerOnMultipleDeaths(intermediateState, deadUnitsThisLane)
      currentPlantHero = deathRes.updatedState.plantHero
      currentZombieHero = deathRes.updatedState.zombieHero
      updatedPlantHand = deathRes.updatedState.plantHand
      updatedZombieHand = deathRes.updatedState.zombieHand
      updatedPlantGraveyard = deathRes.updatedState.plantGraveyard
      updatedZombieGraveyard = deathRes.updatedState.zombieGraveyard
      updatedLanes = deathRes.updatedState.lanes
      pendingSuperBlock = deathRes.updatedState.pendingSuperBlock || null
      events.push(...deathRes.events)
    }
  }

  // Determine game winner
  let winner: Side | null = null
  if (currentPlantHero.hp <= 0 && currentZombieHero.hp <= 0) {
    winner = null
  } else if (currentPlantHero.hp <= 0) {
    winner = 'zombies'
  } else if (currentZombieHero.hp <= 0) {
    winner = 'plants'
  }

  return {
    updatedState: {
      ...gameState,
      plantHero: currentPlantHero,
      zombieHero: currentZombieHero,
      plantDeck: updatedPlantDeck,
      plantHand: updatedPlantHand,
      zombieHand: updatedZombieHand,
      plantGraveyard: updatedPlantGraveyard,
      zombieGraveyard: updatedZombieGraveyard,
      lanes: updatedLanes,
      winner,
      pendingSuperBlock,
    },
    result: {
      events,
      plantHeroDamageTaken,
      zombieHeroDamageTaken,
      winner,
    },
  }
}

export interface BonusAttackResult {
  updatedState: GameState
  events: CombatEvent[]
  logs: string[]
}

/**
 * Trigger an immediate out-of-sequence Bonus Attack for a minion at laneIndex
 */
export function triggerBonusAttack(
  state: GameState,
  laneIndex: number,
  side: Side
): BonusAttackResult {
  let updatedState: GameState = {
    ...state,
    lanes: state.lanes.map(l => ({ ...l })),
  }
  const events: CombatEvent[] = []
  const logs: string[] = []
  const lane = updatedState.lanes[laneIndex]

  if (!lane) {
    logs.push(`Làn ${laneIndex} không tồn tại để thực hiện Bonus Attack!`)
    return { updatedState: state, events, logs }
  }

  const attacker = side === 'plants' ? (lane.plantMinion || lane.plantTeamUpMinion) : lane.zombieMinion
  if (!attacker) {
    logs.push(`Không có minion ${side} tại ${lane.name} để thực hiện Bonus Attack!`)
    return { updatedState: state, events, logs }
  }

  if (attacker.isFrozen) {
    logs.push(`${attacker.name} đang bị đóng băng (Frozen), không thể thực hiện Bonus Attack!`)
    return { updatedState: state, events, logs }
  }

  if (attacker.currentAttack <= 0) {
    logs.push(`${attacker.name} có 0 Tấn công, Bonus Attack không gây sát thương.`)
    return { updatedState: state, events, logs }
  }

  logs.push(`💥 ${attacker.name} tại ${lane.name} thực hiện đòn Tấn công thêm (Bonus Attack)!`)

  const attackerHasDeadly = Boolean(attacker.deadly || attacker.traits?.includes('deadly') || (side === 'zombies' && lane.environment?.id === 'zombie_laser_base_alpha'))
  const attackerHasBullseye = Boolean(attacker.bullseye || attacker.traits?.includes('bullseye'))
  const attackerHasStrikethrough = Boolean(attacker.strikethrough || attacker.traits?.includes('strikethrough') || (side === 'zombies' && lane.environment?.id === 'zombie_laser_base_alpha'))
  const attackerHasFrenzy = Boolean(attacker.frenzy || attacker.traits?.includes('frenzy'))

  let pendingSuperBlock = updatedState.pendingSuperBlock || null

  if (side === 'plants') {
    const zombie = lane.zombieMinion
    if (zombie && zombie.currentHealth > 0) {
      const zArmored = zombie.armored ?? (zombie.traits?.includes('armored') ? 1 : 0)
      const dmg = Math.max(0, attacker.currentAttack - zArmored)
      zombie.currentHealth = attackerHasDeadly ? 0 : Math.max(0, zombie.currentHealth - dmg)
      const isLethal = zombie.currentHealth <= 0

      events.push({
        laneIndex,
        attackerSide: 'plants',
        attackerName: `${attacker.name} (Bonus Attack)`,
        target: 'minion',
        targetSide: 'zombies',
        damageDealt: dmg,
        isBlocked: false,
        isLethal,
        description: `⚡ ${attacker.name} Bonus Attack gây ${dmg} sát thương lên ${zombie.name}${isLethal ? ' (Tiêu diệt!)' : ''}`,
      })
      logs.push(`⚡ ${attacker.name} Bonus Attack gây ${dmg} sát thương lên ${zombie.name}${isLethal ? ' (Tiêu diệt!)' : ''}`)

      if (isLethal) {
        lane.zombieMinion = null
        if (attackerHasFrenzy) {
          // Frenzy follow-up attack directly to Zombie Hero
          const frenzyRes = applyHeroDamage(updatedState.zombieHero, attacker.currentAttack, attackerHasBullseye)
          updatedState.zombieHero = frenzyRes.updatedHero
          events.push({
            laneIndex,
            attackerSide: 'plants',
            attackerName: `${attacker.name} (Frenzy)`,
            target: 'hero',
            targetSide: 'zombies',
            damageDealt: frenzyRes.actualDamage,
            isBlocked: frenzyRes.blocked,
            isLethal: updatedState.zombieHero.hp <= 0,
            traitsTriggered: ['frenzy'],
            description: `${attacker.name} kích hoạt Frenzy tấn công bồi vào Zombie Hero gây ${frenzyRes.actualDamage} dmg${frenzyRes.blocked ? ' (SUPER-BLOCK!)' : ''}`,
          })
          logs.push(`${attacker.name} kích hoạt Frenzy tấn công bồi vào Zombie Hero gây ${frenzyRes.actualDamage} dmg!`)
          if (frenzyRes.isSuperBlockTriggered && !pendingSuperBlock) {
            pendingSuperBlock = getPendingSuperBlockForHero(updatedState.zombieHero, 'zombies')
          }
        }
      }

      if (attackerHasStrikethrough) {
        const res = applyHeroDamage(updatedState.zombieHero, attacker.currentAttack, attackerHasBullseye)
        updatedState.zombieHero = res.updatedHero
        events.push({
          laneIndex,
          attackerSide: 'plants',
          attackerName: attacker.name,
          target: 'hero',
          targetSide: 'zombies',
          damageDealt: res.actualDamage,
          isBlocked: res.blocked,
          isLethal: updatedState.zombieHero.hp <= 0,
          traitsTriggered: ['strikethrough'],
          description: `${attacker.name} bắn xuyên Strikethrough vào Zombie Hero gây ${res.actualDamage} dmg`,
        })
        if (res.isSuperBlockTriggered && !pendingSuperBlock) {
          pendingSuperBlock = getPendingSuperBlockForHero(updatedState.zombieHero, 'zombies')
        }
      }
    } else {
      // Direct attack to Zombie Hero
      const res = applyHeroDamage(updatedState.zombieHero, attacker.currentAttack, attackerHasBullseye)
      updatedState.zombieHero = res.updatedHero
      events.push({
        laneIndex,
        attackerSide: 'plants',
        attackerName: `${attacker.name} (Bonus Attack)`,
        target: 'hero',
        targetSide: 'zombies',
        damageDealt: res.actualDamage,
        isBlocked: res.blocked,
        isLethal: updatedState.zombieHero.hp <= 0,
        description: `⚡ ${attacker.name} Bonus Attack đánh thẳng vào Zombie Hero gây ${res.actualDamage} sát thương${res.blocked ? ' (SUPER-BLOCK!)' : ''}`,
      })
      logs.push(`⚡ ${attacker.name} Bonus Attack đánh thẳng vào Zombie Hero gây ${res.actualDamage} dmg!`)
      if (res.isSuperBlockTriggered && !pendingSuperBlock) {
        pendingSuperBlock = getPendingSuperBlockForHero(updatedState.zombieHero, 'zombies')
      }
    }
  } else {
    // Zombie bonus attack
    const plant = lane.plantMinion || lane.plantTeamUpMinion
    if (plant && plant.currentHealth > 0) {
      const pArmored = plant.armored ?? (plant.traits?.includes('armored') ? 1 : 0)
      const dmg = Math.max(0, attacker.currentAttack - pArmored)
      plant.currentHealth = attackerHasDeadly ? 0 : Math.max(0, plant.currentHealth - dmg)
      const isLethal = plant.currentHealth <= 0

      events.push({
        laneIndex,
        attackerSide: 'zombies',
        attackerName: `${attacker.name} (Bonus Attack)`,
        target: 'minion',
        targetSide: 'plants',
        damageDealt: dmg,
        isBlocked: false,
        isLethal,
        description: `⚡ ${attacker.name} Bonus Attack gây ${dmg} sát thương lên ${plant.name}${isLethal ? ' (Tiêu diệt!)' : ''}`,
      })
      logs.push(`⚡ ${attacker.name} Bonus Attack gây ${dmg} sát thương lên ${plant.name}${isLethal ? ' (Tiêu diệt!)' : ''}`)

      if (isLethal) {
        if (lane.plantMinion && lane.plantMinion.instanceId === plant.instanceId) {
          lane.plantMinion = null
        } else if (lane.plantTeamUpMinion && lane.plantTeamUpMinion.instanceId === plant.instanceId) {
          lane.plantTeamUpMinion = null
        }

        if (attackerHasFrenzy) {
          // If plantTeamUpMinion still exists, frenzy hits it; otherwise hits Plant Hero!
          const remainingPlant = lane.plantMinion || lane.plantTeamUpMinion
          if (remainingPlant && remainingPlant.currentHealth > 0) {
            const remArmored = remainingPlant.armored ?? (remainingPlant.traits?.includes('armored') ? 1 : 0)
            const remDmg = Math.max(0, attacker.currentAttack - remArmored)
            remainingPlant.currentHealth = attackerHasDeadly ? 0 : Math.max(0, remainingPlant.currentHealth - remDmg)
            const remLethal = remainingPlant.currentHealth <= 0
            if (remLethal) {
              if (lane.plantMinion?.instanceId === remainingPlant.instanceId) lane.plantMinion = null
              else lane.plantTeamUpMinion = null
            }
            events.push({
              laneIndex,
              attackerSide: 'zombies',
              attackerName: `${attacker.name} (Frenzy)`,
              target: 'minion',
              targetSide: 'plants',
              damageDealt: remDmg,
              isBlocked: false,
              isLethal: remLethal,
              traitsTriggered: ['frenzy'],
              description: `⚡ ${attacker.name} Frenzy tấn công tiếp tục lên ${remainingPlant.name} gây ${remDmg} dmg${remLethal ? ' (Tiêu diệt!)' : ''}`,
            })
            logs.push(`${attacker.name} Frenzy tấn công tiếp lên ${remainingPlant.name}!`)
          } else {
            const frenzyRes = applyHeroDamage(updatedState.plantHero, attacker.currentAttack, attackerHasBullseye)
            updatedState.plantHero = frenzyRes.updatedHero
            events.push({
              laneIndex,
              attackerSide: 'zombies',
              attackerName: `${attacker.name} (Frenzy)`,
              target: 'hero',
              targetSide: 'plants',
              damageDealt: frenzyRes.actualDamage,
              isBlocked: frenzyRes.blocked,
              isLethal: updatedState.plantHero.hp <= 0,
              traitsTriggered: ['frenzy'],
              description: `${attacker.name} kích hoạt Frenzy tấn công bồi vào Plant Hero gây ${frenzyRes.actualDamage} dmg${frenzyRes.blocked ? ' (SUPER-BLOCK!)' : ''}`,
            })
            logs.push(`${attacker.name} kích hoạt Frenzy tấn công bồi vào Plant Hero gây ${frenzyRes.actualDamage} dmg!`)
            if (frenzyRes.isSuperBlockTriggered && !pendingSuperBlock) {
              pendingSuperBlock = getPendingSuperBlockForHero(updatedState.plantHero, 'plants')
            }
          }
        }
      }

      if (attackerHasStrikethrough) {
        const res = applyHeroDamage(updatedState.plantHero, attacker.currentAttack, attackerHasBullseye)
        updatedState.plantHero = res.updatedHero
        events.push({
          laneIndex,
          attackerSide: 'zombies',
          attackerName: attacker.name,
          target: 'hero',
          targetSide: 'plants',
          damageDealt: res.actualDamage,
          isBlocked: res.blocked,
          isLethal: updatedState.plantHero.hp <= 0,
          traitsTriggered: ['strikethrough'],
          description: `${attacker.name} bắn xuyên Strikethrough vào Plant Hero gây ${res.actualDamage} dmg`,
        })
        if (res.isSuperBlockTriggered && !pendingSuperBlock) {
          pendingSuperBlock = getPendingSuperBlockForHero(updatedState.plantHero, 'plants')
        }
      }
    } else {
      // Direct attack to Plant Hero
      const res = applyHeroDamage(updatedState.plantHero, attacker.currentAttack, attackerHasBullseye)
      updatedState.plantHero = res.updatedHero
      events.push({
        laneIndex,
        attackerSide: 'zombies',
        attackerName: `${attacker.name} (Bonus Attack)`,
        target: 'hero',
        targetSide: 'plants',
        damageDealt: res.actualDamage,
        isBlocked: res.blocked,
        isLethal: updatedState.plantHero.hp <= 0,
        description: `⚡ ${attacker.name} Bonus Attack đánh thẳng vào Plant Hero gây ${res.actualDamage} sát thương${res.blocked ? ' (SUPER-BLOCK!)' : ''}`,
      })
      logs.push(`⚡ ${attacker.name} Bonus Attack đánh thẳng vào Plant Hero gây ${res.actualDamage} dmg!`)
      if (res.isSuperBlockTriggered && !pendingSuperBlock) {
        pendingSuperBlock = getPendingSuperBlockForHero(updatedState.plantHero, 'plants')
      }
    }
  }

  updatedState.pendingSuperBlock = pendingSuperBlock
  updatedState.combatLog = [...logs, ...updatedState.combatLog]

  return { updatedState, events, logs }
}
