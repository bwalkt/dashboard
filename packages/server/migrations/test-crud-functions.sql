-- Test suite for pzero.insert_into_table() function
-- Run this after executing 01-01-create-tables.sql, 01-02-create-functions.sql, and 01-03-crud-functions.sql

-- NOTE: The insert_into_table() function is designed for tables that have a 'data' column.
-- Tables like all_auth that don't have a data column should use direct INSERT statements.

-- ============================================
-- Set environment to development for testing
-- ============================================
-- Tests require DELETE operations, which are only allowed in development
SET app.environment = 'development';

\echo 'Environment set to development for testing'
\echo '';

-- ============================================
-- Cleanup any existing test data first
-- ============================================
\echo 'Cleaning up any existing test data...'
DO $$
BEGIN
  -- Delete test users (this will cascade to related records)
  DELETE FROM pzero.all_users WHERE name IN ('Jane Doe', 'Grid Only User');

  -- Delete test orgs
  DELETE FROM pzero.all_orgs
  WHERE handle IN ('acme', 'dtco', 'test', 'null', 'empty')
     OR name IN ('Acme Corp', 'Data Co', 'Test Company', 'Null Test Org', 'Empty Fields Test');

  -- Delete test auth records
  DELETE FROM pzero.all_auth WHERE email IN ('jane.doe@acme.com', 'gridonly@example.com');

  RAISE NOTICE 'Cleanup complete';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Cleanup completed with notice: %', SQLERRM;
END $$;

\echo '';

-- ============================================
-- Test 1: Insert into all_orgs (basic test)
-- ============================================
\echo '=== Test 1: Insert into all_orgs (basic test) ==='
SELECT pzero.insert_into_table(
  'all_orgs',
  (SELECT id::text FROM pzero.all_auth WHERE email = 'admin@example.com'),
  jsonb_build_object(
    'name', 'Acme Corp',
    'handle', 'acme',
    'part_by', 'pzero'
  ),
  jsonb_build_object(
    'industry', 'Manufacturing',
    'founded', 1950,
    'employees', 5000
  )
) as inserted_id;

-- Verify the insert
\echo 'Verifying Acme Corp insert:'
SELECT id, name, handle, part_by, status, jsonb_pretty(data) as data
FROM pzero.all_orgs
WHERE handle = 'acme';

-- Check audit trail
\echo 'Checking audit trail for Acme Corp:'
SELECT COUNT(*) as audit_count, mmn
FROM pzero.all_audits a
JOIN pzero.all_orgs o ON a.row_id::text = o.id::text
WHERE o.handle = 'acme'
GROUP BY mmn;

-- ============================================
-- Test 2: Insert into all_orgs (complex JSONB)
-- ============================================
\echo '=== Test 2: Insert with complex nested JSONB ==='
SELECT pzero.insert_into_table(
  'all_orgs',
  (SELECT id::text FROM pzero.all_auth WHERE email = 'admin@example.com'),
  jsonb_build_object(
    'name', 'Data Co',
    'handle', 'dtco',
    'part_by', 'pzero'
  ),
  jsonb_build_object(
    'settings', jsonb_build_object(
      'notifications', true,
      'theme', 'dark',
      'features', jsonb_build_array('api', 'webhooks', 'analytics')
    ),
    'metadata', jsonb_build_object(
      'tags', jsonb_build_array('enterprise', 'saas'),
      'rating', 4.5
    ),
    'founded', 2020
  )
) as inserted_id;

-- Verify complex JSONB
\echo 'Verifying Data Co insert with nested JSONB:'
SELECT id, name, handle, jsonb_pretty(data) as data
FROM pzero.all_orgs
WHERE handle = 'dtco';

-- ============================================
-- Test 3: Insert into all_users with grid data
-- ============================================
\echo '=== Test 3: Insert into all_users with grid data ==='
-- First create an auth record for the user
INSERT INTO pzero.all_auth (email) VALUES ('jane.doe@acme.com');

-- Now insert the user record with grid
SELECT pzero.insert_into_table(
  'all_users',
  (SELECT id::text FROM pzero.all_auth WHERE email = 'admin@example.com'),
  jsonb_build_object(
    'name', 'Jane Doe',
    'id', (SELECT id::text FROM pzero.all_auth WHERE email = 'jane.doe@acme.com'),
    'org_id', (SELECT id::text FROM pzero.all_orgs WHERE handle = 'acme'),
    'part', 'pzero'
  ),
  jsonb_build_object(
    'department', 'Engineering',
    'title', 'Senior Developer',
    'contact_email', 'jane.doe@acme.com',
    'hire_date', '2024-01-15',
    'grid', jsonb_build_array(
      jsonb_build_object('row', 0, 'col', 0, 'value', 'A1'),
      jsonb_build_object('row', 0, 'col', 1, 'value', 'B1'),
      jsonb_build_object('row', 1, 'col', 0, 'value', 'A2'),
      jsonb_build_object('row', 1, 'col', 1, 'value', 'B2')
    )
  )
) as inserted_id;

-- Verify the insert
\echo 'Verifying Jane Doe user insert:'
SELECT id, name, org_id, status, jsonb_pretty(data) as data
FROM pzero.all_users
WHERE name = 'Jane Doe';

-- Verify grid data in user record
\echo 'Verifying grid data in user record:'
SELECT 
  name,
  jsonb_array_length(data->'grid') as grid_entries_count,
  data->'grid'->0 as first_grid_entry,
  data->'grid'->3 as last_grid_entry
FROM pzero.all_users
WHERE name = 'Jane Doe';

-- Check audit trail
\echo 'Checking audit trail for Jane Doe:'
SELECT COUNT(*) as audit_count
FROM pzero.all_audits a
JOIN pzero.all_users u ON a.row_id::text = u.id::text
WHERE u.name = 'Jane Doe';

-- ============================================
-- Test 4: Insert with NULL field values
-- ============================================
\echo '=== Test 4: Insert with NULL field values ==='
SELECT pzero.insert_into_table(
  'all_orgs',
  (SELECT id::text FROM pzero.all_auth WHERE email = 'admin@example.com'),
  jsonb_build_object(
    'name', 'Null Test Org',
    'handle', 'null',
    'part_by', 'pzero',
    'website', NULL  -- Testing NULL handling
  ),
  jsonb_build_object(
    'note', 'Testing NULL field handling',
    'optional_field', NULL
  )
) as inserted_id;

-- Verify NULL handling
\echo 'Verifying NULL handling:'
SELECT id, name, handle, website, jsonb_pretty(data) as data
FROM pzero.all_orgs
WHERE handle = 'null';

-- ============================================
-- Test 5: Error handling - missing required parameter
-- ============================================
\echo '=== Test 5: Error handling - missing table_name ==='
DO $$
BEGIN
  PERFORM pzero.insert_into_table(
    NULL,  -- Missing table_name
    '019a9f56-2d65-7bd0-b764-9f79183c7672',
    jsonb_build_object('field', 'value')
  );
  RAISE EXCEPTION 'Should have failed but did not!';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%table_name is required%' THEN
      RAISE NOTICE 'Expected error caught: %', SQLERRM;
    ELSE
      RAISE;
    END IF;
END $$;

-- ============================================
-- Test 6: Error handling - missing c_by
-- ============================================
\echo '=== Test 6: Error handling - missing c_by ==='
DO $$
BEGIN
  PERFORM pzero.insert_into_table(
    'all_orgs',
    NULL,  -- Missing c_by
    jsonb_build_object('name', 'test', 'handle', 'test')
  );
  RAISE EXCEPTION 'Should have failed but did not!';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%c_by is required%' THEN
      RAISE NOTICE 'Expected error caught: %', SQLERRM;
    ELSE
      RAISE;
    END IF;
END $$;

-- ============================================
-- Test 7: Error handling - invalid table name
-- ============================================
\echo '=== Test 7: Error handling - invalid table name ==='
DO $$
BEGIN
  PERFORM pzero.insert_into_table(
    'nonexistent_table',
    '019a9f56-2d65-7bd0-b764-9f79183c7672',
    jsonb_build_object('field', 'value')
  );
  RAISE EXCEPTION 'Should have failed but did not!';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%nonexistent_table%' OR SQLERRM LIKE '%does not exist%' THEN
      RAISE NOTICE 'Expected error caught: %', SQLERRM;
    ELSE
      RAISE;
    END IF;
END $$;

-- ============================================
-- Test 8: Insert user with only grid data (no other fields)
-- ============================================
\echo '=== Test 8: Insert user with only grid data ==='
-- First create an auth record for the grid-only user
INSERT INTO pzero.all_auth (email) VALUES ('gridonly@example.com');

-- Insert user with only grid data in the data column
SELECT pzero.insert_into_table(
  'all_users',
  (SELECT id::text FROM pzero.all_auth WHERE email = 'admin@example.com'),
  jsonb_build_object(
    'name', 'Grid Only User',
    'id', (SELECT id::text FROM pzero.all_auth WHERE email = 'gridonly@example.com'),
    'org_id', (SELECT id::text FROM pzero.all_orgs WHERE handle = 'acme'),
    'part', 'pzero'
  ),
  jsonb_build_object(
    'grid', jsonb_build_array(
      jsonb_build_object('row', 0, 'col', 0, 'value', '1'),
      jsonb_build_object('row', 0, 'col', 1, 'value', '2'),
      jsonb_build_object('row', 0, 'col', 2, 'value', '3'),
      jsonb_build_object('row', 1, 'col', 0, 'value', '4'),
      jsonb_build_object('row', 1, 'col', 1, 'value', '5'),
      jsonb_build_object('row', 1, 'col', 2, 'value', '6'),
      jsonb_build_object('row', 2, 'col', 0, 'value', '7'),
      jsonb_build_object('row', 2, 'col', 1, 'value', '8'),
      jsonb_build_object('row', 2, 'col', 2, 'value', '9')
    )
  )
) as inserted_id;

-- Verify grid-only user
\echo 'Verifying grid-only user:'
SELECT 
  name,
  jsonb_array_length(data->'grid') as grid_entries_count,
  data->'grid'->0 as first_entry,
  data->'grid'->4 as middle_entry,
  data->'grid'->8 as last_entry
FROM pzero.all_users
WHERE name = 'Grid Only User';

-- ============================================
-- Test 9: Insert with empty fields
-- ============================================
\echo '=== Test 9: Insert with empty fields (only data) ==='
SELECT pzero.insert_into_table(
  'all_orgs',
  (SELECT id::text FROM pzero.all_auth WHERE email = 'admin@example.com'),
  jsonb_build_object(
    'name', 'Empty Fields Test',
    'handle', 'empty',
    'part_by', 'pzero'
  ),
  jsonb_build_object(
    'note', 'This org was created with minimal fields',
    'test_case', 'empty_additional_data'
  )
) as inserted_id;

-- Verify
\echo 'Verifying empty fields test:'
SELECT id, name, handle, jsonb_pretty(data) as data
FROM pzero.all_orgs
WHERE handle = 'empty';

-- ============================================
-- Test 10: Production DELETE protection and soft delete
-- ============================================
\echo '=== Test 10: Production DELETE protection ==='

-- First, create a test org
SELECT pzero.insert_into_table(
  'all_orgs',
  (SELECT id::text FROM pzero.all_auth WHERE email = 'admin@example.com'),
  jsonb_build_object(
    'name', 'Delete Test Org',
    'handle', 'delto',
    'part_by', 'pzero'
  ),
  jsonb_build_object('purpose', 'Testing DELETE protection')
) as inserted_id;

-- Test 9a: Verify DELETE fails in production
\echo 'Testing DELETE blocked in production:'
-- Switch to production mode at session level
SET app.environment = 'production';

-- Use a DO block to catch the expected error
DO $$
BEGIN
  -- Try to DELETE - should fail
  DELETE FROM pzero.all_orgs WHERE handle = 'delto';
  -- If we reach here, the test failed
  RAISE EXCEPTION 'DELETE should have been blocked in production!';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%DELETE operations are not allowed in production%' THEN
      RAISE NOTICE 'Expected error: DELETE blocked in production environment ✓';
    ELSE
      -- Re-raise if it's a different error
      RAISE NOTICE 'Unexpected error: %', SQLERRM;
      RAISE;
    END IF;
END $$;

-- Switch back to development for cleanup
SET app.environment = 'development';

-- Test 9b: Verify soft delete works as alternative
\echo 'Testing soft delete as production alternative:'
UPDATE pzero.all_orgs
SET is_del = TRUE,
    data = jsonb_set(COALESCE(data, '{}'::jsonb), '{meta,u_by}', to_jsonb((SELECT id::text FROM pzero.all_auth WHERE email = 'admin@example.com')))
WHERE handle = 'delto';

-- Verify soft delete
SELECT handle, is_del, is_act
FROM pzero.all_orgs
WHERE handle = 'delto';

-- Clean up test org
DELETE FROM pzero.all_orgs WHERE handle = 'delto';

-- ============================================
-- Test Summary
-- ============================================
\echo '';
\echo '=== Test Summary ==='
\echo 'Total org records created by tests:'
SELECT COUNT(*) as org_count
FROM pzero.all_orgs
WHERE name IN ('Acme Corp', 'Data Co', 'Test Company', 'Null Test Org', 'Empty Fields Test');

\echo '';
\echo 'Total user records created by tests:'
SELECT COUNT(*) as user_count
FROM pzero.all_users
WHERE name IN ('Jane Doe', 'Grid Only User');

\echo '';
\echo 'Total auth records created by tests:'
SELECT COUNT(*) as auth_count
FROM pzero.all_auth
WHERE email IN ('jane.doe@acme.com', 'gridonly@example.com');

\echo '';
\echo 'Total audit records created by tests (last 5 minutes):'
SELECT COUNT(*) as total_audit_records
FROM pzero.all_audits
WHERE id IN (
  SELECT a.id
  FROM pzero.all_audits a
  JOIN pzero.all_txns t ON a.txn_id = t.id
  WHERE t.c_at > NOW() - INTERVAL '5 minutes'
);

\echo '';
\echo '=== All tests completed successfully! ==='

-- ============================================
-- Cleanup (optional - uncomment to remove test data)
-- ============================================
-- \echo 'Cleaning up test data...'
-- DELETE FROM pzero.all_users WHERE name IN ('Jane Doe', 'Grid Only User');
-- DELETE FROM pzero.all_orgs WHERE handle IN ('acme', 'dtco', 'test', 'null', 'empty');
-- DELETE FROM pzero.all_auth WHERE email IN ('jane.doe@acme.com', 'gridonly@example.com');
-- \echo 'Cleanup complete!'
