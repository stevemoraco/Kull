// Duplicate message detection and monitoring system
// Logs and alerts when duplicates are detected

import { db } from '../db';
import { sql } from 'drizzle-orm';

interface DuplicateStats {
  totalDuplicatesDetected: number;
  trackedFingerprints: number;
  recentMessages: number;
}

interface DuplicateAlert {
  type: string;
  sessionId?: string;
  messageId?: string;
  userEmail?: string;
  duplicateCount?: number;
  stats?: DuplicateStats;
  timestamp: string;
}

/**
 * Log duplicate detection to database for monitoring
 */
export async function logDuplicateDetection(alert: DuplicateAlert): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO duplicate_alerts (
        alert_type,
        message_id,
        session_id,
        user_email,
        duplicate_count,
        stats,
        created_at
      ) VALUES (
        ${alert.type},
        ${alert.messageId || null},
        ${alert.sessionId || null},
        ${alert.userEmail || null},
        ${alert.duplicateCount || 0},
        ${JSON.stringify(alert.stats || {})},
        ${new Date(alert.timestamp)}
      )
    `);

    console.log('[DuplicateMonitor] Logged duplicate detection:', alert.type);
  } catch (error) {
    console.error('[DuplicateMonitor] Failed to log duplicate:', error);
  }
}

/**
 * Get duplicate detection statistics for a time period
 */
export async function getDuplicateStats(hours: number = 24): Promise<{
  totalAlerts: number;
  alertsByType: Record<string, number>;
  affectedSessions: number;
  recentAlerts: any[];
}> {
  try {
    const sinceTime = new Date();
    sinceTime.setHours(sinceTime.getHours() - hours);

    const results = await db.execute(sql`
      SELECT
        COUNT(*) as total_alerts,
        COUNT(DISTINCT session_id) as affected_sessions,
        jsonb_object_agg(alert_type, type_count) as alerts_by_type
      FROM (
        SELECT
          alert_type,
          session_id,
          COUNT(*) as type_count
        FROM duplicate_alerts
        WHERE created_at >= ${sinceTime}
        GROUP BY alert_type, session_id
      ) subquery
    `);

    const recentAlerts = await db.execute(sql`
      SELECT *
      FROM duplicate_alerts
      WHERE created_at >= ${sinceTime}
      ORDER BY created_at DESC
      LIMIT 50
    `);

    const row: any = results.rows[0];

    return {
      totalAlerts: parseInt(row?.total_alerts || '0'),
      alertsByType: row?.alerts_by_type || {},
      affectedSessions: parseInt(row?.affected_sessions || '0'),
      recentAlerts: recentAlerts.rows,
    };
  } catch (error) {
    console.error('[DuplicateMonitor] Failed to get stats:', error);
    return {
      totalAlerts: 0,
      alertsByType: {},
      affectedSessions: 0,
      recentAlerts: [],
    };
  }
}

/**
 * Send alert to admin if duplicate rate exceeds threshold
 */
export async function checkDuplicateThreshold(): Promise<void> {
  const stats = await getDuplicateStats(1); // Last hour

  // Alert if more than 10 duplicates in the last hour
  if (stats.totalAlerts > 10) {
    console.error('[DuplicateMonitor] HIGH DUPLICATE RATE DETECTED:', stats);

    // TODO: Send email/Slack notification to admin
    await sendAdminAlert({
      severity: 'high',
      title: 'High Duplicate Message Rate',
      message: `Detected ${stats.totalAlerts} duplicate messages in the last hour affecting ${stats.affectedSessions} sessions`,
      stats,
    });
  }
}

/**
 * Send alert to admin via configured channel
 */
async function sendAdminAlert(alert: {
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  stats?: any;
}): Promise<void> {
  console.error(`[ADMIN ALERT] ${alert.severity.toUpperCase()}: ${alert.title}`);
  console.error(alert.message);
  if (alert.stats) {
    console.error('Stats:', JSON.stringify(alert.stats, null, 2));
  }

  // TODO: Integrate with email/Slack/PagerDuty
  // For now, just log to console
}

/**
 * Cleanup old duplicate alerts (keep last 30 days)
 */
export async function cleanupOldAlerts(): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const result = await db.execute(sql`
      DELETE FROM duplicate_alerts
      WHERE created_at < ${cutoffDate}
    `);

    const deletedCount = result.rowCount || 0;
    console.log(`[DuplicateMonitor] Cleaned up ${deletedCount} old alerts`);

    return deletedCount;
  } catch (error) {
    console.error('[DuplicateMonitor] Failed to cleanup old alerts:', error);
    return 0;
  }
}

/**
 * Get duplicate rate metrics for monitoring dashboard
 */
export async function getDuplicateMetrics(): Promise<{
  duplicateRate: number; // Percentage
  duplicatesLastHour: number;
  duplicatesLastDay: number;
  duplicatesLastWeek: number;
  topAffectedSessions: Array<{
    sessionId: string;
    duplicateCount: number;
    userEmail?: string;
  }>;
}> {
  try {
    // Get total messages vs duplicates for last hour
    const hourAgo = new Date();
    hourAgo.setHours(hourAgo.getHours() - 1);

    const hourStats = await getDuplicateStats(1);
    const dayStats = await getDuplicateStats(24);
    const weekStats = await getDuplicateStats(24 * 7);

    // Get top affected sessions
    const topSessions = await db.execute(sql`
      SELECT
        session_id,
        user_email,
        COUNT(*) as duplicate_count
      FROM duplicate_alerts
      WHERE created_at >= ${hourAgo}
      GROUP BY session_id, user_email
      ORDER BY duplicate_count DESC
      LIMIT 10
    `);

    // Calculate duplicate rate (approximation)
    // Total messages in last hour vs duplicates detected
    const totalMessages = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM support_queries
      WHERE created_at >= ${hourAgo}
    `);

    const totalCount = parseInt((totalMessages.rows[0] as any)?.count || '0');
    const duplicateRate = totalCount > 0 ? (hourStats.totalAlerts / totalCount) * 100 : 0;

    return {
      duplicateRate: Math.round(duplicateRate * 100) / 100,
      duplicatesLastHour: hourStats.totalAlerts,
      duplicatesLastDay: dayStats.totalAlerts,
      duplicatesLastWeek: weekStats.totalAlerts,
      topAffectedSessions: topSessions.rows.map((row: any) => ({
        sessionId: row.session_id,
        duplicateCount: parseInt(row.duplicate_count),
        userEmail: row.user_email,
      })),
    };
  } catch (error) {
    console.error('[DuplicateMonitor] Failed to get metrics:', error);
    return {
      duplicateRate: 0,
      duplicatesLastHour: 0,
      duplicatesLastDay: 0,
      duplicatesLastWeek: 0,
      topAffectedSessions: [],
    };
  }
}
