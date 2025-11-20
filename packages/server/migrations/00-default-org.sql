-- Create default organization
SET
  app.environment = 'development';

DO $$
DECLARE
  v_admin_id text;
  v_org_id text;
BEGIN
  -- Get first auth user as creator
  SELECT id::text INTO v_admin_id FROM pzero.all_auth LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM pzero.all_orgs WHERE handle = 'pzero') THEN
    SELECT pzero.insert_into_table(
      'all_orgs',
      v_admin_id,
      jsonb_build_object('handle', 'pzero', 'name', 'P-Zero Default Org', 'website', 'https://pzero.com'),
      '{"is_default": true}'::jsonb
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
