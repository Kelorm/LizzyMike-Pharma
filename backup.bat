@echo off
REM ============================================================
REM  backup.bat — Daily Database Backup for LizzyMike Pharma
REM
REM  Schedule with Windows Task Scheduler:
REM   - Action: Run program → backup.bat
REM   - Trigger: Daily → 11:00 PM (after business hours)
REM   - Run whether user is logged on or not
REM ============================================================

setlocal EnableDelayedExpansion

SET DB_NAME=lizzymike_db
SET DB_USER=pharma_user
SET BACKUP_DIR=C:\backups\lizzymike
SET PG_BIN=C:\Program Files\PostgreSQL\17\bin

REM Do not store passwords in this file. Set PGPASSWORD in the environment
REM (same value as DB_PASSWORD for pharma_user), or in Task Scheduler.
if "%PGPASSWORD%"=="" (
    echo [ERROR] PGPASSWORD is not set. Run:
    echo   set PGPASSWORD=your_postgres_password
    echo Then run this script again, or set PGPASSWORD in Task Scheduler.
    exit /b 1
)

REM ---- Date-stamped filename: backup_YYYYMMDD.sql ----
for /f "tokens=2 delims==" %%i in ('wmic os get localdatetime /value 2^>nul') do set datetime=%%i
set DATESTAMP=!datetime:~0,8!
set BACKUP_FILE=%BACKUP_DIR%\lizzymike_backup_%DATESTAMP%.sql

REM ---- Ensure backup dir exists ----
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo [%date% %time%] Starting backup...
echo Backup file: %BACKUP_FILE%

REM ---- Run pg_dump ----
"%PG_BIN%\pg_dump.exe" -U %DB_USER% -h localhost -p 5432 -d %DB_NAME% -F p -f "%BACKUP_FILE%"

if errorlevel 1 (
    echo [ERROR] Backup FAILED! Check PostgreSQL is running.
) else (
    echo [OK] Backup complete: %BACKUP_FILE%
)

REM ---- Keep only last 30 days of backups ----
forfiles /p "%BACKUP_DIR%" /s /m *.sql /d -30 /c "cmd /c del @path" >nul 2>&1
echo [OK] Old backups (30+ days) cleaned up.

echo [%date% %time%] Backup process finished.
