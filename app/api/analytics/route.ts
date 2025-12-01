import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import db from '@/lib/database';

/**
 * GET /api/analytics
 * Get analytics dashboard data including page views, votes, ratings, and traffic patterns
 * ADMIN ONLY - Contains sensitive visitor and usage data
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';
    const days = range === '30d' ? 30 : 7;

    // Get system timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneAbbr = new Date().toLocaleTimeString('en-US', { 
      timeZoneName: 'short' 
    }).split(' ').pop() || '';

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get total views
    const totalViewsResult = db.prepare(`
      SELECT COUNT(*) as count
      FROM page_views
      WHERE view_time >= ?
    `).get(startDateStr) as { count: number };

    // Get today's views
    const todayStart = new Date().toISOString().split('T')[0];
    const todayViewsResult = db.prepare(`
      SELECT COUNT(*) as count
      FROM page_views
      WHERE view_time >= ?
    `).get(todayStart) as { count: number };

    // Get peak hour (convert to local timezone and format as 12-hour)
    const peakHourResult = db.prepare(`
      SELECT strftime('%H', datetime(view_time, 'localtime')) as hour, COUNT(*) as count
      FROM page_views
      WHERE view_time >= ?
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    `).get(startDateStr) as { hour: string; count: number } | undefined;

    // Format peak hour in 12-hour format with timezone
    let peakHour = 'N/A';
    if (peakHourResult) {
      const hour24 = parseInt(peakHourResult.hour);
      const period = hour24 >= 12 ? 'PM' : 'AM';
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      peakHour = `${hour12}:00 ${period} ${timezoneAbbr}`;
    }

    // Get average rating (calculate from upvotes/downvotes ratio)
    const voteStatsResult = db.prepare(`
      SELECT 
        SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes,
        SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes
      FROM votes
      WHERE created_at >= ?
    `).get(startDateStr) as { upvotes: number; downvotes: number };
    
    // Calculate rating (0-5 scale based on upvote ratio)
    const totalVotes = (voteStatsResult.upvotes || 0) + (voteStatsResult.downvotes || 0);
    const avgRating = totalVotes > 0 
      ? ((voteStatsResult.upvotes || 0) / totalVotes) * 5 
      : 0;

    // Get daily trends (using local timezone)
    const trendsResult = db.prepare(`
      SELECT DATE(datetime(view_time, 'localtime')) as date, COUNT(*) as views
      FROM page_views
      WHERE view_time >= ?
      GROUP BY DATE(datetime(view_time, 'localtime'))
      ORDER BY date ASC
    `).all(startDateStr) as { date: string; views: number }[];

    // Fill in missing days with 0 views
    const trends: { date: string; views: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const existingData = trendsResult.find(t => t.date === dateStr);
      trends.push({
        date: dateStr,
        views: existingData?.views || 0,
      });
    }

    // Get top sequences
    const topSequences = db.prepare(`
      SELECT 
        sequence_name as name,
        SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes,
        SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes,
        COUNT(*) as votes
      FROM votes
      WHERE created_at >= ?
      GROUP BY sequence_name
      ORDER BY upvotes DESC
      LIMIT 10
    `).all(startDateStr).map((row: any) => ({
      name: row.name,
      votes: row.votes,
      rating: row.votes > 0 ? (row.upvotes / row.votes) * 5 : 0
    }));

    // Get top playlists (from page views of playlist pages)
    const topPlaylists = db.prepare(`
      SELECT 
        page_path as name,
        COUNT(*) as plays
      FROM page_views
      WHERE page_path LIKE '/playlists%' AND view_time >= ?
      GROUP BY page_path
      ORDER BY plays DESC
      LIMIT 10
    `).all(startDateStr).map((row: any) => ({
      name: row.name.replace('/playlists/', '').replace('/playlists', 'Main'),
      plays: row.plays,
    }));

    // Get top pages
    const topPages = db.prepare(`
      SELECT 
        page_path as name,
        COUNT(*) as views
      FROM page_views
      WHERE view_time >= ?
      GROUP BY page_path
      ORDER BY views DESC
      LIMIT 10
    `).all(startDateStr) as { name: string; views: number }[];

    // Get Santa letters stats
    const santaTotal = db.prepare('SELECT COUNT(*) as count FROM santa_letters').get() as { count: number };
    const santaPending = db.prepare("SELECT COUNT(*) as count FROM santa_letters WHERE status = 'pending'").get() as { count: number };
    const santaSent = db.prepare("SELECT COUNT(*) as count FROM santa_letters WHERE status = 'sent'").get() as { count: number };
    const santaFailed = db.prepare("SELECT COUNT(*) as count FROM santa_letters WHERE status = 'failed'").get() as { count: number };

    const data = {
      overview: {
        totalViews: totalViewsResult.count,
        todayViews: todayViewsResult.count,
        peakHour: peakHour,
        avgRating: avgRating,
      },
      trends,
      topContent: {
        sequences: topSequences,
        playlists: topPlaylists.length > 0 ? topPlaylists : [{ name: 'No data yet', plays: 0 }],
        pages: topPages,
      },
      santaLetters: {
        total: santaTotal.count,
        pending: santaPending.count,
        sent: santaSent.count,
        failed: santaFailed.count,
      },
      timezone, // Include for debugging
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    if (error.message?.includes('Authentication required')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
