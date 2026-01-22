-- Up Migration: Make port optional with default 80 in proxy_targets table

-- Alter port column to be nullable with default 80
ALTER TABLE pzero.proxy_targets
  ALTER COLUMN port DROP NOT NULL,
  ALTER COLUMN port SET DEFAULT 80;

-- Update existing rows that have NULL port to use default 80
UPDATE pzero.proxy_targets
SET port = 80
WHERE port IS NULL;

