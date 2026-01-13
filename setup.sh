#!/usr/bin/env bash
# Magik Monorepo Setup Script

set -e

echo "🪄 Setting up Magik Monorepo..."

# Check for required tools
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 18.0.0"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    curl -fsSL https://get.pnpm.io/install.sh | sh -
fi

# Install moonrepo CLI (optional)
if ! command -v moon &> /dev/null; then
    echo "🌙 moonrepo CLI not found. You can install it with:"
    echo "   pnpm add -g @moonrepo/cli"
    echo ""
    read -p "Install moonrepo now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pnpm add -g @moonrepo/cli
    fi
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  pnpm build    - Build all packages"
echo "  pnpm dev      - Watch mode for development"
echo "  pnpm test     - Run tests"
echo ""
echo "With moonrepo:"
echo "  moon run :build   - Build with caching"
echo "  moon run :dev     - Watch mode"
echo "  moon ci           - Run CI pipeline"
echo ""
echo "See MONOREPO.md for more information."
