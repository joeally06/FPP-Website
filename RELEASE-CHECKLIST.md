# Release Checklist

This checklist ensures all steps are completed before tagging and releasing a new version.

---

## Pre-Release Checks

### 1. Code Quality
- [ ] No TypeScript errors: `npm run build`
- [ ] No ESLint errors: `npx eslint .`
- [ ] All tests pass (if applicable)
- [ ] No console errors/warnings in browser
- [ ] Code reviewed and cleaned up

### 2. Version Management
- [ ] `lib/version.ts` updated with correct version
- [ ] `package.json` version matches `lib/version.ts`
- [ ] `CHANGELOG.md` updated with all changes
- [ ] Version type determined (major, minor, patch, prerelease)

### 3. Documentation
- [ ] README.md up to date
- [ ] INSTALLATION.md reflects current setup process
- [ ] All new features documented
- [ ] Breaking changes clearly noted
- [ ] Migration guide provided (if needed)

### 4. Dependencies
- [ ] `package.json` dependencies reviewed
- [ ] Security vulnerabilities checked: `npm audit`
- [ ] Unused dependencies removed
- [ ] License compliance verified

### 5. Configuration Files
- [ ] `.env.example` includes all required variables
- [ ] `.gitignore` properly excludes sensitive files
- [ ] `.gitattributes` configured for line endings
- [ ] `next.config.ts` production-ready

---

## Functional Testing

### 6. Core Features
- [ ] **Authentication**: Google OAuth login/logout works
- [ ] **Jukebox**: Browse sequences, vote, play queue
- [ ] **Admin Panel**: All CRUD operations functional
- [ ] **Device Status**: FPP connection and monitoring
- [ ] **Santa Letters**: Generation, moderation, rate limiting
- [ ] **Analytics**: Visitor tracking and stats
- [ ] **Theme Settings**: Light/dark mode toggle
- [ ] **Settings**: All configuration options work

### 7. API Endpoints
- [ ] `/api/auth/*` - Authentication
- [ ] `/api/jukebox/*` - Jukebox operations
- [ ] `/api/sequences/*` - Sequence management
- [ ] `/api/playlists/*` - Playlist management
- [ ] `/api/models/*` - Model management
- [ ] `/api/santa/*` - Santa letter generation
- [ ] `/api/analytics/*` - Analytics tracking
- [ ] `/api/system/*` - System operations
- [ ] `/api/version` - Version information

### 8. User Experience
- [ ] Mobile responsive design works
- [ ] Dark mode functions properly
- [ ] Loading states display correctly
- [ ] Error messages are user-friendly
- [ ] Success notifications appear
- [ ] Cookie consent banner displays
- [ ] Footer shows correct version

### 9. Performance
- [ ] Page load times acceptable (<3s)
- [ ] Database queries optimized
- [ ] No memory leaks
- [ ] Large lists paginated
- [ ] Images optimized
- [ ] Caching implemented where appropriate

### 10. Security
- [ ] Admin routes protected
- [ ] Input validation on all forms
- [ ] SQL injection protection verified
- [ ] XSS protection in place
- [ ] CSRF tokens implemented
- [ ] Rate limiting active
- [ ] Sensitive data not exposed in logs
- [ ] Environment variables secured

---

## Database

### 11. Database Management
- [ ] Schema migrations tested
- [ ] Backup system functional: `node scripts/backup.js`
- [ ] Rollback tested
- [ ] Database integrity checked: `sqlite3 votes.db "PRAGMA integrity_check;"`
- [ ] WAL mode enabled and working
- [ ] Indexes created for performance

---

## Deployment Testing

### 12. Local Testing
- [ ] Fresh install works: `./setup.sh` or `setup.ps1`
- [ ] Update process works: Web UI update
- [ ] PM2 process management stable
- [ ] Logs accessible and informative

### 13. Production Testing (Staging First)
- [ ] Deploy to staging server
- [ ] SSL/HTTPS certificate valid
- [ ] Domain/subdomain resolves correctly
- [ ] OAuth redirect URIs configured
- [ ] SMTP email sending works
- [ ] Cloudflare Tunnel (if used) functional
- [ ] System monitoring active
- [ ] Backup automation running

### 14. Cross-Platform Testing
- [ ] Linux (Ubuntu/Debian) tested
- [ ] Linux (RHEL/CentOS) tested
- [ ] macOS tested (if applicable)
- [ ] Windows tested (if applicable)

---

## Version Bump Process

### 15. Bump Version
Choose the appropriate version bump:

```bash
# For breaking changes (1.0.0 -> 2.0.0)
npm run version:major

# For new features (1.0.0 -> 1.1.0)
npm run version:minor

# For bug fixes (1.0.0 -> 1.0.1)
npm run version:patch

# For pre-release (1.0.0-rc.1 -> 1.0.0-rc.2)
npm run version:prerelease

# To move to stable (1.0.0-rc.1 -> 1.0.0)
npm run version:release
```

### 16. Update Changelog
- [ ] Run: `npm run version:bump -- <type>`
- [ ] Manually review and edit `CHANGELOG.md`
- [ ] Add release date
- [ ] Organize changes by category:
  - Added (new features)
  - Changed (changes in existing functionality)
  - Deprecated (soon-to-be removed features)
  - Removed (removed features)
  - Fixed (bug fixes)
  - Security (vulnerability fixes)

---

## Git Operations

### 17. Commit Changes
```bash
# Stage all changes
git add -A

# Commit with conventional commit message
git commit -m "chore: prepare v1.0.0 release

- Update version to 1.0.0
- Update CHANGELOG.md with release notes
- Final testing complete
- All checks passed"
```

### 18. Tag Release
```bash
# Create annotated tag
git tag -a v1.0.0 -m "Release v1.0.0

Major Features:
- Complete jukebox system with voting
- Admin panel with full CRUD operations
- Santa letter generation with Ollama AI
- Real-time device monitoring
- Cookie consent and privacy policy
- Cloudflare Tunnel support

See CHANGELOG.md for complete list."

# Verify tag
git tag -l -n9 v1.0.0
```

### 19. Push to GitHub
```bash
# Push commits
git push origin master

# Push tags
git push origin --tags

# Or push both together
git push origin master --tags
```

---

## GitHub Release

### 20. Create GitHub Release
1. Go to: https://github.com/joeally06/FPP-Website/releases/new
2. Select tag: `v1.0.0`
3. Release title: `v1.0.0 - Production Release`
4. Description: Copy from `CHANGELOG.md` (add emojis for visual appeal)
5. Pre-release checkbox: Only for RC/beta/alpha versions
6. Set as latest release: Yes (for stable versions)
7. Attach binaries (if any): N/A
8. Click "Publish release"

Example release description:
```markdown
# 🎉 FPP Control Center v1.0.0

First production release of the FPP Control Center!

## ✨ Major Features

- 🎵 **Jukebox System**: Browse, vote, and request sequences
- 👤 **Admin Panel**: Complete management interface
- 🎅 **Santa Letters**: AI-generated personalized letters
- 📊 **Analytics**: Visitor tracking and statistics
- 🔐 **Security**: OAuth authentication, rate limiting, input validation
- 🌙 **Themes**: Light/dark mode support
- 🔔 **Real-time Updates**: Live status monitoring
- 🍪 **Privacy**: GDPR/CCPA compliant cookie consent

## 📝 Full Changelog

See [CHANGELOG.md](CHANGELOG.md) for complete details.

## 🚀 Installation

Quick start: `./setup.sh` (Linux/Mac) or `setup.ps1` (Windows)

Full guide: [INSTALLATION.md](INSTALLATION.md)

## 📖 Documentation

- [README.md](README.md) - Project overview
- [SECURITY-IMPLEMENTATION.md](SECURITY-IMPLEMENTATION.md) - Security details
- [CLOUDFLARE-TUNNEL.md](docs/CLOUDFLARE-TUNNEL.md) - Public access setup

## 💪 Upgrade from RC

If upgrading from v1.0.0-rc.x:
```bash
git pull origin master
npm install
npm run build
pm2 restart fpp-control
```

No database migrations required.
```

---

## Post-Release

### 21. Verification
- [ ] GitHub release visible and correct
- [ ] Tag shows up in releases page
- [ ] Download links work (if any)
- [ ] README badges updated (if any)

### 22. Announcements
- [ ] Update project README with latest version
- [ ] Post announcement (Discord, Reddit, forums, etc.)
- [ ] Update documentation sites
- [ ] Notify contributors

### 23. Monitoring
- [ ] Monitor error logs for 24-48 hours
- [ ] Check GitHub Issues for bug reports
- [ ] Review analytics for unusual patterns
- [ ] Verify update mechanism works for users

### 24. Backup
- [ ] Create full backup of production database
- [ ] Archive release artifacts
- [ ] Document any production-specific configuration

---

## Emergency Rollback

If critical issues are discovered:

```bash
# On production server
cd /path/to/FPP-Website
./rollback.sh

# Or manual rollback
git checkout v0.9.0  # Previous stable version
npm install
npm run build
pm2 restart fpp-control
```

Then:
1. Create hotfix branch: `git checkout -b hotfix/v1.0.1`
2. Fix the issue
3. Test thoroughly
4. Follow release process again for v1.0.1

---

## Version History

| Version | Date | Type | Notes |
|---------|------|------|-------|
| 1.0.0-rc.1 | 2025-11-05 | Pre-release | First release candidate |
| 1.0.0 | TBD | Stable | Production release |

---

## Quick Reference

### Semantic Versioning

Given a version number MAJOR.MINOR.PATCH:
- **MAJOR**: Breaking changes (1.0.0 -> 2.0.0)
- **MINOR**: New features, backwards compatible (1.0.0 -> 1.1.0)
- **PATCH**: Bug fixes, backwards compatible (1.0.0 -> 1.0.1)
- **PRERELEASE**: Alpha, beta, rc (1.0.0-rc.1)

### Common Commands

```bash
# Check version
npm run version:current

# Bump version
npm run version:major|minor|patch|prerelease|release

# Build and test
npm run build
npm run lint

# Backup database
node scripts/backup.js

# Database stats
node scripts/db-stats.js

# Check for errors
npx tsc --noEmit
```

---

## Support

If you encounter issues during the release process:
1. Check logs: `pm2 logs fpp-control`
2. Review errors: `npm run build`
3. Database check: `node scripts/check-db.js`
4. Create issue: https://github.com/joeally06/FPP-Website/issues

---

**Last Updated**: 2025-11-05  
**Next Review**: Before next release
