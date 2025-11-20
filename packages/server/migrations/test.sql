-- Test SQL Scripts for P-Zero Database
-- This file contains comprehensive test data to validate audit triggers,
-- data processing, and all table relationships
-- ============================================================================
-- Test 1: Basic Auth User Creation with Auto-Generated ID
-- ============================================================================
INSERT INTO
  pzero.all_auth (email)
VALUES
  ('admin@example.com');

INSERT INTO
  pzero.all_auth (email)
VALUES
  ('user@example.com');

-- ============================================================================
-- Test 2: Users with Data Processing (meta removal, tags preservation)
-- ============================================================================
-- Test user with data.meta that should be removed
INSERT INTO
  pzero.all_users (id, name, data)
SELECT
  id,
  'Admin User' AS name,
  '{"meta": {"c_by": "' || id || '", "foo": 1, "bar": "test"}, "tags": ["admin", "superuser"], "profile": {"role": "administrator"}}'::jsonb AS data
FROM
  pzero.all_auth
WHERE
  email = 'admin@example.com';

-- Test user with data.diff for update tracking
INSERT INTO
  pzero.all_users (id, name, data)
SELECT
  id,
  'Regular User' AS name,
  '{"meta": {"c_by": "' || id || '"}, "tags": ["user"], "diff": {"name": {"old": "John", "new": "Jane"}}, "settings": {"theme": "dark"}}'::jsonb AS data
FROM
  pzero.all_auth
WHERE
  email = 'user@example.com';

-- ============================================================================
-- Test 3: Organizations
-- ============================================================================
INSERT INTO
  pzero.all_orgs (name, handle, website, data)
VALUES
  (
    'Boardwalk Technologies',
    'bwalk',
    'https://www.boardwalktech.com',
    '{"meta": {"c_by": "' || (
      SELECT
        id
      FROM
        pzero.all_auth
      WHERE
        email = 'admin@example.com'
      LIMIT
        1
    ) || '"}, "industry": "technology", "founded": 2020}'
  );

-- ============================================================================
-- Test 4: Endpoints with Various Methods
-- ============================================================================
INSERT INTO
  pzero.all_endpoints (name, url, methods, data)
VALUES
  (
    'API Gateway',
    'https://api.boardwalktech.com',
    ARRAY['GET', 'POST', 'PUT', 'DELETE']::pzero.method[],
    '{"meta": {"c_by": "' || (
      SELECT
        id
      FROM
        pzero.all_auth
      WHERE
        email = 'admin@example.com'
      LIMIT
        1
    ) || '"}, "version": "v1", "rate_limit": 1000}'
  ),
  (
    'Health Check',
    'https://api.boardwalktech.com/health',
    ARRAY['GET']::pzero.method[],
    '{"meta": {"c_by": "' || (
      SELECT
        id
      FROM
        pzero.all_auth
      WHERE
        email = 'admin@example.com'
      LIMIT
        1
    ) || '"}, "timeout": 5000}'
  );

-- ============================================================================
-- Test 5: Devices
-- ============================================================================
INSERT INTO
  pzero.all_devices (name, device_type, is_primary, uid, data)
SELECT
  'Admin Laptop',
  'LAPTOP'::pzero.device_type,
  TRUE,
  id,
  '{"meta": {"c_by": "' || id || '"}, "os": "macOS", "browser": "Chrome"}'::jsonb
FROM
  pzero.all_auth
WHERE
  email = 'admin@example.com';

-- ============================================================================
-- Test 6: Sessions
-- ============================================================================
INSERT INTO
  pzero.all_sessions (name, ip, user_agent, status, data)
VALUES
  (
    'Admin Session',
    '192.168.1.100',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'ACTIVE'::pzero.session_status,
    '{"meta": {"c_by": "' || (
      SELECT
        id
      FROM
        pzero.all_auth
      WHERE
        email = 'admin@example.com'
      LIMIT
        1
    ) || '"}, "login_time": "' || now() || '", "last_activity": "' || now() || '"}'
  );

-- ============================================================================
-- Test 7: Relations between entities
-- ============================================================================
-- User owns organization
INSERT INTO
  pzero.all_relations (uuid1, uuid2, relation)
SELECT
  concat('U_', u.id) AS uuid1, -- User UUID with MMN prefix
  concat('O_', o.id) AS uuid2, -- Org UUID with MMN prefix  
  1 AS relation -- Basic relation
FROM
  pzero.all_users u,
  pzero.all_orgs o
WHERE
  u.name = 'Admin User'
  AND o.name = 'Boardwalk Technologies';

-- User can access endpoint
INSERT INTO
  pzero.all_relations (uuid1, uuid2, relation)
SELECT
  concat('U_', u.id) AS uuid1, -- User UUID with MMN prefix
  concat('E_', e.id) AS uuid2, -- Endpoint UUID with MMN prefix  
  2 AS relation -- Access relation
FROM
  pzero.all_users u,
  pzero.all_endpoints e
WHERE
  u.name = 'Admin User'
  AND e.name = 'API Gateway';

-- Organization owns endpoint
INSERT INTO
  pzero.all_relations (uuid1, uuid2, relation)
SELECT
  concat('O_', o.id) AS uuid1, -- Org UUID with MMN prefix
  concat('E_', e.id) AS uuid2, -- Endpoint UUID with MMN prefix  
  1 AS relation -- Ownership relation
FROM
  pzero.all_orgs o,
  pzero.all_endpoints e
WHERE
  o.name = 'Boardwalk Technologies'
  AND e.name IN ('API Gateway', 'Health Check');

-- ============================================================================
-- Test 8: Thread System
-- ============================================================================
INSERT INTO
  pzero.all_thread_heads (id, data)
VALUES
  (
    (
      SELECT
        gen_id ()
    ),
    '{"meta": {"c_by": "' || (
      SELECT
        id
      FROM
        pzero.all_auth
      WHERE
        email = 'admin@example.com'
      LIMIT
        1
    ) || '"}, "title": "Welcome Thread", "category": "announcements"}'
  );

INSERT INTO
  pzero.all_threads (root_id, data)
SELECT
  th.id,
  '{"meta": {"c_by": "' || (
    SELECT
      id
    FROM
      pzero.all_auth
    WHERE
      email = 'admin@example.com'
    LIMIT
      1
  ) || '"}, "content": "Welcome to the platform!", "type": "message"}'::jsonb
FROM
  pzero.all_thread_heads th
LIMIT
  1;

-- ============================================================================
-- Test 9: Update Operations (to test UPDATE trigger path)
-- ============================================================================
-- Update user data (should trigger audit)
UPDATE pzero.all_users
SET
  data = '{"tags": ["admin", "superuser", "updated"], "profile": {"role": "senior_administrator"}, "meta": {"u_by": "' || (
    SELECT
      id
    FROM
      pzero.all_auth
    WHERE
      email = 'admin@example.com'
    LIMIT
      1
  ) || '"}}'
WHERE
  name = 'Admin User';

-- Update organization data
UPDATE pzero.all_orgs
SET
  data = '{"industry": "technology", "founded": 2020, "employees": 50, "meta": {"u_by": "' || (
    SELECT
      id
    FROM
      pzero.all_auth
    WHERE
      email = 'admin@example.com'
    LIMIT
      1
  ) || '"}}'
WHERE
  name = 'Boardwalk Technologies';

-- ============================================================================
-- Test 10: Verification Queries
-- ============================================================================
-- Verify audit trail exists
SELECT
  'Audit Records Count' AS test_name,
  count(*) AS count
FROM
  pzero.all_audits;

-- Verify transaction logs
SELECT
  'Transaction Records Count' AS test_name,
  count(*) AS count
FROM
  pzero.all_txns;

-- Verify data processing worked (meta should be removed)
SELECT
  'Users with meta field (should be 0)' AS test_name,
  count(*) AS count
FROM
  pzero.all_users
WHERE
  data::text LIKE '%"meta"%';

-- Verify relations work
SELECT
  'Relations Count' AS test_name,
  count(*) AS count
FROM
  pzero.all_relations;

-- Show sample of processed data
SELECT
  'Sample User Data' AS test_name,
  name,
  data
FROM
  pzero.all_users
WHERE
  name = 'Admin User';

-- Show MMN mappings
SELECT
  'MMN Mappings' AS test_name,
  table_name,
  mmn
FROM
  pzero.mmn
ORDER BY
  table_name;

-- ============================================================================
-- Test 11: Error Cases (commented out to prevent failures)
-- ============================================================================
-- These would fail with proper error messages:
-- INSERT INTO pzero.all_users (name) VALUES ('No Auth User');  -- Missing c_by
-- INSERT INTO pzero.all_relations (uuid1, uuid2, relation) VALUES ('invalid', 'invalid', 1);  -- Invalid UUIDs
-- UPDATE pzero.all_auth SET id = gen_id() WHERE email = 'admin@example.com';  -- ID immutable
-- ============================================================================
-- Summary Report
-- ============================================================================
SELECT
  '=== TEST SUMMARY ===' AS summary;

SELECT
  'Auth Users' AS table_name,
  count(*) AS record_count
FROM
  pzero.all_auth
UNION ALL
SELECT
  'Users' AS table_name,
  count(*) AS record_count
FROM
  pzero.all_users
UNION ALL
SELECT
  'Organizations' AS table_name,
  count(*) AS record_count
FROM
  pzero.all_orgs
UNION ALL
SELECT
  'Endpoints' AS table_name,
  count(*) AS record_count
FROM
  pzero.all_endpoints
UNION ALL
SELECT
  'Devices' AS table_name,
  count(*) AS record_count
FROM
  pzero.all_devices
UNION ALL
SELECT
  'Sessions' AS table_name,
  count(*) AS record_count
FROM
  pzero.all_sessions
UNION ALL
SELECT
  'Relations' AS table_name,
  count(*) AS record_count
FROM
  pzero.all_relations
UNION ALL
SELECT
  'Thread Heads' AS table_name,
  count(*) AS record_count
FROM
  pzero.all_thread_heads
UNION ALL
SELECT
  'Threads' AS table_name,
  count(*) AS record_count
FROM
  pzero.all_threads
UNION ALL
SELECT
  'Audit Records' AS table_name,
  count(*) AS record_count
FROM
  pzero.all_audits
UNION ALL
SELECT
  'Transactions' AS table_name,
  count(*) AS record_count
FROM
  pzero.all_txns;
