# ⚡ Health Monitoring Quick Start

**Simple guide for checking pharmacy system health**

---

## 🚀 For Pharmacists: Quick Status Check

### The Easiest Way (2 seconds)

Open your browser and go to:
```
http://pharmacy-computer:8000/status/
```

### What You'll See

```
💊 LizzyMike Pharmacy Status

System Status: [GREEN/YELLOW/RED CIRCLE] HEALTHY

DATABASE        💾  [GREEN] HEALTHY        125 MB
DISK SPACE      💿  [GREEN] HEALTHY        87.3% free
CACHE           ⚡  [GREEN] HEALTHY        
BACKUP          🔒  [GREEN] HEALTHY        15.5 hours ago

KEY METRICS
────────────────────────────
👥 Active Users:       2
📊 Active Sessions:    3
📦 Low Stock Items:    0
💰 Today's Revenue:    $1,250.50

ALERTS
────────────────────────────
✓ All systems operating normally. No active alerts.
```

---

## 🟢 Green Status = All Good!

Everything is working perfectly. No action needed.

---

## 🟡 Yellow Status = Attention Needed

### What It Means
Some non-critical issue detected. System still works but getting close to limit.

### Examples
- ⚠️ Disk space getting low (15% remaining)
- ⚠️ Backup is 15 hours old (but still within 24 hours)
- ⚠️ Memory usage is high (but not critical)

### What To Do
1. **Disk Low**: Ask IT to clean up old logs/backups
2. **Backup Old**: Not urgent, but watch the time
3. **Memory High**: Restart the server when convenient

---

## 🔴 Red Status = Call IT NOW!

### What It Means
Critical issue! System may go down or stop functioning soon.

### Examples
- 🚨 Database not responding
- 🚨 No backup for 24+ hours
- 🚨 Disk space critically low (< 10%)
- 🚨 Cache/Redis not responding
- 🚨 Multiple failed login attempts

### What To Do
1. **Note the time** and what you were doing
2. **Screenshot** the status page
3. **Call IT immediately** with screenshot
4. **Continue working** - usually still functional but call soon

---

## 🔍 For IT Support: Quick Checks

### Check 1: Browser Status Page
```
Go to: http://pharmacy-server:8000/status/
Look for: Red indicators or yellow warnings
```

### Check 2: JSON Health API
```bash
# In terminal
curl http://pharmacy-server:8000/api/v1/health/ | python -m json.tool

# Look for: "status": "healthy"
```

### Check 3: View Error Logs
```bash
# SSH into server, then:
cd Backend
tail -f logs/django.log

# Look for: ERROR, CRITICAL, exceptions
```

### Check 4: View Alert Log
```bash
cd Backend
grep CRITICAL logs/alerts.log | tail -20

# Look for: Recent critical alerts
```

---

## 🛠️ Common Fixes (IT Support)

### "Backup Status = CRITICAL"
**Problem**: No backup in 24+ hours

**Quick Fix**:
```bash
cd Backend
python manage.py backup_database
```

**Long Term**: Check if backup scheduler (celery-beat) is running

### "Disk Space = CRITICAL"
**Problem**: Disk almost full

**Quick Fix**:
```bash
cd Backend
rm -rf logs/*.log.*  # Remove old rotated logs
du -sh .            # Check current size
```

**Long Term**: Archive or delete old logs regularly

### "Database = UNHEALTHY"
**Problem**: Cannot connect to database

**Quick Fix**:
```bash
# Check if database container is running
docker ps | grep postgres

# Or if database is local
sudo service postgresql status
```

### "Cache = UNHEALTHY"
**Problem**: Redis/cache not responding

**Quick Fix**:
```bash
# Check if Redis container is running
docker ps | grep redis

# Or if Redis is local
sudo service redis-server status
```

---

## 📊 Understanding Each Service

| Service | What Is It? | Green Means | Red Means |
|---------|-----------|-----------|-----------|
| **Database** | PostgreSQL storage | Connected + responsive | Cannot access |
| **Disk Space** | Server hard drive | > 20% free space | < 10% free space |
| **Cache** | Redis session storage | Session caching works | Sessions may be lost |
| **Backup** | Database backups | Backup < 12 hours old | Backup > 24 hours old |
| **Sessions** | Logged-in users | Users can work normally | Some users may lose data |

---

## 📝 Log Files Location

All logs in: `Backend/logs/`

```
django.log          - Everything that happens
alerts.log          - Warnings and critical issues (READ THIS FIRST)
api_requests.log    - Every API call (very detailed)
```

### Quick Check Alerts
```bash
cd Backend
tail -20 logs/alerts.log
```

### Recent Errors
```bash
grep ERROR logs/django.log | tail -10
```

### Specific Issue
```bash
grep "database" logs/django.log
grep "backup" logs/alerts.log
grep "login" logs/django.log
```

---

## 📋 Daily IT Checklist

**Morning (Start of day)**:
```
☐ Open http://pharmacy-server:8000/status/
☐ Is status GREEN? Yes? Good!
☐ Is status YELLOW or RED? Call it out, investigate
```

**End of Day**:
```
☐ Check that backup happened last night:
  tail -1 logs/alerts.log | grep backup
```

**Weekly**:
```
☐ Check disk space in logs:
  grep "Disk space" logs/alerts.log | tail -7
☐ Verify no repeated ERROR messages:
  grep ERROR logs/django.log | sort | uniq -c | sort -rn | head
```

---

## 🆘 Emergency Contacts

### If Red Status Shows:

1. **Database Error**
   - Check PostgreSQL: `docker ps | grep postgres`
   - Restart: `docker-compose restart postgres`

2. **Disk Full**
   - Check size: `df -h`
   - Clean logs: `rm logs/django.log.*`
   - Clean backups: Check oldest in `backups/` folder

3. **Backup Error**
   - Manual backup: `python manage.py backup_database`
   - Check backups folder exists: `ls -la Backend/backups/`

4. **Multiple Alerts**
   - Don't panic, usually multiple caused by one root problem
   - Check django.log first for actual errors
   - One restart often fixes 80% of issues

---

## 🚀 Quick Restart Process

If everything is broken:

```bash
# SSH into pharmacy server
cd /path/to/LizzyMikePharma

# Stop services
docker-compose down

# Wait 10 seconds
sleep 10

# Start services
docker-compose up -d

# Check health (wait 30 seconds)
sleep 30
curl http://localhost:8000/api/v1/health/
```

---

## 📞 When to Escalate

**Contact Vendor If**:
- Status is RED for > 5 minutes after restart
- Database appears corrupted (`ERROR: corrupted`)
- Repeated crashes every 5-10 minutes
- Cannot connect to server at all

**Information To Provide**:
- Screenshot of status page
- Last 20 lines of: `logs/django.log`
- Last 20 lines of: `logs/alerts.log`
- When it started happening
- What was happening before issue started

---

**System is healthy when: ✅ Status page is GREEN, ✅ Alerts: 0, ✅ All services: HEALTHY**

*Questions? See detailed guide: [HEALTH_MONITORING_GUIDE.md](HEALTH_MONITORING_GUIDE.md)*
