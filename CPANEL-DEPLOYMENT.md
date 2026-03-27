# cPanel Deployment Guide - Intune Onboarding Portal

Deploy the Intune onboarding system to your live website at **criketmail.com**

## 📋 What Gets Deployed

Files to upload to your web host:
```
onboarding/
├── index.html                      (main portal page)
├── Intune-Onboarding.ps1          (PowerShell script)
└── Intune-Onboarding-Launcher.bat (batch launcher)
```

## 🚀 Step-by-Step Deployment

### Step 1: Access cPanel File Manager

1. Open your cPanel dashboard
2. Look for **File Manager** (usually under Files section)
3. Click **File Manager**
4. Ensure you're in the **public_html** directory (your web root)

### Step 2: Create Onboarding Folder

1. In File Manager, right-click in empty space
2. Select **Create Folder**
3. Name it: `onboarding`
4. Press OK

### Step 3: Upload Files to Onboarding Folder

1. Double-click the `onboarding` folder to open it
2. Look for **Upload** button at top
3. Click **Upload**
4. Upload these 3 files:
   - `index.html` (rename from `onboarding.html`)
   - `Intune-Onboarding.ps1`
   - `Intune-Onboarding-Launcher.bat`

### Step 4: Set Permissions (Important!)

1. Select all 3 files in the onboarding folder
2. Right-click → **Change Permissions**
3. Set to: `644` (read/write for owner, read for others)
4. Click **Change Permissions**

### Step 5: Verify Deployment

Open your browser and navigate to:
```
https://criketmail.com/onboarding/
```

You should see the onboarding portal with the purple gradient design!

---

## 📁 Folder Structure After Upload

Your website structure will be:
```
criketmail.com (public_html)
├── index.html                    (your main portfolio)
├── onboarding/
│   ├── index.html                (onboarding portal)
│   ├── Intune-Onboarding.ps1
│   └── Intune-Onboarding-Launcher.bat
└── [other website files]
```

---

## 🔗 Access URLs

After deployment, users can access via:

**Main portal:**
```
https://criketmail.com/onboarding/
```

**Direct file downloads:**
```
https://criketmail.com/onboarding/Intune-Onboarding-Launcher.bat
https://criketmail.com/onboarding/Intune-Onboarding.ps1
```

**Your main website (with onboarding link):**
```
https://criketmail.com
```

---

## 📧 Share With Users

Send users this link:
```
https://criketmail.com/onboarding/
```

Instructions for them:
1. Visit the link
2. Click **"Download Launcher"** button
3. Right-click downloaded file → **Run as Administrator**
4. Wait for setup to complete (5-10 minutes)
5. Restart computer

---

## 🔒 MIME Type Configuration (If Needed)

If downloaded files don't work properly, add MIME types in cPanel:

1. cPanel → **MIME Types**
2. Add if missing:
   - **Extension:** `ps1` → **MIME Type:** `application/x-powershell`
   - **Extension:** `bat` → **MIME Type:** `application/x-msdownload`
3. Click **Add**

---

## ✅ Testing Checklist

- [ ] Portal loads at `https://criketmail.com/onboarding/`
- [ ] Portal displays correctly (purple design, not broken)
- [ ] Download buttons work
- [ ] Files download with correct names
- [ ] Navigation link added to main website
- [ ] Mobile view looks good

---

## 🛠️ Troubleshooting

### Portal shows 404 error
- Verify folder name is exactly `onboarding` (lowercase)
- Check folder is inside `public_html`
- Clear browser cache and reload

### Files won't download
- Check file permissions are set to 644
- Verify MIME types are configured
- Try different browser

### Design looks broken (no CSS styling)
- This is normal - CSS is embedded in index.html
- Should display with purple gradient and professional layout
- Check file uploaded completely

### Users can't execute .bat file
- Users must right-click → **Run as Administrator**
- May need to add file to Windows Defender exceptions
- See troubleshooting in main documentation

---

## 📊 Monitoring

### Check Upload Success

In cPanel File Manager:
1. Navigate to `/public_html/onboarding/`
2. Should see 3 files listed
3. File sizes should match originals:
   - `index.html` ≈ 11 KB
   - `Intune-Onboarding.ps1` ≈ 11 KB
   - `Intune-Onboarding-Launcher.bat` ≈ 1 KB

### Monitor User Access

In cPanel:
1. Go to **Raw Access Logs**
2. Look for requests to `/onboarding/`
3. See which users accessed the portal

---

## 🔄 Updates & Maintenance

### If You Update Scripts

1. Download latest files from GitHub
2. Log into cPanel
3. Upload to `/onboarding/` folder
4. Overwrite existing files
5. Files update automatically for all users

### Versioning

Keep file backups:
```
onboarding-v1.0/
├── index.html
├── Intune-Onboarding.ps1
└── Intune-Onboarding-Launcher.bat
```

---

## 🔐 Security Notes

- Files are readable by all (644 permissions = safe)
- No sensitive data in HTML or scripts
- Users must have admin rights to execute
- All logs stored locally on user's device
- No data sent back to your server

---

## 📱 Mobile Access

Users can access the portal from phones/tablets:
```
https://criketmail.com/onboarding/
```

Portal is responsive and mobile-friendly. Users will still need to:
1. Download file to device
2. Use file manager to locate it
3. Move to Windows machine
4. Run with administrator rights

Or simply send them the direct link to run on their Windows device.

---

## 💡 Pro Tips

1. **Add to Email Signature**
   - Include link in IT communications
   - New hires get automatic setup access

2. **Create QR Code**
   - Use online QR generator
   - Point to: `https://criketmail.com/onboarding/`
   - Print on IT welcome sheets

3. **Automate Emails**
   - Send portal link in welcome email
   - Include troubleshooting guide
   - Provide IT support contact info

4. **Track Success**
   - Check logs in `C:\ProgramData\Intune-Onboarding\`
   - Monitor cPanel access logs
   - Gather user feedback

---

## 🆘 Support Contacts

**If deployment issues:**
- Check cPanel documentation
- Contact your hosting provider's support
- Review MIME types configuration

**If script issues:**
- See main `ONBOARDING-SETUP.md`
- Check user device logs in `C:\ProgramData\Intune-Onboarding\`
- Review troubleshooting section

---

## ✨ Next Steps

1. ✅ Upload files to cPanel
2. ✅ Test portal access
3. ✅ Verify downloads work
4. ✅ Share link with users
5. ✅ Monitor adoption & feedback

---

**Website:** criketmail.com
**Onboarding Portal:** criketmail.com/onboarding/
**Version:** 1.0
**Date:** 2026-03-27
