-- Up Migration: Create proxy_targets table
-- This table stores proxy target configurations for the proxy service

CREATE TABLE IF NOT EXISTS pzero.proxy_targets (
  id UUID PRIMARY KEY DEFAULT pzero.gen_id(),
  name VARCHAR(100) NOT NULL,
  url VARCHAR(255) NOT NULL UNIQUE,
  port INTEGER NOT NULL DEFAULT 80 CHECK (port > 0 AND port <= 65535),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on url for faster lookups (already unique, but index helps with queries)
CREATE INDEX IF NOT EXISTS idx_proxy_targets_url ON pzero.proxy_targets(url);

-- Create index on name for searching
CREATE INDEX IF NOT EXISTS idx_proxy_targets_name ON pzero.proxy_targets(name);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION pzero.update_proxy_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row updates
CREATE TRIGGER trigger_proxy_targets_updated_at
  BEFORE UPDATE ON pzero.proxy_targets
  FOR EACH ROW
  EXECUTE FUNCTION pzero.update_proxy_targets_updated_at();


INSERT INTO pzero.proxy_targets (name, url, port) VALUES ('Salesforce Server', 'pzero-sfdc-server', 3000);