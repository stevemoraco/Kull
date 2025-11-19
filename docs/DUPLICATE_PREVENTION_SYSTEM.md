# Duplicate Message Prevention System

## Overview

This system prevents duplicate messages from appearing in the chat interface through a multi-layered approach combining frontend filtering, backend validation, database constraints, and comprehensive monitoring.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Message Flow                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. User sends message                                       │
│     ↓                                                        │
│  2. Frontend Deduplication (messageDeduplication.ts)        │
│     - Check in-memory cache                                 │
│     - Create fingerprint                                    │
│     - Compare with recent messages                          │
│     ↓                                                        │
│  3. Backend API (if passes frontend)                        │
│     ↓                                                        │
│  4. Database Insert                                          │
│     - Trigger: generate content_hash                        │
│     - Unique constraint check                               │
│     - Insert or reject                                      │
│     ↓                                                        │
│  5. Monitoring & Alerts                                      │
│     - Log duplicate attempts                                │
│     - Track metrics                                         │
│     - Send admin alerts if threshold exceeded               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Message Fingerprinting

**File:** `/shared/utils/messageFingerprint.ts`

Creates unique fingerprints for messages using SHA-256 or FNV-1a hash algorithms.

**Key Features:**
- Rounds timestamps to nearest second to prevent timing variations
- Trims whitespace from content
- Provides both async (SHA-256) and sync (FNV-1a) implementations
- Fast content-based deduplication

**API:**

```typescript
// Create fingerprint (async, SHA-256)
const fingerprint = await createMessageFingerprint(message);

// Create fingerprint (sync, FNV-1a)
const fingerprint = createMessageFingerprintSync(message);

// Check if two messages are duplicates
const isDuplicate = areMessagesDuplicate(msg1, msg2);

// Deduplicate array
const cleaned = deduplicateMessages(messages);

// Create content hash for database
const hash = createContentHash(content);
```

### 2. Frontend Deduplication

**File:** `/client/src/utils/messageDeduplication.ts`

In-memory tracking system that prevents duplicates before they reach the backend.

**Key Features:**
- Tracks message fingerprints in memory
- Checks by ID, fingerprint, and similarity
- Limits memory usage (keeps last 100 messages)
- Automatic admin alerting when duplicate rate is high
- React hook for easy integration

**API:**

```typescript
import { messageDeduplication } from '@/utils/messageDeduplication';

// Check if message is duplicate
if (messageDeduplication.isDuplicate(message)) {
  console.warn('Duplicate detected, skipping');
  return;
}

// Register existing messages
messages.forEach(msg => messageDeduplication.register(msg));

// Deduplicate array
const cleaned = messageDeduplication.deduplicateArray(messages);

// Get statistics
const stats = messageDeduplication.getStats();
// {
//   totalDuplicatesDetected: 5,
//   trackedFingerprints: 50,
//   recentMessages: 50
// }
```

**React Hook:**

```typescript
import { useMessageDeduplication } from '@/utils/messageDeduplication';

function ChatComponent() {
  const [messages, setMessages] = useState<Message[]>([]);

  // Automatically deduplicate
  const cleanMessages = useMessageDeduplication(messages);

  return (
    <div>
      {cleanMessages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
    </div>
  );
}
```

### 3. Database Constraints

**Migration:** `/db/migrations/add_message_deduplication.sql`

Prevents duplicate messages at the database level using unique constraints.

**Key Features:**
- Automatic content_hash generation via trigger
- Unique index on (session_id, timestamp_second, user_message, content_hash)
- Duplicate detection logging via triggers
- Fast lookups using indexed content_hash

**Schema Changes:**

```sql
-- Add content_hash column
ALTER TABLE support_queries
ADD COLUMN content_hash VARCHAR(16);

-- Unique constraint to prevent duplicates
CREATE UNIQUE INDEX support_queries_dedupe_idx
ON support_queries(
  session_id,
  DATE_TRUNC('second', created_at),
  user_message,
  content_hash
);

-- Trigger to generate hash automatically
CREATE TRIGGER support_queries_content_hash_trigger
BEFORE INSERT OR UPDATE ON support_queries
FOR EACH ROW
EXECUTE FUNCTION generate_content_hash();
```

**New Table:**

```sql
CREATE TABLE duplicate_alerts (
  id VARCHAR PRIMARY KEY,
  alert_type VARCHAR NOT NULL,
  message_id VARCHAR,
  session_id VARCHAR,
  user_email VARCHAR,
  duplicate_count INTEGER,
  stats JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Monitoring & Alerting

**File:** `/server/monitoring/duplicateDetection.ts`

Comprehensive monitoring system for tracking and alerting on duplicate messages.

**Key Features:**
- Real-time duplicate logging
- Statistical analysis (hourly, daily, weekly)
- Admin alerts when threshold exceeded
- Automatic cleanup of old alerts
- Dashboard metrics

**API:**

```typescript
import {
  logDuplicateDetection,
  getDuplicateStats,
  getDuplicateMetrics,
  cleanupOldAlerts
} from './monitoring/duplicateDetection';

// Log a duplicate detection
await logDuplicateDetection({
  type: 'frontend_duplicate',
  sessionId: 'abc123',
  duplicateCount: 1,
  stats: { ... },
  timestamp: new Date().toISOString()
});

// Get statistics for last 24 hours
const stats = await getDuplicateStats(24);
// {
//   totalAlerts: 15,
//   alertsByType: { frontend_duplicate: 10, backend_duplicate: 5 },
//   affectedSessions: 8,
//   recentAlerts: [...]
// }

// Get dashboard metrics
const metrics = await getDuplicateMetrics();
// {
//   duplicateRate: 0.5,  // percentage
//   duplicatesLastHour: 5,
//   duplicatesLastDay: 20,
//   duplicatesLastWeek: 100,
//   topAffectedSessions: [...]
// }

// Cleanup old alerts (keeps last 30 days)
const deletedCount = await cleanupOldAlerts();
```

### 5. Admin API Routes

**File:** `/server/routes/duplicate-monitoring.ts`

API endpoints for monitoring and managing duplicate detection.

**Endpoints:**

```
POST /api/admin/alert-duplicates
  - Log duplicate detection from frontend
  - Body: { type, stats, sessionId, messageId, userEmail, timestamp }

GET /api/admin/duplicate-stats?hours=24
  - Get duplicate statistics for time period
  - Returns: { totalAlerts, alertsByType, affectedSessions, recentAlerts }

GET /api/admin/duplicate-metrics
  - Get detailed metrics for dashboard
  - Returns: { duplicateRate, duplicatesLastHour/Day/Week, topAffectedSessions }

POST /api/admin/cleanup-duplicate-alerts
  - Cleanup old alerts (admin only)
  - Returns: { success, deletedCount, message }
```

## Usage Guide

### Integrating with Existing Code

1. **Frontend (SupportChat.tsx):**

```typescript
import { messageDeduplication } from '@/utils/messageDeduplication';

const [messages, setMessages] = useState<Message[]>([]);

// When adding new message
const addMessage = (newMessage: Message) => {
  // Check for duplicates
  if (messageDeduplication.isDuplicate(newMessage)) {
    console.warn('[Chat] Duplicate message blocked:', newMessage.id);
    return;
  }

  // Safe to add
  setMessages(prev => [...prev, newMessage]);
};

// When loading messages from storage
useEffect(() => {
  const loadMessages = () => {
    const stored = loadFromLocalStorage();

    // Register all existing messages
    stored.forEach(msg => messageDeduplication.register(msg));

    // Deduplicate before setting
    const cleaned = messageDeduplication.deduplicateArray(stored);
    setMessages(cleaned);
  };

  loadMessages();
}, []);

// Periodic monitoring check
useEffect(() => {
  const interval = setInterval(() => {
    messageDeduplication.checkAndAlert();
  }, 60000); // Check every minute

  return () => clearInterval(interval);
}, []);
```

2. **Backend (chatService.ts):**

```typescript
import { createContentHash } from '@shared/utils/messageFingerprint';
import { storage } from './storage';

async function saveMessage(message: Message) {
  try {
    // Database trigger will handle content_hash generation
    // Unique constraint will prevent duplicates
    await storage.trackSupportQuery({
      sessionId: message.sessionId,
      userEmail: message.userEmail,
      userMessage: message.content,
      aiResponse: message.aiResponse,
      tokensIn: message.tokensIn,
      tokensOut: message.tokensOut,
      cost: message.cost,
      model: message.model,
    });
  } catch (error) {
    if (error.message.includes('unique') || error.message.includes('duplicate')) {
      console.warn('[Chat] Duplicate message prevented by database');

      // Log for monitoring
      await logDuplicateDetection({
        type: 'database_prevented',
        sessionId: message.sessionId,
        messageId: message.id,
        userEmail: message.userEmail,
        timestamp: new Date().toISOString(),
      });

      // Don't throw - just skip
      return;
    }

    // Other errors should throw
    throw error;
  }
}
```

### Admin Dashboard Integration

Add to `/client/src/pages/AdminDashboard.tsx`:

```typescript
import { useQuery } from '@tanstack/react-query';

function AdminDashboard() {
  const { data: metrics } = useQuery({
    queryKey: ['duplicate-metrics'],
    queryFn: async () => {
      const res = await fetch('/api/admin/duplicate-metrics');
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <div>
      <h2>Duplicate Message Monitoring</h2>

      <div className="metrics-grid">
        <MetricCard
          title="Duplicate Rate"
          value={`${metrics?.duplicateRate || 0}%`}
          status={metrics?.duplicateRate > 1 ? 'warning' : 'ok'}
        />

        <MetricCard
          title="Last Hour"
          value={metrics?.duplicatesLastHour || 0}
        />

        <MetricCard
          title="Last 24 Hours"
          value={metrics?.duplicatesLastDay || 0}
        />

        <MetricCard
          title="Last Week"
          value={metrics?.duplicatesLastWeek || 0}
        />
      </div>

      {metrics?.topAffectedSessions.length > 0 && (
        <div>
          <h3>Most Affected Sessions</h3>
          <table>
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Duplicate Count</th>
                <th>User Email</th>
              </tr>
            </thead>
            <tbody>
              {metrics.topAffectedSessions.map(session => (
                <tr key={session.sessionId}>
                  <td>{session.sessionId}</td>
                  <td>{session.duplicateCount}</td>
                  <td>{session.userEmail || 'Anonymous'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

## Testing

### Unit Tests

```bash
npm test -- messageDeduplication.test.ts
```

Tests cover:
- Fingerprint generation consistency
- Duplicate detection logic
- Array deduplication
- Content hash generation
- Edge cases (empty strings, whitespace, long content)

### Integration Tests

```bash
npm test -- duplicate-prevention.test.ts
```

Tests cover:
- Database constraint enforcement
- Trigger functionality (content_hash generation)
- Alert logging
- Performance under load (100+ messages)
- Cross-session behavior

### Manual Testing

1. **Frontend Duplicate Prevention:**
   - Open chat
   - Send same message twice quickly
   - Verify only one appears in UI
   - Check console for "[Dedup] Duplicate message detected"

2. **Database Constraint:**
   - Use database client to insert duplicate
   - Verify unique violation error
   - Check duplicate_alerts table for log entry

3. **Monitoring Dashboard:**
   - Navigate to /admin
   - Check "Duplicate Message Monitoring" section
   - Verify metrics update in real-time
   - Test cleanup function

## Performance

### Memory Usage

- Frontend tracking: ~1KB per message × 100 messages = ~100KB
- Fingerprint cache: ~32 bytes per fingerprint × 100 = ~3.2KB
- Total frontend overhead: **~103KB**

### Database Impact

- content_hash index: Minimal overhead (8 bytes per row)
- Unique constraint check: O(log n) using B-tree index
- Insert performance: < 1ms penalty per message

### Network Impact

- Alert API calls: Only when threshold exceeded (> 5 duplicates)
- Payload size: ~500 bytes per alert
- Negligible impact on normal operation

## Monitoring & Alerts

### Alert Thresholds

- **LOW:** 1-5 duplicates per hour (log only)
- **MEDIUM:** 6-10 duplicates per hour (log + console warn)
- **HIGH:** 11+ duplicates per hour (log + admin alert)

### Admin Notifications

When duplicate rate exceeds threshold:
1. Console error logged with full stats
2. Entry added to duplicate_alerts table
3. Admin alert sent (via configured channel)

**Future integrations:**
- Email notifications
- Slack webhooks
- PagerDuty alerts

### Metrics Dashboard

Available metrics:
- Duplicate rate (percentage)
- Duplicates per time period (hour/day/week)
- Most affected sessions
- Duplicate type breakdown
- Historical trends

## Maintenance

### Cleanup Jobs

Run periodically (recommended: daily):

```bash
# Cleanup old alerts (keeps last 30 days)
curl -X POST http://localhost:5000/api/admin/cleanup-duplicate-alerts
```

**Recommended cron schedule:**
```
0 2 * * * # Daily at 2 AM
```

### Database Maintenance

```sql
-- Check duplicate_alerts size
SELECT
  pg_size_pretty(pg_total_relation_size('duplicate_alerts')) as size,
  COUNT(*) as rows
FROM duplicate_alerts;

-- Manual cleanup (keep last 7 days)
DELETE FROM duplicate_alerts
WHERE created_at < NOW() - INTERVAL '7 days';

-- Vacuum to reclaim space
VACUUM ANALYZE duplicate_alerts;
```

## Troubleshooting

### Common Issues

**1. False Positives (legitimate messages blocked)**

**Symptoms:** User reports message not appearing after sending

**Diagnosis:**
```typescript
// Check console for deduplication logs
console.log(messageDeduplication.getStats());
```

**Solution:**
```typescript
// Clear deduplication cache
messageDeduplication.clear();

// Or adjust timing threshold
// In messageFingerprint.ts, change:
const timeDiff = Math.abs(time1 - time2);
return timeDiff < 2000; // Increase from 2000ms to 5000ms
```

**2. High Duplicate Rate**

**Symptoms:** Admin alert triggered, many duplicates detected

**Diagnosis:**
```bash
# Check recent alerts
curl http://localhost:5000/api/admin/duplicate-stats?hours=1
```

**Possible causes:**
- Bug causing message re-renders
- Race condition in message handling
- Frontend state management issue
- WebSocket reconnection duplicating messages

**Solution:**
- Review SupportChat.tsx message handling
- Check WebSocket reconnection logic
- Verify state updates use functional form
- Add additional logging to identify source

**3. Database Unique Violation Errors**

**Symptoms:** Error logs showing constraint violations

**Diagnosis:**
```sql
-- Check for duplicate attempts
SELECT * FROM duplicate_alerts
WHERE alert_type = 'database_prevented'
ORDER BY created_at DESC
LIMIT 20;
```

**Solution:**
- Verify frontend deduplication is working
- Check if multiple API calls are being made
- Review network tab for duplicate requests

## Migration Guide

### Running the Migration

```bash
# Apply migration
psql $DATABASE_URL -f db/migrations/add_message_deduplication.sql

# Verify migration
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'support_queries' AND column_name = 'content_hash';"

# Check indexes
psql $DATABASE_URL -c "\d support_queries"
```

### Rollback (if needed)

```sql
-- Remove constraints and indexes
DROP INDEX IF EXISTS support_queries_dedupe_idx;
DROP INDEX IF EXISTS support_queries_content_hash_idx;
DROP TRIGGER IF EXISTS support_queries_content_hash_trigger ON support_queries;
DROP FUNCTION IF EXISTS generate_content_hash();

-- Remove column
ALTER TABLE support_queries DROP COLUMN IF EXISTS content_hash;

-- Remove monitoring table
DROP TABLE IF EXISTS duplicate_alerts;
```

## Future Enhancements

1. **Machine Learning Detection:**
   - Train model to detect semantic duplicates
   - Handle paraphrased messages
   - Identify spam patterns

2. **Cross-Session Deduplication:**
   - Detect duplicates across different user sessions
   - Identify common questions for FAQ generation

3. **Real-Time Dashboard:**
   - WebSocket updates for live monitoring
   - Visual charts and graphs
   - Drill-down analysis

4. **Advanced Alerting:**
   - Configurable threshold per user/session
   - Multiple notification channels
   - Automated remediation actions

## Support

For issues or questions:
- Check logs: `grep -r "Dedup" logs/`
- Review metrics: GET `/api/admin/duplicate-metrics`
- Contact: steve@lander.media
