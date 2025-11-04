import {
  users,
  referrals,
  emailQueue,
  refundSurveys,
  pageVisits,
  supportQueries,
  chatSessions,
  type User,
  type UpsertUser,
  type Referral,
  type InsertReferral,
  type EmailQueue,
  type InsertEmailQueue,
  type RefundSurvey,
  type InsertRefundSurvey,
  type PageVisit,
  type InsertPageVisit,
  type SupportQuery,
  type InsertSupportQuery,
  type ChatSession,
  type InsertChatSession,
} from "@shared/schema";
import { db } from "./db";
import { eq, lte, and, isNull, gte, sql, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Trial and subscription operations
  startTrial(userId: string, tier: string, paymentMethodId: string, setupIntentId: string): Promise<User>;
  updateSubscription(userId: string, tier: string, status: string, stripeCustomerId?: string, stripeSubscriptionId?: string): Promise<User>;
  convertTrialToSubscription(userId: string, subscriptionId: string): Promise<User>;
  markAppInstalled(userId: string): Promise<User>;
  
  // Referral operations
  createReferral(referral: InsertReferral & { referrerId: string }): Promise<Referral>;
  getUserReferrals(userId: string): Promise<Referral[]>;
  updateReferralStatus(id: string, status: string, referredUserId?: string): Promise<void>;
  
  // Email queue operations
  scheduleEmail(email: InsertEmailQueue): Promise<EmailQueue>;
  getPendingEmails(): Promise<EmailQueue[]>;
  markEmailSent(id: string): Promise<void>;
  markEmailFailed(id: string, errorMessage: string): Promise<void>;
  cancelUserEmails(userId: string, emailType?: string): Promise<void>;
  cancelDripEmails(userId: string): Promise<void>;
  cancelEmail(id: string): Promise<void>;
  incrementEmailRetry(id: string): Promise<void>;
  
  // Refund survey operations
  createRefundSurvey(survey: InsertRefundSurvey): Promise<RefundSurvey>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  getAllReferrals(): Promise<Referral[]>;

  // Visit tracking operations
  trackVisit(visit: InsertPageVisit): Promise<PageVisit>;
  getVisitCount(startDate?: Date, endDate?: Date): Promise<number>;
  getBounceRate(startDate?: Date, endDate?: Date): Promise<number>;

  // Support query tracking operations
  trackSupportQuery(query: InsertSupportQuery): Promise<SupportQuery>;
  getSupportQueryStats(startDate?: Date, endDate?: Date): Promise<{
    totalQueries: number;
    totalCost: number;
    queriesByEmail: Array<{ 
      email: string; 
      count: number; 
      totalCost: number;
      conversationCount: number;
      totalMessages: number;
      device?: string;
      browser?: string;
      city?: string;
      state?: string;
      country?: string;
    }>;
  }>;
  getSupportQueriesOverTime(days: number): Promise<Array<{ date: string; count: number; avgCost: number }>>;
  getSupportQueriesByEmail(email: string): Promise<SupportQuery[]>;

  // Chat session operations
  saveChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatSessions(userId?: string): Promise<ChatSession[]>;
  deleteChatSession(sessionId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // On first login, set special offer timer but don't start trial yet
    // Trial only starts after payment method is verified via SetupIntent
    const now = new Date();
    const specialOfferExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        subscriptionStatus: 'none',
        specialOfferExpiresAt,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async startTrial(userId: string, tier: string, paymentMethodId: string, setupIntentId: string): Promise<User> {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const specialOfferExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [user] = await db
      .update(users)
      .set({
        subscriptionStatus: 'trial',
        subscriptionTier: tier,
        stripePaymentMethodId: paymentMethodId,
        stripeSetupIntentId: setupIntentId,
        trialStartedAt: now,
        trialEndsAt,
        specialOfferExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return user;
  }

  async convertTrialToSubscription(userId: string, subscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        subscriptionStatus: 'active',
        stripeSubscriptionId: subscriptionId,
        trialConvertedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return user;
  }

  async markAppInstalled(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        appInstalledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return user;
  }

  async updateSubscription(
    userId: string,
    tier: string,
    status: string,
    stripeCustomerId?: string,
    stripeSubscriptionId?: string
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        subscriptionTier: tier,
        subscriptionStatus: status,
        stripeCustomerId,
        stripeSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return user;
  }

  async createReferral(referral: InsertReferral & { referrerId: string }): Promise<Referral> {
    const [newReferral] = await db
      .insert(referrals)
      .values(referral)
      .returning();
    
    return newReferral;
  }

  async getUserReferrals(userId: string): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, userId));
  }

  async updateReferralStatus(id: string, status: string, referredUserId?: string): Promise<void> {
    await db
      .update(referrals)
      .set({
        status,
        referredUserId,
      })
      .where(eq(referrals.id, id));
  }

  // Email queue operations
  async scheduleEmail(emailData: InsertEmailQueue): Promise<EmailQueue> {
    const [email] = await db
      .insert(emailQueue)
      .values(emailData)
      .returning();
    
    return email;
  }

  async getPendingEmails(): Promise<EmailQueue[]> {
    const now = new Date();
    return await db
      .select()
      .from(emailQueue)
      .where(
        and(
          lte(emailQueue.scheduledFor, now),
          isNull(emailQueue.sentAt),
          isNull(emailQueue.failedAt),
          eq(emailQueue.cancelled, false)
        )
      );
  }

  async markEmailSent(id: string): Promise<void> {
    await db
      .update(emailQueue)
      .set({
        sentAt: new Date(),
      })
      .where(eq(emailQueue.id, id));
  }

  async markEmailFailed(id: string, errorMessage: string): Promise<void> {
    await db
      .update(emailQueue)
      .set({
        failedAt: new Date(),
        errorMessage,
      })
      .where(eq(emailQueue.id, id));
  }

  async cancelUserEmails(userId: string, emailType?: string): Promise<void> {
    const conditions = [
      eq(emailQueue.userId, userId),
      isNull(emailQueue.sentAt),
    ];
    
    if (emailType) {
      conditions.push(eq(emailQueue.emailType, emailType));
    }

    await db
      .update(emailQueue)
      .set({
        cancelled: true,
      })
      .where(and(...conditions));
  }

  async cancelDripEmails(userId: string): Promise<void> {
    await db
      .update(emailQueue)
      .set({
        cancelled: true,
      })
      .where(
        and(
          eq(emailQueue.userId, userId),
          isNull(emailQueue.sentAt),
          // Cancel all drip emails (drip_1_2hr, drip_2_6hr, etc.)
          eq(emailQueue.emailType, 'drip_1_2hr')
        )
      );
    
    // Cancel each drip type individually
    const dripTypes = ['drip_1_2hr', 'drip_2_6hr', 'drip_3_11hr', 'drip_4_16hr', 'drip_5_21hr'];
    for (const dripType of dripTypes) {
      await db
        .update(emailQueue)
        .set({
          cancelled: true,
        })
        .where(
          and(
            eq(emailQueue.userId, userId),
            isNull(emailQueue.sentAt),
            eq(emailQueue.emailType, dripType)
          )
        );
    }
  }

  async cancelEmail(id: string): Promise<void> {
    await db
      .update(emailQueue)
      .set({
        cancelled: true,
      })
      .where(eq(emailQueue.id, id));
  }

  async incrementEmailRetry(id: string): Promise<void> {
    const [email] = await db.select().from(emailQueue).where(eq(emailQueue.id, id));
    if (email) {
      const currentRetryCount = parseInt(email.retryCount || '0');
      await db
        .update(emailQueue)
        .set({
          retryCount: (currentRetryCount + 1).toString(),
        })
        .where(eq(emailQueue.id, id));
    }
  }

  async createRefundSurvey(survey: InsertRefundSurvey): Promise<RefundSurvey> {
    const [created] = await db
      .insert(refundSurveys)
      .values(survey)
      .returning();
    return created;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getAllReferrals(): Promise<Referral[]> {
    return db.select().from(referrals);
  }

  async trackVisit(visit: InsertPageVisit): Promise<PageVisit> {
    const [newVisit] = await db
      .insert(pageVisits)
      .values(visit)
      .returning();
    return newVisit;
  }

  async getVisitCount(startDate?: Date, endDate?: Date): Promise<number> {
    const conditions = [];
    if (startDate) {
      conditions.push(gte(pageVisits.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(pageVisits.createdAt, endDate));
    }

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pageVisits)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return result[0]?.count || 0;
  }

  async getBounceRate(startDate?: Date, endDate?: Date): Promise<number> {
    const conditions = [];
    if (startDate) {
      conditions.push(gte(pageVisits.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(pageVisits.createdAt, endDate));
    }

    // Get total unique sessions
    const totalSessionsResult = await db
      .select({ count: sql<number>`count(DISTINCT ${pageVisits.sessionId})::int` })
      .from(pageVisits)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const totalSessions = totalSessionsResult[0]?.count || 0;
    
    if (totalSessions === 0) return 0;

    // Get sessions with only 1 page view (bounces)
    const bouncedSessionsResult = await db
      .select({ 
        sessionId: pageVisits.sessionId,
        count: sql<number>`count(*)::int` 
      })
      .from(pageVisits)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(pageVisits.sessionId)
      .having(sql`count(*) = 1`);
    
    const bouncedSessions = bouncedSessionsResult.length;

    return (bouncedSessions / totalSessions) * 100;
  }

  async trackSupportQuery(query: InsertSupportQuery): Promise<SupportQuery> {
    const [newQuery] = await db
      .insert(supportQueries)
      .values(query)
      .returning();
    return newQuery;
  }

  async getSupportQueryStats(startDate?: Date, endDate?: Date): Promise<{
    totalQueries: number;
    totalCost: number;
    queriesByEmail: Array<{ 
      email: string; 
      count: number; 
      totalCost: number;
      conversationCount: number;
      totalMessages: number;
      device?: string;
      browser?: string;
      city?: string;
      state?: string;
      country?: string;
    }>;
  }> {
    const conditions = [];
    if (startDate) {
      conditions.push(gte(supportQueries.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(supportQueries.createdAt, endDate));
    }

    // Get total queries and cost from support_queries
    const totals = await db
      .select({
        totalQueries: sql<number>`count(*)::int`,
        totalCost: sql<number>`COALESCE(sum(${supportQueries.cost}::numeric), 0)::numeric`,
      })
      .from(supportQueries)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get queries by email DEDUPLICATED (group only by email)
    const byEmail = await db
      .select({
        email: supportQueries.userEmail,
        count: sql<number>`count(*)::int`,
        totalCost: sql<number>`COALESCE(sum(${supportQueries.cost}::numeric), 0)::numeric`,
      })
      .from(supportQueries)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(supportQueries.userEmail)
      .orderBy(desc(sql`count(*)`));

    // Get all chat sessions to count conversations and messages per user
    const allSessions = await db.select().from(chatSessions);
    
    // Create a map of userId/email -> session stats
    const sessionStatsByIdentifier = new Map<string, { conversationCount: number; totalMessages: number; device?: string; browser?: string; city?: string; state?: string; country?: string }>();
    
    allSessions.forEach(session => {
      const identifier = session.userId || 'Anonymous';
      const messages = JSON.parse(session.messages);
      const existing = sessionStatsByIdentifier.get(identifier) || { conversationCount: 0, totalMessages: 0 };
      
      sessionStatsByIdentifier.set(identifier, {
        conversationCount: existing.conversationCount + 1,
        totalMessages: existing.totalMessages + messages.length,
        device: session.device || existing.device,
        browser: session.browser || existing.browser,
        city: session.city || existing.city,
        state: session.state || existing.state,
        country: session.country || existing.country,
      });
    });

    // Get all users to map userId to email
    const allUsers = await db.select().from(users);
    const userIdToEmail = new Map<string, string>();
    const emailToUserId = new Map<string, string>();
    allUsers.forEach(user => {
      if (user.email) {
        userIdToEmail.set(user.id, user.email);
        emailToUserId.set(user.email, user.id);
      }
    });

    return {
      totalQueries: totals[0]?.totalQueries || 0,
      totalCost: Number(totals[0]?.totalCost || 0),
      queriesByEmail: byEmail.map(row => {
        const email = row.email || 'Anonymous';
        
        // Try to find session stats by userId (if email is in users table)
        const userId = emailToUserId.get(email);
        let sessionStats = userId ? sessionStatsByIdentifier.get(userId) : undefined;
        
        // If not found and anonymous, try to find Anonymous sessions
        if (!sessionStats && email === 'Anonymous') {
          sessionStats = sessionStatsByIdentifier.get('Anonymous');
        }
        
        return {
          email,
          count: row.count,
          totalCost: Number(row.totalCost),
          conversationCount: sessionStats?.conversationCount || 0,
          totalMessages: sessionStats?.totalMessages || 0,
          device: sessionStats?.device,
          browser: sessionStats?.browser,
          city: sessionStats?.city,
          state: sessionStats?.state,
          country: sessionStats?.country,
        };
      }),
    };
  }

  async getSupportQueriesOverTime(days: number): Promise<Array<{ date: string; count: number; avgCost: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        date: sql<string>`DATE(${supportQueries.createdAt})::text`,
        count: sql<number>`count(*)::int`,
        avgCost: sql<number>`COALESCE(avg(${supportQueries.cost}::numeric), 0)::numeric`,
      })
      .from(supportQueries)
      .where(gte(supportQueries.createdAt, startDate))
      .groupBy(sql`DATE(${supportQueries.createdAt})`)
      .orderBy(sql`DATE(${supportQueries.createdAt})`);

    return results.map(row => ({
      date: row.date,
      count: row.count,
      avgCost: Number(row.avgCost),
    }));
  }

  async getSupportQueriesByEmail(email: string): Promise<SupportQuery[]> {
    return db
      .select()
      .from(supportQueries)
      .where(eq(supportQueries.userEmail, email))
      .orderBy(desc(supportQueries.createdAt));
  }

  // Chat session operations
  async saveChatSession(session: InsertChatSession): Promise<ChatSession> {
    const [savedSession] = await db
      .insert(chatSessions)
      .values(session)
      .onConflictDoUpdate({
        target: chatSessions.id,
        set: {
          title: session.title,
          messages: session.messages,
          updatedAt: session.updatedAt,
        },
      })
      .returning();
    return savedSession;
  }

  async getChatSessions(userId?: string): Promise<ChatSession[]> {
    if (userId) {
      return db
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.userId, userId))
        .orderBy(desc(chatSessions.updatedAt));
    } else {
      // Return all sessions (for anonymous users, admin, etc.)
      return db
        .select()
        .from(chatSessions)
        .orderBy(desc(chatSessions.updatedAt));
    }
  }

  async deleteChatSession(sessionId: string): Promise<void> {
    await db.delete(chatSessions).where(eq(chatSessions.id, sessionId));
  }

  // Associate anonymous sessions with a user based on IP address
  async associateAnonymousSessionsWithUser(userId: string, ipAddress: string): Promise<number> {
    // Find all sessions that match this IP and have no userId
    const anonymousSessions = await db
      .select()
      .from(chatSessions)
      .where(and(
        eq(chatSessions.ipAddress, ipAddress),
        isNull(chatSessions.userId)
      ));

    if (anonymousSessions.length === 0) {
      return 0;
    }

    // Update all anonymous sessions to associate with this user
    await db
      .update(chatSessions)
      .set({ userId })
      .where(and(
        eq(chatSessions.ipAddress, ipAddress),
        isNull(chatSessions.userId)
      ));

    console.log(`[Storage] Associated ${anonymousSessions.length} anonymous sessions with user ${userId}`);
    return anonymousSessions.length;
  }
}

export const storage = new DatabaseStorage();
