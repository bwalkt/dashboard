-- CRUD Functions for pzero schema
-- Insert function that automatically handles meta.c_by injection
-- Parameters:
--   p_table_name: Name of the table (without 'pzero.' prefix)
--   p_c_by: User ID performing the insert
--   p_fields: JSONB object with field names and values {"field_name": "value", ...}
--   p_data: Additional data to include (meta.c_by will be automatically added/merged)
-- Returns: ID of the inserted record
CREATE OR REPLACE FUNCTION pzero.insert_into_table (
  p_table_name text,
  p_c_by text,
  p_fields jsonb,
  p_data jsonb DEFAULT '{}'::jsonb
) returns text AS $$
import plpy
import json

# Validate inputs
if not p_table_name:
    plpy.error('table_name is required')
if not p_c_by:
    plpy.error('c_by is required')

table_name = p_table_name.strip()
c_by = p_c_by.strip()

# Parse JSONB inputs
try:
    fields = json.loads(p_fields) if isinstance(p_fields, str) else p_fields
    data = json.loads(p_data) if isinstance(p_data, str) else p_data
except Exception as e:
    plpy.error(f'Invalid JSON input: {e}')

# Ensure data is a dict
if not isinstance(data, dict):
    data = {}

# Merge meta.c_by into data
if 'meta' not in data:
    data['meta'] = {}
if not isinstance(data['meta'], dict):
    data['meta'] = {}
data['meta']['c_by'] = c_by

# Build column and value lists
columns = []
values = []
param_types = []

# Add data column first
columns.append('data')
values.append(json.dumps(data))
param_types.append('jsonb')

# Get column types for the table to handle type casting properly
try:
    type_query = plpy.prepare("""
        SELECT column_name, udt_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'pzero' AND table_name = $1
    """, ["text"])
    column_types = {row['column_name']: (row['data_type'], row['udt_name'])
                    for row in plpy.execute(type_query, [table_name])}
except Exception as e:
    plpy.warning(f'Could not fetch column types: {e}')
    column_types = {}

# Add fields from p_fields
if fields and isinstance(fields, dict):
    for key, value in fields.items():
        # Sanitize column name (basic validation)
        if not key or not isinstance(key, str):
            plpy.warning(f'Skipping invalid field key: {key}')
            continue

        columns.append(key)

        # Get column type info
        col_info = column_types.get(key, ('text', 'text'))
        data_type, udt_name = col_info

        # Handle different value types
        if value is None:
            values.append(None)
            param_types.append('text')
        elif isinstance(value, (dict, list)):
            # For complex types, serialize as JSONB
            values.append(json.dumps(value))
            param_types.append('jsonb')
        else:
            # For UUID/id types, pass as text with explicit cast
            if udt_name in ('id', 'uuid') or data_type == 'USER-DEFINED':
                values.append(str(value))
                param_types.append(udt_name)
            else:
                # For simple types, pass as text and let PostgreSQL handle casting
                values.append(str(value))
                param_types.append('text')

# Build SQL with parameter placeholders
col_str = ', '.join(columns)
placeholders = []
for i, (col, ptype) in enumerate(zip(columns, param_types), 1):
    if ptype == 'jsonb':
        placeholders.append(f'${i}::jsonb')
    elif ptype in ('id', 'uuid'):
        # Get the full type name from column_types
        col_info = column_types.get(col, ('text', 'text'))
        if col_info[1] == 'id':
            placeholders.append(f'${i}::pzero.id')
        elif col_info[1] == 'uuid':
            placeholders.append(f'${i}::uuid')
        else:
            placeholders.append(f'${i}')
    else:
        placeholders.append(f'${i}')

sql = f"INSERT INTO pzero.{table_name} ({col_str}) VALUES ({', '.join(placeholders)}) RETURNING id"

plpy.notice(f"Executing INSERT on pzero.{table_name}")
plpy.notice(f"Columns: {columns}")
plpy.notice(f"SQL: {sql}")

# Prepare and execute statement
try:
    stmt = plpy.prepare(sql, param_types)
    result = plpy.execute(stmt, values)

    if result and len(result) > 0:
        inserted_id = result[0]['id']
        plpy.notice(f"Successfully inserted record with id: {inserted_id}")
        return str(inserted_id)
    else:
        plpy.error('Insert did not return an id')
except plpy.SPIError as e:
    plpy.error(f'Database error during insert: {e}')
    raise
except Exception as e:
    plpy.error(f'Unexpected error during insert: {e}')
    raise

$$ language plpython3u;

-- Example usage:
-- SELECT pzero.insert_into_table(
--   'all_orgs',
--   '019a9ef8-149a-7e3f-9d84-e1a709627a85',
--   '{"name": "Test Org", "handle": "testorg", "website": "test.com"}'::jsonb,
--   '{"industry": "technology", "founded": 2020}'::jsonb
-- );
-- Or with jsonb_build_object:
-- SELECT pzero.insert_into_table(
--   'all_orgs',
--   (SELECT id::text FROM pzero.all_auth WHERE email = 'admin@example.com'),
--   jsonb_build_object(
--     'name', 'Boardwalk Technologies',
--     'handle', 'bwalk',
--     'part_by', 'pzero',
--     'website', 'https://www.boardwalktech.com'
--   ),
--   jsonb_build_object(
--     'industry', 'technology',
--     'founded', 2020,
--     'employees', 50
--   )
-- );
-- ============================================
-- Create User Function
-- ============================================
-- Creates a complete user with auth record and user profile in a single transaction
--
-- Parameter: p_user (JSONB) - User data
--
-- Required fields:
--   name: User's full name
--   email: User's email address (must be unique)
--
-- Optional fields:
--   org_id: Organization ID (defaults to 'pzero' org)
--   part: Partition key (defaults to 'pzero')
--   avatar: User's avatar URL
--   email_verified: Whether email is verified (defaults to false)
--   data: Additional user data (JSONB)
--     data.meta.c_by: Creator ID (if not provided, uses self-referential auth ID)
--
-- Returns: JSONB object with auth_id, user_id, email, name, org_id, part
--
-- Example usage:
--   SELECT pzero.create_user(jsonb_build_object(
--     'name', 'John Doe',
--     'email', 'john@example.com'
--   ));
--
--   SELECT pzero.create_user(jsonb_build_object(
--     'name', 'Jane Smith',
--     'email', 'jane@example.com',
--     'data', jsonb_build_object(
--       'department', 'Engineering',
--       'meta', jsonb_build_object('c_by', '019a9f56-2d65-7bd0-b764-9f79183c7672')
--     )
--   ));
CREATE OR REPLACE FUNCTION pzero.create_user (p_user jsonb) returns jsonb AS $$
import plpy
import json

# Parse input
try:
    user_input = json.loads(p_user) if isinstance(p_user, str) else p_user
except Exception as e:
    plpy.error(f'Invalid JSON input: {e}')

if not isinstance(user_input, dict):
    plpy.error('Input must be a JSON object')

# Extract required fields
name = user_input.get('name', '').strip() if user_input.get('name') else None
email = user_input.get('email', '').strip().lower() if user_input.get('email') else None

if not name:
    plpy.error('name is required')
if not email:
    plpy.error('email is required')

# Extract optional fields
org_id = user_input.get('org_id', '').strip() if user_input.get('org_id') else None
part = user_input.get('part', 'pzero').strip()
avatar = user_input.get('avatar', '').strip() if user_input.get('avatar') else None
email_verified = user_input.get('email_verified', False)
user_data = user_input.get('data', {}) if isinstance(user_input.get('data'), dict) else {}

# Extract c_by from data.meta.c_by if provided
c_by = None
if isinstance(user_data.get('meta'), dict):
    c_by = user_data['meta'].get('c_by', '').strip() if user_data['meta'].get('c_by') else None

# Get default org_id if not provided
if not org_id:
    default_org_query = "SELECT id::text FROM pzero.all_orgs WHERE handle = 'pzero'"
    default_org_result = plpy.execute(default_org_query)
    if default_org_result and len(default_org_result) > 0:
        org_id = default_org_result[0]['id']
    else:
        plpy.error('org_id is required (no default org found)')

plpy.notice(f"Creating user: {name} ({email})")

# Step 1: Create auth record with email
try:
    auth_sql = "INSERT INTO pzero.all_auth (email, email_verified) VALUES ($1, $2) RETURNING id"
    auth_stmt = plpy.prepare(auth_sql, ["text", "boolean"])
    auth_result = plpy.execute(auth_stmt, [email, email_verified])

    if not auth_result or len(auth_result) == 0:
        plpy.error('Failed to create auth record')

    auth_id = str(auth_result[0]['id'])
    plpy.notice(f"Auth record created: {auth_id}")

except plpy.SPIError as e:
    if 'duplicate key' in str(e).lower() and 'email' in str(e).lower():
        plpy.error(f'Email {email} already exists')
    else:
        plpy.error(f'Database error creating auth record: {e}')
    raise
except Exception as e:
    plpy.error(f'Unexpected error creating auth record: {e}')
    raise

# Step 2: Set c_by in data.meta
# If c_by provided, use it; otherwise use auth_id (self-referential)
if 'meta' not in user_data:
    user_data['meta'] = {}
if not isinstance(user_data['meta'], dict):
    user_data['meta'] = {}
user_data['meta']['c_by'] = c_by if c_by else auth_id

# Step 3: Create user record with name
try:
    user_sql = """
        INSERT INTO pzero.all_users (id, name, org_id, part, avatar, data)
        VALUES ($1::pzero.id, $2, $3::pzero.id, $4, $5, $6::jsonb)
        RETURNING id
    """
    user_stmt = plpy.prepare(user_sql, ["text", "text", "text", "text", "text", "text"])
    user_result = plpy.execute(user_stmt, [
        auth_id,
        name,
        org_id,
        part,
        avatar,
        json.dumps(user_data)
    ])

    if not user_result or len(user_result) == 0:
        plpy.error('Failed to create user record')

    user_id = str(user_result[0]['id'])
    plpy.notice(f"User record created: {user_id}")

except plpy.SPIError as e:
    plpy.error(f'Database error creating user record: {e}')
    raise
except Exception as e:
    plpy.error(f'Unexpected error creating user record: {e}')
    raise

# Return result
result = {
    'auth_id': auth_id,
    'user_id': user_id,
    'email': email,
    'name': name,
    'org_id': org_id,
    'part': part
}

return json.dumps(result)

$$ language plpython3u;

-- More examples:
-- Minimal (only required fields):
-- SELECT pzero.create_user(jsonb_build_object(
--   'name', 'John Doe',
--   'email', 'john.doe@example.com'
-- ));
-- With org_id:
-- SELECT pzero.create_user(jsonb_build_object(
--   'name', 'Jane Smith',
--   'email', 'jane.smith@example.com',
--   'org_id', (SELECT id::text FROM pzero.all_orgs WHERE handle = 'acme')
-- ));
-- With additional data:
-- SELECT pzero.create_user(jsonb_build_object(
--   'name', 'Bob Johnson',
--   'email', 'bob@example.com',
--   'data', jsonb_build_object('department', 'Engineering', 'title', 'Developer')
-- ));
-- With c_by (when created by another user):
-- SELECT pzero.create_user(jsonb_build_object(
--   'name', 'Alice Wong',
--   'email', 'alice@example.com',
--   'data', jsonb_build_object(
--     'meta', jsonb_build_object(
--       'c_by', (SELECT id::text FROM pzero.all_auth WHERE email = 'admin@example.com')
--     )
--   )
-- ));
