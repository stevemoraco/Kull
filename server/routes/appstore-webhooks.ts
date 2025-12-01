/**
 * App Store Connect Webhook Handler
 *
 * Receives webhooks from App Store Connect for:
 * - TESTFLIGHT_BETA_REVIEW_STATE_CHANGED - Beta build approvals/rejections
 * - APP_STORE_VERSION_STATE_CHANGED - App Store version status changes
 * - TESTFLIGHT_BETA_FEEDBACK - New tester feedback
 *
 * Setup in App Store Connect:
 * 1. Go to Users and Access > Integrations > Webhooks
 * 2. Click (+) to add webhook
 * 3. Set Payload URL to: https://kullai.com/api/webhooks/appstore
 * 4. Set Secret to the value of APPSTORE_WEBHOOK_SECRET env var
 * 5. Select the Kull app
 * 6. Enable: TestFlight Beta Review State Changed, App Store Version State Changed
 */

import { Router, type Request, Response } from "express";
import crypto from "crypto";

const router = Router();

// Webhook event types
type WebhookEventType =
  | "TESTFLIGHT_BETA_REVIEW_STATE_CHANGED"
  | "APP_STORE_VERSION_STATE_CHANGED"
  | "APP_STORE_VERSION_RELEASED"
  | "TESTFLIGHT_BETA_FEEDBACK"
  | "BUILD_UPLOAD_STATE_CHANGED"
  | "PING";

// Beta review states
type BetaReviewState =
  | "WAITING_FOR_REVIEW"
  | "IN_REVIEW"
  | "REJECTED"
  | "APPROVED";

// App Store version states
type AppStoreState =
  | "READY_FOR_SUBMISSION"
  | "WAITING_FOR_REVIEW"
  | "IN_REVIEW"
  | "REJECTED"
  | "PENDING_DEVELOPER_RELEASE"
  | "READY_FOR_SALE";

interface WebhookPayload {
  eventType: WebhookEventType;
  apiVersion: string;
  eventId: string;
  eventDate: string;
  data: {
    app: {
      id: string;
      name: string;
      bundleId: string;
    };
    build?: {
      id: string;
      version: string;
      betaReviewState?: BetaReviewState;
    };
    appStoreVersion?: {
      id: string;
      versionString: string;
      appStoreState: AppStoreState;
    };
    // Note: Apple doesn't include rejection reason in webhook payload
    // You must query the API separately or check Resolution Center
  };
}

/**
 * Verify webhook signature using HMAC-SHA256
 * Apple sends signature in X-Apple-SIGNATURE header
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Handle beta review state changes (TestFlight)
 */
async function handleBetaReviewStateChange(data: WebhookPayload["data"]) {
  const build = data.build;
  if (!build) return;

  const state = build.betaReviewState;
  const version = build.version;
  const appName = data.app.name;

  console.log(`[AppStore Webhook] Beta review state changed: ${appName} v${version} -> ${state}`);

  if (state === "REJECTED") {
    console.log(`[AppStore Webhook] ⚠️ BUILD REJECTED: ${appName} v${version}`);
    console.log(`[AppStore Webhook] Check App Store Connect Resolution Center for rejection details`);
    console.log(`[AppStore Webhook] Common fixes documented in CLAUDE.md under "Beta Review Rejection Fixes"`);

    // TODO: Send notification (Slack, email, etc.)
    // TODO: Query API for more details if available
    // Note: Rejection reason text is NOT in the webhook payload
    // Must check Resolution Center manually or parse email notification
  } else if (state === "APPROVED") {
    console.log(`[AppStore Webhook] ✅ BUILD APPROVED: ${appName} v${version}`);
    console.log(`[AppStore Webhook] Build is now available on TestFlight`);
  } else if (state === "IN_REVIEW") {
    console.log(`[AppStore Webhook] 🔍 BUILD IN REVIEW: ${appName} v${version}`);
  }
}

/**
 * Handle App Store version state changes
 */
async function handleAppStoreVersionStateChange(data: WebhookPayload["data"]) {
  const version = data.appStoreVersion;
  if (!version) return;

  const state = version.appStoreState;
  const versionString = version.versionString;
  const appName = data.app.name;

  console.log(`[AppStore Webhook] App Store version state changed: ${appName} v${versionString} -> ${state}`);

  if (state === "REJECTED") {
    console.log(`[AppStore Webhook] ⚠️ APP STORE VERSION REJECTED: ${appName} v${versionString}`);
    console.log(`[AppStore Webhook] Check App Store Connect Resolution Center for rejection details`);
  } else if (state === "READY_FOR_SALE") {
    console.log(`[AppStore Webhook] ✅ APP LIVE: ${appName} v${versionString} is now on the App Store!`);
  }
}

// POST /api/webhooks/appstore - Receive App Store Connect webhooks
router.post("/", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-apple-signature"] as string;
    const secret = process.env.APPSTORE_WEBHOOK_SECRET;

    // Verify signature if secret is configured
    if (secret && signature) {
      const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      if (!verifySignature(rawBody, signature, secret)) {
        console.log("[AppStore Webhook] Invalid signature - rejecting request");
        return res.status(401).json({ error: "Invalid signature" });
      }
    } else if (!secret) {
      console.log("[AppStore Webhook] Warning: APPSTORE_WEBHOOK_SECRET not configured, skipping signature verification");
    }

    const payload = req.body as WebhookPayload;
    const { eventType, eventId, eventDate, data } = payload;

    console.log(`[AppStore Webhook] Received event: ${eventType} (${eventId}) at ${eventDate}`);

    switch (eventType) {
      case "PING":
        console.log("[AppStore Webhook] Ping received - webhook is configured correctly");
        break;

      case "TESTFLIGHT_BETA_REVIEW_STATE_CHANGED":
        await handleBetaReviewStateChange(data);
        break;

      case "APP_STORE_VERSION_STATE_CHANGED":
        await handleAppStoreVersionStateChange(data);
        break;

      case "APP_STORE_VERSION_RELEASED":
        console.log(`[AppStore Webhook] 🎉 App released: ${data.app.name} v${data.appStoreVersion?.versionString}`);
        break;

      case "TESTFLIGHT_BETA_FEEDBACK":
        console.log(`[AppStore Webhook] 📝 New TestFlight feedback for ${data.app.name}`);
        break;

      case "BUILD_UPLOAD_STATE_CHANGED":
        console.log(`[AppStore Webhook] Build upload state changed: ${data.build?.version}`);
        break;

      default:
        console.log(`[AppStore Webhook] Unhandled event type: ${eventType}`);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true, eventId });
  } catch (error: any) {
    console.error("[AppStore Webhook] Error processing webhook:", error);
    // Still return 200 to prevent Apple from retrying
    res.status(200).json({ received: true, error: error.message });
  }
});

// GET /api/webhooks/appstore/health - Health check endpoint
router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    configured: !!process.env.APPSTORE_WEBHOOK_SECRET,
    endpoint: "https://kullai.com/api/webhooks/appstore"
  });
});

export default router;
