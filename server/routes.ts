import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

// Price IDs for the two tiers (these would be set in Stripe dashboard)
// For now, we'll create them dynamically or use environment variables
const PROFESSIONAL_PRICE_ANNUAL = process.env.STRIPE_PROFESSIONAL_PRICE_ID || 'price_professional_annual';
const STUDIO_PRICE_ANNUAL = process.env.STRIPE_STUDIO_PRICE_ID || 'price_studio_annual';

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

  // Start trial endpoint
  app.post('/api/trial/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.startTrial(userId);
      res.json(user);
    } catch (error: any) {
      console.error("Error starting trial:", error);
      res.status(500).json({ message: "Failed to start trial: " + error.message });
    }
  });

  // Create subscription endpoint
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier } = req.body; // 'professional' or 'studio'
      
      let user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // If user already has a subscription, return existing
      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        
        res.send({
          subscriptionId: subscription.id,
          clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
        });
        return;
      }

      if (!user.email) {
        throw new Error('No user email on file');
      }

      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      });

      // Determine price ID based on tier
      const priceId = tier === 'studio' ? STUDIO_PRICE_ANNUAL : PROFESSIONAL_PRICE_ANNUAL;

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: priceId,
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      // Update user with Stripe info
      await storage.updateSubscription(
        userId,
        tier,
        'active',
        customer.id,
        subscription.id
      );

      res.send({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      return res.status(400).send({ error: { message: error.message } });
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
