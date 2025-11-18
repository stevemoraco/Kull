import type { PromptStyle } from "@shared/culling/schemas";
import { PromptSeedDefinition } from "../packages/prompt-presets/defaults";
import {
  users,
  referrals,
  emailQueue,
  refundSurveys,
  pageVisits,
  supportQueries,
  chatSessions,
  prompts,
  promptVotes,
  creditTransactions,
  deviceSessions,
  shootReports,
  shootProgress,
  globalSettings,
  promptPresets,
  promptPresetVotes,
  promptPresetSaves,
  creditLedger,
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
  type Prompt,
  type InsertPrompt,
  type PromptVote,
  type InsertPromptVote,
  type CreditTransaction,
  type InsertCreditTransaction,
  type DeviceSession,
  type InsertDeviceSession,
  type ShootReport,
  type InsertShootReport,
  type ShootProgress,
  type InsertShootProgress,
  type GlobalSetting,
  type InsertGlobalSetting,
  type PromptPreset,
  type InsertPromptPreset,
  type PromptPresetVote,
  type InsertPromptPresetVote,
  type PromptPresetSave,
  type InsertPromptPresetSave,
  type CreditLedger,
  type InsertCreditLedger,
} from "@shared/schema";
import { PLANS, DEFAULT_PLAN_ID } from "@shared/culling/plans";
import { estimateCreditsForImages } from "@shared/utils/cost";
import { db } from "./db";
import { eq, lte, and, or, isNull, ilike, gte, sql, desc } from "drizzle-orm";

export interface CreditSummary {
  balance: number;
  planId: string;
  planDisplayName: string;
  monthlyAllowance: number;
  estimatedShootsRemaining: number;
  ledger: CreditLedger[];
}

export interface IStorage {
  // User operations (required for Replit Auth / authentication)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Trial and subscription operations
  startTrial(userId: string, tier: string, paymentMethodId: string, setupIntentId: string): Promise<User>;
  updateSubscription(
    userId: string,
    tier: string,
    status: string,
    stripeCustomerId?: string,
    stripeSubscriptionId?: string,
  ): Promise<User>;
  convertTrialToSubscription(userId: string, subscriptionId: string): Promise<User>;
  markAppInstalled(userId: string): Promise<User>;
  // Folder catalog for native apps
  updateFolderCatalog(
    userId: string,
    catalog: { deviceName?: string; folders: { id: string; name: string; bookmark?: string }[]; updatedAt: string },
  ): Promise<User>;
  getFolderCatalog(userId: string): Promise<User | undefined>;
  
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

  // Prompt marketplace operations (website prompts)
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  getPrompt(id: string): Promise<Prompt | undefined>;
  getPrompts(filters?: { profile?: string; tags?: string[]; authorId?: string; featured?: boolean }): Promise<Prompt[]>;
  updatePrompt(id: string, updates: Partial<InsertPrompt>): Promise<Prompt>;
  deletePrompt(id: string): Promise<void>;
  incrementPromptUsage(id: string): Promise<void>;

  // Prompt voting operations
  votePrompt(vote: InsertPromptVote): Promise<PromptVote>;
  getUserPromptVote(userId: string, promptId: string): Promise<PromptVote | undefined>;
  getPromptVotes(promptId: string): Promise<PromptVote[]>;
  updatePromptVoteScore(promptId: string): Promise<void>;

  // Kull prompt preset operations (shared between web + native)
  seedDefaultPrompts(prompts: PromptSeedDefinition[], authorEmail: string): Promise<void>;
  listPromptPresets(filters?: { shootType?: string; search?: string; limit?: number }): Promise<PromptPreset[]>;
  listUserPrompts(userId: string): Promise<PromptPreset[]>;
  listSavedPrompts(userId: string): Promise<PromptPreset[]>;
  getPromptPresetBySlug(slug: string): Promise<PromptPreset | undefined>;
  createPromptPreset(input: {
    userId: string;
    userEmail: string;
    title: string;
    summary: string;
    instructions: string;
    shootTypes: string[];
    tags: string[];
    style: PromptStyle;
    shareWithMarketplace: boolean;
  }): Promise<PromptPreset>;
  voteOnPrompt(
    userId: string,
    presetId: string,
    value: number,
    rating?: number,
    comment?: string,
  ): Promise<PromptPreset>;
  togglePromptSave(userId: string, presetId: string): Promise<boolean>;

  // Credit operations (website credits transactions)
  getCreditBalance(userId: string): Promise<number>;
  createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction>;
  getCreditTransactions(userId: string): Promise<CreditTransaction[]>;
  getCreditUsageSummary(userId: string): Promise<{
    totalPurchased: number;
    totalSpent: number;
    currentBalance: number;
    byProvider: Array<{ provider: string; totalSpent: number; transactionCount: number; lastUsed?: Date }>;
  }>;

  // Credit operations (Kull credit ledger)
  recordCreditEntry(entry: InsertCreditLedger & { userId: string }): Promise<CreditLedger>;
  getCreditLedger(userId: string, options?: { limit?: number }): Promise<CreditLedger[]>;
  getCreditSummary(userId: string): Promise<CreditSummary>;

  // Device session operations
  createDeviceSession(session: InsertDeviceSession): Promise<DeviceSession>;
  getDeviceSession(deviceId: string): Promise<DeviceSession | undefined>;
  getDeviceSessionById(id: string): Promise<DeviceSession | undefined>;
  getUserDeviceSessions(userId: string): Promise<DeviceSession[]>;
  updateDeviceLastSeen(deviceId: string): Promise<void>;
  updateDevicePushToken(deviceId: string, pushToken: string): Promise<void>;
  revokeDeviceSession(deviceId: string): Promise<void>;
  revokeAllUserDevices(userId: string): Promise<void>;

  // Shoot report operations
  createShootReport(report: InsertShootReport): Promise<ShootReport>;
  getShootReport(id: string): Promise<ShootReport | undefined>;
  getShootReportByShootId(shootId: string): Promise<ShootReport | undefined>;
  getUserShootReports(userId: string): Promise<ShootReport[]>;
  deleteShootReport(id: string): Promise<void>;

  // Shoot progress operations
  createShootProgress(progress: InsertShootProgress): Promise<ShootProgress>;
  getShootProgress(shootId: string): Promise<ShootProgress | undefined>;
  updateShootProgress(shootId: string, updates: Partial<InsertShootProgress>): Promise<ShootProgress>;
  deleteShootProgress(shootId: string): Promise<void>;

  // Global settings operations
  getGlobalSetting(key: string): Promise<string | null>;
  setGlobalSetting(key: string, value: string, userId: string): Promise<GlobalSetting>;
  getAllGlobalSettings(): Promise<GlobalSetting[]>;
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

  async updateFolderCatalog(
    userId: string,
    catalog: { deviceName?: string; folders: { id: string; name: string; bookmark?: string }[]; updatedAt: string },
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ folderCatalog: catalog as any, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    return user;
  }

  async getFolderCatalog(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
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

  // Kull prompt presets (shared marketplace)
  async seedDefaultPrompts(prompts: PromptSeedDefinition[], authorEmail: string): Promise<void> {
    const timestamp = new Date();
    for (const preset of prompts) {
      await db
        .insert(promptPresets)
        .values({
          slug: preset.slug,
          title: preset.title,
          summary: preset.summary,
          instructions: preset.instructions,
          shootTypes: preset.shootTypes,
          tags: preset.tags,
          style: preset.style,
          authorEmail,
          isDefault: true,
          sharedWithMarketplace: true,
          aiScore: preset.aiScore ?? null,
          aiSummary: preset.aiSummary ?? null,
          updatedAt: timestamp,
        })
        .onConflictDoUpdate({
          target: promptPresets.slug,
          set: {
            title: preset.title,
            summary: preset.summary,
            instructions: preset.instructions,
            shootTypes: preset.shootTypes,
            tags: preset.tags,
            style: preset.style,
            isDefault: true,
            sharedWithMarketplace: true,
            aiScore: preset.aiScore ?? null,
            aiSummary: preset.aiSummary ?? null,
            authorEmail,
            updatedAt: timestamp,
          },
        });
    }
  }

  async listPromptPresets(
    filters: { shootType?: string; search?: string; limit?: number } = {},
  ): Promise<PromptPreset[]> {
    const conditions: any[] = [eq(promptPresets.sharedWithMarketplace, true)];

    if (filters.shootType) {
      conditions.push(sql`${promptPresets.shootTypes} @> ${JSON.stringify([filters.shootType])}::jsonb`);
    }

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(or(ilike(promptPresets.title, pattern), ilike(promptPresets.summary, pattern)));
    }

    let query = db.select().from(promptPresets);
    if (conditions.length) {
      let whereClause = conditions[0];
      for (let i = 1; i < conditions.length; i += 1) {
        whereClause = and(whereClause, conditions[i]);
      }
      query = query.where(whereClause);
    }

    query = query.orderBy(
      desc(promptPresets.humanScoreAverage),
      desc(promptPresets.upvotes),
      desc(promptPresets.createdAt),
    );

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    return await query;
  }

  async listUserPrompts(userId: string): Promise<PromptPreset[]> {
    return await db
      .select()
      .from(promptPresets)
      .where(eq(promptPresets.authorId, userId))
      .orderBy(desc(promptPresets.updatedAt));
  }

  async listSavedPrompts(userId: string): Promise<PromptPreset[]> {
    const rows = await db
      .select({ preset: promptPresets })
      .from(promptPresetSaves)
      .innerJoin(promptPresets, eq(promptPresetSaves.presetId, promptPresets.id))
      .where(eq(promptPresetSaves.userId, userId))
      .orderBy(desc(promptPresetSaves.createdAt));

    return rows.map((row) => row.preset);
  }

  async getPromptPresetBySlug(slug: string): Promise<PromptPreset | undefined> {
    const [preset] = await db.select().from(promptPresets).where(eq(promptPresets.slug, slug)).limit(1);
    return preset;
  }

  async createPromptPreset(input: {
    userId: string;
    userEmail: string;
    title: string;
    summary: string;
    instructions: string;
    shootTypes: string[];
    tags: string[];
    style: PromptStyle;
    shareWithMarketplace: boolean;
  }): Promise<PromptPreset> {
    const slug = await this.generateUniquePromptSlug(input.title);

    const [preset] = await db
      .insert(promptPresets)
      .values({
        slug,
        title: input.title,
        summary: input.summary,
        instructions: input.instructions,
        shootTypes: input.shootTypes,
        tags: input.tags,
        style: input.style,
        authorId: input.userId,
        authorEmail: input.userEmail,
        sharedWithMarketplace: input.shareWithMarketplace,
        isDefault: false,
      })
      .returning();

    return preset;
  }

  async voteOnPrompt(
    userId: string,
    presetId: string,
    value: number,
    rating?: number,
    comment?: string,
  ): Promise<PromptPreset> {
    const normalizedValue = value > 0 ? 1 : value < 0 ? -1 : 0;

    await db
      .insert(promptPresetVotes)
      .values({
        presetId,
        userId,
        value: normalizedValue,
        rating,
        comment,
      })
      .onConflictDoUpdate({
        target: [promptPresetVotes.presetId, promptPresetVotes.userId],
        set: {
          value: normalizedValue,
          rating,
          comment,
          updatedAt: new Date(),
        },
      });

    await this.refreshPromptMetrics(presetId);
    const preset = await this.getPromptPresetById(presetId);
    if (!preset) {
      throw new Error("Prompt preset not found after vote.");
    }
    return preset;
  }

  async togglePromptSave(userId: string, presetId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(promptPresetSaves)
      .where(and(eq(promptPresetSaves.userId, userId), eq(promptPresetSaves.presetId, presetId)))
      .limit(1);

    if (existing) {
      await db.delete(promptPresetSaves).where(eq(promptPresetSaves.id, existing.id));
      return false;
    }

    await db
      .insert(promptPresetSaves)
      .values({
        userId,
        presetId,
      });

    return true;
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
      .values({
        ...query,
        cachedTokensIn: query.cachedTokensIn ?? 0, // Ensure default value for cached tokens
      })
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
      return await db
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.userId, userId))
        .orderBy(desc(chatSessions.updatedAt));
    } else {
      return await db
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

    return anonymousSessions.length;
  }

  // Prompt marketplace operations
  async createPrompt(promptData: InsertPrompt): Promise<Prompt> {
    const [prompt] = await db
      .insert(prompts)
      .values(promptData)
      .returning();
    return prompt;
  }

  async getPrompt(id: string): Promise<Prompt | undefined> {
    const [prompt] = await db.select().from(prompts).where(eq(prompts.id, id));
    return prompt;
  }

  async getPrompts(filters?: { profile?: string; tags?: string[]; authorId?: string; featured?: boolean }): Promise<Prompt[]> {
    const conditions = [eq(prompts.isPublic, true)];

    if (filters?.profile) {
      conditions.push(eq(prompts.profile, filters.profile));
    }
    if (filters?.authorId) {
      conditions.push(eq(prompts.authorId, filters.authorId));
    }
    if (filters?.featured !== undefined) {
      conditions.push(eq(prompts.isFeatured, filters.featured));
    }
    if (filters?.tags && filters.tags.length > 0) {
      // Check if prompt has ANY of the specified tags
      conditions.push(sql`${prompts.tags} && ARRAY[${sql.join(filters.tags.map(t => sql`${t}`), sql`, `)}]::text[]`);
    }

    return db
      .select()
      .from(prompts)
      .where(and(...conditions))
      .orderBy(desc(prompts.qualityScore), desc(prompts.usageCount));
  }

  async updatePrompt(id: string, updates: Partial<InsertPrompt>): Promise<Prompt> {
    const [updated] = await db
      .update(prompts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(prompts.id, id))
      .returning();
    return updated;
  }

  async deletePrompt(id: string): Promise<void> {
    await db.delete(prompts).where(eq(prompts.id, id));
  }

  async incrementPromptUsage(id: string): Promise<void> {
    await db
      .update(prompts)
      .set({
        usageCount: sql`${prompts.usageCount} + 1`,
      })
      .where(eq(prompts.id, id));
  }

  // Prompt voting operations
  async votePrompt(voteData: InsertPromptVote): Promise<PromptVote> {
    const [vote] = await db
      .insert(promptVotes)
      .values(voteData)
      .onConflictDoUpdate({
        target: [promptVotes.userId, promptVotes.promptId],
        set: {
          vote: voteData.vote,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Update the prompt's quality score
    await this.updatePromptVoteScore(voteData.promptId);

    return vote;
  }

  async getUserPromptVote(userId: string, promptId: string): Promise<PromptVote | undefined> {
    const [vote] = await db
      .select()
      .from(promptVotes)
      .where(and(
        eq(promptVotes.userId, userId),
        eq(promptVotes.promptId, promptId)
      ));
    return vote;
  }

  async getPromptVotes(promptId: string): Promise<PromptVote[]> {
    return db
      .select()
      .from(promptVotes)
      .where(eq(promptVotes.promptId, promptId));
  }

  async updatePromptVoteScore(promptId: string): Promise<void> {
    // Calculate average vote score and total vote count
    const result = await db
      .select({
        avgScore: sql<number>`COALESCE(AVG(${promptVotes.vote}::numeric), 0)::numeric`,
        voteCount: sql<number>`count(*)::int`,
      })
      .from(promptVotes)
      .where(eq(promptVotes.promptId, promptId));

    const { avgScore, voteCount } = result[0];

    await db
      .update(prompts)
      .set({
        qualityScore: avgScore.toString(),
        voteCount: voteCount,
        updatedAt: new Date(),
      })
      .where(eq(prompts.id, promptId));
  }

  // Credit operations
  async getCreditBalance(userId: string): Promise<number> {
    const result = await db
      .select({ balance: creditTransactions.balance })
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(1);

    return result[0]?.balance || 0;
  }

  async createCreditTransaction(transactionData: InsertCreditTransaction): Promise<CreditTransaction> {
    const [transaction] = await db
      .insert(creditTransactions)
      .values(transactionData)
      .returning();
    return transaction;
  }

  async getCreditTransactions(userId: string): Promise<CreditTransaction[]> {
    return db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt));
  }

  async getCreditUsageSummary(userId: string): Promise<{
    totalPurchased: number;
    totalSpent: number;
    currentBalance: number;
    byProvider: Array<{ provider: string; totalSpent: number; transactionCount: number; lastUsed?: Date }>;
  }> {
    const allTransactions = await this.getCreditTransactions(userId);

    const totalPurchased = allTransactions
      .filter(t => t.type === 'purchase' || t.type === 'bonus')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSpent = Math.abs(allTransactions
      .filter(t => t.type === 'usage')
      .reduce((sum, t) => sum + t.amount, 0));

    const currentBalance = await this.getCreditBalance(userId);

    // Group by provider
    const providerMap = new Map<string, { totalSpent: number; transactionCount: number; lastUsed?: Date }>();

    allTransactions
      .filter(t => t.type === 'usage' && t.provider)
      .forEach(t => {
        const existing = providerMap.get(t.provider!) || { totalSpent: 0, transactionCount: 0 };
        providerMap.set(t.provider!, {
          totalSpent: existing.totalSpent + Math.abs(t.amount),
          transactionCount: existing.transactionCount + 1,
          lastUsed: !existing.lastUsed || t.createdAt! > existing.lastUsed ? t.createdAt! : existing.lastUsed,
        });
      });

    const byProvider = Array.from(providerMap.entries()).map(([provider, stats]) => ({
      provider,
      ...stats,
    }));

    return {
      totalPurchased,
      totalSpent,
      currentBalance,
      byProvider,
    };
  }

  // Credit operations (Kull credit ledger)
  async recordCreditEntry(entry: InsertCreditLedger & { userId: string }): Promise<CreditLedger> {
    const [created] = await db
      .insert(creditLedger)
      .values({
        ...entry,
        userId: entry.userId,
        createdAt: entry.createdAt ?? new Date(),
      })
      .returning();

    return created;
  }

  async getCreditLedger(userId: string, options: { limit?: number } = {}): Promise<CreditLedger[]> {
    let query = db
      .select()
      .from(creditLedger)
      .where(eq(creditLedger.userId, userId))
      .orderBy(desc(creditLedger.createdAt));

    if (options.limit) {
      query = query.limit(options.limit);
    }

    return await query;
  }

  async getCreditSummary(userId: string): Promise<CreditSummary> {
    const user = await this.getUser(userId);
    const planId = (user?.subscriptionTier as keyof typeof PLANS) || DEFAULT_PLAN_ID;
    const plan = PLANS[planId] ?? PLANS[DEFAULT_PLAN_ID];

    const ledger = await this.getCreditLedger(userId, { limit: 20 });
    const balance = ledger.reduce((sum, entry) => {
      return sum + (entry.entryType === "credit" ? entry.credits : -entry.credits);
    }, 0);

    const estimatedShootsRemaining = plan.estimatedCreditsPerShoot
      ? Math.max(balance / plan.estimatedCreditsPerShoot, 0)
      : 0;

    return {
      balance,
      planId: plan.id,
      planDisplayName: plan.displayName,
      monthlyAllowance: plan.monthlyCredits,
      estimatedShootsRemaining,
      ledger,
    };
  }

  // Device session operations
  async createDeviceSession(sessionData: InsertDeviceSession): Promise<DeviceSession> {
    const [session] = await db
      .insert(deviceSessions)
      .values(sessionData)
      .onConflictDoUpdate({
        target: deviceSessions.deviceId,
        set: {
          userId: sessionData.userId,
          platform: sessionData.platform,
          deviceName: sessionData.deviceName,
          appVersion: sessionData.appVersion,
          jwtToken: sessionData.jwtToken,
          pushToken: sessionData.pushToken,
          lastSeen: new Date(),
          isActive: true,
        },
      })
      .returning();
    return session;
  }

  async getDeviceSession(deviceId: string): Promise<DeviceSession | undefined> {
    const [session] = await db
      .select()
      .from(deviceSessions)
      .where(eq(deviceSessions.deviceId, deviceId));
    return session;
  }

  async getDeviceSessionById(id: string): Promise<DeviceSession | undefined> {
    const [session] = await db
      .select()
      .from(deviceSessions)
      .where(eq(deviceSessions.id, id));
    return session;
  }

  async getUserDeviceSessions(userId: string): Promise<DeviceSession[]> {
    return db
      .select()
      .from(deviceSessions)
      .where(and(
        eq(deviceSessions.userId, userId),
        eq(deviceSessions.isActive, true)
      ))
      .orderBy(desc(deviceSessions.lastSeen));
  }

  async updateDeviceLastSeen(deviceId: string): Promise<void> {
    await db
      .update(deviceSessions)
      .set({
        lastSeen: new Date(),
      })
      .where(eq(deviceSessions.deviceId, deviceId));
  }

  async updateDevicePushToken(deviceId: string, pushToken: string): Promise<void> {
    await db
      .update(deviceSessions)
      .set({
        pushToken,
      })
      .where(eq(deviceSessions.deviceId, deviceId));
  }

  async revokeDeviceSession(deviceId: string): Promise<void> {
    await db
      .update(deviceSessions)
      .set({
        isActive: false,
      })
      .where(eq(deviceSessions.deviceId, deviceId));
  }

  async revokeAllUserDevices(userId: string): Promise<void> {
    await db
      .update(deviceSessions)
      .set({
        isActive: false,
      })
      .where(eq(deviceSessions.userId, userId));
  }

  // Shoot report operations
  async createShootReport(reportData: InsertShootReport): Promise<ShootReport> {
    const [report] = await db
      .insert(shootReports)
      .values(reportData)
      .returning();
    return report;
  }

  async getShootReport(id: string): Promise<ShootReport | undefined> {
    const [report] = await db
      .select()
      .from(shootReports)
      .where(eq(shootReports.id, id));
    return report;
  }

  async getShootReportByShootId(shootId: string): Promise<ShootReport | undefined> {
    const [report] = await db
      .select()
      .from(shootReports)
      .where(eq(shootReports.shootId, shootId));
    return report;
  }

  async getUserShootReports(userId: string): Promise<ShootReport[]> {
    return db
      .select()
      .from(shootReports)
      .where(eq(shootReports.userId, userId))
      .orderBy(desc(shootReports.generatedAt));
  }

  async deleteShootReport(id: string): Promise<void> {
    await db.delete(shootReports).where(eq(shootReports.id, id));
  }

  // Shoot progress operations
  async createShootProgress(progressData: InsertShootProgress): Promise<ShootProgress> {
    const [progress] = await db
      .insert(shootProgress)
      .values(progressData)
      .onConflictDoUpdate({
        target: shootProgress.shootId,
        set: {
          status: progressData.status,
          processedCount: progressData.processedCount,
          totalCount: progressData.totalCount,
          currentImage: progressData.currentImage,
          eta: progressData.eta,
          errorMessage: progressData.errorMessage,
          updatedAt: new Date(),
        },
      })
      .returning();
    return progress;
  }

  async getShootProgress(shootId: string): Promise<ShootProgress | undefined> {
    const [progress] = await db
      .select()
      .from(shootProgress)
      .where(eq(shootProgress.shootId, shootId));
    return progress;
  }

  async updateShootProgress(shootId: string, updates: Partial<InsertShootProgress>): Promise<ShootProgress> {
    const [updated] = await db
      .update(shootProgress)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(shootProgress.shootId, shootId))
      .returning();
    return updated;
  }

  async deleteShootProgress(shootId: string): Promise<void> {
    await db.delete(shootProgress).where(eq(shootProgress.shootId, shootId));
  }

  // Helpers for Kull prompt presets
  private async getPromptPresetById(id: string): Promise<PromptPreset | undefined> {
    const [preset] = await db
      .select()
      .from(promptPresets)
      .where(eq(promptPresets.id, id))
      .limit(1);
    return preset;
  }

  private async refreshPromptMetrics(presetId: string): Promise<void> {
    const [stats] = await db
      .select({
        upvotes: sql`COALESCE(sum(CASE WHEN ${promptPresetVotes.value} > 0 THEN 1 ELSE 0 END), 0)`,
        downvotes: sql`COALESCE(sum(CASE WHEN ${promptPresetVotes.value} < 0 THEN 1 ELSE 0 END), 0)`,
        averageRating: sql`AVG(NULLIF(${promptPresetVotes.rating}, 0))`,
        ratingCount: sql`COALESCE(sum(CASE WHEN ${promptPresetVotes.rating} IS NOT NULL THEN 1 ELSE 0 END), 0)`,
      })
      .from(promptPresetVotes)
      .where(eq(promptPresetVotes.presetId, presetId));

    const upvotes = Number(stats?.upvotes ?? 0);
    const downvotes = Number(stats?.downvotes ?? 0);
    const averageRating = Number(stats?.averageRating ?? 0);
    const ratingCount = Number(stats?.ratingCount ?? 0);

    await db
      .update(promptPresets)
      .set({
        upvotes,
        downvotes,
        humanScoreAverage: averageRating,
        ratingsCount: ratingCount,
        updatedAt: new Date(),
      })
      .where(eq(promptPresets.id, presetId));
  }

  private async generateUniquePromptSlug(title: string): Promise<string> {
    const base = this.slugifyTitle(title);
    let attempt = 0;

    while (true) {
      const slug = attempt === 0 ? base : `${base}-${attempt}`;
      const existing = await this.getPromptPresetBySlug(slug);
      if (!existing) {
        return slug;
      }
      attempt += 1;
    }
  }

  private slugifyTitle(title: string): string {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120);

    return slug.length > 0 ? slug : `prompt-${Date.now()}`;
  }

  // Global settings operations
  async getGlobalSetting(key: string): Promise<string | null> {
    const [setting] = await db
      .select()
      .from(globalSettings)
      .where(eq(globalSettings.key, key));
    return setting?.value || null;
  }

  async setGlobalSetting(key: string, value: string, userId: string): Promise<GlobalSetting> {
    const [setting] = await db
      .insert(globalSettings)
      .values({
        key,
        value,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: globalSettings.key,
        set: {
          value,
          updatedBy: userId,
          updatedAt: new Date(),
        },
      })
      .returning();
    return setting;
  }

  async getAllGlobalSettings(): Promise<GlobalSetting[]> {
    return db.select().from(globalSettings);
  }
}

export const storage = new DatabaseStorage();
