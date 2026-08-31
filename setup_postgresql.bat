REM ============================================================
REM  setup_postgresql.bat — Set up PostgreSQL database
REM  Run this as Administrator to create DB and user
REM ============================================================

@echo off
setlocal

REM Get PostgreSQL bin path
SET PGBIN=C:\Program Files\PostgreSQL\18\bin

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║    Setting up PostgreSQL for LizzyMike Pharma       ║
echo ╚══════════════════════════════════════════════════════╝
echo.

REM Create SQL script file
(
echo CREATE DATABASE lizzymike_db;
echo CREATE USER pharma_user WITH PASSWORD 'CHANGE_ME_DB_PASSWORD';
echo ALTER USER pharma_user CREATEDB;
echo GRANT ALL PRIVILEGES ON DATABASE lizzymike_db TO pharma_user;
echo ALTER DATABASE lizzymike_db OWNER TO pharma_user;
) > "%TEMP%\setup_db.sql"

echo [1/3] Creating database and user...
"%PGBIN%\psql.exe" -U postgres -h localhost -w -f "%TEMP%\setup_db.sql" 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] PostgreSQL setup failed. Make sure:
    echo   1. PostgreSQL service is running
    echo   2. You are running this as Administrator
    echo   3. The postgres user password is set (or update the pgpass file)
    echo.
    pause
    exit /b 1
)

echo [2/3] Verifying connection...
"%PGBIN%\psql.exe" -U pharma_user -d lizzymike_db -h localhost -c "SELECT 1;" 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Could not connect to database as pharma_user
    pause
    exit /b 1
)

echo [3/3] Setup complete!
echo.
echo Database: lizzymike_db
echo User: pharma_user
echo Password: CHANGE_ME_DB_PASSWORD
echo Host: localhost
echo Port: 5432
echo.
echo Next: Run migrations with:
echo   set DJANGO_SETTINGS_MODULE=pharmasys.settings_consolidated
echo   python manage.py migrate --skip-checks
echo.

del "%TEMP%\setup_db.sql"

pause
