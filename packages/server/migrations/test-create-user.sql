-- Test suite for pzero.create_user() function
-- Run this after executing 01-03-crud-functions.sql

-- ============================================
-- Set environment to development for testing
-- ============================================
SET app.environment = 'development';

\echo 'Testing pzero.create_user() function'
\echo '';

-- ============================================
-- Cleanup any existing test data
-- ============================================
\echo 'Cleaning up any existing test data...'
DO $$
BEGIN
  DELETE FROM pzero.all_users WHERE name IN ('Test User 1', 'Test User 2', 'Test User 3', 'Grid User');
  DELETE FROM pzero.all_auth WHERE email IN ('testuser1@example.com', 'testuser2@example.com', 'testuser3@example.com', 'griduser@example.com');
  RAISE NOTICE 'Cleanup complete';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Cleanup completed with notice: %', SQLERRM;
END $$;

\echo '';

-- ============================================
-- Test 1: Create user with all optional fields including grid
-- ============================================
\echo '=== Test 1: Create user with all optional fields including grid ==='
SELECT pzero.create_user(jsonb_build_object(
  'name', 'Test User 1',
  'email', 'testuser1@example.com',
  'org_id', (SELECT id::text FROM pzero.all_orgs WHERE handle = 'acme'),
  'part', 'pzero',
  'grid', jsonb_build_array(
    jsonb_build_object('row', 0, 'col', 0, 'value', '1234'),
    jsonb_build_object('row', 0, 'col', 1, 'value', '5678'),
    jsonb_build_object('row', 1, 'col', 0, 'value', '9012'),
    jsonb_build_object('row', 1, 'col', 1, 'value', '3456')
  ),
  'data', jsonb_build_object(
    'department', 'Engineering',
    'title', 'Software Engineer',
    'start_date', '2024-01-15'
  )
)) as result;

-- Verify auth record
\echo 'Verifying auth record:'
SELECT id, email, email_verified
FROM pzero.all_auth
WHERE email = 'testuser1@example.com';

-- Verify user record and c_by
\echo 'Verifying user record and c_by:'
SELECT
  u.id,
  u.name,
  u.data->'meta'->>'c_by' as c_by,
  (u.id::text = u.data->'meta'->>'c_by') as c_by_is_self,
  jsonb_pretty(u.data) as data
FROM pzero.all_users u
WHERE u.name = 'Test User 1';

-- Verify grid data is stored correctly
\echo 'Verifying grid data:'
SELECT
  u.name,
  jsonb_array_length(u.data->'grid') as grid_entries_count,
  u.data->'grid' as grid_data
FROM pzero.all_users u
WHERE u.name = 'Test User 1';

-- ============================================
-- Test 2: Create user with c_by in data.meta
-- ============================================
\echo '';
\echo '=== Test 2: Create user with c_by in data.meta ==='
SELECT pzero.create_user(jsonb_build_object(
  'name', 'Test User 2',
  'email', 'testuser2@example.com',
  'org_id', (SELECT id::text FROM pzero.all_orgs WHERE handle = 'acme'),
  'data', jsonb_build_object(
    'department', 'Sales',
    'title', 'Manager',
    'meta', jsonb_build_object(
      'c_by', (SELECT id::text FROM pzero.all_auth LIMIT 1)
    )
  )
)) as result;

-- Verify c_by is set correctly (not self-referential)
\echo 'Verifying c_by is set from data.meta.c_by:'
SELECT
  u.name,
  a.email,
  t.c_by::text as c_by_used,
  (u.id::text != t.c_by::text) as c_by_not_self
FROM pzero.all_users u
JOIN pzero.all_auth a ON u.id = a.id
JOIN pzero.all_audits au ON au.row_id::text = u.id::text
JOIN pzero.all_txns t ON t.id = au.txn_id
WHERE u.name = 'Test User 2'
LIMIT 1;

-- ============================================
-- Test 3: Create user with minimal params (default org)
-- ============================================
\echo '';
\echo '=== Test 3: Create user with minimal params (default org) ==='
SELECT pzero.create_user(jsonb_build_object(
  'name', 'Test User 3',
  'email', 'testuser3@example.com'
)) as result;

\echo 'Verifying default org used:'
SELECT
  u.name,
  u.org_id::text,
  o.handle as org_handle
FROM pzero.all_users u
JOIN pzero.all_orgs o ON u.org_id = o.id
WHERE u.name = 'Test User 3';

-- ============================================
-- Test 4: Create user with only grid data (no additional data)
-- ============================================
\echo '';
\echo '=== Test 4: Create user with only grid data ==='
SELECT pzero.create_user(jsonb_build_object(
  'name', 'Grid User',
  'email', 'griduser@example.com',
  'grid', jsonb_build_array(
    jsonb_build_object('row', 0, 'col', 0, 'value', 'PIN1'),
    jsonb_build_object('row', 0, 'col', 1, 'value', 'PIN2'),
    jsonb_build_object('row', 0, 'col', 2, 'value', 'PIN3'),
    jsonb_build_object('row', 1, 'col', 0, 'value', 'PIN4'),
    jsonb_build_object('row', 1, 'col', 1, 'value', 'PIN5'),
    jsonb_build_object('row', 1, 'col', 2, 'value', 'PIN6')
  )
)) as result;

-- Verify grid-only user
\echo 'Verifying grid-only user:'
SELECT
  u.name,
  jsonb_array_length(u.data->'grid') as grid_entries_count,
  u.data->'grid'->0 as first_grid_entry,
  u.data->'grid'->5 as last_grid_entry
FROM pzero.all_users u
WHERE u.name = 'Grid User';

-- ============================================
-- Test 5: Error handling - duplicate email
-- ============================================
\echo '';
\echo '=== Test 5: Error handling - duplicate email ==='
DO $$
BEGIN
  PERFORM pzero.create_user(jsonb_build_object(
    'name', 'Duplicate User',
    'email', 'testuser1@example.com'  -- Already exists
  ));
  RAISE EXCEPTION 'Should have failed with duplicate email!';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%Email%already exists%' THEN
      RAISE NOTICE 'Expected error: Duplicate email blocked ✓';
    ELSE
      RAISE NOTICE 'Unexpected error: %', SQLERRM;
      RAISE;
    END IF;
END $$;

-- ============================================
-- Test 6: Error handling - missing name
-- ============================================
\echo '';
\echo '=== Test 6: Error handling - missing name ==='
DO $$
BEGIN
  PERFORM pzero.create_user(jsonb_build_object(
    'email', 'test@example.com'
  ));
  RAISE EXCEPTION 'Should have failed!';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%name is required%' THEN
      RAISE NOTICE 'Expected error: Missing name ✓';
    ELSE
      RAISE;
    END IF;
END $$;

\echo '';
\echo '=== Test 7: Error handling - missing email ==='
DO $$
BEGIN
  PERFORM pzero.create_user(jsonb_build_object(
    'name', 'Test User'
  ));
  RAISE EXCEPTION 'Should have failed!';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%email is required%' THEN
      RAISE NOTICE 'Expected error: Missing email ✓';
    ELSE
      RAISE;
    END IF;
END $$;

-- ============================================
-- Test Summary
-- ============================================
\echo '';
\echo '=== Test Summary ==='

\echo 'Total users created:'
SELECT COUNT(*) as user_count
FROM pzero.all_users
WHERE name IN ('Test User 1', 'Test User 2', 'Test User 3', 'Grid User');

\echo '';
\echo 'All created users with c_by verification:'
SELECT
  u.name,
  a.email,
  o.handle as org,
  CASE
    WHEN t.c_by::text = u.id::text THEN 'self'
    ELSE 'other'
  END as c_by_type
FROM pzero.all_users u
JOIN pzero.all_auth a ON u.id = a.id
JOIN pzero.all_orgs o ON u.org_id = o.id
JOIN pzero.all_audits au ON au.row_id::text = u.id::text
JOIN pzero.all_txns t ON t.id = au.txn_id
WHERE u.name IN ('Test User 1', 'Test User 2', 'Test User 3', 'Grid User')
GROUP BY u.name, a.email, o.handle, t.c_by, u.id
ORDER BY u.name;

\echo '';
\echo '=== All tests completed successfully! ==='
