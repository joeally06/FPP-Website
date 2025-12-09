'use client';

import { useEffect, useState } from 'react';

interface LeaderboardEntry {
  rank: number;
  playerName: string;
  score: number;
  theme: string;
  date: string;
}

interface LeaderboardProps {
  gameType?: string;
  onClose: () => void;
  onPlayAgain: () => void;
  currentScore?: number;
}

export default function Leaderboard({ 
  gameType = 'christmas_ornaments', 
  onClose,
  onPlayAgain,
  currentScore
}: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [highScore, setHighScore] = useState(0);
  const [totalScores, setTotalScores] = useState(0);

  useEffect(() => {
    fetchLeaderboard();
  }, [period, gameType]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/games/leaderboard?gameType=${gameType}&limit=10&period=${period}`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
        setHighScore(data.highScore || 0);
        setTotalScores(data.totalScores || 0);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'All Time';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-linear-to-br from-red-600 via-green-600 to-blue-600 p-1 rounded-2xl shadow-2xl max-w-2xl w-full my-8">
        <div className="bg-linear-to-br from-slate-900 to-slate-800 rounded-xl p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              🏆 Leaderboard 🏆
            </h2>
            <p className="text-white/80">Christmas Ornament Catcher</p>
            {currentScore !== undefined && (
              <div className="mt-3 p-3 bg-yellow-500/20 border-2 border-yellow-500/50 rounded-lg">
                <p className="text-yellow-300 font-bold text-xl">Your Score: {currentScore}</p>
              </div>
            )}
          </div>

          {/* Period Filter */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {(['all', 'today', 'week', 'month'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  period === p
                    ? 'bg-green-500 text-white shadow-lg scale-105'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-linear-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-yellow-300">{highScore.toLocaleString()}</div>
              <div className="text-white/70 text-sm">High Score</div>
            </div>
            <div className="bg-linear-to-br from-blue-500/20 to-purple-500/20 border-2 border-blue-500/50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-300">{totalScores.toLocaleString()}</div>
              <div className="text-white/70 text-sm">Total Plays</div>
            </div>
          </div>

          {/* Leaderboard */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin text-6xl mb-4">🎄</div>
              <p className="text-white/60">Loading leaderboard...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎮</div>
              <p className="text-white/80 text-xl font-semibold mb-2">No scores yet!</p>
              <p className="text-white/60">Be the first to set a high score!</p>
            </div>
          ) : (
            <div className="space-y-2 mb-6">
              {leaderboard.map((entry, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                    entry.rank <= 3
                      ? 'bg-linear-to-r from-yellow-500/30 to-orange-500/30 border-2 border-yellow-500/50'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="text-2xl font-bold flex-shrink-0 w-12 text-center">
                      {getRankEmoji(entry.rank)}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* XSS Protection: React automatically escapes content - no need for dangerouslySetInnerHTML */}
                      <div className="text-white font-semibold truncate">
                        {entry.playerName.slice(0, 50)}
                      </div>
                      <div className="text-white/50 text-sm">
                        {entry.date}
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-white">
                      {entry.score.toLocaleString()}
                    </div>
                    <div className="text-white/50 text-xs">points</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 flex-col sm:flex-row">
            <button
              onClick={onPlayAgain}
              className="flex-1 px-6 py-3 bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              🎮 Play Again
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-lg transition-all border border-white/30"
            >
              ✖️ Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
