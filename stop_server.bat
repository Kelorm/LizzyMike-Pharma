@echo off
REM ============================================================
REM  stop_server.bat — Safely stop LizzyMike Pharma Server
REM  Run this BEFORE shutting down the server PC.
REM ============================================================

echo.
echo [STOPPING] LizzyMike Pharma Server...
echo.

REM ---- Stop Nginx gracefully ----
echo [1/2] Stopping Nginx...
taskkill /f /im nginx.exe >nul 2>&1
if errorlevel 1 (
    echo        Nginx was not running.
) else (
    echo [OK]   Nginx stopped.
)

REM ---- Stop Gunicorn (Python process on port 8000) ----
echo [2/2] Stopping Gunicorn (Django backend on port 8000)...
for /f "tokens=5" %%i in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING 2^>nul') do (
    taskkill /pid %%i /f >nul 2>&1
)
REM Fallback: kill any remaining gunicorn python processes
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq python.exe" /fo csv /nh 2^>nul') do (
    taskkill /pid %%~i /f >nul 2>&1
)
echo [OK]   Gunicorn stopped.

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║  All services stopped.                              ║
echo ║  Safe to shut down the server PC now.               ║
echo ╠══════════════════════════════════════════════════════╣
echo ║  REMINDER: If browsers show HTTPS errors on         ║
echo ║  next startup, clear browser cache or visit:        ║
echo ║  chrome://net-internals/#hsts  → Delete server IP  ║
echo ╚══════════════════════════════════════════════════════╝
echo.
pause

