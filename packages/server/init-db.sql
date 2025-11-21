-- Initialize PostgreSQL extensions
-- This script runs automatically when the database container first starts
CREATE EXTENSION if NOT EXISTS plpython3u;

CREATE EXTENSION if NOT EXISTS pgcrypto;

CREATE EXTENSION if NOT EXISTS citext;

CREATE EXTENSION if NOT EXISTS pg_trgm;

CREATE EXTENSION if NOT EXISTS hstore;

CREATE EXTENSION if NOT EXISTS postgis;

-- Create alias for ULID generation to maintain consis
