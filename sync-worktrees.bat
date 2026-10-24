@echo off
chcp 65001 > nul
echo =======================================================
echo    ĐỒNG BỘ MAIN VÀO TẤT CẢ CÁC WORKTREES PHỤ
echo =======================================================
cd /d "%~dp0"

echo [1/4] Dong bo pvz-engine...
cd ..\pvz-engine && git merge main --no-edit && cd ..\pvzheroeslike-game

echo [2/4] Dong bo pvz-ui...
cd ..\pvz-ui && git merge main --no-edit && cd ..\pvzheroeslike-game

echo [3/4] Dong bo pvz-cards...
cd ..\pvz-cards && git merge main --no-edit && cd ..\pvzheroeslike-game

echo [4/4] Dong bo pvz-qa...
cd ..\pvz-qa && git merge main --no-edit && cd ..\pvzheroeslike-game

echo =======================================================
echo [HOÀN TẤT] Tất cả các bot phụ đã nhận code mới từ main!
echo =======================================================
pause
