#!/usr/bin/env node

import dotenv from 'dotenv';
import { readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'migrations');

async function runMigrations() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_URL_SERVER
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Get all 01*.up.sql files (up migrations only)
    const files = readdirSync(migrationsDir)
      .filter(file => file.match(/^01.*\.up\.sql$/))
      .sort();

    console.log(`Found ${files.length} migration files to process`);

    for (const file of files) {
      // Check if migration has already been run
      const result = await client.query(
        'SELECT * FROM migration_history WHERE filename = $1',
        [file]
      );
      

      if (result.rows.length > 0) {
        // Validate that the migration actually succeeded before skipping
        let shouldRerun = false;
        
        if (file === '01-01-create-tables.up.sql') {
          // Check if schema and key functions exist
          const schemaCheck = await client.query(`
            SELECT EXISTS (
              SELECT 1 FROM pg_namespace WHERE nspname = 'pzero'
            ) as schema_exists,
            EXISTS (
              SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
              WHERE n.nspname = 'pzero' AND p.proname = 'gen_id'
            ) as gen_id_exists
          `);
          
          if (!schemaCheck.rows[0].schema_exists || !schemaCheck.rows[0].gen_id_exists) {
            console.log(`  Schema or gen_id function missing, re-running ${file}...`);
            shouldRerun = true;
          }
        } else if (file === '01-02-create-functions.up.sql') {
          // Check if expected functions exist (use get_mmn which is unique to 01-02)
          const funcCheck = await client.query(`
            SELECT EXISTS (
              SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
              WHERE n.nspname = 'pzero' AND p.proname = 'get_mmn'
            ) as func_exists
          `);
          
          if (!funcCheck.rows[0].func_exists) {
            console.log(`  Functions missing, re-running ${file}...`);
            shouldRerun = true;
          }
        } else if (file === '01-03-crud-functions.up.sql') {
          // Check if CRUD functions exist
          const crudCheck = await client.query(`
            SELECT EXISTS (
              SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
              WHERE n.nspname = 'pzero' AND p.proname = 'create_user'
            ) as crud_exists
          `);
          
          if (!crudCheck.rows[0].crud_exists) {
            console.log(`  CRUD functions missing, re-running ${file}...`);
            shouldRerun = true;
          }
        }
        
        if (shouldRerun) {
          // Remove from history and re-run
          await client.query('DELETE FROM migration_history WHERE filename = $1', [file]);
        } else {
          console.log(`✓ Skipping ${file} (already executed)`);
          continue;
        }
      }

      console.log(`→ Running ${file}...`);
      const sql = readFileSync(join(migrationsDir, file), 'utf8');
      
      try {
        // For the first migration, check if schema already exists with objects BEFORE starting transaction
        if (file === '01-01-create-tables.up.sql') {
          const schemaCheck = await client.query(`
            SELECT EXISTS (
              SELECT 1 FROM pg_namespace WHERE nspname = 'pzero'
            ) as schema_exists
          `);
          
          if (schemaCheck.rows[0].schema_exists) {
            // If schema exists, drop it completely to ensure clean state (outside transaction)
            console.log('  Cleaning up existing pzero schema...');
            await client.query('DROP SCHEMA IF EXISTS pzero CASCADE');
          }
        }
        
        await client.query('BEGIN');
        
        // For function migrations, only clean up functions specific to each migration
        if (file === '01-02-create-functions.up.sql') {
          // Clean up functions specific to this migration
          const functionsToClean = [
            'is_valid_url', 'get_column_no', 'create_triggers_plpython', 
            'migrate_org', 'validate_nh_structure', 'get_mmn', 'get_table_name',
            'audit_trigger_plpython', 'relations_lookup_plpython', 
            'check_relations_plpython', 'check_relations_trigger'
          ];
          for (const funcName of functionsToClean) {
            await client.query(`DROP FUNCTION IF EXISTS pzero.${funcName} CASCADE`);
          }
          // Also clean up public schema functions
          const publicFunctions = ['is_valid_url', 'get_column_no', 'jsonb_diff', 'get_country_name'];
          for (const funcName of publicFunctions) {
            await client.query(`DROP FUNCTION IF EXISTS public.${funcName} CASCADE`);
          }
          console.log('  Cleaned up existing functions from 01-02');
        }
        
        if (file === '01-03-crud-functions.up.sql') {
          // Clean up CRUD functions specific to this migration  
          const functionsToClean = ['generate_unique_handle', 'insert_into_table', 'create_user', 'create_org', 'create_device'];
          for (const funcName of functionsToClean) {
            await client.query(`DROP FUNCTION IF EXISTS pzero.${funcName} CASCADE`);
          }
          console.log('  Cleaned up existing CRUD functions from 01-03');
        }
        
        await client.query(sql);
        
        // Record successful migration
        await client.query(
          'INSERT INTO migration_history (filename) VALUES ($1)',
          [file]
        );
        
        await client.query('COMMIT');
        console.log(`✓ Successfully executed ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`✗ Failed to execute ${file}:`, error.message);
        throw error;
      }
    }

    console.log('✓ All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migrations
runMigrations();