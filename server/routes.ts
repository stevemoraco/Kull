import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { scheduleTrialEmails, processPendingEmails } from "./emailService";
import Stripe from "stripe";

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

      // Create Stripe customer if doesn't exist
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          metadata: {
            userId: user.id,
          },
        });
        customerId = customer.id;
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
      const amount = tier === 'professional' 
        ? STRIPE_PRICES.professional.annualAmount 
        : STRIPE_PRICES.studio.annualAmount;

      // Place authorization hold for the annual subscription amount
      // This verifies the card can handle the charge without actually charging
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: 'usd',
          customer: user.stripeCustomerId,
          payment_method: paymentMethodId,
          confirm: true,
          capture_method: 'manual', // Don't capture yet, just authorize
          metadata: {
            userId: user.id,
            tier,
            purpose: 'trial_authorization',
          },
        });

        if (paymentIntent.status !== 'requires_capture') {
          throw new Error('Authorization failed: ' + paymentIntent.status);
        }

        // Start trial and save payment method
        const updatedUser = await storage.startTrial(userId, tier, paymentMethodId, setupIntentId);

        // Schedule welcome emails
        await scheduleTrialEmails(updatedUser);

        res.json({
          success: true,
          user: updatedUser,
          authorizationId: paymentIntent.id,
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
        customer: user.stripeCustomerId,
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
      await scheduleTrialEmails(updatedUser);

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

      const referral = await storage.createReferral({
        referrerId: userId,
        referredEmail,
      });

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

  const httpServer = createServer(app);

  return httpServer;
}
