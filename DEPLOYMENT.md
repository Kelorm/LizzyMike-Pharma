# 🔧 LizzyMike Pharmacy System - Deployment & Setup Guide

**For: IT Staff & System Administrators**  
**Complete setup and deployment instructions for first-time installation**

---

## 📋 Before You Start - Checklist

**Do you have these?**
- [ ] One dedicated server PC running Windows 10/11 or Windows Server
- [ ] Pharmacy owner approval to proceed
- [ ] Access to the pharmacy network
- [ ] Basic command-line experience (Windows PowerShell)
- [ ] Administrator access on the server PC

---

## 🖥️ Server PC Requirements

### Minimum Specifications
| Component | Requirement | Why |
|-----------|------------|-----|
| **OS** | Windows 10 Pro, Windows 11, or Windows Server 2019+ | Supports all required services |
| **RAM** | 8 GB minimum (16 GB recommended) | Django + PostgreSQL + Nginx |
| **Disk Space** | 200 GB minimum (500 GB recommended) | OS + Applications + Backups + Logs |
| **CPU** | 4-core processor (Intel i5/Ryzen 5 or better) | Handles 10-20 concurrent users |
| **Network** | Gigabit Ethernet or 5GHz WiFi | LAN connectivity |
| **Power** | Uninterruptible Power Supply (UPS) recommended | Prevents data corruption on power loss |

### Recommended Setup
- **Dell/HP/Lenovo business desktop** with current OS
- **SSD for OS** (faster boot, better performance)
- **HDD for data** (backups, logs)
- **Network cable** (more reliable than WiFi)

---

## 🌐 Network Setup

### Set Static IP on Server PC

This is **critical** - the server must always have the same IP address.

#### Step 1: Find Your Network Configuration
```powershell
# Open PowerShell and run:
ipconfig

# Look for output like:
# IPv4 Address . . . . . . . . . . . . : 192.168.1.XXX
# Subnet Mask . . . . . . . . . . . . : 255.255.255.0
# Default Gateway . . . . . . . . . . : 192.168.1.1
```

**Note your network**: 192.168.1.x or 192.168.0.x?

#### Step 2: Set Static IP (Windows 10/11)

1. **Open Network Settings**
   - Windows key + X → Settings
   - Network & Internet → Advanced network options
   - Network adapters

2. **Right-click your network adapter** → Properties

3. **Double-click "Internet Protocol Version 4 (TCP/IPv4)"**

4. **Select "Use the following IP address"** and enter:

   ```
   IP Address:     192.168.1.200
   Subnet Mask:    255.255.255.0
   Default Gateway: 192.168.1.1
   Preferred DNS:  8.8.8.8
   Alternate DNS:  8.8.4.4
   ```

   **OR** (if your network is 192.168.0.x):

   ```
   IP Address:     192.168.0.200
   Subnet Mask:    255.255.255.0
   Default Gateway: 192.168.0.1
   Preferred DNS:  8.8.8.8
   Alternate DNS:  8.8.4.4
   ```

5. **Click OK twice** and close settings

6. **Verify it worked**:
   ```powershell
   ipconfig
   # Should show: IPv4 Address . . . : 192.168.1.200
   ```

#### Step 3: Test Network Connectivity

From any other staff computer:
```powershell
ping 192.168.1.200
# Should get replies (not "unreachable")
```

---

## 📦 Install Prerequisites

Install these **in order** on the server PC:

### 1. Python 3.13+

1. Download from: https://www.python.org/downloads/
2. Run installer
3. **IMPORTANT**: Check "Add Python to PATH"
4. Choose "Install Now"
5. Verify installation:
   ```powershell
   python --version
   # Should show: Python 3.13.x or higher
   ```

### 2. PostgreSQL 17+

1. Download from: https://www.postgresql.org/download/windows/
2. Run installer (choose version 17 or higher)
3. When prompted:
   - Default installation location: `C:\Program Files\PostgreSQL`
   - Port: Keep as 5432 (default)
   - **IMPORTANT**: Set password for `postgres` user (e.g., `PostgreSQL_Pass_123`)
   - Remember this password - you'll need it later
4. Enable "Launch Stack Builder" at end (optional)
5. Verify it's running:
   ```powershell
   Get-Service PostgreSQL*
   # Should show "Running"
   ```

### 3. Node.js 18+

1. Download from: https://nodejs.org/
2. Choose LTS version (Long Term Support)
3. Run installer, keep defaults
4. Verify installation:
   ```powershell
   node --version
   npm --version
   # Both should show versions 18+
   ```

### 4. Nginx (Web Server)

1. Download from: https://nginx.org/en/download.html
2. Choose "Stable version" (e.g., `nginx-1.26.x.zip`)
3. Extract to exactly: `C:\nginx`
4. Verify:
   ```powershell
   C:\nginx\nginx.exe -v
   # Should show version
   ```

### 5. Git (Optional but Recommended)

1. Download from: https://git-scm.com/download/win
2. Run installer, keep defaults
3. Verify:
   ```powershell
   git --version
   ```

---

## 🚀 Deploy the Pharmacy System

### Step 1: Clone/Extract Project

If you have the project folder already:
```powershell
# Navigate to it
cd C:\Users\KELORM\Desktop\LizzyMikePharma
```

If downloading from Git:
```powershell
# Clone the repository
cd C:\
git clone <repository-url> LizzyMikePharma
cd LizzyMikePharma
```

### Step 2: Run Automated Setup

```powershell
# Open PowerShell as ADMINISTRATOR
# (Right-click PowerShell → Run as administrator)

cd C:\Users\KELORM\Desktop\LizzyMikePharma

# Run the setup script
.\setup_lan_multiuser.bat
```

The script will ask for:
- PostgreSQL password (what you set during PostgreSQL installation)
- Django admin password (make it strong!)
- Server IP confirmation (should be 192.168.1.200)

**What it does automatically:**
- ✅ Creates PostgreSQL database: `lizzymike_db`
- ✅ Creates database user: `pharma_user`
- ✅ Runs Django migrations
- ✅ Creates Django superuser
- ✅ Installs Python dependencies
- ✅ Builds React frontend
- ✅ Configures Nginx
- ✅ Sets up logging

**If setup fails**:
- Read the error message carefully
- Common issues:
  - `psql not found` → PostgreSQL not installed or not in PATH
  - `npm not found` → Node.js not installed or not in PATH
  - `Permission denied` → Run PowerShell as Administrator
  - Port already in use → Stop other services on port 80, 8000, 5432

### Step 3: Start the Services

```powershell
cd C:\Users\KELORM\Desktop\LizzyMikePharma

# Run as Administrator
.\start_server.bat
```

**Expected output:**
```
╔════════════════════════════════════════╗
║  LizzyMike Pharma Server Running       ║
║                                        ║
║  Frontend: http://192.168.1.200       ║
║  Backend:  http://192.168.1.200:8000  ║
║  Status:   ✓ All services running      ║
╚════════════════════════════════════════╝
```

**Services that should start:**
- Django backend (port 8000)
- Nginx web server (port 80)
- PostgreSQL database (port 5432)

### Step 4: Verify Everything Works

```powershell
# Test the API
Invoke-WebRequest http://192.168.1.200/api/v1/health/ | ConvertFrom-Json

# Should return status: "healthy"
```

Or open browser and visit:
- Frontend: `http://192.168.1.200`
- API Health: `http://192.168.1.200/api/v1/health/`
- Status Dashboard: `http://192.168.1.200/status/`

---

## 🔐 Security Configuration

### 1. Change Default Admin Password

```powershell
cd C:\Users\KELORM\Desktop\LizzyMikePharma\Backend

# Activate Python environment
.\.venv\Scripts\Activate.ps1

# Change admin password
python manage.py changepassword admin
```

Enter new password twice (make it strong - 12+ characters, mix of letters/numbers/symbols)

### 2. Set Up Firewall Rules

**Block unnecessary ports:**
```powershell
# Only allow port 80 from LAN
netsh advfirewall firewall add rule name="LizzyMike HTTP Only" `
  dir=in action=allow protocol=tcp localport=80 remoteip=192.168.1.0/24
```

**Block direct backend access** (port 8000):
```powershell
netsh advfirewall firewall add rule name="Block Django Direct" `
  dir=in action=block protocol=tcp localport=8000
```

### 3. Configure ALLOWED_HOSTS

Edit: `Backend/.env`
```
ALLOWED_HOSTS=192.168.1.200,192.168.1.100,localhost
# Add IPs of client machines that will access the system
```

---

## 🖥️ Auto-Start on Boot (Optional but Recommended)

Makes the system restart automatically without manual intervention.

### Using Task Scheduler

1. **Open Task Scheduler**
   - Windows key + R → `taskschd.msc`

2. **Create Basic Task**
   - Right sidebar → "Create Basic Task..."
   - Name: `LizzyMike Pharmacy Auto-Start`
   - Description: `Automatically start pharmacy system on boot`

3. **Set Trigger**
   - "When the computer starts"
   - Delay: 30 seconds (let Windows finish loading)

4. **Set Action**
   - Action: "Start a program"
   - Program: `C:\Users\KELORM\Desktop\LizzyMikePharma\start_server.bat`
   - Start in: `C:\Users\KELORM\Desktop\LizzyMikePharma`
   - Run with highest privileges: Check

5. **Finish and Test**
   - Restart the server PC
   - System should start automatically after 30 seconds

---

## 👥 Connect Client PCs to the Pharmacy System

Each staff computer needs to access the pharmacy system through the browser.

### On Each Client PC:

1. **Verify Network Connection**
   - Ensure connected to same WiFi/network as server PC
   - Test: `ping 192.168.1.200` in Command Prompt

2. **Open Web Browser**
   - Chrome, Edge, or Firefox (NOT Internet Explorer)

3. **Go to**:
   ```
   http://192.168.1.200
   ```

4. **Log In**
   - Username: `admin`
   - Password: (what you set during deployment)

5. **Bookmark It**
   - Bookmark this page in browser for quick access

### Optional: Create Desktop Shortcut

1. Right-click desktop → New → Shortcut
2. Location: `http://192.168.1.200`
3. Name: `LizzyMike Pharmacy`
4. Click Finish

---

## 🔄 Daily Operations

### Starting the System

```powershell
cd C:\Users\KELORM\Desktop\LizzyMikePharma
.\start_server.bat
```

Wait for the "All services running" message before staff can access.

### Stopping the System

```powershell
cd C:\Users\KELORM\Desktop\LizzyMikePharma
.\stop_server.bat
```

Always stop cleanly to prevent data corruption.

### Creating a Backup

```powershell
cd C:\Users\KELORM\Desktop\LizzyMikePharma
.\backup.bat
```

Or:
```powershell
cd Backend
python manage.py backup_database
```

### Checking System Health

Visit: `http://192.168.1.200/status/`

**Green indicators** = All good  
**Yellow indicators** = Warning (watch it)  
**Red indicators** = Problem (investigate)

---

## 📊 Monitoring & Maintenance

### Check Disk Space (Weekly)

```powershell
# Check C: drive
Get-Volume C

# Should have:
# - 50+ GB free for normal operation
# - 100+ GB free for backups
```

If low on space:
- Archive old backups to external drive
- Clear temporary files: `Disk Cleanup`
- Delete old log files (keep only 30 days)

### Check Service Status (Daily)

```powershell
# Check PostgreSQL
Get-Service PostgreSQL*

# Check if port 80 is listening (Nginx)
netstat -ano | findstr :80

# Check logs
Get-Content C:\Users\KELORM\Desktop\LizzyMikePharma\Backend\logs\django.log -Tail 50
```

### Backup Verification (Daily)

```powershell
cd C:\Users\KELORM\Desktop\LizzyMikePharma
.\backup-list.bat

# You should see today's date with recent backups
```

---

## 🐛 Common Deployment Issues

### Issue: "Port 80 Already in Use"

```powershell
# Find what's using port 80
netstat -ano | findstr :80

# Kill the process (replace PID with actual number)
taskkill /PID 1234 /F

# Or stop IIS if running
net stop W3SVC
```

### Issue: "PostgreSQL Connection Failed"

```powershell
# Check if PostgreSQL service is running
Get-Service PostgreSQL*

# If not running, start it
Start-Service PostgreSQL-x64-17

# Verify connectivity
psql -U postgres -h localhost -c "SELECT 1;"
```

### Issue: "Node.js/npm Not Found"

- Reinstall Node.js from https://nodejs.org/
- Make sure "Add to PATH" is checked during installation
- Restart PowerShell after installation

### Issue: Python Virtual Environment Issues

```powershell
cd C:\Users\KELORM\Desktop\LizzyMikePharma\Backend

# Recreate virtual environment
python -m venv .venv

# Activate it
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

---

## 📝 Logs Location

Helpful for troubleshooting:

```
Django Application:   Backend/logs/django.log
API Requests:         Backend/logs/api_requests.log
Alerts:               Backend/logs/alerts.log
PostgreSQL:           C:\Program Files\PostgreSQL\data\pg_log\
Nginx:                C:\nginx\logs\error.log
```

View real-time logs:
```powershell
Get-Content Backend/logs/django.log -Wait
```

---

## 🆘 Getting Help

**Issue persists?**
1. Check the logs (paths above)
2. Take a screenshot of error
3. Note when problem started
4. Document what you changed (if anything)
5. Contact development team with this information

---

## ✅ Post-Deployment Checklist

After deployment completes:

- [ ] Server PC has static IP (192.168.1.200)
- [ ] All prerequisites installed (Python, PostgreSQL, Node.js, Nginx)
- [ ] Setup script completed without errors
- [ ] Services started successfully
- [ ] Can access `http://192.168.1.200` from browser
- [ ] Can log in with admin credentials
- [ ] At least one staff user account created
- [ ] Manual backup created and verified
- [ ] System health dashboard shows all green
- [ ] All 5 client PCs can connect
- [ ] Auto-start configured (if desired)
- [ ] Security hardening completed
- [ ] Staff trained on basic usage

---

## 📞 Maintenance Schedule

| Task | Frequency | Time |
|------|-----------|------|
| Check system health dashboard | Daily | 1 min |
| Verify backups ran | Daily | 2 min |
| Monitor disk space | Weekly | 2 min |
| Review error logs | Weekly | 5 min |
| Update Windows | Monthly | varies |
| Full system backup to external drive | Monthly | 30 min |
| Test backup restore procedure | Quarterly | 30 min |
| Update software dependencies | Quarterly | 30 min |

---

**Deployment complete!** Your pharmacy system is now ready for daily use.

For operational guidance, see: `README_OPERATIONAL.md`
