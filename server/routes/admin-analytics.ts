/**
 * Admin Analytics Aggregation API
 *
 * Provides comprehensive analytics for admin dashboard:
 * - Calculator interaction metrics
 * - Conversation/script step funnel analysis
 * - User engagement patterns
 * - Conversion metrics
 */

import express from 'express';
import { db } from '../db';
import {
  calculatorInteractions,
  conversationSteps,
  chatSessions,
  supportQueries,
  users,
  pageVisits
} from '@shared/schema';
import { eq, sql, and, gte, lte, desc, count } from 'drizzle-orm';
import { requireAdmin } from '../middleware/adminAuth';

const router = express.Router();

// All routes require admin authentication
router.use(requireAdmin);

/**
 * GET /api/admin/analytics/aggregate
 *
 * Query params:
 * - dateRange: '7d', '30d', 'all' (default: '30d')
 *
 * Returns comprehensive aggregate analytics
 */
router.get('/aggregate', async (req, res) => {
  try {
    const dateRange = (req.query.dateRange as string) || '30d';

    // Calculate date filter
    let startDate: Date | null = null;
    if (dateRange === '7d') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    } else if (dateRange === '30d') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }

    // Build date condition
    const dateCondition = startDate
      ? gte(calculatorInteractions.createdAt, startDate)
      : undefined;

    const chatDateCondition = startDate
      ? gte(chatSessions.createdAt, startDate)
      : undefined;

    const supportDateCondition = startDate
      ? gte(supportQueries.createdAt, startDate)
      : undefined;

    // ===== CALCULATOR METRICS =====

    // Get all calculator interactions
    const calculatorData = await db
      .select()
      .from(calculatorInteractions)
      .where(dateCondition)
      .execute();

    const calculatorMetrics = {
      totalInteractions: calculatorData.length,
      averageShootsPerWeek: calculatorData.length > 0
        ? calculatorData.reduce((sum, row) => sum + row.shootsPerWeek, 0) / calculatorData.length
        : 0,
      averageHoursPerShoot: calculatorData.length > 0
        ? calculatorData.reduce((sum, row) => sum + row.hoursPerShoot, 0) / calculatorData.length
        : 0,
      averageBillableRate: calculatorData.length > 0
        ? calculatorData.reduce((sum, row) => sum + row.billableRate, 0) / calculatorData.length
        : 0,
      percentageManuallyAdjusted: calculatorData.length > 0
        ? (calculatorData.filter(row => row.hasManuallyAdjusted).length / calculatorData.length) * 100
        : 0,
      percentageClickedPresets: calculatorData.length > 0
        ? (calculatorData.filter(row => row.hasClickedPreset).length / calculatorData.length) * 100
        : 0,
      presetDistribution: {
        less: calculatorData.filter(row => row.presetClicked === 'less').length,
        more: calculatorData.filter(row => row.presetClicked === 'more').length,
        none: calculatorData.filter(row => !row.presetClicked).length,
      },
      // Value distributions (for histograms)
      shootsPerWeekDistribution: getDistribution(
        calculatorData.map(r => r.shootsPerWeek),
        [0, 1, 2, 3, 4, 5, 10, 20]
      ),
      hoursPerShootDistribution: getDistribution(
        calculatorData.map(r => r.hoursPerShoot),
        [0, 0.5, 1, 1.5, 2, 3, 4, 6, 8]
      ),
      billableRateDistribution: getDistribution(
        calculatorData.map(r => r.billableRate),
        [0, 20, 35, 50, 75, 100, 150, 200, 500, 1000]
      ),
    };

    // ===== CONVERSATION METRICS =====

    // Get all chat sessions
    const sessions = await db
      .select()
      .from(chatSessions)
      .where(chatDateCondition)
      .execute();

    // Get all conversation steps
    const steps = await db
      .select()
      .from(conversationSteps)
      .where(startDate ? gte(conversationSteps.completedAt, startDate) : undefined)
      .execute();

    // Group steps by session
    const stepsBySession = steps.reduce((acc, step) => {
      if (!acc[step.sessionId]) acc[step.sessionId] = [];
      acc[step.sessionId].push(step);
      return acc;
    }, {} as Record<string, typeof steps>);

    // Calculate funnel metrics
    const stepCounts: Record<number, number> = {};
    const stepDropoffs: Record<number, number> = {};

    for (let i = 1; i <= 15; i++) {
      stepCounts[i] = steps.filter(s => s.stepNumber === i).length;
    }

    // Calculate drop-offs (users who reached step N but not N+1)
    for (let i = 1; i < 15; i++) {
      const reachedThisStep = Object.values(stepsBySession).filter(
        sessionSteps => sessionSteps.some(s => s.stepNumber === i)
      ).length;
      const reachedNextStep = Object.values(stepsBySession).filter(
        sessionSteps => sessionSteps.some(s => s.stepNumber === i + 1)
      ).length;
      stepDropoffs[i] = reachedThisStep - reachedNextStep;
    }

    // Calculate average messages per session
    const messagesPerSession = sessions.map(session => {
      try {
        const messages = JSON.parse(session.messages);
        return Array.isArray(messages) ? messages.length : 0;
      } catch {
        return 0;
      }
    });

    const avgMessagesPerSession = messagesPerSession.length > 0
      ? messagesPerSession.reduce((sum, count) => sum + count, 0) / messagesPerSession.length
      : 0;

    // Calculate average script step reached
    const maxStepBySession = Object.values(stepsBySession).map(sessionSteps => {
      return sessionSteps.length > 0
        ? Math.max(...sessionSteps.map(s => s.stepNumber))
        : 0;
    });

    const avgStepReached = maxStepBySession.length > 0
      ? maxStepBySession.reduce((sum, max) => sum + max, 0) / maxStepBySession.length
      : 0;

    // Conversion rate (reached step 15)
    const reachedStep15 = maxStepBySession.filter(max => max >= 15).length;
    const conversionRate = sessions.length > 0
      ? (reachedStep15 / sessions.length) * 100
      : 0;

    const conversationMetrics = {
      totalSessions: sessions.length,
      averageMessagesPerSession: avgMessagesPerSession,
      averageStepReached: avgStepReached,
      conversionRate, // Percentage who reached step 15
      reachedStep15Count: reachedStep15,
      stepFunnel: Array.from({ length: 15 }, (_, i) => ({
        step: i + 1,
        reached: stepCounts[i + 1] || 0,
        droppedOff: stepDropoffs[i + 1] || 0,
      })),
      // Distribution of max step reached
      maxStepDistribution: getDistribution(
        maxStepBySession,
        [0, 1, 3, 5, 8, 10, 12, 15]
      ),
    };

    // ===== USER ENGAGEMENT METRICS =====

    // Active users (had any activity in date range)
    const activeUserIds = new Set([
      ...calculatorData.map(r => r.userId).filter(Boolean),
      ...sessions.map(s => s.userId).filter(Boolean),
    ]);

    // Get support queries
    const supportQueriesData = await db
      .select()
      .from(supportQueries)
      .where(supportDateCondition)
      .execute();

    // Calculate session duration from supportQueries
    const sessionLengths = supportQueriesData
      .map(q => q.sessionLength)
      .filter(Boolean) as number[];

    const avgSessionDuration = sessionLengths.length > 0
      ? sessionLengths.reduce((sum, len) => sum + len, 0) / sessionLengths.length
      : 0;

    // Repeat users (users with multiple sessions)
    const sessionsByUser: Record<string, number> = {};
    sessions.forEach(session => {
      const identifier = session.userId || session.ipAddress || 'anonymous';
      sessionsByUser[identifier] = (sessionsByUser[identifier] || 0) + 1;
    });

    const repeatUsers = Object.values(sessionsByUser).filter(count => count > 1).length;
    const totalUniqueUsers = Object.keys(sessionsByUser).length;
    const repeatUserRate = totalUniqueUsers > 0
      ? (repeatUsers / totalUniqueUsers) * 100
      : 0;

    const engagementMetrics = {
      activeUsersCount: activeUserIds.size,
      totalSessionsCreated: sessions.length,
      averageSessionDuration: Math.round(avgSessionDuration), // seconds
      repeatUserRate, // Percentage of users with multiple sessions
      repeatUserCount: repeatUsers,
      totalUniqueUsers,
      // Device/browser breakdown
      deviceBreakdown: getBreakdown(sessions.map(s => s.device).filter(Boolean)),
      browserBreakdown: getBreakdown(sessions.map(s => s.browser).filter(Boolean)),
      locationBreakdown: {
        countries: getBreakdown(sessions.map(s => s.country).filter(Boolean)),
        states: getBreakdown(sessions.map(s => s.state).filter(Boolean)),
      },
    };

    // ===== TIME SERIES DATA =====

    // Group data by date for trending
    const dailyCalculatorInteractions = groupByDate(calculatorData, 'createdAt');
    const dailySessions = groupByDate(sessions, 'createdAt');
    const dailyConversions = groupByDateWithCondition(
      sessions,
      'createdAt',
      (session) => {
        const sessionSteps = stepsBySession[session.id] || [];
        return sessionSteps.some(s => s.stepNumber >= 15);
      }
    );

    const trendsOverTime = {
      dailyCalculatorInteractions,
      dailySessions,
      dailyConversions,
    };

    // ===== RESPONSE =====

    res.json({
      dateRange,
      startDate: startDate?.toISOString() || null,
      endDate: new Date().toISOString(),
      calculatorMetrics,
      conversationMetrics,
      engagementMetrics,
      trendsOverTime,
    });

  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===== HELPER FUNCTIONS =====

/**
 * Create distribution buckets for histogram data
 */
function getDistribution(values: number[], buckets: number[]): Record<string, number> {
  const distribution: Record<string, number> = {};

  for (let i = 0; i < buckets.length - 1; i++) {
    const min = buckets[i];
    const max = buckets[i + 1];
    const label = `${min}-${max}`;
    distribution[label] = values.filter(v => v >= min && v < max).length;
  }

  // Last bucket is "max+"
  const lastBucket = buckets[buckets.length - 1];
  distribution[`${lastBucket}+`] = values.filter(v => v >= lastBucket).length;

  return distribution;
}

/**
 * Get breakdown of categorical values (e.g., devices, browsers)
 */
function getBreakdown(values: string[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  values.forEach(value => {
    breakdown[value] = (breakdown[value] || 0) + 1;
  });
  return breakdown;
}

/**
 * Group data by date (YYYY-MM-DD)
 */
function groupByDate(data: any[], dateField: string): Array<{ date: string; count: number }> {
  const grouped: Record<string, number> = {};

  data.forEach(item => {
    const date = item[dateField];
    if (date) {
      const dateStr = new Date(date).toISOString().split('T')[0];
      grouped[dateStr] = (grouped[dateStr] || 0) + 1;
    }
  });

  return Object.entries(grouped)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Group data by date with conditional filtering
 */
function groupByDateWithCondition(
  data: any[],
  dateField: string,
  condition: (item: any) => boolean
): Array<{ date: string; count: number }> {
  const grouped: Record<string, number> = {};

  data.filter(condition).forEach(item => {
    const date = item[dateField];
    if (date) {
      const dateStr = new Date(date).toISOString().split('T')[0];
      grouped[dateStr] = (grouped[dateStr] || 0) + 1;
    }
  });

  return Object.entries(grouped)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default router;
