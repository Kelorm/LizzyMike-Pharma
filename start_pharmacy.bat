@echo off
REM LizzyMike Pharmacy - Manual Start Script
REM 
REM Double-click this file to manually start the pharmacy system.
REM This script is designed for non-technical staff.
REM
REM If you see any errors, please contact IT support.

setlocal enabledelayedexpansion

title LizzyMike Pharmacy - Starting System
color 1F

echo.
echo ========================================
echo   LizzyMike Pharmacy System
echo   Starting Please Wait...
echo ========================================
echo.

REM Change to script directory
cd /d "%~dp0"

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Docker is not installed or not running.
    echo.
    echo Please do the following:
    echo   1. Make sure Docker Desktop is installed
    echo   2. Start Docker Desktop from the Start menu
    echo   3. Wait for Docker to say "Running"
    echo   4. Double-click this file again
    echo.
    pause
    exit /b 1
)

REM Check if Docker Desktop is running
docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Docker Desktop is not running.
    echo.
    echo Please do the following:
    echo   1. Look for Docker Desktop in the system tray (bottom right)
    echo   2. Right-click on the Docker icon
    echo   3. Select "Start Docker Desktop"
    echo   4. Wait for it to say "Running"
    echo   5. Double-click this file again
    echo.
    pause
    exit /b 1
)

echo [OK] Docker is running.
echo.

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] docker-compose is not installed.
    echo.
    echo Please contact IT support for assistance.
    echo.
    pause
    exit /b 1
)

echo [OK] docker-compose is available.
echo.

REM Stop any existing containers
echo Stopping any existing containers...
docker-compose down >nul 2>&1

REM Start the containers
echo Starting pharmacy system containers...
echo.

docker-compose up -d

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start the system.
    echo.
    echo Please contact IT support and show them this message.
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Containers started successfully!
echo.

REM Wait for containers to initialize
echo Waiting for system to initialize...
timeout /t 15 /nobreak >nul

REM Check container status
docker-compose ps > "%TEMP%\pharmacy_status.txt"

findstr /C:"Up" "%TEMP%\pharmacy_status.txt" >nul
if errorlevel 1 (
    echo.
    echo [WARNING] Some containers may not have started properly.
    echo.
    echo The system will still try to open. If you see errors,
    echo please try running this script again or contact IT support.
    echo.
) else (
    echo [OK] All containers are running!
)

del "%TEMP%\pharmacy_status.txt" 2>nul

echo.
echo ========================================
echo   System Starting...
echo ========================================
echo.
echo The pharmacy system should open in your browser.
echo.
echo If it does not open automatically, open a web browser
echo and go to: http://192.168.1.100
echo.
echo If you see errors, please contact IT support.
echo.

REM Open the browser
start http://192.168.1.100

echo Press any key to close this window...
pause >nul