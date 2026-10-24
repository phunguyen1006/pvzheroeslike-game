# 📑 DATA CONTRACTS & ACTION PROTOCOLS

Tài liệu quy định format dữ liệu và danh sách GameAction để các bot làm việc song song không bị lệch.

---

## 1. PHASES VÀ TRẬT TỰ VÒNG ĐẤU
1. `MULLIGAN`: Chọn đổi bài khởi đầu (mỗi bên tối đa 4 lá).
2. `ZOMBIE_PLAY`: Zombie đặt minion xuống sân (úp mặt hoặc ngửa tùy loại).
3. `PLANT_PLAY`: Plant đặt minion và dùng tricks của Plant.
4. `ZOMBIE_TRICKS`: Zombie được phép dùng các lá Trick (sau khi Plant đã hoàn thành lượt).
5. `FIGHT`: Combat diễn ra tự động tuần tự từ Lane 0 -> Lane 4 (Heights -> 3 Ground -> Water).

---

## 2. QUY TẮC PHỐI HỢP ACTION
- Mọi action dispatch từ UI phải có format chuẩn `GameAction` trong `src/engine/types.ts`:
  - `PLAY_CARD`: `{ type: 'PLAY_CARD', side: Side, cardId: string, laneIndex: number, targetMinionId?: string }`
  - `NEXT_PHASE`: `{ type: 'NEXT_PHASE' }`
  - `START_COMBAT`: `{ type: 'START_COMBAT' }`
  - `STEP_COMBAT_LANE`: `{ type: 'STEP_COMBAT_LANE', laneIndex: number }`

- UI tuyệt đối không thay đổi trực tiếp `GameState`. UI chỉ lắng nghe `GameState` mới được trả về từ `gameReducer(state, action)`.
