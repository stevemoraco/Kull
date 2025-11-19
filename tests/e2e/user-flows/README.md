# End-to-End User Flow Tests

Comprehensive E2E tests covering complete user journeys from signup to Lightroom export.

## Overview

These tests validate the **entire user experience** for Kull's AI photo culling platform:

1. **Device Authentication** - 6-digit code flow from native app to web approval
2. **Batch Processing** - All 3 modes (Fast concurrent, Economy batch API, Local on-device)
3. **Signup to Export** - Complete journey including WebSocket real-time updates
4. **Error Recovery** - Network failures, rate limits, exponential backoff
5. **Offline Queue** - Queue operations offline, sync when back online

## Test Files

```
tests/e2e/user-flows/
├── device-auth.spec.ts        - Device authentication flow (10 tests)
├── batch-processing.spec.ts   - All 3 processing modes (25+ tests)
├── signup-to-export.spec.ts   - Complete user journey (8 tests)
├── error-recovery.spec.ts     - Retry logic and error handling (20+ tests)
├── offline-queue.spec.ts      - Offline functionality (15+ tests)
└── README.md                  - This file
```

## Running Tests

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run Specific Test File
```bash
npx playwright test tests/e2e/user-flows/device-auth.spec.ts
```

### Run Tests in Headed Mode (see browser)
```bash
npx playwright test --headed
```

### Run Tests with UI Mode (interactive)
```bash
npx playwright test --ui
```

### Generate Test Report
```bash
npx playwright show-report tests/e2e/report
```

## Test Architecture

### Fixtures and Mocking

**Location:** `/home/runner/workspace/tests/e2e/fixtures/`

- `mock-ai-responses.ts` - Mock AI provider responses (structured ratings)
- `test-helpers.ts` - Helper functions for auth, images, network simulation

### Mock AI Responses

All tests use **mocked AI responses** to avoid real API calls:

```typescript
import { mockProviderResponse, mockBatchResponse } from '../fixtures/mock-ai-responses';

// Mock single image response
const mockResponse = mockProviderResponse.openai('test-photo.jpg');

// Mock batch response
const mockBatch = mockBatchResponse.success(50, 'openai');
```

### Network Simulation

Tests can simulate various network conditions:

```typescript
import { simulateNetworkError, enableOfflineMode, disableOfflineMode } from '../fixtures/test-helpers';

// Simulate timeout
await simulateNetworkError(page, '**/api/ai/process-batch', 'timeout');

// Go offline
await enableOfflineMode(page);

// Come back online
await disableOfflineMode(page);
```

## Test Coverage

### Device Authentication (`device-auth.spec.ts`)

✅ Complete 6-digit code flow
✅ Expired codes handling
✅ Rate limiting (5 requests max)
✅ Invalid code rejection
✅ Multi-device support
✅ iOS vs macOS platform handling
✅ Token refresh
✅ Concurrent auth requests

### Batch Processing (`batch-processing.spec.ts`)

**Fast Mode (Concurrent):**
- ✅ Process 50 images concurrently
- ✅ Real-time progress updates
- ✅ Partial failure handling
- ✅ Cost calculation (2x markup)

**Economy Mode (Batch API):**
- ✅ Submit batch job
- ✅ Poll for completion
- ✅ 50% discount verification
- ✅ Result retrieval

**Local Mode (On-Device):**
- ✅ Free processing ($0.00 cost)
- ✅ macOS-only validation
- ✅ iOS rejection

**Edge Cases:**
- ✅ Empty image array
- ✅ Huge batches (1000+ images)
- ✅ Corrupted image data
- ✅ Missing EXIF data
- ✅ Invalid providers

### Signup to Export (`signup-to-export.spec.ts`)

**Complete User Journey:**
1. ✅ Device authentication (6-digit code)
2. ✅ WebSocket connection for real-time updates
3. ✅ Batch processing (50 images)
4. ✅ Progress monitoring via WebSocket
5. ✅ Cost deduction from balance
6. ✅ XMP export to Lightroom format

**Multi-Device Sync:**
- ✅ 2 devices receiving same progress updates
- ✅ Device disconnection notifications

**All 3 Processing Modes:**
- ✅ Fast (concurrent)
- ✅ Economy (batch API)
- ✅ Local (on-device, macOS only)

### Error Recovery (`error-recovery.spec.ts`)

**Network Failures:**
- ✅ Retry on timeout with exponential backoff
- ✅ Complete network outage mid-processing
- ✅ Queue operations while offline

**Rate Limiting:**
- ✅ Handle 429 errors with backoff
- ✅ Respect Retry-After header
- ✅ Continue processing other images while retrying failed ones

**Server Errors:**
- ✅ Retry on 500 Internal Server Error
- ✅ Do NOT retry on 400 Bad Request (permanent)
- ✅ Provider API outages

**Exponential Backoff:**
- ✅ Increase wait time: 1s → 2s → 4s → 8s → 16s → 32s → 60s (max)
- ✅ Cap at 60 seconds

**Partial Failures:**
- ✅ Track which images succeeded vs failed
- ✅ Allow retry of only failed images

### Offline Queue (`offline-queue.spec.ts`)

**Queue Operations:**
- ✅ Queue requests when offline
- ✅ Persist queue across page reloads
- ✅ Multiple operation types (process, export, settings)

**Online Sync:**
- ✅ Sync all queued operations when back online
- ✅ FIFO order (First In, First Out)
- ✅ Handle sync failures gracefully

**Conflict Resolution:**
- ✅ Detect conflicts when same image processed on multiple devices
- ✅ Last-write-wins for settings

**Queue Management:**
- ✅ View queued operations
- ✅ Cancel queued operations
- ✅ Clear completed operations
- ✅ Limit queue size (max 100 operations)

**WebSocket Handling:**
- ✅ Reconnect when coming back online
- ✅ Buffer messages while offline

**Data Persistence:**
- ✅ Persist to localStorage
- ✅ Recover from corrupted queue data

## Expected Test Results

### Why Some Tests May Fail

**IMPORTANT:** Many tests are expected to fail initially because:

1. **Backend endpoints not fully implemented yet:**
   - `/api/device-auth/approve` - Approval endpoint
   - `/api/export/xmp` - XMP export
   - `/api/sync/queue` - Offline queue sync
   - `/api/ai/cost-preview` - Cost preview

2. **WebSocket server not running** during tests

3. **No real API keys configured** (using mocks instead)

4. **UI pages may not exist** (dashboard, device-auth approval)

### Tests That Should Pass

✅ **Device auth code request** - Endpoint exists
✅ **Provider listing** - API implemented
✅ **Empty image array validation** - Basic validation
✅ **Rate limiting** - Implemented
✅ **Mock-based tests** - Use fixtures, don't hit real endpoints

## Test Scenarios

### Happy Path (Ideal Flow)

```
1. User installs native app
2. App requests 6-digit auth code
3. User approves on web
4. App polls and receives JWT tokens
5. User selects folder with 500 photos
6. App submits batch (Fast mode, gpt-5-nano)
7. WebSocket sends real-time progress
8. All 500 photos processed in ~30 seconds
9. User sees cost: $2.00 (provider: $1.00, Kull: $1.00)
10. App exports XMP files
11. User imports into Lightroom
12. All ratings and labels applied correctly
```

### Error Paths

**Network Outage:**
```
1. Processing 100 images
2. Network fails on image 50
3. App queues remaining 50 images
4. Network recovers after 5 minutes
5. App retries queued images
6. All 100 images processed successfully
```

**Rate Limit:**
```
1. Processing 1000 images
2. Hit rate limit (429) on image 200
3. Wait 2s (exponential backoff)
4. Retry failed images
5. Hit rate limit again on image 400
6. Wait 4s
7. Continue processing
8. All images eventually processed
```

### Edge Cases

**Huge Folder:**
- ✅ 10,000 images in one batch
- ✅ Fire all 10k requests concurrently (up to 30k/min limit)
- ✅ Handle partial failures gracefully
- ✅ Complete in ~5 minutes

**Corrupted Images:**
- ✅ Mixed valid and invalid images
- ✅ Process valid images
- ✅ Report errors for corrupted images
- ✅ Don't crash or hang

**No EXIF Data:**
- ✅ Process images without metadata
- ✅ AI still rates based on visual content
- ✅ Export XMP without EXIF dependencies

## Debugging Tests

### View Test Traces

```bash
npx playwright show-trace tests/e2e/report/trace/*.zip
```

### Run Single Test in Debug Mode

```bash
npx playwright test tests/e2e/user-flows/device-auth.spec.ts --debug
```

### View Test Screenshots

```bash
ls tests/e2e/report/
```

### Check Test Report

```bash
npx playwright show-report tests/e2e/report
```

## Writing New Tests

### Template for New User Flow

```typescript
import { test, expect } from '@playwright/test';
import {
  createTestUser,
  requestDeviceAuthCode,
  generateTestImages,
} from '../fixtures/test-helpers';

test.describe('My New User Flow', () => {
  const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

  test('should complete new user flow', async ({ page, request }) => {
    const user = createTestUser();

    // Step 1: Auth
    const authCode = await requestDeviceAuthCode(request, user, BASE_URL);

    // Step 2: Approve
    await request.post(`${BASE_URL}/api/device-auth/approve`, {
      data: { code: authCode, userId: user.id },
    });

    // Step 3: Get tokens
    const statusResponse = await request.get(
      `${BASE_URL}/api/device-auth/status/${authCode}`
    );
    const { accessToken } = await statusResponse.json();

    // Step 4: Your test logic
    // ...

    expect(true).toBe(true);
  });
});
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run E2E Tests
  run: |
    npm run test:e2e
  env:
    CI: true
    PLAYWRIGHT_BASE_URL: http://localhost:5000
```

### Expected Behavior

- Tests run in headless Chrome
- Retries: 2 attempts in CI, 0 locally
- Timeouts: 120 seconds per test
- Parallel: 1 worker in CI, 2 locally

## Maintenance

### Updating Mocks

When AI response structure changes, update:

```typescript
// /home/runner/workspace/tests/e2e/fixtures/mock-ai-responses.ts

export interface MockPhotoRating {
  // Update interface
  newField: string;
}

export function generateMockRating(...) {
  return {
    // Update mock data
    newField: 'value',
  };
}
```

### Adding New Providers

```typescript
// In mock-ai-responses.ts

export const mockProviderResponse = {
  newProvider: (imageFilename: string) => ({
    rating: generateMockRating(imageFilename),
    cost: 0.001, // Provider cost
    userCharge: 0.002, // 2x markup
    processingTimeMs: 200,
    provider: 'newProvider',
    model: 'new-model-name',
  }),
};
```

## Test Metrics

**Total Tests:** 93 (including existing E2E tests)
**New User Flow Tests:** 78+
**Test Duration:** ~2-3 minutes (full suite)
**Coverage:** Complete user journeys from auth to export

## Support

For test failures or questions:

1. Check test output: `npx playwright show-report tests/e2e/report`
2. View traces: `npx playwright show-trace tests/e2e/report/trace/*.zip`
3. Run in headed mode: `npx playwright test --headed`
4. Check this README for common issues

## Next Steps

1. **Implement missing backend endpoints** (device auth approval, export, sync)
2. **Start WebSocket server** during tests
3. **Add more edge cases** (corrupted files, rate limits, etc.)
4. **Integrate with CI/CD** (GitHub Actions)
5. **Monitor test coverage** (aim for 90%+)

---

**Last Updated:** 2025-11-18
**Test Framework:** Playwright v1.56.1
**Node Version:** 20.19.3
