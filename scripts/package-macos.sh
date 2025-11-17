#!/usr/bin/env bash
set -euo pipefail

APP_NAME="Kull.app"
BUILD_DIR="dist/macos"
DMG_NAME="Kull.dmg"

echo "[i] Packaging macOS app (placeholder script)"
mkdir -p "$BUILD_DIR"
echo "This is a placeholder. Use Xcode archive + notarization here." > "$BUILD_DIR/README.txt"
echo "Done."

