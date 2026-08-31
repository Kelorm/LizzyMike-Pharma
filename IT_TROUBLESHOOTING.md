# LizzyMike Pharmacy - IT Staff Troubleshooting Guide
# 
# This document provides troubleshooting steps for IT staff when the
# pharmacy system fails to auto-start.

## Quick Diagnostic Checklist

When the auto-start fails, check these items in order:

### 1. Docker Desktop Status
- [ ] Is Docker Desktop installed?
- [ ] Is Docker Desktop running? (Check system tray icon)
- [ ] Are there any Docker errors in the system tray?

**How to check:**
```powershell
docker info
```

### 2. Scheduled Task Status
- [ ] Is the scheduled task registered?
- [ ] When did it last run?
- [ ] What was the result?

**How to check:**
```powershell
Get-ScheduledTask -TaskName "LizzyMikePharmacyAutoStart" | Get-ScheduledTaskInfo
```

### 3. Startup Log
- [ ] What does the startup log say?

**How to check:**
```powershell
Get-Content C:\LizzyMikePharma\logs\startup.log
```

---

## Common Issues and Solutions

### Issue 1: Docker Desktop Not Running

**Symptoms:**
- Startup log shows "Docker Desktop did not start"
- Containers fail to start

**Solution:**
1. Check if Docker Desktop is in the system tray
2. Right-click Docker icon → Start Docker Desktop
3. Wait for it to show "Running"
4. Manually start containers:
   ```powershell
   cd C:\LizzyMikePharma
   docker-compose up -d
   ```

### Issue 2: Containers Fail to Start

**Symptoms:**
- docker-compose up fails
- Containers show "Exit" status

**Solution:**
1. Check logs:
   ```powershell
   docker-compose logs
   ```
2. Common causes:
   - Port 80 already in use (stop IIS or another web server)
   - Port 5432 in use (stop another PostgreSQL)
   - Port 6379 in use (stop another Redis)

3. Fix port conflicts:
   ```powershell
   netstat -ano | findstr ":80"
   ```

### Issue 3: Database Connection Failed

**Symptoms:**
- Web container shows "could not connect to database"
- Error in logs about PostgreSQL

**Solution:**
1. Check if PostgreSQL container is running:
   ```powershell
   docker-compose ps postgres
   ```
2. Check PostgreSQL logs:
   ```powershell
   docker-compose logs postgres
   ```
3. If not running, restart:
   ```powershell
   docker-compose restart postgres
   ```

### Issue 4: Network Issues

**Symptoms:**
- Client PCs cannot access http://192.168.1.100
- Ping works but browser shows error

**Solution:**
1. Check if nginx is running:
   ```powershell
   docker-compose ps nginx
   ```
2. Check nginx logs:
   ```powershell
   docker-compose logs nginx
   ```
3. Restart nginx:
   ```powershell
   docker-compose restart nginx
   ```

---

## Manual Recovery Steps

### Step 1: Full Restart

```powershell
cd C:\LizzyMikePharma

# Stop all containers
docker-compose down

# Remove all containers, networks, and volumes
docker-compose down -v

# Start fresh
docker-compose up -d --build
```

### Step 2: Check Disk Space

```powershell
# Check Docker disk usage
docker system df

# Clean up unused data
docker system prune -a
```

### Step 3: Rebuild Everything

```powershell
cd C:\LizzyMikePharma

# Stop everything
docker-compose down

# Remove volumes (WARNING: this deletes all data)
docker volume rm lizzymike_pharmacy_postgres_data

# Rebuild and start
docker-compose up -d --build
```

---

## Emergency Contact Information

If the above steps don't resolve the issue:

1. **Check the logs first:**
   ```powershell
   docker-compose logs > C:\LizzyMikePharma\logs\full_logs.txt
   ```

2. **Document the error:**
   - What were you doing when it failed?
   - What error message did you see?
   - When did it last work successfully?

3. **Contact the development team with:**
   - The error message
   - The contents of `C:\LizzyMikePharma\logs\startup.log`
   - The output of `docker-compose ps`

---

## Preventive Measures

To prevent future issues:

1. **Ensure Docker Desktop is set to start automatically:**
   - Docker Desktop → Settings → General → Start Docker Desktop when you log in

2. **Monitor disk space:**
   - Keep at least 20GB free for Docker

3. **Regular restarts:**
   - Restart the server weekly to clear memory

4. **Backup the database:**
   ```powershell
   docker-compose exec postgres pg_dump -U pharmacy -d pharmacy > backup.sql
   ```

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| Check status | `docker-compose ps` |
| View logs | `docker-compose logs -f` |
| Restart all | `docker-compose restart` |
| Stop all | `docker-compose down` |
| Start all | `docker-compose up -d` |
| View startup log | `Get-Content C:\LizzyMikePharma\logs\startup.log` |