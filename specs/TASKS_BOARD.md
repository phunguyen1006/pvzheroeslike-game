# 📋 TASKS BOARD - PVZ HEROES MULTI-BOT SYSTEM

Bảng điều phối nhiệm vụ giữa Bot Tổng và 4 Bot Phụ. Mọi bot kiểm tra trạng thái tại đây trước khi bắt đầu và sau khi hoàn thành.

---

## 🚀 ĐANG TRIỂN KHAI (IN PROGRESS)

### 👑 Master Bot (Contract & Điều phối)
- [x] Khởi tạo mô hình Multi-Bot Git Worktrees
- [x] Thiết lập chuẩn `CLAUDE.md` và `specs/`
- [x] Khởi động 4 Sub-Bot sessions độc lập trong Claude Desktop
- [x] Nghiệm thu 100% build sạch (`tsc -b && vite build`) và 112/112 tests pass
- [x] Chuyển đổi repository thành Public và đồng bộ đẩy 5 commits lên GitHub `origin/main`
- [x] Phân phối nhiệm vụ Đợt 3 (Legendary Cards, Gravestone 3D Visuals & Ability Cascade) cho cả 4 Sub-Bots

### ⚔️ Engine Bot (`feature/engine`)
- [x] Sửa 6 failed test trong `src/__tests__/ai.test.ts` và hoàn thiện Phase 5 Smart AI Opponent Engine
- [x] Triển khai Double Strike (kích hoạt đòn đánh thứ 2 khi tiêu diệt minion hoặc lane trống)
- [x] Đảm bảo Bullseye traits bỏ qua hoàn toàn Block Meter
- [x] Hỗ trợ Armored 1 và Armored 2 giảm sát thương chính xác
- [x] Hoàn thiện cơ chế cascade trigger khi minion bị tiêu diệt (`triggerOnDeath` & `triggerOnMultipleDeaths` trong `src/engine/triggers.ts` cho Valkyrie in hand, Punish-Shroom, Hothead, Pear Cub, Gas Giant, Frankentuar, Sharktronic Sub với 9 unit tests chuyên sâu)
- [x] Triển khai cơ chế Gravestone (Bia Mộ): minion ẩn danh `isGravestone: true`, tự động nứt vỡ lúc bắt đầu `ZOMBIE_TRICKS`, kích hoạt "When Revealed" abilities và helper `revealGravestones`
- [x] [ĐỢT 3] Triển khai logic khả năng đặc biệt cho Cornucopia, Briar Rose, Disco-Tron 3000, Bad Moon Rising và Teleport (an toàn mảng rỗng, immutability, 125/125 tests pass)
- [x] [ĐỢT 4] Triển khai logic kỹ năng 12 Superpowers và 4 Environments trong Core Engine:
  - 6 Plant Superpowers (`precision_blast`, `sunburn`, `uncrackable`, `embiggen`, `whirlwind`, `geyser`)
  - 6 Zombie Superpowers (`carried_away`, `slammin_smash`, `shrink_ray`, `brute_strength`, `dance_off`, `cut_down_to_size`)
  - 4 Environments (`spikeweed_sector`, `bog_of_sunken_hope`, `laser_base_alpha`, `cone_zone`)
  - Khởi tạo trait `invulnerable` trong HeroState, bảo lưu Sunburn `maxSun` vĩnh viễn, tích hợp Laser Base Alpha vào Combat Resolver
  - 155/155 tests passed 100% và build sạch sẽ (`npm run build`)
- [x] [ĐỢT 5] Triển khai Frenzy & Bonus Attacks, Freeze Synergies, Untrickable & Transform Mechanics:
  - **Frenzy Trait & Bonus Attacks**: Helper `triggerBonusAttack(state, laneIndex, side)` cho đòn đánh thêm out-of-sequence; Frenzy kích hoạt đòn đánh bồi lập tức vào đối phương hoặc Hero khi tiêu diệt minion và lane trống (cả trong lượt đánh thường và bonus attack); hỗ trợ Team-Up target khi Frenzy nổ.
  - **Freeze Synergies & Thawing**: Helper `freezeMinion(state, laneIndex, side)` gán `isFrozen: true`; Snowdrop nhận +2/+2 khi Zombie bị đóng băng; Winter Squash tiêu diệt tức thì Zombie bị đóng băng; cơ chế Tan Băng (Thawing) tự động bỏ qua lượt đánh và chuyển `isFrozen` về false trong combat phase (cả minion thường và Team-Up).
  - **Untrickable Trait**: Bổ sung `untrickable` vào `Trait`, `Card`, `Minion`, `HeroState`; helper `isUntrickable(unit)` chặn toàn bộ Tricks và Superpowers sát thương/removal của đối thủ (Squash, Berry Blast, Shamrocket, Spring Bean, Locust Swarm, Bungee Plumber, Rocket Science, Final Mission, Precision Blast, Goatify, Devour, Slammin Smash, Cut Down to Size, Shrink Ray, Stayin Alive, Frozen Tundra, Missile Madness), bảo lưu buff đồng minh và miễn nhiễm sát thương lan diện rộng (Weed Spray, Cherry Bomb).
  - **Transform Mechanics**: Helper `transformMinion(state, laneIndex, side, newCard)` tái cấu trúc minion sạch sẽ, giữ nguyên vị trí làn, reset buffs/damage, kế thừa traits, áp dụng hiệu ứng môi trường liên tục (Laser Base Alpha, Cone Zone, Bog of Sunken Hope) và kích hoạt When Played abilities.
  - **Test Suite**: Viết bộ test chuyên sâu `src/__tests__/frenzy_freeze_transform.test.ts` (28 test cases), nâng tổng số test lên **219/219 tests passed 100%**, build production sạch sẽ không lỗi TypeScript (`tsc -b && vite build`).

### 🎨 UI Bot (`feature/ui`)
- [x] Hiển thị huy hiệu chân Minion chân thực: Bullseye target reticle và Armored metal shield
- [x] Nâng cấp vòng xoay Action Button / Phase Dial thành 4 cung tròn xoay chân thực theo lượt
- [x] Tích hợp 8-segment Super-Block Dial cho cả Zombie Hero (Opponent) và Plant Hero
- [x] Cải thiện visual feedback nạp 1-3 vạch nảy số (`+1`, `+2`, `+3` bounce badge, flashing pips/nubs, audio dings)
- [x] Tích hợp kinetic shockwave VFX và âm thanh (Web Audio API) khi minion tấn công / Hero mất máu
- [x] Hoàn thiện hệ thống kéo thả (Drag & Drop) thẻ bài: viền Glowing Pulse Ring động tại các làn hợp lệ, dimming 0.4 làn không thể đặt, hiệu ứng tiếp đất Card Drop Thud và âm thanh Web Audio (`playCardPickup`, `playCardPlace`, `playFightHorn`)
- [x] [ĐỢT 3] Thiết kế khối Bia Mộ (Gravestone) 3D đá Granite có vết nứt, huy hiệu ẩn danh `🪦 ? / ?` và animation nứt vỡ lúc Zombie Tricks kèm SFX Web Audio `playGravestoneReveal`
- [x] [ĐỢT 4] Superpower Choice Modal khi Super-Block nổ (Play Now vs Keep in Hand, 360° rotating radiant sunburst, golden sheen sweep & emerald button, Web Audio fanfare) và Hiệu ứng Địa hình Môi trường đa tầng trên 5 làn đấu (Lane Environment Visuals: Spikeweed undulating thorns, Laser Base Alpha sci-fi neon scanning grid, Bog of Doom swamp mist & bubbles, Solar Winds sunbeams, Total Eclipse lunar shadow)
- [x] [ĐỢT 5] Giao diện Mulligan (MulliganScreen 4 lá khởi đầu + 1 Superpower cố định, hiệu ứng 3D Card Flip khi đổi bài, toggle dấu chéo đỏ ❌ "Đổi lá này", nút xác nhận animation sáng quét và Web Audio API soundManager.playCardPickup) & Comic Phase Banner trượt ngang màn hình (Typography 3D viền đen dày, nghiêng phong cách comic, màu sắc và hiệu ứng tia tốc độ riêng biệt cho 4 phases, tự động kích hoạt soundManager.playFightHorn khi sang phase FIGHT)
- [x] [ĐỢT 6] Màn hình Comic Intro đối thoại kịch tính trước trận (Comic split panels, speech bubbles phong cách truyện tranh PvZ Heroes giữa Green Shadow & Super Brainz, phù hiệu VS sấm sét 3D, nút FIGHT và SKIP) & Màn hình GameOverModal chuẩn vinh quang / thất bại (Victory pháo hoa, vương miện vàng 3D, hiệu ứng confetti streamers rực rỡ; Defeat mưa u ám, bia mộ nứt vỡ; Bảng thống kê chi tiết Số hiệp đấu, Tổng sát thương, Số quân tiêu diệt; Nút Tái đấu, Đổi Hero, Về Menu Chính kèm Web Audio API soundManager). Build và 219 tests pass 100%.

### 🃏 Cards Bot (`feature/cards`)
- [x] Bổ sung các thẻ bài thiếu: `zombie_browncoat`, `zombie_knight_living_dead`, `zombie_football_zombie`
- [x] Chuẩn hóa metadata các thẻ bài mới vào `src/data/cards.ts` (`armored`, `antiHero`, `doubleStrike`)
- [x] Bổ sung catalog validation tests cho Cabbage-Pult, Repeater, Snowdrop, Conehead, Buckethead, Stealthy Imp
- [x] [ĐỢT 3] Mở rộng kho thẻ bài Plants và Zombies với các lá Super-Rare và Legendary (Wall-Nut, Briar Rose, Cornucopia, Teleport, Bad Moon Rising, Disco-Tron 3000)
- [x] [ĐỢT 4] Triển khai hệ thống Thẻ bài Siêu Năng Lực (Hero Superpowers & Signature Superpowers) và Thẻ Môi Trường (Environments) - 71 cards catalog
- [x] [ĐỢT 5] Thêm Brainana (Legendary Banana) và Dark Matter Dragonfruit (Legendary Dragon)
- [x] [ĐỢT 6] Bổ sung Dino-Roar (Bananasaurus Rex, Raiding Raptor, Aloeosaurus) & Evolution (Gatling Pea, Warlord)
- [x] [ĐỢT 7] Hoàn thiện bộ bài Galactic Gardens & Synergy Suite: Pineclone (đồng hóa 3/3), Quickdraw Con Man (1/3 Bullseye bắn trả khi Plant rút bài), Going Viral (buff toàn thể +1/+1 Frenzy + rút bài + thêm 3 bản sao vào bộ bài), Galacta-Cactus (nổ diện rộng 1 dame), Lily of the Valley (buff +2/+2 trên Đồi Heights), Dr. Spacetime (Conjure giảm 1 Não khi đánh trúng Hero).

### 🧪 QA Bot (`feature/qa`)
- [x] Thêm helper kiểm tra trait (`hasCardTrait`) và fixtures fallback cho thẻ bài AI
- [x] Nâng tổng số test lên 112/112 test suite pass 100% (thêm test Double Strike, Armored 2, Bullseye Super-Block bypass, cascade on-death triggers, Gravestone reveal)
- [x] [ĐỢT 3] Viết bộ test chuyên sâu `15. Legendary & Super-Rare Strategic Cards Suite` nâng tổng test lên 125/125 test cases pass 100%
- [x] [ĐỢT 4] Mở rộng kiểm thử trí tuệ nhân tạo (AI Engine Tests) & Tích hợp Superpower / Environment Suite (155/155 tests pass)
- [x] [ĐỢT 5 & 6] Bộ test chuyên sâu `20. Iconic Legendary & Super-Rare Powerhouses Suite` (Bananasaurus Rex Dino-Roar + Double Strike, Trickster Cost Reduction + Bonus Attack, Valkyrie Attack Scaling on-death, Dark Matter Dragonfruit Trick Surtax + Splash Damage 6, Brainana Brain-Drain, Zombot 1000 Board Wipe) nâng tổng test lên **173/173 tests pass 100%**!
- [x] [ĐỢT 7] Hoàn thiện bộ test Campaign Mode & Deck Builder (`campaign_deck.test.ts`), Synergy Suite (`cards.test.ts`), AI Tactics (`ai_tactics.test.ts`), Conjure & Terrain Coordination (`terrain_conjure.test.ts`), nâng tổng số test lên **340/340 tests pass 100%**!
- [ ] [ĐỢT 8] Đang triển khai bộ test mô phỏng trận đấu tự động toàn diện AI vs AI (`match_simulation.test.ts`) và stress test bão hòa bàn đấu 5 làn.

### 🗺️ Campaign & Deck Bot (`feature/campaign`)
- [x] Triển khai Campaign Chapter 1 "Suburban Crisis" với 5 màn boss (Super Brainz, Impfinity, The Smash, Rustbolt, Professor Brainstorm).
- [x] Hệ thống luật chơi đặc biệt: pre-placed minions, environments, starting sun/brains bonus.
- [x] Hệ thống tính điểm 1-3 sao và lưu trữ tiến độ game qua LocalStorage.
- [x] Giao diện 40-Card Deck Builder với biểu đồ phân bố cost (mana curve) và thống kê tribes.
- [ ] [ĐỢT 8] Triển khai Chapter 2 "Zombie Metropolis" và tính năng Import/Export mã JSON bộ bài.

### 🧠 AI Bot (`feature/ai`)
- [x] Hoàn thiện 3 phong cách AI: Aggro (tấn công trực diện làn trống), Control (bảo lưu Não cho Tricks removal), Tempo (kiểm soát bàn cân bằng).
- [x] Ma trận quyết định Superpower và cây quyết định Mulligan thông minh.
- [x] Tích hợp AI Tactics vào hệ thống chiến đấu tự động.
- [x] [ĐỢT 7] Cơ chế ghi đè Môi trường đối thủ và tính toán Lethal Face Damage với Tricks (Brute Strength, Lurch for Lunch, Going Viral, Area 22, Laser Base Alpha).
- [ ] [ĐỢT 8] Mở rộng ma trận quyết định cho 20 Signature Superpowers và hệ thống thoại tương tác chiến thuật (Dynamic Boss Dialogue Triggers).
