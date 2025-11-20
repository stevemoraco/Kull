import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import downloadRouter from "./routes/download";
import creditsRouter from "./routes/credits";
import stripeWebhooksRouter from "./routes/stripe-webhooks";
import { setupVite, serveStatic, log } from "./vite";
import { startEmailProcessor } from "./emailService";
import { refreshRepoCache } from "./fetchRepo";
import { setupWebSocketServer } from "./websocket";
import { createSyncRouter } from "./routes/sync";
import { bootstrapNotificationAdapters } from "./services/bootstrapNotifications";
import transcribeRouter from "./routes/transcribe";
import notificationsRouter from "./routes/notifications";
import xmpExportRouter from "./routes/xmp-export";
import { runMigrations } from "./migrate";
import { warmPromptCache, startCacheWarmerInterval } from "./cacheWarmer";
import { initializeKnowledgeBase } from "./knowledge/repoCache";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  limit: '10mb', // Increase limit for large prompts (50k+ chars)
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      // Only log response body for specific cases
      if (capturedJsonResponse) {
        const jsonStr = JSON.stringify(capturedJsonResponse);

        // Skip logging body for admin endpoints with large responses
        if (path.includes('/api/admin/chat-users') ||
            path.includes('/api/admin/chat-sessions') ||
            path.includes('/api/admin/analytics')) {
          // Just log the size for large admin responses
          if (jsonStr.length > 200) {
            logLine += ` :: [${jsonStr.length} bytes]`;
          } else {
            logLine += ` :: ${jsonStr}`;
          }
        } else if (jsonStr.length > 500) {
          // Truncate other large responses
          logLine += ` :: ${jsonStr.substring(0, 500)}... [truncated]`;
        } else {
          // Log full response for small responses
          logLine += ` :: ${jsonStr}`;
        }
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Bootstrap notification adapters (lightweight)
  bootstrapNotificationAdapters();
  
  // Register routes and create server immediately
  const server = await registerRoutes(app);
  
  // Run migrations asynchronously after server setup to reduce startup time
  runMigrations().catch(err => {
    log(`[Migrations] Database migration failed: ${err.message}`);
  });

  // Setup WebSocket server
  log('[WebSocket] Setting up WebSocket server...');
  const wsService = setupWebSocketServer(server);

  // Register sync routes
  const syncRouter = createSyncRouter(wsService);
  app.use('/api/sync', syncRouter);
  log('[Sync] Sync routes registered at /api/sync');

  // Register download routes
  app.use('/api/download', downloadRouter);

  // Register credits routes
  app.use('/api/credits', creditsRouter);
  log('[Credits] Credits routes registered at /api/credits');

  // Register Stripe webhook routes (before other middleware)
  app.use('/api/stripe', stripeWebhooksRouter);
  log('[Stripe] Stripe webhook routes registered at /api/stripe');

  // Register transcribe routes
  app.use('/api', transcribeRouter);
  log('[Transcribe] Transcribe routes registered at /api/transcribe');

  // Register notifications routes
  app.use('/api', notificationsRouter);
  log('[Notifications] Notification routes registered at /api/notifications');

  // Register XMP export routes
  app.use('/api/xmp-export', xmpExportRouter);
  log('[XMP Export] XMP export routes registered at /api/xmp-export');

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Start the server immediately to ensure port 5000 is opened quickly
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });

  // Run all background initialization tasks asynchronously after server starts
  // This prevents blocking the server startup
  Promise.all([
    // Initialize knowledge base cache (Layer 2 prompt caching)
    (async () => {
      log('[Knowledge Base] Initializing knowledge base cache on startup...');
      try {
        await initializeKnowledgeBase();
      } catch (err: any) {
        log(`[Knowledge Base] Initial cache load failed: ${err.message}`);
      }
    })(),

    // Initialize GitHub repo cache
    (async () => {
      log('[Repo Cache] Initializing GitHub repository cache on startup...');
      try {
        await refreshRepoCache();
      } catch (err: any) {
        log(`[Repo Cache] Initial cache load failed: ${err.message}`);
      }
    })(),

    // Warm OpenAI prompt cache
    (async () => {
      log('[Cache Warmer] Warming OpenAI prompt cache on startup...');
      try {
        await warmPromptCache();
      } catch (err: any) {
        log(`[Cache Warmer] Initial cache warming failed: ${err.message}`);
      }
    })()
  ]).then(() => {
    log('[Initialization] All background tasks completed');
  }).catch(err => {
    log(`[Initialization] Some background tasks failed: ${err.message}`);
  });

  // Start email processor (runs every minute)
  startEmailProcessor();

  // Set up hourly GitHub repo cache refresh
  setInterval(() => {
    log('[Repo Cache] Running hourly cache refresh...');
    refreshRepoCache().catch(err => {
      log(`[Repo Cache] Hourly refresh failed: ${err.message}`);
    });
  }, 60 * 60 * 1000); // 1 hour
  log('[Repo Cache] Hourly cache refresh scheduled');

  // Start cache warming interval (every 4 minutes to keep cache hot)
  startCacheWarmerInterval();
})();
