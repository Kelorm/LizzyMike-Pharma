# 🧹 Code Quality Setup Guide

**For new developers: How to set up code quality tools**

---

## 📋 Overview

This guide walks you through setting up automatic code quality checks for the LizzyMike Pharmacy system. Once configured, your code will be automatically formatted and linted **every time you commit**.

**What gets checked:**
- ✅ Python code formatting (Black)
- ✅ Import sorting (isort)
- ✅ Linting errors (Flake8)
- ✅ Type checking (mypy)
- ✅ Debug statements (print(), breakpoint())
- ✅ Accidental secrets (.env files, hardcoded passwords)
- ✅ TypeScript/React formatting (Prettier)
- ✅ React/TypeScript linting (ESLint)

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Install pre-commit

```bash
# Windows (using PowerShell)
pip install pre-commit

# macOS/Linux
pip install pre-commit

# Verify installation
pre-commit --version
# Should show: pre-commit 3.x.x or higher
```

### Step 2: Install the git hooks

```bash
# From project root
cd c:\Users\KELORM\Desktop\LizzyMikePharma

# Install pre-commit hooks
pre-commit install

# Output should show:
# ✓ pre-commit installed at .git/hooks/pre-commit
```

### Step 3: Install Python dependencies

```bash
cd Backend

# Install development dependencies
pip install -r requirements-dev.txt

# Plus these specific tools
pip install black isort flake8 mypy django-stubs types-all
```

### Step 4: Install Node.js dependencies (Frontend)

```bash
cd Frontend

# Install npm packages
npm install

# Installs ESLint, Prettier, and all dependencies
```

### Step 5: Test it works

```bash
# From project root
pre-commit run --all-files

# Output should show all checks running:
# [1] Trim trailing whitespace
# [2] Fix end of file
# [3] Check YAML
# ... (and more)
```

**✅ You're done!** Pre-commit is now installed and will run on every commit.

---

## 📝 How to Use

### Before Every Commit

```bash
# Make your changes
# ... edit files ...

# Stage your changes
git add .

# Try to commit
git commit -m "Add new feature"

# Pre-commit hooks automatically run:
# - Formats your code
# - Sorts imports
# - Checks for linting errors
# - Checks for secrets
# - Runs type checking

# If all checks pass:
# ✅ Commit succeeds

# If checks fail:
# ❌ Commit is blocked
# ℹ️ Read the error messages
# 🔧 Fix the issues
# ➡️ Try again
```

### Running Checks Manually

**Check everything:**
```bash
make lint
```

**Format everything:**
```bash
make format
```

**Backend only (faster):**
```bash
make lint-py-only      # Just Python linting
make format-python     # Just Python formatting
```

**Frontend only:**
```bash
make lint-frontend     # ESLint + TypeScript check
make format-frontend   # Prettier formatting
```

**Run specific tools:**
```bash
cd Backend
black core/ pharmasys/ --check  # Check without formatting
isort . --check-only            # Check import order
flake8 .                        # Run linter
mypy .                          # Type checking
```

---

## 🔧 Configuration Files

These files control the code quality tools:

| File | What it does |
|------|------------|
| `Backend/pyproject.toml` | Python tool configuration (black, isort, flake8, mypy) |
| `.pre-commit-config.yaml` | Pre-commit hook definitions |
| `Frontend/.eslintrc.json` | ESLint rules for React/TypeScript |
| `Frontend/.prettierrc` | Prettier formatting rules |
| `.github/workflows/quality-checks.yml` | GitHub Actions CI/CD |
| `Makefile` | Quick commands like `make lint` |

**Don't edit these files unless you know what you're doing!**

---

## ⚙️ Tool Configurations

### Black (Python Formatter)
- Line length: **88 characters**
- Target Python version: **3.11**
- Automatically formats your code to be consistent

### isort (Import Sorter)
- Profile: **black** (compatible with Black)
- Line length: **88 characters**
- Sorts imports automatically

### Flake8 (Python Linter)
- Max line length: **88** (matches Black)
- Ignores: E203, W503 (Black conflicts)
- Reports PEP8 violations

### mypy (Type Checker)
- Python version: **3.11**
- Checks for type errors in Python code
- Can be strict but warnings-only in CI

### ESLint (React/TypeScript Linter)
- Config: `Frontend/.eslintrc.json`
- Checks for React hooks rules
- Enforces TypeScript best practices
- Auto-fixes issues with `--fix` flag

### Prettier (Code Formatter)
- Config: `Frontend/.prettierrc`
- Print width: **88** (matches backend)
- Single quotes for consistency
- Trailing commas always

---

## ⚠️ Common Issues & Solutions

### Issue 1: "command not found: pre-commit"

```bash
# Solution: Install pre-commit
pip install pre-commit

# Then install hooks
pre-commit install

# Then try again
pre-commit run --all-files
```

### Issue 2: Pre-commit hooks not running on commit

```bash
# Check if hooks are installed
ls -la .git/hooks/pre-commit

# If missing, reinstall
pre-commit install

# Try committing again
```

### Issue 3: Commit blocked by Black formatting

```
# Error: Code doesn't match Black's formatting

# Solution: Auto-fix with Black
cd Backend
black core/ pharmasys/

# Then stage and commit again
git add .
git commit -m "Fix formatting"
```

### Issue 4: Import order conflicts

```
# Error: isort wants different order

# Solution: Auto-fix with isort
cd Backend
isort core/ pharmasys/

# Then stage and commit again
git add .
git commit -m "Fix import order"
```

### Issue 5: Mypy errors (type checking)

```
# Error: mypy found type errors

# Solution: Read the error, fix the code
# Example: Add type hints
def process_data(value: int) -> str:
    return str(value)

# Then stage and commit again
git add .
git commit -m "Add type hints"
```

### Issue 6: ESLint errors in React code

```bash
# Error: ESLint found issues

# Solution 1: Auto-fix with ESLint
cd Frontend
npm run lint -- --fix

# Solution 2: Manual fix
# Read the error message and fix the code

# Then stage and commit again
git add .
git commit -m "Fix ESLint errors"
```

### Issue 7: Pre-commit is slow

```bash
# Problem: Checks take too long

# Solution 1: Run only changed files (faster)
pre-commit run

# Solution 2: Skip on non-critical commits
git commit --no-verify -m "WIP: still working"

# Solution 3: Run full checks manually before pushing
make lint
```

### Issue 8: "No .env file should be committed"

```bash
# Error: .env file is staged for commit

# Solution: Remove it
git rm --cached .env

# Add .env to .gitignore
echo ".env" >> .gitignore

# Then stage and commit again
git add .
git commit -m "Remove .env from tracking"
```

---

## 🔍 Checking Your Work

### Before Pushing

```bash
# Run all quality checks
make lint
make format
make test

# Then push
git push
```

### On Your PR (Automated)

GitHub Actions will automatically:
- ✅ Run all code quality checks
- ✅ Run tests
- ✅ Check for security issues
- ✅ Report results on your PR

**If checks fail**, you'll see a red ❌ on your PR:
1. Read the error messages
2. Fix the issues locally
3. Commit and push again
4. GitHub Actions will re-run automatically

---

## 📚 Common Developer Tasks

### I just joined the team

```bash
# 1. Clone the repo
git clone <repo-url>

# 2. Follow setup steps above (Steps 1-4)
pip install pre-commit
pre-commit install
pip install -r Backend/requirements-dev.txt
cd Frontend && npm install

# 3. You're ready!
```

### Before submitting a PR

```bash
# 1. Make your changes
# 2. Run checks
make lint
make format
make test

# 3. If all pass, commit
git add .
git commit -m "Describe your change"

# 4. Push
git push origin your-branch

# 5. Create PR on GitHub
```

### During code review

**If reviewer says "formatting issues":**
```bash
# Don't manually fix - use tools
make format

# Commit the changes
git add .
git commit -m "Fix formatting"

# Push again
git push
```

**If reviewer says "type errors":**
```bash
# Use mypy to check
cd Backend
mypy . --ignore-missing-imports

# Add type hints where needed
# See examples below
```

### Type hints examples

```python
# ❌ Bad (no type hints)
def calculate_total(items):
    return sum(items)

# ✅ Good (with type hints)
def calculate_total(items: list[float]) -> float:
    return sum(items)

# ❌ Bad (missing return type)
def get_user_name(user_id):
    return User.objects.get(id=user_id).name

# ✅ Good (complete type hints)
def get_user_name(user_id: int) -> str:
    return User.objects.get(id=user_id).name
```

---

## 🚫 When to Skip Hooks (Rarely!)

Sometimes you need to commit without hooks:

```bash
# Skip pre-commit for this commit
git commit --no-verify -m "Emergency hotfix"

# ⚠️ Only do this for urgent fixes!
# You should still run full checks and fix issues ASAP
```

**Don't make a habit of this!** The hooks are there to help.

---

## 🔄 Updating Tools

Every few months, update the tools to latest versions:

```bash
# Update Python tools
pip install --upgrade black isort flake8 mypy

# Update Node.js tools
cd Frontend
npm update

# Update pre-commit hooks
pre-commit autoupdate

# Test everything still works
pre-commit run --all-files
make lint
make test
```

---

## 📞 Questions?

**"What does this error mean?"**
- Read the error message carefully
- It tells you exactly what's wrong
- Use your IDE to hover over errors for hints

**"How do I fix this?"**
- Run `make format` for formatting issues
- Add type hints for mypy errors
- Check the specific tool's documentation

**"Can I disable a check?"**
- Edit the config files (but don't!)
- Or ask your team lead first
- Some checks are critical for security

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Pre-commit installed: `pre-commit --version` shows 3.x+
- [ ] Git hooks installed: `.git/hooks/pre-commit` exists
- [ ] Python tools installed: `black --version`, `flake8 --version`
- [ ] Pre-commit runs: `pre-commit run --all-files` succeeds
- [ ] Make lint works: `make lint` succeeds
- [ ] Make format works: `make format` succeeds
- [ ] GitHub Actions runs: PR checks appear on pull request

---

## 🎯 Next Steps

1. **Complete the setup** - Follow "Quick Setup" section
2. **Make a test commit** - Try making a small change
3. **See checks run** - Watch pre-commit do its job
4. **Ask for help** - If something breaks, ask team lead

---

## 📖 Reference

| Command | What it does |
|---------|------------|
| `make lint` | Run all code quality checks |
| `make format` | Auto-format all code |
| `make lint-py-only` | Python checks only (faster) |
| `make test` | Run tests |
| `pre-commit run --all-files` | Run hooks on everything |
| `pre-commit install` | Install hooks |
| `pre-commit uninstall` | Remove hooks (not recommended) |

---

**Happy coding! 🚀**

The tools are here to help, not to hinder. Once you get used to them, you'll love having clean, consistent code automatically!
