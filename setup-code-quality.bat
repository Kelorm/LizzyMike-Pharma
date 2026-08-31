@echo off
REM ============================================================================
REM LizzyMike Pharmacy - Code Quality Setup Script
REM ============================================================================
REM This script installs all code quality tools and pre-commit hooks
REM Run this once after cloning the repository
REM ============================================================================

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║     LizzyMike Pharmacy - Code Quality Setup                    ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Python is not installed or not in PATH
    echo    Please install Python 3.11+ from https://www.python.org/downloads/
    exit /b 1
)
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo ✓ Python %PYTHON_VERSION% found

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Node.js is not installed or not in PATH
    echo    Please install Node.js 18+ from https://nodejs.org/
    exit /b 1
)
for /f "tokens=1" %%i in ('node --version 2^>^&1') do set NODE_VERSION=%%i
echo ✓ Node.js %NODE_VERSION% found

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Git is not installed or not in PATH
    echo    Please install Git from https://git-scm.com/download/win
    exit /b 1
)
echo ✓ Git found

echo.
echo Installing pre-commit...
pip install pre-commit
if errorlevel 1 (
    echo ❌ Failed to install pre-commit
    exit /b 1
)
echo ✓ pre-commit installed

echo.
echo Installing git hooks...
pre-commit install
if errorlevel 1 (
    echo ❌ Failed to install git hooks
    exit /b 1
)
echo ✓ Git hooks installed

echo.
echo Installing Backend Python tools...
cd Backend
pip install -r requirements.txt
if errorlevel 1 (
    echo ❌ Failed to install requirements.txt
    cd ..
    exit /b 1
)

pip install -r requirements-dev.txt
if errorlevel 1 (
    echo ⚠ Warning: requirements-dev.txt may not exist
)

pip install black isort flake8 mypy django-stubs types-all
if errorlevel 1 (
    echo ❌ Failed to install dev dependencies
    cd ..
    exit /b 1
)
echo ✓ Backend Python tools installed
cd ..

echo.
echo Installing Frontend npm packages...
cd Frontend
call npm install
if errorlevel 1 (
    echo ❌ Failed to install Frontend dependencies
    cd ..
    exit /b 1
)
echo ✓ Frontend packages installed
cd ..

echo.
echo Running initial checks...
pre-commit run --all-files
if errorlevel 1 (
    echo ⚠ Some pre-commit checks may have failed
    echo   This is normal on first run - just commit the changes it made
)

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                   ✓ Setup Complete!                           ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo You're all set! Here's what was installed:
echo   ✓ pre-commit hooks
echo   ✓ Python tools: black, isort, flake8, mypy
echo   ✓ Backend dependencies
echo   ✓ Frontend dependencies (npm packages)
echo.
echo Next steps:
echo   1. Make a code change
echo   2. Run: git add .
echo   3. Run: git commit -m "your message"
echo   4. Pre-commit hooks will run automatically
echo.
echo Quick commands:
echo   make lint     - Check code quality
echo   make format   - Auto-format code
echo   make test     - Run tests
echo.
echo For more info, see: CODE_QUALITY_SETUP.md
echo.
