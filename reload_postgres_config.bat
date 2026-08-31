@echo off
REM ============================================================
REM  reload_postgres_config.bat — Reload PostgreSQL config
REM  Run as Administrator
REM ============================================================

echo Reloading PostgreSQL configuration...

powershell.exe -Command "Restart-Service postgresql-x64-18 -Force"

echo.
echo [OK] PostgreSQL config reloaded
pause