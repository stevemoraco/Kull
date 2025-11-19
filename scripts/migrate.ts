import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database migrations...');

    console.log('  ✓ Enabling pgcrypto extension...');
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

    console.log('  ✓ Creating sessions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions(expire);
    `);

    console.log('  ✓ Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR UNIQUE,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        stripe_customer_id VARCHAR,
        stripe_subscription_id VARCHAR,
        stripe_payment_method_id VARCHAR,
        stripe_setup_intent_id VARCHAR,
        subscription_tier VARCHAR,
        subscription_status VARCHAR,
        trial_started_at TIMESTAMP,
        trial_ends_at TIMESTAMP,
        trial_converted_at TIMESTAMP,
        special_offer_expires_at TIMESTAMP,
        app_installed_at TIMESTAMP,
        folder_catalog JSONB,
        preferred_chat_model VARCHAR DEFAULT 'gpt-5-nano',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('  ✓ Creating referrals table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        referrer_id VARCHAR NOT NULL REFERENCES users(id),
        referred_email VARCHAR NOT NULL,
        referred_user_id VARCHAR REFERENCES users(id),
        status VARCHAR NOT NULL DEFAULT 'pending',
        bonus_unlocked INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx ON referrals(referrer_id);
      CREATE INDEX IF NOT EXISTS referrals_referred_user_id_idx ON referrals(referred_user_id);
      CREATE INDEX IF NOT EXISTS referrals_status_idx ON referrals(status);
    `);

    console.log('  ✓ Creating refund_surveys table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS refund_surveys (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        primary_reason VARCHAR NOT NULL,
        would_recommend BOOLEAN NOT NULL,
        missing_feature VARCHAR,
        technical_issues VARCHAR,
        additional_feedback VARCHAR NOT NULL,
        audio_transcript_url VARCHAR,
        transcription_text VARCHAR(2000),
        refund_processed BOOLEAN DEFAULT false,
        refund_amount INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('  ✓ Creating page_visits table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS page_visits (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        page VARCHAR NOT NULL,
        user_id VARCHAR REFERENCES users(id),
        session_id VARCHAR,
        referrer VARCHAR,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('  ✓ Creating email_queue table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        email_type VARCHAR NOT NULL,
        to_email VARCHAR NOT NULL,
        subject VARCHAR NOT NULL,
        html_content TEXT NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'pending',
        scheduled_for TIMESTAMP NOT NULL,
        sent_at TIMESTAMP,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        sendgrid_message_id VARCHAR,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS email_queue_status_idx ON email_queue(status);
      CREATE INDEX IF NOT EXISTS email_queue_user_id_idx ON email_queue(user_id);
      CREATE INDEX IF NOT EXISTS email_queue_scheduled_idx ON email_queue(scheduled_for);
    `);

    console.log('  ✓ Creating support_queries table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_queries (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR REFERENCES users(id),
        session_id VARCHAR NOT NULL,
        user_message TEXT,
        ai_response TEXT NOT NULL,
        message_hash VARCHAR(16),
        model VARCHAR NOT NULL DEFAULT 'gpt-4o-mini',
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
        provider VARCHAR NOT NULL DEFAULT 'openai',
        response_time_ms INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS support_queries_user_id_idx ON support_queries(user_id);
      CREATE INDEX IF NOT EXISTS support_queries_session_id_idx ON support_queries(session_id);
      CREATE INDEX IF NOT EXISTS support_queries_message_hash_idx ON support_queries(message_hash);
    `);

    console.log('  ✓ Creating message_hash trigger...');
    await client.query(`
      CREATE OR REPLACE FUNCTION generate_message_hash()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.user_message IS NOT NULL THEN
          NEW.message_hash := LEFT(ENCODE(DIGEST(NEW.user_message, 'sha256'), 'hex'), 16);
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS set_message_hash ON support_queries;
      CREATE TRIGGER set_message_hash
        BEFORE INSERT ON support_queries
        FOR EACH ROW
        EXECUTE FUNCTION generate_message_hash();
    `);

    console.log('  ✓ Creating chat_sessions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR REFERENCES users(id),
        messages JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx ON chat_sessions(user_id);
    `);

    console.log('  ✓ Creating default_prompts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS default_prompts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        culling_style VARCHAR NOT NULL UNIQUE,
        system_prompt TEXT NOT NULL,
        user_prompt TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('  ✓ Creating photos table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS photos (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        file_path VARCHAR NOT NULL,
        file_name VARCHAR NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR NOT NULL,
        width INTEGER,
        height INTEGER,
        camera_make VARCHAR,
        camera_model VARCHAR,
        lens VARCHAR,
        focal_length DOUBLE PRECISION,
        aperture DOUBLE PRECISION,
        shutter_speed VARCHAR,
        iso INTEGER,
        taken_at TIMESTAMP,
        original_rating INTEGER,
        ai_rating INTEGER,
        ai_title TEXT,
        ai_description TEXT,
        ai_tags TEXT[],
        color_label VARCHAR,
        ai_model VARCHAR,
        ai_prompt_style VARCHAR,
        processing_status VARCHAR NOT NULL DEFAULT 'pending',
        processing_started_at TIMESTAMP,
        processing_completed_at TIMESTAMP,
        error_message TEXT,
        bookmark_data TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS photos_user_id_idx ON photos(user_id);
      CREATE INDEX IF NOT EXISTS photos_file_path_idx ON photos(file_path);
      CREATE INDEX IF NOT EXISTS photos_processing_status_idx ON photos(processing_status);
      CREATE UNIQUE INDEX IF NOT EXISTS photos_user_file_unique_idx ON photos(user_id, file_path);
    `);

    console.log('  ✓ Creating culling_sessions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS culling_sessions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        folder_path VARCHAR NOT NULL,
        folder_name VARCHAR NOT NULL,
        total_photos INTEGER NOT NULL DEFAULT 0,
        processed_photos INTEGER NOT NULL DEFAULT 0,
        failed_photos INTEGER NOT NULL DEFAULT 0,
        status VARCHAR NOT NULL DEFAULT 'active',
        ai_model VARCHAR NOT NULL,
        culling_style VARCHAR NOT NULL,
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS culling_sessions_user_id_idx ON culling_sessions(user_id);
      CREATE INDEX IF NOT EXISTS culling_sessions_status_idx ON culling_sessions(status);
    `);

    console.log('  ✓ Creating github_repo_cache table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS github_repo_cache (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        repo_owner VARCHAR NOT NULL,
        repo_name VARCHAR NOT NULL,
        content TEXT NOT NULL,
        file_count INTEGER NOT NULL,
        total_size BIGINT NOT NULL,
        cached_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL
      );
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS github_repo_cache_unique_idx ON github_repo_cache(repo_owner, repo_name);
    `);

    console.log('  ✓ Creating device_tokens table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS device_tokens (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        token VARCHAR NOT NULL,
        platform VARCHAR NOT NULL,
        device_name VARCHAR,
        last_used_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS device_tokens_user_id_idx ON device_tokens(user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS device_tokens_token_unique_idx ON device_tokens(token);
    `);

    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations()
  .then(() => {
    console.log('✅ Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
