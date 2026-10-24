/**
 * PvZ Heroes Replicate - Campaign Mode Data & Helpers
 * Chapter 1: "Suburban Crisis" (Khủng hoảng Ngoại ô)
 * 5 Epic Boss Missions against iconic Zombie Heroes
 */

import type { CampaignMission, CampaignProgress, LaneState, Side, Minion } from '../engine/types'
import { createInitialLanes, convertCardDataToCard } from '../engine/reducer'
import { getCardById } from './cards'

export const CHAPTER_1_MISSIONS: CampaignMission[] = [
  {
    id: 'mission_1',
    missionNumber: 1,
    title: 'Nhiệm Vụ 1: Cú Đấm Siêu Não',
    subtitle: 'Đối đầu Super Brainz tại Phố Ngoại Ô',
    storyIntro:
      'Super Brainz đang bay lượn quấy phá và đe dọa các ngôi nhà ngoại ô yên bình! Crazy Dave đã kịp thời tiếp tế thêm một bình năng lượng Mặt trời để bạn nhanh chóng thiết lập tuyến phòng thủ ban đầu.',
    bossHeroId: 'hero_super_brainz',
    bossHeroName: 'Super Brainz',
    bossHeroAvatar: '/assets/heroes/zombies/Super Brainz.png',
    difficulty: 'easy',
    rule: {
      id: 'rule_mission_1',
      name: 'Năng Lượng Tiếp Tế',
      description: 'Crazy Dave tiếp tế: Bạn khởi đầu trận đấu với +1 Mặt trời (Sun) ngay từ lượt 1!',
      startingSunBonus: 1,
      startingBrainsBonus: 0,
    },
    starObjectives: [
      '⭐ Chiến thắng trận đấu (Clear Mission)',
      '⭐⭐ Kết thúc trận đấu với Plant Hero còn từ 12 HP trở lên',
      '⭐⭐⭐ Giành thắng lợi trong vòng 8 lượt đấu',
    ],
    rewards: {
      gems: 100,
      unlocksNext: true,
      title: 'Tập sự Ngoại ô',
    },
  },
  {
    id: 'mission_2',
    missionNumber: 2,
    title: 'Nhiệm Vụ 2: Binh Đoàn Tí Hòn',
    subtitle: 'Đối đầu Impfinity - Hỗn chiến nhân bản',
    storyIntro:
      'Impfinity cùng đám bản sao tí hon của hắn đang tràn qua các con hẻm! Hắn đã cài sẵn một tên Swabbie ở dưới nước, nhưng bạn cũng đã kịp dựng một Wall-Nut kiên cố trên đồi cao!',
    bossHeroId: 'hero_impfinity',
    bossHeroName: 'Impfinity',
    bossHeroAvatar: '/assets/heroes/zombies/Impfinity.png',
    difficulty: 'normal',
    rule: {
      id: 'rule_mission_2',
      name: 'Hỗn Chiến Tiền Đồn',
      description: 'Làn 1 (Heights) có sẵn 1 Wall-Nut phòng thủ; Làn 5 (Water) có 1 Swabbie đang rình rập!',
      startingSunBonus: 0,
      startingBrainsBonus: 0,
      initialMinions: [
        { laneIndex: 0, cardId: 'plant_wall_nut', side: 'plants' },
        { laneIndex: 4, cardId: 'zombie_swabbie', side: 'zombies' },
      ],
    },
    starObjectives: [
      '⭐ Đánh bại Impfinity',
      '⭐⭐ Không để Zombie gây quá 10 sát thương lên Hero của bạn',
      '⭐⭐⭐ Hạ gục ít nhất 4 Zombie trong suốt trận chiến',
    ],
    rewards: {
      gems: 150,
      unlocksNext: true,
      title: 'Khắc Tinh Tí Hòn',
    },
  },
  {
    id: 'mission_3',
    missionNumber: 3,
    title: 'Nhiệm Vụ 3: Đầm Lầy Sụt Lún',
    subtitle: 'Đối đầu The Smash tại Vùng Trũng',
    storyIntro:
      'The Smash dồn bạn vào vùng đầm lầy hiểm trở Bog of Sunken Hope! Bùn lầy làm suy yếu sức mạnh các Zombie thông thường nhưng tiếp thêm sinh lực cho các chiến binh thực vật!',
    bossHeroId: 'hero_the_smash',
    bossHeroName: 'The Smash',
    bossHeroAvatar: '/assets/heroes/zombies/The Smash.png',
    difficulty: 'normal',
    rule: {
      id: 'rule_mission_3',
      name: 'Đầm Lầy Bog of Sunken Hope',
      description: 'Môi trường cổ đại Bog of Sunken Hope bao phủ sẵn Làn 4 (Ground) ngay từ đầu trận!',
      startingSunBonus: 0,
      startingBrainsBonus: 0,
      initialEnvironments: [
        { laneIndex: 3, environmentCardId: 'plant_bog_of_sunken_hope' },
      ],
    },
    starObjectives: [
      '⭐ Quật ngã The Smash',
      '⭐⭐ Kết thúc trận với ít nhất 15 HP còn lại',
      '⭐⭐⭐ Đặt ít nhất 2 Minion có đặc tính Amphibious hoặc Team-Up',
    ],
    rewards: {
      gems: 200,
      unlocksNext: true,
      title: 'Chiến Binh Đầm Lầy',
    },
  },
  {
    id: 'mission_4',
    missionNumber: 4,
    title: 'Nhiệm Vụ 4: Giáp Sắt Bất Diệt',
    subtitle: 'Đối đầu Rustbolt - Pháo Đài Di Động',
    storyIntro:
      'Rustbolt đã dựng một vùng Cone Zone kiên cố tại Làn 2 và trang bị giáp trụ hạng nặng! Nhưng bạn cũng nhận được +1 Năng lượng khởi đầu để triển khai vũ khí đối kháng!',
    bossHeroId: 'hero_rustbolt',
    bossHeroName: 'Rustbolt',
    bossHeroAvatar: '/assets/heroes/zombies/Rustbolt.png',
    difficulty: 'hard',
    rule: {
      id: 'rule_mission_4',
      name: 'Vùng Nón Bảo Vệ Cone Zone',
      description: 'Làn 2 (Ground) có sẵn môi trường Cone Zone (+3 HP cho Zombie); Bạn nhận +1 Sun khởi đầu!',
      startingSunBonus: 1,
      startingBrainsBonus: 0,
      initialEnvironments: [
        { laneIndex: 1, environmentCardId: 'zombie_cone_zone' },
      ],
    },
    starObjectives: [
      '⭐ Phá nát lớp giáp của Rustbolt',
      '⭐⭐ Phá vỡ ít nhất 2 lần Khiên Super-Block của đối thủ',
      '⭐⭐⭐ Quét sạch toàn bộ minion của Rustbolt khi kết thúc trận',
    ],
    rewards: {
      gems: 250,
      unlocksNext: true,
      title: 'Chuyên Gia Phá Giáp',
    },
  },
  {
    id: 'mission_5',
    missionNumber: 5,
    title: 'Nhiệm Vụ 5: Phòng Thí Nghiệm Điên Loạn',
    subtitle: 'ĐẠI CHIẾN BOSS CUỐI CHAPTER 1: Professor Brainstorm',
    storyIntro:
      'Giáo sư Brainstorm đã vận hành lò phản ứng phát minh tối thượng! Nguồn sóng não cực mạnh khiến cả 2 phe tràn ngập năng lượng (+2 Sun/Brains)! Sân cỏ Làn 1 được trang bị Spikeweed Sector gai góc để bảo vệ bạn!',
    bossHeroId: 'hero_professor_brainstorm',
    bossHeroName: 'Professor Brainstorm',
    bossHeroAvatar: '/assets/heroes/zombies/Professor Brainstorm.png',
    difficulty: 'boss',
    rule: {
      id: 'rule_mission_5',
      name: 'Bão Não Khoa Học & Cỏ Gai Spikeweed',
      description: 'Cả 2 phe đều nhận +2 Năng lượng khởi đầu! Làn 1 (Heights) rải sẵn Cỏ Gai Spikeweed Sector!',
      startingSunBonus: 2,
      startingBrainsBonus: 2,
      initialEnvironments: [
        { laneIndex: 0, environmentCardId: 'plant_spikeweed_sector' },
      ],
    },
    starObjectives: [
      '⭐ Đánh bại Trùm Cuối Giáo Sư Brainstorm',
      '⭐⭐ Chiến thắng với Hero còn nguyên vẹn ít nhất 10 HP',
      '⭐⭐⭐ Hoàn thành xuất sắc toàn bộ Chapter 1: Suburban Crisis!',
    ],
    rewards: {
      gems: 500,
      unlocksNext: false,
      title: 'Vệ Binh Ngoại Ô (Suburban Hero)',
    },
  },
]

export const CAMPAIGN_STORAGE_KEY = 'pvz_campaign_progress_v1'

export function getInitialCampaignProgress(): CampaignProgress {
  return {
    unlockedMissionNumber: 1,
    completedMissions: {},
  }
}

export function loadCampaignProgress(): CampaignProgress {
  try {
    if (typeof localStorage === 'undefined') return getInitialCampaignProgress()
    const raw = localStorage.getItem(CAMPAIGN_STORAGE_KEY)
    if (!raw) return getInitialCampaignProgress()
    const parsed = JSON.parse(raw)
    return {
      unlockedMissionNumber: Math.max(1, parsed.unlockedMissionNumber || 1),
      completedMissions: parsed.completedMissions || {},
    }
  } catch (err) {
    console.error('Failed to load campaign progress:', err)
    return getInitialCampaignProgress()
  }
}

export function saveCampaignProgress(progress: CampaignProgress): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(progress))
  } catch (err) {
    console.error('Failed to save campaign progress:', err)
  }
}

/**
 * Creates initial lanes modified by the mission rules
 */
export function buildMissionLanes(mission: CampaignMission): LaneState[] {
  const lanes = createInitialLanes()

  // Apply initial environments
  if (mission.rule.initialEnvironments) {
    for (const envRule of mission.rule.initialEnvironments) {
      const lane = lanes[envRule.laneIndex]
      const card = getCardById(envRule.environmentCardId)
      if (lane && card) {
        lane.environment = {
          id: card.id,
          name: card.name,
          side: card.team === 'plants' ? 'plants' : 'zombies',
          description: card.description || '',
          image: card.image || card.assetPath,
        }
      }
    }
  }

  // Apply initial minions
  if (mission.rule.initialMinions) {
    for (const minionRule of mission.rule.initialMinions) {
      const lane = lanes[minionRule.laneIndex]
      const cardData = getCardById(minionRule.cardId)
      if (lane && cardData) {
        const engineCard = convertCardDataToCard(cardData, minionRule.side)
        const minion: Minion = {
          instanceId: `mission-init-${minionRule.side}-${lane.index}`,
          cardId: engineCard.id,
          name: engineCard.name,
          side: minionRule.side,
          currentAttack: engineCard.attack,
          baseAttack: engineCard.attack,
          currentHealth: engineCard.health,
          maxHealth: engineCard.health,
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

        if (minionRule.side === 'plants') {
          lane.plantMinion = minion
        } else {
          lane.zombieMinion = minion
        }
      }
    }
  }

  return lanes
}

/**
 * Evaluates stars won for a completed mission based on game outcome
 */
export function calculateMissionStars(
  mission: CampaignMission,
  winner: Side | null,
  playerHp: number,
  turnCount: number
): number {
  if (winner !== 'plants') return 0

  let stars = 1 // 1 star for clearing the mission

  if (mission.id === 'mission_1') {
    if (playerHp >= 12) stars++
    if (turnCount <= 8) stars++
  } else if (mission.id === 'mission_2') {
    if (playerHp >= 10) stars++
    if (turnCount <= 10) stars++
  } else if (mission.id === 'mission_3') {
    if (playerHp >= 15) stars++
    if (turnCount <= 12) stars++
  } else if (mission.id === 'mission_4') {
    if (playerHp >= 10) stars++
    if (turnCount <= 10) stars++
  } else if (mission.id === 'mission_5') {
    if (playerHp >= 10) stars++
    if (turnCount <= 12) stars++
  }

  return Math.min(3, stars)
}
