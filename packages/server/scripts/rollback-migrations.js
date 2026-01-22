#!/usr/bin/env node

import dotenv from 'dotenv';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'migrations');

async function rollbackMigrations(count = 1) {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_URL_SERVER
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Get executed migrations in reverse order
    const result = await client.query(
      'SELECT * FROM migration_history ORDER BY executed_at DESC LIMIT $1',
      [count]
    );

    if (result.rows.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    console.log(`Rolling back ${result.rows.length} migration(s)`);

    for (const row of result.rows) {
      const downFile = row.filename.replace('.up.sql', '.down.sql');
      const downPath = join(migrationsDir, downFile);

      if (!existsSync(downPath)) {
        console.error(`✗ Down migration file not found: ${downFile}`);
        console.log('  Please create the down migration file to rollback');
        continue;
      }

      console.log(`→ Rolling back ${row.filename}...`);
      const sql = readFileSync(downPath, 'utf8');
      
      try {
        await client.query('BEGIN');
        await client.query(sql);
        
        // Remove from migration history
        await client.query(
          'DELETE FROM migration_history WHERE filename = $1',
          [row.filename]
        );
        
        // If rolling back a migration that others depend on, also remove dependent migrations
        if (row.filename === '01-01-create-tables.up.sql') {
          console.log('  Invalidating dependent migrations (01-02, 01-03, 01-04)...');
          await client.query(`
            DELETE FROM migration_history 
            WHERE filename IN ('01-02-create-functions.up.sql', '01-03-crud-functions.up.sql', '01-04-seeds.up.sql')
          `);
        } else if (row.filename === '01-02-create-functions.up.sql') {
          console.log('  Invalidating dependent migrations (01-03, 01-04)...');
          await client.query(`
            DELETE FROM migration_history 
            WHERE filename IN ('01-03-crud-functions.up.sql', '01-04-seeds.up.sql')
          `);
        } else if (row.filename === '01-03-crud-functions.up.sql') {
          console.log('  Invalidating dependent migrations (01-04)...');
          await client.query(`
            DELETE FROM migration_history 
            WHERE filename = '01-04-seeds.up.sql'
          `);
        }
        
        await client.query('COMMIT');
        console.log(`✓ Successfully rolled back ${row.filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`✗ Failed to rollback ${row.filename}:`, error.message);
        throw error;
      }
    }

    console.log('✓ Rollback completed');
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Get count from command line args
const count = parseInt(process.argv[2]) || 1;
rollbackMigrations(count);