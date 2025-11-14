'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface Ornament {
  id: number;
  x: number;
  y: number;
  type: 'good' | 'bad';
  emoji: string;
  speed: number;
}

interface ChristmasGameProps {
  onGameOver: (score: number) => void;
  onClose: () => void;
}

export default function ChristmasGame({ onGameOver, onClose }: ChristmasGameProps) {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [playerX, setPlayerX] = useState(50);
  const [ornaments, setOrnaments] = useState<Ornament[]>([]);
  const [gameActive, setGameActive] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [difficulty, setDifficulty] = useState(1);
  const [gameSettings, setGameSettings] = useState({
    initialSpeed: 0.5,
    speedIncrease: 0.15,
    spawnInterval: 2000,
    spawnDecrease: 150,
    minSpawnInterval: 800
  });
  const gameRef = useRef<HTMLDivElement>(null);
  const nextOrnamentId = useRef(0);
  const spawnTimer = useRef<NodeJS.Timeout | null>(null);
  const gameLoop = useRef<NodeJS.Timeout | null>(null);
  const processedOrnaments = useRef<Set<number>>(new Set()); // Track processed ornaments

  // Good ornaments (70% chance)
  const goodOrnaments = ['🎄', '🎁', '⭐', '🔔', '🎅', '❄️', '🦌'];
  // Bad ornaments (30% chance)
  const badOrnaments = ['🪨', '💣', '🔥', '☠️'];

  // Load game settings
  useEffect(() => {
    fetch('/api/games/settings')
      .then(res => res.json())
      .then(data => {
        setGameSettings({
          initialSpeed: data.initialSpeed || 0.5,
          speedIncrease: data.speedIncrease || 0.15,
          spawnInterval: data.spawnInterval || 2000,
          spawnDecrease: data.spawnDecrease || 150,
          minSpawnInterval: data.minSpawnInterval || 800
        });
      })
      .catch(err => console.error('Failed to load game settings:', err));
  }, []);

  // Start game
  const startGame = () => {
    setGameStarted(true);
    setGameActive(true);
    setScore(0);
    setLives(3);
    setOrnaments([]);
    setDifficulty(1);
    setIsPaused(false);
    nextOrnamentId.current = 0;
    processedOrnaments.current.clear(); // Clear processed ornaments tracker
  };

  // Spawn ornaments
  useEffect(() => {
    if (!gameStarted || !gameActive || isPaused) return;

    spawnTimer.current = setInterval(() => {
      const isGood = Math.random() > 0.3;
      const ornamentList = isGood ? goodOrnaments : badOrnaments;
      
      const newOrnament: Ornament = {
        id: nextOrnamentId.current++,
        x: Math.random() * 85 + 5, // Keep away from edges
        y: -5,
        type: isGood ? 'good' : 'bad',
        emoji: ornamentList[Math.floor(Math.random() * ornamentList.length)],
        speed: gameSettings.initialSpeed + (difficulty * gameSettings.speedIncrease)
      };
      
      setOrnaments(prev => [...prev, newOrnament]);
    }, Math.max(gameSettings.spawnInterval - (difficulty * gameSettings.spawnDecrease), gameSettings.minSpawnInterval));

    return () => {
      if (spawnTimer.current) clearInterval(spawnTimer.current);
    };
  }, [gameStarted, gameActive, isPaused, difficulty, gameSettings]);

  // Game loop - move ornaments AND handle collisions
  useEffect(() => {
    if (!gameStarted || !gameActive || isPaused) return;

    gameLoop.current = setInterval(() => {
      setOrnaments(prev => {
        const updated = prev.map(o => ({
          ...o,
          y: o.y + o.speed
        }));

        const toRemove = new Set<number>();
        
        // Check collisions in the same update cycle
        updated.forEach(ornament => {
          // Skip if already processed
          if (processedOrnaments.current.has(ornament.id)) return;
          
          // Check if ornament is at player height (bottom 10% of screen)
          if (ornament.y > 85 && ornament.y < 95) {
            // Check horizontal collision (within player width)
            if (Math.abs(ornament.x - playerX) < 6) {
              // Mark as processed and remove
              processedOrnaments.current.add(ornament.id);
              toRemove.add(ornament.id);
              
              if (ornament.type === 'good') {
                setScore(s => s + 10);
              } else {
                setLives(l => Math.max(0, l - 1));
              }
            }
          }
          
          // Check for missed good ornaments (bottom of screen)
          if (ornament.y > 100 && ornament.type === 'good' && !processedOrnaments.current.has(ornament.id)) {
            processedOrnaments.current.add(ornament.id);
            setLives(l => Math.max(0, l - 1));
          }
        });

        // Remove caught/missed ornaments and those off screen
        return updated.filter(o => !toRemove.has(o.id) && o.y < 105);
      });
    }, 50);

    return () => {
      if (gameLoop.current) clearInterval(gameLoop.current);
    };
  }, [gameStarted, gameActive, isPaused, playerX]);

  // Increase difficulty every 100 points
  useEffect(() => {
    const newDifficulty = Math.floor(score / 100) + 1;
    if (newDifficulty > difficulty) {
      setDifficulty(newDifficulty);
    }
  }, [score, difficulty]);

  // Game over when lives reach 0
  useEffect(() => {
    if (lives <= 0 && gameStarted) {
      setGameActive(false);
      if (spawnTimer.current) clearInterval(spawnTimer.current);
      if (gameLoop.current) clearInterval(gameLoop.current);
    }
  }, [lives, gameStarted]);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!gameStarted || !gameActive || isPaused) return;
      
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setPlayerX(x => Math.max(5, x - 3));
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setPlayerX(x => Math.min(95, x + 3));
      }
      if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setIsPaused(p => !p);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameStarted, gameActive, isPaused]);

  // Touch controls for mobile
  useEffect(() => {
    if (!gameRef.current) return;

    const handleTouch = (e: TouchEvent) => {
      if (!gameStarted || !gameActive || isPaused) return;
      
      const touch = e.touches[0];
      const rect = gameRef.current?.getBoundingClientRect();
      if (!rect) return;

      const touchX = ((touch.clientX - rect.left) / rect.width) * 100;
      setPlayerX(Math.max(5, Math.min(95, touchX)));
    };

    gameRef.current.addEventListener('touchmove', handleTouch);
    const ref = gameRef.current;
    return () => ref?.removeEventListener('touchmove', handleTouch);
  }, [gameStarted, gameActive, isPaused]);

  const handleQuit = () => {
    setGameActive(false);
    if (spawnTimer.current) clearInterval(spawnTimer.current);
    if (gameLoop.current) clearInterval(gameLoop.current);
    onGameOver(score);
  };

  // Memoize snowflake positions so they don't re-render/teleport on every frame
  const snowflakes = useMemo(() => {
    const flakeCount = 50;
    const arr: { left: number; top: number; delay: number; duration: number }[] = [];
    for (let i = 0; i < flakeCount; i++) {
      arr.push({
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 10,
        duration: 10 + Math.random() * 10
      });
    }
    return arr;
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-blue-900 via-blue-700 to-blue-600 z-50 overflow-hidden">
      {/* Snow background effect (memoized positions) */}
      <div className="absolute inset-0 opacity-30" aria-hidden>
        {snowflakes.map((f, i) => (
          <div
            key={i}
            className="absolute text-white animate-fall"
            style={{
              left: `${f.left}%`,
              top: `${f.top}%`,
              animationDelay: `${f.delay}s`,
              animationDuration: `${f.duration}s`
            }}
          >
            ❄️
          </div>
        ))}
      </div>

      {/* Header - Score & Lives */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/40 to-transparent p-4 z-10">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div className="text-white">
            <div className="text-3xl font-bold"><span aria-live="polite">🎄 {score}</span></div>
            <div className="text-sm opacity-75">Score</div>
          </div>
          
          <div className="text-white text-center">
            <div className="text-2xl font-bold">Level {difficulty}</div>
            <div className="text-sm opacity-75">Difficulty</div>
          </div>
          
          <div className="text-white text-right">
            <div className="text-3xl"><span aria-live="polite">{[...Array(lives)].map((_, i) => (
                <span key={i}>❤️</span>
              ))}</span></div>
            <div className="text-sm opacity-75">Lives</div>
          </div>
        </div>
      </div>

      {/* Game area */}
      <div 
        ref={gameRef} 
        className={`relative w-full h-full touch-none ${highContrast ? 'high-contrast' : ''}`}
        tabIndex={0}
        role="application"
        aria-label="Catch falling ornaments. Press Enter to start. Use arrow keys or A/D to move. Space to pause."
      >
        {/* Player (Snowman) */}
        {gameStarted && (
          <div 
            className="absolute bottom-10 text-6xl transition-all duration-75 pointer-events-none z-20"
            style={{ 
              left: `${playerX}%`, 
              transform: 'translateX(-50%)',
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
            }}
          >
            <span role="img" aria-label="Player snowman">⛄</span>
          </div>
        )}

        {/* Ornaments */}
        {ornaments.map(ornament => (
          <div
            key={ornament.id}
            className="absolute text-4xl pointer-events-none animate-spin-slow"
            style={{ 
              left: `${ornament.x}%`, 
              top: `${ornament.y}%`,
              transform: 'translateX(-50%)',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            }}
          aria-hidden
          >
            {ornament.emoji}
          </div>
        ))}

        {/* Start Screen */}
        {!gameStarted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-30">
            <div className="text-center text-white p-8 bg-gradient-to-br from-red-600/80 to-green-600/80 rounded-2xl shadow-2xl border-4 border-white/30 max-w-md">
              <h1 className="text-5xl font-bold mb-4 animate-bounce">🎄 Catch the Ornaments! 🎄</h1>
              <p className="text-xl mb-6">Help the snowman catch falling ornaments!</p>
              <div className="text-left mb-6 bg-white/10 p-4 rounded-lg">
                <p className="mb-2">✅ Catch: 🎄 🎁 ⭐ 🔔 🎅 ❄️ 🦌</p>
                <p className="mb-2">❌ Avoid: 🪨 💣 🔥 ☠️</p>
                <p className="mb-2">💚 3 Lives - Don't miss good ornaments!</p>
                <p className="mb-2">📈 Speed increases every 100 points</p>
              </div>
              <div className="mb-4 text-sm opacity-90">
                <p>🖱️ Desktop: ← → Arrow keys or A/D</p>
                <p>📱 Mobile: Touch to move</p>
                <p>⏸️ Press SPACE to pause</p>
              </div>
              <button
                onClick={startGame}
                className="px-8 py-4 bg-white text-green-600 rounded-full text-2xl font-bold hover:scale-110 transform transition-all shadow-lg hover:shadow-xl"
              >
                🎮 Start Game!
              </button>
            </div>
          </div>
        )}

        {/* Pause Screen */}
        {isPaused && gameStarted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30">
            <div className="text-center text-white p-8 bg-gradient-to-br from-blue-600/80 to-purple-600/80 rounded-2xl shadow-2xl border-4 border-white/30">
              <h2 className="text-4xl font-bold mb-4">⏸️ Paused</h2>
              <p className="text-xl mb-2">Score: {score}</p>
              <p className="text-lg mb-6">Lives: {[...Array(lives)].map(() => '❤️').join(' ')}</p>
              <button
                onClick={() => setIsPaused(false)}
                className="px-6 py-3 bg-white text-blue-600 rounded-full text-xl font-bold hover:scale-110 transform transition-all shadow-lg mr-4"
              >
                ▶️ Resume
              </button>
              <button
                onClick={handleQuit}
                className="px-6 py-3 bg-red-500 text-white rounded-full text-xl font-bold hover:scale-110 transform transition-all shadow-lg"
              >
                🚪 Quit
              </button>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {!gameActive && gameStarted && lives <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-30">
            <div className="text-center text-white p-8 bg-gradient-to-br from-red-600/90 to-orange-600/90 rounded-2xl shadow-2xl border-4 border-white/30 max-w-md">
              <h2 className="text-5xl font-bold mb-4">🎄 Game Over! 🎄</h2>
              <div className="text-6xl font-bold mb-2 text-yellow-300">{score}</div>
              <p className="text-xl mb-6">Final Score</p>
              <p className="text-lg mb-6">You reached Level {difficulty}!</p>
              <div className="space-y-3">
                <button
                  onClick={startGame}
                  className="w-full px-6 py-3 bg-white text-green-600 rounded-full text-xl font-bold hover:scale-105 transform transition-all shadow-lg"
                >
                  🔄 Play Again
                </button>
                <button
                  onClick={handleQuit}
                  className="w-full px-6 py-3 bg-blue-500 text-white rounded-full text-xl font-bold hover:scale-105 transform transition-all shadow-lg"
                >
                  📊 View Leaderboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls (bottom) */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-4 z-10">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPaused(!isPaused)}
              disabled={!gameStarted || !gameActive}
              aria-label={isPaused ? 'Resume game' : 'Pause game'}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors shadow-lg"
            >
              {isPaused ? '▶️ Resume' : '⏸️ Pause'}
            </button>

            {/* Left/Right move for keyboard users */}
            <button
              onClick={() => setPlayerX(x => Math.max(5, x - 3))}
              aria-label="Move left"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg shadow-md"
            >
              ⬅️
            </button>
            <button
              onClick={() => setPlayerX(x => Math.min(95, x + 3))}
              aria-label="Move right"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg shadow-md"
            >
              ➡️
            </button>
          </div>
          
          <div className="text-white text-center text-sm opacity-75 hidden md:block">
            <p>← → or A/D to move | SPACE to pause</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setHighContrast(h => !h)}
              aria-pressed={highContrast}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg shadow-md"
            >
              {highContrast ? '🔆 High contrast' : '🔅 Normal'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors shadow-lg"
            >
              ❌ Close
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); }
          100% { transform: translateY(100vh) rotate(360deg); }
        }
        .animate-fall {
          animation: fall linear infinite;
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: translateX(-50%) rotate(0deg); }
          to { transform: translateX(-50%) rotate(360deg); }
        }
        .high-contrast .text-4xl, .high-contrast .text-6xl {
          text-shadow: 0 0 8px rgba(255,255,255,0.85), 0 0 1px rgba(0,0,0,0.5);
        }
        .high-contrast {
          filter: contrast(140%) brightness(105%);
        }
      `}</style>
    </div>
  );
}
