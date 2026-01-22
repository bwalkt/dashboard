-- Down Migration for 01-01-create-tables.sql
-- This file contains the rollback/down migration

-- Drop main tables
DROP TABLE IF EXISTS pzero.all_threads CASCADE;
DROP TABLE IF EXISTS pzero.all_thread_heads CASCADE;
DROP TABLE IF EXISTS pzero.all_files CASCADE;
DROP TABLE IF EXISTS pzero.all_dirs CASCADE;
DROP TABLE IF EXISTS pzero.all_endpoints CASCADE;
DROP TABLE IF EXISTS pzero.all_devices CASCADE;
DROP TABLE IF EXISTS pzero.all_nhs CASCADE;
DROP TABLE IF EXISTS pzero.all_sessions CASCADE;
DROP TABLE IF EXISTS pzero.all_users CASCADE;
DROP TABLE IF EXISTS pzero.all_groups CASCADE;
DROP TABLE IF EXISTS pzero.all_orgs CASCADE;
DROP TABLE IF EXISTS pzero.all_relations CASCADE;
DROP TABLE IF EXISTS pzero.all_audits CASCADE;
DROP TABLE IF EXISTS pzero.all_txns CASCADE;
DROP TABLE IF EXISTS pzero.all_auth CASCADE;
DROP TABLE IF EXISTS pzero.all_parts CASCADE;
DROP TABLE IF EXISTS pzero.schemas CASCADE;
DROP TABLE IF EXISTS pzero.mmn CASCADE;
DROP TABLE IF EXISTS pzero.global_vars CASCADE;

-- Drop base tables
DROP TABLE IF EXISTS uuid_base_loc_table CASCADE;
DROP TABLE IF EXISTS uuid_base_table CASCADE;
DROP TABLE IF EXISTS pzero.base_loc_table CASCADE;
DROP TABLE IF EXISTS pzero.base_table CASCADE;
DROP TABLE IF EXISTS pzero.base_effective_table CASCADE;
DROP TABLE IF EXISTS pzero.domain_base CASCADE;
DROP TABLE IF EXISTS pzero.base_part CASCADE;

-- Drop event trigger
DROP EVENT TRIGGER IF EXISTS on_table_creation_trigger;

-- Drop functions
DROP FUNCTION IF EXISTS pzero.create_tables_post() CASCADE;
DROP FUNCTION IF EXISTS pzero.extract_epoch(timestamptz) CASCADE;
DROP FUNCTION IF EXISTS pzero.gen_id() CASCADE;
DROP FUNCTION IF EXISTS pzero.is_valid_email(text) CASCADE;

-- Drop types
DROP TYPE IF EXISTS pzero.fingerprint_change_significance CASCADE;
DROP TYPE IF EXISTS pzero.network_intelligence_type CASCADE;
DROP TYPE IF EXISTS pzero.device_intelligence_type CASCADE;
DROP TYPE IF EXISTS pzero.risk_level CASCADE;
DROP TYPE IF EXISTS pzero.bot_type CASCADE;
DROP TYPE IF EXISTS pzero.file_unit CASCADE;
DROP TYPE IF EXISTS pzero.file_type CASCADE;
DROP TYPE IF EXISTS pzero.billing_freq CASCADE;
DROP TYPE IF EXISTS pzero.relation_type CASCADE;
DROP TYPE IF EXISTS pzero.oauth_provider CASCADE;
DROP TYPE IF EXISTS pzero.subscriber_tier_level CASCADE;
DROP TYPE IF EXISTS pzero.org_status CASCADE;
DROP TYPE IF EXISTS pzero.from_to CASCADE;
DROP TYPE IF EXISTS pzero.dir_status CASCADE;
DROP TYPE IF EXISTS pzero.device_type CASCADE;
DROP TYPE IF EXISTS pzero.session_type CASCADE;
DROP TYPE IF EXISTS pzero.session_status CASCADE;
DROP TYPE IF EXISTS pzero.device_status CASCADE;
DROP TYPE IF EXISTS pzero.user_online_status CASCADE;
DROP TYPE IF EXISTS pzero.user_status CASCADE;
DROP TYPE IF EXISTS pzero.location CASCADE;
DROP TYPE IF EXISTS pzero.method CASCADE;
DROP TYPE IF EXISTS pzero.address CASCADE;

-- Drop domains
DROP DOMAIN IF EXISTS pzero.url CASCADE;
DROP DOMAIN IF EXISTS pzero.key_values CASCADE;
DROP DOMAIN IF EXISTS pzero.mmn_type CASCADE;
DROP DOMAIN IF EXISTS pzero.domain CASCADE;
DROP DOMAIN IF EXISTS pzero.valid_col_name CASCADE;
DROP DOMAIN IF EXISTS pzero.valid_part CASCADE;
DROP DOMAIN IF EXISTS pzero.valid_handle CASCADE;
DROP DOMAIN IF EXISTS pzero.valid_name CASCADE;
DROP DOMAIN IF EXISTS pzero.email CASCADE;
DROP DOMAIN IF EXISTS pzero.data CASCADE;
