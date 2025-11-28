import { Router, type Request, Response } from "express";
import { storage } from "../storage";

const router = Router();

// Version information for each platform
// NOTE: Auto-updated by release.sh script
const LATEST_VERSIONS = {
  macos: {
    version: "2025.11.27",
    buildNumber: "2327",
    downloadUrl: "/downloads/Kull-2025.11.27.2327.dmg",
    releaseNotes: "Latest release with all features",
    releaseDate: "2025-11-27",
    fileSize: "~5 MB",
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
    buildNumber: "2327",
    testFlightUrl: "https://testflight.apple.com/join/PtzCFZKb",
    releaseNotes: "iOS release on TestFlight - Beta Testing Available",
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
    version: "2025.11.27",
    buildNumber: "2327",
    date: "2025-11-27",
    platform: "all",
    notes: [
      "Universal Mac and iOS app release",
      "AI-powered photo rating using 5 advanced models",
      "TestFlight beta available for iOS",
      "Direct DMG download for macOS"
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

    const ipAddress = req.headers['cf-connecting-ip'] ||
                     req.headers['x-real-ip'] ||
                     req.headers['x-forwarded-for']?.split(',')[0] ||
                     req.connection?.remoteAddress ||
                     req.socket?.remoteAddress ||
                     'unknown';

    const userAgent = req.headers['user-agent'] || 'unknown';

    console.log(`[Download] Tracked: platform=${platform}, version=${version}, userId=${userId || 'anonymous'}, ip=${ipAddress}`);

    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking download:", error);
    res.status(500).json({ message: "Failed to track download" });
  }
});

export default router;
