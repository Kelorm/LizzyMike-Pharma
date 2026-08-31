@echo off
REM ============================================================
REM  rebuild_frontend.bat — Rebuild React frontend
REM  Rebuilds the production frontend with updated .env
REM ============================================================

setlocal

SET SCRIPT_DIR=%~dp0
SET FRONTEND_DIR=%SCRIPT_DIR:~0,-1%\Frontend

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║    Rebuilding Frontend with Updated Configuration   ║
echo ╚══════════════════════════════════════════════════════╝
echo.

cd /d "%FRONTEND_DIR%"

echo [INFO] Current .env configuration:
echo        API URL: (reading from .env)
findstr "REACT_APP_API_URL" .env

echo.
echo [1/2] Installing dependencies (if needed)...
if not exist "%FRONTEND_DIR%\node_modules" (
    call npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed
        pause
        exit /b 1
    )
)

echo.
echo [2/2] Building production React bundle...
call npm run build:prod

if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%\build\index.html" (
    echo [ERROR] Build did not produce index.html
    pause
    exit /b 1
)

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║  ✓ Frontend rebuild complete!                       ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo Next steps:
echo   1. Stop the current server (if running)
echo   2. Run: start_server.bat
echo   3. Access at: http://10.12.219.167
echo.

pause
