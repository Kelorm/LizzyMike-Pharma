# Git Security Commands Reference

## Overview

These commands help you manage secrets and verify that sensitive files aren't being committed to git.

---

## Check for Previously Committed .env Files

### Command 1: List all .env* files in git history

```bash
# Find all .env files ever committed to git
git log --all --full-history --diff-filter=D -- ".env*"

# Show when each .env file was deleted
git log --all --full-history --diff-filter=D --summary -- ".env*"
```

### Command 2: Check if .env currently exists in any branch

```bash
# Check all branches
git branch -r | xargs -L 1 bash -c 'git ls-tree -r $1 | grep -E "\.env"' _

# Or simpler: check all commits for .env files
git rev-list --all | xargs -I {} git ls-tree -r {} | grep -E "\.env[^e]"
```

### Command 3: Find commits that touch .env files

```bash
# Find commits that added or modified .env files
git log --name-status --all -- ".env*" | head -50

# Show what changed in each commit
git log --patch --all -- ".env*" | head -100
```

---

## Permanently Remove Accidentally Committed Secrets

### ⚠️ WARNING: These commands rewrite history!
Only use if you've committed secrets to a LOCAL repository, before pushing to shared repos.

### Option 1: Remove .env file from all history (Recommended)

```bash
# Install BFG Repo Cleaner (easier than git filter-branch)
# https://rtyley.github.io/bfg-repo-cleaner/

# OR use git filter-branch:
git filter-branch --tree-filter 'rm -f .env .env.local .env.production' -- --all

# Force update all refs
git reset --hard

# Prune git database
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Option 2: Rewrite commits with BFG (Faster)

```bash
# Install BFG
# Windows: choco install bfg
# Mac: brew install bfg
# Linux: apt-get install bfg

# Remove .env files from all history
bfg --delete-files ".env*" --no-blob-protection /path/to/repo

# Clean up
cd /path/to/repo
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Option 3: Remove specific file with sensitive lines

```bash
# If you want to keep the file but remove specific lines:
git filter-branch --tree-filter "sed -i '/SECRET_KEY=/d' .env" -- --all
```

---

## Verify Secrets Are Not Committed

### Scan current repository for secret patterns

```bash
# Using git grep
git grep -i 'password\|api_key\|secret\|token' -- '*.py' '*.js' '*.env*'

# Find hardcoded secrets in commits
git log -p --all -- '*.py' | grep -i 'password\|api_key\|secret'

# Check staged files for secrets
git diff --cached | grep -i 'password\|api_key\|secret'
```

### Use a secret scanner tool

```bash
# Install detect-secrets
pip install detect-secrets

# Scan all files
detect-secrets scan

# Scan specific file
detect-secrets scan .env

# Scan git history
git log -p --all | detect-secrets scan
```

### Install and use truffleHog (Python-based scanner)

```bash
# Install
pip install truffleHog

# Scan entire git history
trufflehog git file:///path/to/repo --entropy=False

# Scan recent commits
trufflehog git file:///path/to/repo --since-commit HEAD~10
```

---

## Pre-Commit Hook Setup

### Install the security pre-commit hook

```bash
# On Windows (PowerShell)
cp .\.git\hooks\pre-commit .\.git\hooks\pre-commit.py
chmod +x .git\hooks\pre-commit

# On Mac/Linux
chmod +x .git/hooks/pre-commit
```

### Test the hook

```bash
# Make a staging change with a fake secret
echo "PASSWORD=MyRealPassword123" >> test.env
git add test.env

# Try to commit (should fail)
git commit -m "test"

# Clean up
git reset HEAD test.env
rm test.env
```

### Bypass hook if needed (not recommended)

```bash
git commit --no-verify -m "Force commit"
```

---

## Setup Git Attributes for Secret Files

### Create .gitattributes to track secret handling

```bash
# Create .gitattributes in repo root
cat > .gitattributes << 'EOF'
# Treat .env files specially
.env filter=git-crypt
.env.* filter=git-crypt
*.key filter=git-crypt
*.pem filter=git-crypt
secrets.json filter=git-crypt

# Prevent binary .env files
.env diff=text
EOF

git add .gitattributes
git commit -m "Add git attributes for secret files"
```

---

## Use git-crypt for Transparent Secret Encryption

### Install git-crypt

```bash
# Mac
brew install git-crypt

# Linux
apt-get install git-crypt

# Windows (via scoop)
scoop install git-crypt
```

### Setup git-crypt

```bash
# Initialize encryption in repo
git-crypt init

# Create .gitattributes (see section above)
echo ".env filter=git-crypt diff=git-crypt" >> .gitattributes

# Encrypt .env files
git-crypt add-gpg-user your-gpg-key-id

# Now .env files are automatically encrypted before pushing
git add .env
git commit -m "Add encrypted .env"
```

---

## Pre-Push Hook to Verify No Secrets

### Create pre-push hook

```bash
cat > .git/hooks/pre-push << 'bash'
#!/bin/bash
# Pre-push hook: prevents pushing commits with secrets

echo "🔐 Scanning for secrets before push..."

# Check for obvious secrets in commits being pushed
git log origin..HEAD -p | grep -E 'password|api_key|secret|token' && {
    echo "❌ Secrets detected in commits!"
    echo "Remove them with:"
    echo "  git rebase -i origin/main"
    exit 1
}

echo "✓ No obvious secrets detected"
exit 0
bash

# Make executable
chmod +x .git/hooks/pre-push
```

---

## Check Current Branch for Secrets

```bash
# Check uncommitted changes for secrets
git diff | grep -i 'password\|api_key\|secret'

# Check staged changes for secrets
git diff --staged | grep -i 'password\|api_key\|secret'

# Check last 10 commits
git log -p -10 | grep -i 'password\|api_key\|secret'

# Check specific file history
git log -p -- .env | grep -i 'password\|api_key\|secret'
```

---

## Fix: Remove Accidentally Staged Secrets

```bash
# If you accidentally staged a file with secrets:

# 1. Unstage the file
git reset HEAD .env

# 2. Edit to remove secrets
nano .env

# 3. Re-stage just safe changes
git add .env

# 4. Commit
git commit -m "Update configuration"
```

---

## Audit: Show all credentials ever committed

```bash
# Find all instances of specific patterns
git log -p --all | grep -E "password|secret|key|token" | head -50

# Show commits with secret files
git log --all --name-status -- '.env*' '*.key' 'secrets.json'

# Show by author
git log --all --name-status --author="username" -- '.env*'
```

---

## Configure Global Git Settings for Safety

```bash
# Warn before committing merge conflicts
git config --global merge.conflictstyle zdiff3

# Use verbose commit templates
git config --global commit.verbose true

# Require signed commits (if using GPG)
git config --global commit.gpgsign true

# Configure automatic secrets detection
git config --global core.excludesfile ~/.gitignore_global
echo ".env" >> ~/.gitignore_global
```

---

## Integration with CI/CD

### GitHub Actions secret scanner

```yaml
# .github/workflows/secrets-scan.yml
name: Detect Secrets
on: [push, pull_request]

jobs:
  detect-secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Detect secrets
        uses: Yelp/detect-secrets-action@master
        with:
          base: main
```

### GitLab CI secret scanner

```yaml
# .gitlab-ci.yml
detect_secrets:
  script:
    - pip install detect-secrets
    - detect-secrets scan
```

---

## Team Best Practices

1. ✅ **Always use .env.example** - commit examples, never actual files
2. ✅ **Use environment variables** - never hardcode secrets
3. ✅ **Review .gitignore** - before first commit
4. ✅ **Setup pre-commit hooks** - prevent accidents
5. ✅ **Use git-crypt** - if secrets must be in repo
6. ✅ **Scan before pushing** - use pre-push hooks
7. ✅ **Document setup** - new developers know what to do
8. ✅ **Rotate secrets regularly** - after any exposure

---

## Emergency: Secret Pushed to Public Repo

1. **Don't panic** - You can still rotate/revoke the secret
2. **Revoke immediately** - Password, API key, token, etc.
3. **Rewrite history** - Remove from git history (see above)
4. **Force push** - Push rewritten history
5. **Rotate again** - Generate new credentials
6. **Audit access** - Check logs for misuse
7. **Notify team** - Let everyone know

```bash
# Remove secret from history
git filter-branch --tree-filter 'rm -f .env' -- --all

# Force push to overwrite
git push --force-with-lease

# Notify users to re-clone
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Check for committed .env | `git log --all -- ".env*"` |
| Find secrets in history | `git log -p --all \| grep -i password` |
| Remove from history | `git filter-branch --tree-filter 'rm .env' -- --all` |
| Scan current files | `git diff --cached \| grep -i password` |
| Test pre-commit hook | `git commit --dry-run` |
| Setup git-crypt | `git-crypt init` |
| Rotate secrets | Generate new, update .env, commit |

---

**Remember**: Prevention is easier than cleanup. Use .env files, setup pre-commit hooks, and review .gitignore before your first commit!
