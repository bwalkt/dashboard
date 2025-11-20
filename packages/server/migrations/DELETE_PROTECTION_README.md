# DELETE Operation Protection

## Overview

The `pzero` database implements environment-based DELETE protection to prevent accidental data loss in production environments. DELETE operations are only allowed in **development** mode. All other environments (staging, production) must use **soft deletes**.

## How It Works

### Environment Configuration

The system uses PostgreSQL's GUC (Grand Unified Configuration) system to store the environment setting:

```sql
-- Set database-level environment (persists across sessions)
ALTER DATABASE pzero SET app.environment = 'development';  -- or 'staging', 'production'

-- Set session-level environment (temporary, current session only)
SET app.environment = 'development';

-- Check current environment
SHOW app.environment;
```

### DELETE Behavior by Environment

| Environment | DELETE Allowed | Behavior |
|------------|---------------|----------|
| development | ✅ Yes | Hard deletes work normally |
| staging | ❌ No | Error: "DELETE operations are not allowed in staging environment" |
| production | ❌ No | Error: "DELETE operations are not allowed in production environment" |

### Default Environment

If no environment is set, the system defaults to **production** (safest option) and blocks all DELETE operations.

## Usage

### Development Environment (DELETE Allowed)

```sql
-- Set environment
SET app.environment = 'development';

-- Hard DELETE works
DELETE FROM pzero.all_orgs WHERE handle = 'test';
-- ✅ Succeeds with NOTICE: DELETE event... [DEVELOPMENT MODE]
```

### Production Environment (DELETE Blocked)

```sql
-- Set environment
SET app.environment = 'production';

-- Hard DELETE blocked
DELETE FROM pzero.all_orgs WHERE handle = 'test';
-- ❌ ERROR: DELETE operations are not allowed in production environment.
--    Use soft delete (SET is_del = TRUE) instead.
```

### Soft Delete (Production Alternative)

Instead of hard DELETE, use soft delete by setting `is_del = TRUE`:

```sql
-- Soft delete (works in all environments)
UPDATE pzero.all_orgs
SET is_del = TRUE,
    data = jsonb_set(
      COALESCE(data, '{}'::jsonb),
      '{meta,u_by}',
      to_jsonb('019a9f56-2d65-7bd0-b764-9f79183c7672'::text)  -- user ID
    )
WHERE handle = 'test';
-- ✅ Succeeds - record marked as deleted, audit trail maintained
```

## Setup Instructions

### 1. Run Environment Configuration

```bash
# Set the database environment
psql -d pzero -f 00-config-environment.sql
```

### 2. Create/Update Functions

The audit trigger (`pzero.audit_trigger_plpython`) includes environment checking logic:

```bash
# Recreate functions with DELETE protection
psql -d pzero -f 01-02-create-functions.sql
```

### 3. Test the Protection

```bash
# Run test suite (includes DELETE protection tests)
psql -d pzero -f test-crud-functions.sql
```

## Environment Management

### Setting Environment for Different Deployments

**Development:**
```sql
ALTER DATABASE pzero_dev SET app.environment = 'development';
```

**Staging:**
```sql
ALTER DATABASE pzero_staging SET app.environment = 'staging';
```

**Production:**
```sql
ALTER DATABASE pzero_prod SET app.environment = 'production';
```

### Temporary Environment Override

For testing production behavior in development:

```sql
-- Test production DELETE blocking without changing database setting
SET app.environment = 'production';

-- Try DELETE - will fail
DELETE FROM pzero.all_orgs WHERE handle = 'test';
-- ERROR: DELETE operations are not allowed in production environment

-- Reset to development
SET app.environment = 'development';
```

## Implementation Details

### Audit Trigger Logic

The `audit_trigger_plpython` function checks the environment before allowing DELETE:

```python
# Get environment from PostgreSQL GUC
try:
    env_result = plpy.execute("SHOW app.environment")
    environment = env_result[0]['app.environment'] if env_result else 'production'
except:
    # Default to production (safest)
    environment = 'production'

# Validate DELETE operation
if TD['event'] == 'DELETE':
    if environment != 'development':
        plpy.error(
            f"DELETE operations are not allowed in {environment} environment. "
            f"Use soft delete (SET is_del = TRUE) instead."
        )
        raise ValueError(f"DELETE not allowed in {environment}")
```

### Soft Delete Pattern

All tables with the `is_del` column support soft deletes:

1. **Mark as deleted**: `SET is_del = TRUE`
2. **Add audit metadata**: Set `data->meta->u_by` with user ID
3. **Audit trail**: UPDATE triggers create audit records
4. **Partition movement**: Record moves to `is_act = FALSE` partition if needed

## Benefits

### ✅ Advantages

1. **Data Safety**: Prevents accidental data loss in production
2. **Audit Trail**: Soft deletes maintain complete history
3. **Reversible**: Soft deletes can be undone (`SET is_del = FALSE`)
4. **Flexible**: Development can still use hard DELETEs for testing
5. **Environment-aware**: Behavior adapts to deployment context

### ⚠️ Important Notes

1. **Performance**: Soft deletes don't free disk space
2. **Queries**: Must filter `WHERE is_del = FALSE` to exclude deleted records
3. **Cleanup**: Periodic hard DELETE of old soft-deleted records may be needed in development
4. **Migration**: Existing code must be updated to use soft deletes

## Test Coverage

The test suite (`test-crud-functions.sql`) includes **Test 9** which verifies:

- ✅ DELETE blocked in production environment
- ✅ Soft delete works as alternative
- ✅ Proper error messages
- ✅ Development mode allows DELETE

Run tests:
```bash
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d pzero -f test-crud-functions.sql
```

Expected output:
```
=== Test 9: Production DELETE protection ===
Testing DELETE blocked in production:
NOTICE:  Expected error: DELETE blocked in production environment ✓
Testing soft delete as production alternative:
...
=== All tests completed successfully! ===
```

## Troubleshooting

### Problem: DELETE still works in production

**Solution**: Check environment setting
```sql
SHOW app.environment;  -- Should show 'production'
```

### Problem: Getting "environment not set" errors

**Solution**: Set the environment
```sql
ALTER DATABASE pzero SET app.environment = 'production';
-- Then reconnect or run:
SET app.environment = 'production';
```

### Problem: Need to hard DELETE in production (emergency)

**Solution**: Temporarily switch to development (use with caution!)
```sql
-- Emergency bypass (logs will show [DEVELOPMENT MODE])
SET app.environment = 'development';
DELETE FROM pzero.all_orgs WHERE id = '...';

-- Switch back immediately
SET app.environment = 'production';
```

**Note**: All DELETEs are logged with environment marker for audit purposes.

## Migration Guide

### Updating Existing Code

**Before:**
```javascript
// Old code - hard DELETE
await db.query('DELETE FROM pzero.all_orgs WHERE id = $1', [orgId]);
```

**After:**
```javascript
// New code - soft DELETE
await db.query(
  `UPDATE pzero.all_orgs
   SET is_del = TRUE,
       data = jsonb_set(
         COALESCE(data, '{}'::jsonb),
         '{meta,u_by}',
         to_jsonb($2::text)
       )
   WHERE id = $1`,
  [orgId, userId]
);
```

### Query Updates

**Before:**
```sql
-- Old query - includes deleted records
SELECT * FROM pzero.all_orgs WHERE handle = 'acme';
```

**After:**
```sql
-- New query - exclude deleted records
SELECT * FROM pzero.all_orgs
WHERE handle = 'acme' AND is_del = FALSE;
```

## Files

- `00-config-environment.sql` - Environment configuration script
- `01-02-create-functions.sql` - Audit trigger with DELETE protection
- `test-crud-functions.sql` - Test suite including DELETE protection tests
- `DELETE_PROTECTION_README.md` - This file

---

**Version**: 1.0
**Last Updated**: 2025-11-19
**Status**: ✅ Production Ready
