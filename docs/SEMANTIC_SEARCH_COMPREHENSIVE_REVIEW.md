# Semantic Search / Codebase Comprehensive Review

This document summarizes findings from a thorough review of the repository's codebase (FPP-Control-Center) focused on high-priority areas surfaced during the `semantic_search` audit. It contains architecture notes, strengths, findings (with severity), reproductions, and recommended fixes (with code snippets and commands).

---

## Table of Contents

1. Summary
2. Project overview and key modules
3. Strengths
4. Key findings & remediation plans (by severity)
5. Game-specific issues
6. Database migration & deployment checklist
7. Monitoring, testing and CI/CD recommendations
8. Immediate action plan
9. Appendix: Example code & commands

---

## 1. Summary

- This document records the primary findings identified in the semantic search and manual review. The repo is a Next.js app with SQLite, admin UIs, many API routes and a new game feature with leaderboard and admin controls.
- The major issues to address are: missing migrations in production, time/rate-limit race conditions, SMTP reliability, lack of automated testing and CI, and ensuring proper handling for the new game features (collision detection, lives, replay).

---

## 2. Project overview and key modules

- Framework: Next.js 16, App Router, TypeScript.
- DB: SQLite (`votes.db`, better-sqlite3). Core tables: `settings`, `votes`, `game_scores` (new), etc.
- Key folders: `app/api/*` (server APIs), `components/*` (UI components, `ChristmasGame.tsx`), `lib/*` (helpers and DB), `scripts/*` (migrations and setup).
- Deployment: PM2 in production, setup scripts and Cloudflare tunnel available.

---

## 3. Strengths

- Strong admin UI and modular components; good separation of concerns.
- Security measures: rate limiting, input validation, anti-cheat checks, XSS sanitization, parameterized queries.
- Performance optimizations applied: WAL mode, indexes, scheduled DB maintenance.
- Thorough documentation (README/INSTALLATION), migration and setup scripts exist.

---

## 4. Key findings & remediation plans (by severity)

### High Severity

1. Missing DB migrations in production
- Issue: The `game_scores` migration script was not present on production, so the new game feature doesn't appear. Error: `Cannot find module 'scripts/migrate-game-scores.js'`.
- Fix: Add `scripts/migrate-game-scores.js` to repository and run on production. Ensure migrations are idempotent and run at startup as part of the deploy process.
- Commands:
  ```bash
  git pull origin master
  node scripts/migrate-game-scores.js
  pm2 restart fpp-control
  ```

2. Rate-limit / Date boundary race conditions
- Issue: UI re-computes `requestsRemaining` using local data and stale timestamps; backend uses different comparisons, causing inconsistency.
- Fix: Always use the API's server-provided `requestsRemaining` as the source of truth in the UI and avoid local recomputation. Standardize date/time to UTC and use consistent SQL queries with correct boundaries.
- Example change (frontend):
  ```typescript
  // in request-status handler
  setRequestsRemaining(response.requestsRemaining);
  // avoid local derived values
  ```
- Example SQL (explict inclusive range):
  ```sql
  SELECT COUNT(*) FROM requests WHERE created_at >= datetime('now', '-1 hour');
  ```

3. SMTP reliability (Queue errors & ETIMEDOUT)
- Issue: SMTP connection timeouts cause queue processing failure and letter queue process errors.
- Fix: Add exponential retry with configurable attempts, set appropriate timeouts, and optionally move to an email provider (SendGrid/SES) for production. Log retries for monitoring.
- Example snippet:
  ```typescript
  async function sendEmailWithRetries(msg, attempts = 3) {
    for (let i = 0; i < attempts; i++) {
      try { return await transporter.sendMail(msg); }
      catch (err) {
         if (i === attempts - 1) throw err;
         await delay(500 * 2 ** i);
      }
    }
  }
  ```

4. Security hardening final checks
- Issue: Security changes are good but need verification (NextAuth settings, strict cookies, CSP/headers, and rate limiting in CI). Check for any missing admin-only checks.
- Fix: Add hardening to production: enable secure cookies (HTTPS), HSTS, CSP security headers, and confirm NextAuth secrets and Allowed Origins are minimal and logged.


### Medium Severity

1. Datetime parsing & formatting inconsistency
- Issue: SQLite datetimes can be `YYYY-MM-DD HH:MM:SS` and not ISO. Parsing in the code must accept both formats consistently.
- Fix: Use consistent ISO-8601 handling (store as `YYYY-MM-DDTHH:MM:SSZ`) or support both in `lib/time-utils.ts`.
- Example:
  ```typescript
  if (!s.includes('T')) s = s.replace(' ', 'T') + 'Z';
  return DateTime.fromISO(s);
  ```

2. Preconditions for rate-limit actions
- Issue: The API may create a race between insert and count.
- Fix: Use transactions for the insert+count sequence to guarantee correct results.

3. Logging & monitoring improvements
- Issue: Queue and device monitor fail without alerting.
- Fix: Add Sentry, or long-term metrics/alerts for queue failure, SMTP, and DB errors.

4. Tests lacking for key areas
- Issue: No unit / integration tests for API endpoints and the game.
- Fix: Add Jest/unit tests and supertest API tests. Add e2e for the game (play testing) if feasible.

### Low Severity

1. Accessibility & UX improvements for the game
- Add ARIA labels, keyboard-only controls, and visually-impaired-friendly contrasts.

2. Styling/formatting & minor refactorings
- Improve component code structure and reduce duplication where possible.

---

## 5. Game-specific issues and fixes

Observed: Lives counter decrementing more than once per miss or collision; Play Again not fully resetting game state.

Fixes implemented:
- `processedOrnaments.current = new Set()` was introduced to prevent double-processing.
- Consolidated collision detection & missed detection into a single `useEffect` game loop that updates ornaments, checks collisions, marks processed, updates score/lives, and removes processed ornaments in the same state update.
- `startGame()` now clears `processedOrnaments.current`, resets `nextOrnamentId.current`, resets lives/score/difficulty and re-enables `gameActive`.

Recommended additional tests:
- Confirm lives decremented exactly once per missed good ornament.
- Confirm collision only handled once per ornament.
- Verify `startGame()` fully resets state for repeated plays.

---

## 6. Database migration & deployment checklist (for releases)

- Always commit migrations to `scripts/` and add the migration file to the repo and CI.
- Add a `scripts/migrate-game-scores.js` check at app startup to run idempotent migrations (recommended):
  ```bash
  node scripts/migrate-game-scores.js
  ```
- Verify that `game_scores` is present after migration:
  ```bash
  sqlite3 votes.db "SELECT name FROM sqlite_master WHERE type='table' AND name='game_scores';"
  ```
- After migration: `pm2 restart fpp-control` and verify the `/jukebox` banner has the "Play Game 🎮" button.

---

## 7. Monitoring, testing, CI/CD recommendations

- Add GitHub Actions to run: lint -> build -> tests -> (optional) migration dry-run -> publish.
- Unit tests: Add `jest` & `testing-library/react`, run core API tests and core logic tests for `ChristmasGame.tsx`.
- Add Sentry (or equivalent) and configure alerts for queue failure and mailer errors.
- Add DB checks to the deployment pipeline; if migration fails, fail deployment (or flag manual review).

---

## 8. Immediate Action Plan (Priority)

1. Run migration in production and restart service. Verify: `node scripts/migrate-game-scores.js` -> `pm2 restart fpp-control`.
2. Confirm and verify the game appears on the jukebox banner and playable.
3. Confirm lives counter fix by playing multiple spawned ornaments and verifying lives are decremented once per miss.
4. Add `sendEmailWithRetries` logic for the mailer queue, add retry/timeout settings.
5. Add basic unit and API tests for rate-limiting and leaderboard endpoints.
6. Harden production settings: secure cookies, CSP, HSTS, and verify `NEXTAUTH_SECRET` usage.

---

## 9. Appendix: Example commands & snippets

### Production: Run migrations & restart
```bash
ssh doc@your-server
cd ~/FPP-Control-Center
git pull origin master
node scripts/migrate-game-scores.js
pm2 restart fpp-control
pm2 logs fpp-control --lines 200
```

### Build & test locally
```bash
npm install
npm run build
npm run test
```

### Add the migration script to repo (already added)
```bash
git add scripts/migrate-game-scores.js
git commit -m "Add database migration for game scores"
git push origin master
```

---

If you’d like, I can open PRs implementing the important fixes above (migration auto-start, SMTP retries, parse helper, monitoring integration, and basic unit tests). Which one should I prioritize next?  

---

End of Document
