CREATE OR REPLACE FUNCTION is_valid_url (url text) returns boolean AS $$
import re

if not url:
    return False
url = url.strip()
if len(url) == 0:
    return False
if len(url) > 255:
    return False
pattern = r'^((http|https)://)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
return bool(re.match(pattern, url))
$$ language plpython3u immutable strict;

CREATE OR REPLACE FUNCTION get_column_no (
  table_name text,
  column_name text,
  schema_name text DEFAULT 'pzero'
) returns integer AS $$
import plpy

# Validate required parameters
if not table_name or not column_name:
    raise ValueError('table_name and column_name are required')

# Sanitize inputs
table_name_clean = table_name.strip()
column_name_clean = column_name.strip()
schema_name_clean = schema_name.strip()

ordinal_name = f'ordinal_{schema_name_clean}_{table_name_clean}'

# Initialize cache if needed
if 'cache' not in GD:
    GD['cache'] = {}

# Check cache first
cache = GD['cache']
if ordinal_name in cache and column_name_clean in cache[ordinal_name]:
    return cache[ordinal_name][column_name_clean]

if ordinal_name not in cache:
    cache[ordinal_name] = {}

# Query with prepared statement for better performance
try:
    stmt = plpy.prepare(
        "SELECT ordinal_position as pos FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND column_name = $3",
        ["text", "text", "text"]
    )
    result = plpy.execute(stmt, [schema_name_clean, table_name_clean, column_name_clean])
    
    if result and len(result) > 0:
        pos = result[0]['pos']
        cache[ordinal_name][column_name_clean] = pos
        return pos
    else:
        raise ValueError(f'Column {column_name_clean} not found in table {schema_name_clean}.{table_name_clean}')
except plpy.SPIError as spi_err:
    plpy.error(f'Database error getting column position for {schema_name_clean}.{table_name_clean}.{column_name_clean}: {spi_err}')
    raise
except ValueError:
    # Re-raise ValueError as-is (column not found)
    raise
except Exception as e:
    plpy.error(f'Unexpected error getting column position for {schema_name_clean}.{table_name_clean}.{column_name_clean}: {e}')
    raise
$$ language plpython3u immutable strict;

CREATE OR REPLACE FUNCTION jsonb_diff (a jsonb, b jsonb) returns jsonb AS $$
import json

def all_keys(obj1, obj2):
    keys = set()
    if isinstance(obj1, dict):
        keys.update(obj1.keys())
    if isinstance(obj2, dict):
        keys.update(obj2.keys())
    return list(keys)

def diff(obj1, obj2):
    changes = {}
    keys = all_keys(obj1, obj2)
    
    for key in keys:
        val1 = obj1.get(key) if obj1 else None
        val2 = obj2.get(key) if obj2 else None
        
        # New key added to obj2
        if val1 is None:
            changes[key] = {'status': 'added', 'newValue': val2}
            continue
        
        # Key deleted from obj2
        if val2 is None:
            changes[key] = {'status': 'deleted', 'oldValue': val1}
            continue
        
        # Values differ (check for nested objects)
        if isinstance(val1, dict) and isinstance(val2, dict):
            nested_changes = diff(val1, val2)
            if nested_changes:
                changes[key] = {'status': 'updated', 'changes': nested_changes}
        elif val1 != val2:
            changes[key] = {'status': 'updated', 'oldValue': val1, 'newValue': val2}
    
    return changes

# Entry point for the function
obj_a = json.loads(a) if isinstance(a, str) else a
obj_b = json.loads(b) if isinstance(b, str) else b
result = diff(obj_a, obj_b)

return json.dumps(result)
$$ language plpython3u immutable strict;

--SELECT jsonb_diff(
--  '{"user": {"name": "Alice", "id": 123}, "active": true}'::jsonb,
--  '{"user": {"name": "Bob", "email": "bob@example.com"}, "active": true}'::jsonb
--);
-- {
--  "user": {
--    "status": "updated",
--    "changes": {
--      "name": { "status": "updated", "oldValue": "Alice", "newValue": "Bob" },
--      "id": { "status": "deleted", "oldValue": 123 },
--      "email": { "status": "added", "newValue": "bob@example.com" }
--    }
--  }
--}
--CREATE OR REPLACE FUNCTION get_country_name (country_id smallint) returns text AS $$
--        plv8.elog(NOTICE, 'Initializing country cache...');
--        const data = plv8.execute("SELECT id, name FROM country_codes");
--        plv8.country_cache = {}; // Create the cache object.
--        for (let i = 0; i < data.length; i++) {
--            plv8.country_cache[data[i].id] = data[i].name; // Populate the cache.
--        }
--    }
--    // Return the value from the cache.
--    return plv8.country_cache[country_id];
--$$ language plpythonimmutable;
CREATE OR REPLACE FUNCTION pzero.get_mmn (table_name text) returns text AS $$
import plpy

if 'mmn_cache' not in GD:
    GD['mmn_cache'] = {}

if table_name in GD['mmn_cache']:
    return GD['mmn_cache'][table_name]

stmt = plpy.prepare("SELECT mmn from pzero.mmn where table_name = $1", ["text"])
result = plpy.execute(stmt, [table_name])

if len(result) == 0:
    raise Exception(f'No MMN found for table: {table_name}')

GD['mmn_cache'][table_name] = result[0]['mmn'].strip() if result[0]['mmn'] else None
return GD['mmn_cache'][table_name]
$$ language plpython3u immutable strict;

CREATE OR REPLACE FUNCTION pzero.get_table_name (mmn text) returns text AS $$
import plpy

if 'mmn_table_cache' not in GD:
    GD['mmn_table_cache'] = {}

if mmn in GD['mmn_table_cache']:
    return GD['mmn_table_cache'][mmn]

stmt = plpy.prepare("SELECT table_name from pzero.mmn where mmn = $1", ["text"])
result = plpy.execute(stmt, [mmn])

if len(result) == 0:
    raise Exception(f'No table found for mmn: {mmn}')

GD['mmn_table_cache'][mmn] = result[0]['table_name'].strip() if result[0]['table_name'] else None
return GD['mmn_table_cache'][mmn]
$$ language plpython3u immutable strict;

CREATE OR REPLACE FUNCTION pzero.audit_trigger_plpython () returns trigger AS $$
import plpy
import json
import os

# Helper function to print notices only in development mode
def dev_notice(msg):
    try:
        env_result = plpy.execute("SHOW app.environment")
        environment = env_result[0]['app.environment'] if env_result else 'production'
        if environment == 'development':
            plpy.notice(msg)
    except:
        pass  # Silently ignore if environment check fails

# Constants
AUTH_TABLES = frozenset(['auth', 'users'])
SKIP_USER_VALIDATION_TABLES = frozenset(['all_txns', 'all_audits'])  # Skip validation for internal audit tables
EXCLUDED_AUDIT_COLUMNS = frozenset(['id', 'c_by', 'c_at', 'u_by', 'u_at', 'is_del', 'last_seen', 'tim', 'timestamp'])
MAX_RETRY_ATTEMPTS = 5

# Check environment for DELETE permission
# Get environment from PostgreSQL GUC (Grand Unified Configuration)
try:
    env_result = plpy.execute("SHOW app.environment")
    environment = env_result[0]['app.environment'] if env_result and len(env_result) > 0 else 'production'
except:
    # If app.environment is not set, default to production (safest option)
    environment = 'production'

# Validate event type
if TD['event'] == 'DELETE':
    # Only allow DELETE in development environment
    if environment != 'development':
        plpy.error(f"DELETE operations are not allowed in {environment} environment. Use soft delete (SET is_del = TRUE) instead.")
        raise ValueError(f"DELETE not allowed in {environment}")
elif TD['event'] not in ['INSERT', 'UPDATE']:
    plpy.error(f"Unsupported event type: {TD['event']}")
    raise

# Get row data
old_row = TD.get('old')  # Available for UPDATE and DELETE
new_row = TD.get('new')  # Available for INSERT and UPDATE

# Handle DELETE event (only reaches here in development)
if TD['event'] == 'DELETE':
    dev_notice(f"DELETE event on table {TD.get('table_name')} for row {old_row.get('id')} [DEVELOPMENT MODE]")
    # For DELETE BEFORE triggers, return "OK" to allow the deletion
    # We could add audit logging here in the future if needed
    return "OK"
# Get the parent partitioned table name (not the partition)
relid = TD['relid']

# Recursively find the root parent table (the one starting with "all_")
parent_stmt = plpy.prepare("""
    SELECT
        pn.nspname as parent_schema,
        pc.relname as parent_table,
        pc.oid as parent_oid,
        cn.nspname as child_schema,
        cc.relname as child_table
    FROM pg_inherits pi
    JOIN pg_class pc ON pi.inhparent = pc.oid
    JOIN pg_namespace pn ON pc.relnamespace = pn.oid
    JOIN pg_class cc ON pi.inhrelid = cc.oid
    JOIN pg_namespace cn ON cc.relnamespace = cn.oid
    WHERE pi.inhrelid = $1
""", ["bigint"])

current_oid = relid
schema_name = None
table_only_name = None
full_table_name = None
actual_partition = None

while True:
    parent_query = plpy.execute(parent_stmt, [current_oid])
    if not parent_query or len(parent_query) == 0:
        # No more parents, use current table
        if schema_name is None:
            # First iteration and not a partition, use the table itself
            try:
                table_stmt = plpy.prepare("SELECT nspname as schema_name, relname as table_name FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE c.oid = $1", ["bigint"])
                table_info = plpy.execute(table_stmt, [relid])
                if table_info and len(table_info) > 0:
                    schema_name = table_info[0]['schema_name']
                    table_only_name = table_info[0]['table_name']
                    full_table_name = f"{schema_name}.{table_only_name}"
            except Exception as e:
                plpy.warning(f"Error resolving table: {e}")
        break

    schema_name = parent_query[0]['parent_schema']
    table_only_name = parent_query[0]['parent_table']
    full_table_name = f"{schema_name}.{table_only_name}"
    if actual_partition is None:
        actual_partition = f"{parent_query[0]['child_schema']}.{parent_query[0]['child_table']}"

    # If we found a table starting with "all_", this is our root parent
    if table_only_name.startswith('all_'):
        dev_notice(f"Using root parent table: {full_table_name} (triggered from partition: {actual_partition})")
        break

    # Continue traversing up the hierarchy
    current_oid = parent_query[0]['parent_oid']

# Fallback if we still dont have a table name
if not full_table_name:
    plpy.warning(f"Failed to resolve table for relid {relid}, falling back to TD values")
    full_table_name = TD['table_name']
    schema_name = TD.get('table_schema', 'pzero')
    table_only_name = full_table_name.split('.')[1] if '.' in full_table_name else full_table_name
    dev_notice(f"Using fallback table name: {full_table_name}")

dev_notice(f"Processing table: {full_table_name} (relid: {relid})")
auth_insert = False

# Get transaction ID with error handling
dev_notice(f"=== MAIN EXECUTION START === Table: {full_table_name}")
try:
    txid = plpy.execute("SELECT txid_current()")[0]['txid_current']
    dev_notice(f"Got transaction ID: {txid}")
except Exception as e:
    plpy.error(f'Failed to get transaction ID: {e}')
    raise

# Initialize variables
c_by = new_row.get('c_by') if new_row else None
diffs = {}
id_val = new_row.get('id') if new_row else None
is_act = new_row.get('is_act') if new_row else None

# Handle UPDATE vs INSERT
if TD['event'] == 'UPDATE':
    # Validate ID immutability
    if old_row.get('id') != new_row.get('id') or old_row.get('id') is None or new_row.get('id') is None:
        plpy.error(f'ID for table {full_table_name} is not mutable')
        raise ValueError('ID is immutable and cannot be changed')
    if new_row.get('u_by'):
        c_by = new_row['u_by']
else:  # INSERT
    # Enhanced INSERT handling with conflict resolution
    if not id_val:
        retry_count = 0
        insert_ok = False

        dev_notice(f'Debug: "auth" in table_only_name = {("auth" in table_only_name)} for table={table_only_name}, id_val={id_val}')
        check_sql = f"SELECT 1 FROM {full_table_name} WHERE id = $1 LIMIT 1"
        check_stmt = plpy.prepare(check_sql, ["uuid"])
        while not insert_ok and retry_count < MAX_RETRY_ATTEMPTS:
            try:
                # Generate new ID
                result = plpy.execute("SELECT pzero.gen_id() as id")
                new_row['id'] = result[0]['id']
                id_val = new_row['id']
                if  'auth' in table_only_name:
                    c_by = id_val
                    auth_insert = True
                    dev_notice(f'Setting c_by to new id {c_by} for table {table_only_name}')
                # Check for existing ID
                row_exists = plpy.execute(check_stmt, [id_val])
                
                if row_exists and len(row_exists) > 0:
                    # ID collision, will retry
                    dev_notice(f'ID collision detected for {new_row["id"]}, retrying...')
                    retry_count += 1
                else:
                    insert_ok = True
                    
            except plpy.SPIError as spi_err:
                retry_count += 1
                plpy.warning(f'Database error during ID generation (attempt {retry_count}): {spi_err}')
                if retry_count >= MAX_RETRY_ATTEMPTS:
                    plpy.error(f'Failed to generate ID after {MAX_RETRY_ATTEMPTS} attempts')
                    raise
            except Exception as err:
                retry_count += 1
                plpy.warning(f'Unexpected error during ID generation (attempt {retry_count}): {err}')
                if retry_count >= MAX_RETRY_ATTEMPTS:
                    plpy.error(f'Failed to generate ID after {MAX_RETRY_ATTEMPTS} attempts')
                    raise
        
        if not insert_ok:
            plpy.error(f'Unable to generate unique ID after {MAX_RETRY_ATTEMPTS} attempts')
            raise Exception('Unable to generate unique ID')

data = new_row.get('data') if new_row else None
if data:
    data = json.loads(data) if isinstance(data, str) else data
    data_modified = False
    
    if 'meta' in data:
        c_by = data['meta'].get('c_by', c_by)
        if 'u_by' in data['meta']:
            c_by = data['meta']['u_by']
        del data['meta']
        data_modified = True
        
    if 'diff' in data:
        diff_keys = data['diff'].keys()
        if diff_keys:
            diffs = dict(data['diff'])
        del data['diff']
        data_modified = True
    
    # Update new_row with the modified data
    if data_modified:
        if not data:
            del new_row['data']
        else:
            new_row['data'] = json.dumps(data)

if not c_by:
    if  'auth' in table_only_name and id_val and TD['event'] == 'INSERT':
        c_by = id_val
        auth_insert = True
        dev_notice(f'Setting c_by to new id {c_by} for table {table_only_name}')
    else:
        raise Exception('Missing Audit field - c_by ' + str(full_table_name) + '  ' + str(table_only_name))
# Validate user with prepared statement
try:
    # Skip user validation for auth table inserts; c_by is the newly generated entity ID (bootstrapping case)
    # Also skip for internal audit tables to avoid circular dependency during transaction logging
    if not auth_insert and table_only_name not in SKIP_USER_VALIDATION_TABLES:
        user_check = plpy.prepare("SELECT is_act FROM pzero.all_auth WHERE id = $1::uuid LIMIT 1", ["text"])
        user_exists = plpy.execute(user_check, [str(c_by)])
        if not user_exists or len(user_exists) == 0:
            plpy.error(f'c_by user {c_by} does not exist')
            raise ValueError(f'c_by user {c_by} does not exist')
        user_is_act = user_exists[0]['is_act']
        if not user_is_act and table_only_name not in AUTH_TABLES:
            plpy.error(f'c_by user {c_by} is not active')
            raise ValueError(f'c_by user {c_by} is not active')
except plpy.SPIError as e:
    plpy.error(f'Database error checking user: {e}')
    raise

dev_notice("Reached transaction logging section")
# Get part value from the row if it exists, otherwise use sentinel value 'pzero'
# Note: Cannot use NULL because part is in PRIMARY KEY for all_txns and all_audits
part_value = new_row.get('part') or 'pzero'

# Log transaction with prepared statement (must happen before append-only check)
try:
    dev_notice(f"About to log transaction: txid={txid}, c_by={c_by}, part={part_value}")
    txn_sql = f"INSERT INTO {schema_name}.all_txns (id, c_by, part, c_at) VALUES ($1, $2::uuid, $3, NOW()) ON CONFLICT (part, id) DO NOTHING"
    txn_stmt = plpy.prepare(txn_sql, ["bigint", "text", "text"])
    plpy.execute(txn_stmt, [txid, str(c_by), part_value])
    dev_notice(f"Successfully logged transaction {txid}")
except Exception as e:
    plpy.error(f'Failed to log transaction: {e} {txid}')
    raise

# Get MMN for the table with error handling
try:
    dev_notice(f"Getting MMN for table: {table_only_name}")
    dev_notice(f"About to prepare MMN statement")
    mmn_stmt = plpy.prepare("SELECT pzero.get_mmn($1) as mmn", ["text"])
    dev_notice(f"MMN statement prepared successfully")
    dev_notice(f"About to execute MMN statement with parameter: {table_only_name}")
    mmn_result = plpy.execute(mmn_stmt, [table_only_name])
    dev_notice(f"MMN statement executed successfully")
    if not mmn_result or len(mmn_result) == 0:
        plpy.error(f'Unable to resolve MMN for table {table_only_name}')
        raise ValueError(f'No MMN found for table {table_only_name}')
    mmn = mmn_result[0]['mmn'].strip() if mmn_result[0]['mmn'] else None
    if mmn is None:
        plpy.error(f'MMN is NULL for table {table_only_name}')
        raise ValueError(f'MMN is NULL for table {table_only_name}')
except Exception as e:
    plpy.error(f'Failed to get MMN: {e}')
    plpy.error(f'Exception type: {type(e)}')
    plpy.error(f'Exception args: {e.args}')
    raise


if new_row and new_row.get('is_del') == True:
    # If the is_del column is set to true, log a deletion
    plpy.execute(f"INSERT INTO {schema_name}.all_audits (txn_id, mmn, row_id, is_del) VALUES ({txid}, '{mmn}', '{old_row['id']}', TRUE)")
    return new_row

# Batch audit inserts for better performance
audit_inserts = []

col_no_stmt = plpy.prepare(f"SELECT get_column_no('{table_only_name}', $1, '{schema_name}') as cno", ["text"])
for col_name in new_row:
    if col_name.lower() not in EXCLUDED_AUDIT_COLUMNS:
        try:
            # Get column number with caching
            col_no_result = plpy.execute(col_no_stmt, [ col_name])
            if not col_no_result or len(col_no_result) == 0:
                plpy.warning(f'Column {col_name} not found in schema')
                continue
            col_no = col_no_result[0]['cno']
            
            # Prepare column value
            if col_name in diffs:
                col_value = json.dumps(diffs[col_name])
            elif new_row[col_name] is not None:
                col_value = str(new_row[col_name])
            else:
                continue  # Skip NULL values
            
            audit_inserts.append(( col_no, col_value))
            
        except Exception as e:
            plpy.warning(f'Failed to prepare audit for column {col_name}: {e}')
            continue

# Execute batch insert with prepared statement
if audit_inserts:
    try:
        id_str = str(id_val)
        audit_sql = f"INSERT INTO {schema_name}.all_audits (txn_id, mmn, row_id, part, cno, cval) VALUES ({txid}, '{mmn}', '{id_str}', $1, $2, $3)"
        audit_stmt = plpy.prepare(audit_sql, ["text", "integer", "text"])
        for audit_row in audit_inserts:
            dev_notice(f"About to insert audit row: {audit_row}, part={part_value}")
            plpy.execute(audit_stmt, [part_value, audit_row[0], audit_row[1]])
        dev_notice(f"Successfully inserted {len(audit_inserts)} audit records for row {id_str}")
    except Exception as e:
        plpy.warning(f'Failed to insert audit records: {e}')


dev_notice(f"About to return new_row: {type(new_row)}")
dev_notice(f"New row keys: {list(new_row.keys()) if new_row else 'None'}")
dev_notice(f"new_row['id'] = {new_row.get('id', 'NOT_SET')}")
dev_notice(f"Returning MODIFY for BEFORE trigger with modifications")
return "MODIFY"
$$ language plpython3u;

CREATE OR REPLACE FUNCTION pzero.relations_lookup_plpython (relation integer) returns jsonb AS $$
import json

if 'relations_cache' not in GD:
    relationships = {
        'parent_child': 'parent_child',
        'peer': 'peer',
        'related_object': 'related_object',
        'admined_by': 'admined_by',
        'member': 'member',
        'billing_to': 'billing_to',
        'owned_by': 'owned_by',
        'created_by': 'created_by',
        'linked_object': 'linked_object',
        'root_object': 'root_object',
        'replaced_object': 'replaced_object',
        'site_admin': 'site_admin',
        'super_admin': 'super_admin'
    }
    GD['relations_cache'] = {}
    GD['reverse_relations_cache'] = {}
    
    for i, (key_name, value) in enumerate(relationships.items()):
        key = 1 << i
        GD['relations_cache'][key] = value
        GD['reverse_relations_cache'][value] = key

if relation in GD['relations_cache']:
    return json.dumps(GD['relations_cache'][relation])
return json.dumps(None)
$$ language plpython3u immutable strict;

CREATE OR REPLACE FUNCTION pzero.check_relations_plpython (schema_name text DEFAULT 'pzero') returns trigger AS $$
import plpy

# Constants
MAX_RELATION_VALUE = 1 << 15

new_row = TD['new']
old_row = TD.get('old')

# Validate event type
if TD['event'] == 'DELETE':
    plpy.error('DELETE operations are not allowed on relations table')
    return 'SKIP'

# Validate required fields
uuid1 = new_row.get('uuid1')
uuid2 = new_row.get('uuid2')
relation = new_row.get('relation')

if not all([uuid1, uuid2, relation is not None]):
    plpy.error('Missing required fields: uuid1, uuid2, and relation are all required')
    raise ValueError('Missing required fields')

mm1, _, uuid1  = new_row['uuid1'].partition('_')
mm2 , _, uuid2  = new_row['uuid2'].partition('_')

table_stmt = plpy.prepare("SELECT pzero.get_table_name($1) as table_name", ["text"])
table1 = plpy.execute(table_stmt, [mm1])[0]['table_name']
table2 = plpy.execute(table_stmt, [mm2])[0]['table_name']
if not table1 or not table2:
    raise Exception('Unable to resolve table names from MMNs')

check_sql = f"""
    SELECT 1 FROM {schema_name}.{table1} t1
    JOIN {schema_name}.{table2} t2 ON t1.id = $1 AND t2.id = $2
    LIMIT 1
"""
check_stmt = plpy.prepare(check_sql, ["text", "text"])
check_exists = plpy.execute(check_stmt, [uuid1, uuid2])

if not check_exists or len(check_exists) == 0:
    plpy.error(f'One or both UUIDs do not exist: {uuid1}, {uuid2}')
    raise ValueError('One or both UUIDs do not exist')
if TD['event'] == 'UPDATE':
    relation = new_row.get('relation')
    select_sql = f"SELECT 1 FROM {schema_name}.relations WHERE uuid1 = $1 AND uuid2 = $2  LIMIT 1"
    relation_exists = plpy.execute(select_sql, [uuid1, uuid2])
    if not relation_exists or len(relation_exists) == 0:
        plpy.error(f'Relation does not exist for UPDATE between {uuid1} and {uuid2}')
        raise ValueError('Relation does not exist for UPDATE')
# Validate relation value
if not isinstance(relation, int) or relation < 1 or relation > MAX_RELATION_VALUE:
    plpy.error(f'Invalid relation type: {relation}. Must be between 1 and {MAX_RELATION_VALUE}')
    raise ValueError(f'Invalid relation type: {relation}')

return new_row
$$ language plpython3u;

CREATE OR REPLACE FUNCTION pzero.migrate_org () returns trigger AS $$
import plpy

# Helper function to print notices only in development mode
def dev_notice(msg):
    try:
        env_result = plpy.execute("SHOW app.environment")
        environment = env_result[0]['app.environment'] if env_result else 'production'
        if environment == 'development':
            plpy.notice(msg)
    except:
        pass  # Silently ignore if environment check fails

# Get row data
new_row = TD.get('new')
old_row = TD.get('old')
event = TD['event']

# Only process on INSERT or UPDATE
if event not in ['INSERT', 'UPDATE']:
    return new_row

# Tables to create in dedicated schema for non-multi-tenant orgs
DEDICATED_TABLES = [
    'all_endpoints', 'all_sessions', 'all_threads', 'all_thread_heads'
]

def sanitize_handle(handle):
    """Sanitize handle to be a valid schema name"""
    if not handle:
        return None
    # Replace any non-alphanumeric characters with underscores
    # PostgreSQL schema names must start with letter or underscore
    sanitized = ''.join(c if c.isalnum() or c == '_' else '_' for c in handle.lower())
    # Ensure it starts with a letter or underscore
    if sanitized and sanitized[0].isdigit():
        sanitized = '_' + sanitized
    return sanitized

def create_schema_and_tables(schema_name):
    try:
        # Create schema if it does not exist
        plpy.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
        dev_notice(f'Created/verified schema "{schema_name}"')
        
        # Create tables in the new schema
        for table in DEDICATED_TABLES:
            try:
                # Create table with same structure as pzero schema
                plpy.execute(f'''
                    CREATE TABLE IF NOT EXISTS "{schema_name}".{table} 
                    (LIKE pzero.{table} INCLUDING ALL)
                ''')
                dev_notice(f'Created/verified table "{schema_name}".{table}')
                
                # Create partitions if the source table is partitioned
                if table in ['all_endpoints', 'all_sessions', 'all_threads', 'all_thread_heads']:
                    # Create partitions for is_act values
                    for is_act in ['true', 'false']:
                        partition_name = f'{table}_{is_act}'
                        try:
                            plpy.execute(f'''
                                CREATE TABLE IF NOT EXISTS "{schema_name}".{partition_name}
                                PARTITION OF "{schema_name}".{table}
                                FOR VALUES IN ({is_act})
                            ''')
                        except plpy.SPIError:
                            pass  # Partition might already exist
                
            except plpy.SPIError as e:
                plpy.warning(f'Error creating table {table}: {e}')
                raise
                
    except plpy.SPIError as e:
        plpy.error(f'Failed to create schema and tables: {e}')
        raise

# Handle INSERT event
if event == 'INSERT':
    multi_tenant = new_row.get('multi_tenant', True)
    handle = new_row.get('handle')
    
    # If not multi-tenant, create dedicated schema
    if not multi_tenant and handle:
        schema_name = sanitize_handle(handle)
        if schema_name:
            dev_notice(f'Creating dedicated schema for new org with handle: {handle}')
            create_schema_and_tables(schema_name)
        else:
            plpy.error(f'Invalid handle for schema creation: {handle}')

# Handle UPDATE event
elif event == 'UPDATE':
    old_multi_tenant = old_row.get('multi_tenant', True) if old_row else True
    new_multi_tenant = new_row.get('multi_tenant', True)
    old_handle = old_row.get('handle') if old_row else None
    new_handle = new_row.get('handle')
    
    # Case 1: Handle changed for non-multi-tenant org (rename schema)
    if not new_multi_tenant and old_handle != new_handle:
        old_schema = sanitize_handle(old_handle) if old_handle else None
        new_schema = sanitize_handle(new_handle) if new_handle else None
        
        if old_schema and new_schema and old_schema != new_schema:
            # Check if old schema exists and rename it
            schema_exists = plpy.execute(f"""
                SELECT 1 FROM information_schema.schemata 
                WHERE schema_name = '{old_schema}'
            """)
            
            if schema_exists:
                try:
                    plpy.execute(f'ALTER SCHEMA "{old_schema}" RENAME TO "{new_schema}"')
                    dev_notice(f'Renamed schema from "{old_schema}" to "{new_schema}"')
                except plpy.SPIError as e:
                    # If rename fails, create new schema and warn about old one
                    plpy.warning(f'Could not rename schema: {e}')
                    dev_notice(f'Creating new schema "{new_schema}" (old schema "{old_schema}" remains)')
                    create_schema_and_tables(new_schema)
            else:
                # Old schema does not exist, just create new one
                create_schema_and_tables(new_schema)
    
    # Case 2: Changed from multi-tenant to single-tenant
    elif old_multi_tenant and not new_multi_tenant:
        schema_name = sanitize_handle(new_handle)
        if schema_name:
            dev_notice(f'Org changed to single-tenant mode, creating dedicated schema: {schema_name}')
            create_schema_and_tables(schema_name)
        else:
            plpy.error(f'Invalid handle for schema creation: {new_handle}')
    
    # Case 3: Changed from single-tenant to multi-tenant
    elif not old_multi_tenant and new_multi_tenant:
        old_schema = sanitize_handle(old_handle)
        if old_schema:
            dev_notice(f'Org changed to multi-tenant mode')
            dev_notice(f'Schema "{old_schema}" retained for backup (migration of data to be done separately)')
            # Note: Actual data migration will be handled separately as mentioned

# AFTER triggers should return None
return None
$$ language plpython3u;

CREATE FUNCTION pzero.check_relations_trigger () returns trigger AS $$
BEGIN
    PERFORM pzero.check_relations_plpython(); -- Calls check_relations_plpython
    PERFORM pzero.audit_trigger_plpython(); -- Calls audit_trigger_plpython
        -- ... other logic or function calls
    RETURN NEW; -- Or OLD, or NULL depending on trigger type
END;
$$ language plpgsql;

CREATE OR REPLACE FUNCTION pzero.create_triggers_plpython () returns void AS $$
import plpy

# Helper function to print notices only in development mode
def dev_notice(msg):
    try:
        env_result = plpy.execute("SHOW app.environment")
        environment = env_result[0]['app.environment'] if env_result else 'production'
        if environment == 'development':
            plpy.notice(msg)
    except:
        pass  # Silently ignore if environment check fails

triggers_created = []

try:
    # Create trigger for relations
    plpy.execute("""
        CREATE TRIGGER trigger_check_relations 
        BEFORE INSERT OR UPDATE OR DELETE ON pzero.relations
        FOR EACH ROW EXECUTE FUNCTION pzero.check_relations_trigger()
    """)
    triggers_created.append('trigger_check_relations')
    dev_notice('Created trigger trigger_check_relations on table pzero.relations')
    
except plpy.SPIError as e:
    if 'already exists' not in str(e).lower():
        plpy.error(f'Failed to create relations trigger: {e}')
        raise
    dev_notice('Trigger trigger_check_relations already exists')

# Tables to add audit triggers to
# Note: txns and all_audits tables excluded to prevent infinite recursion during audit logging
EXCLUDED_TABLES = {'all_txns', 'all_audits'}

# Dynamically get all 'all_*' tables from pzero schema
tables_query = """
    SELECT table_schema || '.' || table_name as full_table_name
    FROM information_schema.tables
    WHERE table_schema = 'pzero'
      AND table_name LIKE 'all_%'
      AND table_name NOT IN ('all_txns', 'all_audits')
    ORDER BY table_name
"""
tables_result = plpy.execute(tables_query)
tables = [row['full_table_name'] for row in tables_result]

dev_notice(f'Found {len(tables)} tables to add audit triggers: {", ".join(tables)}')

# Create audit triggers
for target_table in tables:
    trigger_name = f"audit_trigger_{target_table.replace('.', '_').replace('pzero_', '')}"
    
    try:
        sql = f"""
            CREATE TRIGGER {trigger_name}
            BEFORE INSERT OR UPDATE OR DELETE ON {target_table}
            FOR EACH ROW EXECUTE FUNCTION pzero.audit_trigger_plpython()
        """
        plpy.execute(sql)
        triggers_created.append(trigger_name)
        dev_notice(f'Created trigger {trigger_name} on table {target_table}')
        
    except plpy.SPIError as e:
        if 'already exists' not in str(e).lower():
            plpy.warning(f'Failed to create trigger {trigger_name}: {e}')
            # Continue with other triggers
        else:
            dev_notice(f'Trigger {trigger_name} already exists')

# Create migrate_org trigger for all_orgs table
try:
    plpy.execute("""
        CREATE TRIGGER trigger_migrate_org
        AFTER INSERT OR UPDATE ON pzero.all_orgs
        FOR EACH ROW EXECUTE FUNCTION pzero.migrate_org()
    """)
    triggers_created.append('trigger_migrate_org')
    dev_notice('Created trigger trigger_migrate_org on table pzero.all_orgs')
    
except plpy.SPIError as e:
    if 'already exists' not in str(e).lower():
        plpy.error(f'Failed to create migrate_org trigger: {e}')
        raise
    dev_notice('Trigger trigger_migrate_org already exists')

dev_notice(f'Successfully created/verified {len(triggers_created)} triggers')
$$ language plpython3u;

-- Commented out to prevent automatic execution during migration
-- Triggers should be created manually after verifying all functions exist
SELECT
  pzero.create_triggers_plpython ();
