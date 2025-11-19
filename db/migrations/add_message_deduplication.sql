-- Migration: Add message deduplication support
-- Adds unique constraint to prevent duplicate messages in chat sessions

-- Add content_hash column to support_queries table for deduplication
ALTER TABLE support_queries
ADD COLUMN IF NOT EXISTS content_hash VARCHAR(16);

-- Add index on content_hash for fast duplicate lookups
CREATE INDEX IF NOT EXISTS support_queries_content_hash_idx
ON support_queries(content_hash);

-- Add composite unique index to prevent exact duplicates
-- (sessionId, timestamp rounded to second, role, content_hash)
-- This prevents the same message from being inserted twice
CREATE UNIQUE INDEX IF NOT EXISTS support_queries_dedupe_idx
ON support_queries(
  session_id,
  DATE_TRUNC('second', created_at),
  user_message,
  content_hash
);

-- Add trigger to automatically generate content_hash on insert/update
CREATE OR REPLACE FUNCTION generate_content_hash()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate FNV-1a hash of user_message
  NEW.content_hash := substring(
    encode(
      digest(trim(NEW.user_message), 'sha256'),
      'hex'
    ),
    1,
    16
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS support_queries_content_hash_trigger ON support_queries;

CREATE TRIGGER support_queries_content_hash_trigger
BEFORE INSERT OR UPDATE ON support_queries
FOR EACH ROW
EXECUTE FUNCTION generate_content_hash();

-- Create monitoring table for duplicate detection alerts
CREATE TABLE IF NOT EXISTS duplicate_alerts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR NOT NULL,
  message_id VARCHAR,
  session_id VARCHAR,
  user_email VARCHAR,
  duplicate_count INTEGER,
  stats JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS duplicate_alerts_created_at_idx
ON duplicate_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS duplicate_alerts_session_idx
ON duplicate_alerts(session_id);

-- Add function to log duplicate attempts
CREATE OR REPLACE FUNCTION log_duplicate_attempt()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a duplicate (caught by unique constraint), log it
  INSERT INTO duplicate_alerts (
    alert_type,
    session_id,
    user_email,
    stats,
    created_at
  ) VALUES (
    'duplicate_prevented',
    NEW.session_id,
    NEW.user_email,
    jsonb_build_object(
      'message_preview', substring(NEW.user_message, 1, 100),
      'timestamp', NEW.created_at
    ),
    NOW()
  );
  RETURN NULL; -- Allow the constraint to handle rejection
EXCEPTION
  WHEN unique_violation THEN
    -- Duplicate detected - log and reject
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Note: The actual duplicate prevention happens via the UNIQUE INDEX
-- This trigger is just for logging/monitoring

COMMENT ON TABLE duplicate_alerts IS 'Tracks duplicate message detection events for monitoring';
COMMENT ON COLUMN support_queries.content_hash IS 'SHA-256 hash of message content for deduplication';
COMMENT ON INDEX support_queries_dedupe_idx IS 'Prevents duplicate messages within same session and second';
