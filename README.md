# 🏥 LizzyMike Pharmacy Management System

A complete, modern pharmacy management system for LAN-based local networks. One server PC, multiple staff computers, automatic backups, and real-time monitoring.

---

## 🚀 Quick Navigation

**Choose your role to find the right documentation:**

### 👨‍⚕️ **I'm a Pharmacy Owner or Staff Member**
➜ Read: **[README_OPERATIONAL.md](README_OPERATIONAL.md)** (10 minutes)

**Contains:**
- How to use the system day-to-day
- Adding new staff users
- Making backups
- Restarting the system
- Troubleshooting 5 common problems

### 🔧 **I'm Setting Up the System for the First Time (IT Staff)**
➜ Read: **[DEPLOYMENT.md](DEPLOYMENT.md)** (30 minutes)

**Contains:**
- Server PC requirements
- Network setup (static IP)
- Installing prerequisites
- Step-by-step deployment
- Setting up auto-start
- Connecting client PCs
- Security configuration

### 📋 **I Want to Track Updates & Changes**
➜ Read: **[CHANGELOG.md](CHANGELOG.md)**

**Contains:**
- Version history
- New features
- Bug fixes
- How to document changes

### 📁 **I Need Consolidation Information**
➜ Read: **[DOCUMENTATION_CONSOLIDATION.md](DOCUMENTATION_CONSOLIDATION.md)**

**Contains:**
- Which old docs to delete
- Final file structure
- Benefits of consolidation

---

## ✅ System Features

✨ **Medication Inventory** - Track stock, expiry dates, suppliers  
💰 **Sales & POS** - Ring up transactions, print receipts  
👥 **Staff Management** - Multi-user access with role-based permissions  
📊 **Reporting** - Sales reports, inventory status, revenue tracking  
💾 **Automatic Backups** - Daily backups at 11 PM (+ USB weekly)  
🟢 **System Monitoring** - Health dashboard shows disk, database, backup status  
🔐 **Security** - User authentication, password protection, activity logging  
📱 **Any Device** - Access from any staff computer on the network  

---

## 🎯 What's Included

| Component | Location | Purpose |
|-----------|----------|---------|
| **Backend** | `Backend/` | Django application server |
| **Frontend** | `Frontend/` | React web interface |
| **Database** | PostgreSQL | All pharmacy data |
| **Web Server** | Nginx | Serves the frontend |
| **Scripts** | `.bat` files | Automated setup & management |
| **Logs** | `Backend/logs/` | System activity logs |
| **Backups** | `Backend/backups/` | Daily database backups |

---

## 📋 Prerequisites

**Server PC:**
- Windows 10/11 Pro or Windows Server 2019+
- 8GB RAM minimum (16GB recommended)
- 200GB disk space (500GB recommended)
- Connected to pharmacy network

**Workstations:**
- Modern web browser (Chrome, Firefox, Edge)
- Connected to same network as server
- No software installation needed

---

## 🚀 Getting Started

### **For Staff/Owner:** 
👉 [README_OPERATIONAL.md](README_OPERATIONAL.md) - 10 minutes to learn basics

### **For IT/Setup:**
👉 [DEPLOYMENT.md](DEPLOYMENT.md) - 30 minutes to deploy

### **System Already Running?**
Access at: `http://192.168.1.200`

---

## 📖 Documentation Index

| Document | Purpose | Read Time |
|----------|---------|-----------|
| **README_OPERATIONAL.md** | Daily operations for staff | 10 min |
| **DEPLOYMENT.md** | First-time setup for IT | 30 min |
| **CHANGELOG.md** | Version history & updates | 5 min |
| **DOCUMENTATION_CONSOLIDATION.md** | Files to delete/keep | 5 min |
| **IT_TROUBLESHOOTING.md** | Advanced troubleshooting | 20 min |
| **API_VERSIONING_GUIDE.md** | API documentation | 15 min |
| **SECURITY_IMPLEMENTATION_SUMMARY.md** | Security architecture | 10 min |
| **HEALTH_MONITORING_GUIDE.md** | System monitoring details | 15 min |

---

## 💡 System Status

To check if the system is healthy, visit:
```
http://192.168.1.200/status/
```

You should see:
- 🟢 Green = All good
- 🟡 Yellow = Warning (still working)
- 🔴 Red = Problem (needs attention)

---

## 🤝 Support

**Questions?**
1. Check the appropriate documentation above
2. See if it's in the troubleshooting section
3. Contact your IT support person

**Found a bug?**
- Note what happened
- Check the error logs: `Backend/logs/django.log`
- Report with details to your development team

---

## 📞 Quick Contact Reference

| Issue | Contact |
|-------|---------|
| System won't start | IT Support |
| Forgot password | Admin user or IT |
| Can't connect from office | IT Support |
| Data looks wrong | IT Support (may need restore) |
| How do I...? | Check README_OPERATIONAL.md |

---

## ✨ Version Information

**Current Version:** 2.0.0  
**Release Date:** January 15, 2024  
**Last Updated:** January 15, 2024  

See **[CHANGELOG.md](CHANGELOG.md)** for full version history.

---

**Ready to get started?** → [README_OPERATIONAL.md](README_OPERATIONAL.md) for users or [DEPLOYMENT.md](DEPLOYMENT.md) for IT setup
