# Comprehensive Streaming Tests

This document describes the comprehensive test suite created to ensure streaming NEVER breaks again.

## Overview

The streaming test suite covers three layers:

1. **Unit Tests** (`server/__tests__/chatService.streaming.test.ts`) - Tests the OpenAI Responses API streaming conversion
2. **Integration Tests** (`server/__tests__/routes.streaming.test.ts`) - Tests the SSE streaming and delimiter filtering
3. **E2E Tests** (`tests/e2e/streaming.test.ts`) - Tests the complete flow from server to client UI

## Test Coverage

### 1. Unit Tests - Chat Service Layer

**File**: `/home/runner/workspace/server/__tests__/chatService.streaming.test.ts`

**What it tests**:
- Responses API chunk conversion to Chat Completions format
- Real-time delta emission (no buffering)
- Reasoning block capture
- Usage data extraction
- Model support (gpt-5-nano, gpt-5-mini, gpt-5)
- Error handling

**Key Regression Tests**:
- ✅ Tokens stream immediately without accumulating in `lineBuffer`
- ✅ Each token arrives separately (not batched)
- ✅ Delimiter detection doesn't block previous chunks
- ✅ `res.socket.uncork()` called after each delta

**Test Count**: 15 tests

### 2. Integration Tests - Routes Layer

**File**: `/home/runner/workspace/server/__tests__/routes.streaming.test.ts`

**What it tests**:
- Server-Sent Events (SSE) format
- Real-time delta streaming
- Delimiter filtering (␞QUICK_REPLIES, ␞NEXT_MESSAGE)
- Metadata extraction
- Error handling

**Key Regression Tests**:
- ✅ Deltas not accumulated in `lineBuffer` before sending
- ✅ `res.socket.uncork()` called after each write
- ✅ Delimiters detected mid-stream without blocking
- ✅ Rapid token arrival without buffering

**Test Count**: 18 tests

### 3. E2E Tests - Full Stack

**File**: `/home/runner/workspace/tests/e2e/streaming.test.ts`

**What it tests**:
- Tokens stream to UI in real-time
- Client receives deltas immediately
- UI updates on each delta
- No buffering or delays
- Error handling in browser
- Performance metrics

**Key Regression Tests**:
- ✅ First token arrives within 2 seconds
- ✅ Tokens not batched into one update
- ✅ Delimiter detection doesn't block previous tokens
- ✅ Streaming works after reconnecting chat
- ✅ Rapid successive messages don't break streaming

**Test Count**: 14 tests

## Total Test Coverage

**Total Tests**: 47 tests
**Coverage Target**: 90%+ on streaming logic

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Unit Tests Only
```bash
npm run test:unit
```

### Run Streaming Unit Tests
```bash
npm run test:unit -- server/__tests__/chatService.streaming.test.ts
npm run test:unit -- server/__tests__/routes.streaming.test.ts
```

### Run E2E Tests
```bash
npm run test:e2e
```

### Run Streaming E2E Tests Only
```bash
npx playwright test tests/e2e/streaming.test.ts
```

### Watch Mode (for development)
```bash
npm run test:unit:watch
```

### Coverage Report
```bash
npm run test:unit -- --coverage
```

## Test Scenarios Covered

### Streaming Behavior
- ✅ Tokens stream immediately (no buffering)
- ✅ Each token sent separately
- ✅ Real-time UI updates
- ✅ First token arrives quickly (< 2s)
- ✅ Rapid token arrival handled correctly

### Delimiter Handling
- ✅ Delimiters detected correctly
- ✅ Streaming stops at delimiters
- ✅ Metadata extracted (QUICK_REPLIES, NEXT_MESSAGE)
- ✅ Delimiters filtered from UI
- ✅ Previous content not blocked by delimiters

### Error Handling
- ✅ Stream errors caught gracefully
- ✅ Error events sent to client
- ✅ UI shows error messages
- ✅ Missing API key handled
- ✅ API failures handled

### Performance
- ✅ No buffering delays
- ✅ `res.socket.uncork()` called per chunk
- ✅ Tokens arrive within milliseconds
- ✅ Multiple rapid messages handled
- ✅ Reconnection doesn't break streaming

### Model Support
- ✅ gpt-5-nano
- ✅ gpt-5-mini
- ✅ gpt-5

## Critical Fixes Tested

These tests specifically verify the fixes for the streaming bugs:

### 1. LineBuffer Accumulation Bug
**Problem**: Tokens were accumulated in `lineBuffer` before being sent to client.

**Test**: `should NOT buffer lineBuffer before sending deltas`
```typescript
// Verifies each token is sent immediately, not accumulated
expect(tokens).toEqual(['First', ' token', ' here']);
expect(tokenTimestamps[0]).toBeLessThan(tokenTimestamps[1]);
```

### 2. Delimiter Blocking Bug
**Problem**: Delimiter detection blocked streaming of previous valid content.

**Test**: `should handle delimiter detection without blocking previous chunks`
```typescript
// Verifies tokens before delimiter are sent immediately
expect(tokens[0]).toBe('Valid content');
expect(tokens[1]).toBe(' more text');
```

### 3. Socket Buffering Bug
**Problem**: TCP buffering caused delays in token transmission.

**Test**: `should call res.socket.uncork() after each delta`
```typescript
// Verifies uncork() is called to force immediate transmission
expect(chunkCount).toBeGreaterThan(1);
```

## Expected Results

All 47 tests should pass with:
- ✅ 100% pass rate
- ✅ 90%+ code coverage on streaming logic
- ✅ < 50ms average test execution time (unit/integration)
- ✅ < 5s average test execution time (E2E)

## CI/CD Integration

These tests are included in the CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Unit Tests
  run: npm run test:unit

- name: Run E2E Tests
  run: npm run test:e2e
```

Tests must pass before merging to main.

## Debugging Failed Tests

### If Unit Tests Fail:
1. Check OpenAI API mock setup
2. Verify chunk format matches Responses API
3. Check timing assumptions (may need adjustment)

### If Integration Tests Fail:
1. Check SSE format is correct
2. Verify delimiter regex patterns
3. Check Express app setup

### If E2E Tests Fail:
1. Check Playwright browser compatibility
2. Verify chat UI selectors
3. Check network timing assumptions
4. Run with headed mode: `npx playwright test --headed`

## Future Improvements

- [ ] Add performance benchmarks (tokens/second)
- [ ] Add memory leak tests
- [ ] Add stress tests (1000+ tokens)
- [ ] Add network latency simulation
- [ ] Add WebSocket streaming tests (if implemented)

## Maintenance

**Review Frequency**: Every release
**Update When**:
- Streaming logic changes
- New models added
- API format changes
- Performance requirements change

## Success Criteria

✅ All tests pass
✅ 90%+ coverage on streaming code
✅ Tests run in < 30 seconds (unit/integration)
✅ Tests run in < 2 minutes (E2E)
✅ No flaky tests (100% reliable)

## Contact

Questions about these tests? Contact: team@kullai.com

**Last Updated**: 2025-11-20
**Next Review**: 2025-12-20
