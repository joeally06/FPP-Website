import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { getUtcNow } from '@/lib/time-utils';

const dbPath = path.join(process.cwd(), 'votes.db');

// Rate limiting for score submissions
const SCORE_LIMIT_PER_HOUR = 20; // Max 20 scores per hour per IP

/**
 * POST /api/games/score
 * Save a game score to the leaderboard with rate limiting and anti-cheat
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerName, score, gameType = 'christmas_ornaments', theme = 'christmas' } = body;

    // Validation - Player name
    if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Player name is required' 
      }, { status: 400 });
    }

    // Validation - Score must be a valid number
    const numScore = parseInt(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 1000000) {
      return NextResponse.json({ 
        error: 'Invalid score (must be 0-1,000,000)' 
      }, { status: 400 });
    }

    // Validation - Game type and theme
    if (!gameType || typeof gameType !== 'string') {
      return NextResponse.json({ 
        error: 'Invalid game type' 
      }, { status: 400 });
    }

    if (!theme || typeof theme !== 'string') {
      return NextResponse.json({ 
        error: 'Invalid theme' 
      }, { status: 400 });
    }

    // Sanitize player name - XSS protection
    const sanitizedName = playerName
      .trim()
      .slice(0, 50) // Max 50 chars
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/[^\w\s\-_.]/g, '') // Only allow alphanumeric, spaces, dash, underscore, dot
      || 'Anonymous';

    // Get IP address for rate limiting
    // Security: Prioritize cf-connecting-ip to prevent IP spoofing
    const ip = request.headers.get('cf-connecting-ip') ||
               request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Generate session ID from headers (for personal best tracking)
    const sessionId = request.headers.get('user-agent') || 'anonymous';

    const db = new Database(dbPath);
    
    try {
      // Run migration if needed
      const tableExists = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='game_scores'
      `).get();

      if (!tableExists) {
        // Create table
        db.exec(`
          CREATE TABLE IF NOT EXISTS game_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_name TEXT NOT NULL,
            score INTEGER NOT NULL,
            game_type TEXT NOT NULL DEFAULT 'christmas_ornaments',
            theme TEXT NOT NULL DEFAULT 'christmas',
            created_at TEXT NOT NULL,
            ip_address TEXT,
            session_id TEXT
          );
          
          CREATE INDEX IF NOT EXISTS idx_game_scores_leaderboard 
            ON game_scores(game_type, score DESC, created_at DESC);
            
          CREATE INDEX IF NOT EXISTS idx_game_scores_player 
            ON game_scores(session_id, game_type, score DESC);
            
          CREATE INDEX IF NOT EXISTS idx_game_scores_date 
            ON game_scores(created_at);
        `);
      }

      // Rate limiting check
      const recentSubmissions = db.prepare(`
        SELECT COUNT(*) as count
        FROM game_scores
        WHERE ip_address = ?
          AND datetime(created_at) >= datetime('now', '-1 hour')
      `).get(ip) as { count: number };

      if (recentSubmissions && recentSubmissions.count >= SCORE_LIMIT_PER_HOUR) {
        db.close();
        console.log(`[Game Score] Rate limit exceeded for IP: ${ip}`);
        return NextResponse.json({ 
          error: 'Too many score submissions. Please try again later.' 
        }, { status: 429 });
      }

      // Anti-cheat: Check for suspiciously high scores in short time
      const lastScore = db.prepare(`
        SELECT score, created_at
        FROM game_scores
        WHERE ip_address = ?
          AND game_type = ?
        ORDER BY datetime(created_at) DESC
        LIMIT 1
      `).get(ip, gameType) as { score: number; created_at: string } | undefined;

      if (lastScore) {
        const lastTime = new Date(lastScore.created_at).getTime();
        const now = new Date().getTime();
        const timeDiff = now - lastTime;
        const scoreDiff = numScore - lastScore.score;
        
        // If score increased by >10,000 points in <10 seconds, likely cheating
        if (timeDiff < 10000 && scoreDiff > 10000) {
          db.close();
          console.log(`[Game Score] Suspicious score increase detected for IP: ${ip} (${scoreDiff} points in ${timeDiff}ms)`);
          return NextResponse.json({ 
            error: 'Suspicious score detected. Play fairly!' 
          }, { status: 400 });
        }
      }

      // Insert score
      const stmt = db.prepare(`
        INSERT INTO game_scores (player_name, score, game_type, theme, created_at, ip_address, session_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        sanitizedName,
        numScore,
        gameType,
        theme,
        getUtcNow(),
        ip,
        sessionId
      );

      // Get rank (position on leaderboard)
      const rankQuery = db.prepare(`
        SELECT COUNT(*) as rank
        FROM game_scores
        WHERE game_type = ? AND score > ?
      `);
      const rankResult = rankQuery.get(gameType, numScore) as { rank: number };
      const rank = (rankResult?.rank || 0) + 1;

      // Get personal best
      const personalBestQuery = db.prepare(`
        SELECT MAX(score) as best
        FROM game_scores
        WHERE session_id = ? AND game_type = ?
      `);
      const personalBest = personalBestQuery.get(sessionId, gameType) as { best: number };

      db.close();

      console.log(`[Game Score] Score saved: ${sanitizedName} - ${numScore} (${gameType}, Rank: ${rank})`);

      return NextResponse.json({
        success: true,
        scoreId: result.lastInsertRowid,
        rank,
        isPersonalBest: numScore >= (personalBest?.best || 0),
        personalBest: personalBest?.best || numScore
      });

    } finally {
      if (db.open) db.close();
    }

  } catch (error) {
    console.error('[Game Score API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to save score' 
    }, { status: 500 });
  }
}
