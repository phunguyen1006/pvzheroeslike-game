# 📋 TASKS BOARD - PVZ HEROES MULTI-BOT SYSTEM

Bảng điều phối nhiệm vụ giữa Bot Tổng và 4 Bot Phụ. Mọi bot kiểm tra trạng thái tại đây trước khi bắt đầu và sau khi hoàn thành.

---

## 🚀 ĐANG TRIỂN KHAI (IN PROGRESS)

### 👑 Master Bot (Contract & Điều phối)
- [x] Khởi tạo mô hình Multi-Bot Git Worktrees
- [x] Thiết lập chuẩn `CLAUDE.md` và `specs/`
- [x] Review và merge các feature branch (`feature/engine`, `feature/qa`) vào `main`
- [x] Nghiệm thu 100% build sạch (`tsc -b && vite build`) và 64/64 tests pass

### ⚔️ Engine Bot (`feature/engine`)
- [x] Sửa 6 failed test trong `src/__tests__/ai.test.ts` và hoàn thiện Phase 5 Smart AI Opponent Engine
- [x] Triển khai Double Strike (kích hoạt đòn đánh thứ 2 khi tiêu diệt minion hoặc lane trống)
- [x] Đảm bảo Bullseye traits bỏ qua hoàn toàn Block Meter
- [x] Hỗ trợ Armored 1 và Armored 2 giảm sát thương chính xác
- [ ] Hoàn thiện cơ chế cascade trigger khi minion bị tiêu diệt (triggerOnDeath)

### 🎨 UI Bot (`feature/ui`)
- [x] Hiển thị huy hiệu chân Minion chân thực: Bullseye target reticle và Armored metal shield
- [ ] Nâng cấp vòng xoay Action Button / Phase Dial thành 4 cung tròn xoay chân thực theo lượt
- [ ] Cải thiện visual feedback khi Super-Block meter nạp (1-3 vạch)
- [ ] Hoàn thiện animation kéo thả thẻ bài vào làn phù hợp (Height, Ground, Water)
- [ ] Tích hợp âm thanh khi minion tấn công và khi Hero bị mất máu

### 🃏 Cards Bot (`feature/cards`)
- [x] Bổ sung các thẻ bài thiếu: `zombie_browncoat`, `zombie_knight_living_dead`, `zombie_football_zombie`
- [x] Chuẩn hóa metadata các thẻ bài mới vào `src/data/cards.ts` (`armored`, `antiHero`, `doubleStrike`)
- [ ] Mở rộng kho thẻ bài Plants và Zombies với các lá Super-Rare và Legendary

### 🧪 QA Bot (`feature/qa`)
- [x] Thêm helper kiểm tra trait (`hasCardTrait`) và fixtures fallback cho thẻ bài AI
- [x] Nâng tổng số test lên 69/69 test suite pass 100% (thêm test Double Strike, Armored 2, Bullseye Super-Block bypass)
- [ ] Chạy `npm test` liên tục và nâng coverage lên >90%
- [ ] Tối ưu hóa thuật toán ra quyết định của AI trong `src/engine/ai.ts`
