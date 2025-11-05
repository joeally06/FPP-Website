#!/bin/bash

# FPP Control Center - Version Checker
# Displays current version, git info, and available releases

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║         FPP Control Center - Version Info            ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Get current version from package.json
if [ -f "package.json" ]; then
    CURRENT_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
    echo "📦 Current Version: v$CURRENT_VERSION"
else
    echo "⚠️  Cannot determine version (package.json not found)"
    CURRENT_VERSION="unknown"
fi

# Get current git commit
if command -v git &> /dev/null && [ -d ".git" ]; then
    COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    echo "🔖 Git Branch: $BRANCH"
    echo "📝 Git Commit: $COMMIT_HASH"
    
    # Check if on a tagged release
    CURRENT_TAG=$(git describe --exact-match --tags 2>/dev/null || echo "")
    if [ -n "$CURRENT_TAG" ]; then
        echo "✅ Running official release: $CURRENT_TAG"
    else
        echo "ℹ️  Running development version (not a tagged release)"
    fi
    
    echo ""
    echo "📋 Available Releases:"
    TAGS=$(git tag -l 'v*' --sort=-v:refname 2>/dev/null || echo "")
    if [ -n "$TAGS" ]; then
        echo "$TAGS" | head -5 | while read -r tag; do
            if [ "$tag" = "$CURRENT_TAG" ]; then
                echo "   $tag (current)"
            else
                echo "   $tag"
            fi
        done
        
        TAG_COUNT=$(echo "$TAGS" | wc -l)
        if [ "$TAG_COUNT" -gt 5 ]; then
            echo "   ... and $((TAG_COUNT - 5)) more"
        fi
    else
        echo "   No releases found"
    fi
else
    echo "⚠️  Git not available or not a git repository"
fi

echo ""
echo "🌐 GitHub: https://github.com/joeally06/FPP-Website"
echo "📚 Documentation: https://github.com/joeally06/FPP-Website/wiki"
echo ""
