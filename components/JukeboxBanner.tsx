'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import game components to reduce initial bundle size
const ChristmasGame = dynamic(() => import('@/components/games/ChristmasGame'), { ssr: false });
const Leaderboard = dynamic(() => import('@/components/games/Leaderboard'), { ssr: false });

interface BannerConfig {
  countdownEnabled: boolean;
  countdownHeading: string;
  countdownSubtitle: string;
  countdownBgColor: string;
  countdownTextColor: string;
  countdownBorderColor: string;
  offSeasonEnabled: boolean;
  offSeasonHeading: string;
  offSeasonSubtitle: string;
  offSeasonBgColor: string;
  offSeasonTextColor: string;
  offSeasonBorderColor: string;
  offlineEnabled: boolean;
  offlineHeading: string;
  offlineSubtitle: string;
  offlineBgColor: string;
  offlineTextColor: string;
  offlineBorderColor: string;
}

interface JukeboxBannerProps {
  fppStatus: string;
  isMonitoringActive: boolean;
  timeUntilNextShow?: string;
}

export default function JukeboxBanner({
  fppStatus,
  isMonitoringActive,
  timeUntilNextShow,
}: JukeboxBannerProps) {
  const [config, setConfig] = useState<BannerConfig | null>(null);
  const [showGame, setShowGame] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [lastScore, setLastScore] = useState<number | undefined>(undefined);
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  useEffect(() => {
    fetch('/api/jukebox/banner-config')
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => console.error('Failed to load banner config:', err));
    
    // Load saved player name from localStorage
    const savedName = localStorage.getItem('gamePlayerName');
    if (savedName) {
      setPlayerName(savedName);
    }
  }, []);

  const handlePlayGame = () => {
    setShowGame(true);
  };

  const handleGameOver = async (score: number) => {
    setShowGame(false);
    setLastScore(score);
    
    // If no player name yet, prompt for it
    if (!playerName || playerName.trim() === '') {
      setShowNamePrompt(true);
    } else {
      await saveScore(score, playerName);
      setShowLeaderboard(true);
    }
  };

  const handleSaveName = async () => {
    if (playerName.trim() === '') return;
    
    // Save name to localStorage
    localStorage.setItem('gamePlayerName', playerName.trim());
    setShowNamePrompt(false);
    
    // Save score if we have one
    if (lastScore !== undefined) {
      await saveScore(lastScore, playerName);
      setShowLeaderboard(true);
    }
  };

  const saveScore = async (score: number, name: string) => {
    try {
      await fetch('/api/games/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: name,
          score,
          gameType: 'christmas_ornaments',
          theme: 'christmas'
        })
      });
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  const handleCloseGame = () => {
    setShowGame(false);
    setShowLeaderboard(false);
    setLastScore(undefined);
  };

  const handlePlayAgain = () => {
    setShowLeaderboard(false);
    setShowGame(true);
  };

  if (!config) return null;

  // Priority 1: Countdown Banner
  // Show when there's a next show scheduled and monitoring is not active yet
  if (
    config.countdownEnabled &&
    !isMonitoringActive &&
    timeUntilNextShow
  ) {
    return (
      <>
        <div
          className={`${config.countdownBgColor} ${config.countdownTextColor} ${config.countdownBorderColor} border-2 rounded-lg p-6 mb-6 text-center shadow-lg`}
        >
          <h2 className="text-2xl font-bold mb-2">{config.countdownHeading}</h2>
          <p className="text-lg mb-4">
            {config.countdownSubtitle.replace('{time}', timeUntilNextShow)}
          </p>
          <button
            onClick={handlePlayGame}
            className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 border-2 border-white/30"
          >
            🎮 Play Game While You Wait!
          </button>
        </div>
        {showGame && <ChristmasGame onGameOver={handleGameOver} onClose={handleCloseGame} />}
        {showLeaderboard && (
          <Leaderboard 
            onClose={handleCloseGame}
            onPlayAgain={handlePlayAgain}
            currentScore={lastScore}
          />
        )}
        {showNamePrompt && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-linear-to-br from-red-600 to-green-600 p-1 rounded-2xl shadow-2xl max-w-md w-full">
              <div className="bg-linear-to-br from-slate-900 to-slate-800 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-white mb-4 text-center">🎄 Great Job! 🎄</h3>
                <p className="text-white/80 mb-4 text-center">You scored <span className="text-yellow-300 font-bold text-2xl">{lastScore}</span> points!</p>
                <p className="text-white/60 mb-4 text-center">Enter your name to save your score:</p>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveName()}
                  placeholder="Your Name"
                  maxLength={50}
                  className="w-full px-4 py-3 bg-white/10 border-2 border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 mb-4"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveName}
                    disabled={!playerName.trim()}
                    className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all"
                  >
                    💾 Save Score
                  </button>
                  <button
                    onClick={() => {
                      setShowNamePrompt(false);
                      setShowLeaderboard(true);
                    }}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-all border border-white/30"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Priority 2: Off-Season Banner
  if (config.offSeasonEnabled) {
    return (
      <>
        <div
          className={`${config.offSeasonBgColor} ${config.offSeasonTextColor} ${config.offSeasonBorderColor} border-2 rounded-lg p-6 mb-6 text-center shadow-lg`}
        >
          <h2 className="text-2xl font-bold mb-2">{config.offSeasonHeading}</h2>
          <p className="text-lg mb-4">{config.offSeasonSubtitle}</p>
          <button
            onClick={handlePlayGame}
            className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 border-2 border-white/30"
          >
            🎮 Play a Game!
          </button>
        </div>
        {showGame && <ChristmasGame onGameOver={handleGameOver} onClose={handleCloseGame} />}
        {showLeaderboard && (
          <Leaderboard 
            onClose={handleCloseGame}
            onPlayAgain={handlePlayAgain}
            currentScore={lastScore}
          />
        )}
        {showNamePrompt && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-linear-to-br from-red-600 to-green-600 p-1 rounded-2xl shadow-2xl max-w-md w-full">
              <div className="bg-linear-to-br from-slate-900 to-slate-800 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-white mb-4 text-center">🎄 Great Job! 🎄</h3>
                <p className="text-white/80 mb-4 text-center">You scored <span className="text-yellow-300 font-bold text-2xl">{lastScore}</span> points!</p>
                <p className="text-white/60 mb-4 text-center">Enter your name to save your score:</p>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveName()}
                  placeholder="Your Name"
                  maxLength={50}
                  className="w-full px-4 py-3 bg-white/10 border-2 border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 mb-4"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveName}
                    disabled={!playerName.trim()}
                    className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all"
                  >
                    💾 Save Score
                  </button>
                  <button
                    onClick={() => {
                      setShowNamePrompt(false);
                      setShowLeaderboard(true);
                    }}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-all border border-white/30"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Priority 3: Offline Banner
  if (config.offlineEnabled && fppStatus !== 'playing') {
    return (
      <>
        <div
          className={`${config.offlineBgColor} ${config.offlineTextColor} ${config.offlineBorderColor} border-2 rounded-lg p-6 mb-6 text-center shadow-lg`}
        >
          <h2 className="text-2xl font-bold mb-2">{config.offlineHeading}</h2>
          <p className="text-lg mb-4">{config.offlineSubtitle}</p>
          <button
            onClick={handlePlayGame}
            className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 border-2 border-white/30"
          >
            🎮 Play a Game!
          </button>
        </div>
        {showGame && <ChristmasGame onGameOver={handleGameOver} onClose={handleCloseGame} />}
        {showLeaderboard && (
          <Leaderboard 
            onClose={handleCloseGame}
            onPlayAgain={handlePlayAgain}
            currentScore={lastScore}
          />
        )}
        {showNamePrompt && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-linear-to-br from-red-600 to-green-600 p-1 rounded-2xl shadow-2xl max-w-md w-full">
              <div className="bg-linear-to-br from-slate-900 to-slate-800 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-white mb-4 text-center">🎄 Great Job! 🎄</h3>
                <p className="text-white/80 mb-4 text-center">You scored <span className="text-yellow-300 font-bold text-2xl">{lastScore}</span> points!</p>
                <p className="text-white/60 mb-4 text-center">Enter your name to save your score:</p>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveName()}
                  placeholder="Your Name"
                  maxLength={50}
                  className="w-full px-4 py-3 bg-white/10 border-2 border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 mb-4"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveName}
                    disabled={!playerName.trim()}
                    className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all"
                  >
                    💾 Save Score
                  </button>
                  <button
                    onClick={() => {
                      setShowNamePrompt(false);
                      setShowLeaderboard(true);
                    }}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-all border border-white/30"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // No banner to show
  return null;
}
