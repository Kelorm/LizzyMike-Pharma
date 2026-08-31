# 📝 Changelog - LizzyMike Pharmacy System

**Track all updates, features, and fixes to the pharmacy system**

**Format**: YYYY-MM-DD | Version | Type | Description

---

## [Unreleased]

### Planned Features
- [ ] Feature: SMS reminders for low stock
- [ ] Feature: Multi-language support
- [ ] Enhancement: Faster backup compression
- [ ] Fix: Dashboard sometimes slow on large datasets

---

## [2.0.0] - 2024-01-15

### 🎉 Major Release

#### ✨ New Features
- **Health Monitoring Dashboard** - View system status (disk, backup, database) in real-time
- **Status API Endpoint** (`/api/v1/health/`) - Programmatic access to system health
- **Structured Request Logging** - All API calls logged with timing information
- **Brute Force Protection** - System blocks IPs after 3 failed logins

#### 🔧 Improvements
- Performance: API responses 30% faster
- Security: Enhanced password requirements
- Database: Migration to PostgreSQL from SQLite
- Logging: Separate alert logs for critical events

#### 🐛 Bug Fixes
- Fixed: Session timeout not working
- Fixed: Backup files not being deleted after 30 days
- Fixed: Staff user permissions sometimes resetting
- Fixed: Dashboard sometimes showing stale data

#### 📚 Documentation
- Added: Complete deployment guide (`DEPLOYMENT.md`)
- Added: Operational guide for staff (`README_OPERATIONAL.md`)
- Added: Testing procedures (`HEALTH_MONITORING_TESTS.md`)
- Updated: Architecture documentation

**Breaking Changes:**
- SQLite database no longer supported (migrated to PostgreSQL)
- Default admin password must be changed on first use

---

## [1.5.0] - 2024-01-08

### ✨ Features
- Multi-user support with role-based access control
- Inventory alerts for medications below minimum stock
- Daily sales reports
- Customer purchase history tracking

### 🔧 Improvements
- Improved medication search (10x faster)
- Better mobile interface for tablets/iPads
- Automated daily backups at 11 PM

### 🐛 Bug Fixes
- Fixed: Duplicate entries in sales log
- Fixed: Stock count sometimes incorrect after large batch imports
- Fixed: Email notifications not sending

---

## [1.4.0] - 2024-01-01

### ✨ Features
- Integration with supplier ordering system
- Expiry date tracking and alerts
- Batch import of medications from CSV

### 🔧 Improvements
- Reports now exportable to PDF
- Dashboard widgets customizable per user
- Faster database queries (better indexing)

---

## [1.3.0] - 2023-12-15

### ✨ Features
- Initial backup system
- User account management
- Activity logging (who did what, when)

### 🐛 Bug Fixes
- Fixed: System crash during large transactions
- Fixed: Login sometimes taking 30+ seconds

---

## [1.2.0] - 2023-12-01

### ✨ Features
- Online payment processing
- Multiple payment methods (cash, card, check)
- Invoice generation

---

## [1.1.0] - 2023-11-15

### ✨ Features
- Basic sales tracking
- Inventory management
- Customer database

---

## [1.0.0] - 2023-11-01

### 🎉 Initial Release

- Core pharmacy management system
- Sales point-of-sale interface
- Medication inventory tracking
- Basic reporting

---

## How to Use This Changelog

### When Making an Update:

1. **Add to Unreleased section first**
2. **Choose a section:**
   - `✨ Features` - New functionality
   - `🔧 Improvements` - Enhancements to existing features
   - `🐛 Bug Fixes` - Problems that were fixed
   - `📚 Documentation` - Help/guide updates
   - `🔐 Security` - Security-related fixes
   - `⚡ Performance` - Speed improvements
   - `🗑️ Deprecated` - Features being phased out

3. **Write clearly:**
   - ✅ "Added: Health monitoring dashboard"
   - ❌ "stuff works better now"
   - ✅ "Fixed: Backup deletion after 30 days not working"
   - ❌ "fixed bugs"

4. **When ready to release:**
   - Create new section with version and date
   - Move items from Unreleased to appropriate sections

### Version Numbering (Semantic Versioning)

- **Major.Minor.Patch** (e.g., 2.0.0)
- Major: Big changes that might affect users
- Minor: New features (backward compatible)
- Patch: Bug fixes (backward compatible)

**Examples:**
- 1.0.0 → 1.0.1 = Bug fix
- 1.0.0 → 1.1.0 = New feature
- 1.0.0 → 2.0.0 = Major update (might break things)

---

## Template for New Release

When creating a new version:

```markdown
## [X.X.X] - YYYY-MM-DD

### Type (if significant)
- 🎉 Major Release / 🔧 Maintenance Release / 🐛 Hotfix

#### ✨ Features
- Feature description

#### 🔧 Improvements
- Improvement description

#### 🐛 Bug Fixes
- Fixed: Bug description

#### 📚 Documentation
- Documentation addition/update

#### ⚠️ Known Issues
- Known issue (if any)

#### 🔄 Breaking Changes
- What changed that might affect users (if any)
```

---

## Release Notes for Staff/Owner

When announcing updates to the pharmacy owner:

### Simple Version:

```
Subject: LizzyMike System Update - Version 2.0.0

Hi [Owner Name],

We've updated the pharmacy system with the following improvements:

🎯 New Features:
- Health monitoring dashboard (see system status)
- Faster API response times
- Better security

🔧 What Changed:
- Database migrated to PostgreSQL (more reliable)
- Logging system enhanced for troubleshooting

⚠️ Action Required:
- Admin password must be changed (see attached instructions)
- After update, system restarts automatically

📅 Deployment: January 15, 2024, 6:00 PM - 6:30 PM
⏱️ Downtime: ~30 minutes

Next steps: All staff can continue using normally after restart.

Questions? Contact [IT Contact]

Best regards,
IT Team
```

---

## Common Change Examples

### Feature Addition
```
✨ Feature: SMS alerts for low stock medications
- Sends SMS when stock falls below minimum
- Configurable per medication
- Uses existing SMS provider account
- Reduces manual inventory checks
```

### Bug Fix
```
🐛 Fixed: Inventory count incorrect after batch import
- Issue: Importing 50+ items sometimes resulted in wrong counts
- Cause: Transaction not completed properly
- Solution: Implemented transaction rollback on error
- Testing: Verified with test file of 500 items
```

### Improvement
```
🔧 Improved: Dashboard loading time
- Before: 3-5 seconds
- After: <500ms
- Method: Added database indexes and caching
- Impact: Better user experience, especially on slow networks
```

### Security
```
🔐 Security: Brute force protection added
- Blocks login attempts after 3 failures
- 5-minute cooldown per IP address
- Logs all suspicious activity
- Notifies admin of attacks
```

---

## Release Cycle

**Current Release Schedule:**
- **Major releases**: Every 3-6 months (2.0, 3.0)
- **Minor releases**: Monthly (1.1, 1.2, 1.3)
- **Patches**: As needed for critical bugs

**Release Process:**
1. Development & testing (1-2 weeks)
2. Release candidate testing (3-5 days)
3. Announcement to staff
4. Deployment during off-hours (if possible)
5. Post-deployment verification
6. Update changelog

---

## Important Reminders

1. **Always backup before updating** - Use `make backup`
2. **Test in development first** - Don't update production without testing
3. **Communicate with staff** - Let them know when updates are coming
4. **Keep this file updated** - Update even small changes
5. **Archive old versions** - Keep backup copies of previous versions

---

## Getting Notifications

**To stay updated on changes:**

Option 1: **Check this file monthly**
```
git pull origin main
# Then read CHANGELOG.md
```

Option 2: **Email notifications**
- Ask IT to add you to update notification list
- You'll get emails when major updates happen

Option 3: **Status Dashboard**
- System version shown at bottom of status page
- New features explained in release notes

---

**Last Updated**: January 15, 2024  
**Current Version**: 2.0.0  
**Maintained By**: IT Staff / Development Team
