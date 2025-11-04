import type { PromptStyle } from "@shared/culling/schemas";
import { PromptSeedDefinition } from "../packages/prompt-presets/defaults";
import {
  users,
  referrals,
  emailQueue,
  refundSurveys,
  promptPresets,
  promptVotes,
  promptSaves,
  creditLedger,
  type User,
  type UpsertUser,
  type Referral,
  type InsertReferral,
  type EmailQueue,
  type InsertEmailQueue,
  type RefundSurvey,
  type InsertRefundSurvey,
  type PromptPreset,
  type InsertPromptPreset,
  type PromptVote,
  type InsertPromptVote,
  type PromptSave,
  type InsertPromptSave,
  type CreditLedger,
  type InsertCreditLedger,
} from "@shared/schema";
import { PLANS, DEFAULT_PLAN_ID } from "@shared/culling/plans";
import { estimateCreditsForImages } from "@shared/utils/cost";
import { db } from "./db";
import {
  eq,
  lte,
  and,
  or,
  isNull,
  ilike,
  sql,
  desc
} from "drizzle-orm";

export interface CreditSummary {
  balance: number;
  planId: string;
  planDisplayName: string;
  monthlyAllowance: number;
  estimatedShootsRemaining: number;
  ledger: CreditLedger[];
}

export interface IStorage {
  // User operations (required for authentication)
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
  // Folder catalog
  updateFolderCatalog(userId: string, catalog: { deviceName?: string; folders: { id: string; name: string; bookmark?: string }[]; updatedAt: string }): Promise<User>;
  getFolderCatalog(userId: string): Promise<User | undefined>;

  // Referral operations
  createReferral(referral: InsertReferral & { referrerId: string }): Promise<Referral>;
  getUserReferrals(userId: string): Promise<Referral[]>;
  updateReferralStatus(id: string, status: string, referredUserId?: string): Promise<void>;

  // Prompt marketplace operations
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

  // Credit operations
  recordCreditEntry(entry: InsertCreditLedger & { userId: string }): Promise<CreditLedger>;
  getCreditLedger(userId: string, options?: { limit?: number }): Promise<CreditLedger[]>;
  getCreditBalance(userId: string): Promise<number>;
  getCreditSummary(userId: string): Promise<CreditSummary>;

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
}

export class DatabaseStorage implements IStorage {
  // #region User & subscription
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const now = new Date();
    const specialOfferExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        subscriptionStatus: "none",
        specialOfferExpiresAt,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: now,
        },
      })
      .returning();

    return user;
  }

  async startTrial(userId: string, tier: string, paymentMethodId: string, setupIntentId: string): Promise<User> {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [user] = await db
      .update(users)
      .set({
        subscriptionStatus: "trial",
        subscriptionTier: tier,
        stripePaymentMethodId: paymentMethodId,
        stripeSetupIntentId: setupIntentId,
        trialStartedAt: now,
        trialEndsAt,
        specialOfferExpiresAt: trialEndsAt,
        updatedAt: now,
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
    stripeSubscriptionId?: string,
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

  async convertTrialToSubscription(userId: string, subscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        subscriptionStatus: "active",
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

  async updateFolderCatalog(userId: string, catalog: { deviceName?: string; folders: { id: string; name: string; bookmark?: string }[]; updatedAt: string }): Promise<User> {
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
  // #endregion

  // #region Referrals
  async createReferral(referral: InsertReferral & { referrerId: string }): Promise<Referral> {
    const [newReferral] = await db.insert(referrals).values(referral).returning();
    return newReferral;
  }

  async getUserReferrals(userId: string): Promise<Referral[]> {
    return await db.select().from(referrals).where(eq(referrals.referrerId, userId));
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
  // #endregion

  // #region Prompt marketplace
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

  async listPromptPresets(filters: { shootType?: string; search?: string; limit?: number } = {}): Promise<PromptPreset[]> {
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
      .from(promptSaves)
      .innerJoin(promptPresets, eq(promptSaves.presetId, promptPresets.id))
      .where(eq(promptSaves.userId, userId))
      .orderBy(desc(promptSaves.createdAt));

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
      .insert(promptVotes)
      .values({
        presetId,
        userId,
        value: normalizedValue,
        rating,
        comment,
      })
      .onConflictDoUpdate({
        target: [promptVotes.presetId, promptVotes.userId],
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
      .from(promptSaves)
      .where(and(eq(promptSaves.userId, userId), eq(promptSaves.presetId, presetId)))
      .limit(1);

    if (existing) {
      await db.delete(promptSaves).where(eq(promptSaves.id, existing.id));
      return false;
    }

    await db
      .insert(promptSaves)
      .values({
        userId,
        presetId,
      });

    return true;
  }
  // #endregion

  // #region Credits
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

  async getCreditBalance(userId: string): Promise<number> {
    const [row] = await db
      .select({
        credits: sql<number>`COALESCE(sum(CASE WHEN ${creditLedger.entryType} = 'credit' THEN ${creditLedger.credits} ELSE -${creditLedger.credits} END), 0)`,
      })
      .from(creditLedger)
      .where(eq(creditLedger.userId, userId));

    return Number(row?.credits ?? 0);
  }

  async getCreditSummary(userId: string): Promise<CreditSummary> {
    const user = await this.getUser(userId);
    const planId = (user?.subscriptionTier as keyof typeof PLANS) || DEFAULT_PLAN_ID;
    const plan = PLANS[planId] ?? PLANS[DEFAULT_PLAN_ID];

    const [balance, ledger] = await Promise.all([
      this.getCreditBalance(userId),
      this.getCreditLedger(userId, { limit: 20 }),
    ]);

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
  // #endregion

  // #region Email queue
  async scheduleEmail(emailData: InsertEmailQueue): Promise<EmailQueue> {
    const [email] = await db.insert(emailQueue).values(emailData).returning();
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
          eq(emailQueue.cancelled, false),
        ),
      );
  }

  async markEmailSent(id: string): Promise<void> {
    await db
      .update(emailQueue)
      .set({
        sentAt: new Date(),
        failedAt: null,
        retryCount: "0",
      })
      .where(eq(emailQueue.id, id));
  }

  async markEmailFailed(id: string, errorMessage: string): Promise<void> {
    await db
      .update(emailQueue)
      .set({
        failedAt: new Date(),
        lastError: errorMessage,
      })
      .where(eq(emailQueue.id, id));
  }

  async cancelUserEmails(userId: string, emailType?: string): Promise<void> {
    const conditions = [eq(emailQueue.userId, userId), isNull(emailQueue.sentAt)];

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
    const dripTypes = ["drip_1_2hr", "drip_2_6hr", "drip_3_11hr", "drip_4_16hr", "drip_5_21hr"];
    for (const type of dripTypes) {
      await db
        .update(emailQueue)
        .set({ cancelled: true })
        .where(and(eq(emailQueue.userId, userId), isNull(emailQueue.sentAt), eq(emailQueue.emailType, type)));
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
      const currentRetryCount = Number.parseInt(email.retryCount || "0");
      await db
        .update(emailQueue)
        .set({
          retryCount: String(currentRetryCount + 1),
        })
        .where(eq(emailQueue.id, id));
    }
  }
  // #endregion

  // #region Refund surveys
  async createRefundSurvey(survey: InsertRefundSurvey): Promise<RefundSurvey> {
    const [created] = await db.insert(refundSurveys).values(survey).returning();
    return created;
  }
  // #endregion

  // #region Prompt helpers
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
        upvotes: sql`COALESCE(sum(CASE WHEN ${promptVotes.value} > 0 THEN 1 ELSE 0 END), 0)`,
        downvotes: sql`COALESCE(sum(CASE WHEN ${promptVotes.value} < 0 THEN 1 ELSE 0 END), 0)`,
        averageRating: sql`AVG(NULLIF(${promptVotes.rating}, 0))`,
        ratingCount: sql`COALESCE(sum(CASE WHEN ${promptVotes.rating} IS NOT NULL THEN 1 ELSE 0 END), 0)`,
      })
      .from(promptVotes)
      .where(eq(promptVotes.presetId, presetId));

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
  // #endregion
}

export const storage = new DatabaseStorage();
