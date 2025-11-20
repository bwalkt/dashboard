-- Initialize default 'pzero' partition
-- This is required by base_part table which references pzero.parts(part)
INSERT INTO
  pzero.parts (part, name)
VALUES
  ('pzero', 'pzero')
ON CONFLICT (part) DO NOTHING;

SELECT
  pzero.create_user (
    jsonb_build_object(
      'name',
      'Uma' 'email',
      'uma.krishnan@boardwalktech.com'
    )
  );

-- Create default organization
DO $$
DECLARE
  v_admin_id text;
  v_org_id text;
BEGIN
  -- Get first auth user as creator
  SELECT id::text INTO v_admin_id FROM pzero.all_auth ORDER BY c_at LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Cannot create default org: No auth users exist. Please create an admin user first.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pzero.all_orgs WHERE handle = 'pzero') THEN
    SELECT pzero.create_org(
      jsonb_build_object(
        'handle', 'pzero',
        'name', 'P-Zero Default Org',
        'website', 'https://pzero.com',
        'c_by', v_admin_id,
        'data', jsonb_build_object('is_default', true)
      )
    ) INTO v_org_id;
    RAISE NOTICE 'Created default org: %', v_org_id;
  END IF;
END $$;

SELECT
  id,
  handle,
  name
FROM
  pzero.all_orgs
WHERE
  handle = 'pzero';
