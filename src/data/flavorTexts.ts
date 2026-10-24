/**
 * PvZ Heroes Replicate - Authentic Flavor Texts & Lore Quotes
 * Châm ngôn dí dỏm, hài hước chuẩn phong cách PvZ Heroes cho các thẻ bài
 */

export const CARD_FLAVOR_TEXTS: Record<string, string> = {
  // Plants
  plant_peashooter: '"Anh ấy kiên quyết giữ vững vị trí tiền tuyến, dù bản thân chỉ là một hạt đậu nhỏ bé có giấc mơ lớn."',
  plant_sunflower: '"Sunflower không thể kiềm chế được việc nhảy múa vui vẻ theo từng nhịp điệu ánh mặt trời rực rỡ."',
  plant_wall_nut: '"Là một người bạn đáng tin cậy. Dù có bị cắn bao nhiêu lần, nụ cười kiên cường ấy vẫn không bao giờ tắt."',
  plant_bonk_choy: '"Mỗi ngày luyện tập 10,000 cú đấm thẳng. Đừng bao giờ chê rau cải không biết đánh boxing!"',
  plant_snow_pea: '"Mọi người thường nói anh ấy quá lạnh lùng. Nhưng sự thật là anh ấy chỉ thích giữ mọi thứ ở nhiệt độ đóng băng."',
  plant_black_eyed_pea: '"Zombie càng giở nhiều mánh khóe (Tricks), anh ấy lại càng phình to và hung dữ hơn."',
  plant_berry_blast: '"Ngon ngọt, mọng nước, và có thể thổi bay bất kỳ mục tiêu nào trong bán kính 3 dặm."',
  plant_spikeweed_sector: '"Không có chiếc giày Zombie nào có thể bảo vệ đôi chân trước bãi chông gai bén nhọn này."',
  plant_bananasaurus_rex: '"Trải qua hàng triệu năm tiến hóa trong rừng chuối nguyên sinh chỉ để trở nên ngon miệng hơn và đấm mạnh hơn gấp đôi!"',
  plant_squash: '"Nguyên tắc sống của Squash rất đơn giản: Nhìn thấy Zombie là nhảy lên nghiền nát thành bùn."',
  plant_cabbage_pult: '"Từ trên cao ném xuống luôn luôn đau hơn. Đó là định luật vật lý cơ bản của Bắp Cải."',
  plant_repeater: '"Bắn một lần chưa đủ đã? Hãy thử bắn hai phát liên tiếp xem Zombie chịu được bao lâu!"',
  plant_snowdrop: '"Càng nhiều Zombie bị đóng băng, nụ cười của Snowdrop càng trở nên rạng rỡ và chết chóc."',
  plant_briar_rose: '"Bất kỳ ai dám làm tổn thương những bông hoa xinh đẹp đều phải trả giá bằng cả mạng sống."',
  plant_cornucopia: '"Chiếc sừng dê diệu kỳ chứa đầy những điều bất ngờ cây cỏ. Không ai biết trước cái gì sẽ nhảy ra!"',
  plant_brainana: '"Chỉ cần một quả chuối thông thái là toàn bộ chất xám dự trữ của lũ Zombie đều tan thành mây khói."',
  plant_dark_matter_dragonfruit: '"Rồng thanh long bóng đêm nuốt chửng cả không gian, khiến mọi mưu mô phù phép của Zombie trở nên vô cùng đắt đỏ."',
  plant_gatling_pea: '"Khi một Peashooter đội chiếc mũ quân đội và lắp 4 nòng đại liên, cả nghĩa địa đều phải run sợ."',
  plant_aloeosaurus: '"Khủng long lô hội hiền lành luôn mang lại sự tươi mát và phục hồi sinh lực cho muôn loài."',
  plant_dusk_lobber: '"Bắn đạn gai xuyên thấu từ trong màn đêm bóng tối. Càng đứng trong vùng địa hình, cô ấy càng trở nên đáng sợ."',
  plant_pineclone: '"Tất cả vì một, và một biến thành... tất cả! Binh đoàn nón thông đồng loạt xung trận."',
  plant_galacta_cactus: '"Bắn tỉa chuẩn xác vào mắt đối thủ. Khi ngã xuống, cú nổ ngân hà của cậu ta sẽ san bằng tất cả xung quanh."',
  plant_lily_of_the_valley: '"Đứng dưới bóng cây dâm bụt trên đồi cao, Lily trao tặng sức mạnh vô song cho những chiến binh đặt chân lên đỉnh."',
  plant_spring_bean: '"Một cú búng lò xo nhẹ nhàng cũng đủ tiễn vị khách không mời quay về lại bàn tay của chủ nhân."',
  plant_cherry_bomb: '"Hai anh em sinh đôi luôn tranh cãi xem ai nổ to hơn. Kết quả là cả hai cùng nổ tan tành."',
  plant_shamrocket: '"May mắn của người Ireland kết hợp với tên lửa tầm nhiệt. Zombie to xác chỉ còn là dĩ vãng."',
  plant_the_great_zucchini: '"Một cái vung đũa phép biến hóa toàn bộ đoàn quân xác sống hùng hậu thành những cọng nấm tí hon đáng thương."',
  plant_captain_cucumber: '"Thuyền trưởng dưa chuột hào phóng luôn tìm thấy những báu vật huyền thoại rẻ bất ngờ cho hạm đội của mình."',
  plant_banana_launcher: '"Khẩu đại bác chuối tự động lên nòng mỗi bình minh. Hãy cẩn thận kẻo trượt vỏ chuối!"',
  plant_banana_bomb: '"Nhỏ nhưng có võ. Một quả bom chuối thơm phức phát nổ ngay vào mặt Zombie ngơ ngác."',
  plant_blooming_heart: '"Trái tim hoa hồng càng chịu phong ba bão táp, tình yêu và sức mạnh tấn công lại càng bùng cháy mãnh liệt."',
  plant_sportacus: '"Đấu sĩ nấm giác đấu kiên cường. Đối thủ dùng mánh khóe bẩn thỉu (Tricks)? Nhận ngay một nắm đấm công lý vào mặt Zombie Hero!"',
  plant_astrocado: '"Bay lượn giữa các vì tinh tú với tốc độ ánh sáng. Khi rơi rụng, hạt mầm của anh ấy sẽ lại vươn lên thành một huyền thoại."',
  plant_astrocado_pit: '"Chỉ là một hạt bơ nhỏ bé nằm yên dưới đất... nhưng đừng vội cười, nó sắp nảy mầm thành chiến binh vũ trụ đấy!"',
  plant_cob_cannon: '"Khẩu đại pháo ngô bắp hạt nhân tối thượng. Một phát bắn san phẳng chiến tuyến địch và thổi bay mọi thứ xung quanh."',
  plant_bird_of_paradise: '"Loài chim thiên đường kiêu sa bơi lội giữa hồ nước, mỗi sớm mai lại mang đến một phép màu siêu năng lực kỳ diệu."',
  plant_soul_patch: '"Linh hồn bất diệt của đất mẹ hiền hòa. Dù bão tố hiểm nguy giáng xuống đầu tướng quân, cụm rễ thiêng liêng sẽ ôm trọn và gánh vác tất cả."',
  plant_dandy_lion_king: '"Vị vua sư tử bồ công anh quyền uy cất tiếng gầm vang dội, khiến sinh lực của thủ lĩnh thây ma lập tức vỡ vụn làm đôi."',
  plant_onion_rings: '"Vòng hành tây ma thuật chiên giòn rụm! Chỉ cần cắn một miếng, mọi mầm cây bé nhỏ trên tay đều phổng phao thành chiến binh 4/4."',
  plant_kernel_pult: '"Một muỗng bơ béo ngậy ném chuẩn xác vào mặt Zombie. Vừa bỏng rát, vừa trơn trượt đến mức đông cứng không thể cử động."',
  plant_chomper: '"Cái miệng háu ăn không đáy. Bất kể là xác sống tầm thường hay đại tướng giáp sắt, một cú ngoạm tử thần là tan thành mây khói."',
  plant_mushroom_grotto: '"Hang nấm ẩm ướt rợp bóng mát, nơi nuôi dưỡng những bào tử nấm mọc lên mập mạp và kiên cường hơn bao giờ hết."',

  // Zombies
  zombie_swabbie: '"Hắn là thủy thủ cướp biển nhỏ bé nhất, nhưng sự dũng cảm khi lao ra giữa biển nước thì không ai sánh bằng."',
  zombie_browncoat: '"Bộ vest công sở sờn rách, bước chân loạng choạng. Một ngày làm việc bình thường của công chức Zombie."',
  zombie_conehead: '"Chiếc nón giao thông đường bộ mang lại sự an toàn tuyệt đối trước những viên đạn đậu bay lạc."',
  zombie_buckethead: '"Cái xô sắt trên đầu không chỉ chống đạn mà còn bắt được cả sóng radio ngoài hành tinh."',
  zombie_arm_wrestler: '"Nhà vô địch vật tay 5 năm liền của trường tiểu học Zombie. Đừng bao giờ dám thách đấu hắn trên đồi cao."',
  zombie_bungee_plumber: '"Dây thừng cao su tuột dốc không phanh, một cú móc bất ngờ từ trần nhà khiến đối thủ không kịp trở tay."',
  zombie_newspaper_zombie: '"Đừng bao giờ... NHẮC LẠI LÀ ĐỪNG BAO GIỜ làm rách tờ nhật báo buổi sáng của ông ấy!"',
  zombie_conga_zombie: '"Âm nhạc vũ điệu Conga rộn ràng không thể ngừng lại. Cứ nhảy theo nhịp là đối thủ phải lùi bước."',
  zombie_lurch_for_lunch: '"Đến giờ nghỉ trưa ăn não rồi! Zombie lập tức lao lên cắn thêm một phát bất ngờ."',
  zombie_disco_zombie: '"Vũ điệu Disco thập niên 70 bất tử. Hắn không bao giờ bước lên sàn nhảy mà không có hai vũ công hộ tống."',
  zombie_area_22: '"Khu căn cứ quân sự tối mật nơi Zombie đột biến gen thành những quái vật cuồng nộ và to xác."',
  zombie_weed_spray: '"Dung dịch diệt cỏ công nghiệp độc hại. Những mầm cây yếu ớt sẽ lập tức tan biến."',
  zombie_locust_swarm: '"Bầy châu chấu đói ăn rợp trời, có thể nuốt chửng một cây cổ thụ khổng lồ chỉ trong vài tích tắc."',
  zombie_stealthy_imp: '"Bạn không thấy hắn đâu cả cho đến khi hắn nứt ra từ ngôi bia mộ và cắn trộm vào mông bạn."',
  zombie_knight_living_dead: '"Hiệp sĩ khoác trên mình bộ giáp sắt kiên cố dày dặn từ thời Trung Cổ."',
  zombie_all_star: '"Cầu thủ bóng bầu dục siêu hạng sẵn sàng húc bay bất kỳ chướng ngại vật nào trên đường chạy."',
  zombie_football_zombie: '"Cầu thủ bóng bầu dục siêu hạng sẵn sàng húc bay bất kỳ chướng ngại vật nào trên đường chạy."',
  zombie_teleport: '"Khoa học Brainy hiện đại cho phép dịch chuyển tức thời một chiến binh Zombie ngay trong lúc tung chiêu Tricks!"',
  zombie_bad_moon_rising: '"Khi vầng trăng máu u ám mọc lên, mọi tiểu quỷ tép riu trên sân đều hóa thân thành những chúa tể khổng lồ."',
  zombie_disco_tron_3000: '"Cỗ máy robot âm nhạc tối tân do Tiến sĩ Zomboss sáng chế để khuấy động mọi sàn đấu."',
  zombie_zombot_1000: '"Tiến sĩ Zomboss đã dành ra 999 phiên bản thất bại trước khi cho ra đời cỗ máy hủy diệt sân cỏ hoàn hảo này."',
  zombie_trickster: '"Hắn thích đùa cợt và tung hứng. Bạn càng dùng nhiều Tricks, hắn xuất hiện càng rẻ và đấm càng đau!"',
  zombie_intergalactic_warlord: '"Chúa tể chiến tranh liên thiên hà truyền cảm hứng bất tận, khiến toàn thể quân đoàn Zombie vĩnh viễn mạnh mẽ hơn."',
  zombie_raiding_raptor: '"Khủng long bạo chúa khát máu vùng đầm lầy. Mỗi lần chủ nhân rút bài, tiếng gầm của nó lại vang dội hơn."',
  zombie_quickdraw_con_man: '"Hắn rút súng lục nhanh hơn cả cái bóng của mình, đặc biệt là mỗi khi Plant Hero cả gan rút một lá bài mới."',
  zombie_dr_spacetime: '"Nhà du hành thời gian với chiếc đồng hồ bẻ cong không gian, mang lại những lá bài vũ trụ rẻ đến bất ngờ."',
  zombie_going_viral: '"Một dịch bệnh cuồng nộ lan truyền với tốc độ chóng mặt qua mạng xã hội của Zombie."',
  zombie_rocket_science: '"Đây không phải là trò đùa trẻ con, đây là KHOA HỌC TÊN LỬA dùng để thổi bay những Plant to xác!"',
  zombie_final_mission: '"Hi sinh một thuộc hạ trung thành để phóng tên lửa hạt nhân hủy diệt mục tiêu chỉ định."',
  zombie_interdimensional_zombie: '"Nhảy qua các chiều không gian song song mỗi khi có thí nghiệm khoa học phát nổ, và trở lại với một hình hài hoàn toàn mới."',
  zombie_kitchen_sink: '"Hắn mang theo tất cả mọi thứ: bồn rửa bát, cờ lê, giáp sắt, súng ngắm... Không một đặc tính chiến đấu nào hắn không có."',
  zombie_trick_or_treater: '"Cho kẹo hay bị ghẹo! Mỗi trò lừa lọc (Trick) của bạn là một gói kẹo tăng lực ngọt ngào gửi tới tay bài."',
  zombie_synchronized_swimmer: '"Vũ điệu bơi nghệ thuật dưới nước hoàn hảo đến mức có thể bắt chước sức mạnh của bất kỳ ai trên bờ."',
  zombie_space_cowboy: '"Cao bồi không gian lướt đi trên sao chổi. Cứ mỗi lần bắn trúng mặt Hero, hắn lại phi ngựa sang làn tiếp theo để bắn tiếp!"',
  zombie_binary_stars: '"Cặp sao đôi vũ trụ xoay vần trên sàn nhảy disco. Khi hai ngôi sao hội tụ, mọi hỏa lực của quân đoàn Zombie đều nhân đôi sức tàn phá!"',
  zombie_gargantuars_feast: '"Bàn tiệc thịnh soạn ngập tràn não tươi mở màn vào lúc nửa đêm, mời gọi ba gã khổng lồ Gargantuar hung hãn nhất bước ra từ bóng tối."',
  zombie_jester: '"Tên hề xiếc quái đản luôn cười khúc khích. Đánh hắn một cú ư? Hắn sẽ ném trả lại chính xác lượng sát thương đó vào mặt bạn!"',
  zombie_zombot_plank_walker: '"Chiến hạm hải tặc tương lai khổng lồ lướt trên mặt nước. Một khi cập bến, mọi công trình cảnh quan môi trường xung quanh đều sụp đổ tan tành."',
  zombie_haunted_castle: '"Lâu đài ma quái rùng rợn chứa đầy lời nguyền u ám, tiếp thêm dũng khí và sức tấn công mãnh liệt cho bất kỳ thây ma nào bước vào."',
}

export function getCardFlavorText(cardId: string, cardName: string): string {
  if (CARD_FLAVOR_TEXTS[cardId]) {
    return CARD_FLAVOR_TEXTS[cardId]
  }

  // Fallbacks based on card name
  const nameLower = cardName.toLowerCase()
  if (nameLower.includes('pea')) return '"Những hạt đậu nhỏ bé mang trong mình lòng dũng cảm bảo vệ khu vườn thiêng liêng."'
  if (nameLower.includes('zombie')) return '"Chỉ muốn một thứ duy nhất trên đời: Bộ não tươi ngon và thơm phức của bạn."'
  if (nameLower.includes('trick') || nameLower.includes('superpower')) return '"Một phép thuật bí truyền có thể đảo ngược hoàn toàn cục diện trận chiến."'
  if (nameLower.includes('sector') || nameLower.includes('base') || nameLower.includes('zone')) return '"Địa hình đặc biệt mang lại lợi thế chiến thuật vượt trội cho bên kiểm soát."'

  return '"Chiến binh kiên cường sẵn sàng cống hiến hết mình cho phe phái trên chiến trường PvZ Heroes."'
}
