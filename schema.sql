-- D1 Database Schema for skywalker.fish
-- Run this in the D1 console or via: wrangler d1 execute skywalker-db --file=schema.sql

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  shared_experience TEXT NOT NULL,
  how_found TEXT NOT NULL DEFAULT '',
  who_are_you TEXT NOT NULL DEFAULT '',
  nickname TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  know_skywalker INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_nickname ON applications(nickname);
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);
