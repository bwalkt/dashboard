-- Environment Configuration for pzero Database
-- This file sets the environment variable that controls DELETE permissions

-- ============================================
-- Set Environment
-- ============================================
-- Valid values: 'development', 'staging', 'production'
--
-- DELETE operations are only allowed in 'development' environment.
-- In all other environments, use soft delete (UPDATE ... SET is_del = TRUE)

-- For DEVELOPMENT (allows DELETE operations)
-- Uncomment the following line for development:
-- ALTER DATABASE pzero SET app.environment = 'development';

-- For STAGING (blocks DELETE operations)
-- ALTER DATABASE pzero SET app.environment = 'staging';

-- For PRODUCTION (blocks DELETE operations)
-- ALTER DATABASE pzero SET app.environment = 'production';

-- ============================================
-- Default: Set to development for now
-- ============================================
ALTER DATABASE pzero SET app.environment = 'development';

-- ============================================
-- Reload configuration in current session
-- ============================================
-- After setting the environment, you need to reconnect or run:
-- SET app.environment = 'development';  -- Or your chosen environment

-- To check current environment:
-- SHOW app.environment;

-- ============================================
-- Per-Session Override (for testing)
-- ============================================
-- You can also set the environment per session without changing the database default:
-- SET app.environment = 'development';
-- SET app.environment = 'production';

-- This is useful for testing the production behavior without changing the database setting.

-- ============================================
-- Usage Examples
-- ============================================

-- Example 1: Check current environment
-- SHOW app.environment;

-- Example 2: Test DELETE in development
-- SET app.environment = 'development';
-- DELETE FROM pzero.all_orgs WHERE handle = 'test';  -- Should work

-- Example 3: Test DELETE in production
-- SET app.environment = 'production';
-- DELETE FROM pzero.all_orgs WHERE handle = 'test';  -- Should fail with error

-- Example 4: Use soft delete in production
-- SET app.environment = 'production';
-- UPDATE pzero.all_orgs SET is_del = TRUE WHERE handle = 'test';  -- Should work
