# Developer Setup Guide: Environment Configuration

This guide explains how to set up your environment files (.env) for development without compromising security.

## Overview

Your project uses environment files to store configuration that varies between development, staging, and production environments:

- **`.env.example`** - Template showing all required variables (commit to git)
- **`.env`** - Your actual configuration with real values (NEVER commit)
- **`.env.local`** - Frontend development overrides (NEVER commit)

**GOLDEN RULE**: If a file contains passwords, API keys, or database credentials, it should NOT be in git.

---

## Quick Start (5 minutes)

### Backend Setup

```bash
# 1. Navigate to Backend folder
cd Backend

# 2. Copy the example file
cp .env.example .env

# 3. Edit with your actual values (use your editor)
# On Windows:
start .env
# On Mac/Linux:
nano .env
```

### Frontend Setup

```bash
# 1. Navigate to Frontend folder
cd Frontend

# 2. Copy the example file
cp .env.example .env.local

# 3. Edit with your actual values
# On Windows:
start .env.local
# On Mac/Linux:
nano .env.local
```

---

## Backend Configuration (.env)

The Backend uses Django and requires database credentials and API keys.

### Step 1: Generate Django Secret Key

```bash
cd Backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Generate secret key
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Copy the output (it's a long random string)
```

### Step 2: Fill in Backend/.env

Edit `Backend/.env` and replace these placeholders:

```ini
# 1. SECRET KEY (from step 1 above)
DJANGO_SECRET_KEY=<paste-the-generated-key-here>

# 2. Database Password (make it strong!)
# Use: Mix of uppercase, lowercase, numbers, special characters
# Example: P@ssw0rd!Secure#2024
DB_PASSWORD=<your-strong-password>

# 3. Admin Password (for the superuser)
# This is different from database password
DJANGO_SUPERUSER_PASSWORD=<your-admin-password>

# 4. Server IP (check with ipconfig)
ALLOWED_HOSTS=localhost,127.0.0.1,<your-machine-ip>
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://<your-machine-ip>
```

### Example filled Backend/.env

```ini
DJANGO_SECRET_KEY=ab&cd1234efgh5678ijkl9012mnopqrst3456uvwx7890yz
DEBUG=False
DJANGO_SETTINGS_MODULE=pharmasys.settings_postgres

ALLOWED_HOSTS=localhost,127.0.0.1,192.168.0.137

DB_NAME=lizzymike_db
DB_USER=pharma_user
DB_PASSWORD=Secure@Password#2024
DB_HOST=localhost
DB_PORT=5432

DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@yourdomain.local
DJANGO_SUPERUSER_PASSWORD=AdminPass@123

CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://192.168.0.137
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://192.168.0.137

PHARM_TAX_RATE=0.03
PHARMACY_NAME=LizzyMike Pharmacy
PHARMACY_PHONE=+1-555-0100
```

### Test Backend Configuration

```bash
# In Backend folder
.\venv\Scripts\Activate.ps1

# Check if settings load
python manage.py shell
>>> from django.conf import settings
>>> print(settings.DATABASES)
>>> exit()
```

---

## Frontend Configuration (.env.local)

The Frontend is a React application that needs API endpoint configuration.

### Step 1: Determine Backend URL

- **Local development**: `http://localhost:8000`
- **LAN testing**: `http://192.168.0.137:8000`
- **Production**: `https://api.yourdomain.com`

### Step 2: Fill in Frontend/.env.local

Edit `Frontend/.env.local`:

```ini
# Point to your backend
REACT_APP_API_URL=http://localhost:8000

# Keep these as-is for development
REACT_APP_API_BASE_PATH=/api
REACT_APP_DEBUG=true
REACT_APP_NAME=LizzyMike Pharmacy
```

### Example filled Frontend/.env.local

```ini
REACT_APP_API_URL=http://localhost:8000
REACT_APP_API_BASE_PATH=/api
REACT_APP_TIMEOUT=30000

REACT_APP_TOKEN_KEY=pharma_access_token
REACT_APP_TOKEN_EXPIRY=60

REACT_APP_NAME=LizzyMike Pharmacy
REACT_APP_DEBUG=false
REACT_APP_LOG_LEVEL=warn

REACT_APP_PAGE_SIZE=20
REACT_APP_ENV=development
NODE_ENV=development
```

### Test Frontend Configuration

```bash
# In Frontend folder
npm start

# Check console for:
# ✓ API URL correctly configured
# ✓ No console errors about undefined variables
```

---

## Environment Variables Explained

### Database Variables

```ini
DB_NAME=lizzymike_db          # PostgreSQL database name
DB_USER=pharma_user           # PostgreSQL user account
DB_PASSWORD=YourPassword@123  # PostgreSQL password (STRONG!)
DB_HOST=localhost             # Server where PostgreSQL runs
DB_PORT=5432                  # PostgreSQL default port
```

**Security**: Database password should be:
- 12+ characters
- Mix of uppercase, lowercase, numbers, symbols
- NOT shared between environments
- Rotated periodically

### Django Secret Key

```ini
DJANGO_SECRET_KEY=your-super-secret-key-here
```

**Security**:
- Generated once, never shared
- Different per environment
- Must be 50+ characters
- Use provided Python command to generate

### API Configuration

```ini
REACT_APP_API_URL=http://localhost:8000  # Where frontend reaches backend
ALLOWED_HOSTS=localhost,127.0.0.1        # What hostnames Django accepts
CORS_ALLOWED_ORIGINS=http://localhost:3000  # What domains can call API
```

**Security**:
- Prevent CORS attacks by limiting origins
- Only include necessary hosts
- Match across frontend and backend

---

## Common Issues & Solutions

### Issue: "Forbidden (403)" when accessing API

**Cause**: CORS not configured correctly

**Fix**:
1. Check `CORS_ALLOWED_ORIGINS` in Backend/.env
2. Ensure it includes your Frontend URL (with protocol and port)
3. Example: `http://localhost:3000` (not just `localhost`)

```bash
# Backend error log will show:
# CORS header 'Access-Control-Allow-Origin' missing

# Add frontend URL to Backend/.env:
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://192.168.0.137:3000
```

### Issue: "Invalid API URL" in Frontend console

**Cause**: REACT_APP_API_URL not set correctly

**Fix**:
1. Frontend must have `.env.local` (not just `.env`)
2. Variable must start with `REACT_APP_`
3. Rebuild frontend: `npm run build` or restart dev server

```bash
# Check Frontend/.env.local has:
REACT_APP_API_URL=http://localhost:8000

# NOT:
API_URL=http://localhost:8000  # Missing REACT_APP_ prefix!
```

### Issue: "Database connection refused"

**Cause**: DB_HOST, DB_PORT, or credentials wrong

**Fix**:
```bash
# Test PostgreSQL connection
psql -U pharma_user -h localhost -d lizzymike_db

# If fails, check Backend/.env for:
DB_HOST=localhost
DB_PORT=5432
DB_USER=pharma_user
DB_PASSWORD=<correct-password>
```

### Issue: "Secret key is too short"

**Cause**: DJANGO_SECRET_KEY was manually entered instead of generated

**Fix**:
```bash
# Generate correct secret key
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Paste output into Backend/.env
```

---

## Environment-Specific Configurations

### Development (Local Machine)

```ini
# Backend/.env
DEBUG=True
DB_HOST=localhost
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Frontend/.env.local
REACT_APP_API_URL=http://localhost:8000
REACT_APP_DEBUG=true
REACT_APP_LOG_LEVEL=debug
NODE_ENV=development
```

### Staging (LAN Testing)

```ini
# Backend/.env
DEBUG=False
DB_HOST=192.168.0.137
ALLOWED_HOSTS=192.168.0.137,192.168.1.100
CORS_ALLOWED_ORIGINS=http://192.168.0.137,http://192.168.1.100

# Frontend/.env.local
REACT_APP_API_URL=http://192.168.0.137:8000
REACT_APP_DEBUG=false
NODE_ENV=production (but running locally)
```

### Production (Server Deployment)

```ini
# Backend/.env (on server only)
DEBUG=False
DB_HOST=<production-db-ip>
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend

# Frontend/.env.local (rebuilt before deployment)
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_DEBUG=false
NODE_ENV=production
```

---

## Security Best Practices

### ✅ DO

- ✅ Copy from `.env.example` as your template
- ✅ Use strong, unique passwords (12+ characters with symbols)
- ✅ Keep `.env` and `.env.local` in `.gitignore`
- ✅ Change default passwords immediately after setup
- ✅ Use different credentials per environment
- ✅ Rotate passwords periodically
- ✅ Document what each variable does (see `.env.example`)

### ❌ DON'T

- ❌ Commit `.env` files to git
- ❌ Use simple passwords like "password123"
- ❌ Share credentials via email or chat
- ❌ Reuse same password across environments
- ❌ Hardcode credentials in source code
- ❌ Push `.env` to GitHub, GitLab, etc.
- ❌ Leave debugging enabled in production

---

## Verify Your Setup

### Backend Checklist

```bash
cd Backend
.\venv\Scripts\Activate.ps1

# 1. Check .env exists
ls .env

# 2. Django can load settings
python manage.py check

# 3. Can connect to database
python manage.py dbshell
\q

# 4. Can run migrations
python manage.py migrate --plan

# 5. Can create test user
python manage.py createsuperuser
```

### Frontend Checklist

```bash
cd Frontend

# 1. Check .env.local exists
ls .env.local

# 2. Can read variables
cat .env.local

# 3. Start dev server
npm start

# 4. Check browser console for errors
# Should NOT see: "REACT_APP_API_URL is undefined"

# 5. Try API call in console
# fetch('http://localhost:8000/api/token/').then(r => r.json()).then(console.log)
```

---

## Rotating Passwords

When credentials are compromised:

### Step 1: Change Database Password

```bash
cd Backend

# Connect to PostgreSQL as admin
psql -U postgres -h localhost

# Change pharma_user password
ALTER USER pharma_user WITH PASSWORD 'new-strong-password-here';

# Exit
\q

# Update Backend/.env
nano .env
# Update: DB_PASSWORD=new-strong-password-here
```

### Step 2: Change Admin Password

```bash
cd Backend
.\venv\Scripts\Activate.ps1

# Change Django superuser password
python manage.py changepassword admin

# Update Backend/.env if needed
# DB_PASSWORD vs DJANGO_SUPERUSER_PASSWORD are different!
```

### Step 3: Rotate Other Secrets

```bash
# Generate new Django secret
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Update Backend/.env with new DJANGO_SECRET_KEY
nano .env
```

### Step 4: Restart Application

```bash
# Kill running servers
# Ctrl+C in any terminals running your app

# Start fresh
python manage.py runserver 0.0.0.0:8000
```

---

## Troubleshooting

### "ModuleNotFoundError: No module named 'dotenv'"

```bash
# Install python-decouple (used for .env)
pip install python-decouple
```

### "Cannot find .env file"

```bash
# .env must be in Backend root, not in subdirectories
# Correct location:
Backend/.env

# Wrong locations:
Backend/pharmasys/.env  # ❌ Won't be found
Backend/.env.local      # ❌ For Frontend only
```

### Environment variable not appearing in Django

```bash
# Make sure Python-decouple is imported in settings.py
from decouple import config

# And used correctly:
DEBUG = config('DEBUG', default=True, cast=bool)  # ✓ Correct
SECRET_KEY = config('DJANGO_SECRET_KEY')          # ✓ Correct

# NOT:
DEBUG = config('debug')  # ❌ Wrong case
SECRET_KEY = os.environ['SECRET_KEY']  # ❌ Won't use .env
```

---

## Next Steps

1. ✅ **Copy `.env.example` to `.env`** (Backend) and `.env.local` (Frontend)
2. ✅ **Generate and fill in Django Secret Key**
3. ✅ **Set strong database passwords**
4. ✅ **Update CORS and allowed hosts with your IPs**
5. ✅ **Verify configuration** with the checklists above
6. ✅ **Start developing!**

---

## Support

If you have questions about configuration:

1. Check `.env.example` - it has comments explaining each variable
2. Check this guide's "Common Issues" section
3. See `GIT_SECURITY_COMMANDS.md` for secret management
4. See `POSTGRESQL_MIGRATION_GUIDE.md` for database setup

**Remember**: When in doubt, check `.env.example` — it's your source of truth! 🔐
