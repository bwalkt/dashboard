-- Down Migration: Revert port to required with default 80

-- Update any NULL ports to 80 before making it NOT NULL
UPDATE pzero.proxy_targets
SET port = 80
WHERE port IS NULL;

-- Alter port column back to NOT NULL with default 80
ALTER TABLE pzero.proxy_targets
  ALTER COLUMN port SET DEFAULT 80,
  ALTER COLUMN port SET NOT NULL;

