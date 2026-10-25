import { describe, it, expect } from 'vitest'
import {
  CHAPTER_4_MISSIONS,
  CAMPAIGN_CHAPTERS,
  ALL_CAMPAIGN_MISSIONS,
  calculateMissionStars,
  buildMissionLanes,
} from '../data/campaign'

describe('Round 11: Plant Campaign Chapter 4 - Solar Sanctum', () => {
  describe('1. Chapter 4 Mission Definitions & Structures', () => {
    it('should have exactly 5 missions in Chapter 4 numbered 16 to 20', () => {
      expect(CHAPTER_4_MISSIONS).toHaveLength(5)
      expect(CHAPTER_4_MISSIONS.map((m) => m.missionNumber)).toEqual([16, 17, 18, 19, 20])
      expect(CHAPTER_4_MISSIONS.map((m) => m.id)).toEqual([
        'mission_16',
        'mission_17',
        'mission_18',
        'mission_19',
        'mission_20',
      ])
      CHAPTER_4_MISSIONS.forEach((m) => {
        expect(m.chapter).toBe(4)
      })
    })

    it('should register Chapter 4 in CAMPAIGN_CHAPTERS with Solar Sanctum title', () => {
      const ch4 = CAMPAIGN_CHAPTERS.find((c) => c.id === 4)
      expect(ch4).toBeDefined()
      expect(ch4!.title).toContain('THÁNH ĐỊA ÁNH DƯƠNG')
      expect(ch4!.title).toContain('SOLAR SANCTUM')
      expect(ch4!.badgeText).toBe('CHAPTER 4')
      expect(ch4!.missions).toHaveLength(5)
      expect(ch4!.missions).toEqual(CHAPTER_4_MISSIONS)
    })

    it('should include Chapter 4 in ALL_CAMPAIGN_MISSIONS', () => {
      expect(ALL_CAMPAIGN_MISSIONS.length).toBeGreaterThanOrEqual(20)
      const ch4MissionsInAll = ALL_CAMPAIGN_MISSIONS.filter((m) => m.chapter === 4)
      expect(ch4MissionsInAll).toHaveLength(5)
    })

    it('should configure comic dialogues for all Chapter 4 missions', () => {
      CHAPTER_4_MISSIONS.forEach((m) => {
        expect(m.comicDialogue).toBeDefined()
        expect(m.comicDialogue!.issueTitle).toBeTruthy()
        expect(m.comicDialogue!.issueTagline).toBeTruthy()
        expect(m.comicDialogue!.plantHeroQuote.length).toBeGreaterThan(10)
        expect(m.comicDialogue!.zombieHeroQuote.length).toBeGreaterThan(10)
      })
    })
  })

  describe('2. Detailed Mission Rules & Environmental Constraints', () => {
    it('Mission P4-1 (mission_16): Sunflower\'s Garden vs Zombie Bossbot', () => {
      const m16 = CHAPTER_4_MISSIONS.find((m) => m.id === 'mission_16')!
      expect(m16).toBeDefined()
      expect(m16.title).toContain("Sunflower's Garden")
      expect(m16.bossHeroName).toBe('Zombie Bossbot')
      expect(m16.subtitle).toContain('HP 30')
      expect(m16.difficulty).toBe('normal')
      expect(m16.rule.startingSunBonus).toBe(1)
      expect(m16.rewards.unlocksNext).toBe(true)

      // Initial minions check
      expect(m16.rule.initialMinions).toBeDefined()
      const initialPlant = m16.rule.initialMinions?.find((im) => im.side === 'plants')
      expect(initialPlant?.cardId).toBe('plant_sunflower')

      // Build mission lanes
      const lanes = buildMissionLanes(m16)
      expect(lanes[2].plantMinion?.cardId).toBe('plant_sunflower')
      expect(lanes[2].plantMinion?.name).toBe('Sunflower')
    })

    it('Mission P4-2 (mission_17): Twin Sun Ambush vs Impfinity (HP 25)', () => {
      const m17 = CHAPTER_4_MISSIONS.find((m) => m.id === 'mission_17')!
      expect(m17).toBeDefined()
      expect(m17.title).toContain('Twin Sun Ambush')
      expect(m17.bossHeroName).toBe('Impfinity')
      expect(m17.subtitle).toContain('HP 25')
      expect(m17.rule.startingSunBonus).toBe(1)
      expect(m17.rewards.unlocksNext).toBe(true)

      // Zombies start with 2 imps on the field
      expect(m17.rule.initialMinions).toHaveLength(2)
      expect(m17.rule.initialMinions?.every((im) => im.side === 'zombies')).toBe(true)

      const lanes = buildMissionLanes(m17)
      expect(lanes[1].zombieMinion?.cardId).toBe('zombie_swabbie')
      expect(lanes[3].zombieMinion?.cardId).toBe('zombie_swabbie')
    })

    it('Mission P4-3 (mission_18): Spikeweed Showdown vs Super Brainz (HP 28)', () => {
      const m18 = CHAPTER_4_MISSIONS.find((m) => m.id === 'mission_18')!
      expect(m18).toBeDefined()
      expect(m18.title).toContain('Spikeweed Showdown')
      expect(m18.bossHeroName).toBe('Super Brainz')
      expect(m18.subtitle).toContain('HP 28')
      expect(m18.difficulty).toBe('hard')
      expect(m18.rewards.unlocksNext).toBe(true)

      // 2 Spikeweed Sector environments
      expect(m18.rule.initialEnvironments).toHaveLength(2)
      expect(
        m18.rule.initialEnvironments?.every(
          (ie) => ie.environmentCardId === 'plant_spikeweed_sector'
        )
      ).toBe(true)

      const lanes = buildMissionLanes(m18)
      expect(lanes[1].environment?.id).toBe('plant_spikeweed_sector')
      expect(lanes[2].environment?.id).toBe('plant_spikeweed_sector')
    })

    it('Mission P4-4 (mission_19): Floral Defense vs Electric Boogaloo (HP 30)', () => {
      const m19 = CHAPTER_4_MISSIONS.find((m) => m.id === 'mission_19')!
      expect(m19).toBeDefined()
      expect(m19.title).toContain('Floral Defense')
      expect(m19.bossHeroName).toBe('Electric Boogaloo')
      expect(m19.subtitle).toContain('HP 30')
      expect(m19.difficulty).toBe('hard')
      expect(m19.rewards.unlocksNext).toBe(true)

      // Zombies have Strikethrough minion
      expect(m19.rule.initialMinions).toBeDefined()
      const zombieMinion = m19.rule.initialMinions?.find((im) => im.side === 'zombies')
      expect(zombieMinion?.cardId).toBe('zombie_space_cowboy')

      const lanes = buildMissionLanes(m19)
      expect(lanes[2].zombieMinion?.strikethrough).toBe(true)
    })

    it('Mission P4-5 BOSS (mission_20): Solar Flare\'s Revenge (HP 35)', () => {
      const m20 = CHAPTER_4_MISSIONS.find((m) => m.id === 'mission_20')!
      expect(m20).toBeDefined()
      expect(m20.title).toContain("Solar Flare's Revenge")
      expect(m20.bossHeroId).toBe('hero_solar_flare')
      expect(m20.subtitle).toContain('HP 35')
      expect(m20.difficulty).toBe('boss')
      expect(m20.rewards.gems).toBe(1500)
      expect(m20.rewards.unlocksNext).toBe(false)
      expect(m20.rule.description).toContain('No Tricks')

      // Environment on lane 3: Pair Pearadise
      expect(m20.rule.initialEnvironments).toHaveLength(1)
      expect(m20.rule.initialEnvironments![0].environmentCardId).toBe('plant_pair_pearadise')

      const lanes = buildMissionLanes(m20)
      expect(lanes[2].environment?.id).toBe('plant_pair_pearadise')
    })
  })

  describe('3. Star Objectives Calculation (calculateMissionStars)', () => {
    it('returns 0 stars on defeat or invalid winner', () => {
      const m16 = CHAPTER_4_MISSIONS[0]
      expect(calculateMissionStars(m16, 'zombies', 0, 5)).toBe(0)
      expect(calculateMissionStars(m16, null, 15, 4)).toBe(0)
    })

    it('Mission 16: scores 1, 2, or 3 stars based on turns and surviving plants/health', () => {
      const m16 = CHAPTER_4_MISSIONS[0]
      // 1 star: win but slow and low health
      expect(calculateMissionStars(m16, 'plants', 8, 10)).toBe(1)
      // 2 stars: win <= 6 turns but lower health
      expect(calculateMissionStars(m16, 'plants', 8, 5)).toBe(2)
      // 2 stars: win with high health (survived intact) but slow turns
      expect(calculateMissionStars(m16, 'plants', 16, 9)).toBe(2)
      // 3 stars: win <= 6 turns and health >= 15
      expect(calculateMissionStars(m16, 'plants', 16, 5)).toBe(3)
    })

    it('Mission 17: scores 1, 2, or 3 stars based on speed (≤ 5 turns) and damage dominance', () => {
      const m17 = CHAPTER_4_MISSIONS[1]
      // 1 star: slow win
      expect(calculateMissionStars(m17, 'plants', 8, 8)).toBe(1)
      // 2 stars: fast win (turn <= 5)
      expect(calculateMissionStars(m17, 'plants', 8, 4)).toBe(2)
      // 2 stars: dominant hp
      expect(calculateMissionStars(m17, 'plants', 15, 8)).toBe(2)
      // 3 stars: fast and dominant
      expect(calculateMissionStars(m17, 'plants', 15, 4)).toBe(3)
    })

    it('Mission 18: scores 3 stars on clutch survival (≤ 8 HP) with turn target', () => {
      const m18 = CHAPTER_4_MISSIONS[2]
      // 1 star: high hp, slow
      expect(calculateMissionStars(m18, 'plants', 16, 10)).toBe(1)
      // 2 stars: clutch hp (<= 8) but slow turns
      expect(calculateMissionStars(m18, 'plants', 6, 10)).toBe(2)
      // 2 stars: fast turns but high hp
      expect(calculateMissionStars(m18, 'plants', 16, 6)).toBe(2)
      // 3 stars: clutch hp (<= 8) and turn <= 8
      expect(calculateMissionStars(m18, 'plants', 7, 7)).toBe(3)
    })

    it('Mission 19: scores 1, 2, or 3 stars on defense / block and speed (≤ 7 turns)', () => {
      const m19 = CHAPTER_4_MISSIONS[3]
      expect(calculateMissionStars(m19, 'plants', 8, 10)).toBe(1)
      expect(calculateMissionStars(m19, 'plants', 8, 6)).toBe(2)
      expect(calculateMissionStars(m19, 'plants', 16, 10)).toBe(2)
      expect(calculateMissionStars(m19, 'plants', 16, 6)).toBe(3)
    })

    it('Mission 20: scores difficulty tiers for climax boss', () => {
      const m20 = CHAPTER_4_MISSIONS[4]
      // Defeat = 0
      expect(calculateMissionStars(m20, 'zombies', 0, 5)).toBe(0)
      // Base win = at least 1 star
      expect(calculateMissionStars(m20, 'plants', 8, 15)).toBe(1)
      // Tier 2 clear
      expect(calculateMissionStars(m20, 'plants', 13, 11)).toBe(2)
      // Tier 3 clear = 3 stars
      expect(calculateMissionStars(m20, 'plants', 16, 7)).toBe(3)
    })
  })

  describe('4. Unlocking Chain Between Chapter 3 and Chapter 4', () => {
    it('Mission 15 unlocks Mission 16 upon completion', () => {
      const m15 = ALL_CAMPAIGN_MISSIONS.find((m) => m.id === 'mission_15')!
      expect(m15).toBeDefined()
      expect(m15.rewards.unlocksNext).toBe(true)
    })
  })
})
