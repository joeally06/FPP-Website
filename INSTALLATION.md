# 🎄 FPP Control Center - Installation Guide

Complete installation guide for setting up your FPP Control Center.

---

## 🚀 Quick Install (Recommended)

**The fastest and easiest way to get started:**

### Linux/Mac:
```bash
git clone https://github.com/joeally06/FPP-Website.git
cd FPP-Website
chmod +x setup.sh
./setup.sh
```

### Windows:
```powershell
git clone https://github.com/joeally06/FPP-Website.git
cd FPP-Website
powershell -ExecutionPolicy Bypass -File setup.ps1
```

The interactive wizard handles everything automatically! ✨

---

## 📋 What the Setup Wizard Does

The setup wizard is a friendly, step-by-step installer that:

### **1. System Check** ✅
- Verifies Node.js 20+ is installed
- Checks for npm and Git
- Confirms your operating system

### **2. Installation Type** 🌐
Asks whether you want:
- **Local Network Only** - Simple setup, access from home network
- **Public Internet** - Access from anywhere via Cloudflare Tunnel

### **3. Dependencies** 📦
- Installs all npm packages automatically
- Sets up PM2 process manager (Linux/Mac)
- Prepares the environment

### **4. Database Setup** 🗄️
- Creates SQLite database
- Runs all migrations
- Optimizes with indexes and WAL mode
- Backs up existing database if found

### **5. Google OAuth** 🔐
- Guides you through creating OAuth credentials
- Option to skip and configure later
- Shows exact redirect URIs to use

### **6. Environment Configuration** ⚙️
Walks you through configuring:
- Admin email address
- Google OAuth credentials
- FPP server IP address
- Timezone (with common options)
- Email notifications (optional)
- Domain name (for public installations)

### **7. Build Application** 🔨
- Compiles Next.js for production
- Optimizes code and assets
- Generates static pages

### **8. Start Application** 🚀
- Launches with PM2 (keeps running)
- Configures auto-restart on crash
- Sets up auto-start on reboot
- Shows access URLs

---

## 🎯 Installation Types

### Local Network Installation

**Best for:**
- Displaying to visitors at your home
- Testing and development
- No need for public access

**You get:**
- Access via `http://localhost:3000`
- Access from other devices via `http://YOUR_IP:3000`
- No domain name required
- Simpler OAuth setup

**Example URLs:**
```
From this computer: http://localhost:3000
From phone/tablet:  http://192.168.1.100:3000
```

### Public Internet Installation

**Best for:**
- Sharing with friends/family anywhere
- Remote monitoring when away
- Public Christmas display

**You get:**
- Access via `https://yourdomain.com`
- Secure Cloudflare Tunnel (no port forwarding!)
- SSL/HTTPS automatically
- Protected by Cloudflare's global network

**Requires:**
- Domain name (can use free options like afraid.org)
- Cloudflare account (free tier works)

---

## ⚙️ Prerequisites

The setup wizard will check for these, but you can install them first:

### Required:

**Node.js 20+ and npm:**
- Download from [nodejs.org](https://nodejs.org/) (LTS version)
- Includes npm automatically

**Git:**
- Windows: [git-scm.com](https://git-scm.com/download/win)
- Mac: `brew install git` or Xcode Command Line Tools
- Linux: `sudo apt-get install git` or `sudo yum install git`

### Optional (for production):

**PM2** (Linux/Mac only):
```bash
sudo npm install -g pm2
```

**Cloudflare account** (for public access):
- Sign up free at [cloudflare.com](https://www.cloudflare.com/)

---

## 🔧 Configuration Guide

### Google OAuth Setup

The setup wizard will guide you, but here's the full process:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/apis/credentials

2. **Create a Project** (or select existing)
   - Click "Select a project" → "New Project"
   - Name it "FPP Control Center"
   - Click "Create"

3. **Configure OAuth Consent Screen**
   - Click "OAuth consent screen"
   - Choose "External"
   - Fill in app name: "FPP Control Center"
   - Add your email
   - Save and continue

4. **Create OAuth Credentials**
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Name: "FPP Control"
   
5. **Add Redirect URIs**
   
   **For local network:**
   ```
   http://localhost:3000/api/auth/callback/google
   http://YOUR_SERVER_IP:3000/api/auth/callback/google
   ```
   
   **For public access:**
   ```
   https://yourdomain.com/api/auth/callback/google
   ```

6. **Copy Credentials**
   - Save your Client ID and Client Secret
   - Enter them when the wizard asks

### Email Configuration (Optional)

For Santa letter delivery and device alerts:

**Gmail Setup:**
1. Enable 2-Factor Authentication on your Google account
2. Go to: https://myaccount.google.com/apppasswords
3. Create an app password named "FPP Control"
4. Copy the 16-character password
5. Use this password (not your regular Gmail password)

**Other Email Providers:**
- SMTP Host: Your provider's SMTP server
- SMTP Port: Usually 587 (TLS) or 465 (SSL)
- Username: Your full email address
- Password: Your email password or app password

---

## 🖥️ After Installation

### Access Your Control Center

**Local Network:**
```
http://localhost:3000        # From the server
http://192.168.1.100:3000    # From other devices
```

**Public Access:**
```
https://yourdomain.com
```

### Useful Commands

**View Application Status:**
```bash
pm2 status
```

**View Live Logs:**
```bash
pm2 logs fpp-control
```

**Restart Application:**
```bash
pm2 restart fpp-control
```

**Stop Application:**
```bash
pm2 stop fpp-control
```

**Start Application:**
```bash
pm2 start fpp-control
```

### Admin Access

1. Visit your control center URL
2. Click "Admin Login"
3. Sign in with Google
4. Your email (configured during setup) grants admin access

---

## 🔄 Updating

To update to the latest version:

**Linux/Mac:**
```bash
cd FPP-Website
git pull
npm install
npm run build
pm2 restart fpp-control
```

**Windows:**
```powershell
cd FPP-Website
git pull
npm install
npm run build
# Restart the server (Ctrl+C then npm run dev)
```

Or use the update script (if available):
```bash
./update.sh           # Linux/Mac
.\update.ps1          # Windows
```

---

## 🆘 Troubleshooting

### Setup Wizard Won't Run

**Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

**Windows:**
```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
```

### Node.js Version Error

The wizard requires Node.js 20+:
```bash
node --version    # Should show v20.x.x or higher
```

If outdated, install Node.js 20 LTS from [nodejs.org](https://nodejs.org/)

### Database Errors

If you see database errors:
```bash
# Backup existing database
mv fpp-control.db fpp-control-backup.db

# Reinitialize
npm run setup
```

### Port 3000 Already in Use

**Find and stop the process:**

Linux/Mac:
```bash
lsof -i :3000
kill -9 <PID>
```

Windows:
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

### OAuth Not Working

1. Double-check your redirect URIs in Google Cloud Console
2. Make sure your domain matches exactly
3. For local network, use your actual IP (not `localhost` from other devices)
4. Clear browser cookies and try again

### PM2 Command Not Found

Install PM2 globally:
```bash
sudo npm install -g pm2
```

---

## 📚 Next Steps

After successful installation:

1. **✅ Test the Application**
   - Visit your control center URL
   - Try logging in as admin
   - Check that FPP device shows connected

2. **✅ Configure Features**
   - Add your FPP sequences in the admin panel
   - Set up device monitoring schedule
   - Configure Santa letter templates (optional)

3. **✅ Set Up Backups**
   - Enable automatic database backups:
     ```bash
     crontab -e
     # Add: 0 2 * * * cd /path/to/FPP-Website && npm run backup
     ```

4. **✅ Security Hardening**
   - Review SECURITY-IMPLEMENTATION.md
   - Set up Cloudflare Tunnel (if public)
   - Configure firewall rules

5. **✅ Customize**
   - Choose a theme in admin panel
   - Add custom branding (optional)
   - Set your monitoring hours

---

## 🎉 You're Ready!

Your FPP Control Center is now installed and running!

**Enjoy features like:**
- 🎵 Interactive jukebox for song requests
- 🎅 AI-powered Santa letter responses
- 📊 Real-time device monitoring
- 🗳️ Community sequence voting
- 📈 Visitor analytics

**Need help?** Check out:
- [README.md](README.md) - Full documentation
- [SECURITY-IMPLEMENTATION.md](SECURITY-IMPLEMENTATION.md) - Security guide
- [GitHub Issues](https://github.com/joeally06/FPP-Website/issues) - Community support

**Happy holidays! 🎄✨**
