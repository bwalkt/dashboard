-- Initialize PostgreSQL extensions
-- This script runs automatically when the database container first starts
CREATE EXTENSION if NOT EXISTS plpython3u;

CREATE EXTENSION if NOT EXISTS pgcrypto;

CREATE EXTENSION if NOT EXISTS citext;

CREATE EXTENSION if NOT EXISTS pg_trgm;

CREATE EXTENSION if NOT EXISTS hstore;

CREATE EXTENSION if NOT EXISTS postgis;

CREATE EXTENSION if NOT EXISTS pgx_ulid;

CREATE SCHEMA if NOT EXISTS pzero;

CREATE DOMAIN pzero.uuid AS text;

-- Create alias for ULID generation to maintain consistent API
CREATE OR REPLACE FUNCTION pzero.gen_ulid () returns pzero.uuid AS $$
    SELECT gen_ulid()::pzero.UUID;
$$ language sql volatile;

CREATE OR REPLACE FUNCTION pzero.gen_monotonic_id () returns pzero.uuid AS $$
    SELECT gen_monotonic_ulid()::pzero.UUID;
$$ language sql volatile;
