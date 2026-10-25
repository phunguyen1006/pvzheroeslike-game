import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ZOMBIE_CHAPTER_2_MISSIONS,
  ZOMBIE_CAMPAIGN_CHAPTERS,
  ALL_ZOMBIE_CAMPAIGN_MISSIONS,
  CAMPAIGN_STAR_MILESTONES,
  getCampaignStarMilestone,
  hasClaimedMilestone,
  claimMilestoneReward,
  calculateMissionStars,
  buildMissionLanes,
} from '../data/campaign'
import {
  exportDeckCode,
  exportDeckCodeBase64,
  decodeDeckCode,
  validateAndParseDeckCode,
} from '../components/deck/DeckBuilder'

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

describe('Round 9: Zombie Campaign Chapter 2 & Advanced Deck Builder', () => {
  beforeEach(() => {
    mockStorage.clear()
    ;(globalThis as any).localStorage = mockStorage
    vi.restoreAllMocks()
  })

  describe('1. Zombie Campaign Chapter 2 Missions (Z6 - Z10)', () => {
    it('should have 5 missions in Zombie Chapter 2', () => {
      expect(ZOMBIE_CHAPTER_2_MISSIONS.length).toBe(5)
      expect(ZOMBIE_CHAPTER_2_MISSIONS.map((m) => m.missionNumber)).toEqual([6, 7, 8, 9, 10])
    })

    it('should correctly configure ALL_ZOMBIE_CAMPAIGN_MISSIONS and ZOMBIE_CAMPAIGN_CHAPTERS', () => {
      expect(ALL_ZOMBIE_CAMPAIGN_MISSIONS.length).toBeGreaterThanOrEqual(10)
      expect(ZOMBIE_CAMPAIGN_CHAPTERS.length).toBeGreaterThanOrEqual(2)

      const ch2 = ZOMBIE_CAMPAIGN_CHAPTERS[1]
      expect(ch2.id).toBe(2)
      expect(ch2.title).toContain('CHIẾN TUYẾN TƯƠNG LAI')
      expect(ch2.missions.length).toBe(5)
    })

    it('should define authentic comic story dialogues for all Z6-Z10 missions', () => {
      ZOMBIE_CHAPTER_2_MISSIONS.forEach((mission) => {
        expect(mission.comicDialogue).toBeDefined()
        const dialogue = mission.comicDialogue!
        expect(dialogue.plantHeroQuote.trim().length).toBeGreaterThan(10)
        expect(dialogue.zombieHeroQuote.trim().length).toBeGreaterThan(10)
        expect(dialogue.issueTitle).toBeDefined()
        expect(dialogue.issueTagline).toBeDefined()
      })
    })

    it('should verify Mission Z6 (Solar Flare - Bùng Cháy Năng Lượng)', () => {
      const z6 = ZOMBIE_CHAPTER_2_MISSIONS.find((m) => m.id === 'zombie_mission_6')!
      expect(z6).toBeDefined()
      expect(z6.title).toContain('Bùng Cháy Năng Lượng')
      expect(z6.bossHeroId).toBe('hero_solar_flare')
      expect(z6.rule.description).toContain('Pair Pearadise')
      expect(z6.rule.startingSunBonus).toBe(1)

      const lanes = buildMissionLanes(z6)
      expect(lanes.length).toBe(5)
      expect(lanes[2].environment).toBeDefined()
      expect(lanes[2].environment?.id).toBe('plant_pair_pearadise')
    })

    it('should verify Mission Z7 (Wall-Knight - Pháo Đài Kiên Cố)', () => {
      const z7 = ZOMBIE_CHAPTER_2_MISSIONS.find((m) => m.id === 'zombie_mission_7')!
      expect(z7).toBeDefined()
      expect(z7.title).toContain('Pháo Đài Kiên Cố')
      expect(z7.bossHeroId).toBe('hero_wall_knight')
      expect(z7.rule.description).toContain('Spikeweed Sector')

      const lanes = buildMissionLanes(z7)
      expect(lanes[1].environment).toBeDefined()
      expect(lanes[1].environment?.id).toBe('plant_spikeweed_sector')
      expect(lanes[0].plantMinion).toBeDefined()
      expect(lanes[0].plantMinion?.name).toBe('Wall-Nut')
    })

    it('should verify Mission Z8 (Spudow - Mìn Nổ Bát Ngát)', () => {
      const z8 = ZOMBIE_CHAPTER_2_MISSIONS.find((m) => m.id === 'zombie_mission_8')!
      expect(z8).toBeDefined()
      expect(z8.title).toContain('Mìn Nổ Bát Ngát')
      expect(z8.bossHeroId).toBe('hero_spudow')
      expect(z8.rule.startingBrainsBonus).toBe(1)

      const lanes = buildMissionLanes(z8)
      expect(lanes[0].environment?.id).toBe('plant_hot_lava')
      expect(lanes[2].environment?.id).toBe('plant_hot_lava')
    })

    it('should verify Mission Z9 (Chompzilla - Đầm Lầy Nuốt Chửng)', () => {
      const z9 = ZOMBIE_CHAPTER_2_MISSIONS.find((m) => m.id === 'zombie_mission_9')!
      expect(z9).toBeDefined()
      expect(z9.title).toContain('Đầm Lầy Nuốt Chửng')
      expect(z9.bossHeroId).toBe('hero_chompzilla')

      const lanes = buildMissionLanes(z9)
      expect(lanes[1].environment?.id).toBe('plant_venus_flytrap_planet')
    })

    it('should verify Mission Z10 Boss (Citron - Bức Tường Bất Khả Xâm Phạm)', () => {
      const z10 = ZOMBIE_CHAPTER_2_MISSIONS.find((m) => m.id === 'zombie_mission_10')!
      expect(z10).toBeDefined()
      expect(z10.title).toContain('Bức Tường Bất Khả Xâm Phạm')
      expect(z10.bossHeroId).toBe('hero_citron')
      expect(z10.playerHeroId).toBe('hero_zmech')
      expect(z10.rule.startingBrainsBonus).toBe(2)

      const lanes = buildMissionLanes(z10)
      expect(lanes[4].plantMinion).toBeDefined()
      expect(lanes[4].plantMinion?.name).toBe('Admiral Navy Bean')
    })

    it('should correctly calculate stars for Zombie Chapter 2 missions', () => {
      const z6 = ZOMBIE_CHAPTER_2_MISSIONS[0]
      // Victory with 16 HP in 6 turns -> 3 stars (win, hp >= 12, turns <= 9)
      expect(calculateMissionStars(z6, 'zombies', 16, 6)).toBe(3)
      // Victory with 12 HP in 10 turns -> 2 stars (win, hp >= 12, but turns > 9)
      expect(calculateMissionStars(z6, 'zombies', 12, 10)).toBe(2)
      // Loss -> 0 stars
      expect(calculateMissionStars(z6, 'plants', 0, 10)).toBe(0)

      const z10 = ZOMBIE_CHAPTER_2_MISSIONS[4]
      // Boss victory with 16 HP in 7 turns -> 3 stars (win, hp >= 15, clear chapter)
      expect(calculateMissionStars(z10, 'zombies', 16, 7)).toBe(3)
      // Boss victory with 8 HP in 10 turns -> 2 star (win + clear chapter)
      expect(calculateMissionStars(z10, 'zombies', 8, 10)).toBe(2)
    })
  })

  describe('2. Campaign Star Milestones: 60-Star Milestone Tier', () => {
    it('should contain the 60-star milestone tier', () => {
      const milestone60 = getCampaignStarMilestone(60)
      expect(milestone60).toBeDefined()
      expect(milestone60?.requiredStars).toBe(60)
      expect(milestone60?.gems).toBe(1500)
      expect(milestone60?.badge).toBe('Bậc Thầy Đa Vũ Trụ')
      expect(milestone60?.description).toContain('60 sao')
    })

    it('should verify full milestone tiers structure', () => {
      const starCounts = CAMPAIGN_STAR_MILESTONES.map((m) => m.requiredStars)
      expect(starCounts).toEqual([5, 15, 25, 35, 45, 60, 75, 90])
    })

    it('should successfully claim the 60-star milestone reward', () => {
      expect(hasClaimedMilestone(60)).toBe(false)

      // Claim attempt with 50 stars fails
      const failed = claimMilestoneReward(60, 50)
      expect(failed).toBeNull()
      expect(hasClaimedMilestone(60)).toBe(false)

      // Claim attempt with 60 stars succeeds
      const success = claimMilestoneReward(60, 60)
      expect(success).not.toBeNull()
      expect(success?.success).toBe(true)
      expect(success?.gemsAwarded).toBe(1500)
      expect(success?.badge).toBe('Bậc Thầy Đa Vũ Trụ')
      expect(hasClaimedMilestone(60)).toBe(true)

      // Stored gems updated
      expect(Number(localStorage.getItem('pvz_player_gems'))).toBe(1500)

      // Duplicate claim fails
      const duplicate = claimMilestoneReward(60, 60)
      expect(duplicate).toBeNull()
    })
  })

  describe('3. Deck Builder Base64 Export & Import', () => {
    const samplePlantDeck: Record<string, number> = {
      plant_peashooter: 4,
      plant_sunflower: 4,
      plant_wall_nut: 3,
      plant_repeater: 2,
    }

    it('should export deck as Base64 string prefixed with PVZ1:', () => {
      const code = exportDeckCodeBase64('Cây Bắn Đậu Siêu Cấp', 'plants', samplePlantDeck)
      expect(code).toBeDefined()
      expect(code.startsWith('PVZ1:')).toBe(true)
      expect(code.length).toBeGreaterThan(20)
    })

    it('should export deck as standard JSON string', () => {
      const json = exportDeckCode('Cây Bắn Đậu Siêu Cấp', 'plants', samplePlantDeck)
      const parsed = JSON.parse(json)
      expect(parsed.format).toBe('pvz_heroes_deck_v1')
      expect(parsed.side).toBe('plants')
      expect(parsed.totalCards).toBe(13)
      expect(parsed.cardIds.plant_peashooter).toBe(4)
    })

    it('should decode Base64 deck code correctly via decodeDeckCode', () => {
      const code = exportDeckCodeBase64('Bộ Bài Test', 'plants', samplePlantDeck)
      const decodedJson = decodeDeckCode(code)
      const parsed = JSON.parse(decodedJson)
      expect(parsed.name).toBe('Bộ Bài Test')
      expect(parsed.side).toBe('plants')
      expect(parsed.cardIds.plant_sunflower).toBe(4)
    })

    it('should validate and parse Base64 deck code with validateAndParseDeckCode', () => {
      const code = exportDeckCodeBase64('Thây Ma Đột Kích', 'zombies', {
        zombie_arm_wrestler: 4,
        zombie_conga_zombie: 3,
      })

      const result = validateAndParseDeckCode(code)
      expect(result.valid).toBe(true)
      expect(result.deck).toBeDefined()
      expect(result.deck?.name).toBe('Thây Ma Đột Kích')
      expect(result.deck?.side).toBe('zombies')
      expect(result.deck?.totalCards).toBe(7)
    })

    it('should validate and parse JSON deck code as fallback', () => {
      const json = exportDeckCode('Chiến Thuật JSON', 'plants', { plant_peashooter: 4 })
      const result = validateAndParseDeckCode(json)
      expect(result.valid).toBe(true)
      expect(result.deck?.name).toBe('Chiến Thuật JSON')
    })

    it('should reject invalid or corrupted deck code', () => {
      const emptyResult = validateAndParseDeckCode('')
      expect(emptyResult.valid).toBe(false)
      expect(emptyResult.error).toContain('Vui lòng dán chuỗi')

      const badFormat = validateAndParseDeckCode(JSON.stringify({ format: 'invalid_format' }))
      expect(badFormat.valid).toBe(false)
      expect(badFormat.error).toContain('không tương thích')

      const invalidSide = validateAndParseDeckCode(
        JSON.stringify({ format: 'pvz_heroes_deck_v1', side: 'aliens', cardIds: {} })
      )
      expect(invalidSide.valid).toBe(false)
      expect(invalidSide.error).toContain('Phe chiến đấu')

      const exceededCopies = validateAndParseDeckCode(
        JSON.stringify({
          format: 'pvz_heroes_deck_v1',
          side: 'plants',
          cardIds: { plant_repeater: 5 },
        })
      )
      expect(exceededCopies.valid).toBe(false)
      expect(exceededCopies.error).toContain('tối đa 4 bản sao')

      const exceededTotal = validateAndParseDeckCode(
        JSON.stringify({
          format: 'pvz_heroes_deck_v1',
          side: 'plants',
          cardIds: {
            card_1: 4,
            card_2: 4,
            card_3: 4,
            card_4: 4,
            card_5: 4,
            card_6: 4,
            card_7: 4,
            card_8: 4,
            card_9: 4,
            card_10: 4,
            card_11: 4, // 44 cards > 40
          },
        })
      )
      expect(exceededTotal.valid).toBe(false)
      expect(exceededTotal.error).toContain('vượt quá giới hạn tối đa 40 lá')
    })
  })
})
