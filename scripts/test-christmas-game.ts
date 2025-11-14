import assert from 'assert';
import { getInitialGameState, updateOrnamentsAndComputeChanges, Ornament, GameSettings } from '../lib/game-logic';

function settings(): GameSettings {
  return {
    initialSpeed: 1,
    speedIncrease: 0.5,
    spawnInterval: 1000,
    spawnDecrease: 50,
    minSpawnInterval: 400
  };
}

function print(msg: string) {
  console.log('[test-christmas-game] ' + msg);
}

// Test 1: Missed good ornament reduces lives exactly once
(() => {
  print('Test 1: Missed good ornament reduces lives once');
  const { processed, score, lives } = getInitialGameState();
  const playerX = 50;
  const ornament: Ornament = { id: 1, x: 10, y: 101, type: 'good', emoji: '🎄', speed: 1 };
  const result1 = updateOrnamentsAndComputeChanges([ornament], playerX, processed, settings(), 1);
  assert.strictEqual(result1.livesDelta, 1, 'Should decrement lives by 1 for a missed good ornament');
  // Re-run - should not double decrement
  const result2 = updateOrnamentsAndComputeChanges(result1.updatedOrnaments, playerX, processed, settings(), 1);
  assert.strictEqual(result2.livesDelta, 0, 'Should not decrement lives again for the same ornament');
  print('Test 1 OK');
})();

// Test 2: Collision handled exactly once per ornament
(() => {
  print('Test 2: Collision handled once per ornament');
  const { processed } = getInitialGameState();
  const playerX = 50;
  const ornamentGood: Ornament = { id: 2, x: 50, y: 86, type: 'good', emoji: '🎁', speed: 1 };
  const res1 = updateOrnamentsAndComputeChanges([ornamentGood], playerX, processed, settings(), 1);
  assert.strictEqual(res1.scoreDelta, 10, 'Good ornament collision should add 10 points');
  const res2 = updateOrnamentsAndComputeChanges(res1.updatedOrnaments, playerX, processed, settings(), 1);
  assert.strictEqual(res2.scoreDelta, 0, 'Should not credit points twice for the same ornament');
  print('Test 2 OK');
})();

// Test 3: startGame resets state using helper
(() => {
  print('Test 3: getInitialGameState resets game state');
  const initial = getInitialGameState();
  assert.strictEqual(initial.score, 0, 'Initial score should be zero');
  assert.strictEqual(initial.lives, 3, 'Initial lives should be 3');
  assert.strictEqual(initial.ornaments.length, 0, 'Initial ornaments should be empty');
  assert.strictEqual(initial.difficulty, 1, 'Initial difficulty should be 1');
  assert.ok(initial.processed instanceof Set && initial.processed.size === 0, 'Initial processed set should be empty');
  print('Test 3 OK');
})();

print('All tests passed.');
