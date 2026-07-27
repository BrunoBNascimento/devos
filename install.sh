#!/usr/bin/env bash
set -e

echo "🚀 Installing DevOS Workspace Orchestrator..."

# Create workspace directory if it doesn't exist
if [ -z "$1" ]; then
  WORKSPACE_DIR="devos-workspace"
else
  WORKSPACE_DIR="$1"
fi

mkdir -p "$WORKSPACE_DIR"
cd "$WORKSPACE_DIR"

echo "📂 Downloading DevOS core framework..."
curl -sL https://github.com/BrunoBNascimento/devos/archive/refs/heads/main.tar.gz | tar -xz --strip-components=1 devos-main/.devos

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "  1. cd $WORKSPACE_DIR"
echo "  2. Run your AI CLI (e.g., claude -p 'Run /devos.setup')"
echo "  3. Follow the interactive wizard to connect your repositories!"
