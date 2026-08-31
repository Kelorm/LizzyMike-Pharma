@echo off
REM ============================================================
REM  check_lan_server.bat — Check server status
REM ============================================================

setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║   LizzyMike Pharma - Service Status                     ║
echo ║   192.168.0.137                                         ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

REM Check Django
tasklist | findstr /I "python.exe" >nul
if %errorlevel% equ 0 (
    echo ✅ Django Backend:    RUNNING (port 8000)
) else (
    echo ❌ Django Backend:    STOPPED
)

REM Check Nginx  
tasklist | findstr /I "nginx.exe" >nul
if %errorlevel% equ 0 (
    echo ✅ Nginx Web Server:  RUNNING (port 80)
) else (
    echo ❌ Nginx Web Server:  STOPPED
)

echo.
echo 📋 Network Information:
echo   Server IP:     192.168.0.137
echo   Gateway:       192.168.0.1
echo   Subnet Mask:   255.255.255.0
echo.

echo 🌐 Access URLs:
echo   Frontend:      http://192.168.0.137
echo   Admin Panel:   http://192.168.0.137/admin
echo   API Endpoint:  http://192.168.0.137/api
echo.

echo 🔍 Testing connectivity...
echo.

REM Test frontend
powershell -Command "try { $null = Invoke-WebRequest -Uri 'http://192.168.0.137/' -TimeoutSec 5 -UseBasicParsing; Write-Host '✅ Frontend responding' } catch { Write-Host '❌ Frontend not responding' }" 2>nul

REM Test API
powershell -Command "try { $null = Invoke-WebRequest -Uri 'http://192.168.0.137/api/' -TimeoutSec 5 -UseBasicParsing; Write-Host '✅ API endpoint accessible' } catch { Write-Host '⚠️  API not responding (services may be starting)' }" 2>nul

echo.
echo ═══════════════════════════════════════════════════════════
echo Use: start_lan_server.bat   to start services
echo      stop_lan_server.bat    to stop services
echo ═══════════════════════════════════════════════════════════
echo.

pause
