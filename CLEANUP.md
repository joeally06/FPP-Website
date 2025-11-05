# Code Cleanup Recommendations
# Generated: 2025-11-05
# Purpose: Prepare for v1.0.0 candidate release

## Files to DELETE (Test/Unused Code)

### Test Files (Safe to Delete)
- [ ] `test.js` - Quick fetch test for jukebox cache refresh
- [ ] `test-sync.ts` - Manual FPP sync test script
- [ ] `tests/security-tests.ts` - Security test documentation (keep as reference or move to docs)

**Action**: These can be deleted as they're development/testing utilities not used in production.

```bash
# Delete test files
rm test.js test-sync.ts
# Optional: Move security tests to docs
mv tests/security-tests.ts docs/SECURITY-TESTS.md
```

---

## Files to REVIEW/CONSOLIDATE

### Duplicate Update Scripts (Needs Review)
- [ ] `scripts/trigger-upgrade.sh` - OLD upgrade trigger (hardcoded paths)
- [ ] `scripts/upgrade-system.sh` - OLD upgrade system
- [x] `scripts/run-update.sh` - CURRENT update wrapper (in use)
- [x] `update.sh` - CURRENT main update script (in use)

**Issue**: `trigger-upgrade.sh` and `upgrade-system.sh` have hardcoded `/home/doc/FPP-Website` paths and use different log files (`upgrade.log`/`upgrade_status` vs `update.log`/`update_status`).

**Recommendation**: 
- **DELETE** `scripts/trigger-upgrade.sh` (old FPP-style approach, now using detached spawn)
- **DELETE** `scripts/upgrade-system.sh` (superseded by run-update.sh + update.sh)
- **KEEP** `scripts/run-update.sh` (current wrapper with status tracking)
- **KEEP** `update.sh` (current main update script)

```bash
# Remove old upgrade scripts
rm scripts/trigger-upgrade.sh scripts/upgrade-system.sh
```

---

## Files to KEEP (Production Code)

### Core Scripts (All Good)
- ✅ `scripts/backup.js` - Database backup utility
- ✅ `scripts/bump-version.js` - Version management (just added)
- ✅ `scripts/check-dependencies.js` - Dependency checker
- ✅ `scripts/configure-oauth.sh` - OAuth setup wizard
- ✅ `scripts/db-stats.js` - Database statistics
- ✅ `scripts/init-database.js` - Database initialization
- ✅ `scripts/install-git-hooks.sh` - Git hooks installer
- ✅ `scripts/install-update-watcher.sh` - Update watcher service
- ✅ `scripts/migrate-database.js` - Database migrations
- ✅ `scripts/run-update.sh` - Update wrapper (detached process)
- ✅ `scripts/setup-cloudflare-tunnel.sh` - Cloudflare setup
- ✅ `scripts/setup-wizard.js` - Interactive setup
- ✅ `scripts/update-watcher.sh` - Update monitoring service

### Root Scripts (All Good)
- ✅ `update.sh` - Main update script (works from SSH)
- ✅ `setup.sh` - Installation wizard
- ✅ `deploy-production.sh` - Production deployment
- ✅ `rollback.sh` - Rollback utility

---

## Database Files to REVIEW

### Found on Production Server
- [ ] `votes.db.corrupt-1762182709317` - Corrupted database backup
- [ ] `votes.db.dump` - Database dump file

**Action**: Check database integrity, then delete these if not needed.

```bash
# On production server, check database integrity
sqlite3 votes.db "PRAGMA integrity_check;"

# If OK, delete old corrupt/dump files
rm votes.db.corrupt-* votes.db.dump
```

---

## Git Stash Cleanup

### Current Stashes
- 17 stashes accumulated (all file permission changes, not code changes)

**Action**: Clear all stashes (they're just permission flags from LF/CRLF and +x changes).

```bash
# On production server
git restore scripts/*.sh update.sh
git stash clear
git config core.filemode false
```

---

## Additional Recommendations

### Add .gitignore Entries
```gitignore
# Test files
test.js
test-sync.ts
tests/security-tests.ts

# Database files
*.db-shm
*.db-wal
votes.db.corrupt-*
votes.db.dump
*.db.backup

# Logs
logs/*.log
logs/*.pid
logs/*_status

# Backups
backups/*

# OS files
.DS_Store
Thumbs.db
```

### Create .gitattributes
```gitattributes
# Force LF line endings for shell scripts
*.sh text eol=lf
*.bash text eol=lf

# Binary files
*.db binary
*.sqlite binary
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.ico binary
*.pdf binary
```

---

## Summary

### Safe to Delete Immediately
1. `test.js` - Quick test script
2. `test-sync.ts` - Manual sync test
3. `scripts/trigger-upgrade.sh` - Old upgrade trigger
4. `scripts/upgrade-system.sh` - Old upgrade system

### Review on Production Server
1. Check `votes.db` integrity
2. Delete `votes.db.corrupt-*` and `votes.db.dump` if integrity is OK
3. Clear git stashes
4. Set `core.filemode false`

### Total Files to Remove: 4 scripts + 2 database files = ~6 files
### Disk Space Saved: ~50-100 KB (minimal, mostly cleanup)
### Code Clarity: Significant improvement (removes confusion about which update system to use)

---

## Implementation Checklist

- [ ] Step 1: Delete test files
- [ ] Step 2: Delete old upgrade scripts
- [ ] Step 3: Update .gitignore
- [ ] Step 4: Create .gitattributes
- [ ] Step 5: Clean production database files
- [ ] Step 6: Clear git stashes on production
- [ ] Step 7: Commit cleanup changes
- [ ] Step 8: Tag as v1.0.0-rc.1
