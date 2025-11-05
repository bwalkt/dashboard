INSERT INTO
  pzero.all_auth (email)
VALUES
  ('test@example.com');

INSERT INTO
  pzero.all_users (id, data, name)
SELECT
  id,
  jsonb_build_object('meta', jsonb_build_object('c_by', id::text)) AS data,
  'foo' AS name
FROM
  pzero.all_auth
WHERE
  email = 'test@example.com';

BEGIN transaction;

UPDATE pzero.all_auth
SET
  is_act = TRUE
WHERE
  email = 'test@example.com';

UPDATE pzero.all_users
SET
  is_act = TRUE
WHERE
  id IN (
    SELECT
      id
    FROM
      pzero.all_auth
    WHERE
      email = 'test@example.com'
  );

COMMIT;

INSERT INTO
  pzero.all_endpoints (name, url, methods)
VALUES
  (
    'bwalk',
    'https://www.boardwalktech.com',
    ARRAY['GET', 'POST', 'PUT', 'DELETE']::pzero.method[]
  );

-- add relations table entry
INSERT INTO
  pzero.all_relations (uuid1, uuid2, relation)
SELECT
  concat('U_', u.id) AS uuid1, -- User UUID with MMN prefix
  concat('E_', e.id) AS uuid2, -- Endpoint UUID with MMN prefix
  1 AS relation -- Simple relation value
FROM
  pzero.all_users u,
  pzero.all_endpoints e
WHERE
  u.name = 'foo'
  AND e.name = 'bwalk';
