@echo off
cls
echo ========================================
echo   Claude Dashboard - Multi-Window Mode
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Backend Server (Port 3727)...
cd server
start "Backend (Port 3727)" cmd /k npm run dev
cd ..
timeout /t 2 /nobreak >nul

echo [2/2] Starting Frontend (Port 3000)...
cd web
start "Frontend (Port 3000)" cmd /k npm run dev
cd ..
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   All services launched!
echo ========================================
echo.
echo Service URLs:
echo   Backend:  http://localhost:3727
echo   Frontend: http://localhost:3000
echo.
pause
