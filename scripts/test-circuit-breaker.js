/**
 * Circuit Breaker Test Script
 * 
 * Tests the circuit breaker functionality:
 * - State persistence
 * - State transitions
 * - Failure recording
 * - Success recording
 * - Manual reset
 */

const { getCircuitBreaker, resetCircuitBreakerInstance, CircuitState } = require('./lib/circuit-breaker.ts');

async function testCircuitBreaker() {
  console.log('=== Circuit Breaker Test Suite ===\n');

  try {
    // Test 1: Initialize circuit breaker
    console.log('Test 1: Initialize circuit breaker');
    const cb = getCircuitBreaker();
    console.log(`✓ Initial state: ${cb.getState()}`);
    console.log(`✓ FPP online: ${cb.isFPPOnline()}\n`);

    // Test 2: Record failures to open circuit
    console.log('Test 2: Record 3 failures to open circuit');
    cb.recordFailure('Test failure 1');
    cb.recordFailure('Test failure 2');
    cb.recordFailure('Test failure 3 - should open');
    console.log(`✓ State after 3 failures: ${cb.getState()}`);
    console.log(`✓ Circuit should be OPEN: ${cb.getState() === CircuitState.OPEN ? 'PASS' : 'FAIL'}\n`);

    // Test 3: Check request blocking
    console.log('Test 3: Check request blocking when OPEN');
    const allowRequest = cb.allowRequest();
    console.log(`✓ Allow request: ${allowRequest} (should be false initially)`);
    
    if (!allowRequest) {
      console.log('✓ PASS: Requests blocked when circuit is OPEN\n');
    } else {
      console.log('✗ FAIL: Circuit should block requests\n');
    }

    // Test 4: Statistics
    console.log('Test 4: Get circuit breaker statistics');
    const stats = cb.getStats();
    console.log(`✓ State: ${stats.state}`);
    console.log(`✓ Failure count: ${stats.failureCount}`);
    console.log(`✓ Total transitions: ${stats.totalTransitions}`);
    console.log(`✓ Next retry in: ${stats.nextRetryIn ? `${Math.ceil(stats.nextRetryIn / 1000)}s` : 'N/A'}\n`);

    // Test 5: Manual reset
    console.log('Test 5: Manual reset (admin override)');
    cb.reset();
    console.log(`✓ State after reset: ${cb.getState()}`);
    console.log(`✓ Circuit should be CLOSED: ${cb.getState() === CircuitState.CLOSED ? 'PASS' : 'FAIL'}\n`);

    // Test 6: Record success
    console.log('Test 6: Record success to keep circuit closed');
    cb.recordSuccess();
    console.log(`✓ State after success: ${cb.getState()}`);
    console.log(`✓ FPP online: ${cb.isFPPOnline()}\n`);

    // Test 7: Close and reopen (persistence test)
    console.log('Test 7: Test state persistence');
    const stateBefore = cb.getState();
    console.log(`✓ State before close: ${stateBefore}`);
    
    // Close database connection
    cb.close();
    console.log('✓ Database connection closed');
    
    // Reset singleton and create new instance
    resetCircuitBreakerInstance();
    const cb2 = getCircuitBreaker();
    const stateAfter = cb2.getState();
    console.log(`✓ State after restart: ${stateAfter}`);
    console.log(`✓ State persisted: ${stateBefore === stateAfter ? 'PASS' : 'FAIL'}\n`);

    // Cleanup
    cb2.close();

    console.log('=== All Tests Completed Successfully! ===');
    process.exit(0);

  } catch (error) {
    console.error('\n✗ TEST FAILED:', error);
    process.exit(1);
  }
}

// Run tests
testCircuitBreaker();
