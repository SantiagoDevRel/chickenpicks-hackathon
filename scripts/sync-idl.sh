#!/usr/bin/env bash
# Copies the IDL produced by `anchor build` into the JS workspace package
# so apps/web and apps/mobile pick up the real types.
# Run after every program change that changes account shapes or instruction
# signatures.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$REPO_ROOT/programs/chickenpicks-onchain/target/idl/chickenpicks_onchain.json"
DST="$REPO_ROOT/packages/anchor-client/src/idl.json"

if [[ ! -f "$SRC" ]]; then
  echo "Error: $SRC not found. Run 'anchor build' first." >&2
  exit 1
fi

cp "$SRC" "$DST"
echo "✓ IDL synced: $SRC -> $DST"
