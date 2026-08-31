# 🏥 Health Monitoring & Logging System

**LizzyMike Pharmacy comprehensive monitoring, logging, and alerting system for production LAN environments**

---

## 📋 Overview

This system provides:
- ✅ **Real-time Health Dashboard** at `/status/` - Simple visual status page
- ✅ **Comprehensive Health API** at `/api/v1/health/` - JSON health endpoint
- ✅ **Structured Logging** - JSON and text logs for debugging
- ✅ **Request Logging** - Every API call logged with timing
- ✅ **Alert System** - Critical alerts logged separately
- ✅ **Performance Monitoring** - Database, cache, disk, backup status

---

## 🖥️ Status Dashboard (`/status/`)

### Access
```
http://pharmacy-server:8000/status/
```

### What It Shows

| Section | Details |
|---------|---------|
| **Overall System Status** | GREEN/YELLOW/RED indicator |
| **Database** | Connectivity status + size |
| **Disk Space** | Free space percentage + alert |
| **Cache/Redis** | Session caching status |
| **Database Backup** | Last backup time + age in hours |
| **Active Users** | Number of logged-in users |
| **Active Sessions** | Number of active sessions |
| **Low Stock Items** | Count of medications below minimum |
| **Today's Revenue** | Daily sales total |
| **Active Alerts** | List of warnings/critical issues |

### Features
- 🎨 **Color-coded** indicators (green=healthy, yellow=degraded, red=unhealthy)
- 🔄 **Auto-refreshes** every 60 seconds
- 📊 **At-a-glance** status for pharmacist
- 🔗 **Link to API** for detailed JSON data

---

## 🔌 Health Check API (`/api/v1/health/`)

### Endpoint
```
GET /api/v1/health/
```

### Example Response
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T14:30:00+00:00",
  "health": {
    "status": "healthy",
    "timestamp": "2024-01-15T14:30:00+00:00",
    "checks": {
      "database": {
        "status": "healthy",
        "response_time": "< 1ms",
        "database_size": "125.45 MB"
      },
      "cache": {
        "status": "healthy"
      },
      "disk": {
        "status": "healthy",
        "free_space": "87.3%"
      },
      "memory": {
        "status": "healthy",
        "memory_usage": "45.2%"
      },
      "backup": {
        "status": "healthy",
        "last_backup": "2024-01-15T23:00:00+00:00",
        "hours_since_backup": 15.5,
        "backup_count": 28,
        "message": "Latest backup: 15.5 hours ago"
      },
      "sessions": {
        "status": "healthy",
        "active_sessions": 3,
        "active_users": 2
      },
      "application": {
        "status": "healthy",
        "users": 45,
        "medications": 320,
        "recent_sales": 23
      }
    }
  },
  "metrics": {
    "daily_revenue": 1250.50,
    "low_stock_items": 2,
    "active_users": 2,
    "timestamp": "2024-01-15T14:30:00+00:00"
  },
  "alerts": [
    {
      "type": "low_stock",
      "message": "2 medications are low in stock",
      "severity": "warning",
      "count": 2
    }
  ]
}
```

### Status Values
- `healthy` - All systems operating normally
- `degraded` - Some issues detected but system functional
- `unhealthy` - Critical issues requiring attention

---

## 📝 Logging System

### Log Files Location
```
Backend/logs/
  ├── django.log          # Main application log
  ├── alerts.log          # Alert-specific log (warnings and critical)
  └── api_requests.log    # Structured JSON request logs
```

### Log Levels by Environment

| Environment | Console | File | Level |
|-------------|---------|------|-------|
| Development | ✓ | ✗ | DEBUG |
| LAN | ✓ | ✓ | INFO |
| Production | ✓ | ✓ | INFO |
| Free Hosting | ✓ | ✗ | INFO |

### Log Rotation
- `django.log`: 10 MB max, keeps 5 backups
- `alerts.log`: 5 MB max, keeps 10 backups
- `api_requests.log`: 50 MB max, keeps 3 backups

---

## 📡 API Request Logging Middleware

### What Gets Logged
Every API request logs:
- ✅ Timestamp
- ✅ HTTP method (GET, POST, PUT, DELETE)
- ✅ Endpoint path
- ✅ Query string
- ✅ HTTP status code
- ✅ Response time (milliseconds)
- ✅ Authenticated user (or 'anonymous')
- ✅ Client IP address
- ✅ User-Agent (truncated for privacy)

### Log Format
```json
{
  "timestamp": "2024-01-15T14:30:00.123",
  "method": "POST",
  "path": "/api/v1/sales/",
  "endpoint": "sales",
  "query_string": null,
  "status_code": 201,
  "response_time_ms": 45.23,
  "user": "pharmacist1",
  "user_id": 3,
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0..."
}
```

### Log Levels
- `INFO` - Status 2xx (success)
- `WARNING` - Status 4xx (client error)
- `ERROR` - Status 5xx (server error)

---

## 🚨 Alert System

### Alert Types

#### 1. Low Stock Alert
- **Trigger**: Any medication stock ≤ minimum stock level
- **Severity**: WARNING
- **Logged to**: `alerts.log`
- **Message Format**: `[LOW-STOCK-ALERT] N medications below minimum stock`

#### 2. Expiring Medications
- **Trigger**: Medications expiring within 30 days
- **Severity**: WARNING
- **Message**: Shows count of expiring items

#### 3. Disk Space Alert
- **Trigger**: Disk free space < 10%
- **Severity**: CRITICAL
- **Trigger**: Disk free space < 20%
- **Severity**: WARNING
- **Message**: Shows free space percentage

#### 4. Backup Alert
- **Trigger**: No backup for > 24 hours
- **Severity**: CRITICAL
- **Trigger**: No backup for > 12 hours
- **Severity**: WARNING
- **Message**: Shows hours since last backup

#### 5. Brute Force Login Alert
- **Trigger**: 3+ failed logins from same IP within 30 minutes
- **Severity**: CRITICAL
- **Message**: `[BRUTE-FORCE-ALERT] N failed login attempts from IP X.X.X.X`
- **Effect**: IP blocked for 5 minutes

#### 6. System Health Alert
- **Trigger**: Any system health check fails
- **Severity**: CRITICAL (if unhealthy) or WARNING (if degraded)
- **Message**: Shows system status

### Alert Examples

```log
# alerts.log
[2024-01-15 14:30:00] WARNING [LOW-STOCK-ALERT] 2 medications below minimum stock
[2024-01-15 15:45:00] CRITICAL [BACKUP-ALERT] No backup in 25.3 hours
[2024-01-15 16:20:00] CRITICAL [BRUTE-FORCE-ALERT] 3 failed login attempts from IP 192.168.1.50 in last 30 minutes
[2024-01-15 17:00:00] WARNING [DISK-SPACE] Disk space low: 12.5%
```

---

## ⏱️ Health Checks Details

### Database Check
```
- Executes: SELECT 1
- Measures: Connection time
- Checks: Can execute queries on database
- Status: healthy / unhealthy
```

### Cache Check
```
- Sets test key in Redis/cache
- Retrieves test key
- Deletes test key
- Status: healthy / unhealthy
```

### Disk Space Check
```
- Checks free disk space percentage
- Status values:
  - Healthy: > 20% free
  - Warning: 10-20% free
  - Unhealthy: < 10% free
```

### Backup Check
```
- Looks for .sql files in Backend/backups/
- Finds most recent file
- Calculates age in hours
- Status:
  - Healthy: < 12 hours since backup
  - Warning: 12-24 hours since backup
  - Unhealthy: > 24 hours since backup
```

### Active Sessions Check
```
- Counts sessions in Django session table
- Filters: expire_date >= now()
- Returns: Number of active sessions and users
```

---

## 🔐 Security Features

### Rate Limiting
- Login endpoint: 5 attempts per minute per IP
- API general: 120 requests per minute per IP
- Failed login: 3 attempts triggers 5-minute IP block

### Session Security
- CSRF token required for state-changing requests
- Session cookies HTTP-only
- Secure flags in production

### Audit Logging
- Failed login attempts logged
- Rate limit violations logged
- All API requests logged with user/IP

---

## 📊 Example: Setting Up External Monitoring

### Using a Monitoring Script

```bash
#!/bin/bash
# check_pharmacy_health.sh - Check pharmacy health every 5 minutes

HEALTH_URL="http://pharmacy-server:8000/api/v1/health/"
LOG_FILE="/var/log/pharmacy-health.log"

while true; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)
    HEALTH=$(curl -s $HEALTH_URL | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Status: $STATUS, Health: $HEALTH" >> $LOG_FILE
    
    if [ "$HEALTH" != "healthy" ]; then
        # Send alert (email, SMS, Slack, etc.)
        echo "Pharmacy health degraded: $HEALTH" | mail -s "Pharmacy Alert" admin@example.com
    fi
    
    sleep 300  # Check every 5 minutes
done
```

### Using Nagios/Icinga

```
define service {
    service_name             Pharmacy API Health
    host_name               pharmacy-server
    check_command           check_http!-H pharmacy-server -u /api/v1/health/ -j "healthy"
    check_interval          5
    notification_interval   30
}
```

---

## 🧪 Testing the System

### Test Health Endpoint
```bash
curl http://localhost:8000/api/v1/health/ | python -m json.tool
```

### View Status Dashboard
```
http://localhost:8000/status/
```

### Check Logs
```bash
# View recent application logs
tail -f Backend/logs/django.log

# View recent alerts
tail -f Backend/logs/alerts.log

# View recent API requests (JSON)
tail -f Backend/logs/api_requests.log

# Search for specific events
grep "LOW-STOCK" Backend/logs/alerts.log
grep "BRUTE-FORCE" Backend/logs/alerts.log
grep "POST.*sales" Backend/logs/api_requests.log
```

### Simulate Low Stock Alert
```bash
python Backend/manage.py shell
>>> from core.models import Medication
>>> med = Medication.objects.first()
>>> med.stock = 0
>>> med.min_stock = 10
>>> med.save()
# Now check /status/ or /api/v1/health/
```

### Simulate Backup Alert
```bash
# Remove all backup files to trigger alert
rm Backend/backups/*.sql

# Check /status/ - Backup status will show unhealthy
```

---

## 📋 Maintenance Checklist

### Daily
- [ ] Check `/status/` page for green status
- [ ] Verify no CRITICAL alerts
- [ ] Check backup section shows "Last 12-24 hours"

### Weekly
- [ ] Review `Backend/logs/alerts.log` for patterns
- [ ] Check log file sizes (should rotate automatically)
- [ ] Verify API request logging working (check `api_requests.log`)

### Monthly
- [ ] Archive old logs (logs older than 30 days)
- [ ] Review performance metrics
- [ ] Check database growth trend from health checks

### Quarterly
- [ ] Review alert thresholds (maybe 15GB instead of 10GB for disk)
- [ ] Test backup verification process
- [ ] Simulate failure scenarios and verify alerts trigger

---

## 🔧 Configuration

### Adjust Disk Space Alert Threshold

Edit `Backend/core/monitoring.py`:
```python
@staticmethod
def check_disk_space():
    disk_usage = psutil.disk_usage('/')
    free_percent = (disk_usage.free / disk_usage.total) * 100
    
    # Change these thresholds:
    if free_percent < 10:  # CRITICAL threshold
        ...
    elif free_percent < 20:  # WARNING threshold
        ...
```

### Adjust Backup Age Alert Threshold

Edit `Backend/core/monitoring.py`:
```python
hours_since_backup = (timezone.now() - last_backup_time).total_seconds() / 3600

# Change these thresholds:
if hours_since_backup > 24:  # CRITICAL
    status = 'unhealthy'
elif hours_since_backup > 12:  # WARNING
    status = 'warning'
```

### Adjust Login Rate Limit

Edit `Backend/core/middleware.py`:
```python
class RateLimitMiddleware(MiddlewareMixin):
    LOGIN_RATE_LIMIT = 5  # attempts per minute
    LOGIN_BLOCK_DURATION = 300  # seconds (5 minutes)
```

---

## 🐛 Troubleshooting

### Status Dashboard Shows "Unhealthy"
1. Check `/api/v1/health/` for specific failing check
2. Review `Backend/logs/django.log` for errors
3. Common issues:
   - Database not running: Check PostgreSQL
   - Cache not running: Check Redis
   - Disk full: Clean up old logs/backups

### No Alerts Logging
1. Verify `Backend/logs/alerts.log` is created
2. Check logger configuration in settings
3. Verify `alerts` logger is configured correctly

### API Requests Not Logging
1. Check `Backend/logs/api_requests.log` exists
2. Verify APIRequestLoggingMiddleware is in MIDDLEWARE
3. Check only `/api/` and `/api/v1/` paths are logged

### Backup Status Shows "Unhealthy"
1. Check `Backend/backups/` directory exists
2. Verify backup files exist (name format: `pharmasys_backup_*.sql`)
3. Check file permissions (readable)
4. Run manual backup: `python Backend/manage.py backup_database`

---

## 📞 Support

For issues with the health monitoring system:
1. Check logs: `tail -f Backend/logs/django.log`
2. Test endpoint: `curl http://localhost:8000/api/v1/health/`
3. Review status page: `http://localhost:8000/status/`
4. Check Django check: `python Backend/manage.py check`

---

## 📚 Additional Resources

- [Django Logging Documentation](https://docs.djangoproject.com/en/stable/topics/logging/)
- [psutil Documentation](https://psutil.readthedocs.io/)
- [Django Middleware Documentation](https://docs.djangoproject.com/en/stable/topics/http/middleware/)
- [Backup System Documentation](../BACKUP_SYSTEM_IMPLEMENTATION.md)

---

*Last Updated: January 2024*  
*System: LizzyMike Pharmacy*  
*Version: 1.0*
