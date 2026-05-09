#!/usr/bin/env bash
# Poll EAS build status. Emits a single line on each status change and
# exits when terminal (finished | errored | canceled).
set -e
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20 >/dev/null 2>&1 || true

BUILD_ID="${1:?usage: eas-poll.sh <build_id>}"
cd ~/chickenpicks-hackathon/apps/mobile
prev=""
while true; do
  json=$(eas build:view "$BUILD_ID" --json 2>/dev/null || echo '{}')
  # Parse status with node (jq isn't always installed in WSL).
  status=$(node -e "try{const d=JSON.parse(process.argv[1]);process.stdout.write(String(d.status||'unknown'));}catch{process.stdout.write('unknown');}" "$json")
  if [ "$status" != "$prev" ]; then
    echo "[$(date +%H:%M:%S)] status=$status"
    prev="$status"
  fi
  case "$status" in
    FINISHED|ERRORED|CANCELED|finished|errored|canceled)
      url=$(node -e "try{const d=JSON.parse(process.argv[1]);process.stdout.write(String((d.artifacts&&d.artifacts.buildUrl)||''));}catch{process.stdout.write('');}" "$json")
      [ -n "$url" ] && echo "ARTIFACT: $url"
      echo "DONE: $status"
      exit 0
      ;;
  esac
  sleep 30
done
