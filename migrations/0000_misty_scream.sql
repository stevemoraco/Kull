CREATE TABLE "batch_jobs" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"shoot_id" varchar NOT NULL,
	"provider_id" varchar NOT NULL,
	"status" varchar NOT NULL,
	"total_images" integer NOT NULL,
	"processed_images" integer DEFAULT 0 NOT NULL,
	"results" jsonb,
	"error" text,
	"provider_job_id" varchar,
	"mode" varchar DEFAULT 'fast' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "calculator_interactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"user_id" varchar,
	"user_email" varchar,
	"shoots_per_week" double precision NOT NULL,
	"hours_per_shoot" double precision NOT NULL,
	"billable_rate" double precision NOT NULL,
	"has_manually_adjusted" boolean DEFAULT false NOT NULL,
	"has_clicked_preset" boolean DEFAULT false NOT NULL,
	"preset_clicked" varchar,
	"ip_address" varchar,
	"device" varchar,
	"browser" varchar,
	"city" varchar,
	"state" varchar,
	"country" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"user_email" varchar,
	"title" varchar NOT NULL,
	"messages" text NOT NULL,
	"script_step" integer,
	"ip_address" varchar,
	"device" varchar,
	"browser" varchar,
	"city" varchar,
	"state" varchar,
	"country" varchar,
	"calculator_data" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_steps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"user_id" varchar,
	"user_email" varchar,
	"step_number" integer NOT NULL,
	"step_name" varchar NOT NULL,
	"user_response" text,
	"ai_question" text,
	"completed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"entry_type" varchar(10) NOT NULL,
	"credits" integer NOT NULL,
	"currency" varchar(16) DEFAULT 'credits' NOT NULL,
	"metadata" jsonb,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"amount" integer NOT NULL,
	"balance" integer NOT NULL,
	"type" varchar NOT NULL,
	"provider" varchar,
	"shoot_id" varchar,
	"stripe_payment_intent_id" varchar,
	"description" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "device_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"device_id" varchar NOT NULL,
	"platform" varchar NOT NULL,
	"device_name" varchar NOT NULL,
	"app_version" varchar NOT NULL,
	"jwt_token" text NOT NULL,
	"push_token" varchar,
	"last_seen" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "device_sessions_device_id_unique" UNIQUE("device_id")
);
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"device_id" varchar NOT NULL,
	"device_token" text NOT NULL,
	"platform" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "global_settings" (
	"key" varchar PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" varchar
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"shoot_complete" boolean DEFAULT true,
	"device_connection" boolean DEFAULT true,
	"credit_low" boolean DEFAULT true,
	"batch_complete" boolean DEFAULT true,
	"shoot_failed" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "page_visits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page" varchar NOT NULL,
	"user_id" varchar,
	"session_id" varchar,
	"referrer" varchar,
	"user_agent" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prompt_preset_saves" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"preset_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prompt_preset_votes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"preset_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"value" integer NOT NULL,
	"rating" integer,
	"comment" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prompt_presets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(160) NOT NULL,
	"title" varchar(160) NOT NULL,
	"summary" text NOT NULL,
	"instructions" text NOT NULL,
	"shoot_types" jsonb NOT NULL,
	"tags" jsonb NOT NULL,
	"style" jsonb NOT NULL,
	"author_id" varchar,
	"author_email" varchar,
	"is_default" boolean DEFAULT false NOT NULL,
	"shared_with_marketplace" boolean DEFAULT true NOT NULL,
	"ai_score" double precision,
	"ai_summary" text,
	"human_score_average" double precision DEFAULT 0 NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"ratings_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prompt_votes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"value" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prompts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text NOT NULL,
	"profile" varchar NOT NULL,
	"system_prompt" text NOT NULL,
	"first_message" text,
	"sample_output" text,
	"quality_score" numeric(3, 2) DEFAULT '0',
	"vote_count" integer DEFAULT 0,
	"usage_count" integer DEFAULT 0,
	"author_id" varchar NOT NULL,
	"tags" text[] DEFAULT ARRAY[]::text[],
	"is_public" boolean DEFAULT true,
	"is_featured" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" varchar NOT NULL,
	"referred_email" varchar NOT NULL,
	"referred_user_id" varchar,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"bonus_unlocked" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "refund_surveys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"primary_reason" varchar NOT NULL,
	"would_recommend" boolean NOT NULL,
	"missing_feature" varchar,
	"technical_issues" varchar,
	"additional_feedback" varchar NOT NULL,
	"audio_transcript_url" varchar,
	"transcription_text" varchar(2000),
	"refund_processed" boolean DEFAULT false,
	"refund_amount" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "repo_content_cache" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repo" varchar NOT NULL,
	"content" text NOT NULL,
	"file_count" integer DEFAULT 0 NOT NULL,
	"character_count" integer DEFAULT 0 NOT NULL,
	"last_fetched_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "repo_content_cache_repo_unique" UNIQUE("repo")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_report_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" varchar NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "shared_report_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "shoot_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shoot_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"status" varchar NOT NULL,
	"processed_count" integer DEFAULT 0,
	"total_count" integer NOT NULL,
	"current_image" varchar,
	"eta" integer,
	"provider" varchar NOT NULL,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "shoot_progress_shoot_id_unique" UNIQUE("shoot_id")
);
--> statement-breakpoint
CREATE TABLE "shoot_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"shoot_id" varchar NOT NULL,
	"shoot_name" varchar NOT NULL,
	"total_images" integer NOT NULL,
	"one_star_count" integer DEFAULT 0,
	"two_star_count" integer DEFAULT 0,
	"three_star_count" integer DEFAULT 0,
	"four_star_count" integer DEFAULT 0,
	"five_star_count" integer DEFAULT 0,
	"top_selects" jsonb NOT NULL,
	"narrative" text NOT NULL,
	"export_links" text[],
	"provider" varchar NOT NULL,
	"credit_cost" integer NOT NULL,
	"generated_at" timestamp DEFAULT now(),
	CONSTRAINT "shoot_reports_shoot_id_unique" UNIQUE("shoot_id")
);
--> statement-breakpoint
CREATE TABLE "support_queries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar,
	"user_email" varchar,
	"user_id" varchar,
	"user_message" text NOT NULL,
	"ai_response" text NOT NULL,
	"full_prompt" text,
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"cached_tokens_in" integer DEFAULT 0 NOT NULL,
	"cost" numeric(10, 6) DEFAULT '0' NOT NULL,
	"model" varchar DEFAULT 'gpt-4o-mini' NOT NULL,
	"message_hash" varchar(16),
	"device" varchar,
	"browser" varchar,
	"city" varchar,
	"state" varchar,
	"country" varchar,
	"session_length" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"stripe_customer_id" varchar,
	"stripe_subscription_id" varchar,
	"stripe_payment_method_id" varchar,
	"stripe_setup_intent_id" varchar,
	"subscription_tier" varchar,
	"subscription_status" varchar,
	"trial_started_at" timestamp,
	"trial_ends_at" timestamp,
	"trial_converted_at" timestamp,
	"special_offer_expires_at" timestamp,
	"app_installed_at" timestamp,
	"folder_catalog" jsonb,
	"preferred_chat_model" varchar DEFAULT 'gpt-5-nano',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "email_queue" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"email_type" varchar NOT NULL,
	"recipient_email" varchar NOT NULL,
	"subject" varchar NOT NULL,
	"html_body" text NOT NULL,
	"text_body" text,
	"metadata" jsonb,
	"scheduled_for" timestamp NOT NULL,
	"sent_at" timestamp,
	"failed_at" timestamp,
	"error_message" text,
	"retry_count" varchar DEFAULT '0',
	"cancelled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "batch_jobs" ADD CONSTRAINT "batch_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculator_interactions" ADD CONSTRAINT "calculator_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_steps" ADD CONSTRAINT "conversation_steps_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_steps" ADD CONSTRAINT "conversation_steps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_settings" ADD CONSTRAINT "global_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_visits" ADD CONSTRAINT "page_visits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_preset_saves" ADD CONSTRAINT "prompt_preset_saves_preset_id_prompt_presets_id_fk" FOREIGN KEY ("preset_id") REFERENCES "public"."prompt_presets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_preset_saves" ADD CONSTRAINT "prompt_preset_saves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_preset_votes" ADD CONSTRAINT "prompt_preset_votes_preset_id_prompt_presets_id_fk" FOREIGN KEY ("preset_id") REFERENCES "public"."prompt_presets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_preset_votes" ADD CONSTRAINT "prompt_preset_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_presets" ADD CONSTRAINT "prompt_presets_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_votes" ADD CONSTRAINT "prompt_votes_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_votes" ADD CONSTRAINT "prompt_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_surveys" ADD CONSTRAINT "refund_surveys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_report_links" ADD CONSTRAINT "shared_report_links_report_id_shoot_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."shoot_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoot_progress" ADD CONSTRAINT "shoot_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoot_reports" ADD CONSTRAINT "shoot_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_queries" ADD CONSTRAINT "support_queries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_queries" RENAME COLUMN "content_hash" TO "message_hash";--> statement-breakpoint
CREATE INDEX "calculator_interactions_session_idx" ON "calculator_interactions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "calculator_interactions_user_idx" ON "calculator_interactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "calculator_interactions_created_idx" ON "calculator_interactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_updated_at_idx" ON "chat_sessions" USING btree ("updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "chat_sessions_user_updated_idx" ON "chat_sessions" USING btree ("user_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "chat_sessions_script_step_idx" ON "chat_sessions" USING btree ("script_step");--> statement-breakpoint
CREATE INDEX "chat_sessions_ip_address_idx" ON "chat_sessions" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "chat_sessions_user_email_idx" ON "chat_sessions" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "conversation_steps_session_idx" ON "conversation_steps" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "conversation_steps_user_idx" ON "conversation_steps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversation_steps_step_idx" ON "conversation_steps" USING btree ("step_number");--> statement-breakpoint
CREATE INDEX "conversation_steps_completed_idx" ON "conversation_steps" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "credit_ledger_user_idx" ON "credit_ledger" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_ledger_created_idx" ON "credit_ledger" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "credit_transactions_user_id_idx" ON "credit_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_transactions_created_at_idx" ON "credit_transactions" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "credit_transactions_user_created_idx" ON "credit_transactions" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "credit_transactions_type_idx" ON "credit_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "credit_transactions_provider_idx" ON "credit_transactions" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "device_sessions_user_id_idx" ON "device_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "device_sessions_last_seen_idx" ON "device_sessions" USING btree ("last_seen" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "device_sessions_user_active_idx" ON "device_sessions" USING btree ("user_id","is_active","last_seen" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "device_tokens_user_device_idx" ON "device_tokens" USING btree ("user_id","device_id");--> statement-breakpoint
CREATE INDEX "page_visits_user_id_idx" ON "page_visits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "page_visits_session_id_idx" ON "page_visits" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "page_visits_created_at_idx" ON "page_visits" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "page_visits_user_created_idx" ON "page_visits" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_preset_saves_unique" ON "prompt_preset_saves" USING btree ("preset_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_preset_votes_user_unique" ON "prompt_preset_votes" USING btree ("preset_id","user_id");--> statement-breakpoint
CREATE INDEX "prompt_preset_votes_preset_idx" ON "prompt_preset_votes" USING btree ("preset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_presets_slug_key" ON "prompt_presets" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "prompt_presets_author_idx" ON "prompt_presets" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "referrals_referrer_id_idx" ON "referrals" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX "referrals_referred_user_id_idx" ON "referrals" USING btree ("referred_user_id");--> statement-breakpoint
CREATE INDEX "referrals_status_idx" ON "referrals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "shoot_progress_user_id_idx" ON "shoot_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shoot_progress_status_idx" ON "shoot_progress" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shoot_progress_updated_at_idx" ON "shoot_progress" USING btree ("updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "shoot_progress_user_status_idx" ON "shoot_progress" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "shoot_reports_user_id_idx" ON "shoot_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shoot_reports_generated_at_idx" ON "shoot_reports" USING btree ("generated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "shoot_reports_user_generated_idx" ON "shoot_reports" USING btree ("user_id","generated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "support_queries_session_id_idx" ON "support_queries" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "support_queries_user_email_idx" ON "support_queries" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "support_queries_user_id_idx" ON "support_queries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "support_queries_created_at_idx" ON "support_queries" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "support_queries_email_created_idx" ON "support_queries" USING btree ("user_email","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "support_queries_dedup_idx" ON "support_queries" USING btree ("session_id","message_hash","created_at" DESC NULLS LAST);