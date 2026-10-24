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
- [ ] Hoàn thiện cơ chế cascade trigger khi minion bị tiêu diệt
- [ ] Đảm bảo Bullseye traits bỏ qua hoàn toàn Block Meter

### 🎨 UI Bot (`feature/ui`)
- [ ] Cải thiện visual feedback khi Super-Block meter nạp (1-3 vạch)
- [ ] Hoàn thiện animation kéo thả thẻ bài vào làn phù hợp (Height, Ground, Water)
- [ ] Tích hợp âm thanh khi minion tấn công và khi Hero bị mất máu

### 🃏 Cards Bot (`feature/cards`)
- [ ] Bổ sung các thẻ bài thiếu: `zombie_browncoat`, `zombie_knight_living_dead`, `zombie_football_zombie`
- [ ] Chuẩn hóa metadata các thẻ bài mới vào `src/data/cards.ts`

### 🧪 QA Bot (`feature/qa`)
- [x] Thêm helper kiểm tra trait (`hasCardTrait`) và fixtures fallback cho thẻ bài AI
- [ ] Chạy `npm test` liên tục và nâng coverage lên >90%
- [ ] Tối ưu hóa thuật toán ra quyết định của AI trong `src/engine/ai.ts`
