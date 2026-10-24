/**
 * PvZ Heroes Replicate - Hero Quests & Progression System
 *
 * Each Hero features a sequential 5-step Hero Quest line rewarding Gems, Coins,
 * and an exclusive Badge/Title upon full completion!
 * Progress is saved and tracked via LocalStorage.
 */

export interface HeroQuest {
  id: string
  heroId: string
  heroName: string
  heroAvatar: string
  stepNumber: number // 1 to 5
  title: string
  description: string
  targetCount: number
  metricType:
    | 'play_tribe'
    | 'play_in_lane'
    | 'deal_trait_damage'
    | 'trigger_trait'
    | 'play_trick'
    | 'buff_minion'
    | 'produce_sun'
    | 'spend_brains'
    | 'trigger_superpower'
    | 'win_matches'
    | 'win_with_health'
  metricParam?: string | number // tribe name, lane index, trait name, etc.
  rewardGems: number
  rewardCoins: number
  exclusiveTitle?: string // Awarded upon completing step 5
}

export interface HeroQuestState {
  currentStep: number // 1..5 (6 = all finished)
  currentCount: number
  claimedSteps: number[] // Steps 1..5 already claimed
  isFullyCompleted: boolean
  lastUpdated: string
}

export const HERO_QUESTS_REGISTRY: Record<string, HeroQuest[]> = {
  hero_green_shadow: [
    {
      id: 'quest_gs_1',
      heroId: 'hero_green_shadow',
      heroName: 'Green Shadow',
      heroAvatar: '/assets/heroes/plants/Green Shadow.png',
      stepNumber: 1,
      title: 'Tia Bắn Đầu Tiên',
      description: 'Chơi 3 lá bài họ Đậu (Pea / Bean)',
      targetCount: 3,
      metricType: 'play_tribe',
      metricParam: 'pea',
      rewardGems: 50,
      rewardCoins: 200,
    },
    {
      id: 'quest_gs_2',
      heroId: 'hero_green_shadow',
      heroName: 'Green Shadow',
      heroAvatar: '/assets/heroes/plants/Green Shadow.png',
      stepNumber: 2,
      title: 'Bão Táp Làn Giữa',
      description: 'Đặt 2 Cây Trồng trên Làn Giữa (Làn 3)',
      targetCount: 2,
      metricType: 'play_in_lane',
      metricParam: 2, // index 2 = lane 3 (middle ground)
      rewardGems: 75,
      rewardCoins: 300,
    },
    {
      id: 'quest_gs_3',
      heroId: 'hero_green_shadow',
      heroName: 'Green Shadow',
      heroAvatar: '/assets/heroes/plants/Green Shadow.png',
      stepNumber: 3,
      title: 'Độ Chính Xác Tuyệt Đối',
      description: 'Gây 10 sát thương không kích hoạt Block Meter (Bullseye)',
      targetCount: 10,
      metricType: 'deal_trait_damage',
      metricParam: 'bullseye',
      rewardGems: 100,
      rewardCoins: 400,
    },
    {
      id: 'quest_gs_4',
      heroId: 'hero_green_shadow',
      heroName: 'Green Shadow',
      heroAvatar: '/assets/heroes/plants/Green Shadow.png',
      stepNumber: 4,
      title: 'Bắn Đôi Nhân Đôi',
      description: 'Kích hoạt 3 đòn tấn công Đòn Kép (Double Strike)',
      targetCount: 3,
      metricType: 'trigger_trait',
      metricParam: 'doubleStrike',
      rewardGems: 150,
      rewardCoins: 600,
    },
    {
      id: 'quest_gs_5',
      heroId: 'hero_green_shadow',
      heroName: 'Green Shadow',
      heroAvatar: '/assets/heroes/plants/Green Shadow.png',
      stepNumber: 5,
      title: 'Bậc Thầy Bóng Tối',
      description: 'Chiến thắng 2 trận đấu cùng Green Shadow',
      targetCount: 2,
      metricType: 'win_matches',
      rewardGems: 250,
      rewardCoins: 1000,
      exclusiveTitle: 'Xạ Thủ Bóng Đêm',
    },
  ],

  hero_solar_flare: [
    {
      id: 'quest_sf_1',
      heroId: 'hero_solar_flare',
      heroName: 'Solar Flare',
      heroAvatar: '/assets/heroes/plants/Solar Flare.png',
      stepNumber: 1,
      title: 'Ánh Sáng Ban Mai',
      description: 'Sản xuất tổng cộng 8 Mặt Trời bổ sung (Sun Production)',
      targetCount: 8,
      metricType: 'produce_sun',
      rewardGems: 50,
      rewardCoins: 200,
    },
    {
      id: 'quest_sf_2',
      heroId: 'hero_solar_flare',
      heroName: 'Solar Flare',
      heroAvatar: '/assets/heroes/plants/Solar Flare.png',
      stepNumber: 2,
      title: 'Thiêu Đốt Thây Ma',
      description: 'Sử dụng 3 lá bài Phép (Tricks)',
      targetCount: 3,
      metricType: 'play_trick',
      rewardGems: 75,
      rewardCoins: 300,
    },
    {
      id: 'quest_sf_3',
      heroId: 'hero_solar_flare',
      heroName: 'Solar Flare',
      heroAvatar: '/assets/heroes/plants/Solar Flare.png',
      stepNumber: 3,
      title: 'Bung Nở Xuyên Thấu',
      description: 'Gây 15 sát thương bằng Minion Xuyên Thấu (Strikethrough)',
      targetCount: 15,
      metricType: 'deal_trait_damage',
      metricParam: 'strikethrough',
      rewardGems: 100,
      rewardCoins: 400,
    },
    {
      id: 'quest_sf_4',
      heroId: 'hero_solar_flare',
      heroName: 'Solar Flare',
      heroAvatar: '/assets/heroes/plants/Solar Flare.png',
      stepNumber: 4,
      title: 'Hồi Phục Thần Tốc',
      description: 'Chiến thắng 1 trận đấu với Solar Flare còn từ 14 HP trở lên',
      targetCount: 1,
      metricType: 'win_with_health',
      metricParam: 14,
      rewardGems: 150,
      rewardCoins: 600,
    },
    {
      id: 'quest_sf_5',
      heroId: 'hero_solar_flare',
      heroName: 'Solar Flare',
      heroAvatar: '/assets/heroes/plants/Solar Flare.png',
      stepNumber: 5,
      title: 'Nữ Hoàng Thái Dương',
      description: 'Chiến thắng 2 trận đấu cùng Solar Flare',
      targetCount: 2,
      metricType: 'win_matches',
      rewardGems: 250,
      rewardCoins: 1000,
      exclusiveTitle: 'Thái Dương Nữ Thần',
    },
  ],

  hero_super_brainz: [
    {
      id: 'quest_sb_1',
      heroId: 'hero_super_brainz',
      heroName: 'Super Brainz',
      heroAvatar: '/assets/heroes/zombies/Super Brainz.png',
      stepNumber: 1,
      title: 'Tập Tành Đột Kích',
      description: 'Gây 10 sát thương bằng đặc tính Đột Kích (Anti-Hero)',
      targetCount: 10,
      metricType: 'deal_trait_damage',
      metricParam: 'antiHero',
      rewardGems: 50,
      rewardCoins: 200,
    },
    {
      id: 'quest_sb_2',
      heroId: 'hero_super_brainz',
      heroName: 'Super Brainz',
      heroAvatar: '/assets/heroes/zombies/Super Brainz.png',
      stepNumber: 2,
      title: 'Cơn Say Não Bộ',
      description: 'Tiêu hao tổng cộng 20 Não (Brains) trong các lượt đấu',
      targetCount: 20,
      metricType: 'spend_brains',
      rewardGems: 75,
      rewardCoins: 300,
    },
    {
      id: 'quest_sb_3',
      heroId: 'hero_super_brainz',
      heroName: 'Super Brainz',
      heroAvatar: '/assets/heroes/zombies/Super Brainz.png',
      stepNumber: 3,
      title: 'Siêu Năng Lực Bất Diệt',
      description: 'Kích hoạt 2 Siêu Năng Lực (Superpowers)',
      targetCount: 2,
      metricType: 'trigger_superpower',
      rewardGems: 100,
      rewardCoins: 400,
    },
    {
      id: 'quest_sb_4',
      heroId: 'hero_super_brainz',
      heroName: 'Super Brainz',
      heroAvatar: '/assets/heroes/zombies/Super Brainz.png',
      stepNumber: 4,
      title: 'Thủ Thuật Biến Ảo',
      description: 'Chơi 4 lá bài Phép Thây Ma (Zombie Tricks)',
      targetCount: 4,
      metricType: 'play_trick',
      rewardGems: 150,
      rewardCoins: 600,
    },
    {
      id: 'quest_sb_5',
      heroId: 'hero_super_brainz',
      heroName: 'Super Brainz',
      heroAvatar: '/assets/heroes/zombies/Super Brainz.png',
      stepNumber: 5,
      title: 'Siêu Não Vĩ Đại',
      description: 'Chiến thắng 2 trận đấu cùng Super Brainz',
      targetCount: 2,
      metricType: 'win_matches',
      rewardGems: 250,
      rewardCoins: 1000,
      exclusiveTitle: 'Siêu Não Bất Bại',
    },
  ],

  hero_the_smash: [
    {
      id: 'quest_smash_1',
      heroId: 'hero_the_smash',
      heroName: 'The Smash',
      heroAvatar: '/assets/heroes/zombies/The Smash.png',
      stepNumber: 1,
      title: 'Nghiền Nát Cây Cỏ',
      description: 'Kích hoạt 2 lần đòn đánh Cuồng Nộ (Frenzy)',
      targetCount: 2,
      metricType: 'trigger_trait',
      metricParam: 'frenzy',
      rewardGems: 50,
      rewardCoins: 200,
    },
    {
      id: 'quest_smash_2',
      heroId: 'hero_the_smash',
      heroName: 'The Smash',
      heroAvatar: '/assets/heroes/zombies/The Smash.png',
      stepNumber: 2,
      title: 'Cơ Bắp Khổng Lồ',
      description: 'Tăng sức mạnh (Buff ATK hoặc HP) cho Thây Ma 3 lần',
      targetCount: 3,
      metricType: 'buff_minion',
      rewardGems: 75,
      rewardCoins: 300,
    },
    {
      id: 'quest_smash_3',
      heroId: 'hero_the_smash',
      heroName: 'The Smash',
      heroAvatar: '/assets/heroes/zombies/The Smash.png',
      stepNumber: 3,
      title: 'Sức Mạnh Vô Song',
      description: 'Tiêu hao 25 Não (Brains) trong các trận đấu',
      targetCount: 25,
      metricType: 'spend_brains',
      rewardGems: 100,
      rewardCoins: 400,
    },
    {
      id: 'quest_smash_4',
      heroId: 'hero_the_smash',
      heroName: 'The Smash',
      heroAvatar: '/assets/heroes/zombies/The Smash.png',
      stepNumber: 4,
      title: 'Cú Đấm Ngàn Cân',
      description: 'Kích hoạt 2 Siêu Năng Lực (Superpowers)',
      targetCount: 2,
      metricType: 'trigger_superpower',
      rewardGems: 150,
      rewardCoins: 600,
    },
    {
      id: 'quest_smash_5',
      heroId: 'hero_the_smash',
      heroName: 'The Smash',
      heroAvatar: '/assets/heroes/zombies/The Smash.png',
      stepNumber: 5,
      title: 'Nhà Vô Địch Đấu Vật',
      description: 'Chiến thắng 2 trận đấu cùng The Smash',
      targetCount: 2,
      metricType: 'win_matches',
      rewardGems: 250,
      rewardCoins: 1000,
      exclusiveTitle: 'Nhà Vô Địch Đô Vật',
    },
  ],

  hero_rustbolt: [
    {
      id: 'quest_rb_1',
      heroId: 'hero_rustbolt',
      heroName: 'Rustbolt',
      heroAvatar: '/assets/heroes/zombies/Rustbolt.png',
      stepNumber: 1,
      title: 'Bộ Não Khoa Học',
      description: 'Chơi 3 Thây Ma thuộc tộc Khoa Học (Science)',
      targetCount: 3,
      metricType: 'play_tribe',
      metricParam: 'science',
      rewardGems: 50,
      rewardCoins: 200,
    },
    {
      id: 'quest_rb_2',
      heroId: 'hero_rustbolt',
      heroName: 'Rustbolt',
      heroAvatar: '/assets/heroes/zombies/Rustbolt.png',
      stepNumber: 2,
      title: 'Hợp Kim Titan',
      description: 'Tăng sức mạnh hoặc Máu cho Zombie 3 lần',
      targetCount: 3,
      metricType: 'buff_minion',
      rewardGems: 75,
      rewardCoins: 300,
    },
    {
      id: 'quest_rb_3',
      heroId: 'hero_rustbolt',
      heroName: 'Rustbolt',
      heroAvatar: '/assets/heroes/zombies/Rustbolt.png',
      stepNumber: 3,
      title: 'Công Nghệ Hạt Nhân',
      description: 'Sử dụng 4 lá bài Phép Thây Ma (Tricks)',
      targetCount: 4,
      metricType: 'play_trick',
      rewardGems: 100,
      rewardCoins: 400,
    },
    {
      id: 'quest_rb_4',
      heroId: 'hero_rustbolt',
      heroName: 'Rustbolt',
      heroAvatar: '/assets/heroes/zombies/Rustbolt.png',
      stepNumber: 4,
      title: 'Kích Hoạt Siêu Giáp',
      description: 'Kích hoạt 2 Siêu Năng Lực (Superpowers)',
      targetCount: 2,
      metricType: 'trigger_superpower',
      rewardGems: 150,
      rewardCoins: 600,
    },
    {
      id: 'quest_rb_5',
      heroId: 'hero_rustbolt',
      heroName: 'Rustbolt',
      heroAvatar: '/assets/heroes/zombies/Rustbolt.png',
      stepNumber: 5,
      title: 'Kỹ Sư Nguyên Tử',
      description: 'Chiến thắng 2 trận đấu cùng Rustbolt',
      targetCount: 2,
      metricType: 'win_matches',
      rewardGems: 250,
      rewardCoins: 1000,
      exclusiveTitle: 'Kỹ Sư Nguyên Tử',
    },
  ],
}

export const HERO_QUEST_STORAGE_KEY = 'pvz_hero_quests_progress_v1'
export const HERO_QUESTS_STORAGE_KEY = HERO_QUEST_STORAGE_KEY

export function getAllHeroQuests(): HeroQuest[] {
  return Object.values(HERO_QUESTS_REGISTRY).flat()
}

export function getHeroQuests(heroId: string): HeroQuest[] {
  return HERO_QUESTS_REGISTRY[heroId] || []
}

export function getHeroCurrentQuest(
  heroId: string,
  progressMap: Record<string, HeroQuestState>
): HeroQuest | null {
  const quests = getHeroQuests(heroId)
  if (!quests.length) return null
  const state = progressMap[heroId]
  const currentStep = state ? state.currentStep : 1
  return quests.find((q) => q.stepNumber === currentStep) || null
}

export function loadAllHeroQuestProgress(): Record<string, HeroQuestState> {
  try {
    if (typeof localStorage === 'undefined') return {}
    const raw = localStorage.getItem(HERO_QUEST_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (err) {
    console.error('Failed to load hero quest progress', err)
    return {}
  }
}

export function saveAllHeroQuestProgress(progress: Record<string, HeroQuestState>): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(HERO_QUEST_STORAGE_KEY, JSON.stringify(progress))
  } catch (err) {
    console.error('Failed to save hero quest progress', err)
  }
}

export function getHeroQuestState(heroId: string): HeroQuestState {
  const all = loadAllHeroQuestProgress()
  if (!all[heroId]) {
    all[heroId] = {
      currentStep: 1,
      currentCount: 0,
      claimedSteps: [],
      isFullyCompleted: false,
      lastUpdated: new Date().toISOString(),
    }
  }
  return all[heroId]
}

/**
 * Advances progress for active quest of a hero if the metric matches
 */
export function advanceHeroQuestProgress(
  heroId: string,
  metricType: HeroQuest['metricType'],
  amount: number = 1,
  metricParam?: string | number
): {
  advanced: boolean
  questCompleted: boolean
  currentCount: number
  targetCount: number
} {
  const allProgress = loadAllHeroQuestProgress()
  const heroState = allProgress[heroId] || {
    currentStep: 1,
    currentCount: 0,
    claimedSteps: [],
    isFullyCompleted: false,
    lastUpdated: new Date().toISOString(),
  }

  if (heroState.isFullyCompleted) {
    return { advanced: false, questCompleted: false, currentCount: 0, targetCount: 0 }
  }

  const quests = getHeroQuests(heroId)
  const currentQuest = quests.find((q) => q.stepNumber === heroState.currentStep)
  if (!currentQuest) {
    return { advanced: false, questCompleted: false, currentCount: 0, targetCount: 0 }
  }

  // Check metric matching
  if (currentQuest.metricType !== metricType) {
    return {
      advanced: false,
      questCompleted: false,
      currentCount: heroState.currentCount,
      targetCount: currentQuest.targetCount,
    }
  }

  // Check metricParam if present (e.g. tribe, lane index, trait)
  if (currentQuest.metricParam !== undefined && metricParam !== undefined) {
    const expected = String(currentQuest.metricParam).toLowerCase()
    const actual = String(metricParam).toLowerCase()
    if (!actual.includes(expected)) {
      return {
        advanced: false,
        questCompleted: false,
        currentCount: heroState.currentCount,
        targetCount: currentQuest.targetCount,
      }
    }
  }

  heroState.currentCount = Math.min(currentQuest.targetCount, heroState.currentCount + amount)
  heroState.lastUpdated = new Date().toISOString()
  const questCompleted = heroState.currentCount >= currentQuest.targetCount

  allProgress[heroId] = heroState
  saveAllHeroQuestProgress(allProgress)

  return {
    advanced: true,
    questCompleted,
    currentCount: heroState.currentCount,
    targetCount: currentQuest.targetCount,
  }
}

/**
 * Claims reward for completed quest step, advancing hero to next step
 */
export function claimHeroQuestReward(
  heroId: string,
  stepNumber: number
): {
  success: boolean
  gemsAwarded: number
  coinsAwarded: number
  titleAwarded?: string
  nextStep: number
} | null {
  const allProgress = loadAllHeroQuestProgress()
  const heroState = allProgress[heroId]
  if (!heroState) return null

  const quests = getHeroQuests(heroId)
  const targetQuest = quests.find((q) => q.stepNumber === stepNumber)
  if (!targetQuest) return null

  // Must be at or past this step, have reached target count, and not claimed yet
  if (heroState.currentStep !== stepNumber) return null
  if (heroState.currentCount < targetQuest.targetCount) return null
  if (heroState.claimedSteps.includes(stepNumber)) return null

  // Claim reward
  heroState.claimedSteps.push(stepNumber)

  // Update gems in player wallet
  try {
    if (typeof localStorage !== 'undefined') {
      const currentGems = Number(localStorage.getItem('pvz_player_gems') || '0')
      localStorage.setItem('pvz_player_gems', String(currentGems + targetQuest.rewardGems))

      const currentCoins = Number(localStorage.getItem('pvz_player_coins') || '0')
      localStorage.setItem('pvz_player_coins', String(currentCoins + targetQuest.rewardCoins))
    }
  } catch (err) {
    console.error('Failed to update wallet for hero quest', err)
  }

  // Advance to next step
  const nextStep = stepNumber + 1
  heroState.currentStep = nextStep
  heroState.currentCount = 0
  if (nextStep > quests.length) {
    heroState.isFullyCompleted = true
  }
  heroState.lastUpdated = new Date().toISOString()

  allProgress[heroId] = heroState
  saveAllHeroQuestProgress(allProgress)

  return {
    success: true,
    gemsAwarded: targetQuest.rewardGems,
    coinsAwarded: targetQuest.rewardCoins,
    titleAwarded: targetQuest.exclusiveTitle,
    nextStep,
  }
}
