-- Up Migration
CREATE EXTENSION if NOT EXISTS plpython3u;

CREATE EXTENSION if NOT EXISTS pgx_ulid;

CREATE EXTENSION if NOT EXISTS hstore;

CREATE EXTENSION if NOT EXISTS citext;

CREATE EXTENSION if NOT EXISTS pgcrypto;

CREATE EXTENSION if NOT EXISTS pg_trgm;

CREATE EXTENSION if NOT EXISTS postgis;

CREATE SCHEMA if NOT EXISTS pzero;

CREATE TABLE IF NOT EXISTS pzero.global_vars (name text PRIMARY KEY, value text);

INSERT INTO
  pzero.global_vars (name, value)
VALUES
  ('version', '01-01')
ON CONFLICT (name) DO UPDATE
SET
  value = excluded.value;

CREATE DOMAIN pzero.uuid AS ulid;

CREATE DOMAIN pzero.id AS pzero.uuid;

CREATE DOMAIN pzero.iid AS pzero.id;

CREATE DOMAIN pzero.data AS jsonb;

-- Create ULID generation functions using pgx_ulid extension
CREATE OR REPLACE FUNCTION pzero.gen_ulid () returns pzero.uuid AS $$
    SELECT gen_ulid()::pzero.uuid;
$$ language sql volatile;

CREATE OR REPLACE FUNCTION pzero.gen_monotonic_id () returns pzero.uuid AS $$
    SELECT gen_monotonic_ulid()::pzero.uuid;
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

CREATE OR REPLACE FUNCTION pzero.create_tables_post () returns event_trigger AS $$
DECLARE
    obj_name text;
    v_schema_name text;
    v_table_name text;
    id_col_exists integer;
    audit_col_exists integer;
    alter_sql text;
BEGIN
  FOR obj_name IN SELECT object_identity FROM pg_event_trigger_ddl_commands() WHERE command_tag = 'CREATE TABLE'
  LOOP
    RAISE NOTICE 'Processing table: %', obj_name;

    -- Parse schema and table name
    IF obj_name LIKE '%.%' THEN
        v_schema_name := split_part(obj_name, '.', 1);
        v_table_name := split_part(obj_name, '.', 2);
    ELSE
        CONTINUE;
    END IF;

    -- Only process tables with 'all_' prefix in pzero schema
    IF v_schema_name != 'pzero' OR NOT v_table_name LIKE 'all_%' THEN
        RETURN;
    END IF;
    
    DECLARE
      partition_table_name text;
      is_act_col_exists integer;
      is_del_col_exists integer;
      partition_sql text;
      relation_col_exists integer;
      bit_value integer;
      bitwise_index_sql text;
      c_at_col_exists integer;
      alter_sql text;
    BEGIN
      -- Remove 'all_' prefix to get partition table name
      partition_table_name := substring(v_table_name from 5);
      
      -- Check for is_act and is_del columns
      SELECT 1 INTO is_act_col_exists FROM information_schema.columns 
      WHERE table_schema = v_schema_name AND table_name = v_table_name AND column_name = 'is_act';
      
      SELECT 1 INTO is_del_col_exists FROM information_schema.columns 
      WHERE table_schema = v_schema_name AND table_name = v_table_name AND column_name = 'is_del';
      
      -- Check for c_at column
      SELECT 1 INTO c_at_col_exists FROM information_schema.columns 
      WHERE table_schema = v_schema_name AND table_name = v_table_name AND column_name = 'c_at';

      begin
        -- Create index on c_at if it exists
        IF NOT c_at_col_exists IS NOT NULL THEN
          alter_sql := format('ALTER TABLE %s.%s ADD COLUMN c_at TIMESTAMPTZ GENERATED ALWAYS AS (id::timestamp AT TIME ZONE ''UTC'') STORED', 
                                v_schema_name, v_table_name);
          EXECUTE alter_sql;
          RAISE NOTICE 'Alter table %.%: %', v_schema_name, v_table_name, alter_sql;
        END IF;
      exception when others then
        RAISE WARNING 'Error adding column c_at for %.%: %', v_schema_name, v_table_name, SQLERRM;
      end;

      -- Check if partition table already exists
      DECLARE
        partition_exists integer;
      BEGIN
        SELECT 1 INTO partition_exists FROM pg_tables 
        WHERE schemaname = v_schema_name AND tablename = partition_table_name;
        
        -- Create partition table based on column existence only if it doesn't exist
        IF partition_exists IS NULL THEN
            IF is_act_col_exists IS NOT NULL THEN
                partition_sql := format('CREATE TABLE %s.%s PARTITION OF %s FOR VALUES IN (TRUE)', 
                                      v_schema_name, partition_table_name, obj_name);
                EXECUTE partition_sql;
                RAISE NOTICE 'Created partition table %.% for is_act = TRUE', v_schema_name, partition_table_name;
            ELSIF is_del_col_exists IS NOT NULL THEN
                partition_sql := format('CREATE TABLE %s.%s PARTITION OF %s FOR VALUES IN (FALSE)', 
                                      v_schema_name, partition_table_name, obj_name);
                EXECUTE partition_sql;
                RAISE NOTICE 'Created partition table %.% for is_del = FALSE', v_schema_name, partition_table_name;
            END IF;
          END IF;
      END;
      
      -- Create bitwise indexes for relations table
      IF v_table_name = 'all_relations' THEN
        -- Check if relation column exists in the partition table
        SELECT 1 INTO relation_col_exists FROM information_schema.columns 
        WHERE table_schema = v_schema_name AND table_name = partition_table_name AND column_name = 'relation';
        
        IF relation_col_exists IS NOT NULL THEN
          -- Create bitwise indexes for powers of 2 from 2 to 2048
          bit_value := 2;
          WHILE bit_value <= 8192 LOOP
              BEGIN
                  bitwise_index_sql := format('CREATE INDEX IF NOT EXISTS idx_%s_%s_%s ON %s.%s (relation) WHERE (relation & %s) = %s', 
                                      v_schema_name, partition_table_name, bit_value, v_schema_name, partition_table_name, bit_value, bit_value);
                  EXECUTE bitwise_index_sql;
                  RAISE NOTICE 'Created bitwise index for relation & % on %.%', bit_value, v_schema_name, partition_table_name;
              EXCEPTION WHEN others THEN
                  RAISE WARNING 'Error creating bitwise index for % on %.%: %', bit_value, v_schema_name, partition_table_name, SQLERRM;
              END;
              bit_value := bit_value * 2;
          END LOOP;
        END IF;
      END IF;
    END;
  END LOOP;
END;
$$ language plpgsql;

CREATE EVENT TRIGGER on_table_creation_trigger ON ddl_command_end WHEN tag IN ('CREATE TABLE')
EXECUTE function pzero.create_tables_post ();

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
  UNIQUE (id, is_act),
  UNIQUE (email, is_act),
  UNIQUE (phone, is_act)
)
PARTITION BY
  list (is_act);

CREATE INDEX idx_pzero_auth_email ON pzero.auth USING gin (email gin_trgm_ops);

CREATE TABLE pzero.all_relations (
  id pzero.id NOT NULL DEFAULT pzero.gen_monotonic_id (),
  uuid1 pzero.uuid NOT NULL,
  uuid2 pzero.uuid NOT NULL,
  relation smallint NOT NULL,
  is_act boolean DEFAULT FALSE,
  data pzero.data,
  PRIMARY KEY (uuid1, uuid2, is_act)
)
PARTITION BY
  list (is_act);

CREATE INDEX idx_pzero_relations_uuid2 ON pzero.relations (uuid2);

-- Bitwise indexes will be created automatically by event trigger
CREATE TABLE pzero.txns (
  id bigint PRIMARY KEY NOT NULL,
  c_by pzero.id NOT NULL,
  c_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pzero_txns_c_at_by ON pzero.txns (c_by, c_at);

CREATE TABLE pzero.base_table (
  name pzero.valid_handle NOT NULL,
  is_del boolean DEFAULT FALSE,
  dscr text,
  data pzero.data,
  is_act boolean NOT NULL DEFAULT TRUE
);

CREATE TABLE pzero.id_base_table (
  id pzero.id NOT NULL DEFAULT pzero.gen_monotonic_id ()
) inherits (pzero.base_table);

CREATE TABLE pzero.loc_base_table (loc pzero.location) inherits (pzero.base_table);

CREATE TABLE pzero.id_base_loc_table (
  id pzero.id NOT NULL DEFAULT pzero.gen_monotonic_id ()
) inherits (pzero.loc_base_table);

CREATE TABLE pzero.base_effective_table (eff_from timestamptz, eff_to timestamptz);

-- Note: Removed plv8-based trigger function for now
-- Can be re-added when plv8 extension is available
CREATE TABLE pzero.all_audits (
  id pzero.id NOT NULL DEFAULT pzero.gen_monotonic_id (),
  mmn pzero.mmn_type NOT NULL,
  txn_id bigint NOT NULL REFERENCES pzero.txns (id) ON DELETE CASCADE,
  row_id pzero.id, -- if null then it should be table alter
  cno smallint NOT NULL,
  cval text,
  is_del boolean DEFAULT FALSE,
  data pzero.data,
  PRIMARY KEY (id, is_del)
)
PARTITION BY
  list (is_del);

CREATE INDEX idx_pzero_audits_row_id ON pzero.audits (mmn, row_id);

CREATE INDEX idx_pzero_audits_txn_id ON pzero.audits (txn_id);

CREATE TABLE pzero.all_users (
  LIKE pzero.loc_base_table including defaults including constraints,
  id pzero.id NOT NULL,
  avatar text,
  status pzero.user_status,
  online_status pzero.user_online_status,
  last_seen timestamptz,
  PRIMARY KEY (id, is_act),
  FOREIGN key (id, is_act) REFERENCES pzero.all_auth (id, is_act) ON DELETE CASCADE
)
PARTITION BY
  list (is_act);

-- Indexes will be created automatically by event trigger
CREATE TABLE pzero.all_orgs (
  LIKE pzero.id_base_loc_table including defaults including constraints,
  website pzero.domain,
  favicon text,
  whitelisted_domains pzero.domain[],
  blacklisted_domains pzero.domain[],
  headers pzero.key_values,
  variables pzero.key_values,
  status pzero.org_status,
  subscriber_tier_level pzero.subscriber_tier_level DEFAULT 'FREE',
  subscriber_tier_expiry timestamptz,
  PRIMARY KEY (id, is_act),
  UNIQUE (name, is_act),
  UNIQUE (website, is_act)
)
PARTITION BY
  list (is_act);

-- Indexes will be created automatically by event trigger
CREATE TABLE pzero.all_sessions (
  LIKE pzero.id_base_loc_table including defaults including constraints,
  ip text,
  user_agent text,
  status pzero.session_status
)
PARTITION BY
  list (is_act);

CREATE TABLE pzero.all_devices (
  LIKE pzero.id_base_loc_table including defaults including constraints,
  is_primary boolean DEFAULT FALSE,
  device_type pzero.device_type DEFAULT 'OTHER',
  is_verifier boolean DEFAULT FALSE,
  device_status pzero.device_status DEFAULT 'UNKNOWN',
  duration_used bigint DEFAULT 0, -- total duration used in microseconds
  uid pzero.id,
  UNIQUE (is_primary, uid, is_act),
  PRIMARY KEY (id, is_act)
)
PARTITION BY
  list (is_act);

CREATE TABLE pzero.all_endpoints (
  LIKE pzero.id_base_loc_table including defaults including constraints,
  url pzero.domain NOT NULL,
  status pzero.endpoint_status NOT NULL DEFAULT 'PENDING',
  methods pzero.method[] NOT NULL,
  headers pzero.key_values,
  variables pzero.key_values,
  PRIMARY KEY (id, is_act),
  UNIQUE (url, is_act)
)
PARTITION BY
  list (is_act);

CREATE TABLE pzero.all_dirs (
  LIKE pzero.id_base_table including defaults including constraints,
  status pzero.dir_status,
  PRIMARY KEY (id, is_act),
)
PARTITION BY
  list (is_act);

CREATE UNIQUE INDEX idx_pzero_dirs_parent ON pzero.dirs (name, is_act);

CREATE INDEX idx_pzero_dirs_status ON pzero.all_dirs (status);

CREATE TABLE pzero.all_files (
  LIKE pzero.all_dirs including defaults including constraints,
  file_type pzero.file_type NOT NULL,
  file_size bigint NOT NULL, -- rounded off by 100
  file_unit pzero.file_unit NOT NULL,
  PRIMARY KEY (id, is_act),
)
PARTITION BY
  list (is_act);

CREATE INDEX idx_pzero_files_status ON pzero.files (status);

CREATE TABLE pzero.all_thread_heads (
  id pzero.id NOT NULL,
  is_act boolean NOT NULL DEFAULT TRUE,
  status pzero.session_status,
  -- that started the thread
  data pzero.data,
  PRIMARY KEY (id, is_act)
)
PARTITION BY
  list (is_act);

CREATE TABLE pzero.all_threads (
  LIKE pzero.all_thread_heads including defaults including constraints,
  root_id pzero.id NOT NULL,
  PRIMARY KEY (id, is_act),
  FOREIGN key (root_id, is_act) REFERENCES pzero.all_thread_heads (id, is_act) ON DELETE CASCADE
)
PARTITION BY
  list (is_act);

CREATE INDEX idx_threads_root ON pzero.all_threads (root_id, c_at);

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
  ('pzero.all_dirs', 'DR');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.all_relations', 'R');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.all_audits', 'AD');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.all_thread_heads', 'TH');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('pzero.all_threads', 'T');

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
