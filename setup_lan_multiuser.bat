@echo off
REM ============================================================
REM  setup_lan_multiuser.bat — LAN Multi-User Setup Wizard
REM  Automates complete setup for local network deployment
REM ============================================================

setlocal enabledelayedexpansion

REM Get the directory where this script is located
SET SCRIPT_DIR=%~dp0
SET PROJECT_DIR=%SCRIPT_DIR:~0,-1%
SET BACKEND_DIR=%PROJECT_DIR%\Backend
SET FRONTEND_DIR=%PROJECT_DIR%\Frontend
SET PGBIN=C:\Program Files\PostgreSQL\18\bin
SET NGINX_DIR=C:\nginx

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║   LizzyMike Pharma - LAN Multi-User Setup Wizard         ║
echo ║                                                          ║
echo ║   This will set up the system for multiple users         ║
echo ║   on your local network                                  ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: This script must run as Administrator!
    echo    Right-click cmd.exe and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo ✅ Running as Administrator

REM Step 1: Database Setup
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  STEP 1: Database Setup (PostgreSQL)                    ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

if not exist "%PGBIN%\psql.exe" (
    echo ❌ PostgreSQL not found at %PGBIN%
    echo    Install PostgreSQL 18 and try again
    pause
    exit /b 1
)

echo ✅ PostgreSQL found at %PGBIN%

echo.
echo [INFO] Creating database and user...
echo        Database: lizzymike_db
echo        User: pharma_user
echo        Password: CHANGE_ME_DB_PASSWORD
echo.

REM Export database credentials for setup_all_postgresql and Django
set DB_NAME=lizzymike_db
set DB_USER=pharma_user
set DB_PASSWORD=CHANGE_ME_DB_PASSWORD
set DB_HOST=localhost
set DB_PORT=5432

cd /d "%PROJECT_DIR%"
call "%SCRIPT_DIR%setup_all_postgresql.bat"

if %errorlevel% neq 0 (
    echo ❌ Database setup failed
    pause
    exit /b 1
)

echo ✅ Database setup completed

REM Step 2: Environment Configuration
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  STEP 2: Environment Configuration                      ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

if exist "%BACKEND_DIR%\.env.local" (
    copy "%BACKEND_DIR%\.env.local" "%BACKEND_DIR%\.env" >nul
    echo ✅ Copied .env.local to .env
) else (
    echo ⚠️  .env.local not found. Creating default .env...
    (
        echo # LAN Production Configuration
        echo DEBUG=False
        echo ALLOWED_HOSTS=192.168.1.200,10.12.219.167,localhost,127.0.0.1
        echo DB_NAME=lizzymike_db
        echo DB_USER=pharma_user
        echo DB_PASSWORD=CHANGE_ME_DB_PASSWORD
        echo DB_HOST=localhost
        echo DB_PORT=5432
        echo DJANGO_SETTINGS_MODULE=pharmasys.settings_consolidated
    ) > "%BACKEND_DIR%\.env"
    echo ✅ Created .env file
)

REM Step 3: Collect Static Files
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  STEP 3: Django Static Files                            ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

set DJANGO_SETTINGS_MODULE=pharmasys.settings_consolidated
call "%BACKEND_DIR%\venv\Scripts\python.exe" "%BACKEND_DIR%\manage.py" collectstatic --no-input --skip-checks

if %errorlevel% neq 0 (
    echo ❌ Static files collection failed
    pause
    exit /b 1
)

echo ✅ Static files collected to staticfiles/

REM Step 4: Build Frontend
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  STEP 4: Frontend Build (React)                         ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

cd /d "%FRONTEND_DIR%"

if not exist "%FRONTEND_DIR%\node_modules" (
    echo [INFO] Installing npm dependencies...
    call npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        echo ❌ npm install failed
        pause
        exit /b 1
    )
)

echo [INFO] Building production React build...
call npm run build:prod

if %errorlevel% neq 0 (
    echo ❌ Frontend build failed
    pause
    exit /b 1    cd C:\nginx
    .\nginx
)

if not exist "%FRONTEND_DIR%\build\index.html" (
    echo ❌ Frontend build did not produce index.html
    pause
    exit /b 1
)

echo ✅ Frontend built to build/ directory

REM Step 5: Nginx Configuration
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  STEP 5: Nginx Configuration                            ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

if not exist "%NGINX_DIR%\conf\nginx.conf" (
    echo ⚠️  Creating Nginx configuration...
    mkdir "%NGINX_DIR%\conf" >nul 2>&1
    copy "%PROJECT_DIR%\nginx_local.conf" "%NGINX_DIR%\conf\nginx.conf" >nul
    echo ✅ Nginx configured
) else (
    echo ✅ Nginx already configured
)

REM Step 6: Summary
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  ✅ SETUP COMPLETE!                                     ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

echo Your system is ready for multi-user deployment!
echo.

echo 📋 Next Steps:
echo.
echo 1. START SERVER:
echo    • Run: start_server.bat (from project root)
echo    • Or manually start in two terminals:
echo      - Terminal 1: Django backend on port 8000
echo      - Terminal 2: Nginx web server on port 80
echo.

echo 2. ACCESS FROM BROWSERS:
echo    • Server machine: http://localhost
echo    • Client machines: http://192.168.1.200
echo.

echo 3. FIRST LOGIN:
echo    • Username: admin
echo    • Password: admin123
echo    • ⚠️  Change password after first login!
echo.

echo 4. CREATE ADDITIONAL USERS:
echo    • Login as admin
echo    • Go to Admin Panel
echo    • Create users with appropriate roles
echo.

echo 📚 Detailed Guide:
echo    See: LAN_MULTIUSER_DEPLOYMENT.md
echo.

echo ═══════════════════════════════════════════════════════════════
echo System Configuration:
echo   Server IP:  192.168.1.200
echo   Database:   PostgreSQL (lizzymike_db)
echo   Frontend:   React (built - ready for deployment)
echo   Backend:    Django 5.2 + Gunicorn
echo   Web Server: Nginx
echo ═══════════════════════════════════════════════════════════════
echo.

pause
