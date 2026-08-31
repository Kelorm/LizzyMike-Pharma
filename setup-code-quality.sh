#!/bin/bash

# ============================================================================
# LizzyMike Pharmacy - Code Quality Setup Script (macOS/Linux)
# ============================================================================
# This script installs all code quality tools and pre-commit hooks
# Run this once after cloning the repository
# ============================================================================

set -e  # Exit on any error

echo
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     LizzyMike Pharmacy - Code Quality Setup                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ ERROR: Python 3 is not installed${NC}"
    echo "   Please install Python 3.11+ from https://www.python.org/downloads/"
    exit 1
fi
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo -e "${GREEN}✓${NC} Python $PYTHON_VERSION found"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ ERROR: Node.js is not installed${NC}"
    echo "   Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✓${NC} Node.js $NODE_VERSION found"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ ERROR: Git is not installed${NC}"
    echo "   Please install Git from https://git-scm.com/download/mac"
    exit 1
fi
echo -e "${GREEN}✓${NC} Git found"

echo
echo "Installing pre-commit..."
python3 -m pip install pre-commit
echo -e "${GREEN}✓${NC} pre-commit installed"

echo
echo "Installing git hooks..."
pre-commit install
echo -e "${GREEN}✓${NC} Git hooks installed"

echo
echo "Installing Backend Python tools..."
cd Backend

# Install main requirements
python3 -m pip install -r requirements.txt
if [ -f "requirements-dev.txt" ]; then
    python3 -m pip install -r requirements-dev.txt
fi

# Install dev tools
python3 -m pip install black isort flake8 mypy django-stubs types-all

echo -e "${GREEN}✓${NC} Backend Python tools installed"
cd ..

echo
echo "Installing Frontend npm packages..."
cd Frontend
npm install
echo -e "${GREEN}✓${NC} Frontend packages installed"
cd ..

echo
echo "Running initial checks..."
pre-commit run --all-files || true

echo
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   ✓ Setup Complete!                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo
echo "You're all set! Here's what was installed:"
echo "  ✓ pre-commit hooks"
echo "  ✓ Python tools: black, isort, flake8, mypy"
echo "  ✓ Backend dependencies"
echo "  ✓ Frontend dependencies (npm packages)"
echo
echo "Next steps:"
echo "  1. Make a code change"
echo "  2. Run: git add ."
echo "  3. Run: git commit -m 'your message'"
echo "  4. Pre-commit hooks will run automatically"
echo
echo "Quick commands:"
echo "  make lint     - Check code quality"
echo "  make format   - Auto-format code"
echo "  make test     - Run tests"
echo
echo "For more info, see: CODE_QUALITY_SETUP.md"
echo
