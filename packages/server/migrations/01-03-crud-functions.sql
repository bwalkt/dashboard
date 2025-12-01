-- Helper function to generate unique handles
CREATE OR REPLACE FUNCTION pzero.generate_unique_handle(p_name text) RETURNS text AS $$
import plpy
import re
import time

def generate_unique_handle(name):
    # --Clean the name: remove special characters, keep only alphanumeric
    clean_name = re.sub(r'[^a-zA-Z0-9\s]', '', name)
    
    # --Split into words and take first 8 characters total
    words = clean_name.split()
    if not words:
        base_handle = 'user'
    elif len(words) == 1:
        # Single word: take first 8 characters
        base_handle = words[0][:8]
    else:
        # Multiple words: take first 4 chars from first word + first 4 from second
        first_word = words[0][:4] if len(words[0]) >= 4 else words[0]
        second_word = words[1][:8-len(first_word)] if len(words) > 1 else ''
        base_handle = first_word + second_word
    
    # --Convert to lowercase for consistency
    base_handle = base_handle.lower()
    
    # --Ensure its not empty and has valid characters
    if not base_handle or not re.match(r'^[a-z]', base_handle):
        base_handle = 'user'
    
    # --Check if base handle exists, if not return it
    check_sql = "SELECT COUNT(*) as count FROM pzero.all_users WHERE handle = $1"
    check_stmt = plpy.prepare(check_sql, ["text"])
    
    # Try base handle first
    result = plpy.execute(check_stmt, [base_handle])
    if result[0]['count'] == 0:
        return base_handle
    
    # --If base exists, try with numbers
    counter = 1
    while counter <= 9999:  # Reasonable limit
        test_handle = base_handle + str(counter)
        result = plpy.execute(check_stmt, [test_handle])
        if result[0]['count'] == 0:
            return test_handle
        counter += 1
    
    # If all else fails, use timestamp-based handle
    return base_handle + str(int(time.time()) % 10000)

# --Main function execution
if not p_name or not p_name.strip():
    return 'user'

return generate_unique_handle(p_name.strip())

$$ LANGUAGE plpython3u;

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

# Helper function to print notices only in development mode
def dev_notice(msg):
    try:
        env_result = plpy.execute("SHOW app.environment")
        environment = env_result[0]['app.environment'] if env_result else 'production'
        if environment == 'development':
            plpy.notice(msg)
    except:
        pass  # Silently ignore if environment check fails

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
    plpy.error('Invalid JSON input for table insert: {}'.format(str(e)))

# Ensure data is a dict
if not isinstance(data, dict):
    data = {}

# Merge meta.c_by into data
if 'meta' not in data:
    data['meta'] = {}
if not isinstance(data['meta'], dict):
    data['meta'] = {}
if c_by is not None:    
    data['meta']['c_by'] = c_by

# Build column and value lists (with escaped column names)
columns = []  # Will store escaped column names
column_keys = []  # Will store original keys for type lookup
values = []
param_types = []

# Add data column first
columns.append('data')  # 'data' is safe, hardcoded
column_keys.append('data')
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
    plpy.warning('Could not fetch column types: {}'.format(str(e)))
    column_types = {}

# Add fields from p_fields with immediate escaping
if fields and isinstance(fields, dict):
    for key, value in fields.items():
        # Validate column name
        if not key or not isinstance(key, str):
            plpy.warning('Skipping invalid field key: {}'.format(key))
            continue

        # Escape column name immediately to prevent SQL injection
        safe_col_query = plpy.prepare("SELECT quote_ident($1)", ["text"])
        safe_col = plpy.execute(safe_col_query, [key])[0]['quote_ident']

        columns.append(safe_col)
        column_keys.append(key)  # Store original for type lookup

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

# Safely quote table name to prevent SQL injection
safe_table_query = plpy.prepare("SELECT quote_ident($1)", ["text"])
safe_table = plpy.execute(safe_table_query, [table_name])[0]['quote_ident']

# Build SQL with parameter placeholders (columns are already escaped)
col_str = ', '.join(columns)
placeholders = []
for i, (col_key, ptype) in enumerate(zip(column_keys, param_types), 1):
    if ptype == 'jsonb':
        placeholders.append('${}::jsonb'.format(i))
    elif ptype in ('id', 'uuid'):
        # Get the full type name from column_types using original key
        col_info = column_types.get(col_key, ('text', 'text'))
        if col_info[1] == 'id':
            placeholders.append('${}::uuid'.format(i))
        elif col_info[1] == 'uuid':
            placeholders.append('${}::uuid'.format(i))
        else:
            placeholders.append('${}'.format(i))
    else:
        placeholders.append('${}'.format(i))

sql = "INSERT INTO pzero.{} ({}) VALUES ({}) RETURNING id".format(safe_table, col_str, ', '.join(placeholders))

dev_notice("Executing INSERT on pzero.{}".format(table_name))
dev_notice("Columns: {}".format(columns))
dev_notice("SQL: {}".format(sql))

# Prepare and execute statement
try:
    stmt = plpy.prepare(sql, param_types)
    result = plpy.execute(stmt, values)

    if result and len(result) > 0:
        inserted_id = result[0]['id']
        dev_notice("Successfully inserted record with id: {}".format(inserted_id))
        return str(inserted_id)
    else:
        plpy.error('Insert did not return an id')
except plpy.SPIError as e:
    # plpy.error('Database error during insert')
    raise
    raise
except Exception as e:
    # plpy.error('Unexpected error during insert')
    raise
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

# Helper function to print notices only in development mode
def dev_notice(msg):
    try:
        env_result = plpy.execute("SHOW app.environment")
        environment = env_result[0]['app.environment'] if env_result else 'production'
        if environment == 'development':
            plpy.notice(msg)
    except:
        pass  # Silently ignore if environment check fails


# Parse input
try:
    user_input = json.loads(p_user) if isinstance(p_user, str) else p_user
except Exception as e:
    plpy.error('Invalid JSON input for user creation: {}'.format(str(e)))

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
c_by = user_input.get('c_by', '').strip() if user_input.get('c_by') else None
user_data = user_input.get('data', {}) if isinstance(user_input.get('data'), dict) else {}
device_data = user_input.get('device', {}) if isinstance(user_input.get('device'), dict) else {}
# remove device_data from user_data if present
if 'device' in user_data:
    del user_data['device']
# Extract c_by from data.meta.c_by if provided

if not c_by and isinstance(user_data.get('meta'), dict):
    c_by = user_data['meta'].get('c_by', '').strip() if user_data['meta'].get('c_by') else None

# Get default org_id if not provided
if not org_id:
    default_org_query = "SELECT id::text, part_by::text FROM pzero.all_orgs WHERE handle = 'pzero'"
    default_org_result = plpy.execute(default_org_query)
    if default_org_result and len(default_org_result) > 0:
        org_id = default_org_result[0]['id']
        part = default_org_result[0]['part_by']
        if not part:
            part = 'pzero'
    else:
        plpy.error('org_id is required (no default org found)')

dev_notice("Creating user: {} ({})".format(name, email))

# Step 1: Create auth record with email
try:
    auth_sql = "INSERT INTO pzero.all_auth (email, email_verified) VALUES ($1, $2) RETURNING id"
    auth_stmt = plpy.prepare(auth_sql, ["text", "boolean"])
    auth_result = plpy.execute(auth_stmt, [email, email_verified])

    if not auth_result or len(auth_result) == 0:
        plpy.error('Failed to create auth record')

    auth_id = str(auth_result[0]['id'])
    dev_notice("Auth record created: {}".format(auth_id))

except plpy.SPIError as e:
    # Check SQLSTATE for unique_violation (23505)
    if hasattr(e, 'sqlstate') and e.sqlstate == '23505':
        plpy.error('Email {} already exists'.format(email))
    else:
        # plpy.error('Database error creating auth record')
        raise
    raise
except Exception as e:
    # plpy.error('Unexpected error creating auth record')
    raise
    raise

# Step 2: Set c_by in data.meta
# If c_by provided, use it; otherwise use auth_id (self-referential)
if 'meta' not in user_data:
    user_data['meta'] = {}
if not isinstance(user_data['meta'], dict):
    user_data['meta'] = {}
user_data['meta']['c_by'] = c_by if c_by else auth_id

# Step 3: Generate unique handle and create user record
try:
    # Generate unique handle from name using standalone function
    handle_stmt = plpy.prepare("SELECT pzero.generate_unique_handle($1) as handle", ["text"])
    handle_result = plpy.execute(handle_stmt, [name])
    user_handle = handle_result[0]['handle']
    dev_notice("Generated handle: {}".format(user_handle))
    
    user_sql = """
        INSERT INTO pzero.all_users (id, name, handle, org_id, part, avatar, data)
        VALUES ($1::uuid, $2, $3, $4::uuid, $5, $6, $7::jsonb)
        RETURNING id
    """
    user_stmt = plpy.prepare(user_sql, ["text", "text", "text", "text", "text", "text", "text"])
    
    # Debug the parameters being passed
    dev_notice("User creation parameters:")
    dev_notice("auth_id: {}".format(auth_id))
    dev_notice("name: {}".format(name))
    dev_notice("handle: {}".format(user_handle))
    dev_notice("org_id: {}".format(org_id))
    dev_notice("part: {}".format(part))
    dev_notice("avatar: {}".format(avatar))
    dev_notice("user_data: {}".format(json.dumps(user_data)))
    
    user_result = plpy.execute(user_stmt, [
        auth_id,
        name,
        user_handle,
        org_id,
        part,
        avatar,
        json.dumps(user_data)
    ])

    if not user_result or len(user_result) == 0:
        plpy.error('Failed to create user record')

    user_id = str(user_result[0]['id'])
    dev_notice("User record created: {}".format(user_id))

except plpy.SPIError as e:
    # Just re-raise the exception without calling plpy.error
    raise
except Exception as e:
    # Just re-raise the exception without calling plpy.error
    raise

# Step 4: (Optional) Log device info if provided
if device_data and isinstance(device_data, dict) and len(device_data) > 0:
    try:
        dev_notice("Logging device info to pzero.all_devices")
        
        # Extract device fields and validate type
        device_type_raw = device_data.get('type', 'OTHER').strip().upper()
        # Map common values to enum values
        type_mapping = {
            'MOBILE': 'MOBILE',
            'TABLET': 'TABLET', 
            'DESKTOP': 'DESKTOP',
            'LAPTOP': 'LAPTOP',
            'CURL_TEST': 'OTHER',
            'UNKNOWN': 'OTHER'
        }
        device_type = type_mapping.get(device_type_raw, 'OTHER')
        
        # Validate device status
        device_status_raw = device_data.get('status', 'ACTIVE').strip().upper()
        status_mapping = {
            'ACTIVE': 'ACTIVE',
            'INACTIVE': 'INACTIVE',
            'LOST': 'LOST',
            'UNKNOWN': 'UNKNOWN'
        }
        device_status = status_mapping.get(device_status_raw, 'ACTIVE')
        
        # Get device name (use deviceName or default to "Device")
        device_name = device_data.get('deviceName', 'Device').strip()
        if not device_name:
            device_name = 'Device'
            
        # Generate unique handle for device
        device_handle_stmt = plpy.prepare("SELECT pzero.generate_unique_handle($1) as handle", ["text"])
        device_handle_result = plpy.execute(device_handle_stmt, [device_name])
        device_handle = device_handle_result[0]['handle']
        
        # Prepare device data (copy the device_data and add metadata)
        device_record_data = dict(device_data)  # Make a copy
        
        # Remove type and status from data since they have explicit columns
        if 'type' in device_record_data:
            del device_record_data['type']
        if 'status' in device_record_data:
            del device_record_data['status']
            
        if 'meta' not in device_record_data:
            device_record_data['meta'] = {}
        device_record_data['meta']['c_by'] = c_by if c_by else auth_id
        
        # --Generate a new UUID for the device record (don't use device.id which is internal)
        device_uuid_result = plpy.execute("SELECT gen_random_uuid()::text as device_uuid")
        device_uuid = device_uuid_result[0]['device_uuid']
        
        dev_notice("Device UUID: {}, User UUID: {}, Type: {}".format(device_uuid, auth_id, device_type))
        
        device_sql = """
            INSERT INTO pzero.all_devices (id, name, handle, uid, type, status, data)
            VALUES ($1::uuid, $2, $3, $4::uuid, $5::pzero.device_type, $6::pzero.device_status, $7::jsonb)
            RETURNING id
        """
        device_stmt = plpy.prepare(device_sql, ["text", "text", "text", "text", "text", "text", "text"])
        device_result = plpy.execute(device_stmt, [
            device_uuid,
            device_name,
            device_handle,
            auth_id,
            device_type,
            device_status,
            json.dumps(device_record_data)
        ])
        
        if device_result and len(device_result) > 0:
            device_record_id = device_result[0]['id']
            dev_notice("Device record created: {}".format(device_record_id))
        else:
            dev_notice("Warning: Device record creation returned no result")
    except plpy.SPIError as e:
        dev_notice("Database error logging device info: {}".format(str(e)))
        # --Dont raise - just log the error, device logging is optional
        pass
    except Exception as e:
        dev_notice("Unexpected error logging device info: {}".format(str(e)))
        # --Don't raise - just log the error, device logging is optional
        pass

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
-- ============================================
-- Create Organization Function
-- ============================================
-- Creates an organization with a clean JSON API
--
-- Parameter: p_org (JSONB) - Organization data
--
-- Required fields:
--   handle: Organization handle (must be unique)
--   name: Organization name
--   c_by: Creator user ID
--
-- Optional fields:
--   website: Organization website URL
--   data: Additional organization data (JSONB)
--
-- Returns: Organization ID
--
-- Example usage:
--   SELECT pzero.create_org(jsonb_build_object(
--     'handle', 'pzero',
--     'name', 'P-Zero Default Org',
--     'website', 'https://pzero.com',
--     'c_by', '019a9f56-2d65-7bd0-b764-9f79183c7672',
--     'data', jsonb_build_object('is_default', true)
--   ));
CREATE OR REPLACE FUNCTION pzero.create_org (p_org jsonb) returns text AS $$
import plpy
import json

# Helper function to print notices only in development mode
def dev_notice(msg):
    try:
        env_result = plpy.execute("SHOW app.environment")
        environment = env_result[0]['app.environment'] if env_result else 'production'
        if environment == 'development':
            plpy.notice(msg)
    except:
        pass  # Silently ignore if environment check fails

# Parse input
try:
    org_input = json.loads(p_org) if isinstance(p_org, str) else p_org
except Exception as e:
    plpy.error('Invalid JSON input for organization creation: {}'.format(str(e)))

if not isinstance(org_input, dict):
    plpy.error('Input must be a JSON object')

# Extract required fields
handle = org_input.get('handle', '').strip() if org_input.get('handle') else None
name = org_input.get('name', '').strip() if org_input.get('name') else None
c_by = org_input.get('c_by', '').strip() if org_input.get('c_by') else None

if not handle:
    plpy.error('handle is required')
if not name:
    plpy.error('name is required')
if not c_by:
    plpy.error('c_by is required')

# Extract optional fields
website = org_input.get('website', '').strip() if org_input.get('website') else None
org_data = org_input.get('data', {}) if isinstance(org_input.get('data'), dict) else {}

dev_notice("Creating organization: {} ({})".format(name, handle))

# Build fields object
fields = {
    'handle': handle,
    'name': name
}
if website:
    fields['website'] = website

# Call insert_into_table
try:
    insert_query = plpy.prepare("""
        SELECT pzero.insert_into_table(
            'all_orgs',
            $1,
            $2::jsonb,
            $3::jsonb
        )
    """, ["text", "text", "text"])

    result = plpy.execute(insert_query, [
        c_by,
        json.dumps(fields),
        json.dumps(org_data)
    ])

    if result and len(result) > 0:
        org_id = result[0]['insert_into_table']
        dev_notice("Organization created: {}".format(org_id))
        return org_id
    else:
        plpy.error('Failed to create organization')

except plpy.SPIError as e:
    # Check SQLSTATE for unique_violation (23505)
    if hasattr(e, 'sqlstate') and e.sqlstate == '23505':
        plpy.error('Organization handle {} already exists'.format(handle))
    else:
        # plpy.error('Database error creating organization')
        raise
    raise
except Exception as e:
    # plpy.error('Unexpected error creating organization')
    raise
    raise

$$ language plpython3u;

-- ============================================
-- Create Device Function
-- ============================================
-- Creates a device record for an existing user
--
-- Parameter: p_device (JSONB) - Device data
--
-- Required fields:
--   uid: User ID who owns the device
--   c_by: Creator user ID (can be different from uid for admin creation)
--
-- Optional fields:
--   id: Device UUID (if not provided, generates a new one)
--   name: Device name (defaults to "Device" if not provided)
--   handle: Device handle (auto-generated from nickname or name if not provided)
--   nickname: Device nickname (if provided and unique, used as handle)
--   type: Device type enum value (MOBILE, TABLET, DESKTOP, LAPTOP, OTHER - defaults to OTHER)
--   status: Device status enum value (ACTIVE, INACTIVE, LOST, UNKNOWN - defaults to ACTIVE)
--   is_primary: Whether this is the user's primary device (defaults to false)
--   is_verifier: Whether this device can verify other devices (defaults to false)
--   duration_used: Total duration device has been used in milliseconds (defaults to 0)
--   data: Additional device data (JSONB)
--
-- Returns: Device ID
--
-- Example usage:
--   SELECT pzero.create_device(jsonb_build_object(
--     'uid', '019ad123-4567-7890-abcd-123456789012',
--     'c_by', '019ad123-4567-7890-abcd-123456789012',
--     'name', 'iPhone 15 Pro',
--     'nickname', 'John''s iPhone',
--     'type', 'MOBILE',
--     'is_primary', true,
--     'data', jsonb_build_object('deviceModel', 'iPhone15,2', 'osVersion', '17.1')
--   ));
CREATE OR REPLACE FUNCTION pzero.create_device (p_device jsonb) returns text AS $$
import plpy
import json

# Helper function to print notices only in development mode
def dev_notice(msg):
    try:
        env_result = plpy.execute("SHOW app.environment")
        environment = env_result[0]['app.environment'] if env_result else 'production'
        if environment == 'development':
            plpy.notice(msg)
    except:
        pass  # Silently ignore if environment check fails

# Parse input
try:
    device_input = json.loads(p_device) if isinstance(p_device, str) else p_device
except Exception as e:
    plpy.error('Invalid JSON input for device creation: {}'.format(str(e)))

if not isinstance(device_input, dict):
    plpy.error('Input must be a JSON object')

# Extract required fields
uid = device_input.get('uid', '').strip() if device_input.get('uid') else None
c_by = device_input.get('c_by', '').strip() if device_input.get('c_by') else None

if not uid:
    plpy.error('uid (user ID) is required')
if not c_by:
    plpy.error('c_by (creator ID) is required')

# Verify that uid exists in all_auth
try:
    user_check_sql = "SELECT is_act FROM pzero.all_auth WHERE id = $1::uuid LIMIT 1"
    user_check_stmt = plpy.prepare(user_check_sql, ["text"])
    user_result = plpy.execute(user_check_stmt, [uid])
    
    if not user_result or len(user_result) == 0:
        plpy.error('User with uid {} does not exist'.format(uid))
    
    if not user_result[0]['is_act']:
        plpy.error('User with uid {} is not active'.format(uid))
        
except plpy.SPIError as e:
    raise
except Exception as e:
    raise

# Extract optional fields with defaults
device_id = device_input.get('id', '').strip() if device_input.get('id') else None
name = device_input.get('name', '').strip() if device_input.get('name') else 'Device'
handle = device_input.get('handle', '').strip() if device_input.get('handle') else None
nickname = device_input.get('nickname', '').strip() if device_input.get('nickname') else None
is_primary = device_input.get('is_primary', False)
is_verifier = device_input.get('is_verifier', False)
duration_used = device_input.get('duration_used', 0)
device_data = device_input.get('data', {}) if isinstance(device_input.get('data'), dict) else {}

# Validate and normalize device type
device_type_raw = device_input.get('type', 'OTHER').strip().upper()
type_mapping = {
    'MOBILE': 'MOBILE',
    'TABLET': 'TABLET',
    'DESKTOP': 'DESKTOP',
    'LAPTOP': 'LAPTOP',
    'OTHER': 'OTHER'
}
device_type = type_mapping.get(device_type_raw, 'OTHER')

# Validate and normalize device status
device_status_raw = device_input.get('status', 'ACTIVE').strip().upper()
status_mapping = {
    'ACTIVE': 'ACTIVE',
    'INACTIVE': 'INACTIVE',
    'LOST': 'LOST',
    'UNKNOWN': 'UNKNOWN'
}
device_status = status_mapping.get(device_status_raw, 'ACTIVE')

# Generate device ID if not provided
if not device_id:
    try:
        id_result = plpy.execute("SELECT pzero.gen_id()::text as device_id")
        device_id = id_result[0]['device_id']
    except:
        # Fallback to gen_random_uuid if gen_id fails
        id_result = plpy.execute("SELECT gen_random_uuid()::text as device_id")
        device_id = id_result[0]['device_id']

# Generate unique handle if not provided
if not handle:
    # First try to use nickname if provided and unique
    if nickname:
        dev_notice("Processing nickname: {}".format(nickname))
        try:
            # Check if nickname is unique as a handle
            import re
            # Convert to lowercase, replace spaces with underscores, remove invalid characters, truncate
            nickname_handle = re.sub(r'[^a-z0-9_]', '', nickname.lower().replace(' ', '_'))[:10]
            dev_notice("Converted nickname to handle: {}".format(nickname_handle))
            check_stmt = plpy.prepare("SELECT COUNT(*) as count FROM pzero.all_devices WHERE handle = $1", ["text"])
            result = plpy.execute(check_stmt, [nickname_handle])
            
            if result[0]['count'] == 0:
                # Nickname is unique, use it as handle
                handle = nickname_handle
                dev_notice("Using nickname as handle: {}".format(handle))
            else:
                # Nickname is not unique, generate from name with nickname prefix
                handle_stmt = plpy.prepare("SELECT pzero.generate_unique_handle($1) as handle", ["text"])
                handle_result = plpy.execute(handle_stmt, ["{}_{}".format(nickname, name)])
                handle = handle_result[0]['handle']
                dev_notice("Generated unique handle from nickname: {}".format(handle))
        except:
            # Fallback to generate from name
            try:
                handle_stmt = plpy.prepare("SELECT pzero.generate_unique_handle($1) as handle", ["text"])
                handle_result = plpy.execute(handle_stmt, [name])
                handle = handle_result[0]['handle']
            except:
                handle = 'device'
    else:
        # No nickname provided, generate from name
        try:
            handle_stmt = plpy.prepare("SELECT pzero.generate_unique_handle($1) as handle", ["text"])
            handle_result = plpy.execute(handle_stmt, [name])
            handle = handle_result[0]['handle']
        except:
            # Fallback to a simple handle if generation fails
            handle = 'device'

dev_notice("Creating device: {} for user {}".format(name, uid))

# Prepare device data with metadata
if 'meta' not in device_data:
    device_data['meta'] = {}
if not isinstance(device_data['meta'], dict):
    device_data['meta'] = {}
device_data['meta']['c_by'] = c_by

# Store nickname in device data if provided
if nickname:
    device_data['nickname'] = nickname

# Build fields for device creation
try:
    device_sql = """
        INSERT INTO pzero.all_devices (
            id, name, handle, uid, type, status, 
            is_primary, is_verifier, duration_used, data
        ) VALUES (
            $1::uuid, $2, $3, $4::uuid, $5::pzero.device_type, $6::pzero.device_status,
            $7::boolean, $8::boolean, $9::bigint, $10::jsonb
        ) RETURNING id
    """
    device_stmt = plpy.prepare(device_sql, [
        "text", "text", "text", "text", "text", "text",
        "boolean", "boolean", "bigint", "text"
    ])
    
    dev_notice("Device creation parameters:")
    dev_notice("device_id: {}".format(device_id))
    dev_notice("name: {}".format(name))
    dev_notice("handle: {}".format(handle))
    dev_notice("uid: {}".format(uid))
    dev_notice("type: {}".format(device_type))
    dev_notice("status: {}".format(device_status))
    dev_notice("is_primary: {}".format(is_primary))
    dev_notice("is_verifier: {}".format(is_verifier))
    dev_notice("duration_used: {}".format(duration_used))
    dev_notice("data: {}".format(json.dumps(device_data)))
    
    device_result = plpy.execute(device_stmt, [
        device_id,
        name,
        handle,
        uid,
        device_type,
        device_status,
        is_primary,
        is_verifier,
        duration_used,
        json.dumps(device_data)
    ])

    if not device_result or len(device_result) == 0:
        plpy.error('Failed to create device record')

    created_device_id = str(device_result[0]['id'])
    dev_notice("Device record created: {}".format(created_device_id))
    
    return created_device_id

except plpy.SPIError as e:
    # Check for unique constraint violations
    if hasattr(e, 'sqlstate') and e.sqlstate == '23505':
        if 'handle' in str(e):
            plpy.error('Device handle {} already exists'.format(handle))
        elif 'id' in str(e):
            plpy.error('Device ID {} already exists'.format(device_id))
        else:
            plpy.error('Unique constraint violation: {}'.format(str(e)))
    else:
        raise
except Exception as e:
    raise

$$ language plpython3u;
