-- Up Migration
CREATE SCHEMA IF NOT EXISTS pzero;

CREATE DOMAIN PZERO.UUID AS ulid;
CREATE DOMAIN PZERO.ID AS PZERO.UUID;
CREATE DOMAIN PZERO.IID AS PZERO.ID;
CREATE DOMAIN PZERO.DATA AS JSONB;

-- Create alias for ULID generation to maintain consistent API
CREATE OR REPLACE FUNCTION pzero.gen_ulid() RETURNS pzero.UUID AS $$
    SELECT gen_ulid()::pzero.UUID;
$$ LANGUAGE SQL VOLATILE;

CREATE OR REPLACE FUNCTION pzero.gen_monotonic_id() RETURNS pzero.UUID AS $$
    SELECT gen_monotonic_ulid()::pzero.UUID;
$$ LANGUAGE SQL VOLATILE;

CREATE OR REPLACE FUNCTION pzero.is_valid_email(text) RETURNS boolean AS $$
    BEGIN
        RETURN $1 ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$';
    END;
    $$ LANGUAGE plpgsql;

CREATE DOMAIN pzero.email AS TEXT
CHECK (
  VALUE ~* '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
);

CREATE DOMAIN pzero.VALID_HANDLE AS VARCHAR(25)
  NOT NULL
  CHECK (VALUE ~* '^[A-Za-z0-9._\-]+$');
;
CREATE DOMAIN pzero.VALID_COL_NAME AS VARCHAR(100)
  NOT NULL
  CHECK (VALUE ~* '^[A-Za-z0-9_]+$');

CREATE TYPE PZERO.ADDRESS  AS (
  STREET TEXT,
  CITY TEXT,
  STATE TEXT,
  ZIPCODE TEXT,
  COUNTRY TEXT
);
CREATE TYPE PZERO.METHOD AS ENUM ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS');
CREATE TYPE pzero.LOCATION AS (
  ADDRESS pzero.ADDRESS,
  LAT INT,
  LON INT,
  ALT INT
);

CREATE DOMAIN pzero.MMN_TYPE AS CHAR(3);
CREATE TYPE PZERO.USER_STATUS AS ENUM ('ACTIVE', 'INACTIVE', 'BANNED', 'DELETED', 'PENDING');
CREATE TYPE PZERO.DEVICE_STATUS AS ENUM ('ACTIVE', 'INACTIVE', 'LOST', 'UNKNOWN');
CREATE DOMAIN PZERO.KEY_VALUES AS HSTORE;
CREATE TYPE PZERO.SESSION_STATUS AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');
CREATE TYPE PZERO.SESSION_TYPE AS ENUM ('WEB', 'MOBILE', 'API', 'OTHER');
CREATE TYPE PZERO.DEVICE_TYPE AS ENUM ('MOBILE', 'TABLET', 'DESKTOP', 'LAPTOP', 'OTHER');
CREATE TYPE PZERO.ENDPOINT_STATUS AS ENUM (
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
CREATE TYPE DIR.STATUS AS ENUM (
  'CORRUPTED',
)
CREATE TYPE PZERO.ORG_STATUS AS PZERO.ENDPOINT_STATUS
CREATE TYPE PZERO.SUBSCRIBER_TIER_LEVEL AS ENUM (
  'FREE',
  'ENTERPRISE'
)
create type pzero.domain as TEXT;
CREATE TYPE OAUTH_PROVIDER AS ENUM ('GITHUB', 'GOOGLE', 'MICROSOFT');
-- OB - OWNED BY, PC - PARENT-CHILD, PP - PEER-PEER, EXTEND-PARENT,CLONED-OBJECT, LINKED-OBJECT, ROOT-OBJECT, RELATED, REPLACED-OBJECT, Admined-by, member-of
CREATE TYPE pzero.RELATION_TYPE AS ENUM('OB', 'PC', 'PP', 'EP', 'CO', 'LO', 'RO', 'RL', 'RP', 'AB');
CREATE TYPE pzero.FILE_TYPE AS ENUM('.png', '.gif', '.mp4', '.txt', '.pdf');
CREATE TYPE pzero.FILE_UNIT AS ENUM ('B','KB','MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB');

CREATE TABLE pzero.MMN (
  mmn pzero.MMN_TYPE unique primary key,
  table_name pzero.VALID_HANDLE unique
);

CREATE TABLE pzero.TXNS(
  ID BIGINT PRIMARY KEY NOT NULL,
  C_BY pzero.ID NOT NULL REFERENCE pzero.auth(id),
  C_AT TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pzero_txns_c_at_by ON pzero.txns ( c_at, c_by);

CREATE TABLE pzero.relations (
  UUID1 pzero.uuid not null,
  UUID2 pzero.uuid not null,
  relation pzero.RELATION_TYPE NOT NULL,
  IS_DEL BOOLEAN DEFAULT FALSE,
  last_seen timestampz not null default now(),
  primary key (UUID1,UUID2)
);
CREATE INDEX idx_pzero_relations_uuid2 ON pzero.relations (UUID2);

CREATE TABLE pzero.audits (
  id pzero.ID NOT NULL DEFAULT pzero.gen_monotonic_ulid() PRIMARY KEY,
  mmn pzero.MMN_TYPE NOT NULL,
  txn_id pzero.ID NOT NULL REFERENCES pzero.txns(id) ON DELETE CASCADE,
  row_id pzero.ID NOT NULL,
  col_name TEXT NOT NULL,
  new_value TEXT,
  is_del BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_pzero_audits_mmn ON pzero.audits (mmn);
CREATE INDEX idx_pzero_audits_row_id ON pzero.audits (mmn,row_id);
CREATE INDEX idx_pzero_audits_txn_id ON pzero.audits (txn_id);

CREATE OR REPLACE FUNCTION pzero.add_audit_columns_to_table_plv8()
  RETURNS event_trigger AS $$
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
$$ LANGUAGE plv8;

CREATE EVENT TRIGGER on_table_creation_trigger
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE')
  EXECUTE FUNCTION pzero.add_audit_columns_to_table_plv8();

CREATE TABLE pzero.auth (
  id ulid NOT NULL DEFAULT pzero.gen_monotonic_id() PRIMARY KEY,
  PASSWORD TEXT,
  oauth_provider OAUTH_PROVIDER,
  oauth_id TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  EMAIL_VERIFIED BOOLEAN NOT NULL DEFAULT FALSE,
  PHONE_VERIFIED BOOLEAN NOT NULL DEFAULT FALSE,
  status PZERO.USER_STATUS NOT NULL DEFAULT PZERO.USER_STATUS.PENDING
);
create index idx_pzero_auth_email on pzero.auth using gin (email gin_trgm_ops);
create index idx_pzero_is_del on pzero.auth (is_del);

CREATE TABLE pzero.BASE_TABLE
(
  id not null default pzero.gen_monotonic_id(),
  NAME pzero.VALID_HANDLE NOT NULL,
  IS_DEL BOOLEAN DEFAULT FALSE,
  DSCR TEXT,
  DATA pzero.data
);
CREATE TABLE pzero.LOC_BASE_TABLE (
  LOC pzero.LOCATION,
  last_seen TIMESTAMPZ not null default now()
) INHERITS (pzero.BASE_TABLE);

CREATE TABLE pzero.EFFECTIVE_TABLE (
  EFF_FROM TIMESTAMPTZ ,
  EFF_TO TIMESTAMPTZ
);
CREATE TABLE pzero.users (
  id pzero.IID NOT NULL PRIMARY KEY REFERENCES pzero.auth(id) ON DELETE CASCADE,
  avatar TEXT,
  status pzero.USER_STATUS
) INHERITS (pzero.LOC_BASE_TABLE);
CREATE INDEX idx_pzero_users_name ON pzero.users USING gin (name gin_trgm_ops);
CREATE INDEX idx_pzero_users_is_del ON pzero.users (is_del);
CREATE INDEX idx_pzero_users_loc ON pzero.users using gin (loc gin_trgm_ops);
CREATE INDEX idx_pzero_users_status on pzero.users (status);

CREATE TABLE pzero.orgs (
  website pzero.domain unique,
  favicon TEXT,
  whitelisted_domains pzero.domain[],
  blacklisted_domains pzero.domain[],
  headers PZERO.KEY_VALUES,
  variables PZERO.KEY_VALUES,
  status pzero.org_status,
  primary key (id)
) INHERITS (pzero.LOC_BASE_TABLE);
CREATE INDEX idx_pzero_orgs_name on pzero.org(name);
CREATE INDEX idx_pzero_orgs_name_gin ON pzero.orgs USING gin (name gin_trgm_ops);
CREATE INDEX idx_pzero_orgs_is_del ON pzero.orgs (is_del);
CREATE INDEX idx_pzero_orgs_status on pzero.status(status);
CREATE INDEX idx_pzero_orgs_loc ON pzero.users using gin (loc gin_trgm_ops);

CREATE TABLE pzero.active_sessions (
  id pzero.ID NOT NULL PRIMARY KEY,
  ip TEXT,
  user_agent TEXT
) INHERITS (pzero.LOC_BASE_TABLE);
CREATE INDEX idx_pzero_active_sessions_c_by ON pzero.active_sessions (c_by);
CREATE INDEX idx_pzero_orgs_loc ON pzero.users using gin (loc gin_trgm_ops);

CREATE TABLE pzero.sessions (
  id pzero.ID NOT NULL PRIMARY KEY,
  status pzero.session_status
) INHERITS (pzero.sessions);

CREATE TABLE pzero.devices (
  info pzero.data,
  is_primary BOOLEAN DEFAULT FALSE,
  device_type PZERO.DEVICE_TYPE DEFAULT PZERO.DEVICE_TYPE.OTHER,
  is_verifier BOOLEAN DEFAULT FALSE,
  device_status PZERO.DEVICE_STATUS DEFAULT PZERO.DEVICE_STATUS.UNKNOWN,
  duration_used BIGINT DEFAULT 0, -- total duration used in microseconds
  primary key (id)
) INHERITS (pzero.LOC_BASE_TABLE);
CREATE INDEX idx_pzero_devices_uid ON pzero.devices (uid);

CREATE TABLE pzero.endpoints (
  url pzero.domain NOT NULL UNIQUE,
  status PZERO.ENDPOINT_STATUS NOT NULL DEFAULT PZERO.ENDPOINT_STATUS.PENDING,
  methods PZERO.METHOD[]  NOT NULL,
  headers PZERO.KEY_VALUES,
  variables PZERO.KEY_VALUES,
  primary key(id)
) INHERITS (pzero.LOC_BASE_TABLE);

CREATE TABLE pzero.dirs (
  PARENT_ID pzero.ID REFERENCES pzero.dirs(id) ON DELETE CASCADE,
  is_act boolean not null default true,
  last_seen timestampz not null default now(),
  status pzero.DIR_STATUS
  primary key(id)
) INHERITS (pzero.BASE_TABLE)
CREATE UNIQUE INDEX idx_pzero_dirs_parent ON pzero.dirs ( PARENT_ID, NAME, is_act);
CREATE INDEX idx_pero_dirs_status on pzero.dirs(status);

CREATE TABLE pzero.files (
  DIR_ID pzero.ID REFERENCES pzero.dirs(id) ON DELETE CASCADE,
  FILE_TYPE PZERO.FILE_TYPE NOT NULL,
  FILE_SIZE BIGINT NOT NULL, -- rounded off by 100
  FILE_UNIT PZERO.FILE_UNIT NOT NULL,
  last_seen timestampz not null default now()
  is_act boolean not null default true,
  status pzero.DIR_STATUS
  primary key(id)
) INHERITS (pzero.BASE_TABLE);
CREATE UNIQUE INDEX idx_pzero_files ON pzero.files (DIR_ID,NAME,IS_ACT);
CREATE INDEX idx_pzero_files_status on pzero.files (status)
CREATE TABLE pzero.thread_heads (
  id pzero.ID NOT NULL primary key,
  epid pzero.ID not null references pzero.endpoints(id),
  uid pzero.ID not null references pzero.auth(id),
  status pzero.ENDPOINT_STATUS,
  -- that started the thread
  data pzero.data
);
CREATE UNIQUE INDEX idx_threads_epid on pzero.thread_heads(epid);
CREATE UNIQUE INDEX idx_threads_uid on pzero.thread_heads(uid);
CREATE TABLE pzero.threads (
  id pzero.ID NOT NULL primary key,
  -- that started the thread
  root_id pzero.ID not null references pzero.threads(id),
  status pzero.ENDPOINT_STATUS,
  data pzero.data
);
CREATE INDEX idx_threads_root on pzero.threads(root_id);

insert into pzero.MMN (TABLE_NAME, MMN) values ('pzero.auth', 'A');
insert into pzero.MMN (TABLE_NAME, MMN) values ('pzero.users', 'U');
insert into pzero.MMN (TABLE_NAME, MMN) values ('pzero.orgs', 'O');
insert into pzero.MMN (TABLE_NAME, MMN) values ('pzero.sessions', 'S');
insert into pzero.MMN (TABLE_NAME, MMN) values ('pzero.active_sessions', 'AS'); 
insert into pzero.MMN (TABLE_NAME, MMN) values ('pzero.devices', 'D');
insert into pzero.MMN (TABLE_NAME, MMN) values ('pzero.endpoints', 'E');
insert into pzero.MMN (TABLE_NAME, MMN) values ('pzero.files', 'F');
insert into pzero.MMN (TABLE_NAME, MMN) values ('pzero.dirs', 'D');
insert into pzero.MMN (TABLE_NAME, MMN) values ('pzero.relations', 'R');
insert into pzero.MMN (TABLE_NAME, MMN) values ('pzero.audits', 'AD');  
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
DROP TABLE IF EXISTS pzero.MMN;

DROP TYPE IF EXISTS pzero.FILE_UNIT;
DROP TYPE IF EXISTS pzero.FILE_TYPE;
DROP TYPE IF EXISTS pzero.RELATION_TYPE;
DROP TYPE IF EXISTS PZERO.DEVICE_TYPE;
DROP TYPE IF EXISTS PZERO.SESSION_TYPE;
DROP TYPE IF EXISTS PZERO.SESSION_STATUS;
DROP TYPE IF EXISTS PZERO.DEVICE_STATUS;
DROP TYPE IF EXISTS PZERO.USER_STATUS;
DROP TYPE IF EXISTS PZERO.METHOD;
DROP TYPE IF EXISTS pzero.LOCATION;
DROP TYPE IF EXISTS pzero.ADDRESS;
DROP TYPE IF EXISTS pzero.ORG_STATUS;
DROP TYPE IF EXISTS pzero.ENDPOINT_STATUS;

DROP DOMAIN IF EXISTS PZERO.KEY_VALUES;
DROP DOMAIN IF EXISTS PZERO.IID;
DROP DOMAIN IF EXISTS PZERO.ID;
DROP DOMAIN IF EXISTS pzero.MMN_TYPE;
DROP SCHEMA IF EXISTS pzero CASCADE;