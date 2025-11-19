/**
 * XMP Export API Route
 *
 * Generates and streams XMP sidecar files as a ZIP archive for import into Adobe Lightroom.
 * Handles large batches (5000+ images) efficiently with streaming ZIP generation.
 *
 * Endpoint: GET /api/xmp-export/:reportId
 */

import { Router, Request, Response } from 'express';
import archiver from 'archiver';
import { db } from '../db';
import { shootReports, batchJobs } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { generateXmpSidecar, getXmpFilename, validateRatingForXmp } from '../../shared/utils/xmp-generator';
import type { PhotoRating } from '../ai/BaseProviderAdapter';

const router = Router();

/**
 * GET /api/xmp-export/:reportId
 *
 * Generates XMP sidecar files for all images in a shoot report and streams as ZIP.
 * Uses archiver for efficient streaming of large archives (5000+ files).
 *
 * @param reportId - UUID of the shoot report
 * @returns ZIP file stream with XMP sidecars (filename: {shootName}-xmp.zip)
 */
router.get('/:reportId', async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 1. Fetch shoot report
    const [report] = await db
      .select()
      .from(shootReports)
      .where(eq(shootReports.id, reportId))
      .limit(1);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Verify ownership
    if (report.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 2. Fetch batch job with detailed ratings
    const [batchJob] = await db
      .select()
      .from(batchJobs)
      .where(eq(batchJobs.shootId, report.shootId))
      .limit(1);

    if (!batchJob) {
      return res.status(404).json({ error: 'Batch job not found for this report' });
    }

    // Extract ratings from batch job results
    const results = batchJob.results as { rating: PhotoRating }[] | null;
    if (!results || results.length === 0) {
      return res.status(404).json({
        error: 'No ratings found',
        message: 'This report does not contain AI ratings. Please process the shoot first.',
      });
    }

    const ratings = results.map((r) => r.rating).filter(validateRatingForXmp);

    if (ratings.length === 0) {
      return res.status(400).json({
        error: 'No valid ratings',
        message: 'None of the ratings in this report are valid for XMP export.',
      });
    }

    // 3. Set up ZIP streaming response
    const zipFilename = `${sanitizeFilename(report.shootName)}-xmp.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('X-Total-Files', ratings.length.toString());

    // 4. Create archiver instance
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    // Handle archiver errors
    archive.on('error', (err) => {
      console.error('Archiver error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate ZIP archive' });
      }
    });

    // Handle warnings (e.g., stat failures)
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('Archiver warning:', err);
      } else {
        throw err;
      }
    });

    // Pipe archive to response
    archive.pipe(res);

    // 5. Generate and add XMP files to archive
    let processedCount = 0;
    const totalFiles = ratings.length;

    for (const rating of ratings) {
      try {
        const xmpFilename = getXmpFilename(rating.filename);
        const xmpContent = generateXmpSidecar(rating, rating.filename);

        // Add to archive as buffer (efficient for large batches)
        archive.append(Buffer.from(xmpContent, 'utf-8'), {
          name: xmpFilename,
        });

        processedCount++;

        // Log progress for admin monitoring (every 100 files or at completion)
        if (processedCount % 100 === 0 || processedCount === totalFiles) {
          console.log(
            `[XMP Export] Progress: ${processedCount}/${totalFiles} files (${Math.round((processedCount / totalFiles) * 100)}%) - Report: ${reportId}`
          );
        }
      } catch (error) {
        console.error(`Failed to generate XMP for ${rating.filename}:`, error);
        // Continue with other files even if one fails
      }
    }

    // 6. Add README with Lightroom import instructions
    const readme = generateReadme(report.shootName, ratings.length);
    archive.append(Buffer.from(readme, 'utf-8'), {
      name: 'HOW_TO_IMPORT_INTO_LIGHTROOM.txt',
    });

    // 7. Finalize archive (triggers pipe completion)
    await archive.finalize();

    console.log(
      `[XMP Export] Complete: ${processedCount} XMP files exported for report ${reportId} (${report.shootName})`
    );
  } catch (error) {
    console.error('XMP export error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to export XMP files',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
});

/**
 * GET /api/xmp-export/:reportId/preview
 *
 * Returns a single XMP file preview for testing/debugging
 *
 * @param reportId - UUID of the shoot report
 * @returns XMP content as text/xml
 */
router.get('/:reportId/preview', async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch report and batch job
    const [report] = await db
      .select()
      .from(shootReports)
      .where(eq(shootReports.id, reportId))
      .limit(1);

    if (!report || report.userId !== userId) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const [batchJob] = await db
      .select()
      .from(batchJobs)
      .where(eq(batchJobs.shootId, report.shootId))
      .limit(1);

    if (!batchJob) {
      return res.status(404).json({ error: 'Batch job not found' });
    }

    const results = batchJob.results as { rating: PhotoRating }[] | null;
    if (!results || results.length === 0) {
      return res.status(404).json({ error: 'No ratings found' });
    }

    // Get first valid rating
    const firstRating = results.map((r) => r.rating).find(validateRatingForXmp);

    if (!firstRating) {
      return res.status(404).json({ error: 'No valid ratings' });
    }

    // Generate XMP
    const xmpContent = generateXmpSidecar(firstRating, firstRating.filename);

    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('Content-Disposition', `inline; filename="${getXmpFilename(firstRating.filename)}"`);
    res.send(xmpContent);
  } catch (error) {
    console.error('XMP preview error:', error);
    res.status(500).json({
      error: 'Failed to generate XMP preview',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Sanitizes filename for safe filesystem usage
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9-_]/g, '_') // Replace special chars with underscore
    .replace(/_+/g, '_') // Collapse multiple underscores
    .substring(0, 100); // Limit length
}

/**
 * Generates README content with Lightroom import instructions
 */
function generateReadme(shootName: string, fileCount: number): string {
  return `KULL AI - XMP SIDECAR EXPORT
==============================

Shoot: ${shootName}
Total XMP Files: ${fileCount}
Generated: ${new Date().toISOString()}

HOW TO IMPORT INTO ADOBE LIGHTROOM
===================================

OPTION 1: DIRECT IMPORT (macOS/Windows)
----------------------------------------
1. Extract this ZIP file next to your RAW image files
2. Ensure XMP files have the same base name as your RAW files:
   Example:
     IMG_1234.CR3  <- Your RAW file
     IMG_1234.xmp  <- Kull XMP sidecar
3. Open Adobe Lightroom Classic
4. Import the folder containing your RAW files
5. Lightroom will automatically detect and apply XMP metadata
6. You should see:
   - Star ratings (1-5 stars)
   - Color labels (red, yellow, green, blue, purple)
   - Keywords/tags
   - Descriptions (in Caption field)

OPTION 2: MANUAL METADATA RELOAD
---------------------------------
If XMP files were added after importing:
1. Extract XMP files next to RAW files
2. In Lightroom, select all photos
3. Go to: Metadata > Read Metadata from Files
4. Lightroom will re-read XMP sidecars

TROUBLESHOOTING
---------------
- XMP files must be in the SAME folder as RAW files
- XMP filename must match RAW filename (e.g., IMG_1234.CR3 -> IMG_1234.xmp)
- If ratings don't appear, try: Metadata > Read Metadata from Files
- On Windows, you may need to manually trigger metadata reload

KULL-SPECIFIC METADATA
----------------------
In addition to Lightroom-standard fields, each XMP file contains detailed
Kull AI scores (1-1000 scale) for future re-ranking:

- Technical Quality: Sharpness, Exposure, Composition, Lighting, etc.
- Subject Analysis: Emotion Intensity, Facial Sharpness, Moment Timing, etc.

These fields are not visible in Lightroom but are preserved for use in
the Kull app if you want to adjust rating criteria later.

SUPPORT
-------
Need help? Contact: steve@lander.media
Documentation: https://kull.ai/docs

Kull AI - Professional Photo Culling Powered by AI
https://kull.ai
`;
}

export default router;
