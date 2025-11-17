import type { Express } from "express";
import { z } from "zod";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { defaultPrompts } from "../packages/prompt-presets";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { schedulePostCheckoutEmails, scheduleNonCheckoutDripCampaign, cancelDripCampaign, processPendingEmails } from "./emailService";
import { insertRefundSurveySchema } from "@shared/schema";
import { PromptStyleSchema, ProviderIdSchema } from "@shared/culling/schemas";
import { estimateCreditsForImages } from "@shared/utils/cost";
import { CREDIT_TOP_UP_PACKAGES, PLANS } from "@shared/culling/plans";
import { getProviderConfig } from "@shared/culling/providers";
import Stripe from "stripe";
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

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

// Stripe Price configuration
const STRIPE_PRICES = {
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

const exifGeoService = new ExifGeoContextService({
  mapboxToken: process.env.MAPBOX_ACCESS_TOKEN,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  await storage.seedDefaultPrompts(defaultPrompts, "team@kullai.com");

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

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
        return res.status(400).json({ message: 'Invalid link initiation payload', issues: error.flatten() });
      }
      console.error('device link initiate error', error);
      res.status(500).json({ message: 'Failed to initiate device link' });
    }
  });

  app.post('/api/device/link/approve', isAuthenticated, async (req: any, res) => {
    try {
      const schema = z.object({ code: z.string().min(4), deviceName: z.string().max(120).optional() });
      const { code, deviceName } = schema.parse(req.body ?? {});
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const approved = approveDeviceLink(code, {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      }, deviceName);
      if (!approved) {
        return res.status(400).json({ message: 'Invalid or expired device code' });
      }
      res.json({ ok: true });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid device approval payload', issues: error.flatten() });
      }
      console.error('device link approve error', error);
      res.status(500).json({ message: 'Failed to approve device link' });
    }
  });

  app.post('/api/device/link/status', async (req: any, res) => {
    try {
      const schema = z.object({ pollToken: z.string().min(8) });
      const { pollToken } = schema.parse(req.body ?? {});
      const result = claimDeviceLink(pollToken);
      if (result.status === 'pending' && result.record) {
        return res.json({
          status: 'pending',
          expiresAt: new Date(result.record.expiresAt).toISOString(),
        });
      }
      if (result.status === 'approved' && result.record && result.record.user) {
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

        return req.login(deviceUser as any, (err) => {
          if (err) {
            console.error('device link login failed', err);
            return res.status(500).json({ message: 'Failed to issue session' });
          }
          return res.json({
            status: 'approved',
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
      if (result.status === 'expired') {
        return res.status(410).json({ status: 'expired' });
      }
      return res.status(404).json({ status: 'invalid' });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid poll payload', issues: error.flatten() });
      }
      console.error('device link status error', error);
      res.status(500).json({ message: 'Failed to check device link status' });
    }
  });

  // Prompt marketplace routes
  app.get('/api/prompts', async (req, res) => {
    try {
      const { shootType, search, limit } = req.query;
      const prompts = await storage.listPromptPresets({
        shootType: typeof shootType === 'string' && shootType.length > 0 ? shootType : undefined,
        search: typeof search === 'string' && search.length > 0 ? search : undefined,
        limit: typeof limit === 'string' ? Number.parseInt(limit, 10) || undefined : undefined,
      });
      res.json(prompts);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      res.status(500).json({ message: 'Failed to fetch prompts' });
    }
  });

  app.get('/api/prompts/:slug', async (req, res) => {
    try {
      const preset = await storage.getPromptPresetBySlug(req.params.slug);
      if (!preset) {
        return res.status(404).json({ message: 'Prompt not found' });
      }
      res.json(preset);
    } catch (error) {
      console.error('Error fetching prompt:', error);
      res.status(500).json({ message: 'Failed to fetch prompt' });
    }
  });

  app.get('/api/prompts/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [created, saved] = await Promise.all([
        storage.listUserPrompts(userId),
        storage.listSavedPrompts(userId),
      ]);
      res.json({ created, saved });
    } catch (error) {
      console.error('Error fetching user prompts:', error);
      res.status(500).json({ message: 'Failed to fetch user prompts' });
    }
  });

  const createPromptBodySchema = z.object({
    title: z.string().min(3),
    summary: z.string().min(10),
    instructions: z.string().min(10),
    shootTypes: z.array(z.string()).min(1),
    tags: z.array(z.string()).default([]),
    style: PromptStyleSchema,
    shareWithMarketplace: z.boolean().default(true),
  });

  app.post('/api/prompts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email ?? '';
      const parsed = createPromptBodySchema.parse(req.body);

      const preset = await storage.createPromptPreset({
        userId,
        userEmail,
        title: parsed.title,
        summary: parsed.summary,
        instructions: parsed.instructions,
        shootTypes: parsed.shootTypes,
        tags: parsed.tags,
        style: parsed.style,
        shareWithMarketplace: parsed.shareWithMarketplace,
      });

      res.status(201).json(preset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid prompt payload', issues: error.flatten() });
      }
      console.error('Error creating prompt:', error);
      res.status(500).json({ message: 'Failed to create prompt' });
    }
  });

  const voteBodySchema = z.object({
    value: z.enum(['up', 'down', 'neutral']).default('up'),
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().max(280).optional(),
  });

  app.post('/api/prompts/:slug/vote', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preset = await storage.getPromptPresetBySlug(req.params.slug);
      if (!preset) {
        return res.status(404).json({ message: 'Prompt not found' });
      }
      const parsed = voteBodySchema.parse(req.body);
      const valueMap = { up: 1, down: -1, neutral: 0 } as const;
      const updated = await storage.voteOnPrompt(
        userId,
        preset.id,
        valueMap[parsed.value],
        parsed.rating,
        parsed.comment,
      );
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid vote payload', issues: error.flatten() });
      }
      console.error('Error voting on prompt:', error);
      res.status(500).json({ message: 'Failed to record vote' });
    }
  });

  app.post('/api/prompts/:slug/save', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preset = await storage.getPromptPresetBySlug(req.params.slug);
      if (!preset) {
        return res.status(404).json({ message: 'Prompt not found' });
      }
      const saved = await storage.togglePromptSave(userId, preset.id);
      res.json({ saved });
    } catch (error) {
      console.error('Error toggling prompt save:', error);
      res.status(500).json({ message: 'Failed to toggle prompt save' });
    }
  });

  const forecastSchema = z.object({
    providerId: ProviderIdSchema,
    imageCount: z.number().int().positive(),
  });

  app.get('/api/credits/summary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const summary = await storage.getCreditSummary(userId);
      res.json({ ...summary, topUpPackages: CREDIT_TOP_UP_PACKAGES });
    } catch (error) {
      console.error('Error fetching credit summary:', error);
      res.status(500).json({ message: 'Failed to fetch credit summary' });
    }
  });

  app.get('/api/credits/options', isAuthenticated, async (_req, res) => {
    res.json({
      plans: PLANS,
      topUpPackages: CREDIT_TOP_UP_PACKAGES,
    });
  });

  app.post('/api/credits/forecast', isAuthenticated, async (req, res) => {
    try {
      const { providerId, imageCount } = forecastSchema.parse(req.body);
      const config = getProviderConfig(providerId);
      const credits = estimateCreditsForImages(providerId, imageCount);
      const costUSD = credits; // 1 credit == $1 user cost
      res.json({
        provider: config,
        creditsRequired: credits,
        costUSD,
        batchSize: config.maxBatchSize,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid forecast payload', issues: error.flatten() });
      }
      console.error('Error forecasting credits:', error);
      res.status(500).json({ message: 'Failed to forecast credits' });
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
        
        return res.status(402).json({
          requiresDowngrade: true,
          message: 'Unable to authorize annual amount. Would you like to try monthly billing instead?',
          tier,
          annualAmount: amount / 100,
          monthlyAmount: tier === 'professional' 
            ? STRIPE_PRICES.professional.monthlyAmount / 100
            : STRIPE_PRICES.studio.monthlyAmount / 100,
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
      const monthlyAmount = tier === 'professional'
        ? STRIPE_PRICES.professional.monthlyAmount
        : STRIPE_PRICES.studio.monthlyAmount;

      // Try authorization with monthly amount
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
        },
      });

      if (paymentIntent.status !== 'requires_capture') {
        throw new Error('Monthly authorization also failed');
      }

      // Start trial with monthly billing
      const updatedUser = await storage.startTrial(userId, tier, paymentMethodId, setupIntentId);
      await cancelDripCampaign(userId);
      await schedulePostCheckoutEmails(updatedUser);

      res.json({
        success: true,
        user: updatedUser,
        billing: 'monthly',
        authorizationId: paymentIntent.id,
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

  // Chat support endpoint
  app.post('/api/chat/message', async (req: any, res) => {
    try {
      const { message, history } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      const { getChatResponse } = await import('./chatService');
      const response = await getChatResponse(message, history || []);

      res.json({ message: response });
    } catch (error: any) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  // =============== Kull Prompt Marketplace & Credits APIs ===============
  // List marketplace prompts
  app.get('/api/kull/prompts', isAuthenticated, async (req: any, res) => {
    try {
      const { shootType, search, limit } = req.query as Record<string, string>;
      const presets = await storage.listPromptPresets({
        shootType: shootType || undefined,
        search: search || undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json({ presets });
    } catch (err: any) {
      console.error('list prompts error', err);
      res.status(500).json({ message: 'Failed to list prompts' });
    }
  });

  // List my prompts
  app.get('/api/kull/prompts/mine', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const presets = await storage.listUserPrompts(userId);
      res.json({ presets });
    } catch (err: any) {
      console.error('list my prompts error', err);
      res.status(500).json({ message: 'Failed to list my prompts' });
    }
  });

  // List saved prompts
  app.get('/api/kull/prompts/saved', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const presets = await storage.listSavedPrompts(userId);
      res.json({ presets });
    } catch (err: any) {
      console.error('list saved prompts error', err);
      res.status(500).json({ message: 'Failed to list saved prompts' });
    }
  });

  // Compact cache for offline prompt search on mobile/desktop
  app.get('/api/kull/prompts/cache', isAuthenticated, async (_req: any, res) => {
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
      console.error('prompt cache error', err);
      res.status(500).json({ message: 'Failed to export prompt cache' });
    }
  });

  // Create prompt preset
  app.post('/api/kull/prompts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, summary, instructions, shootTypes, tags, style, shareWithMarketplace } = req.body;
      const user = await storage.getUser(userId);
      if (!user?.email) return res.status(400).json({ message: 'User email required' });

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
      console.error('create prompt error', err);
      res.status(500).json({ message: 'Failed to create prompt' });
    }
  });

  // Vote on prompt (up/down + optional rating/comment)
  app.post('/api/kull/prompts/:id/vote', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { value, rating, comment } = req.body as { value: number; rating?: number; comment?: string };
      const preset = await storage.voteOnPrompt(userId, id, Number(value), rating ? Number(rating) : undefined, comment);
      res.json({ preset });
    } catch (err: any) {
      console.error('vote prompt error', err);
      res.status(500).json({ message: 'Failed to vote' });
    }
  });

  // Toggle save prompt
  app.post('/api/kull/prompts/:id/save', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const saved = await storage.togglePromptSave(userId, id);
      res.json({ saved });
    } catch (err: any) {
      console.error('save prompt error', err);
      res.status(500).json({ message: 'Failed to toggle save' });
    }
  });

  // Credits summary
  app.get('/api/kull/credits/summary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const summary = await storage.getCreditSummary(userId);
      res.json(summary);
    } catch (err: any) {
      console.error('credit summary error', err);
      res.status(500).json({ message: 'Failed to get summary' });
    }
  });

  // Credits ledger
  app.get('/api/kull/credits/ledger', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { limit } = req.query as Record<string, string>;
      const ledger = await storage.getCreditLedger(userId, { limit: limit ? Number(limit) : undefined });
      res.json({ ledger });
    } catch (err: any) {
      console.error('credit ledger error', err);
      res.status(500).json({ message: 'Failed to get ledger' });
    }
  });

  // Providers/models listing sorted by effective cost
  app.get('/api/kull/models', isAuthenticated, async (_req: any, res) => {
    try {
      const { sortProvidersByCost } = await import('@shared');
      const providers = sortProvidersByCost();
      res.json({ providers });
    } catch (err: any) {
      console.error('models list error', err);
      res.status(500).json({ message: 'Failed to list models' });
    }
  });

  // Seed default prompt presets (protected by secret header)
  app.post('/api/kull/prompts/seed', async (req: any, res) => {
    try {
      const secret = req.headers['x-seed-secret'];
      if (secret !== process.env.SEED_SECRET) return res.status(401).json({ message: 'Unauthorized' });

      const { defaultPrompts } = await import('../packages/prompt-presets');
      const authorEmail = 'system@kullai.com';
      await storage.seedDefaultPrompts(defaultPrompts, authorEmail);
      res.json({ success: true });
    } catch (err: any) {
      console.error('seed prompts error', err);
      res.status(500).json({ message: 'Failed to seed prompts' });
    }
  });

  // Sync folder catalog from desktop app
  app.post('/api/kull/folders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { deviceName, folders } = req.body;
      const updatedAt = new Date().toISOString();
      const user = await storage.updateFolderCatalog(userId, { deviceName, folders, updatedAt });
      res.json({ ok: true, folderCatalog: user.folderCatalog });
    } catch (err: any) {
      console.error('folders sync error', err);
      res.status(500).json({ message: 'Failed to sync folders' });
    }
  });

  // Get folder catalog for mobile
  app.get('/api/kull/folders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getFolderCatalog(userId);
      res.json({ folderCatalog: user?.folderCatalog ?? { folders: [], updatedAt: new Date().toISOString() } });
    } catch (err: any) {
      console.error('folders fetch error', err);
      res.status(500).json({ message: 'Failed to fetch folders' });
    }
  });

  app.get('/api/kull/batch/telemetry', isAuthenticated, (_req, res) => {
    try {
      const providers = telemetryStore.snapshots();
      const now = new Date().toISOString();
      const response = providers.map((provider) => {
        const completed = provider.recentBatches.filter((batch) => batch.status === "completed" && batch.tookMs);
        const avgTookMs = completed.length
          ? Math.round(completed.reduce((sum, batch) => sum + (batch.tookMs ?? 0), 0) / completed.length)
          : null;
        return {
          providerId: provider.providerId,
          recentBatches: provider.recentBatches,
          rateLimit: provider.rateLimit,
          metrics: {
            averageCompletionMs: avgTookMs,
            running: provider.recentBatches.filter((batch) => batch.status === "running").length,
            failed: provider.recentBatches.filter((batch) => batch.status === "failed").length,
          },
        };
      });
      res.json({ generatedAt: now, providers: response });
    } catch (error) {
      console.error('telemetry error', error);
      res.status(500).json({ message: 'Failed to load batch telemetry' });
    }
  });

  // Run OpenAI batch (server-side) with image URLs/base64 input
  app.post('/api/kull/run/openai', isAuthenticated, async (req: any, res) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'Missing OPENAI_API_KEY' });
      const imageSchema = z
        .object({
          id: z.string().min(1),
          url: z.string().url().optional(),
          b64: z.string().min(1).optional(),
          filename: z.string().optional(),
          relativePath: z.string().optional(),
        })
        .superRefine((value, ctx) => {
          if (!value.url && !value.b64) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Each image must include either a url or b64 payload',
              path: ['url'],
            });
          }
        });
      const bodySchema = z.object({
        model: z.string().min(1),
        images: z.array(imageSchema).min(1),
        prompt: z.string().min(1),
        baseDir: z.string().optional(),
        report: z.boolean().optional(),
        providerOrder: z.array(ProviderIdSchema).optional(),
        allowFallback: z.boolean().optional(),
        shootName: z.string().min(1).optional(),
        previewBaseUrl: z.string().url().optional(),
        heroLimit: z.number().int().positive().max(50).optional(),
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
      } = bodySchema.parse(req.body);
      const userId = req.user.claims.sub;

      const metadataCache = new Map<string, ParseResult | null>();

      const resolveLocalPath = (image: z.infer<typeof imageSchema>) => {
        if (!baseDir) return undefined;
        const candidate = image.relativePath ?? image.filename ?? image.id;
        if (!candidate) return undefined;
        return path.isAbsolute(candidate) ? candidate : path.join(baseDir, candidate);
      };

      const loadMetadata = async (image: z.infer<typeof imageSchema>): Promise<ParseResult | null> => {
        if (metadataCache.has(image.id)) return metadataCache.get(image.id) ?? null;
        try {
          let buffer: Buffer | undefined;
          if (image.b64) {
            buffer = Buffer.from(image.b64, "base64");
          } else {
            const localPath = resolveLocalPath(image);
            if (localPath) {
              try {
                buffer = await fs.readFile(localPath);
              } catch {
                // continue to remote fetch below
              }
            }
            if (!buffer && image.url) {
              try {
                const resp = await fetch(image.url);
                if (resp.ok) {
                  const arr = await resp.arrayBuffer();
                  buffer = Buffer.from(arr);
                }
              } catch (err) {
                console.warn('failed to download image for EXIF', err);
              }
            }
          }
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
          console.warn('metadata extraction failed', err);
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
        sidecars = await writeSidecars(baseDir, ratings.map((r: any) => ({
          imageId: r.imageId || r.filename || '',
          filename: r.filename,
          starRating: r.starRating,
          colorLabel: r.colorLabel,
          title: r.title,
          description: r.description,
          tags: r.tags,
        })));
      }
      let reportPayload: ShootReport | undefined;
      if (report) {
        const payloadRatings = ratings.map((r: any) => ({
          imageId: r.imageId || '',
          filename: r.filename,
          starRating: r.starRating,
          colorLabel: r.colorLabel,
          title: r.title,
          description: r.description,
          tags: r.tags,
        }));
        reportPayload = await buildShootReport({
          shootName: shootName ?? 'Kull Run',
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
        return res.status(400).json({ message: 'Invalid run payload', issues: error.flatten() });
      }
      console.error('OpenAI run error', error);
      res.status(500).json({ message: 'Failed to run OpenAI batch' });
    }
  });

  // Generate shoot report narrative
  app.post('/api/kull/report/generate', isAuthenticated, async (req: any, res) => {
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
        return res.status(400).json({ message: 'Invalid report payload', issues: error.flatten() });
      }
      console.error('report generate error', error);
      res.status(500).json({ message: 'Failed to generate report' });
    }
  });

  // Apply metadata by writing XMP sidecars on the server (when running locally)
  app.post('/api/kull/metadata/write', isAuthenticated, async (req: any, res) => {
    try {
      const schema = z.object({
        baseDir: z.string().min(1),
        updates: z.array(z.object({
          imageId: z.string().min(1),
          filename: z.string().optional(),
          starRating: z.number().int().min(0).max(5).optional(),
          colorLabel: z.string().optional(),
          title: z.string().optional(),
          description: z.string().optional(),
          tags: z.array(z.string()).optional(),
        })),
      });
      const { baseDir, updates } = schema.parse(req.body);
      const results = await writeSidecars(baseDir, updates);
      res.json({ ok: true, results });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid metadata payload', issues: error.flatten() });
      }
      console.error('write sidecars error', error);
      res.status(500).json({ message: 'Failed to write XMP sidecars' });
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
          text: emailTemplate.text,
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

  // Audio transcription endpoint using OpenAI Whisper
  app.post('/api/transcribe', isAuthenticated, async (req: any, res) => {
    try {
      const multer = require('multer');
      const FormData = require('form-data');
      const upload = multer({ storage: multer.memoryStorage() });

      upload.single('audio')(req, res, async (err: any) => {
        if (err) return res.status(400).json({ message: "Failed to upload audio file" });
        if (!req.file) return res.status(400).json({ message: "No audio file provided" });
        if (!process.env.OPENAI_API_KEY) return res.status(500).json({ message: 'Missing OPENAI_API_KEY' });

        const form = new FormData();
        form.append('file', req.file.buffer, { filename: req.file.originalname || 'audio.webm', contentType: req.file.mimetype });
        form.append('model', 'whisper-1');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            ...form.getHeaders(),
          },
          body: form as any,
        } as any);

        if (!response.ok) throw new Error('OpenAI transcription failed');
        const data = await response.json();
        res.json({ text: data.text });
      });
    } catch (error: any) {
      console.error("Error transcribing audio:", error);
      res.status(500).json({ message: "Failed to transcribe audio", detail: error.message });
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

      const invoice = invoices.data[0];
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

  const httpServer = createServer(app);

  return httpServer;
}
