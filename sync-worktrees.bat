@echo off
chcp 65001 > nul
echo =======================================================
echo    ĐỒNG BỘ MAIN VÀO TẤT CẢ CÁC WORKTREES TRONG .worktrees
echo =======================================================
cd /d "%~dp0"

echo [1/4] Dong bo .worktrees/engine...
cd .worktrees\engine && git merge main --no-edit && cd ..\..

echo [2/4] Dong bo .worktrees/ui...
cd .worktrees\ui && git merge main --no-edit && cd ..\..

echo [3/4] Dong bo .worktrees/cards...
cd .worktrees\cards && git merge main --no-edit && cd ..\..

echo [4/4] Dong bo .worktrees/qa...
cd .worktrees\qa && git merge main --no-edit && cd ..\..

echo =======================================================
echo [HOÀN TẤT] Tất cả các bot phụ đã nhận code mới từ main!
echo =======================================================
pause
