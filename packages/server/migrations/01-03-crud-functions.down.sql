-- Down Migration for 01-03-crud-functions.sql
-- Drop all CRUD functions

-- Drop audit functions
DROP FUNCTION IF EXISTS pzero.update_audit_col(text, text, bigint, smallint, text, text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS pzero.create_audit_record(jsonb) CASCADE;
DROP FUNCTION IF EXISTS pzero.delete_audit_records(text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS pzero.soft_delete_audit_records(text, jsonb) CASCADE;

-- Drop transaction functions  
DROP FUNCTION IF EXISTS pzero.create_txn_record(jsonb) CASCADE;

-- Drop CRUD functions
DROP FUNCTION IF EXISTS pzero.insert_auth(jsonb) CASCADE;
DROP FUNCTION IF EXISTS pzero.update_auth(jsonb) CASCADE;
DROP FUNCTION IF EXISTS pzero.insert_user(jsonb) CASCADE;
DROP FUNCTION IF EXISTS pzero.update_user(jsonb) CASCADE;
DROP FUNCTION IF EXISTS pzero.insert_org(jsonb) CASCADE;
DROP FUNCTION IF EXISTS pzero.update_org(jsonb) CASCADE;
DROP FUNCTION IF EXISTS pzero.insert_group(jsonb) CASCADE;
DROP FUNCTION IF EXISTS pzero.update_group(jsonb) CASCADE;
DROP FUNCTION IF EXISTS pzero.insert_nh(jsonb) CASCADE;
DROP FUNCTION IF EXISTS pzero.update_nh(jsonb) CASCADE;
DROP FUNCTION IF EXISTS pzero.insert_device(jsonb) CASCADE;
DROP FUNCTION IF EXISTS pzero.update_device(jsonb) CASCADE;
DROP FUNCTION IF EXISTS pzero.insert_session(jsonb) CASCADE;
DROP FUNCTION IF EXISTS pzero.update_session(jsonb) CASCADE;
DROP FUNCTION IF EXISTS pzero.insert_relation(jsonb) CASCADE;
DROP FUNCTION IF EXISTS pzero.update_relation(jsonb) CASCADE;
DROP FUNCTION IF EXISTS pzero.delete_relation(jsonb) CASCADE;

-- Drop any helper functions
DROP FUNCTION IF EXISTS pzero.get_or_create_user(jsonb) CASCADE;
DROP FUNCTION IF EXISTS pzero.batch_insert_relations(jsonb[]) CASCADE;