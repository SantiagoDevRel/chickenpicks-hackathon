#!/usr/bin/env bash
# Helper to drive an EAS build from outside WSL. Sets up nvm PATH first
# so 'eas' resolves regardless of how the shell was invoked.
set -e
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20 >/dev/null 2>&1 || true
cd ~/chickenpicks-hackathon
echo "--- whoami ---"
eas whoami
echo "--- pulling latest ---"
git pull --ff-only origin main
echo "--- pnpm install ---"
pnpm install
echo "--- starting build ---"
cd apps/mobile
eas build -p android --profile preview --non-interactive --no-wait
