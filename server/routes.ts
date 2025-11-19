import type { Express, Response, NextFunction } from "express";
import { z } from "zod";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { defaultPrompts } from "../packages/prompt-presets";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  schedulePostCheckoutEmails,
  scheduleNonCheckoutDripCampaign,
  cancelDripCampaign,
  processPendingEmails,
} from "./emailService";
import { insertRefundSurveySchema, supportQueries, users, conversationSteps, chatSessions, type User } from "@shared/schema";
import { db } from "./db";
import { desc, eq } from "drizzle-orm";
import Stripe from "stripe";
import promptsRouter from "./routes/prompts";
import deviceAuthRouter from "./routes/device-auth";
import reportsRouter from "./routes/reports";
import exportsRouter from "./routes/exports";
import { batchRouter } from "./routes/batch";
import aiPassthroughRouter from "./routes/ai-passthrough";
import adminAIRouter from "./routes/admin-ai";
import adminHealthRouter from "./routes/admin-health";
import adminUserDetailRouter from "./routes/admin-user-detail";
import adminExportRouter from "./routes/admin-export";
import adminAnalyticsRouter from "./routes/admin-analytics";
import { PromptStyleSchema, ProviderIdSchema } from "@shared/culling/schemas";
import { estimateCreditsForImages } from "@shared/utils/cost";
import { CREDIT_TOP_UP_PACKAGES, PLANS } from "@shared/culling/plans";
import { getProviderConfig } from "@shared/culling/providers";
import { GenerateReportSchema } from "./report";
import { writeSidecars } from "./xmpWriter";
import { ExifGeoContextService, type ParseResult } from "./services/exifGeo";
import path from "path";
import fs from "fs/promises";
import { Buffer } from "node:buffer";
import { runOrchestratedCulling } from "./services/batchOrchestrator";
import type { BatchImagePayload } from "./orchestrator";
import { buildShootReport, type ShootReport } from "./services/reportBuilder";
import { initiateDeviceLink, approveDeviceLink, claimDeviceLink } from "./services/deviceLink";
import { telemetryStore } from "./services/batchTelemetry";
import { emitShootCompletedNotification } from "./services/reportNotifications";
import { createContentHash } from "@shared/utils/messageFingerprint";
import { measureContextUsage } from "./contextUsageMetric";

// 🔐 LAYER 2: Backend Deduplication - In-memory cache for recent message hashes
const recentMessageCache = new Map<string, { timestamp: number; response: string }>();
const DUPLICATE_WINDOW_MS = 60000; // 60 seconds
const MAX_CACHE_SIZE = 200; // Keep last 200 messages

// 🔐 LAYER 4: Monitoring - Track deduplication statistics
interface DuplicationStats {
  totalChecks: number;
  duplicatesBlocked: number;
  lastDuplicate: { timestamp: number; sessionId: string; hash: string } | null;
}

const deduplicationStats: DuplicationStats = {
  totalChecks: 0,
  duplicatesBlocked: 0,
  lastDuplicate: null,
};

function isResponseDuplicate(sessionId: string, content: string): { isDuplicate: boolean; cachedResponse?: string } {
  const hash = createContentHash(content);
  const key = `${sessionId}:${hash}`;
  const now = Date.now();

  // 🔐 LAYER 4: Track this check
  deduplicationStats.totalChecks++;

  // Clean old entries
  for (const [k, v] of Array.from(recentMessageCache.entries())) {
    if (now - v.timestamp > DUPLICATE_WINDOW_MS) {
      recentMessageCache.delete(k);
    }
  }

  // Check for duplicate
  const cached = recentMessageCache.get(key);
  if (cached && (now - cached.timestamp < DUPLICATE_WINDOW_MS)) {
    // 🔐 LAYER 4: Track duplicate detection
    deduplicationStats.duplicatesBlocked++;
    deduplicationStats.lastDuplicate = { timestamp: now, sessionId, hash };

    console.log(`[Dedup Layer 2] 🚫 Blocked duplicate backend response (hash: ${hash}, age: ${Math.round((now - cached.timestamp) / 1000)}s)`);

    // 🔐 LAYER 4: Alert if duplicate rate exceeds threshold
    if (deduplicationStats.duplicatesBlocked > 10 && deduplicationStats.duplicatesBlocked % 5 === 0) {
      const duplicateRate = (deduplicationStats.duplicatesBlocked / deduplicationStats.totalChecks) * 100;
      console.error(`[Dedup Alert] 🚨 High duplicate rate: ${duplicateRate.toFixed(1)}% (${deduplicationStats.duplicatesBlocked}/${deduplicationStats.totalChecks})`);
    }

    return { isDuplicate: true, cachedResponse: cached.response };
  }

  // Add to cache
  recentMessageCache.set(key, { timestamp: now, response: content });

  // Limit cache size
  if (recentMessageCache.size > MAX_CACHE_SIZE) {
    const oldestKey = Array.from(recentMessageCache.keys())[0];
    recentMessageCache.delete(oldestKey);
  }

  return { isDuplicate: false };
}

// Initialize these lazily inside registerRoutes to ensure dotenv has loaded
let stripe: Stripe;
let STRIPE_PRICES: any;
let exifGeoService: ExifGeoContextService;

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Stripe and other services that depend on environment variables
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
  }

  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-10-29.clover",
  });

  // Stripe Price configuration
  STRIPE_PRICES = {
    professional: {
      annual: process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID,
      monthly: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID,
      annualAmount: 99 * 12 * 100, // $1,188 in cents
      monthlyAmount: 99 * 100, // $99 in cents
    },
    studio: {
      annual: process.env.STRIPE_STUDIO_ANNUAL_PRICE_ID,
      monthly: process.env.STRIPE_STUDIO_MONTHLY_PRICE_ID,
      annualAmount: 499 * 12 * 100, // $5,988 in cents
      monthlyAmount: 499 * 100, // $499 in cents
    },
  };

  exifGeoService = new ExifGeoContextService({
    mapboxToken: process.env.MAPBOX_ACCESS_TOKEN,
  });

  // Auth middleware (Replit OAuth - optional for local dev)
  await setupAuth(app);
  
  // Seed default prompts (safe to fail if tables don't exist yet)
  try {
    await storage.seedDefaultPrompts(defaultPrompts, "team@kullai.com");
  } catch (error: any) {
    if (error.code === '42P01') { // Table doesn't exist
      console.log('⚠️  Prompt presets table not found - skipping seed. Run migrations first: npm run db:push');
    } else {
      console.error('Error seeding default prompts:', error.message);
      throw error; // Re-throw if it's not a "table doesn't exist" error
    }
  }

  // Admin middleware (restricted to steve@lander.media)
  const isAdmin = (req: any, res: Response, next: NextFunction) => {
    if (!req.user || req.user.claims.email !== 'steve@lander.media') {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      // Associate any anonymous sessions with this user based on IP
      const ipAddress = req.headers['cf-connecting-ip'] ||
                       req.headers['x-real-ip'] ||
                       req.headers['x-forwarded-for']?.split(',')[0] ||
                       req.connection?.remoteAddress ||
                       req.socket?.remoteAddress ||
                       null;

      if (ipAddress) {
        const associatedCount = await storage.associateAnonymousSessionsWithUser(userId, ipAddress);
        if (associatedCount > 0) {
          console.log(`[Auth] Associated ${associatedCount} anonymous sessions with user ${userId}`);
        }
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user's preferred chat model
  app.post('/api/user/update-model', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { model } = req.body;

      if (!model || !['gpt-5-nano', 'gpt-5-mini', 'gpt-5'].includes(model)) {
        return res.status(400).json({ message: "Invalid model. Must be gpt-5-nano, gpt-5-mini, or gpt-5" });
      }

      const { db } = await import('./db');
      const { users } = await import('@shared/schema');

      await db.update(users)
        .set({ preferredChatModel: model, updatedAt: new Date() })
        .where(eq(users.id, userId));

      console.log(`[User] Updated chat model to ${model} for user ${userId}`);
      res.json({ success: true, model });
    } catch (error) {
      console.error("Error updating model preference:", error);
      res.status(500).json({ message: "Failed to update model preference" });
    }
  });

  // Device link endpoints for native apps
  app.post('/api/device/link/initiate', async (req, res) => {
    try {
      const schema = z.object({ deviceName: z.string().max(120).optional() });
      const { deviceName } = schema.parse(req.body ?? {});
      const link = initiateDeviceLink(deviceName);
      res.json({
        code: link.code,
        pollToken: link.pollToken,
        expiresAt: new Date(link.expiresAt).toISOString(),
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid link initiation payload", issues: error.flatten() });
      }
      console.error("device link initiate error", error);
      res.status(500).json({ message: "Failed to initiate device link" });
    }
  });

  app.post('/api/device/link/approve', isAuthenticated, async (req: any, res) => {
    try {
      const schema = z.object({ code: z.string().min(4), deviceName: z.string().max(120).optional() });
      const { code, deviceName } = schema.parse(req.body ?? {});
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const approved = approveDeviceLink(
        code,
        {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
        },
        deviceName,
      );
      if (!approved) {
        return res.status(400).json({ message: "Invalid or expired device code" });
      }
      res.json({ ok: true });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid device approval payload", issues: error.flatten() });
      }
      console.error("device link approve error", error);
      res.status(500).json({ message: "Failed to approve device link" });
    }
  });

  app.post('/api/device/link/status', async (req: any, res) => {
    try {
      const schema = z.object({ pollToken: z.string().min(8) });
      const { pollToken } = schema.parse(req.body ?? {});
      const result = claimDeviceLink(pollToken);
      if (result.status === "pending" && result.record) {
        return res.json({
          status: "pending",
          expiresAt: new Date(result.record.expiresAt).toISOString(),
        });
      }
      if (result.status === "approved" && result.record && result.record.user) {
        const snapshot = result.record.user;
        const deviceUser = {
          deviceSession: true,
          claims: {
            sub: snapshot.id,
            email: snapshot.email,
            first_name: snapshot.firstName,
            last_name: snapshot.lastName,
          },
          profile: snapshot,
        };

        return req.login(deviceUser as any, (err: Error | null) => {
          if (err) {
            console.error("device link login failed", err);
            return res.status(500).json({ message: "Failed to issue session" });
          }
          return res.json({
            status: "approved",
            deviceName: result.record?.deviceName,
            user: {
              id: snapshot.id,
              email: snapshot.email,
              firstName: snapshot.firstName,
              lastName: snapshot.lastName,
              profileImageUrl: snapshot.profileImageUrl,
            },
          });
        });
      }
      if (result.status === "expired") {
        return res.status(410).json({ status: "expired" });
      }
      return res.status(404).json({ status: "invalid" });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid poll payload", issues: error.flatten() });
      }
      console.error("device link status error", error);
      res.status(500).json({ message: "Failed to check device link status" });
    }
  });

  // Track page visits
  app.post('/api/track-visit', async (req: any, res) => {
    try {
      const { page, sessionId, referrer, userAgent } = req.body;
      
      const userId = req.user?.claims?.sub || null;
      
      await storage.trackVisit({
        page,
        sessionId,
        userId,
        referrer: referrer || null,
        userAgent: userAgent || null,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking visit:", error);
      res.status(500).json({ message: "Failed to track visit" });
    }
  });

  // Create SetupIntent for trial with card pre-authorization
  app.post('/api/trial/setup-intent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier } = req.body; // 'professional' or 'studio'

      let user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't allow trial if user already has one active or has already used their trial
      if (user.subscriptionStatus === 'trial' || user.subscriptionStatus === 'active' || user.trialStartedAt) {
        return res.status(400).json({ message: "Trial already started or subscription active" });
      }

      if (!user.email) {
        throw new Error('No user email on file');
      }

      // Check referral bonuses: 1mo free (3 sent), 3mo free (10 sent OR 3 completed), priority support (5 sent)
      const referrals = await storage.getUserReferrals(userId);
      const totalSent = referrals.length;
      const completedReferrals = referrals.filter(r => r.status === 'completed').length;
      
      const bonus = {
        freeMonths: 0,
        prioritySupport: false,
        description: ''
      };
      
      if (totalSent >= 10 || completedReferrals >= 3) {
        bonus.freeMonths = 3;
        bonus.description = '3 months free earned!';
      } else if (totalSent >= 3) {
        bonus.freeMonths = 1;
        bonus.description = '1 month free earned!';
      }
      
      if (totalSent >= 5) {
        bonus.prioritySupport = true;
      }

      // Create Stripe customer if doesn't exist or find existing by email
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        // Check if customer already exists with this email
        const existingCustomers = await stripe.customers.list({
          email: user.email,
          limit: 1,
        });
        
        if (existingCustomers.data.length > 0) {
          customerId = existingCustomers.data[0].id;
        } else {
          const customer = await stripe.customers.create({
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            metadata: {
              userId: user.id,
            },
          });
          customerId = customer.id;
        }
      }

      // Create SetupIntent to collect payment method
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        metadata: {
          userId: user.id,
          tier,
        },
      });

      // Store setup intent ID temporarily
      await storage.updateSubscription(userId, tier, 'pending', customerId);

      res.json({
        clientSecret: setupIntent.client_secret,
        customerId,
        bonus, // Include bonus information for the frontend
      });
    } catch (error: any) {
      console.error("Error creating setup intent:", error);
      res.status(500).json({ message: "Failed to create setup intent: " + error.message });
    }
  });

  // Confirm trial and place authorization hold
  app.post('/api/trial/confirm', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { setupIntentId, tier } = req.body;

      let user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Retrieve the SetupIntent to get the payment method
      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
      
      if (setupIntent.status !== 'succeeded') {
        return res.status(400).json({ message: "Setup intent not confirmed" });
      }

      const paymentMethodId = setupIntent.payment_method as string;
      
      // Calculate amount with referral bonus discount
      const referrals = await storage.getUserReferrals(userId);
      const totalSent = referrals.length;
      const completedReferrals = referrals.filter(r => r.status === 'completed').length;
      
      let freeMonths = 0;
      if (totalSent >= 10 || completedReferrals >= 3) {
        freeMonths = 3;
      } else if (totalSent >= 3) {
        freeMonths = 1;
      }
      
      const baseAnnualAmount = tier === 'professional' 
        ? STRIPE_PRICES.professional.annualAmount 
        : STRIPE_PRICES.studio.annualAmount;
      
      const monthlyRate = tier === 'professional' ? 99 * 100 : 499 * 100;
      const discountAmount = freeMonths * monthlyRate;
      const amount = Math.max(0, baseAnnualAmount - discountAmount);

      // Place authorization hold for the annual subscription amount (minus bonus)
      // This verifies the card can handle the charge without actually charging
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: 'usd',
          customer: user.stripeCustomerId || undefined,
          payment_method: paymentMethodId,
          confirm: true,
          capture_method: 'manual', // Don't capture yet, just authorize
          metadata: {
            userId: user.id,
            tier,
            purpose: 'trial_authorization',
            freeMonths: freeMonths.toString(),
            discountApplied: discountAmount.toString(),
          },
        });

        if (paymentIntent.status !== 'requires_capture') {
          throw new Error('Authorization failed: ' + paymentIntent.status);
        }

        // Start trial and save payment method
        const updatedUser = await storage.startTrial(userId, tier, paymentMethodId, setupIntentId);

        // Schedule welcome emails
        // Start trial emails and cancel any drip campaign emails
        await cancelDripCampaign(userId);
        await schedulePostCheckoutEmails(updatedUser);

        res.json({
          success: true,
          user: updatedUser,
          authorizationId: paymentIntent.id,
          bonus: { freeMonths, discountAmount: discountAmount / 100 },
        });
      } catch (authError: any) {
        // If annual authorization fails, offer monthly downgrade
        console.log('Annual authorization failed, offering monthly fallback:', authError.message);
        
        // Calculate discounted monthly amount based on referral bonuses
        const baseMonthlyAmount = tier === 'professional' 
          ? STRIPE_PRICES.professional.monthlyAmount 
          : STRIPE_PRICES.studio.monthlyAmount;
        
        // If they have free months, first month is free ($0 authorization)
        const discountedMonthlyAmount = freeMonths > 0 ? 0 : baseMonthlyAmount;
        
        return res.status(402).json({
          requiresDowngrade: true,
          message: freeMonths > 0 
            ? 'Unable to authorize annual amount. Good news: You earned free months! Switch to monthly billing with no charge for your first month?'
            : 'Unable to authorize annual amount. Would you like to try monthly billing instead?',
          tier,
          annualAmount: amount / 100,
          monthlyAmount: discountedMonthlyAmount / 100,
          baseMonthlyAmount: baseMonthlyAmount / 100,
          bonus: { freeMonths, discountAmount: (baseMonthlyAmount - discountedMonthlyAmount) / 100 },
        });
      }
    } catch (error: any) {
      console.error("Error confirming trial:", error);
      res.status(500).json({ message: "Failed to confirm trial: " + error.message });
    }
  });

  // Downgrade to monthly if annual pre-auth fails
  app.post('/api/trial/downgrade-monthly', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { setupIntentId, tier } = req.body;

      let user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
      const paymentMethodId = setupIntent.payment_method as string;
      
      // Check referral bonuses and apply discount to monthly amount too
      const referrals = await storage.getUserReferrals(userId);
      const totalSent = referrals.length;
      const completedReferrals = referrals.filter(r => r.status === 'completed').length;
      
      let freeMonths = 0;
      if (totalSent >= 10 || completedReferrals >= 3) {
        freeMonths = 3;
      } else if (totalSent >= 3) {
        freeMonths = 1;
      }
      
      const baseMonthlyAmount = tier === 'professional'
        ? STRIPE_PRICES.professional.monthlyAmount
        : STRIPE_PRICES.studio.monthlyAmount;
      
      // For monthly billing, apply pro-rated discount if they have free months
      // If they have 1+ free months, they get the first month free (no charge during trial)
      const monthlyAmount = freeMonths > 0 ? 0 : baseMonthlyAmount;

      let authorizationId = null;

      // Only create PaymentIntent if there's an amount to authorize (Stripe requires amount > 0)
      if (monthlyAmount > 0) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: monthlyAmount,
          currency: 'usd',
          customer: user.stripeCustomerId || undefined,
          payment_method: paymentMethodId,
          confirm: true,
          capture_method: 'manual',
          metadata: {
            userId: user.id,
            tier,
            billing: 'monthly',
            purpose: 'trial_authorization_monthly',
            freeMonths: freeMonths.toString(),
            discountApplied: (baseMonthlyAmount - monthlyAmount).toString(),
          },
        });

        if (paymentIntent.status !== 'requires_capture') {
          throw new Error('Monthly authorization also failed');
        }

        authorizationId = paymentIntent.id;
      }

      // Start trial with monthly billing (no authorization needed if they earned free months)
      const updatedUser = await storage.startTrial(userId, tier, paymentMethodId, setupIntentId);
      await cancelDripCampaign(userId);
      await schedulePostCheckoutEmails(updatedUser);

      res.json({
        success: true,
        user: updatedUser,
        billing: 'monthly',
        authorizationId,
        bonus: { freeMonths, discountAmount: (baseMonthlyAmount - monthlyAmount) / 100 },
      });
    } catch (error: any) {
      console.error("Error downgrading to monthly:", error);
      res.status(500).json({ message: "Failed to downgrade to monthly: " + error.message });
    }
  });

  // Convert trial to paid subscription (called after 24 hours or by user choice)
  app.post('/api/trial/convert', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { billing = 'annual' } = req.body; // 'annual' or 'monthly'
      
      let user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.subscriptionStatus !== 'trial') {
        return res.status(400).json({ message: "No active trial to convert" });
      }

      if (!user.stripePaymentMethodId || !user.subscriptionTier) {
        return res.status(400).json({ message: "Missing payment method or tier" });
      }

      // Get the appropriate price ID
      const tier = user.subscriptionTier as 'professional' | 'studio';
      const priceId = billing === 'monthly' 
        ? STRIPE_PRICES[tier].monthly
        : STRIPE_PRICES[tier].annual;

      if (!priceId) {
        return res.status(500).json({ 
          message: `Stripe price ID not configured for ${tier} ${billing}. Please contact support.` 
        });
      }

      // Create subscription with the saved payment method
      const subscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId!,
        items: [{ price: priceId }],
        default_payment_method: user.stripePaymentMethodId,
        metadata: {
          userId: user.id,
          convertedFromTrial: 'true',
        },
      });

      // Update user status
      const updatedUser = await storage.convertTrialToSubscription(userId, subscription.id);

      // Cancel any pending trial emails
      await storage.cancelUserEmails(userId);

      res.json({
        success: true,
        user: updatedUser,
        subscription,
      });
    } catch (error: any) {
      console.error("Error converting trial:", error);
      return res.status(400).json({ message: error.message });
    }
  });

  // Cancel trial
  app.post('/api/trial/cancel', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      let user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.subscriptionStatus !== 'trial') {
        return res.status(400).json({ message: "No active trial to cancel" });
      }

      // Update user status to canceled
      await storage.updateSubscription(userId, user.subscriptionTier || '', 'canceled');

      // Cancel all pending emails
      await storage.cancelUserEmails(userId);

      res.json({ success: true, message: "Trial canceled successfully" });
    } catch (error: any) {
      console.error("Error canceling trial:", error);
      res.status(500).json({ message: "Failed to cancel trial: " + error.message });
    }
  });

  // Mark app as installed
  app.post('/api/app/installed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.markAppInstalled(userId);
      res.json({ success: true, user });
    } catch (error: any) {
      console.error("Error marking app installed:", error);
      res.status(500).json({ message: "Failed to mark app installed: " + error.message });
    }
  });

  // Email processor cron job (call every minute)
  app.post('/api/cron/process-emails', async (req: any, res) => {
    try {
      // Verify cron secret to prevent unauthorized access
      const cronSecret = req.headers['x-cron-secret'];
      if (cronSecret !== process.env.CRON_SECRET) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      await processPendingEmails();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error processing emails:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Chat support endpoint with streaming
  app.post('/api/chat/message', async (req: any, res) => {
    // Extract request body variables outside try block for catch block access
    const { message, history, userActivity, pageVisits, allSessions, sessionId, calculatorData, sectionHistory } = req.body;

    // Initialize preferredModel outside try block for catch block access
    let preferredModel: 'gpt-5-nano' | 'gpt-5-mini' | 'gpt-5' = 'gpt-5-nano';

    try {
      // Request received - minimal logging

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      // Get chat model - priority: global setting > user preference > default
      const userId = req.user?.claims?.sub;

      try {
        // First check global admin setting (platform-wide)
        const globalModel = await storage.getGlobalSetting('chat_model');
        if (globalModel && ['gpt-5-nano', 'gpt-5-mini', 'gpt-5'].includes(globalModel)) {
          preferredModel = globalModel as 'gpt-5-nano' | 'gpt-5-mini' | 'gpt-5';
        } else if (userId) {
          // Fall back to user preference if no global setting
          const user = await storage.getUser(userId);
          if (user?.preferredChatModel) {
            preferredModel = user.preferredChatModel as 'gpt-5-nano' | 'gpt-5-mini' | 'gpt-5';
          }
        }
      } catch (err) {
        console.error('[Chat] Error fetching model preference:', err);
      }

      // Extract user metadata (device, browser, IP, location) - same as welcome endpoint
      const ip = req.headers['cf-connecting-ip'] ||
                 req.headers['x-real-ip'] ||
                 req.headers['x-forwarded-for']?.split(',')[0] ||
                 req.connection?.remoteAddress ||
                 req.socket?.remoteAddress ||
                 'unknown';

      const userAgent = req.headers['user-agent'] || '';
      let device = 'Desktop';
      if (/mobile/i.test(userAgent)) device = 'Mobile';
      else if (/tablet|ipad/i.test(userAgent)) device = 'Tablet';

      let browser = 'Unknown';
      if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) browser = 'Chrome';
      else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';
      else if (/firefox/i.test(userAgent)) browser = 'Firefox';
      else if (/edg/i.test(userAgent)) browser = 'Edge';

      const { timezone, currentPath, visitedPages, recentActivity } = req.body;

      // Get user authentication status
      const userEmail = req.user?.claims?.email;
      const userName = req.user?.claims?.name || req.user?.claims?.given_name;
      const isLoggedIn = !!userId;

      // Build user metadata context
      const userMetadataMarkdown = `
## 👤 User Session Metadata
${userName ? `- **Name:** ${userName}` : ''}
${userEmail ? `- **Email:** ${userEmail}` : ''}
- **Login Status:** ${isLoggedIn ? '🟢 Logged In' : '🔴 Not Logged In'}
- **Device:** ${device}
- **Browser:** ${browser}
- **IP Address:** ${ip}
- **Timezone:** ${timezone || 'Unknown'}
- **Current Page:** ${currentPath || '/'}
${visitedPages && visitedPages.length > 0 ? `- **Visited Pages:** ${visitedPages.join(' → ')}` : ''}
${recentActivity && recentActivity.length > 0 ? `- **Recent Activity (last ${Math.min(5, recentActivity.length)} actions):**
${recentActivity.slice(-5).map((a: any) => `  - ${a.action}: ${a.target}`).join('\n')}` : ''}
`;

      // Build rich markdown context for user activity (same as welcome endpoint)
      let userActivityMarkdown = userMetadataMarkdown;

      // Add calculator data context
      if (calculatorData) {
        const { shootsPerWeek, hoursPerShoot, billableRate, hasManuallyAdjusted, hasClickedPreset } = calculatorData;
        const annualShoots = shootsPerWeek * 44;
        const annualHours = shootsPerWeek * hoursPerShoot * 44;
        const annualCost = annualHours * billableRate;
        const weeksSaved = annualHours / 40;

        userActivityMarkdown += `\n\n## 💰 Calculator Data (Real-Time)

User's current calculator inputs:
- **Shoots per Week:** ${shootsPerWeek}
- **Hours per Shoot (Culling):** ${hoursPerShoot}
- **Billable Rate:** $${billableRate}/hour
- **Has Manually Adjusted:** ${hasManuallyAdjusted ? 'Yes' : 'No'}
- **Has Clicked Preset:** ${hasClickedPreset ? 'Yes' : 'No'}

**Calculated Metrics:**
- **Annual Shoots:** ${annualShoots} shoots/year
- **Annual Hours Wasted on Culling:** ${Math.round(annualHours)} hours/year
- **Annual Cost of Manual Culling:** $${Math.round(annualCost).toLocaleString()}/year
- **Work Weeks Saved:** ${weeksSaved.toFixed(1)} weeks/year

**IMPORTANT:** Use these numbers in your sales conversation! Reference their actual values when asking questions.
`;
      }

      if (userActivity && userActivity.length > 0) {
        userActivityMarkdown += `\n\n## 🖱️ User Activity History

Recent interactions (last ${userActivity.length} events):

${userActivity.map((event: any, idx: number) => {
  const time = new Date(event.timestamp);
  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (event.type === 'click') {
    const elementText = event.value ? ` - TEXT: "${event.value}"` : '';
    return `${idx + 1}. **🖱️ CLICKED** \`${event.target}\`${elementText} at ${timeStr}`;
  } else if (event.type === 'hover') {
    return `${idx + 1}. **👆 HOVERED** \`${event.target}\` at ${timeStr}`;
  } else if (event.type === 'input') {
    const displayValue = event.value && event.value.length > 0
      ? `"${event.value}"`
      : '(empty)';
    return `${idx + 1}. **⌨️ TYPED** in \`${event.target}\`: ${displayValue} at ${timeStr}`;
  } else if (event.type === 'select') {
    return `${idx + 1}. **✏️ HIGHLIGHTED TEXT**: "${event.value}" at ${timeStr}`;
  }
  return '';
}).join('\n')}

**Activity Insights:**
- **Total Clicks:** ${userActivity.filter((e: any) => e.type === 'click').length}
- **Elements Hovered:** ${userActivity.filter((e: any) => e.type === 'hover').length}
- **Input Events:** ${userActivity.filter((e: any) => e.type === 'input').length}
- **Text Selections:** ${userActivity.filter((e: any) => e.type === 'select').length}
`;
      }

      // Set up Server-Sent Events headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering if present
      // Send initial newline to establish connection
      res.write('\n');
      res.flushHeaders(); // Ensure headers are sent immediately

      // Disable TCP Nagle's algorithm for immediate transmission
      if (res.socket) {
        res.socket.setNoDelay(true);
      }

      // TIMING: Start measuring
      const timings = {
        start: Date.now(),
        contextCollected: 0,
        promptBuilt: 0,
        apiCalled: 0,
        firstToken: 0,
      };

      // Server received request - show what was sent from client
      // Break down user activity by type
      const clicks = userActivity ? userActivity.filter((e: any) => e.type === 'click').length : 0;
      const hovers = userActivity ? userActivity.filter((e: any) => e.type === 'hover').length : 0;
      const inputs = userActivity ? userActivity.filter((e: any) => e.type === 'input').length : 0;
      const selects = userActivity ? userActivity.filter((e: any) => e.type === 'select').length : 0;
      const scrolls = userActivity ? userActivity.filter((e: any) => e.type === 'scroll').length : 0;
      const totalEvents = userActivity ? userActivity.length : 0;

      const eventBreakdown = totalEvents > 0
        ? `${totalEvents} events (${clicks} clicks, ${scrolls} scrolls, ${hovers} hovers, ${inputs} inputs, ${selects} selects)`
        : '0 events';

      res.write(`data: ${JSON.stringify({
        type: 'status',
        message: `✅ server received: ${history?.length || 0} messages, ${eventBreakdown}`
      })}\n\n`);
      if (res.socket) res.socket.uncork();

      // Send status immediately before loading modules
      res.write(`data: ${JSON.stringify({
        type: 'status',
        message: `⚙️ initializing AI engine...`
      })}\n\n`);
      if (res.socket) res.socket.uncork();

      const { getChatResponseStream } = await import('./chatService');

      // Send status before database query
      res.write(`data: ${JSON.stringify({
        type: 'status',
        message: `📊 loading conversation history...`
      })}\n\n`);
      if (res.socket) res.socket.uncork();

      // Load conversation state for this session
      const conversationState = await storage.getConversationState(sessionId);
      const { generateStateContext } = await import('./conversationStateManager');
      const stateContext = conversationState ? generateStateContext(conversationState) : '';

      // Add state context to user activity markdown
      if (stateContext) {
        userActivityMarkdown += stateContext;
      }

      let loadedSteps: any[] = [];
      // Load conversation memory from conversationSteps table
      let conversationMemory = '';
      if (sessionId) {
        try {
          loadedSteps = await db
            .select()
            .from(conversationSteps)
            .where(eq(conversationSteps.sessionId, sessionId))
            .orderBy(conversationSteps.stepNumber);

          if (loadedSteps.length > 0) {
            conversationMemory = '\n\n## 🧠 CONVERSATION MEMORY\n\n';
            conversationMemory += 'Review what the user has ALREADY told you:\n\n';

            loadedSteps.forEach((step: any) => {
              conversationMemory += `**Step ${step.stepNumber} (${step.stepName}):**\n`;
              if (step.aiQuestion) {
                conversationMemory += `  You asked: "${step.aiQuestion.substring(0, 150)}${step.aiQuestion.length > 150 ? '...' : ''}"\n`;
              }
              if (step.userResponse) {
                conversationMemory += `  They said: "${step.userResponse}"\n`;
              }
              conversationMemory += '\n';
            });

            conversationMemory += '\n**CRITICAL MEMORY USAGE RULES:**\n';
            conversationMemory += '- DO NOT ask for information they already provided above\n';
            conversationMemory += '- DO reference their previous answers in your new questions\n';
            conversationMemory += '- Example: "to hit your 150-shoot goal..." NOT "what\'s your goal?"\n';
            conversationMemory += '- If they said "I want 200 shoots", later say "your 200-shoot goal" not "how many shoots?"\n\n';

            // Add memory to user activity markdown (will be included in prompt)
            userActivityMarkdown += conversationMemory;

            console.log(`[Chat Memory] Loaded ${loadedSteps.length} previous Q&A pairs for session ${sessionId}`);
          }
        } catch (memoryError) {
          console.error('[Chat Memory] Failed to load conversation memory:', memoryError);
          // Don't fail the request if memory loading fails
        }
      }

      timings.contextCollected = Date.now() - timings.start;

      // Prepare calculator data with computed values
      const enrichedCalculatorData = calculatorData ? {
        ...calculatorData,
        annualShoots: calculatorData.shootsPerWeek * 44,
        annualCost: Math.round(calculatorData.shootsPerWeek * calculatorData.hoursPerShoot * 44 * calculatorData.billableRate)
      } : undefined;

      // Get current step from conversation state
      const currentStep = conversationState?.currentStep || 1;

      // Detect user activity type and inject activity template
      let activityPrompt = '';
      if (userActivity && userActivity.length > 0 && enrichedCalculatorData) {
        const { detectActivityType, getActivityDescription } = await import('./activityDetector');
        const { getActivityTemplate, fillTemplateVariables } = await import('./activityTemplates');

        const activityType = detectActivityType(userActivity);

        if (activityType) {
          const template = getActivityTemplate(currentStep, activityType);

          if (template) {
            // Fill template with calculator data
            const filledTemplate = fillTemplateVariables(template, {
              annualShoots: enrichedCalculatorData.annualShoots,
              hoursPerShoot: enrichedCalculatorData.hoursPerShoot,
              billableRate: enrichedCalculatorData.billableRate,
              annualCost: enrichedCalculatorData.annualCost,
            });

            activityPrompt = `\n\n## 🎯 ACTIVITY-AWARE RESPONSE SUGGESTION

User is currently ${getActivityDescription(activityType)}.

**SUGGESTED RESPONSE (weaves activity into script):**
"${filledTemplate}"

Use this template or a natural variation that:
1. Acknowledges their ${activityType} activity
2. Transitions smoothly to the Step ${currentStep} script question
3. Maintains your casual, friendly tone

**CRITICAL:** If you mention their activity, you MUST also ask the script question. Don't just comment on activity alone.
`;

            // Add activity prompt to userActivityMarkdown
            userActivityMarkdown += activityPrompt;

            console.log(`[Activity Integration] Detected ${activityType} activity, suggesting template for Step ${currentStep}`);
          }
        }
      }

      // getChatResponseStream will send its own status updates:
      // - 🗂️ loading codebase...
      // - ✅ codebase loaded (Xms)
      // - 📝 building prompt with [details]...
      // - 🤖 calling openai api...
      // - ✅ api responded (Xms)
      // - ⏳ openai thinking...
      const apiStart = Date.now();
      const stream = await getChatResponseStream(message, history || [], preferredModel, userActivityMarkdown, pageVisits, allSessions, sessionId, userId, (status: string, timing?: number) => {
        // Callback for chatService to send status updates with timing
        const msg = timing !== undefined ? `${status} (${timing}ms)` : status;
        res.write(`data: ${JSON.stringify({ type: 'status', message: msg })}\n\n`);
        if (res.socket) res.socket.uncork();
      }, enrichedCalculatorData, currentStep);
      const apiTime = Date.now() - apiStart;
      timings.apiCalled = Date.now() - timings.start;

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      let fullResponse = '';
      let tokensIn = 0;
      let tokensOut = 0;
      let cachedTokensIn = 0;
      let cost = 0;
      let firstTokenReceived = false;

      try {
        // Stream processing
        let buffer = ''; // Buffer for incomplete SSE lines

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          // Add to buffer and split by lines
          buffer += chunk;
          const lines = buffer.split('\n');

          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const content = line.slice(6);
              
              // Handle [DONE] signal
              if (content.trim() === '[DONE]') continue;

              try {
                const data = JSON.parse(content);

                // Handle Chat Completions API streaming format
                if (data.choices && data.choices[0]) {
                  const choice = data.choices[0];
                  
                  // Extract content delta
                  if (choice.delta?.content) {
                    // First token received - measure total time
                    if (!firstTokenReceived) {
                      const totalTime = Date.now() - timings.start;
                      timings.firstToken = totalTime;
                      res.write(`data: ${JSON.stringify({ type: 'status', message: `✨ streaming (total: ${totalTime}ms)` })}\n\n`);
                      if (res.socket) res.socket.uncork();
                      firstTokenReceived = true;
                    }

                    fullResponse += choice.delta.content;
                    // Forward to client immediately
                    res.write(`data: ${JSON.stringify({ type: 'delta', content: choice.delta.content })}\n\n`);
                    // Force immediate transmission - bypass Node.js buffering
                    if (res.socket) res.socket.uncork();
                  }
                  
                  // Check for finish_reason and usage data (silent)
                }
                
                // Extract usage data (sent in final chunk with stream_options)
                if (data.usage) {
                  tokensIn = data.usage.prompt_tokens || 0;
                  tokensOut = data.usage.completion_tokens || 0;
                  cachedTokensIn = data.usage.prompt_tokens_details?.cached_tokens || 0;

                  // Calculate cost using accurate pricing for the selected model
                  const { calculateChatCost } = await import('./modelPricing');
                  cost = calculateChatCost(preferredModel, tokensIn, tokensOut);

                  // Usage data received (logged after stream completes)
                }

                // Handle error
                if (data.error) {
                  const errorMessage = data.error.message || 'Unknown error occurred';
                  res.write(`data: ${JSON.stringify({ type: 'error', message: errorMessage })}\n\n`);
                  // Force immediate transmission
                  if (res.socket) res.socket.uncork();
                }
              } catch (e) {
                // Skip invalid JSON lines (silent)
              }
            }
          }
        }

        // Validate response format before completing
        const hasFollowUpQuestions = fullResponse.includes('QUICK_REPLIES:');
        const hasNextMessage = fullResponse.includes('NEXT_MESSAGE:');
        const hasUnicodeMarker = fullResponse.includes('␞');

        if (!hasFollowUpQuestions || !hasNextMessage) {
          console.error('[Chat] 🚨 CRITICAL ERROR: AI response missing required metadata!');
          console.error('[Chat]   - QUICK_REPLIES present:', hasFollowUpQuestions);
          console.error('[Chat]   - NEXT_MESSAGE present:', hasNextMessage);
          console.error('[Chat]   - Unicode marker present:', hasUnicodeMarker);
          console.error('[Chat]   - Last 200 chars of response:', fullResponse.slice(-200));
          console.error('[Chat] ⚠️  User will see NO suggested replies for this message!');
        } else {
          console.log('[Chat] ✅ Response includes QUICK_REPLIES and NEXT_MESSAGE');
        }

        // Signal completion
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        // Force immediate transmission
        if (res.socket) res.socket.uncork();

        // LOG ALL TIMINGS
        const totalTime = Date.now() - timings.start;
        console.log(`[Chat Timings] Total: ${totalTime}ms | Context: ${timings.contextCollected}ms | Prompt: ${timings.promptBuilt - timings.contextCollected}ms | API: ${timings.apiCalled - timings.promptBuilt}ms | TTFT: ${timings.firstToken - timings.apiCalled}ms | FirstToken: ${timings.firstToken}ms`);
        console.log(`[Chat Tokens] In: ${tokensIn} | Out: ${tokensOut} | Cached: ${cachedTokensIn} | Cost: $${cost.toFixed(4)}`);

        // Post-response validation: Check for duplicate questions
        if (sessionId && fullResponse) {
          try {
            const { extractQuestions, hasAskedBefore, addQuestion } = await import('./questionCache');
            const newQuestions = extractQuestions(fullResponse);

            for (const question of newQuestions) {
              const isDuplicate = hasAskedBefore(sessionId, question);
              if (isDuplicate) {
                console.warn(`[QuestionCache] 🚫 REPEAT DETECTED in AI response: "${question.substring(0, 80)}..."`);
                // Log to database for monitoring (optional - implement later)
              }
              // Add question to cache for future checks
              addQuestion(sessionId, question);
            }
          } catch (cacheError) {
            console.error('[QuestionCache] Error during post-response validation:', cacheError);
            // Don't fail the request if cache fails
          }

          // Validate activity integration
          try {
            const { validateActivityIntegration } = await import('./activityDetector');
            const hadActivityDetected = activityPrompt.length > 0;

            if (!validateActivityIntegration(fullResponse, hadActivityDetected)) {
              console.warn(`[Activity Integration] ❌ Response mentioned activity without script question`);
              // Log for monitoring but don't block response
            } else if (hadActivityDetected) {
              console.log(`[Activity Integration] ✅ Successfully integrated activity into script`);
            }
          } catch (validationError) {
            console.error('[Activity Integration] Error during validation:', validationError);
            // Don't fail the request if validation fails
          }

          // Comprehensive response validation
          try {
            const { validateResponse } = await import('./responseValidator');

            const validation = validateResponse(
              fullResponse,
              history || [],
              currentStep,
              userActivity,
              enrichedCalculatorData
            );

            if (!validation.valid) {
              console.warn(`[Validation] ⚠️  Issues detected (${validation.severity}):`, validation.issues);

              // Log specific issues
              validation.issues.forEach(issue => {
                if (issue.startsWith('REPEATED_QUESTION')) {
                  console.warn(`  🔄 ${issue}`);
                } else if (issue.startsWith('ACTIVITY_WITHOUT_SCRIPT')) {
                  console.warn(`  🎯 ${issue}`);
                } else if (issue.startsWith('OFF_SCRIPT')) {
                  console.warn(`  📋 ${issue}`);
                } else if (issue.startsWith('LOW_CONTEXT_USAGE')) {
                  console.warn(`  🧠 ${issue}`);
                }
              });

              // TODO: Save validation issues to database for admin dashboard
              // await db.insert(validationLogs).values({
              //   sessionId,
              //   response: fullResponse,
              //   issues: validation.issues,
              //   severity: validation.severity,
              //   timestamp: new Date(),
              // });
            } else {
              console.log(`[Validation] ✅ Response passed all checks`);
            }

            // Log metrics for tracking
            console.log(`[Validation Metrics] Repeated: ${validation.metrics.hasRepeatedQuestion}, ActivityScript: ${!validation.metrics.hasActivityWithoutScript}, OnScript: ${!validation.metrics.isOffScript}, Context: ${validation.metrics.usesContext}`);
          } catch (validationError) {
            console.error('[Validation] Error during response validation:', validationError);
            // Don't fail the request if validation fails
          }
        }

        // Track support query in database
        const userEmail = req.user?.claims?.email;
        const userId = req.user?.claims?.sub;

        if (fullResponse) {
          // Extract metadata for anonymous users
          const userAgent = req.headers['user-agent'] || '';
          
          // Parse device type from user agent
          let device = 'Desktop';
          if (/mobile/i.test(userAgent)) device = 'Mobile';
          else if (/tablet|ipad/i.test(userAgent)) device = 'Tablet';
          
          // Parse browser from user agent
          let browser = 'Unknown';
          if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) browser = 'Chrome';
          else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';
          else if (/firefox/i.test(userAgent)) browser = 'Firefox';
          else if (/edg/i.test(userAgent)) browser = 'Edge';
          
          // Get IP for geolocation (only for anonymous users)
          let city, state, country;
          if (!userId) {
            const ip = req.headers['cf-connecting-ip'] ||
                       req.headers['x-real-ip'] ||
                       req.headers['x-forwarded-for']?.split(',')[0] ||
                       'unknown';
            
            try {
              // Use ipapi.co for geolocation
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 2000);
              const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, { 
                signal: controller.signal,
                headers: { 'User-Agent': 'Kull Support Chat' }
              });
              clearTimeout(timeoutId);
              if (geoRes.ok) {
                const geoData = await geoRes.json();
                city = geoData.city;
                state = geoData.region;
                country = geoData.country_name;
              }
            } catch (e) {
              // Silently fail geolocation
            }
          }
          
          // Calculate session length from request body if provided, default to 0
          const sessionLength = req.body.sessionStartTime
            ? Math.floor((Date.now() - req.body.sessionStartTime) / 1000)
            : 0;

          // 🔐 LAYER 2: Backend Deduplication Check
          const dedupCheck = isResponseDuplicate(sessionId, fullResponse);
          if (dedupCheck.isDuplicate) {
            console.log(`[Dedup Layer 2] Skipping duplicate response save for session ${sessionId}`);
            // Don't save duplicate to database, but still broadcast admin update
          } else {
            await storage.trackSupportQuery({
              sessionId,
              userEmail,
              userId,
              userMessage: message,
              aiResponse: fullResponse,
              tokensIn,
              tokensOut,
              cachedTokensIn,
              cost: cost.toString(),
              model: preferredModel,
              device,
              browser,
              city,
              state,
              country,
              sessionLength,
            });
          }

          // Save user answer to conversationSteps table
          if (sessionId && message && history && history.length > 0) {
            try {
              // Get the previous AI message (the question user is answering)
              const previousMessages = history.filter((m: any) => m.role === 'assistant');
              const previousAIMessage = previousMessages.length > 0
                ? previousMessages[previousMessages.length - 1].content
                : '';

              // Get current script step from conversation state
              const currentStep = conversationState?.currentStep || 1;

              // Determine step name based on step number
              const stepNames: Record<number, string> = {
                1: 'current_reality',
                2: 'validate_ambition',
                3: 'current_workload',
                4: 'challenge_growth',
                5: 'current_workflow',
                6: 'specific_targets',
                7: 'motivation',
                8: 'paint_outcome',
                9: 'identify_bottleneck',
                10: 'position_solution',
                11: 'gauge_commitment',
                12: 'create_urgency',
                13: 'introduce_price',
                14: 'state_price',
                15: 'discount_close'
              };
              const stepName = stepNames[currentStep] || 'unknown_step';

              // Save to conversationSteps table
              await db.insert(conversationSteps).values({
                sessionId: sessionId,
                userId: userId || null,
                userEmail: userEmail || null,
                stepNumber: currentStep,
                stepName: stepName,
                aiQuestion: previousAIMessage,
                userResponse: message,
                completedAt: new Date(),
              });

              console.log(`[Chat Memory] Saved answer for step ${currentStep} (${stepName})`);
              
              // Track context usage metric
              if (loadedSteps && loadedSteps.length > 0) {
                try {
                  const contextUsed = measureContextUsage(fullResponse, loadedSteps);
                  console.log(`[Chat Memory] Context usage: ${contextUsed ? "YES ✅" : "NO ❌"} - AI ${contextUsed ? "referenced" : "did not reference"} previous answers`);
                } catch (metricError) {
                  // Silent fail on metric tracking
                }
              }
            } catch (memoryError) {
              console.error('[Chat Memory] Failed to save conversation step:', memoryError);
              // Don't fail the request if memory saving fails
            }
          }

          // Update conversation state after response
          if (conversationState && fullResponse) {
            const { updateStateAfterInteraction } = await import('./conversationStateManager');
            const updatedState = updateStateAfterInteraction(conversationState, message, fullResponse);
            await storage.updateConversationState(sessionId, updatedState);

            console.log(`[Chat State] Session ${sessionId} - Step: ${updatedState.currentStep}/15, Answered: ${updatedState.questionsAnswered.length}, Off-topic: ${updatedState.offTopicCount}`);
          }

          // Check if we should progress to the next script step
          if (sessionId && fullResponse) {
            try {
              // Get current session data to check scriptStep
              const sessions = await storage.getChatSessions();
              const currentSession = sessions.find((s: any) => s.id === sessionId);

              if (currentSession) {
                const currentScriptStep = currentSession.scriptStep || 1;

                // Get the last assistant message (question AI asked before user responded)
                const previousMessages = history.filter((m: any) => m.role === 'assistant');
                const lastAssistantMessage = previousMessages.length > 0
                  ? previousMessages[previousMessages.length - 1].content
                  : '';

                // Check if user answered the question and should progress
                const { shouldProgressToNextStep, validateStepQuestion } = await import('./conversationStateManager');
                const shouldProgress = shouldProgressToNextStep(message, lastAssistantMessage, currentScriptStep);

                if (shouldProgress) {
                  const newScriptStep = currentScriptStep < 15 ? currentScriptStep + 1 : 15;

                  // Validate if AI response matches expected question for current step
                  const validation = validateStepQuestion(fullResponse, currentScriptStep, calculatorData);

                  if (!validation.isValid) {
                    console.warn(`[Script Validation] AI off-script at step ${currentScriptStep}. Expected: "${validation.expectedQuestion}", Similarity: ${(validation.similarity * 100).toFixed(1)}%`);
                  } else {
                    console.log(`[Script Validation] AI on-script at step ${currentScriptStep} (${(validation.similarity * 100).toFixed(1)}% match)`);
                  }

                  // Update chatSession with new script step
                  await db.update(chatSessions)
                    .set({
                      scriptStep: newScriptStep,
                      questionAskedAtStep: fullResponse,
                      answerGivenAtStep: message,
                      updatedAt: new Date(),
                    })
                    .where(eq(chatSessions.id, sessionId));

                  console.log(`[Script Progression] Session ${sessionId} progressed from step ${currentScriptStep} → ${newScriptStep}`);
                } else {
                  console.log(`[Script Progression] Session ${sessionId} staying at step ${currentScriptStep} (user didn't answer)`);
                }
              }
            } catch (progressError) {
              console.error('[Script Progression] Failed to update script step:', progressError);
              // Don't fail the request if progression tracking fails
            }
          }

          // Broadcast to admin panels for live updates
          const { getGlobalWsService } = await import('./websocket');
          const wsService = getGlobalWsService();
          if (wsService && sessionId) {
            wsService.broadcastToAdmins({
              type: 'ADMIN_SESSION_UPDATE',
              data: {
                sessionId,
                userId,
                userEmail,
                action: 'new_message',
              },
              timestamp: Date.now(),
              deviceId: 'server',
              userId,
            });
          }
        }

        // End response after all tracking is complete
        res.end();
      } catch (streamError) {
        const errorTime = Date.now() - timings.start;
        console.error('[Chat] Error processing stream:', {
          error: streamError,
          message: streamError instanceof Error ? streamError.message : String(streamError),
          stack: streamError instanceof Error ? streamError.stack : undefined,
          timings: {
            total: errorTime,
            contextCollected: timings.contextCollected,
            promptBuilt: timings.promptBuilt,
            apiCalled: timings.apiCalled,
            firstToken: timings.firstToken
          }
        });
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream processing error' })}\n\n`);
        // Force immediate transmission
        if (res.socket) res.socket.uncork();
        res.end();
      }
    } catch (error: any) {
      console.error("[Chat] Fatal error:", {
        error,
        message: error?.message,
        stack: error?.stack,
        headers_sent: res.headersSent,
        request: {
          message_length: message?.length,
          history_length: history?.length,
          model: preferredModel,
          session_id: sessionId
        }
      });
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to process message" });
      }
    }
  });

  // Generate personalized welcome greeting
  app.post('/api/chat/welcome', async (req: any, res) => {
    try {
      const { context, history, lastAiMessageTime, currentTime, sessionId, calculatorData } = req.body;

      // Silent mode - only log errors

      if (!context) {
        return res.status(400).json({ message: "Context required" });
      }

      // Extract IP address (check various headers for proxy/load balancer scenarios)
      const ip = req.headers['cf-connecting-ip'] ||
                 req.headers['x-real-ip'] ||
                 req.headers['x-forwarded-for']?.split(',')[0] ||
                 req.connection?.remoteAddress ||
                 req.socket?.remoteAddress ||
                 'unknown';

      // Get model preference (same logic as regular chat)
      let preferredModel: 'gpt-5-nano' | 'gpt-5-mini' | 'gpt-5' = 'gpt-5-nano';
      const userId = req.user?.claims?.sub;
      const userEmail = req.user?.claims?.email;

      try {
        // Check global admin setting first
        const globalModel = await storage.getGlobalSetting('chat_model');
        if (globalModel && ['gpt-5-nano', 'gpt-5-mini', 'gpt-5'].includes(globalModel)) {
          preferredModel = globalModel as 'gpt-5-nano' | 'gpt-5-mini' | 'gpt-5';
        } else if (userId) {
          // Fall back to user preference
          const user = await storage.getUser(userId);
          if (user?.preferredChatModel) {
            preferredModel = user.preferredChatModel as 'gpt-5-nano' | 'gpt-5-mini' | 'gpt-5';
          }
        }
      } catch (err) {
        console.error('[Welcome] Error fetching model preference:', err);
      }

      // Fetch IP geolocation from multiple services
      let ipGeoData = {
        ipAddress: ip,
        ipify: null as any,
        ipapi: null as any,
        ipwhois: null as any,
      };

      try {
        // Service 1: ipapi.co (free, good accuracy)
        const ipapiRes = await fetch(`https://ipapi.co/${ip}/json/`);
        if (ipapiRes.ok) {
          ipGeoData.ipapi = await ipapiRes.json();
        }
      } catch (e) {
        console.error('[IP Geo] ipapi.co failed:', e);
      }

      try {
        // Service 2: ip-api.com (free, comprehensive)
        const ipwhoisRes = await fetch(`http://ip-api.com/json/${ip}`);
        if (ipwhoisRes.ok) {
          ipGeoData.ipwhois = await ipwhoisRes.json();
        }
      } catch (e) {
        console.error('[IP Geo] ip-api.com failed:', e);
      }

      // Format time on site
      const minutes = Math.floor(context.timeOnSite / 60000);
      const seconds = Math.floor((context.timeOnSite % 60000) / 1000);
      const timeOnSiteFormatted = minutes > 0
        ? `${minutes}m ${seconds}s`
        : `${seconds}s`;

      // Build comprehensive context as markdown document
      const contextMarkdown = `# User Session Context

## 👤 User Information
${context.userName ? `- **Name:** ${context.userName}` : ''}
${context.userEmail ? `- **Email:** ${context.userEmail}` : ''}
- **Status:** ${context.isLoggedIn ? '🟢 Logged In' : '🔴 Not Logged In (Potential New Customer)'}

## 🌍 Location & Network
- **IP Address:** ${ipGeoData.ipAddress}

${ipGeoData.ipapi ? `### 📍 Location Data (ipapi.co)
- **City:** ${ipGeoData.ipapi.city || 'Unknown'}
- **Region:** ${ipGeoData.ipapi.region || 'Unknown'}
- **Country:** ${ipGeoData.ipapi.country_name || 'Unknown'} (${ipGeoData.ipapi.country_code || '??'})
- **Postal Code:** ${ipGeoData.ipapi.postal || 'Unknown'}
- **Coordinates:** ${ipGeoData.ipapi.latitude}, ${ipGeoData.ipapi.longitude}
- **Timezone:** ${ipGeoData.ipapi.timezone || 'Unknown'}
- **ISP:** ${ipGeoData.ipapi.org || 'Unknown'}
- **ASN:** ${ipGeoData.ipapi.asn || 'Unknown'}
` : ''}

${ipGeoData.ipwhois ? `### 📍 Location Data (ip-api.com)
- **City:** ${ipGeoData.ipwhois.city || 'Unknown'}
- **Region:** ${ipGeoData.ipwhois.regionName || 'Unknown'}
- **Country:** ${ipGeoData.ipwhois.country || 'Unknown'} (${ipGeoData.ipwhois.countryCode || '??'})
- **Postal Code:** ${ipGeoData.ipwhois.zip || 'Unknown'}
- **Coordinates:** ${ipGeoData.ipwhois.lat}, ${ipGeoData.ipwhois.lon}
- **Timezone:** ${ipGeoData.ipwhois.timezone || 'Unknown'}
- **ISP:** ${ipGeoData.ipwhois.isp || 'Unknown'}
- **Organization:** ${ipGeoData.ipwhois.org || 'Unknown'}
- **AS:** ${ipGeoData.ipwhois.as || 'Unknown'}
` : ''}

## 🧭 Navigation
- **Current Page:** ${context.currentPath}
- **Full URL:** ${context.currentUrl}
- **Referrer:** ${context.referrer}
${context.queryParams ? `- **Query Params:** ${context.queryParams}` : ''}
${context.urlHash ? `- **URL Hash:** ${context.urlHash}` : ''}
- **Visited Pages:** ${context.visitedPages?.join(' → ') || 'Just arrived'}
- **Page Views:** ${context.visitedPages?.length || 1}

## ⏱️ Time & Activity
- **Time on Site:** ${timeOnSiteFormatted}
- **Current Time:** ${context.timestamp}
- **Timezone:** ${context.timezone} (UTC${context.timezoneOffset >= 0 ? '+' : ''}${-context.timezoneOffset / 60})
- **Scroll Position:** ${context.scrollY}px (${context.scrollDepth}% down the page)
${context.scrollDepth > 70 ? '- **🔥 Highly Engaged:** User has scrolled >70% of the page' : ''}
${context.scrollDepth < 20 ? '- **⚠️ Early Stage:** User just started reading' : ''}

## 📱 Device & Display
- **Device Type:** ${context.isMobile ? '📱 Mobile' : context.isTablet ? '📲 Tablet' : '🖥️ Desktop'}
- **Touch Enabled:** ${context.isTouchDevice ? 'Yes' : 'No'} (${context.maxTouchPoints} touch points)
- **Screen:** ${context.screenWidth}×${context.screenHeight}px
- **Viewport:** ${context.viewportWidth}×${context.viewportHeight}px
- **Page Size:** ${context.pageWidth}×${context.pageHeight}px
- **Pixel Ratio:** ${context.devicePixelRatio}x ${context.devicePixelRatio >= 2 ? '(Retina/High-DPI)' : ''}
- **Color Depth:** ${context.screenColorDepth}-bit
- **Orientation:** ${context.screenOrientation}

## 💻 Browser & System
- **Browser:** ${context.browserName} ${context.browserVersion}
- **OS:** ${context.osName} ${context.osVersion !== 'Unknown' ? context.osVersion : ''}
- **Platform:** ${context.platform}
- **Language:** ${context.language}
- **All Languages:** ${context.languages}
- **User Agent:** \`${context.userAgent}\`
- **Online:** ${context.onLine ? 'Yes' : 'No'}
- **Cookies:** ${context.cookieEnabled ? 'Enabled' : 'Disabled'}
- **Do Not Track:** ${context.doNotTrack}

## 🔧 Hardware
- **CPU Cores:** ${context.hardwareConcurrency}
- **Device Memory:** ${context.deviceMemory !== 'unknown' ? context.deviceMemory + ' GB' : 'Unknown'}
${context.webglVendor !== 'unknown' ? `- **GPU Vendor:** ${context.webglVendor}` : ''}
${context.webglRenderer !== 'unknown' ? `- **GPU:** ${context.webglRenderer}` : ''}
- **WebGL Support:** ${context.webglSupported ? 'Yes' : 'No'}

## 🌐 Connection
- **Type:** ${context.connectionType.toUpperCase()}
- **Downlink:** ${context.connectionDownlink !== 'unknown' ? context.connectionDownlink + ' Mbps' : 'Unknown'}
- **RTT:** ${context.connectionRtt !== 'unknown' ? context.connectionRtt + ' ms' : 'Unknown'}
- **Data Saver:** ${context.connectionSaveData ? 'Enabled' : 'Disabled'}

## ⚡ Performance
- **Page Load:** ${context.loadTime !== 'unknown' ? context.loadTime + ' ms' : 'Unknown'}
- **DOM Ready:** ${context.domContentLoaded !== 'unknown' ? context.domContentLoaded + ' ms' : 'Unknown'}

## 💾 Storage
- **Local Storage:** ${context.localStorageAvailable ? 'Available' : 'Blocked'}
- **Session Storage:** ${context.sessionStorageAvailable ? 'Available' : 'Blocked'}

${calculatorData ? `
## 💰 Calculator Data (Real-Time)

User's current calculator inputs:
- **Shoots per Week:** ${calculatorData.shootsPerWeek}
- **Hours per Shoot (Culling):** ${calculatorData.hoursPerShoot}
- **Billable Rate:** $${calculatorData.billableRate}/hour
- **Has Manually Adjusted:** ${calculatorData.hasManuallyAdjusted ? 'Yes' : 'No'}
- **Has Clicked Preset:** ${calculatorData.hasClickedPreset ? 'Yes' : 'No'}

**Calculated Metrics:**
- **Annual Shoots:** ${calculatorData.shootsPerWeek * 44} shoots/year
- **Annual Hours Wasted on Culling:** ${Math.round(calculatorData.shootsPerWeek * calculatorData.hoursPerShoot * 44)} hours/year
- **Annual Cost of Manual Culling:** $${Math.round(calculatorData.shootsPerWeek * calculatorData.hoursPerShoot * 44 * calculatorData.billableRate).toLocaleString()}/year
- **Work Weeks Saved:** ${((calculatorData.shootsPerWeek * calculatorData.hoursPerShoot * 44) / 40).toFixed(1)} weeks/year

**IMPORTANT:** Use these numbers in your sales conversation! Reference their actual values when asking questions.
` : ''}

## 🖱️ User Activity History
${context.userActivity && context.userActivity.length > 0 ? `
Recent interactions (last ${context.userActivity.length} events):

${context.userActivity.map((event: any, idx: number) => {
  const time = new Date(event.timestamp);
  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (event.type === 'click') {
    const elementText = event.value ? ` - TEXT: "${event.value}"` : '';
    return `${idx + 1}. **🖱️ CLICKED** \`${event.target}\`${elementText} at ${timeStr}`;
  } else if (event.type === 'hover') {
    return `${idx + 1}. **👆 HOVERED** \`${event.target}\` at ${timeStr}`;
  } else if (event.type === 'input') {
    const displayValue = event.value && event.value.length > 0
      ? `"${event.value}"`
      : '(empty)';
    return `${idx + 1}. **⌨️ TYPED** in \`${event.target}\`: ${displayValue} at ${timeStr}`;
  } else if (event.type === 'select') {
    return `${idx + 1}. **✏️ HIGHLIGHTED TEXT**: "${event.value}" at ${timeStr}`;
  }
  return '';
}).join('\n')}

**Activity Insights:**
- **Total Clicks:** ${context.userActivity.filter((e: any) => e.type === 'click').length}
- **Elements Hovered:** ${context.userActivity.filter((e: any) => e.type === 'hover').length}
- **Input Events:** ${context.userActivity.filter((e: any) => e.type === 'input').length}
- **Text Selections:** ${context.userActivity.filter((e: any) => e.type === 'select').length}
` : '- No recent activity tracked'}

---

## 🎯 MOST RECENT ACTIVITY (Since Your Last Message)

**⏰ CURRENT TIME FOR USER:** ${new Date(currentTime || Date.now()).toLocaleString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'short'
})}

**📍 CURRENT PAGE:** ${context.currentPath} (${context.currentUrl})

**🆕 NEW ACTIONS IN THE LAST ${Math.round((currentTime - (lastAiMessageTime || currentTime - 30000)) / 1000)} SECONDS:**

${context.userActivity.filter((e: any) => {
  const eventTime = new Date(e.timestamp).getTime();
  return eventTime > (lastAiMessageTime || 0);
}).length > 0 ?
  context.userActivity.filter((e: any) => {
    const eventTime = new Date(e.timestamp).getTime();
    return eventTime > (lastAiMessageTime || 0);
  }).map((event: any, idx: number) => {
    const time = new Date(event.timestamp);
    const secondsAgo = Math.round((currentTime - time.getTime()) / 1000);

    if (event.type === 'click') {
      const elementText = event.value ? ` - TEXT: **"${event.value}"**` : '';
      return `🔥 **JUST CLICKED** (${secondsAgo}s ago): \`${event.target}\`${elementText}`;
    } else if (event.type === 'hover') {
      return `👁️ **JUST HOVERED** (${secondsAgo}s ago): \`${event.target}\``;
    } else if (event.type === 'input') {
      const displayValue = event.value && event.value.length > 0 ? `"${event.value}"` : '(empty)';
      return `⌨️ **JUST TYPED** (${secondsAgo}s ago) in \`${event.target}\`: ${displayValue}`;
    } else if (event.type === 'select') {
      return `✏️ **JUST HIGHLIGHTED** (${secondsAgo}s ago): **"${event.value}"**`;
    }
    return '';
  }).join('\n')
  : '- No new activity since your last message (they might be reading or thinking)'
}

**🎯 YOUR MISSION:**
Look at the NEW ACTIONS above. What did they JUST do? React to it DIRECTLY.
- Did they click something? Ask why that interested them
- Did they highlight text? Reference that exact text
- Did they hover over something? They're curious - dig into it
- Are they reading? Ask about what they're seeing on ${context.currentPath}

Make your message feel SPOOKY and personalized - like you're watching them in real-time (because you are 👀).
Use the exact text they clicked/highlighted in your response to prove you're paying attention!

---

**Your Task:**
You're Kull AI support - act like a smart, playful consultant who helps photographers discover how much time and money they're wasting. DON'T hard sell. Build rapport, tease them about their behavior, and help them calculate their own ROI.

**Consultative Approach (NOT Hard Selling):**
- Tease them playfully about what they're doing on the site ("caught you looking at pricing for the 3rd time 👀")
- Ask questions about their workflow to build a profile:
  - How many photoshoots do they do per week/month?
  - How many photos per shoot?
  - How long does culling take them per shoot?
  - What do they charge per shoot? (to calculate hourly rate)
  - What would they rather be doing with that time?
- Help them calculate the real cost:
  - "If you're doing 4 shoots/week at 2 hours culling each, that's 8 hours/week = 32 hours/month = 384 hours/year"
  - "At $200/shoot, that's $50/hour. You're spending $19,200/year in time just culling."
  - "Kull is $99/month = $1,188/year. You'd save $18,012/year."
- Be conversational and curious, not pushy
- Include links when they add value, but don't force them

**CRITICAL - CONTEXT & CONVERSATION HISTORY:**
You have access to:
1. The ENTIRE GitHub repository (same as main chat)
2. The FULL conversation history (all your messages + any user replies)
3. Real-time user behavior (most recent clicks, hovers, typing, scroll position)
4. User session data (pages visited, time on site, device, location, etc.)

**RESPOND TO THEIR MOST RECENT ACTIONS - BE SPECIFIC:**
- Look at the user activity history at the bottom - what did they JUST do?
- **CRITICAL: Reference the EXACT element they interacted with**
  - If they clicked "Professional Tier" → "Saw you click on Professional - are you doing more than 10 shoots/month?"
  - If they hovered "AI Culling Feature" → "You're hovering on AI culling - how long does it take you to cull a typical shoot right now?"
  - If they read "99% accuracy" → "Just saw you read about 99% accuracy - do you spend a lot of time fixing AI mistakes with other tools?"
  - If they clicked a testimonial → "You just clicked Sarah's testimonial - are you also doing wedding photography?"
  - If they scrolled to "ROI Calculator" section → "You're looking at the ROI section - want to run your actual numbers?"
- Parse the element text/description from the activity log to make it specific
- Ask questions directly related to what they just read or clicked
- Be observant and curious about their SPECIFIC interest, not generic

**BUILD ON THE CONVERSATION (CRITICAL - READ YOUR HISTORY):**
- **LOOK AT THE CONVERSATION HISTORY SECTION BELOW** - what have you ALREADY said?
- **IF YOU ALREADY MENTIONED "free trial" or "culling late at night" - DO NOT SAY IT AGAIN**
- **IF YOU ALREADY ASKED ABOUT THEIR WORKFLOW - MOVE TO THE NEXT STEP**
- If they're not responding, try COMPLETELY different angles:
  - First message: playful tease about their behavior
  - Second message: ask about workflow specifics
  - Third message: if still no response, make a joke or try different topic
  - Fourth message: direct question about what they're looking for
- Are they answering? Build DIRECTLY on their answer with follow-up questions
- If they've shared numbers, show the math calculation
- **NEVER repeat the same angle twice** - progression: tease → question → calculate → offer

**Format & Style (CRITICAL):**
- Text like Gen Z - casual, friendly, lowercase vibes
- ONE OR TWO SENTENCES MAX - this is NOT negotiable
- Each sentence on its own line - break up every thought
- Use emojis sparingly but naturally (1-2 per message)
- NO PARAGRAPHS - line breaks between every thought
- Think: quick text message to a friend, not email
- Be conversational and curious
- Ask questions that make them think about their workflow

**CRITICAL: NEVER PRINT RAW URLs OR MAKE UP LINKS**
- ALWAYS use markdown link format: [link text](URL)
- NEVER output bare URLs - they must ALWAYS be in markdown format
- ONLY use URLs that exist in the GitHub repository code - NEVER invent or make up URLs
- Extract real URLs from the repository content, routes, and HTML files

**URL NAVIGATION (CRITICAL):**

You can SEND USERS TO ANY PAGE on the site by including markdown links in your response.
- When you include a markdown link like [click here to see pricing](/pricing), the user will be AUTOMATICALLY redirected to that page
- Use this to guide users through the site as part of the conversation
- Available pages you can link to:
  * [calculator](/calculator) or /#calculator - scroll to calculator on homepage
  * [pricing](/pricing) - pricing page
  * [features](/features) - features page
  * [testimonials](/testimonials) - testimonials/case studies
  * [login](/api/login) - sign in page
  * ANY other page on the site - just link it

Example usage: "want to see what others are saying? [check out these case studies](/testimonials)"

**LOGIN STATUS AWARENESS (IMPORTANT):**

Check the "Login Status" field in the User Information section above.

**If user is 🔴 Not Logged In:**
- This is a welcome/exploration chat - they're browsing, learning about Kull
- They might want to engage more deeply but haven't signed in yet
- If they ask detailed questions or seem seriously interested, subtly encourage sign-in:
  * "curious to see your actual ROI? [sign in quick](/api/login) and i can save your numbers for you"
  * "btw this won't save if you leave - [takes 10s to sign in](/api/login) so you can come back anytime"
  * "want to try the calculator with your real numbers? [sign in here](/api/login) to save your progress"

**If user is 🟢 Logged In:**
- Great! They're more engaged and their activity is being tracked
- Their chat history is saved automatically
- No need to mention sign-in
- Focus on helping them understand value and ROI

**🚨 REQUIRED ENDING (ABSOLUTELY CRITICAL - DO NOT SKIP) 🚨**
You MUST ALWAYS end EVERY response with these EXACT TWO lines:

␞QUICK_REPLIES: question1 | question2 | question3 | question4
␞NEXT_MESSAGE: X

**IF YOU FORGET THESE, THE USER WILL SEE NO SUGGESTED REPLIES AND THE CHAT WILL BREAK!**

CRITICAL REQUIREMENTS:
- Start each line with the exact character "␞" (Unicode U+241E) - NO EXCEPTIONS
- QUICK_REPLIES = These are questions the USER would TYPE INTO THE CHAT to ask YOU (the AI assistant)
- Think: "What questions might the user want to ask me next based on what they're viewing?"
- These are NOT questions you're asking the user - they're questions FOR the user TO ASK you
- Format them as if the user is typing them: "How does X work?" NOT "How many X do you have?"
- Make them actionable queries the user can click to learn more from you
- Each question must be 5-15 words, natural, and directly relevant to their current activity
- NEXT_MESSAGE = seconds until your next message (5-500 seconds, adjust based on engagement level)
- **THESE LINES ARE MANDATORY IN EVERY SINGLE RESPONSE - NO EXCEPTIONS EVER!**

CORRECT EXAMPLE - Questions user asks YOU:
Your 1-2 sentence message here...

␞QUICK_REPLIES: How does AI culling work? | What are the pricing options? | Can I try it for free? | Does it work with Lightroom?
␞NEXT_MESSAGE: 45

WRONG EXAMPLE - DO NOT DO THIS:
␞QUICK_REPLIES: How many shoots do you run weekly? | How long does culling take you now? | Want me to run an ROI estimate? | What's your budget?
(These are backwards - you're asking the user, not the user asking you!)

**Examples of VARIED, specific messages (NEVER repeat same angle):**

**First contact (tease about behavior):**
- "Caught you clicking between Professional and Studio 3 times 👀 - managing a team or solo?"
- "You've hovered over 'Lightroom integration' twice now... that your main editor?"
- "I see you scrolling back up to pricing... something not adding up?"

**Second message (if no response - ask specific question):**
- "Real Q: how many photos do you typically shoot per wedding/session?"
- "What's eating most of your time right now - culling, editing, or client management?"
- "Are you using any AI tools currently, or still 100% manual?"

**Third message (if still no response - different angle entirely):**
- "Not a talker, I get it. Mind if I ask - what brings you here at [TIME]?"
- "Okay last try 😅 - what would you do with an extra 10 hours per week?"
- "You've been quiet - just browsing or actually considering this?"

**NEVER say these phrases more than ONCE:**
- "free trial"
- "culling late at night"
- "10+ hours per week"
- "Professional plan"

**IF ALREADY MENTIONED TRIAL - MOVE ON:**
- Ask about their specific workflow
- Ask what concerns they have
- Ask what they're comparing Kull against

Don't mention their IP, browser, device specs, or technical details. Use those insights to inform your message, not to show off.

---

**CONVERSATION HISTORY:**
${history && Array.isArray(history) && history.length > 0 ? `
${history.map((msg: any, idx: number) => {
  const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
  return `${idx + 1}. **${msg.role.toUpperCase()}** (${timestamp}): ${msg.content}`;
}).join('\n\n')}

**⚠️ CRITICAL SELF-AWARENESS CHECK:**
You have sent ${history.filter((m: any) => m.role === 'assistant').length} messages already.
Look at what you've ALREADY SAID above. DO NOT repeat yourself.

- If you mentioned "trial" or "Professional plan" → Talk about something else now
- If you asked about workflow → Ask a different question
- If they haven't replied → Try a completely different approach
- Vary your angle with EVERY message

` : 'No conversation yet - this is your opening message.'}

---

**FINAL REMINDER BEFORE YOU RESPOND:**
You text like Gen Z.
You ONLY reply in VERY short sentences - one or two MAX.
Break up every thought with a line break.
Think: quick text, not essay.

Now respond to their most recent activity (check the user activity log above) and work it into your message. Be specific about what they just clicked/read!`;

      const { getChatResponseStream } = await import('./chatService');
      const { getRepoContent } = await import('./fetchRepo');

      // Load conversation state for this session (if it exists from previous messages)
      const conversationState = await storage.getConversationState(sessionId);
      const { generateStateContext } = await import('./conversationStateManager');
      const stateContext = conversationState ? generateStateContext(conversationState) : '';

      // Build full context with repo + session data + conversation history
      const repoContent = await getRepoContent();

      const fullContextMarkdown = `# Full Context for Welcome Message

<GITHUB_SOURCE_CODE>
${repoContent}
</GITHUB_SOURCE_CODE>

---

${contextMarkdown}

${stateContext ? `---\n${stateContext}` : ''}`;

      // CRITICAL FIX: Pass the actual history array so AI can track conversation properly
      // Convert history to ChatMessage format expected by getChatResponseStream
      const formattedHistory = history && Array.isArray(history)
        ? history.map((msg: any) => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content
          }))
        : [];

      // Prepare calculator data with computed values
      const enrichedCalculatorData = calculatorData ? {
        ...calculatorData,
        annualShoots: calculatorData.shootsPerWeek * 44,
        annualCost: Math.round(calculatorData.shootsPerWeek * calculatorData.hoursPerShoot * 44 * calculatorData.billableRate)
      } : undefined;

      // Get current step from conversation state
      const currentStepNumber = conversationState?.currentStep || 1;

      const stream = await getChatResponseStream(
        fullContextMarkdown,
        formattedHistory, // FIXED: Pass actual history, not empty array
        preferredModel,
        undefined, // userActivityMarkdown
        undefined, // pageVisits
        undefined, // allSessions
        sessionId,
        userId,
        undefined, // statusCallback
        enrichedCalculatorData,
        currentStepNumber
      );

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering if present
      // Send initial newline to establish connection
      res.write('\n');
      res.flushHeaders(); // Ensure headers are sent immediately

      // Disable TCP Nagle's algorithm for immediate transmission
      if (res.socket) {
        res.socket.setNoDelay(true);
      }

      // Status updates for welcome message
      res.write(`data: ${JSON.stringify({ type: 'status', message: '👋 generating personalized greeting...' })}\n\n`);
      if (res.socket) res.socket.uncork();

      // Track the full response for analytics
      let fullResponse = '';
      let tokensIn = 0;
      let tokensOut = 0;
      let cachedTokensIn = 0;

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      try {
        let serverChunkCount = 0;
        let buffer = ''; // Buffer for incomplete SSE lines

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          serverChunkCount++;

          // Add to buffer and split by lines
          buffer += chunk;
          const lines = buffer.split('\n');

          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const content = line.slice(6);
              
              // Handle [DONE] signal
              if (content.trim() === '[DONE]') continue;

              try {
                const data = JSON.parse(content);

                // Handle Chat Completions API streaming format
                if (data.choices && data.choices[0]) {
                  const choice = data.choices[0];
                  
                  // Extract content delta
                  if (choice.delta?.content) {
                    fullResponse += choice.delta.content;
                    res.write(`data: ${JSON.stringify({ type: 'delta', content: choice.delta.content })}\n\n`);
                    // Force immediate transmission - bypass Node.js buffering
                    if (res.socket) res.socket.uncork();
                  }
                  
                  // Stream finished - no logging needed
                }
                
                // Extract usage data (sent in final chunk with stream_options)
                if (data.usage) {
                  tokensIn = data.usage.prompt_tokens || 0;
                  tokensOut = data.usage.completion_tokens || 0;
                  cachedTokensIn = data.usage.prompt_tokens_details?.cached_tokens || 0;
                }
                
                // Handle error
                if (data.error) {
                  console.error('[Welcome] OpenAI error:', data.error);
                  const errorMessage = data.error.message || 'Unknown error occurred';
                  res.write(`data: ${JSON.stringify({ type: 'error', message: errorMessage })}\n\n`);
                  // Force immediate transmission
                  if (res.socket) res.socket.uncork();
                }
              } catch (e) {
                console.error('[Welcome] JSON parse error:', e, 'Line:', line);
              }
            }
          }
        }

        // Validate response format before completing
        const hasFollowUpQuestions = fullResponse.includes('QUICK_REPLIES:');
        const hasNextMessage = fullResponse.includes('NEXT_MESSAGE:');
        const hasUnicodeMarker = fullResponse.includes('␞');

        if (!hasFollowUpQuestions || !hasNextMessage) {
          console.error('[Welcome] 🚨 CRITICAL ERROR: AI response missing required metadata!');
          console.error('[Welcome]   - QUICK_REPLIES present:', hasFollowUpQuestions);
          console.error('[Welcome]   - NEXT_MESSAGE present:', hasNextMessage);
          console.error('[Welcome]   - Unicode marker present:', hasUnicodeMarker);
          console.error('[Welcome]   - Last 200 chars of response:', fullResponse.slice(-200));
          console.error('[Welcome] ⚠️  User will see NO suggested replies for this message!');
        } else {
          console.log('[Welcome] ✅ Response includes QUICK_REPLIES and NEXT_MESSAGE');
        }

        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        // Force immediate transmission
        if (res.socket) res.socket.uncork();

        // Track welcome greeting in database
        const userEmail = req.user?.claims?.email;
        const userId = req.user?.claims?.sub;

        if (fullResponse) {
          // Calculate cost using model pricing
          const { calculateChatCost } = await import('./modelPricing');
          const cost = calculateChatCost(preferredModel, tokensIn, tokensOut);

          // Extract metadata
          const userAgent = req.headers['user-agent'] || '';
          let device = 'Desktop';
          if (/mobile/i.test(userAgent)) device = 'Mobile';
          else if (/tablet|ipad/i.test(userAgent)) device = 'Tablet';

          let browser = 'Unknown';
          if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) browser = 'Chrome';
          else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';
          else if (/firefox/i.test(userAgent)) browser = 'Firefox';
          else if (/edg/i.test(userAgent)) browser = 'Edge';

          // Get geolocation for anonymous users
          let city, state, country;
          if (!userId) {
            const ip = req.headers['cf-connecting-ip'] ||
                       req.headers['x-real-ip'] ||
                       req.headers['x-forwarded-for']?.split(',')[0] ||
                       'unknown';

            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 2000);
              const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, {
                signal: controller.signal,
                headers: { 'User-Agent': 'Kull Support Chat' }
              });
              clearTimeout(timeoutId);
              if (geoRes.ok) {
                const geoData = await geoRes.json();
                city = geoData.city;
                state = geoData.region;
                country = geoData.country_name;
              }
            } catch (e) {
              // Silently fail geolocation
            }
          }

          // 🔐 LAYER 2: Backend Deduplication Check
          const dedupCheck = isResponseDuplicate(sessionId, fullResponse);
          if (dedupCheck.isDuplicate) {
            console.log(`[Dedup Layer 2] Skipping duplicate welcome greeting for session ${sessionId}`);
          } else {
            await storage.trackSupportQuery({
              sessionId,
              userEmail,
              userId,
              userMessage: '[Welcome Greeting - No User Message]',
              aiResponse: fullResponse,
              fullPrompt: fullContextMarkdown,
              tokensIn,
              tokensOut,
              cachedTokensIn,
              cost: cost.toString(),
              model: preferredModel,
              device,
              browser,
              city,
              state,
              country,
              sessionLength: 0,
            });
          }

          // Initialize conversation state for new session with welcome message
          if (fullResponse && sessionId) {
            const { updateStateAfterInteraction } = await import('./conversationStateManager');
            const initialState = {
              questionsAsked: [],
              questionsAnswered: [],
              currentStep: 1,
              offTopicCount: 0
            };
            const updatedState = updateStateAfterInteraction(initialState, '', fullResponse);
            await storage.updateConversationState(sessionId, updatedState);

            console.log(`[Welcome State] Session ${sessionId} - Step: ${updatedState.currentStep}/15, Questions asked: ${updatedState.questionsAsked.length}`);
          }

          // Broadcast to admin panels for live updates
          const { getGlobalWsService } = await import('./websocket');
          const wsService = getGlobalWsService();
          if (wsService && sessionId) {
            wsService.broadcastToAdmins({
              type: 'ADMIN_SESSION_UPDATE',
              data: {
                sessionId,
                userId,
                userEmail,
                action: 'new_message',
              },
              timestamp: Date.now(),
              deviceId: 'server',
              userId,
            });
          }
        }

        res.end();
      } catch (streamError) {
        console.error('[Welcome] Error processing stream:', streamError);
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream processing error' })}\n\n`);
        // Force immediate transmission
        if (res.socket) res.socket.uncork();
        res.end();
      }
    } catch (error: any) {
      console.error("Error generating welcome greeting:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate greeting" });
      }
    }
  });

  // Send chat transcript via email after inactivity
  app.post('/api/chat/send-transcript', async (req: any, res) => {
    try {
      const { messages, userEmail } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: "Messages are required" });
      }

      if (!userEmail || typeof userEmail !== 'string') {
        return res.status(400).json({ message: "User email is required" });
      }

      const { emailTemplates } = await import('./emailTemplates');
      const transcriptEmail = emailTemplates.chatTranscript(userEmail, messages);
      
      // Send email to user with BCC to steve@lander.media using SendGrid directly
      const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
      if (!SENDGRID_API_KEY) {
        throw new Error('SENDGRID_API_KEY is not configured');
      }

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: userEmail }],
              bcc: [{ email: 'steve@lander.media' }],
            },
          ],
          from: {
            email: 'steve@kullai.com',
            name: 'Steve Moraco, Founder',
          },
          subject: transcriptEmail.subject,
          content: [
            {
              type: 'text/plain',
              value: transcriptEmail.text,
            },
            {
              type: 'text/html',
              value: transcriptEmail.html,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SendGrid error: ${errorText}`);
      }


      res.json({ success: true, message: 'Transcript sent successfully' });
    } catch (error: any) {
      console.error("Error sending chat transcript:", error);
      res.status(500).json({ message: "Failed to send transcript: " + error.message });
    }
  });

  // Chat session persistence endpoints
  app.post('/api/chat/sessions', async (req: any, res) => {
    try {
      const { sessions, metadata, calculatorData } = req.body;

      if (!sessions || !Array.isArray(sessions)) {
        return res.status(400).json({ message: "Sessions array required" });
      }

      const userId = req.user?.claims?.sub || null;
      const userEmail = req.user?.claims?.email || null;

      // Extract IP address for anonymous session association
      const ipAddress = req.headers['cf-connecting-ip'] ||
                       req.headers['x-real-ip'] ||
                       req.headers['x-forwarded-for']?.split(',')[0] ||
                       req.connection?.remoteAddress ||
                       req.socket?.remoteAddress ||
                       null;

      const savedSessions = [];

      for (const session of sessions) {
        const chatSession = {
          id: session.id,
          userId: userId,
          userEmail: userEmail,
          title: session.title,
          messages: JSON.stringify(session.messages),
          ipAddress: ipAddress,
          device: metadata?.device || null,
          browser: metadata?.browser || null,
          city: metadata?.city || null,
          state: metadata?.state || null,
          country: metadata?.country || null,
          calculatorData: calculatorData || session.calculatorData || null,
          lastQuickReplies: session.lastQuickReplies || null,
          lastNextMessageSeconds: session.lastNextMessageSeconds || null,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
        };

        const saved = await storage.saveChatSession(chatSession);
        savedSessions.push(saved);
      }

      res.json({ success: true, count: savedSessions.length });
    } catch (error: any) {
      console.error("Error saving chat sessions:", error);
      res.status(500).json({ message: "Failed to save sessions: " + error.message });
    }
  });

  app.get('/api/chat/sessions', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || null;
      
      const sessions = await storage.getChatSessions(userId);
      
      const formattedSessions = sessions.map(session => ({
        id: session.id,
        title: session.title,
        messages: JSON.parse(session.messages),
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      }));

      res.json(formattedSessions);
    } catch (error: any) {
      console.error("Error loading chat sessions:", error);
      res.status(500).json({ message: "Failed to load sessions: " + error.message });
    }
  });

  app.delete('/api/chat/sessions/:id', async (req: any, res) => {
    try {
      const { id } = req.params;
      
      await storage.deleteChatSession(id);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting chat session:", error);
      res.status(500).json({ message: "Failed to delete session: " + error.message });
    }
  });

  // Helper function to calculate session length bucket
  const getSessionLengthBucket = (durationMinutes: number): string => {
    if (durationMinutes < 1) return '0-1min';
    else if (durationMinutes < 5) return '1-5min';
    else if (durationMinutes < 15) return '5-15min';
    else if (durationMinutes < 30) return '15-30min';
    else return '30min+';
  };

  // Helper function to generate consistent user keys
  // For registered users: returns userId
  // For anonymous users: returns composite key from metadata (device, browser, location)
  // NOTE: Session length is NOT part of the key to ensure matching across queries and sessions
  const generateUserKey = (data: any): string => {
    if (data.userId) {
      return data.userId; // Registered users: use userId
    }

    // Anonymous users: generate composite key from metadata only
    // Session length is excluded from key to prevent matching issues
    const parts = [
      data.device || 'Unknown Device',
      data.browser || 'Unknown Browser',
      data.city || '',
      data.state || '',
      data.country || 'Unknown Location',
    ].filter(Boolean);

    return `anon_${parts.join('_').replace(/\s+/g, '_')}`;
  };

  // Debug endpoint to check database contents
  app.get('/api/admin/debug/database', isAuthenticated, async (req: any, res) => {
    try {
      const allSessions = await storage.getChatSessions();
      const allUsers = await db.select().from(users);
      const allQueries = await db.select().from(supportQueries);

      res.json({
        sessionsCount: allSessions.length,
        sessions: allSessions.map(s => ({
          id: s.id,
          userId: s.userId,
          ipAddress: s.ipAddress,
          title: s.title,
          messageCount: JSON.parse(s.messages).length,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })),
        usersCount: allUsers.length,
        queriesCount: allQueries.length,
      });
    } catch (error: any) {
      console.error("Error in debug endpoint:", error);
      res.status(500).json({ message: "Failed: " + error.message });
    }
  });

  // Admin endpoints for global settings
  app.get('/api/admin/settings', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { key } = req.query;

      if (key) {
        // Get specific setting
        const value = await storage.getGlobalSetting(key as string);
        res.json({ key, value });
      } else {
        // Get all settings
        const settings = await storage.getAllGlobalSettings();
        res.json(settings);
      }
    } catch (error: any) {
      console.error("Error getting settings:", error);
      res.status(500).json({ message: "Failed to get settings: " + error.message });
    }
  });

  app.post('/api/admin/settings', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { key, value } = req.body;
      const userId = req.user.claims.sub;

      if (!key || !value) {
        return res.status(400).json({ message: "Key and value are required" });
      }

      const setting = await storage.setGlobalSetting(key, value, userId);
      console.log(`[Admin] Setting updated by ${userId}: ${key} = ${value}`);

      res.json(setting);
    } catch (error: any) {
      console.error("Error setting setting:", error);
      res.status(500).json({ message: "Failed to save setting: " + error.message });
    }
  });

  // Admin endpoint to get all unique chat users with aggregated stats
  app.get('/api/admin/chat-users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allSessions = await storage.getChatSessions();

      // Get all users to map userId to email/name
      const allUsers = await db
        .select()
        .from(users);

      const userMap: Map<string, User> = new Map(allUsers.map((u: User) => [u.id, u]));

      // Get all support queries for cost tracking
      const allQueries = await db
        .select()
        .from(supportQueries)
        .orderBy(desc(supportQueries.createdAt));

      // Group sessions by user (userId or metadata composite for anonymous)
      const chatUserMap = new Map<string, any>();

      allSessions.forEach(session => {
        const messages = JSON.parse(session.messages);
        const isAnonymous = !session.userId;

        // Use helper to generate consistent user key
        const userKey = generateUserKey(session);

        // Generate display name
        let displayName: string;
        if (session.userId) {
          const userDetails: User | undefined = userMap.get(session.userId);
          displayName = userDetails?.email || `User ${session.userId}`;
        } else {
          // For anonymous users, create display name from metadata + session length
          // Calculate session length for display
          const sessionStart = new Date(session.createdAt).getTime();
          const sessionEnd = new Date(session.updatedAt).getTime();
          const durationMinutes = (sessionEnd - sessionStart) / 1000 / 60;
          const sessionLengthLabel = getSessionLengthBucket(durationMinutes);

          const parts = [
            session.device || 'Unknown Device',
            session.browser || 'Unknown Browser',
            session.city || '',
            session.state || '',
            session.country || 'Unknown Location',
            `(${sessionLengthLabel})`
          ].filter(Boolean);
          displayName = parts.join(' • ');
        }

        // Silent processing - only log errors

        // Get user details if logged in
        const userDetails = session.userId ? userMap.get(session.userId) : null;

        if (!chatUserMap.has(userKey)) {
          chatUserMap.set(userKey, {
            userKey,
            userId: session.userId,
            userEmail: userDetails?.email || null,
            userName: userDetails ? `${userDetails.firstName || ''} ${userDetails.lastName || ''}`.trim() || null : null,
            displayName,
            ipAddress: session.ipAddress,
            isAnonymous,
            sessions: [],
            totalMessages: 0,
            totalCost: 0,
            totalTokensIn: 0,
            totalTokensOut: 0,
            totalCachedTokensIn: 0,
            queryCount: 0,
            lastActivity: session.updatedAt,
            location: {
              city: session.city,
              state: session.state,
              country: session.country,
            },
            device: session.device,
            browser: session.browser,
          });
        }

        const chatUser = chatUserMap.get(userKey)!;
        chatUser.sessions.push(session.id);
        chatUser.totalMessages += messages.length;

        // Update last activity if this session is more recent
        if (new Date(session.updatedAt) > new Date(chatUser.lastActivity)) {
          chatUser.lastActivity = session.updatedAt;
          chatUser.location = {
            city: session.city,
            state: session.state,
            country: session.country,
          };
          chatUser.device = session.device;
          chatUser.browser = session.browser;
          chatUser.ipAddress = session.ipAddress; // Keep IP address updated for anonymous users
        }
      });

      // Create sessionId -> userKey mapping for direct lookup
      const sessionIdToUserKey = new Map<string, string>();
      allSessions.forEach(session => {
        const userKey = generateUserKey(session);
        sessionIdToUserKey.set(session.id, userKey);
      });
      // Silent aggregation - only log summary

      // Aggregate costs and tokens per user from support queries
      let matchedBySessionId = 0;
      let matchedByTemporal = 0;
      let matchedByEmail = 0;
      let matchedByComposite = 0;
      let unmatchedQueries = 0;
      allQueries.forEach((query: any) => {
        // Priority matching order:
        // 1. Direct sessionId match (most accurate)
        // 2. Temporal match for logged-in users (userId + ±5min window)
        // 3. Email match for logged-in users without userId
        // 4. Device fingerprint match for anonymous users (fallback)
        let userKey: string;
        let matchType: string;

        if (query.sessionId && sessionIdToUserKey.has(query.sessionId)) {
          // Direct sessionId match - highest priority
          userKey = sessionIdToUserKey.get(query.sessionId)!;
          matchType = 'sessionId';
          matchedBySessionId++;
        } else if (query.userId) {
          // Temporal matching for logged-in users without sessionId
          // Find session with matching userId within ±5 minute window
          const queryTime = new Date(query.createdAt).getTime();
          const TIME_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds

          const matchedSession = allSessions.find(session => {
            if (session.userId !== query.userId) return false;

            const sessionStart = new Date(session.createdAt).getTime();
            const sessionEnd = new Date(session.updatedAt).getTime();

            // Query time is within session timeframe OR within ±5min of session boundaries
            const withinSession = queryTime >= sessionStart && queryTime <= sessionEnd;
            const nearStart = Math.abs(queryTime - sessionStart) <= TIME_WINDOW;
            const nearEnd = Math.abs(queryTime - sessionEnd) <= TIME_WINDOW;

            return withinSession || nearStart || nearEnd;
          });

          if (matchedSession) {
            userKey = generateUserKey(matchedSession);
            matchType = 'temporal';
            matchedByTemporal++;
          } else {
            // No temporal match found, use userId directly
            userKey = query.userId;
            matchType = 'userId-fallback';
            matchedByComposite++;
          }
        } else if (query.userEmail && !query.userId) {
          // Email match for logged-in users
          const matchedUser = Array.from(chatUserMap.values()).find(u => u.userEmail === query.userEmail);
          userKey = matchedUser?.userKey || generateUserKey(query);
          matchType = matchedUser ? 'email' : 'composite-fallback';
          if (matchedUser) matchedByEmail++;
          else matchedByComposite++;
        } else {
          // Fallback to device fingerprint for anonymous users
          userKey = generateUserKey(query);
          matchType = 'fingerprint';
          matchedByComposite++;
        }

        if (chatUserMap.has(userKey)) {
          const chatUser = chatUserMap.get(userKey)!;
          chatUser.totalCost += parseFloat(query.cost as any) || 0;
          chatUser.totalTokensIn = (chatUser.totalTokensIn || 0) + (query.tokensIn || 0);
          chatUser.totalTokensOut = (chatUser.totalTokensOut || 0) + (query.tokensOut || 0);
          chatUser.totalCachedTokensIn = (chatUser.totalCachedTokensIn || 0) + (query.cachedTokensIn || 0);
          chatUser.queryCount = (chatUser.queryCount || 0) + 1;
        } else {
          unmatchedQueries++;
        }
      });

      // Convert to array and sort by last activity
      const chatUsers = Array.from(chatUserMap.values()).map(user => {
        const totalMessages = user.totalMessages || 1; // Avoid division by zero
        const totalTokensIn = user.totalTokensIn || 0;
        const totalCachedTokensIn = user.totalCachedTokensIn || 0;
        const totalNewTokensIn = totalTokensIn - totalCachedTokensIn;
        const cacheHitRate = totalTokensIn > 0 ? Math.round((totalCachedTokensIn / totalTokensIn) * 100) : 0;

        return {
          ...user,
          sessionCount: user.sessions.length,
          totalCost: user.totalCost.toFixed(4),
          avgCostPerMessage: (user.totalCost / totalMessages).toFixed(6),
          avgTokensIn: Math.round(totalTokensIn / totalMessages),
          avgTokensOut: Math.round((user.totalTokensOut || 0) / totalMessages),
          avgCachedTokensIn: Math.round(totalCachedTokensIn / totalMessages),
          avgNewTokensIn: Math.round(totalNewTokensIn / totalMessages),
          totalTokensIn,
          totalTokensOut: user.totalTokensOut || 0,
          totalCachedTokensIn,
          totalNewTokensIn,
          cacheHitRate,
        };
      }).sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

      // Summary log - concise
      console.log(`[Admin] Chat Users: ${chatUsers.length} users, ${allSessions.length} sessions, ${allQueries.length} queries`);
      res.json(chatUsers);
    } catch (error: any) {
      console.error("Error getting chat users:", error);
      res.status(500).json({ message: "Failed to get chat users: " + error.message });
    }
  });

  // Admin endpoint to get all sessions for a specific user
  app.get('/api/admin/chat-users/:userKey/sessions', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userKey } = req.params;
      const allSessions = await storage.getChatSessions();

      // Get all support queries for cost tracking
      const allQueries = await db
        .select()
        .from(supportQueries)
        .orderBy(desc(supportQueries.createdAt));

      // Filter sessions for this user using the same key generation logic
      const userSessions = allSessions.filter(session => {
        const sessionKey = generateUserKey(session);
        return sessionKey === userKey;
      });

      // Format with stats and cost data
      const sessionsWithStats = userSessions.map(session => {
        const messages = JSON.parse(session.messages);
        const userMessages = messages.filter((m: any) => m.role === 'user');
        const assistantMessages = messages.filter((m: any) => m.role === 'assistant');

        // Calculate duration
        const firstTimestamp = messages.length > 0 ? new Date(messages[0].timestamp) : new Date(session.createdAt);
        const lastTimestamp = messages.length > 0 ? new Date(messages[messages.length - 1].timestamp) : new Date(session.updatedAt);
        const durationMinutes = Math.round((lastTimestamp.getTime() - firstTimestamp.getTime()) / 60000);

        // Calculate cost and token stats for this session by matching queries within time range
        const matchingQueries = allQueries.filter((q: any) => {
          const queryTime = new Date(q.createdAt);
          const matchesUser = q.userId === session.userId ||
                             (session.userEmail && q.userEmail === session.userEmail);
          const withinTimeRange = queryTime >= new Date(session.createdAt) &&
                                 queryTime <= new Date(session.updatedAt);
          return matchesUser && withinTimeRange;
        });

        const sessionCost = matchingQueries.reduce((sum: number, q: any) => sum + (parseFloat(q.cost as any) || 0), 0);
        const sessionTokensIn = matchingQueries.reduce((sum: number, q: any) => sum + (q.tokensIn || 0), 0);
        const sessionCachedTokensIn = matchingQueries.reduce((sum: number, q: any) => sum + (q.cachedTokensIn || 0), 0);
        const sessionNewTokensIn = sessionTokensIn - sessionCachedTokensIn;
        const sessionCacheHitRate = sessionTokensIn > 0
          ? Math.round((sessionCachedTokensIn / sessionTokensIn) * 100)
          : 0;

        return {
          id: session.id,
          title: session.title,
          userId: session.userId,
          userEmail: session.userEmail,
          ipAddress: session.ipAddress,
          messageCount: messages.length,
          userMessageCount: userMessages.length,
          assistantMessageCount: assistantMessages.length,
          durationMinutes,
          totalCost: sessionCost.toFixed(4),
          scriptStep: session.scriptStep,
          totalTokensIn: sessionTokensIn,
          totalCachedTokensIn: sessionCachedTokensIn,
          totalNewTokensIn: sessionNewTokensIn,
          cacheHitRate: sessionCacheHitRate,
          device: session.device,
          browser: session.browser,
          city: session.city,
          state: session.state,
          country: session.country,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          firstMessage: userMessages.length > 0 ? userMessages[0].content.slice(0, 100) : null,
        };
      }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      console.log(`[Admin] Retrieved ${sessionsWithStats.length} sessions for user ${userKey}`);
      res.json(sessionsWithStats);
    } catch (error: any) {
      console.error("Error getting user sessions:", error);
      res.status(500).json({ message: "Failed to get user sessions: " + error.message });
    }
  });

  // Admin endpoint to get all chat sessions with stats
  app.get('/api/admin/chat-sessions', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Get all chat sessions from database
      const allSessions = await storage.getChatSessions();
      
      // Format with stats
      const sessionsWithStats = allSessions.map(session => {
        const messages = JSON.parse(session.messages);
        const userMessages = messages.filter((m: any) => m.role === 'user');
        const assistantMessages = messages.filter((m: any) => m.role === 'assistant');
        
        return {
          id: session.id,
          title: session.title,
          userId: session.userId,
          messageCount: messages.length,
          userMessageCount: userMessages.length,
          assistantMessageCount: assistantMessages.length,
          device: session.device,
          browser: session.browser,
          city: session.city,
          state: session.state,
          country: session.country,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          firstMessage: userMessages.length > 0 ? userMessages[0].content.slice(0, 100) : null,
        };
      });

      console.log(`[Admin] Retrieved ${sessionsWithStats.length} chat sessions`);
      res.json(sessionsWithStats);
    } catch (error: any) {
      console.error("Error getting all chat sessions:", error);
      res.status(500).json({ message: "Failed to get chat sessions: " + error.message });
    }
  });

  // Admin endpoint to get full chat session details with prompts and costs
  app.get('/api/admin/chat-sessions/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const sessions = await storage.getChatSessions();
      const session = sessions.find(s => s.id === id);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Get all support queries for this session's time range
      const allQueries = await db
        .select()
        .from(supportQueries)
        .orderBy(desc(supportQueries.createdAt));

      const messages = JSON.parse(session.messages);

      // Enhance each message with full prompt and cost data
      const enrichedMessages = messages.map((msg: any) => {
        // For assistant messages, try to find matching query
        if (msg.role === 'assistant') {
          const msgTime = new Date(msg.timestamp);

          // Find query that matches this assistant response
          // Match by: user, time proximity (within 30 seconds), and response content
          const matchingQuery = allQueries.find((q: any) => {
            const queryTime = new Date(q.createdAt);
            const timeDiff = Math.abs(queryTime.getTime() - msgTime.getTime());
            const matchesUser = q.userId === session.userId ||
                               (session.userEmail && q.userEmail === session.userEmail);
            const withinTimeWindow = timeDiff < 30000; // 30 seconds
            const matchesResponse = q.aiResponse === msg.content ||
                                   q.aiResponse.includes(msg.content.slice(0, 100));

            return matchesUser && withinTimeWindow && matchesResponse;
          });

          if (matchingQuery) {
            const tokensIn = matchingQuery.tokensIn || 0;
            const cachedTokensIn = matchingQuery.cachedTokensIn || 0;
            const newTokensIn = tokensIn - cachedTokensIn;
            const cacheHitRate = tokensIn > 0 ? Math.round((cachedTokensIn / tokensIn) * 100) : 0;

            return {
              ...msg,
              tokensIn,
              tokensOut: matchingQuery.tokensOut,
              cachedTokensIn,
              newTokensIn,
              cacheHitRate,
              cost: matchingQuery.cost,
              model: matchingQuery.model,
              fullPrompt: matchingQuery.fullPrompt,
              userMessage: matchingQuery.userMessage,
            };
          }
        }

        return msg;
      });

      // Calculate total cost and token stats for session
      const totalCost = enrichedMessages
        .filter((m: any) => m.cost)
        .reduce((sum: number, m: any) => sum + (parseFloat(m.cost as any) || 0), 0);

      const totalTokensIn = enrichedMessages
        .filter((m: any) => m.tokensIn)
        .reduce((sum: number, m: any) => sum + (m.tokensIn || 0), 0);

      const totalCachedTokensIn = enrichedMessages
        .filter((m: any) => m.cachedTokensIn)
        .reduce((sum: number, m: any) => sum + (m.cachedTokensIn || 0), 0);

      const totalNewTokensIn = totalTokensIn - totalCachedTokensIn;
      const sessionCacheHitRate = totalTokensIn > 0
        ? Math.round((totalCachedTokensIn / totalTokensIn) * 100)
        : 0;

      res.json({
        ...session,
        messages: enrichedMessages,
        totalCost: totalCost.toFixed(4),
        totalTokensIn,
        totalCachedTokensIn,
        totalNewTokensIn,
        cacheHitRate: sessionCacheHitRate,
      });
    } catch (error: any) {
      console.error("Error getting chat session details:", error);
      res.status(500).json({ message: "Failed to get session details: " + error.message });
    }
  });

  // Referral endpoints
  app.post('/api/referrals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { referredEmail } = req.body;

      if (!referredEmail || !referredEmail.includes('@')) {
        return res.status(400).json({ message: "Valid email required" });
      }

      // Check if user already has 10 referrals
      const existingReferrals = await storage.getUserReferrals(userId);
      if (existingReferrals.length >= 10) {
        return res.status(400).json({ message: "Maximum 10 referrals reached" });
      }

      // Check for duplicate email
      const duplicate = existingReferrals.find(r => r.referredEmail === referredEmail);
      if (duplicate) {
        return res.status(400).json({ message: "Email already referred" });
      }

      // Create referral first
      const referral = await storage.createReferral({
        referrerId: userId,
        referredEmail,
      });

      // Send referral invitation email (don't block referral creation if this fails)
      try {
        const referrerUser = await storage.getUser(userId);
        const { sendEmail } = await import('./emailService');
        const { emailTemplates } = await import('./emailTemplates');
        
        const referrerName = referrerUser 
          ? `${referrerUser.firstName || 'A fellow photographer'} ${referrerUser.lastName || ''}`.trim()
          : 'A fellow photographer';
        const referrerEmail = referrerUser?.email || '';
        
        const emailTemplate = emailTemplates.referralInvitation(referrerName, referrerEmail, referredEmail);
        
        await sendEmail({
          to: referredEmail,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text
        });
      } catch (emailError) {
        console.error("Failed to send referral email:", emailError);
        // Don't fail the referral creation if email fails
      }

      res.json(referral);
    } catch (error: any) {
      console.error("Error creating referral:", error);
      res.status(500).json({ message: "Failed to create referral: " + error.message });
    }
  });

  app.get('/api/referrals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const referrals = await storage.getUserReferrals(userId);
      res.json(referrals);
    } catch (error: any) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ message: "Failed to fetch referrals: " + error.message });
    }
  });

  app.delete('/api/referrals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const referralId = req.params.id;

      // Get the referral to verify ownership
      const referrals = await storage.getUserReferrals(userId);
      const referral = referrals.find(r => r.id === referralId);

      if (!referral) {
        return res.status(404).json({ message: "Referral not found" });
      }

      // Delete the referral
      await storage.deleteReferral(referralId);

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting referral:", error);
      res.status(500).json({ message: "Failed to delete referral: " + error.message });
    }
  });

  // Send referral confirmation email (called after all referrals are sent)
  app.post('/api/referrals/confirm', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { referredEmails } = req.body;

      if (!referredEmails || !Array.isArray(referredEmails) || referredEmails.length === 0) {
        return res.status(400).json({ message: "Referred emails array required" });
      }

      const referrerUser = await storage.getUser(userId);
      if (!referrerUser || !referrerUser.email) {
        return res.status(400).json({ message: "User not found" });
      }

      const allReferrals = await storage.getUserReferrals(userId);
      const totalSent = allReferrals.length;
      const totalCompleted = allReferrals.filter(r => r.status === 'completed').length;

      // Calculate unlocked and potential rewards
      const unlockedRewards: string[] = [];
      const potentialRewards: string[] = [];

      if (totalSent >= 3) unlockedRewards.push("1 month free");
      if (totalSent >= 5) unlockedRewards.push("Priority support");
      if (totalSent >= 10 || totalCompleted >= 3) unlockedRewards.push("3 months free");

      // Calculate potential rewards if the newly invited users subscribe
      const potentialTotal = totalSent + referredEmails.length;
      if (totalSent < 3 && potentialTotal >= 3) potentialRewards.push("1 month free");
      if (totalSent < 5 && potentialTotal >= 5) potentialRewards.push("Priority support");
      if (totalSent < 10 && potentialTotal >= 10) potentialRewards.push("3 months free");

      const { sendEmail } = await import('./emailService');
      const { emailTemplates } = await import('./emailTemplates');
      
      const confirmationEmail = emailTemplates.referralConfirmation(
        referrerUser,
        referredEmails,
        unlockedRewards,
        potentialRewards
      );

      await sendEmail({
        to: referrerUser.email,
        subject: confirmationEmail.subject,
        html: confirmationEmail.html,
        text: confirmationEmail.text,
      });

      res.json({ success: true, message: "Confirmation email sent" });
    } catch (error: any) {
      console.error("Error sending referral confirmation:", error);
      res.status(500).json({ message: "Failed to send confirmation: " + error.message });
    }
  });

  // Visit tracking endpoint (public)
  app.post('/api/track/visit', async (req: any, res) => {
    try {
      const { page, sessionId, referrer, userAgent } = req.body;
      const userId = req.user?.claims?.sub; // Optional, only if logged in

      await storage.trackVisit({
        page: page || 'home',
        sessionId,
        userId,
        referrer,
        userAgent,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error tracking visit:", error);
      res.status(500).json({ message: "Failed to track visit: " + error.message });
    }
  });

  // Admin endpoints (restricted to steve@lander.media)
  app.get('/api/admin/analytics', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { timerange = 'all' } = req.query;

      // Calculate date range based on timerange parameter
      let startDate: Date | undefined;
      const endDate = new Date();

      switch (timerange) {
        case '24h':
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
        default:
          startDate = undefined;
          break;
      }

      const allUsers = await storage.getAllUsers();
      const allReferrals = await storage.getAllReferrals();

      // Filter users by date range if specified
      const filteredUsers = startDate
        ? allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= startDate!)
        : allUsers;

      const totalUsers = filteredUsers.length;
      const usersWithTrial = filteredUsers.filter(u => {
        if (!u.trialStartedAt) return false;
        return !startDate || new Date(u.trialStartedAt) >= startDate;
      }).length;
      const usersWithSubscription = filteredUsers.filter(u => {
        if (!u.stripeSubscriptionId) return false;
        // If user has trialConvertedAt, use that; otherwise use createdAt as fallback
        const conversionDate = u.trialConvertedAt || u.createdAt;
        return !startDate || (conversionDate && new Date(conversionDate) >= startDate);
      }).length;

      const totalReferrers = new Set(allReferrals.map(r => r.referrerId)).size;
      const totalReferralsSent = allReferrals.length;
      const totalReferralsCompleted = allReferrals.filter(r => r.status === 'completed').length;

      // Get visit count for the timerange
      const totalVisits = await storage.getVisitCount(startDate, endDate);
      const bounceRate = await storage.getBounceRate(startDate, endDate);

      // Calculate conversion rates
      const trialConversionRate = usersWithTrial > 0 ? (usersWithSubscription / usersWithTrial * 100) : 0;
      const signupToTrialRate = totalUsers > 0 ? (usersWithTrial / totalUsers * 100) : 0;
      const visitToSignupRate = totalVisits > 0 ? (totalUsers / totalVisits * 100) : 0;
      const visitToCheckoutRate = totalVisits > 0 ? (usersWithTrial / totalVisits * 100) : 0;

      res.json({
        totalUsers,
        usersWithTrial,
        usersWithSubscription,
        totalReferrers,
        totalReferralsSent,
        totalReferralsCompleted,
        totalVisits,
        bounceRate: Math.round(bounceRate * 10) / 10,
        trialConversionRate: Math.round(trialConversionRate * 10) / 10,
        signupToTrialRate: Math.round(signupToTrialRate * 10) / 10,
        visitToSignupRate: Math.round(visitToSignupRate * 10) / 10,
        visitToCheckoutRate: Math.round(visitToCheckoutRate * 10) / 10,
      });
    } catch (error: any) {
      console.error("Error fetching admin analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics: " + error.message });
    }
  });

  app.get('/api/admin/support-analytics', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { timerange = 'all', days = 30 } = req.query;

      // Calculate date range based on timerange parameter
      let startDate: Date | undefined;
      const endDate = new Date();

      switch (timerange) {
        case '24h':
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
        default:
          startDate = undefined;
          break;
      }

      // Get support query stats
      const stats = await storage.getSupportQueryStats(startDate, endDate);

      // Get time series data for chart
      const overTime = await storage.getSupportQueriesOverTime(parseInt(days as string) || 30);

      res.json({
        totalQueries: stats.totalQueries,
        totalCost: stats.totalCost,
        queriesByEmail: stats.queriesByEmail,
        overTime,
      });
    } catch (error: any) {
      console.error("Error fetching support analytics:", error);
      res.status(500).json({ message: "Failed to fetch support analytics: " + error.message });
    }
  });

  app.get('/api/admin/support-queries/:email', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { email } = req.params;
      const queries = await storage.getSupportQueriesByEmail(email);
      res.json(queries);
    } catch (error: any) {
      console.error("Error fetching support queries by email:", error);
      res.status(500).json({ message: "Failed to fetch support queries: " + error.message });
    }
  });

  // 🔐 LAYER 4: Admin endpoint to view deduplication statistics
  app.get('/api/admin/deduplication-stats', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const duplicateRate = deduplicationStats.totalChecks > 0
        ? ((deduplicationStats.duplicatesBlocked / deduplicationStats.totalChecks) * 100).toFixed(2)
        : '0.00';

      res.json({
        totalChecks: deduplicationStats.totalChecks,
        duplicatesBlocked: deduplicationStats.duplicatesBlocked,
        duplicateRate: `${duplicateRate}%`,
        cacheSize: recentMessageCache.size,
        lastDuplicate: deduplicationStats.lastDuplicate
          ? {
              ...deduplicationStats.lastDuplicate,
              age: `${Math.round((Date.now() - deduplicationStats.lastDuplicate.timestamp) / 1000)}s ago`,
            }
          : null,
      });
    } catch (error: any) {
      console.error("Error fetching deduplication stats:", error);
      res.status(500).json({ message: "Failed to fetch deduplication stats: " + error.message });
    }
  });

  // Admin endpoint to view calculator data from chat sessions
  app.get('/api/admin/calculator-data', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allSessions = await storage.getChatSessions();

      // Filter sessions that have calculator data and enrich with user info
      const sessionsWithCalculator = allSessions
        .filter(session => session.calculatorData)
        .map(session => {
          const calc = session.calculatorData as any;
          const annualShoots = calc.shootsPerWeek * 44;
          const annualHours = calc.shootsPerWeek * calc.hoursPerShoot * 44;
          const annualCost = annualHours * calc.billableRate;
          const weeksSaved = annualHours / 40;

          return {
            sessionId: session.id,
            userId: session.userId,
            userEmail: session.userEmail,
            title: session.title,
            device: session.device,
            browser: session.browser,
            location: `${session.city || ''}, ${session.state || ''} ${session.country || ''}`.trim(),
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            calculatorData: {
              ...calc,
              // Add calculated metrics
              annualShoots,
              annualHours: Math.round(annualHours),
              annualCost: Math.round(annualCost),
              weeksSaved: parseFloat(weeksSaved.toFixed(1)),
            },
          };
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      res.json({
        total: sessionsWithCalculator.length,
        sessions: sessionsWithCalculator,
        summary: {
          averageShootsPerWeek: sessionsWithCalculator.length > 0
            ? (sessionsWithCalculator.reduce((sum, s) => sum + s.calculatorData.shootsPerWeek, 0) / sessionsWithCalculator.length).toFixed(1)
            : 0,
          averageHoursPerShoot: sessionsWithCalculator.length > 0
            ? (sessionsWithCalculator.reduce((sum, s) => sum + s.calculatorData.hoursPerShoot, 0) / sessionsWithCalculator.length).toFixed(1)
            : 0,
          averageBillableRate: sessionsWithCalculator.length > 0
            ? Math.round(sessionsWithCalculator.reduce((sum, s) => sum + s.calculatorData.billableRate, 0) / sessionsWithCalculator.length)
            : 0,
          manuallyAdjustedCount: sessionsWithCalculator.filter(s => s.calculatorData.hasManuallyAdjusted).length,
          clickedPresetCount: sessionsWithCalculator.filter(s => s.calculatorData.hasClickedPreset).length,
        },
      });
    } catch (error: any) {
      console.error("Error fetching calculator data:", error);
      res.status(500).json({ message: "Failed to fetch calculator data: " + error.message });
    }
  });

  app.post('/api/admin/test-email', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { templateName, testEmail } = req.body;

      if (!templateName || !testEmail) {
        return res.status(400).json({ message: "Template name and test email required" });
      }

      const { sendEmail } = await import('./emailService');
      const { emailTemplates } = await import('./emailTemplates');

      // Create a test user object
      const now = new Date();
      const testUser = {
        id: 'test-user-id',
        email: testEmail,
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: null,
        createdAt: now,
        updatedAt: now,
        offerExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        specialOfferExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        trialStartedAt: now,
        trialEndsAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        trialConvertedAt: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePaymentMethodId: null,
        stripeSetupIntentId: null,
        subscriptionTier: 'professional' as const,
        subscriptionBilling: 'annual' as const,
        subscriptionStatus: 'trial' as const,
        appInstalledAt: null,
        referralRewardsEarned: [],
        folderCatalog: null,
        preferredChatModel: null,
      };

      let emailTemplate: any;
      
      switch (templateName) {
        case 'firstLoginWelcome':
          emailTemplate = emailTemplates.firstLoginWelcome(testUser);
          break;
        case 'welcome5min':
          emailTemplate = emailTemplates.welcome5min(testUser);
          break;
        case 'installCheck45min':
          emailTemplate = emailTemplates.installCheck45min(testUser);
          break;
        case 'trialEnding6hr':
          emailTemplate = emailTemplates.trialEnding6hr(testUser);
          break;
        case 'trialEnding1hr':
          emailTemplate = emailTemplates.trialEnding1hr(testUser);
          break;
        case 'drip1_2hr':
          emailTemplate = emailTemplates.drip1_2hr(testUser);
          break;
        case 'drip2_6hr':
          emailTemplate = emailTemplates.drip2_6hr(testUser);
          break;
        case 'drip3_11hr':
          emailTemplate = emailTemplates.drip3_11hr(testUser);
          break;
        case 'drip4_16hr':
          emailTemplate = emailTemplates.drip4_16hr(testUser);
          break;
        case 'drip5_21hr':
          emailTemplate = emailTemplates.drip5_21hr(testUser);
          break;
        case 'referralInvitation':
          emailTemplate = emailTemplates.referralInvitation('Test Referrer', 'referrer@example.com', testEmail);
          break;
        case 'referralConfirmation':
          emailTemplate = emailTemplates.referralConfirmation(testUser, ['friend1@example.com', 'friend2@example.com'], ['1 month free'], ['Priority support']);
          break;
        default:
          return res.status(400).json({ message: "Invalid template name" });
      }

      await sendEmail({
        to: testEmail,
        subject: `[TEST] ${emailTemplate.subject}`,
        html: emailTemplate.html,
        text: emailTemplate.text,
      });

      res.json({ success: true, message: `Test email sent to ${testEmail}` });
    } catch (error: any) {
      console.error("Error sending test email:", error);
      res.status(500).json({ message: "Failed to send test email: " + error.message });
    }
  });

  // Audio transcription endpoint using OpenAI Whisper
  app.post('/api/transcribe', isAuthenticated, async (req: any, res) => {
    try {
      const multer = require('multer');
      const upload = multer({ storage: multer.memoryStorage() });
      
      upload.single('audio')(req, res, async (err: any) => {
        if (err) {
          return res.status(400).json({ message: "Failed to upload audio file" });
        }

        if (!req.file) {
          return res.status(400).json({ message: "No audio file provided" });
        }

        const formData = new FormData();
        const audioBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', 'whisper-1');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('OpenAI transcription failed');
        }

        const data = await response.json();
        res.json({ text: data.text });
      });
    } catch (error: any) {
      console.error("Error transcribing audio:", error);
      res.status(500).json({ 
        message: "Failed to transcribe audio",
        detail: error.message 
      });
    }
  });

  // Request refund endpoint with survey (7-day money-back guarantee)
  app.post('/api/refund/request', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { primaryReason, wouldRecommend, missingFeature, technicalIssues, additionalFeedback } = req.body;
      
      // Validate survey data using schema
      const surveyData: any = {
        userId,
        primaryReason,
        wouldRecommend,
        additionalFeedback,
        refundProcessed: true,
        refundAmount: 0, // Will be updated with actual amount
      };

      // Only include optional fields if they have values
      if (missingFeature) {
        surveyData.missingFeature = missingFeature;
      }
      if (technicalIssues) {
        surveyData.technicalIssues = technicalIssues;
      }

      const surveyValidation = insertRefundSurveySchema.safeParse(surveyData);

      if (!surveyValidation.success) {
        return res.status(400).json({ 
          message: "Survey validation failed",
          detail: "Please answer all required questions before processing your refund.",
          errors: surveyValidation.error.errors,
        });
      }

      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription found" });
      }

      // Get subscription from Stripe
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      // Check if subscription is within 7-day refund window
      const subscriptionStart = new Date(subscription.created * 1000);
      const now = new Date();
      const daysSinceSubscription = (now.getTime() - subscriptionStart.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceSubscription > 7) {
        return res.status(400).json({ 
          message: "Refund window expired",
          detail: "Refunds are only available within 7 days of your first payment. You can still cancel your subscription to prevent future charges."
        });
      }

      // Get the latest invoice
      const invoices = await stripe.invoices.list({
        subscription: user.stripeSubscriptionId,
        limit: 1,
      });

      const invoice = invoices.data[0] as any;
      if (!invoice || !invoice.charge) {
        return res.status(400).json({ message: "No payment found to refund" });
      }

      const charge = typeof invoice.charge === 'string' ? invoice.charge : invoice.charge.id;

      // Create refund
      const refund = await stripe.refunds.create({
        charge,
        reason: 'requested_by_customer',
      });

      // Store survey feedback using validated data
      await storage.createRefundSurvey({
        ...surveyValidation.data,
        refundAmount: refund.amount,
      });

      // Cancel subscription
      await stripe.subscriptions.cancel(user.stripeSubscriptionId);

      // Update user status
      await storage.updateSubscription(userId, user.subscriptionTier || 'professional', 'canceled', user.stripeCustomerId || undefined);

      res.json({
        success: true,
        refund: {
          id: refund.id,
          amount: refund.amount,
          status: refund.status,
        },
        message: "Refund processed successfully. You will see the credit in 5-7 business days."
      });
    } catch (error: any) {
      console.error("Error processing refund:", error);
      res.status(500).json({ 
        message: "Failed to process refund",
        detail: error.message 
      });
    }
  });

  // =============== Kull Prompt Marketplace & Credits APIs ===============
  // List marketplace prompts
  app.get("/api/kull/prompts", isAuthenticated, async (req: any, res) => {
    try {
      const { shootType, search, limit } = req.query as Record<string, string>;
      const presets = await storage.listPromptPresets({
        shootType: shootType || undefined,
        search: search || undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json({ presets });
    } catch (err: any) {
      console.error("list prompts error", err);
      res.status(500).json({ message: "Failed to list prompts" });
    }
  });

  // List my prompts
  app.get("/api/kull/prompts/mine", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const presets = await storage.listUserPrompts(userId);
      res.json({ presets });
    } catch (err: any) {
      console.error("list my prompts error", err);
      res.status(500).json({ message: "Failed to list my prompts" });
    }
  });

  // List saved prompts
  app.get("/api/kull/prompts/saved", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const presets = await storage.listSavedPrompts(userId);
      res.json({ presets });
    } catch (err: any) {
      console.error("list saved prompts error", err);
      res.status(500).json({ message: "Failed to list saved prompts" });
    }
  });

  // Compact cache for offline prompt search on mobile/desktop
  app.get("/api/kull/prompts/cache", isAuthenticated, async (_req: any, res) => {
    try {
      const presets = await storage.listPromptPresets({ limit: 500 });
      const cache = presets.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        summary: p.summary,
        tags: p.tags,
        shootTypes: p.shootTypes,
        aiScore: p.aiScore ?? 0,
        humanScoreAverage: p.humanScoreAverage ?? 0,
        ratingsCount: p.ratingsCount ?? 0,
        updatedAt: p.updatedAt,
      }));
      res.json({ cache, count: cache.length });
    } catch (err: any) {
      console.error("prompt cache error", err);
      res.status(500).json({ message: "Failed to export prompt cache" });
    }
  });

  // Create prompt preset
  app.post("/api/kull/prompts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, summary, instructions, shootTypes, tags, style, shareWithMarketplace } = req.body;
      const user = await storage.getUser(userId);
      if (!user?.email) return res.status(400).json({ message: "User email required" });

      const preset = await storage.createPromptPreset({
        userId,
        userEmail: user.email,
        title,
        summary,
        instructions,
        shootTypes: Array.isArray(shootTypes) ? shootTypes : [],
        tags: Array.isArray(tags) ? tags : [],
        style,
        shareWithMarketplace: Boolean(shareWithMarketplace),
      });
      res.json({ preset });
    } catch (err: any) {
      console.error("create prompt error", err);
      res.status(500).json({ message: "Failed to create prompt" });
    }
  });

  // Vote on prompt (up/down + optional rating/comment)
  app.post("/api/kull/prompts/:id/vote", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { value, rating, comment } = req.body as { value: number; rating?: number; comment?: string };
      const preset = await storage.voteOnPrompt(
        userId,
        id,
        Number(value),
        rating ? Number(rating) : undefined,
        comment,
      );
      res.json({ preset });
    } catch (err: any) {
      console.error("vote prompt error", err);
      res.status(500).json({ message: "Failed to vote" });
    }
  });

  // Toggle save prompt
  app.post("/api/kull/prompts/:id/save", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const saved = await storage.togglePromptSave(userId, id);
      res.json({ saved });
    } catch (err: any) {
      console.error("save prompt error", err);
      res.status(500).json({ message: "Failed to toggle save" });
    }
  });

  // Credits summary for Kull
  app.get("/api/kull/credits/summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const summary = await storage.getCreditSummary(userId);
      res.json(summary);
    } catch (err: any) {
      console.error("credits summary error", err);
      res.status(500).json({ message: "Failed to load credits summary" });
    }
  });

  // List available models/capabilities for Kull clients
  app.get("/api/kull/models", async (_req: any, res) => {
    try {
      const providers = Object.values(getProviderConfig as any)
        ? CREDIT_TOP_UP_PACKAGES // placeholder to keep imports used if getProviderConfig is refactored
        : [];
      res.json({ providers });
    } catch (err: any) {
      console.error("models error", err);
      res.status(500).json({ message: "Failed to list models" });
    }
  });

  // Run OpenAI-based culling orchestrator
  app.post("/api/kull/run/openai", isAuthenticated, async (req: any, res) => {
    try {
      const schema = z.object({
        model: z.string().optional(),
        images: z
          .array(
            z.object({
              id: z.string(),
              url: z.string().url().optional(),
              b64: z.string().optional(),
              filename: z.string().optional(),
              relativePath: z.string().optional(),
            }),
          )
          .min(1),
        prompt: z.string().min(1),
        baseDir: z.string().optional(),
        report: z.boolean().optional(),
        providerOrder: z.array(ProviderIdSchema).optional(),
        allowFallback: z.boolean().optional(),
        shootName: z.string().optional(),
        previewBaseUrl: z.string().optional(),
        heroLimit: z.number().int().min(1).max(25).optional(),
      });

      const {
        model,
        images,
        prompt,
        baseDir,
        report,
        providerOrder,
        allowFallback,
        shootName,
        previewBaseUrl,
        heroLimit,
      } = schema.parse(req.body ?? {});

      const userId = req.user.claims.sub;
      const apiKey = process.env.OPENAI_API_KEY;

      const metadataCache = new Map<string, ParseResult | null>();

      const loadMetadata = async (image: { id: string; url?: string; b64?: string; filename?: string; relativePath?: string }) => {
        if (metadataCache.has(image.id)) return metadataCache.get(image.id) ?? null;
        if (!image.url && !image.b64) {
          metadataCache.set(image.id, null);
          return null;
        }
        try {
          const buffer =
            image.b64 && image.b64.length > 0
              ? Buffer.from(image.b64, "base64")
              : image.url
              ? Buffer.from(await (await fetch(image.url)).arrayBuffer())
              : null;
          if (!buffer) {
            metadataCache.set(image.id, null);
            return null;
          }
          const fallbackName =
            image.filename ??
            (image.relativePath ? path.basename(image.relativePath) : undefined);
          const parsed = await exifGeoService.extractFromBuffer(buffer, { filename: fallbackName });
          metadataCache.set(image.id, parsed);
          return parsed;
        } catch (err) {
          console.warn("metadata extraction failed", err);
          metadataCache.set(image.id, null);
          return null;
        }
      };

      const preparedImages: BatchImagePayload[] = [];
      for (const image of images) {
        const meta = await loadMetadata(image);
        const filename =
          image.filename ??
          (image.relativePath ? path.basename(image.relativePath) : undefined);
        preparedImages.push({
          id: image.id,
          url: image.url,
          b64: image.b64,
          filename,
          metadata: meta?.metadata,
          tags: meta?.tags,
        });
      }

      const orchestrated = await runOrchestratedCulling(storage, {
        userId,
        prompt,
        images: preparedImages,
        providerOrder,
        allowFallback,
        providerOptions: {
          "openai-gpt-5": { apiKey, model },
        },
      });

      const { ratings, creditsCharged, providerId: providerUsed, attempts } = orchestrated;
      let user: Awaited<ReturnType<typeof storage.getUser>> | undefined;
      try {
        user = await storage.getUser(userId);
      } catch (error) {
        console.warn("failed to load user for notifications", error);
      }
      // optionally write XMP sidecars if baseDir provided
      let sidecars: any[] = [];
      if (baseDir) {
        sidecars = await writeSidecars(
          baseDir,
          ratings.map((r: any) => ({
            imageId: r.imageId || r.filename || "",
            filename: r.filename,
            starRating: r.starRating,
            colorLabel: r.colorLabel,
            title: r.title,
            description: r.description,
            tags: r.tags,
          })),
        );
      }
      let reportPayload: ShootReport | undefined;
      if (report) {
        const payloadRatings = ratings.map((r: any) => ({
          imageId: r.imageId || "",
          filename: r.filename,
          starRating: r.starRating,
          colorLabel: r.colorLabel,
          title: r.title,
          description: r.description,
          tags: r.tags,
        }));
        reportPayload = await buildShootReport({
          shootName: shootName ?? "Kull Run",
          ratings: payloadRatings,
          heroLimit,
          previewBaseUrl,
          apiKey,
        });
        emitShootCompletedNotification(user, reportPayload);
      }

      const estimatedCostUSD = creditsCharged;
      res.json({
        ok: true,
        providerId: providerUsed,
        ratings,
        sidecars,
        estimatedCostUSD,
        attempts,
        report: report ? reportPayload : undefined,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid run payload", issues: error.flatten() });
      }
      console.error("OpenAI run error", error);
      res.status(500).json({ message: "Failed to run OpenAI batch" });
    }
  });

  // Generate shoot report narrative
  app.post("/api/kull/report/generate", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = GenerateReportSchema.parse(req.body);
      const apiKey = process.env.OPENAI_API_KEY;
      const reportPayload = await buildShootReport({
        shootName: parsed.shootName,
        ratings: parsed.ratings,
        heroLimit: parsed.heroLimit,
        previewBaseUrl: parsed.previewBaseUrl,
        apiKey,
      });
      let user: Awaited<ReturnType<typeof storage.getUser>> | undefined;
      try {
        user = await storage.getUser(req.user.claims.sub);
      } catch (error) {
        console.warn("failed to load user for notifications", error);
      }
      emitShootCompletedNotification(user, reportPayload);
      res.json(reportPayload);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid report payload", issues: error.flatten() });
      }
      console.error("report generate error", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Apply metadata by writing XMP sidecars on the server (when running locally)
  app.post("/api/kull/metadata/write", isAuthenticated, async (req: any, res) => {
    try {
      const schema = z.object({
        baseDir: z.string().min(1),
        updates: z.array(
          z.object({
            imageId: z.string().min(1),
            filename: z.string().optional(),
            starRating: z.number().int().min(0).max(5).optional(),
            colorLabel: z.string().optional(),
            title: z.string().optional(),
            description: z.string().optional(),
            tags: z.array(z.string()).optional(),
          }),
        ),
      });
      const { baseDir, updates } = schema.parse(req.body);
      const results = await writeSidecars(baseDir, updates);
      res.json({ ok: true, results });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid metadata payload", issues: error.flatten() });
      }
      console.error("write sidecars error", error);
      res.status(500).json({ message: "Failed to write XMP sidecars" });
    }
  });

  // Folder catalog for Kull clients
  app.get("/api/kull/folders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getFolderCatalog(userId);
      res.json({ folderCatalog: user?.folderCatalog ?? null });
    } catch (error: any) {
      console.error("folders error", error);
      res.status(500).json({ message: "Failed to load folder catalog" });
    }
  });

  // Prompt marketplace routes
  app.use('/api/prompts', promptsRouter);

  // Device authentication routes
  app.use('/api/device-auth', deviceAuthRouter);

  // Shoot reports routes
  app.use('/api/reports', reportsRouter);

  // Export file serving routes
  app.use('/api/exports', exportsRouter);

  // Batch processing routes
  app.use('/api/batch', batchRouter);

  // AI Passthrough API (for native apps)
  app.use('/api/ai', aiPassthroughRouter);

  // Admin AI Monitoring
  app.use('/api/admin/ai', adminAIRouter);
  app.use('/api/admin/ai', adminHealthRouter);

  // Admin User Detail
  app.use('/api/admin/user', adminUserDetailRouter);

  // Admin CSV Export
  // Admin Analytics
  app.use('/api/admin/analytics', adminAnalyticsRouter);

  app.use('/api/admin/export', adminExportRouter);

  // Admin Script Funnel Analysis
  app.get('/api/admin/script-funnel', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allSessions = await storage.getChatSessions();
      const { getScriptStepDescription } = await import('./scriptStepDetector');

      // Count sessions by script step
      const stepCounts = new Map<number, number>();

      for (const session of allSessions) {
        if (session.scriptStep && session.scriptStep >= 1 && session.scriptStep <= 15) {
          stepCounts.set(session.scriptStep, (stepCounts.get(session.scriptStep) || 0) + 1);
        }
      }

      // Build funnel data for all 15 steps
      const stepStats = Array.from({ length: 15 }, (_, i) => {
        const step = i + 1;
        return {
          step,
          count: stepCounts.get(step) || 0,
          description: getScriptStepDescription(step),
        };
      }).filter(stat => stat.count > 0); // Only include steps with data

      res.json({
        totalSessions: allSessions.length,
        stepStats: stepStats.sort((a, b) => a.step - b.step),
      });
    } catch (error: any) {
      console.error('[Admin] Error generating script funnel:', error);
      res.status(500).json({ message: 'Failed to generate funnel data: ' + error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
