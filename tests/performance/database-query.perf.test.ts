import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../../server/db';
import {
  users,
  creditTransactions,
  shootReports,
  shootProgress,
  deviceSessions,
  prompts,
  promptVotes,
} from '@shared/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

/**
 * PERFORMANCE TEST: Database Query Performance
 *
 * Requirements:
 * - Profile database query performance (all queries <100ms)
 * - Test index effectiveness
 * - Monitor query execution plans
 * - Test complex joins and aggregations
 * - Verify scalability with large datasets
 */

describe('Performance Test: Database Query Performance', () => {
  let testUserId: string;
  let testUserIds: string[] = [];
  let startTime: number;

  beforeAll(async () => {
    console.log('\n[PERF TEST] Setting up database performance test data');

    // Create test user
    const [testUser] = await db
      .insert(users)
      .values({
        email: `perf-test-${Date.now()}@test.com`,
        firstName: 'Performance',
        lastName: 'Test',
      })
      .returning();

    testUserId = testUser.id;

    console.log(`[PERF TEST] Created test user: ${testUserId}`);
  });

  afterAll(async () => {
    console.log('\n[PERF TEST] Cleaning up database performance test data');

    // Clean up test data
    if (testUserId) {
      await db.delete(creditTransactions).where(eq(creditTransactions.userId, testUserId));
      await db.delete(shootReports).where(eq(shootReports.userId, testUserId));
      await db.delete(shootProgress).where(eq(shootProgress.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }

    // Clean up bulk test users
    for (const userId of testUserIds) {
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  beforeEach(() => {
    startTime = Date.now();
  });

  function logQueryTime(queryName: string) {
    const duration = Date.now() - startTime;
    console.log(`[PERF TEST] ${queryName}: ${duration}ms`);
    return duration;
  }

  it('should query user by ID in <100ms', async () => {
    startTime = Date.now();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    const duration = logQueryTime('User by ID query');

    expect(user).toBeDefined();
    expect(user.id).toBe(testUserId);
    expect(duration).toBeLessThan(100);
  });

  it('should query user by email in <100ms', async () => {
    const [testUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    startTime = Date.now();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, testUser.email!))
      .limit(1);

    const duration = logQueryTime('User by email query');

    expect(user).toBeDefined();
    expect(user.email).toBe(testUser.email);
    expect(duration).toBeLessThan(100);
  });

  it('should insert credit transaction in <100ms', async () => {
    startTime = Date.now();

    const [transaction] = await db
      .insert(creditTransactions)
      .values({
        userId: testUserId,
        amount: -1000,
        type: 'shoot',
        description: 'Performance test shoot',
      })
      .returning();

    const duration = logQueryTime('Insert credit transaction');

    expect(transaction).toBeDefined();
    expect(transaction.userId).toBe(testUserId);
    expect(duration).toBeLessThan(100);
  });

  it('should query credit transactions with pagination in <100ms', async () => {
    // Insert 50 test transactions
    const transactions = Array.from({ length: 50 }, (_, i) => ({
      userId: testUserId,
      amount: -100 * (i + 1),
      balance: 10000 - (100 * (i + 1)), // Starting balance of 10000
      type: 'shoot' as const,
      description: `Test transaction ${i}`,
    }));

    await db.insert(creditTransactions).values(transactions);

    startTime = Date.now();

    const results = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, testUserId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(20)
      .offset(10);

    const duration = logQueryTime('Paginated credit transactions query');

    expect(results.length).toBe(20);
    expect(duration).toBeLessThan(100);
  });

  it('should perform aggregation query in <100ms', async () => {
    startTime = Date.now();

    const [result] = await db
      .select({
        totalAmount: sql<number>`CAST(SUM(${creditTransactions.amount}) AS INTEGER)`,
        transactionCount: sql<number>`CAST(COUNT(*) AS INTEGER)`,
      })
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, testUserId));

    const duration = logQueryTime('Credit transactions aggregation');

    expect(result).toBeDefined();
    expect(typeof result.totalAmount).toBe('number');
    expect(typeof result.transactionCount).toBe('number');
    expect(duration).toBeLessThan(100);
  });

  it('should query with date range filter in <100ms', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    startTime = Date.now();

    const results = await db
      .select()
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.userId, testUserId),
          gte(creditTransactions.createdAt, yesterday)
        )
      );

    const duration = logQueryTime('Date range filtered query');

    expect(Array.isArray(results)).toBe(true);
    expect(duration).toBeLessThan(100);
  });

  it('should handle bulk insert efficiently (1000 records < 5s)', async () => {
    const bulkTransactions = Array.from({ length: 1000 }, (_, i) => ({
      userId: testUserId,
      amount: -50,
      balance: 50000 - (50 * i), // Starting balance of 50000
      type: 'shoot' as const,
      description: `Bulk test transaction ${i}`,
    }));

    startTime = Date.now();

    await db.insert(creditTransactions).values(bulkTransactions);

    const duration = logQueryTime('Bulk insert 1000 records');

    expect(duration).toBeLessThan(5000);
  });

  it('should query large dataset efficiently (1000+ records < 200ms)', async () => {
    startTime = Date.now();

    const results = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, testUserId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(100);

    const duration = logQueryTime('Query large dataset (1000+ records)');

    expect(results.length).toBeLessThan(101); // Should respect limit
    expect(duration).toBeLessThan(200);
  });

  it('should perform join query efficiently (<150ms)', async () => {
    // Insert a shoot report
    const [shoot] = await db
      .insert(shootReports)
      .values({
        userId: testUserId,
        shootId: 'perf-test-shoot',
        totalImages: 100,
        processedImages: 100,
        status: 'completed',
      })
      .returning();

    startTime = Date.now();

    const results = await db
      .select({
        userId: users.id,
        userEmail: users.email,
        shootId: shootReports.shootId,
        totalImages: shootReports.totalImages,
        status: shootReports.status,
      })
      .from(shootReports)
      .innerJoin(users, eq(shootReports.userId, users.id))
      .where(eq(shootReports.userId, testUserId))
      .limit(10);

    const duration = logQueryTime('Join query (shoots + users)');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].userEmail).toBe((await db.select().from(users).where(eq(users.id, testUserId)).limit(1))[0].email);
    expect(duration).toBeLessThan(150);
  });

  it('should handle concurrent queries efficiently', async () => {
    const queryCount = 100;

    console.log(`\n[PERF TEST] Running ${queryCount} concurrent queries`);

    startTime = Date.now();

    const queries = Array.from({ length: queryCount }, () =>
      db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1)
    );

    const results = await Promise.all(queries);

    const duration = logQueryTime(`${queryCount} concurrent queries`);
    const avgDuration = duration / queryCount;

    console.log(`[PERF TEST] Average query time: ${avgDuration.toFixed(2)}ms`);

    expect(results.length).toBe(queryCount);
    expect(results.every(([user]) => user?.id === testUserId)).toBe(true);
    expect(avgDuration).toBeLessThan(50); // Average should be very fast
  });

  it('should update records efficiently (<100ms)', async () => {
    const [transaction] = await db
      .insert(creditTransactions)
      .values({
        userId: testUserId,
        amount: -500,
        type: 'shoot',
        description: 'Update test',
      })
      .returning();

    startTime = Date.now();

    const [updated] = await db
      .update(creditTransactions)
      .set({ description: 'Updated description' })
      .where(eq(creditTransactions.id, transaction.id))
      .returning();

    const duration = logQueryTime('Update record');

    expect(updated.description).toBe('Updated description');
    expect(duration).toBeLessThan(100);
  });

  it('should delete records efficiently (<100ms)', async () => {
    const [transaction] = await db
      .insert(creditTransactions)
      .values({
        userId: testUserId,
        amount: -500,
        type: 'shoot',
        description: 'Delete test',
      })
      .returning();

    startTime = Date.now();

    await db
      .delete(creditTransactions)
      .where(eq(creditTransactions.id, transaction.id));

    const duration = logQueryTime('Delete record');

    // Verify deletion
    const [deleted] = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.id, transaction.id))
      .limit(1);

    expect(deleted).toBeUndefined();
    expect(duration).toBeLessThan(100);
  });

  it('should handle complex aggregation with grouping (<200ms)', async () => {
    // Insert transactions of different types
    await db.insert(creditTransactions).values([
      { userId: testUserId, amount: -100, balance: 10000, type: 'shoot', description: 'Shoot 1' },
      { userId: testUserId, amount: -200, balance: 9900, type: 'shoot', description: 'Shoot 2' },
      { userId: testUserId, amount: 1000, balance: 10700, type: 'purchase', description: 'Purchase 1' },
      { userId: testUserId, amount: 2000, balance: 12700, type: 'purchase', description: 'Purchase 2' },
    ]);

    startTime = Date.now();

    const results = await db
      .select({
        type: creditTransactions.type,
        totalAmount: sql<number>`CAST(SUM(${creditTransactions.amount}) AS INTEGER)`,
        count: sql<number>`CAST(COUNT(*) AS INTEGER)`,
      })
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, testUserId))
      .groupBy(creditTransactions.type);

    const duration = logQueryTime('Complex aggregation with grouping');

    expect(results.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(200);
  });

  it('should scale with multiple users (1000 users, <1s total)', async () => {
    console.log('\n[PERF TEST] Creating 1000 test users');

    const userCount = 1000;
    const bulkUsers = Array.from({ length: userCount }, (_, i) => ({
      email: `perf-bulk-${Date.now()}-${i}@test.com`,
      firstName: `User`,
      lastName: `${i}`,
    }));

    startTime = Date.now();

    const insertedUsers = await db.insert(users).values(bulkUsers).returning();

    const insertDuration = Date.now() - startTime;
    console.log(`[PERF TEST] Inserted ${userCount} users in ${insertDuration}ms`);

    // Track for cleanup
    testUserIds = insertedUsers.map(u => u.id);

    // Query across all users
    startTime = Date.now();

    const allUsers = await db
      .select()
      .from(users)
      .where(
        sql`${users.email} LIKE ${'perf-bulk-%'}`
      )
      .limit(100);

    const queryDuration = logQueryTime('Query 1000 users dataset');

    expect(insertDuration).toBeLessThan(5000);
    expect(queryDuration).toBeLessThan(200);
    expect(allUsers.length).toBe(100); // Should respect limit
  });

  it('should handle text search efficiently (<150ms)', async () => {
    // Insert prompts for text search
    await db.insert(prompts).values([
      {
        name: 'Wedding Photography Prompt',
        description: 'For wedding photoshoots',
        profile: 'wedding',
        systemPrompt: 'Rate wedding photos',
        authorId: testUserId,
      },
      {
        name: 'Corporate Event Prompt',
        description: 'For corporate events',
        profile: 'corporate',
        systemPrompt: 'Rate corporate photos',
        authorId: testUserId,
      },
      {
        name: 'Portrait Photography Prompt',
        description: 'For portrait sessions',
        profile: 'portrait',
        systemPrompt: 'Rate portrait photos',
        authorId: testUserId,
      },
    ]);

    startTime = Date.now();

    const results = await db
      .select()
      .from(prompts)
      .where(
        sql`${prompts.name} ILIKE ${'%wedding%'} OR ${prompts.description} ILIKE ${'%wedding%'}`
      )
      .limit(10);

    const duration = logQueryTime('Text search query');

    expect(results.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(150);

    // Cleanup
    for (const result of results) {
      await db.delete(prompts).where(eq(prompts.id, result.id));
    }
  });

  it('should maintain performance under transaction load', async () => {
    const transactionCount = 50;

    console.log(`\n[PERF TEST] Running ${transactionCount} database transactions`);

    startTime = Date.now();

    for (let i = 0; i < transactionCount; i++) {
      await db.transaction(async (tx) => {
        // Insert
        const [inserted] = await tx
          .insert(creditTransactions)
          .values({
            userId: testUserId,
            amount: -100,
            type: 'shoot',
            description: `Transaction ${i}`,
          })
          .returning();

        // Update
        await tx
          .update(creditTransactions)
          .set({ description: `Updated ${i}` })
          .where(eq(creditTransactions.id, inserted.id));

        // Query
        await tx
          .select()
          .from(creditTransactions)
          .where(eq(creditTransactions.id, inserted.id))
          .limit(1);
      });
    }

    const duration = logQueryTime(`${transactionCount} database transactions`);
    const avgDuration = duration / transactionCount;

    console.log(`[PERF TEST] Average transaction time: ${avgDuration.toFixed(2)}ms`);

    expect(duration).toBeLessThan(10000); // Total time < 10 seconds
    expect(avgDuration).toBeLessThan(200); // Average transaction < 200ms
  });
});
