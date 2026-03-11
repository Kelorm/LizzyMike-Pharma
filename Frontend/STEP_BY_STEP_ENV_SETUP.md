# 🔧 Step-by-Step Environment Variables Setup

Follow these exact steps to configure your environment variables for free deployment.

## 📋 What You Need Before Starting

- ✅ Railway account with backend deployed
- ✅ Vercel account with frontend deployed  
- ✅ PostgreSQL database created in Railway
- ✅ Your actual deployment URLs

---

## 🚂 Step 1: Configure Railway Backend Variables

### 1.1 Access Railway Dashboard
1. Go to [railway.app](https://railway.app)
2. Click on your project
3. You should see two services:
   - 🚂 Your app (backend)
   - 🗄️ PostgreSQL (database)

### 1.2 Get Database Credentials First
1. Click on your **PostgreSQL database service** (not the app)
2. Click the **"Variables"** tab
3. **Copy these values** (you'll need them):
   - `PGHOST` → This is your `DB_HOST`
   - `PGDATABASE` → This is your `DB_NAME`  
   - `PGUSER` → This is your `DB_USER`
   - `PGPASSWORD` → This is your `DB_PASSWORD`
   - `PGPORT` → This is your `DB_PORT`

### 1.3 Configure Backend Variables
1. Click on your **app service** (backend)
2. Click the **"Variables"** tab
3. Click **"New Variable"** for each variable below

**Add these variables one by one:**

```
Name: DJANGO_SETTINGS_MODULE
Value: pharmasys.settings_free
```

```
Name: SECRET_KEY
Value: django-insecure-pharmasys-production-key-2024-very-secure-random-string-123456789
```

```
Name: DEBUG
Value: False
```

```
Name: ALLOWED_HOSTS
Value: your-actual-railway-domain.railway.app
```
*(Replace with your actual Railway domain)*

```
Name: DB_NAME
Value: railway
```

```
Name: DB_USER
Value: postgres
```

```
Name: DB_PASSWORD
Value: (paste the PGPASSWORD from step 1.2)
```

```
Name: DB_HOST
Value: (paste the PGHOST from step 1.2)
```

```
Name: DB_PORT
Value: 5432
```

```
Name: CORS_ALLOWED_ORIGINS
Value: https://your-actual-vercel-domain.vercel.app
```
*(Replace with your actual Vercel domain)*

```
Name: CSRF_TRUSTED_ORIGINS
Value: https://your-actual-vercel-domain.vercel.app
```
*(Same as above)*

```
Name: LOW_STOCK_THRESHOLD
Value: 0.2
```

```
Name: EXPIRY_WARNING_MONTHS
Value: 3
```

```
Name: TAX_RATE
Value: 0.03
```

### 1.4 Deploy Backend
1. After adding all variables, click **"Deploy"**
2. Wait for deployment to complete
3. Note your backend URL (e.g., `https://your-app.railway.app`)

---

## ⚡ Step 2: Configure Vercel Frontend Variables

### 2.1 Access Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click on your project
3. Click **"Settings"** tab

### 2.2 Add Environment Variables
1. Click **"Environment Variables"** in the left sidebar
2. Click **"Add New"** for each variable below

**Add these variables:**

```
Name: REACT_APP_API_URL
Value: https://your-actual-railway-domain.railway.app
```
*(Use the Railway URL from step 1.4)*

```
Name: REACT_APP_ENVIRONMENT
Value: production
```

```
Name: REACT_APP_VERSION
Value: 1.0.0
```

```
Name: GENERATE_SOURCEMAP
Value: false
```

```
Name: NODE_ENV
Value: production
```

### 2.3 Set Environment Scope
1. For each variable, make sure these are checked:
   - ✅ Production
   - ✅ Preview  
   - ✅ Development

### 2.4 Redeploy Frontend
1. Go to **"Deployments"** tab
2. Click **"Redeploy"** on the latest deployment
3. Wait for deployment to complete

---

## 🔗 Step 3: Update CORS Settings

### 3.1 Get Your Actual URLs
- **Railway Backend**: `https://your-app.railway.app`
- **Vercel Frontend**: `https://your-app.vercel.app`

### 3.2 Update Railway CORS
1. Go back to Railway backend variables
2. Update these variables with your actual Vercel URL:
   - `CORS_ALLOWED_ORIGINS`
   - `CSRF_TRUSTED_ORIGINS`
3. Redeploy backend

---

## ✅ Step 4: Test Your Configuration

### 4.1 Test Backend Health
1. Visit: `https://your-app.railway.app/api/health/`
2. You should see:
```json
{
  "status": "healthy",
  "service": "pharmasys", 
  "version": "1.0.0"
}
```

### 4.2 Test Frontend
1. Visit your Vercel URL
2. Try to login or use the application
3. Check browser console (F12) for any errors

### 4.3 Test Admin Panel
1. Visit: `https://your-app.railway.app/admin/`
2. Login with:
   - Username: `admin`
   - Password: `admin123`

---

## 🆘 Troubleshooting

### Problem: "CORS Error" in browser
**Solution**: 
1. Check `CORS_ALLOWED_ORIGINS` in Railway
2. Make sure it exactly matches your Vercel URL
3. Redeploy backend

### Problem: "Database Connection Error"
**Solution**:
1. Double-check all `DB_*` variables in Railway
2. Make sure PostgreSQL service is running
3. Verify database credentials are correct

### Problem: "Environment Variable Not Found"
**Solution**:
1. Check variable names are exactly correct (case-sensitive)
2. Make sure variables are set for correct environment
3. Redeploy after adding variables

### Problem: Frontend shows "Network Error"
**Solution**:
1. Check `REACT_APP_API_URL` in Vercel
2. Make sure it matches your Railway backend URL
3. Redeploy frontend

---

## 📱 Quick Checklist

### Railway Backend Variables:
- [ ] `DJANGO_SETTINGS_MODULE=pharmasys.settings_free`
- [ ] `SECRET_KEY` (long random string)
- [ ] `DEBUG=False`
- [ ] `ALLOWED_HOSTS` (your Railway domain)
- [ ] `DB_NAME=railway`
- [ ] `DB_USER=postgres`
- [ ] `DB_PASSWORD` (from Railway database)
- [ ] `DB_HOST` (from Railway database)
- [ ] `DB_PORT=5432`
- [ ] `CORS_ALLOWED_ORIGINS` (your Vercel domain)
- [ ] `CSRF_TRUSTED_ORIGINS` (your Vercel domain)
- [ ] `LOW_STOCK_THRESHOLD=0.2`
- [ ] `EXPIRY_WARNING_MONTHS=3`
- [ ] `TAX_RATE=0.03`

### Vercel Frontend Variables:
- [ ] `REACT_APP_API_URL` (your Railway domain)
- [ ] `REACT_APP_ENVIRONMENT=production`
- [ ] `REACT_APP_VERSION=1.0.0`
- [ ] `GENERATE_SOURCEMAP=false`
- [ ] `NODE_ENV=production`

### Testing:
- [ ] Backend health check works
- [ ] Frontend loads without errors
- [ ] Admin panel accessible
- [ ] No CORS errors in browser console

---

## 🎉 Success!

Once all variables are configured correctly:
1. ✅ Your backend will be accessible via Railway
2. ✅ Your frontend will be accessible via Vercel  
3. ✅ Frontend and backend will communicate properly
4. ✅ Your pharmacy system will be fully functional!

**Your pharmacy management system is now live and ready to use!** 🚀




