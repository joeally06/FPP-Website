-- Game Scores Table
-- Stores high scores for theme-based mini-games

CREATE TABLE IF NOT EXISTS game_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  game_type TEXT NOT NULL DEFAULT 'christmas_ornaments',
  theme TEXT NOT NULL DEFAULT 'christmas',
  created_at TEXT NOT NULL,
  ip_address TEXT,
  session_id TEXT
);

-- Index for leaderboard queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_game_scores_leaderboard 
  ON game_scores(game_type, score DESC, created_at DESC);

-- Index for player's personal best queries
CREATE INDEX IF NOT EXISTS idx_game_scores_player 
  ON game_scores(session_id, game_type, score DESC);

-- Index for daily/weekly leaderboards
CREATE INDEX IF NOT EXISTS idx_game_scores_date 
  ON game_scores(created_at DESC);
