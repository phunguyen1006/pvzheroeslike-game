import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  CHAPTER_3_MISSIONS,
  PLANT_CHAPTER_3_MISSIONS,
  P11,
  P12,
  P13,
  P14,
  P15,
  CAMPAIGN_STAR_MILESTONES,
  CAMPAIGN_CLAIMED_MILESTONES_KEY,
  getCampaignStarMilestone,
  hasClaimedMilestone,
  claimMilestoneReward,
  calculateMissionStars,
  getMissionById,
  MISSION_MODIFIERS,
  getMissionModifier,
  applyModifierToMinion,
  applyMissionModifiersToMinion,
  applyMissionModifiersToLanes,
  applyMissionModifiers,
  buildMissionLanes,
} from '../data/campaign'
import { createInitialGameState, createInitialLanes } from '../engine/reducer'
import type { Minion, LaneState, GameState } from '../engine/types'

describe('Campaign Chapter 3 Expansion & Modifiers System', () => {
  beforeEach(() => {
    // Reset localStorage mock
    const store: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, val: string) => {
        store[key] = val
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }),
      clear: vi.fn(() => {
        for (const k in store) delete store[k]
      }),
    })
  })

  // =========================================================================
  // 1. PLANT CAMPAIGN CHAPTER 3 MISSIONS (P11 - P15)
  // =========================================================================
  describe('1. Plant Campaign Chapter 3 Missions (P11 - P15)', () => {
    it('should define exactly 5 missions in Chapter 3', () => {
      expect(CHAPTER_3_MISSIONS.length).toBe(5)
      expect(PLANT_CHAPTER_3_MISSIONS.length).toBe(5)
      expect(CHAPTER_3_MISSIONS).toEqual(PLANT_CHAPTER_3_MISSIONS)
    })

    it('should export individual mission constants P11 through P15', () => {
      expect(P11.id).toBe('mission_11')
      expect(P11.code).toBe('P11')
      expect(P12.id).toBe('mission_12')
      expect(P12.code).toBe('P12')
      expect(P13.id).toBe('mission_13')
      expect(P13.code).toBe('P13')
      expect(P14.id).toBe('mission_14')
      expect(P14.code).toBe('P14')
      expect(P15.id).toBe('mission_15')
      expect(P15.code).toBe('P15')
    })

    it('should face the 5 authentic high-tier Zombie Bosses in sequence', () => {
      // P11: Professor Brainstorm
      expect(P11.bossHeroId).toBe('hero_professor_brainstorm')
      expect(P11.bossHeroName).toContain('Professor Brainstorm')
      expect(P11.bossHeroAvatar).toContain('Professor Brainstorm.png')

      // P12: Immorticia
      expect(P12.bossHeroId).toBe('hero_immorticia')
      expect(P12.bossHeroName).toContain('Immorticia')
      expect(P12.bossHeroAvatar).toContain('Immorticia.png')

      // P13: Rustbolt
      expect(P13.bossHeroId).toBe('hero_rustbolt')
      expect(P13.bossHeroName).toContain('Rustbolt')
      expect(P13.bossHeroAvatar).toContain('Rustbolt.png')

      // P14: Super Brainz
      expect(P14.bossHeroId).toBe('hero_super_brainz')
      expect(P14.bossHeroName).toContain('Super Brainz')
      expect(P14.bossHeroAvatar).toContain('Super Brainz.png')

      // P15: Z-Mech (Boss finale)
      expect(P15.bossHeroId).toBe('hero_z_mech')
      expect(P15.bossHeroName).toContain('Z-Mech')
      expect(P15.bossHeroAvatar).toContain('Z-Mech.png')
      expect(P15.difficulty).toBe('boss')
    })

    it('should have authentic starting environments for each mission', () => {
      // P11: Medulla Nebula
      expect(P11.rule.initialEnvironments).toBeDefined()
      expect(P11.rule.initialEnvironments?.some((e) => e.environmentCardId === 'zombie_medulla_nebula')).toBe(true)

      // P12: Area 22 and Spikeweed Sector
      expect(P12.rule.initialEnvironments?.some((e) => e.environmentCardId === 'zombie_area_22')).toBe(true)
      expect(P12.rule.initialEnvironments?.some((e) => e.environmentCardId === 'plant_spikeweed_sector')).toBe(true)

      // P13: Pair Pearadise and Cone Zone
      expect(P13.rule.initialEnvironments?.some((e) => e.environmentCardId === 'plant_pair_pearadise')).toBe(true)
      expect(P13.rule.initialEnvironments?.some((e) => e.environmentCardId === 'zombie_cone_zone')).toBe(true)

      // P14: Planet of the Grapes and Laser Base Alpha
      expect(P14.rule.initialEnvironments?.some((e) => e.environmentCardId === 'plant_planet_of_the_grapes')).toBe(true)
      expect(P14.rule.initialEnvironments?.some((e) => e.environmentCardId === 'zombie_laser_base_alpha')).toBe(true)

      // P15: Venus Flytrap Planet and Moon Base Z
      expect(P15.rule.initialEnvironments?.some((e) => e.environmentCardId === 'plant_venus_flytrap_planet')).toBe(true)
      expect(P15.rule.initialEnvironments?.some((e) => e.environmentCardId === 'zombie_moon_base_z')).toBe(true)
    })

    it('should have authentic starting sun/brains bonus and special rules', () => {
      CHAPTER_3_MISSIONS.forEach((m) => {
        expect(m.faction).toBe('plants')
        expect(m.chapter).toBe(3)
        expect(m.rule.name).toBeTruthy()
        expect(m.rule.description).toBeTruthy()
        expect(m.rule.specialRuleDescription).toBeTruthy()
        expect(m.rule.startingSunBonus).toBeGreaterThanOrEqual(1)
        expect(m.rule.startingBrainsBonus).toBeGreaterThanOrEqual(1)
      })
    })

    it('should have full comic story dialogues with quotes and taglines', () => {
      CHAPTER_3_MISSIONS.forEach((m) => {
        expect(m.comicDialogue).toBeDefined()
        expect(m.comicDialogue?.issueTitle).toBeTruthy()
        expect(m.comicDialogue?.issueTagline).toBeTruthy()
        expect(m.comicDialogue?.plantHeroQuote).toBeTruthy()
        expect(m.comicDialogue?.zombieHeroQuote).toBeTruthy()
        expect(m.storyIntro).toBeTruthy()
        expect(m.starObjectives.length).toBe(3)
      })
    })

    it('should find missions by ID and Code using getMissionById', () => {
      expect(getMissionById('P11')?.id).toBe('mission_11')
      expect(getMissionById('p11')?.id).toBe('mission_11')
      expect(getMissionById('mission_11')?.code).toBe('P11')
      expect(getMissionById('P12')?.bossHeroId).toBe('hero_immorticia')
      expect(getMissionById('P13')?.bossHeroId).toBe('hero_rustbolt')
      expect(getMissionById('P14')?.bossHeroId).toBe('hero_super_brainz')
      expect(getMissionById('P15')?.bossHeroId).toBe('hero_z_mech')
    })
  })

  // =========================================================================
  // 2. CHAPTER 3 STAR MILESTONES (75 & 90 STARS)
  // =========================================================================
  describe('2. Chapter 3 Star Milestones (75 & 90 Stars)', () => {
    it('should include 75 and 90 star milestones with cosmetic badges and gems', () => {
      const milestone75 = getCampaignStarMilestone(75)
      expect(milestone75).toBeDefined()
      expect(milestone75?.requiredStars).toBe(75)
      expect(milestone75?.gems).toBe(2000)
      expect(milestone75?.badge).toBe('Huyền Thoại Đa Vũ Trụ')
      expect(milestone75?.description).toContain('75 sao')

      const milestone90 = getCampaignStarMilestone(90)
      expect(milestone90).toBeDefined()
      expect(milestone90?.requiredStars).toBe(90)
      expect(milestone90?.gems).toBe(3000)
      expect(milestone90?.badge).toBe('Vô Địch Thiên Hà')
      expect(milestone90?.description).toContain('90 sao')
    })

    it('should verify all milestone tiers include [5, 15, 25, 35, 45, 60, 75, 90]', () => {
      const tiers = CAMPAIGN_STAR_MILESTONES.map((m) => m.requiredStars)
      expect(tiers).toEqual([5, 15, 25, 35, 45, 60, 75, 90])
    })

    it('should refuse claiming 75 and 90 star milestones when total stars are insufficient', () => {
      // 70 stars is insufficient for 75 milestone
      const attempt75 = claimMilestoneReward(75, 70)
      expect(attempt75).toBeNull()
      expect(hasClaimedMilestone(75)).toBe(false)

      // 85 stars is insufficient for 90 milestone
      const attempt90 = claimMilestoneReward(90, 85)
      expect(attempt90).toBeNull()
      expect(hasClaimedMilestone(90)).toBe(false)
    })

    it('should successfully claim 75 star milestone when stars meet requirement', () => {
      expect(hasClaimedMilestone(75)).toBe(false)

      const result = claimMilestoneReward(75, 75)
      expect(result).not.toBeNull()
      expect(result?.success).toBe(true)
      expect(result?.gemsAwarded).toBe(2000)
      expect(result?.badge).toBe('Huyền Thoại Đa Vũ Trụ')

      expect(hasClaimedMilestone(75)).toBe(true)

      // Duplicate claim must be rejected
      const duplicate = claimMilestoneReward(75, 80)
      expect(duplicate).toBeNull()
    })

    it('should successfully claim 90 star milestone and persist wallet gems', () => {
      expect(hasClaimedMilestone(90)).toBe(false)

      const result = claimMilestoneReward(90, 90)
      expect(result).not.toBeNull()
      expect(result?.success).toBe(true)
      expect(result?.gemsAwarded).toBe(3000)
      expect(result?.badge).toBe('Vô Địch Thiên Hà')

      expect(hasClaimedMilestone(90)).toBe(true)

      // Wallet gems should have been updated in localStorage
      expect(localStorage.getItem('pvz_player_gems')).toBe('3000')

      // Second claim attempt should fail
      expect(claimMilestoneReward(90, 90)).toBeNull()
    })
  })

  // =========================================================================
  // 3. MISSION MODIFIERS SYSTEM (sun_surge, zombie_frenzy, glass_cannon)
  // =========================================================================
  describe('3. Mission Modifiers System', () => {
    it('should register definitions for sun_surge, zombie_frenzy, and glass_cannon', () => {
      const sunSurge = getMissionModifier('sun_surge')
      expect(sunSurge).toBeDefined()
      expect(sunSurge?.id).toBe('sun_surge')
      expect(sunSurge?.icon).toBe('☀️')
      expect(sunSurge?.description).toContain('+2 Sun')

      const zombieFrenzy = getMissionModifier('zombie_frenzy')
      expect(zombieFrenzy).toBeDefined()
      expect(zombieFrenzy?.id).toBe('zombie_frenzy')
      expect(zombieFrenzy?.icon).toBe('⚡')
      expect(zombieFrenzy?.description).toContain('Frenzy')

      const glassCannon = getMissionModifier('glass_cannon')
      expect(glassCannon).toBeDefined()
      expect(glassCannon?.id).toBe('glass_cannon')
      expect(glassCannon?.icon).toBe('💥')
      expect(glassCannon?.description).toContain('+3 Tấn công')
      expect(glassCannon?.description).toContain('-2 Máu')
    })

    it('should correctly assign modifiers to Chapter 3 missions', () => {
      expect(P11.rule.modifiers).toEqual(['sun_surge'])
      expect(P12.rule.modifiers).toEqual(['zombie_frenzy'])
      expect(P13.rule.modifiers).toEqual(['glass_cannon'])
      expect(P14.rule.modifiers).toEqual(['sun_surge', 'zombie_frenzy'])
      expect(P15.rule.modifiers).toEqual(['sun_surge', 'zombie_frenzy', 'glass_cannon'])
    })

    it('should apply zombie_frenzy to zombie minions but not plant minions', () => {
      const zombieMinion: Minion = {
        instanceId: 'z1',
        cardId: 'zombie_conehead',
        name: 'Conehead',
        side: 'zombies',
        currentAttack: 2,
        baseAttack: 2,
        currentHealth: 4,
        maxHealth: 4,
        image: '/assets/zombie.png',
        traits: [],
      }

      const plantMinion: Minion = {
        instanceId: 'p1',
        cardId: 'plant_peashooter',
        name: 'Peashooter',
        side: 'plants',
        currentAttack: 1,
        baseAttack: 1,
        currentHealth: 1,
        maxHealth: 1,
        image: '/assets/plant.png',
        traits: [],
      }

      const modifiedZombie = applyModifierToMinion(zombieMinion, 'zombie_frenzy')
      expect(modifiedZombie.frenzy).toBe(true)
      expect(modifiedZombie.traits).toContain('frenzy')

      const modifiedPlant = applyModifierToMinion(plantMinion, 'zombie_frenzy')
      expect(modifiedPlant.frenzy).toBeUndefined()
      expect(modifiedPlant.traits).not.toContain('frenzy')
    })

    it('should apply glass_cannon (+3 Attack, -2 Health with min 1 HP safeguard)', () => {
      const highHpMinion: Minion = {
        instanceId: 'm1',
        cardId: 'plant_wall_nut',
        name: 'Wall-Nut',
        side: 'plants',
        currentAttack: 0,
        baseAttack: 0,
        currentHealth: 6,
        maxHealth: 6,
        image: '/assets/wallnut.png',
        traits: [],
      }

      const modifiedWallNut = applyModifierToMinion(highHpMinion, 'glass_cannon')
      expect(modifiedWallNut.currentAttack).toBe(3)
      expect(modifiedWallNut.baseAttack).toBe(3)
      expect(modifiedWallNut.currentHealth).toBe(4) // 6 - 2 = 4
      expect(modifiedWallNut.maxHealth).toBe(4)

      // Fragile minion with 1 HP must not die (minimum 1 HP)
      const fragileMinion: Minion = {
        instanceId: 'm2',
        cardId: 'plant_puff_shroom',
        name: 'Puff-Shroom',
        side: 'plants',
        currentAttack: 1,
        baseAttack: 1,
        currentHealth: 1,
        maxHealth: 1,
        image: '/assets/puff.png',
        traits: [],
      }

      const modifiedPuff = applyModifierToMinion(fragileMinion, 'glass_cannon')
      expect(modifiedPuff.currentAttack).toBe(4) // 1 + 3 = 4
      expect(modifiedPuff.currentHealth).toBe(1) // Math.max(1, 1 - 2) = 1
      expect(modifiedPuff.maxHealth).toBe(1)
    })

    it('should apply multiple modifiers across lanes via applyMissionModifiersToLanes', () => {
      const lanes = createInitialLanes()
      lanes[0].zombieMinion = {
        instanceId: 'z1',
        cardId: 'zombie_regular',
        name: 'Regular Zombie',
        side: 'zombies',
        currentAttack: 1,
        baseAttack: 1,
        currentHealth: 2,
        maxHealth: 2,
        image: '/assets/zombie.png',
        traits: [],
      }
      lanes[0].plantMinion = {
        instanceId: 'p1',
        cardId: 'plant_peashooter',
        name: 'Peashooter',
        side: 'plants',
        currentAttack: 1,
        baseAttack: 1,
        currentHealth: 1,
        maxHealth: 1,
        image: '/assets/pea.png',
        traits: [],
      }

      const modifiedLanes = applyMissionModifiersToLanes(lanes, ['zombie_frenzy', 'glass_cannon'])
      const z = modifiedLanes[0].zombieMinion!
      const p = modifiedLanes[0].plantMinion!

      expect(z.frenzy).toBe(true)
      expect(z.traits).toContain('frenzy')
      expect(z.currentAttack).toBe(4) // 1 + 3 = 4
      expect(z.currentHealth).toBe(1) // Math.max(1, 2 - 2) = 1

      expect(p.frenzy).toBeUndefined()
      expect(p.currentAttack).toBe(4) // 1 + 3 = 4
      expect(p.currentHealth).toBe(1) // Math.max(1, 1 - 2) = 1
    })

    it('should build initial mission lanes with authentic modifiers applied', () => {
      // P13 has glass_cannon and initial environments
      const p13Lanes = buildMissionLanes(P13)
      expect(p13Lanes[0].environment?.id).toBe('plant_pair_pearadise')
      expect(p13Lanes[2].environment?.id).toBe('zombie_cone_zone')

      // P14 has Laser Base Alpha and Planet of the Grapes
      const p14Lanes = buildMissionLanes(P14)
      expect(p14Lanes[0].environment?.id).toBe('plant_planet_of_the_grapes')
      expect(p14Lanes[1].environment?.id).toBe('zombie_laser_base_alpha')
    })

    it('should integrate with engine createInitialGameState when sun_surge is active', () => {
      // Normal state: Plant starts with 1 Sun
      const normalState = createInitialGameState()
      expect(normalState.plantHero.sun).toBe(1)

      // State with sun_surge modifier: Plant starts with 1 + 2 = 3 Sun
      const surgeState = createInitialGameState(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        0,
        0,
        ['sun_surge']
      )
      expect(surgeState.plantHero.sun).toBe(3)
      expect(surgeState.plantHero.maxSun).toBe(3)
    })
  })

  // =========================================================================
  // 4. STAR CALCULATIONS FOR CHAPTER 3 (P11 - P15)
  // =========================================================================
  describe('4. Star Calculations for Chapter 3 (P11 - P15)', () => {
    it('should award 0 stars on defeat for any Chapter 3 mission', () => {
      CHAPTER_3_MISSIONS.forEach((m) => {
        expect(calculateMissionStars(m, 'zombies', 20, 5)).toBe(0)
        expect(calculateMissionStars(m, null, 20, 5)).toBe(0)
      })
    })

    it('should award 1 star on bare victory (low HP, high turns)', () => {
      CHAPTER_3_MISSIONS.forEach((m) => {
        expect(calculateMissionStars(m, 'plants', 2, 99)).toBe(1)
      })
    })

    it('should award 2 stars on partial objective clears for P11 - P15', () => {
      // P11: HP >= 12, turns <= 8
      expect(calculateMissionStars(P11, 'plants', 15, 12)).toBe(2) // HP passed, turns failed
      expect(calculateMissionStars(P11, 'plants', 5, 6)).toBe(2) // HP failed, turns passed

      // P12: HP >= 14, turns <= 8
      expect(calculateMissionStars(P12, 'plants', 16, 10)).toBe(2)
      expect(calculateMissionStars(P12, 'plants', 8, 5)).toBe(2)

      // P13: HP >= 12, turns <= 8
      expect(calculateMissionStars(P13, 'plants', 14, 11)).toBe(2)
      expect(calculateMissionStars(P13, 'plants', 6, 7)).toBe(2)

      // P14: HP >= 15, turns <= 7
      expect(calculateMissionStars(P14, 'plants', 18, 9)).toBe(2)
      expect(calculateMissionStars(P14, 'plants', 10, 6)).toBe(2)

      // P15: HP >= 15, turns <= 10
      expect(calculateMissionStars(P15, 'plants', 17, 14)).toBe(2)
      expect(calculateMissionStars(P15, 'plants', 9, 8)).toBe(2)
    })

    it('should award 3 stars on perfect victory for all Chapter 3 missions', () => {
      // P11: HP >= 12, turns <= 8
      expect(calculateMissionStars(P11, 'plants', 15, 6)).toBe(3)

      // P12: HP >= 14, turns <= 8
      expect(calculateMissionStars(P12, 'plants', 16, 7)).toBe(3)

      // P13: HP >= 12, turns <= 8
      expect(calculateMissionStars(P13, 'plants', 14, 7)).toBe(3)

      // P14: HP >= 15, turns <= 7
      expect(calculateMissionStars(P14, 'plants', 16, 5)).toBe(3)

      // P15: HP >= 15, turns <= 10
      expect(calculateMissionStars(P15, 'plants', 20, 6)).toBe(3)
    })

    it('should compute stars correctly when passing mission object with code alone', () => {
      expect(calculateMissionStars({ id: 'P11', code: 'P11', faction: 'plants' } as any, 'plants', 15, 6)).toBe(3)
      expect(calculateMissionStars({ id: 'P12', code: 'P12', faction: 'plants' } as any, 'plants', 16, 7)).toBe(3)
      expect(calculateMissionStars({ id: 'P13', code: 'P13', faction: 'plants' } as any, 'plants', 14, 7)).toBe(3)
      expect(calculateMissionStars({ id: 'P14', code: 'P14', faction: 'plants' } as any, 'plants', 16, 5)).toBe(3)
      expect(calculateMissionStars({ id: 'P15', code: 'P15', faction: 'plants' } as any, 'plants', 20, 6)).toBe(3)
    })
  })
})
