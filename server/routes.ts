import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { schedulePostCheckoutEmails, scheduleNonCheckoutDripCampaign, cancelDripCampaign, processPendingEmails } from "./emailService";
import { insertRefundSurveySchema } from "@shared/schema";
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
    try {
      const { message, history } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      // Set up Server-Sent Events headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const { getChatResponseStream, buildFullPromptMarkdown } = await import('./chatService');
      
      // Build full prompt markdown for debugging
      const fullPrompt = await buildFullPromptMarkdown(message, history || []);
      
      const stream = await getChatResponseStream(message, history || []);

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      let fullResponse = '';
      let tokensIn = 0;
      let tokensOut = 0;
      let cost = 0;

      try {
        console.log('[Chat] Starting to read stream...');

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log('[Chat] Stream done');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          console.log('[Chat] Received chunk:', chunk.substring(0, 200));
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                // Handle different event types from Responses API
                if (data.type === 'response.output_text.delta' && data.delta) {
                  fullResponse += data.delta;
                  // Forward to client
                  res.write(`data: ${JSON.stringify({ type: 'delta', content: data.delta })}\n\n`);
                } else if (data.type === 'response.done') {
                  // Extract usage data from done event
                  if (data.response?.usage) {
                    tokensIn = data.response.usage.input_tokens || 0;
                    tokensOut = data.response.usage.output_tokens || 0;
                    // Calculate cost for gpt-5-mini: Input $0.100/1M, Output $0.400/1M
                    cost = (tokensIn / 1_000_000) * 0.100 + (tokensOut / 1_000_000) * 0.400;
                  }
                  console.log('[Chat] Response done, usage:', data.response?.usage);
                } else if (data.type === 'error') {
                  res.write(`data: ${JSON.stringify({ type: 'error', message: data.message })}\n\n`);
                }
              } catch (e) {
                // Skip invalid JSON lines
              }
            }
          }
        }

        // Signal completion
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();

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
          
          // Calculate session length from request body if provided
          const sessionLength = req.body.sessionStartTime 
            ? Math.floor((Date.now() - req.body.sessionStartTime) / 1000) 
            : undefined;

          await storage.trackSupportQuery({
            userEmail,
            userId,
            userMessage: message,
            aiResponse: fullResponse,
            fullPrompt,
            tokensIn,
            tokensOut,
            cost: cost.toString(),
            model: 'gpt-5-mini',
            device,
            browser,
            city,
            state,
            country,
            sessionLength,
          });

          console.log(`[Chat] Streamed response: ${tokensIn} tokens in, ${tokensOut} tokens out, $${cost.toFixed(6)} cost`);
        }
      } catch (streamError) {
        console.error('[Chat] Error processing stream:', streamError);
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream processing error' })}\n\n`);
        res.end();
      }
    } catch (error: any) {
      console.error("Error processing chat message:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to process message" });
      }
    }
  });

  // Generate personalized welcome greeting
  app.post('/api/chat/welcome', async (req: any, res) => {
    try {
      const { context, history } = req.body;

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

## 🖱️ User Activity History
${context.userActivity && context.userActivity.length > 0 ? `
Recent interactions (last ${context.userActivity.length} events):

${context.userActivity.map((event: any, idx: number) => {
  const time = new Date(event.timestamp);
  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (event.type === 'click') {
    return `${idx + 1}. **🖱️ CLICKED** \`${event.target}\` at ${timeStr}`;
  } else if (event.type === 'hover') {
    return `${idx + 1}. **👆 HOVERED** \`${event.target}\` at ${timeStr}`;
  } else if (event.type === 'input') {
    const displayValue = event.value && event.value.length > 0
      ? `"${event.value}"`
      : '(empty)';
    return `${idx + 1}. **⌨️ TYPED** in \`${event.target}\`: ${displayValue} at ${timeStr}`;
  }
  return '';
}).join('\n')}

**Activity Insights:**
- **Total Clicks:** ${context.userActivity.filter((e: any) => e.type === 'click').length}
- **Elements Hovered:** ${context.userActivity.filter((e: any) => e.type === 'hover').length}
- **Input Events:** ${context.userActivity.filter((e: any) => e.type === 'input').length}
` : '- No recent activity tracked'}

---

**Your Task:**
You're Kull AI support - your job is to CLOSE the sale. You have complete visibility into their session (location, device, behavior, scroll depth, clicks, time on site, etc.) but NEVER reveal this data directly.

**NAVIGATION SUPERPOWER:**
When you include a link to https://kullai.com, the page will AUTOMATICALLY navigate there. Use this to guide them! Think of yourself as a tour guide who can instantly teleport them to the right page while you explain.

**Sales Strategy (Alex Hormozi Style):**
- Use the data to make educated guesses about what they need or what's holding them back
- Pattern interrupt - catch their attention with something unexpected or specific
- Create urgency or point out what they're missing
- Make it conversational, not salesy
- Be direct and confident
- Include 1 strategic link to move them forward (use hash anchors like #pricing, #features when relevant)
- Remember: the link will navigate them there automatically, so use it to guide their journey

**CRITICAL - BUILD ON YOUR PREVIOUS MESSAGES:**
- You can see your previous welcome messages in the conversation history
- DO NOT repeat yourself - each message should advance the pitch
- Build on what you've already said
- If you already mentioned pricing, talk about features next
- If they haven't engaged after 2-3 messages, try a different angle
- Progress the conversation toward the close

**Format:**
1-2 sentences MAX. Make every word count. Focus on the outcome they want, not features.

**REQUIRED ENDING:**
End your message with:
␞NEXT_MESSAGE: X

Where X is seconds until your next message (20-60 recommended based on engagement level).

**Examples of good openers:**
- "Noticed you've been on pricing for a while - let me show you [what the trial includes](https://kullai.com/pricing#professional), most pros who hesitate regret waiting."
- "Still manually culling at 11pm? You're burning 10+ hours a week - [see how AI handles it](https://kullai.com/features#ai-culling)."
- "Came from Reddit and scrolled 80% down - ready to [start your trial](https://kullai.com/checkout) or still browsing?"

Don't mention their IP, browser, device specs, or technical details. Use those insights to inform your message, not to show off.`;

      const { getChatResponseStream } = await import('./chatService');

      // Pass previous welcome messages as history so AI can build on them
      const conversationHistory = history && Array.isArray(history)
        ? history.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          }))
        : [];

      const stream = await getChatResponseStream(contextMarkdown, conversationHistory);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                // Transform OpenAI format to our client format
                if (data.type === 'response.output_text.delta' && data.delta) {
                  res.write(`data: ${JSON.stringify({ type: 'delta', content: data.delta })}\n\n`);
                } else if (data.type === 'response.done') {
                  // Don't send done yet, we'll send it after the loop
                } else if (data.type === 'error') {
                  res.write(`data: ${JSON.stringify({ type: 'error', message: data.message })}\n\n`);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }

        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
      } catch (streamError) {
        console.error('[Welcome] Error processing stream:', streamError);
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream processing error' })}\n\n`);
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

      console.log(`[Chat] Sent transcript email to ${userEmail} with BCC to steve@lander.media`);

      res.json({ success: true, message: 'Transcript sent successfully' });
    } catch (error: any) {
      console.error("Error sending chat transcript:", error);
      res.status(500).json({ message: "Failed to send transcript: " + error.message });
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
  const isAdmin = (req: any, res: Response, next: NextFunction) => {
    if (!req.user || req.user.claims.email !== 'steve@lander.media') {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

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
