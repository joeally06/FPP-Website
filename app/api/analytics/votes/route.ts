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

    // Top voted sequences
    const topVoted = db.prepare(`
      SELECT 
        sequence_name,
        SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes,
        SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes,
        (SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) - SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END)) as net_votes,
        COUNT(*) as total_votes,
        CASE 
          WHEN COUNT(*) > 0 
          THEN CAST(SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100 
          ELSE 0 
        END as approval_rating
      FROM votes
      GROUP BY sequence_name
      HAVING COUNT(*) > 0
      ORDER BY net_votes DESC
      LIMIT 20
    `).all();

    // Most controversial (split votes)
    const controversial = db.prepare(`
      SELECT 
        sequence_name,
        SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes,
        SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes,
        COUNT(*) as total_votes,
        ABS(SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) - SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END)) as vote_difference,
        CASE 
          WHEN COUNT(*) > 0 
          THEN CAST(SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100 
          ELSE 0 
        END as approval_rating
      FROM votes
      GROUP BY sequence_name
      HAVING COUNT(*) >= 5
      ORDER BY 
        CASE 
          WHEN COUNT(*) > 0 
          THEN ABS(CAST(SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) - 0.5)
          ELSE 1
        END ASC
      LIMIT 20
    `).all();

    // Total voting statistics
    const totalStats = db.prepare(`
      SELECT 
        COUNT(DISTINCT sequence_name) as sequences_with_votes,
        SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as total_upvotes,
        SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as total_downvotes,
        COUNT(*) as total_votes
      FROM votes
    `).get();

    // Voting activity over time (last 30 days by day)
    const votingTrend = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as vote_count,
        SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes,
        SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes
      FROM votes
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all();

    // Voting activity by hour
    const votingByHour = db.prepare(`
      SELECT 
        CAST(strftime('%H', created_at) AS INTEGER) as hour,
        COUNT(*) as vote_count,
        SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes,
        SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes
      FROM votes
      GROUP BY hour
      ORDER BY hour
    `).all();

    db.close();

    return NextResponse.json({
      topVoted,
      controversial,
      totalStats,
      votingTrend,
      votingByHour
    });

  } catch (error) {
    console.error('Vote analytics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch vote analytics' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
