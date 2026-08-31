@echo off
REM ============================================================
REM  LAN_SERVER_CONTROL.bat — Main control panel
REM  Start, Stop, Check status, and Open browser
REM ============================================================

setlocal enabledelayedexpansion

:menu
cls
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║   LizzyMike Pharma - LAN Server Control Panel           ║
echo ║                                                          ║
echo ║   Server IP: 192.168.0.137                             ║
echo ║   Frontend:  http://192.168.0.137                      ║
echo ║   Admin:     http://192.168.0.137/admin                ║
echo ║   API:       http://192.168.0.137/api                  ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

echo 📊 CURRENT STATUS:
echo   ─────────────────────────────────────────────────────────
tasklist | findstr /I "python.exe" >nul
if %errorlevel% equ 0 (
    echo   ✅ Django Backend    [RUNNING]
) else (
    echo   ❌ Django Backend    [STOPPED]
)

tasklist | findstr /I "nginx.exe" >nul
if %errorlevel% equ 0 (
    echo   ✅ Nginx Web Server  [RUNNING]
) else (
    echo   ❌ Nginx Web Server  [STOPPED]
)
echo   ─────────────────────────────────────────────────────────
echo.

echo 🎛️  CONTROL MENU:
echo.
echo   [1] ▶️  START all services
echo   [2] ⏹️  STOP all services
echo   [3] 🔄 RESTART services
echo   [4] 📋 CHECK status
echo   [5] 🌐 OPEN in browser
echo   [6] 📁 OPEN project folder
echo   [7] 🔧 OPEN backend terminal
echo   [8] 🔧 OPEN nginx terminal
echo   [0] ❌ EXIT
echo.

set /p choice="Enter your choice (0-8): "

if "%choice%"=="1" goto start_services
if "%choice%"=="2" goto stop_services
if "%choice%"=="3" goto restart_services
if "%choice%"=="4" goto check_status
if "%choice%"=="5" goto open_browser
if "%choice%"=="6" goto open_folder
if "%choice%"=="7" goto open_backend
if "%choice%"=="8" goto open_nginx
if "%choice%"=="0" exit /b 0

echo Invalid choice. Please try again.
timeout /t 2 /nobreak >nul
goto menu

:start_services
cls
echo.
echo Starting services...
cd /d "%~dp0"
call start_lan_server.bat
goto menu

:stop_services
cls
echo.
echo Stopping services...
cd /d "%~dp0"
call stop_lan_server.bat
goto menu

:restart_services
cls
echo.
echo Restarting services...
echo.
taskkill /IM python.exe /F >nul 2>&1
taskkill /IM nginx.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul
cd /d "%~dp0"
call start_lan_server.bat
goto menu

:check_status
cls
cd /d "%~dp0"
call check_lan_server.bat
goto menu

:open_browser
echo Opening browser to http://192.168.0.137...
start http://192.168.0.137
timeout /t 2 /nobreak >nul
goto menu

:open_folder
echo Opening project folder...
start "%~dp0"
timeout /t 2 /nobreak >nul
goto menu

:open_backend
echo Opening backend terminal...
start "Django Backend Terminal" powershell -NoExit -Command "& '%~dp0\Backend\.venv\Scripts\Activate.ps1'; Set-Location '%~dp0\Backend'"
timeout /t 1 /nobreak >nul
goto menu

:open_nginx
echo Opening nginx terminal...
REM Check if nginx exists and launch it or open terminal
if exist "C:\nginx\nginx.exe" (
    start "Nginx Terminal" powershell -NoExit -Command "cd 'C:\nginx'; Write-Host 'Nginx directory: C:\nginx' -ForegroundColor Green"
) else (
    echo ⚠️  Warning: Nginx not found at C:\nginx
    pause
)
timeout /t 1 /nobreak >nul
goto menu
