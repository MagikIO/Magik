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

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  pnpm build      - Build all packages"
echo "  pnpm dev        - Watch mode for development"
echo "  pnpm test       - Run tests"
echo "  pnpm typecheck  - Type check all packages"
echo "  pnpm lint       - Lint all packages"
echo "  pnpm format     - Format all packages"
