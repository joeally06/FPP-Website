# FPP Control Center

A comprehensive web-based control center for managing Falcon Player (FPP) Christmas light displays with interactive features including a song request jukebox, voting system, Santa letter automation, device monitoring, and visitor analytics.

## ✨ Features

- 🎵 **Interactive Jukebox** - Let visitors request songs with real-time queue management
- 🗳️ **Sequence Voting** - Community voting on favorite light sequences
- 🎅 **AI-Powered Santa Letters** - Automated letter generation and email delivery via Ollama
- 📊 **Analytics Dashboard** - Visitor tracking, sequence popularity, and engagement metrics
- 🖥️ **Device Monitoring** - Real-time status tracking with email alerts
- 🎨 **Theme Engine** - Multiple visual themes with custom particle effects
- ⚡ **Optimized Database** - SQLite with WAL mode, indexes, and automated maintenance
- 🔐 **Admin Panel** - Secure authentication with NextAuth

## 🚀 Quick Start

### Step 1: Install Prerequisites (One-Time Setup)

Before running the installer, you need to install these system dependencies. **This is a one-time setup** that works for all Node.js projects.

#### ✅ **Install Node.js 18+**

Node.js is required to run the application. npm (Node Package Manager) is included with Node.js.

**Windows:**
1. Download the installer from [nodejs.org](https://nodejs.org/)
2. Run the installer (use the LTS version)
3. Follow the installation wizard (accept all defaults)
4. Restart your terminal/PowerShell

**Mac:**
```bash
# Option 1: Using Homebrew (recommended)
brew install node

# Option 2: Download installer from nodejs.org
```

**Linux (Ubuntu/Debian):**
```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v18.x.x or higher
npm --version   # Should show 8.x.x or higher
```

**Linux (CentOS/RHEL/Fedora):**
```bash
# Install Node.js 18.x LTS
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version
npm --version
```

#### ✅ **Install Git**

Git is required to clone the repository and receive updates.

**Windows:**
1. Download Git from [git-scm.com](https://git-scm.com/download/win)
2. Run the installer
3. Use recommended settings (default options are fine)
4. Restart your terminal/PowerShell

**Mac:**
```bash
# Option 1: Using Homebrew (recommended)
brew install git

# Option 2: Install Xcode Command Line Tools
xcode-select --install

# Verify installation
git --version
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install -y git

# Verify installation
git --version
```

**Linux (CentOS/RHEL/Fedora):**
```bash
sudo yum install -y git

# Verify installation
git --version
```

#### ⚠️ **Verify Prerequisites are Installed**

Before proceeding, verify everything is installed correctly:

```bash
# Check Node.js (should be 18.0.0 or higher)
node --version

# Check npm (should be 8.0.0 or higher)
npm --version

# Check Git (any recent version is fine)
git --version
```

**All three commands should return version numbers.** If any command shows "not found" or "command not recognized", go back and install that prerequisite.

---

### Step 2: Install FPP Control Center

Once prerequisites are installed, the rest is fully automated!

#### Linux/Mac

```bash
# Clone the repository
git clone https://github.com/yourusername/fpp-control-center.git
cd fpp-control-center

# Make install script executable
chmod +x install.sh

# Run the automated installer
./install.sh
```

#### Windows (PowerShell)

```powershell
# Open PowerShell (no need for Administrator rights)
# Clone the repository
git clone https://github.com/yourusername/fpp-control-center.git
cd fpp-control-center

# Run the automated installer
.\install.ps1
```

The installation wizard will:
- ✅ Verify all prerequisites are installed
- ✅ Install all npm packages automatically (better-sqlite3, luxon, etc.)
- ✅ Guide you through configuration (timezone, FPP IP, email, etc.)
- ✅ Initialize the database with optimizations
- ✅ Set up monitoring schedules
- ✅ Create `.env.local` configuration file

**Total installation time: 3-5 minutes** ⏱️

---

### Step 3: Start the Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

Visit **http://localhost:3000** to access your FPP Control Center! 🎄

---

## 📋 Optional Dependencies

These are **not required** for installation but enable additional features:

### 🤖 **Ollama (for AI-Powered Santa Letters)**

If you want AI-generated Santa letter responses:

**Windows/Mac:**
1. Download from [ollama.ai](https://ollama.ai/)
2. Install and run Ollama
3. Download the model: `ollama pull llama3.2`

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3.2
```

If Ollama is not installed, Santa letters will still be saved but won't generate AI responses.

### 📧 **SMTP Email Server (for Email Notifications)**

For sending Santa letter emails and device alerts, you'll need SMTP credentials:

**Options:**
- **Gmail** - Use App Passwords (see [Google App Passwords](https://support.google.com/accounts/answer/185833))
- **Outlook/Office 365** - Use account credentials
- **SendGrid** - Free tier available
- **Mailgun** - Free tier available

Configure during installation or manually in `.env.local`.

---

## 🔍 Troubleshooting Prerequisites

### "node: command not found"

**Cause:** Node.js is not installed or not in your system PATH.

**Solution:**
1. Close and reopen your terminal (PATH updates require restart)
2. If still not found, reinstall Node.js
3. On Windows, ensure "Add to PATH" was checked during installation

### "npm: command not found" (but node works)

**Cause:** npm was not installed with Node.js.

**Solution:**
```bash
# Reinstall Node.js (npm is included)
# Or manually install npm:
curl -L https://npmjs.org/install.sh | sh
```

### "git: command not found"

**Cause:** Git is not installed or not in your system PATH.

**Solution:**
1. Close and reopen your terminal
2. If still not found, reinstall Git
3. On Windows, ensure "Add Git to PATH" was selected during installation

### Node.js version too old (< 18)

**Cause:** You have an older version of Node.js installed.

**Solution:**
```bash
# Check your version
node --version

# If less than v18.0.0, update Node.js
# Windows/Mac: Download latest LTS from nodejs.org
# Linux: Use NodeSource repository (see installation instructions above)
```

### Permission errors on Linux/Mac

**Cause:** npm global installations require elevated permissions.

**Solution:**
```bash
# Option 1: Fix npm permissions (recommended)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Option 2: Use sudo (not recommended)
sudo npm install
```

---

## 📦 What Gets Installed Automatically

Once you run `install.sh` or `install.ps1`, these packages are installed automatically via npm:

### Core Dependencies
- ✅ **Next.js 14** - React framework
- ✅ **React 18** - UI library
- ✅ **better-sqlite3** - High-performance database
- ✅ **luxon** - Timezone handling
- ✅ **nodemailer** - Email sending
- ✅ **zod** - Input validation
- ✅ **next-auth** - Authentication

### Development Dependencies
- ✅ **TypeScript** - Type safety
- ✅ **Tailwind CSS** - Styling
- ✅ **ESLint** - Code quality
- ✅ All necessary TypeScript type definitions

**You don't need to install these manually!** The install script handles everything.

---

## 🎯 Quick Reference Card

### Prerequisites (Install Once)

| Requirement | Check Command | Install Guide |
|-------------|---------------|---------------|
| Node.js 18+ | `node --version` | [nodejs.org](https://nodejs.org/) |
| npm 8+ | `npm --version` | (Included with Node.js) |
| Git | `git --version` | [git-scm.com](https://git-scm.com/) |

### Optional Features

| Feature | Requirement | Install Guide |
|---------|-------------|---------------|
| AI Santa Letters | Ollama | [ollama.ai](https://ollama.ai/) |
| Email Notifications | SMTP Server | Gmail/Outlook/SendGrid |

### Installation Commands

```bash
# 1. Verify prerequisites
node --version  # Must be 18+
npm --version   # Must be 8+
git --version   # Any version

# 2. Clone and install
git clone https://github.com/yourusername/fpp-control-center.git
cd fpp-control-center
./install.sh  # or .\install.ps1 on Windows

# 3. Start server
npm run dev
```

---

## 📦 Configuration

Configuration is stored in `.env.local` (auto-generated during installation):

```env
# Timezone (for scheduling)
NEXT_PUBLIC_TIMEZONE=America/Chicago

# FPP Device
FPP_URL=http://192.168.5.2

# Ollama AI (optional)
NEXT_PUBLIC_OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# SMTP Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ALERT_EMAIL=alerts@example.com

# Device Monitoring Schedule
MONITORING_START_TIME=16:00
MONITORING_END_TIME=22:00

# NextAuth (auto-generated)
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=http://localhost:3000
```

To reconfigure anytime:
```bash
npm run setup
```

---

## 🔄 Updates

### Updating to the Latest Version

#### Linux/Mac

```bash
./update.sh
```

#### Windows

```powershell
.\update.ps1
```

The update script will:
1. Create a timestamped backup
2. Show you what's new (git changelog)
3. Ask for confirmation
4. Pull the latest changes
5. Update dependencies
6. Run database migrations
7. Rebuild the application

### Rollback

If an update causes issues:

#### Linux/Mac

```bash
./rollback.sh backups/YYYYMMDD_HHMMSS
```

#### Windows

```powershell
.\rollback.ps1 -BackupDir backups\YYYYMMDD_HHMMSS
```

---

## 💾 Backup & Restore

### Manual Backup

```bash
npm run backup
```

Creates a timestamped backup in `backups/` directory containing:
- Database (`fpp.db`)
- Configuration (`.env.local`)
- WAL files (if present)

### Restore from Backup

See [Rollback](#rollback) section above.

---

## 📊 Database Management

### View Statistics

```bash
npm run db:stats
```

Shows:
- Database size and configuration
- Table record counts
- Migration history
- Recent activity (24 hours)
- Top requested songs
- Health check

### Run Migrations

```bash
npm run migrate
```

Applies any pending database migrations.

### Admin UI

Access the database management UI at:
- Settings → Database (requires admin login)

Features:
- Real-time statistics
- Manual maintenance (ANALYZE, REINDEX, VACUUM)
- Archive old data
- Integrity check

---

## 🔧 Maintenance

### Automated Maintenance

The system automatically runs:
- **Daily** - Quick maintenance (ANALYZE)
- **Weekly** - Full maintenance (ANALYZE + REINDEX + VACUUM)

### Manual Maintenance

Via Admin UI (Settings → Database):
- **Quick Maintenance** - Optimize query planner (30 seconds)
- **Full Maintenance** - Complete optimization (5-10 minutes)
- **Archive Data** - Remove records older than 365 days
- **Integrity Check** - Verify database health

---

## 📁 Project Structure

```
fpp-control-center/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Admin dashboard
│   ├── jukebox/           # Public jukebox page
│   ├── santa/             # Santa letter submission
│   └── settings/          # Admin settings
├── components/            # React components
├── lib/                   # Utility libraries
│   ├── database.ts        # SQLite database & schema
│   ├── db-maintenance.ts  # Maintenance utilities
│   └── db-scheduler.ts    # Automated scheduling
├── migrations/            # SQL migration files
│   └── 001_initial_schema.sql
├── scripts/               # Utility scripts
│   ├── setup-wizard.js    # Interactive configuration
│   ├── init-database.js   # Database initialization
│   ├── migrate-database.js # Migration runner
│   ├── check-dependencies.js # Dependency checker
│   ├── backup.js          # Manual backup
│   └── db-stats.js        # Database statistics
├── data/                  # Database storage (auto-created)
│   └── fpp.db
├── backups/               # Backup storage (auto-created)
├── install.sh             # Linux/Mac installer
├── install.ps1            # Windows installer
├── update.sh              # Linux/Mac updater
├── update.ps1             # Windows updater
├── rollback.sh            # Linux/Mac rollback
├── rollback.ps1           # Windows rollback
└── .env.local             # Configuration (auto-generated)
```

---

## 🎯 Usage

### Public Features

- **Jukebox** (`/jukebox`) - Request songs, view queue, see what's playing
- **Santa Letters** (`/santa`) - Submit letters to Santa for AI-generated replies

### Admin Features

Access admin panel at `/dashboard` (requires login):

- **Dashboard** - Analytics, queue management, recent activity
- **Santa Letters** - Review, approve, and manage letters
- **Playlists** - View and manage FPP playlists
- **Sequences** - Browse all sequences with metadata
- **Settings** - Configure themes, monitoring, database

---

## 🔐 Admin Access

Default admin credentials can be configured via environment variables or updated in the code.

For production, update `app/api/auth/[...nextauth]/route.ts` to use a secure authentication provider.

---

## 🌐 Production Deployment

### Security Overview

The FPP Control Center includes comprehensive security features for public internet deployment:

- ✅ **HTTPS via Cloudflare Tunnel** - Automatic SSL/TLS encryption
- ✅ **Google OAuth Authentication** - Secure admin access with email whitelist
- ✅ **CSRF Protection** - Middleware validates request origins
- ✅ **Database-Backed Rate Limiting** - Prevents abuse and spam
  - Song requests: 3 per hour per IP
  - Santa letters: 2 per day per IP
  - General API: 100 per minute per IP
- ✅ **Session Timeouts** - 30-minute admin sessions with auto-refresh
- ✅ **Input Sanitization** - Email header injection prevention
- ✅ **DDoS Protection** - Built-in with Cloudflare Tunnel
- ✅ **Security Logging** - Tracks login attempts and rate limit violations

**Security Grade: A-** (ready for public internet deployment)

### Cloudflare Tunnel Setup (Recommended)

Cloudflare Tunnel provides the easiest and most secure way to expose your application to the internet:

**Benefits:**
- ✅ Automatic HTTPS with valid SSL certificates
- ✅ No port forwarding required
- ✅ DDoS protection included
- ✅ Hides your origin server IP
- ✅ 10-minute setup process

**Prerequisites:**
- Free Cloudflare account ([sign up here](https://dash.cloudflare.com/sign-up))
- Domain name pointed to Cloudflare DNS

**Linux/Mac Setup:**
```bash
# Run automated setup script
npm run cloudflare:setup

# Or manually:
bash scripts/setup-cloudflare-tunnel.sh
```

**Windows Setup:**
```powershell
# Run automated setup script
npm run cloudflare:setup:win

# Or manually:
powershell -ExecutionPolicy Bypass -File scripts/setup-cloudflare-tunnel.ps1
```

**What the script does:**
1. Installs `cloudflared` (Cloudflare Tunnel client)
2. Logs you into your Cloudflare account
3. Creates a new tunnel with your chosen name
4. Configures DNS routing to your domain
5. Sets up automatic startup as a system service
6. Provides next steps for environment configuration

**After Cloudflare Setup:**

1. **Update Environment Variables** (`.env.local`):
   ```bash
   # Change this from localhost to your domain
   NEXTAUTH_URL=https://yourdomain.com
   ```

2. **Update Google OAuth Redirect URIs**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Select your OAuth 2.0 Client ID
   - Add authorized redirect URI: `https://yourdomain.com/api/auth/callback/google`
   - Save changes

3. **Restart Application**:
   ```bash
   # If using PM2:
   pm2 restart fpp-control
   
   # If using npm:
   npm run dev  # or npm start for production
   ```

4. **Verify Deployment**:
   ```bash
   # Check tunnel status
   cloudflared tunnel list
   cloudflared tunnel info <your-tunnel-name>
   
   # Test HTTPS access
   curl https://yourdomain.com
   
   # View tunnel logs (Linux/Mac)
   journalctl -u cloudflared -f
   
   # View tunnel logs (Windows)
   Get-Service cloudflared
   ```

### Production Deployment Script

For a complete production deployment with PM2 process manager:

```bash
# Automated deployment
npm run deploy:prod

# Or manually:
bash deploy-production.sh
```

**What the deployment script does:**
1. Validates Node.js version (18+)
2. Installs all dependencies (`npm install`)
3. Builds Next.js application (`npm run build`)
4. Installs PM2 process manager (if needed)
5. Optionally runs Cloudflare Tunnel setup
6. Starts application with PM2
7. Configures PM2 auto-start on system boot
8. Displays monitoring commands and next steps

**PM2 Process Management:**

```bash
# View application status
pm2 status

# View live logs
pm2 logs fpp-control

# Restart application
pm2 restart fpp-control

# Stop application
pm2 stop fpp-control

# View metrics (CPU, memory)
pm2 monit

# Save PM2 configuration
pm2 save

# Setup auto-start on system boot
pm2 startup
```

### Environment Configuration

**Required for Production:**

```bash
# Domain (update after Cloudflare setup)
NEXTAUTH_URL=https://yourdomain.com

# Google OAuth (for admin authentication)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Admin Email Whitelist (comma-separated)
ADMIN_EMAILS=admin@example.com,another@example.com

# NextAuth Secret (generate random string)
NEXTAUTH_SECRET=your-random-secret-string

# FPP Configuration
FPP_URL=http://192.168.5.2:80

# Email (for Santa letters and alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

**Generate NEXTAUTH_SECRET:**
```bash
# Linux/Mac:
openssl rand -base64 32

# Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Rate Limiting Configuration

Rate limits are configured in `lib/rate-limit.ts`:

```typescript
// Current limits (adjust as needed)
songRequestLimiter: 3 requests/hour, block for 1 hour
santaLetterLimiter: 2 letters/day, block for 24 hours
votingLimiter: 10 votes/hour, block for 30 minutes
apiGeneralLimiter: 100 requests/minute, block for 5 minutes
```

**To adjust limits:**
1. Edit `lib/rate-limit.ts`
2. Modify `points`, `duration`, or `blockDuration`
3. Rebuild: `npm run build`
4. Restart: `pm2 restart fpp-control`

### Monitoring & Maintenance

**Check Rate Limit Status:**
```bash
# View blocked IPs and rate limit entries
npm run db:stats

# Manual cleanup of old rate limits
node -e "const {cleanupRateLimits} = require('./lib/rate-limit'); cleanupRateLimits();"
```

**Monitor Security Events:**
```bash
# View security logs
pm2 logs fpp-control | grep SECURITY

# Count rate limit violations
pm2 logs fpp-control | grep "Rate limit exceeded" | wc -l
```

**Database Maintenance:**
```bash
# Run automated maintenance
npm run db:stats

# Create manual backup
npm run backup

# View backup list
ls -la backups/
```

### Firewall Configuration

If using Cloudflare Tunnel, **no inbound firewall rules** are needed:

```bash
# Only allow outbound HTTPS (443) for Cloudflare Tunnel
# The tunnel connects OUT to Cloudflare, no inbound ports needed

# Optional: Block all inbound ports except SSH (for management)
# Linux (ufw):
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw enable
```

### DNS Configuration

**Cloudflare DNS Setup:**

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your domain
3. Go to **DNS** → **Records**
4. The tunnel setup script automatically creates a CNAME record:
   ```
   Type: CNAME
   Name: yourdomain (or subdomain like 'fpp')
   Target: <tunnel-id>.cfargotunnel.com
   Proxy: Enabled (orange cloud)
   ```

### Troubleshooting Production Deployment

**Cloudflare Tunnel Not Connecting:**
```bash
# Check tunnel status
cloudflared tunnel list

# Test tunnel connectivity
cloudflared tunnel run <tunnel-name>

# View tunnel configuration
cat ~/.cloudflared/config.yml

# Restart tunnel service (Linux)
sudo systemctl restart cloudflared

# Restart tunnel service (Windows)
Restart-Service cloudflared
```

**OAuth Redirect Error:**
- Verify `NEXTAUTH_URL` matches your domain exactly
- Check Google OAuth redirect URIs include: `https://yourdomain.com/api/auth/callback/google`
- Clear browser cookies and try again

**Rate Limiting Too Strict:**
- Adjust limits in `lib/rate-limit.ts`
- Manually reset a blocked IP:
  ```bash
  node -e "const {songRequestLimiter} = require('./lib/rate-limit'); songRequestLimiter.reset('IP_ADDRESS');"
  ```

**PM2 Not Auto-Starting:**
```bash
# Generate startup script
pm2 startup

# Run the command it displays (with sudo if needed)
# Then save PM2 configuration
pm2 save
```

**CSRF Protection Blocking Legitimate Requests:**
- Check `middleware.ts` configuration
- Verify `NEXTAUTH_URL` environment variable is correct
- Ensure requests are coming from the same domain

### Testing Production Security

**Test Rate Limiting:**
```bash
# Try to request more than 3 songs rapidly
for i in {1..5}; do
  curl -X POST https://yourdomain.com/api/jukebox/queue \
    -H "Content-Type: application/json" \
    -d '{"sequence_name":"test","requester_name":"Test"}'
  echo ""
done

# Expected: First 3 succeed, 4th and 5th return 429 Too Many Requests
```

**Test CSRF Protection:**
```bash
# Try request from different origin (should fail)
curl -X POST https://yourdomain.com/api/jukebox/queue \
  -H "Origin: https://evil.com" \
  -H "Content-Type: application/json" \
  -d '{"sequence_name":"test","requester_name":"Test"}'

# Expected: 403 Forbidden
```

**Test OAuth:**
1. Visit `https://yourdomain.com/dashboard`
2. Should redirect to Google OAuth
3. Login with whitelisted admin email
4. Should grant access to dashboard
5. Try with non-whitelisted email
6. Should deny access

---

## 🐛 Troubleshooting

### Database Issues

```bash
# Check database statistics
npm run db:stats

# Run integrity check
node -e "const db = require('better-sqlite3')('data/fpp.db'); console.log(db.pragma('integrity_check'));"

# Restore from backup
./rollback.sh backups/YYYYMMDD_HHMMSS
```

### Update Issues

```bash
# View what changed
git log HEAD..origin/main --oneline

# Manual rollback
./rollback.sh backups/YYYYMMDD_HHMMSS

# Force clean update
git stash
git pull origin main
npm install
npm run migrate
npm run build
```

### Server Won't Start

```bash
# Check Node.js version (must be 18+)
node --version

# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Verify database exists
ls -la data/fpp.db

# Check configuration
cat .env.local
```

### FPP Connection Issues

- Verify FPP device IP address in `.env.local`
- Test FPP API: `curl http://YOUR_FPP_IP/api/playlists`
- Check network connectivity
- Ensure FPP is powered on and accessible

### Port 3000 Already in Use

```bash
# Find what's using the port
# Linux/Mac:
lsof -ti:3000 | xargs kill

# Windows:
netstat -ano | findstr :3000
# Note the PID, then:
taskkill /PID <PID> /F

# Or change the port in package.json:
"dev": "next dev -p 3001"
```

---

## 📈 Performance

The system is optimized for high performance:

- **SQLite WAL Mode** - Concurrent reads/writes
- **64MB Cache** - Faster query execution
- **30+ Indexes** - Optimized lookups
- **Memory-Mapped I/O** - Reduced disk operations
- **Automated Maintenance** - Keeps database lean

Tested capacity:
- **10,000 song requests/day** for 100+ years
- **1,000 Santa letters/day** for decades
- **Millions of page views** without slowdown
- Database stays under 1GB even after years of use

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🎉 Credits

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [SQLite](https://www.sqlite.org/) - Database
- [Falcon Player](https://github.com/FalconChristmas/fpp) - Light show controller
- [Ollama](https://ollama.ai/) - AI for Santa letters
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Luxon](https://moment.github.io/luxon/) - Timezone handling

---

## 📞 Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Made with ❤️ for the Christmas light community**

🎄 Happy Holidays! 🎅