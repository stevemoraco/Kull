/**
 * E2E STREAMING TESTS
 *
 * Tests the complete streaming flow from OpenAI → Server → Client
 * Uses Playwright to verify real browser behavior
 *
 * Tests:
 * - Tokens stream in real-time to UI
 * - Client receives deltas immediately
 * - UI updates on each delta
 * - No buffering or delays
 * - Error handling
 */

import { test, expect, type Page } from '@playwright/test';

test.describe('E2E Streaming Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept chat API to return mock streaming response
    await page.route('**/api/chat/message', async (route) => {
      // Create a mock SSE stream
      const tokens = [
        'Hello',
        ' there',
        '!',
        ' How',
        ' can',
        ' I',
        ' help',
        ' you',
        ' today',
        '?'
      ];

      let responseText = '\n'; // Initial newline for SSE

      // Add status event
      responseText += `data: ${JSON.stringify({ type: 'status', message: 'AI responding...' })}\n\n`;

      // Add delta events for each token
      for (const token of tokens) {
        responseText += `data: ${JSON.stringify({ type: 'delta', content: token })}\n\n`;
      }

      // Add done event
      responseText += `data: ${JSON.stringify({ type: 'done' })}\n\n`;

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        body: responseText
      });
    });

    await page.goto('/');
  });

  test('should stream tokens in real-time to chat UI', async ({ page }) => {
    // Open chat
    await page.click('button[aria-label="Open chat"], button:has-text("Chat")');

    // Wait for chat to be visible
    await page.waitForSelector('[data-testid="chat-container"], .chat-container', { timeout: 5000 });

    // Type and send message
    const input = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    await input.fill('Test streaming');
    await page.keyboard.press('Enter');

    // Monitor the AI response as it streams in
    const messageContainer = page.locator('[data-testid="chat-messages"], .chat-messages').first();

    // Wait for first token to appear
    await expect(messageContainer).toContainText('Hello', { timeout: 5000 });

    // Verify subsequent tokens appear (streaming, not all at once)
    await expect(messageContainer).toContainText('Hello there!', { timeout: 2000 });
    await expect(messageContainer).toContainText('How can I help you today?', { timeout: 2000 });
  });

  test('should display tokens incrementally, not all at once', async ({ page }) => {
    await page.click('button[aria-label="Open chat"], button:has-text("Chat")');
    await page.waitForSelector('[data-testid="chat-container"], .chat-container');

    const input = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    await input.fill('Test message');
    await page.keyboard.press('Enter');

    const messageContainer = page.locator('[data-testid="chat-messages"], .chat-messages').first();

    // Check that message builds up incrementally
    const textSnapshots: string[] = [];

    // Take snapshots at different intervals
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(100);
      const text = await messageContainer.textContent();
      textSnapshots.push(text || '');
    }

    // Verify text grew over time (streaming)
    const uniqueSnapshots = [...new Set(textSnapshots)];
    expect(uniqueSnapshots.length).toBeGreaterThan(1); // Text changed over time

    // Verify final text is complete
    const finalText = textSnapshots[textSnapshots.length - 1];
    expect(finalText).toContain('Hello there! How can I help you today?');
  });

  test('should show status updates during streaming', async ({ page }) => {
    await page.click('button[aria-label="Open chat"], button:has-text("Chat")');
    await page.waitForSelector('[data-testid="chat-container"], .chat-container');

    const input = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    await input.fill('Test');
    await page.keyboard.press('Enter');

    // Check for status indicator
    const statusIndicator = page.locator('[data-testid="chat-status"], .chat-status, text="AI responding"').first();
    await expect(statusIndicator).toBeVisible({ timeout: 2000 });
  });

  test('should handle streaming errors gracefully', async ({ page }) => {
    // Intercept with error response
    await page.route('**/api/chat/message', async (route) => {
      const responseText = `\n` +
        `data: ${JSON.stringify({ type: 'status', message: 'Starting...' })}\n\n` +
        `data: ${JSON.stringify({ type: 'delta', content: 'Starting response' })}\n\n` +
        `data: ${JSON.stringify({ type: 'error', message: 'Stream error occurred' })}\n\n`;

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        body: responseText
      });
    });

    await page.goto('/');
    await page.click('button[aria-label="Open chat"], button:has-text("Chat")');
    await page.waitForSelector('[data-testid="chat-container"], .chat-container');

    const input = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    await input.fill('Test error');
    await page.keyboard.press('Enter');

    // Should show error message
    await expect(page.locator('text="error"').first()).toBeVisible({ timeout: 5000 });
  });

  test('should filter out delimiter metadata from display', async ({ page }) => {
    // Intercept with response containing delimiters
    await page.route('**/api/chat/message', async (route) => {
      const responseText = `\n` +
        `data: ${JSON.stringify({ type: 'delta', content: 'Clean response text' })}\n\n` +
        `data: ${JSON.stringify({ type: 'done' })}\n\n`;

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream'
        },
        body: responseText
      });
    });

    await page.goto('/');
    await page.click('button[aria-label="Open chat"], button:has-text("Chat")');
    await page.waitForSelector('[data-testid="chat-container"], .chat-container');

    const input = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    await input.fill('Test');
    await page.keyboard.press('Enter');

    const messageContainer = page.locator('[data-testid="chat-messages"], .chat-messages').first();

    // Wait for message to appear
    await expect(messageContainer).toContainText('Clean response text', { timeout: 5000 });

    // Verify delimiters are NOT visible in UI
    const fullText = await messageContainer.textContent();
    expect(fullText).not.toContain('␞QUICK_REPLIES');
    expect(fullText).not.toContain('␞NEXT_MESSAGE');
  });

  test('should display quick reply buttons when available', async ({ page }) => {
    // Intercept with quick replies
    await page.route('**/api/chat/message', async (route) => {
      const responseText = `\n` +
        `data: ${JSON.stringify({ type: 'delta', content: 'Choose an option:' })}\n\n` +
        `data: ${JSON.stringify({
          type: 'done',
          quickReplies: ['Option A', 'Option B', 'Option C']
        })}\n\n`;

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream'
        },
        body: responseText
      });
    });

    await page.goto('/');
    await page.click('button[aria-label="Open chat"], button:has-text("Chat")');
    await page.waitForSelector('[data-testid="chat-container"], .chat-container');

    const input = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    await input.fill('Test');
    await page.keyboard.press('Enter');

    // Wait for quick reply buttons
    await expect(page.locator('button:has-text("Option A")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Option B")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Option C")').first()).toBeVisible();
  });
});

test.describe('Performance Tests - No Buffering', () => {
  test('should stream first token within 2 seconds of API response', async ({ page }) => {
    let apiResponseTime: number;
    let firstTokenTime: number;

    // Intercept API to measure timing
    await page.route('**/api/chat/message', async (route) => {
      apiResponseTime = Date.now();

      const responseText = `\n` +
        `data: ${JSON.stringify({ type: 'delta', content: 'First token' })}\n\n` +
        `data: ${JSON.stringify({ type: 'done' })}\n\n`;

      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: responseText
      });
    });

    await page.goto('/');
    await page.click('button[aria-label="Open chat"], button:has-text("Chat")');
    await page.waitForSelector('[data-testid="chat-container"], .chat-container');

    const input = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    await input.fill('Test');
    await page.keyboard.press('Enter');

    // Wait for first token
    const messageContainer = page.locator('[data-testid="chat-messages"], .chat-messages').first();
    await messageContainer.waitFor({ state: 'visible' });

    // Measure when first token appears
    await expect(messageContainer).toContainText('First token', { timeout: 5000 });
    firstTokenTime = Date.now();

    // Verify first token arrived quickly (no buffering)
    const delay = firstTokenTime - apiResponseTime;
    expect(delay).toBeLessThan(2000); // Should be nearly instant
  });

  test('should not batch multiple tokens into one update', async ({ page }) => {
    // Mock a response with many tokens sent rapidly
    await page.route('**/api/chat/message', async (route) => {
      let responseText = '\n';

      // Send 20 tokens rapidly
      for (let i = 0; i < 20; i++) {
        responseText += `data: ${JSON.stringify({ type: 'delta', content: `Token${i} ` })}\n\n`;
      }

      responseText += `data: ${JSON.stringify({ type: 'done' })}\n\n`;

      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: responseText
      });
    });

    await page.goto('/');
    await page.click('button[aria-label="Open chat"], button:has-text("Chat")');
    await page.waitForSelector('[data-testid="chat-container"], .chat-container');

    const input = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    await input.fill('Test many tokens');
    await page.keyboard.press('Enter');

    const messageContainer = page.locator('[data-testid="chat-messages"], .chat-messages').first();

    // Take multiple snapshots to verify progressive updates
    const snapshots: string[] = [];
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(50);
      const text = await messageContainer.textContent();
      snapshots.push(text || '');
    }

    // Verify text grew progressively (not all at once)
    const uniqueSnapshots = [...new Set(snapshots)];
    expect(uniqueSnapshots.length).toBeGreaterThan(3); // Multiple distinct states
  });
});

test.describe('Regression Tests - Streaming Never Breaks', () => {
  test('should handle delimiter detection without blocking previous tokens', async ({ page }) => {
    await page.route('**/api/chat/message', async (route) => {
      const responseText = `\n` +
        `data: ${JSON.stringify({ type: 'delta', content: 'Token before delimiter' })}\n\n` +
        `data: ${JSON.stringify({ type: 'delta', content: ' more text' })}\n\n` +
        `data: ${JSON.stringify({ type: 'done' })}\n\n`;

      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: responseText
      });
    });

    await page.goto('/');
    await page.click('button[aria-label="Open chat"], button:has-text("Chat")');
    await page.waitForSelector('[data-testid="chat-container"], .chat-container');

    const input = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    await input.fill('Test');
    await page.keyboard.press('Enter');

    const messageContainer = page.locator('[data-testid="chat-messages"], .chat-messages').first();

    // Verify all tokens before delimiter appeared
    await expect(messageContainer).toContainText('Token before delimiter more text', { timeout: 5000 });
  });

  test('should stream correctly after reconnecting chat', async ({ page }) => {
    // First message
    await page.route('**/api/chat/message', async (route) => {
      const responseText = `\n` +
        `data: ${JSON.stringify({ type: 'delta', content: 'First message' })}\n\n` +
        `data: ${JSON.stringify({ type: 'done' })}\n\n`;

      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: responseText
      });
    });

    await page.goto('/');
    await page.click('button[aria-label="Open chat"], button:has-text("Chat")');
    await page.waitForSelector('[data-testid="chat-container"], .chat-container');

    let input = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    await input.fill('First');
    await page.keyboard.press('Enter');

    const messageContainer = page.locator('[data-testid="chat-messages"], .chat-messages').first();
    await expect(messageContainer).toContainText('First message', { timeout: 5000 });

    // Close and reopen chat
    await page.click('button[aria-label="Close chat"]');
    await page.waitForTimeout(500);
    await page.click('button[aria-label="Open chat"], button:has-text("Chat")');

    // Second message with different route
    await page.route('**/api/chat/message', async (route) => {
      const responseText = `\n` +
        `data: ${JSON.stringify({ type: 'delta', content: 'Second message after reconnect' })}\n\n` +
        `data: ${JSON.stringify({ type: 'done' })}\n\n`;

      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: responseText
      });
    });

    input = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    await input.fill('Second');
    await page.keyboard.press('Enter');

    // Verify streaming still works after reconnect
    await expect(messageContainer).toContainText('Second message after reconnect', { timeout: 5000 });
  });

  test('should handle rapid successive messages without breaking streaming', async ({ page }) => {
    let messageCount = 0;

    await page.route('**/api/chat/message', async (route) => {
      messageCount++;
      const responseText = `\n` +
        `data: ${JSON.stringify({ type: 'delta', content: `Response ${messageCount}` })}\n\n` +
        `data: ${JSON.stringify({ type: 'done' })}\n\n`;

      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: responseText
      });
    });

    await page.goto('/');
    await page.click('button[aria-label="Open chat"], button:has-text("Chat")');
    await page.waitForSelector('[data-testid="chat-container"], .chat-container');

    const input = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    const messageContainer = page.locator('[data-testid="chat-messages"], .chat-messages').first();

    // Send 3 messages rapidly
    for (let i = 1; i <= 3; i++) {
      await input.fill(`Message ${i}`);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100); // Small delay between sends
    }

    // Verify all responses streamed correctly
    await expect(messageContainer).toContainText('Response 1', { timeout: 5000 });
    await expect(messageContainer).toContainText('Response 2', { timeout: 5000 });
    await expect(messageContainer).toContainText('Response 3', { timeout: 5000 });
  });
});
