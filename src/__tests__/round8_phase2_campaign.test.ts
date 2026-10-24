import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  CAMPAIGN_STAR_MILESTONES,
  buildEngineDeckFromMap,
  getCampaignStarMilestone,
  getTotalCampaignStars,
  hasClaimedMilestone,
  claimMilestoneReward,
  CHAPTER_1_MISSIONS,
  CHAPTER_2_MISSIONS,
  ZOMBIE_CHAPTER_1_MISSIONS,
} from '../data/campaign'

class MockLocalStorage {
  private store: Record<string, string> = {}
  getItem(key: string): string | null {
    return this.store[key] ?? null
  }
  setItem(key: string, value: string): void {
    this.store[key] = String(value)
  }
  removeItem(key: string): void {
    delete this.store[key]
  }
  clear(): void {
    this.store = {}
  }
}

const mockStorage = new MockLocalStorage()

describe('Round 8 Phase 2: Campaign Custom Decks, Comic Dialogues & Milestone Rewards', () => {
  beforeEach(() => {
    mockStorage.clear()
    ;(globalThis as any).localStorage = mockStorage
    vi.restoreAllMocks()
  })

  describe('1. Custom Deck Builder Transformation (buildEngineDeckFromMap)', () => {
    it('should build engine deck from plant card map with unique IDs', () => {
      const plantDeckMap: Record<string, number> = {
        plant_astro_shroom: 4,
        plant_admiral_navy_bean: 2,
      }

      const engineDeck = buildEngineDeckFromMap(plantDeckMap, 'plants')
      expect(engineDeck.length).toBe(6)

      // Ensure each card has unique ID
      const ids = engineDeck.map((c) => c.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(6)

      // Check card properties
      const astroShrooms = engineDeck.filter((c) => c.name === 'Astro-Shroom')
      expect(astroShrooms.length).toBe(4)
      expect(astroShrooms[0].cost).toBe(1)
      expect(astroShrooms[0].attack).toBe(1)
      expect((astroShrooms[0] as any).health ?? (astroShrooms[0] as any).hp).toBe(1)
    })

    it('should build engine deck from zombie card map with unique IDs', () => {
      const zombieDeckMap: Record<string, number> = {
        zombie_arm_wrestler: 3,
        zombie_conga_zombie: 2,
      }

      const engineDeck = buildEngineDeckFromMap(zombieDeckMap, 'zombies')
      expect(engineDeck.length).toBe(5)

      const ids = engineDeck.map((c) => c.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(5)

      const armWrestlers = engineDeck.filter((c) => c.name === 'Arm Wrestler')
      expect(armWrestlers.length).toBe(3)
    })

    it('should gracefully skip invalid or missing card IDs in deck map', () => {
      const mixedDeckMap: Record<string, number> = {
        plant_astro_shroom: 2,
        non_existent_card_999: 4,
      }

      const engineDeck = buildEngineDeckFromMap(mixedDeckMap, 'plants')
      expect(engineDeck.length).toBe(2)
      expect(engineDeck[0].name).toBe('Astro-Shroom')
    })
  })

  describe('2. Comic Story Dialogues Integrity', () => {
    it('should have authentic comic dialogues for all Chapter 1 missions', () => {
      expect(CHAPTER_1_MISSIONS.length).toBe(5)

      CHAPTER_1_MISSIONS.forEach((mission) => {
        expect(mission.comicDialogue).toBeDefined()
        const dialogue = mission.comicDialogue!
        expect(dialogue.plantHeroQuote.trim().length).toBeGreaterThan(10)
        expect(dialogue.zombieHeroQuote.trim().length).toBeGreaterThan(10)
        expect(dialogue.issueTitle).toBeDefined()
        expect(dialogue.issueTitle!.trim().length).toBeGreaterThan(3)
        expect(dialogue.issueTagline).toBeDefined()
        expect(dialogue.issueTagline!.trim().length).toBeGreaterThan(5)
      })
    })

    it('should have authentic comic dialogues for all Chapter 2 missions', () => {
      expect(CHAPTER_2_MISSIONS.length).toBe(5)

      CHAPTER_2_MISSIONS.forEach((mission) => {
        expect(mission.comicDialogue).toBeDefined()
        const dialogue = mission.comicDialogue!
        expect(dialogue.plantHeroQuote.trim().length).toBeGreaterThan(10)
        expect(dialogue.zombieHeroQuote.trim().length).toBeGreaterThan(10)
        expect(dialogue.issueTitle).toBeDefined()
        expect(dialogue.issueTagline).toBeDefined()
      })
    })

    it('should have authentic comic dialogues for all Zombie Chapter 1 missions', () => {
      expect(ZOMBIE_CHAPTER_1_MISSIONS.length).toBe(5)

      ZOMBIE_CHAPTER_1_MISSIONS.forEach((mission) => {
        expect(mission.comicDialogue).toBeDefined()
        const dialogue = mission.comicDialogue!
        expect(dialogue.plantHeroQuote.trim().length).toBeGreaterThan(10)
        expect(dialogue.zombieHeroQuote.trim().length).toBeGreaterThan(10)
        expect(dialogue.issueTitle).toBeDefined()
        expect(dialogue.issueTagline).toBeDefined()
      })
    })
  })

  describe('3. Campaign Star Milestone Rewards System', () => {
    it('should define escalating milestone tiers with accurate badges & rewards', () => {
      expect(CAMPAIGN_STAR_MILESTONES.length).toBeGreaterThanOrEqual(5)
      expect(CAMPAIGN_STAR_MILESTONES[0].requiredStars).toBe(5)
      expect(CAMPAIGN_STAR_MILESTONES[0].gems).toBe(100)
      expect(CAMPAIGN_STAR_MILESTONES[0].badge).toBe('Chiến Binh Khởi Động')

      expect(CAMPAIGN_STAR_MILESTONES[4].requiredStars).toBe(45)
      expect(CAMPAIGN_STAR_MILESTONES[4].gems).toBe(1000)
      expect(CAMPAIGN_STAR_MILESTONES[4].badge).toBe('Huyền Thoại Vũ Trụ')
    })

    it('should retrieve milestone by required star count', () => {
      const milestone = getCampaignStarMilestone(25)
      expect(milestone).toBeDefined()
      expect(milestone?.badge).toBe('Đại Tướng Chiến Lũy')
      expect(milestone?.gems).toBe(400)

      expect(getCampaignStarMilestone(999)).toBeUndefined()
    })

    it('should correctly calculate total campaign stars across all chapters and factions', () => {
      const plantProgress = {
        unlockedMissionNumber: 4,
        completedMissions: {
          mission_1: { completed: true, stars: 3, bestTurnCount: 5, completedAt: '' },
          mission_2: { completed: true, stars: 2, bestTurnCount: 7, completedAt: '' },
          mission_3: { completed: true, stars: 3, bestTurnCount: 6, completedAt: '' },
        },
      }

      const zombieProgress = {
        unlockedMissionNumber: 3,
        completedMissions: {
          zombie_mission_1: { completed: true, stars: 3, bestTurnCount: 4, completedAt: '' },
          zombie_mission_2: { completed: true, stars: 1, bestTurnCount: 9, completedAt: '' },
        },
      }

      const totals = getTotalCampaignStars(plantProgress as any, zombieProgress as any)
      expect(totals.plantStars).toBe(8)
      expect(totals.zombieStars).toBe(4)
      expect(totals.totalStars).toBe(12)
    })

    it('should manage claimed milestone persistence in localStorage', () => {
      expect(hasClaimedMilestone(5)).toBe(false)

      // Attempt claim with insufficient stars (e.g. 3 stars)
      const failedClaim = claimMilestoneReward(5, 3)
      expect(failedClaim).toBeNull()
      expect(hasClaimedMilestone(5)).toBe(false)

      // Claim successfully with 10 stars
      const reward = claimMilestoneReward(5, 10)
      expect(reward).not.toBeNull()
      expect(reward?.success).toBe(true)
      expect(reward?.gemsAwarded ?? reward?.gems).toBe(100)
      expect(reward?.badge).toBe('Chiến Binh Khởi Động')

      // Check hasClaimedMilestone is true
      expect(hasClaimedMilestone(5)).toBe(true)

      // Double claim should fail
      const secondClaim = claimMilestoneReward(5, 10)
      expect(secondClaim).toBeNull()

      // Check wallet gems increased
      const storedGems = localStorage.getItem('pvz_player_gems')
      expect(Number(storedGems)).toBe(100)
    })

    it('should accumulate gems across multiple milestone claims', () => {
      localStorage.setItem('pvz_player_gems', '50')

      const claim1 = claimMilestoneReward(5, 20) // +100 gems
      expect(claim1).not.toBeNull()
      expect(claim1?.success).toBe(true)
      expect(Number(localStorage.getItem('pvz_player_gems'))).toBe(150)

      const claim2 = claimMilestoneReward(15, 20) // +250 gems
      expect(claim2).not.toBeNull()
      expect(claim2?.success).toBe(true)
      expect(Number(localStorage.getItem('pvz_player_gems'))).toBe(400)
    })
  })
})
