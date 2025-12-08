-- Down Migration: Drop proxy_targets table and related objects

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_proxy_targets_updated_at ON pzero.proxy_targets;

-- Drop function
DROP FUNCTION IF EXISTS pzero.update_proxy_targets_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS pzero.idx_proxy_targets_name;
DROP INDEX IF EXISTS pzero.idx_proxy_targets_url;

-- Drop table
DROP TABLE IF EXISTS pzero.proxy_targets;

