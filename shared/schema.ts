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

// User storage table for Replit Auth + Kull AI specific fields
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
  userEmail: varchar("user_email"), // Email of user who asked
  userId: varchar("user_id").references(() => users.id), // Optional, for logged-in users
  userMessage: text("user_message").notNull(),
  aiResponse: text("ai_response").notNull(),
  tokensIn: integer("tokens_in").notNull().default(0),
  tokensOut: integer("tokens_out").notNull().default(0),
  cost: numeric("cost", { precision: 10, scale: 6 }).notNull().default("0"), // Cost in USD
  model: varchar("model").notNull().default("gpt-4o-mini"),
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

// Re-export email queue types
export * from "./emailQueue";
