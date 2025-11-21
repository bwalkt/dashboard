-- Migration: Add email authentication support
-- This migration adds email verification and allows null github_id for email-only users
-- Check if users table exists (simpler table used by the application)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        -- Add email_verified column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'users' AND column_name = 'email_verified') THEN
            ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
        END IF;

        -- Make github_id nullable to support email-only users (if column exists)
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND table_schema = 'public' AND column_name = 'github_id') THEN
            ALTER TABLE users ALTER COLUMN github_id DROP NOT NULL;
        END IF;

        -- Add unique constraint on email if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_constraint 
                       WHERE conname = 'users_email_unique') THEN
            ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
        END IF;

        -- Add index on email for faster lookups if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                       WHERE indexname = 'idx_users_email') THEN
            CREATE INDEX idx_users_email ON users(email);
        END IF;
    ELSE
        -- Create users table if it doesn't exist
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            github_id VARCHAR(255) UNIQUE,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            avatar TEXT,
            email_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes
        CREATE INDEX idx_users_email ON users(email);
        CREATE INDEX idx_users_github_id ON users(github_id);
    END IF;
END $$;

-- Update pzero.all_auth table if it exists to ensure email verification support
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'all_auth' AND table_schema = 'pzero') THEN
        -- oauth_id should be nullable for email-only users (if column exists)
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'all_auth' AND table_schema = 'pzero' AND column_name = 'oauth_id') THEN
            ALTER TABLE pzero.all_auth ALTER COLUMN oauth_id DROP NOT NULL;
        END IF;
        
        -- Ensure password field can store null for OAuth-only users (if column exists)
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'all_auth' AND table_schema = 'pzero' AND column_name = 'password') THEN
            ALTER TABLE pzero.all_auth ALTER COLUMN password DROP NOT NULL;
        END IF;
    END IF;
END $$;

-- Add comment for documentation
comment ON COLUMN users.email_verified IS 'Indicates whether the user has verified their email address';

comment ON COLUMN users.github_id IS 'GitHub ID for OAuth users, NULL for email-only users';
