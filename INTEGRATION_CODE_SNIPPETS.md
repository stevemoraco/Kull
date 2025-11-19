# Duplicate Prevention - Copy-Paste Integration Snippets

Quick reference for integrating the duplicate prevention system into existing code.

## 1. Server Routes Registration

**File:** `/server/index.ts` or `/server/routes.ts`

```typescript
// Add this import near the top with other route imports
import duplicateMonitoringRoutes from './routes/duplicate-monitoring';

// Add this route registration (after existing routes)
app.use('/api/admin', duplicateMonitoringRoutes);

// OPTIONAL: Add automatic cleanup job
import { cleanupOldAlerts } from './monitoring/duplicateDetection';

// Run daily cleanup at startup and every 24 hours
cleanupOldAlerts().then(count => {
  console.log(`[Cleanup] Removed ${count} old duplicate alerts`);
});

setInterval(async () => {
  const deletedCount = await cleanupOldAlerts();
  console.log(`[Cleanup] Removed ${deletedCount} old duplicate alerts`);
}, 24 * 60 * 60 * 1000); // Once per day
```

## 2. Frontend Message Deduplication (SupportChat.tsx)

### Add Imports

```typescript
// Add at the top with other imports
import { messageDeduplication } from '@/utils/messageDeduplication';
```

### Add Deduplication Check in sendMessage

Find the `sendMessage` function and add this check BEFORE creating the user message:

```typescript
const sendMessage = async (messageText: string) => {
  if (!messageText.trim()) return;

  // Track when user last sent a message
  lastUserMessageTimeRef.current = Date.now();

  // CRITICAL FIX: Clear proactive message countdown when user sends a message
  setNextMessageIn(null);

  const userMessage: Message = {
    id: Date.now().toString(),
    role: 'user',
    content: messageText.trim(),
    timestamp: new Date(),
  };

  // 🚫 DUPLICATE PREVENTION: Check before adding to state
  if (messageDeduplication.isDuplicate(userMessage)) {
    console.warn('[Chat] Duplicate message blocked:', userMessage.id);
    toast({
      title: 'Duplicate Message',
      description: 'This message was just sent. Please wait before sending again.',
      variant: 'default',
    });
    return; // Exit early - don't add duplicate
  }

  // Safe to add - not a duplicate
  setMessages(prev => [...prev, userMessage]);
  setInputValue('');
  setIsLoading(true);

  // ... rest of sendMessage function
};
```

### Add Deduplication on Message Load

Add this useEffect to deduplicate messages when loading from storage:

```typescript
// Add near other useEffects (around line 1428)
useEffect(() => {
  // Deduplicate messages on initial load and when sessions change
  const deduplicateStoredMessages = () => {
    setSessions(prevSessions => {
      const dedupedSessions = prevSessions.map(session => {
        // Register all existing messages first
        session.messages.forEach(msg => {
          messageDeduplication.register(msg);
        });

        // Deduplicate the array
        const uniqueMessages = messageDeduplication.deduplicateArray(session.messages);

        // Log if any duplicates were found
        if (uniqueMessages.length < session.messages.length) {
          const removedCount = session.messages.length - uniqueMessages.length;
          console.warn(`[Chat] Removed ${removedCount} duplicate messages from session ${session.id}`);
        }

        return {
          ...session,
          messages: uniqueMessages,
        };
      });

      // Save cleaned sessions back to storage
      saveSessions(dedupedSessions);

      return dedupedSessions;
    });
  };

  deduplicateStoredMessages();
}, []); // Run once on mount
```

### Add Periodic Monitoring

Add this useEffect to periodically check for high duplicate rates:

```typescript
// Add near other useEffects
useEffect(() => {
  // Monitor duplicate rate and alert if high
  const monitorInterval = setInterval(() => {
    const stats = messageDeduplication.getStats();

    // Log stats periodically
    if (stats.totalDuplicatesDetected > 0) {
      console.log('[Chat] Duplicate detection stats:', stats);
    }

    // Send alert to backend if rate is high
    messageDeduplication.checkAndAlert();
  }, 60000); // Check every minute

  return () => clearInterval(monitorInterval);
}, []);
```

## 3. Admin Dashboard Integration

**File:** `/client/src/pages/AdminDashboard.tsx`

### Add Import

```typescript
import { useQuery } from '@tanstack/react-query';
```

### Add Duplicate Monitoring Component

Add this component INSIDE the AdminDashboard component:

```typescript
function DuplicateMonitoringSection() {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['duplicate-metrics'],
    queryFn: async () => {
      const res = await fetch('/api/admin/duplicate-metrics');
      if (!res.ok) throw new Error('Failed to fetch duplicate metrics');
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="p-6 bg-card rounded-lg border border-border">
        <h2 className="text-2xl font-bold mb-4">Duplicate Message Monitoring</h2>
        <div className="text-muted-foreground">Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-card rounded-lg border border-border">
        <h2 className="text-2xl font-bold mb-4">Duplicate Message Monitoring</h2>
        <div className="text-destructive">Error loading metrics: {error.message}</div>
      </div>
    );
  }

  const duplicateRate = metrics?.duplicateRate || 0;
  const isHighRate = duplicateRate > 1;
  const isWarningRate = duplicateRate > 0.5 && duplicateRate <= 1;

  return (
    <div className="p-6 bg-card rounded-lg border border-border">
      <h2 className="text-2xl font-bold mb-6">Duplicate Message Monitoring</h2>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Duplicate Rate */}
        <div className={`p-4 rounded-lg ${
          isHighRate ? 'bg-red-100 dark:bg-red-900/20' :
          isWarningRate ? 'bg-yellow-100 dark:bg-yellow-900/20' :
          'bg-green-100 dark:bg-green-900/20'
        }`}>
          <div className="text-sm text-muted-foreground mb-1">Duplicate Rate</div>
          <div className="text-3xl font-bold">
            {duplicateRate.toFixed(2)}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {isHighRate ? '🔴 High' : isWarningRate ? '🟡 Warning' : '🟢 Normal'}
          </div>
        </div>

        {/* Last Hour */}
        <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Last Hour</div>
          <div className="text-3xl font-bold">
            {metrics?.duplicatesLastHour || 0}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            duplicates detected
          </div>
        </div>

        {/* Last 24 Hours */}
        <div className="p-4 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Last 24 Hours</div>
          <div className="text-3xl font-bold">
            {metrics?.duplicatesLastDay || 0}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            duplicates detected
          </div>
        </div>

        {/* Last Week */}
        <div className="p-4 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Last Week</div>
          <div className="text-3xl font-bold">
            {metrics?.duplicatesLastWeek || 0}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            duplicates detected
          </div>
        </div>
      </div>

      {/* Top Affected Sessions Table */}
      {metrics?.topAffectedSessions?.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-3">Most Affected Sessions</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-2 text-left">Session ID</th>
                  <th className="border border-border p-2 text-center">Duplicates</th>
                  <th className="border border-border p-2 text-left">User</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topAffectedSessions.map((session: any) => (
                  <tr key={session.sessionId} className="hover:bg-muted/50">
                    <td className="border border-border p-2 font-mono text-sm">
                      {session.sessionId.substring(0, 16)}...
                    </td>
                    <td className="border border-border p-2 text-center font-bold">
                      {session.duplicateCount}
                    </td>
                    <td className="border border-border p-2">
                      {session.userEmail || 'Anonymous'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Refresh Info */}
      <div className="mt-4 text-xs text-muted-foreground text-center">
        Auto-refreshes every 30 seconds
      </div>
    </div>
  );
}
```

### Add to AdminDashboard Return

Find the main `return` statement in AdminDashboard and add the component:

```typescript
return (
  <div className="container mx-auto p-6 space-y-8">
    <h1 className="text-3xl font-bold">Admin Dashboard</h1>

    {/* Existing sections... */}

    {/* NEW: Duplicate Message Monitoring */}
    <DuplicateMonitoringSection />

    {/* Existing sections... */}
  </div>
);
```

## 4. Database Migration

Run this command to apply the migration:

```bash
# Apply migration
psql $DATABASE_URL -f db/migrations/add_message_deduplication.sql

# Verify migration
psql $DATABASE_URL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'support_queries' AND column_name = 'content_hash';"

# Should output:
# column_name  | data_type
# -------------+-----------
# content_hash | character varying
```

## 5. Environment Variables

No new environment variables required. The system uses existing database connection.

## 6. Testing Integration

Add to your test script or run manually:

```bash
# Run unit tests
npm run test:unit -- tests/unit/messageDeduplication.test.ts --run

# Run integration tests (requires database)
npm run test:integration -- tests/integration/duplicate-prevention.test.ts --run

# All tests should pass
```

## 7. Manual Verification

### Test 1: Frontend Duplicate Prevention

```
1. Open chat interface
2. Type "Test message" and send
3. IMMEDIATELY type "Test message" again and send (within 2 seconds)
4. Expected: Only ONE message appears in chat
5. Expected: Console shows "[Chat] Duplicate message blocked"
```

### Test 2: Database Constraint

```bash
# In psql or database client:
psql $DATABASE_URL

# Try to insert duplicate:
INSERT INTO support_queries (
  session_id, user_email, user_message, ai_response,
  tokens_in, tokens_out, cost, model
) VALUES (
  'test-session', 'test@example.com', 'Test message', 'Response',
  100, 50, '0.001', 'gpt-5-nano'
);

# Run same INSERT again - should fail with unique constraint error
```

### Test 3: Admin Dashboard

```
1. Navigate to /admin (or your admin route)
2. Scroll to "Duplicate Message Monitoring" section
3. Expected: Four metric cards display
4. Expected: No console errors
5. Expected: Metrics update every 30 seconds
```

## 8. Rollback (If Needed)

### Quick Disable (Frontend Only)

```typescript
// In SupportChat.tsx, comment out the duplicate check:
// if (messageDeduplication.isDuplicate(userMessage)) {
//   console.warn('[Chat] Duplicate message blocked:', userMessage.id);
//   return;
// }
```

### Full Rollback (Database)

```bash
psql $DATABASE_URL <<EOF
-- Remove constraints
DROP INDEX IF EXISTS support_queries_dedupe_idx;
DROP INDEX IF EXISTS support_queries_content_hash_idx;

-- Remove trigger
DROP TRIGGER IF EXISTS support_queries_content_hash_trigger ON support_queries;
DROP FUNCTION IF EXISTS generate_content_hash();

-- Remove column
ALTER TABLE support_queries DROP COLUMN IF EXISTS content_hash;

-- Remove monitoring table
DROP TABLE IF EXISTS duplicate_alerts;
EOF
```

## 9. Monitoring Commands

### Check Duplicate Stats

```bash
# Get stats for last hour
curl http://localhost:5000/api/admin/duplicate-stats?hours=1

# Get stats for last 24 hours
curl http://localhost:5000/api/admin/duplicate-stats?hours=24

# Get detailed metrics
curl http://localhost:5000/api/admin/duplicate-metrics
```

### Run Manual Cleanup

```bash
# Clean up old alerts (keeps last 30 days)
curl -X POST http://localhost:5000/api/admin/cleanup-duplicate-alerts
```

### Check Database Size

```sql
-- Check duplicate_alerts table size
SELECT
  pg_size_pretty(pg_total_relation_size('duplicate_alerts')) as size,
  COUNT(*) as rows
FROM duplicate_alerts;

-- Check support_queries index size
SELECT
  pg_size_pretty(pg_total_relation_size('support_queries_dedupe_idx')) as index_size;
```

## 10. Common Issues and Fixes

### Issue: "messageDeduplication is not defined"

**Fix:** Add import at top of file:
```typescript
import { messageDeduplication } from '@/utils/messageDeduplication';
```

### Issue: Database migration fails with "relation already exists"

**Fix:** Check if migration already ran:
```sql
\d support_queries  -- Look for content_hash column
\d duplicate_alerts  -- Check if table exists
```

If already exists, migration is complete. Otherwise, drop existing objects and re-run.

### Issue: Tests fail with module not found

**Fix:** Ensure shared folder is accessible:
```bash
# Check if file exists
ls -la shared/utils/messageFingerprint.ts

# If missing, verify file was created correctly
```

### Issue: Admin dashboard shows "Error loading metrics"

**Fix:** Verify backend route is registered:
```typescript
// In server/index.ts
console.log('Registered routes:', app._router.stack.map(r => r.route?.path));
// Should include '/api/admin/duplicate-metrics'
```

## 11. Performance Optimization Tips

### Reduce Memory Usage

```typescript
// In messageDeduplication.ts, reduce cache size:
if (this.recentMessages.size > 50) { // Default is 100
  const oldestKey = this.recentMessages.keys().next().value;
  this.recentMessages.delete(oldestKey);
}
```

### Adjust Timing Threshold

```typescript
// In messageFingerprint.ts, change duplicate detection window:
return timeDiff < 5000; // Increase from 2000ms to 5000ms
```

### Disable Monitoring on Low-Traffic Sites

```typescript
// Comment out in SupportChat.tsx:
// messageDeduplication.checkAndAlert();

// This reduces unnecessary API calls
```

---

## Quick Start Checklist

- [ ] Run database migration
- [ ] Register routes in server
- [ ] Add imports to SupportChat.tsx
- [ ] Add duplicate check to sendMessage
- [ ] Add deduplication on message load
- [ ] Add periodic monitoring useEffect
- [ ] Add admin dashboard section
- [ ] Run tests (all should pass)
- [ ] Manual verification (3 tests)
- [ ] Deploy and monitor

**Time estimate:** 30-60 minutes for full integration

---

**Need help?** See:
- `/docs/DUPLICATE_PREVENTION_SYSTEM.md` - Complete documentation
- `/DUPLICATE_PREVENTION_IMPLEMENTATION.md` - Detailed guide
- `/DUPLICATE_PREVENTION_SUMMARY.md` - Executive summary
