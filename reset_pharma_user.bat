@echo off
REM ============================================================
REM  reset_pharma_user.bat — Reset pharma_user password
REM  Run as Administrator
REM ============================================================

set PGBIN=C:\Program Files\PostgreSQL\18\bin

echo.
echo [INFO] Resetting pharma_user password in PostgreSQL...
echo.

REM Ask for postgres superuser password
set /p POSTGRES_PASSWORD=Enter postgres superuser password: 

set PGPASSWORD=%POSTGRES_PASSWORD%

REM Drop and recreate the user with the correct password
"%PGBIN%\psql.exe" -U postgres -h localhost -p 5432 -c "DROP USER IF EXISTS pharma_user;"
"%PGBIN%\psql.exe" -U postgres -h localhost -p 5432 -c "CREATE USER pharma_user WITH PASSWORD 'CHANGE_ME_DB_PASSWORD' CREATEDB;"

if %errorlevel% equ 0 (
    echo [OK] User pharma_user recreated with correct password
) else (
    echo [ERROR] Failed to reset user password
    pause
    exit /b 1
)

REM Verify the connection works
set PGPASSWORD=CHANGE_ME_DB_PASSWORD
"%PGBIN%\psql.exe" -U pharma_user -h localhost -p 5432 -d lizzymike_db -c "SELECT 1;"

if %errorlevel% equ 0 (
    echo [OK] Password verification successful
) else (
    echo [ERROR] Password verification failed - check if database exists
    pause
    exit /b 1
)

echo.
echo ✅ pharma_user is ready with password: CHANGE_ME_DB_PASSWORD
echo.

pause