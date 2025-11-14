// Pure game logic used by ChristmasGame component
// This module isolates the update loop's core behavior so it can be unit-tested.

export interface Ornament {
  id: number;
  x: number;
  y: number;
  type: 'good' | 'bad';
  emoji: string;
  speed: number;
}

export interface GameSettings {
  initialSpeed: number;
  speedIncrease: number;
  spawnInterval: number;
  spawnDecrease: number;
  minSpawnInterval: number;
}

export interface UpdateResult {
  updatedOrnaments: Ornament[];
  scoreDelta: number;
  livesDelta: number;
  processedIds: number[];
}

export function getInitialGameState() {
  return {
    score: 0,
    lives: 3,
    ornaments: [] as Ornament[],
    difficulty: 1,
    processed: new Set<number>()
  };
}

/**
 * Apply a single update tick for ornaments and compute score/life changes.
 * - Moves ornaments down by their speed
 * - Detects collisions with the player (playerX: 0..100)
 * - Detects missed good ornaments (y > 100)
 * - Uses a processed set to ensure ornaments are only processed once
 */
export function updateOrnamentsAndComputeChanges(
  ornaments: Ornament[],
  playerX: number,
  processed: Set<number>,
  settings: GameSettings,
  difficulty: number
): UpdateResult {
  // Move ornaments
  const updated = ornaments.map(o => ({ ...o, y: o.y + o.speed }));

  let scoreDelta = 0;
  let livesDelta = 0;
  const processedIds: number[] = [];
  const toRemove = new Set<number>();

  updated.forEach(ornament => {
    if (processed.has(ornament.id)) return;

    // collision detection at bottom (85..95)
    if (ornament.y > 85 && ornament.y < 95) {
      if (Math.abs(ornament.x - playerX) < 6) {
        processed.add(ornament.id);
        processedIds.push(ornament.id);
        toRemove.add(ornament.id);
        if (ornament.type === 'good') scoreDelta += 10;
        else livesDelta += 1;
      }
    }

    // missed good ornaments
    if (ornament.y > 100 && ornament.type === 'good' && !processed.has(ornament.id)) {
      processed.add(ornament.id);
      processedIds.push(ornament.id);
      livesDelta += 1;
      toRemove.add(ornament.id);
    }
  });

  const filtered = updated.filter(o => !toRemove.has(o.id) && o.y < 105);

  return { updatedOrnaments: filtered, scoreDelta, livesDelta, processedIds };
}

export default {
  getInitialGameState,
  updateOrnamentsAndComputeChanges
};
