-- Up Migration
CREATE SCHEMA if NOT EXISTS pzero;
create table if not exists pzero.global_vars (
    name text primary key,
    value text
);
insert into pzero.global_vars (name, value) values ('version', '01-01')   
    on conflict (name) do update set value = excluded.value;

-- ===========================================
-- PARTITIONING ALTERNATIVES FOR UNIQUE ID
-- ===========================================
-- When partitioning requires unique id across all partitions,
-- but partition key must be in PRIMARY KEY, use these approaches:
-- Alternative 1: Global uniqueness via trigger (all PostgreSQL versions)
-- CREATE TABLE example_partitioned (
--     id SERIAL,
--     data TEXT,
--     is_active BOOLEAN NOT NULL
-- ) PARTITION BY LIST (is_active);
-- 
-- CREATE TABLE example_active PARTITION OF example_partitioned FOR VALUES IN (true);
-- CREATE TABLE example_inactive PARTITION OF example_partitioned FOR VALUES IN (false);
-- 
-- -- Create unique indexes on each partition
-- CREATE UNIQUE INDEX example_active_id_idx ON example_active (id);
-- CREATE UNIQUE INDEX example_inactive_id_idx ON example_inactive (id);
-- 
-- -- Add trigger to check global uniqueness
-- CREATE OR REPLACE FUNCTION check_global_id_unique() RETURNS trigger AS $$
-- BEGIN
--   IF EXISTS (SELECT 1 FROM example_partitioned WHERE id = NEW.id AND tableoid != TG_RELID) THEN
--     RAISE EXCEPTION 'Duplicate id % found in partitioned table', NEW.id;
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
-- 
-- CREATE TRIGGER ensure_global_id_unique 
--   BEFORE INSERT OR UPDATE ON example_active
--   FOR EACH ROW EXECUTE FUNCTION check_global_id_unique();
-- CREATE TRIGGER ensure_global_id_unique 
--   BEFORE INSERT OR UPDATE ON example_inactive
--   FOR EACH ROW EXECUTE FUNCTION check_global_id_unique();
-- Alternative 2: Unique indexes on each partition (no global uniqueness)
-- CREATE UNIQUE INDEX example_active_id_idx ON example_active (id);
-- CREATE UNIQUE INDEX example_inactive_id_idx ON example_inactive (id);
-- Alternative 3: Range partitioning by id (allows PRIMARY KEY on id alone)
-- CREATE TABLE example_range_partitioned (
--     id SERIAL PRIMARY KEY,
--     data TEXT,
--     is_active BOOLEAN NOT NULL
-- ) PARTITION BY RANGE (id);
-- CREATE TABLE example_1m PARTITION OF example_range_partitioned 
--     FOR VALUES FROM (1) TO (1000000);
-- Alternative 4: Inheritance-based partitioning (more flexible)
-- CREATE TABLE example_inherited (
--     id SERIAL PRIMARY KEY,
--     data TEXT,
--     is_active BOOLEAN NOT NULL
-- );
-- CREATE TABLE example_inherited_active (CHECK (is_active = true)) 
--     INHERITS (example_inherited);
-- CREATE TABLE example_inherited_inactive (CHECK (is_active = false)) 
--     INHERITS (example_inherited);
-- Alternative 5: Non-partitioned with partial indexes (simplest)
-- CREATE TABLE example_simple (
--     id SERIAL PRIMARY KEY,
--     data TEXT,
--     is_active BOOLEAN NOT NULL
-- );
-- CREATE INDEX example_active_idx ON example_simple (id) WHERE is_active = true;
-- CREATE INDEX example_inactive_idx ON example_simple (id) WHERE is_active = false;
-- ===========================================
CREATE DOMAIN pzero.uuid AS ulid;
CREATE DOMAIN pzero.id AS pzero.uuid;
CREATE DOMAIN pzero.iid AS pzero.id;
CREATE DOMAIN pzero.data AS jsonb;

-- Create simple UUID generation functions to replace ULID
CREATE OR REPLACE FUNCTION pzero.gen_ulid () returns pzero.uuid AS $$
    SELECT uuid_generate_v4()::pzero.uuid;
$$ language sql volatile;
CREATE OR REPLACE FUNCTION pzero.gen_monotonic_id () returns pzero.uuid AS $$
    SELECT uuid_generate_v4()::pzero.uuid;
$$ language sql volatile;
CREATE OR REPLACE FUNCTION pzero.is_valid_email (text) returns boolean AS $$
    BEGIN
        RETURN $1 ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$';
    END;
    $$ language plpgsql;
CREATE DOMAIN pzero.email AS text CHECK (
  value ~* '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
);
CREATE DOMAIN pzero.valid_handle AS varchar(25) NOT NULL CHECK (value ~* '^[A-Za-z0-9._\-]+$');
CREATE DOMAIN pzero.valid_col_name AS varchar(100) NOT NULL CHECK (value ~* '^[A-Za-z0-9_]+$');
CREATE DOMAIN pzero.domain AS text CHECK (
  value ~ '^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'
);
CREATE TYPE pzero.address AS (
  street text,
  city text,
  state text,
  zipcode text,
  country text
);
CREATE TYPE pzero.method AS enum(
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'HEAD',
  'OPTIONS'
);
CREATE TYPE pzero.location AS (address pzero.address, lat int, lon int, alt int);
CREATE DOMAIN pzero.mmn_type AS char(3);
CREATE TYPE pzero.user_status AS enum(
  'ACTIVE',
  'INACTIVE',
  'BANNED',
  'DELETED',
  'PENDING'
);
CREATE TYPE pzero.user_online_status AS enum('ONLINE', 'OOO', 'AWAY', 'BUSY', 'INACTIVE');
CREATE TYPE pzero.device_status AS enum('ACTIVE', 'INACTIVE', 'LOST', 'UNKNOWN');
CREATE DOMAIN pzero.key_values AS hstore;
CREATE TYPE pzero.session_status AS enum('ACTIVE', 'INACTIVE', 'EXPIRED');
CREATE TYPE pzero.session_type AS enum('WEB', 'MOBILE', 'API', 'OTHER');
CREATE TYPE pzero.device_type AS enum('MOBILE', 'TABLET', 'DESKTOP', 'LAPTOP', 'OTHER');
CREATE TYPE pzero.endpoint_status AS enum(
  'ACTIVE',
  'INACTIVE',
  'DEPRECATED',
  'PENDING',
  'REMOVED',
  'VERIFIED',
  'UNVERIFIED',
  'BLOCKED',
  'SUSPENDED',
  'DELETED'
);
CREATE TYPE pzero.dir_status AS enum('ACTIVE', 'INACTIVE', 'DELETED', 'CORRUPTED');
CREATE TYPE pzero.org_status AS enum(
  'ACTIVE',
  'INACTIVE',
  'DEPRECATED',
  'PENDING',
  'REMOVED',
  'VERIFIED',
  'UNVERIFIED',
  'BLOCKED',
  'SUSPENDED',
  'DELETED'
);
CREATE TYPE pzero.subscriber_tier_level AS enum('FREE', 'ENTERPRISE');
CREATE DOMAIN pzero.url AS text CHECK (
  value ~ '^(https?|ftp)://(-\.)?([^\s/?\.#-]+\.?)+(/[^\s]*)?$'
);
CREATE TYPE pzero.oauth_provider AS enum('GITHUB', 'GOOGLE', 'MICROSOFT');
-- OB - OWNED BY, PC - PARENT-CHILD, PP - PEER-PEER, EXTEND-PARENT,CLONED-OBJECT, LINKED-OBJECT, ROOT-OBJECT, RELATED, REPLACED-OBJECT, Admined-by, member-of, billing-to
CREATE TYPE pzero.relation_type AS enum(
  'OB',
  'PC',
  'PP',
  'EP',
  'CO',
  'LO',
  'RO',
  'RL',
  'RP',
  'AB'
);
CREATE TYPE pzero.billing_freq AS enum(
  'U', -- Usage
  'M', -- Monthly
  'Y' -- Yearly
);
CREATE TYPE pzero.file_type AS enum('.png', '.gif', '.mp4', '.txt', '.pdf');
CREATE TYPE pzero.file_unit AS enum(
  'B',
  'KB',
  'MB',
  'GB',
  'TB',
  'PB',
  'EB',
  'ZB',
  'YB'
);

CREATE TABLE pzero.mmn (
  mmn pzero.mmn_type UNIQUE PRIMARY KEY,
  table_name pzero.valid_handle UNIQUE
);

CREATE TABLE pzero.all_auth (
  id pzero.id NOT NULL DEFAULT pzero.gen_monotonic_id (),
  password text,
  oauth_provider pzero.oauth_provider,
  oauth_id text,
  email text NOT NULL,
  phone text,
  email_verified boolean NOT NULL DEFAULT FALSE,
  phone_verified boolean NOT NULL DEFAULT FALSE,
  is_del boolean NOT NULL DEFAULT FALSE,
  is_act boolean NOT NULL DEFAULT TRUE,
  UNIQUE (email, is_act),
  UNIQUE (phone, is_act)
) PARTITION BY list (is_act);

CREATE TABLE pzero.auth partition of pzero.all_auth FOR
VALUES IN (TRUE);
CREATE INDEX idx_pzero_auth_email ON pzero.all_auth USING gin (email gin_trgm_ops);


CREATE TABLE pzero.all_relations (
  id pzero.id NOT NULL DEFAULT pzero.gen_monotonic_id (),
  uuid1 pzero.uuid NOT NULL,
  uuid2 pzero.uuid NOT NULL,
  relation smallint NOT NULL,
  is_act boolean NOT NULL DEFAULT TRUE,
  is_del boolean DEFAULT FALSE,
  data pzero.data,
  c_by pzero.id NOT NULL,
  PRIMARY KEY (uuid1, uuid2, is_act),
  CONSTRAINT unique_relation UNIQUE (uuid1, uuid2, is_act),
  CONSTRAINT unique_id UNIQUE (id, is_act)
)
PARTITION BY
  list (is_act);
CREATE TABLE pzero.relations partition of pzero.all_relations FOR
VALUES
  IN (TRUE);
CREATE INDEX idx_pzero_relations_uuid2 ON pzero.relations (uuid2);
CREATE INDEX idx_pzero_relations_uuid2 ON pzero.relations (uuid2);
CREATE INDEX idx_pzero_relations_cby ON pzero.relations (c_by);
CREATE INDEX idx_pzero_relations_2 ON pzero.relations (relation)
WHERE (relation & 2) = 2;
CREATE INDEX idx_pzero_relations_2 ON pzero.relations (relation)
WHERE (relation & 2) = 2;
CREATE TABLE pzero.txns (
  id bigint PRIMARY KEY NOT NULL,
  c_by pzero.id NOT NULL,
  c_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pzero_txns_c_at_by ON pzero.txns (c_at, c_by);

CREATE TABLE pzero.base_table (
  name pzero.valid_handle NOT NULL,
  is_del boolean DEFAULT FALSE,
  dscr text,
  data pzero.data
  is_act boolean NOT NULL DEFAULT TRUE,
);

CREATE TABLE pzero.loc_base_table (loc pzero.location) inherits (pzero.base_table);

CREATE TABLE pzero.id_base_table (
  id pzero.id NOT NULL DEFAULT pzero.gen_monotonic_id ()
) inherits (pzero.loc_base_table);

CREATE TABLE pzero.base_effective_table (eff_from timestamptz, eff_to timestamptz);
-- Note: Removed plv8-based trigger function for now
-- Can be re-added when plv8 extension is available

CREATE OR REPLACE FUNCTION pzero.add_audit_columns_to_table_plv8 () returns event_trigger AS $$
  var ddl_commands = plv8.execute(
        "SELECT object_identity FROM pg_event_trigger_ddl_commands() WHERE command_tag = 'CREATE TABLE'"
  );
  var exc_tables = [];

  for (var i = 0; i < ddl_commands.length; i++) {
    var obj_name = ddl_commands[i].object_identity;
    if ((!obj_name.startsWith('pzero.all') || (obj_name.indexOf('base') !== -1)) || (exc_tables.indexOf(obj_name) !== -1)) {
      continue;
    }
    plv8.log("adding c_at for table",obj_name);
    var id_col_exists = plv8.execute(
      "SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'id'", [obj_name]
    );
    var audit_col_exists = plv8.execute(
      "SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'c_at'", [obj_name]
    );
      
    // If the query returns an empty array, the column does not exist
    if ((audit_col_exists.length === 0) && (id_col_exists.length > 0)) {
      var alter_sql = "ALTER TABLE " + plv8.quote_ident(obj_name) + " ADD COLUMN c_at TIMESTAMPZ  GENERATED ALWAYS AS (id::timestamp  AT TIME ZONE 'UTC') STORED";
      plv8.execute(alter_sql);
    }
  }
$$ language plv8;

CREATE EVENT TRIGGER on_table_creation_trigger ON ddl_command_end WHEN tag IN ('CREATE TABLE')
EXECUTE function pzero.add_audit_columns_to_table_plv8 ();

CREATE TABLE pzero.all_audits (
  id pzero.id NOT NULL DEFAULT pzero.gen_monotonic_id () PRIMARY KEY,
  mmn pzero.mmn_type NOT NULL,
  txn_id bigint NOT NULL REFERENCES pzero.txns (id) ON DELETE CASCADE,
  row_id pzero.id NOT NULL,
  cno smallint NOT NULL,
  cval text,
  is_del boolean DEFAULT FALSE,
  PRIMARY KEY (id, is_del),
) PARTITION BY list (is_del);
CREATE TABLE pzero.audits partition of pzero.all_audits FOR
VALUES
  IN (FALSE);

CREATE INDEX idx_pzero_audits_row_id ON pzero.audits (mmn, row_id);
CREATE INDEX idx_pzero_audits_txn_id ON pzero.audits (txn_id);

CREATE TABLE pzero.all_users (
  LIKE pzero.loc_base_table including defaults including constraints,
  id pzero.id NOT NULL,
  avatar text,
  status pzero.user_status,
  online_status pzero.user_online_status,
  last_seen timestamptz,
  is_act boolean DEFAULT TRUE,
  PRIMARY KEY (id, is_act),
  FOREIGN key (id, is_act) REFERENCES pzero.all_auth (id, is_act) ON DELETE CASCADE
) PARTITION BY list (is_act);

CREATE TABLE pzero.users partition of pzero.all_users FOR
VALUES
  IN (TRUE);

CREATE INDEX idx_pzero_users_name ON pzero.users USING gin (name gin_trgm_ops);
CREATE INDEX idx_pzero_users_name ON pzero.users (name);
CREATE INDEX idx_pzero_users_loc ON pzero.users USING gin (loc gin_trgm_ops);
CREATE INDEX idx_pzero_users_name ON pzero.users USING gin (name gin_trgm_ops);
CREATE INDEX idx_pzero_users_loc ON pzero.users USING gin (loc gin_trgm_ops);

CREATE TABLE pzero.all_orgs (
  LIKE pzero.id_base_table including defaults including constraints,
  website pzero.domain UNIQUE,
  favicon text,
  whitelisted_domains pzero.domain[],
  blacklisted_domains pzero.domain[],
  headers pzero.key_values,
  variables pzero.key_values,
  status pzero.org_status,
  subscriber_tier_level pzero.subscriber_tier_level DEFAULT 'FREE',
  subscriber_tier_expiry timestamptz,
  PRIMARY KEY (id, is_act)
) PARTITION BY list (is_act);

CREATE TABLE pzero.all_orgs partition of pzero.all_orgs FOR
VALUES
  IN (TRUE);

CREATE INDEX idx_pzero_orgs_name ON pzero.orgs (name);
CREATE INDEX idx_pzero_orgs_name_gin ON pzero.orgs USING gin (name gin_trgm_ops);
CREATE INDEX idx_pzero_orgs_loc ON pzero.orgs USING gin (loc gin_trgm_ops);

CREATE TABLE pzero.all_sessions (
  LIKE pzero.id_base_table including defaults including constraints,
  ip text,
  user_agent text,
  status pzero.session_status,
  c_by pzero.id NOT NULL REFERENCES pzero.auth (id)
) inherits (pzero.loc_base_table)
PARTITION BY
  list (is_act);

CREATE TABLE pzero.sessions partition of pzero.all_sessions FOR
VALUES
  IN (TRUE);

CREATE INDEX idx_pzero_active_sessions_c_by ON pzero.active_sessions (c_by);

CREATE TABLE pzero.devices (
  info pzero.data,
  is_primary boolean DEFAULT FALSE,
  device_type pzero.device_type DEFAULT pzero.device_type.other,
  is_verifier boolean DEFAULT FALSE,
  device_status pzero.device_status DEFAULT pzero.device_status.unknown,
  duration_used bigint DEFAULT 0, -- total duration used in microseconds
  PRIMARY KEY (id)
) inherits (pzero.loc_base_table);

CREATE INDEX idx_pzero_devices_name ON pzero.devices (name);

CREATE TABLE pzero.endpoints (
  url pzero.domain NOT NULL UNIQUE,
  status pzero.endpoint_status NOT NULL DEFAULT pzero.endpoint_status.pending,
  methods pzero.method[] NOT NULL,
  headers pzero.key_values,
  variables pzero.key_values,
  PRIMARY KEY (id)
) inherits (pzero.loc_base_table);

CREATE TABLE pzero.dirs (
  parent_id pzero.id REFERENCES pzero.dirs (id) ON DELETE CASCADE,
  is_act boolean NOT NULL DEFAULT TRUE,
  status pzero.dir_status,
  PRIMARY KEY (id)
) inherits (pzero.base_table);

CREATE UNIQUE INDEX idx_pzero_dirs_parent ON pzero.dirs (parent_id, name, is_act);

CREATE INDEX idx_pero_dirs_status ON pzero.dirs (status);

CREATE TABLE pzero.files (
  dir_id pzero.id REFERENCES pzero.dirs (id) ON DELETE CASCADE,
  file_type pzero.file_type NOT NULL,
  file_size bigint NOT NULL, -- rounded off by 100
  file_unit pzero.file_unit NOT NULL,
  status pzero.dir_status,
  PRIMARY KEY (id)
) inherits (pzero.base_table);

CREATE UNIQUE INDEX idx_pzero_files ON pzero.files (dir_id, name, is_act);

CREATE INDEX idx_pzero_files_status ON pzero.files (status);

CREATE TABLE pzero.thread_heads (
  id pzero.id NOT NULL PRIMARY KEY,
  epid pzero.id NOT NULL REFERENCES pzero.endpoints (id),
  c_by pzero.id NOT NULL REFERENCES pzero.auth (id),
  status pzero.session_status,
  -- that started the thread
  data pzero.data
)
PARTITION BY
  list (status);

CREATE UNIQUE INDEX idx_thread_heads_epid ON pzero.thread_heads (epid);

CREATE UNIQUE INDEX idx_thread_heads_cby ON pzero.thread_heads (c_by);

CREATE TABLE pzero.threads (
  id pzero.id NOT NULL PRIMARY KEY,
  -- that started the thread
  root_id pzero.id NOT NULL REFERENCES pzero.threads (id),
  status pzero.session_status,
  data pzero.data
)
PARTITION BY
  list (status);

CREATE INDEX idx_threads_root ON pzero.threads (root_id);

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.all_auth', 'A');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.all_users', 'U');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.all_orgs', 'O');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.all_sessions', 'S');


INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.all_devices', 'D');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.all_endpoints', 'E');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.all_files', 'F');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.dirs', 'DR');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.relations', 'R');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.audits', 'AD');

-- Down Migration
DROP TABLE IF EXISTS pzero.endpoints;

DROP TABLE IF EXISTS pzero.sessions;

DROP TABLE IF EXISTS pzero.users;

DROP TABLE IF EXISTS pzero.devices;

DROP TABLE IF EXISTS pzero.files;

DROP TABLE IF EXISTS pzero.dirs;

DROP TABLE IF EXISTS pzero.orgs;

DROP TABLE IF EXISTS pzero.relations;

DROP TABLE IF EXISTS pzero.audits;

DROP TABLE IF EXISTS pzero.txns;

DROP TABLE IF EXISTS pzero.auth;

DROP TABLE IF EXISTS pzero.mmn;

DROP TYPE if EXISTS pzero.file_unit;

DROP TYPE if EXISTS pzero.file_type;

DROP TYPE if EXISTS pzero.relation_type;

DROP TYPE if EXISTS pzero.device_type;

DROP TYPE if EXISTS pzero.session_type;

DROP TYPE if EXISTS pzero.session_status;

DROP TYPE if EXISTS pzero.device_status;

DROP TYPE if EXISTS pzero.user_status;

DROP TYPE if EXISTS pzero.method;

DROP TYPE if EXISTS pzero.location;

DROP TYPE if EXISTS pzero.address;

DROP TYPE if EXISTS pzero.org_status;

DROP TYPE if EXISTS pzero.endpoint_status;

DROP DOMAIN if EXISTS pzero.key_values;

DROP DOMAIN if EXISTS pzero.iid;

DROP DOMAIN if EXISTS pzero.id;

DROP DOMAIN if EXISTS pzero.mmn_type;

DROP SCHEMA if EXISTS pzero cascade;
