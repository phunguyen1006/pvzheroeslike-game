# PVZ HEROES-LIKE GAME - MULTI-AGENT ARCHITECTURE

Dự án này áp dụng mô hình **Multi-Session Worktree (1 Bot Tổng + 4 Bot Phụ chuyên trách)** để đẩy nhanh tiến độ và kiểm soát code.

---

## 1. NGUYÊN TẮC BẤT BIẾN (CONTRACT-FIRST)
1. **Single Source of Truth:** `src/engine/types.ts` định nghĩa toàn bộ data model (`GameState`, `GameAction`, `Card`, `Minion`, `LaneState`). Mọi tính năng mới phải khai báo Action & Type tại đây trước khi code.
2. **Core Engine:** `src/engine/` là pure TypeScript logic, deterministic, pure reducer. **Tuyệt đối không import React/JSX/DOM**.
3. **UI Layer:** `src/components/` chỉ hiển thị từ GameState và dispatch Action. **Không tự tính toán lại luật game tại component**.
4. **Data Layer:** `src/data/` định nghĩa thông số thẻ bài, siêu năng lực, decks.
5. **Quality & Test:** Chạy `npm test` (Vitest) và `npm run build` trước khi merge vào `main`.

---

## 2. PHÂN ĐỊNH PHẠM VI TỪNG BOT (BOUNDARIES)
- 👑 **Bot Tổng (Master - Branch `main` - Thư mục gốc repo):**
  - Quản lý roadmap, viết specs trong `specs/`.
  - Cập nhật Data Contracts (`src/engine/types.ts`).
  - Review & Merge code từ các nhánh feature, giải quyết conflicts.
- ⚔️ **Engine Bot (Worktree `.worktrees/engine` - Branch `feature/engine`):**
  - Chỉ sửa `src/engine/` và `src/types/`.
  - Chuyên trách: Turn Phases, Combat Calculation, Block Meter, Traits logic, Cascade Triggers.
- 🎨 **UI Bot (Worktree `.worktrees/ui` - Branch `feature/ui`):**
  - Chỉ sửa `src/components/`, `src/App.tsx`, `src/index.css`.
  - Chuyên trách: Bàn đấu 5 làn, hiệu ứng VFX, drag & drop thẻ bài, Modals, Audio triggers.
- 🃏 **Cards Bot (Worktree `.worktrees/cards` - Branch `feature/cards`):**
  - Chỉ sửa `src/data/`, `src/engine/environments.ts`.
  - Chuyên trách: Thêm bài mới, hero superpowers, archetypes deck, trait mappings.
- 🧪 **QA Bot (Worktree `.worktrees/qa` - Branch `feature/qa`):**
  - Chỉ sửa `src/__tests__/` và `src/engine/ai.ts`.
  - Chuyên trách: Vitest test coverage, test edge-cases, cải thiện thuật toán AI đối thủ.
