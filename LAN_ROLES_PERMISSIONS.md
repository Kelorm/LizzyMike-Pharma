# 👥 LAN Multi-User - Roles & Permissions Guide

## User Roles Overview

The LizzyMike Pharma system supports multiple user roles, each with specific permissions:

---

## Role Definitions

### 1. **Admin (System Administrator)**

**Permissions:**
- ✅ Full system access
- ✅ Create, read, update, delete all data
- ✅ User management (create/edit/delete users)
- ✅ System configuration
- ✅ View all reports
- ✅ Access admin panel
- ✅ Database backups

**Use Case:**
- System owner/IT person
- Final authority
- System manager

**How to Create:**
```bash
cd Backend
set DJANGO_SETTINGS_MODULE=pharmasys.settings_consolidated
python manage.py createsuperuser --skip-checks
```

Or through Admin Panel:
1. Login as existing admin
2. Go to Admin → Users → Add User
3. Select role: **Admin**

---

### 2. **Pharmacy Manager**

**Permissions:**
- ✅ View inventory
- ✅ Generate reports
- ✅ View sales transactions
- ✅ Manage pharmacy settings
- ✅ Create user accounts
- ❌ Delete user accounts
- ❌ System configuration

**Responsibilities:**
- Oversee daily operations
- Review reports
- Manage staff
- Monitor sales performance

**To Create:**
1. Admin Panel → Users → Add User
2. Username: `manager1`
3. Role: **Pharmacy Manager**
4. Grant permissions in Groups

---

### 3. **Pharmacist**

**Permissions:**
- ✅ View medications/inventory
- ✅ Update medication information
- ✅ Manage medication pricing
- ✅ Create sales (Rx)
- ✅ View customer information
- ✅ Create receipts
- ❌ View admin panel
- ❌ Delete medications
- ❌ User management

**Responsibilities:**
- Dispense medications
- Manage prescriptions
- Update inventory
- Assist customers

**To Create:**
1. Admin Panel → Users → Add User
2. Username: `pharmacist1`
3. Role: **Pharmacist**

---

### 4. **Cashier**

**Permissions:**
- ✅ View inventory (read-only)
- ✅ Create sales (Non-Rx)
- ✅ Process payments
- ✅ View customer information
- ✅ Create receipts
- ✅ View sales history (own only)
- ❌ Modify prices
- ❌ Delete sales
- ❌ View reports
- ❌ Add medications

**Responsibilities:**
- Handle cash register
- Process payments
- Create sales receipts
- Handle customer inquiries

**To Create:**
1. Admin Panel → Users → Add User
2. Username: `cashier1`
3. Role: **Cashier**

---

### 5. **Stock Manager**

**Permissions:**
- ✅ View full inventory
- ✅ Update stock levels
- ✅ Receive new stock
- ✅ Generate inventory reports
- ✅ Manage expiry dates
- ✅ Create restock orders
- ❌ Create sales
- ❌ Delete items
- ❌ Change prices

**Responsibilities:**
- Monitor stock levels
- Receive deliveries
- Manage expiry tracking
- Generate stock reports

**To Create:**
1. Admin Panel → Users → Add User
2. Username: `stock_manager1`
3. Role: **Stock Manager**

---

## User Creation Workflow

### Step 1: Prepare User Information

```
Name: John Doe
Username: john.doe
Email: john@pharmacy.com
Role: Pharmacist
Department: Pharmacy
```

### Step 2: Create Account

1. Login as **Admin**
2. Navigate to **Admin Panel** → **Users**
3. Click **Add User**
4. Fill in form:
   - **Username**: `john.doe`
   - **Email**: `john@pharmacy.com`
   - **First Name**: `John`
   - **Last Name**: `Doe`
5. Click **Next**

### Step 3: Set Role

6. Select **Role**: `Pharmacist`
7. Assign **Groups** (if applicable)
8. Set **Permissions** (optional, advanced)
9. Click **Save**

### Step 4: Password Assignment

10. System generates **temporary password**
11. Provide to user:
    ```
    Username: john.doe
    Temporary Password: [provided by system]
    First Login: http://192.168.1.200
    ```
12. User must **change password** on first login

---

## Permission Matrix

| Action | Admin | Manager | Pharmacist | Cashier | Stock Mgr |
|--------|:-----:|:-------:|:----------:|:-------:|:---------:|
| View Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Medication | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Sale | ✅ | ✅ | ✅ | ✅ | ❌ |
| View Reports | ✅ | ✅ | ✅ | ❌ | ✅ |
| Manage Users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update Inventory | ✅ | ✅ | ✅ | ❌ | ✅ |
| View Admin Panel | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete Data | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Multi-User Scenarios

### Scenario 1: Typical Daily Operation

```
Time     | PC1 (Admin) | PC2 (Pharmacist) | PC3 (Cashier) | PC4 (Stock)
---------|------------|------------------|---------------|----------
08:00    | Login      | -                | -             | -
08:15    | -          | Login            | -             | -
08:30    | -          | -                | Login         | -
08:45    | Review     | Dispense Med     | Process Sale  | Check Stock
         | Reports    | Update Inventory | Print Receipt | Update Levels
09:00    | All users logged in - System running at peak
```

### Scenario 2: Stock Receipt

```
1. Stock Manager logs in
2. Clicks "Receive Stock"
3. Scans barcodes or enters medication info
4. Updates quantities
5. System notifies all users of new stock availability
6. Pharmacist sees updated inventory
7. Cashier can now sell the medication
```

### Scenario 3: Concurrent Sales

```
At Same Time:
- Pharmacist 1: Creating Rx sale for Customer A
- Pharmacist 2: Creating Rx sale for Customer B
- Cashier 1: Processing Non-Rx cash sale
- Cashier 2: Processing card payment

Result: ✅ All transactions completed simultaneously
```

---

## Password Management

### Initial Setup

```
Username: new_user
Temporary Password: [system-generated]
First Login: Required to change password
```

### Password Change

1. Login
2. Click **Profile** (top-right)
3. Click **Change Password**
4. Enter:
   - Current password
   - New password
   - Confirm new password
5. Click **Update**

### Admin Password Reset

If user forgets password:

1. Admin → Users → Find User
2. Click **Reset Password**
3. New temporary password sent to email
4. User logs in and changes again

---

## Login Sessions

### Session Timeout
- **Duration**: 2 weeks of inactivity
- **Auto-logout**: After 2 weeks inactivity
- **Max Concurrent**: 1 session per user (new login invalidates old)

### Multiple Concurrent Logins
```
✅ User can have:
- Session 1: PC1 (Pharmacist workstation)
- Session 2: PC2 (Admin review)
- Session 3: Mobile/Tablet

⚠️ Only latest login remains active
```

### After Hours Logout

```bash
# Admin: Force logout all users
python manage.py shell
>>> from django.contrib.auth.models import User
>>> from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
>>> # Clear all active sessions (optional)
>>> exit()

# Or just restart Django server
taskkill /F /IM python.exe
# Then start_server.bat
```

---

## Audit & Activity Tracking

### View User Activity

1. Admin Panel → Logs
2. Filter by:
   - User
   - Date Range
   - Action Type

### Tracked Actions
- ✅ Login/Logout
- ✅ Sales created
- ✅ Inventory updated
- ✅ User management
- ✅ Settings changed

### Generate Activity Report

```bash
cd Backend
python manage.py shell
>>> from core.models import ActivityLog
>>> logs = ActivityLog.objects.filter(user__username='john.doe')
>>> for log in logs.last(100):
...     print(f"{log.timestamp} - {log.action}")
```

---

## Best Practices

### For Pharmacy Managers

1. ✅ Create separate account for each staff member
2. ✅ Use meaningful usernames (first.last)
3. ✅ Assign appropriate roles
4. ✅ Review user activity weekly
5. ✅ Deactivate unused accounts
6. ✅ Regular password changes (monthly)

### For IT/Admin

1. ✅ Backup admin credentials securely
2. ✅ Monitor for unusual activity
3. ✅ Regular password updates
4. ✅ Review logs for security
5. ✅ Test disaster recovery quarterly
6. ✅ Keep system updated

### For All Users

1. ✅ Never share passwords
2. ✅ Change temporary passwords immediately
3. ✅ Logout when leaving workstation
4. ✅ Report suspicious activity
5. ✅ Use strong passwords (8+ chars, mixed case)
6. ✅ Lock workstation when stepping away

---

## Troubleshooting

### User Can't Login
```bash
# 1. Check if user exists
python manage.py shell
>>> from django.contrib.auth.models import User
>>> User.objects.filter(username='john.doe').exists()

# 2. Reset password
# (See Password Management section)

# 3. Check if account active
>>> user = User.objects.get(username='john.doe')
>>> user.is_active
```

### User Has Wrong Permissions
```bash
# 1. Check user groups
>>> from django.contrib.auth.models import Group
>>> user.groups.all()

# 2. Add to group
>>> group = Group.objects.get(name='Pharmacist')
>>> user.groups.add(group)
>>> user.save()
```

### Too Many Concurrent Users
- Add more Gunicorn workers
- Increase server resources
- Enable caching
- Optimize database queries

---

## Summary

| Role | Best For | Users | Permissions |
|------|----------|-------|-------------|
| Admin | System Management | 1-2 | Full |
| Manager | Oversight | 1-2 | Most |
| Pharmacist | Medication Dispensing | 2-5+ | Sales, Inventory |
| Cashier | POS/Payments | 1-3+ | Sales Only |
| Stock Manager | Inventory Control | 1-2 | Stock Only |

**Total Recommended Concurrent Users**: 5-20 per pharmacy

