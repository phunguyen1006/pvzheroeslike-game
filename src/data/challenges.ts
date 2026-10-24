/**
 * PvZ Heroes Replicate - Daily Challenges & Puzzle Party System
 *
 * 1. Puzzle Party:
 *    Pre-set board state where the player must find lethal and win in exactly 1 turn!
 *    Fixed mana, fixed hand, fixed lanes, and specific puzzle objective.
 *
 * 2. Event Showcase:
 *    Daily matches with unique game mutators (e.g., Minions enter with +1/+1,
 *    Tricks cost 1 less, Super-Block charges in 2 hits, all lanes with environments).
 *    Rewards event tickets and gems.
 */

import type { LaneState, Side, Card as EngineCard, Minion } from '../engine/types'
import { createInitialLanes, convertCardDataToCard } from '../engine/reducer'
import { getCardById } from './cards'

export interface PuzzlePartyConfig {
  id: string
  title: string
  subtitle: string
  description: string
  puzzleNumber: number
  playerSide: Side
  playerHeroId: string
  playerHeroName: string
  playerHeroAvatar: string
  playerStartingHp: number
  playerStartingMana: number // Sun or Brains
  opponentHeroId: string
  opponentHeroName: string
  opponentHeroAvatar: string
  opponentStartingHp: number
  turnPhase: 'PLANT_PLAY' | 'ZOMBIE_TRICKS'
  handCardIds: string[]
  lanesSetup: {
    laneIndex: number
    environmentCardId?: string
    plantMinion?: {
      cardId: string
      currentAttack?: number
      currentHealth?: number
    }
    zombieMinion?: {
      cardId: string
      currentAttack?: number
      currentHealth?: number
    }
  }[]
  rewardGems: number
  rewardTickets: number
  hint: string
}

export interface EventShowcaseMutator {
  id: string
  name: string
  description: string
  icon: string
  minionStatBonus?: { attack: number; health: number }
  trickCostDiscount?: number
  blockMeterMaxPips?: number
  allLanesEnvironments?: string[] // Environment card IDs for lanes 0..4
  bonusStartingMana?: number
}

export interface EventShowcaseConfig {
  id: string
  dayIndex: number // 1..7
  title: string
  subtitle: string
  description: string
  mutator: EventShowcaseMutator
  playerSide: Side
  playerHeroId: string
  playerHeroName: string
  opponentHeroId: string
  opponentHeroName: string
  rewardGems: number
  rewardTickets: number
}

/**
 * 4 Iconic PvZ Heroes Puzzle Parties
 */
export const PUZZLE_PARTY_LIST: PuzzlePartyConfig[] = [
  {
    id: 'puzzle_1_pea_barrage',
    title: 'Puzzle 1: Cơn Mưa Đậu Bão Táp',
    subtitle: 'Green Shadow - Tận dụng Làn Cao & Đòn Kép',
    description:
      'Super Brainz chỉ còn 8 HP nhưng có một Đội quân Thây Ma khổng lồ bảo vệ! Hãy tính toán chuẩn xác vị trí đặt Repeater sau Torchwood trên Làn Cao (Heights) để kết liễu trận đấu trong 1 lượt!',
    puzzleNumber: 1,
    playerSide: 'plants',
    playerHeroId: 'hero_green_shadow',
    playerHeroName: 'Green Shadow',
    playerHeroAvatar: '/assets/heroes/plants/Green Shadow.png',
    playerStartingHp: 4,
    playerStartingMana: 5, // 5 Sun
    opponentHeroId: 'hero_super_brainz',
    opponentHeroName: 'Super Brainz',
    opponentHeroAvatar: '/assets/heroes/zombies/Super Brainz.png',
    opponentStartingHp: 8,
    turnPhase: 'PLANT_PLAY',
    handCardIds: [
      'plant_repeater', // 3 Sun, 2/2 Double Strike
      'plant_berry_blast', // 2 Sun, 3 dmg
    ],
    lanesSetup: [
      {
        laneIndex: 0, // Heights lane
        plantMinion: {
          cardId: 'plant_torchwood', // 0/3 (+2 ATK to Peas behind it)
        },
      },
      {
        laneIndex: 1, // Ground lane
        zombieMinion: {
          cardId: 'zombie_foot_soldier', // 3/4 blocker
        },
      },
      {
        laneIndex: 2, // Ground lane
        plantMinion: {
          cardId: 'plant_wall_nut', // 0/6 blocker
        },
        zombieMinion: {
          cardId: 'zombie_smashing_gargantuar', // 5/5
        },
      },
      {
        laneIndex: 3, // Ground lane
        zombieMinion: {
          cardId: 'zombie_buckethead', // 3/4
        },
      },
    ],
    rewardGems: 150,
    rewardTickets: 250,
    hint: 'Làn Cao có sẵn Torchwood! Thẻ bài họ Đậu đặt tại đây sẽ nhận thêm +2 Tấn công. Với đòn kép Double Strike, bạn sẽ gây chính xác 8 sát thương!',
  },
  {
    id: 'puzzle_2_strikethrough_solar',
    title: 'Puzzle 2: Ánh Sáng Xuyên Thấu',
    subtitle: 'Solar Flare - Xuyên thủng phòng tuyến khổng lồ',
    description:
      'The Smash có tới 8 HP và bức tường Knight of the Living Dead bất khả xâm phạm. Nhưng ánh sáng xuyên thấu (Strikethrough) của Elderberry kết hợp Berry Blast sẽ trừng phạt Hero đối thủ!',
    puzzleNumber: 2,
    playerSide: 'plants',
    playerHeroId: 'hero_solar_flare',
    playerHeroName: 'Solar Flare',
    playerHeroAvatar: '/assets/heroes/plants/Solar Flare.png',
    playerStartingHp: 2,
    playerStartingMana: 6, // 6 Sun
    opponentHeroId: 'hero_the_smash',
    opponentHeroName: 'The Smash',
    opponentHeroAvatar: '/assets/heroes/zombies/The Smash.png',
    opponentStartingHp: 8,
    turnPhase: 'PLANT_PLAY',
    handCardIds: [
      'plant_elderberry', // 4 Sun, 2/4 Strikethrough, Plant Evolution: +3 ATK -> 5/4
      'plant_sunflower', // 1 Sun, 0/1 (fodder for evolution)
      'plant_berry_blast', // 2 Sun (Wait, 4+1+2=7 > 6, so player uses Elderberry 5 dmg Strikethrough + Berry Blast 3 dmg = 8 dmg directly to Hero if Sunflower already exists or with Lil Buddy!)
    ],
    lanesSetup: [
      {
        laneIndex: 1,
        plantMinion: {
          cardId: 'plant_sunflower', // Ready to be evolved on!
        },
        zombieMinion: {
          cardId: 'zombie_knight_of_the_living_dead', // 5/5 armored
        },
      },
      {
        laneIndex: 2,
        zombieMinion: {
          cardId: 'zombie_all_star_zombie', // 4/6
        },
      },
    ],
    rewardGems: 200,
    rewardTickets: 300,
    hint: 'Tiến hóa (Evolution) Elderberry lên Sunflower ở làn 1 để nhận 5 Sát thương Xuyên Thấu (Strikethrough), sau đó dùng Berry Blast vào The Smash!',
  },
  {
    id: 'puzzle_3_cowboy_rodeo',
    title: 'Puzzle 3: Cao Bồi Dạt Làn',
    subtitle: 'Electric Boogaloo - Vượt đại dương & Bắn phá',
    description:
      'Chompzilla còn 9 HP. Space Cowboy sở hữu đặc tính Amphibious và Strikethrough, đặc biệt khi gây sát thương lên Plant Hero, Cowboy sẽ tự động di chuyển sang làn kế tiếp bên phải và tiếp tục tấn công!',
    puzzleNumber: 3,
    playerSide: 'zombies',
    playerHeroId: 'hero_electric_boogaloo',
    playerHeroName: 'Electric Boogaloo',
    playerHeroAvatar: '/assets/heroes/zombies/Electric Boogaloo.png',
    playerStartingHp: 1,
    playerStartingMana: 5, // 5 Brains
    opponentHeroId: 'hero_chompzilla',
    opponentHeroName: 'Chompzilla',
    opponentHeroAvatar: '/assets/heroes/plants/Chompzilla.png',
    opponentStartingHp: 9,
    turnPhase: 'ZOMBIE_TRICKS',
    handCardIds: [
      'zombie_space_cowboy', // 4 Brains, 3/5 Strikethrough, Amphibious, moves right on hero dmg
      'zombie_bungee_plumber', // 1 Brain, 2 dmg
    ],
    lanesSetup: [
      {
        laneIndex: 2,
        plantMinion: {
          cardId: 'plant_wall_nut', // 0/6
        },
      },
      {
        laneIndex: 3, // Ground lane
        plantMinion: {
          cardId: 'plant_peashooter', // 1/1
        },
      },
      // Lane 4 is Water (empty!)
    ],
    rewardGems: 250,
    rewardTickets: 350,
    hint: 'Đặt Space Cowboy trên Làn 2 (Strikethrough gây 3 dmg vào Hero, dạt sang làn 3 gây 3 dmg, rồi sang làn 4 Nước gây 3 dmg = 9 dmg lethal)!',
  },
  {
    id: 'puzzle_4_frenzy_smash',
    title: 'Puzzle 4: Cơn Điên Cuồng Bất Tận',
    subtitle: 'The Smash - Cuồng Nộ Frenzy & Càn Quét',
    description:
      'Wall-Knight chỉ còn 6 HP nhưng có các Cây Trồng yếu máu án ngữ. Smashing Gargantuar với sức mạnh Frenzy khi hạ gục một Cây Trồng sẽ lập tức tấn công thêm một lần nữa xuyên thẳng vào Hero!',
    puzzleNumber: 4,
    playerSide: 'zombies',
    playerHeroId: 'hero_the_smash',
    playerHeroName: 'The Smash',
    playerHeroAvatar: '/assets/heroes/zombies/The Smash.png',
    playerStartingHp: 3,
    playerStartingMana: 5, // 5 Brains
    opponentHeroId: 'hero_wall_knight',
    opponentHeroName: 'Wall-Knight',
    opponentHeroAvatar: '/assets/heroes/plants/Wall-Knight.png',
    opponentStartingHp: 6,
    turnPhase: 'ZOMBIE_TRICKS',
    handCardIds: [
      'zombie_bungee_plumber', // 1 Brain, 2 dmg
      'zombie_lurch_for_lunch', // 2 Brains, bonus attack
      'zombie_brute_strength', // 2 Brains, +3 ATK
    ],
    lanesSetup: [
      {
        laneIndex: 1,
        plantMinion: {
          cardId: 'plant_puff_shroom', // 1/1
          currentAttack: 1,
          currentHealth: 1,
        },
        zombieMinion: {
          cardId: 'zombie_smashing_gargantuar', // 5/5 Frenzy (Gargantuars have Frenzy)
          currentAttack: 5,
          currentHealth: 5,
        },
      },
    ],
    rewardGems: 300,
    rewardTickets: 400,
    hint: 'Tăng sức mạnh cho Gargantuar với Brute Strength (+3 ATK -> 8 ATK). Khi đập chết Puff-Shroom 1 HP, Frenzy kích hoạt đòn đánh thứ 2 thẳng vào Wall-Knight!',
  },
]

/**
 * 4 Rotating Daily Event Showcases
 */
export const EVENT_SHOWCASE_LIST: EventShowcaseConfig[] = [
  {
    id: 'showcase_growth_spurt',
    dayIndex: 1,
    title: 'Sự Kiện: Cơn Sốt Tăng Trưởng',
    subtitle: 'Mọi Minion vào sân nhận ngay +1/+1',
    description:
      'Một luồng năng lượng bí ẩn bao trùm sân đấu! Bất kỳ Cây Trồng hay Thây Ma nào được triệu hồi đều nhận ngay vĩnh viễn +1 Sức Đánh và +1 Máu!',
    mutator: {
      id: 'mutator_growth_spurt',
      name: 'Cơn Sốt Tăng Trưởng',
      description: 'Mọi Minion được chơi đều nhận +1/+1',
      icon: '🌱⚡',
      minionStatBonus: { attack: 1, health: 1 },
    },
    playerSide: 'plants',
    playerHeroId: 'hero_green_shadow',
    playerHeroName: 'Green Shadow',
    opponentHeroId: 'hero_super_brainz',
    opponentHeroName: 'Super Brainz',
    rewardGems: 100,
    rewardTickets: 200,
  },
  {
    id: 'showcase_trick_mania',
    dayIndex: 2,
    title: 'Sự Kiện: Lễ Hội Phép Thuật',
    subtitle: 'Tất cả lá Phép (Tricks) giảm 1 Năng lượng',
    description:
      'Các phù thủy và nhà khoa học điên đảo khuấy động chiến trường! Chi phí sử dụng mọi lá bài Phép (Tricks) của cả hai phe đều được giảm 1 (tối thiểu 1)!',
    mutator: {
      id: 'mutator_trick_mania',
      name: 'Lễ Hội Phép Thuật',
      description: 'Lá phép (Tricks) giảm 1 chi phí sử dụng',
      icon: '✨🎩',
      trickCostDiscount: 1,
    },
    playerSide: 'zombies',
    playerHeroId: 'hero_rustbolt',
    playerHeroName: 'Rustbolt',
    opponentHeroId: 'hero_solar_flare',
    opponentHeroName: 'Solar Flare',
    rewardGems: 120,
    rewardTickets: 220,
  },
  {
    id: 'showcase_super_shield',
    dayIndex: 3,
    title: 'Sự Kiện: Khiên Năng Lượng Quá Tải',
    subtitle: 'Siêu Chắn (Super-Block) kích hoạt chỉ với 2 lần sạc',
    description:
      'Thanh đo Chắn Năng Lượng (Block Meter) cực kỳ nhạy cảm trong ngày hôm nay! Chỉ cần 2 lần tích điện là Khiên Siêu Chắn sẽ nổ tung bảo vệ Hero và rút Siêu năng lực!',
    mutator: {
      id: 'mutator_super_shield',
      name: 'Khiên Năng Lượng Quá Tải',
      description: 'Block Meter kích hoạt ở mốc 2 nấc sạc',
      icon: '🛡️💥',
      blockMeterMaxPips: 2,
    },
    playerSide: 'plants',
    playerHeroId: 'hero_wall_knight',
    playerHeroName: 'Wall-Knight',
    opponentHeroId: 'hero_the_smash',
    opponentHeroName: 'The Smash',
    rewardGems: 150,
    rewardTickets: 250,
  },
  {
    id: 'showcase_eco_battlefield',
    dayIndex: 4,
    title: 'Sự Kiện: Đấu Trường Đa Sinh Thái',
    subtitle: 'Cả 5 làn đấu đều có sẵn Môi Trường độc lạ',
    description:
      'Thiên nhiên nổi giận! Tất cả 5 làn chiến đấu đều xuất hiện sẵn các môi trường huyền thoại: Bãi dung nham Hot Lava, Pair Pearadise, Spikeweed Sector, Bog of Sunken Hope và Venus Flytrap Planet!',
    mutator: {
      id: 'mutator_eco_battlefield',
      name: 'Đấu Trường Đa Sinh Thái',
      description: 'Mọi làn đều có sẵn Môi trường phong phú',
      icon: '🏞️🌋',
      allLanesEnvironments: [
        'plant_hot_lava',
        'plant_pair_pearadise',
        'plant_spikeweed_sector',
        'plant_bog_of_sunken_hope',
        'plant_venus_flytrap_planet',
      ],
      bonusStartingMana: 1,
    },
    playerSide: 'plants',
    playerHeroId: 'hero_spudow',
    playerHeroName: 'Spudow',
    opponentHeroId: 'hero_impfinity',
    opponentHeroName: 'Impfinity',
    rewardGems: 200,
    rewardTickets: 300,
  },
]

export const PUZZLE_STORAGE_KEY = 'pvz_puzzle_party_completed_v1'
export const SHOWCASE_STORAGE_KEY = 'pvz_event_showcase_completed_v1'
export const DAILY_CHALLENGES_STORAGE_KEY = 'pvz_daily_challenges_v1'

export interface DailyChallengeItem {
  id: string
  title: string
  description: string
  targetCount: number
  currentCount: number
  rewardGems: number
  rewardCoins: number
  isCompleted: boolean
  isClaimed: boolean
  metricType: 'win_match' | 'deal_hero_damage' | 'play_trick' | 'play_minion'
}

export interface DailyChallengesData {
  date: string
  challenges: DailyChallengeItem[]
  lastUpdated: string
}

export function createDefaultDailyChallenges(dateStr: string): DailyChallengesData {
  return {
    date: dateStr,
    challenges: [
      {
        id: `daily_win_${dateStr}`,
        title: 'Chiến Binh Bất Bại',
        description: 'Chiến thắng 1 trận đấu bất kỳ trong ngày',
        targetCount: 1,
        currentCount: 0,
        rewardGems: 60,
        rewardCoins: 250,
        isCompleted: false,
        isClaimed: false,
        metricType: 'win_match',
      },
      {
        id: `daily_dmg_${dateStr}`,
        title: 'Sức Mạnh Công Phá',
        description: 'Gây tổng cộng 20 sát thương lên Hero đối phương',
        targetCount: 20,
        currentCount: 0,
        rewardGems: 80,
        rewardCoins: 350,
        isCompleted: false,
        isClaimed: false,
        metricType: 'deal_hero_damage',
      },
      {
        id: `daily_trick_${dateStr}`,
        title: 'Bậc Thầy Biến Hóa',
        description: 'Sử dụng 3 lá bài Phép (Tricks) trong các trận đấu',
        targetCount: 3,
        currentCount: 0,
        rewardGems: 70,
        rewardCoins: 300,
        isCompleted: false,
        isClaimed: false,
        metricType: 'play_trick',
      },
    ],
    lastUpdated: new Date().toISOString(),
  }
}

export function loadDailyChallenges(): DailyChallengesData {
  try {
    const today = new Date().toISOString().slice(0, 10)
    if (typeof localStorage === 'undefined') return createDefaultDailyChallenges(today)
    const raw = localStorage.getItem(DAILY_CHALLENGES_STORAGE_KEY)
    if (!raw) {
      const initData = createDefaultDailyChallenges(today)
      saveDailyChallenges(initData)
      return initData
    }
    const data: DailyChallengesData = JSON.parse(raw)
    if (data.date !== today) {
      const freshData = createDefaultDailyChallenges(today)
      saveDailyChallenges(freshData)
      return freshData
    }
    return data
  } catch (err) {
    console.error('Failed to load daily challenges', err)
    return createDefaultDailyChallenges(new Date().toISOString().slice(0, 10))
  }
}

export function saveDailyChallenges(data: DailyChallengesData): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(DAILY_CHALLENGES_STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Failed to save daily challenges', err)
  }
}

export function updateDailyChallengesOnMatchOver(options: {
  winner: Side | null
  playerSide: Side
  damageDealtToEnemyHero?: number
  tricksPlayed?: number
  minionsPlayed?: number
}): { updated: boolean; newlyCompletedCount: number } {
  const data = loadDailyChallenges()
  let updated = false
  let newlyCompletedCount = 0

  const isWin = options.winner === options.playerSide
  const heroDmg = options.damageDealtToEnemyHero || 0
  const tricks = options.tricksPlayed || 0
  const minions = options.minionsPlayed || 0

  data.challenges.forEach((challenge) => {
    if (challenge.isCompleted) return

    let increment = 0
    if (challenge.metricType === 'win_match' && isWin) {
      increment = 1
    } else if (challenge.metricType === 'deal_hero_damage') {
      increment = heroDmg
    } else if (challenge.metricType === 'play_trick') {
      increment = tricks
    } else if (challenge.metricType === 'play_minion') {
      increment = minions
    }

    if (increment > 0) {
      challenge.currentCount = Math.min(challenge.targetCount, challenge.currentCount + increment)
      updated = true
      if (challenge.currentCount >= challenge.targetCount) {
        challenge.isCompleted = true
        newlyCompletedCount++
      }
    }
  })

  if (updated) {
    data.lastUpdated = new Date().toISOString()
    saveDailyChallenges(data)
  }

  return { updated, newlyCompletedCount }
}

export function claimDailyChallengeReward(challengeId: string): {
  success: boolean
  gemsAwarded: number
  coinsAwarded: number
} | null {
  const data = loadDailyChallenges()
  const challenge = data.challenges.find((c) => c.id === challengeId)
  if (!challenge || !challenge.isCompleted || challenge.isClaimed) return null

  challenge.isClaimed = true
  data.lastUpdated = new Date().toISOString()
  saveDailyChallenges(data)

  try {
    if (typeof localStorage !== 'undefined') {
      const currentGems = Number(localStorage.getItem('pvz_player_gems') || '0')
      localStorage.setItem('pvz_player_gems', String(currentGems + challenge.rewardGems))

      const currentCoins = Number(localStorage.getItem('pvz_player_coins') || '0')
      localStorage.setItem('pvz_player_coins', String(currentCoins + challenge.rewardCoins))
    }
  } catch (err) {
    console.error('Failed to update wallet for daily challenge', err)
  }

  return {
    success: true,
    gemsAwarded: challenge.rewardGems,
    coinsAwarded: challenge.rewardCoins,
  }
}

export function getDailyChallengesBadgeCount(): {
  readyToClaimCount: number
  pendingCount: number
  totalUncompleted: number
} {
  const data = loadDailyChallenges()
  const readyToClaimCount = data.challenges.filter((c) => c.isCompleted && !c.isClaimed).length
  const pendingCount = data.challenges.filter((c) => !c.isCompleted).length
  const totalUncompleted = readyToClaimCount + pendingCount
  return { readyToClaimCount, pendingCount, totalUncompleted }
}

export function loadCompletedPuzzles(): string[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(PUZZLE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCompletedPuzzle(puzzleId: string): void {
  try {
    if (typeof localStorage === 'undefined') return
    const completed = loadCompletedPuzzles()
    if (!completed.includes(puzzleId)) {
      completed.push(puzzleId)
      localStorage.setItem(PUZZLE_STORAGE_KEY, JSON.stringify(completed))
    }
  } catch (err) {
    console.error('Failed to save completed puzzle', err)
  }
}

export function isPuzzleCompleted(puzzleId: string): boolean {
  return loadCompletedPuzzles().includes(puzzleId)
}

export function loadCompletedShowcases(): string[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(SHOWCASE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCompletedShowcase(showcaseId: string): void {
  try {
    if (typeof localStorage === 'undefined') return
    const completed = loadCompletedShowcases()
    if (!completed.includes(showcaseId)) {
      completed.push(showcaseId)
      localStorage.setItem(SHOWCASE_STORAGE_KEY, JSON.stringify(completed))
    }
  } catch (err) {
    console.error('Failed to save completed showcase', err)
  }
}

export function isShowcaseCompleted(showcaseId: string): boolean {
  return loadCompletedShowcases().includes(showcaseId)
}

/**
 * Builds the initial 5 lanes for a Puzzle Party
 */
export function buildPuzzleLanes(puzzle: PuzzlePartyConfig): LaneState[] {
  const lanes = createInitialLanes()

  puzzle.lanesSetup.forEach((setup) => {
    const lane = lanes[setup.laneIndex]
    if (!lane) return

    // Apply environment if configured
    if (setup.environmentCardId) {
      const envCard = getCardById(setup.environmentCardId)
      if (envCard) {
        lane.environment = {
          id: envCard.id,
          name: envCard.name,
          side: envCard.team === 'plants' ? 'plants' : 'zombies',
          description: envCard.description || '',
          image: envCard.image || envCard.assetPath,
        }
      }
    }

    // Apply plant minion
    if (setup.plantMinion) {
      const cardData = getCardById(setup.plantMinion.cardId)
      if (cardData) {
        const engineCard = convertCardDataToCard(cardData, 'plants')
        const attack = setup.plantMinion.currentAttack ?? engineCard.attack
        const health = setup.plantMinion.currentHealth ?? engineCard.health

        const minion: Minion = {
          instanceId: `puzzle-plant-${lane.index}`,
          cardId: engineCard.id,
          name: engineCard.name,
          side: 'plants',
          currentAttack: attack,
          baseAttack: attack,
          currentHealth: health,
          maxHealth: health,
          image: engineCard.image,
          tribe: engineCard.tribe,
          traits: (engineCard.traits as any) ?? [],
          amphibious: engineCard.amphibious,
          bullseye: engineCard.bullseye,
          teamUp: engineCard.teamUp,
          frenzy: engineCard.frenzy,
          deadly: engineCard.deadly,
          strikethrough: engineCard.strikethrough,
        }
        lane.plantMinion = minion
      }
    }

    // Apply zombie minion
    if (setup.zombieMinion) {
      const cardData = getCardById(setup.zombieMinion.cardId)
      if (cardData) {
        const engineCard = convertCardDataToCard(cardData, 'zombies')
        const attack = setup.zombieMinion.currentAttack ?? engineCard.attack
        const health = setup.zombieMinion.currentHealth ?? engineCard.health

        const minion: Minion = {
          instanceId: `puzzle-zombie-${lane.index}`,
          cardId: engineCard.id,
          name: engineCard.name,
          side: 'zombies',
          currentAttack: attack,
          baseAttack: attack,
          currentHealth: health,
          maxHealth: health,
          image: engineCard.image,
          tribe: engineCard.tribe,
          traits: (engineCard.traits as any) ?? [],
          amphibious: engineCard.amphibious,
          bullseye: engineCard.bullseye,
          teamUp: engineCard.teamUp,
          frenzy: engineCard.frenzy,
          deadly: engineCard.deadly,
          strikethrough: engineCard.strikethrough,
        }
        lane.zombieMinion = minion
      }
    }
  })

  return lanes
}

/**
 * Builds cards in hand for a Puzzle Party
 */
export function buildPuzzleHand(cardIds: string[], side: Side): EngineCard[] {
  return cardIds
    .map((id, index) => {
      const cardData = getCardById(id)
      if (!cardData) return null
      const engineCard = convertCardDataToCard(cardData, side)
      return {
        ...engineCard,
        id: `puzzle_card_${id}_${index}`,
      }
    })
    .filter((c): c is EngineCard => c !== null)
}
