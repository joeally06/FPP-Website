import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { formatDateTime } from '@/lib/time-utils';

const dbPath = path.join(process.cwd(), 'votes.db');

/**
 * GET /api/games/leaderboard?gameType=christmas_ornaments&limit=10&period=all
 * Get top scores for a specific game (public endpoint with rate limiting)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gameType = searchParams.get('gameType') || 'christmas_ornaments';
    const rawLimit = searchParams.get('limit') || '10';
    const period = searchParams.get('period') || 'all';

    // Validation - Limit must be a number between 1 and 100
    const limit = Math.max(1, Math.min(parseInt(rawLimit) || 10, 100));

    // Validation - Period must be one of the allowed values
    const allowedPeriods = ['all', 'today', 'week', 'month'];
    if (!allowedPeriods.includes(period)) {
      return NextResponse.json({ 
        error: 'Invalid period. Must be: all, today, week, or month' 
      }, { status: 400 });
    }

    // Validation - Game type must be a string
    if (!gameType || typeof gameType !== 'string') {
      return NextResponse.json({ 
        error: 'Invalid game type' 
      }, { status: 400 });
    }

    const db = new Database(dbPath, { readonly: true }); // Read-only for security
    
    try {
      // Check if table exists
      const tableExists = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='game_scores'
      `).get();

      if (!tableExists) {
        db.close();
        return NextResponse.json({
          leaderboard: [],
          totalScores: 0
        });
      }

      // Build date filter using parameterized queries to prevent SQL injection
      let dateFilter = '';
      let dateParam: string | null = null;
      
      if (period === 'today') {
        const today = new Date().toISOString().split('T')[0];
        dateFilter = `AND datetime(created_at) >= datetime(?)`;
        dateParam = today;
      } else if (period === 'week') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        dateFilter = `AND datetime(created_at) >= datetime(?)`;
        dateParam = weekAgo;
      } else if (period === 'month') {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        dateFilter = `AND datetime(created_at) >= datetime(?)`;
        dateParam = monthAgo;
      }

      // Get leaderboard with parameterized query
      const query = `
        SELECT 
          player_name,
          score,
          theme,
          created_at,
          ROW_NUMBER() OVER (ORDER BY score DESC, datetime(created_at) ASC) as rank
        FROM game_scores
        WHERE game_type = ? ${dateFilter}
        ORDER BY score DESC, datetime(created_at) ASC
        LIMIT ?
      `;
      
      const params = dateParam 
        ? [gameType, dateParam, limit]
        : [gameType, limit];
      
      const stmt = db.prepare(query);
      const leaderboard = stmt.all(...params) as Array<{
        player_name: string;
        score: number;
        theme: string;
        created_at: string;
        rank: number;
      }>;

      // Get total number of scores
      const totalQuery = `
        SELECT COUNT(*) as total
        FROM game_scores
        WHERE game_type = ? ${dateFilter}
      `;
      const totalParams = dateParam ? [gameType, dateParam] : [gameType];
      const totalStmt = db.prepare(totalQuery);
      const totalResult = totalStmt.get(...totalParams) as { total: number };

      // Get high score
      const highScoreQuery = `
        SELECT MAX(score) as high_score
        FROM game_scores
        WHERE game_type = ? ${dateFilter}
      `;
      const highScoreParams = dateParam ? [gameType, dateParam] : [gameType];
      const highScoreStmt = db.prepare(highScoreQuery);
      const highScoreResult = highScoreStmt.get(...highScoreParams) as { high_score: number };

      db.close();

      return NextResponse.json({
        leaderboard: leaderboard.map(entry => ({
          rank: entry.rank,
          playerName: entry.player_name,
          score: entry.score,
          theme: entry.theme,
          date: formatDateTime(entry.created_at, 'relative')
        })),
        totalScores: totalResult?.total || 0,
        highScore: highScoreResult?.high_score || 0,
        gameType,
        period
      });

    } finally {
      if (db.open) db.close();
    }

  } catch (error) {
    console.error('[Game Leaderboard API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch leaderboard',
      leaderboard: [],
      totalScores: 0
    }, { status: 500 });
  }
}
