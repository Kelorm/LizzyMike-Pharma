# API Versioning Implementation Guide

## Overview

Your Django REST Framework pharmacy system now has proper API versioning with all endpoints under `/api/v1/`.

---

## Changes Made

### 1. Backend URL Configuration

**File:** `Backend/pharmasys/urls.py`

**Changes:**
- ✅ All API routes now prefixed with `/api/v1/`
- ✅ Django admin unchanged at `/admin/`
- ✅ Direct receipt download still available at `/receipt/<id>/`
- ✅ Organized into `api_v1_patterns` for clarity

**Before:**
```
/api/medications/
/api/sales/
/api/token/
/api/profile/
```

**After:**
```
/api/v1/medications/
/api/v1/sales/
/api/v1/token/
/api/v1/profile/
```

### 2. Frontend Axios Configuration

**File:** `Frontend/src/utils/axios.ts`

**Changes:**
- ✅ Base URL updated to `/api/v1`
- ✅ Supports both React (`REACT_APP_API_URL`) and Vite (`VITE_API_URL`) env vars
- ✅ Automatically adds `/api/v1` prefix if not present

**How it works:**
```typescript
// Development (local, same origin)
API_BASE_URL = '/api/v1'

// LAN (specific IP)
REACT_APP_API_URL = 'http://192.168.0.137'
// Becomes: http://192.168.0.137/api/v1

// Production (full domain)
REACT_APP_API_URL = 'https://api.yourdomain.com'
// Becomes: https://api.yourdomain.com/api/v1
```

### 3. API Service Layer

**File:** `Frontend/src/services/api.ts`

**Status:** ✅ No changes needed

The service layer uses relative paths (e.g., `/medications/`) which are now resolved against the versioned base URL automatically.

```typescript
// These automatically become /api/v1/medications/, /api/v1/sales/, etc.
medicationAPI.list: () => apiClient.get('/medications/')
saleAPI.list: () => apiClient.get('/sales/')
```

### 4. URL Pattern Verification

**New:** Management command to list all endpoints

```bash
python manage.py list_urls
python manage.py list_urls --format=json
python manage.py list_urls --filter=api
python manage.py list_urls --version  # Show only v1 endpoints
```

---

## Endpoint Migration

### Authentication Endpoints

| Endpoint | Old URL | New URL |
|----------|---------|---------|
| Obtain Token | `/api/token/` | `/api/v1/token/` |
| Refresh Token | `/api/token/refresh/` | `/api/v1/token/refresh/` |
| Token Auth | `/api-token-auth/` | `/api/v1/token-auth/` |
| Register User | `/api/auth/register/` | `/api/v1/auth/register/` |
| User Profile | `/api/profile/` | `/api/v1/profile/` |

### Medication Endpoints

| Endpoint | Old URL | New URL |
|----------|---------|---------|
| List All | `/api/medications/` | `/api/v1/medications/` |
| Create | `/api/medications/` | `/api/v1/medications/` |
| Detail | `/api/medications/{id}/` | `/api/v1/medications/{id}/` |
| Update | `/api/medications/{id}/` | `/api/v1/medications/{id}/` |
| Delete | `/api/medications/{id}/` | `/api/v1/medications/{id}/` |
| Search | `/api/medications/?search=query` | `/api/v1/medications/?search=query` |
| Low Stock | `/api/medications/low_stock_alerts/` | `/api/v1/medications/low_stock_alerts/` |
| Expiring Soon | `/api/medications/expiring_soon/` | `/api/v1/medications/expiring_soon/` |
| Available | `/api/medications/available/` | `/api/v1/medications/available/` |

### Sales Endpoints

| Endpoint | Old URL | New URL |
|----------|---------|---------|
| List All | `/api/sales/` | `/api/v1/sales/` |
| Create | `/api/sales/` | `/api/v1/sales/` |
| Detail | `/api/sales/{id}/` | `/api/v1/sales/{id}/` |
| Update | `/api/sales/{id}/` | `/api/v1/sales/{id}/` |
| Delete | `/api/sales/{id}/` | `/api/v1/sales/{id}/` |
| Daily Summary | `/api/sales/daily_summary/` | `/api/v1/sales/daily_summary/` |
| Monthly Summary | `/api/sales/monthly_summary/` | `/api/v1/sales/monthly_summary/` |
| Receipt | `/api/receipt/{id}/` | `/api/v1/receipt/{id}/` |
| Invoice | `/api/sales/{id}/invoice/` | `/api/v1/sales/{id}/invoice/` |

### Customer Endpoints

| Endpoint | Old URL | New URL |
|----------|---------|---------|
| List All | `/api/customers/` | `/api/v1/customers/` |
| Create | `/api/customers/` | `/api/v1/customers/` |
| Detail | `/api/customers/{id}/` | `/api/v1/customers/{id}/` |
| Update | `/api/customers/{id}/` | `/api/v1/customers/{id}/` |
| Delete | `/api/customers/{id}/` | `/api/v1/customers/{id}/` |
| Sales History | `/api/customers/{id}/sales/` | `/api/v1/customers/{id}/sales/` |
| Prescriptions | `/api/customers/{id}/prescriptions/` | `/api/v1/customers/{id}/prescriptions/` |

### Prescription Endpoints

| Endpoint | Old URL | New URL |
|----------|---------|---------|
| List All | `/api/prescriptions/` | `/api/v1/prescriptions/` |
| Create | `/api/prescriptions/` | `/api/v1/prescriptions/` |
| Detail | `/api/prescriptions/{id}/` | `/api/v1/prescriptions/{id}/` |
| Update | `/api/prescriptions/{id}/` | `/api/v1/prescriptions/{id}/` |
| Delete | `/api/prescriptions/{id}/` | `/api/v1/prescriptions/{id}/` |
| Update Status | `/api/prescriptions/{id}/update_status/` | `/api/v1/prescriptions/{id}/update_status/` |

### Analytics Endpoints

| Endpoint | Old URL | New URL |
|----------|---------|---------|
| Sales Analytics | `/api/analytics/sales/` | `/api/v1/analytics/sales/` |
| Dashboard Analytics | `/api/analytics/dashboard/` | `/api/v1/analytics/dashboard/` |

### Health Check

| Endpoint | Old URL | New URL |
|----------|---------|---------|
| Health Check | `/api/health/` | `/api/v1/health/` |

### Administrative Endpoints

| Endpoint | URL | Status |
|----------|-----|--------|
| Django Admin | `/admin/` | ✅ Unchanged |
| Direct Receipt | `/receipt/{id}/` | ✅ Unchanged (non-API) |

---

## Verification Checklist

### ✅ Backend Verification

```bash
cd Backend

# 1. Check Django settings
python manage.py check
# Expected: System check identified no issues (0 silenced).

# 2. List all API endpoints
python manage.py list_urls --version
# Expected: Shows all endpoints with /api/v1/ prefix

# 3. Export as JSON for documentation
python manage.py list_urls --format=json > api_endpoints.json

# 4. Filter for specific endpoints
python manage.py list_urls --filter=medications
# Expected: Shows all medication endpoints

# 5. Test the server starts
python manage.py runserver
# Expected: Starting development server at http://127.0.0.1:8000/
```

### ✅ Frontend Verification

```bash
cd Frontend

# 1. Check axios configuration
cat src/utils/axios.ts | grep API_BASE_URL
# Expected: API_BASE_URL = '/api/v1'

# 2. Verify environment variable support
grep -r "REACT_APP_API_URL\|VITE_API_URL" src/utils/
# Expected: Both env vars are checked

# 3. Run frontend dev server
npm start
# Expected: Starting on http://localhost:3000
```

### ✅ API Testing

**Option 1: Using curl**

```bash
# Get token
curl -X POST http://localhost:8000/api/v1/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Use token to fetch data
curl -X GET http://localhost:8000/api/v1/medications/ \
  -H "Authorization: Bearer <token>"
```

**Option 2: Using Django shell**

```bash
python manage.py shell

from rest_framework.test import APIClient
client = APIClient()

# Without token
response = client.get('/api/v1/medications/')
print(response.status_code)  # Should be 401 (Unauthorized)

# With token
client.credentials(HTTP_AUTHORIZATION='Bearer <token>')
response = client.get('/api/v1/medications/')
print(response.status_code)  # Should be 200
```

**Option 3: Using Postman**

1. Import the API endpoints from `api_endpoints.json` (generated by `list_urls`)
2. Set base URL to `http://localhost:8000`
3. Create token in Authentication tab
4. Test endpoints with the `/api/v1/` prefix

---

## Environment Configuration

### Development

```ini
# Frontend/.env.local
REACT_APP_API_URL=http://localhost:8000
# OR (for same-origin):
REACT_APP_API_URL=

# Backend/.env
DJANGO_ENV=development
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### LAN

```ini
# Frontend/.env.local
REACT_APP_API_URL=http://192.168.0.137:8000

# Backend/.env
DJANGO_ENV=lan
DEBUG=False
ALLOWED_HOSTS=192.168.0.137,localhost
CORS_ALLOWED_ORIGINS=http://192.168.0.137,http://localhost:3000
```

### Production

```ini
# Frontend/.env (built into app)
REACT_APP_API_URL=https://api.yourdomain.com

# Backend/.env
DJANGO_ENV=production
DEBUG=False
ALLOWED_HOSTS=api.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
SECURE_SSL_REDIRECT=True
```

---

## Frontend Pages - No Changes Needed

All existing React pages continue to work because:

1. ✅ The `api.ts` service layer hasn't changed
2. ✅ All components use the service layer (e.g., `api.medication.list()`)
3. ✅ The axios base URL handles the `/api/v1/` routing automatically

**Example usage (unchanged):**

```typescript
// src/pages/Medications.tsx
import api from '../services/api';

useEffect(() => {
  api.medication.list().then(data => {
    // Automatically calls /api/v1/medications/
    setMedications(data);
  });
}, []);
```

---

## Future API Versions

When you need to create API v2, you can:

1. **Duplicate current patterns:**
   ```python
   # pharmasys/urls.py
   api_v2_patterns = [
       # New v2 implementations
   ]

   urlpatterns = [
       path('api/v1/', include(api_v1_patterns)),
       path('api/v2/', include(api_v2_patterns)),
   ]
   ```

2. **Support both versions simultaneously** (for gradual migration)

3. **Deprecate v1 endpoints** with warnings (after clients migrate)

---

## Troubleshooting

### Issue: "404 Not Found" on API endpoints

**Cause:** Using old `/api/` endpoints instead of `/api/v1/`

**Fix:**
```bash
# Check registered endpoints
python manage.py list_urls --version

# Verify frontend base URL
grep API_BASE_URL Frontend/src/utils/axios.ts
```

### Issue: CORS error when calling API

**Cause:** Frontend URL not in `CORS_ALLOWED_ORIGINS`

**Fix:**
```ini
# Backend/.env
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://192.168.0.137
```

### Issue: API works locally but not on LAN/production

**Cause:** Incorrect `REACT_APP_API_URL`

**Fix:**
```bash
# Verify environment variable
echo $REACT_APP_API_URL

# Check frontend console for actual base URL
# In browser DevTools console:
console.log(window.API_BASE_URL)
```

### Issue: Admin panel broken

**Status:** ✅ Admin is still at `/admin/` (not versioned)

This is correct. Django admin should never be versioned.

---

## Quick Reference

| Task | Command |
|------|---------|
| View all endpoints | `python manage.py list_urls` |
| View v1 endpoints only | `python manage.py list_urls --version` |
| Export as JSON | `python manage.py list_urls --format=json` |
| Filter endpoints | `python manage.py list_urls --filter=medications` |
| Start Django | `python manage.py runserver` |
| Start React | `npm start` (from Frontend/) |
| Test API | `curl http://localhost:8000/api/v1/medications/` |

---

## Documentation Generated

The `list_urls` management command automatically generates endpoint documentation:

```bash
# Generate and save API documentation
python manage.py list_urls --format=json > API_DOCUMENTATION.json

# Pretty print for sharing
python manage.py list_urls --format=json | python -m json.tool
```

---

## Best Practices

### ✅ Do's

- ✅ Always use the service layer (`api.medication.list()`)
- ✅ Set `REACT_APP_API_URL` for non-local environments
- ✅ Keep admin at `/admin/` (don't version it)
- ✅ Version the entire API together (v1, v2, etc.)
- ✅ Document breaking changes when releasing new versions

### ❌ Don'ts

- ❌ Don't hardcode `/api/` URLs in components
- ❌ Don't mix API versions (v1 + v2 in same page)
- ❌ Don't version individual endpoints separately
- ❌ Don't forget to update environment variables during deployment

---

## Summary

✅ **API Versioning Complete:**
- Backend: All routes under `/api/v1/`
- Frontend: Automatically uses versioned base URL
- Admin: Unchanged at `/admin/`
- Documentation: Generated by `list_urls` command
- Backward Compatibility: Full (no breaking changes to code structure)

**You're all set!** 🚀
