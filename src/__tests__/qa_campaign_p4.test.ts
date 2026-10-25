import { describe, it, expect } from 'vitest'
import {
  CHAPTER_4_MISSIONS,
  ALL_CAMPAIGN_MISSIONS,
  calculateMissionStars,
  buildMissionLanes,
} from '../data/campaign'
import { getCardById } from '../data/cards'

describe('QA Chapter 4 Campaign Missions (Missions 16 - 20) Stress & Rule Tests', () => {
  const m16 = CHAPTER_4_MISSIONS.find(m => m.id === 'mission_16')!
  const m17 = CHAPTER_4_MISSIONS.find(m => m.id === 'mission_17')!
  const m18 = CHAPTER_4_MISSIONS.find(m => m.id === 'mission_18')!
  const m19 = CHAPTER_4_MISSIONS.find(m => m.id === 'mission_19')!
  const m20 = CHAPTER_4_MISSIONS.find(m => m.id === 'mission_20')!

  // =========================================================================
  // 1. MISSION 16: SUNFLOWER'S GARDEN
  // =========================================================================
  describe('Mission 16: Sunflower\'s Garden', () => {
    it('verifies mission 16 configuration: boss 30 HP, Solar deck setup, starting +1 Sun bonus', () => {
      expect(m16).toBeDefined()
      expect(m16.title).toContain("Sunflower's Garden")
      expect(m16.bossHeroId).toBe('hero_z_mech')
      expect(m16.rule.startingSunBonus).toBe(1)
      expect(m16.rule.description).toContain('Solar')
      expect(m16.rule.description).toContain('30 HP')
    })

    it('spawns initial Sunflower at center lane (lane index 2)', () => {
      const initialMinions = m16.rule.initialMinions
      expect(initialMinions).toBeDefined()
      expect(initialMinions?.length).toBe(1)
      expect(initialMinions![0].cardId).toBe('plant_sunflower')
      expect(initialMinions![0].side).toBe('plants')
      expect(initialMinions![0].laneIndex).toBe(2)

      // Test buildMissionLanes
      const lanes = buildMissionLanes(m16)
      expect(lanes[2].plantMinion).not.toBeNull()
      expect(lanes[2].plantMinion!.cardId).toBe('plant_sunflower')
      expect(lanes[2].plantMinion!.name).toBe('Sunflower')
    })

    it('evaluates calculateMissionStars correctly for Mission 16 (0, 1, 2, 3 stars)', () => {
      // Defeat -> 0 stars
      expect(calculateMissionStars(m16, 'zombies', 20, 5)).toBe(0)
      expect(calculateMissionStars(m16, null, 20, 5)).toBe(0)

      // Bare win: HP < 15 and turns > 6 -> 1 star
      expect(calculateMissionStars(m16, 'plants', 10, 8)).toBe(1)

      // Partial objective 1: HP >= 15 but turns > 6 -> 2 stars
      expect(calculateMissionStars(m16, 'plants', 16, 9)).toBe(2)

      // Partial objective 2: HP < 15 but turns <= 6 -> 2 stars
      expect(calculateMissionStars(m16, 'plants', 8, 5)).toBe(2)

      // Perfect win: HP >= 15 and turns <= 6 -> 3 stars
      expect(calculateMissionStars(m16, 'plants', 18, 5)).toBe(3)
    })
  })

  // =========================================================================
  // 2. MISSION 17: TWIN SUN AMBUSH
  // =========================================================================
  describe('Mission 17: Twin Sun Ambush', () => {
    it('verifies mission 17 configuration: Impfinity 25 HP, Kabloom theme, starting +1 Sun bonus', () => {
      expect(m17).toBeDefined()
      expect(m17.title).toContain('Twin Sun Ambush')
      expect(m17.bossHeroId).toBe('hero_impfinity')
      expect(m17.rule.startingSunBonus).toBe(1)
      expect(m17.rule.description).toContain('Kabloom')
      expect(m17.rule.description).toContain('25 HP')
    })

    it('spawns 2 initial Swabbie imps in lanes 1 and 3 (index 1 and 3)', () => {
      const initialMinions = m17.rule.initialMinions
      expect(initialMinions).toBeDefined()
      expect(initialMinions?.length).toBe(2)
      expect(initialMinions![0].cardId).toBe('zombie_swabbie')
      expect(initialMinions![0].laneIndex).toBe(1)
      expect(initialMinions![1].cardId).toBe('zombie_swabbie')
      expect(initialMinions![1].laneIndex).toBe(3)

      const lanes = buildMissionLanes(m17)
      expect(lanes[1].zombieMinion).not.toBeNull()
      expect(lanes[1].zombieMinion!.cardId).toBe('zombie_swabbie')
      expect(lanes[3].zombieMinion).not.toBeNull()
      expect(lanes[3].zombieMinion!.cardId).toBe('zombie_swabbie')
    })

    it('evaluates calculateMissionStars correctly for Mission 17 (0, 1, 2, 3 stars)', () => {
      // Defeat -> 0 stars
      expect(calculateMissionStars(m17, 'zombies', 20, 3)).toBe(0)

      // Bare win: HP < 12 and turns > 5 -> 1 star
      expect(calculateMissionStars(m17, 'plants', 9, 7)).toBe(1)

      // Partial objective 1: HP >= 12 but turns > 5 -> 2 stars
      expect(calculateMissionStars(m17, 'plants', 14, 8)).toBe(2)

      // Partial objective 2: HP < 12 but turns <= 5 -> 2 stars
      expect(calculateMissionStars(m17, 'plants', 7, 4)).toBe(2)

      // Perfect win: HP >= 12 and turns <= 5 -> 3 stars
      expect(calculateMissionStars(m17, 'plants', 15, 4)).toBe(3)
    })
  })

  // =========================================================================
  // 3. MISSION 18: SPIKEWEED SHOWDOWN
  // =========================================================================
  describe('Mission 18: Spikeweed Showdown', () => {
    it('verifies mission 18 configuration: Super Brainz 28 HP, Mega-Grow theme, hard difficulty', () => {
      expect(m18).toBeDefined()
      expect(m18.title).toContain('Spikeweed Showdown')
      expect(m18.bossHeroId).toBe('hero_super_brainz')
      expect(m18.difficulty).toBe('hard')
      expect(m18.rule.startingSunBonus).toBe(1)
      expect(m18.rule.startingBrainsBonus).toBe(1)
    })

    it('spawns 2 initial Spikeweed Sector environments in lanes 2 and 3 (index 1 and 2)', () => {
      const initialEnvs = m18.rule.initialEnvironments
      expect(initialEnvs).toBeDefined()
      expect(initialEnvs?.length).toBe(2)
      expect(initialEnvs![0].environmentCardId).toBe('plant_spikeweed_sector')
      expect(initialEnvs![0].laneIndex).toBe(1)
      expect(initialEnvs![1].environmentCardId).toBe('plant_spikeweed_sector')
      expect(initialEnvs![1].laneIndex).toBe(2)

      const lanes = buildMissionLanes(m18)
      expect(lanes[1].environment).not.toBeNull()
      expect(lanes[1].environment!.id).toBe('plant_spikeweed_sector')
      expect(lanes[2].environment).not.toBeNull()
      expect(lanes[2].environment!.id).toBe('plant_spikeweed_sector')
    })

    it('evaluates calculateMissionStars correctly for Mission 18 with HP <= 8 survival condition (0, 1, 2, 3 stars)', () => {
      // Defeat -> 0 stars
      expect(calculateMissionStars(m18, 'zombies', 20, 4)).toBe(0)

      // Bare win: HP > 8 and turns > 8 -> 1 star
      expect(calculateMissionStars(m18, 'plants', 15, 10)).toBe(1)

      // Partial objective 1: Clutch survival (HP <= 8 and > 0) but turns > 8 -> 2 stars
      expect(calculateMissionStars(m18, 'plants', 6, 11)).toBe(2)

      // Partial objective 2: Fast win (turns <= 8) but HP > 8 -> 2 stars
      expect(calculateMissionStars(m18, 'plants', 16, 7)).toBe(2)

      // Perfect win: Clutch HP (<= 8) AND fast win (turns <= 8) -> 3 stars
      expect(calculateMissionStars(m18, 'plants', 5, 6)).toBe(3)
    })
  })

  // =========================================================================
  // 4. MISSION 19: FLORAL DEFENSE
  // =========================================================================
  describe('Mission 19: Floral Defense', () => {
    it('verifies mission 19 configuration: Electric Boogaloo 30 HP, Strikethrough Space Cowboy', () => {
      expect(m19).toBeDefined()
      expect(m19.title).toContain('Floral Defense')
      expect(m19.bossHeroId).toBe('hero_electric_boogaloo')
      expect(m19.difficulty).toBe('hard')
      expect(m19.rule.description).toContain('Space Cowboy')
    })

    it('spawns initial Space Cowboy zombie in lane 3 (index 2)', () => {
      const initialMinions = m19.rule.initialMinions
      expect(initialMinions).toBeDefined()
      expect(initialMinions?.length).toBe(1)
      expect(initialMinions![0].cardId).toBe('zombie_space_cowboy')
      expect(initialMinions![0].laneIndex).toBe(2)

      const lanes = buildMissionLanes(m19)
      expect(lanes[2].zombieMinion).not.toBeNull()
      expect(lanes[2].zombieMinion!.cardId).toBe('zombie_space_cowboy')
      expect(lanes[2].zombieMinion!.name).toBe('Space Cowboy')
      expect(lanes[2].zombieMinion!.strikethrough).toBe(true)
    })

    it('evaluates calculateMissionStars correctly for Mission 19 (0, 1, 2, 3 stars)', () => {
      // Defeat -> 0 stars
      expect(calculateMissionStars(m19, 'zombies', 20, 5)).toBe(0)

      // Bare win: HP < 14 and turns > 7 -> 1 star
      expect(calculateMissionStars(m19, 'plants', 10, 9)).toBe(1)

      // Partial objective 1: HP >= 14 but turns > 7 -> 2 stars
      expect(calculateMissionStars(m19, 'plants', 17, 9)).toBe(2)

      // Partial objective 2: HP < 14 but turns <= 7 -> 2 stars
      expect(calculateMissionStars(m19, 'plants', 11, 6)).toBe(2)

      // Perfect win: HP >= 14 and turns <= 7 -> 3 stars
      expect(calculateMissionStars(m19, 'plants', 16, 6)).toBe(3)
    })
  })

  // =========================================================================
  // 5. MISSION 20 BOSS: SOLAR FLARE'S REVENGE
  // =========================================================================
  describe('Mission 20 Boss: Solar Flare\'s Revenge', () => {
    it('verifies mission 20 boss configuration: Solar Flare 35 HP, boss difficulty, No Tricks modifier', () => {
      expect(m20).toBeDefined()
      expect(m20.title).toContain("Solar Flare's Revenge")
      expect(m20.difficulty).toBe('boss')
      expect(m20.bossHeroId).toBe('hero_solar_flare')
      expect(m20.rule.description).toContain('No Tricks')
      expect(m20.rule.description).toContain('Pair Pearadise')
      expect(m20.rule.startingSunBonus).toBe(2)
      expect(m20.rule.startingBrainsBonus).toBe(2)
      expect(m20.rewards.gems).toBe(1500)
    })

    it('spawns Pair Pearadise environment in lane 3 (index 2)', () => {
      const initialEnvs = m20.rule.initialEnvironments
      expect(initialEnvs).toBeDefined()
      expect(initialEnvs?.length).toBe(1)
      expect(initialEnvs![0].environmentCardId).toBe('plant_pair_pearadise')
      expect(initialEnvs![0].laneIndex).toBe(2)

      const lanes = buildMissionLanes(m20)
      expect(lanes[2].environment).not.toBeNull()
      expect(lanes[2].environment!.id).toBe('plant_pair_pearadise')
    })

    it('evaluates calculateMissionStars correctly for Mission 20 Boss (0, 1, 2, 3 stars)', () => {
      // Defeat -> 0 stars
      expect(calculateMissionStars(m20, 'zombies', 20, 5)).toBe(0)

      // Bare win: HP < 12 and turns > 12 -> 1 star
      expect(calculateMissionStars(m20, 'plants', 8, 14)).toBe(1)

      // Tier 2 clear: HP >= 12 or turns <= 12 -> 2 stars
      expect(calculateMissionStars(m20, 'plants', 13, 13)).toBe(2)
      expect(calculateMissionStars(m20, 'plants', 8, 11)).toBe(2)

      // Tier 3 clear: HP >= 15 or turns <= 8 -> 3 stars
      expect(calculateMissionStars(m20, 'plants', 16, 10)).toBe(3)
      expect(calculateMissionStars(m20, 'plants', 10, 7)).toBe(3)
    })

    it('verifies ALL_CAMPAIGN_MISSIONS contains mission 16 through 20 reliably', () => {
      for (let i = 16; i <= 20; i++) {
        const m = ALL_CAMPAIGN_MISSIONS.find(mission => mission.id === `mission_${i}`)
        expect(m).toBeDefined()
        expect(m!.chapter).toBe(4)
      }
    })
  })
})
