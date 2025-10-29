-- Initialize PostgreSQL extensions
-- This script runs automatically when the database container first starts

CREATE EXTENSION IF NOT EXISTS plpython3u;
CREATE EXTENSION IF NOT EXISTS PGCRYPTO;
CREATE EXTENSION IF NOT EXISTS CITEXT;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS hstore;
CREATE EXTENSION IF NOT EXISTS POSTGIS;
CREATE EXTENSION IF NOT EXISTS pgx_ulid;


CREATE SCHEMA IF NOT EXISTS pzero;

CREATE DOMAIN PZERO.UUID AS TEXT;
-- Create alias for ULID generation to maintain consistent API
CREATE OR REPLACE FUNCTION pzero.gen_ulid() RETURNS pzero.UUID AS $$
    SELECT gen_ulid()::pzero.UUID;
$$ LANGUAGE SQL VOLATILE;

CREATE OR REPLACE FUNCTION pzero.gen_monotonic_id() RETURNS pzero.UUID AS $$
    SELECT gen_monotonic_ulid()::pzero.UUID;
$$ LANGUAGE SQL VOLATILE;