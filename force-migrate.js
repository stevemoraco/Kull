import pg from 'pg';
const { Client } = pg;

// Use direct connection with statement timeout
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  statement_timeout: 5000, // 5 second timeout
  query_timeout: 5000,
  connectionTimeoutMillis: 5000,
});

async function migrate() {
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');
    
    // Try to cancel any blocking queries first
    try {
      await client.query(`
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE datname = current_database() 
        AND pid <> pg_backend_pid()
        AND state = 'idle in transaction'
        AND query_start < NOW() - INTERVAL '5 seconds';
      `);
      console.log('🧹 Cleaned up idle transactions');
    } catch (e) {
      console.log('⚠️  Could not clean up transactions (might not have permissions)');
    }
    
    // Set a lock timeout
    await client.query('SET lock_timeout = 5000;');
    console.log('⏰ Set lock timeout to 5 seconds');
    
    // Add session_id column
    console.log('🔧 Adding session_id column...');
    await client.query(`
      ALTER TABLE support_queries 
      ADD COLUMN IF NOT EXISTS session_id VARCHAR;
    `);
    console.log('✅ Added session_id column to support_queries table');
    
    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'support_queries' 
      AND column_name = 'session_id';
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verified session_id column exists:', result.rows[0]);
      console.log('');
      console.log('🎉 MIGRATION COMPLETE!');
    } else {
      console.log('❌ Column not found after migration');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('timeout')) {
      console.error('💡 The table is locked by active connections. Please stop the app workflow and try again.');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
