@echo off
cls
echo ========================================
echo   Claude Dashboard - Startup Script
echo ========================================
echo.

cd /d "%~dp0"

:: Try to find Windows Terminal
set "WT_PATH="

if exist "%LOCALAPPDATA%\Microsoft\WindowsApps\wt.exe" (
    set "WT_PATH=%LOCALAPPDATA%\Microsoft\WindowsApps\wt.exe"
) else if exist "%ProgramFiles%\WindowsApps\Microsoft.WindowsTerminal_*\wt.exe" (
    for /f "delims=" %%a in ('dir /b "%ProgramFiles%\WindowsApps\Microsoft.WindowsTerminal_*" 2^>nul') do (
        set "WT_PATH=%ProgramFiles%\WindowsApps\%%a\wt.exe"
    )
)

if defined WT_PATH (
    echo Found Windows Terminal, starting in tabs...
    echo.

    echo [1/2] Starting Backend Server...
    "%WT_PATH%" -w 0 nt --title "Backend (Port 3727)" -d "%~dp0server" cmd /k "npm run dev"
    timeout /t 1 /nobreak >nul

    echo [2/2] Starting Frontend...
    "%WT_PATH%" -w 0 nt --title "Frontend (Port 3000)" -d "%~dp0web" cmd /k "npm run dev"
    timeout /t 1 /nobreak >nul

    echo.
    echo Services started in Windows Terminal tabs.
    echo Use Ctrl+Tab to switch between tabs
) else (
    echo Windows Terminal not found, starting in separate windows...
    echo.

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
)

echo.
echo Service URLs:
echo   Backend:  http://localhost:3727
echo   Frontend: http://localhost:3000
echo.
pause
