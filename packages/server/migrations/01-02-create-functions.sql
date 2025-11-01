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
    raise Exception('table_name and column_name are required')

ordinal_name = f'ordinal_{schema_name}_{table_name}'

# Use GD (global dictionary) for caching across function calls
if 'cache' not in GD:
    GD['cache'] = {}

if ordinal_name in GD['cache'] and column_name in GD['cache'][ordinal_name]:
    return GD['cache'][ordinal_name][column_name]

if ordinal_name not in GD['cache']:
    GD['cache'][ordinal_name] = {}

stmt = "SELECT ordinal_position as pos FROM information_schema.columns WHERE table_schema = $3 AND table_name = $1 AND column_name = $2"
result = plpy.execute(stmt, [table_name, column_name, schema_name])

if len(result) > 0:
    GD['cache'][ordinal_name][column_name] = result[0]['pos']
    return result[0]['pos']

raise Exception(f'Column {column_name} not found in table {schema_name}.{table_name}')
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
--$$ language plv8 immutable;
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

CREATE OR REPLACE FUNCTION pzero.audit_trigger_plv8 () returns trigger AS $$
import plpy
import json

txid = plpy.execute("SELECT txid_current()")[0]['txid_current']
table_name = TD['table_name']
old_row = TD.get('old')  # Available for UPDATE and DELETE
new_row = TD.get('new')  # Available for INSERT and UPDATE
audit_columns = ['id', 'c_by', 'c_at', 'u_by', 'u_at', 'is_del', 'last_seen']
is_del_column = 'is_del'
c_by = new_row.get('c_by') if new_row else None
diffs = {}

if TD['event'] == 'DELETE':
    raise Exception('cannot delete record')

if old_row and new_row and new_row.get('u_by'):
    c_by = new_row['u_by']

if old_row and new_row and old_row.get('id') != new_row.get('id'):
    raise Exception('id for table not mutable')

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

id_val = new_row.get('id') if new_row else None
if not id_val:
    try:
        result = plpy.execute("select pzero.gen_monotonic_id() as id")
        id_val = result[0]['id']
        new_row['id'] = id_val
    except:
        raise Exception('Unable to gen id')

# Get MMN for the table
mmn = plpy.execute(f"SELECT pzero.get_mmn('{table_name}') as mmn")[0]['mmn']

if TD['event'] == 'INSERT':
    insert_ok = False
    while not insert_ok:
        try:
            if not new_row.get('id'):
                result = plpy.execute("SELECT pzero.gen_monotonic_id() as id")
                new_row['id'] = result[0]['id']
            
            row_exists = plpy.execute(f"SELECT 1 FROM {table_name} WHERE id = $1", [new_row['id']])
            if len(row_exists) > 0:
                result = plpy.execute("SELECT pzero.gen_monotonic_id() as id")
                new_row['id'] = result[0]['id']
            else:
                insert_ok = True
        except Exception as err:
            plpy.warning(f'Insert conflict, retrying: {err}')

plpy.execute("INSERT INTO pzero.txns (id, c_by, c_at) VALUES ($1, $2, NOW()) ON CONFLICT (txid) DO NOTHING", [txid, c_by])

if new_row and new_row.get('is_del'):
    # If the is_del column is set to true, log a deletion
    plpy.execute(
        "INSERT INTO pzero.audits (txn_id, mmn, row_id, col_name, new_val, is_del) VALUES ($1, $2, $3, $4, $5, TRUE)",
        [txid, mmn, old_row['id'], is_del_column, 'TRUE', True]
    )
    return 'OK'

if TD['event'] not in ['INSERT', 'UPDATE']:
    raise Exception(f"Unsupported event type: {TD['event']}")

for col_name in new_row:
    if col_name.lower() in audit_columns:
        col_no = plpy.execute(f"SELECT get_column_no('{table_name}', '{col_name}', 'pzero') as cno")[0]['cno']
        col_value = str(new_row[col_name])
        if col_name in diffs:
            col_value = json.dumps(diffs[col_name])
        
        plpy.execute(
            "INSERT INTO pzero.audits (txn_id, mmn, rowid, cno, cval) VALUES ($1, $2, $3, $4, $5)",
            [txid, mmn, id_val, col_no, col_value]
        )

return 'OK'
$$ language plpython3u;

CREATE OR REPLACE FUNCTION pzero.audit_threads_trigger_plv8 () returns trigger AS $$
import plpy
import json

txid = plpy.execute("SELECT txid_current()")[0]['txid_current']
table_name = TD['table_name']

if TD['event'] in ['UPDATE', 'DELETE']:
    plpy.error('Update or Delete on threads not allowed')
    raise Exception('Update or Delete on threads not allowed')

new_row = TD['new']  # Available for INSERT and UPDATE
data = new_row.get('data')
if data:
    data = json.loads(data) if isinstance(data, str) else data
    if 'meta' in data:
        del data['meta']

try:
    result = plpy.execute("select pzero.gen_monotonic_id() as id")
    id_val = result[0]['id']
    new_row['id'] = id_val
except:
    plpy.error('Unable to gen id')
    raise Exception('Unable to gen id')

if not new_row.get('root_id'):
    new_row['root_id'] = id_val

return 'OK'
$$ language plpython3u;

CREATE OR REPLACE FUNCTION pzero.relations_lookup_plv8 (relation integer) returns jsonb AS $$
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

CREATE OR REPLACE FUNCTION pzero.check_relations_plv8 () returns trigger AS $$
import plpy

new_row = TD['new']  # Available for INSERT and UPDATE
old_row = TD.get('old')  # Available for UPDATE

if TD['event'] == 'DELETE':
    raise Exception('Cannot delete relationship records')

if TD['event'] == 'UPDATE':
    if old_row['uuid1'] != new_row['uuid1'] or old_row['uuid2'] != new_row['uuid2']:
        raise Exception('Cannot modify uuid1 or uuid2')

if TD['event'] != 'INSERT':
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

parent_id = new_row.get('parent_id')
child_id = new_row.get('child_id')
relation_type = new_row.get('relation_type')

if not parent_id or not child_id or not relation_type:
    raise Exception('parent_id, child_id, and relation_type are required')

result = plpy.execute(
    "SELECT 1 FROM pzero.relations WHERE parent_id = $1 AND child_id = $2 AND relation_type = $3",
    [child_id, parent_id, relation_type]
)

if len(result) > 0:
    raise Exception('Cyclic relationship detected')

return 'OK'
$$ language plpython3u;

CREATE FUNCTION pzero.check_relations_trigger () returns trigger AS $$
BEGIN
    PERFORM pzero.check_relations_plv8(); -- Calls check_relations_plv8
    PERFORM pzero.audit_trigger_plv8(); -- Calls audit_trigger_plv8
        -- ... other logic or function calls
    RETURN NEW; -- Or OLD, or NULL depending on trigger type
END;
$$ language plpgsql;

CREATE OR REPLACE FUNCTION pzero.create_triggers_plv8 () returns void AS $$
import plpy

# Create trigger for relations
plpy.execute("""
    CREATE TRIGGER pzero.trigger_check_relations BEFORE INSERT OR UPDATE ON pzero.relations
    FOR EACH ROW EXECUTE FUNCTION pzero.check_relations_trigger()
""")

tables = ['pzero.all_devices', 'pzero.all_endpoints', 'pzero.all_sessions', 'pzero.all_orgs', 'pzero.all_auth', 'pzero.all_users']

for target_table in tables:
    trigger_name = f"pzero.audit_trigger_{target_table.replace('.', '_')}"
    sql = f"""
        CREATE TRIGGER {trigger_name}
        BEFORE INSERT OR UPDATE OR DELETE ON {target_table}
        FOR EACH ROW EXECUTE FUNCTION pzero.audit_trigger_plv8()
    """
    plpy.execute(sql)
    plpy.notice(f'Created trigger {trigger_name} on table {target_table}')

# Create trigger for threads
sql = """
    CREATE TRIGGER pzero.audit_trigger_threads
    BEFORE INSERT OR UPDATE OR DELETE ON pzero.threads
    FOR EACH ROW EXECUTE FUNCTION pzero.audit_threads_trigger_plv8()
"""
plpy.execute(sql)
plpy.notice('Created trigger pzero.audit_trigger_threads on table pzero.threads')
$$ language plpython3u;

SELECT
  pzero.create_triggers_plv8 ();
