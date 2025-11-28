import { Router, type Request, Response } from "express";
import { Storage } from "@google-cloud/storage";
import { storage } from "../storage";
import multer from 'multer';

const router = Router();

// Initialize Google Cloud Storage client for Replit Object Storage
const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const storageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

// Bucket configuration - using the folder structure Objects/builds
const BUCKET_ID = process.env.REPLIT_OBJECT_STORAGE_BUCKET_ID || "replit-objstore-e81d00f9-23cb-4cee-bed9-b804b7721355";
const DMG_PREFIX = "Objects/builds/";

// Configure multer for file uploads (store in memory)
const upload = multer({ storage: multer.memoryStorage() });

// Helper interface for parsed DMG info
interface DMGInfo {
  filename: string;
  version: string;
  buildNumber: string;
  releaseDate: string;
}

/**
 * Parse DMG filename to extract version info
 * Format: Kull-YYYY.MM.DD.BBBB.dmg
 * Example: Kull-2025.11.27.2327.dmg
 */
function parseDMGFilename(filename: string): DMGInfo | null {
  const match = filename.match(/^Kull-(\d{4})\.(\d{2})\.(\d{2})\.(\d{4})\.dmg$/);
  if (!match) return null;

  const [, year, month, day, buildNumber] = match;
  const version = `${year}.${month}.${day}`;
  const releaseDate = `${year}-${month}-${day}`;

  return {
    filename,
    version,
    buildNumber,
    releaseDate
  };
}

/**
 * Get the latest DMG file from Replit Object Storage
 */
async function getLatestDMG(): Promise<DMGInfo | null> {
  try {
    const bucket = storageClient.bucket(BUCKET_ID);
    const [files] = await bucket.getFiles({ prefix: DMG_PREFIX });

    // Filter for .dmg files and parse them
    const dmgFiles: DMGInfo[] = [];
    for (const file of files) {
      const filename = file.name.replace(DMG_PREFIX, '');
      if (filename.endsWith('.dmg')) {
        const parsed = parseDMGFilename(filename);
        if (parsed) {
          dmgFiles.push(parsed);
        }
      }
    }

    if (dmgFiles.length === 0) {
      console.log("[Download] No DMG files found in bucket:", BUCKET_ID, "prefix:", DMG_PREFIX);
      return null;
    }

    // Sort by build number (highest first)
    dmgFiles.sort((a, b) => parseInt(b.buildNumber) - parseInt(a.buildNumber));

    console.log("[Download] Latest DMG:", dmgFiles[0].filename);
    return dmgFiles[0];
  } catch (error) {
    console.error("Error fetching latest DMG:", error);
    return null;
  }
}

// GET /api/download/latest - Returns latest version info for each platform
router.get("/latest", async (req: Request, res: Response) => {
  try {
    const latestDMG = await getLatestDMG();

    if (!latestDMG) {
      // Fallback if no builds available
      return res.json({
        macos: {
          version: "N/A",
          buildNumber: "N/A",
          downloadUrl: null,
          releaseNotes: "No builds available",
          releaseDate: null,
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
          version: "N/A",
          buildNumber: "N/A",
          testFlightUrl: "https://testflight.apple.com/join/PtzCFZKb",
          releaseNotes: "iOS release on TestFlight - Beta Testing Available",
          releaseDate: null,
          minimumOS: "iOS 17.0+",
          features: [
            "Seamless sync with Mac app",
            "Rate photos on-the-go",
            "Optimized for iPhone & iPad",
            "Offline mode support",
            "Push notifications for processing updates"
          ]
        }
      });
    }

    res.json({
      macos: {
        version: latestDMG.version,
        buildNumber: latestDMG.buildNumber,
        downloadUrl: `/api/download/dmg/${latestDMG.filename}`,
        releaseNotes: "Latest release with all features",
        releaseDate: latestDMG.releaseDate,
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
        version: latestDMG.version,
        buildNumber: latestDMG.buildNumber,
        testFlightUrl: "https://testflight.apple.com/join/PtzCFZKb",
        releaseNotes: "iOS release on TestFlight - Beta Testing Available",
        releaseDate: latestDMG.releaseDate,
        minimumOS: "iOS 17.0+",
        features: [
          "Seamless sync with Mac app",
          "Rate photos on-the-go",
          "Optimized for iPhone & iPad",
          "Offline mode support",
          "Push notifications for processing updates"
        ]
      }
    });
  } catch (error) {
    console.error("Error fetching latest versions:", error);
    res.status(500).json({ message: "Failed to fetch version information" });
  }
});

// GET /api/download/dmg/:filename - Stream DMG file to client
router.get("/dmg/:filename", async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;

    // Validate filename format
    if (!parseDMGFilename(filename)) {
      return res.status(400).json({ message: "Invalid DMG filename format" });
    }

    const bucket = storageClient.bucket(BUCKET_ID);
    const file = bucket.file(`${DMG_PREFIX}${filename}`);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ message: "DMG file not found" });
    }

    // Get file metadata for size
    const [metadata] = await file.getMetadata();

    // Set proper headers for DMG download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    if (metadata.size) {
      res.setHeader('Content-Length', metadata.size);
    }

    // Stream the file to the response
    const stream = file.createReadStream();

    stream.on('error', (error) => {
      console.error("Error streaming DMG:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to stream DMG file" });
      }
    });

    stream.pipe(res);
  } catch (error: any) {
    console.error("Error downloading DMG:", error);
    if (error.code === 404) {
      return res.status(404).json({ message: "DMG file not found" });
    }
    res.status(500).json({ message: "Failed to download DMG file" });
  }
});

// POST /api/download/upload - Upload new DMG (protected by DEPLOY_SECRET)
router.post("/upload", upload.single('dmg'), async (req: Request, res: Response) => {
  try {
    const { secret } = req.body;

    // Verify deploy secret
    if (!process.env.DEPLOY_SECRET || secret !== process.env.DEPLOY_SECRET) {
      return res.status(401).json({ message: "Unauthorized: Invalid deploy secret" });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: "No DMG file uploaded" });
    }

    const filename = req.file.originalname;

    // Validate filename format
    const parsed = parseDMGFilename(filename);
    if (!parsed) {
      return res.status(400).json({ message: "Invalid DMG filename format. Expected: Kull-YYYY.MM.DD.BBBB.dmg" });
    }

    // Upload to object storage
    const bucket = storageClient.bucket(BUCKET_ID);
    const file = bucket.file(`${DMG_PREFIX}${filename}`);
    await file.save(req.file.buffer, {
      contentType: 'application/octet-stream',
    });

    console.log(`[Upload] Successfully uploaded ${filename} (version: ${parsed.version}, build: ${parsed.buildNumber})`);

    // Get all DMG files and delete old ones (keep only latest 2 versions)
    const [files] = await bucket.getFiles({ prefix: DMG_PREFIX });
    const dmgFiles: DMGInfo[] = [];

    for (const f of files) {
      const fname = f.name.replace(DMG_PREFIX, '');
      if (fname.endsWith('.dmg')) {
        const parsedFile = parseDMGFilename(fname);
        if (parsedFile) {
          dmgFiles.push(parsedFile);
        }
      }
    }

    // Sort by build number (highest first)
    dmgFiles.sort((a, b) => parseInt(b.buildNumber) - parseInt(a.buildNumber));

    // Delete all except the latest 2
    if (dmgFiles.length > 2) {
      for (let i = 2; i < dmgFiles.length; i++) {
        await bucket.file(`${DMG_PREFIX}${dmgFiles[i].filename}`).delete();
        console.log(`[Upload] Deleted old DMG: ${dmgFiles[i].filename}`);
      }
    }

    res.json({
      success: true,
      version: parsed.version,
      buildNumber: parsed.buildNumber,
      releaseDate: parsed.releaseDate,
      filename: parsed.filename
    });
  } catch (error) {
    console.error("Error uploading DMG:", error);
    res.status(500).json({ message: "Failed to upload DMG file" });
  }
});

// GET /api/download/list - List all available DMGs (for debugging)
router.get("/list", async (req: Request, res: Response) => {
  try {
    const bucket = storageClient.bucket(BUCKET_ID);
    const [files] = await bucket.getFiles({ prefix: DMG_PREFIX });
    const dmgFiles: DMGInfo[] = [];

    for (const file of files) {
      const filename = file.name.replace(DMG_PREFIX, '');
      if (filename.endsWith('.dmg')) {
        const parsed = parseDMGFilename(filename);
        if (parsed) {
          dmgFiles.push(parsed);
        }
      }
    }

    // Sort by build number (highest first)
    dmgFiles.sort((a, b) => parseInt(b.buildNumber) - parseInt(a.buildNumber));

    res.json({
      count: dmgFiles.length,
      bucket: BUCKET_ID,
      prefix: DMG_PREFIX,
      dmgs: dmgFiles
    });
  } catch (error) {
    console.error("Error listing DMGs:", error);
    res.status(500).json({ message: "Failed to list DMG files" });
  }
});

// GET /api/download/changelog - Returns full changelog history (generated from DMGs)
router.get("/changelog", async (req: Request, res: Response) => {
  try {
    const files = await storageClient.list();
    const dmgFiles: DMGInfo[] = [];

    for (const file of files) {
      if (file.key.endsWith('.dmg')) {
        const parsed = parseDMGFilename(file.key);
        if (parsed) {
          dmgFiles.push(parsed);
        }
      }
    }

    // Sort by build number (highest first)
    dmgFiles.sort((a, b) => parseInt(b.buildNumber) - parseInt(a.buildNumber));

    // Generate changelog from available DMGs
    const changelog = dmgFiles.map(dmg => ({
      version: dmg.version,
      buildNumber: dmg.buildNumber,
      date: dmg.releaseDate,
      platform: "all",
      notes: [
        "Universal Mac and iOS app release",
        "AI-powered photo rating using 5 advanced models",
        "TestFlight beta available for iOS",
        "Direct DMG download for macOS"
      ]
    }));

    res.json(changelog);
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
