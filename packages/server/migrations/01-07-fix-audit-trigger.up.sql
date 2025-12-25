-- Fix for audit_trigger_plpython: Return "MODIFY" instead of new_row when is_del = True
-- This fixes the error: "unexpected return value from trigger procedure"
-- Run this script directly against your database to update the function

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
        user_check = plpy.prepare("SELECT id FROM pzero.all_auth where is_act = true order by id desc limit 1", [])
        user_exists = plpy.execute(user_check, [])
        if user_exists and len(user_exists) > 0:
            c_by = user_exists[0]['id']
            dev_notice(f'No c_by provided, defaulting to latest active user {c_by}')
        else:
            plpy.error(f'No c_by provided and no active users found to default to')
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
    return "MODIFY"

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

