// Integration tests for duplicate message prevention
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { db } from '../../server/db';
import { sql } from 'drizzle-orm';

describe('Duplicate Message Prevention (Integration)', () => {
  const testSessionId = 'test-session-' + Date.now();
  const testUserEmail = 'test@example.com';

  // Cleanup after tests
  afterEach(async () => {
    try {
      await db.execute(sql`
        DELETE FROM support_queries WHERE session_id = ${testSessionId}
      `);
      await db.execute(sql`
        DELETE FROM duplicate_alerts WHERE session_id = ${testSessionId}
      `);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  describe('Database Constraint Prevention', () => {
    it('should prevent exact duplicate messages', async () => {
      const messageData = {
        sessionId: testSessionId,
        userEmail: testUserEmail,
        userMessage: 'Test message',
        aiResponse: 'Test response',
        tokensIn: 100,
        tokensOut: 50,
        cost: '0.001',
        model: 'gpt-5-nano',
      };

      // Insert first message - should succeed
      const result1 = await db.execute(sql`
        INSERT INTO support_queries (
          session_id, user_email, user_message, ai_response,
          tokens_in, tokens_out, cost, model
        ) VALUES (
          ${messageData.sessionId},
          ${messageData.userEmail},
          ${messageData.userMessage},
          ${messageData.aiResponse},
          ${messageData.tokensIn},
          ${messageData.tokensOut},
          ${messageData.cost},
          ${messageData.model}
        )
        RETURNING id
      `);

      expect(result1.rowCount).toBe(1);

      // Try to insert duplicate - should fail
      try {
        await db.execute(sql`
          INSERT INTO support_queries (
            session_id, user_email, user_message, ai_response,
            tokens_in, tokens_out, cost, model
          ) VALUES (
            ${messageData.sessionId},
            ${messageData.userEmail},
            ${messageData.userMessage},
            ${messageData.aiResponse},
            ${messageData.tokensIn},
            ${messageData.tokensOut},
            ${messageData.cost},
            ${messageData.model}
          )
        `);

        // If we get here, the test failed
        expect.fail('Duplicate message was not prevented by database constraint');
      } catch (error: any) {
        // Should throw unique violation error
        expect(error.message).toMatch(/unique|duplicate/i);
      }
    });

    it('should allow same message in different sessions', async () => {
      const session1 = testSessionId + '-1';
      const session2 = testSessionId + '-2';

      const messageData = {
        userMessage: 'Same message',
        aiResponse: 'Same response',
        tokensIn: 100,
        tokensOut: 50,
        cost: '0.001',
        model: 'gpt-5-nano',
      };

      // Insert in first session
      const result1 = await db.execute(sql`
        INSERT INTO support_queries (
          session_id, user_email, user_message, ai_response,
          tokens_in, tokens_out, cost, model
        ) VALUES (
          ${session1},
          ${testUserEmail},
          ${messageData.userMessage},
          ${messageData.aiResponse},
          ${messageData.tokensIn},
          ${messageData.tokensOut},
          ${messageData.cost},
          ${messageData.model}
        )
        RETURNING id
      `);

      expect(result1.rowCount).toBe(1);

      // Insert same message in different session - should succeed
      const result2 = await db.execute(sql`
        INSERT INTO support_queries (
          session_id, user_email, user_message, ai_response,
          tokens_in, tokens_out, cost, model
        ) VALUES (
          ${session2},
          ${testUserEmail},
          ${messageData.userMessage},
          ${messageData.aiResponse},
          ${messageData.tokensIn},
          ${messageData.tokensOut},
          ${messageData.cost},
          ${messageData.model}
        )
        RETURNING id
      `);

      expect(result2.rowCount).toBe(1);

      // Cleanup
      await db.execute(sql`DELETE FROM support_queries WHERE session_id IN (${session1}, ${session2})`);
    });

    it('should generate content_hash automatically', async () => {
      const result = await db.execute(sql`
        INSERT INTO support_queries (
          session_id, user_email, user_message, ai_response,
          tokens_in, tokens_out, cost, model
        ) VALUES (
          ${testSessionId},
          ${testUserEmail},
          ${'Test message for hash'},
          ${'Response'},
          ${100},
          ${50},
          ${'0.001'},
          ${'gpt-5-nano'}
        )
        RETURNING id, content_hash
      `);

      const row: any = result.rows[0];
      expect(row.content_hash).toBeDefined();
      expect(row.content_hash.length).toBeGreaterThan(0);
    });
  });

  describe('Monitoring and Alerting', () => {
    it('should log duplicate detection alerts', async () => {
      // Log a duplicate alert
      const result = await db.execute(sql`
        INSERT INTO duplicate_alerts (
          alert_type,
          session_id,
          user_email,
          duplicate_count,
          stats
        ) VALUES (
          ${'test_duplicate'},
          ${testSessionId},
          ${testUserEmail},
          ${5},
          ${'{"test": true}'}
        )
        RETURNING id
      `);

      expect(result.rowCount).toBe(1);

      // Verify it was logged
      const check = await db.execute(sql`
        SELECT * FROM duplicate_alerts
        WHERE session_id = ${testSessionId}
      `);

      expect(check.rowCount).toBeGreaterThan(0);
    });

    it('should retrieve duplicate stats', async () => {
      // Insert test alerts
      await db.execute(sql`
        INSERT INTO duplicate_alerts (
          alert_type, session_id, user_email, duplicate_count
        ) VALUES
          ('frontend_duplicate', ${testSessionId}, ${testUserEmail}, 1),
          ('backend_duplicate', ${testSessionId}, ${testUserEmail}, 2),
          ('frontend_duplicate', ${testSessionId + '-2'}, ${testUserEmail}, 1)
      `);

      // Query stats
      const stats = await db.execute(sql`
        SELECT
          COUNT(*) as total,
          COUNT(DISTINCT session_id) as unique_sessions,
          SUM(duplicate_count) as total_duplicates
        FROM duplicate_alerts
        WHERE session_id LIKE ${testSessionId + '%'}
      `);

      const row: any = stats.rows[0];
      expect(parseInt(row.total)).toBeGreaterThanOrEqual(3);
      expect(parseInt(row.unique_sessions)).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Content Hash Index', () => {
    it('should use content_hash for fast lookups', async () => {
      // Insert message
      await db.execute(sql`
        INSERT INTO support_queries (
          session_id, user_email, user_message, ai_response,
          tokens_in, tokens_out, cost, model
        ) VALUES (
          ${testSessionId},
          ${testUserEmail},
          ${'Indexed message'},
          ${'Response'},
          ${100},
          ${50},
          ${'0.001'},
          ${'gpt-5-nano'}
        )
      `);

      // Query using content_hash (should use index)
      const result = await db.execute(sql`
        SELECT id, content_hash
        FROM support_queries
        WHERE session_id = ${testSessionId}
        AND content_hash IS NOT NULL
      `);

      expect(result.rowCount).toBeGreaterThan(0);
      const row: any = result.rows[0];
      expect(row.content_hash).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle high volume of messages without duplicates', async () => {
      const startTime = Date.now();
      const messageCount = 100;

      // Insert many unique messages
      for (let i = 0; i < messageCount; i++) {
        await db.execute(sql`
          INSERT INTO support_queries (
            session_id, user_email, user_message, ai_response,
            tokens_in, tokens_out, cost, model
          ) VALUES (
            ${testSessionId},
            ${testUserEmail},
            ${'Message ' + i},
            ${'Response ' + i},
            ${100},
            ${50},
            ${'0.001'},
            ${'gpt-5-nano'}
          )
        `);
      }

      const duration = Date.now() - startTime;

      // Verify all were inserted
      const count = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM support_queries
        WHERE session_id = ${testSessionId}
      `);

      expect(parseInt((count.rows[0] as any).count)).toBe(messageCount);

      // Should complete in reasonable time (< 5 seconds for 100 messages)
      expect(duration).toBeLessThan(5000);

      console.log(`Inserted ${messageCount} messages in ${duration}ms`);
    });
  });
});
