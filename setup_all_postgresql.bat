@echo off
REM ============================================================
REM  setup_all_postgresql.bat — Complete PostgreSQL Setup
REM  This script handles the full setup workflow:
REM  1. Reset postgres password
REM  2. Create database and user
REM  3. Run migrations
REM  4. Create superuser
REM  Run as Administrator
REM ============================================================

setlocal enabledelayedexpansion

SET PROJECT_DIR=C:\Users\KELORM\Desktop\LizzyMikePharma
SET BACKEND_DIR=%PROJECT_DIR%\Backend
SET PGBIN=C:\Program Files\PostgreSQL\18\bin
SET PGDATA=C:\Program Files\PostgreSQL\18\data

REM Database configuration - can be overridden by environment variables
if "%DB_NAME%"=="" SET DB_NAME=lizzymike_db
if "%DB_USER%"=="" SET DB_USER=pharma_user
if "%DB_PASSWORD%"=="" SET DB_PASSWORD=CHANGE_ME_DB_PASSWORD
if "%DB_HOST%"=="" SET DB_HOST=localhost
if "%DB_PORT%"=="" SET DB_PORT=5432

REM Ask for postgres superuser password once and export it for psql
set /p POSTGRES_PASSWORD=Enter postgres superuser password (leave blank if none): 
set "PGPASSWORD=%POSTGRES_PASSWORD%"

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║      PostgreSQL Complete Setup for LizzyMike Pharma     ║
echo ║                                                          ║
echo ║  This will:                                              ║
echo ║   1. Create database 'lizzymike_db'                      ║
echo ║   2. Create user 'pharma_user'                           ║
echo ║   3. Run Django migrations                               ║
echo ║   4. Create superuser account                            ║
echo ║                                                          ║
echo ║  Must run as Administrator!                             ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

REM Check for admin privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] This script must be run as Administrator!
    echo.
    echo Right-click cmd.exe and select "Run as administrator"
    echo Then run this script again.
    pause
    exit /b 1
)

echo [STEP 1/4] Checking PostgreSQL installation...
if not exist "%PGBIN%\psql.exe" (
    echo [ERROR] PostgreSQL not found at %PGBIN%
    pause
    exit /b 1
)
echo [OK] PostgreSQL found

echo.
echo [STEP 2/4] Creating database and user...

REM Validate admin connection to PostgreSQL
"%PGBIN%\psql.exe" -U postgres -h %DB_HOST% -p %DB_PORT% -w -c "SELECT 1;" 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Could not authenticate to PostgreSQL as user 'postgres'.
    echo         Check the postgres password and try again.
    pause
    exit /b 1
)

echo [OK] Authenticated to PostgreSQL as postgres

REM Drop any existing database/user and recreate cleanly
"%PGBIN%\psql.exe" -U postgres -h %DB_HOST% -p %DB_PORT% -w -c "DROP DATABASE IF EXISTS %DB_NAME%;" 2>nul
"%PGBIN%\psql.exe" -U postgres -h %DB_HOST% -p %DB_PORT% -w -c "DROP USER IF EXISTS %DB_USER%;" 2>nul

"%PGBIN%\psql.exe" -U postgres -h %DB_HOST% -p %DB_PORT% -w -c "CREATE USER %DB_USER% WITH PASSWORD '%DB_PASSWORD%' CREATEDB;" 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Could not create user '%DB_USER%'.
    pause
    exit /b 1
)

"%PGBIN%\psql.exe" -U postgres -h %DB_HOST% -p %DB_PORT% -w -c "CREATE DATABASE %DB_NAME% OWNER %DB_USER%;" 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Could not create database '%DB_NAME%'.
    pause
    exit /b 1
)

echo [OK] Database and user created

REM Verify application user credentials
set "PGPASSWORD=%DB_PASSWORD%"
"%PGBIN%\psql.exe" -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -w -c "SELECT 1;" 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Verified database user '%DB_USER%' cannot connect using provided password.
    pause
    exit /b 1
)

echo [OK] Verified application user access

echo.
echo [STEP 3/4] Running Django migrations...
cd /d "%BACKEND_DIR%"
set DJANGO_SETTINGS_MODULE=pharmasys.settings_consolidated
set DB_NAME=%DB_NAME%
set DB_USER=%DB_USER%
set DB_PASSWORD=%DB_PASSWORD%
set DB_HOST=%DB_HOST%
set DB_PORT=%DB_PORT%

call .\venv\Scripts\python.exe manage.py migrate --skip-checks 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Migrations failed!
    echo Check PostgreSQL is running and database is accessible.
    pause
    exit /b 1
)
echo [OK] Migrations completed

REM Superuser configuration
if "%SUPERUSER_USERNAME%"=="" SET SUPERUSER_USERNAME=admin
if "%SUPERUSER_EMAIL%"=="" SET SUPERUSER_EMAIL=admin@test.local
if "%SUPERUSER_PASSWORD%"=="" SET SUPERUSER_PASSWORD=admin123

echo.
echo [STEP 4/4] Creating superuser...
echo %SUPERUSER_USERNAME% > "%TEMP%\superuser_input.txt"
echo %SUPERUSER_EMAIL% >> "%TEMP%\superuser_input.txt"
echo %SUPERUSER_PASSWORD% >> "%TEMP%\superuser_input.txt"
echo %SUPERUSER_PASSWORD% >> "%TEMP%\superuser_input.txt"

call .\venv\Scripts\python.exe manage.py createsuperuser --skip-checks -noinput ^
    --username %SUPERUSER_USERNAME% --email %SUPERUSER_EMAIL% 2>nul

if %errorlevel% equ 0 (
    echo [OK] Superuser created (%SUPERUSER_USERNAME%/%SUPERUSER_PASSWORD%)
) else (
    echo [WARNING] Superuser creation had issues. Trying alternate method...
    call .\venv\Scripts\python.exe manage.py shell --skip-checks ^
        -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='%SUPERUSER_USERNAME%').exists() or User.objects.create_superuser('%SUPERUSER_USERNAME%', '%SUPERUSER_EMAIL%', '%SUPERUSER_PASSWORD%')" 2>nul
    if %errorlevel% equ 0 (
        echo [OK] Superuser created via shell
    )
)

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║           PostgreSQL Setup Complete!                    ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo PostgreSQL Configuration:
echo   Database: %DB_NAME%
echo   User: %DB_USER% (password: %DB_PASSWORD%)
echo   Host: %DB_HOST%
echo   Port: %DB_PORT%
echo.
echo Django Superuser:
echo   Username: %SUPERUSER_USERNAME%
echo   Password: %SUPERUSER_PASSWORD%
echo.
echo Next steps:
echo   1. Update start_server.bat to use:
echo      set DJANGO_SETTINGS_MODULE=pharmasys.settings_consolidated
echo.
echo   2. Run:
echo      start_server.bat
echo.
echo   3. Access at:
echo      http://10.12.219.167
echo.
echo Database status:
call .\venv\Scripts\python.exe manage.py dbshell --skip-checks -c "SELECT version();" 2>nul && (
    echo [OK] PostgreSQL connection verified!
) || (
    echo [WARNING] Could not verify connection. Check PostgreSQL service.
)

del "%TEMP%\setup_db.sql" 2>nul
del "%TEMP%\superuser_input.txt" 2>nul

pause
