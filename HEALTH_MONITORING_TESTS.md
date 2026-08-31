# 🧪 Health Monitoring System - Testing Guide

**Complete tests to verify the health monitoring system is working correctly**

---

## ✅ Pre-Test Checklist

Before running tests:
- [ ] Server is running: `python manage.py runserver`
- [ ] Database is running and accessible
- [ ] Redis/cache is running (if using Redis)
- [ ] Backup directory exists: `Backend/backups/`
- [ ] Logs directory exists and is writable: `Backend/logs/`

---

## 🧪 Test 1: Health API Endpoint

### Test: Can we reach the health API?

```bash
curl http://localhost:8000/api/v1/health/ -s | python -m json.tool
```

### Expected Result
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T14:30:00...",
  "health": {
    "checks": {
      "database": {"status": "healthy", ...},
      "cache": {"status": "healthy"},
      "disk": {"status": "healthy", ...},
      "backup": {"status": "healthy", ...},
      "sessions": {"status": "healthy", ...},
      "application": {"status": "healthy", ...}
    }
  }
}
```

### ✓ Pass Criteria
- [ ] Response code is 200
- [ ] "status" field exists and is not null
- [ ] All checks present in response
- [ ] No 500 errors

---

## 🧪 Test 2: Status Dashboard

### Test: Can we view the HTML dashboard?

```bash
# In browser
http://localhost:8000/status/
```

### Expected Result
- [ ] Page loads (no 404 error)
- [ ] Title shows "LizzyMike Pharmacy Status"
- [ ] Green/yellow/red indicators visible
- [ ] Service cards visible (Database, Disk, Cache, Backup)
- [ ] Key metrics show (Active Users, Low Stock, etc.)
- [ ] Alerts section present

### ✓ Pass Criteria
- [ ] All sections render correctly
- [ ] No JavaScript errors (check browser console)
- [ ] Page refreshes automatically every 60 seconds

---

## 🧪 Test 3: Database Health Check

### Test: Database monitoring working?

```bash
# Make a request to trigger database access
curl http://localhost:8000/api/v1/medications/ -s | head -c 100
```

```bash
# Check health endpoint shows database as healthy
curl http://localhost:8000/api/v1/health/ -s | grep -A5 '"database"'
```

### Expected Result
```json
"database": {
  "status": "healthy",
  "response_time": "< 1ms",
  "database_size": "XXX MB"
}
```

### ✓ Pass Criteria
- [ ] Database status is "healthy"
- [ ] Database size is shown (not zero)
- [ ] Response time shown

---

## 🧪 Test 4: Disk Space Check

### Test: Disk space monitoring working?

```bash
curl http://localhost:8000/api/v1/health/ -s | grep -A5 '"disk"'
```

### Expected Result
```json
"disk": {
  "status": "healthy",
  "free_space": "XX.X%"
}
```

### ✓ Pass Criteria
- [ ] Disk status present
- [ ] Free space percentage shown
- [ ] Status is "healthy" (> 20%) or "warning" (10-20%)

---

## 🧪 Test 5: Backup Monitoring

### Test: Backup detection working?

```bash
# Create a test backup (if exists)
ls Backend/backups/pharmasys_backup_*.sql
```

```bash
# Check health shows backup status
curl http://localhost:8000/api/v1/health/ -s | grep -A10 '"backup"'
```

### Expected Result
```json
"backup": {
  "status": "healthy",
  "last_backup": "2024-01-15T23:00:00+00:00",
  "hours_since_backup": 15.5,
  "backup_count": 28
}
```

### ✓ Pass Criteria
- [ ] Backup status present
- [ ] Last backup time shown
- [ ] Hours since backup shown (< 24 for healthy)
- [ ] Backup count shown

### If No Backups Exist
```bash
# Create a test backup
python Backend/manage.py backup_database --verify

# Then check health again
curl http://localhost:8000/api/v1/health/ -s | grep -A10 '"backup"'
```

---

## 🧪 Test 6: Session Monitoring

### Test: Active sessions detected?

```bash
# Create a test session by logging in
curl -X POST http://localhost:8000/api/v1/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'

# Check sessions in health
curl http://localhost:8000/api/v1/health/ -s | grep -A5 '"sessions"'
```

### Expected Result
```json
"sessions": {
  "status": "healthy",
  "active_sessions": 1,
  "active_users": 1
}
```

### ✓ Pass Criteria
- [ ] Sessions status present
- [ ] Active sessions count >= 0
- [ ] Active users count >= 0

---

## 🧪 Test 7: Alert System - Low Stock

### Test: Low stock alerts working?

```bash
# Set up a medication with low stock
python Backend/manage.py shell

>>> from core.models import Medication
>>> med = Medication.objects.first()
>>> med.stock = 0
>>> med.min_stock = 10
>>> med.save()
>>> exit()
```

```bash
# Check health endpoint for alert
curl http://localhost:8000/api/v1/health/ -s | grep -A10 '"alerts"'
```

### Expected Result
```json
"alerts": [
  {
    "type": "low_stock",
    "message": "1 medications are low in stock",
    "severity": "warning",
    "count": 1
  }
]
```

### Check Alert Log
```bash
tail Backend/logs/alerts.log | grep LOW-STOCK
```

### ✓ Pass Criteria
- [ ] Alert appears in health response
- [ ] Alert type is "low_stock"
- [ ] Severity is "warning"
- [ ] Message shows count
- [ ] Alert logged to alerts.log

### Cleanup
```bash
python Backend/manage.py shell
>>> med.stock = 1000
>>> med.save()
```

---

## 🧪 Test 8: Request Logging Middleware

### Test: API requests being logged?

```bash
# Make some API requests
curl http://localhost:8000/api/v1/medications/ -s > /dev/null
curl http://localhost:8000/api/v1/sales/ -s > /dev/null

# Check request log
tail Backend/logs/api_requests.log
```

### Expected Result (JSON format)
```json
{"timestamp": "2024-01-15 14:30:00", "level": "INFO", "logger": "core.middleware", "message": "{\"timestamp\": \"2024-01-15T14:30:00.000\", \"method\": \"GET\", \"path\": \"/api/v1/medications/\", \"status_code\": 200, \"response_time_ms\": 45.23, ...}"}
```

### ✓ Pass Criteria
- [ ] api_requests.log file exists
- [ ] Contains recent timestamps
- [ ] Shows method, path, status code
- [ ] Shows response time in milliseconds

---

## 🧪 Test 9: Error Logging

### Test: Errors being logged correctly?

```bash
# Trigger an error (access non-existent resource)
curl http://localhost:8000/api/v1/medications/00000000-0000-0000-0000-000000000000/ -s

# Check django.log for error
tail Backend/logs/django.log | grep -i error
```

### Expected Result
- [ ] Error appears in django.log
- [ ] Error message is descriptive
- [ ] Timestamp is recent

---

## 🧪 Test 10: Status Dashboard Colors

### Test: Color indicators working?

Visit status dashboard and check colors:

```
http://localhost:8000/status/
```

### For Each Service Card:

| Service | Healthy | Degraded | Unhealthy |
|---------|---------|----------|-----------|
| Database | 🟢 Green | 🟡 Yellow | 🔴 Red |
| Disk | 🟢 Green | 🟡 Yellow | 🔴 Red |
| Cache | 🟢 Green | N/A | 🔴 Red |
| Backup | 🟢 Green | 🟡 Yellow | 🔴 Red |

### ✓ Pass Criteria
- [ ] All cards show appropriate colors
- [ ] Overall status indicator at top
- [ ] Metrics display current numbers
- [ ] Alerts list shows any active issues

---

## 🧪 Test 11: Graceful Degradation - DB Down

### Test: Health checks report unhealthy when DB down?

```bash
# Stop database (if Docker)
docker-compose stop postgres

# Check health
curl http://localhost:8000/api/v1/health/ 2>&1
```

### Expected Result
```json
{
  "status": "unhealthy",
  "health": {
    "checks": {
      "database": {
        "status": "unhealthy",
        "error": "..."
      }
    }
  }
}
```

### Check Dashboard
```
http://localhost:8000/status/
```

- [ ] Database card shows RED
- [ ] Overall status shows UNHEALTHY
- [ ] Alert appears in alerts section

### Restart Database
```bash
docker-compose start postgres
```

---

## 🧪 Test 12: Log Rotation

### Test: Logs rotate when they reach max size?

```bash
# Check current log sizes
ls -lh Backend/logs/

# Simulate large log by writing test data (BE CAREFUL)
# Don't do this on production!

# Verify old logs are rotated
ls -lh Backend/logs/*.log.*
```

### Expected Result
```
django.log          - Current log file
django.log.1        - Rotated (recent)
django.log.2        - Rotated (older)
```

### ✓ Pass Criteria
- [ ] Log files exist
- [ ] New logs written to main file
- [ ] Old logs rotated automatically
- [ ] Rotation keeps defined number of backups

---

## 🧪 Test 13: Performance - Response Times

### Test: Response times being measured correctly?

```bash
# Check API request log for response times
tail Backend/logs/api_requests.log | grep response_time_ms
```

### Expected Result
```json
{"response_time_ms": 45.23}  # Should see millisecond timings
```

### ✓ Pass Criteria
- [ ] All requests show response_time_ms
- [ ] Times are reasonable (< 5000 ms for most requests)
- [ ] Time is calculated in milliseconds

---

## 🧪 Test 14: User Information in Logs

### Test: Authenticated vs anonymous users logged?

```bash
# Anonymous request
curl http://localhost:8000/api/v1/medications/ -s > /dev/null

# Check log shows anonymous
grep 'anonymous' Backend/logs/api_requests.log | tail -1
```

### Expected Result
```json
{"user": "anonymous", "user_id": null}
```

### ✓ Pass Criteria
- [ ] Anonymous requests show "anonymous"
- [ ] Authenticated requests show username
- [ ] User ID shown for authenticated users

---

## 🧪 Test 15: Status Page Auto-Refresh

### Test: Status page refreshes automatically?

1. Open: `http://localhost:8000/status/`
2. Note the timestamp
3. Wait 60 seconds
4. Check if page has refreshed

### ✓ Pass Criteria
- [ ] Page refreshes automatically
- [ ] Timestamp updates
- [ ] Data shows current values
- [ ] No full page reload (smooth update)

---

## 📊 Test Summary

Create a checklist:

```markdown
## Test Results

- [ ] Test 1: Health API works
- [ ] Test 2: Status Dashboard loads
- [ ] Test 3: Database check
- [ ] Test 4: Disk space check
- [ ] Test 5: Backup check
- [ ] Test 6: Session check
- [ ] Test 7: Alert system
- [ ] Test 8: Request logging
- [ ] Test 9: Error logging
- [ ] Test 10: Color indicators
- [ ] Test 11: Graceful degradation
- [ ] Test 12: Log rotation
- [ ] Test 13: Response times
- [ ] Test 14: User tracking
- [ ] Test 15: Auto-refresh

**Result**: ✅ ALL PASS / ⚠️ NEEDS INVESTIGATION
```

---

## 🐛 Troubleshooting

### Health endpoint returns 500 error
```bash
# Check django.log for the error
tail Backend/logs/django.log

# Run django check
python Backend/manage.py check

# Restart service
python Backend/manage.py runserver
```

### Status dashboard doesn't load
```bash
# Check if StatusDashboardView is registered
grep StatusDashboardView Backend/pharmasys/urls.py

# Check if template exists
ls -la Backend/core/templates/core/status_dashboard.html

# Check logs for errors
tail Backend/logs/django.log
```

### Logs not being created
```bash
# Check logs directory exists and is writable
ls -la Backend/logs/
chmod 755 Backend/logs/

# Create empty log files if needed
touch Backend/logs/django.log
touch Backend/logs/alerts.log
touch Backend/logs/api_requests.log

# Restart application
```

### High response times in logs
```bash
# Check database performance
python Backend/manage.py shell
>>> from django.db import connection
>>> import time
>>> start = time.time()
>>> connection.execute("SELECT 1")
>>> print(f"Time: {(time.time()-start)*1000}ms")
```

---

## 🚀 When All Tests Pass

Congratulations! Your health monitoring system is working correctly.

Next steps:
1. ✅ Set up monitoring dashboard access for pharmacist
2. ✅ Train staff on interpreting status page
3. ✅ Create daily check-in routine
4. ✅ Archive/rotate old logs regularly
5. ✅ Consider external monitoring (Nagios/datadog/etc.)

---

*All tests should pass after system is running. Keep this guide for reference!*
