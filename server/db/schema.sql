-- server/db/schema.sql
CREATE TABLE IF NOT EXISTS members (
  wom_id INTEGER PRIMARY KEY,
  username TEXT NOT NULL,
  member_type TEXT CHECK(member_type IN ('skiller', 'fighter')) NOT NULL DEFAULT 'skiller',
  initial_xp INTEGER,
  current_xp INTEGER,
  current_ehb REAL,
  siege_score INTEGER DEFAULT 0,
  last_manual_add TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  needs_rank_update BOOLEAN DEFAULT FALSE,
  skiller_rank TEXT,
  fighter_rank TEXT
);

CREATE TABLE siege_events (
  event_id TEXT PRIMARY KEY,
  event_date DATE NOT NULL,
  processed BOOLEAN DEFAULT FALSE
);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user TEXT,
  action TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
