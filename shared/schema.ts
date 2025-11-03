import { sql } from 'drizzle-orm';
import type { PromptStyle } from './culling';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  boolean,
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

export const promptVotes = pgTable("prompt_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  presetId: varchar("preset_id").notNull().references(() => promptPresets.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  value: integer("value").notNull(),
  rating: integer("rating"),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("prompt_votes_user_unique").on(table.presetId, table.userId),
  index("prompt_votes_preset_idx").on(table.presetId),
]);

export const promptSaves = pgTable("prompt_saves", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  presetId: varchar("preset_id").notNull().references(() => promptPresets.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("prompt_saves_unique").on(table.presetId, table.userId),
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

export type PromptVote = typeof promptVotes.$inferSelect;
export type InsertPromptVote = typeof promptVotes.$inferInsert;
export const insertPromptVoteSchema = createInsertSchema(promptVotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PromptSave = typeof promptSaves.$inferSelect;
export type InsertPromptSave = typeof promptSaves.$inferInsert;
export const insertPromptSaveSchema = createInsertSchema(promptSaves).omit({
  id: true,
  createdAt: true,
});


export const creditLedger = pgTable("credit_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  entryType: varchar("entry_type", { length: 10 }).notNull(),
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


// Re-export email queue types
export * from "./emailQueue";
