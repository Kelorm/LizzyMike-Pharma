# 🔧 Environment Variables Configuration Guide

This guide shows you exactly how to configure environment variables for your Pharmasys deployment on free hosting platforms.

## 📋 Overview

You need to configure environment variables in two places:
1. **Railway (Backend)** - Django settings
2. **Vercel (Frontend)** - React settings

---

## 🚂 Railway Backend Environment Variables

### Step 1: Access Railway Variables
1. Go to [railway.app](https://railway.app)
2. Click on your project
3. Click on your **backend service** (not the database)
4. Click the **"Variables"** tab

### Step 2: Add Backend Variables

**Copy and paste these variables one by one:**

#### Core Django Settings:
```
DJANGO_SETTINGS_MODULE=pharmasys.settings_free
SECRET_KEY=your-super-long-secret-key-make-it-very-random-123456789
DEBUG=False
ALLOWED_HOSTS=your-app.railway.app
```

#### Database Settings:
```
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=(Railway will provide this automatically)
DB_HOST=(Railway will provide this automatically)
DB_PORT=5432
```

#### CORS Settings (Update with your actual domains):
```
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
CSRF_TRUSTED_ORIGINS=https://your-frontend.vercel.app
```

#### Pharmacy Settings:
```
LOW_STOCK_THRESHOLD=0.2
EXPIRY_WARNING_MONTHS=3
TAX_RATE=0.03
```

### Step 3: Get Database Credentials from Railway

1. Click on your **PostgreSQL database service**
2. Go to **"Variables"** tab
3. Copy these values:
   - `PGHOST` → Use as `DB_HOST`
   - `PGPORT` → Use as `DB_PORT`
   - `PGDATABASE` → Use as `DB_NAME`
   - `PGUSER` → Use as `DB_USER`
   - `PGPASSWORD` → Use as `DB_PASSWORD`

### Step 4: Generate a Secret Key

**Option 1: Use this pre-generated key:**
```
SECRET_KEY=django-insecure-pharmasys-production-key-2024-very-secure-random-string-12345
```

**Option 2: Generate your own:**
1. Go to [djecrety.ir](https://djecrety.ir/)
2. Click "Generate"
3. Copy the generated key

---

## ⚡ Vercel Frontend Environment Variables

### Step 1: Access Vercel Variables
1. Go to [vercel.com](https://vercel.com)
2. Click on your project
3. Go to **"Settings"** tab
4. Click **"Environment Variables"**

### Step 2: Add Frontend Variables

**Copy and paste these variables:**

#### Core React Settings:
```
REACT_APP_API_URL=https://your-app.railway.app
REACT_APP_ENVIRONMENT=production
REACT_APP_VERSION=1.0.0
```

#### Build Settings:
```
GENERATE_SOURCEMAP=false
NODE_ENV=production
```

### Step 3: Configure for Different Environments

Make sure to set these for **Production** environment:
- ✅ Production
- ✅ Preview
- ✅ Development

---

## 🔗 Connecting Frontend and Backend

### Step 1: Get Your Railway URL
1. Go to Railway dashboard
2. Click on your backend service
3. Copy the URL (looks like: `https://your-app-production.up.railway.app`)

### Step 2: Update Vercel with Railway URL
1. In Vercel environment variables
2. Update `REACT_APP_API_URL` with your Railway URL:
```
REACT_APP_API_URL=https://your-actual-railway-url.up.railway.app
```

### Step 3: Update Railway CORS Settings
1. In Railway backend variables
2. Update CORS settings with your Vercel URL:
```
CORS_ALLOWED_ORIGINS=https://your-actual-vercel-url.vercel.app
CSRF_TRUSTED_ORIGINS=https://your-actual-vercel-url.vercel.app
```

---

## 📝 Complete Variable List

### Railway Backend Variables (All Required):
```
DJANGO_SETTINGS_MODULE=pharmasys.settings_free
SECRET_KEY=django-insecure-pharmasys-production-key-2024-very-secure-random-string-12345
DEBUG=False
ALLOWED_HOSTS=your-app.railway.app
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=(from Railway database)
DB_HOST=(from Railway database)
DB_PORT=5432
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
CSRF_TRUSTED_ORIGINS=https://your-frontend.vercel.app
LOW_STOCK_THRESHOLD=0.2
EXPIRY_WARNING_MONTHS=3
TAX_RATE=0.03
```

### Vercel Frontend Variables (All Required):
```
REACT_APP_API_URL=https://your-app.railway.app
REACT_APP_ENVIRONMENT=production
REACT_APP_VERSION=1.0.0
GENERATE_SOURCEMAP=false
NODE_ENV=production
```

---

## ✅ Testing Your Configuration

### Step 1: Test Backend Health
Visit: `https://your-app.railway.app/api/health/`
**Expected response:**
```json
{
  "status": "healthy",
  "service": "pharmasys",
  "version": "1.0.0"
}
```

### Step 2: Test Frontend Connection
1. Visit your Vercel URL
2. Open browser developer tools (F12)
3. Check Network tab for API calls
4. Look for successful requests to your Railway backend

### Step 3: Test Admin Panel
1. Visit: `https://your-app.railway.app/admin/`
2. Login with:
   - Username: `admin`
   - Password: `admin123`

---

## 🆘 Troubleshooting

### Common Issues:

#### 1. "CORS Error"
**Problem**: Frontend can't connect to backend
**Solution**: 
- Check `CORS_ALLOWED_ORIGINS` in Railway
- Make sure it matches your exact Vercel URL
- Redeploy backend after changing

#### 2. "Database Connection Error"
**Problem**: Backend can't connect to database
**Solution**:
- Check all `DB_*` variables in Railway
- Make sure database service is running
- Verify database credentials

#### 3. "Build Failed"
**Problem**: Deployment fails
**Solution**:
- Check all required variables are set
- Verify variable names (case-sensitive)
- Check Railway/Vercel logs

#### 4. "Environment Variable Not Found"
**Problem**: App can't find environment variables
**Solution**:
- Make sure variables are set in correct environment
- Redeploy after adding variables
- Check variable names match exactly

---

## 📱 Quick Reference

### Railway Variables Checklist:
- [ ] `DJANGO_SETTINGS_MODULE=pharmasys.settings_free`
- [ ] `SECRET_KEY` (long random string)
- [ ] `DEBUG=False`
- [ ] `ALLOWED_HOSTS` (your Railway domain)
- [ ] `DB_NAME=railway`
- [ ] `DB_USER=postgres`
- [ ] `DB_PASSWORD` (from Railway)
- [ ] `DB_HOST` (from Railway)
- [ ] `DB_PORT=5432`
- [ ] `CORS_ALLOWED_ORIGINS` (your Vercel domain)
- [ ] `CSRF_TRUSTED_ORIGINS` (your Vercel domain)

### Vercel Variables Checklist:
- [ ] `REACT_APP_API_URL` (your Railway domain)
- [ ] `REACT_APP_ENVIRONMENT=production`
- [ ] `REACT_APP_VERSION=1.0.0`
- [ ] `GENERATE_SOURCEMAP=false`
- [ ] `NODE_ENV=production`

---

## 🎯 Pro Tips

1. **Always redeploy** after changing environment variables
2. **Double-check URLs** - they must match exactly
3. **Keep secrets secure** - never commit them to GitHub
4. **Test incrementally** - add variables one by one
5. **Check logs** if something doesn't work

**Once all variables are configured correctly, your pharmacy system will be fully functional!** 🎉




