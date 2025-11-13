const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'votes.db');

console.log('🎮 Running game scores database migration...');

try {
  const db = new Database(dbPath);

  // Check if table already exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='game_scores'
  `).get();

  if (tableExists) {
    console.log('✅ game_scores table already exists');
    db.close();
    process.exit(0);
  }

  // Create game_scores table
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_name TEXT NOT NULL DEFAULT 'Anonymous',
      score INTEGER NOT NULL,
      game_type TEXT NOT NULL,
      theme TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      session_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_game_scores_leaderboard 
      ON game_scores(game_type, score DESC, created_at);

    CREATE INDEX IF NOT EXISTS idx_game_scores_ip_time
      ON game_scores(ip_address, created_at);
  `);

  // Add default game settings if they don't exist
  const settings = [
    ['game_enabled', '1'],
    ['game_initialSpeed', '0.5'],
    ['game_speedIncreasePerLevel', '0.15'],
    ['game_initialSpawnInterval', '2000'],
    ['game_spawnDecreasePerLevel', '100'],
    ['game_minSpawnInterval', '800']
  ];

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);

  settings.forEach(([key, value]) => {
    insertSetting.run(key, value);
  });

  db.close();

  console.log('✅ Game scores migration completed successfully!');
  console.log('');
  console.log('Created:');
  console.log('  - game_scores table');
  console.log('  - Indexes for leaderboard queries');
  console.log('  - Default game settings');
  console.log('');
  console.log('🎮 Game feature is now ready to use!');

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
