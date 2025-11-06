# 🎄 FPP Control Center

**A modern web interface for controlling Falcon Player (FPP) Christmas light shows with interactive visitor features.**

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 🌟 What is FPP Control Center?

FPP Control Center is a **complete web-based control panel** for your Falcon Player (FPP) Christmas light display. It provides an interactive visitor experience while giving you full control over your show.

**Perfect for:**
- 🎅 **Residential Christmas Displays** - Let visitors request songs and write to Santa
- 🏢 **Commercial Light Shows** - Professional control with visitor engagement
- 🎪 **Community Events** - Public displays with interactive features
- 🏠 **Home Networks** - Simple local-only setup for family use

---

## ✨ Features

### 🎵 **Interactive Jukebox**
- **Song Requests** - Visitors can request their favorite sequences
- **Live Queue Display** - See what's playing now and what's coming up
- **Vote on Sequences** - Community voting for popular songs
- **Automatic Queue Management** - First-come, first-served with fair play
- **Rate Limiting** - Prevents spam (3 requests per hour per visitor)

### 🎅 **Santa Letter Generator**
- **AI-Powered Responses** - Personalized letters using Ollama AI
- **Email Delivery** - Automatic email to parents with Santa's reply
- **Admin Review** - Approve/reject letters before sending
- **Queue Processing** - Handles multiple submissions gracefully
- **Rate Limiting** - 2 letters per day per visitor

### 📊 **Real-Time Monitoring**
- **Device Status** - Live FPP connection status
- **Playlist Monitoring** - See current playlist and schedule
- **Email Alerts** - Get notified when FPP goes offline
- **Scheduled Monitoring** - Only check during show hours
- **Performance Metrics** - Track uptime and reliability

### 🎛️ **Admin Dashboard**
- **Analytics** - Visitor engagement, popular sequences, request patterns
- **Queue Management** - View, reorder, or clear song requests
- **Database Tools** - Backup, maintenance, and statistics
- **Theme Customization** - Match your display's branding
- **Security Settings** - Configure rate limits and access control

### 🔒 **Enterprise Security**
- **Google OAuth** - Secure admin authentication
- **Email Whitelist** - Restrict admin access to approved accounts
- **CSRF Protection** - Prevent cross-site request forgery
- **Rate Limiting** - Database-backed anti-spam system
- **Session Management** - Automatic timeout and refresh
- **HTTPS Ready** - Works with Cloudflare Tunnel for public deployment

---

## 🚀 Quick Start

### **Option 1: Automated Setup (Recommended)**

The fastest way to get started:

```bash
git clone https://github.com/joeally06/FPP-Control-Center.git
cd FPP-Control-Center
chmod +x setup.sh
./setup.sh
```

The interactive wizard walks you through everything in **10-15 minutes**.

### **Option 2: Manual Setup**

See the complete [INSTALLATION.md](INSTALLATION.md) guide for step-by-step instructions.

---

## 📋 System Requirements

### **Required:**
- **Linux or macOS** - Raspberry Pi, Ubuntu, Debian, or Mac
- **Node.js 20+** - Download from [nodejs.org](https://nodejs.org/)
- **npm 10+** - Included with Node.js
- **Git** - Version control system

> **✨ New!** The setup wizard can automatically install Node.js and Git if missing

### **Optional:**
- **PM2** - Process manager for production (Linux/Mac)
- **Ollama** - AI for Santa letters ([ollama.ai](https://ollama.ai/))
- **SMTP Email** - For Santa letter delivery and alerts
- **Domain Name** - For public internet access via Cloudflare Tunnel

---

## 🌐 Deployment Options

### **Local Network Only**
- Simple setup, no domain required
- Access from home network: `http://YOUR_IP:3000`
- Perfect for residential displays
- **Setup time:** 10 minutes

### **Public Internet**
- Access from anywhere: `https://yourdomain.com`
- Free HTTPS via Cloudflare Tunnel
- No port forwarding required
- **Setup time:** 20 minutes (includes tunnel setup)

---

## 📚 Documentation

- **📋 [INSTALLATION.md](INSTALLATION.md)** - Complete setup guide with every detail
- **🌐 [CLOUDFLARE-TUNNEL.md](docs/CLOUDFLARE-TUNNEL.md)** - Public deployment guide
- **🔒 [SECURITY-IMPLEMENTATION.md](SECURITY-IMPLEMENTATION.md)** - Security features
- **🐛 [Troubleshooting](INSTALLATION.md#-troubleshooting)** - Common issues and solutions

---

## 🎯 How It Works

### **For Visitors:**
1. Visit your website (local or public)
2. Browse available sequences
3. Request their favorite song
4. Write a letter to Santa (optional)
5. Vote on sequences they love

### **For Admins:**
1. Log in with Google OAuth
2. Monitor FPP device status
3. Review and manage song requests
4. Approve Santa letters
5. View analytics and engagement

### **Backend:**
- **SQLite Database** - Fast, reliable, maintenance-free
- **Rate Limiting** - Prevents spam and abuse
- **Queue Processing** - Automated letter generation and email
- **Scheduled Tasks** - Database maintenance, monitoring
- **Security Middleware** - CSRF, session management, input validation

---

## 🔧 Technology Stack

**Frontend:**
- Next.js 16 (React framework)
- Tailwind CSS (styling)
- Responsive design (mobile-friendly)

**Backend:**
- Next.js API routes
- SQLite (better-sqlite3)
- NextAuth (Google OAuth)
- Nodemailer (email)

**Optional Integrations:**
- Ollama (AI Santa letters)
- Cloudflare Tunnel (public HTTPS)
- PM2 (process management)

---

## 🆘 Support

### **Getting Help:**
- 📖 Check [INSTALLATION.md](INSTALLATION.md) for setup issues
- 🐛 [GitHub Issues](https://github.com/joeally06/FPP-Control-Center/issues) for bugs
- 💬 [Discussions](https://github.com/joeally06/FPP-Control-Center/discussions) for questions

### **Common Issues:**
- **Setup wizard won't run** → See [Troubleshooting](INSTALLATION.md#-troubleshooting)
- **OAuth not working** → Check redirect URIs in Google Console
- **FPP connection failed** → Verify FPP IP address and network
- **Email not sending** → Verify SMTP credentials and ports

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## 🎉 Credits

**Built with love for the Christmas light community**

**Technologies:**
- [Next.js](https://nextjs.org/) - React framework
- [Falcon Player](https://github.com/FalconChristmas/fpp) - Light show controller
- [Ollama](https://ollama.ai/) - AI for Santa letters
- [Cloudflare](https://www.cloudflare.com/) - Public access and security
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [SQLite](https://www.sqlite.org/) - Database

**Special Thanks:**
- Falcon Christmas community
- All contributors and testers

---

## 🎄 Happy Holidays!

**Made with ❤️ by Joe Ally**

Star ⭐ this repo if you found it helpful!

**Questions?** Open an [issue](https://github.com/joeally06/FPP-Control-Center/issues) or [discussion](https://github.com/joeally06/FPP-Control-Center/discussions).
