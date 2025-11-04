import { Router, type Response } from 'express';
import { db } from '../db';
import { shootReports } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';

const router = Router();

// Middleware to check authentication
const isAuthenticated = (req: any, res: Response, next: Function) => {
  if (!req.user || !req.user.claims?.sub) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

/**
 * GET /api/exports/:reportId/:filename
 * Stream export file to user
 * Requires authentication (must be report owner)
 * Sets Content-Disposition: attachment for download
 */
router.get('/:reportId/:filename', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const { reportId, filename } = req.params;

    // Verify user owns the report
    const [report] = await db
      .select()
      .from(shootReports)
      .where(
        and(
          eq(shootReports.id, reportId),
          eq(shootReports.userId, userId)
        )
      )
      .limit(1);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check if filename is in report's export links
    const exportLinks = report.exportLinks || [];
    const exportFile = exportLinks.find((link: string) =>
      link.endsWith(filename) || link.includes(filename)
    );

    if (!exportFile) {
      return res.status(404).json({ message: 'Export file not found' });
    }

    // In production, this would stream from S3
    // For now, we'll handle local file system or proxy S3 URLs
    if (exportFile.startsWith('http://') || exportFile.startsWith('https://')) {
      // For S3 URLs, redirect to signed URL or proxy the content
      // This is a simplified version - in production you'd use AWS SDK to generate signed URLs
      return res.redirect(exportFile);
    } else {
      // For local files
      const filePath = path.resolve(exportFile);

      // Security check: ensure file is within allowed directory
      const allowedDir = path.resolve(process.env.EXPORTS_DIR || './exports');
      if (!filePath.startsWith(allowedDir)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Get file stats for content length
      const stats = fs.statSync(filePath);

      // Set headers
      res.setHeader('Content-Type', getContentType(filename));
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Stream file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      // Track download analytics (optional)
      // Could log to analytics service or database
    }
  } catch (error) {
    console.error('Error serving export file:', error);
    res.status(500).json({ message: 'Failed to download export file' });
  }
});

/**
 * Helper function to determine content type based on file extension
 */
function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.lrcat': 'application/octet-stream',
    '.csv': 'text/csv',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.json': 'application/json',
    '.zip': 'application/zip',
    '.txt': 'text/plain',
  };
  return contentTypes[ext] || 'application/octet-stream';
}

export default router;
