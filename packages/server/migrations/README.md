# Database Migrations

This directory contains SQL migration files for the database schema.

## Migration File Naming

Migrations use a sequential naming convention:

- `01-create-users-table.sql`
- `02-add-column-to-users.sql`
- `03-create-sessions-table.sql`
- etc.

## Migration File Format

Each SQL migration file has two sections:

```sql
-- Up Migration
CREATE TABLE example (id SERIAL PRIMARY KEY, name TEXT NOT NULL);

-- Down Migration
DROP TABLE IF EXISTS example;
```

- **Up Migration**: Changes to apply when running the migration
- **Down Migration**: Changes to revert when rolling back

## Running Migrations

```bash
# Apply all pending migrations
pnpm migrate:up

# Rollback the last migration
pnpm migrate:down

# Create a new migration (will generate timestamp-based name)
pnpm migrate:create add-new-feature

# Then rename it to follow our convention:
# migrations/1234567890_add-new-feature.sql -> migrations/04-add-new-feature.sql
```

## Creating New Migrations

1. Create a new file with the next sequential number:

   ```bash
   touch migrations/02-your-migration-name.sql
   ```

2. Add the migration SQL:

   ```sql
   -- Up Migration
   -- Your schema changes here
   -- Down Migration
   -- Revert changes here
   ```

3. Run the migration:
   ```bash
   pnpm migrate:up
   ```

## Best Practices

- Always provide a `Down Migration` for rollback support
- Test migrations in development before applying to production
- Keep migrations small and focused on a single change
- Never modify existing migration files that have been applied
- Use descriptive names that explain what the migration does

## Migration Tracking

node-pg-migrate creates a `pgmigrations` table to track which migrations have been applied.
