#!/bin/bash
# Install Git hooks to fix script permissions automatically

HOOKS_DIR=".githooks"
GIT_HOOKS_DIR=".git/hooks"

if [ ! -d ".git" ]; then
    echo "❌ Not a git repository"
    exit 1
fi

echo "🔧 Installing Git hooks..."

# Make hook scripts executable
chmod +x "$HOOKS_DIR/post-merge" 2>/dev/null
chmod +x "$HOOKS_DIR/post-checkout" 2>/dev/null

# Configure git to use our hooks directory
git config core.hooksPath "$HOOKS_DIR"

# Also manually create symlinks as backup
ln -sf "../../$HOOKS_DIR/post-merge" "$GIT_HOOKS_DIR/post-merge" 2>/dev/null
ln -sf "../../$HOOKS_DIR/post-checkout" "$GIT_HOOKS_DIR/post-checkout" 2>/dev/null

echo "✅ Git hooks installed"
echo ""
echo "These hooks will automatically:"
echo "  - Fix script permissions after git pull"
echo "  - Fix script permissions after git checkout"
echo ""

# Run the hook once now to fix current permissions
bash "$HOOKS_DIR/post-merge"
