# Intune Device Onboarding System

Complete automated onboarding solution for Intune-managed Windows devices with Microsoft 365 services.

## 🎯 What This Does

Automatically onboards users on company-managed devices by:
- Verifying Azure AD enrollment
- Syncing with Intune management
- Installing/configuring Office 365 apps
- Setting up OneDrive with auto-sync
- Configuring Outlook for Exchange
- Installing and configuring Teams
- Setting up Excel & PowerPoint
- Logging all actions for support

## 📦 What's Included

| File | Purpose |
|------|---------|
| `Intune-Onboarding.ps1` | Core PowerShell setup script (automated configuration) |
| `Intune-Onboarding-Launcher.bat` | Admin-privileged script runner for end users |
| `onboarding.html` | Beautiful web portal with setup instructions |
| `server.js` | Node.js HTTP server to host the portal |
| `start-server.bat` | Easy server launcher for Windows |
| `package.json` | Node.js dependencies |
| `ONBOARDING-SETUP.md` | Complete documentation (user & admin focused) |
| `DEPLOYMENT-GUIDE.md` | IT administrator deployment instructions |

## 🚀 Quick Start

### For IT Admins (Setting Up)

**Fastest way to deploy (2 minutes):**

1. Install Node.js from https://nodejs.org/
2. Navigate to this folder in Command Prompt
3. Run: `start-server.bat`
4. Open browser to: `http://localhost:3000`
5. Share the URL with users

**For production deployment:**
See `DEPLOYMENT-GUIDE.md` for options:
- IIS deployment
- Network file share
- SharePoint/Teams
- HTTPS configuration
- Security hardening

### For End Users (Using It)

1. Visit the onboarding portal link from IT
2. Click **"Download Launcher"**
3. Right-click downloaded file → **Run as Administrator**
4. Wait 5-10 minutes for setup to complete
5. **Restart computer**
6. All Microsoft 365 services ready to use!

## 📋 System Requirements

**For Users:**
- Windows 10 or 11
- Azure AD enrolled device
- Intune-managed device
- Administrator access (for running setup)
- Company network connection

**For IT (Running Portal):**
- Windows/Mac/Linux
- Node.js 14+ (or IIS/Apache)
- Network connectivity

## 🔧 What Gets Configured

✅ **Device Sync**
- Azure AD verification
- Intune device sync trigger
- MDM policy application

✅ **OneDrive**
- Automatic sync folder creation
- Auto-start on login
- Cloud storage integration

✅ **Outlook**
- Email account auto-discovery
- Modern authentication
- Exchange online sync

✅ **Microsoft Teams**
- Auto-start configuration
- Media settings
- Chat and meeting capabilities

✅ **Office Apps**
- Excel configuration
- PowerPoint setup
- Auto-update configuration
- Cloud collaboration enabled

## 📁 File Locations

**Setup logs stored in:**
```
C:\ProgramData\Intune-Onboarding\
```

**OneDrive location:**
```
C:\Users\[username]\OneDrive
```

**Configuration stored in:**
```
HKCU:\SOFTWARE\Microsoft\OneDrive\
HKCU:\SOFTWARE\Microsoft\Office\
HKCU:\SOFTWARE\Microsoft\Teams\
```

## 🛠️ Customization

### Add Company Branding
Edit `onboarding.html` to change:
- Colors and logo
- Company name
- Support contact info
- Setup instructions

### Add Custom Configuration
Edit `Intune-Onboarding.ps1` to add:
- Company-specific registry settings
- Additional software installation
- Custom policies
- Organization settings

### Change Server Port
```bash
PORT=8080 node server.js
```

## 📊 How It Works

```
User Browser
    ↓
    ├─→ Downloads onboarding.html (portal page)
    ├─→ Downloads Intune-Onboarding-Launcher.bat
    ↓
User Runs Launcher.bat (As Administrator)
    ↓
Launcher Calls PowerShell Script
    ├─→ Verifies Azure AD enrollment
    ├─→ Triggers Intune device sync
    ├─→ Configures Office 365 apps
    ├─→ Sets up OneDrive
    ├─→ Configures Outlook
    ├─→ Sets up Teams
    ├─→ Configures Excel & PowerPoint
    └─→ Logs all actions
    ↓
User Restarts Computer
    ↓
All Services Active ✓
```

## 🔒 Security

- ✓ Requires administrator privileges
- ✓ Requires Azure AD enrollment
- ✓ Uses Windows authentication
- ✓ All actions logged and auditable
- ✓ No hardcoded credentials
- ✓ Modern authentication enabled
- ✓ Optional HTTPS support for web portal

## ❓ FAQ

**Q: Do users need to know anything technical?**
A: No! They just download and run. The script handles everything.

**Q: What if it fails halfway?**
A: Safe to re-run. It skips already-configured items.

**Q: How long does setup take?**
A: 5-10 minutes. Office apps may take longer to deploy via Intune.

**Q: Can I customize it?**
A: Yes! Edit the HTML for branding and PowerShell script for company settings.

**Q: What about MacBooks/Linux?**
A: This is Windows-only. For other platforms, use different solutions.

**Q: Do I need a web server?**
A: No! You can use file share, IIS, or Node.js. See deployment guide.

**Q: Is it safe to run multiple times?**
A: Yes! Idempotent - safe to re-run anytime.

**Q: Can I automate this further?**
A: Yes! Add to Intune deployment profiles to auto-run on devices.

## 📚 Documentation

- **ONBOARDING-SETUP.md** - Complete user & admin documentation
- **DEPLOYMENT-GUIDE.md** - IT deployment options & configuration
- **This file** - Quick overview

## 🆘 Troubleshooting

### Most Common Issues & Fixes

**"PowerShell execution disabled"**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**"Device not Azure AD joined"**
→ Settings > Accounts > Access work or school > Connect

**"Office apps not installing"**
→ Normal - Intune deploys after 24-48 hours. Wait or check Microsoft Store.

**"OneDrive not syncing"**
→ Verify OneDrive is running and user is signed in with company account.

See `ONBOARDING-SETUP.md` for more troubleshooting.

## 🚀 Deployment Options

1. **Node.js Server** (Recommended)
   - Easiest setup
   - Cross-platform
   - Minimal infrastructure

2. **IIS** (Production)
   - Better security
   - HTTPS support
   - Centralized management

3. **File Share**
   - Simplest
   - No server needed
   - Users navigate to network folder

4. **SharePoint/Teams**
   - Integrated with M365
   - Familiar to users
   - Easy distribution

See `DEPLOYMENT-GUIDE.md` for detailed instructions on each option.

## 📈 Next Steps

1. **Test in your environment** - Run on 2-3 test devices first
2. **Customize for your org** - Add branding, company settings
3. **Deploy portal** - Choose deployment method from guide
4. **Train IT support** - Ensure they can troubleshoot
5. **Distribute to users** - Email link or share path
6. **Monitor & improve** - Track success metrics

## 💡 Tips for Success

- ✓ Test thoroughly before full deployment
- ✓ Document any customizations you make
- ✓ Train IT support on troubleshooting
- ✓ Keep backup of original scripts
- ✓ Version your customizations
- ✓ Monitor logs for common issues
- ✓ Gather user feedback
- ✓ Update when Intune/Office changes

## 📞 Support

**For Issues:**
1. Check logs in `C:\ProgramData\Intune-Onboarding\`
2. See troubleshooting section in `ONBOARDING-SETUP.md`
3. Review error messages carefully
4. Check Microsoft Intune admin center
5. Contact internal IT support

## 📄 License & Attribution

**Created:** 2026
**Version:** 1.0
**Type:** Internal IT Tool
**Maintenance:** IT Department

---

**Ready to deploy?** Start with `DEPLOYMENT-GUIDE.md`

**Need detailed info?** See `ONBOARDING-SETUP.md`

**Questions?** Check the FAQ section or documentation files.
