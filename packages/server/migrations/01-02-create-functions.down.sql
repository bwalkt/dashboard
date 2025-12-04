-- Down Migration for 01-02-create-functions.sql
-- Drop all created functions

-- Drop functions in pzero schema
DROP FUNCTION IF EXISTS pzero.create_triggers_plpython() CASCADE;
DROP FUNCTION IF EXISTS pzero.migrate_org() CASCADE;
DROP FUNCTION IF EXISTS pzero.audit_trigger_plpython() CASCADE;
DROP FUNCTION IF EXISTS pzero.relations_lookup_plpython(integer) CASCADE;
DROP FUNCTION IF EXISTS pzero.check_relations_plpython(text) CASCADE;
DROP FUNCTION IF EXISTS pzero.get_mmn(text) CASCADE;
DROP FUNCTION IF EXISTS pzero.get_table_name(text) CASCADE;

-- Drop functions in public schema (if they exist there)
DROP FUNCTION IF EXISTS public.is_valid_url(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_column_no(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.jsonb_diff(jsonb, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.get_country_name(smallint) CASCADE;

-- Drop any triggers created by the functions
DROP TRIGGER IF EXISTS trigger_migrate_org ON pzero.all_orgs CASCADE;