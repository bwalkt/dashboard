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

if not table_name or not column_name:
    raise ValueError('table_name and column_name are required')

# Sanitize inputs
table_name = table_name.strip()
column_name = column_name.strip()
schema_name = schema_name.strip()

ordinal_name = f'ordinal_{schema_name}_{table_name}'

# Initialize cache if needed
if 'cache' not in GD:
    GD['cache'] = {}

# Check cache first
cache = GD['cache']
if ordinal_name in cache and column_name in cache[ordinal_name]:
    return cache[ordinal_name][column_name]

if ordinal_name not in cache:
    cache[ordinal_name] = {}

# Query with prepared statement for better performance
try:
    stmt = plpy.prepare(
        "SELECT ordinal_position as pos FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND column_name = $3",
        ["text", "text", "text"]
    )
    result = plpy.execute(stmt, [schema_name, table_name, column_name])
    
    if result and len(result) > 0:
        pos = result[0]['pos']
        cache[ordinal_name][column_name] = pos
        return pos
    else:
        raise ValueError(f'Column {column_name} not found in table {schema_name}.{table_name}')
except Exception as e:
    plpy.error(f'Error getting column position: {e}')
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

result = plpy.execute("SELECT mmn from pzero.mmn where table_name = $1", [table_name])

if len(result) == 0:
    raise Exception(f'No MMN found for table: {table_name}')

GD['mmn_cache'][table_name] = result[0]['mmn']
return result[0]['mmn']
$$ language plpython3u immutable strict;

CREATE OR REPLACE FUNCTION pzero.get_table_name (mmn text) returns text AS $$
import plpy

if 'mmn_table_cache' not in GD:
    GD['mmn_table_cache'] = {}

if mmn in GD['mmn_table_cache']:
    return GD['mmn_table_cache'][mmn]

result = plpy.execute("SELECT table_name from pzero.mmn where mmn = $1", [mmn])

if len(result) == 0:
    raise Exception(f'No table found for mmn: {mmn}')

GD['mmn_table_cache'][mmn] = result[0]['table_name']
return result[0]['table_name']
$$ language plpython3u immutable strict;

CREATE OR REPLACE FUNCTION pzero.audit_trigger_plpython () returns trigger AS $$
import plpy
import json

# Constants
APPEND_ONLY_TABLES = frozenset(['txns', 'all_audits'])
AUTH_TABLES = frozenset(['auth', 'users'])
EXCLUDED_AUDIT_COLUMNS = frozenset(['id', 'c_by', 'c_at', 'u_by', 'u_at', 'is_del', 'last_seen'])
MAX_RETRY_ATTEMPTS = 5

# Validate event type
if TD['event'] not in ['INSERT', 'UPDATE']:
    plpy.error(f"Unsupported event type: {TD['event']}")
    raise

# Get row data
old_row = TD.get('old')  # Available for UPDATE and DELETE
new_row = TD.get('new')  # Available for INSERT and UPDATE
table_name = TD['table_name']
schema_name = table_name.split('.')[0] if '.' in table_name else 'pzero'
table_only_name = table_name.split('.')[1] if '.' in table_name else table_name

# Check append-only constraint
if table_only_name in APPEND_ONLY_TABLES:
    if TD['event'] == 'UPDATE':
        plpy.error(f'Table {table_name} is append-only, only INSERT allowed')
        raise
    else:
        return new_row

# Get transaction ID with error handling
try:
    txid = plpy.execute("SELECT txid_current()")[0]['txid_current']
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
        plpy.error(f'ID for table {table_name} is not mutable')
        return 'SKIP'
    if new_row.get('u_by'):
        c_by = new_row['u_by']
else:  # INSERT
    # Enhanced INSERT handling with conflict resolution
    if not id_val:
        retry_count = 0
        insert_ok = False
        
        while not insert_ok and retry_count < MAX_RETRY_ATTEMPTS:
            try:
                # Generate new ID
                result = plpy.execute("SELECT pzero.gen_monotonic_id() as id")
                new_row['id'] = result[0]['id']
                id_val = new_row['id']
                
                # Check for existing ID
                check_stmt = plpy.prepare(f"SELECT 1 FROM {table_name} WHERE id = $1 LIMIT 1", ["text"])
                row_exists = plpy.execute(check_stmt, id_val)
                
                if row_exists and len(row_exists) > 0:
                    # ID collision, will retry
                    plpy.notice(f'ID collision detected for {new_row["id"]}, retrying...')
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
    if 'meta' in data:
        c_by = data['meta'].get('c_by', c_by)
        if 'u_by' in data['meta']:
            c_by = data['meta']['u_by']
        del data['meta']
        if not data:
            del new_row['data']
    
    if 'diff' in data:
        diff_keys = data['diff'].keys()
        if diff_keys:
            diffs = dict(data['diff'])
        del data['diff']

if not c_by:
    raise Exception('Missing Audit field - c_by')
# Validate user with prepared statement
try:
    user_check = plpy.prepare("SELECT is_act FROM pzero.all_auth WHERE id = $1 LIMIT 1", ["text"])
    user_exists = plpy.execute(user_check, [c_by])
    
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
if APPEND_ONLY_TABLES.contains(table_only_name):
    return new_row

# Get MMN for the table with error handling
try:
    mmn_result = plpy.execute(f"SELECT pzero.get_mmn('{table_only_name}') as mmn")
    if not mmn_result or len(mmn_result) == 0:
        plpy.error(f'Unable to resolve MMN for table {table_only_name}')
        raise ValueError(f'No MMN found for table {table_only_name}')
    mmn = mmn_result[0]['mmn']
    if mmn is None:
        plpy.error(f'MMN is NULL for table {table_only_name}')
        raise ValueError(f'MMN is NULL for table {table_only_name}')
except Exception as e:
    plpy.error(f'Failed to get MMN: {e}')
    raise


# Log transaction with prepared statement
try:
    txn_stmt = plpy.prepare("INSERT INTO pzero.txns (id, c_by, c_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO NOTHING", ["bigint", "text"])
    plpy.execute(txn_stmt, [txid, c_by])
except Exception as e:
    plpy.warning(f'Failed to log transaction: {e}')
    # Continue processing even if transaction logging fails

if new_row and new_row.get('is_del'):
    # If the is_del column is set to true, log a deletion
    # get column no for is_del
    is_del_col_no = plpy.execute(f"SELECT get_column_no('{table_name}', 'is_del', '{schema_name}') as cno")[0]['cno']
    plpy.execute(
        f"INSERT INTO '{schema_name}'.all_audits (txn_id, mmn, row_id, cno, cval, is_del) VALUES ($1, $2, $3, $4, $5, TRUE)",
        [txid, mmn, old_row['id'], is_del_col_no, 'TRUE', True]
    )
    return  new_row

# Batch audit inserts for better performance
audit_inserts = []
for col_name in new_row:
    if col_name.lower() not in EXCLUDED_AUDIT_COLUMNS:
        try:
            # Get column number with caching
            col_no_result = plpy.execute(f"SELECT get_column_no('{table_name}', '{col_name}', '{schema_name}') as cno")
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
            
            audit_inserts.append((txid, mmn, id_val, col_no, col_value))
            
        except Exception as e:
            plpy.warning(f'Failed to prepare audit for column {col_name}: {e}')
            continue

# Execute batch insert with prepared statement
if audit_inserts:
    try:
        audit_stmt = plpy.prepare(
            f"INSERT INTO {schema_name}.all_audits (txn_id, mmn, rowid, cno, cval) VALUES ($1, $2, $3, $4, $5)",
            ["bigint", "text", "text", "integer", "text"]
        )
        for audit_row in audit_inserts:
            plpy.execute(audit_stmt, audit_row)
    except Exception as e:
        plpy.error(f'Failed to insert audit records: {e}')
        raise

return new_row
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

CREATE OR REPLACE FUNCTION pzero.check_relations_plpython () returns trigger AS $$
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

# Validate relation value
if not isinstance(relation, int) or relation < 1 or relation > MAX_RELATION_VALUE:
    plpy.error(f'Invalid relation type: {relation}. Must be between 1 and {MAX_RELATION_VALUE}')
    raise ValueError(f'Invalid relation type: {relation}')

# Check for cyclic relationships with prepared statement
try:
    cycle_check = plpy.prepare(
        "SELECT 1 FROM pzero.relations WHERE uuid2 = $1 AND uuid1 = $2 AND relation = $3 LIMIT 1",
        ["text", "text", "integer"]
    )
    result = plpy.execute(cycle_check, [uuid1, uuid2, relation])
    
    if result and len(result) > 0:
        plpy.error(f'Cyclic relationship detected between {uuid1} and {uuid2}')
        raise ValueError('Cyclic relationship detected')
except plpy.SPIError as e:
    plpy.error(f'Database error checking for cycles: {e}')
    raise

if TD['event'] == 'UPDATE':
    if old_row['uuid1'] != new_row['uuid1'] or old_row['uuid2'] != new_row['uuid2']:
        raise Exception('Cannot modify uuid1 or uuid2')

if TD['event'] == 'INSERT':
    uuid1_parts = new_row['uuid1'].split('-')
    uuid2_parts = new_row['uuid2'].split('-')
    if len(uuid1_parts) != 2 or len(uuid2_parts) != 2:
        raise Exception('Invalid UUID format for uuid1 or uuid2')
    
    mmn1 = uuid1_parts[0]
    mmn2 = uuid2_parts[0]
    table1 = plpy.execute(f"SELECT pzero.get_table_name('{mmn1}') as table_name")[0]['table_name']
    table2 = plpy.execute(f"SELECT pzero.get_table_name('{mmn2}') as table_name")[0]['table_name']
    
    if not table1 or not table2:
        raise Exception('Unable to resolve table names from MMNs')

return 'OK'
$$ language plpython3u;

CREATE OR REPLACE FUNCTION pzero.migrate_org () returns trigger AS $$
import plpy
import json

# Constants
MULTI_TENANT_SCHEMAS = ['pzero']  # Add more schemas as needed
SINGLE_TENANT_PREFIX = 'org_'

# Get row data
new_row = TD.get('new')
old_row = TD.get('old')
event = TD['event']

# Only process on INSERT or UPDATE
if event not in ['INSERT', 'UPDATE']:
    return new_row

# Check if this is a multi_tenant change
if event == 'UPDATE':
    old_multi_tenant = old_row.get('multi_tenant', True) if old_row else True
    new_multi_tenant = new_row.get('multi_tenant', True)
    
    # If multi_tenant hasn't changed, nothing to do
    if old_multi_tenant == new_multi_tenant:
        return new_row
    
    org_id = new_row.get('id')
    org_handle = new_row.get('handle')
    
    if not org_id or not org_handle:
        plpy.error('Organization must have ID and handle for migration')
        raise ValueError('Missing org ID or handle')
    
    # Migration from multi-tenant to single-tenant
    if old_multi_tenant and not new_multi_tenant:
        plpy.notice(f'Migrating org {org_handle} (ID: {org_id}) to single-tenant mode')
        
        # Create dedicated schema for this org
        schema_name = f"{SINGLE_TENANT_PREFIX}{org_handle.lower().replace('-', '_')}"
        
        try:
            # Create schema if it doesn't exist
            plpy.execute(f"CREATE SCHEMA IF NOT EXISTS {schema_name}")
            plpy.notice(f'Created schema {schema_name} for org {org_handle}')
            
            # Create necessary tables in the new schema by copying structure
            tables_to_migrate = [
                'all_auth', 'all_users', 'all_sessions', 'all_devices',
                'all_endpoints', 'all_threads', 'all_thread_heads'
            ]
            
            for table in tables_to_migrate:
                try:
                    # Create table structure in new schema
                    plpy.execute(f"""
                        CREATE TABLE IF NOT EXISTS {schema_name}.{table} 
                        (LIKE pzero.{table} INCLUDING ALL)
                    """)
                    plpy.notice(f'Created table {schema_name}.{table}')
                    
                    # Migrate existing data for this org
                    # This assumes there's an org_id column or relation to identify org data
                    # Adjust the WHERE clause based on your actual schema
                    plpy.execute(f"""
                        INSERT INTO {schema_name}.{table}
                        SELECT * FROM pzero.{table}
                        WHERE id IN (
                            SELECT uuid2 FROM pzero.relations 
                            WHERE uuid1 = '{org_id}' 
                            AND relation = (SELECT 1)  -- Adjust based on your relation types
                        )
                        ON CONFLICT DO NOTHING
                    """)
                    
                except plpy.SPIError as e:
                    plpy.warning(f'Error migrating table {table}: {e}')
                    continue
            
            # Store schema mapping in org data
            if new_row.get('data'):
                data = json.loads(new_row['data']) if isinstance(new_row['data'], str) else new_row['data']
            else:
                data = {}
            
            data['dedicated_schema'] = schema_name
            new_row['data'] = json.dumps(data)
            
            plpy.notice(f'Successfully migrated org {org_handle} to single-tenant mode')
            
        except plpy.SPIError as e:
            plpy.error(f'Failed to create single-tenant schema: {e}')
            raise
    
    # Migration from single-tenant to multi-tenant
    elif not old_multi_tenant and new_multi_tenant:
        plpy.notice(f'Migrating org {org_handle} (ID: {org_id}) back to multi-tenant mode')
        
        # Get the dedicated schema name
        if old_row.get('data'):
            data = json.loads(old_row['data']) if isinstance(old_row['data'], str) else old_row['data']
            schema_name = data.get('dedicated_schema')
            
            if schema_name:
                try:
                    # Migrate data back to shared schema
                    tables_to_migrate = [
                        'all_auth', 'all_users', 'all_sessions', 'all_devices',
                        'all_endpoints', 'all_threads', 'all_thread_heads'
                    ]
                    
                    for table in tables_to_migrate:
                        try:
                            # Move data back to pzero schema
                            plpy.execute(f"""
                                INSERT INTO pzero.{table}
                                SELECT * FROM {schema_name}.{table}
                                ON CONFLICT DO NOTHING
                            """)
                            plpy.notice(f'Migrated data from {schema_name}.{table} to pzero.{table}')
                            
                        except plpy.SPIError as e:
                            plpy.warning(f'Error migrating table {table} back: {e}')
                            continue
                    
                    # Optionally drop the dedicated schema (or keep for backup)
                    # plpy.execute(f"DROP SCHEMA {schema_name} CASCADE")
                    plpy.notice(f'Schema {schema_name} retained for backup (not dropped)')
                    
                    # Remove schema mapping from org data
                    if new_row.get('data'):
                        data = json.loads(new_row['data']) if isinstance(new_row['data'], str) else new_row['data']
                        if 'dedicated_schema' in data:
                            del data['dedicated_schema']
                        new_row['data'] = json.dumps(data) if data else None
                    
                except plpy.SPIError as e:
                    plpy.error(f'Failed to migrate back to multi-tenant: {e}')
                    raise
            else:
                plpy.warning('No dedicated schema found for single-tenant org')

elif event == 'INSERT':
    # For new orgs with multi_tenant = false, set up single-tenant immediately
    if not new_row.get('multi_tenant', True):
        org_id = new_row.get('id')
        org_handle = new_row.get('handle')
        
        if org_handle:
            schema_name = f"{SINGLE_TENANT_PREFIX}{org_handle.lower().replace('-', '_')}"
            
            try:
                plpy.execute(f"CREATE SCHEMA IF NOT EXISTS {schema_name}")
                plpy.notice(f'Created schema {schema_name} for new single-tenant org {org_handle}')
                
                # Create tables in the new schema
                tables_to_create = [
                    'all_auth', 'all_users', 'all_sessions', 'all_devices',
                    'all_endpoints', 'all_threads', 'all_thread_heads'
                ]
                
                for table in tables_to_create:
                    plpy.execute(f"""
                        CREATE TABLE IF NOT EXISTS {schema_name}.{table} 
                        (LIKE pzero.{table} INCLUDING ALL)
                    """)
                    plpy.notice(f'Created table {schema_name}.{table}')
                
                # Store schema mapping
                if new_row.get('data'):
                    data = json.loads(new_row['data']) if isinstance(new_row['data'], str) else new_row['data']
                else:
                    data = {}
                
                data['dedicated_schema'] = schema_name
                new_row['data'] = json.dumps(data)
                
            except plpy.SPIError as e:
                plpy.error(f'Failed to create single-tenant schema for new org: {e}')
                raise

return new_row
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

triggers_created = []

try:
    # Create trigger for relations
    plpy.execute("""
        CREATE TRIGGER trigger_check_relations 
        BEFORE INSERT OR UPDATE OR DELETE ON pzero.relations
        FOR EACH ROW EXECUTE FUNCTION pzero.check_relations_trigger()
    """)
    triggers_created.append('trigger_check_relations')
    plpy.notice('Created trigger trigger_check_relations on table pzero.relations')
    
except plpy.SPIError as e:
    if 'already exists' not in str(e).lower():
        plpy.error(f'Failed to create relations trigger: {e}')
        raise
    plpy.notice('Trigger trigger_check_relations already exists')

# Tables to add audit triggers to
tables = [
    'pzero.all_devices', 'pzero.all_endpoints', 'pzero.all_sessions', 
    'pzero.all_orgs', 'pzero.all_auth', 'pzero.all_users',  
    'pzero.all_thread_heads', 'pzero.all_threads', 'pzero.txns', 'pzero.all_audits'
]

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
        plpy.notice(f'Created trigger {trigger_name} on table {target_table}')
        
    except plpy.SPIError as e:
        if 'already exists' not in str(e).lower():
            plpy.warning(f'Failed to create trigger {trigger_name}: {e}')
            # Continue with other triggers
        else:
            plpy.notice(f'Trigger {trigger_name} already exists')

plpy.notice(f'Successfully created/verified {len(triggers_created)} triggers')
$$ language plpython3u;

SELECT
  pzero.create_triggers_plpython ();
