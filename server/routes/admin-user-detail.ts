/**
 * Admin User Detail Endpoint
 *
 * Comprehensive view of a single user's activity, conversations, calculator values, and engagement.
 * Shows EVERYTHING about one user for admin debugging and support.
 */

import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import { storage } from '../storage';
import { db } from '../db';
import { users, chatSessions, supportQueries, pageVisits } from '@shared/schema';
import { eq, desc, sql, and } from 'drizzle-orm';

const router = Router();

// Apply admin authentication to all routes
router.use(requireAdmin);

/**
 * GET /api/admin/user/:userId/details
 * Get comprehensive details about a single user
 */
router.get('/:userId/details', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // 1. Get user profile
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 2. Get all chat sessions for this user
    const userChatSessions = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt));

    // Parse messages and extract calculator values
    const sessionsWithDetails = userChatSessions.map((session: any) => {
      const messages = JSON.parse(session.messages || '[]');

      // Extract calculator values from messages (look for user inputs about shoots, hours, rate)
      const calculatorMentions = messages.filter((msg: any) =>
        msg.role === 'user' && (
          msg.content.toLowerCase().includes('shoot') ||
          msg.content.toLowerCase().includes('hour') ||
          msg.content.toLowerCase().includes('rate') ||
          msg.content.toLowerCase().includes('$')
        )
      );

      return {
        id: session.id,
        title: session.title,
        messageCount: messages.length,
        messages: messages,
        calculatorMentions,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        device: session.device,
        browser: session.browser,
        city: session.city,
        state: session.state,
        country: session.country,
      };
    });

    // 3. Get support queries (queries from supportQueries table)
    const userSupportQueries = await db
      .select()
      .from(supportQueries)
      .where(eq(supportQueries.userId, userId))
      .orderBy(desc(supportQueries.createdAt));

    // 4. Get page visits
    const userPageVisits = await db
      .select()
      .from(pageVisits)
      .where(eq(pageVisits.userId, userId))
      .orderBy(desc(pageVisits.createdAt));

    // 5. Calculate aggregated stats
    const totalMessages = sessionsWithDetails.reduce((sum: number, session: any) => sum + session.messageCount, 0);
    const totalConversations = sessionsWithDetails.length;
    const totalSupportCost = userSupportQueries.reduce((sum: number, query: any) => sum + parseFloat(query.cost || '0'), 0);
    const totalPageViews = userPageVisits.length;

    // 6. Get activity timeline (combine all events)
    const activityTimeline = [
      ...userPageVisits.map((visit: any) => ({
        type: 'page_visit',
        timestamp: visit.createdAt,
        data: { page: visit.page, referrer: visit.referrer }
      })),
      ...sessionsWithDetails.map(session => ({
        type: 'chat_session',
        timestamp: session.createdAt,
        data: { title: session.title, messageCount: session.messageCount }
      })),
      ...userSupportQueries.map((query: any) => ({
        type: 'support_query',
        timestamp: query.createdAt,
        data: { message: query.userMessage, cost: query.cost }
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 7. Extract calculator values from conversation context
    // Look for patterns like "2 shoots per week", "3 hours", "$50/hour"
    let detectedCalculatorValues = {
      shootsPerWeek: null as number | null,
      hoursPerShoot: null as number | null,
      billableRate: null as number | null,
      mentions: [] as any[]
    };

    sessionsWithDetails.forEach(session => {
      session.messages.forEach((msg: any) => {
        if (msg.role === 'user') {
          const content = msg.content.toLowerCase();

          // Look for shoots per week (e.g., "2 shoots", "3 weddings")
          const shootsMatch = content.match(/(\d+)\s*(shoots?|weddings?|sessions?)\s*(per\s*week|weekly)?/i);
          if (shootsMatch && !detectedCalculatorValues.shootsPerWeek) {
            detectedCalculatorValues.shootsPerWeek = parseInt(shootsMatch[1]);
            detectedCalculatorValues.mentions.push({
              type: 'shootsPerWeek',
              value: shootsMatch[1],
              context: msg.content,
              timestamp: msg.timestamp
            });
          }

          // Look for hours per shoot (e.g., "2 hours", "1.5 hours")
          const hoursMatch = content.match(/(\d+(?:\.\d+)?)\s*hours?\s*(per\s*shoot|culling|sorting)?/i);
          if (hoursMatch && !detectedCalculatorValues.hoursPerShoot) {
            detectedCalculatorValues.hoursPerShoot = parseFloat(hoursMatch[1]);
            detectedCalculatorValues.mentions.push({
              type: 'hoursPerShoot',
              value: hoursMatch[1],
              context: msg.content,
              timestamp: msg.timestamp
            });
          }

          // Look for billable rate (e.g., "$50", "$100/hour")
          const rateMatch = content.match(/\$(\d+)(?:\/(?:hour|hr))?/i);
          if (rateMatch && !detectedCalculatorValues.billableRate) {
            detectedCalculatorValues.billableRate = parseInt(rateMatch[1]);
            detectedCalculatorValues.mentions.push({
              type: 'billableRate',
              value: rateMatch[1],
              context: msg.content,
              timestamp: msg.timestamp
            });
          }
        }
      });
    });

    // 8. Get first and last activity dates
    const firstActivity = activityTimeline.length > 0
      ? activityTimeline[activityTimeline.length - 1].timestamp
      : user.createdAt;
    const lastActivity = activityTimeline.length > 0
      ? activityTimeline[0].timestamp
      : user.updatedAt;

    // 9. Calculate engagement score (0-100)
    let engagementScore = 0;
    if (totalPageViews > 0) engagementScore += 10;
    if (totalPageViews > 5) engagementScore += 10;
    if (totalConversations > 0) engagementScore += 20;
    if (totalConversations > 3) engagementScore += 10;
    if (totalMessages > 5) engagementScore += 15;
    if (totalMessages > 15) engagementScore += 10;
    if (user.subscriptionStatus === 'trial' || user.subscriptionStatus === 'active') engagementScore += 25;

    const response = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        trialStartedAt: user.trialStartedAt,
        trialEndsAt: user.trialEndsAt,
        trialConvertedAt: user.trialConvertedAt,
        specialOfferExpiresAt: user.specialOfferExpiresAt,
        appInstalledAt: user.appInstalledAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      chatSessions: sessionsWithDetails,
      supportQueries: userSupportQueries,
      pageVisits: userPageVisits,
      activityTimeline,
      calculatorValues: detectedCalculatorValues,
      stats: {
        totalMessages,
        totalConversations,
        totalSupportCost,
        totalPageViews,
        engagementScore,
        firstActivity,
        lastActivity,
        daysSinceFirstActivity: Math.floor((Date.now() - new Date(firstActivity).getTime()) / (1000 * 60 * 60 * 24)),
        daysSinceLastActivity: Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)),
      }
    };

    res.json(response);

  } catch (error: any) {
    console.error('[Admin User Detail] Error fetching user details:', error);
    res.status(500).json({
      error: 'Failed to fetch user details',
      message: error.message
    });
  }
});

export default router;
