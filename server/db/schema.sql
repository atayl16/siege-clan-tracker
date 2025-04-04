-- Drop existing tables if they exist
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS audit_log;

-- Create the members table with all needed columns
CREATE TABLE members (
  wom_id INTEGER PRIMARY KEY,
  username TEXT NOT NULL,
  wom_name TEXT,
  initial_xp INTEGER DEFAULT 0,
  current_xp INTEGER DEFAULT 0,
  first_xp INTEGER DEFAULT 0,
  gained_xp INTEGER DEFAULT 0,
  initial_level INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 0,
  ehb INTEGER DEFAULT 0,
  siege_score INTEGER DEFAULT 0,
  siege_winner_place INTEGER DEFAULT 0,
  deactivated BOOLEAN DEFAULT FALSE,
  deactivated_xp INTEGER DEFAULT 0,
  deactivated_level INTEGER DEFAULT 0,
  deactivated_date TIMESTAMPTZ,
  reactivated_xp INTEGER DEFAULT 0,
  reactivated_level INTEGER DEFAULT 0,
  reactivated_date TIMESTAMPTZ,
  joined_date TIMESTAMPTZ,
  build TEXT,
  title TEXT,
  womrole TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create the events table
CREATE TABLE events (
  id SERIAL PRIMARY KEY, -- Changed from INTEGER PRIMARY KEY AUTOINCREMENT
  wom_id INTEGER,
  name TEXT,
  starts TIMESTAMPTZ,
  ends TIMESTAMPTZ,
  metric TEXT,
  winner TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create the audit_log table
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY, -- Changed from INTEGER PRIMARY KEY AUTOINCREMENT
  admin_user TEXT,
  action TEXT,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
