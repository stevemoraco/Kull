# Calculator Data Persistence

## Overview

Calculator data from the chat interface is now fully persisted to the database. This allows admins to analyze user engagement patterns, understand their business metrics, and track conversion signals.

## Schema Changes

### Database Table: `chat_sessions`

Added a new JSONB column to store calculator data snapshots:

```typescript
calculatorData: jsonb("calculator_data").$type<{
  shootsPerWeek: number;
  hoursPerShoot: number;
  billableRate: number;
  hasManuallyAdjusted: boolean;
  hasClickedPreset: boolean;
}>()
```

**Migration Status:** ✅ Applied (via `npm run db:push`)

## Data Flow

### 1. Frontend → Backend

Calculator data is sent in the request body to both chat endpoints:

- `POST /api/chat/message` - Real-time message streaming
- `POST /api/chat/sessions` - Session persistence

**Request Payload:**
```json
{
  "calculatorData": {
    "shootsPerWeek": 5,
    "hoursPerShoot": 3,
    "billableRate": 150,
    "hasManuallyAdjusted": true,
    "hasClickedPreset": false
  }
}
```

### 2. Backend Persistence

The data is stored when saving chat sessions:

**File:** `/home/runner/workspace/server/routes.ts` (line ~1847)

```typescript
const chatSession = {
  id: session.id,
  userId: userId,
  userEmail: userEmail,
  title: session.title,
  messages: JSON.stringify(session.messages),
  calculatorData: calculatorData || session.calculatorData || null,
  // ... other fields
};

await storage.saveChatSession(chatSession);
```

**File:** `/home/runner/workspace/server/storage.ts` (line ~938)

```typescript
async saveChatSession(session: InsertChatSession): Promise<ChatSession> {
  const [savedSession] = await db
    .insert(chatSessions)
    .values(session)
    .onConflictDoUpdate({
      target: chatSessions.id,
      set: {
        title: session.title,
        messages: session.messages,
        calculatorData: session.calculatorData, // ← Persisted here
        updatedAt: session.updatedAt,
      },
    })
    .returning();

  return savedSession;
}
```

## Admin Access

### New Admin Endpoint

**Endpoint:** `GET /api/admin/calculator-data`
**Authentication:** Requires `isAuthenticated` + `isAdmin` (steve@lander.media only)

**Response:**
```json
{
  "total": 42,
  "sessions": [
    {
      "sessionId": "abc123",
      "userId": "user-id-123",
      "userEmail": "photographer@example.com",
      "title": "Conversation about pricing",
      "device": "Desktop",
      "browser": "Chrome",
      "location": "San Francisco, CA United States",
      "createdAt": "2025-11-19T10:30:00Z",
      "updatedAt": "2025-11-19T10:45:00Z",
      "calculatorData": {
        "shootsPerWeek": 5,
        "hoursPerShoot": 3,
        "billableRate": 150,
        "hasManuallyAdjusted": true,
        "hasClickedPreset": false,
        "annualShoots": 260,
        "annualHours": 780,
        "annualCost": 117000,
        "weeksSaved": 19.5
      }
    }
  ],
  "summary": {
    "averageShootsPerWeek": "4.2",
    "averageHoursPerShoot": "2.8",
    "averageBillableRate": 135,
    "manuallyAdjustedCount": 18,
    "clickedPresetCount": 24
  }
}
```

### SQL Query Examples

For direct database access:

```sql
-- View all calculator data
SELECT
  id,
  user_email,
  calculator_data,
  created_at,
  updated_at
FROM chat_sessions
WHERE calculator_data IS NOT NULL
ORDER BY updated_at DESC;

-- Average metrics across all users
SELECT
  AVG((calculator_data->>'shootsPerWeek')::numeric) AS avg_shoots_per_week,
  AVG((calculator_data->>'hoursPerShoot')::numeric) AS avg_hours_per_shoot,
  AVG((calculator_data->>'billableRate')::numeric) AS avg_billable_rate
FROM chat_sessions
WHERE calculator_data IS NOT NULL;

-- Users who manually adjusted values (high engagement signal)
SELECT
  user_email,
  calculator_data,
  (calculator_data->>'shootsPerWeek')::numeric * 52 AS annual_shoots,
  (calculator_data->>'shootsPerWeek')::numeric *
    (calculator_data->>'hoursPerShoot')::numeric *
    52 AS annual_hours_wasted
FROM chat_sessions
WHERE
  calculator_data IS NOT NULL
  AND (calculator_data->>'hasManuallyAdjusted')::boolean = true
ORDER BY annual_hours_wasted DESC;

-- Conversion insights: Calculator engagement vs subscription
SELECT
  cs.user_email,
  u.subscription_status,
  cs.calculator_data,
  cs.created_at
FROM chat_sessions cs
LEFT JOIN users u ON cs.user_id = u.id
WHERE cs.calculator_data IS NOT NULL
ORDER BY cs.created_at DESC;
```

## Business Metrics Calculated

For each calculator data entry, these metrics are automatically computed:

| Metric | Calculation | Example |
|--------|-------------|---------|
| **Annual Shoots** | `shootsPerWeek × 52` | 260 shoots/year |
| **Annual Hours Wasted** | `shootsPerWeek × hoursPerShoot × 52` | 780 hours/year |
| **Annual Cost** | `annualHours × billableRate` | $117,000/year |
| **Work Weeks Saved** | `annualHours ÷ 40` | 19.5 weeks/year |

## Use Cases for Admin

1. **Lead Qualification**
   - High billable rate + high shoots = qualified lead
   - Manual adjustments = engaged prospect

2. **Sales Prioritization**
   - Sort by `annualCost` to find highest-value prospects
   - Filter by `hasManuallyAdjusted` for warm leads

3. **Product Marketing**
   - Average values inform messaging ("Save 19 weeks/year!")
   - Understand photographer workflows and pain points

4. **Conversion Analysis**
   - Track calculator engagement → trial signup rate
   - Identify drop-off points in sales funnel

5. **Pricing Strategy**
   - Analyze average billable rates by location
   - Understand market segments (hobbyist vs pro)

## Testing

### Manual Test

1. Visit the Kull chat interface
2. Interact with the calculator widget
3. Adjust shoots/week, hours/shoot, billable rate
4. Send a chat message
5. Check admin endpoint: `GET /api/admin/calculator-data`
6. Verify your session appears with calculator data

### Database Verification

```bash
# Connect to database
psql $DATABASE_URL

# Check if column exists
\d chat_sessions

# View recent calculator data
SELECT
  user_email,
  calculator_data->>'shootsPerWeek' as shoots,
  calculator_data->>'billableRate' as rate,
  updated_at
FROM chat_sessions
WHERE calculator_data IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;
```

## Files Modified

1. **`/home/runner/workspace/shared/schema.ts`** (line ~183)
   - Added `calculatorData` JSONB column to `chatSessions` table

2. **`/home/runner/workspace/server/storage.ts`** (line ~948)
   - Updated `saveChatSession` to persist `calculatorData`

3. **`/home/runner/workspace/server/routes.ts`** (line ~1881, ~2774)
   - Updated `POST /api/chat/sessions` to accept `calculatorData` in request
   - Added `GET /api/admin/calculator-data` endpoint for querying

## Future Enhancements

Consider adding:

1. **Time-series tracking**: See how users adjust values over time
2. **Cohort analysis**: Calculator engagement by acquisition source
3. **Export to CSV**: Download calculator data for deeper analysis
4. **Real-time alerts**: Notify sales when high-value lead interacts with calculator
5. **Aggregate dashboards**: Visualize trends in admin panel

## Security Notes

- ✅ Calculator data is NOT exposed to unauthenticated users
- ✅ Admin endpoint requires authentication + admin role
- ✅ User emails/IDs are associated for privacy-compliant tracking
- ✅ Anonymous sessions still capture calculator data (pre-signup)

---

**Last Updated:** 2025-11-19
**Schema Version:** 1.0 (calculatorData column added)
**Backwards Compatible:** Yes (nullable JSONB column)
