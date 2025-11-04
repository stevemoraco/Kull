import { sql } from 'drizzle-orm';
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
});

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
});

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
  cost: numeric("cost", { precision: 10, scale: 6 }).notNull().default("0"), // Cost in USD
  model: varchar("model").notNull().default("gpt-4o-mini"),
  // Anonymous user metadata for tracking
  device: varchar("device"), // Device type (e.g., "Desktop", "Mobile", "Tablet")
  browser: varchar("browser"), // Browser name (e.g., "Chrome", "Safari", "Firefox")
  city: varchar("city"), // User's city
  state: varchar("state"), // User's state/province
  country: varchar("country"), // User's country
  sessionLength: integer("session_length"), // Session length in seconds
  createdAt: timestamp("created_at").defaultNow(),
});

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
  // Anonymous user metadata for tracking (when userId is null)
  ipAddress: varchar("ip_address"), // For associating anonymous sessions with users on login
  device: varchar("device"),
  browser: varchar("browser"),
  city: varchar("city"),
  state: varchar("state"),
  country: varchar("country"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

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
});

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
});

export type DeviceSession = typeof deviceSessions.$inferSelect;
export type InsertDeviceSession = typeof deviceSessions.$inferInsert;

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
});

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
});

export type ShootProgress = typeof shootProgress.$inferSelect;
export type InsertShootProgress = typeof shootProgress.$inferInsert;

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

// Re-export email queue types
export * from "./emailQueue";
