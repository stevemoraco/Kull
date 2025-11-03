import { sql } from 'drizzle-orm';
import {
  pgTable,
  timestamp,
  varchar,
  text,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Email queue for scheduled transactional emails
export const emailQueue = pgTable("email_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  emailType: varchar("email_type").notNull(), // 'welcome_5min', 'installation_check_1hr', 'trial_ending_18hr', etc.
  recipientEmail: varchar("recipient_email").notNull(),
  subject: varchar("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  textBody: text("text_body"),
  metadata: jsonb("metadata"), // Additional data like user name, trial end date, etc.
  scheduledFor: timestamp("scheduled_for").notNull(),
  sentAt: timestamp("sent_at"),
  failedAt: timestamp("failed_at"),
  errorMessage: text("error_message"),
  retryCount: varchar("retry_count").default('0'),
  cancelled: boolean("cancelled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmailQueueSchema = createInsertSchema(emailQueue).omit({
  id: true,
  createdAt: true,
});

export type InsertEmailQueue = z.infer<typeof insertEmailQueueSchema>;
export type EmailQueue = typeof emailQueue.$inferSelect;
