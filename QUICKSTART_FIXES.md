# QUICK START: Fix Blockers NOW
**Time:** 5-7 days to production
**Priority:** P0 - Critical

---

## RUN THESE COMMANDS FIRST

```bash
# See what's broken
npm test 2>&1 | grep -A 3 "FAIL"
npm run check 2>&1 | grep "error TS" | head -20
npm run build

# Expected current state:
# ✓ Build succeeds
# ❌ 69 tests failing
# ❌ 73 TypeScript errors
```

---

## DAY 1: DATABASE TESTS (2 hours)

**Fix:** Add missing fields to test data

```typescript
// File: tests/performance/database-query.perf.test.ts
// Lines 250-400 (search for "db.insert")

// OLD (fails with constraint violation):
await db.insert(creditTransactions).values({
  userId: 'test-user',
  amount: 100
});

// NEW (passes):
await db.insert(creditTransactions).values({
  userId: 'test-user',
  amount: 100,
  balance: 1000,           // ADD THIS
  transactionType: 'test', // ADD THIS
  description: 'Test'      // ADD THIS
});
```

**Verify:**
```bash
npm test tests/performance/database-query.perf.test.ts
# Expected: ✓ 6 tests passing
```

---

## DAY 1: GOOGLE ADAPTER TESTS (3 hours)

**Fix:** Add `.json()` method to mocks

```typescript
// File: server/ai/providers/__tests__/GoogleAdapter.test.ts
// Lines 600-700 (search for "mockFetch.mockResolvedValueOnce")

// OLD (fails: "json is not a function"):
mockFetch.mockResolvedValueOnce({
  name: 'projects/test/jobs/job-123'
});

// NEW (passes):
mockFetch.mockResolvedValueOnce({
  ok: true,
  json: async () => ({
    name: 'projects/test/jobs/job-123',
    state: 'JOB_STATE_SUCCEEDED'
  })
} as any);
```

**Verify:**
```bash
npm test server/ai/providers/__tests__/GoogleAdapter.test.ts
# Expected: ✓ 26 tests passing
```

---

## DAY 1: OPENAI BATCH TEST (1 hour)

**Fix:** Add missing `momentTiming` field

```typescript
// File: server/ai/providers/__tests__/OpenAIAdapter.test.ts
// Line ~1100 (search for "Integration - Full Batch Workflow")

// In the mock JSONL response, add to subjectAnalysis:
subjectAnalysis: {
  primarySubject: 'Bride',
  emotionIntensity: 1000,
  eyesOpen: true,
  eyeContact: true,
  genuineExpression: 1000,
  facialSharpness: 1000,
  bodyLanguage: 950,
  momentTiming: 1000,  // ADD THIS LINE
  storyTelling: 950,
  uniqueness: 900
}
```

**Verify:**
```bash
npm test server/ai/providers/__tests__/OpenAIAdapter.test.ts
# Expected: ✓ 38 tests passing
```

---

## DAY 2: PERFORMANCE TIMEOUTS (2 hours)

**Fix:** Increase timeouts from 120s to 300s

```typescript
// Files:
// - tests/performance/memory-leak.perf.test.ts
// - tests/performance/websocket-throughput.perf.test.ts

// OLD:
it('should handle long-running retry loops', async () => {
  // ... test code
}); // Uses default 120s timeout

// NEW:
it('should handle long-running retry loops', async () => {
  // ... test code
}, 300000); // 5 minutes
```

**Verify:**
```bash
npm test tests/performance/memory-leak.perf.test.ts
npm test tests/performance/websocket-throughput.perf.test.ts
# Expected: ✓ All tests passing (may take 5+ minutes)
```

---

## DAY 2: MEMORY LEAK FIX (4 hours)

**Fix:** Add chunk processing with GC hints

```typescript
// File: server/ai/BatchProcessor.ts
// Method: processConcurrent

async processConcurrent(images: string[]): Promise<void> {
  const CHUNK_SIZE = 100;

  for (let i = 0; i < images.length; i += CHUNK_SIZE) {
    const chunk = images.slice(i, i + CHUNK_SIZE);
    const promises = chunk.map(img => this.processImage(img));
    await Promise.allSettled(promises);

    // Force garbage collection between chunks
    if (global.gc) {
      global.gc();
    }
  }
}
```

**Verify:**
```bash
npm test tests/performance/large-batch.perf.test.ts
# Expected: Memory growth <50%
```

---

## DAY 3: USER TYPE FIX (2 hours)

**Fix:** Create AuthContext with User interface

```typescript
// File: client/src/contexts/AuthContext.tsx (CREATE NEW)

import { createContext, useContext, useState, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  folderCatalog: string[] | null;
  preferredChatModel: string | null;
  // ... add other fields from schema
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be within AuthProvider');
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  return (
    <AuthContext.Provider value={{ user, setUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**Then update all files:**
```typescript
// File: client/src/App.tsx, SupportChat.tsx, etc.

// OLD:
const user = useUser(); // Returns {}

// NEW:
import { useAuth } from './contexts/AuthContext';
const { user } = useAuth(); // Returns User | null

// Safe access:
const email = user?.email ?? 'Unknown';
```

**Verify:**
```bash
npm run check | grep "Property 'email' does not exist"
# Expected: No errors
```

---

## DAY 3: TEST RUNNER TYPES (30 min)

**Fix:** Add Vitest types to tsconfig

```json
// File: client/tsconfig.json

{
  "compilerOptions": {
    // ... existing options
    "types": ["vitest/globals"]
  }
}
```

**Verify:**
```bash
npm run check | grep "Cannot find name 'describe'"
# Expected: No errors
```

---

## DAY 3: REACT IMPORTS (30 min)

**Fix:** Move flushSync to react-dom

```typescript
// File: client/src/components/SupportChat.tsx

// OLD:
import { useState, useEffect, flushSync } from 'react';

// NEW:
import { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
```

**Verify:**
```bash
npm run check | grep "flushSync"
# Expected: No errors
```

---

## DAY 4: FINAL VERIFICATION

```bash
# 1. All tests passing
npm test
# Expected: ✓ 543/543 tests

# 2. No TypeScript errors
npm run check
# Expected: ✓ No errors

# 3. Build succeeds
npm run build
# Expected: ✓ Built in ~25s

# 4. Manual smoke test
npm run dev
# Visit http://localhost:5173
# Test: Login → Upload photo → Process → Export XMP
```

---

## PRIORITY ORDER

**Do these in exact order:**

1. ✅ Database tests (Day 1, 2 hrs) - EASIEST
2. ✅ Google Adapter tests (Day 1, 3 hrs) - MEDIUM
3. ✅ OpenAI batch test (Day 1, 1 hr) - EASY
4. ✅ Performance timeouts (Day 2, 2 hrs) - EASY
5. ✅ Memory leak fix (Day 2, 4 hrs) - HARD
6. ✅ User type fix (Day 3, 2 hrs) - MEDIUM
7. ✅ Test runner types (Day 3, 30 min) - TRIVIAL
8. ✅ React imports (Day 3, 30 min) - TRIVIAL
9. ✅ All other TypeScript errors (Day 4, 4 hrs) - MEDIUM
10. ✅ Final verification (Day 5, full day) - CRITICAL

---

## SUCCESS CRITERIA

**Before deploying to production:**

- [ ] `npm test` → ✅ 543/543 passing
- [ ] `npm run check` → ✅ 0 errors
- [ ] `npm run build` → ✅ Success
- [ ] Manual QA → ✅ All features work
- [ ] Load test → ✅ 1000+ concurrent users
- [ ] Memory → ✅ <50% growth under load

---

## HELP NEEDED?

**If stuck, check:**
1. `/home/runner/workspace/REMEDIATION_GUIDE.md` - Detailed fixes
2. `/home/runner/workspace/FINAL_VERIFICATION_REPORT.md` - Full analysis
3. `/home/runner/workspace/EXECUTIVE_SUMMARY.md` - Context

**Or run:**
```bash
# See specific error details
npm test -- --reporter=verbose 2>&1 | less

# See TypeScript error context
npm run check 2>&1 | grep -A 5 "error TS"

# See which files are affected
grep -r "user\.email" client/src/ --include="*.tsx" --include="*.ts"
```

---

## ESTIMATED TIME

| Task | Time | Difficulty |
|------|------|-----------|
| Database tests | 2 hrs | Easy |
| Google tests | 3 hrs | Medium |
| OpenAI test | 1 hr | Easy |
| Perf timeouts | 2 hrs | Easy |
| Memory leaks | 4 hrs | Hard |
| User types | 2 hrs | Medium |
| Test types | 30 min | Trivial |
| React imports | 30 min | Trivial |
| Other TS errors | 4 hrs | Medium |
| Verification | 8 hrs | Critical |
| **TOTAL** | **27 hrs** | **~4-5 days** |

**Add 2-3 days buffer = 7 days total**

---

## START NOW

```bash
# Clone repo (if needed)
git pull origin main

# Install dependencies
npm install

# Run verification
npm test
npm run check
npm run build

# Pick first task: Database tests
# Open: tests/performance/database-query.perf.test.ts
# Fix: Add missing fields to test data
# Test: npm test tests/performance/database-query.perf.test.ts

# When that passes, move to next task!
```

---

**Questions?** steve@lander.media

**Status:** 🔴 CRITICAL - Start immediately
**Target:** November 25, 2025 (7 days)
**Reward:** Production-ready AI photo culling platform 🎉
