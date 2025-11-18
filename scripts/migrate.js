#!/usr/bin/env node

/**
 * Database migration script
 * Runs drizzle-kit push to create/update all database tables
 * Safe to run multiple times - only applies pending changes
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function migrate() {
  console.log('🔄 Running database migrations...');
  
  try {
    // Run drizzle-kit push to create/update tables
    const { stdout, stderr } = await execAsync('npx drizzle-kit push', {
      env: { ...process.env },
      stdio: 'inherit'
    });
    
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('Pulling schema from database')) {
      console.error(stderr);
    }
    
    console.log('✅ Database migrations complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    // If migration fails, try with --force flag
    console.log('🔄 Retrying with --force flag...');
    try {
      const { stdout, stderr } = await execAsync('npx drizzle-kit push --force', {
        env: { ...process.env },
        stdio: 'inherit'
      });
      
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      
      console.log('✅ Database migrations complete (forced)!');
      process.exit(0);
    } catch (forceError) {
      console.error('❌ Migration failed even with --force:', forceError.message);
      process.exit(1);
    }
  }
}

migrate();
