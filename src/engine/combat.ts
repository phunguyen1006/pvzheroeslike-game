import type { HeroState, GameState, CombatResult, CombatEvent, Side, Card, Minion } from './types'
import { SUPERPOWERS } from '../data/superpowers'
import { triggerOnMultipleDeaths } from './triggers'
import { isFlowerPlant } from './abilities'

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
      let totalDmg = plant.currentAttack
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
    }
  } else if (!plant && zombie) {
    // ========================================================
    // 5. OPEN LANE ZOMBIE -> ATTACKS PLANT HERO DIRECTLY
    // ========================================================
    if (zombieCanAttack) {
      const zombieHasBullseye = Boolean(zombie.bullseye || zombie.traits?.includes('bullseye'))
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
        description: `${zombie.name} attacked Plant Hero directly for ${res.actualDamage} dmg${res.blocked ? ' (SUPER-BLOCK!)' : ''}`,
      })
      if (res.isSuperBlockTriggered && !pendingSuperBlock) {
        pendingSuperBlock = getPendingSuperBlockForHero(currentPlantHero, 'plants')
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
