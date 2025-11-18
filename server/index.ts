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
  bootstrapNotificationAdapters();
  const server = await registerRoutes(app);

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
  server.listen(port, () => {
    log(`serving on port ${port}`);

    // Start email processor (runs every minute)
    startEmailProcessor();

    // Initialize GitHub repo cache immediately on startup
    log('[Repo Cache] Initializing GitHub repository cache on startup...');
    refreshRepoCache().catch(err => {
      log(`[Repo Cache] Initial cache load failed: ${err.message}`);
    });

    // Refresh GitHub repo cache every hour
    setInterval(() => {
      log('[Repo Cache] Running hourly cache refresh...');
      refreshRepoCache().catch(err => {
        log(`[Repo Cache] Hourly refresh failed: ${err.message}`);
      });
    }, 60 * 60 * 1000); // 1 hour

    log('[Repo Cache] Hourly cache refresh scheduled');
  });
})();
