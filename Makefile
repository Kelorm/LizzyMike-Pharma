# LizzyMike Pharmacy - Makefile
# ==============================

# Default settings
PYTHON = python
DJANGO_MANAGE = Backend/manage.py
TEST_DIR = Backend
COVERAGE_MIN = 70

# Colors
GREEN = \033[0;32m
YELLOW = \033[0;33m
RED = \033[0;31m
NC = \033[0m # No Color

.PHONY: help install test test-coverage test-unit test-integration test-auth test-sales test-meds lint format clean backup backup-verify backup-list restore-backup

help:
	@echo "LizzyMike Pharmacy - Available Commands"
	@echo "========================================"
	@echo ""
	@echo "  Testing:"
	@echo "    make test             - Run all tests with coverage"
	@echo "    make test-coverage    - Run tests with detailed coverage report"
	@echo "    make test-unit        - Run unit tests only"
	@echo "    make test-integration - Run integration tests only"
	@echo "    make test-auth        - Run authentication tests"
	@echo "    make test-sales       - Run sales tests"
	@echo "    make test-meds        - Run medication tests"
	@echo ""
	@echo "  Code Quality (All Tools):"
	@echo "    make lint             - Run all code quality checks (backend + frontend + security)"
	@echo "    make check            - Same as lint"
	@echo "    make format           - Auto-format all code (black, isort, prettier)"
	@echo ""
	@echo "  Code Quality (Backend Only):"
	@echo "    make lint-py-only     - Run Python linters only (faster)"
	@echo "    make lint-backend     - Run backend checks: flake8, isort, mypy"
	@echo "    make lint-python      - Lint with flake8"
	@echo "    make lint-imports     - Check import sorting with isort"
	@echo "    make lint-types       - Type check with mypy"
	@echo "    make lint-debug       - Find debug statements and print() calls"
	@echo "    make lint-security    - Find hardcoded secrets"
	@echo "    make lint-frontend    - Lint React/TypeScript with ESLint"
	@echo "    make format-python    - Format Python with black and isort"
	@echo "    make format-frontend  - Format React/TypeScript with Prettier"
	@echo ""
	@echo "  Database Backups (CRITICAL):"
	@echo "    make backup           - Create immediate database backup"
	@echo "    make backup-verify    - Verify latest backup integrity"
	@echo "    make backup-list      - Show last 5 backups with details"
	@echo "    make restore-backup   - Restore database from backup (interactive)"
	@echo ""
	@echo "  Setup:"
	@echo "    make install          - Install all dependencies"
	@echo ""

install:
	@echo "$(GREEN)Installing dependencies...$(NC)"
	cd $(TEST_DIR) && $(PYTHON) -m pip install -r requirements.txt
	cd $(TEST_DIR) && $(PYTHON) -m pip install -r requirements-dev.txt

test: test-coverage

test-coverage:
	@echo "$(GREEN)Running tests with coverage...$(NC)"
	cd $(TEST_DIR) && $(PYTHON) -m pytest -v --cov=core --cov=pharmasys --cov-report=term-missing --cov-report=html --cov-report=xml
	@echo ""
	@echo "$(GREEN)Coverage Report Generated$(NC)"
	@echo "  HTML: Backend/htmlcov/index.html"
	@echo "  XML:  coverage.xml"
	@echo ""

test-unit:
	@echo "$(GREEN)Running unit tests...$(NC)"
	cd $(TEST_DIR) && $(PYTHON) -m pytest -v -m "unit"

test-integration:
	@echo "$(GREEN)Running integration tests...$(NC)"
	cd $(TEST_DIR) && $(PYTHON) -m pytest -v -m "integration"

test-auth:
	@echo "$(GREEN)Running authentication tests...$(NC)"
	cd $(TEST_DIR) && $(PYTHON) -m pytest -v core/tests/test_auth.py

test-sales:
	@echo "$(GREEN)Running sales tests...$(NC)"
	cd $(TEST_DIR) && $(PYTHON) -m pytest -v core/tests/test_sales.py

test-meds:
	@echo "$(GREEN)Running medication tests...$(NC)"
	cd $(TEST_DIR) && $(PYTHON) -m pytest -v core/tests/test_medications.py

test-quick:
	@echo "$(GREEN)Running quick tests (no coverage)...$(NC)"
	cd $(TEST_DIR) && $(PYTHON) -m pytest -v --no-cov

test-random:
	@echo "$(GREEN)Running tests with random order...$(NC)"
	cd $(TEST_DIR) && $(PYTHON) -m pytest -v --randomly-seed=0

# =============================================================================
# CODE QUALITY CHECKS
# =============================================================================

lint: lint-backend lint-frontend lint-security
	@echo ""
	@echo "$(GREEN)✓ All code quality checks passed!$(NC)"

lint-backend: lint-python lint-imports lint-types lint-debug
	@echo "$(GREEN)✓ Backend lint checks passed!$(NC)"

lint-python:
	@echo "$(YELLOW)Checking Python code with flake8...$(NC)"
	cd Backend && flake8 core/ pharmasys/ management/ \
		--max-line-length=88 \
		--extend-ignore=E203,W503 \
		--exclude=migrations/,staticfiles/,__pycache__ || true

lint-imports:
	@echo "$(YELLOW)Checking import order with isort...$(NC)"
	cd Backend && isort core/ pharmasys/ management/ \
		--profile=black \
		--line-length=88 \
		--check-only \
		--diff || true

lint-types:
	@echo "$(YELLOW)Type checking with mypy...$(NC)"
	cd Backend && mypy core/ pharmasys/ management/ \
		--ignore-missing-imports \
		--no-implicit-optional \
		2>/dev/null || true

lint-debug:
	@echo "$(YELLOW)Checking for debug statements...$(NC)"
	@! grep -r "print(" Backend/core Backend/pharmasys Backend/management \
		--include="*.py" \
		--exclude-dir=migrations \
		--exclude-dir=__pycache__ \
		--exclude-dir=.venv \
		-n 2>/dev/null | grep -v "LOG\|logger\|#" || echo "$(GREEN)No debug print statements found$(NC)"
	@! grep -r "breakpoint(" Backend/core Backend/pharmasys Backend/management \
		--include="*.py" \
		--exclude-dir=migrations \
		--exclude-dir=__pycache__ \
		--exclude-dir=.venv \
		-n 2>/dev/null || echo "$(GREEN)No breakpoint() statements found$(NC)"

lint-frontend:
	@echo "$(YELLOW)Linting TypeScript/React with ESLint...$(NC)"
	@if [ -f "Frontend/package.json" ]; then \
		cd Frontend && npm run lint 2>/dev/null || echo "$(RED)ESLint check failed - run: cd Frontend && npm install && npm run lint$(NC)"; \
	else \
		echo "$(YELLOW)Skipping frontend lint - Frontend/package.json not found$(NC)"; \
	fi

lint-security:
	@echo "$(YELLOW)Checking for security issues...$(NC)"
	@! grep -r "password.*=" Backend/core Backend/pharmasys Backend/management \
		--include="*.py" \
		--include="*.env*" \
		--exclude-dir=migrations \
		--exclude-dir=__pycache__ \
		-i 2>/dev/null | grep -v "MIN_PASSWORD\|PASSWORD_HASH\|DJANGO_PASSWORD\|PASSWORD_VALIDATORS\|#" || echo "$(GREEN)No hardcoded passwords found$(NC)"
	@! find . -name ".env" -type f 2>/dev/null | grep -v ".venv\|node_modules" || echo "$(GREEN).env file check passed$(NC)"

format: format-python format-frontend
	@echo ""
	@echo "$(GREEN)✓ All code formatting complete!$(NC)"

format-python:
	@echo "$(YELLOW)Formatting Python code with Black...$(NC)"
	cd Backend && black core/ pharmasys/ management/ --line-length=88
	@echo "$(YELLOW)Sorting imports with isort...$(NC)"
	cd Backend && isort core/ pharmasys/ management/ --profile=black --line-length=88

format-frontend:
	@echo "$(YELLOW)Formatting TypeScript/React with Prettier...$(NC)"
	@if [ -f "Frontend/package.json" ]; then \
		cd Frontend && npm run format 2>/dev/null || echo "$(YELLOW)Skipping frontend format - run: cd Frontend && npm install && npm run format$(NC)"; \
	else \
		echo "$(YELLOW)Skipping frontend format - Frontend/package.json not found$(NC)"; \
	fi

# Check all code quality without auto-fixing
check: lint
	@echo ""
	@echo "$(GREEN)✓ Code quality check complete!$(NC)"

# Run only Python linters (faster for backend-only development)
lint-py-only: lint-python lint-imports lint-debug
	@echo ""
	@echo "$(GREEN)✓ Python lint checks passed!$(NC)"

clean:
	@echo "$(GREEN)Cleaning up...$(NC)"
	rm -rf $(TEST_DIR)/htmlcov/
	rm -rf $(TEST_DIR)/.coverage
	rm -rf $(TEST_DIR)/coverage.xml
	rm -rf $(TEST_DIR)/**/__pycache__
	rm -rf $(TEST_DIR)/.pytest_cache
	find $(TEST_DIR) -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find $(TEST_DIR) -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@echo "$(GREEN)Clean complete!$(NC)"

# Check coverage threshold
check-coverage:
	@echo "$(YELLOW)Checking coverage threshold (minimum $(COVERAGE_MIN)%)...$(NC)"
	cd $(TEST_DIR) && $(PYTHON) -c "\
import xml.etree.ElementTree as ET
tree = ET.parse('coverage.xml')
root = tree.getroot()
for line in root.findall('.//line'):
    if line.get('type') == 'stmt':
        coverage = float(line.get('coverage', 0))
        break
else:
    print('$(RED)Could not find coverage data$(NC)')
    exit(1)
if coverage < $(COVERAGE_MIN):
    print('$(RED)Coverage $(COVERAGE_MIN)% is below threshold!$(NC)')
    exit(1)
else:
    print('$(GREEN)Coverage check passed!$(NC)')
"

# =============================================================================
# DATABASE BACKUP COMMANDS (CRITICAL FOR DATA PROTECTION)
# =============================================================================

backup:
	@echo "$(YELLOW)🔄 Creating database backup...$(NC)"
	cd $(TEST_DIR) && $(PYTHON) manage.py backup_database
	@echo "$(GREEN)✓ Backup complete!$(NC)"

backup-verify:
	@echo "$(YELLOW)🔍 Creating and verifying backup...$(NC)"
	cd $(TEST_DIR) && $(PYTHON) manage.py backup_database --verify
	@echo "$(GREEN)✓ Backup verification complete!$(NC)"

backup-list:
	@echo "$(YELLOW)📋 Last 5 Backups:$(NC)"
	@cd $(TEST_DIR) && $(PYTHON) -c "\
from core.backup import DatabaseBackup
db_backup = DatabaseBackup()
backups = db_backup.list_backups(limit=5)
if not backups:
    print('No backups found')
else:
    for i, b in enumerate(backups, 1):
        print(f'{i}. {b[\"filename\"]:<42} {b[\"size_mb\"]:>8}MB  {b[\"date_str\"]}')\
"

restore-backup:
	@echo "$(YELLOW)⚠️  DATABASE RESTORE (DANGEROUS - OVERWRITES CURRENT DB)$(NC)"
	cd $(TEST_DIR) && $(PYTHON) manage.py restore_backup

restore-backup-force:
	@echo "$(RED)🔴 FORCE RESTORE (No confirmation prompts)$(NC)"
	cd $(TEST_DIR) && $(PYTHON) manage.py restore_backup --force