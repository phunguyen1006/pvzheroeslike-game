import { describe, it, expect, beforeEach } from 'vitest'
import {
  CHAPTER_1_MISSIONS,
  CHAPTER_2_MISSIONS,
  ALL_CAMPAIGN_MISSIONS,
  CAMPAIGN_CHAPTERS,
  ZOMBIE_CHAPTER_1_MISSIONS,
  ZOMBIE_CAMPAIGN_CHAPTERS,
  ALL_ZOMBIE_CAMPAIGN_MISSIONS,
  buildMissionLanes,
  calculateMissionStars,
  loadCampaignProgress,
  saveCampaignProgress,
  loadZombieCampaignProgress,
  saveZombieCampaignProgress,
} from '../data/campaign'
import { createInitialGameState, gameReducer } from '../engine/reducer'
import { ALL_CARDS, PLANT_CARDS, ZOMBIE_CARDS } from '../data/cards'
import {
  exportDeckCode,
  validateAndParseDeckCode,
} from '../components/deck/DeckBuilder'

describe('Campaign Mode - Chapter 1: Suburban Crisis Specifications', () => {
  let store: Record<string, string> = {}

  beforeEach(() => {
    store = {}
    globalThis.localStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        store = {}
      },
      length: 0,
      key: () => null,
    } as any
  })

  it('contains exactly 5 progressive missions in Chapter 1', () => {
    expect(CHAPTER_1_MISSIONS).toHaveLength(5)
    expect(CHAPTER_1_MISSIONS.map((m) => m.missionNumber)).toEqual([1, 2, 3, 4, 5])
  })

  it('Mission 1 matches Super Brainz boss with +1 Sun bonus rule', () => {
    const m1 = CHAPTER_1_MISSIONS[0]
    expect(m1.bossHeroId).toBe('hero_super_brainz')
    expect(m1.difficulty).toBe('easy')
    expect(m1.rule.startingSunBonus).toBe(1)
    expect(m1.rule.startingBrainsBonus).toBe(0)
    expect(m1.rewards.unlocksNext).toBe(true)
  })

  it('Mission 2 matches Impfinity boss with pre-placed Wall-Nut and Swabbie', () => {
    const m2 = CHAPTER_1_MISSIONS[1]
    expect(m2.bossHeroId).toBe('hero_impfinity')
    expect(m2.rule.initialMinions).toHaveLength(2)

    const wallNut = m2.rule.initialMinions?.find((m) => m.cardId === 'plant_wall_nut')
    expect(wallNut).toBeDefined()
    expect(wallNut?.side).toBe('plants')
    expect(wallNut?.laneIndex).toBe(0)

    const swabbie = m2.rule.initialMinions?.find((m) => m.cardId === 'zombie_swabbie')
    expect(swabbie).toBeDefined()
    expect(swabbie?.side).toBe('zombies')
    expect(swabbie?.laneIndex).toBe(4)
  })

  it('Mission 3 matches The Smash boss with Bog of Sunken Hope in Lane 4', () => {
    const m3 = CHAPTER_1_MISSIONS[2]
    expect(m3.bossHeroId).toBe('hero_the_smash')
    expect(m3.rule.initialEnvironments).toBeDefined()
    const bog = m3.rule.initialEnvironments?.find(
      (e) => e.environmentCardId === 'plant_bog_of_sunken_hope'
    )
    expect(bog).toBeDefined()
    expect(bog?.laneIndex).toBe(3)
  })

  it('Mission 4 matches Rustbolt with Cone Zone in Lane 2 and +1 Sun', () => {
    const m4 = CHAPTER_1_MISSIONS[3]
    expect(m4.bossHeroId).toBe('hero_rustbolt')
    expect(m4.difficulty).toBe('hard')
    expect(m4.rule.startingSunBonus).toBe(1)
    const coneZone = m4.rule.initialEnvironments?.find(
      (e) => e.environmentCardId === 'zombie_cone_zone'
    )
    expect(coneZone).toBeDefined()
    expect(coneZone?.laneIndex).toBe(1)
  })

  it('Mission 5 matches Professor Brainstorm Boss Finale with Spikeweed and +2 energy', () => {
    const m5 = CHAPTER_1_MISSIONS[4]
    expect(m5.bossHeroId).toBe('hero_professor_brainstorm')
    expect(m5.difficulty).toBe('boss')
    expect(m5.rule.startingSunBonus).toBe(2)
    expect(m5.rule.startingBrainsBonus).toBe(2)
    const spikeweed = m5.rule.initialEnvironments?.find(
      (e) => e.environmentCardId === 'plant_spikeweed_sector'
    )
    expect(spikeweed).toBeDefined()
    expect(spikeweed?.laneIndex).toBe(0)
    expect(m5.rewards.gems).toBe(500)
  })

  it('buildMissionLanes correctly populates environments and minions onto lanes', () => {
    const m2 = CHAPTER_1_MISSIONS[1]
    const lanesM2 = buildMissionLanes(m2)
    expect(lanesM2).toHaveLength(5)
    expect(lanesM2[0].plantMinion?.cardId).toBe('plant_wall_nut')
    expect(lanesM2[0].plantMinion?.currentHealth).toBe(6)
    expect(lanesM2[4].zombieMinion?.cardId).toBe('zombie_swabbie')
    expect(lanesM2[4].zombieMinion?.amphibious).toBe(true)

    const m3 = CHAPTER_1_MISSIONS[2]
    const lanesM3 = buildMissionLanes(m3)
    expect(lanesM3[3].environment?.id).toBe('plant_bog_of_sunken_hope')
  })

  it('calculateMissionStars accurately scores 0 to 3 stars based on outcome', () => {
    const m1 = CHAPTER_1_MISSIONS[0]

    // Defeat returns 0 stars
    expect(calculateMissionStars(m1, 'zombies', 0, 5)).toBe(0)
    expect(calculateMissionStars(m1, null, 10, 5)).toBe(0)

    // Clear with low HP and slow turns gives 1 star
    expect(calculateMissionStars(m1, 'plants', 8, 12)).toBe(1)

    // Clear with >= 12 HP gives 2 stars
    expect(calculateMissionStars(m1, 'plants', 15, 12)).toBe(2)

    // Clear with <= 8 turns gives 2 stars
    expect(calculateMissionStars(m1, 'plants', 8, 6)).toBe(2)

    // Clear with >= 12 HP and <= 8 turns gives all 3 stars!
    expect(calculateMissionStars(m1, 'plants', 18, 5)).toBe(3)
  })

  it('persists and loads campaign progress via localStorage', () => {
    const initial = loadCampaignProgress()
    expect(initial.unlockedMissionNumber).toBe(1)
    expect(initial.completedMissions).toEqual({})

    // Save progress after completing mission 1 with 3 stars
    saveCampaignProgress({
      unlockedMissionNumber: 2,
      completedMissions: {
        mission_1: { stars: 3, completedAt: new Date().toISOString() },
      },
    })

    const loaded = loadCampaignProgress()
    expect(loaded.unlockedMissionNumber).toBe(2)
    expect(loaded.completedMissions.mission_1.stars).toBe(3)
  })
})

describe('Engine Integration - START_MATCH with Campaign Modifiers', () => {
  it('correctly grants starting Sun and Brains bonuses', () => {
    const state = createInitialGameState(
      'hero_green_shadow',
      'hero_super_brainz',
      undefined,
      undefined,
      undefined,
      2, // startingSunBonus
      1  // startingBrainsBonus
    )

    // Turn 1 base energy is 1. With bonuses:
    expect(state.plantHero.sun).toBe(3)
    expect(state.plantHero.maxSun).toBe(3)
    expect(state.zombieHero.brains).toBe(2)
    expect(state.zombieHero.maxBrains).toBe(2)
  })

  it('reducer handles START_MATCH with pre-placed mission lanes', () => {
    const m5 = CHAPTER_1_MISSIONS[4]
    const customLanes = buildMissionLanes(m5)
    const baseState = createInitialGameState('hero_green_shadow', m5.bossHeroId)

    const nextState = gameReducer(baseState, {
      type: 'START_MATCH',
      plantHeroId: 'hero_green_shadow',
      zombieHeroId: m5.bossHeroId,
      initialLanes: customLanes,
      startingSunBonus: m5.rule.startingSunBonus,
      startingBrainsBonus: m5.rule.startingBrainsBonus,
    })

    expect(nextState.lanes[0].environment?.id).toBe('plant_spikeweed_sector')
    expect(nextState.plantHero.sun).toBe(3) // 1 base + 2 bonus
    expect(nextState.zombieHero.brains).toBe(3) // 1 base + 2 bonus
  })
})

describe('Deck Builder - Catalog & Standard Constraints', () => {
  it('has sufficient plant and zombie card catalog entries', () => {
    expect(PLANT_CARDS.length).toBeGreaterThanOrEqual(20)
    expect(ZOMBIE_CARDS.length).toBeGreaterThanOrEqual(20)
    expect(ALL_CARDS.length).toBeGreaterThanOrEqual(44)
  })

  it('cards contain standard attributes for filtering (cost, rarity, team)', () => {
    for (const card of ALL_CARDS) {
      expect(typeof card.cost).toBe('number')
      expect(card.cost).toBeGreaterThanOrEqual(0)
      expect(['plants', 'zombies']).toContain(card.team)
      expect(card.rarity).toBeDefined()
    }
  })

  it('evaluates standard 40-card deck and 4-copy constraints', () => {
    const sampleDeckCardIds: Record<string, number> = {
      plant_peashooter: 4,
      plant_repeater: 4,
      plant_snow_pea: 4,
      plant_torchwood: 4,
      plant_bonk_choy: 4,
      plant_black_eyed_pea: 4,
      plant_wall_nut: 4,
      plant_gatling_pea: 4,
      plant_threepeater: 4,
      plant_podfather: 4,
    }

    const totalCards = Object.values(sampleDeckCardIds).reduce((sum, count) => sum + count, 0)
    expect(totalCards).toBe(40)

    for (const count of Object.values(sampleDeckCardIds)) {
      expect(count).toBeLessThanOrEqual(4)
    }
  })

  it('computes mana curve distribution accurately across cost buckets', () => {
    const sampleDeckCosts = [1, 1, 1, 1, 2, 2, 2, 3, 3, 4, 5, 5, 6, 8]
    const curve: Record<number, number> = {}
    for (let c = 0; c <= 8; c++) curve[c] = 0

    for (const cost of sampleDeckCosts) {
      const bucket = Math.min(8, Math.max(0, cost))
      curve[bucket] = (curve[bucket] || 0) + 1
    }

    expect(curve[1]).toBe(4)
    expect(curve[2]).toBe(3)
    expect(curve[3]).toBe(2)
    expect(curve[4]).toBe(1)
    expect(curve[5]).toBe(2)
    expect(curve[6]).toBe(1)
    expect(curve[8]).toBe(1)
    expect(curve[0]).toBe(0)
  })
})

describe('Campaign Mode - Chapter 2: Zombie Metropolis Specifications', () => {
  it('contains exactly 5 progressive missions in Chapter 2 (Missions 6 to 10)', () => {
    expect(CHAPTER_2_MISSIONS).toHaveLength(5)
    expect(CHAPTER_2_MISSIONS.map((m) => m.missionNumber)).toEqual([6, 7, 8, 9, 10])
    expect(CHAPTER_2_MISSIONS.every((m) => m.chapter === 2)).toBe(true)
  })

  it('aggregates all 10 missions across CAMPAIGN_CHAPTERS and ALL_CAMPAIGN_MISSIONS', () => {
    expect(ALL_CAMPAIGN_MISSIONS).toHaveLength(10)
    expect(CAMPAIGN_CHAPTERS).toHaveLength(2)
    expect(CAMPAIGN_CHAPTERS[0].missions).toHaveLength(5)
    expect(CAMPAIGN_CHAPTERS[1].missions).toHaveLength(5)
  })

  it('Mission 6 matches Z-Mech boss with Laser Base Alpha and Spikeweed Sector', () => {
    const m6 = CHAPTER_2_MISSIONS[0]
    expect(m6.id).toBe('mission_6')
    expect(m6.bossHeroId).toBe('hero_z_mech')
    expect(m6.rule.initialEnvironments).toHaveLength(2)

    const laserBase = m6.rule.initialEnvironments?.find(
      (e) => e.environmentCardId === 'zombie_laser_base_alpha'
    )
    expect(laserBase).toBeDefined()
    expect(laserBase?.laneIndex).toBe(1)

    const spikeweed = m6.rule.initialEnvironments?.find(
      (e) => e.environmentCardId === 'plant_spikeweed_sector'
    )
    expect(spikeweed).toBeDefined()
    expect(spikeweed?.laneIndex).toBe(0)
  })

  it('Mission 7 matches Immorticia with Total Eclipse, Dr. Spacetime, and +1 Sun', () => {
    const m7 = CHAPTER_2_MISSIONS[1]
    expect(m7.bossHeroId).toBe('hero_immorticia')
    expect(m7.rule.startingSunBonus).toBe(1)

    const eclipse = m7.rule.initialEnvironments?.find(
      (e) => e.environmentCardId === 'zombie_total_eclipse'
    )
    expect(eclipse).toBeDefined()
    expect(eclipse?.laneIndex).toBe(2)

    const spacetime = m7.rule.initialMinions?.find(
      (m) => m.cardId === 'zombie_dr_spacetime'
    )
    expect(spacetime).toBeDefined()
    expect(spacetime?.laneIndex).toBe(2)
    expect(spacetime?.side).toBe('zombies')
  })

  it('Mission 8 matches Brain Freeze with Area 22 and Snow Pea', () => {
    const m8 = CHAPTER_2_MISSIONS[2]
    expect(m8.bossHeroId).toBe('hero_brain_freeze')
    expect(m8.difficulty).toBe('hard')

    const area22 = m8.rule.initialEnvironments?.find(
      (e) => e.environmentCardId === 'zombie_area_22'
    )
    expect(area22).toBeDefined()
    expect(area22?.laneIndex).toBe(3)

    const snowPea = m8.rule.initialMinions?.find(
      (m) => m.cardId === 'plant_snow_pea'
    )
    expect(snowPea).toBeDefined()
    expect(snowPea?.laneIndex).toBe(3)
    expect(snowPea?.side).toBe('plants')
  })

  it('Mission 9 matches Electric Boogaloo with Moon Base Z and +2 Sun', () => {
    const m9 = CHAPTER_2_MISSIONS[3]
    expect(m9.bossHeroId).toBe('hero_electric_boogaloo')
    expect(m9.rule.startingSunBonus).toBe(2)

    const moonBase = m9.rule.initialEnvironments?.find(
      (e) => e.environmentCardId === 'zombie_moon_base_z'
    )
    expect(moonBase).toBeDefined()
    expect(moonBase?.laneIndex).toBe(2)
  })

  it('Mission 10 matches Rustbolt Rematch Boss Finale with dual environments and +2 energy', () => {
    const m10 = CHAPTER_2_MISSIONS[4]
    expect(m10.bossHeroId).toBe('hero_rustbolt')
    expect(m10.difficulty).toBe('boss')
    expect(m10.rule.startingSunBonus).toBe(2)
    expect(m10.rule.startingBrainsBonus).toBe(2)
    expect(m10.rewards.gems).toBe(600)

    const medulla = m10.rule.initialEnvironments?.find(
      (e) => e.environmentCardId === 'zombie_medulla_nebula'
    )
    expect(medulla).toBeDefined()
    expect(medulla?.laneIndex).toBe(1)

    const grapes = m10.rule.initialEnvironments?.find(
      (e) => e.environmentCardId === 'plant_planet_of_the_grapes'
    )
    expect(grapes).toBeDefined()
    expect(grapes?.laneIndex).toBe(2)
  })

  it('buildMissionLanes places both environment and minion in Lane 3 for Mission 7', () => {
    const m7 = CHAPTER_2_MISSIONS[1]
    const lanes = buildMissionLanes(m7)

    expect(lanes[2].environment?.id).toBe('zombie_total_eclipse')
    expect(lanes[2].zombieMinion?.cardId).toBe('zombie_dr_spacetime')
    expect(lanes[2].zombieMinion?.side).toBe('zombies')
  })

  it('calculateMissionStars accurately scores Chapter 2 objectives', () => {
    const m6 = CHAPTER_2_MISSIONS[0]
    expect(calculateMissionStars(m6, 'zombies', 15, 6)).toBe(0) // Defeat
    expect(calculateMissionStars(m6, 'plants', 8, 12)).toBe(1) // Win, low hp, slow turns
    expect(calculateMissionStars(m6, 'plants', 14, 12)).toBe(2) // Win, hp >= 12
    expect(calculateMissionStars(m6, 'plants', 8, 7)).toBe(2) // Win, turns <= 9
    expect(calculateMissionStars(m6, 'plants', 16, 6)).toBe(3) // 3 stars
  })
})

describe('Deck Builder - Cost Range Filters & JSON Deck Code Export/Import', () => {
  it('correctly filters cards by Cost Range buckets: 1-2, 3-4, 5+', () => {
    const range12 = PLANT_CARDS.filter((c) => c.cost >= 1 && c.cost <= 2)
    const range34 = PLANT_CARDS.filter((c) => c.cost >= 3 && c.cost <= 4)
    const range5Plus = PLANT_CARDS.filter((c) => c.cost >= 5)

    expect(range12.length).toBeGreaterThan(0)
    expect(range34.length).toBeGreaterThan(0)
    expect(range5Plus.length).toBeGreaterThan(0)

    for (const card of range12) {
      expect(card.cost).toBeGreaterThanOrEqual(1)
      expect(card.cost).toBeLessThanOrEqual(2)
    }

    for (const card of range34) {
      expect(card.cost).toBeGreaterThanOrEqual(3)
      expect(card.cost).toBeLessThanOrEqual(4)
    }

    for (const card of range5Plus) {
      expect(card.cost).toBeGreaterThanOrEqual(5)
    }
  })

  it('exportDeckCode serializes deck into valid pvz_heroes_deck_v1 JSON', () => {
    const deckMap = {
      plant_peashooter: 4,
      plant_wall_nut: 4,
      plant_repeater: 4,
    }

    const jsonStr = exportDeckCode('Bộ Bài Thử Nghiệm', 'plants', deckMap)
    expect(typeof jsonStr).toBe('string')

    const parsed = JSON.parse(jsonStr)
    expect(parsed.format).toBe('pvz_heroes_deck_v1')
    expect(parsed.name).toBe('Bộ Bài Thử Nghiệm')
    expect(parsed.side).toBe('plants')
    expect(parsed.totalCards).toBe(12)
    expect(parsed.cardIds.plant_peashooter).toBe(4)
  })

  it('validateAndParseDeckCode parses valid deck code successfully', () => {
    const deckMap = {
      plant_peashooter: 4,
      plant_sunflower: 4,
    }
    const jsonStr = exportDeckCode('Pea & Sun', 'plants', deckMap)
    const result = validateAndParseDeckCode(jsonStr)

    expect(result.valid).toBe(true)
    expect(result.deck).toBeDefined()
    expect(result.deck?.name).toBe('Pea & Sun')
    expect(result.deck?.side).toBe('plants')
    expect(result.deck?.cardIds.plant_sunflower).toBe(4)
  })

  it('validateAndParseDeckCode rejects invalid JSON or incompatible format', () => {
    const invalidJson = validateAndParseDeckCode('not a json string')
    expect(invalidJson.valid).toBe(false)
    expect(invalidJson.error).toContain('Lỗi phân tích JSON')

    const wrongFormat = validateAndParseDeckCode(
      JSON.stringify({ format: 'other_format', side: 'plants', cardIds: {} })
    )
    expect(wrongFormat.valid).toBe(false)
    expect(wrongFormat.error).toContain('format: pvz_heroes_deck_v1')

    const wrongSide = validateAndParseDeckCode(
      JSON.stringify({ format: 'pvz_heroes_deck_v1', side: 'aliens', cardIds: {} })
    )
    expect(wrongSide.valid).toBe(false)
    expect(wrongSide.error).toContain('phải là plants hoặc zombies')
  })

  it('validateAndParseDeckCode enforces copy limit (max 4) and deck cap (max 40)', () => {
    const tooManyCopies = validateAndParseDeckCode(
      JSON.stringify({
        format: 'pvz_heroes_deck_v1',
        name: 'Cheating Deck',
        side: 'plants',
        cardIds: { plant_peashooter: 8 },
      })
    )
    expect(tooManyCopies.valid).toBe(false)
    expect(tooManyCopies.error).toContain('tối đa 4')

    const tooManyCards: Record<string, number> = {}
    for (let i = 1; i <= 15; i++) {
      tooManyCards[`card_${i}`] = 4 // 15 * 4 = 60 cards
    }

    const exceedsCap = validateAndParseDeckCode(
      JSON.stringify({
        format: 'pvz_heroes_deck_v1',
        name: 'Huge Deck',
        side: 'zombies',
        cardIds: tooManyCards,
      })
    )
    expect(exceedsCap.valid).toBe(false)
    expect(exceedsCap.error).toContain('vượt quá giới hạn tối đa 40 lá')
  })
})

describe('Zombie Campaign Mode - Chapter 1: Zombie Onslaught Specifications', () => {
  let store: Record<string, string> = {}

  beforeEach(() => {
    store = {}
    globalThis.localStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        store = {}
      },
      length: 0,
      key: () => null,
    } as any
  })

  it('contains exactly 5 progressive missions in Zombie Chapter 1', () => {
    expect(ZOMBIE_CHAPTER_1_MISSIONS).toHaveLength(5)
    expect(ZOMBIE_CHAPTER_1_MISSIONS.map((m) => m.missionNumber)).toEqual([1, 2, 3, 4, 5])
    expect(ZOMBIE_CHAPTER_1_MISSIONS.every((m) => m.faction === 'zombies')).toBe(true)
    expect(ALL_ZOMBIE_CAMPAIGN_MISSIONS.length).toBeGreaterThanOrEqual(5)
    expect(ZOMBIE_CAMPAIGN_CHAPTERS.length).toBeGreaterThanOrEqual(1)
  })

  it('Mission Z1 matches Green Shadow boss with starting Brains bonus', () => {
    const mz1 = ZOMBIE_CHAPTER_1_MISSIONS[0]
    expect(mz1.id).toBe('zombie_mission_1')
    expect(mz1.bossHeroId).toBe('hero_green_shadow')
    expect(mz1.bossHeroName).toBe('Green Shadow')
    expect(mz1.playerHeroId).toBe('hero_super_brainz')
    expect(mz1.difficulty).toBe('easy')
    expect(mz1.rule.startingBrainsBonus).toBe(1)
    expect(mz1.rewards.unlocksNext).toBe(true)
  })

  it('Mission Z2 matches Solar Flare boss with pre-placed Sunflower and Swabbie', () => {
    const mz2 = ZOMBIE_CHAPTER_1_MISSIONS[1]
    expect(mz2.bossHeroId).toBe('hero_solar_flare')
    expect(mz2.difficulty).toBe('normal')

    const sunflower = mz2.rule.initialMinions?.find(
      (m) => m.cardId === 'plant_sunflower'
    )
    expect(sunflower).toBeDefined()
    expect(sunflower?.laneIndex).toBe(0)
    expect(sunflower?.side).toBe('plants')

    const swabbie = mz2.rule.initialMinions?.find(
      (m) => m.cardId === 'zombie_swabbie'
    )
    expect(swabbie).toBeDefined()
    expect(swabbie?.laneIndex).toBe(4)
    expect(swabbie?.side).toBe('zombies')
  })

  it('Mission Z3 matches Wall-Knight boss with Cone Zone and pre-placed Wall-Nut', () => {
    const mz3 = ZOMBIE_CHAPTER_1_MISSIONS[2]
    expect(mz3.bossHeroId).toBe('hero_wall_knight')
    expect(mz3.difficulty).toBe('normal')

    const coneZone = mz3.rule.initialEnvironments?.find(
      (e) => e.environmentCardId === 'zombie_cone_zone'
    )
    expect(coneZone).toBeDefined()
    expect(coneZone?.laneIndex).toBe(1)

    const wallNut = mz3.rule.initialMinions?.find(
      (m) => m.cardId === 'plant_wall_nut'
    )
    expect(wallNut).toBeDefined()
    expect(wallNut?.laneIndex).toBe(0)
    expect(wallNut?.side).toBe('plants')
  })

  it('Mission Z4 matches Spudow with Spikeweed Sector, Laser Base Alpha and +1 Brains', () => {
    const mz4 = ZOMBIE_CHAPTER_1_MISSIONS[3]
    expect(mz4.bossHeroId).toBe('hero_spudow')
    expect(mz4.difficulty).toBe('hard')
    expect(mz4.rule.startingBrainsBonus).toBe(1)

    const spikeweed = mz4.rule.initialEnvironments?.find(
      (e) => e.environmentCardId === 'plant_spikeweed_sector'
    )
    expect(spikeweed).toBeDefined()
    expect(spikeweed?.laneIndex).toBe(0)

    const laserBase = mz4.rule.initialEnvironments?.find(
      (e) => e.environmentCardId === 'zombie_laser_base_alpha'
    )
    expect(laserBase).toBeDefined()
    expect(laserBase?.laneIndex).toBe(2)
  })

  it('Mission Z5 matches Chompzilla Boss Finale with dual environments and +2 energy', () => {
    const mz5 = ZOMBIE_CHAPTER_1_MISSIONS[4]
    expect(mz5.bossHeroId).toBe('hero_chompzilla')
    expect(mz5.difficulty).toBe('boss')
    expect(mz5.rule.startingSunBonus).toBe(2)
    expect(mz5.rule.startingBrainsBonus).toBe(2)
    expect(mz5.rewards.gems).toBe(500)
    expect(mz5.rule.initialEnvironments).toHaveLength(2)

    const bog = mz5.rule.initialEnvironments?.find(
      (e) => e.environmentCardId === 'plant_bog_of_sunken_hope'
    )
    expect(bog).toBeDefined()
    expect(bog?.laneIndex).toBe(3)

    const medulla = mz5.rule.initialEnvironments?.find(
      (e) => e.environmentCardId === 'zombie_medulla_nebula'
    )
    expect(medulla).toBeDefined()
    expect(medulla?.laneIndex).toBe(1)
  })

  it('buildMissionLanes accurately populates terrain and minions for Zombie Mission Z3', () => {
    const mz3 = ZOMBIE_CHAPTER_1_MISSIONS[2]
    const lanes = buildMissionLanes(mz3)

    expect(lanes[1].environment?.id).toBe('zombie_cone_zone')
    expect(lanes[0].plantMinion?.cardId).toBe('plant_wall_nut')
    expect(lanes[0].plantMinion?.side).toBe('plants')
  })

  it('calculateMissionStars scores Zombie campaign missions evaluating Zombie victory', () => {
    const mz1 = ZOMBIE_CHAPTER_1_MISSIONS[0]
    // Plant win means Zombie player lost -> 0 stars
    expect(calculateMissionStars(mz1, 'plants', 20, 5)).toBe(0)

    // Zombie win with low HP and slow turns -> 1 star
    expect(calculateMissionStars(mz1, 'zombies', 8, 12)).toBe(1)

    // Zombie win with HP >= 12 -> 2 stars
    expect(calculateMissionStars(mz1, 'zombies', 14, 10)).toBe(2)

    // Zombie win in <= 8 turns -> 2 stars
    expect(calculateMissionStars(mz1, 'zombies', 10, 7)).toBe(2)

    // Zombie win with HP >= 12 AND turns <= 8 -> 3 stars!
    expect(calculateMissionStars(mz1, 'zombies', 16, 6)).toBe(3)
  })

  it('loadZombieCampaignProgress and saveZombieCampaignProgress manage isolated zombie progress', () => {
    // Initial progress
    const init = loadZombieCampaignProgress()
    expect(init.unlockedMissionNumber).toBe(1)
    expect(Object.keys(init.completedMissions)).toHaveLength(0)

    // Save custom progress
    saveZombieCampaignProgress({
      unlockedMissionNumber: 2,
      completedMissions: {
        zombie_mission_1: { stars: 3, completedAt: '2026-10-24T00:00:00Z' },
      },
    })

    const updated = loadZombieCampaignProgress()
    expect(updated.unlockedMissionNumber).toBe(2)
    expect(updated.completedMissions['zombie_mission_1']?.stars).toBe(3)

    // Plant progress remains isolated and empty
    const plantProgress = loadCampaignProgress()
    expect(plantProgress.unlockedMissionNumber).toBe(1)
    expect(Object.keys(plantProgress.completedMissions)).toHaveLength(0)
  })
})

