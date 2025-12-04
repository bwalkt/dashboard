-- Down Migration for 01-04-seeds.sql
-- Remove seeded data

-- Delete user profiles
DELETE FROM pzero.all_users 
WHERE handle = 'ukris' AND part = 'pzero';

-- Delete organizations
DELETE FROM pzero.all_orgs 
WHERE handle IN ('pzero', 'bwalkt');

-- Delete auth entry
DELETE FROM pzero.all_auth 
WHERE email = 'uma.krishnan@boardwalktech.com';


-- Drop schema if exists
DROP SCHEMA IF EXISTS pzero CASCADE;