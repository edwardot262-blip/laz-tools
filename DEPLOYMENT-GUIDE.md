# Intune Onboarding System - Deployment Guide

Quick reference guide for IT administrators deploying the Intune onboarding system.

## 📋 Quick Start

### Fastest Deployment (5 minutes)

```bash
# 1. Navigate to installation directory
cd C:\Users\edwar\laz-tools

# 2. Run server launcher
start-server.bat

# 3. Users access via browser
http://localhost:3000
```

---

## 📦 What You Get

```
laz-tools/
├── Intune-Onboarding.ps1              # Core setup script
├── Intune-Onboarding-Launcher.bat     # User-facing launcher
├── onboarding.html                     # Web portal UI
├── server.js                           # HTTP server
├── start-server.bat                    # Server launcher
├── package.json                        # Node.js config
├── ONBOARDING-SETUP.md                # Complete documentation
├── DEPLOYMENT-GUIDE.md                # This file
└── README.md                           # (Optional) Project readme
```

---

## 🚀 Deployment Options

### Option 1: Local Network HTTP Server (Recommended)

**Pros:** Simple, no infrastructure changes, immediate access

**Requirements:**
- Windows machine with Node.js
- Company network access

**Steps:**
1. Install Node.js (https://nodejs.org/)
2. Copy all files to `C:\Onboarding\` (or any location)
3. Open Command Prompt in that folder
4. Run: `node server.js`
5. Share link: `http://<server-ip>:3000`

**Access URL:**
```
http://SERVER_IP:3000
```

---

### Option 2: IIS Deployment

**Pros:** Better security, HTTPS support, centralized management

**Requirements:**
- Windows Server with IIS installed
- Certificate for HTTPS (optional but recommended)

**Steps:**

1. **Copy Files to IIS Root**
   ```
   C:\inetpub\wwwroot\onboarding\
   ├── onboarding.html
   ├── Intune-Onboarding.ps1
   └── Intune-Onboarding-Launcher.bat
   ```

2. **Create IIS Website**
   - Open IIS Manager
   - Right-click Sites > Add Website
   - Name: `Onboarding`
   - Physical path: `C:\inetpub\wwwroot\onboarding`
   - Binding: `http://onboarding.company.com:80`
   - Start website

3. **Configure MIME Types**
   - Open IIS Manager
   - Navigate to your site
   - Double-click MIME Types
   - Add if missing:
     - `.ps1` → `application/x-powershell`
     - `.bat` → `application/x-msdownload`

4. **Enable Directory Browsing (Optional)**
   - For users to see file list
   - Double-click Directory Browsing
   - Enable

**Access URL:**
```
http://onboarding.company.com
https://onboarding.company.com  (if HTTPS configured)
```

---

### Option 3: Network File Share

**Pros:** Simplest setup, no server required

**Requirements:**
- Network shared folder with read permissions

**Steps:**

1. Copy files to shared folder:
   ```
   \\SERVER\Shared\Onboarding\
   ```

2. Give users read access to share

3. Users navigate to share and double-click launcher:
   ```
   \\SERVER\Shared\Onboarding\Intune-Onboarding-Launcher.bat
   ```

**Access:**
```
\\SERVER_NAME\Shared\Onboarding
```

---

### Option 4: Microsoft 365 / SharePoint

**Pros:** Integrated with Microsoft ecosystem, great for organizations already using M365

**Requirements:**
- Microsoft 365 organization
- SharePoint Online or Teams

**Steps:**

1. **Upload to SharePoint Document Library:**
   - Create library: `Device-Onboarding`
   - Upload all files
   - Set permissions (read-only for users)

2. **Or Share via Teams:**
   - Add files to Files tab in channel
   - Share link with new hires

**Access URL:**
```
https://company.sharepoint.com/sites/IT/DeviceOnboarding
```

---

## 🔒 Security Configuration

### For Web Server Deployment

**1. Enable HTTPS**
```
# In IIS: Use SSL certificate
# In Node.js: Implement HTTPS in server.js
```

**2. Restrict Access**
```
# Option A: Require login (Azure AD)
# Option B: IP whitelist to company network ranges
# Option C: VPN requirement
```

**3. Add Authentication (Optional)**

Modify `server.js` to add Basic Auth:
```javascript
const auth = require('basic-auth');

server.on('request', (req, res) => {
    const credentials = auth(req);
    if (!credentials || credentials.name !== 'user' || credentials.pass !== 'pass') {
        res.writeHead(401, {'WWW-Authenticate': 'Basic realm="Onboarding"'});
        res.end('Access Denied');
        return;
    }
    // ... rest of server logic
});
```

**4. Log Access**
```javascript
console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
```

---

## 📧 Distributing to Users

### Email Template

Subject: `Your Device Setup Instructions`

Body:
```
Hi [User],

Welcome to [Company]! Your new device is ready to set up.

To complete your Microsoft 365 onboarding:

1. Visit: http://onboarding.company.com
   OR
   \\company-server\Shared\Onboarding

2. Click "Download Launcher"

3. Run the downloaded file as Administrator

4. The setup will complete automatically (5-10 minutes)

5. Restart your computer

That's it! All your Microsoft 365 services will be ready.

If you encounter any issues, contact IT Support:
support@company.com | ext. 5000

Thanks,
IT Team
```

---

## 🔧 Customization

### Add Company Branding

Edit `onboarding.html`:
```html
<!-- Line ~17: Change colors -->
<style>
    :root {
        --primary-color: #YOUR_COLOR;
    }
</style>

<!-- Line ~65: Add company logo -->
<img src="company-logo.png" alt="Company" class="logo-image">
```

### Modify Setup Steps

Edit `Intune-Onboarding.ps1`:
```powershell
# Add custom configuration function
function Setup-CustomSettings {
    Write-Log "Configuring custom company settings..."
    # Your PowerShell code here
}

# Call from Main()
Setup-CustomSettings
```

### Change Portal Title

Edit `onboarding.html`, line ~70:
```html
<h1>Your Company - Device Setup</h1>
```

---

## 📊 Monitoring & Logs

### User Setup Logs

Located on user's computer:
```
C:\ProgramData\Intune-Onboarding\Onboarding_YYYY-MM-DD_HHMMSS.log
```

**Check for issues:**
```powershell
Get-Content "C:\ProgramData\Intune-Onboarding\*.log" | Select-String "ERROR"
```

### Server Logs

If using Node.js server:
```bash
# Logs appear in terminal where server is running
# Can redirect to file:
node server.js > server.log 2>&1
```

### Intune Logs

On device:
```
C:\ProgramData\Microsoft\IntuneManagementExtension\Logs\
```

---

## 🧪 Testing Deployment

### 1. Test Script Directly

```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
C:\path\to\Intune-Onboarding.ps1
```

### 2. Test Web Portal

```bash
# Start server
node server.js

# Test access
curl http://localhost:3000
curl http://localhost:3000/Intune-Onboarding.ps1
```

### 3. Test with Test User

1. Create test Azure AD user
2. Azure AD join test device
3. Run full setup workflow
4. Verify all services configure correctly
5. Check logs for errors

---

## ⚠️ Common Issues & Fixes

### Server Won't Start

**Error:** "Port already in use"
```bash
# Use different port
PORT=8080 node server.js
```

**Error:** "Node.js not found"
```
Install from: https://nodejs.org/
```

### Script Won't Execute

**Error:** "Running scripts is disabled"
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Error:** "Access Denied"
```
Right-click launcher > Run as Administrator
```

### OneDrive Not Syncing

```powershell
# Check OneDrive running
Get-Process OneDrive

# Restart OneDrive
Stop-Process -Name OneDrive -Force
Start-Process -FilePath "$env:LOCALAPPDATA\Microsoft\OneDrive\OneDrive.exe"
```

### Office Apps Not Installed

```
Normal - Office deploys via Intune (24-48 hours)
Check: Settings > Apps > Apps & features
Or wait and re-run script
```

---

## 🔄 Updates & Maintenance

### When to Update Scripts

- New Windows 11 feature releases
- Office 365 API changes
- Intune policy changes
- Security updates
- Team feedback/feature requests

### Testing Updates

1. Backup current scripts
2. Test in isolated environment
3. Verify all functionality
4. Deploy to production

### Version Control

Suggested naming:
```
Intune-Onboarding_v1.0.ps1
Intune-Onboarding_v1.1.ps1
Intune-Onboarding_v2.0.ps1
```

---

## 📞 Support Contacts

- **Intune Issues:** Microsoft Support
- **PowerShell Issues:** Internal IT
- **Server Issues:** Network Team
- **User Issues:** IT Help Desk

---

## 📈 Metrics to Track

- Number of successful onboardings
- Average setup time
- Common failure points
- User satisfaction
- Most common errors

---

## ✅ Pre-Deployment Checklist

- [ ] All files copied to deployment location
- [ ] Tested on at least 2 devices
- [ ] Server/portal accessible from user machines
- [ ] Logging configured and tested
- [ ] Help documentation ready for users
- [ ] IT support trained on troubleshooting
- [ ] Backup of scripts created
- [ ] Version documented

---

## 🎯 Success Criteria

✓ Setup script runs without errors
✓ OneDrive syncs automatically
✓ Outlook connects to Exchange
✓ Teams starts after restart
✓ Office apps available and activated
✓ Intune policies applied
✓ Users can sign in with company account

---

**Version:** 1.0
**Last Updated:** 2026-03-27
**Maintained By:** IT Department
