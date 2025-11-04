import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Add session_id column if it doesn't exist
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
    } else {
      console.log('❌ Column not found after migration');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
