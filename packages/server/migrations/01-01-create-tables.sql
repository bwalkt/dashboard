-- Up Migration
CREATE SCHEMA IF NOT EXISTS pzero;
CREATE TABLE pzero.users (
  id SERIAL PRIMARY KEY,
  github_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_github_id ON pzero.users(github_id);

CREATE TABLE pzero.sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES pzero.users(id),
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

-- Down Migration
DROP TABLE IF EXISTS pzero.sessions;
DROP TABLE IF EXISTS pzero.users;
