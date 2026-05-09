#!/usr/bin/env bash
# Poll EAS build status. Emits a single line on each status change and
# exits when terminal (finished | errored | canceled).
set -e
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20 >/dev/null 2>&1 || true

BUILD_ID="${1:?usage: eas-poll.sh <build_id>}"
prev=""
while true; do
  json=$(eas build:view "$BUILD_ID" --json 2>/dev/null || echo '{}')
  status=$(echo "$json" | jq -r '.status // "unknown"')
  if [ "$status" != "$prev" ]; then
    echo "[$(date +%H:%M:%S)] status=$status"
    prev="$status"
  fi
  case "$status" in
    finished|errored|canceled)
      echo "DONE: $status"
      url=$(echo "$json" | jq -r '.artifacts.buildUrl // ""')
      [ -n "$url" ] && echo "ARTIFACT: $url"
      exit 0
      ;;
  esac
  sleep 30
done
