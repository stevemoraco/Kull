import { db } from './db';
import { sql } from 'drizzle-orm';

export async function runMigrations() {
  try {
    // Using console.log because this runs before the log() function is initialized
    console.log('[Migration] 🔄 Running database migrations...');

    console.log('[Migration]   ✓ Enabling pgcrypto extension...');
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    console.log('[Migration]   ✓ Creating message_hash trigger...');
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION generate_message_hash()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.ai_response IS NOT NULL THEN
          NEW.message_hash := LEFT(ENCODE(DIGEST(NEW.ai_response, 'sha256'), 'hex'), 16);
        ELSIF NEW.user_message IS NOT NULL THEN
          NEW.message_hash := LEFT(ENCODE(DIGEST(NEW.user_message, 'sha256'), 'hex'), 16);
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await db.execute(sql`
      DROP TRIGGER IF EXISTS set_message_hash ON support_queries;
    `);
    
    await db.execute(sql`
      CREATE TRIGGER set_message_hash
        BEFORE INSERT OR UPDATE ON support_queries
        FOR EACH ROW
        EXECUTE FUNCTION generate_message_hash();
    `);

    console.log('[Migration] ✅ Database migrations completed successfully');
    return true;
  } catch (error: any) {
    console.error('[Migration] ❌ Migration failed:', error);
    console.error('[Migration] Error stack:', error.stack);
    
    // Don't fail startup on migration errors - the tables might already exist
    // Log the error but continue
    console.log('[Migration] ⚠️  Continuing server startup despite migration errors');
    return false;
  }
}
