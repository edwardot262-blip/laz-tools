# Intune Device Onboarding System

Complete automated onboarding solution for Intune-managed devices with Microsoft 365 apps and services.

## Overview

This system provides:
- **Web-based onboarding portal** - User-friendly interface for device setup
- **Automated PowerShell script** - Handles all configuration tasks
- **Batch launcher** - Admin-privileged script executor
- **HTTP server** - Serves the onboarding portal and scripts

## Components

### 1. `onboarding.html`
Main user-facing web interface with:
- Setup instructions
- Download buttons for scripts
- Status checklist
- Device requirements info

### 2. `Intune-Onboarding.ps1`
Core PowerShell script that:
- Verifies Azure AD enrollment
- Triggers Intune device sync
- Configures Microsoft 365 Apps
- Sets up OneDrive
- Configures Outlook
- Sets up Microsoft Teams
- Configures Excel & PowerPoint
- Logs all actions to `C:\ProgramData\Intune-Onboarding\`

### 3. `Intune-Onboarding-Launcher.bat`
Batch script that:
- Checks for administrator privileges
- Verifies PowerShell script exists
- Executes PowerShell with proper permissions
- Displays results to user

### 4. `server.js`
Node.js HTTP server that:
- Serves `onboarding.html` on port 3000
- Provides download endpoints for scripts
- Handles MIME types correctly
- Includes security measures

## Setup Instructions

### Option A: Using Node.js (Recommended)

#### 1. Install Node.js
Download from https://nodejs.org (LTS version recommended)

#### 2. Start the Server
```bash
cd C:\Users\edwar\laz-tools
node server.js
```

Server will be available at `http://localhost:3000`

#### 3. Access the Portal
Open browser and navigate to:
```
http://localhost:3000
```

Or for remote access (if on same network):
```
http://<your-server-ip>:3000
```

---

### Option B: Using Built-in HTTP Server (IIS/Apache)

#### For IIS:
1. Copy all files to `C:\inetpub\wwwroot\onboarding\`
2. Open IIS Manager
3. Add website pointing to that folder
4. Create MIME types for `.ps1` and `.bat` files
5. Access via `http://<server-name>/onboarding/`

#### For Apache:
1. Copy files to Apache root directory
2. Ensure downloads are allowed in `.htaccess`
3. Access via configured domain/path

---

### Option C: File Share (Simple)

1. Copy all files to a shared network folder
2. Users navigate to the folder on their device
3. Users double-click `Intune-Onboarding-Launcher.bat`

---

## User Workflow

### For End Users:

1. **Navigate to onboarding portal**
   - `http://localhost:3000` (if on corporate network)
   - Or through email link provided by IT

2. **Download launcher**
   - Click "Download Launcher" button
   - Gets `Intune-Onboarding-Launcher.bat`

3. **Run with administrator privileges**
   - Right-click downloaded file
   - Select "Run as Administrator"
   - Allow Windows security prompt

4. **Follow on-screen instructions**
   - Script verifies Azure AD enrollment
   - Triggers Intune sync
   - Configures all services
   - Displays completion message

5. **Restart computer**
   - Restart to apply all changes
   - Services will be fully available after restart

---

## Script Behavior

### What the Script Does:

#### Device Sync
- Verifies Azure AD enrollment status
- Triggers MDM (Mobile Device Management) sync
- Ensures Intune policies are applied

#### Microsoft 365 Apps
- Configures Office installation sources
- Enables automatic updates
- Sets auto-update URLs

#### OneDrive
- Creates OneDrive folder (`%USERPROFILE%\OneDrive`)
- Enables auto-start
- Configures sync settings

#### Outlook
- Detects Office installation
- Enables auto-discovery
- Configures modern authentication

#### Teams
- Configures auto-start
- Sets up media settings
- Enables new Teams client

#### Excel & PowerPoint
- Configures auto-update
- Enables cloud sync
- Sets optimization options

### What the Script Does NOT Do:
- Assign licenses (done via Intune/Azure AD)
- Add users to security groups
- Modify security policies
- Install other applications

---

## Logging

All script actions are logged to:
```
C:\ProgramData\Intune-Onboarding\Onboarding_YYYY-MM-DD_HHMMSS.log
```

Log includes:
- Timestamp of each action
- Success/failure status
- Detailed error messages
- Device and user information

---

## Troubleshooting

### Script Won't Run
**Problem:** "Cannot be loaded because running scripts is disabled"

**Solution:**
```powershell
# Run this once in admin PowerShell:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### "Device is NOT Azure AD joined"
**Problem:** Script exits with this error

**Solution:**
1. Settings > Accounts > Access work or school
2. Click "Connect"
3. Sign in with company account
4. Complete Azure AD join process
5. Restart and run script again

### OneDrive Not Syncing
**Problem:** OneDrive folder exists but not syncing

**Solution:**
1. Check OneDrive is running: `tasklist | findstr OneDrive`
2. Start OneDrive if not running
3. Sign in with company account
4. Wait for initial sync (can take several minutes)

### Outlook Not Opening
**Problem:** Office apps haven't installed yet

**Solution:**
1. Wait 24-48 hours for Intune to deploy Office
2. Check Microsoft Store for Office apps
3. Or manually install from office.com
4. Run script again after installation

### Teams Not Appearing
**Problem:** Teams not listed in start menu

**Solution:**
1. Check if installing via Microsoft Store
2. Search "Teams" in Windows search
3. Or access at teams.microsoft.com
4. Restart computer after app installation

---

## Advanced Configuration

### Customize for Your Organization

#### Change Log Location
Edit `Intune-Onboarding.ps1`, line ~22:
```powershell
$logPath = "C:\YourCustomPath\Logs"
```

#### Add Custom Registry Settings
Add to appropriate function:
```powershell
Set-ItemProperty -Path "HKCU:\SOFTWARE\..." `
    -Name "SettingName" -Value "Value" -Force
```

#### Modify Service Configurations
Edit individual Setup-* functions to add:
- Custom policies
- Organization-specific settings
- Additional apps

---

## Server Configuration

### Change Default Port
```bash
PORT=8080 node server.js
```

### Change Server Hostname
```bash
HOSTNAME=0.0.0.0 node server.js  # Allow external access
```

### Production Deployment

For production use:
1. Use HTTPS (requires certificate)
2. Consider using nginx/IIS instead of Node.js
3. Add authentication to portal
4. Implement rate limiting
5. Monitor server logs
6. Keep scripts updated with latest Intune best practices

---

## Security Considerations

- Scripts require administrator privileges
- Azure AD authentication required for device enrollment
- All downloads include integrity checks
- Logs contain sensitive user information - secure appropriately
- Consider running server behind company network only
- Use HTTPS in production environments
- Validate downloaded scripts before execution

---

## Support & Maintenance

### Regular Updates Needed For:
- Windows 11 version updates
- Office 365 API changes
- Teams client updates
- Azure AD policy changes
- New Intune features

### Monitoring
Check logs regularly for:
- Failed device enrollments
- Timeout issues
- Permission problems
- Service configuration errors

### User Support
Provide users with:
- This documentation
- Contact info for IT support
- Troubleshooting guide
- Link to onboarding portal

---

## Version History

**v1.0** (Current)
- Initial release
- Windows 10/11 support
- Microsoft 365 core services
- HTML portal
- Node.js server

---

## FAQ

**Q: Can I run this on non-Azure AD devices?**
A: No, Azure AD enrollment is required. Device must be joined to corporate Azure AD.

**Q: How long does setup take?**
A: Usually 5-10 minutes. Office apps may take longer to deploy via Intune.

**Q: Do users need IT knowledge?**
A: No, they just need to run the launcher with admin rights. Script handles everything.

**Q: Can I schedule this to run automatically?**
A: Yes, add to Group Policy or task scheduler with `SYSTEM` account.

**Q: What if setup fails partway through?**
A: Safe to re-run script. It will skip already configured items.

**Q: Are Office apps required to be installed first?**
A: No, script configures them even if not yet installed via Intune.

---

## License & Support

For support or questions:
- Contact IT: itsupport@company.com
- Check logs: `C:\ProgramData\Intune-Onboarding\`
- Review this documentation

---

**Created:** 2026
**Last Updated:** 2026-03-27
**Maintained By:** IT Department
