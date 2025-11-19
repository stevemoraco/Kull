/**
 * Admin CSV Export Endpoints
 *
 * Provides CSV export functionality for user data and analytics.
 * Admin only - requires admin authentication.
 */

import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import { storage } from '../storage';

const router = Router();

// Apply admin authentication to all routes in this router
router.use(requireAdmin);

/**
 * Escape CSV field value
 * Handles commas, quotes, and newlines
 */
function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // If the value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(headers: string[], rows: any[][]): string {
  const headerRow = headers.map(escapeCSV).join(',');
  const dataRows = rows.map(row => row.map(escapeCSV).join(','));
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Format date as YYYY-MM-DD HH:MM:SS or empty string
 */
function formatDate(date: Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * GET /api/admin/export/users-csv
 * Export all user data to CSV
 */
router.get('/users-csv', async (req: Request, res: Response) => {
  try {
    // Get all users
    const users = await storage.getAllUsers();

    // Get chat sessions to calculate message counts
    const allSessions = await storage.getChatSessions();

    // Create a map of userId -> session stats
    const userSessionStats = new Map<string, { sessionCount: number; totalMessages: number; lastActive: Date | null }>();

    allSessions.forEach((session: any) => {
      const userId = session.userId;
      if (!userId) return; // Skip anonymous sessions

      const messages = JSON.parse(session.messages || '[]');
      const existing = userSessionStats.get(userId) || { sessionCount: 0, totalMessages: 0, lastActive: null };

      userSessionStats.set(userId, {
        sessionCount: existing.sessionCount + 1,
        totalMessages: existing.totalMessages + messages.length,
        lastActive: !existing.lastActive || new Date(session.updatedAt) > existing.lastActive
          ? new Date(session.updatedAt)
          : existing.lastActive
      });
    });

    // Define CSV headers
    const headers = [
      'User ID',
      'Email',
      'First Name',
      'Last Name',
      'Join Date',
      'Subscription Status',
      'Subscription Tier',
      'Trial Started',
      'Trial Ends',
      'Trial Converted',
      'App Installed',
      'Special Offer Expires',
      'Total Sessions',
      'Total Messages',
      'Last Active',
      'Stripe Customer ID',
      'Stripe Subscription ID',
      'Created At',
      'Updated At'
    ];

    // Build data rows
    const rows = users.map((user: any) => {
      const stats = userSessionStats.get(user.id) || { sessionCount: 0, totalMessages: 0, lastActive: null };

      return [
        user.id,
        user.email || '',
        user.firstName || '',
        user.lastName || '',
        formatDate(user.createdAt),
        user.subscriptionStatus || 'none',
        user.subscriptionTier || '',
        formatDate(user.trialStartedAt),
        formatDate(user.trialEndsAt),
        formatDate(user.trialConvertedAt),
        formatDate(user.appInstalledAt),
        formatDate(user.specialOfferExpiresAt),
        stats.sessionCount,
        stats.totalMessages,
        formatDate(stats.lastActive),
        user.stripeCustomerId || '',
        user.stripeSubscriptionId || '',
        formatDate(user.createdAt),
        formatDate(user.updatedAt)
      ];
    });

    // Generate CSV
    const csv = arrayToCSV(headers, rows);

    // Set headers for file download
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kull-users-${timestamp}.csv"`);

    // Send CSV
    res.send('\ufeff' + csv); // UTF-8 BOM for proper Excel encoding
  } catch (error: any) {
    console.error('[Admin Export] Error exporting users CSV:', error);
    res.status(500).json({
      error: 'Export failed',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/export/sessions-csv
 * Export all chat sessions to CSV
 */
router.get('/sessions-csv', async (req: Request, res: Response) => {
  try {
    // Get all sessions
    const sessions = await storage.getChatSessions();

    // Define CSV headers
    const headers = [
      'Session ID',
      'User ID',
      'User Email',
      'Title',
      'Script Step',
      'Message Count',
      'Device',
      'Browser',
      'City',
      'State',
      'Country',
      'IP Address',
      'Created At',
      'Updated At'
    ];

    // Build data rows
    const rows = sessions.map((session: any) => {
      const messages = JSON.parse(session.messages || '[]');

      return [
        session.id,
        session.userId || 'Anonymous',
        session.userEmail || '',
        session.title || '',
        session.scriptStep || '',
        messages.length,
        session.device || '',
        session.browser || '',
        session.city || '',
        session.state || '',
        session.country || '',
        session.ipAddress || '',
        formatDate(session.createdAt),
        formatDate(session.updatedAt)
      ];
    });

    // Generate CSV
    const csv = arrayToCSV(headers, rows);

    // Set headers for file download
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kull-sessions-${timestamp}.csv"`);

    // Send CSV
    res.send('\ufeff' + csv); // UTF-8 BOM for proper Excel encoding
  } catch (error: any) {
    console.error('[Admin Export] Error exporting sessions CSV:', error);
    res.status(500).json({
      error: 'Export failed',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/export/support-queries-csv
 * Export all support queries to CSV
 */
router.get('/support-queries-csv', async (req: Request, res: Response) => {
  try {
    // Get support query stats (which includes all queries)
    const stats = await storage.getSupportQueryStats();

    // Define CSV headers
    const headers = [
      'Email',
      'Query Count',
      'Total Cost',
      'Conversation Count',
      'Total Messages',
      'Device',
      'Browser',
      'City',
      'State',
      'Country'
    ];

    // Build data rows
    const rows = stats.queriesByEmail.map((entry: any) => [
      entry.email,
      entry.count,
      entry.totalCost.toFixed(6),
      entry.conversationCount,
      entry.totalMessages,
      entry.device || '',
      entry.browser || '',
      entry.city || '',
      entry.state || '',
      entry.country || ''
    ]);

    // Generate CSV
    const csv = arrayToCSV(headers, rows);

    // Set headers for file download
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kull-support-queries-${timestamp}.csv"`);

    // Send CSV
    res.send('\ufeff' + csv); // UTF-8 BOM for proper Excel encoding
  } catch (error: any) {
    console.error('[Admin Export] Error exporting support queries CSV:', error);
    res.status(500).json({
      error: 'Export failed',
      message: error.message
    });
  }
});

export default router;
