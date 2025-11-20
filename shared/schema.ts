import { sql } from 'drizzle-orm';
import type { PromptStyle } from "./culling";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  boolean,
  numeric,
  text,
  doublePrecision,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth + Kull specific fields
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Stripe fields
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  stripePaymentMethodId: varchar("stripe_payment_method_id"),
  stripeSetupIntentId: varchar("stripe_setup_intent_id"),
  subscriptionTier: varchar("subscription_tier"), // 'professional' or 'studio'
  subscriptionStatus: varchar("subscription_status"), // 'trial', 'active', 'canceled', 'past_due'
  // Trial tracking
  trialStartedAt: timestamp("trial_started_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  trialConvertedAt: timestamp("trial_converted_at"),
  specialOfferExpiresAt: timestamp("special_offer_expires_at"), // 24 hours after sign-in
  // App installation tracking
  appInstalledAt: timestamp("app_installed_at"),
  // Synced folder catalog for mobile selection
  folderCatalog: jsonb("folder_catalog").$type<{
    deviceName?: string;
    folders: { id: string; name: string; bookmark?: string }[];
    updatedAt: string;
  }>(),
  // AI Model preference
  preferredChatModel: varchar("preferred_chat_model").default('gpt-5-nano'), // 'gpt-5-nano', 'gpt-5-mini', 'gpt-5'
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Referrals table to track photographer referrals
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  referredEmail: varchar("referred_email").notNull(),
  referredUserId: varchar("referred_user_id").references(() => users.id),
  status: varchar("status").notNull().default('pending'), // 'pending', 'completed'
  bonusUnlocked: integer("bonus_unlocked"), // 1, 3, 5, or 10
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Index for referrer lookup - optimizes WHERE referrerId = ?
  index("referrals_referrer_id_idx").on(table.referrerId),
  // Index for referred user lookup - optimizes WHERE referredUserId = ?
  index("referrals_referred_user_id_idx").on(table.referredUserId),
  // Index for status filtering - optimizes WHERE status = ?
  index("referrals_status_idx").on(table.status),
]);

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertReferralSchema = createInsertSchema(referrals).pick({
  referredEmail: true,
});

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

// Refund surveys table to capture feedback before processing refunds
export const refundSurveys = pgTable("refund_surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  // Survey questions and answers
  primaryReason: varchar("primary_reason").notNull(), // Why they're requesting a refund
  wouldRecommend: boolean("would_recommend").notNull(), // Would they recommend to others
  missingFeature: varchar("missing_feature"), // What feature was missing
  technicalIssues: varchar("technical_issues"), // Any technical problems
  additionalFeedback: varchar("additional_feedback").notNull(), // Open-ended feedback (required)
  // Voice transcription data
  audioTranscriptUrl: varchar("audio_transcript_url"), // S3/storage URL if they used voice
  transcriptionText: varchar("transcription_text", { length: 2000 }), // OpenAI Whisper transcription
  // Metadata
  refundProcessed: boolean("refund_processed").default(false),
  refundAmount: integer("refund_amount"), // Amount in cents
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRefundSurveySchema = createInsertSchema(refundSurveys).omit({
  id: true,
  createdAt: true,
});

export type InsertRefundSurvey = z.infer<typeof insertRefundSurveySchema>;
export type RefundSurvey = typeof refundSurveys.$inferSelect;

// Page visits tracking table
export const pageVisits = pgTable("page_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  page: varchar("page").notNull(), // 'home', 'pricing', 'checkout', etc.
  userId: varchar("user_id").references(() => users.id), // Optional, for logged-in users
  sessionId: varchar("session_id"), // Track unique sessions
  referrer: varchar("referrer"),
  userAgent: varchar("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Index for user lookup - optimizes WHERE userId = ?
  index("page_visits_user_id_idx").on(table.userId),
  // Index for session lookup - optimizes WHERE sessionId = ?
  index("page_visits_session_id_idx").on(table.sessionId),
  // Index for time-based queries - optimizes WHERE createdAt >= ? AND createdAt <= ?
  index("page_visits_created_at_idx").on(table.createdAt.desc()),
  // Composite index for user's recent visits - optimizes WHERE userId = ? ORDER BY createdAt DESC
  index("page_visits_user_created_idx").on(table.userId, table.createdAt.desc()),
]);

export type PageVisit = typeof pageVisits.$inferSelect;
export type InsertPageVisit = typeof pageVisits.$inferInsert;

// Support chat queries tracking table
export const supportQueries = pgTable("support_queries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id"), // Link to chat session for accurate cost tracking
  userEmail: varchar("user_email"), // Email of user who asked
  userId: varchar("user_id").references(() => users.id), // Optional, for logged-in users
  userMessage: text("user_message").notNull(),
  aiResponse: text("ai_response").notNull(),
  fullPrompt: text("full_prompt"), // Complete prompt sent to model for debugging
  tokensIn: integer("tokens_in").notNull().default(0),
  tokensOut: integer("tokens_out").notNull().default(0),
  cachedTokensIn: integer("cached_tokens_in").notNull().default(0), // Cached prompt tokens (from OpenAI prompt caching)
  cost: numeric("cost", { precision: 10, scale: 6 }).notNull().default("0"), // Cost in USD
  model: varchar("model").notNull().default("gpt-5-nano"),
  // 🔐 LAYER 3: Database-level deduplication
  messageHash: varchar("message_hash", { length: 16 }), // FNV-1a hash of aiResponse for deduplication
  // Anonymous user metadata for tracking
  device: varchar("device"), // Device type (e.g., "Desktop", "Mobile", "Tablet")
  browser: varchar("browser"), // Browser name (e.g., "Chrome", "Safari", "Firefox")
  city: varchar("city"), // User's city
  state: varchar("state"), // User's state/province
  country: varchar("country"), // User's country
  sessionLength: integer("session_length"), // Session length in seconds
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Index for session lookup - optimizes WHERE sessionId = ?
  index("support_queries_session_id_idx").on(table.sessionId),
  // Index for user email lookup - optimizes WHERE userEmail = ?
  index("support_queries_user_email_idx").on(table.userEmail),
  // Index for user lookup - optimizes WHERE userId = ?
  index("support_queries_user_id_idx").on(table.userId),
  // Index for recent queries - optimizes ORDER BY createdAt DESC
  index("support_queries_created_at_idx").on(table.createdAt.desc()),
  // Composite index for user's recent queries - optimizes WHERE userEmail = ? ORDER BY createdAt DESC
  index("support_queries_email_created_idx").on(table.userEmail, table.createdAt.desc()),
  // 🔐 LAYER 3: Database deduplication index - prevents duplicate messages within time window
  // Composite index: sessionId + messageHash + createdAt for fast duplicate detection
  index("support_queries_dedup_idx").on(table.sessionId, table.messageHash, table.createdAt.desc()),
]);

export type SupportQuery = typeof supportQueries.$inferSelect;
export type InsertSupportQuery = typeof supportQueries.$inferInsert;

// GitHub repository content cache table
export const repoContentCache = pgTable("repo_content_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  repo: varchar("repo").notNull().unique(), // e.g., "stevemoraco/kull"
  content: text("content").notNull(), // Markdown formatted repo content
  fileCount: integer("file_count").notNull().default(0),
  characterCount: integer("character_count").notNull().default(0),
  lastFetchedAt: timestamp("last_fetched_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type RepoContentCache = typeof repoContentCache.$inferSelect;
export type InsertRepoContentCache = typeof repoContentCache.$inferInsert;

// Chat sessions table for full conversation persistence
export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey(), // Client-generated ID for consistency
  userId: varchar("user_id").references(() => users.id), // Optional, for logged-in users
  userEmail: varchar("user_email"), // Email for quick lookups
  title: varchar("title").notNull(),
  messages: text("messages").notNull(), // JSON string of messages
  scriptStep: integer("script_step"), // Current step in 15-step sales script (1-15)
  // Quick Replies & Timing tracking (for script adherence analysis)
  lastQuickReplies: jsonb("last_quick_replies").$type<string[]>(), // Most recent Quick Replies offered
  lastNextMessageSeconds: integer("last_next_message_seconds"), // Most recent timing value
  questionAskedAtStep: text("question_asked_at_step"), // What question AI asked at current step
  answerGivenAtStep: text("answer_given_at_step"), // What answer user gave at current step
  // Reasoning blocks for prompt caching (OpenAI Responses API)
  reasoningBlocks: jsonb("reasoning_blocks").$type<string[]>(), // Encrypted reasoning content from previous turns
  // Anonymous user metadata for tracking (when userId is null)
  ipAddress: varchar("ip_address"), // For associating anonymous sessions with users on login
  device: varchar("device"),
  browser: varchar("browser"),
  city: varchar("city"),
  state: varchar("state"),
  country: varchar("country"),
  // Calculator data snapshot for tracking user's business metrics
  calculatorData: jsonb("calculator_data").$type<{
    shootsPerWeek: number;
    hoursPerShoot: number;
    billableRate: number;
    hasManuallyAdjusted: boolean;
    hasClickedPreset: boolean;
  }>(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
}, (table) => [
  // Index for user lookup - optimizes getChatSessions(userId)
  index("chat_sessions_user_id_idx").on(table.userId),
  // Index for recent sessions - optimizes ORDER BY updatedAt DESC
  index("chat_sessions_updated_at_idx").on(table.updatedAt.desc()),
  // Composite index for user's recent sessions - optimizes WHERE userId = ? ORDER BY updatedAt DESC
  index("chat_sessions_user_updated_idx").on(table.userId, table.updatedAt.desc()),
  // Index for funnel analysis - optimizes WHERE scriptStep = ?
  index("chat_sessions_script_step_idx").on(table.scriptStep),
  // Index for anonymous session association - optimizes WHERE ipAddress = ? AND userId IS NULL
  index("chat_sessions_ip_address_idx").on(table.ipAddress),
  // Index for email lookup - optimizes WHERE userEmail = ?
  index("chat_sessions_user_email_idx").on(table.userEmail),
]);

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;

// Prompt marketplace table
export const prompts = pgTable("prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description").notNull(),
  profile: varchar("profile").notNull(), // 'standard', 'wedding', 'corporate', etc.
  systemPrompt: text("system_prompt").notNull(),
  firstMessage: text("first_message"),
  sampleOutput: text("sample_output"),
  qualityScore: numeric("quality_score", { precision: 3, scale: 2 }).default("0"),
  voteCount: integer("vote_count").default(0),
  usageCount: integer("usage_count").default(0),
  authorId: varchar("author_id").notNull().references(() => users.id),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  isPublic: boolean("is_public").default(true),
  isFeatured: boolean("is_featured").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Prompt = typeof prompts.$inferSelect;
export type InsertPrompt = typeof prompts.$inferInsert;

// Prompt votes table
export const promptVotes = pgTable("prompt_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promptId: varchar("prompt_id").notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  value: integer("value").notNull(), // +1 or -1
  createdAt: timestamp("created_at").defaultNow(),
});

export type PromptVote = typeof promptVotes.$inferSelect;
export type InsertPromptVote = typeof promptVotes.$inferInsert;

// Credit transactions ledger
export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(), // cents worth of credits
  balance: integer("balance").notNull(), // balance after transaction
  type: varchar("type").notNull(), // 'purchase', 'usage', 'refund', 'bonus'
  provider: varchar("provider"), // 'gemini', 'openai', etc. for usage
  shootId: varchar("shoot_id"), // reference to shoot if usage
  stripePaymentIntentId: varchar("stripe_payment_intent_id"), // for purchases
  description: text("description").notNull(),
  metadata: jsonb("metadata"), // flexible field for extra data
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Index for user lookup - optimizes WHERE userId = ?
  index("credit_transactions_user_id_idx").on(table.userId),
  // Index for recent transactions - optimizes ORDER BY createdAt DESC
  index("credit_transactions_created_at_idx").on(table.createdAt.desc()),
  // Composite index for user's recent transactions - optimizes WHERE userId = ? ORDER BY createdAt DESC
  index("credit_transactions_user_created_idx").on(table.userId, table.createdAt.desc()),
  // Index for transaction type filtering - optimizes WHERE type = ?
  index("credit_transactions_type_idx").on(table.type),
  // Index for provider analytics - optimizes WHERE provider = ?
  index("credit_transactions_provider_idx").on(table.provider),
]);

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;

// Device sessions for native app authentication
export const deviceSessions = pgTable("device_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  deviceId: varchar("device_id").notNull().unique(), // client-generated stable ID
  platform: varchar("platform").notNull(), // 'macos', 'ios', 'ipados'
  deviceName: varchar("device_name").notNull(),
  appVersion: varchar("app_version").notNull(),
  jwtToken: text("jwt_token").notNull(),
  pushToken: varchar("push_token"), // for iOS notifications
  lastSeen: timestamp("last_seen").defaultNow(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Index for user lookup - optimizes WHERE userId = ?
  index("device_sessions_user_id_idx").on(table.userId),
  // Index for recent activity - optimizes ORDER BY lastSeen DESC
  index("device_sessions_last_seen_idx").on(table.lastSeen.desc()),
  // Composite index for user's active devices - optimizes WHERE userId = ? AND isActive = true ORDER BY lastSeen DESC
  index("device_sessions_user_active_idx").on(table.userId, table.isActive, table.lastSeen.desc()),
]);

export type DeviceSession = typeof deviceSessions.$inferSelect;
export type InsertDeviceSession = typeof deviceSessions.$inferInsert;

// Device tokens for push notifications (APNs/FCM)
export const deviceTokens = pgTable("device_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  deviceId: varchar("device_id").notNull(), // matches deviceSessions.deviceId
  deviceToken: text("device_token").notNull(), // APNs or FCM token
  platform: varchar("platform").notNull(), // 'ios' or 'android'
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUserDevice: uniqueIndex("device_tokens_user_device_idx").on(table.userId, table.deviceId),
}));

export type DeviceToken = typeof deviceTokens.$inferSelect;
export type InsertDeviceToken = typeof deviceTokens.$inferInsert;

// Notification preferences for users
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  shootComplete: boolean("shoot_complete").default(true),
  deviceConnection: boolean("device_connection").default(true),
  creditLow: boolean("credit_low").default(true),
  batchComplete: boolean("batch_complete").default(true),
  shootFailed: boolean("shoot_failed").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

// Shoot reports generated by AI
export const shootReports = pgTable("shoot_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  shootId: varchar("shoot_id").notNull().unique(), // from native app
  shootName: varchar("shoot_name").notNull(),
  totalImages: integer("total_images").notNull(),
  oneStarCount: integer("one_star_count").default(0),
  twoStarCount: integer("two_star_count").default(0),
  threeStarCount: integer("three_star_count").default(0),
  fourStarCount: integer("four_star_count").default(0),
  fiveStarCount: integer("five_star_count").default(0),
  topSelects: jsonb("top_selects").notNull(), // array of top 5★ images
  narrative: text("narrative").notNull(), // AI-generated summary
  exportLinks: text("export_links").array(),
  provider: varchar("provider").notNull(), // AI provider used
  creditCost: integer("credit_cost").notNull(),
  generatedAt: timestamp("generated_at").defaultNow(),
}, (table) => [
  // Index for user lookup - optimizes WHERE userId = ?
  index("shoot_reports_user_id_idx").on(table.userId),
  // Index for recent reports - optimizes ORDER BY generatedAt DESC
  index("shoot_reports_generated_at_idx").on(table.generatedAt.desc()),
  // Composite index for user's recent reports - optimizes WHERE userId = ? ORDER BY generatedAt DESC
  index("shoot_reports_user_generated_idx").on(table.userId, table.generatedAt.desc()),
]);

export type ShootReport = typeof shootReports.$inferSelect;
export type InsertShootReport = typeof shootReports.$inferInsert;

// Shoot progress tracking for real-time sync
export const shootProgress = pgTable("shoot_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shootId: varchar("shoot_id").notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: varchar("status").notNull(), // 'queued', 'processing', 'completed', 'failed'
  processedCount: integer("processed_count").default(0),
  totalCount: integer("total_count").notNull(),
  currentImage: varchar("current_image"),
  eta: integer("eta"), // seconds remaining
  provider: varchar("provider").notNull(),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Index for user lookup - optimizes WHERE userId = ?
  index("shoot_progress_user_id_idx").on(table.userId),
  // Index for status filtering - optimizes WHERE status = ?
  index("shoot_progress_status_idx").on(table.status),
  // Index for recent updates - optimizes ORDER BY updatedAt DESC
  index("shoot_progress_updated_at_idx").on(table.updatedAt.desc()),
  // Composite index for user's active shoots - optimizes WHERE userId = ? AND status IN ('queued', 'processing')
  index("shoot_progress_user_status_idx").on(table.userId, table.status),
]);

export type ShootProgress = typeof shootProgress.$inferSelect;
export type InsertShootProgress = typeof shootProgress.$inferInsert;

// Batch jobs for concurrent image processing
export const batchJobs = pgTable("batch_jobs", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  shootId: varchar("shoot_id").notNull(),
  providerId: varchar("provider_id").notNull(), // 'openai-gpt-5', 'claude-haiku-4-5', etc.
  status: varchar("status").notNull(), // 'processing', 'completed', 'failed'
  totalImages: integer("total_images").notNull(),
  processedImages: integer("processed_images").notNull().default(0),
  results: jsonb("results"), // array of rating results
  error: text("error"),
  providerJobId: varchar("provider_job_id"), // for economy mode batch APIs
  mode: varchar("mode").notNull().default('fast'), // 'fast' or 'economy'
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export type BatchJob = typeof batchJobs.$inferSelect;
export type InsertBatchJob = typeof batchJobs.$inferInsert;

// Shared report links for public access
export const sharedReportLinks = pgTable("shared_report_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").notNull().references(() => shootReports.id, { onDelete: 'cascade' }),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SharedReportLink = typeof sharedReportLinks.$inferSelect;
export type InsertSharedReportLink = typeof sharedReportLinks.$inferInsert;

// Global settings table for platform-wide configuration
export const globalSettings = pgTable("global_settings", {
  key: varchar("key").primaryKey(), // e.g., 'chat_model'
  value: text("value").notNull(), // e.g., 'gpt-5-nano'
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id), // userId who made the change
});

export type GlobalSetting = typeof globalSettings.$inferSelect;
export type InsertGlobalSetting = typeof globalSettings.$inferInsert;

// Kull prompt presets and credit ledger (for native + web orchestration)
export const promptPresets = pgTable("prompt_presets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 160 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  summary: text("summary").notNull(),
  instructions: text("instructions").notNull(),
  shootTypes: jsonb("shoot_types").notNull().$type<string[]>(),
  tags: jsonb("tags").notNull().$type<string[]>(),
  style: jsonb("style").notNull().$type<PromptStyle>(),
  authorId: varchar("author_id").references(() => users.id),
  authorEmail: varchar("author_email"),
  isDefault: boolean("is_default").notNull().default(false),
  sharedWithMarketplace: boolean("shared_with_marketplace").notNull().default(true),
  aiScore: doublePrecision("ai_score"),
  aiSummary: text("ai_summary"),
  humanScoreAverage: doublePrecision("human_score_average").notNull().default(0),
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  ratingsCount: integer("ratings_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("prompt_presets_slug_key").on(table.slug),
  index("prompt_presets_author_idx").on(table.authorId),
]);

export const promptPresetVotes = pgTable("prompt_preset_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  presetId: varchar("preset_id").notNull().references(() => promptPresets.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  value: integer("value").notNull(),
  rating: integer("rating"),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("prompt_preset_votes_user_unique").on(table.presetId, table.userId),
  index("prompt_preset_votes_preset_idx").on(table.presetId),
]);

export const promptPresetSaves = pgTable("prompt_preset_saves", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  presetId: varchar("preset_id").notNull().references(() => promptPresets.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("prompt_preset_saves_unique").on(table.presetId, table.userId),
]);

export type PromptPreset = typeof promptPresets.$inferSelect;
export type InsertPromptPreset = typeof promptPresets.$inferInsert;
export const insertPromptPresetSchema = createInsertSchema(promptPresets).omit({
  id: true,
  aiScore: true,
  aiSummary: true,
  humanScoreAverage: true,
  upvotes: true,
  downvotes: true,
  ratingsCount: true,
  createdAt: true,
  updatedAt: true,
});

export type PromptPresetVote = typeof promptPresetVotes.$inferSelect;
export type InsertPromptPresetVote = typeof promptPresetVotes.$inferInsert;
export const insertPromptPresetVoteSchema = createInsertSchema(promptPresetVotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PromptPresetSave = typeof promptPresetSaves.$inferSelect;
export type InsertPromptPresetSave = typeof promptPresetSaves.$inferInsert;
export const insertPromptPresetSaveSchema = createInsertSchema(promptPresetSaves).omit({
  id: true,
  createdAt: true,
});

export const creditLedger = pgTable("credit_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  entryType: varchar("entry_type", { length: 10 }).notNull(), // 'credit' or 'debit'
  credits: integer("credits").notNull(),
  currency: varchar("currency", { length: 16 }).notNull().default('credits'),
  metadata: jsonb("metadata").$type<{
    providerId?: string;
    shootId?: string;
    imagesProcessed?: number;
  }>(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("credit_ledger_user_idx").on(table.userId),
  index("credit_ledger_created_idx").on(table.createdAt),
]);

export type CreditLedger = typeof creditLedger.$inferSelect;
export type InsertCreditLedger = typeof creditLedger.$inferInsert;
export const insertCreditLedgerSchema = createInsertSchema(creditLedger).omit({
  id: true,
  createdAt: true,
});

// Calculator interactions tracking table
export const calculatorInteractions = pgTable("calculator_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(), // Session ID to group interactions
  userId: varchar("user_id").references(() => users.id), // Optional, if logged in
  userEmail: varchar("user_email"), // Optional, for logged-in users
  // Calculator values at time of interaction
  shootsPerWeek: doublePrecision("shoots_per_week").notNull(),
  hoursPerShoot: doublePrecision("hours_per_shoot").notNull(),
  billableRate: doublePrecision("billable_rate").notNull(),
  hasManuallyAdjusted: boolean("has_manually_adjusted").notNull().default(false),
  hasClickedPreset: boolean("has_clicked_preset").notNull().default(false),
  presetClicked: varchar("preset_clicked"), // 'less', 'more', or null
  // Metadata
  ipAddress: varchar("ip_address"),
  device: varchar("device"),
  browser: varchar("browser"),
  city: varchar("city"),
  state: varchar("state"),
  country: varchar("country"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("calculator_interactions_session_idx").on(table.sessionId),
  index("calculator_interactions_user_idx").on(table.userId),
  index("calculator_interactions_created_idx").on(table.createdAt),
]);

export type CalculatorInteraction = typeof calculatorInteractions.$inferSelect;
export type InsertCalculatorInteraction = typeof calculatorInteractions.$inferInsert;

// Conversation script steps tracking table
export const conversationSteps = pgTable("conversation_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id), // Optional
  userEmail: varchar("user_email"), // Optional
  stepNumber: integer("step_number").notNull(), // 1-15 from the sales script
  stepName: varchar("step_name").notNull(), // E.g., "current_reality", "validate_ambition", etc.
  userResponse: text("user_response"), // User's response to the step question
  aiQuestion: text("ai_question"), // The question AI asked
  completedAt: timestamp("completed_at").defaultNow(),
}, (table) => [
  index("conversation_steps_session_idx").on(table.sessionId),
  index("conversation_steps_user_idx").on(table.userId),
  index("conversation_steps_step_idx").on(table.stepNumber),
  index("conversation_steps_completed_idx").on(table.completedAt),
]);

export type ConversationStep = typeof conversationSteps.$inferSelect;
export type InsertConversationStep = typeof conversationSteps.$inferInsert;

// Re-export email queue types
export * from "./emailQueue";
