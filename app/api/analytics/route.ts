import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';
    const days = range === '30d' ? 30 : 7;

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

    // Get peak hour
    const peakHourResult = db.prepare(`
      SELECT strftime('%H:00', view_time) as hour, COUNT(*) as count
      FROM page_views
      WHERE view_time >= ?
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    `).get(startDateStr) as { hour: string; count: number } | undefined;

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

    // Get daily trends
    const trendsResult = db.prepare(`
      SELECT DATE(view_time) as date, COUNT(*) as views
      FROM page_views
      WHERE view_time >= ?
      GROUP BY DATE(view_time)
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
        peakHour: peakHourResult?.hour || 'N/A',
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
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
