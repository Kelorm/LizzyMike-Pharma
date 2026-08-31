@echo off
REM ============================================================
REM  start_lan_server.bat — Quick start LAN deployment
REM  Starts Django backend + Nginx web server
REM ============================================================

setlocal enabledelayedexpansion

REM Get the directory where this script is located
SET SCRIPT_DIR=%~dp0
SET PROJECT_DIR=%SCRIPT_DIR:~0,-1%
SET BACKEND_DIR=%PROJECT_DIR%\Backend
SET NGINX_DIR=C:\nginx

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║   LizzyMike Pharma - LAN Server Startup                 ║
echo ║   Set server IP in Backend\.env (ALLOWED_HOSTS / CORS)   ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

REM Check if Django is already running
tasklist | findstr /I "python.exe" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Python/Django may already be running
    echo    Tasklist shows active Python processes
)

REM Check if Nginx is running
tasklist | findstr /I "nginx.exe" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Nginx may already be running
)

echo.
echo 🚀 Starting services...
echo.

REM Validate paths exist
if not exist "%BACKEND_DIR%" (
    echo ERROR: Backend directory not found: %BACKEND_DIR%
    pause
    exit /b 1
)

if not exist "%NGINX_DIR%\nginx.exe" (
    echo ERROR: Nginx not found at %NGINX_DIR%
    pause
    exit /b 1
)

REM Detect venv — use absolute path to avoid wrong venv being picked up
if exist "%BACKEND_DIR%\venv\Scripts\python.exe" (
    SET PYTHON_EXE=%BACKEND_DIR%\venv\Scripts\python.exe
) else if exist "%BACKEND_DIR%\.venv\Scripts\python.exe" (
    SET PYTHON_EXE=%BACKEND_DIR%\.venv\Scripts\python.exe
) else (
    echo ERROR: No Python venv found in Backend\venv or Backend\.venv
    pause
    exit /b 1
)
echo [OK]  Using Python: %PYTHON_EXE%

REM Collect static files first
echo [0/3] Collecting Django static files...
cd /d "%BACKEND_DIR%"
set DJANGO_SETTINGS_MODULE=pharmasys.settings_consolidated
"%PYTHON_EXE%" manage.py collectstatic --noinput >nul 2>&1
echo       Done.

REM Start Django via Waitress in a new terminal window (Windows WSGI server, NOT runserver)
echo [1/3] Starting Django backend via Waitress on 0.0.0.0:8000...
echo       Access only via http:// through Nginx - never connect to port 8000 directly
start "Django Backend (Waitress) - LizzyMike Pharma" cmd /k "cd /d %BACKEND_DIR% ^& set DJANGO_SETTINGS_MODULE=pharmasys.settings_consolidated ^& %PYTHON_EXE% -m waitress --listen=0.0.0.0:8000 --threads=4 --call pharmasys.wsgi:get_wsgi_application"

REM Small delay to let Django start
timeout /t 2 /nobreak >nul

REM Start Nginx in a new terminal window
echo [2/3] Starting Nginx web server on port 80...
start "Nginx Web Server" cmd /k "cd /d %NGINX_DIR% && nginx.exe"

REM Small delay to let Nginx start
timeout /t 2 /nobreak >nul

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║   ✅ Services Starting                                  ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

echo 📍 Access your application:
echo.
echo   🌐 Frontend:    http://^<your-server-LAN-IP^>
echo   🔐 Admin:       http://localhost:8000/admin/   or  http://^<LAN-IP^>/admin/
echo   🔌 API:         http://^<your-server-LAN-IP^>/api/
echo.

echo 🔑 Create staff users with: python manage.py createsuperuser
echo    (Do not use default passwords in production.)
echo.

echo 📊 Service Status:
echo   - Django Backend:   Starting... (check "Django Backend" terminal)
echo   - Nginx:            Starting... (check "Nginx Web Server" terminal)
echo.

echo ⏹️  To stop services:
echo   - Close the terminal windows
echo   - Or use: taskkill /IM python.exe /F  (Django)
echo            taskkill /IM nginx.exe /F    (Nginx)
echo.

echo ═══════════════════════════════════════════════════════════
echo Tip: Minimize the terminal windows after startup is complete
echo ═══════════════════════════════════════════════════════════
echo.

pause
