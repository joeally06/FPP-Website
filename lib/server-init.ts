/**
 * Server-side initialization
 * Starts background services when the app starts
 */

// Only run on server-side
if (typeof window === 'undefined') {
  // Initialize background services
  import('./santa-queue-processor');
  import('./device-monitor');
  import('./db-scheduler');

  // Optionally run migrations at startup if explicitly allowed.
  // This is gated behind AUTO_RUN_MIGRATIONS and AUTO_RUN_MIGRATIONS_FORCE env vars
  try {
    const autoMigrate = process.env.AUTO_RUN_MIGRATIONS === 'true' || process.env.AUTO_RUN_MIGRATIONS === '1';
    const forceMigrate = process.env.AUTO_RUN_MIGRATIONS_FORCE === 'true' || process.env.AUTO_RUN_MIGRATIONS_FORCE === '1';
    const isProd = process.env.NODE_ENV === 'production';

    if (autoMigrate && (!isProd || forceMigrate)) {
      // Dynamic import to avoid loading migration runner in unsupported environments
      import('./migrations-runner').then(({ runMigrations }) => {
        // Run migrations asynchronously, but don't block server start
        runMigrations({ backup: true }).catch(err => {
          console.error('[server-init] Migration runner failed:', err);
        });
      }).catch(err => {
        console.error('[server-init] Failed to import migration runner:', err);
      });
    }
  } catch (err) {
    console.error('[server-init] Error checking migration startup flags:', err);
  }
}
