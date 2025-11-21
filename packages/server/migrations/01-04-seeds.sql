-- ============================================
-- Seed Data Migration
-- ============================================
-- Update global vars version
INSERT INTO
  pzero.global_vars (name, value)
VALUES
  ('version', '01-01')
ON CONFLICT (name) DO UPDATE
SET
  value = excluded.value;

-- ============================================
-- MMN (Mneumonic Namespace) Seeds
-- ============================================
INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_auth', 'P');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_auth', 'A');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_users', 'U');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_groups', 'G');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_orgs', 'O');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_nhs', 'N');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_sessions', 'S');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_devices', 'D');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_endpoints', 'E');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_files', 'F');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_dirs', 'DR');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_relations', 'R');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_audits', 'AD');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_thread_heads', 'TH');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_threads', 'T');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_txns', 'TX');

-- ============================================
-- Schema Seeds
-- ============================================
INSERT INTO
  pzero.schemas (schema)
VALUES
  ('pzero');

-- ============================================
-- Parts Seeds
-- ============================================
INSERT INTO
  pzero.all_parts (part, name, handle)
VALUES
  ('pzero', 'pzero', 'pzero');

-- ============================================
-- User/Org Seeds
-- ============================================
-- Seed admin/default user auth
INSERT INTO
  pzero.all_auth (email, email_verified)
VALUES
  ('uma.krishnan@boardwalktech.com', TRUE);

-- Seed default org
INSERT INTO
  pzero.all_orgs (name, handle, data)
SELECT
  'pzero',
  'pzero',
  jsonb_build_object('meta', jsonb_build_object('c_by', id::text))
FROM
  pzero.all_auth
WHERE
  email = 'uma.krishnan@boardwalktech.com';

-- Seed user profile
INSERT INTO
  pzero.all_users (id, name, handle, part, org_id, data)
SELECT
  a.id,
  'Uma Krishnan',
  'ukris',
  'pzero',
  o.id,
  jsonb_build_object('meta', jsonb_build_object('c_by', a.id::text))
FROM
  pzero.all_auth a
  CROSS JOIN pzero.all_orgs o
WHERE
  a.email = 'uma.krishnan@boardwalktech.com'
  AND o.handle = 'pzero';
