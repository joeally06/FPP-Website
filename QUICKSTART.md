# 🎄 Quick Setup Summary

## Installation (Choose One)

### Option 1: Interactive Wizard (Recommended) ⭐

**Linux/Mac:**
```bash
git clone https://github.com/joeally06/FPP-Website.git
cd FPP-Website
chmod +x setup.sh
./setup.sh
```

**Windows:**
```powershell
git clone https://github.com/joeally06/FPP-Website.git
cd FPP-Website
powershell -ExecutionPolicy Bypass -File setup.ps1
```

**Takes:** 10-15 minutes  
**Difficulty:** Easy - just answer simple questions  
**Best for:** Everyone, especially first-time users

---

### Option 2: Manual Installation

**Requirements:**
- Node.js 20+
- Git
- PM2 (Linux/Mac production only)

**Steps:**
```bash
# 1. Clone repository
git clone https://github.com/joeally06/FPP-Website.git
cd FPP-Website

# 2. Install dependencies
npm install

# 3. Copy and configure environment
cp .env.example .env.local
# Edit .env.local with your settings

# 4. Initialize database
npm run setup

# 5. Build application
npm run build

# 6. Start (choose one)
npm run dev              # Development mode
pm2 start npm -- start   # Production with PM2
```

**Takes:** 20-30 minutes  
**Difficulty:** Moderate - requires manual configuration  
**Best for:** Developers familiar with Node.js

---

## After Installation

### Access Your Site

**Local Network:**
- From server: http://localhost:3000
- From other devices: http://YOUR_IP:3000

**Public (with Cloudflare Tunnel):**
- https://yourdomain.com

### Admin Login

1. Visit your site
2. Click "Admin Login"
3. Sign in with Google
4. Your configured email gets admin access

### Useful Commands

```bash
pm2 status                  # Check app status
pm2 logs fpp-control        # View logs
pm2 restart fpp-control     # Restart app
npm run backup              # Backup database
```

---

## What Gets Configured

The setup wizard walks you through:

✅ **Admin Email** - Your email for admin access  
✅ **Google OAuth** - Secure authentication  
✅ **FPP Server IP** - Your Falcon Player device  
✅ **Timezone** - Display times correctly  
✅ **Email (Optional)** - For Santa letters & alerts  
✅ **Domain (Optional)** - For public access  

---

## Troubleshooting

**Setup wizard won't run:**
```bash
chmod +x setup.sh           # Linux/Mac
# Or run as administrator   # Windows
```

**Node.js too old:**
- Download Node.js 20+ from nodejs.org
- Verify: `node --version`

**Port 3000 in use:**
```bash
# Linux/Mac
lsof -i :3000
kill -9 <PID>

# Windows
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

**Database errors:**
```bash
mv fpp-control.db fpp-control-backup.db
npm run setup
```

---

## Next Steps

After installation:

1. ✅ **Test login** - Try admin access with Google
2. ✅ **Add sequences** - Configure in admin panel
3. ✅ **Set monitoring hours** - When to check FPP
4. ✅ **Enable backups** - Protect your data
5. ✅ **Customize theme** - Pick your style

---

## Full Documentation

- 📖 [README.md](README.md) - Complete guide
- 📋 [INSTALLATION.md](INSTALLATION.md) - Detailed install instructions
- 🔒 [SECURITY-IMPLEMENTATION.md](SECURITY-IMPLEMENTATION.md) - Security features
- 🐛 [GitHub Issues](https://github.com/joeally06/FPP-Website/issues) - Get help

---

**Happy Holidays! 🎄✨**
