/**
 * PvZ Heroes Replicate - Campaign Mode Data & Helpers
 * Chapter 1: "Suburban Crisis" (Khủng hoảng Ngoại ô)
 * 5 Epic Boss Missions against iconic Zombie Heroes
 */

import type { CampaignMission, CampaignProgress, LaneState, Side, Minion, Card as EngineCard, SavedDeck, GameState } from '../engine/types'
import { createInitialLanes, convertCardDataToCard } from '../engine/reducer'
import { getCardById, ALL_CARDS } from './cards'

export const CHAPTER_1_MISSIONS: CampaignMission[] = [
  {
    faction: 'plants',
    id: 'mission_1',
    chapter: 1,
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
    comicDialogue: {
      issueTitle: 'CÚ ĐẤM SIÊU NÃO TẬP KÍCH!',
      issueTagline: 'Super Brainz đe dọa khu phố ngoại ô yên bình',
      zombieHeroQuote: 'Hahaha! Mái tóc bồng bềnh và cú đấm Siêu Não của ta sẽ thổi bay toàn bộ đám cỏ rác của ngươi!',
      plantHeroQuote: 'Cú đấm của ngươi không thể nhanh hơn phát đạn đậu chính xác từ Green Shadow đâu! Chuẩn bị nếm mùi thất bại đi!',
    },
  },
  {
    faction: 'plants',
    id: 'mission_2',
    chapter: 1,
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
    comicDialogue: {
      issueTitle: 'CƠN BÃO BẢN SAO TÍ HÒN!',
      issueTagline: 'Impfinity cùng phân thân tràn ngập mọi ngõ ngách',
      zombieHeroQuote: 'Hehehe! Nhìn xem ai đông hơn nào! Tụi ta phân thân thành hàng trăm bản sao tí hon quậy phá!',
      plantHeroQuote: 'Càng đông thì bão đậu quét càng dễ! Bức tường Wall-Nut sẽ chặn đứng bước chân của lũ tí hon các ngươi!',
    },
  },
  {
    faction: 'plants',
    id: 'mission_3',
    chapter: 1,
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
    comicDialogue: {
      issueTitle: 'CƠN THỊNH NỘ CỦA ĐÔ VẬT!',
      issueTagline: 'The Smash giậm chân rung chuyển cả bờ vực bùn lầy',
      zombieHeroQuote: 'SMASH ĐẬP BẸP! KHÔNG CÓ THỨ CÂY CỎ NÀO CHỐNG NỔI NẮM ĐẤM ĐÁ TẢNG CỦA TA!',
      plantHeroQuote: 'Thể hình to lớn nhưng chậm chạp! Để xem bùn lầy Bog of Sunken Hope có giữ chân nổi nắm đấm của ngươi không!',
    },
  },
  {
    faction: 'plants',
    id: 'mission_4',
    chapter: 1,
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
    comicDialogue: {
      issueTitle: 'PHÁO ĐÀI BỌC THÉP TỐI THƯỢNG!',
      issueTagline: 'Rustbolt thiết lập vành đai Cone Zone phòng ngự kiên cố',
      zombieHeroQuote: 'Áo giáp khoa học viễn tưởng của ta hấp thụ mọi tổn thương! Bọn cây cỏ các ngươi chỉ là trò hề!',
      plantHeroQuote: 'Kim loại dày đến đâu cũng sẽ bị axit quả mọng và chông gai Spikeweed bào mòn rỉ sét thôi!',
    },
  },
  {
    faction: 'plants',
    id: 'mission_5',
    chapter: 1,
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
      unlocksNext: true,
      title: 'Vệ Binh Ngoại Ô (Suburban Hero)',
    },
    comicDialogue: {
      issueTitle: 'THIÊN TÀI ĐIÊN CUỒNG TẬP CUỐI!',
      issueTagline: 'Đại chiến Boss cuối Chapter 1 với Giáo Sư Não Bộ',
      zombieHeroQuote: 'Eureka! Phát minh hủy diệt với năng lượng vô hạn sẽ quét sạch khu vườn khỏi bản đồ thế giới!',
      plantHeroQuote: 'Khoa học phục vụ tà ác sẽ bị công lý đập tan! Toàn lực khu vườn, xông lên vì hòa bình Ngoại Ô!',
    },
  },
]

export const CHAPTER_2_MISSIONS: CampaignMission[] = [
  {
    faction: 'plants',
    id: 'mission_6',
    chapter: 2,
    missionNumber: 6,
    title: 'Nhiệm Vụ 6: Pháo Đài Cơ Giới',
    subtitle: 'Đối đầu Z-Mech - Chiến xa hủy diệt',
    storyIntro:
      'Z-Mech chỉ huy cỗ xe cơ giới bọc thép tiến thẳng vào đại lộ trung tâm Metropolis! Làn 2 được trang bị Laser Base Alpha tạo Strikethrough & Deadly, nhưng Dave cũng chuẩn bị sẵn 1 Spikeweed Sector trên Làn 1!',
    bossHeroId: 'hero_z_mech',
    bossHeroName: 'Z-Mech',
    bossHeroAvatar: '/assets/heroes/zombies/Z-Mech.png',
    difficulty: 'normal',
    rule: {
      id: 'rule_mission_6',
      name: 'Căn Cứ Laser Base Alpha',
      description: 'Làn 2 (Ground) có sẵn Laser Base Alpha (Deadly & Strikethrough); Làn 1 (Heights) có sẵn Cỏ Gai Spikeweed Sector!',
      startingSunBonus: 0,
      startingBrainsBonus: 0,
      initialEnvironments: [
        { laneIndex: 1, environmentCardId: 'zombie_laser_base_alpha' },
        { laneIndex: 0, environmentCardId: 'plant_spikeweed_sector' },
      ],
    },
    starObjectives: [
      '⭐ Tiêu diệt cỗ máy chiến tranh Z-Mech',
      '⭐⭐ Hero thực vật còn lại từ 12 HP trở lên',
      '⭐⭐⭐ Kết liễu Z-Mech trong vòng 9 lượt đấu',
    ],
    rewards: {
      gems: 150,
      unlocksNext: true,
      title: 'Thợ Phá Giáp Cơ Giới',
    },
    comicDialogue: {
      issueTitle: 'CHIẾN CƠ HỦY DIỆT Z-MECH!',
      issueTagline: 'Robot chiến tranh tối tân Laser Base Alpha xung trận',
      zombieHeroQuote: 'Cơ giáp Z-Mech kích hoạt hỏa lực toàn diện! Laser Base Alpha sẽ bốc hơi mọi lá chắn cản đường!',
      plantHeroQuote: 'Một cỗ máy to xác nhưng người lái là chú Imp vụng về? Bãi chông Spikeweed sẽ làm đứt xích xe tăng của ngươi!',
    },
  },
  {
    faction: 'plants',
    id: 'mission_7',
    chapter: 2,
    missionNumber: 7,
    title: 'Nhiệm Vụ 7: Lâu Đài Phù Thủy',
    subtitle: 'Đối đầu Immorticia - Nữ vương Dơi Quỷ',
    storyIntro:
      'Immorticia giăng bóng tối bao trùm Thành phố Đô thị với Total Eclipse trên Làn 3 làm suy yếu toàn bộ cây! Hắn cài cắm 1 Dr. Spacetime đang rình rập, nhưng Dave đã tiếp tế cho bạn +1 Năng lượng!',
    bossHeroId: 'hero_immorticia',
    bossHeroName: 'Immorticia',
    bossHeroAvatar: '/assets/heroes/zombies/Immorticia.png',
    difficulty: 'normal',
    rule: {
      id: 'rule_mission_7',
      name: 'Nhật Thực Total Eclipse & Tiến Sĩ Spacetime',
      description: 'Làn 3 (Ground) có sẵn Total Eclipse (-1/-1 cho Cây); Zombie có sẵn 1 Dr. Spacetime tại Làn 3! Bạn nhận +1 Sun khởi đầu.',
      startingSunBonus: 1,
      startingBrainsBonus: 0,
      initialEnvironments: [
        { laneIndex: 2, environmentCardId: 'zombie_total_eclipse' },
      ],
      initialMinions: [
        { laneIndex: 2, cardId: 'zombie_dr_spacetime', side: 'zombies' },
      ],
    },
    starObjectives: [
      '⭐ Đánh bại phù thủy Immorticia',
      '⭐⭐ Giữ vững Hero với ít nhất 14 HP còn lại',
      '⭐⭐⭐ Tiêu diệt Dr. Spacetime trước khi hắn kịp gây sát thương lên Hero',
    ],
    rewards: {
      gems: 200,
      unlocksNext: true,
      title: 'Thợ Săn Phù Thủy',
    },
    comicDialogue: {
      issueTitle: 'HẮC MA THUẬT NGUYỆT THỰC!',
      issueTagline: 'Immorticia cùng bầy dơi đen che khuất vầng dương',
      zombieHeroQuote: 'Bóng tối Total Eclipse và bầy dơi đêm sẽ biến sân vườn thành nghĩa địa vĩnh cửu!',
      plantHeroQuote: 'Mặt trời có thể bị che khuất tạm thời, nhưng hạt giống hy vọng sẽ bừng sáng thiêu rụi ma thuật đen của ngươi!',
    },
  },
  {
    faction: 'plants',
    id: 'mission_8',
    chapter: 2,
    missionNumber: 8,
    title: 'Nhiệm Vụ 8: Bão Tuyết Bắc Cực',
    subtitle: 'Đối đầu Brain Freeze - Quái thú Băng giá',
    storyIntro:
      'Brain Freeze giải phóng đợt bão tuyết đóng băng toàn bộ mặt hồ và dựng căn cứ Area 22 hùng mạnh trên Làn 4! Bạn có sẵn 1 Snow Pea kiên cường trên Làn 4 để làm chậm bước tiến của quái thú!',
    bossHeroId: 'hero_brain_freeze',
    bossHeroName: 'Brain Freeze',
    bossHeroAvatar: '/assets/heroes/zombies/Brain Freeze.png',
    difficulty: 'hard',
    rule: {
      id: 'rule_mission_8',
      name: 'Khu Vực Area 22 & Đậu Băng Giá',
      description: 'Làn 4 (Ground) có sẵn Area 22 (+2/+2 & Frenzy cho Zombie); Cây trồng có sẵn 1 Snow Pea tại Làn 4!',
      startingSunBonus: 0,
      startingBrainsBonus: 0,
      initialEnvironments: [
        { laneIndex: 3, environmentCardId: 'zombie_area_22' },
      ],
      initialMinions: [
        { laneIndex: 3, cardId: 'plant_snow_pea', side: 'plants' },
      ],
    },
    starObjectives: [
      '⭐ Đánh bại Quái thú Băng giá Brain Freeze',
      '⭐⭐ Không để bất kỳ Zombie nào có Frenzy đánh trúng Hero',
      '⭐⭐⭐ Giành thắng lợi trong vòng 8 lượt đấu',
    ],
    rewards: {
      gems: 250,
      unlocksNext: true,
      title: 'Ngọn Lửa Băng Giá',
    },
    comicDialogue: {
      issueTitle: 'BÃO BĂNG TỬ THẦN BẮC CỰC!',
      issueTagline: 'Brain Freeze mang mùa đông vĩnh cửu đến Area 22',
      zombieHeroQuote: 'Graaaagh! Đóng băng mọi mạch nhựa sống! Area 22 trao cho bầy quái thú cơn cuồng nộ Frenzy bất tận!',
      plantHeroQuote: 'Lửa nhiệt huyết của loài cây sẽ làm tan chảy lớp băng tuyết! Đậu tuyết Snow Pea, hãy cùng ta phản công!',
    },
  },
  {
    faction: 'plants',
    id: 'mission_9',
    chapter: 2,
    missionNumber: 9,
    title: 'Nhiệm Vụ 9: Vũ Hội Sấm Sét',
    subtitle: 'Đối đầu Electric Boogaloo - Sàn nhảy tử thần',
    storyIntro:
      'Boogaloo biến Làn 3 thành trạm phóng Moon Base Z (Overshoot 3) cực kỳ cuồng nhiệt! Bạn được Dave tăng cường +2 Sun khởi đầu để dập tắt vũ điệu sấm chớp trước khi quá muộn!',
    bossHeroId: 'hero_electric_boogaloo',
    bossHeroName: 'Electric Boogaloo',
    bossHeroAvatar: '/assets/heroes/zombies/Electric Boogaloo.png',
    difficulty: 'hard',
    rule: {
      id: 'rule_mission_9',
      name: 'Trạm Mặt Trăng Moon Base Z',
      description: 'Làn 3 (Ground) có sẵn Moon Base Z (Overshoot 3); Bạn khởi đầu với +2 Mặt trời (Sun)!',
      startingSunBonus: 2,
      startingBrainsBonus: 0,
      initialEnvironments: [
        { laneIndex: 2, environmentCardId: 'zombie_moon_base_z' },
      ],
    },
    starObjectives: [
      '⭐ Dập tắt vũ hội sấm sét của Electric Boogaloo',
      '⭐⭐ Kết thúc trận đấu với ít nhất 12 HP còn lại',
      '⭐⭐⭐ Hạ gục đối thủ bằng đòn tấn công từ Làn Cao (Heights) hoặc Nước (Water)',
    ],
    rewards: {
      gems: 300,
      unlocksNext: true,
      title: 'Vua Vũ Trường',
    },
    comicDialogue: {
      issueTitle: 'VŨ TRƯỜNG SẤM SÉT TỬ THẦN!',
      issueTagline: 'Electric Boogaloo khai hỏa trạm phát sóng Moon Base Z',
      zombieHeroQuote: 'Nhịp điệu sấm chớp cuồng loạn! Moon Base Z sẽ bắn phá trực diện vào Hero các ngươi mỗi nhịp nhảy!',
      plantHeroQuote: 'Vũ hội của ngươi đến lúc hạ màn rồi, Boogaloo! Năng lượng mặt trời dồi dào sẽ ngắt nguồn âm thanh của ngươi!',
    },
  },
  {
    faction: 'plants',
    id: 'mission_10',
    chapter: 2,
    missionNumber: 10,
    title: 'Nhiệm Vụ 10: Tái Đấu Pháo Đài Bất Hoại',
    subtitle: 'ĐẠI CHIẾN BOSS CUỐI CHAPTER 2: Rustbolt Tối Thượng',
    storyIntro:
      'Rustbolt trở lại với áo giáp siêu cấp và mạng lưới năng lượng Medulla Nebula! Hai phe bước vào trận quyết chiến đỉnh cao với +2 Năng lượng! Cây Nho Planet of the Grapes được trồng sẵn ở Làn 3 để tiếp tế bài liên tục!',
    bossHeroId: 'hero_rustbolt',
    bossHeroName: 'Rustbolt',
    bossHeroAvatar: '/assets/heroes/zombies/Rustbolt.png',
    difficulty: 'boss',
    rule: {
      id: 'rule_mission_10',
      name: 'Lò Năng Lượng Đô Thị Metropolis',
      description: 'Cả 2 phe nhận +2 Sun/Brains khởi đầu! Làn 2 có Medulla Nebula; Làn 3 có Planet of the Grapes!',
      startingSunBonus: 2,
      startingBrainsBonus: 2,
      initialEnvironments: [
        { laneIndex: 1, environmentCardId: 'zombie_medulla_nebula' },
        { laneIndex: 2, environmentCardId: 'plant_planet_of_the_grapes' },
      ],
    },
    starObjectives: [
      '⭐ Phá tan pháo đài Rustbolt Tối Thượng',
      '⭐⭐ Giành chiến thắng với Hero còn từ 15 HP trở lên',
      '⭐⭐⭐ Hoàn thành xuất sắc toàn bộ Chapter 2: Zombie Metropolis!',
    ],
    rewards: {
      gems: 600,
      unlocksNext: true,
      title: 'Chúa Tể Đô Thị (Metropolis Hero)',
    },
    comicDialogue: {
      issueTitle: 'TRẬN QUYẾT ĐẤU METROPOLIS!',
      issueTagline: 'Rustbolt Tối Thượng với mạng lưới năng lượng vô tận',
      zombieHeroQuote: 'Medulla Nebula cung cấp trí não bất tận! Thành phố Metropolis này giờ là đế chế của Zombie!',
      plantHeroQuote: 'Đây là trận chiến cuối cùng bảo vệ tương lai! Planet of the Grapes tiếp tế vô hạn, quyết chiến đến cùng!',
    },
  },
]

export const CHAPTER_3_MISSIONS: CampaignMission[] = [
  {
    faction: 'plants',
    id: 'mission_11',
    code: 'P11',
    chapter: 3,
    missionNumber: 11,
    title: 'Nhiệm Vụ 11: Phát Minh Bão Não (Eureka Inventions)',
    subtitle: 'Đối đầu Professor Brainstorm - Kho Phát Minh Điên Rồ',
    storyIntro:
      'Professor Brainstorm triển khai lò phản ứng hạt nhân Medulla Nebula tại Làn 3 để tích lũy hàng tá Brains! Để đối phó với kho phát minh điên rồ, Dave kích hoạt Bão Nắng (Sun Surge) ban cho Cây Trồng +2 Sun khởi đầu!',
    bossHeroId: 'hero_professor_brainstorm',
    bossHeroName: 'Professor Brainstorm',
    bossHeroAvatar: '/assets/heroes/zombies/Professor Brainstorm.png',
    difficulty: 'normal',
    rule: {
      id: 'rule_mission_11',
      name: 'Lò Phản Ứng Medulla & Bão Nắng (Sun Surge)',
      description:
        'Làn 3 có sẵn Medulla Nebula (+2 Brains khi xuất trận Zombie); Cây Trồng nhận hiệu ứng Sun Surge (+2 Sun khởi đầu); Thây Ma nhận +1 Não khởi đầu!',
      specialRuleDescription: 'Sun Surge: Người chơi Cây Trồng nhận thêm +2 Sun khởi đầu để tăng tốc phòng thủ.',
      startingSunBonus: 2,
      startingBrainsBonus: 1,
      initialEnvironments: [
        { laneIndex: 2, environmentCardId: 'zombie_medulla_nebula' },
      ],
      modifiers: ['sun_surge'],
    },
    starObjectives: [
      '⭐ Đánh bại nhà phát minh điên rồ Professor Brainstorm',
      '⭐⭐ Bảo toàn lượng máu của Hero từ 12 HP trở lên',
      '⭐⭐⭐ Giành chiến thắng trong vòng 8 lượt đấu',
    ],
    rewards: {
      gems: 350,
      unlocksNext: true,
      title: 'Khắc Tinh Khoa Học',
    },
    comicDialogue: {
      issueTitle: 'CƠN BÃO NÃO BỘ EUREKA!',
      issueTagline: 'Professor Brainstorm tung kho phát minh điên cuồng vs Bão Nắng Cây Trồng',
      zombieHeroQuote:
        'Eureka! Hàng triệu ý tưởng điên rồ đang nảy nở trong đầu ta! Medulla Nebula sẽ cung cấp năng lượng vô tận để ta xóa sổ khu vườn!',
      plantHeroQuote:
        'Bão Nắng Sun Surge của Crazy Dave đã sẵn sàng! Mọi phát minh quái đản của ngươi sẽ bị thiêu rụi trước ánh sáng diệp lục!',
    },
  },
  {
    faction: 'plants',
    id: 'mission_12',
    code: 'P12',
    chapter: 3,
    missionNumber: 12,
    title: 'Nhiệm Vụ 12: Đêm Phù Thủy Cuồng Nộ (Witch\'s Coven)',
    subtitle: 'Đối đầu Immorticia - Nữ Chúa Dơi Đêm',
    storyIntro:
      'Immorticia triệu hồi Vùng Cấm Area 22 tại Làn 2 và yểm bùa Cuồng Nộ (Zombie Frenzy) lên toàn bộ quân đoàn Thây Ma, biến mọi zombie thành cỗ máy đồ sát liên hoàn! Nhưng Dave đã kịp thời trồng Spikeweed Sector tại Làn 1 để chông gai cản bước quái vật!',
    bossHeroId: 'hero_immorticia',
    bossHeroName: 'Immorticia',
    bossHeroAvatar: '/assets/heroes/zombies/Immorticia.png',
    difficulty: 'hard',
    rule: {
      id: 'rule_mission_12',
      name: 'Khu Vực 22 & Lời Nguyền Cuồng Nộ (Zombie Frenzy)',
      description:
        'Làn 2 có Area 22 (+2/+2 & Frenzy); Toàn bộ Thây Ma nhận hiệu ứng Zombie Frenzy (tấn công thêm khi hạ gục minion); Làn 1 có Spikeweed Sector (2 sát thương trước combat); Thây Ma nhận +1 Não khởi đầu!',
      specialRuleDescription:
        'Zombie Frenzy: Toàn bộ phe Thây Ma sở hữu đặc tính Cuồng nộ (Frenzy), tấn công liên tiếp khi hạ gục đối thủ.',
      startingSunBonus: 1,
      startingBrainsBonus: 1,
      initialEnvironments: [
        { laneIndex: 0, environmentCardId: 'plant_spikeweed_sector' },
        { laneIndex: 1, environmentCardId: 'zombie_area_22' },
      ],
      modifiers: ['zombie_frenzy'],
    },
    starObjectives: [
      '⭐ Tiêu diệt nữ chúa bóng đêm Immorticia',
      '⭐⭐ Kết thúc trận đấu với ít nhất 14 HP còn lại',
      '⭐⭐⭐ Giành thắng lợi trước hoặc tại lượt 8',
    ],
    rewards: {
      gems: 400,
      unlocksNext: true,
      title: 'Thợ Săn Phù Thủy',
    },
    comicDialogue: {
      issueTitle: 'BẦY DƠI ĐÊM CUỒNG NỘ!',
      issueTagline: 'Area 22 cộng hưởng phép thuật hắc ám biến đàn quái thành sát thủ Frenzy',
      zombieHeroQuote:
        'Hỡi bầy dơi và linh hồn bóng tối, hãy xé toạc mọi rễ cây! Lời nguyền Zombie Frenzy sẽ không để kẻ nào sống sót!',
      plantHeroQuote:
        'Chông gai Spikeweed Sector đã bẫy sẵn dưới chân ngươi! Lũ dơi khát máu sẽ phải chùn bước trước hàng rào gai thép!',
    },
  },
  {
    faction: 'plants',
    id: 'mission_13',
    code: 'P13',
    chapter: 3,
    missionNumber: 13,
    title: 'Nhiệm Vụ 13: Pháo Thủ Thủy Tinh (Glass Cannon Forge)',
    subtitle: 'Đối đầu Rustbolt - Pháo Đài Hợp Kim Cải Tiến',
    storyIntro:
      'Rustbolt kích hoạt trường từ trường biến dị Glass Cannon (Đại Bác Thủy Tinh) lên toàn bộ chiến trường: mọi minion tăng vọt +3 Tấn công nhưng giảm -2 Máu! Đồng thời Rustbolt rải Cone Zone tại Làn 3 để bù đắp máu cho quái vật bọc thép, trong khi Dave mở cổng Pair Pearadise tại Làn 1!',
    bossHeroId: 'hero_rustbolt',
    bossHeroName: 'Rustbolt',
    bossHeroAvatar: '/assets/heroes/zombies/Rustbolt.png',
    difficulty: 'hard',
    rule: {
      id: 'rule_mission_13',
      name: 'Từ Trường Biến Dị & Đại Bác Thủy Tinh (Glass Cannon)',
      description:
        'Quy tắc Glass Cannon kích hoạt: Toàn bộ Cây Trồng và Thây Ma nhận +3 Tấn công và bị giảm 2 Máu (tối thiểu 1 HP); Làn 3 có Cone Zone (+3 HP cho Zombie); Làn 1 có Pair Pearadise (nhân đôi Cây Trồng)!',
      specialRuleDescription:
        'Glass Cannon: Mọi minion trên sân (cả 2 phe) nhận +3 Tấn công, -2 Máu (tối thiểu 1 HP). Sát thương bùng nổ cực hạn!',
      startingSunBonus: 1,
      startingBrainsBonus: 2,
      initialEnvironments: [
        { laneIndex: 0, environmentCardId: 'plant_pair_pearadise' },
        { laneIndex: 2, environmentCardId: 'zombie_cone_zone' },
      ],
      modifiers: ['glass_cannon'],
    },
    starObjectives: [
      '⭐ Vượt qua trận địa biến dị phá hủy Rustbolt',
      '⭐⭐ Kết thúc trận đấu với Hero từ 12 HP trở lên',
      '⭐⭐⭐ Giành thắng lợi trong vòng 8 lượt đấu',
    ],
    rewards: {
      gems: 450,
      unlocksNext: true,
      title: 'Bậc Thầy Đột Phá Hỏa Lực',
    },
    comicDialogue: {
      issueTitle: 'CHIẾN TRƯỜNG THỦY TINH ĐẪM MÁU!',
      issueTagline: 'Từ trường Glass Cannon đẩy sức tấn công lên tột đỉnh',
      zombieHeroQuote:
        'Giáp sắt của ta không thể bị xuyên thủng! Nhưng với hỏa lực Glass Cannon cực hạn, một phát bắn là đủ tiễn ngươi về trời!',
      plantHeroQuote:
        'Ngươi quên rằng Cây Trồng cũng mang sức mạnh +3 Tấn công! Pair Pearadise sẽ tạo ra cặp đôi pháo thủ xóa sổ ngươi!',
    },
  },
  {
    faction: 'plants',
    id: 'mission_14',
    code: 'P14',
    chapter: 3,
    missionNumber: 14,
    title: 'Nhiệm Vụ 14: Đột Kích Laser Không Gian (Space Laser Assault)',
    subtitle: 'Đối đầu Super Brainz - Siêu Nhân Vũ Trụ Tự Cao',
    storyIntro:
      'Super Brainz giăng bẫy Laser Base Alpha tại Làn 2 (Deadly & Strikethrough) và bơm huyết thanh Zombie Frenzy cho toàn bộ thuộc hạ! Tuy nhiên, Dave đã kịp thời kích hoạt Bão Nắng Sun Surge (+2 Sun khởi đầu) và dựng Planet of the Grapes tại Làn 1 để tiếp tế bài liên tục!',
    bossHeroId: 'hero_super_brainz',
    bossHeroName: 'Super Brainz',
    bossHeroAvatar: '/assets/heroes/zombies/Super Brainz.png',
    difficulty: 'hard',
    rule: {
      id: 'rule_mission_14',
      name: 'Căn Cứ Laser Alpha & Cuộc Đột Kích Hai Chiều',
      description:
        'Làn 2 có Laser Base Alpha (Deadly & Strikethrough); Làn 1 có Planet of the Grapes (rút bài khi đánh trúng Hero); Kích hoạt đồng thời 2 bổ trợ: Sun Surge (+2 Sun khởi đầu) và Zombie Frenzy (Toàn bộ Zombie nhận Frenzy); Đối thủ có +2 Não khởi đầu!',
      specialRuleDescription:
        'Sun Surge & Zombie Frenzy: Cây Trồng bùng nổ năng lượng +2 Sun; phe Thây Ma sở hữu Cuồng nộ Frenzy cuồng sát.',
      startingSunBonus: 2,
      startingBrainsBonus: 2,
      initialEnvironments: [
        { laneIndex: 0, environmentCardId: 'plant_planet_of_the_grapes' },
        { laneIndex: 1, environmentCardId: 'zombie_laser_base_alpha' },
      ],
      modifiers: ['sun_surge', 'zombie_frenzy'],
    },
    starObjectives: [
      '⭐ Đập tan sự ngạo mạn của Super Brainz',
      '⭐⭐ Bảo toàn lượng máu Hero từ 15 HP trở lên',
      '⭐⭐⭐ Giành thắng lợi trong vòng 7 lượt đấu',
    ],
    rewards: {
      gems: 500,
      unlocksNext: true,
      title: 'Khắc Tinh Siêu Nhân Bất Bại',
    },
    comicDialogue: {
      issueTitle: 'QUYẾT ĐẤU SIÊU NHÂN KHÔNG GIAN!',
      issueTagline: 'Laser Base Alpha xuyên thấu vs Planet of the Grapes tiếp tế vô tận',
      zombieHeroQuote:
        'Tóc vuốt bóng lộn, Laser Base Alpha bắn xuyên thấu và Frenzy cuồng sát! Ta là sinh vật hoàn hảo nhất vũ trụ!',
      plantHeroQuote:
        'Tự tin thái quá là điểm yếu chí mạng của ngươi! Sun Surge và Planet of the Grapes sẽ mang đến cơn bão diệp lục vô tận!',
    },
  },
  {
    faction: 'plants',
    id: 'mission_15',
    code: 'P15',
    chapter: 3,
    missionNumber: 15,
    title: 'Nhiệm Vụ 15: Pháo Đài Cơ Giáp Diệt Vong (Z-Mech Cataclysm)',
    subtitle: 'ĐẠI CHIẾN BOSS CUỐI CHAPTER 3: Z-Mech Cỗ Máy Chiến Tranh Vũ Trụ',
    storyIntro:
      'Trận đại quyết chiến định đoạt số phận Chapter 3! Z-Mech kích hoạt Moon Base Z tại Làn 3 với Overshoot 3 trực diện! Toàn bộ 3 dị biến vũ trụ được kích hoạt đồng thời: Bão Nắng Sun Surge (+2 Sun), Zombie Frenzy (toàn bộ zombie cuồng nộ) và Glass Cannon (+3 Công, -2 Máu)! Dave giao cho bạn lá chắn thần thánh Venus Flytrap Planet tại Làn 2 để sinh tồn!',
    bossHeroId: 'hero_z_mech',
    bossHeroName: 'Z-Mech Tối Thượng',
    bossHeroAvatar: '/assets/heroes/zombies/Z-Mech.png',
    difficulty: 'boss',
    rule: {
      id: 'rule_mission_15',
      name: 'Đại Họa Diệt Vong Tam Hợp (Multiverse Cataclysm: Sun Surge + Frenzy + Glass Cannon)',
      description:
        'Làn 3 có Moon Base Z (Overshoot 3); Làn 2 có Venus Flytrap Planet (hút máu hồi phục); Kích hoạt toàn diện 3 Quy Tắc Bổ Trợ: Sun Surge (+2 Sun), Zombie Frenzy (toàn bộ Zombie nhận Frenzy), và Glass Cannon (+3 Tấn công, -2 Máu tối thiểu 1 HP); Z-Mech nhận +3 Não khởi đầu!',
      specialRuleDescription:
        'Tam Hợp Biến Dị: Sun Surge (+2 Sun), Zombie Frenzy (Zombie có Frenzy) và Glass Cannon (+3 Công/-2 Máu). Cực hạn thử thách!',
      startingSunBonus: 2,
      startingBrainsBonus: 3,
      initialEnvironments: [
        { laneIndex: 1, environmentCardId: 'plant_venus_flytrap_planet' },
        { laneIndex: 2, environmentCardId: 'zombie_moon_base_z' },
      ],
      modifiers: ['sun_surge', 'zombie_frenzy', 'glass_cannon'],
    },
    starObjectives: [
      '⭐ Đánh bại siêu cơ giáp Z-Mech Tối Thượng',
      '⭐⭐ Kết thúc trận đấu với ít nhất 15 HP còn lại',
      '⭐⭐⭐ Hoàn thành xuất sắc toàn bộ Chiến dịch Plant Chapter 3!',
    ],
    rewards: {
      gems: 1000,
      unlocksNext: true,
      title: 'Huyền Thoại Đa Vũ Trụ Thực Vật',
    },
    comicDialogue: {
      issueTitle: 'ĐẠI CHIẾN PHÁO ĐÀI CƠ GIÁP VŨ TRỤ!',
      issueTagline: 'Cỗ máy Z-Mech với Moon Base Z và tam hợp dị biến vũ trụ nổ tung',
      zombieHeroQuote:
        'Hệ thống vũ khí Z-Mech đã đạt 1000% công suất! Moon Base Z cùng Frenzy và Glass Cannon sẽ biến vườn cây của ngươi thành tro bụi vĩnh hằng!',
      plantHeroQuote:
        'Dù sắt thép của ngươi có kiên cố đến đâu, sự sống diệp lục với Sun Surge và Venus Flytrap Planet sẽ hồi sinh từ đống tro tàn và đập tan cỗ máy!',
    },
  },
]

export const P11 = CHAPTER_3_MISSIONS[0]
export const P12 = CHAPTER_3_MISSIONS[1]
export const P13 = CHAPTER_3_MISSIONS[2]
export const P14 = CHAPTER_3_MISSIONS[3]
export const P15 = CHAPTER_3_MISSIONS[4]
export const PLANT_CHAPTER_3_MISSIONS = CHAPTER_3_MISSIONS

// ==========================================
// PLANT CAMPAIGN - CHAPTER 4: SOLAR SANCTUM
// ==========================================
export const CHAPTER_4_MISSIONS: CampaignMission[] = [
  {
    faction: 'plants',
    id: 'mission_16',
    chapter: 4,
    missionNumber: 16,
    title: 'Nhiệm Vụ 16: Vườn Hoa Hướng Dương (Sunflower\'s Garden)',
    subtitle: 'Đối đầu Zombie Bossbot (HP 30) - Thánh Địa Ánh Dương',
    storyIntro:
      'Bước vào Thánh Địa Ánh Dương (Solar Sanctum), Zombie Bossbot khổng lồ với 30 HP xuất hiện nhằm hủy diệt nguồn năng lượng Mặt trời! Cây Trồng điều động binh đoàn Solar tinh nhuệ bảo vệ thánh địa trong trận chiến 3 làn đất linh thiêng!',
    bossHeroId: 'hero_z_mech',
    bossHeroName: 'Zombie Bossbot',
    bossHeroAvatar: '/assets/heroes/zombies/Z-Mech.png',
    difficulty: 'normal',
    rule: {
      id: 'rule_mission_16',
      name: 'Vườn Hoa Hướng Dương (Sunflower\'s Garden)',
      description:
        'Zombie Bossbot khởi đầu với 30 HP; Chiến trường 3 làn đất trung tâm; Cây Trồng sử dụng bộ bài hệ Solar và nhận +1 Sun khởi đầu!',
      startingSunBonus: 1,
      startingBrainsBonus: 0,
      initialMinions: [
        { laneIndex: 2, cardId: 'plant_sunflower', side: 'plants' },
      ],
    },
    starObjectives: [
      '⭐ Chiến thắng trận đấu: Giảm HP Zombie Bossbot về 0',
      '⭐⭐ Bảo toàn toàn bộ Cây Trồng (Win without losing a plant)',
      '⭐⭐⭐ Giành chiến thắng chớp nhoáng trong vòng 6 lượt đấu (≤ 6 turns)',
    ],
    rewards: {
      gems: 400,
      unlocksNext: true,
      title: 'Người Giữ Vườn Ánh Dương',
    },
    comicDialogue: {
      issueTitle: 'TIẾNG GẦM CỦA CỖ MÁY BOSSBOT!',
      issueTagline: 'Zombie Bossbot 30 HP tấn công Thánh Địa Ánh Dương',
      zombieHeroQuote:
        'Cỗ máy Bossbot tối tân của ta với 30 HP và lớp giáp thép siêu dày sẽ san bằng vườn hoa hướng dương của các ngươi!',
      plantHeroQuote:
        'Ánh sáng mặt trời rực rỡ từ Solar Sanctum sẽ nung chảy mọi bánh răng gỉ sét của ngươi! Hãy xem sức mạnh Solar bùng cháy!',
    },
  },
  {
    faction: 'plants',
    id: 'mission_17',
    chapter: 4,
    missionNumber: 17,
    title: 'Nhiệm Vụ 17: Phục Kích Song Dương (Twin Sun Ambush)',
    subtitle: 'Đối đầu Impfinity (HP 25) - Bão Lửa Kabloom',
    storyIntro:
      'Impfinity với 25 HP cùng đám phân thân tinh quái đã bí mật phục kích sẵn với 2 tên quỷ lùn Imp cắm chốt trên sân! Hãy dùng hỏa lực bùng nổ của bộ bài Kabloom để thiêu rụi vòng vây kẻ thù!',
    bossHeroId: 'hero_impfinity',
    bossHeroName: 'Impfinity',
    bossHeroAvatar: '/assets/heroes/zombies/Impfinity.png',
    difficulty: 'normal',
    rule: {
      id: 'rule_mission_17',
      name: 'Phục Kích Song Dương & Bầy Quỷ Lùn',
      description:
        'Impfinity có 25 HP; Zombies khởi đầu với 2 tên Swabbie phục kích sẵn tại Làn 2 và Làn 4; Cây Trồng dùng bộ bài Kabloom nhận +1 Sun!',
      startingSunBonus: 1,
      startingBrainsBonus: 0,
      initialMinions: [
        { laneIndex: 1, cardId: 'zombie_swabbie', side: 'zombies' },
        { laneIndex: 3, cardId: 'zombie_swabbie', side: 'zombies' },
      ],
    },
    starObjectives: [
      '⭐ Đánh bại Impfinity (HP 25)',
      '⭐⭐ Gây ít nhất 15 sát thương trong một lượt đấu (Deal 15+ damage in one turn)',
      '⭐⭐⭐ Giành thắng lợi trong vòng 5 lượt đấu (≤ 5 turns)',
    ],
    rewards: {
      gems: 450,
      unlocksNext: true,
      title: 'Kẻ Phá Bẫy Phục Kích',
    },
    comicDialogue: {
      issueTitle: 'BẪY PHỤC KÍCH SONG DƯƠNG!',
      issueTagline: 'Impfinity 25 HP và bầy quỷ lùn đánh lén',
      zombieHeroQuote:
        'Hehehe! Bọn ta đã giăng sẵn 2 tên Imp phục kích trước khi các ngươi kịp trở tay! Hãy nếm mùi biển quỷ tí hon!',
      plantHeroQuote:
        'Kabloom bùng cháy! Hỏa tiễn Berry Blast và nấm lửa sẽ thổi bay toàn bộ đám tiểu quỷ chỉ trong một lượt đấu!',
    },
  },
  {
    faction: 'plants',
    id: 'mission_18',
    chapter: 4,
    missionNumber: 18,
    title: 'Nhiệm Vụ 18: Đấu Trường Thảm Gai (Spikeweed Showdown)',
    subtitle: 'Đối đầu Super Brainz (HP 28) - Trận Địa Mega-Grow',
    storyIntro:
      'Super Brainz với 28 HP và năng lực phi thường lao vào quấy phá! Dave đã kích hoạt 2 thảm gai Spikeweed Sector tại Làn 2 và Làn 3 để liên tục chọc thủng bước tiến kẻ thù. Hãy tận dụng sức mạnh bộc phá của bộ bài Mega-Grow để đè bẹp đối thủ!',
    bossHeroId: 'hero_super_brainz',
    bossHeroName: 'Super Brainz',
    bossHeroAvatar: '/assets/heroes/zombies/Super Brainz.png',
    difficulty: 'hard',
    rule: {
      id: 'rule_mission_18',
      name: 'Đấu Trường Thảm Gai Spikeweed Showdown',
      description:
        'Super Brainz có 28 HP; Làn 2 và Làn 3 có sẵn 2 môi trường Spikeweed Sector (gây 2 sát thương cho Zombie); Cây Trồng sử dụng bộ bài Mega-Grow nhận +1 Sun!',
      startingSunBonus: 1,
      startingBrainsBonus: 1,
      initialEnvironments: [
        { laneIndex: 1, environmentCardId: 'plant_spikeweed_sector' },
        { laneIndex: 2, environmentCardId: 'plant_spikeweed_sector' },
      ],
    },
    starObjectives: [
      '⭐ Đánh bại Super Brainz (HP 28)',
      '⭐⭐ Giành chiến thắng mà không dùng thêm thẻ Môi trường (Win without using environments)',
      '⭐⭐⭐ Giành thắng lợi sinh tử khi lượng máu Hero còn ≤ 8 HP (Win with ≤ 8 HP remaining)',
    ],
    rewards: {
      gems: 500,
      unlocksNext: true,
      title: 'Bậc Thầy Trận Địa Gai',
    },
    comicDialogue: {
      issueTitle: 'ĐẤU TRƯỜNG THẢM GAI NẢY LỬA!',
      issueTagline: 'Super Brainz 28 HP vs Thảm Gai Spikeweed Sector',
      zombieHeroQuote:
        'Dù có gai nhọn dưới chân thì siêu nắm đấm và mái tóc hoàn hảo của Super Brainz vẫn sẽ nghiền nát mọi chướng ngại!',
      plantHeroQuote:
        'Spikeweed Sector sẽ đâm thủng đôi giày bay của ngươi! Sức mạnh tăng trưởng Mega-Grow sẽ kết liễu trận chiến!',
    },
  },
  {
    faction: 'plants',
    id: 'mission_19',
    chapter: 4,
    missionNumber: 19,
    title: 'Nhiệm Vụ 19: Phòng Tuyến Hoa Cỏ (Floral Defense)',
    subtitle: 'Đối đầu Electric Boogaloo (HP 30) - Bão Điện Strikethrough',
    storyIntro:
      'Electric Boogaloo với 30 HP đem dàn âm thanh cuồng loạn cùng sát thủ Space Cowboy mang đặc tính Xuyên Thấu (Strikethrough) tấn công phòng tuyến! Sử dụng bộ bài phối hợp Solar + Guardian kiên cường để tạo lá chắn chặn đứng mọi đòn đánh xuyên giáp!',
    bossHeroId: 'hero_electric_boogaloo',
    bossHeroName: 'Electric Boogaloo',
    bossHeroAvatar: '/assets/heroes/zombies/Electric Boogaloo.png',
    difficulty: 'hard',
    rule: {
      id: 'rule_mission_19',
      name: 'Phòng Tuyến Hoa Cỏ & Sát Thủ Strikethrough',
      description:
        'Electric Boogaloo có 30 HP; Làn 3 có sẵn 1 Zombie Xuyên thấu Space Cowboy (Strikethrough); Cây Trồng phối hợp bộ bài Solar + Guardian nhận +1 Sun!',
      startingSunBonus: 1,
      startingBrainsBonus: 1,
      initialMinions: [
        { laneIndex: 2, cardId: 'zombie_space_cowboy', side: 'zombies' },
      ],
    },
    starObjectives: [
      '⭐ Đánh bại Electric Boogaloo (HP 30)',
      '⭐⭐ Chặn đứng tổng cộng từ 10 sát thương trở lên (Block 10+ total damage)',
      '⭐⭐⭐ Giành chiến thắng trong vòng 7 lượt đấu (≤ 7 turns)',
    ],
    rewards: {
      gems: 600,
      unlocksNext: true,
      title: 'Bức Tường Hoa Cỏ Bất Hoại',
    },
    comicDialogue: {
      issueTitle: 'ĐIỆU NHẢY XUYÊN THẤU SẤM SÉT!',
      issueTagline: 'Electric Boogaloo 30 HP cùng dàn quân Strikethrough công phá',
      zombieHeroQuote:
        'Đòn Strikethrough từ quân đoàn Boogaloo sẽ xuyên thẳng qua đám rễ cây và giật điện trực tiếp vào Hero của ngươi!',
      plantHeroQuote:
        'Bức tường Guardian vững chắc kết hợp hồi phục Solar sẽ hấp thụ toàn bộ tia sét! Vũ điệu của ngươi kết thúc tại đây!',
    },
  },
  {
    faction: 'plants',
    id: 'mission_20',
    chapter: 4,
    missionNumber: 20,
    title: 'Nhiệm Vụ 20: Cơn Thịnh Nộ Của Solar Flare (Solar Flare\'s Revenge)',
    subtitle: 'ĐẠI CHIẾN BOSS CUỐI CHAPTER 4: Bản Sao Tối Thượng Solar Flare (HP 35)',
    storyIntro:
      'Trận quyết chiến tối hậu tại trung tâm Solar Sanctum! Một bản sao hắc hóa hùng mạnh của Solar Flare với 35 HP trỗi dậy từ tâm hạch dung nham. Lời nguyền phong ấn toàn bộ Phép thuật (No Tricks allowed for Plants) — Cây Trồng chỉ có thể trông cậy vào ý chí và sức mạnh quân cờ Minion trên đài Pair Pearadise để giành chiến thắng!',
    bossHeroId: 'hero_solar_flare',
    bossHeroName: 'Solar Flare Thần Hỏa',
    bossHeroAvatar: '/assets/heroes/plants/Solar Flare.png',
    difficulty: 'boss',
    rule: {
      id: 'rule_mission_20',
      name: 'Thần Hỏa Tối Thượng & Lời Nguyền Cấm Phép (No Tricks)',
      description:
        'Solar Flare có 35 HP và nhận +2 Não/Năng lượng; Cấm Cây Trồng dùng thẻ Phép (No Tricks allowed for Plants); Làn 3 có sẵn Pair Pearadise nhân đôi Cây Trồng!',
      startingSunBonus: 2,
      startingBrainsBonus: 2,
      initialEnvironments: [
        { laneIndex: 2, environmentCardId: 'plant_pair_pearadise' },
      ],
    },
    starObjectives: [
      '⭐ Đánh bại Solar Flare Thần Hỏa (HP 35) cấm dùng Phép',
      '⭐⭐ Chinh phục cấp độ Thử Thách Khắc Nghiệt (Tier 2 Clear)',
      '⭐⭐⭐ Hoàn thành xuất sắc toàn bộ Chiến dịch Plant Chapter 4 Solar Sanctum!',
    ],
    rewards: {
      gems: 1500,
      unlocksNext: false,
      title: 'Chúa Tể Thánh Địa Ánh Dương',
    },
    comicDialogue: {
      issueTitle: 'QUYẾT CHIẾN THẦN HỎA TỐI THƯỢNG!',
      issueTagline: 'Solar Flare 35 HP bùng cháy vs Lời nguyền Cấm Phép No Tricks',
      zombieHeroQuote:
        'Nhiệt lượng vô tận từ lõi Solar Sanctum là của ta! Không một lá bài Phép nào được phép thi triển trước mặt Thần Hỏa!',
      plantHeroQuote:
        'Sức mạnh chân chính không nằm ở ảo thuật mà ở sự kiên cường của từng mầm cây! Pair Pearadise sẽ cùng ta đập tan bóng tối!',
    },
  },
]

export const ALL_CAMPAIGN_MISSIONS: CampaignMission[] = [
  ...CHAPTER_1_MISSIONS,
  ...CHAPTER_2_MISSIONS,
  ...CHAPTER_3_MISSIONS,
  ...CHAPTER_4_MISSIONS,
]

// ==========================================
// ZOMBIE CAMPAIGN - CHAPTER 1: ZOMBIE ONSLAUGHT
// ==========================================
export const ZOMBIE_CHAPTER_1_MISSIONS: CampaignMission[] = [
  {
    id: 'zombie_mission_1',
    chapter: 1,
    missionNumber: 1,
    faction: 'zombies',
    playerHeroId: 'hero_super_brainz',
    title: 'Nhiệm Vụ 1: Bắn Tỉa Trong Đêm',
    subtitle: 'Tiến công Green Shadow tại Làn Giữa',
    storyIntro:
      'Tiến sĩ Zomboss lệnh cho bạn dẫn đầu biệt đội Thây Ma đổ bộ vào sân sau của Dave! Green Shadow phục kích tại Làn Giữa với phát bắn tỉa Precision Blast. Zomboss tiếp tế cho bạn +1 Brains khởi đầu để lập tức áp đảo!',
    bossHeroId: 'hero_green_shadow',
    bossHeroName: 'Green Shadow',
    bossHeroAvatar: '/assets/heroes/plants/Green Shadow.png',
    difficulty: 'easy',
    rule: {
      id: 'zrule_mission_1',
      name: 'Năng Lượng Trí Não Tiếp Tế',
      description: 'Zomboss tiếp viện: Bạn khởi đầu trận đấu với +1 Bộ Não (Brains) ngay từ lượt 1!',
      startingBrainsBonus: 1,
      startingSunBonus: 0,
    },
    starObjectives: [
      '⭐ Chiến thắng trận đấu (Clear Mission)',
      '⭐⭐ Kết thúc trận với Zombie Hero còn từ 12 HP trở lên',
      '⭐⭐⭐ Giành thắng lợi trong vòng 8 lượt đấu',
    ],
    rewards: {
      gems: 100,
      unlocksNext: true,
      title: 'Tân Binh Zomboss',
    },
    comicDialogue: {
      issueTitle: 'BẮN TỈA TRONG ĐÊM PHẢN KÍCH!',
      issueTagline: 'Super Brainz dẫn đầu binh đoàn đột kích sân sau của Dave',
      plantHeroQuote: 'Dừng lại đó, bầy thây ma! Làn giữa là tử địa với phát bắn Precision Blast bách phát bách trúng của ta!',
      zombieHeroQuote: 'Hahaha! Siêu anh hùng Super Brainz với +1 Brains sẽ đấm vỡ sự tự tin của cô em đậu xanh!',
    },
  },
  {
    id: 'zombie_mission_2',
    chapter: 1,
    missionNumber: 2,
    faction: 'zombies',
    playerHeroId: 'hero_the_smash',
    title: 'Nhiệm Vụ 2: Mặt Trời Thiêu Đốt',
    subtitle: 'Đối đầu Solar Flare - Cơn bão ánh sáng',
    storyIntro:
      'Solar Flare dùng tia năng lượng mặt trời thiêu đốt chiến trường! Một Sunflower đã bén rễ ở Làn 1 để cung cấp thêm Sun cho cô ta, nhưng một chú Chim Cánh Cụt Thủy Quân Swabbie cũng đã mai phục sẵn dưới nước ở Làn 5!',
    bossHeroId: 'hero_solar_flare',
    bossHeroName: 'Solar Flare',
    bossHeroAvatar: '/assets/heroes/plants/Solar Flare.png',
    difficulty: 'normal',
    rule: {
      id: 'zrule_mission_2',
      name: 'Hạt Giống Nắng Vàng & Thủy Quân',
      description: 'Làn 1 có sẵn 1 Sunflower phe Cây Trồng; Làn 5 (Water) có sẵn 1 Swabbie phe Thây Ma!',
      startingBrainsBonus: 0,
      startingSunBonus: 0,
      initialMinions: [
        { laneIndex: 0, cardId: 'plant_sunflower', side: 'plants' },
        { laneIndex: 4, cardId: 'zombie_swabbie', side: 'zombies' },
      ],
    },
    starObjectives: [
      '⭐ Đập tan ngọn lửa của Solar Flare',
      '⭐⭐ Kết thúc trận với ít nhất 10 HP còn lại',
      '⭐⭐⭐ Tiêu diệt Sunflower ở Làn 1 trước lượt thứ 3',
    ],
    rewards: {
      gems: 150,
      unlocksNext: true,
      title: 'Dập Tắt Mặt Trời',
    },
    comicDialogue: {
      issueTitle: 'MẶT TRỜI THIÊU ĐỐT CHIẾN HÀO!',
      issueTagline: 'Solar Flare đốt cháy chiến trường bằng bão ánh sáng',
      plantHeroQuote: 'Mặt trời rực lửa và đóa hướng dương Sunflower sẽ thiêu rụi bầy zombie của các ngươi thành tro bụi!',
      zombieHeroQuote: 'Lửa hả? Thủy quân Swabbie từ làn nước sẽ tập kích bất ngờ và dập tắt ngọn đuốc của ngươi trong nháy mắt!',
    },
  },
  {
    id: 'zombie_mission_3',
    chapter: 1,
    missionNumber: 3,
    faction: 'zombies',
    playerHeroId: 'hero_impfinity',
    title: 'Nhiệm Vụ 3: Pháo Đài Quả Hạch',
    subtitle: 'Đối đầu Wall-Knight tại Vực Nón Bảo Vệ',
    storyIntro:
      'Wall-Knight dựng thành lũy kiên cố bằng áo giáp nón và vỏ quả hạch! Một môi trường Cone Zone (+3 HP cho Zombie) được Zomboss dựng sẵn ở Làn 2, trong khi Wall-Nut đứng chắn ở Làn 1!',
    bossHeroId: 'hero_wall_knight',
    bossHeroName: 'Wall-Knight',
    bossHeroAvatar: '/assets/heroes/plants/Wall-Knight.png',
    difficulty: 'normal',
    rule: {
      id: 'zrule_mission_3',
      name: 'Vành Đai Cone Zone & Hạch Kiên Cố',
      description: 'Làn 2 (Ground) có sẵn Cone Zone (+3 Max HP cho Zombie); Làn 1 có 1 Wall-Nut phe Cây Trồng!',
      startingBrainsBonus: 0,
      startingSunBonus: 0,
      initialEnvironments: [
        { laneIndex: 1, environmentCardId: 'zombie_cone_zone' },
      ],
      initialMinions: [
        { laneIndex: 0, cardId: 'plant_wall_nut', side: 'plants' },
      ],
    },
    starObjectives: [
      '⭐ Đập vỡ phòng tuyến Wall-Knight',
      '⭐⭐ Kết thúc trận với ít nhất 15 HP còn lại',
      '⭐⭐⭐ Giành chiến thắng trong vòng 10 lượt đấu',
    ],
    rewards: {
      gems: 200,
      unlocksNext: true,
      title: 'Kẻ Phá Thành',
    },
    comicDialogue: {
      issueTitle: 'PHÁO ĐÀI QUẢ HẠCH BẤT HOẠI!',
      issueTagline: 'Wall-Knight dựng phòng tuyến vỏ cứng kiên cố',
      plantHeroQuote: 'Phòng tuyến quả hạch kiên cố nhất lịch sử! Ngươi không tài nào xuyên thủng được lớp vỏ dày này đâu!',
      zombieHeroQuote: 'Nhìn xem đây, Zomboss đã đặt sẵn Cone Zone tăng 3 Máu cho bọn ta! Thành lũy của ngươi sẽ sụp đổ!',
    },
  },
  {
    id: 'zombie_mission_4',
    chapter: 1,
    missionNumber: 4,
    faction: 'zombies',
    playerHeroId: 'hero_rustbolt',
    title: 'Nhiệm Vụ 4: Củ Khoai Nổ Chậm',
    subtitle: 'Đối đầu Spudow - Bãi mìn chông gai',
    storyIntro:
      'Spudow rải bãi mìn Spikeweed Sector ở Làn 1 gây sát thương mỗi lượt! Tuy nhiên, Zomboss trang bị trạm Laser Base Alpha (Deadly & Strikethrough) tại Làn 3 cho phe Zombie! Bạn nhận thêm +1 Brains khởi đầu!',
    bossHeroId: 'hero_spudow',
    bossHeroName: 'Spudow',
    bossHeroAvatar: '/assets/heroes/plants/Spudow.png',
    difficulty: 'hard',
    rule: {
      id: 'zrule_mission_4',
      name: 'Chiến Hào Gai & Căn Cứ Laser',
      description: 'Làn 1 có Spikeweed Sector (Plants); Làn 3 có Laser Base Alpha (Zombies); Bạn nhận +1 Brains khởi đầu!',
      startingBrainsBonus: 1,
      startingSunBonus: 0,
      initialEnvironments: [
        { laneIndex: 0, environmentCardId: 'plant_spikeweed_sector' },
        { laneIndex: 2, environmentCardId: 'zombie_laser_base_alpha' },
      ],
    },
    starObjectives: [
      '⭐ Hạ gục Spudow trước khi bãi mìn bùng nổ',
      '⭐⭐ Không để Spudow kích hoạt Tater Toss trúng Zombie ở Làn 3',
      '⭐⭐⭐ Giành thắng lợi trong vòng 8 lượt đấu',
    ],
    rewards: {
      gems: 250,
      unlocksNext: true,
      title: 'Chuyên Gia Tháo Ngòi',
    },
    comicDialogue: {
      issueTitle: 'BÃI MÌN CHÔNG GAI SPUDOW!',
      issueTagline: 'Spudow rải bãi mìn Spikeweed Sector khắp mặt đất',
      plantHeroQuote: 'Cẩn thận bước chân đấy! Bãi mìn Spikeweed Sector của ta sẽ nổ tung bất cứ kẻ nào dám bén mảng!',
      zombieHeroQuote: 'Laser Base Alpha của ta có Deadly & Strikethrough! Đòn đánh này xuyên thẳng qua bãi mìn vào thẳng đầu ngươi!',
    },
  },
  {
    id: 'zombie_mission_5',
    chapter: 1,
    missionNumber: 5,
    faction: 'zombies',
    playerHeroId: 'hero_electric_boogaloo',
    title: 'Nhiệm Vụ 5: Đại Chiến Hàm Răng Thao Túng',
    subtitle: 'ĐẠI CHIẾN BOSS CUỐI CHAPTER 1 ZOMBIE: Chompzilla Cuồng Nộ',
    storyIntro:
      'Chompzilla há miệng nuốt chửng mọi đội hình Thây Ma! Cả hai bên đều nhận +2 Năng lượng ngay từ đầu! Một Medulla Nebula được kích hoạt tại Làn 2 và Bog of Sunken Hope tại Làn 4! Đây là trận chiến quyết định quyền kiểm soát Ngoại ô của Zomboss!',
    bossHeroId: 'hero_chompzilla',
    bossHeroName: 'Chompzilla',
    bossHeroAvatar: '/assets/heroes/plants/Chompzilla.png',
    difficulty: 'boss',
    rule: {
      id: 'zrule_mission_5',
      name: 'Đại Chiến Sinh Tử Ngoại Ô',
      description: 'Cả 2 phe nhận +2 Brains/Sun! Làn 2 có Medulla Nebula; Làn 4 có Bog of Sunken Hope!',
      startingBrainsBonus: 2,
      startingSunBonus: 2,
      initialEnvironments: [
        { laneIndex: 1, environmentCardId: 'zombie_medulla_nebula' },
        { laneIndex: 3, environmentCardId: 'plant_bog_of_sunken_hope' },
      ],
    },
    starObjectives: [
      '⭐ Đánh bại Chompzilla Cuồng Nộ',
      '⭐⭐ Kết thúc trận với Zombie Hero còn từ 15 HP trở lên',
      '⭐⭐⭐ Hoàn thành xuất sắc toàn bộ Chapter 1 Zombie: Zombie Onslaught!',
    ],
    rewards: {
      gems: 500,
      unlocksNext: false,
      title: 'Chỉ Huy Chiến Dịch Zomboss',
    },
    comicDialogue: {
      issueTitle: 'ĐẠI CHIẾN HÀM RĂNG CUỒNG NỘ!',
      issueTagline: 'Chompzilla há miệng nuốt chửng mọi đội hình Thây Ma',
      plantHeroQuote: 'GRRR... NGOẠM NGOẠM! Một phát cắn nuốt trọn cả binh đoàn Zombie! Khu vườn sẽ được thanh trừng!',
      zombieHeroQuote: 'Với 2 Năng lượng tiếp tế và Medulla Nebula, binh đoàn Zombie sẽ áp đảo trước khi ngươi kịp há mồm!',
    },
  },
]

export const ZOMBIE_CHAPTER_2_MISSIONS: CampaignMission[] = [
  {
    id: 'zombie_mission_6',
    chapter: 2,
    missionNumber: 6,
    faction: 'zombies',
    playerHeroId: 'hero_brain_freeze',
    title: 'Nhiệm Vụ 6: Bùng Cháy Năng Lượng',
    subtitle: 'Đối đầu Solar Flare - Làn sóng ánh dương vũ bão',
    storyIntro:
      'Solar Flare tăng tốc sản sinh Mặt Trời với môi trường Pair Pearadise nhân bản Cây Trồng và nhận thêm +1 Sun khởi đầu! Binh đoàn Zombie dưới sự chỉ huy của Brain Freeze phải cấp tốc dập tắt hỏa lực!',
    bossHeroId: 'hero_solar_flare',
    bossHeroName: 'Solar Flare',
    bossHeroAvatar: '/assets/heroes/plants/Solar Flare.png',
    difficulty: 'normal',
    rule: {
      id: 'zrule_mission_6',
      name: 'Ánh Dương Bùng Nổ & Nhân Bản',
      description:
        'Solar Flare có +1 Mặt Trời khởi đầu; Làn 3 (Ground) có sẵn môi trường Pair Pearadise nhân đôi Cây Trồng!',
      startingBrainsBonus: 0,
      startingSunBonus: 1,
      initialEnvironments: [
        { laneIndex: 2, environmentCardId: 'plant_pair_pearadise' },
      ],
    },
    starObjectives: [
      '⭐ Dập tắt hỏa lực của Solar Flare',
      '⭐⭐ Bảo toàn Zombie Hero còn từ 12 HP trở lên',
      '⭐⭐⭐ Tiêu diệt đối thủ trong vòng 9 lượt',
    ],
    rewards: {
      gems: 250,
      unlocksNext: true,
      title: 'Kẻ Dập Lửa',
    },
    comicDialogue: {
      issueTitle: 'BÙNG CHÁY NĂNG LƯỢNG MẶT TRỜI!',
      issueTagline: 'Solar Flare thắp sáng sân vườn bằng hỏa lực vũ bão',
      plantHeroQuote:
        'Hãy cảm nhận sức nóng của Mặt Trời! Với nguồn năng lượng dồi dào và Pair Pearadise, hoa hướng dương của ta sẽ thiêu rụi mọi Thây Ma!',
      zombieHeroQuote:
        'Cứ việc tỏa sáng đi, hoa cúc nhỏ! Kho vũ khí băng giá của Brain Freeze sẽ dập tắt ngọn lửa của ngươi!',
    },
  },
  {
    id: 'zombie_mission_7',
    chapter: 2,
    missionNumber: 7,
    faction: 'zombies',
    playerHeroId: 'hero_the_smash',
    title: 'Nhiệm Vụ 7: Pháo Đài Kiên Cố',
    subtitle: 'Đối đầu Wall-Knight - Phòng tuyến gai góc bất hoại',
    storyIntro:
      'Wall-Knight biến sân vườn thành pháo đài thép gai góc với Spikeweed Sector trên Làn Ground gây 2 sát thương cho mọi Zombie, cùng quả hạch Wall-Nut kiên cố! The Smash phải dùng sức mạnh nghiền nát bức tường!',
    bossHeroId: 'hero_wall_knight',
    bossHeroName: 'Wall-Knight',
    bossHeroAvatar: '/assets/heroes/plants/Wall-Knight.png',
    difficulty: 'normal',
    rule: {
      id: 'zrule_mission_7',
      name: 'Bãi Chông Gai & Vỏ Hạch Thép',
      description:
        'Làn 2 có sẵn Spikeweed Sector gây sát thương liên tục; Làn 1 có sẵn Wall-Nut che chắn cho Cây Trồng!',
      startingBrainsBonus: 0,
      startingSunBonus: 0,
      initialEnvironments: [
        { laneIndex: 1, environmentCardId: 'plant_spikeweed_sector' },
      ],
      initialMinions: [
        { laneIndex: 0, cardId: 'plant_wall_nut', side: 'plants' },
      ],
    },
    starObjectives: [
      '⭐ Đột phá phòng tuyến gai nhọn của Wall-Knight',
      '⭐⭐ Chiến thắng với Zombie Hero còn ít nhất 14 HP',
      '⭐⭐⭐ Hoàn tất trận đấu trong vòng 10 lượt',
    ],
    rewards: {
      gems: 300,
      unlocksNext: true,
      title: 'Công Thành Trượng',
    },
    comicDialogue: {
      issueTitle: 'PHÁO ĐÀI KIÊN CỐ BẤT KHẢ XÂM PHẠM!',
      issueTagline: 'Bãi chông gai và vỏ quả hạch ngăn bước thây ma',
      plantHeroQuote:
        'Ngươi nghĩ cơ bắp thô kệch của The Smash đập vỡ được Spikeweed Sector sao? Mỗi bước chân của ngươi sẽ nát bấy!',
      zombieHeroQuote:
        'THE SMASH ĐẬP TAN TẤT CẢ! Gai nhọn hay quả hạch rồi cũng sẽ vỡ vụn dưới nắm đấm siêu cấp!',
    },
  },
  {
    id: 'zombie_mission_8',
    chapter: 2,
    missionNumber: 8,
    faction: 'zombies',
    playerHeroId: 'hero_rustbolt',
    title: 'Nhiệm Vụ 8: Mìn Nổ Bát Ngát',
    subtitle: 'Đối đầu Spudow - Dung nham Hot Lava sôi sục',
    storyIntro:
      'Spudow kích hoạt dung nham Hot Lava trên cả 2 làn đấu (Làn 1 và Làn 3), thiêu rụi mọi sinh vật mỗi lượt! Rustbolt trang bị áo giáp hợp kim titan và +1 Brains để phá hủy khoai nổ!',
    bossHeroId: 'hero_spudow',
    bossHeroName: 'Spudow',
    bossHeroAvatar: '/assets/heroes/plants/Spudow.png',
    difficulty: 'hard',
    rule: {
      id: 'zrule_mission_8',
      name: 'Biển Lửa Hot Lava & Giáp Hợp Kim',
      description:
        'Làn 1 và Làn 3 ngập tràn dung nham Hot Lava gây sát thương mỗi lượt; Zombie khởi đầu với +1 Não (Brains)!',
      startingBrainsBonus: 1,
      startingSunBonus: 0,
      initialEnvironments: [
        { laneIndex: 0, environmentCardId: 'plant_hot_lava' },
        { laneIndex: 2, environmentCardId: 'plant_hot_lava' },
      ],
    },
    starObjectives: [
      '⭐ Chế ngự bãi mìn khoai tây nổ của Spudow',
      '⭐⭐ Bảo toàn HP Zombie Hero từ 10 trở lên',
      '⭐⭐⭐ Tiêu diệt Spudow trong vòng 8 lượt đấu',
    ],
    rewards: {
      gems: 350,
      unlocksNext: true,
      title: 'Chuyên Gia Rà Mìn',
    },
    comicDialogue: {
      issueTitle: 'MÌN NỔ BÁT NGÁT KHẮP ĐẤT TRỜI!',
      issueTagline: 'Dung nham Hot Lava thiêu đốt mọi bước tiến',
      plantHeroQuote:
        'BOOM! Dung nham sôi sục khắp nơi, ngươi bước vào đâu cũng sẽ thành món thịt nướng cháy khét!',
      zombieHeroQuote:
        'Giáp thép của Rustbolt đã tôi luyện trong lò phản ứng hạt nhân! Nhiệt độ củ khoai chẳng làm trầy nổi lớp sơn của ta!',
    },
  },
  {
    id: 'zombie_mission_9',
    chapter: 2,
    missionNumber: 9,
    faction: 'zombies',
    playerHeroId: 'hero_electric_boogaloo',
    title: 'Nhiệm Vụ 9: Đầm Lầy Nuốt Chửng',
    subtitle: 'Đối đầu Chompzilla - Hành tinh bắt ruồi Venus',
    storyIntro:
      'Chompzilla thiết lập môi trường Venus Flytrap Planet hồi máu liên tục mỗi khi Cây Trồng tấn công! Electric Boogaloo khởi đầu với +1 Não và điệu nhảy disco bốc lửa để thiêu rụi đầm lầy!',
    bossHeroId: 'hero_chompzilla',
    bossHeroName: 'Chompzilla',
    bossHeroAvatar: '/assets/heroes/plants/Chompzilla.png',
    difficulty: 'hard',
    rule: {
      id: 'zrule_mission_9',
      name: 'Đầm Lầy Venus & Nhịp Điệu Disco',
      description:
        'Làn 2 có sẵn Venus Flytrap Planet giúp Cây Trồng hồi Máu mỗi khi đánh trúng mục tiêu; Zombie khởi đầu +1 Não!',
      startingBrainsBonus: 1,
      startingSunBonus: 0,
      initialEnvironments: [
        { laneIndex: 1, environmentCardId: 'plant_venus_flytrap_planet' },
      ],
    },
    starObjectives: [
      '⭐ Đè bẹp khả năng hồi máu thần tốc của Chompzilla',
      '⭐⭐ Kết thúc trận với Zombie Hero còn ít nhất 12 HP',
      '⭐⭐⭐ Đánh bại Chompzilla trong vòng 10 lượt',
    ],
    rewards: {
      gems: 400,
      unlocksNext: true,
      title: 'Kẻ Diệt Thực Vật',
    },
    comicDialogue: {
      issueTitle: 'ĐẦM LẦY NUỐT CHỬNG BẤT TẬN!',
      issueTagline: 'Venus Flytrap Planet hồi sinh sinh lực vô hạn',
      plantHeroQuote:
        'Mỗi cú cắn của ta trên mảnh đất Venus này đều hồi phục sinh lực dồi dào! Binh đoàn của ngươi sẽ làm mồi dinh dưỡng!',
      zombieHeroQuote:
        'Hãy lắc lư theo điệu nhảy sấm sét! Dòng điện 1 triệu volt của Electric Boogaloo sẽ nướng chín cây ăn thịt của ngươi!',
    },
  },
  {
    id: 'zombie_mission_10',
    chapter: 2,
    missionNumber: 10,
    faction: 'zombies',
    playerHeroId: 'hero_zmech',
    title: 'Nhiệm Vụ 10: Bức Tường Bất Khả Xâm Phạm',
    subtitle: 'Đại chiến Boss Citron - Lá chắn Peel Shield & Thủy chiến',
    storyIntro:
      'Boss tối thượng Citron đến từ tương lai kích hoạt lá chắn năng lượng Peel Shield và triển khai Đậu Hải Quân (Admiral Navy Bean) trên làn Nước! Z-Mech cùng kho tên lửa tối tân của Zomboss khởi đầu với +2 Não để tung đòn hủy diệt!',
    bossHeroId: 'hero_citron',
    bossHeroName: 'Citron',
    bossHeroAvatar: '/assets/heroes/plants/Citron.png',
    difficulty: 'boss',
    rule: {
      id: 'zrule_mission_10',
      name: 'Lá Chắn Năng Lượng & Thủy Chiến Tương Lai',
      description:
        'Làn Nước có 1 Admiral Navy Bean án ngữ; Z-Mech khởi đầu với +2 Não (Brains) từ kho hỏa lực Zomboss!',
      startingBrainsBonus: 2,
      startingSunBonus: 0,
      initialMinions: [
        { laneIndex: 4, cardId: 'plant_admiral_navy_bean', side: 'plants' },
      ],
    },
    starObjectives: [
      '⭐ Đập tan lá chắn tối thượng của Boss Citron',
      '⭐⭐ Kết thúc trận với Zombie Hero còn ít nhất 15 HP',
      '⭐⭐⭐ Hoàn thành xuất sắc toàn bộ Chiến dịch Zombie Chapter 2!',
    ],
    rewards: {
      gems: 1000,
      unlocksNext: true,
      title: 'Chúa Tể Thây Ma Vũ Trụ',
    },
    comicDialogue: {
      issueTitle: 'BỨC TƯỜNG BẤT KHẢ XÂM PHẠM!',
      issueTagline: 'Đại chiến chung kết: Z-Mech hủy diệt vs Citron tương lai',
      plantHeroQuote:
        'Lá chắn Peel Shield đã sẵn sàng! Hải quân Đậu của ta kiểm soát hoàn toàn làn nước! Tương lai không có chỗ cho Thây Ma!',
      zombieHeroQuote:
        'Hỏa tiễn Z-Mech khóa mục tiêu! Toàn bộ kho vũ khí hủy diệt Zomboss khai hỏa! Trận địa của ngươi sẽ thành tro bụi!',
    },
  },
]

export const ZOMBIE_CHAPTER_3_MISSIONS: CampaignMission[] = [
  {
    id: 'zombie_mission_11',
    chapter: 3,
    missionNumber: 11,
    faction: 'zombies',
    playerHeroId: 'hero_the_smash',
    title: 'Nhiệm Vụ 11: Nắm Đấm Cỏ Cây Nổi Loạn',
    subtitle: 'Đối đầu Grass Knuckles - Nắm Đấm Thép',
    storyIntro:
      'Grass Knuckles chặn đường hành quân của Thây Ma bằng nắm đấm thép! Zomboss lập tức triển khai trạm Area 22 (+2/+2 & Frenzy) tại Làn 3 cho The Smash để đập tan mọi chướng ngại vật!',
    bossHeroId: 'hero_grass_knuckles',
    bossHeroName: 'Grass Knuckles',
    bossHeroAvatar: '/assets/heroes/plants/Grass Knuckles.png',
    difficulty: 'normal',
    rule: {
      id: 'zrule_mission_11',
      name: 'Khu Vực Area 22 & Nắm Đấm Thép',
      description:
        'Làn 3 (Ground) có sẵn Area 22 (+2/+2 & Frenzy cho Thây Ma); Bạn nhận +1 Não (Brains) khởi đầu!',
      startingBrainsBonus: 1,
      startingSunBonus: 0,
      initialEnvironments: [
        { laneIndex: 2, environmentCardId: 'zombie_area_22' },
      ],
    },
    starObjectives: [
      '⭐ Đập tan nắm đấm của Grass Knuckles',
      '⭐⭐ Kết thúc trận với Zombie Hero còn ít nhất 12 HP',
      '⭐⭐⭐ Giành chiến thắng trong vòng 8 lượt đấu',
    ],
    rewards: {
      gems: 300,
      unlocksNext: true,
      title: 'Nắm Đấm Vô Địch',
    },
    comicDialogue: {
      issueTitle: 'ĐẠI CHIẾN NẮM ĐẤM THÉP!',
      issueTagline: 'The Smash cuồng nộ vs Grass Knuckles cơ bắp',
      plantHeroQuote:
        'Nắm đấm của Grass Knuckles đấm bay mọi đội quân xác sống! Các ngươi không vượt qua được bức tường này!',
      zombieHeroQuote:
        'Graaaagh! Area 22 ban tặng sức mạnh Frenzy cuồng bạo! Nắm đấm của The Smash sẽ nghiền nát tất cả!',
    },
  },
  {
    id: 'zombie_mission_12',
    chapter: 3,
    missionNumber: 12,
    faction: 'zombies',
    playerHeroId: 'hero_immorticia',
    title: 'Nhiệm Vụ 12: Đóa Hoa Hồng Gai Ma Thuật',
    subtitle: 'Đối đầu Rose - Phù Thủy Gai Góc',
    storyIntro:
      'Phù thủy Rose giăng bẫy gai Spikeweed Sector tại Làn 1 biến đổi mọi sinh linh! Immorticia đáp trả bằng trạm Laser Base Alpha (Deadly & Strikethrough) tại Làn 3!',
    bossHeroId: 'hero_rose',
    bossHeroName: 'Rose',
    bossHeroAvatar: '/assets/heroes/plants/Rose.png',
    difficulty: 'hard',
    rule: {
      id: 'zrule_mission_12',
      name: 'Vườn Gai Ma Thuật & Căn Cứ Laser Base Alpha',
      description:
        'Làn 1 có Spikeweed Sector; Làn 3 có Laser Base Alpha (Deadly & Strikethrough); Cả 2 phe nhận +1 Năng lượng!',
      startingBrainsBonus: 1,
      startingSunBonus: 1,
      initialEnvironments: [
        { laneIndex: 0, environmentCardId: 'plant_spikeweed_sector' },
        { laneIndex: 2, environmentCardId: 'zombie_laser_base_alpha' },
      ],
    },
    starObjectives: [
      '⭐ Giải trừ ma thuật biến hình của Rose',
      '⭐⭐ Bảo toàn lượng máu của Zombie Hero từ 14 HP trở lên',
      '⭐⭐⭐ Giành chiến thắng trong vòng 8 lượt đấu',
    ],
    rewards: {
      gems: 350,
      unlocksNext: true,
      title: 'Pháp Sư Tối Thượng',
    },
    comicDialogue: {
      issueTitle: 'MA THUẬT HOA HỒNG GAI!',
      issueTagline: 'Cuộc đấu pháp thuật giữa Immorticia và Rose',
      plantHeroQuote:
        'Ma thuật biến hình Goatify của ta sẽ biến những xác sống hung hãn nhất thành những chú dê hiền lành!',
      zombieHeroQuote:
        'Tia laser chết chóc từ Laser Base Alpha kết hợp cùng bầy dơi đêm sẽ xé toạc tấm màn nhung ảo thuật của ngươi!',
    },
  },
  {
    id: 'zombie_mission_13',
    chapter: 3,
    missionNumber: 13,
    faction: 'zombies',
    playerHeroId: 'hero_super_brainz',
    title: 'Nhiệm Vụ 13: Cây Nấm Bóng Đêm Sát Thủ',
    subtitle: 'Đối đầu Nightcap - Ninja Nấm Ninja',
    storyIntro:
      'Ninja Nấm Nightcap cùng bầy Astro-Shroom phục kích tại Làn 1 xả đạn Bullseye liên tục! Zomboss lập tức thiết lập trạm Moon Base Z (Overshoot 3) tại Làn 2 để phản công dữ dội!',
    bossHeroId: 'hero_nightcap',
    bossHeroName: 'Nightcap',
    bossHeroAvatar: '/assets/heroes/plants/Nightcap.png',
    difficulty: 'hard',
    rule: {
      id: 'zrule_mission_13',
      name: 'Rừng Nấm Sát Thủ & Trạm Mặt Trăng Moon Base Z',
      description:
        'Làn 1 có 1 Astro-Shroom phe Cây Trồng; Làn 2 có sẵn Moon Base Z (Overshoot 3 cho Zombie); Bạn nhận +1 Não khởi đầu!',
      startingBrainsBonus: 1,
      startingSunBonus: 0,
      initialEnvironments: [
        { laneIndex: 1, environmentCardId: 'zombie_moon_base_z' },
      ],
      initialMinions: [
        { laneIndex: 0, cardId: 'plant_astro_shroom', side: 'plants' },
      ],
    },
    starObjectives: [
      '⭐ Bắt sống Ninja Nấm Nightcap',
      '⭐⭐ Kết thúc trận với Zombie Hero còn ít nhất 12 HP',
      '⭐⭐⭐ Giành thắng lợi trong vòng 8 lượt đấu',
    ],
    rewards: {
      gems: 400,
      unlocksNext: true,
      title: 'Bóng Ma Vô Ảnh',
    },
    comicDialogue: {
      issueTitle: 'BÓNG ĐÊM NINJA NẤM!',
      issueTagline: 'Ám sát trong sương mù vs Pháo bắn tỉa Moon Base Z',
      plantHeroQuote:
        'Trong bóng tối, không ai nghe thấy tiếng ngươi kêu cứu! Đạn Bullseye của Astro-Shroom sẽ xuyên thủng mọi giáp trụ!',
      zombieHeroQuote:
        'Hahaha! Siêu anh hùng Super Brainz bay vút lên bầu trời với Moon Base Z! Đòn Overshoot sẽ thiêu rụi cả khu rừng nấm!',
    },
  },
  {
    id: 'zombie_mission_14',
    chapter: 3,
    missionNumber: 14,
    faction: 'zombies',
    playerHeroId: 'hero_rustbolt',
    title: 'Nhiệm Vụ 14: Ngọn Lửa Cuồng Bạo',
    subtitle: 'Đối đầu Captain Combustible - Ngọn Lửa Bùng Nổ',
    storyIntro:
      'Captain Combustible bùng cháy với Red Plant-It (+5/+5) tại Làn 1 sẵn sàng thiêu rụi tất cả! Rustbolt kích hoạt mạng lưới Medulla Nebula tại Làn 2 để tích trữ Brains không giới hạn phản kích!',
    bossHeroId: 'hero_captain_combustible',
    bossHeroName: 'Captain Combustible',
    bossHeroAvatar: '/assets/heroes/plants/Captain Combustible.png',
    difficulty: 'hard',
    rule: {
      id: 'zrule_mission_14',
      name: 'Bão Lửa Red Plant-It & Mạng Lưới Medulla',
      description:
        'Làn 1 có Red Plant-It (+5/+5 cho Cây Trồng); Làn 2 có Medulla Nebula (+2 Brains cho Zombie); Cả hai bên khởi đầu +2 Năng lượng!',
      startingBrainsBonus: 2,
      startingSunBonus: 2,
      initialEnvironments: [
        { laneIndex: 0, environmentCardId: 'plant_red_plant_it' },
        { laneIndex: 1, environmentCardId: 'zombie_medulla_nebula' },
      ],
    },
    starObjectives: [
      '⭐ Dập tắt cơn cuồng nộ của Captain Combustible',
      '⭐⭐ Giữ vững Zombie Hero với ít nhất 15 HP còn lại',
      '⭐⭐⭐ Tiêu diệt Captain Combustible trước lượt 8',
    ],
    rewards: {
      gems: 500,
      unlocksNext: true,
      title: 'Kẻ Dập Lửa Vĩ Đại',
    },
    comicDialogue: {
      issueTitle: 'BÃO LỬA BÙNG NỔ CUỒNG LOẠN!',
      issueTagline: 'Captain Combustible bùng cháy dữ dội trên Red Plant-It',
      plantHeroQuote:
        'Ta đang bốc cháy với sức mạnh cuồng nộ vô tận! Red Plant-It biến mỗi đòn tấn công thành thảm họa hủy diệt!',
      zombieHeroQuote:
        'Giáp titan của Rustbolt cách nhiệt hoàn hảo! Medulla Nebula cấp năng lượng dồi dào, ta sẽ dập tắt ngọn lửa của ngươi!',
    },
  },
  {
    id: 'zombie_mission_15',
    chapter: 3,
    missionNumber: 15,
    faction: 'zombies',
    playerHeroId: 'hero_huge_gigantacus',
    title: 'Nhiệm Vụ 15: Cà Rốt Không Gian Tối Cao',
    subtitle: 'ĐẠI CHIẾN BOSS CUỐI CHAPTER 3 ZOMBIE: Beta-Carrotina Tối Thượng',
    storyIntro:
      'Đại tướng không gian Beta-Carrotina kích hoạt lá chắn bất hoại Force Field tại Làn 1 bảo vệ trạm chỉ huy! Huge-Gigantacus dẫn đầu hạm đội Zomboss với Laser Base Alpha tại Làn 3 mở ra trận chiến tối thượng chiếm lĩnh dải ngân hà!',
    bossHeroId: 'hero_beta_carrotina',
    bossHeroName: 'Beta-Carrotina',
    bossHeroAvatar: '/assets/heroes/plants/Beta-Carrotina.png',
    difficulty: 'boss',
    rule: {
      id: 'zrule_mission_15',
      name: 'Lá Chắn Force Field & Căn Cứ Hư Không Laser Base Alpha',
      description:
        'Làn 1 có Force Field (Cây Trồng bất tử!); Làn 3 có Laser Base Alpha (Deadly & Strikethrough); Zombie nhận +3 Não, Cây nhận +2 Mặt trời!',
      startingBrainsBonus: 3,
      startingSunBonus: 2,
      initialEnvironments: [
        { laneIndex: 0, environmentCardId: 'plant_force_field' },
        { laneIndex: 2, environmentCardId: 'zombie_laser_base_alpha' },
      ],
    },
    starObjectives: [
      '⭐ Chinh phục trạm không gian của Beta-Carrotina',
      '⭐⭐ Kết thúc trận chiến với Zombie Hero còn từ 15 HP trở lên',
      '⭐⭐⭐ Hoàn thành xuất sắc toàn bộ Chiến dịch Zombie Chapter 3!',
    ],
    rewards: {
      gems: 1200,
      unlocksNext: true,
      title: 'Chúa Tể Đa Vũ Trụ Thây Ma',
    },
    comicDialogue: {
      issueTitle: 'ĐẠI CHIẾN NGÂN HÀ BETA-CARROTINA!',
      issueTagline: 'Trận chiến đỉnh cao vũ trụ: Khiên Bất Tử vs Laser Base Alpha',
      plantHeroQuote:
        'Lá chắn Force Field bảo vệ hạt giống tương lai của nhân loại! Không một Thây Ma nào được phép bước vào không gian!',
      zombieHeroQuote:
        'Hahaha! Hạm đội Huge-Gigantacus đã bao vây toàn bộ trạm không gian! Laser Base Alpha sẽ bốc hơi bức tường của ngươi!',
    },
  },
]

export const ZOMBIE_CHAPTER_4_MISSIONS: CampaignMission[] = [
  {
    faction: 'zombies',
    id: 'zombie_mission_16',
    chapter: 4,
    missionNumber: 16,
    title: "Nhiệm Vụ 16: Pháo Đài Nước Quả Cam (Citron's Water Fortress)",
    subtitle: 'Đối đầu Citron tại Vịnh Cướp Biển - Thủy Quân Đột Kích',
    storyIntro:
      'Tiến vào Vịnh Cướp Biển (Pirate Seas), Đại tướng Citron lập phòng tuyến mai rùa kiên cố bảo vệ Làn 5 (Water)! Neptuna và binh đoàn Zombie lập tức điều động thủy thủ Swabbie lội nước áp sát, tận dụng đầm lầy Bog of Sunken Hope để bóc sạch lớp vỏ cam giáp sắt!',
    bossHeroId: 'hero_citron',
    bossHeroName: 'Citron',
    bossHeroAvatar: '/assets/heroes/plants/Citron.png',
    difficulty: 'normal',
    rule: {
      id: 'zrule_mission_16',
      name: 'Vịnh Cướp Biển & Thủy Quân Đột Kích',
      description:
        'Làn 5 (Water) có sẵn Swabbie (Amphibious); Làn 1 có Bog of Sunken Hope (+2 Tấn công cho Amphibious); Zombie nhận +1 Não khởi đầu!',
      startingBrainsBonus: 1,
      startingSunBonus: 0,
      initialEnvironments: [
        { laneIndex: 0, environmentCardId: 'plant_bog_of_sunken_hope' },
      ],
      initialMinions: [
        { laneIndex: 4, cardId: 'zombie_swabbie', side: 'zombies' },
      ],
    },
    starObjectives: [
      '⭐ Đột phá pháo đài nước của Citron',
      '⭐⭐ Kết thúc trận với Zombie Hero còn từ 14 HP trở lên',
      '⭐⭐⭐ Giành thắng lợi trong vòng 8 lượt đấu (≤ 8 turns)',
    ],
    rewards: {
      gems: 400,
      unlocksNext: true,
      title: 'Hải Tặc Vịnh Cướp Biển',
    },
    comicDialogue: {
      issueTitle: 'THỦY CHIẾN VỊNH CƯỚP BIỂN!',
      issueTagline: 'Binh đoàn cướp biển Sneaky vs Khiên năng lượng kiên cố Citron',
      plantHeroQuote:
        'Lớp giáp Peel Shield và pháo đài nước của ta bất khả xâm phạm! Không một tên cướp biển nào có thể vượt qua Làn 5!',
      zombieHeroQuote:
        'Hahaha! Thủy thủ Swabbie của ta bơi lội tự do dưới nước! Vỏ cam bọc thép của ngươi sẽ bị đập tan tành!',
    },
  },
  {
    faction: 'zombies',
    id: 'zombie_mission_17',
    chapter: 4,
    missionNumber: 17,
    title: "Nhiệm Vụ 17: Phù Thủy Băng Giá (Rose's Frosty Curse)",
    subtitle: 'Đối đầu Rose - Lời Nguyền Hóa Dê & Sương Băng',
    storyIntro:
      'Nữ phù thủy Rose giăng bẫy sương mù đóng băng và phù phép biến hình Zombie thành dê con vô hại! Binh đoàn Zombie kích hoạt Laser Base Alpha trang bị Deadly và Strikethrough để xuyên thủng bùa chú hoa hồng!',
    bossHeroId: 'hero_rose',
    bossHeroName: 'Rose',
    bossHeroAvatar: '/assets/heroes/plants/Rose.png',
    difficulty: 'normal',
    rule: {
      id: 'zrule_mission_17',
      name: 'Lời Nguyền Biến Hình & Trận Địa Laser Base Alpha',
      description:
        'Làn 2 có Laser Base Alpha (Deadly & Strikethrough); Làn 3 có Snow Pea của Cây Trồng; Zombie nhận +1 Não khởi đầu!',
      startingBrainsBonus: 1,
      startingSunBonus: 0,
      initialEnvironments: [
        { laneIndex: 1, environmentCardId: 'zombie_laser_base_alpha' },
      ],
      initialMinions: [
        { laneIndex: 2, cardId: 'plant_snow_pea', side: 'plants' },
      ],
    },
    starObjectives: [
      '⭐ Hóa giải ma thuật đóng băng của Phù Thủy Rose',
      '⭐⭐ Bảo toàn lượng máu Zombie Hero từ 12 HP trở lên',
      '⭐⭐⭐ Giành chiến thắng trong vòng 7 lượt đấu (≤ 7 turns)',
    ],
    rewards: {
      gems: 450,
      unlocksNext: true,
      title: 'Khắc Tinh Ma Thuật Băng',
    },
    comicDialogue: {
      issueTitle: 'BÙA CHÚ BĂNG GIÁ HOA HỒNG!',
      issueTagline: 'Rose phù phép hóa dê Goatify vs Đột kích Deadly Laser Base Alpha',
      plantHeroQuote:
        'Biến hình Goatify và đạn băng tuyết sẽ biến cả đoàn quân Zombie thành những khối băng bất động!',
      zombieHeroQuote:
        'Tia laser Deadly từ Laser Base Alpha sẽ bốc hơi mọi khối băng! Mùi hoa hồng ma thuật sắp tàn rồi!',
    },
  },
  {
    faction: 'zombies',
    id: 'zombie_mission_18',
    chapter: 4,
    missionNumber: 18,
    title: "Nhiệm Vụ 18: Rừng Nấm Độc Ninja (Nightcap's Mushroom Swarm)",
    subtitle: 'Đối đầu Nightcap - Bão Đạn Nấm Độc Bullseye',
    storyIntro:
      'Ninja Nightcap triệu tập binh đoàn Nấm Độc Astro-Shroom phục kích xả đạn Bullseye không kích hoạt Block Meter! Binh đoàn Zombie thiết lập vùng đột biến Area 22 ban tặng Frenzy và +2/+2 càn quét sạch rừng nấm!',
    bossHeroId: 'hero_nightcap',
    bossHeroName: 'Nightcap',
    bossHeroAvatar: '/assets/heroes/plants/Nightcap.png',
    difficulty: 'hard',
    rule: {
      id: 'zrule_mission_18',
      name: 'Rừng Nấm Độc & Vùng Đột Biến Area 22',
      description:
        'Làn 2 có Area 22 (+2/+2 & Frenzy cho Zombie); Làn 1 có sẵn Astro-Shroom (Bullseye); Cả hai bên nhận +1 Năng lượng khởi đầu!',
      startingBrainsBonus: 1,
      startingSunBonus: 1,
      initialEnvironments: [
        { laneIndex: 1, environmentCardId: 'zombie_area_22' },
      ],
      initialMinions: [
        { laneIndex: 0, cardId: 'plant_astro_shroom', side: 'plants' },
      ],
    },
    starObjectives: [
      '⭐ Quét sạch rừng nấm độc của Ninja Nightcap',
      '⭐⭐ Giữ vững lượng máu Zombie Hero từ 12 HP trở lên',
      '⭐⭐⭐ Giành chiến thắng chớp nhoáng trong vòng 6 lượt đấu (≤ 6 turns)',
    ],
    rewards: {
      gems: 500,
      unlocksNext: true,
      title: 'Sát Thủ Bóng Đêm',
    },
    comicDialogue: {
      issueTitle: 'BÃI MÌN NẤM ĐỘC VÔ ẢNH!',
      issueTagline: 'Nightcap ám toán Bullseye vs Đột biến cuồng loạn Area 22',
      plantHeroQuote:
        'Trong bóng đêm, đàn nấm Astro-Shroom sẽ bắn tỉa Bullseye không cho đối thủ một cơ hội đỡ đòn nào!',
      zombieHeroQuote:
        'Hehehe! Khu vực Area 22 biến binh đoàn Zombie thành cỗ máy Frenzy xé toạc từng cây nấm ninja!',
    },
  },
  {
    faction: 'zombies',
    id: 'zombie_mission_19',
    chapter: 4,
    missionNumber: 19,
    title: "Nhiệm Vụ 19: Nắm Đấm Khủng Long (Grass Knuckles' Dino Strike)",
    subtitle: 'Đối đầu Grass Knuckles - Nắm Đấm Thép & Cường Lực Tăng Trưởng',
    storyIntro:
      'Võ sĩ cơ bắp Grass Knuckles cùng đậu đen Black-Eyed Pea tăng trưởng sức mạnh sau mỗi Trick của Zombie! Binh đoàn Zombie kích hoạt trạm hỏa tiễn Moon Base Z với Overshoot 3 bắn phá thẳng vào Hero đối phương!',
    bossHeroId: 'hero_grass_knuckles',
    bossHeroName: 'Grass Knuckles',
    bossHeroAvatar: '/assets/heroes/plants/Grass Knuckles.png',
    difficulty: 'hard',
    rule: {
      id: 'zrule_mission_19',
      name: 'Nắm Đấm Thép & Pháo Kích Moon Base Z',
      description:
        'Làn 3 có Moon Base Z (Overshoot 3 cho Zombie); Làn 2 có Black-Eyed Pea tăng sức mạnh; Zombie nhận +2 Não, Cây Trồng nhận +1 Sun!',
      startingBrainsBonus: 2,
      startingSunBonus: 1,
      initialEnvironments: [
        { laneIndex: 2, environmentCardId: 'zombie_moon_base_z' },
      ],
      initialMinions: [
        { laneIndex: 1, cardId: 'plant_black_eyed_pea', side: 'plants' },
      ],
    },
    starObjectives: [
      '⭐ Hạ gục võ sĩ cơ bắp Grass Knuckles',
      '⭐⭐ Kết thúc trận chiến với Zombie Hero còn từ 15 HP trở lên',
      '⭐⭐⭐ Giành thắng lợi trong vòng 8 lượt đấu (≤ 8 turns)',
    ],
    rewards: {
      gems: 600,
      unlocksNext: true,
      title: 'Bá Chủ Đấu Trường Thép',
    },
    comicDialogue: {
      issueTitle: 'TIẾNG GẦM ĐẤU TRƯỜNG THÉP!',
      issueTagline: 'Grass Knuckles đấm thép vs Pháo Overshoot Moon Base Z',
      plantHeroQuote:
        'Nắm đấm Power Pummel và hạt đậu tăng trưởng Black-Eyed Pea sẽ nghiền nát mọi kế hoạch của lũ xác sống!',
      zombieHeroQuote:
        'Graaaagh! Trạm pháo Moon Base Z với Overshoot 3 sẽ oanh tạc thẳng vào mặt ngươi trước khi ngươi kịp ra đòn!',
    },
  },
  {
    faction: 'zombies',
    id: 'zombie_mission_20',
    chapter: 4,
    missionNumber: 20,
    title: "Nhiệm Vụ 20: Đại Quyết Chiến Mặt Trời Rực Lửa (Solar Flare's Inferno)",
    subtitle: 'ĐẠI CHIẾN BOSS CUỐI CHAPTER 4 ZOMBIE: Solar Flare Thần Hỏa Tối Thượng (HP 38)',
    storyIntro:
      'Trận huyết chiến định đoạt số phận Vịnh Cướp Biển & toàn cõi Zombie! Solar Flare Thần Hỏa trỗi dậy với lượng HP khổng lồ 38 HP, rải dung nham Hot Lava thiêu rụi mặt đất và kích hoạt Sunburn liên hoàn! Zomboss trang bị trạm Laser Base Alpha cực mạnh cho Zombie. Trận đại chiến lịch sử giữa Lửa Thiêng và Binh Đoàn Thây Ma!',
    bossHeroId: 'hero_solar_flare',
    bossHeroName: 'Solar Flare Thần Hỏa Tối Thượng',
    bossHeroAvatar: '/assets/heroes/plants/Solar Flare.png',
    difficulty: 'boss',
    rule: {
      id: 'zrule_mission_20',
      name: 'Bão Lửa Hot Lava & Trận Địa Laser Căn Cứ Alpha',
      description:
        'Solar Flare khởi đầu với 38 HP và nhận +2 Năng lượng; Làn 1 có Hot Lava; Làn 3 có Laser Base Alpha (Deadly & Strikethrough); Zombie nhận +3 Não khởi đầu!',
      startingBrainsBonus: 3,
      startingSunBonus: 2,
      initialEnvironments: [
        { laneIndex: 0, environmentCardId: 'plant_hot_lava' },
        { laneIndex: 2, environmentCardId: 'zombie_laser_base_alpha' },
      ],
    },
    starObjectives: [
      '⭐ Dập tắt ngọn lửa thần của Solar Flare (HP 38)',
      '⭐⭐ Kết thúc trận chiến với Zombie Hero còn từ 15 HP trở lên',
      '⭐⭐⭐ Hoàn thành xuất sắc toàn bộ Chiến dịch Zombie Chapter 4!',
    ],
    rewards: {
      gems: 1500,
      unlocksNext: false,
      title: 'Chúa Tể Cướp Biển Đột Kích',
    },
    comicDialogue: {
      issueTitle: 'ĐẠI HUYẾT CHIẾN BÃO LỬA MẶT TRỜI!',
      issueTagline: 'Trận chiến tối hậu: Bão Lửa Hot Lava vs Hạm Đội Laser Base Alpha',
      plantHeroQuote:
        'Ngọn lửa thần mặt trời 38 HP sẽ thiêu rụi toàn bộ hạm đội cướp biển và đưa lũ xác sống trở về cát bụi!',
      zombieHeroQuote:
        'Hahaha! Binh đoàn Zombie không biết sợ hãi! Laser Base Alpha sẽ bốc hơi đài dung nham và cắm cờ Thây Ma!',
    },
  },
]

export const ALL_ZOMBIE_CAMPAIGN_MISSIONS: CampaignMission[] = [
  ...ZOMBIE_CHAPTER_1_MISSIONS,
  ...ZOMBIE_CHAPTER_2_MISSIONS,
  ...ZOMBIE_CHAPTER_3_MISSIONS,
  ...ZOMBIE_CHAPTER_4_MISSIONS,
]

export interface CampaignChapter {
  id: number
  title: string
  subtitle: string
  description: string
  badgeText: string
  missions: CampaignMission[]
}

export const CAMPAIGN_CHAPTERS: CampaignChapter[] = [
  {
    id: 1,
    title: 'KHỦNG HOẢNG NGOẠI Ô (SUBURBAN CRISIS)',
    subtitle: 'Chapter 1: Bảo vệ khu phố bình yên',
    description:
      'Tiến sĩ Zomboss đã phái 5 tướng lĩnh Zombie sừng sỏ nhất tràn vào khu phố ngoại ô! Hãy sát cánh cùng Dave và các chiến binh Cây Trồng để đập tan âm mưu thôn tính sân vườn!',
    badgeText: 'CHAPTER 1',
    missions: CHAPTER_1_MISSIONS,
  },
  {
    id: 2,
    title: 'ĐÔ THỊ ZOMBIE (ZOMBIE METROPOLIS)',
    subtitle: 'Chapter 2: Đột kích hang ổ công nghệ cao',
    description:
      'Chiến trường chuyển dịch đến trung tâm Đô thị Zombie Metropolis! Z-Mech, Immorticia, Brain Freeze, Electric Boogaloo và Rustbolt Tối Thượng với kho vũ khí hủy diệt đang chờ đón bạn!',
    badgeText: 'CHAPTER 2',
    missions: CHAPTER_2_MISSIONS,
  },
  {
    id: 3,
    title: 'CHIẾN TRƯỜNG ĐA VŨ TRỤ (GALACTIC MULTIVERSE)',
    subtitle: 'Chapter 3: Trận quyết chiến ngoài không gian',
    description:
      'Tiến vào dải ngân hà đối đầu các siêu trùm Zombie tối thượng: Giáo sư Brainstorm, Nữ chúa Immorticia, Pháo đài Rustbolt, Siêu nhân Super Brainz và Cỗ máy Z-Mech!',
    badgeText: 'CHAPTER 3',
    missions: CHAPTER_3_MISSIONS,
  },
  {
    id: 4,
    title: 'THÁNH ĐỊA ÁNH DƯƠNG (SOLAR SANCTUM)',
    subtitle: 'Chapter 4: Khai phá cội nguồn ánh sáng mặt trời',
    description:
      'Bảo vệ Thánh Địa Ánh Dương thiêng liêng trước Zombie Bossbot, bầy quỷ Imp phục kích, đấu trường thảm gai Super Brainz, sát thủ xuyên thấu Boogaloo và bản sao hắc hóa Solar Flare tối thượng!',
    badgeText: 'CHAPTER 4',
    missions: CHAPTER_4_MISSIONS,
  },
]

export const ZOMBIE_CAMPAIGN_CHAPTERS: CampaignChapter[] = [
  {
    id: 1,
    title: 'TIẾN CÔNG NGOẠI Ô (ZOMBIE ONSLAUGHT)',
    subtitle: 'Chapter 1: Đột kích sân vườn và nhà Dave',
    description:
      'Lãnh đạo binh đoàn Zombie dưới quyền chỉ huy tối cao của Tiến sĩ Zomboss! Tiêu diệt các chỉ huy Cây Trồng Green Shadow, Solar Flare, Wall-Knight, Spudow và Chompzilla để cắm cờ Zombie!',
    badgeText: 'ZOMBIE CH. 1',
    missions: ZOMBIE_CHAPTER_1_MISSIONS,
  },
  {
    id: 2,
    title: 'CHIẾN TUYẾN TƯƠNG LAI (FUTURE CITADEL)',
    subtitle: 'Chapter 2: Đột phá thành lũy công nghệ cao',
    description:
      'Quân đoàn Zombie tiến vào pháo đài tương lai Future Citadel! Đối đầu với Solar Flare ánh dương, Wall-Knight bãi chông, Spudow biển lửa, Chompzilla hồi máu và Đại tướng Citron tối thượng!',
    badgeText: 'ZOMBIE CH. 2',
    missions: ZOMBIE_CHAPTER_2_MISSIONS,
  },
  {
    id: 3,
    title: 'CHINH PHỤC ĐA VŨ TRỤ (MULTIVERSE CONQUEST)',
    subtitle: 'Chapter 3: Đánh chiếm trạm không gian vũ trụ',
    description:
      'Quân đoàn Zombie đổ bộ vào trạm không gian! Đập tan võ đài Grass Knuckles, ma thuật hoa hồng Rose, ninja Nightcap, ngọn lửa Captain Combustible và Đại tướng Beta-Carrotina Tối Thượng!',
    badgeText: 'ZOMBIE CH. 3',
    missions: ZOMBIE_CHAPTER_3_MISSIONS,
  },
  {
    id: 4,
    title: 'VỊNH CƯỚP BIỂN & ĐỘT KÍCH (PIRATE SEAS & SNEAKY SABOTAGE)',
    subtitle: 'Chapter 4: Thủy chiến và đột kích lén lút',
    description:
      'Chỉ huy hạm đội Zombie đổ bộ vào Vịnh Cướp Biển! Đột phá pháo đài nước Citron, hóa giải bùa chú Rose, càn quét rừng nấm độc Nightcap, đập tan võ đài Grass Knuckles và quyết chiến Trùm Cuối Solar Flare Thần Hỏa!',
    badgeText: 'ZOMBIE CH. 4',
    missions: ZOMBIE_CHAPTER_4_MISSIONS,
  },
]

export const CAMPAIGN_STORAGE_KEY = 'pvz_campaign_progress_v1'
export const ZOMBIE_CAMPAIGN_STORAGE_KEY = 'pvz_zombie_campaign_progress_v1'

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

export function getInitialZombieCampaignProgress(): CampaignProgress {
  return {
    unlockedMissionNumber: 1,
    completedMissions: {},
  }
}

export function loadZombieCampaignProgress(): CampaignProgress {
  try {
    if (typeof localStorage === 'undefined') return getInitialZombieCampaignProgress()
    const raw = localStorage.getItem(ZOMBIE_CAMPAIGN_STORAGE_KEY)
    if (!raw) return getInitialZombieCampaignProgress()
    const parsed = JSON.parse(raw)
    return {
      unlockedMissionNumber: Math.max(1, parsed.unlockedMissionNumber || 1),
      completedMissions: parsed.completedMissions || {},
    }
  } catch (err) {
    console.error('Failed to load zombie campaign progress:', err)
    return getInitialZombieCampaignProgress()
  }
}

export function saveZombieCampaignProgress(progress: CampaignProgress): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(ZOMBIE_CAMPAIGN_STORAGE_KEY, JSON.stringify(progress))
  } catch (err) {
    console.error('Failed to save zombie campaign progress:', err)
  }
}

/**
 * Creates initial lanes modified by the mission rules
 */
export function buildMissionLanes(
  mission: CampaignMission,
  activeModifiers?: string[]
): LaneState[] {
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

  const combinedModifiers = Array.from(
    new Set([...(mission.rule.modifiers || []), ...(activeModifiers || [])])
  )
  return applyMissionModifiersToLanes(lanes, combinedModifiers)
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
  const expectedWinner = mission.faction || 'plants'
  if (winner !== expectedWinner) return 0

  let stars = 1 // 1 star for clearing the mission

  const missionId = (mission.id || '').toLowerCase()
  const missionCode = (mission.code || '').toUpperCase()

  if (missionId === 'mission_1' || missionCode === 'P1') {
    if (playerHp >= 12) stars++
    if (turnCount <= 8) stars++
  } else if (missionId === 'mission_2' || missionCode === 'P2') {
    if (playerHp >= 10) stars++
    if (turnCount <= 10) stars++
  } else if (missionId === 'mission_3' || missionCode === 'P3') {
    if (playerHp >= 15) stars++
    if (turnCount <= 12) stars++
  } else if (missionId === 'mission_4' || missionCode === 'P4') {
    if (playerHp >= 10) stars++
    if (turnCount <= 10) stars++
  } else if (missionId === 'mission_5' || missionCode === 'P5') {
    if (playerHp >= 10) stars++
    if (turnCount <= 12) stars++
  } else if (missionId === 'mission_6' || missionCode === 'P6') {
    if (playerHp >= 12) stars++
    if (turnCount <= 9) stars++
  } else if (missionId === 'mission_7' || missionCode === 'P7') {
    if (playerHp >= 14) stars++
    if (turnCount <= 10) stars++
  } else if (missionId === 'mission_8' || missionCode === 'P8') {
    if (playerHp >= 10) stars++
    if (turnCount <= 8) stars++
  } else if (missionId === 'mission_9' || missionCode === 'P9') {
    if (playerHp >= 12) stars++
    if (turnCount <= 10) stars++
  } else if (missionId === 'mission_10' || missionCode === 'P10') {
    if (playerHp >= 15) stars++
    if (turnCount <= 12) stars++
  } else if (missionId === 'mission_11' || missionCode === 'P11') {
    if (playerHp >= 12) stars++
    if (turnCount <= 8 || turnCount <= 9) stars++
  } else if (missionId === 'mission_12' || missionCode === 'P12') {
    if (playerHp >= 14) stars++
    if (turnCount <= 8) stars++
  } else if (missionId === 'mission_13' || missionCode === 'P13') {
    if (playerHp >= 12) stars++
    if (turnCount <= 8) stars++
  } else if (missionId === 'mission_14' || missionCode === 'P14') {
    if (playerHp >= 15) stars++
    if (turnCount <= 7) stars++
  } else if (missionId === 'mission_15' || missionCode === 'P15') {
    if (playerHp >= 15) stars++
    if (turnCount <= 10) stars++
  } else if (mission.id === 'mission_16') {
    if (playerHp >= 15) stars++
    if (turnCount <= 6) stars++
  } else if (mission.id === 'mission_17') {
    if (playerHp >= 12) stars++
    if (turnCount <= 5) stars++
  } else if (mission.id === 'mission_18') {
    if (playerHp <= 8 && playerHp > 0) stars++
    if (turnCount <= 8) stars++
  } else if (mission.id === 'mission_19') {
    if (playerHp >= 14) stars++
    if (turnCount <= 7) stars++
  } else if (mission.id === 'mission_20') {
    if (playerHp >= 12 || turnCount <= 12) stars++
    if (playerHp >= 15 || turnCount <= 8) stars++
  } else if (mission.id === 'zombie_mission_1') {
    if (playerHp >= 12) stars++
    if (turnCount <= 8) stars++
  } else if (mission.id === 'zombie_mission_2') {
    if (playerHp >= 10) stars++
    if (turnCount <= 10) stars++
  } else if (mission.id === 'zombie_mission_3') {
    if (playerHp >= 15) stars++
    if (turnCount <= 10) stars++
  } else if (mission.id === 'zombie_mission_4') {
    if (playerHp >= 10) stars++
    if (turnCount <= 8) stars++
  } else if (mission.id === 'zombie_mission_5') {
    if (playerHp >= 15) stars++
    if (turnCount <= 12) stars++
  } else if (mission.id === 'zombie_mission_6') {
    if (playerHp >= 12) stars++
    if (turnCount <= 9) stars++
  } else if (mission.id === 'zombie_mission_7') {
    if (playerHp >= 14) stars++
    if (turnCount <= 10) stars++
  } else if (mission.id === 'zombie_mission_8') {
    if (playerHp >= 10) stars++
    if (turnCount <= 8) stars++
  } else if (mission.id === 'zombie_mission_9') {
    if (playerHp >= 12) stars++
    if (turnCount <= 10) stars++
  } else if (mission.id === 'zombie_mission_10') {
    if (playerHp >= 15) stars++
    if (turnCount <= 12) stars++
  } else if (mission.id === 'zombie_mission_11') {
    if (playerHp >= 12) stars++
    if (turnCount <= 8) stars++
  } else if (mission.id === 'zombie_mission_12') {
    if (playerHp >= 14) stars++
    if (turnCount <= 8) stars++
  } else if (mission.id === 'zombie_mission_13') {
    if (playerHp >= 12) stars++
    if (turnCount <= 8) stars++
  } else if (mission.id === 'zombie_mission_14') {
    if (playerHp >= 15) stars++
    if (turnCount <= 8) stars++
  } else if (mission.id === 'zombie_mission_15') {
    if (playerHp >= 15) stars++
    if (turnCount <= 10) stars++
  } else if (mission.id === 'zombie_mission_16') {
    if (playerHp >= 14) stars++
    if (turnCount <= 8) stars++
  } else if (mission.id === 'zombie_mission_17') {
    if (playerHp >= 12) stars++
    if (turnCount <= 7) stars++
  } else if (mission.id === 'zombie_mission_18') {
    if (playerHp >= 12) stars++
    if (turnCount <= 6) stars++
  } else if (mission.id === 'zombie_mission_19') {
    if (playerHp >= 15) stars++
    if (turnCount <= 8) stars++
  } else if (mission.id === 'zombie_mission_20') {
    if (playerHp >= 12 || turnCount <= 12) stars++
    if (playerHp >= 15 || turnCount <= 8) stars++
  }

  return Math.min(3, stars)
}

export interface CampaignStarMilestone {
  requiredStars: number
  gems: number
  badge: string
  description: string
}

export const CAMPAIGN_CLAIMED_MILESTONES_KEY = 'pvz_campaign_claimed_milestones_v1'
export const DECK_STORAGE_KEY = 'pvz_heroes_saved_decks_v1'

export const CAMPAIGN_STAR_MILESTONES: CampaignStarMilestone[] = [
  {
    requiredStars: 5,
    gems: 100,
    badge: 'Chiến Binh Khởi Động',
    description: 'Thu thập 5 sao chiến dịch: Bắt đầu hành trình bảo vệ hoặc chinh phục',
  },
  {
    requiredStars: 15,
    gems: 250,
    badge: 'Vệ Binh Ngoại Ô',
    description: 'Thu thập 15 sao chiến dịch: Làm chủ chiến trường ngoại ô',
  },
  {
    requiredStars: 25,
    gems: 400,
    badge: 'Đại Tướng Chiến Lũy',
    description: 'Thu thập 25 sao chiến dịch: Đột phá pháo đài công nghệ cao',
  },
  {
    requiredStars: 35,
    gems: 600,
    badge: 'Chúa Tể Chiến Dịch',
    description: 'Thu thập 35 sao chiến dịch: Bản lĩnh chỉ huy quân đoàn tối thượng',
  },
  {
    requiredStars: 45,
    gems: 1000,
    badge: 'Huyền Thoại Vũ Trụ',
    description: 'Thu thập 45 sao chiến dịch: Hoàn thành xuất sắc 3 chương chiến dịch',
  },
  {
    requiredStars: 60,
    gems: 1500,
    badge: 'Bậc Thầy Đa Vũ Trụ',
    description: 'Thu thập tuyệt đối 60 sao chiến dịch: Chinh phục trọn vẹn cả 4 Chương Cây Trồng & Thây Ma',
  },
  {
    requiredStars: 75,
    gems: 2000,
    badge: 'Huyền Thoại Đa Vũ Trụ',
    description: 'Thu thập 75 sao chiến dịch: Tinh hoa chiến thuật vượt qua muôn vàn thử thách Đa Vũ Trụ',
  },
  {
    requiredStars: 90,
    gems: 3000,
    badge: 'Vô Địch Thiên Hà',
    description: 'Thu thập tuyệt đối 90 sao chiến dịch: Chinh phục toàn bộ các Chương Chiến Dịch Cây Trồng & Thây Ma',
  },
]

// ==========================================
// MISSION MODIFIERS SYSTEM
// ==========================================

export interface MissionModifier {
  id: string
  name: string
  description: string
  icon: string
  effect: 'sun_surge' | 'zombie_frenzy' | 'glass_cannon' | string
}

export const MISSION_MODIFIERS: Record<string, MissionModifier> = {
  sun_surge: {
    id: 'sun_surge',
    name: 'Bão Nắng (Sun Surge)',
    description: 'Người chơi Cây Trồng bắt đầu với +2 Sun khởi đầu.',
    icon: '☀️',
    effect: 'sun_surge',
  },
  zombie_frenzy: {
    id: 'zombie_frenzy',
    name: 'Cuồng Nộ Thây Ma (Zombie Frenzy)',
    description: 'Tất cả Thây Ma (Zombies) đều sở hữu đặc tính Cuồng nộ (Frenzy).',
    icon: '⚡',
    effect: 'zombie_frenzy',
  },
  glass_cannon: {
    id: 'glass_cannon',
    name: 'Đại Bác Thủy Tinh (Glass Cannon)',
    description: 'Tất cả minion trên sân nhận +3 Tấn công, -2 Máu (tối thiểu 1 HP).',
    icon: '💥',
    effect: 'glass_cannon',
  },
}

export function getMissionModifier(id: string): MissionModifier | undefined {
  return MISSION_MODIFIERS[id]
}

export function applyModifierToMinion(minion: Minion, modifierId: string): Minion {
  const traits = minion.traits ? [...minion.traits] : []
  const result: Minion = {
    ...minion,
    traits,
  }

  if (modifierId === 'zombie_frenzy' && result.side === 'zombies') {
    result.frenzy = true
    if (!traits.includes('frenzy')) {
      traits.push('frenzy')
    }
  }

  if (modifierId === 'glass_cannon') {
    result.currentAttack += 3
    result.baseAttack += 3
    result.currentHealth = Math.max(1, result.currentHealth - 2)
    result.maxHealth = Math.max(1, result.maxHealth - 2)
  }

  return result
}

export function applyMissionModifiersToMinion(minion: Minion, modifiers: string[]): Minion {
  let updated = minion
  for (const mod of modifiers) {
    updated = applyModifierToMinion(updated, mod)
  }
  return updated
}

export function applyMissionModifiersToLanes(lanes: LaneState[], modifiers: string[]): LaneState[] {
  if (!modifiers || modifiers.length === 0) return lanes

  return lanes.map((lane) => {
    const updatedLane: LaneState = { ...lane }

    if (updatedLane.plantMinion) {
      updatedLane.plantMinion = applyMissionModifiersToMinion(updatedLane.plantMinion, modifiers)
    }
    if (updatedLane.plantTeamUpMinion) {
      updatedLane.plantTeamUpMinion = applyMissionModifiersToMinion(updatedLane.plantTeamUpMinion, modifiers)
    }
    if (updatedLane.zombieMinion) {
      updatedLane.zombieMinion = applyMissionModifiersToMinion(updatedLane.zombieMinion, modifiers)
    }

    return updatedLane
  })
}

export function applyMissionModifiers(gameState: GameState, modifiers: string[]): GameState {
  if (!modifiers || modifiers.length === 0) return gameState

  const updatedLanes = applyMissionModifiersToLanes(gameState.lanes, modifiers)
  let updatedPlantHero = { ...gameState.plantHero }

  if (modifiers.includes('sun_surge')) {
    updatedPlantHero = {
      ...updatedPlantHero,
      sun: updatedPlantHero.sun + 2,
      maxSun: updatedPlantHero.maxSun + 2,
    }
  }

  return {
    ...gameState,
    plantHero: updatedPlantHero,
    lanes: updatedLanes,
    modifiers: Array.from(new Set([...(gameState.modifiers || []), ...modifiers])),
  }
}

export function getMissionById(idOrCode: string): CampaignMission | undefined {
  if (!idOrCode) return undefined
  const norm = idOrCode.toLowerCase().trim()
  return (
    ALL_CAMPAIGN_MISSIONS.find(
      (m) =>
        m.id.toLowerCase() === norm ||
        (m.code && m.code.toLowerCase() === norm) ||
        (norm.startsWith('p') && m.id === `mission_${norm.slice(1)}`)
    ) ||
    ALL_ZOMBIE_CAMPAIGN_MISSIONS.find(
      (m) =>
        m.id.toLowerCase() === norm ||
        (m.code && m.code.toLowerCase() === norm) ||
        (norm.startsWith('z') && m.id === `zombie_mission_${norm.slice(1)}`)
    )
  )
}

/**
 * Gets a milestone configuration by its required star count
 */
export function getCampaignStarMilestone(requiredStars: number): CampaignStarMilestone | undefined {
  return CAMPAIGN_STAR_MILESTONES.find((m) => m.requiredStars === requiredStars)
}

/**
 * Checks if a specific milestone has already been claimed
 */
export function hasClaimedMilestone(requiredStars: number): boolean {
  const claimed = loadClaimedMilestones()
  return claimed.includes(requiredStars)
}

/**
 * Loads claimed milestone star counts from localStorage
 */
export function loadClaimedMilestones(): number[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const stored = localStorage.getItem(CAMPAIGN_CLAIMED_MILESTONES_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('Failed to load claimed milestones:', err)
    return []
  }
}

/**
 * Saves claimed milestone star counts to localStorage
 */
export function saveClaimedMilestones(claimed: number[]): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(CAMPAIGN_CLAIMED_MILESTONES_KEY, JSON.stringify(claimed))
  } catch (err) {
    console.error('Failed to save claimed milestones:', err)
  }
}

/**
 * Claims a milestone reward and returns whether it succeeded (or null if already claimed/invalid)
 */
export function claimMilestoneReward(
  requiredStars: number,
  currentTotalStars?: number
): { success: boolean; gemsAwarded: number; gems: number; badge: string; error?: string } | null {
  const milestone = CAMPAIGN_STAR_MILESTONES.find((m) => m.requiredStars === requiredStars)
  if (!milestone) {
    return null
  }

  const effectiveStars = currentTotalStars !== undefined ? currentTotalStars : getTotalCampaignStars().totalStars
  if (effectiveStars < requiredStars) {
    return null
  }

  const claimed = loadClaimedMilestones()
  if (claimed.includes(requiredStars)) {
    return null
  }

  claimed.push(requiredStars)
  saveClaimedMilestones(claimed)

  // Persist gems to player wallet if available
  try {
    if (typeof localStorage !== 'undefined') {
      const currentGems = parseInt(localStorage.getItem('pvz_player_gems') || '0', 10)
      localStorage.setItem('pvz_player_gems', (currentGems + milestone.gems).toString())
    }
  } catch (e) {
    console.error('Failed to update player gems', e)
  }

  return {
    success: true,
    gemsAwarded: milestone.gems,
    gems: milestone.gems,
    badge: milestone.badge,
  }
}

/**
 * Calculates total stars gathered across Plant and Zombie campaigns
 */
export function getTotalCampaignStars(
  plantProgress?: any,
  zombieProgress?: any
): { plantStars: number; zombieStars: number; totalStars: number } {
  const pProg = plantProgress || loadCampaignProgress()
  const zProg = zombieProgress || loadZombieCampaignProgress()

  let plantStars = 0
  if (pProg) {
    if (pProg.missionStars && typeof pProg.missionStars === 'object') {
      for (const val of Object.values(pProg.missionStars)) {
        plantStars += Number(val) || 0
      }
    } else if (pProg.completedMissions && typeof pProg.completedMissions === 'object' && !Array.isArray(pProg.completedMissions)) {
      for (const missionKey of Object.keys(pProg.completedMissions)) {
        plantStars += pProg.completedMissions[missionKey]?.stars || 0
      }
    }
  }

  let zombieStars = 0
  if (zProg) {
    if (zProg.missionStars && typeof zProg.missionStars === 'object') {
      for (const val of Object.values(zProg.missionStars)) {
        zombieStars += Number(val) || 0
      }
    } else if (zProg.completedMissions && typeof zProg.completedMissions === 'object' && !Array.isArray(zProg.completedMissions)) {
      for (const missionKey of Object.keys(zProg.completedMissions)) {
        zombieStars += zProg.completedMissions[missionKey]?.stars || 0
      }
    }
  }

  return {
    plantStars,
    zombieStars,
    totalStars: plantStars + zombieStars,
  }
}

export const calculateTotalCampaignStars = getTotalCampaignStars

/**
 * Loads player saved decks filtered by faction
 */
export function loadSavedDecks(side?: Side): SavedDeck[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const stored = localStorage.getItem(DECK_STORAGE_KEY)
    if (!stored) return []
    const parsed: SavedDeck[] = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    if (!side) return parsed
    return parsed.filter((d) => d.side === side)
  } catch (err) {
    console.error('Failed to load saved decks:', err)
    return []
  }
}

/**
 * Builds an EngineCard array from a cardId -> count mapping
 */
export function buildEngineDeckFromMap(
  deckMap: Record<string, number>,
  side: Side
): EngineCard[] {
  const result: EngineCard[] = []
  for (const [cardId, count] of Object.entries(deckMap)) {
    let cardData = getCardById(cardId)
    if (!cardData) {
      if (cardId === 'browncoat_zombie') {
        cardData = getCardById('zombie_regular')
      } else if (cardId === 'conehead_zombie') {
        cardData = getCardById('zombie_conehead')
      } else {
        const prefix = side === 'plants' ? 'plant_' : 'zombie_'
        cardData = getCardById(`${prefix}${cardId}`)
        if (!cardData) {
          const normKey = cardId.toLowerCase().replace(/[\s-_]/g, '')
          cardData = ALL_CARDS.find((c) => {
            const cNormId = c.id.toLowerCase().replace(/^(plant_|zombie_)/, '').replace(/[\s-_]/g, '')
            const cNormName = c.name.toLowerCase().replace(/[\s-_]/g, '')
            return cNormId === normKey || cNormName === normKey
          })
        }
      }
    }
    if (!cardData) continue
    const engineCard = convertCardDataToCard(cardData, side)
    for (let i = 0; i < count; i++) {
      result.push({
        ...engineCard,
        id: `${engineCard.id}_${i}`,
      })
    }
  }
  return result
}

