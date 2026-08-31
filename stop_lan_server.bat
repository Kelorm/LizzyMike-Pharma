@echo off
REM ============================================================
REM  stop_lan_server.bat — Stop Django and Nginx
REM ============================================================

setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║   LizzyMike Pharma - Stopping Services                  ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

REM Check if processes are running
tasklist | findstr /I "python.exe" >nul
if %errorlevel% equ 0 (
    echo [1/2] Stopping Django backend...
    taskkill /IM python.exe /F >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Django stopped
    ) else (
        echo ⚠️  Could not stop Django (may need admin privileges)
    )
) else (
    echo ⓘ Django not running
)

tasklist | findstr /I "nginx.exe" >nul
if %errorlevel% equ 0 (
    echo [2/2] Stopping Nginx...
    taskkill /IM nginx.exe /F >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Nginx stopped
    ) else (
        echo ⚠️  Could not stop Nginx (may need admin privileges)
    )
) else (
    echo ⓘ Nginx not running
)

echo.
echo ✅ Done!
echo.

pause
