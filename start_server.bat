@echo off
REM ============================================================
REM  start_server.bat — Start LizzyMike Pharma LAN Server
REM  Double-click this to start everything.
REM  Put a shortcut in shell:startup to auto-start on boot.
REM ============================================================

setlocal

REM Get the directory where this script is located
SET SCRIPT_DIR=%~dp0
SET PROJECT_DIR=%SCRIPT_DIR:~0,-1%
SET BACKEND_DIR=%PROJECT_DIR%\Backend
SET NGINX_DIR=C:\nginx
SET SETTINGS=pharmasys.settings_consolidated

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║    Starting LizzyMike Pharma Local Server...        ║
echo ╚══════════════════════════════════════════════════════╝
echo.

REM ---- Detect venv — set PYTHON_EXE to absolute path ----
if exist "%BACKEND_DIR%\venv\Scripts\python.exe" (
    SET PYTHON_EXE=%BACKEND_DIR%\venv\Scripts\python.exe
    SET VENV_ACT=call "%BACKEND_DIR%\venv\Scripts\activate.bat"
) else if exist "%BACKEND_DIR%\.venv\Scripts\python.exe" (
    SET PYTHON_EXE=%BACKEND_DIR%\.venv\Scripts\python.exe
    SET VENV_ACT=call "%BACKEND_DIR%\.venv\Scripts\activate.bat"
) else (
    echo [ERROR] No Python virtual environment found in Backend\venv or Backend\.venv
    echo         Run setup_local.bat first.
    pause
    exit /b 1
)
echo [OK]  Using Python: %PYTHON_EXE%

REM ---- Check Nginx is installed ----
if not exist "%NGINX_DIR%\nginx.exe" (
    echo [ERROR] Nginx not found at %NGINX_DIR%
    echo         Download and extract Nginx to C:\nginx first.
    pause
    exit /b 1
)

REM ---- Check .env exists ----
if not exist "%BACKEND_DIR%\.env" (
    echo [ERROR] Backend\.env not found.
    echo         Copy env.lan.example to .env and fill in SECRET_KEY and DB_PASSWORD.
    pause
    exit /b 1
)

REM ---- Start Django via Waitress (Windows production WSGI server, NOT runserver) ----
echo [1/2] Starting Django backend via Waitress on 0.0.0.0:8000...
echo       (Using Python: %PYTHON_EXE%)
start "LizzyMike - Backend (Waitress)" cmd /k "cd /d %BACKEND_DIR% && set DJANGO_SETTINGS_MODULE=%SETTINGS% && "%PYTHON_EXE%" -m waitress --listen=0.0.0.0:8000 --threads=4 --call pharmasys.wsgi:get_wsgi_application"

REM ---- Wait 4 seconds for Gunicorn to start ----
timeout /t 4 /nobreak >nul

REM ---- Start Nginx in its own window ----
echo [2/2] Starting Nginx (web server)...
start "LizzyMike - Nginx (Web Server)" cmd /k "cd /d %NGINX_DIR% && nginx -g \"daemon off;\""

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  ✅ LizzyMike Pharma is starting up!                    ║
echo ║                                                          ║
echo ║  On this PC:    http://localhost                         ║
echo ║  Other PCs:     http://10.12.219.167                    ║
echo ║                                                          ║
echo ║  Admin panel:   http://10.12.219.167/admin/             ║
echo ║  API:           http://10.12.219.167/api/               ║
echo ║                                                          ║
echo ║  NOTE: Access only via http:// — never https://         ║
echo ║  To stop everything: run stop_server.bat                ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

