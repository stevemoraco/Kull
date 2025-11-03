import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  boolean,
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
  wouldRecommend: boolean("would_recommend"), // Would they recommend to others
  missingFeature: varchar("missing_feature"), // What feature was missing
  technicalIssues: varchar("technical_issues"), // Any technical problems
  additionalFeedback: varchar("additional_feedback"), // Open-ended feedback
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

// Re-export email queue types
export * from "./emailQueue";
