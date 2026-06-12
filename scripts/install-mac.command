#!/bin/bash
set -euo pipefail

APP="/Applications/Match Framer.app"

if [ ! -d "$APP" ]; then
  echo ""
  echo "Match Framer is not in Applications yet."
  echo "1. Open the .dmg from the GitHub release"
  echo "2. Drag Match Framer into Applications"
  echo "3. Run this script again"
  echo ""
  read -r -p "Press Enter to close..."
  exit 1
fi

xattr -cr "$APP"
echo ""
echo "Done. Match Framer is ready to open from Applications."
echo "If macOS still blocks it, right-click the app and choose Open."
echo ""
read -r -p "Press Enter to close..."
