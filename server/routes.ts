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
import { runBatches } from "./orchestrator";
import { submitOpenAIBatch } from "./providers/openai";

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

  // Run OpenAI batch (server-side) with image URLs
  app.post('/api/kull/run/openai', isAuthenticated, async (req: any, res) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'Missing OPENAI_API_KEY' });
      const bodySchema = z.object({
        model: z.string().min(1),
        images: z.array(z.object({ id: z.string().min(1), url: z.string().url() })),
        prompt: z.string().min(1),
      });
      const { model, images, prompt } = bodySchema.parse(req.body);

      await runBatches({
        providerId: 'openai-gpt-5',
        imageIds: images.map((i: any) => i.id),
        toPayload: async (id) => {
          const match = images.find((x: any) => x.id === id);
          return { id, url: match?.url };
        },
        prompt,
        submit: async ({ images }) => {
          const resp = await submitOpenAIBatch({ apiKey, model, images, prompt });
          return resp;
        },
        concurrency: 3,
        maxRetries: 5,
      });
      res.json({ ok: true });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid run payload', issues: error.flatten() });
      }
      console.error('OpenAI run error', error);
      res.status(500).json({ message: 'Failed to run OpenAI batch' });
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
        
        await sendEmail(
          referredEmail,
          emailTemplate.subject,
          emailTemplate.html,
          emailTemplate.text
        );
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
