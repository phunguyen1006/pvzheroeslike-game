import { describe, it, expect } from 'vitest'
import {
  ZOMBIE_CHAPTER_4_MISSIONS,
  ZOMBIE_CAMPAIGN_CHAPTERS,
  ALL_ZOMBIE_CAMPAIGN_MISSIONS,
  calculateMissionStars,
  buildMissionLanes,
} from '../data/campaign'

describe('Round 12: Zombie Campaign Chapter 4 - Pirate Seas & Sneaky Sabotage', () => {
  describe('1. Chapter 4 Zombie Mission Definitions & Structures', () => {
    it('should have exactly 5 missions in Zombie Chapter 4 numbered 16 to 20', () => {
      expect(ZOMBIE_CHAPTER_4_MISSIONS).toHaveLength(5)
      expect(ZOMBIE_CHAPTER_4_MISSIONS.map((m) => m.missionNumber)).toEqual([16, 17, 18, 19, 20])
      expect(ZOMBIE_CHAPTER_4_MISSIONS.map((m) => m.id)).toEqual([
        'zombie_mission_16',
        'zombie_mission_17',
        'zombie_mission_18',
        'zombie_mission_19',
        'zombie_mission_20',
      ])
      ZOMBIE_CHAPTER_4_MISSIONS.forEach((m) => {
        expect(m.chapter).toBe(4)
        expect(m.faction).toBe('zombies')
      })
    })

    it('should register Chapter 4 in ZOMBIE_CAMPAIGN_CHAPTERS with Pirate Seas title', () => {
      const ch4 = ZOMBIE_CAMPAIGN_CHAPTERS.find((c) => c.id === 4)
      expect(ch4).toBeDefined()
      expect(ch4!.title).toContain('VỊNH CƯỚP BIỂN')
      expect(ch4!.title).toContain('PIRATE SEAS & SNEAKY SABOTAGE')
      expect(ch4!.badgeText).toBe('ZOMBIE CH. 4')
      expect(ch4!.missions).toHaveLength(5)
      expect(ch4!.missions).toEqual(ZOMBIE_CHAPTER_4_MISSIONS)
    })

    it('should include Chapter 4 in ALL_ZOMBIE_CAMPAIGN_MISSIONS with 20 total missions', () => {
      expect(ALL_ZOMBIE_CAMPAIGN_MISSIONS.length).toBe(20)
      const ch4MissionsInAll = ALL_ZOMBIE_CAMPAIGN_MISSIONS.filter((m) => m.chapter === 4)
      expect(ch4MissionsInAll).toHaveLength(5)
    })

    it('should configure authentic comic dialogues for all Chapter 4 Zombie missions', () => {
      ZOMBIE_CHAPTER_4_MISSIONS.forEach((m) => {
        expect(m.comicDialogue).toBeDefined()
        expect(m.comicDialogue!.issueTitle).toBeTruthy()
        expect(m.comicDialogue!.issueTagline).toBeTruthy()
        expect(m.comicDialogue!.plantHeroQuote.length).toBeGreaterThan(10)
        expect(m.comicDialogue!.zombieHeroQuote.length).toBeGreaterThan(10)
      })
    })
  })

  describe('2. Detailed Mission Rules & Environmental Constraints', () => {
    it('Mission Z4-1 (zombie_mission_16): Citron\'s Water Fortress at Pirate Seas', () => {
      const m16 = ZOMBIE_CHAPTER_4_MISSIONS.find((m) => m.id === 'zombie_mission_16')!
      expect(m16).toBeDefined()
      expect(m16.title).toContain("Citron's Water Fortress")
      expect(m16.bossHeroName).toBe('Citron')
      expect(m16.bossHeroId).toBe('hero_citron')
      expect(m16.subtitle).toContain('Thủy Quân Đột Kích')
      expect(m16.difficulty).toBe('normal')
      expect(m16.rule.startingBrainsBonus).toBe(1)
      expect(m16.rewards.unlocksNext).toBe(true)

      // Initial minions check: Swabbie in water lane (Lane 5 / index 4)
      expect(m16.rule.initialMinions).toBeDefined()
      const initialZombie = m16.rule.initialMinions?.find((im) => im.side === 'zombies')
      expect(initialZombie?.cardId).toBe('zombie_swabbie')
      expect(initialZombie?.laneIndex).toBe(4)

      // Initial environment: Bog of Sunken Hope in Lane 1 (index 0)
      expect(m16.rule.initialEnvironments).toHaveLength(1)
      expect(m16.rule.initialEnvironments![0].environmentCardId).toBe('plant_bog_of_sunken_hope')

      // Build mission lanes verification
      const lanes = buildMissionLanes(m16)
      expect(lanes[4].zombieMinion?.cardId).toBe('zombie_swabbie')
      expect(lanes[4].zombieMinion?.name).toBe('Swabbie')
      expect(lanes[0].environment?.id).toBe('plant_bog_of_sunken_hope')
    })

    it('Mission Z4-2 (zombie_mission_17): Rose\'s Frosty Curse & Laser Base Alpha', () => {
      const m17 = ZOMBIE_CHAPTER_4_MISSIONS.find((m) => m.id === 'zombie_mission_17')!
      expect(m17).toBeDefined()
      expect(m17.title).toContain("Rose's Frosty Curse")
      expect(m17.bossHeroName).toBe('Rose')
      expect(m17.bossHeroId).toBe('hero_rose')
      expect(m17.difficulty).toBe('normal')
      expect(m17.rule.startingBrainsBonus).toBe(1)
      expect(m17.rewards.unlocksNext).toBe(true)

      // Plant minion: Snow Pea in Lane 3 (index 2)
      expect(m17.rule.initialMinions).toHaveLength(1)
      const plantMinion = m17.rule.initialMinions![0]
      expect(plantMinion.side).toBe('plants')
      expect(plantMinion.cardId).toBe('plant_snow_pea')
      expect(plantMinion.laneIndex).toBe(2)

      // Environment: Laser Base Alpha in Lane 2 (index 1)
      expect(m17.rule.initialEnvironments).toHaveLength(1)
      expect(m17.rule.initialEnvironments![0].environmentCardId).toBe('zombie_laser_base_alpha')

      const lanes = buildMissionLanes(m17)
      expect(lanes[2].plantMinion?.cardId).toBe('plant_snow_pea')
      expect(lanes[1].environment?.id).toBe('zombie_laser_base_alpha')
    })

    it('Mission Z4-3 (zombie_mission_18): Nightcap\'s Mushroom Swarm & Area 22', () => {
      const m18 = ZOMBIE_CHAPTER_4_MISSIONS.find((m) => m.id === 'zombie_mission_18')!
      expect(m18).toBeDefined()
      expect(m18.title).toContain("Nightcap's Mushroom Swarm")
      expect(m18.bossHeroName).toBe('Nightcap')
      expect(m18.bossHeroId).toBe('hero_nightcap')
      expect(m18.difficulty).toBe('hard')
      expect(m18.rule.startingBrainsBonus).toBe(1)
      expect(m18.rule.startingSunBonus).toBe(1)
      expect(m18.rewards.unlocksNext).toBe(true)

      // Plant minion: Astro-Shroom in Lane 1 (index 0)
      expect(m18.rule.initialMinions).toHaveLength(1)
      expect(m18.rule.initialMinions![0].cardId).toBe('plant_astro_shroom')

      // Environment: Area 22 in Lane 2 (index 1)
      expect(m18.rule.initialEnvironments).toHaveLength(1)
      expect(m18.rule.initialEnvironments![0].environmentCardId).toBe('zombie_area_22')

      const lanes = buildMissionLanes(m18)
      expect(lanes[0].plantMinion?.cardId).toBe('plant_astro_shroom')
      expect(lanes[1].environment?.id).toBe('zombie_area_22')
    })

    it('Mission Z4-4 (zombie_mission_19): Grass Knuckles\' Dino Strike & Moon Base Z', () => {
      const m19 = ZOMBIE_CHAPTER_4_MISSIONS.find((m) => m.id === 'zombie_mission_19')!
      expect(m19).toBeDefined()
      expect(m19.title).toContain("Grass Knuckles' Dino Strike")
      expect(m19.bossHeroName).toBe('Grass Knuckles')
      expect(m19.bossHeroId).toBe('hero_grass_knuckles')
      expect(m19.difficulty).toBe('hard')
      expect(m19.rule.startingBrainsBonus).toBe(2)
      expect(m19.rule.startingSunBonus).toBe(1)
      expect(m19.rewards.unlocksNext).toBe(true)

      // Plant minion: Black-Eyed Pea in Lane 2 (index 1)
      expect(m19.rule.initialMinions).toHaveLength(1)
      expect(m19.rule.initialMinions![0].cardId).toBe('plant_black_eyed_pea')

      // Environment: Moon Base Z in Lane 3 (index 2)
      expect(m19.rule.initialEnvironments).toHaveLength(1)
      expect(m19.rule.initialEnvironments![0].environmentCardId).toBe('zombie_moon_base_z')

      const lanes = buildMissionLanes(m19)
      expect(lanes[1].plantMinion?.cardId).toBe('plant_black_eyed_pea')
      expect(lanes[2].environment?.id).toBe('zombie_moon_base_z')
    })

    it('Mission Z4-5 CLIMAX BOSS (zombie_mission_20): Solar Flare\'s Inferno (HP 38)', () => {
      const m20 = ZOMBIE_CHAPTER_4_MISSIONS.find((m) => m.id === 'zombie_mission_20')!
      expect(m20).toBeDefined()
      expect(m20.title).toContain("Solar Flare's Inferno")
      expect(m20.bossHeroId).toBe('hero_solar_flare')
      expect(m20.subtitle).toContain('HP 38')
      expect(m20.difficulty).toBe('boss')
      expect(m20.rewards.gems).toBe(1500)
      expect(m20.rewards.unlocksNext).toBe(false)
      expect(m20.rule.startingBrainsBonus).toBe(3)
      expect(m20.rule.startingSunBonus).toBe(2)

      // Environments: Hot Lava in Lane 1 (index 0) and Laser Base Alpha in Lane 3 (index 2)
      expect(m20.rule.initialEnvironments).toHaveLength(2)
      expect(m20.rule.initialEnvironments![0].environmentCardId).toBe('plant_hot_lava')
      expect(m20.rule.initialEnvironments![1].environmentCardId).toBe('zombie_laser_base_alpha')

      const lanes = buildMissionLanes(m20)
      expect(lanes[0].environment?.id).toBe('plant_hot_lava')
      expect(lanes[2].environment?.id).toBe('zombie_laser_base_alpha')
    })
  })

  describe('3. Star Objectives Calculation (calculateMissionStars)', () => {
    it('returns 0 stars on defeat or invalid winner', () => {
      const m16 = ZOMBIE_CHAPTER_4_MISSIONS[0]
      expect(calculateMissionStars(m16, 'plants', 20, 5)).toBe(0)
      expect(calculateMissionStars(m16, null, 15, 4)).toBe(0)
    })

    it('Mission Z16: scores 1, 2, or 3 stars based on turns (≤ 8) and surviving Zombie HP (≥ 14)', () => {
      const m16 = ZOMBIE_CHAPTER_4_MISSIONS[0]
      // 1 star: win but slow and low health
      expect(calculateMissionStars(m16, 'zombies', 8, 10)).toBe(1)
      // 2 stars: fast win (turn <= 8) but lower HP
      expect(calculateMissionStars(m16, 'zombies', 8, 7)).toBe(2)
      // 2 stars: high HP (>= 14) but slow turns
      expect(calculateMissionStars(m16, 'zombies', 16, 9)).toBe(2)
      // 3 stars: turn <= 8 and HP >= 14
      expect(calculateMissionStars(m16, 'zombies', 16, 6)).toBe(3)
    })

    it('Mission Z17: scores 1, 2, or 3 stars based on speed (≤ 7 turns) and HP (≥ 12)', () => {
      const m17 = ZOMBIE_CHAPTER_4_MISSIONS[1]
      // 1 star: slow win, low HP
      expect(calculateMissionStars(m17, 'zombies', 8, 8)).toBe(1)
      // 2 stars: fast win (turn <= 7)
      expect(calculateMissionStars(m17, 'zombies', 8, 5)).toBe(2)
      // 2 stars: high HP (>= 12)
      expect(calculateMissionStars(m17, 'zombies', 14, 8)).toBe(2)
      // 3 stars: fast and high HP
      expect(calculateMissionStars(m17, 'zombies', 14, 5)).toBe(3)
    })

    it('Mission Z18: scores 1, 2, or 3 stars based on speed (≤ 6 turns) and HP (≥ 12)', () => {
      const m18 = ZOMBIE_CHAPTER_4_MISSIONS[2]
      // 1 star: high turns, low HP
      expect(calculateMissionStars(m18, 'zombies', 8, 10)).toBe(1)
      // 2 stars: fast turns (turn <= 6)
      expect(calculateMissionStars(m18, 'zombies', 8, 5)).toBe(2)
      // 2 stars: high HP (>= 12)
      expect(calculateMissionStars(m18, 'zombies', 14, 8)).toBe(2)
      // 3 stars: fast turns and high HP
      expect(calculateMissionStars(m18, 'zombies', 14, 5)).toBe(3)
    })

    it('Mission Z19: scores 1, 2, or 3 stars based on defense HP (≥ 15) and speed (≤ 8 turns)', () => {
      const m19 = ZOMBIE_CHAPTER_4_MISSIONS[3]
      expect(calculateMissionStars(m19, 'zombies', 8, 10)).toBe(1)
      expect(calculateMissionStars(m19, 'zombies', 8, 6)).toBe(2)
      expect(calculateMissionStars(m19, 'zombies', 16, 10)).toBe(2)
      expect(calculateMissionStars(m19, 'zombies', 16, 6)).toBe(3)
    })

    it('Mission Z20: scores difficulty tiers for climax boss Solar Flare (HP 38)', () => {
      const m20 = ZOMBIE_CHAPTER_4_MISSIONS[4]
      // Defeat = 0
      expect(calculateMissionStars(m20, 'plants', 20, 5)).toBe(0)
      // Base win = 1 star
      expect(calculateMissionStars(m20, 'zombies', 8, 15)).toBe(1)
      // Tier 2 clear
      expect(calculateMissionStars(m20, 'zombies', 13, 11)).toBe(2)
      // Tier 3 clear = 3 stars
      expect(calculateMissionStars(m20, 'zombies', 16, 7)).toBe(3)
    })
  })

  describe('4. Unlocking Chain Between Zombie Chapter 3 and Chapter 4', () => {
    it('Mission Z15 unlocks Mission Z16 upon completion', () => {
      const zm15 = ALL_ZOMBIE_CAMPAIGN_MISSIONS.find((m) => m.id === 'zombie_mission_15')!
      expect(zm15).toBeDefined()
      expect(zm15.rewards.unlocksNext).toBe(true)
    })
  })
})
