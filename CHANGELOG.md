# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned Features
- Spotify integration for enhanced song metadata
- Advanced theme builder with custom gradients
- Multi-admin user management
- Automated backup/restore system
- Enhanced analytics dashboard with charts
- Mobile app companion
- Playlist scheduling system
- Weather-based show automation

---

## [1.0.0-rc.1] - 2025-11-05

### Initial Release Candidate

#### Added
- **Jukebox System**
  - Song request interface with search/filtering
  - Real-time queue management
  - Vote tracking for popular songs
  - Rate limiting to prevent spam
  - FPP integration with automatic playback

- **Admin Dashboard**
  - Real-time status monitoring
  - Live update system with progress tracking
  - Device health monitoring
  - Analytics overview
  - System configuration panel

- **Device Monitoring**
  - Automated health checks (configurable schedule)
  - Email alerts for offline devices
  - Device management (add/edit/delete)
  - Network device types (FPP, Falcon, projectors, switches, etc.)
  - Status dashboard with visual indicators

- **Santa Letter System**
  - Public form for children to write letters
  - AI-powered responses using Ollama
  - Email delivery of responses
  - Admin panel to view/manage letters
  - Rate limiting per IP address
  - Queue-based processing

- **Authentication & Security**
  - Google OAuth integration for admin login
  - Session-based authentication with NextAuth
  - Admin-only routes protection
  - CSRF protection
  - Rate limiting on all public endpoints
  - SQL injection prevention (parameterized queries)
  - XSS protection (React + sanitization)
  - Content Security Policy headers

- **Privacy & Compliance**
  - Cookie consent banner (GDPR/CCPA compliant)
  - Comprehensive privacy policy page
  - Granular cookie preferences (necessary, analytics, functional)
  - Privacy-respecting analytics tracking
  - User data rights documentation

- **Database Management**
  - Automated maintenance scheduler (daily quick, weekly full)
  - WAL mode for better concurrency
  - Automatic VACUUM and ANALYZE
  - Database optimization with indexes
  - 64MB cache size for performance
  - Manual maintenance triggers via admin panel

- **Models Library**
  - Import xLights models from FPP
  - View model details (channels, nodes, controllers)
  - Collapsible card interface
  - Export models as CSV/JSON
  - Edit model metadata
  - Delete unused models

- **Theme System**
  - Customizable color themes
  - Preset themes (default, neon, forest, ocean, sunset, midnight)
  - Live theme preview
  - Per-user theme persistence
  - Smooth transitions between themes

- **System Updates**
  - Web-based update interface
  - Real-time update progress tracking
  - Detached update process (survives server restart)
  - Live log streaming
  - Automatic rollback on failure
  - Backup before updates

- **FPP Integration**
  - Proxy API for all FPP endpoints
  - Sequence playback control
  - Playlist management
  - Status monitoring
  - Health checks

- **Cloudflare Tunnel Support**
  - Headless server setup script
  - Public HTTPS access without port forwarding
  - Cross-device authentication flow
  - Comprehensive documentation

- **Developer Experience**
  - TypeScript throughout
  - ESLint configuration
  - Semantic versioning system
  - Version bump automation
  - Git hooks for pre-commit checks
  - Automated scripts for setup/deployment

#### Security
- Admin authentication required for all management endpoints
- Rate limiting: 10 requests per 15 minutes on sensitive endpoints
- Session timeout after 30 days of inactivity
- Secure cookie handling
- Environment variable protection
- Input sanitization on all user inputs
- Email validation with comprehensive regex
- IP-based rate limiting for jukebox and Santa letters

#### Performance
- Database indexing on frequently queried columns
- SQLite performance optimizations (WAL, memory-mapped I/O)
- Edge-optimized with Next.js 16
- Server-side rendering for fast initial loads
- Client-side caching where appropriate
- Efficient query patterns

#### Documentation
- Complete installation guide (INSTALLATION.md)
- Quick start guide
- Security implementation details (SECURITY-IMPLEMENTATION.md)
- Cloudflare Tunnel guide (CLOUDFLARE-TUNNEL.md)
- Santa letter system documentation
- Device monitoring guide
- API endpoint documentation
- Troubleshooting guides

---

## Version Format

**Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]`

- **MAJOR**: Breaking changes that require manual intervention (incompatible API changes)
- **MINOR**: New features added in a backward-compatible manner
- **PATCH**: Backward-compatible bug fixes
- **PRERELEASE**: Pre-release versions (alpha, beta, rc.1, rc.2, etc.)
- **BUILD**: Build metadata (git commit hash)

### Examples
- `1.0.0` - First stable release
- `1.0.0-rc.1` - Release candidate 1
- `1.1.0` - New features added
- `1.1.1` - Bug fixes
- `2.0.0` - Breaking changes
- `1.0.0-rc.1+a3f2b1c` - RC with build hash

---

## Release Process

1. Update VERSION_HISTORY in `lib/version.ts`
2. Update this CHANGELOG.md
3. Run `npm run version:bump [type]`
4. Commit changes: `git commit -m "chore: bump version to X.X.X"`
5. Create tag: `git tag vX.X.X`
6. Push: `git push origin master --tags`
7. Create GitHub release with changelog

---

[Unreleased]: https://github.com/joeally06/FPP-Website/compare/v1.0.0-rc.1...HEAD
[1.0.0-rc.1]: https://github.com/joeally06/FPP-Website/releases/tag/v1.0.0-rc.1
