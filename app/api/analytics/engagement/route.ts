import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'votes.db');

export async function GET() {
  try {
    // Require admin authentication
    await requireAdmin();

    const db = new Database(dbPath);

    // Total unique visitors
    const uniqueVisitors = db.prepare(`
      SELECT COUNT(*) as total FROM visitors
    `).get() as { total: number };

    // New vs returning visitors (last 30 days)
    const visitorBreakdown = db.prepare(`
      SELECT 
        SUM(CASE WHEN total_visits = 1 THEN 1 ELSE 0 END) as new_visitors,
        SUM(CASE WHEN total_visits > 1 THEN 1 ELSE 0 END) as returning_visitors
      FROM visitors
      WHERE last_visit >= datetime('now', '-30 days')
    `).get() as { new_visitors: number; returning_visitors: number };

    // Repeat visitor percentage
    const repeatVisitors = db.prepare(`
      SELECT 
        COUNT(*) as count,
        AVG(total_visits) as avg_visits
      FROM visitors
      WHERE total_visits > 1
    `).get() as { count: number; avg_visits: number };

    // Geographic distribution
    const geoDistribution = db.prepare(`
      SELECT 
        country,
        city,
        COUNT(*) as visitor_count
      FROM visitors
      WHERE country IS NOT NULL
      GROUP BY country, city
      ORDER BY visitor_count DESC
      LIMIT 20
    `).all();

    // Session duration stats
    const sessionStats = db.prepare(`
      SELECT 
        AVG(duration_seconds) as avg_duration,
        MIN(duration_seconds) as min_duration,
        MAX(duration_seconds) as max_duration,
        COUNT(*) as total_sessions
      FROM sessions
      WHERE duration_seconds IS NOT NULL
    `).get() as {
      avg_duration: number;
      min_duration: number;
      max_duration: number;
      total_sessions: number;
    };

    // Average page views per session
    const avgPageViews = db.prepare(`
      SELECT AVG(page_views) as avg_views
      FROM sessions
    `).get() as { avg_views: number };

    // Daily active visitors (last 30 days)
    const dailyVisitors = db.prepare(`
      SELECT 
        DATE(last_visit) as date,
        COUNT(DISTINCT visitor_hash) as visitors
      FROM visitors
      WHERE last_visit >= datetime('now', '-30 days')
      GROUP BY DATE(last_visit)
      ORDER BY date
    `).all();

    // Peak activity hours
    const hourlyActivity = db.prepare(`
      SELECT 
        CAST(strftime('%H', session_start) AS INTEGER) as hour,
        COUNT(*) as session_count
      FROM sessions
      GROUP BY hour
      ORDER BY hour
    `).all();

    // Top pages visited
    const topPages = db.prepare(`
      SELECT 
        page_path,
        COUNT(*) as view_count
      FROM page_views
      GROUP BY page_path
      ORDER BY view_count DESC
      LIMIT 10
    `).all();

    db.close();

    const repeatPercentage = uniqueVisitors.total > 0 
      ? ((repeatVisitors.count / uniqueVisitors.total) * 100).toFixed(1)
      : '0';

    return NextResponse.json({
      overview: {
        total_unique_visitors: uniqueVisitors.total,
        new_visitors_30d: visitorBreakdown.new_visitors,
        returning_visitors_30d: visitorBreakdown.returning_visitors,
        repeat_visitor_percentage: parseFloat(repeatPercentage),
        avg_visits_per_repeat_visitor: repeatVisitors.avg_visits ? repeatVisitors.avg_visits.toFixed(1) : '0'
      },
      sessions: {
        total_sessions: sessionStats.total_sessions,
        avg_duration_seconds: sessionStats.avg_duration ? Math.round(sessionStats.avg_duration) : 0,
        min_duration_seconds: sessionStats.min_duration || 0,
        max_duration_seconds: sessionStats.max_duration || 0,
        avg_page_views: avgPageViews.avg_views ? avgPageViews.avg_views.toFixed(1) : '0'
      },
      geographic: geoDistribution,
      dailyVisitors,
      hourlyActivity,
      topPages
    });

  } catch (error) {
    console.error('Engagement analytics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch engagement analytics' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
