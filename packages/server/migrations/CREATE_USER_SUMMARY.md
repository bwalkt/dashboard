# create_user() Function - Implementation Summary

## Overview

Successfully implemented `pzero.create_user()` function that creates a complete user with both authentication and profile records in a single atomic transaction.

## Function Signature

```sql
pzero.create_user(p_user jsonb) RETURNS jsonb
```

### Input Parameter (JSONB)

The function accepts a single JSONB object with the following fields:

**Required:**
- `name`: User's full name
- `email`: User's email (unique)

**Optional:**
- `org_id`: Organization ID (defaults to 'pzero' org if not provided)
- `part`: Partition key (defaults to 'pzero')
- `c_by`: Creator ID (defaults to self-referential - the new auth ID)
- `data`: Nested JSONB with additional user data
- Any other fields: Automatically go into user data

## Key Features

### ✅ JSON-Based API

**More readable and flexible!** Pass all parameters as a single JSON object:

```sql
-- Flat style (extra fields go into data)
SELECT pzero.create_user(jsonb_build_object(
  'name', 'John Doe',
  'email', 'john@example.com',
  'department', 'Engineering',  -- Goes into data
  'title', 'Developer'           -- Goes into data
));

-- Nested style (data under 'data' key)
SELECT pzero.create_user(jsonb_build_object(
  'name', 'Jane Smith',
  'email', 'jane@example.com',
  'data', jsonb_build_object(
    'department', 'Sales',
    'title', 'Manager'
  )
));

-- Minimal (uses defaults)
SELECT pzero.create_user(jsonb_build_object(
  'name', 'Bob Johnson',
  'email', 'bob@example.com'
));
```

### ✅ Automatic c_by Handling

**IMPORTANT**: The function automatically handles `c_by` for audit trail:
- **Default behavior**: If `c_by` not provided, uses the new auth ID (self-referential)
- **Optional override**: Can provide `c_by` in the JSON if needed
- **Auth record**: Audit trigger sets `c_by` to the new auth ID
- **User record**: Function sets `data.meta.c_by` to `c_by` (or auth_id)

### ✅ Default Organization

- If `org_id` not provided, uses the default 'pzero' organization
- No need to specify org_id for simple use cases
- Can override by providing `org_id` in the JSON

### ✅ Flexible Data Handling

**Three ways to provide user data:**

1. **Flat fields** - Any unknown fields go into data:
   ```json
   {
     "name": "John",
     "email": "john@example.com",
     "department": "Engineering"  // → data.department
   }
   ```

2. **Nested data** - Explicit data object:
   ```json
   {
     "name": "John",
     "email": "john@example.com",
     "data": {
       "department": "Engineering"
     }
   }
   ```

3. **Mixed** - Both flat and nested (merged):
   ```json
   {
     "name": "John",
     "email": "john@example.com",
     "department": "Engineering",  // → data.department
     "data": {
       "title": "Developer"        // → data.title
     }
   }
   ```

### ✅ Atomic Transaction

Both inserts happen in a single transaction:
- If auth creation fails → nothing is created
- If user creation fails → auth record is rolled back
- All-or-nothing guarantee

### ✅ Comprehensive Validation

- ✅ Name required
- ✅ Email required (must be unique)
- ✅ Org_id optional (defaults to 'pzero' org)
- ✅ Duplicate email detection
- ✅ Foreign key validation

### ✅ Complete Audit Trail

Creates ~9-10 audit records:
- **Auth**: ~4 records (email, email_verified, phone_verified, is_act)
- **User**: ~5+ records (name, is_act, data, part, org_id, + custom fields)

## Usage Examples

### Minimal (Just Name & Email)

```sql
SELECT pzero.create_user(jsonb_build_object(
  'name', 'John Doe',
  'email', 'john.doe@example.com'
));
-- Uses default org_id and part
-- c_by is self-referential
```

### With Organization

```sql
SELECT pzero.create_user(jsonb_build_object(
  'name', 'Jane Smith',
  'email', 'jane.smith@example.com',
  'org_id', (SELECT id::text FROM pzero.all_orgs WHERE handle = 'acme')
));
```

### With Additional Data (Flat Style)

```sql
SELECT pzero.create_user(jsonb_build_object(
  'name', 'Alice Johnson',
  'email', 'alice@example.com',
  'org_id', (SELECT id::text FROM pzero.all_orgs WHERE handle = 'acme'),
  'department', 'Engineering',
  'title', 'Software Engineer',
  'start_date', '2024-01-15',
  'skills', jsonb_build_array('PostgreSQL', 'Python')
));
```

### With Additional Data (Nested Style)

```sql
SELECT pzero.create_user(jsonb_build_object(
  'name', 'Bob Wilson',
  'email', 'bob@example.com',
  'data', jsonb_build_object(
    'department', 'Sales',
    'title', 'Account Manager',
    'start_date', '2024-01-15'
  )
));
```

### With Optional c_by

```sql
SELECT pzero.create_user(jsonb_build_object(
  'name', 'Charlie Brown',
  'email', 'charlie@example.com',
  'c_by', (SELECT id::text FROM pzero.all_auth WHERE email = 'admin@example.com')
));
```

## What It Creates

### 1. Auth Record (`pzero.all_auth`)

| Column | Value |
|--------|-------|
| id | Auto-generated UUID7 |
| email | Lowercased email |
| email_verified | FALSE (default) |
| phone_verified | FALSE (default) |
| is_del | FALSE |
| is_act | TRUE |
| c_at | Extracted from UUID7 |

### 2. User Record (`pzero.all_users`)

| Column | Value |
|--------|-------|
| id | Same as auth.id (FK) |
| name | From parameter |
| org_id | From parameter (or default 'pzero' org) |
| part | From parameter (default: 'pzero') |
| data | Custom data (flat or nested) |
| is_del | FALSE |
| is_act | TRUE |
| c_at | Extracted from UUID7 |

## Return Value

```json
{
  "auth_id": "019a9f94-40b4-7dc4-a64a-bb1b189a7f9e",
  "user_id": "019a9f94-40b4-7dc4-a64a-bb1b189a7f9e",
  "email": "john.doe@example.com",
  "name": "John Doe",
  "org_id": "019a9f91-ce6f-7c89-8159-2499a9f721c8",
  "part": "pzero"
}
```

**Note**: `auth_id` and `user_id` are always identical

## Test Results

All tests passing (6 tests):
- ✅ Test 1: Create with flat data style
- ✅ Test 2: Create with nested data style
- ✅ Test 3: Create with minimal params (default org)
- ✅ Test 4: Duplicate email error
- ✅ Test 5: Missing name validation
- ✅ Test 6: Missing email validation

Run tests:
```bash
psql -d pzero -f test-create-user.sql
```

## Files

| File | Purpose |
|------|---------|
| `00-default-org.sql` | Creates default organization |
| `01-03-crud-functions.sql` | Function implementation |
| `test-create-user.sql` | Test suite |
| `CREATE_USER_SUMMARY.md` | This file |

## Important Notes

### c_by Behavior

The `c_by` field can be:
1. **Omitted** - Defaults to self-referential (user creates themselves)
2. **Provided** - Uses the specified creator ID

The audit system extracts c_by from meta and records it in the audit trail.

### Email Normalization

Emails are automatically lowercased:
- Input: `John.Doe@EXAMPLE.COM`
- Stored: `john.doe@example.com`

### Default Organization

If `org_id` is not provided, the function uses the default organization with handle 'pzero'.

Create default org if needed:
```bash
psql -d pzero -f 00-default-org.sql
```

### Transaction Safety

Always wraps in transaction:
```sql
BEGIN;
  SELECT pzero.create_user(...);
  -- Both auth and user created
COMMIT; -- Or ROLLBACK to undo
```

## Comparison with insert_into_table()

| Feature | create_user() | insert_into_table() |
|---------|--------------|-------------------|
| Purpose | Create complete user | Generic insert |
| API | Single JSONB parameter | Multiple parameters |
| Tables | auth + users (2) | Single table |
| c_by | Optional (defaults to self) | Required parameter |
| org_id | Optional (defaults to 'pzero') | Not applicable |
| Data handling | Flat or nested | Separate data param |
| Use case | User creation | Any table insert |

## Migration from Old Code

### Before (Old multi-parameter API)
```javascript
// Old: Multiple positional parameters
const result = await db.query(
  'SELECT pzero.create_user($1, $2, $3, $4, $5)',
  [name, email, orgId, part, JSON.stringify(data)]
);
```

### After (New JSON API)
```javascript
// New: Single JSON parameter
const result = await db.query(
  'SELECT pzero.create_user($1)',
  [JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    org_id: orgId,  // Optional - uses default if not provided
    department: 'Engineering',  // Goes into data
    title: 'Developer'          // Goes into data
  })]
);
const user = result.rows[0].create_user;
```

---

**Version**: 2.0.0
**Date**: 2025-11-19
**Status**: ✅ Production Ready
**Breaking Changes**: Yes - changed from multiple parameters to single JSONB parameter
**Migration Required**: Update all calls to use JSON format
