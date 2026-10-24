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

### 🎨 UI Bot (`feature/ui`)
- [x] Hiển thị huy hiệu chân Minion chân thực: Bullseye target reticle và Armored metal shield
- [x] Nâng cấp vòng xoay Action Button / Phase Dial thành 4 cung tròn xoay chân thực theo lượt
- [x] Tích hợp 8-segment Super-Block Dial cho cả Zombie Hero (Opponent) và Plant Hero
- [x] Cải thiện visual feedback nạp 1-3 vạch nảy số (`+1`, `+2`, `+3` bounce badge, flashing pips/nubs, audio dings)
- [x] Tích hợp kinetic shockwave VFX và âm thanh (Web Audio API) khi minion tấn công / Hero mất máu
- [x] Hoàn thiện hệ thống kéo thả (Drag & Drop) thẻ bài: viền Glowing Pulse Ring động tại các làn hợp lệ, dimming 0.4 làn không thể đặt, hiệu ứng tiếp đất Card Drop Thud và âm thanh Web Audio (`playCardPickup`, `playCardPlace`, `playFightHorn`)
- [x] [ĐỢT 3] Thiết kế khối Bia Mộ (Gravestone) 3D đá Granite có vết nứt, huy hiệu ẩn danh `🪦 ? / ?` và animation nứt vỡ lúc Zombie Tricks kèm SFX Web Audio `playGravestoneReveal`
- [x] [ĐỢT 4] Superpower Choice Modal khi Super-Block nổ (Play Now vs Keep in Hand, 360° rotating radiant sunburst, golden sheen sweep & emerald button, Web Audio fanfare) và Hiệu ứng Địa hình Môi trường đa tầng trên 5 làn đấu (Lane Environment Visuals: Spikeweed undulating thorns, Laser Base Alpha sci-fi neon scanning grid, Bog of Doom swamp mist & bubbles, Solar Winds sunbeams, Total Eclipse lunar shadow)

### 🃏 Cards Bot (`feature/cards`)
- [x] Bổ sung các thẻ bài thiếu: `zombie_browncoat`, `zombie_knight_living_dead`, `zombie_football_zombie`
- [x] Chuẩn hóa metadata các thẻ bài mới vào `src/data/cards.ts` (`armored`, `antiHero`, `doubleStrike`)
- [x] Bổ sung catalog validation tests cho Cabbage-Pult, Repeater, Snowdrop, Conehead, Buckethead, Stealthy Imp
- [x] [ĐỢT 3] Mở rộng kho thẻ bài Plants và Zombies với các lá Super-Rare và Legendary (Wall-Nut, Briar Rose, Cornucopia, Teleport, Bad Moon Rising, Disco-Tron 3000)
- [x] [ĐỢT 4] Triển khai hệ thống Thẻ bài Siêu Năng Lực (Hero Superpowers & Signature Superpowers) và Thẻ Môi Trường (Environments) - 71 cards catalog
- [x] [ĐỢT 5] Thêm Brainana (Legendary Banana) và Dark Matter Dragonfruit (Legendary Dragon)

### 🧪 QA Bot (`feature/qa`)
- [x] Thêm helper kiểm tra trait (`hasCardTrait`) và fixtures fallback cho thẻ bài AI
- [x] Nâng tổng số test lên 112/112 test suite pass 100% (thêm test Double Strike, Armored 2, Bullseye Super-Block bypass, cascade on-death triggers, Gravestone reveal)
- [x] [ĐỢT 3] Viết bộ test chuyên sâu `15. Legendary & Super-Rare Strategic Cards Suite` nâng tổng test lên 125/125 test cases pass 100%
- [x] [ĐỢT 4] Mở rộng kiểm thử trí tuệ nhân tạo (AI Engine Tests) & Tích hợp Superpower / Environment Suite (155/155 tests pass)
- [ ] [ĐỢT 5] Bộ test chuyên sâu cho Brainana, Dark Matter Dragonfruit và Mulligan Re-draw logic
