#!/bin/bash

# Test Update System - Validates update infrastructure without running actual update
# This script checks that all components are in place for auto-update to work

echo "=========================================="
echo "🧪 Testing Auto-Update System"
echo "=========================================="
echo ""

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

ERRORS=0

# Test 1: Check PM2 availability
echo "1️⃣  Checking PM2..."
if command -v pm2 &> /dev/null; then
    echo "   ✅ PM2 found: $(which pm2)"
    echo "   📍 Version: $(pm2 --version)"
else
    echo "   ❌ PM2 not found in PATH"
    echo "   PATH: $PATH"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 2: Check scripts exist
echo "2️⃣  Checking update scripts..."
if [ -f "./scripts/update-daemon.sh" ]; then
    echo "   ✅ update-daemon.sh found (atomic 8-phase system)"
    if [ -x "./scripts/update-daemon.sh" ]; then
        echo "   ✅ update-daemon.sh is executable"
    else
        echo "   ⚠️  update-daemon.sh not executable (will be fixed automatically)"
    fi
else
    echo "   ❌ update-daemon.sh not found"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "./scripts/run-update.sh" ]; then
    echo "   ✅ run-update.sh found (launcher)"
    if [ -x "./scripts/run-update.sh" ]; then
        echo "   ✅ run-update.sh is executable"
    else
        echo "   ⚠️  run-update.sh not executable (will be fixed automatically)"
    fi
else
    echo "   ❌ run-update.sh not found"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 3: Check git repository
echo "3️⃣  Checking git repository..."
if [ -d ".git" ]; then
    echo "   ✅ Git repository found"
    echo "   📍 Remote: $(git remote get-url origin 2>/dev/null || echo 'not set')"
    echo "   📍 Branch: $(git branch --show-current 2>/dev/null || echo 'unknown')"
    
    # Check if there are uncommitted changes
    if git diff-index --quiet HEAD -- 2>/dev/null; then
        echo "   ✅ No uncommitted changes"
    else
        echo "   ⚠️  Uncommitted changes detected (will be stashed during update)"
    fi
else
    echo "   ❌ Not a git repository"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 4: Check logs directory
echo "4️⃣  Checking logs directory..."
if [ -d "logs" ]; then
    echo "   ✅ logs/ directory exists"
    if [ -w "logs" ]; then
        echo "   ✅ logs/ is writable"
    else
        echo "   ❌ logs/ is not writable"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "   ⚠️  logs/ directory missing (will be created automatically)"
    mkdir -p logs && echo "   ✅ Created logs/ directory"
fi
echo ""

# Test 5: Test detached process spawn
echo "5️⃣  Testing detached process spawn..."
TEST_SCRIPT="/tmp/fpp-test-detach-$$.sh"
cat > "$TEST_SCRIPT" << 'EOF'
#!/bin/bash
echo "Test process started: $$" > /tmp/fpp-detach-test.log
sleep 2
echo "Test process completed: $$" >> /tmp/fpp-detach-test.log
EOF
chmod +x "$TEST_SCRIPT"

# Spawn detached
bash "$TEST_SCRIPT" &
CHILD_PID=$!
disown $CHILD_PID

sleep 1
if ps -p $CHILD_PID > /dev/null 2>&1; then
    echo "   ✅ Detached process is running (PID: $CHILD_PID)"
else
    echo "   ❌ Detached process failed to start"
    ERRORS=$((ERRORS + 1))
fi

# Cleanup
rm -f "$TEST_SCRIPT"
echo ""

# Test 6: Check Node/npm
echo "6️⃣  Checking Node.js environment..."
if command -v node &> /dev/null; then
    echo "   ✅ Node.js: $(node --version)"
else
    echo "   ❌ Node.js not found"
    ERRORS=$((ERRORS + 1))
fi

if command -v npm &> /dev/null; then
    echo "   ✅ npm: $(npm --version)"
else
    echo "   ❌ npm not found"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 7: Check PM2 process
echo "7️⃣  Checking PM2 process..."
if pm2 list | grep -q "fpp-control"; then
    echo "   ✅ fpp-control is running in PM2"
    pm2 info fpp-control | grep -E "status|pid|cpu|memory" | head -4
else
    echo "   ⚠️  fpp-control not found in PM2 (update can still work)"
fi
echo ""

# Summary
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
    echo "✅ All tests passed!"
    echo "🎉 Auto-update system is ready"
    echo ""
    echo "To test the update (without actually updating):"
    echo "  1. Check current status: pm2 list"
    echo "  2. Trigger update from Admin Dashboard"
    echo "  3. Monitor logs: tail -f logs/update.log"
    echo "  4. Check status: cat logs/update_status"
else
    echo "❌ $ERRORS error(s) found"
    echo "⚠️  Auto-update may not work correctly"
    echo ""
    echo "Fix the errors above before attempting update"
fi
echo "=========================================="

exit $ERRORS
