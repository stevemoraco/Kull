import { Router, type Request, Response } from "express";
import { storage } from "../storage";

const router = Router();

// Version information for each platform
const LATEST_VERSIONS = {
  macos: {
    version: "2025.11.27",
    downloadUrl: "/downloads/Kull-v2025-11-27-11-54-AM.dmg",
    releaseNotes: "Updated version with improved stability and no keychain prompts",
    releaseDate: "2025-11-27",
    fileSize: "2.1 MB",
    minimumOS: "macOS 14.0+",
    features: [
      "5 AI models (Gemini, Grok, Kimi k2, Claude, GPT-5)",
      "Universal Mac app (Apple Silicon & Intel)",
      "Instant photo rating and organization",
      "Works with any folder on your Mac",
      "Auto-sync with iOS companion app"
    ]
  },
  ios: {
    version: "2025.11.27",
    appStoreUrl: "https://apps.apple.com/app/kull-ai/id123456789",
    testFlightUrl: "https://testflight.apple.com/join/Kull",
    releaseNotes: "Initial iOS release on TestFlight",
    releaseDate: "2025-11-27",
    minimumOS: "iOS 17.0+",
    features: [
      "Seamless sync with Mac app",
      "Rate photos on-the-go",
      "Optimized for iPhone & iPad",
      "Offline mode support",
      "Push notifications for processing updates"
    ]
  }
};

// Full changelog history
const CHANGELOG = [
  {
    version: "1.0.0",
    date: "2025-01-15",
    platform: "all",
    notes: [
      "Initial release of Kull AI",
      "AI-powered photo rating using 5 advanced models",
      "Universal Mac app with Apple Silicon optimization",
      "iOS companion app for on-the-go rating",
      "Auto-sync across all devices",
      "Support for RAW and JPEG formats"
    ]
  }
];

// GET /api/download/latest - Returns latest version info for each platform
router.get("/latest", async (req: Request, res: Response) => {
  try {
    res.json(LATEST_VERSIONS);
  } catch (error) {
    console.error("Error fetching latest versions:", error);
    res.status(500).json({ message: "Failed to fetch version information" });
  }
});

// GET /api/download/changelog - Returns full changelog history
router.get("/changelog", async (req: Request, res: Response) => {
  try {
    res.json(CHANGELOG);
  } catch (error) {
    console.error("Error fetching changelog:", error);
    res.status(500).json({ message: "Failed to fetch changelog" });
  }
});

// POST /api/download/track - Track download analytics
router.post("/track", async (req: any, res: Response) => {
  try {
    const { platform, version } = req.body;
    const userId = req.user?.claims?.sub || null;

    // Get IP address
    const ipAddress = req.headers['cf-connecting-ip'] ||
                     req.headers['x-real-ip'] ||
                     req.headers['x-forwarded-for']?.split(',')[0] ||
                     req.connection?.remoteAddress ||
                     req.socket?.remoteAddress ||
                     'unknown';

    // Get user agent
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Track the download event
    // TODO: Add storage.trackDownload method when downloads table is added to schema
    console.log(`[Download] Tracked: platform=${platform}, version=${version}, userId=${userId || 'anonymous'}, ip=${ipAddress}`);

    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking download:", error);
    res.status(500).json({ message: "Failed to track download" });
  }
});

export default router;
