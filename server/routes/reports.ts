import { Router, type Request, Response } from 'express';
import { db } from '../db';
import { shootReports, sharedReportLinks, users, creditTransactions } from '@shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { isAuthenticated, hasPaidAccessMiddleware } from '../replitAuth';

const router = Router();

// Native app flow:
// 1. User completes photo culling in app
// 2. App generates report data (breakdown, selects, narrative via AI)
// 3. Upload top select images to S3
// 4. POST /api/reports with report data + S3 URLs
// 5. Deduct credits for report generation
// 6. Sync report to web via WebSocket (REPORT_CREATED message)
// 7. User can view report in web app instantly

/**
 * GET /api/reports
 * Get all reports for authenticated user
 * Query params: page (default 1), limit (default 20), shootName (filter)
 * Requires paid access
 */
router.get('/', isAuthenticated, hasPaidAccessMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const shootName = req.query.shootName as string;
    const offset = (page - 1) * limit;

    let query = db
      .select({
        id: shootReports.id,
        shootId: shootReports.shootId,
        shootName: shootReports.shootName,
        totalImages: shootReports.totalImages,
        fiveStarCount: shootReports.fiveStarCount,
        topSelects: shootReports.topSelects,
        generatedAt: shootReports.generatedAt,
        creditCost: shootReports.creditCost,
        provider: shootReports.provider,
      })
      .from(shootReports)
      .where(eq(shootReports.userId, userId))
      .orderBy(desc(shootReports.generatedAt))
      .limit(limit)
      .offset(offset);

    if (shootName) {
      query = query.where(
        and(
          eq(shootReports.userId, userId),
          sql`${shootReports.shootName} ILIKE ${`%${shootName}%`}`
        )
      ) as any;
    }

    const reports = await query;

    // Transform to list item format
    const reportList = reports.map((report) => ({
      id: report.id,
      shootId: report.shootId,
      shootName: report.shootName,
      totalImages: report.totalImages,
      fiveStarCount: report.fiveStarCount,
      thumbnailUrl: (report.topSelects as any)?.[0]?.url || null,
      generatedAt: report.generatedAt,
      creditCost: report.creditCost,
      provider: report.provider,
    }));

    res.json(reportList);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
});

/**
 * GET /api/reports/:id
 * Get full report details
 * Must be report owner
 * Requires paid access
 */
router.get('/:id', isAuthenticated, hasPaidAccessMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const reportId = req.params.id;

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

    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ message: 'Failed to fetch report' });
  }
});

/**
 * POST /api/reports
 * Create new report (called by native app)
 * Requires authentication (user JWT or device JWT) and paid access
 * Deducts credits for report generation
 */
router.post('/', isAuthenticated, hasPaidAccessMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const {
      shootId,
      shootName,
      totalImages,
      oneStarCount = 0,
      twoStarCount = 0,
      threeStarCount = 0,
      fourStarCount = 0,
      fiveStarCount = 0,
      topSelects, // Array of { url, filename, rating, colorLabel }
      narrative,
      exportLinks = [],
      provider,
      creditCost,
    } = req.body;

    // Validate required fields
    if (
      !shootId ||
      !shootName ||
      !totalImages ||
      !topSelects ||
      !narrative ||
      !provider ||
      !creditCost
    ) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if report already exists for this shootId
    const [existing] = await db
      .select()
      .from(shootReports)
      .where(eq(shootReports.shootId, shootId))
      .limit(1);

    if (existing) {
      return res.status(409).json({ message: 'Report already exists for this shoot' });
    }

    // Get user's current credit balance
    const [latestTransaction] = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(1);

    const currentBalance = latestTransaction?.balance || 0;

    // Check if user has enough credits
    if (currentBalance < creditCost) {
      return res.status(402).json({
        message: 'Insufficient credits',
        required: creditCost,
        available: currentBalance,
      });
    }

    // Create report
    const [newReport] = await db
      .insert(shootReports)
      .values({
        userId,
        shootId,
        shootName,
        totalImages,
        oneStarCount,
        twoStarCount,
        threeStarCount,
        fourStarCount,
        fiveStarCount,
        topSelects: topSelects as any,
        narrative,
        exportLinks,
        provider,
        creditCost,
      })
      .returning();

    // Deduct credits
    await db.insert(creditTransactions).values({
      userId,
      amount: -creditCost,
      balance: currentBalance - creditCost,
      type: 'usage',
      provider,
      shootId,
      description: `Report generated for ${shootName}`,
      metadata: { reportId: newReport.id },
    });

    res.status(201).json({ reportId: newReport.id });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ message: 'Failed to create report' });
  }
});

/**
 * DELETE /api/reports/:id
 * Soft delete report (actually hard delete for now)
 * Must be report owner
 * Requires paid access
 */
router.delete('/:id', isAuthenticated, hasPaidAccessMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const reportId = req.params.id;

    // Verify ownership
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

    // Delete report (cascade will delete shared links)
    await db.delete(shootReports).where(eq(shootReports.id, reportId));

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ message: 'Failed to delete report' });
  }
});

/**
 * POST /api/reports/:id/share
 * Generate shareable link for report
 * Body: { expiresIn?: number } (seconds, default 7 days)
 * Requires paid access
 */
router.post('/:id/share', isAuthenticated, hasPaidAccessMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const reportId = req.params.id;
    const expiresIn = req.body.expiresIn || 7 * 24 * 60 * 60; // Default 7 days in seconds

    // Verify ownership
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

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Create shared link
    await db.insert(sharedReportLinks).values({
      reportId,
      token,
      expiresAt,
    });

    // Construct URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const shareUrl = `${baseUrl}/reports/shared/${token}`;

    res.json({
      url: shareUrl,
      token,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Error creating share link:', error);
    res.status(500).json({ message: 'Failed to create share link' });
  }
});

/**
 * GET /api/reports/shared/:token
 * Public endpoint to view shared report
 * No authentication required
 */
router.get('/shared/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    // Find shared link
    const [sharedLink] = await db
      .select()
      .from(sharedReportLinks)
      .where(eq(sharedReportLinks.token, token))
      .limit(1);

    if (!sharedLink) {
      return res.status(404).json({ message: 'Shared link not found' });
    }

    // Check if expired
    if (new Date() > new Date(sharedLink.expiresAt)) {
      return res.status(410).json({ message: 'Shared link has expired' });
    }

    // Get report
    const [report] = await db
      .select()
      .from(shootReports)
      .where(eq(shootReports.id, sharedLink.reportId))
      .limit(1);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Increment view count
    await db
      .update(sharedReportLinks)
      .set({ viewCount: sql`${sharedReportLinks.viewCount} + 1` })
      .where(eq(sharedReportLinks.id, sharedLink.id));

    // Return report with limited user info
    res.json({
      ...report,
      shared: true,
      sharedExpiresAt: sharedLink.expiresAt,
    });
  } catch (error) {
    console.error('Error fetching shared report:', error);
    res.status(500).json({ message: 'Failed to fetch shared report' });
  }
});

export default router;
