-- Up Migration
CREATE SCHEMA if NOT EXISTS pzero;

CREATE DOMAIN pzero.data AS jsonb;

CREATE TABLE IF NOT EXISTS pzero.global_vars (name text PRIMARY KEY, value text);

-- Create ULID generation functions using pgx_ulid extension
CREATE OR REPLACE FUNCTION pzero.gen_id () returns uuid AS $$
    SELECT uuidv7()::uuid;
$$ language sql volatile;

CREATE OR REPLACE FUNCTION pzero.is_valid_email (text) returns boolean AS $$
    BEGIN
      RETURN $1 ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$';
    END;
    $$ language plpgsql;

CREATE DOMAIN pzero.email AS text CHECK (
  value ~* '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
);

CREATE DOMAIN pzero.valid_name AS varchar(100) NOT NULL CHECK (value ~* '^[A-Za-z0-9._ \-]+$');

CREATE DOMAIN pzero.valid_handle AS varchar(10) NOT NULL CHECK (value ~* '^[A-Za-z0-9._\-]+$');

CREATE DOMAIN pzero.valid_part AS varchar(10) NOT NULL DEFAULT 'pzero' CHECK (value ~* '^[A-Za-z0-9 ._\-]+$');

CREATE DOMAIN pzero.valid_col_name AS varchar(25) NOT NULL CHECK (value ~* '^[A-Za-z0-9_]+$');

CREATE DOMAIN pzero.domain AS text CHECK (
  value ~ '^(https?://)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'
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
  'PENDING',
  'BLOCKED'
);

CREATE TYPE pzero.user_online_status AS enum('ONLINE', 'OOO', 'AWAY', 'BUSY', 'INACTIVE');

CREATE TYPE pzero.device_status AS enum('ACTIVE', 'INACTIVE', 'LOST', 'UNKNOWN');

CREATE DOMAIN pzero.key_values AS hstore;

CREATE TYPE pzero.session_status AS enum('ACTIVE', 'INACTIVE', 'EXPIRED');

CREATE TYPE pzero.session_type AS enum('WEB', 'MOBILE', 'API', 'OTHER');

CREATE TYPE pzero.device_type AS enum('MOBILE', 'TABLET', 'DESKTOP', 'LAPTOP', 'OTHER');

CREATE TYPE pzero.dir_status AS enum('ACTIVE', 'INACTIVE', 'DELETED', 'CORRUPTED');

CREATE TYPE pzero.from_to AS ("from" timestamptz, "to" timestamptz);

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

CREATE TYPE pzero.subscriber_tier_level AS enum('FREE', 'PAID-BASIC', 'PAID-ENTERPRISE');

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

-- Fingerprinting types
CREATE TYPE pzero.bot_type AS enum(
  'SCRAPER',
  'CRAWLER',
  'AUTOMATION',
  'ATTACK',
  'LEGITIMATE',
  'UNKNOWN'
);

CREATE TYPE pzero.risk_level AS enum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE pzero.device_intelligence_type AS enum('DESKTOP', 'MOBILE', 'TABLET', 'BOT', 'UNKNOWN');

CREATE TYPE pzero.network_intelligence_type AS enum(
  'RESIDENTIAL',
  'BUSINESS',
  'CELLULAR',
  'DATACENTER',
  'UNKNOWN'
);

CREATE TYPE pzero.fingerprint_change_significance AS enum('MINOR', 'MAJOR', 'CRITICAL');

CREATE TABLE pzero.mmn (
  mmn pzero.mmn_type UNIQUE PRIMARY KEY,
  table_name pzero.valid_col_name NOT NULL UNIQUE
);

CREATE TABLE pzero.base_table (
  name pzero.valid_name NOT NULL,
  is_del boolean DEFAULT FALSE,
  is_act boolean DEFAULT TRUE,
  dscr text,
  data pzero.data,
  tags TEXT[],
  handle pzero.valid_handle NOT NULL
);

CREATE TABLE uuid_base_table (id uuid NOT NULL DEFAULT pzero.gen_id ()) inherits (pzero.base_table);

CREATE TABLE pzero.base_loc_table (loc pzero.location) inherits (pzero.base_table);

CREATE TABLE uuid_base_loc_table (id uuid NOT NULL DEFAULT pzero.gen_id ()) inherits (pzero.base_loc_table);

CREATE TABLE pzero.base_effective_table (eff_from timestamptz, eff_to timestamptz);

CREATE TABLE pzero.domain_base (
  whitelisted_domains pzero.domain[],
  blacklisted_domains pzero.domain[],
  whitelisted_emails pzero.email[],
  blacklisted_emails pzero.email[],
  status pzero.org_status NOT NULL DEFAULT 'PENDING',
  headers pzero.key_values,
  variables pzero.key_values,
  methods pzero.method[],
  add_policy smallint NOT NULL DEFAULT 0 -- 0 explicit, 1 -- discoverable, 2 -- shareable 3 -- discoverable and shareable
);

-- TODO - when partition is dropped or renamed
CREATE TABLE pzero.schemas (
  schema pzero.valid_part NOT NULL DEFAULT 'pzero' PRIMARY KEY
);

-- Create immutable wrapper function for extracting epoch from UUIDv7
CREATE OR REPLACE FUNCTION pzero.extract_epoch (p_timestamptz timestamptz) returns bigint AS $$
    SELECT (EXTRACT(EPOCH FROM p_timestamptz) * 1000)::BIGINT;
$$ language sql immutable;

CREATE TABLE pzero.all_parts (
  part pzero.valid_part NOT NULL PRIMARY KEY,
  c_at timestamptz NOT NULL DEFAULT now(),
  tags TEXT[],
  data pzero.data
) inherits (pzero.base_table);

CREATE OR REPLACE FUNCTION pzero.create_tables_post () returns event_trigger AS $$
DECLARE
    obj_name text;
    v_schema_name text;
    v_table_name text;
    id_col_exists integer;
    audit_col_exists integer;
    alter_sql text;
    mmn text;
    no_c_at TEXT[] := ARRAY['all_audits'];
    v_schemas TEXT[];
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
    SELECT ARRAY_AGG(schema) into v_schemas from pzero.schemas;
    -- Only process tables with 'all_' prefix in pzero schema
    IF NOT (v_schema_name = ANY(v_schemas)) THEN
      RETURN;
    END IF;
    IF NOT v_table_name LIKE 'all_%' THEN
      RETURN;
    END IF;
    
    select m.mmn into mmn from pzero.mmn m where m.table_name = v_table_name;
    IF mmn IS NULL THEN
      RAISE EXCEPTION 'MMN for % does not exist', v_table_name;
    END IF;

    DECLARE
      partition_table_name text;
      is_act_col_exists integer;
      is_del_col_exists integer;
      part_col_exists integer;
      partition_sql1 text;
      partition_sql2 text;
      partition_sql3 text;
      partition_sql4 text;
      sql_suffix text;
      relation_col_exists integer;
      bit_value integer;
      bitwise_index_sql text;
      c_at_col_exists integer;
      c_id_col_exists integer;
      alter_sql text;
    BEGIN
      -- Remove 'all_' prefix to get partition table name
      partition_table_name := regexp_replace(v_table_name, '^all_', '');
      RAISE NOTICE 'partition_table_name: %', partition_table_name;
      
      -- Check for is_act and is_del columns
      SELECT 1 INTO is_act_col_exists FROM information_schema.columns 
      WHERE table_schema = v_schema_name AND table_name = v_table_name AND column_name = 'is_act';
      RAISE NOTICE 'is_act_col_exists for %.%: %', v_schema_name, v_table_name, is_act_col_exists;
      
      SELECT 1 INTO is_del_col_exists FROM information_schema.columns 
      WHERE table_schema = v_schema_name AND table_name = v_table_name AND column_name = 'is_del';
      RAISE NOTICE 'is_del_col_exists for %.%: %', v_schema_name, v_table_name, is_del_col_exists;
      
      SELECT 1 INTO part_col_exists FROM information_schema.columns 
      WHERE table_schema = v_schema_name AND table_name = v_table_name AND column_name = 'part';
      RAISE NOTICE 'part_col_exists for %.%: %', v_schema_name, v_table_name, part_col_exists;
      -- Check for id column
      SELECT 1 INTO c_id_col_exists FROM information_schema.columns c
            WHERE c.table_schema = v_schema_name AND c.table_name = v_table_name AND column_name = 'id'
            AND c.data_type IN ('uuid');
      if c_id_col_exists IS NOT NULL THEN
        -- Create index on id column
      -- Check for c_at column
        SELECT 1 INTO c_at_col_exists FROM information_schema.columns 
        WHERE table_schema = v_schema_name AND table_name = v_table_name AND column_name = 'c_at';
      end if;

      begin
        -- Create index on c_at if it exists
        IF c_id_col_exists IS NOT NULL AND c_at_col_exists IS NULL THEN
          alter_sql := format('ALTER TABLE %s.%s ADD COLUMN c_at timestamptz GENERATED ALWAYS AS (uuid_extract_timestamp(id::uuid))',
                        v_schema_name, v_table_name);
          EXECUTE alter_sql;
          RAISE NOTICE 'Alter table %.%: %', v_schema_name, v_table_name, alter_sql;
        END IF;
      exception when others then
        RAISE EXCEPTION 'Error adding column c_at for %.%: %', v_schema_name, v_table_name, SQLERRM;
      end;

      -- Check if partition table already exists
      DECLARE
        partition_exists integer;
      BEGIN
        SELECT 1 INTO partition_exists FROM pg_tables 
        WHERE schemaname = v_schema_name AND tablename = partition_table_name;
        RAISE NOTICE 'partition_exists for %.%: %', v_schema_name, partition_table_name, partition_exists;
        
        -- Create partition table based on column existence only if it doesn't exist
        IF partition_exists IS NULL THEN
          RAISE NOTICE 'partition does not exist for %', partition_table_name;
          IF is_act_col_exists IS NOT NULL THEN
            sql_suffix := 'inactive';
            RAISE NOTICE 'Found is_act column, setting suffix to inactive';
          ELSIF is_del_col_exists IS NOT NULL THEN
            sql_suffix := 'deleted';
            RAISE NOTICE 'Found is_del column, setting suffix to deleted';
          END IF;
          RAISE NOTICE 'sql_suffix is: %', sql_suffix;
          IF sql_suffix IS NOT NULL THEN
            partition_sql1 := format('CREATE TABLE %s.%s PARTITION OF %s FOR VALUES IN (TRUE)', 
                                      v_schema_name, partition_table_name, obj_name);
            partition_sql2 := format('CREATE TABLE %s.%s_%s PARTITION OF %s FOR VALUES IN (FALSE)', 
                                      v_schema_name, partition_table_name, sql_suffix, obj_name);
            IF part_col_exists IS NOT NULL THEN
              partition_sql1 :=  partition_sql1 || ' PARTITION BY LIST (part)';
              partition_sql2 :=  partition_sql2 || ' PARTITION BY LIST (part)';
              partition_sql3 :=  format('CREATE TABLE %s.%s_%s_ PARTITION OF %s.%s_%s FOR VALUES IN (''pzero'')',
                                      v_schema_name, partition_table_name, sql_suffix, v_schema_name, partition_table_name, sql_suffix);
              partition_sql4 :=  format('CREATE TABLE %s.%s_ PARTITION OF %s.%s FOR VALUES IN (''pzero'')',
                                      v_schema_name, partition_table_name, v_schema_name, partition_table_name);

            END IF;
            RAISE NOTICE 'Executing: sql1%', partition_sql1;
            EXECUTE partition_sql1;
            RAISE NOTICE 'Executing: sql2%', partition_sql2;
            EXECUTE partition_sql2;
            IF part_col_exists IS NOT NULL THEN
              RAISE NOTICE 'Executing: sql3 %', partition_sql3;
              EXECUTE partition_sql3;
              RAISE NOTICE 'Executing: sql4 %', partition_sql4;
              EXECUTE partition_sql4;
            END IF;
            RAISE NOTICE 'Created partition tables %.% and %.% with part column', v_schema_name, partition_table_name, v_schema_name, partition_table_name;
      
          -- If no suffix, create single partition table on part column if exists
          ELSIF part_col_exists IS NOT NULL THEN
            partition_sql1 := format('CREATE TABLE %s.%s_ PARTITION OF %s FOR VALUES IN (''pzero'')',
                                    v_schema_name, partition_table_name, obj_name);
            EXECUTE partition_sql1;
            RAISE NOTICE 'Created partition table %.% %s  with part column', v_schema_name, partition_table_name, obj_name;
          END IF;
        END IF;
      
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
    END;
  END LOOP;
END;
$$ language plpgsql;

CREATE EVENT TRIGGER on_table_creation_trigger ON ddl_command_end WHEN tag IN ('CREATE TABLE')
EXECUTE function pzero.create_tables_post ();

-- ============================================
-- Seed Data Migration
-- ============================================
-- Update global vars version
INSERT INTO
  pzero.global_vars (name, value)
VALUES
  ('version', '01-01')
ON CONFLICT (name) DO UPDATE
SET
  value = excluded.value;

-- ============================================
-- MMN (Mneumonic Namespace) Seeds
-- ============================================
INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_auth', 'P');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_auth', 'A');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_users', 'U');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_groups', 'G');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_orgs', 'O');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_nhs', 'N');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_sessions', 'S');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_devices', 'D');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_endpoints', 'E');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_files', 'F');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_dirs', 'DR');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_relations', 'R');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_audits', 'AD');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_thread_heads', 'TH');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_threads', 'T');

INSERT INTO
  pzero.mmn (table_name, mmn)
VALUES
  ('all_txns', 'TX');

-- ============================================
-- Schema Seeds
-- ============================================
INSERT INTO
  pzero.schemas (schema)
VALUES
  ('pzero');

-- ============================================
-- Parts Seeds
-- ============================================
INSERT INTO
  pzero.all_parts (part, name, handle)
VALUES
  ('pzero', 'pzero', 'pzero');

CREATE TABLE pzero.all_auth (
  id uuid NOT NULL DEFAULT pzero.gen_id (),
  email pzero.email NOT NULL,
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

CREATE TABLE pzero.all_orgs (
  LIKE uuid_base_loc_table including ALL,
  LIKE pzero.domain_base including ALL,
  website pzero.domain,
  favicon text,
  subscriber_tier_level pzero.subscriber_tier_level DEFAULT 'FREE',
  subscriber_tier_expiry timestamptz,
  multi_tenant boolean DEFAULT TRUE,
  part_by pzero.valid_part,
  PRIMARY KEY (id, is_act),
  UNIQUE (name, is_act),
  UNIQUE (website, is_act),
  UNIQUE (handle, is_act),
  UNIQUE (part_by, id, is_act),
  trial_period pzero.from_to
)
PARTITION BY
  list (is_act);

CREATE INDEX org_part_by_idx ON pzero.all_orgs (part_by);

CREATE TABLE pzero.base_part (
  part pzero.valid_part NOT NULL DEFAULT 'pzero' REFERENCES pzero.all_parts (part),
  org_id uuid
);

INSERT INTO
  pzero.all_auth (email, email_verified)
VALUES
  ('uma.krishnan@boardwalktech.com', TRUE);

-- Children of org are
-- nhs,
-- groups
CREATE TABLE pzero.all_relations (
  part pzero.valid_part,
  is_act boolean DEFAULT TRUE,
  uuid1 text NOT NULL,
  uuid2 text NOT NULL,
  data pzero.data,
  PRIMARY KEY (part, is_act, uuid1, uuid2)
)
PARTITION BY
  list (is_act);

CREATE INDEX idx_pzero_relations_uuid2 ON pzero.relations (part, uuid2);

CREATE INDEX idx_pzero_relations_uuid1 ON pzero.relations (part, uuid1);

-- Bitwise indexes will be created automatically by event trigger
CREATE TABLE pzero.all_txns (
  id bigint NOT NULL,
  -- we don't have foreign key check on c_by on all_auths because we don't have is_act
  c_by uuid NOT NULL,
  part pzero.valid_part,
  c_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (part, id)
)
PARTITION BY
  list (part);

CREATE INDEX idx_pzero_txns_c_by_at ON pzero.all_txns (part, c_by);

CREATE INDEX idx_pzero_txns_c_at_by ON pzero.all_txns (part, c_at);

CREATE TABLE pzero.all_audits (
  id bigserial,
  txn_id bigint,
  mmn pzero.mmn_type NOT NULL,
  row_id text, -- if null then it should be table alter
  cno smallint, -- if null and is_del = true, only valid
  cval text,
  part pzero.valid_part,
  is_del boolean DEFAULT FALSE,
  data pzero.data,
  c_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (is_del, part, id)
)
PARTITION BY
  list (is_del);

CREATE INDEX idx_pzero_audits_row_id ON pzero.audits (part, mmn, row_id);

CREATE INDEX idx_pzero_audits_cno ON pzero.audits (part, mmn, cno);

-- having users in different orgs - alls for org specific profile
-- will search for org specific user profile
-- if not found, then get pzero user
CREATE TABLE pzero.all_users (
  LIKE uuid_base_loc_table including ALL,
  LIKE pzero.base_part including ALL,
  avatar text,
  status pzero.user_status,
  online_status pzero.user_online_status,
  last_seen timestamptz,
  PRIMARY KEY (part, is_act, org_id, id),
  FOREIGN key (id, is_act) REFERENCES pzero.all_auth (id, is_act) ON DELETE CASCADE
)
PARTITION BY
  list (is_act);

-- Indexes will be created automatically by event trigger
-- orgs, device and auth are global and not entities part of org
CREATE TABLE pzero.all_groups (
  LIKE uuid_base_loc_table including ALL,
  LIKE pzero.base_part including ALL,
  PRIMARY KEY (part, is_act, org_id, id),
  FOREIGN key (part, org_id, is_act) REFERENCES pzero.all_orgs (part_by, id, is_act),
  UNIQUE (part, is_act, org_id, name)
)
PARTITION BY
  list (is_act);

CREATE TABLE pzero.all_nhs (
  LIKE uuid_base_loc_table including ALL,
  LIKE pzero.base_part including ALL,
  LIKE pzero.domain_base including ALL,
  level smallint NOT NULL DEFAULT 0,
  PRIMARY KEY (part, org_id, id, is_act),
  UNIQUE (part, org_id, name, level, is_act),
  FOREIGN key (part, org_id, is_act) REFERENCES pzero.all_orgs (part_by, id, is_act)
)
PARTITION BY
  list (is_act);

CREATE TABLE pzero.all_devices (
  LIKE uuid_base_loc_table including ALL,
  is_primary boolean DEFAULT FALSE,
  device_type pzero.device_type DEFAULT 'OTHER',
  is_verifier boolean DEFAULT FALSE,
  device_status pzero.device_status DEFAULT 'UNKNOWN',
  duration_used bigint DEFAULT 0, -- total duration used in microseconds
  uid uuid NOT NULL,
  UNIQUE (is_primary, uid, is_act),
  PRIMARY KEY (id, is_act)
)
PARTITION BY
  list (is_act);

CREATE TABLE pzero.all_endpoints (
  LIKE uuid_base_loc_table including ALL,
  LIKE pzero.domain_base including ALL,
  part pzero.valid_part,
  url pzero.domain NOT NULL,
  access_policy smallint DEFAULT 0, -- 0 private, 1 - internal, 3 - public collab 4 - public,
  PRIMARY KEY (part, is_act, id)
)
PARTITION BY
  list (is_act);

CREATE TABLE pzero.all_dirs (
  LIKE uuid_base_table including ALL,
  LIKE pzero.base_part including ALL,
  public boolean NOT NULL DEFAULT FALSE,
  status pzero.dir_status,
  PRIMARY KEY (part, org_id, id, is_act),
  FOREIGN key (part, org_id, is_act) REFERENCES pzero.all_orgs (part_by, id, is_act)
)
PARTITION BY
  list (is_act);

CREATE UNIQUE INDEX idx_pzero_dirs_parent ON pzero.dirs (part, name, is_act);

CREATE INDEX idx_pzero_dirs_status ON pzero.all_dirs (status);

CREATE TABLE pzero.all_files (
  LIKE pzero.all_dirs including ALL,
  file_type pzero.file_type NOT NULL,
  file_size bigint NOT NULL, -- rounded off by 100
  file_unit pzero.file_unit NOT NULL,
  root_id uuid,
  FOREIGN key (part, org_id, is_act, root_id) REFERENCES pzero.all_dirs (part, org_id, is_act, id)
)
PARTITION BY
  list (is_act);

CREATE INDEX idx_pzero_files_status ON pzero.files (part, is_act, status);

-- Indexes will be created automatically by event trigger
CREATE TABLE pzero.all_sessions (
  id bigserial NOT NULL,
  part pzero.valid_part NOT NULL,
  ip text,
  status pzero.session_status,
  c_at timestamptz NOT NULL DEFAULT now(),
  u_at timestamptz NOT NULL DEFAULT now(),
  is_act boolean NOT NULL DEFAULT TRUE,
  PRIMARY KEY (part, is_act, id)
)
PARTITION BY
  list (is_act);

CREATE TABLE pzero.all_thread_heads (
  id bigserial NOT NULL,
  is_act boolean NOT NULL DEFAULT TRUE,
  status pzero.session_status,
  part pzero.valid_part,
  -- that started the thread
  data pzero.data,
  c_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (part, id, is_act)
)
PARTITION BY
  list (is_act);

CREATE TABLE pzero.all_threads (
  LIKE pzero.all_thread_heads including ALL,
  root_id bigint NOT NULL,
  FOREIGN key (part, root_id, is_act) REFERENCES pzero.all_thread_heads (part, id, is_act) ON DELETE CASCADE
)
PARTITION BY
  list (is_act);

-- Drop main tables
DROP TABLE IF EXISTS pzero.all_threads;

DROP TABLE IF EXISTS pzero.all_thread_heads;

DROP TABLE IF EXISTS pzero.all_files;

DROP TABLE IF EXISTS pzero.all_dirs;

DROP TABLE IF EXISTS pzero.all_endpoints;

DROP TABLE IF EXISTS pzero.all_devices;

DROP TABLE IF EXISTS pzero.all_nhs;

DROP TABLE IF EXISTS pzero.all_sessions;

DROP TABLE IF EXISTS pzero.all_users;

DROP TABLE IF EXISTS pzero.all_orgs;

DROP TABLE IF EXISTS pzero.all_relations;

DROP TABLE IF EXISTS pzero.all_audits;

DROP TABLE IF EXISTS pzero.all_txns;

DROP TABLE IF EXISTS pzero.all_auth;

DROP TABLE IF EXISTS pzero.mmn;

-- Drop fingerprinting types
-- Drop main types
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

DROP DOMAIN if EXISTS pzero.mmn_type;

DROP SCHEMA if EXISTS pzero cascade;