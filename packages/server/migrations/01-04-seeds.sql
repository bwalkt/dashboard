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
