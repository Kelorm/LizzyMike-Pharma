# 🏥 LizzyMike Pharmacy System - Operational Guide

**For: Pharmacy Owner & Staff**  
**How to use your pharmacy management system day-to-day**

---

## 📖 What This System Does

LizzyMike Pharma is your **complete pharmacy management system**:
- Track all medication inventory (stock levels, expiry dates, suppliers)
- Record all sales and customer information
- Manage staff accounts and user access
- Create automatic daily backups
- Monitor system health with a visual dashboard

**In Plain English**: It's like having a computer cashier + inventory manager + filing cabinet that never loses data.

---

## ⚡ Quick Start (Under 10 Minutes)

### 1. Turn on the Server PC
The pharmacy server is one of your staff computers (currently running Windows).
- Press the power button
- Wait for Windows to fully load (~2 minutes)
- **System starts automatically** - you'll see a terminal window appear

### 2. Wait for Green Light
You'll see a terminal window show:
```
✓ Backend started on port 8000
✓ Frontend started on port 80  
✓ Status: RUNNING
```
Wait until you see all three ✓ marks. Takes ~2-3 minutes.

### 3. Open the System
On **any staff computer** on the same network, open your web browser and type:
```
http://192.168.1.200
```

### 4. Log In
```
Username: admin
Password: (ask your IT person)
```

### 5. You're In!
You should see the dashboard with:
- 📊 Today's sales
- 📦 Low stock alerts (red items need reordering)
- 👥 Active staff users
- 🔔 Any system notifications

---

## 👤 Adding a New Staff User (5 Minutes)

### Do This Once Per New Employee

**You Need**: Employee name, email, and what type of access they should have

**Steps:**

1. **Log in as Admin**
   - Username: admin
   - Password: (your admin password)

2. **Go to Users**
   - Click menu → **Settings** → **Users**

3. **Click "Add New User"**

4. **Fill in the form:**
   - Full Name: `John Smith`
   - Email: `john@pharmacy.local`
   - Username: `jsmith`
   - Password: `(temporary password - they must change it first login)`
   - Role: Choose one:
     - **Pharmacist** - Can do everything (manage inventory, see sales, add users)
     - **Cashier** - Can only ring up sales and view inventory
     - **Manager** - Can see reports and manage staff time
     - **Inventory** - Can only manage medications and stock

5. **Click "Create User"**

6. **Tell them their login:**
   - Username: `jsmith`
   - Temporary Password: (what you entered)
   - They'll be forced to change it on first login

**That's it!** New user can now log in from any staff computer.

---

## 💾 Making a Manual Backup (2 Minutes)

**Why**: Before making big changes, create a manual backup you can restore from.

### Method 1: Using Command (Fastest)

1. **Open Command Prompt**
   - Windows key + R
   - Type: `cmd`
   - Press Enter

2. **Run this:**
   ```
   cd C:\Users\KELORM\Desktop\LizzyMikePharma
   make backup
   ```

3. **Wait for message:**
   ```
   ✓ Backup complete!
   ✓ File: pharmasys_backup_20240115_140000.sql (45MB)
   ```

### Method 2: Without Command Line

1. Navigate to: `C:\Users\KELORM\Desktop\LizzyMikePharma\Backend`
2. Look for folder: `backups/`
3. Right-click → **Backup Database** (or use backup.bat)

### Verify the Backup Worked

```
cd C:\Users\KELORM\Desktop\LizzyMikePharma
make backup-list
```

You should see today's date at the top:
```
✓ Latest Backups:
  1. pharmasys_backup_20240115_140000.sql - 45 MB
  2. pharmasys_backup_20240114_230000.sql - 43 MB
```

**Automatic backups happen every night at 11 PM.** Manual backups are extra protection.

---

## 🔄 Restarting the System (3 Minutes)

Do this if:
- Something seems frozen or slow
- You're restarting the server PC
- Someone asks you to "try restarting"

### Quick Restart

1. **Open Command Prompt** (Windows key + R, type `cmd`)

2. **Run this:**
   ```
   cd C:\Users\KELORM\Desktop\LizzyMikePharma
   stop_server.bat
   ```

3. **Wait for:** All windows to close (takes ~30 seconds)

4. **Then start again:**
   ```
   start_server.bat
   ```

5. **Wait for the green light** (all services show ✓)

6. **Users can log back in** - they may need to refresh their browser (F5)

### Alternative: Restart the Whole Server PC

Sometimes restarting Windows itself is better:

1. **Save any open work** on all staff computers
2. **Tell everyone**: "System going down for restart"
3. **On server PC**: Windows Start menu → Power → Restart
4. **Wait 5 minutes** for PC to fully restart
5. **System starts automatically**
6. **Check the terminal** for the green light
7. **Tell everyone**: "System is back up"

---

## 🆘 Troubleshooting - 5 Most Common Problems

### Problem 1: "Can't Connect to http://192.168.1.200"

**What it means**: Staff computer can't reach the pharmacy server

**Quick Fixes:**
1. **Check the server PC** - Is it turned on? Look for the terminal window.
2. **Restart the server** - Follow restart instructions above
3. **Check your network cable/WiFi** - Are you connected to the pharmacy network?
4. **Try a different computer** - Does it work on another staff PC?
5. **Check the IP** - Ask IT to verify server is still at 192.168.1.200

**Call IT if**: It still doesn't work after trying these

---

### Problem 2: "System is Very Slow"

**What it means**: Pages take a long time to load, transactions are sluggish

**Quick Fixes:**
1. **Restart the server** - Follow restart instructions above
2. **Check available disk space**:
   - Right-click `C:\` → Properties → Check free space
   - Should have at least 50GB free
   - If less than 10GB, **call IT immediately**
3. **Close unused browser tabs** - Each open page uses memory
4. **Check if backup is running** - Backups slow things down slightly

**Call IT if**: Still slow after restart

---

### Problem 3: "Error: Database Connection Lost"

**What it means**: System can't talk to the database (PostgreSQL)

**Quick Fixes:**
1. **Restart the server** - Follow restart instructions above
2. **Check Windows Services**:
   - Windows key + R → type `services.msc`
   - Look for "PostgreSQL" - should say "Running"
   - If not, right-click → Start
3. **Restart the server PC** - Sometimes PostgreSQL gets stuck

**Call IT if**: Error continues after restarting

---

### Problem 4: "I Forgot My Password"

**What it means**: You can't log in

**Quick Fixes:**
1. **Try 'Forgot Password'** link on login page
2. **Ask admin user** - They can reset your password from Users menu
3. **Reset by IT** - IT person can force a password reset

**Do**: Use a password manager to remember passwords (like Windows Credential Manager)

---

### Problem 5: "Backup File Is Not Found / Very Small"

**What it means**: Last backup failed or didn't save properly

**Quick Fixes:**
1. **Create manual backup now**:
   ```
   cd C:\Users\KELORM\Desktop\LizzyMikePharma
   make backup
   ```
2. **Check disk space** - Backups need space to save
   - Right-click `C:\` → Properties
   - Need at least 50GB free
3. **Check backup folder**:
   - Navigate to: `Backend/backups/`
   - Should see files like: `pharmasys_backup_20240115_*.sql`
   - Each file should be 40+ MB

**Call IT if**: Still seeing issues

---

## 📊 Checking System Health (Optional)

If you want to see detailed system status:

1. **Open your browser**
2. **Go to**: `http://192.168.1.200/status/`
3. **You'll see a dashboard:**
   - 🟢 Green = Good
   - 🟡 Yellow = Warning (not urgent but watch it)
   - 🔴 Red = Problem (call IT)

**Green indicators show:**
- Database is running
- Disk has enough space
- Cache is working
- Last backup time
- Active users
- Any low stock medications

---

## 📞 When to Call Your IT Person

Call immediately if:
- ❌ The system is DOWN (won't load at all)
- ❌ The system is RED (see system health dashboard)
- ❌ Data is corrupted or missing
- ❌ Disk space is critically low (< 10%)
- ❌ Backups haven't run in 24+ hours
- ❌ More than 3 people can't connect

---

## 📋 Daily Checklist (Takes 1 Minute)

**Every morning before opening:**

- [ ] Server PC is ON
- [ ] Can open `http://192.168.1.200` in browser
- [ ] Can log in successfully
- [ ] System looks normal (dashboard loads)

**That's it!** The rest is automatic.

---

## 🔐 Important Security Tips

1. **Never share your password** - Each person gets their own login
2. **Change password periodically** - Every 30 days
3. **Lock your computer** when away - Windows key + L
4. **Report suspicious activity** - Tell IT if you see weird things
5. **Don't share the admin password** - Only share on need-to-know basis

---

## 📞 Quick Reference - Who to Contact

| Problem | Who to Call |
|---------|------------|
| Forgot password | Admin user in pharmacy |
| System won't start | Your IT person |
| Backup failed | Your IT person |
| Slow performance | Your IT person |
| Can't connect from office | Your IT person / Check network |
| Questions about using system | Ask a senior staff member |
| Crash or error message | Your IT person |

---

## ✅ You're All Set!

Your pharmacy system is ready to use. The most important things to remember:

1. **Server PC stays ON** during pharmacy hours
2. **Access from any staff computer** at `http://192.168.1.200`
3. **Backups run automatically** at 11 PM each night
4. **Keep passwords private** and change them regularly
5. **Call IT** if anything looks wrong

**For more detailed information**, see the IT staff guide: `DEPLOYMENT.md`

---

*Questions? Ask your IT support person or the staff member who set this up.*
