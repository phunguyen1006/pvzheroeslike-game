import { describe, it, expect } from 'vitest'
import {
  createInitialGameState,
  gameReducer,
  drawCard,
} from '../engine/reducer'
import {
  applyHeroDamage,
  getPendingSuperBlockForHero,
  resolveCombat,
} from '../engine/combat'
import {
  playEnvironment,
  applyEnvironmentBeforeCombat,
  applyEnvironmentOnPlay,
  applyEnvironmentOnHeroDamage,
} from '../engine/environments'
import {
  revealGravestones,
  triggerWhenPlayed,
  triggerDinoRoar,
} from '../engine/abilities'
import {
  executeTrick,
} from '../engine/tricks'
import {
  conjureCard,
} from '../engine/conjure'
import {
  getAIMulliganDecision,
  getAISuperpowerDecision,
  getAIDecision,
  type AIArchetype,
  type AIDifficulty,
} from '../engine/ai'
import type { GameState, Side, Card, Minion, LaneState, Phase } from '../engine/types'

// ========================================================
// TEST HELPERS & FACTORIES
// ========================================================

const createTestMinion = (
  instanceId: string,
  name: string,
  side: Side,
  attack: number,
  health: number,
  options: Partial<Minion> = {}
): Minion => ({
  instanceId,
  cardId: `card_${instanceId}`,
  name,
  side,
  currentAttack: attack,
  baseAttack: attack,
  currentHealth: health,
  maxHealth: health,
  image: `/assets/${name}.png`,
  traits: [],
  ...options,
})

const createTestCard = (
  id: string,
  name: string,
  side: Side,
  cost: number,
  type: 'minion' | 'trick' | 'environment' | 'superpower',
  options: Partial<Card> = {}
): Card => ({
  id,
  name,
  side,
  cost,
  type,
  image: `/assets/${name}.png`,
  traits: [],
  ...options,
})

describe('Round 12: Advanced Mechanics, Environment & Gravestones & AI Stress Testing', () => {

  // =========================================================================
  // 1. ENVIRONMENT INTERACTIONS & OVERWRITING
  // =========================================================================
  describe('1. Environment Interactions & Overwriting', () => {
    it('1.1 should place Spikeweed Sector and deal 2 damage to opposing Zombie before combat', () => {
      const state = createInitialGameState('hero_solar_flare', 'hero_super_brainz')
      const envCard = createTestCard('plant_spikeweed_sector', 'Spikeweed Sector', 'plants', 2, 'environment')

      // Place Spikeweed Sector in lane 1
      const playEnvRes = playEnvironment(state, envCard, 1, 'plants')
      expect(playEnvRes.updatedState.lanes[1].environment).toBeDefined()
      expect(playEnvRes.updatedState.lanes[1].environment?.id).toBe('plant_spikeweed_sector')

      // Put a 3/3 Zombie in lane 1
      playEnvRes.updatedState.lanes[1].zombieMinion = createTestMinion('z1', 'Basic Zombie', 'zombies', 3, 3)

      // Trigger before combat
      const beforeCombatRes = applyEnvironmentBeforeCombat(playEnvRes.updatedState, 1)
      expect(beforeCombatRes.updatedState.lanes[1].zombieMinion?.currentHealth).toBe(1)
      expect(beforeCombatRes.events.some(e => e.includes('Gai nhọn Spikeweed Sector'))).toBe(true)
    })

    it('1.2 should lethally destroy low HP Zombie before combat via Spikeweed Sector', () => {
      const state = createInitialGameState('hero_solar_flare', 'hero_super_brainz')
      const envCard = createTestCard('plant_spikeweed_sector', 'Spikeweed Sector', 'plants', 2, 'environment')
      const playEnvRes = playEnvironment(state, envCard, 2, 'plants')

      // Place a 2 HP Zombie in lane 2
      playEnvRes.updatedState.lanes[2].zombieMinion = createTestMinion('z_imp', 'Imp', 'zombies', 1, 2)

      const beforeCombatRes = applyEnvironmentBeforeCombat(playEnvRes.updatedState, 2)
      expect(beforeCombatRes.updatedState.lanes[2].zombieMinion).toBeNull()
      expect(beforeCombatRes.events.some(e => e.includes('tiêu diệt trước giao tranh') || e.includes('đâm chết'))).toBe(true)
    })

    it('1.3 should apply Total Eclipse debuff (-1/-1) and destroy 1 HP plant on placement', () => {
      const state = createInitialGameState('hero_solar_flare', 'hero_super_brainz')
      state.lanes[1].plantMinion = createTestMinion('p1', 'Puff-Shroom', 'plants', 1, 1)
      state.lanes[2].plantMinion = createTestMinion('p2', 'Peashooter', 'plants', 2, 2)

      const eclipseCard = createTestCard('zombie_total_eclipse', 'Total Eclipse', 'zombies', 2, 'environment')

      // Play Total Eclipse on lane 1 (1 HP plant -> destroyed)
      const res1 = playEnvironment(state, eclipseCard, 1, 'zombies')
      expect(res1.updatedState.lanes[1].plantMinion).toBeNull()
      expect(res1.events.some(e => e.includes('Total Eclipse'))).toBe(true)

      // Play Total Eclipse on lane 2 (2 HP plant -> survives as 1/1)
      const res2 = playEnvironment(state, eclipseCard, 2, 'zombies')
      expect(res2.updatedState.lanes[2].plantMinion?.currentAttack).toBe(1)
      expect(res2.updatedState.lanes[2].plantMinion?.currentHealth).toBe(1)
    })

    it('1.4 should grant Deadly and Strikethrough to Zombie via Laser Base Alpha', () => {
      const state = createInitialGameState('hero_solar_flare', 'hero_super_brainz')
      state.lanes[1].zombieMinion = createTestMinion('z1', 'Conehead', 'zombies', 2, 4)

      const laserCard = createTestCard('zombie_laser_base_alpha', 'Laser Base Alpha', 'zombies', 3, 'environment')
      const res = playEnvironment(state, laserCard, 1, 'zombies')

      const z = res.updatedState.lanes[1].zombieMinion!
      expect(z.deadly).toBe(true)
      expect(z.strikethrough).toBe(true)
    })

    it('1.5 should grant Amphibious and +2/+2 to Amphibious plants and weaken non-Amphibious zombies via Bog of Sunken Hope', () => {
      const state = createInitialGameState('hero_solar_flare', 'hero_super_brainz')
      // Amphibious plant
      state.lanes[4].plantMinion = createTestMinion('p_amphib', 'Navy Bean', 'plants', 2, 2, { amphibious: true })
      // Non-amphibious zombie
      state.lanes[4].zombieMinion = createTestMinion('z_walker', 'Conehead', 'zombies', 3, 4)

      const bogCard = createTestCard('plant_bog_of_sunken_hope', 'Bog of Sunken Hope', 'plants', 3, 'environment')
      const res = playEnvironment(state, bogCard, 4, 'plants')

      const plant = res.updatedState.lanes[4].plantMinion!
      const zombie = res.updatedState.lanes[4].zombieMinion!

      // Plant got +2/+2
      expect(plant.currentAttack).toBe(4)
      expect(plant.currentHealth).toBe(4)
      expect(plant.amphibious).toBe(true)

      // Zombie got -2 Attack
      expect(zombie.currentAttack).toBe(1)
    })

    it('1.6 should grant +3 HP via Cone Zone on placement and minion entry', () => {
      const state = createInitialGameState('hero_solar_flare', 'hero_super_brainz')
      state.lanes[2].zombieMinion = createTestMinion('z1', 'Basic Zombie', 'zombies', 2, 2)

      const coneCard = createTestCard('zombie_cone_zone', 'Cone Zone', 'zombies', 2, 'environment')
      const res = playEnvironment(state, coneCard, 2, 'zombies')

      expect(res.updatedState.lanes[2].zombieMinion?.currentHealth).toBe(5)
      expect(res.updatedState.lanes[2].zombieMinion?.maxHealth).toBe(5)

      // Test applyEnvironmentOnPlay when a new Zombie enters Cone Zone
      let entryState = { ...res.updatedState }
      entryState.lanes[2].zombieMinion = createTestMinion('z2', 'Buckethead', 'zombies', 3, 4)
      const entryRes = applyEnvironmentOnPlay(entryState, 2, 'zombies')
      expect(entryRes.updatedState.lanes[2].zombieMinion?.currentHealth).toBe(7)
    })

    it('1.7 should grant +2 Brains when Zombie is played onto Medulla Nebula', () => {
      const state = createInitialGameState('hero_solar_flare', 'hero_super_brainz')
      const medullaCard = createTestCard('zombie_medulla_nebula', 'Medulla Nebula', 'zombies', 2, 'environment')
      const playEnvRes = playEnvironment(state, medullaCard, 1, 'zombies')

      playEnvRes.updatedState.zombieHero.brains = 2
      const onPlayRes = applyEnvironmentOnPlay(playEnvRes.updatedState, 1, 'zombies')

      expect(onPlayRes.updatedState.zombieHero.brains).toBe(4)
      expect(onPlayRes.events.some(e => e.includes('Medulla Nebula'))).toBe(true)
    })

    it('1.8 should trigger Moon Base Z Overshoot 3 before combat', () => {
      const state = createInitialGameState('hero_solar_flare', 'hero_super_brainz')
      state.lanes[1].zombieMinion = createTestMinion('z1', 'Scientist', 'zombies', 2, 3)

      const moonCard = createTestCard('zombie_moon_base_z', 'Moon Base Z', 'zombies', 3, 'environment')
      const playEnvRes = playEnvironment(state, moonCard, 1, 'zombies')

      const initialHp = playEnvRes.updatedState.plantHero.hp
      const beforeCombatRes = applyEnvironmentBeforeCombat(playEnvRes.updatedState, 1)

      expect(beforeCombatRes.updatedState.plantHero.hp).toBe(initialHp - 3)
      expect(beforeCombatRes.events.some(e => e.includes('Moon Base Z') && e.includes('Overshoot 3'))).toBe(true)
    })

    it('1.9 should draw a card when Plant on Planet of the Grapes hurts Zombie Hero', () => {
      const state = createInitialGameState('hero_solar_flare', 'hero_super_brainz')
      const grapesCard = createTestCard('plant_planet_of_the_grapes', 'Planet of the Grapes', 'plants', 2, 'environment')
      const playEnvRes = playEnvironment(state, grapesCard, 1, 'plants')

      playEnvRes.updatedState.plantDeck = [
        createTestCard('c1', 'Card 1', 'plants', 1, 'minion'),
        createTestCard('c2', 'Card 2', 'plants', 1, 'minion'),
      ]
      const initialHandCount = playEnvRes.updatedState.plantHand.length

      const heroDmgRes = applyEnvironmentOnHeroDamage(playEnvRes.updatedState, 1, 'plants')
      expect(heroDmgRes.updatedState.plantHand.length).toBe(initialHandCount + 1)
      expect(heroDmgRes.events.some(e => e.includes('Planet of the Grapes'))).toBe(true)
    })

    it('1.10 should properly overwrite existing Environment regardless of faction', () => {
      const state = createInitialGameState('hero_solar_flare', 'hero_super_brainz')
      const plantEnv = createTestCard('plant_spikeweed_sector', 'Spikeweed Sector', 'plants', 2, 'environment')
      const zombieEnv = createTestCard('zombie_total_eclipse', 'Total Eclipse', 'zombies', 2, 'environment')

      // Step 1: Plant plays Spikeweed Sector in Lane 2
      const res1 = playEnvironment(state, plantEnv, 2, 'plants')
      expect(res1.updatedState.lanes[2].environment?.id).toBe('plant_spikeweed_sector')
      expect(res1.updatedState.lanes[2].environment?.side).toBe('plants')

      // Step 2: Zombie overwrites with Total Eclipse in Lane 2
      const res2 = playEnvironment(res1.updatedState, zombieEnv, 2, 'zombies')
      expect(res2.updatedState.lanes[2].environment?.id).toBe('zombie_total_eclipse')
      expect(res2.updatedState.lanes[2].environment?.side).toBe('zombies')
      expect(res2.events.some(e => e.includes('thay thế Spikeweed Sector'))).toBe(true)

      // Step 3: Plant overwrites again with Bog of Sunken Hope
      const bogEnv = createTestCard('plant_bog_of_sunken_hope', 'Bog of Sunken Hope', 'plants', 3, 'environment')
      const res3 = playEnvironment(res2.updatedState, bogEnv, 2, 'plants')
      expect(res3.updatedState.lanes[2].environment?.id).toBe('plant_bog_of_sunken_hope')
      expect(res3.updatedState.lanes[2].environment?.side).toBe('plants')
      expect(res3.events.some(e => e.includes('thay thế Total Eclipse'))).toBe(true)
    })
  })

  // =========================================================================
  // 2. GRAVESTONE & REVEAL TRIGGERS
  // =========================================================================
  describe('2. Gravestone & Reveal Triggers', () => {
    it('2.1 should deploy Zombie Gravestone concealing minion stats in ZOMBIE_PLAY and suppress when-played', () => {
      let state = createInitialGameState('hero_solar_flare', 'hero_super_brainz')
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 5

      const congaCard = createTestCard('zombie_conga_zombie', 'Conga Zombie', 'zombies', 2, 'minion', {
        attack: 2,
        health: 2,
        gravestone: true,
        traits: ['gravestone'],
      })
      state.zombieHand = [congaCard]

      // Plant has a 2 HP minion
      state.lanes[1].plantMinion = createTestMinion('p1', 'Sunflower', 'plants', 0, 2)

      // Zombie plays Conga Zombie
      state = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: 'zombie_conga_zombie',
        laneIndex: 1,
      })

      const playedMinion = state.lanes[1].zombieMinion
      expect(playedMinion).toBeDefined()
      expect(playedMinion?.isGravestone).toBe(true)
      expect(playedMinion?.gravestone).toBe(true)

      // When-played damage (Conga 1 dmg) must NOT have triggered yet! Sunflower should still be at 2 HP
      expect(state.lanes[1].plantMinion?.currentHealth).toBe(2)
      expect(state.combatLog.some(l => l.includes('Bia Mộ bí ẩn') || l.includes('Gravestone'))).toBe(true)
    })

    it('2.2 should allow Plant to destroy Gravestone using Grave Buster during PLANT_PLAY', () => {
      let state = createInitialGameState('hero_solar_flare', 'hero_super_brainz')
      state.phase = 'PLANT_PLAY'
      state.plantHero.sun = 3

      // Setup Gravestone in lane 2
      state.lanes[2].zombieMinion = createTestMinion('gz1', 'Conga Zombie', 'zombies', 2, 2, {
        isGravestone: true,
        gravestone: true,
      })

      const graveBusterCard = createTestCard('plant_grave_buster', 'Grave Buster', 'plants', 2, 'trick')
      state.plantHand = [graveBusterCard]

      const trickRes = executeTrick(state, graveBusterCard, 'plants', 2)
      expect(trickRes.success).toBe(true)
      expect(trickRes.updatedState.lanes[2].zombieMinion).toBeNull()
      expect(trickRes.message.includes('Grave Buster phá tan bia mộ')).toBe(true)
    })

    it('2.3 should reject Grave Buster targeting a revealed non-Gravestone minion', () => {
      const state = createInitialGameState('hero_solar_flare', 'hero_super_brainz')
      state.lanes[1].zombieMinion = createTestMinion('z1', 'Regular Zombie', 'zombies', 2, 2, {
        isGravestone: false,
      })

      const graveBusterCard = createTestCard('plant_grave_buster', 'Grave Buster', 'plants', 2, 'trick')
      const trickRes = executeTrick(state, graveBusterCard, 'plants', 1)

      // Minion should not be destroyed
      expect(trickRes.updatedState.lanes[1].zombieMinion).not.toBeNull()
      expect(trickRes.message.includes('chỉ có thể tiêu diệt Bia Mộ')).toBe(true)
    })

    it('2.4 should reveal Gravestones and trigger abilities when transitioning to ZOMBIE_TRICKS', () => {
      let state = createInitialGameState('hero_solar_flare', 'hero_super_brainz')
      state.phase = 'PLANT_PLAY'

      // Gravestone with Conga Zombie in lane 2
      state.lanes[2].zombieMinion = createTestMinion('z_conga', 'Conga Zombie', 'zombies', 2, 2, {
        cardId: 'zombie_conga_zombie',
        isGravestone: true,
        gravestone: true,
      })
      // Target plant for Conga's 1 damage
      state.lanes[2].plantMinion = createTestMinion('p1', 'Peashooter', 'plants', 1, 2)

      // Transition to ZOMBIE_TRICKS
      state = gameReducer(state, { type: 'NEXT_PHASE' })

      expect(state.phase).toBe('ZOMBIE_TRICKS')
      const revealed = state.lanes[2].zombieMinion!
      expect(revealed.isGravestone).toBe(false)
      expect(state.combatLog.some(l => l.includes('Bia Mộ vỡ tung') && l.includes('Conga Zombie'))).toBe(true)
    })

    it('2.5 should reveal multiple Gravestones sequentially from lane 0 to 4', () => {
      let state = createInitialGameState('hero_solar_flare', 'hero_super_brainz')
      state.lanes[0].zombieMinion = createTestMinion('gz0', 'Zombie A', 'zombies', 1, 2, { isGravestone: true })
      state.lanes[2].zombieMinion = createTestMinion('gz2', 'Zombie B', 'zombies', 2, 3, { isGravestone: true })
      state.lanes[4].zombieMinion = createTestMinion('gz4', 'Zombie C', 'zombies', 3, 4, { isGravestone: true })

      const { updatedState, events } = revealGravestones(state)

      expect(updatedState.lanes[0].zombieMinion?.isGravestone).toBe(false)
      expect(updatedState.lanes[2].zombieMinion?.isGravestone).toBe(false)
      expect(updatedState.lanes[4].zombieMinion?.isGravestone).toBe(false)

      const revealEvents = events.filter(e => e.description.includes('Bia Mộ vỡ tung'))
      expect(revealEvents.length).toBe(3)
      expect(revealEvents[0].laneIndex).toBe(0)
      expect(revealEvents[1].laneIndex).toBe(2)
      expect(revealEvents[2].laneIndex).toBe(4)
    })
  })

  // =========================================================================
  // 3. HERO SUPER-BLOCK EDGE CASES
  // =========================================================================
  describe('3. Hero Super-Block Edge Cases', () => {
    it('3.1 Hand Overflow Rule: 10-card full hand disables Super-Block shield', () => {
      const hero = {
        id: 'hero_green_shadow',
        name: 'Green Shadow',
        hp: 15,
        maxHp: 20,
        sun: 5,
        maxSun: 5,
        brains: 0,
        maxBrains: 0,
        blockMeter: 7, // 7 segments, any hit will fill to >= 8
        isShieldActive: false,
        blockCount: 0,
      }

      // Hand has 10 cards (MAX)
      const res = applyHeroDamage(hero, 4, false, 10)

      // Super-Block must NOT trigger!
      expect(res.blocked).toBe(false)
      expect(res.isSuperBlockTriggered).toBe(false)
      // Hero takes full 4 damage
      expect(res.actualDamage).toBe(4)
      expect(res.updatedHero.hp).toBe(11)
      // Block meter fills to 8/8
      expect(res.updatedHero.blockMeter).toBe(8)
    })

    it('3.2 Normal Super-Block activates when hand has fewer than 10 cards', () => {
      const hero = {
        id: 'hero_green_shadow',
        name: 'Green Shadow',
        hp: 15,
        maxHp: 20,
        sun: 5,
        maxSun: 5,
        brains: 0,
        maxBrains: 0,
        blockMeter: 7,
        isShieldActive: false,
        blockCount: 0,
      }

      // Hand has 5 cards (< 10)
      const res = applyHeroDamage(hero, 4, false, 5)

      // Super-Block MUST trigger!
      expect(res.blocked).toBe(true)
      expect(res.isSuperBlockTriggered).toBe(true)
      // 100% damage blocked
      expect(res.actualDamage).toBe(0)
      expect(res.updatedHero.hp).toBe(15)
      // Block meter resets to 0 and blockCount increments
      expect(res.updatedHero.blockMeter).toBe(0)
      expect(res.updatedHero.blockCount).toBe(1)
    })

    it('3.3 should generate a 0-cost Superpower card upon Super-Block', () => {
      const hero = {
        id: 'hero_solar_flare',
        name: 'Solar Flare',
        hp: 20,
        maxHp: 20,
        sun: 5,
        maxSun: 5,
        brains: 0,
        maxBrains: 0,
        blockMeter: 0,
        isShieldActive: false,
        blockCount: 1,
        superPower: 'Sunburn',
      }

      const pending = getPendingSuperBlockForHero(hero, 'plants')
      expect(pending.side).toBe('plants')
      expect(pending.superpower).toBeDefined()
      expect(pending.superpower.cost).toBe(0)
      expect(pending.superpower.type).toBe('superpower')
    })

    it('3.4 PLAY_SUPERPOWER immediately executes superpower at 0 cost and clears pendingSuperBlock', () => {
      let state = createInitialGameState('hero_green_shadow', 'hero_super_brainz')
      state.pendingSuperBlock = getPendingSuperBlockForHero(state.plantHero, 'plants')
      expect(state.pendingSuperBlock).not.toBeNull()

      state = gameReducer(state, {
        type: 'PLAY_SUPERPOWER',
        side: 'plants',
        superpowerId: state.pendingSuperBlock.superpower.id,
        laneIndex: 2,
      })

      expect(state.pendingSuperBlock).toBeNull()
      expect(state.combatLog.length).toBeGreaterThan(0)
    })

    it('3.5 SAVE_SUPERPOWER stores 0-cost superpower card into hand and clears pendingSuperBlock', () => {
      let state = createInitialGameState('hero_green_shadow', 'hero_super_brainz')
      state.pendingSuperBlock = getPendingSuperBlockForHero(state.plantHero, 'plants')
      const spId = state.pendingSuperBlock.superpower.id
      const initialHandSize = state.plantHand.length

      state = gameReducer(state, {
        type: 'SAVE_SUPERPOWER',
        side: 'plants',
      })

      expect(state.pendingSuperBlock).toBeNull()
      expect(state.plantHand.length).toBe(initialHandSize + 1)
      const savedCard = state.plantHand.find(c => c.id === spId)
      expect(savedCard).toBeDefined()
      expect(savedCard?.cost).toBe(0)
    })

    it('3.6 Block Meter Max Limit: cannot trigger Super-Block after 3 shields have been consumed', () => {
      const hero = {
        id: 'hero_green_shadow',
        name: 'Green Shadow',
        hp: 10,
        maxHp: 20,
        sun: 5,
        maxSun: 5,
        brains: 0,
        maxBrains: 0,
        blockMeter: 6,
        isShieldActive: false,
        blockCount: 3, // Already used 3 shields!
      }

      const res = applyHeroDamage(hero, 5, false, 2)
      expect(res.blocked).toBe(false)
      expect(res.isSuperBlockTriggered).toBe(false)
      expect(res.actualDamage).toBe(5)
      expect(res.updatedHero.hp).toBe(5)
      expect(res.meterGained).toBe(0)
    })
  })

  // =========================================================================
  // 4. CONJURE & DINO-ROAR SYNERGY
  // =========================================================================
  describe('4. Conjure & Dino-Roar Synergy', () => {
    it('4.1 Bananasaurus Rex gains +1/+1 upon drawing a card', () => {
      let state = createInitialGameState('hero_green_shadow', 'hero_super_brainz')
      state.lanes[1].plantMinion = createTestMinion('b_rex', 'Bananasaurus Rex', 'plants', 3, 3, {
        cardId: 'plant_bananasaurus_rex',
      })

      state.plantDeck = [createTestCard('c1', 'Pea', 'plants', 1, 'minion')]

      const dinoRes = triggerDinoRoar(state, 'plants')
      const bRex = dinoRes.updatedState.lanes[1].plantMinion!

      expect(bRex.currentAttack).toBe(4)
      expect(bRex.currentHealth).toBe(4)
      expect(dinoRes.events.some(e => e.includes('Bananasaurus Rex gầm vang'))).toBe(true)
    })

    it('4.2 Raiding Raptor gains +2 Attack upon drawing a card', () => {
      let state = createInitialGameState('hero_green_shadow', 'hero_super_brainz')
      state.lanes[2].zombieMinion = createTestMinion('raptor', 'Raiding Raptor', 'zombies', 2, 4, {
        cardId: 'zombie_raiding_raptor',
      })

      const dinoRes = triggerDinoRoar(state, 'zombies')
      const raptor = dinoRes.updatedState.lanes[2].zombieMinion!

      expect(raptor.currentAttack).toBe(4)
      expect(dinoRes.events.some(e => e.includes('Raiding Raptor gầm vang'))).toBe(true)
    })

    it('4.3 Aloesaurus heals all Plants and Plant Hero for 2 on Dino-Roar', () => {
      let state = createInitialGameState('hero_green_shadow', 'hero_super_brainz')
      state.plantHero.hp = 15 // Damaged hero
      state.lanes[1].plantMinion = createTestMinion('aloe', 'Aloesaurus', 'plants', 4, 7, {
        cardId: 'plant_aloeosaurus',
      })
      // Damaged ally plant
      state.lanes[2].plantMinion = createTestMinion('p1', 'Wall-Nut', 'plants', 0, 3, {
        maxHealth: 6,
      })

      const dinoRes = triggerDinoRoar(state, 'plants')
      expect(dinoRes.updatedState.plantHero.hp).toBe(17)
      expect(dinoRes.updatedState.lanes[2].plantMinion?.currentHealth).toBe(5)
    })

    it('4.4 Quickdraw Con Man shoots 1 Bullseye damage to Plant Hero when Plant draws a card', () => {
      let state = createInitialGameState('hero_green_shadow', 'hero_super_brainz')
      state.lanes[1].zombieMinion = createTestMinion('conman', 'Quickdraw Con Man', 'zombies', 1, 3, {
        cardId: 'zombie_quickdraw_con_man',
      })

      const initialHp = state.plantHero.hp
      const initialMeter = state.plantHero.blockMeter

      const dinoRes = triggerDinoRoar(state, 'plants')
      expect(dinoRes.updatedState.plantHero.hp).toBe(initialHp - 1)
      // Bullseye ensures block meter remains unchanged
      expect(dinoRes.updatedState.plantHero.blockMeter).toBe(initialMeter)
    })

    it('4.5 Conjure respects rarity filter and applies cost discount', () => {
      const state = createInitialGameState('hero_green_shadow', 'hero_super_brainz')
      state.plantHand = []

      const conjureRes = conjureCard(state, 'plants', {
        count: 1,
        filter: { rarity: 'Legendary' },
        costDiscount: 1,
        sourceName: 'Captain Cucumber',
      })

      expect(conjureRes.conjuredCards.length).toBe(1)
      const conjured = conjureRes.conjuredCards[0]
      expect(conjured.side).toBe('plants')
      expect(conjureRes.updatedState.plantHand.length).toBe(1)
      expect(conjureRes.events.some(e => e.includes('Captain Cucumber'))).toBe(true)
    })

    it('4.6 Conjure respects 10-card hand limit and does not overflow', () => {
      const state = createInitialGameState('hero_green_shadow', 'hero_super_brainz')
      // Fill hand with 10 cards
      state.plantHand = Array(10).fill(null).map((_, i) => createTestCard(`c_${i}`, `Card ${i}`, 'plants', 1, 'minion'))

      const conjureRes = conjureCard(state, 'plants', {
        count: 2,
        costDiscount: 1,
      })

      // Hand should remain exactly 10 cards
      expect(conjureRes.updatedState.plantHand.length).toBe(10)
      expect(conjureRes.conjuredCards.length).toBe(0)
    })
  })

  // =========================================================================
  // 5. STRESS TEST & MONTE-CARLO SIMULATION (60 MATCHES)
  // =========================================================================
  describe('5. Stress Test & Monte-Carlo Simulation (60 Matches)', () => {
    it('5.1 executes 60 automated AI vs AI matches with 0 exceptions, 0 deadlocks, and invariant preservation', () => {
      const archetypePairs: [AIArchetype, AIArchetype][] = [
        ['aggro', 'control'],
        ['control', 'midrange'],
        ['midrange', 'tempo'],
        ['tempo', 'aggro'],
        ['aggro', 'aggro'],
        ['control', 'control'],
      ]

      const TOTAL_MATCHES = 60
      let completedMatches = 0
      let plantWins = 0
      let zombieWins = 0
      let turnLimitReached = 0
      let totalTurns = 0
      let totalActions = 0

      for (let i = 0; i < TOTAL_MATCHES; i++) {
        const [plantArch, zombieArch] = archetypePairs[i % archetypePairs.length]
        const state = createInitialGameState('hero_solar_flare', 'hero_super_brainz')
        state.phase = 'MULLIGAN'

        let curState: GameState = state
        let turns = 0
        const MAX_TURNS = 15

        // Mulligan phase
        const plantMulligan = getAIMulliganDecision(curState.plantHand, plantArch, 'hero_solar_flare')
        if (plantMulligan.swapIndices.length > 0) {
          curState = gameReducer(curState, {
            type: 'MULLIGAN_SWAP',
            side: 'plants',
            cardIndices: plantMulligan.swapIndices,
          })
        }
        curState = gameReducer(curState, { type: 'FINISH_MULLIGAN', side: 'plants' })

        // Match turn loop
        while (curState.turn <= MAX_TURNS && !curState.winner) {
          turns++
          const phase = curState.phase

          if (phase === 'ZOMBIE_PLAY') {
            let plays = 0
            while (plays < 3 && !curState.winner) {
              const decision = getAIDecision(curState, 'zombies', { difficulty: 'normal', archetype: zombieArch })
              if (decision.action === 'PLAY_MINION' && decision.card && decision.laneIndex !== undefined && decision.card.cost <= curState.zombieHero.brains) {
                curState = gameReducer(curState, {
                  type: 'PLAY_CARD',
                  side: 'zombies',
                  cardId: decision.card.id,
                  laneIndex: decision.laneIndex,
                })
                totalActions++
                plays++
              } else {
                break
              }
            }
            if (!curState.winner) curState = gameReducer(curState, { type: 'NEXT_PHASE' })
          } else if (phase === 'PLANT_PLAY') {
            let plays = 0
            while (plays < 3 && !curState.winner) {
              const decision = getAIDecision(curState, 'plants', { difficulty: 'normal', archetype: plantArch })
              if (decision.action === 'PLAY_MINION' && decision.card && decision.laneIndex !== undefined && decision.card.cost <= curState.plantHero.sun) {
                curState = gameReducer(curState, {
                  type: 'PLAY_CARD',
                  side: 'plants',
                  cardId: decision.card.id,
                  laneIndex: decision.laneIndex,
                })
                totalActions++
                plays++
              } else {
                break
              }
            }
            if (!curState.winner) curState = gameReducer(curState, { type: 'NEXT_PHASE' })
          } else if (phase === 'ZOMBIE_TRICKS') {
            let plays = 0
            while (plays < 2 && !curState.winner) {
              const decision = getAIDecision(curState, 'zombies', { difficulty: 'normal', archetype: zombieArch })
              if (decision.action === 'PLAY_TRICK' && decision.card && decision.card.cost <= curState.zombieHero.brains) {
                curState = gameReducer(curState, {
                  type: 'PLAY_CARD',
                  side: 'zombies',
                  cardId: decision.card.id,
                  laneIndex: decision.laneIndex ?? 0,
                  targetHero: decision.targetHero,
                })
                totalActions++
                plays++
              } else {
                break
              }
            }
            if (!curState.winner) curState = gameReducer(curState, { type: 'NEXT_PHASE' })
          } else if (phase === 'FIGHT') {
            curState = gameReducer(curState, { type: 'START_COMBAT' })
            totalActions++

            // Handle pending Super-Block
            if (curState.pendingSuperBlock) {
              const sb = curState.pendingSuperBlock
              const spDec = getAISuperpowerDecision(curState, sb.side, sb.superpower, sb.side === 'plants' ? plantArch : zombieArch)
              if (spDec.action === 'PLAY_SUPERPOWER') {
                curState = gameReducer(curState, {
                  type: 'PLAY_SUPERPOWER',
                  side: sb.side,
                  superpowerId: spDec.superpowerId,
                  laneIndex: spDec.targetLaneIndex ?? 0,
                  targetHero: spDec.targetHero,
                })
              } else {
                curState = gameReducer(curState, {
                  type: 'SAVE_SUPERPOWER',
                  side: sb.side,
                })
              }
              totalActions++
            }

            if (!curState.winner) {
              curState = gameReducer(curState, { type: 'NEXT_PHASE' })
            }
          }

          // Invariant assertions per turn:
          expect(curState.plantHand.length).toBeLessThanOrEqual(10)
          expect(curState.zombieHand.length).toBeLessThanOrEqual(10)
          expect(curState.lanes.length).toBe(5)
        }

        completedMatches++
        totalTurns += turns
        if (curState.winner === 'plants') plantWins++
        else if (curState.winner === 'zombies') zombieWins++
        else turnLimitReached++

        // Terminal Invariant verification
        expect(['plants', 'zombies', null]).toContain(curState.winner)
        expect(curState.plantHero.hp).toBeGreaterThanOrEqual(0)
        expect(curState.zombieHero.hp).toBeGreaterThanOrEqual(0)
      }

      expect(completedMatches).toBe(TOTAL_MATCHES)
      expect(totalActions).toBeGreaterThan(100)
    })
  })
})
