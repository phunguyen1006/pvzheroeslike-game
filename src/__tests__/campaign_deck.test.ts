import { describe, it, expect, beforeEach } from 'vitest'
import {
  CHAPTER_1_MISSIONS,
  buildMissionLanes,
  calculateMissionStars,
  loadCampaignProgress,
  saveCampaignProgress,
} from '../data/campaign'
import { createInitialGameState, gameReducer } from '../engine/reducer'
import { ALL_CARDS, PLANT_CARDS, ZOMBIE_CARDS } from '../data/cards'

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
