/**
 * PvZ Heroes Replicate - Campaign Mode Data & Helpers
 * Chapter 1: "Suburban Crisis" (Khủng hoảng Ngoại ô)
 * 5 Epic Boss Missions against iconic Zombie Heroes
 */

import type { CampaignMission, CampaignProgress, LaneState, Side, Minion, Card as EngineCard, SavedDeck } from '../engine/types'
import { createInitialLanes, convertCardDataToCard } from '../engine/reducer'
import { getCardById, ALL_CARDS } from './cards'

export const CHAPTER_1_MISSIONS: CampaignMission[] = [
  {
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
      unlocksNext: false,
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

export const ALL_CAMPAIGN_MISSIONS: CampaignMission[] = [
  ...CHAPTER_1_MISSIONS,
  ...CHAPTER_2_MISSIONS,
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
      unlocksNext: false,
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

export const ALL_ZOMBIE_CAMPAIGN_MISSIONS: CampaignMission[] = [
  ...ZOMBIE_CHAPTER_1_MISSIONS,
  ...ZOMBIE_CHAPTER_2_MISSIONS,
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
  const expectedWinner = mission.faction || 'plants'
  if (winner !== expectedWinner) return 0

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
  } else if (mission.id === 'mission_6') {
    if (playerHp >= 12) stars++
    if (turnCount <= 9) stars++
  } else if (mission.id === 'mission_7') {
    if (playerHp >= 14) stars++
    if (turnCount <= 10) stars++
  } else if (mission.id === 'mission_8') {
    if (playerHp >= 10) stars++
    if (turnCount <= 8) stars++
  } else if (mission.id === 'mission_9') {
    if (playerHp >= 12) stars++
    if (turnCount <= 10) stars++
  } else if (mission.id === 'mission_10') {
    if (playerHp >= 15) stars++
    if (turnCount <= 12) stars++
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
]

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

