import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  // Check if user exists before upserting
  const existingUser = await storage.getUser(claims["sub"]);
  const isNewUser = !existingUser;
  
  const user = await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });

  // Send welcome email immediately for new users and schedule drip campaign
  if (isNewUser && user.email && !user.trialStartedAt) {
    const { sendEmail, scheduleNonCheckoutDripCampaign } = await import("./emailService");
    const { emailTemplates } = await import("./emailTemplates");
    
    // Send welcome email immediately
    const welcomeEmail = emailTemplates.firstLoginWelcome(user);
    await sendEmail({
      to: user.email,
      subject: welcomeEmail.subject,
      html: welcomeEmail.html,
      text: welcomeEmail.text,
    });
    
    // Schedule drip campaign
    await scheduleNonCheckoutDripCampaign(user);
  }
  
  return user;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

/**
 * Middleware to check if user has paid access (active subscription, active trial, or staff)
 * Requires isAuthenticated middleware to run first
 */
export const hasPaidAccessMiddleware: RequestHandler = async (req, res, next) => {
  const sessionUser = req.user as any;

  if (!sessionUser?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Get full user data from database
  const user = await storage.getUser(sessionUser.claims.sub);

  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  // Staff access via @lander.media email
  if (user.email?.endsWith('@lander.media')) {
    return next();
  }

  // Active subscription
  if (user.subscriptionStatus === 'active') {
    return next();
  }

  // Active trial (check expiration)
  if (user.subscriptionStatus === 'trial') {
    if (!user.trialEndsAt) {
      return res.status(403).json({
        message: "This feature requires an active subscription or trial",
        reason: "trial_expired"
      });
    }
    const trialEnd = new Date(user.trialEndsAt);
    const now = new Date();
    if (trialEnd > now) {
      return next(); // Trial still active
    }
  }

  // No paid access
  return res.status(403).json({
    message: "This feature requires an active subscription or trial",
    reason: user.subscriptionStatus === 'trial' ? 'trial_expired' : 'no_active_subscription'
  });
};

/**
 * Middleware to check paid access for device-authenticated requests
 * Requires device token verification to run first
 * Expects req.user.id to be set by device token middleware
 */
export const hasPaidAccessDevice: RequestHandler = async (req, res, next) => {
  const deviceUser = req.user as any;

  if (!deviceUser?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Get full user data from database
  const user = await storage.getUser(deviceUser.id);

  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  // Staff access via @lander.media email
  if (user.email?.endsWith('@lander.media')) {
    return next();
  }

  // Active subscription
  if (user.subscriptionStatus === 'active') {
    return next();
  }

  // Active trial (check expiration)
  if (user.subscriptionStatus === 'trial') {
    if (!user.trialEndsAt) {
      return res.status(403).json({
        error: "This feature requires an active subscription or trial",
        reason: "trial_expired"
      });
    }
    const trialEnd = new Date(user.trialEndsAt);
    const now = new Date();
    if (trialEnd > now) {
      return next(); // Trial still active
    }
  }

  // No paid access
  return res.status(403).json({
    error: "This feature requires an active subscription or trial",
    reason: user.subscriptionStatus === 'trial' ? 'trial_expired' : 'no_active_subscription'
  });
};
