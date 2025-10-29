-- Up Migration
CREATE SCHEMA if NOT EXISTS pzero;

CREATE DOMAIN pzero.uuid AS ulid;

CREATE DOMAIN pzero.id AS pzero.uuid;

CREATE DOMAIN pzero.iid AS pzero.id;

CREATE DOMAIN pzero.data AS jsonb;

-- Create alias for ULID generation to maintain consistent API
CREATE OR REPLACE FUNCTION pzero.gen_ulid () returns pzero.uuid AS $$
    SELECT gen_ulid()::pzero.UUID;
$$ language sql volatile;

CREATE OR REPLACE FUNCTION pzero.gen_monotonic_id () returns pzero.uuid AS $$
    SELECT gen_monotonic_ulid()::pzero.UUID;
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

;

CREATE DOMAIN pzero.valid_col_name AS varchar(100) NOT NULL CHECK (value ~* '^[A-Za-z0-9_]+$');

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

CREATE TYPE dir.status AS enum('CORRUPTED',)
CREATE TYPE pzero.org_status AS pzero.endpoint_status
CREATE TYPE pzero.subscriber_tier_level AS enum('FREE', 'ENTERPRISE')
CREATE TYPE pzero.domain AS text;

CREATE TYPE oauth_provider AS enum('GITHUB', 'GOOGLE', 'MICROSOFT');

-- OB - OWNED BY, PC - PARENT-CHILD, PP - PEER-PEER, EXTEND-PARENT,CLONED-OBJECT, LINKED-OBJECT, ROOT-OBJECT, RELATED, REPLACED-OBJECT, Admined-by, member-of
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

CREATE TABLE pzero.txns (
  id bigint PRIMARY KEY NOT NULL,
  c_by pzero.id NOT NULL reference pzero.auth (id),
  c_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pzero_txns_c_at_by ON pzero.txns (c_at, c_by);

CREATE TABLE pzero.relations (
  uuid1 pzero.uuid NOT NULL,
  uuid2 pzero.uuid NOT NULL,
  relation pzero.relation_type NOT NULL,
  is_del boolean DEFAULT FALSE,
  last_seen timestampz NOT NULL DEFAULT now(),
  PRIMARY KEY (uuid1, uuid2)
);

CREATE INDEX idx_pzero_relations_uuid2 ON pzero.relations (uuid2);

CREATE TABLE pzero.audits (
  id pzero.id NOT NULL DEFAULT pzero.gen_monotonic_ulid () PRIMARY KEY,
  mmn pzero.mmn_type NOT NULL,
  txn_id pzero.id NOT NULL REFERENCES pzero.txns (id) ON DELETE CASCADE,
  row_id pzero.id NOT NULL,
  col_name text NOT NULL,
  new_value text,
  is_del boolean DEFAULT FALSE
);

CREATE INDEX idx_pzero_audits_mmn ON pzero.audits (mmn);

CREATE INDEX idx_pzero_audits_row_id ON pzero.audits (mmn, row_id);

CREATE INDEX idx_pzero_audits_txn_id ON pzero.audits (txn_id);

CREATE OR REPLACE FUNCTION pzero.add_audit_columns_to_table_plv8 () returns event_trigger AS $$
  var ddl_commands = plv8.execute(
        "SELECT object_identity FROM pg_event_trigger_ddl_commands() WHERE command_tag = 'CREATE TABLE'"
  );
  var exc_tables = ['pzero.txns', 'pzero.audits'];

  for (var i = 0; i < ddl_commands.length; i++) {
    var obj_name = ddl_commands[i].object_identity;
    if ((obj_name.startsWith('pzero.') || (exc_tables.indexOf(obj_name) !== -1)) {
      continue;
    }
    plv8.log("adding c_at for table",obj_name);
    var audit_col_exists = plv8.execute(
      "SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'c_at'", [obj_name]
    );
      
    // If the query returns an empty array, the column does not exist
    if (audit_col_exists.length === 0) {
      var alter_sql = "ALTER TABLE " + plv8.quote_ident(obj_name) + " ADD COLUMN c_at TIMESTAMPZ  GENERATED ALWAYS AS (id::timestamp  AT TIME ZONE 'UTC') STORED";
      plv8.execute(alter_sql);
    }
  }
$$ language plv8;

CREATE EVENT TRIGGER on_table_creation_trigger ON ddl_command_end WHEN tag IN ('CREATE TABLE')
EXECUTE function pzero.add_audit_columns_to_table_plv8 ();

CREATE TABLE pzero.auth (
  id ulid NOT NULL DEFAULT pzero.gen_monotonic_id () PRIMARY KEY,
  password text,
  oauth_provider oauth_provider,
  oauth_id text,
  email text UNIQUE NOT NULL,
  phone text UNIQUE,
  email_verified boolean NOT NULL DEFAULT FALSE,
  phone_verified boolean NOT NULL DEFAULT FALSE,
  status pzero.user_status NOT NULL DEFAULT pzero.user_status.pending
);

CREATE INDEX idx_pzero_auth_email ON pzero.auth USING gin (email gin_trgm_ops);

CREATE INDEX idx_pzero_is_del ON pzero.auth (is_del);

CREATE TABLE pzero.base_table (
  id NOT NULL DEFAULT pzero.gen_monotonic_id (),
  name pzero.valid_handle NOT NULL,
  is_del boolean DEFAULT FALSE,
  dscr text,
  data pzero.data
);

CREATE TABLE pzero.loc_base_table (
  loc pzero.location,
  last_seen timestampz NOT NULL DEFAULT now()
) inherits (pzero.base_table);

CREATE TABLE pzero.effective_table (eff_from timestamptz, eff_to timestamptz);

CREATE TABLE pzero.users (
  id pzero.iid NOT NULL PRIMARY KEY REFERENCES pzero.auth (id) ON DELETE CASCADE,
  avatar text,
  status pzero.user_status
) inherits (pzero.loc_base_table);

CREATE INDEX idx_pzero_users_name ON pzero.users USING gin (name gin_trgm_ops);

CREATE INDEX idx_pzero_users_is_del ON pzero.users (is_del);

CREATE INDEX idx_pzero_users_loc ON pzero.users USING gin (loc gin_trgm_ops);

CREATE INDEX idx_pzero_users_status ON pzero.users (status);

CREATE TABLE pzero.orgs (
  website pzero.domain UNIQUE,
  favicon text,
  whitelisted_domains pzero.domain[],
  blacklisted_domains pzero.domain[],
  headers pzero.key_values,
  variables pzero.key_values,
  status pzero.org_status,
  PRIMARY KEY (id)
) inherits (pzero.loc_base_table);

CREATE INDEX idx_pzero_orgs_name ON pzero.org (name);

CREATE INDEX idx_pzero_orgs_name_gin ON pzero.orgs USING gin (name gin_trgm_ops);

CREATE INDEX idx_pzero_orgs_is_del ON pzero.orgs (is_del);

CREATE INDEX idx_pzero_orgs_status ON pzero.status (status);

CREATE INDEX idx_pzero_orgs_loc ON pzero.users USING gin (loc gin_trgm_ops);

CREATE TABLE pzero.active_sessions (
  id pzero.id NOT NULL PRIMARY KEY,
  ip text,
  user_agent text
) inherits (pzero.loc_base_table);

CREATE INDEX idx_pzero_active_sessions_c_by ON pzero.active_sessions (c_by);

CREATE INDEX idx_pzero_orgs_loc ON pzero.users USING gin (loc gin_trgm_ops);

CREATE TABLE pzero.sessions (
  id pzero.id NOT NULL PRIMARY KEY,
  status pzero.session_status
) inherits (pzero.sessions);

CREATE TABLE pzero.devices (
  info pzero.data,
  is_primary boolean DEFAULT FALSE,
  device_type pzero.device_type DEFAULT pzero.device_type.other,
  is_verifier boolean DEFAULT FALSE,
  device_status pzero.device_status DEFAULT pzero.device_status.unknown,
  duration_used bigint DEFAULT 0, -- total duration used in microseconds
  PRIMARY KEY (id)
) inherits (pzero.loc_base_table);

CREATE INDEX idx_pzero_devices_uid ON pzero.devices (uid);

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
  last_seen timestampz NOT NULL DEFAULT now(),
  status pzero.dir_status PRIMARY KEY (id)
) inherits (pzero.base_table)
CREATE UNIQUE INDEX idx_pzero_dirs_parent ON pzero.dirs (parent_id, name, is_act);

CREATE INDEX idx_pero_dirs_status ON pzero.dirs (status);

CREATE TABLE pzero.files (
  dir_id pzero.id REFERENCES pzero.dirs (id) ON DELETE CASCADE,
  file_type pzero.file_type NOT NULL,
  file_size bigint NOT NULL, -- rounded off by 100
  file_unit pzero.file_unit NOT NULL,
  last_seen timestampz NOT NULL DEFAULT now() is_act boolean NOT NULL DEFAULT TRUE,
  status pzero.dir_status PRIMARY KEY (id)
) inherits (pzero.base_table);

CREATE UNIQUE INDEX idx_pzero_files ON pzero.files (dir_id, name, is_act);

CREATE INDEX idx_pzero_files_status ON pzero.files (status)
CREATE TABLE pzero.thread_heads (
  id pzero.id NOT NULL PRIMARY KEY,
  epid pzero.id NOT NULL REFERENCES pzero.endpoints (id),
  uid pzero.id NOT NULL REFERENCES pzero.auth (id),
  status pzero.endpoint_status,
  -- that started the thread
  data pzero.data
);

CREATE UNIQUE INDEX idx_threads_epid ON pzero.thread_heads (epid);

CREATE UNIQUE INDEX idx_threads_uid ON pzero.thread_heads (uid);

CREATE TABLE pzero.threads (
  id pzero.id NOT NULL PRIMARY KEY,
  -- that started the thread
  root_id pzero.id NOT NULL REFERENCES pzero.threads (id),
  status pzero.endpoint_status,
  data pzero.data
);

CREATE INDEX idx_threads_root ON pzero.threads (root_id);

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.auth', 'A');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.users', 'U');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.orgs', 'O');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.sessions', 'S');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.active_sessions', 'AS');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.devices', 'D');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.endpoints', 'E');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.files', 'F');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.dirs', 'D');

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
