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
  // On Replit, always use HTTPS even in dev, so we need secure cookies
  const isReplit = !!process.env.REPL_ID;
  const useSecureCookies = process.env.NODE_ENV === 'production' || isReplit;

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: 'lax', // Required for OAuth redirects
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
  try {
    // Check if user exists before upserting
    const existingUser = await storage.getUser(claims["sub"]);
    const isNewUser = !existingUser;

    // If user exists, just return it without upserting (optimization)
    if (existingUser) {
      console.log("[Auth] Existing user, skipping upsert");
      return existingUser;
    }

    console.log("[Auth] New user, creating...");
    const user = await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
    });

    // Send welcome email immediately for new users (non-blocking)
    if (user.email && !user.trialStartedAt) {
      console.log("[Auth] Sending welcome email in background");
      // Don't await - let it run in background
      import("./emailService").then(({ sendEmail, scheduleNonCheckoutDripCampaign }) => {
        import("./emailTemplates").then(({ emailTemplates }) => {
          if (!user.email) {
            console.warn("[Auth] Cannot send welcome email: user has no email");
            return;
          }
          const welcomeEmail = emailTemplates.firstLoginWelcome(user);
          sendEmail({
            to: user.email,
            subject: welcomeEmail.subject,
            html: welcomeEmail.html,
            text: welcomeEmail.text,
          }).catch(err => console.error("[Auth] Welcome email failed:", err));

          scheduleNonCheckoutDripCampaign(user).catch(err =>
            console.error("[Auth] Drip campaign schedule failed:", err)
          );
        });
      });
    }

    return user;
  } catch (error) {
    console.error("[Auth] upsertUser error:", error);
    throw error;
  }
}

export async function setupAuth(app: Express) {
  // Skip OAuth setup if not running on Replit
  if (!process.env.REPL_ID) {
    console.log('[Auth] Skipping Replit OAuth (REPL_ID not set)');
    return;
  }

  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      console.log("[Auth] Verify function called");
      const user = {};
      updateUserSession(user, tokens);
      console.log("[Auth] Session updated, upserting user");

      // Add timeout to upsertUser to prevent hanging
      await Promise.race([
        upsertUser(tokens.claims()),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("User upsert timeout")), 10000)
        )
      ]);

      console.log("[Auth] User upserted, calling verified callback");
      verified(null, user);
    } catch (error) {
      console.error("[Auth] Verify function error:", error);
      verified(error as Error);
    }
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;

    // Always unregister and re-register to avoid state corruption
    if (registeredStrategies.has(strategyName)) {
      try {
        passport.unuse(strategyName);
        console.log(`[Auth] Unregistered existing strategy: ${strategyName}`);
      } catch (e) {
        console.log(`[Auth] No strategy to unregister: ${strategyName}`);
      }
    }

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
    console.log(`[Auth] Registered strategy: ${strategyName}`);
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Check if already authenticated
    if (req.isAuthenticated && req.isAuthenticated()) {
      const user = req.user as any;
      console.log("[Auth] User already authenticated:", {
        hasExpires: !!user?.expires_at,
        hasClaims: !!user?.claims,
        sub: user?.claims?.sub
      });

      // If user object looks incomplete, force re-authentication
      if (!user?.expires_at || !user?.claims) {
        console.log("[Auth] User object incomplete, forcing re-authentication");
        req.logout(() => {
          // Continue to authentication flow below
          console.log("[Auth] Starting login flow after logout");
          ensureStrategy(req.hostname);
          passport.authenticate(`replitauth:${req.hostname}`, {
            prompt: "login consent",
            scope: ["openid", "email", "profile", "offline_access"],
          })(req, res, next);
        });
        return;
      }

      console.log("[Auth] User fully authenticated, redirecting to /");
      return res.redirect("/");
    }

    console.log("[Auth] Starting login flow");
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log("[Auth] Callback received:", {
      hostname: req.hostname,
      query: req.query,
      hasSession: !!req.session,
      sessionID: req.session?.id,
      cookies: req.headers.cookie
    });

    try {
      ensureStrategy(req.hostname);
      console.log("[Auth] Strategy ensured");

      passport.authenticate(`replitauth:${req.hostname}`, (err: any, user: any, info: any) => {
        console.log("[Auth] Passport authenticate callback triggered", {
          hasError: !!err,
          hasUser: !!user,
          info
        });

        if (err) {
          console.error("[Auth] Callback error:", err);
          return res.status(500).send("Authentication error. Please try again.");
        }

        if (!user) {
          console.log("[Auth] No user returned, redirecting to login. Info:", info);
          return res.redirect("/api/login");
        }

        console.log("[Auth] User received, calling logIn. User claims:", user?.claims?.sub);
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            console.error("[Auth] Login error:", loginErr);
            return res.status(500).send("Login failed. Please try again.");
          }

          console.log("[Auth] logIn successful, session ID:", req.session?.id);

          // Explicitly save the session before redirecting
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error("[Auth] Session save error:", saveErr);
              return res.status(500).send("Failed to save session. Please try again.");
            }

            console.log("[Auth] Session saved successfully, redirecting to /. Session ID:", req.session?.id);
            return res.redirect("/");
          });
        });
      })(req, res, next);
    } catch (error) {
      console.error("[Auth] Callback exception:", error);
      return res.status(500).send("Authentication failed. Please try again.");
    }
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

  console.log("[Auth] isAuthenticated check:", {
    hasSession: !!req.session,
    sessionID: req.session?.id,
    isAuthenticated: req.isAuthenticated?.(),
    hasUser: !!user,
    userSub: user?.claims?.sub,
    path: req.path
  });

  if (!req.isAuthenticated()) {
    console.log("[Auth] req.isAuthenticated() returned false");
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (user?.deviceSession) {
    if (!user?.claims?.sub) {
      console.log("[Auth] Device session missing claims.sub");
      return res.status(401).json({ message: "Unauthorized" });
    }
    console.log("[Auth] Device session authenticated");
    return next();
  }

  if (!user.expires_at) {
    console.log("[Auth] No expires_at in user. Full user object:", JSON.stringify(user, null, 2));
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    console.log("[Auth] Token still valid, authenticated");
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    console.log("[Auth] Token expired and no refresh token");
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
