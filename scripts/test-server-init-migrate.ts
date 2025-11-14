import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

(process.env as any).AUTO_RUN_MIGRATIONS = 'true';
(process.env as any).AUTO_RUN_MIGRATIONS_FORCE = 'true';
(process.env as any).NODE_ENV = 'development';

(async () => {
  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const dbPath = path.join(tmpDir, 'test-server-init-votes.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  const db = new Database(dbPath);
  try {
    // Create minimal settings table so the migration insert doesn't fail
    db.exec(`
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
    `);

    // Ensure process.cwd is set to the repo so server-init uses correct path
    // but runMigration will look at process.cwd() by default.

    // Set path to the temp DB so runMigrations uses it
    (process.env as any).MOCK_DB_PATH = dbPath;

    console.log('[test-server-init] Temporary DB created', dbPath);

    // Now import server-init (it will import migrations-runner if env vars true)
    // We pass through a small override: if migration runner sees process.env.MOCK_DB_PATH, it should use it.
    // To make it pick it up, runS migrations uses process.cwd by default, but we can instead call runMigrations directly.

    // Import server-init via require to avoid TS type check issues (no exports)
    require('../lib/server-init');

    console.log('[test-server-init] server-init imported');
    // Wait briefly to allow async migration to run
    await new Promise(res => setTimeout(res, 1200));

    const table = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='game_scores'`).get();
    if (table) {
      console.log('[test-server-init] ✅ game_scores table present after server-init migration');
      process.exit(0);
    } else {
      console.error('[test-server-init] ❌ game_scores table NOT present after server-init migration');
      process.exit(2);
    }
  } catch (err) {
    console.error('[test-server-init] Error during test-server-init-run:', err);
    process.exit(1);
  } finally {
    db.close();
  }
})();
