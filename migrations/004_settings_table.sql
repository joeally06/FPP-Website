-- Settings table for application configuration
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default settings for Santa Letters
INSERT OR IGNORE INTO settings (key, value, description, category) VALUES
  ('santa_letters_enabled', 'true', 'Enable Santa letter submissions', 'santa'),
  ('santa_daily_limit', '1', 'Maximum letters per IP address per day', 'santa'),
  ('ollama_model', 'llama3.2:latest', 'AI model for Santa letter replies', 'santa');

-- Default settings for Device Monitoring
INSERT OR IGNORE INTO settings (key, value, description, category) VALUES
  ('monitoring_enabled', 'true', 'Enable device monitoring', 'monitoring'),
  ('monitoring_start_hour', '17', 'Show start hour (0-23) - 5:30 PM', 'monitoring'),
  ('monitoring_start_minute', '30', 'Show start minute (0-59)', 'monitoring'),
  ('monitoring_end_hour', '22', 'Show end hour (0-23) - 10:00 PM', 'monitoring'),
  ('monitoring_end_minute', '0', 'Show end minute (0-59)', 'monitoring'),
  ('monitoring_interval_minutes', '5', 'Check interval in minutes', 'monitoring');

-- Default settings for General
INSERT OR IGNORE INTO settings (key, value, description, category) VALUES
  ('site_name', 'FPP Control Center', 'Site display name', 'general'),
  ('timezone', 'America/Chicago', 'Server timezone', 'general');

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);
