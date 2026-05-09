#!/usr/bin/env bash
# Build + redeploy the chickenpicks-onchain Anchor program to devnet.
# Same program ID — only the bytecode changes.
#
# Run from anywhere; the script cd's into the program dir.
set -euo pipefail

# Set up Solana + Anchor PATH (WSL Ubuntu, nvm).
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$HOME/.avm/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh"
  nvm use 20 >/dev/null 2>&1 || true
fi

echo "--- versions ---"
rustc --version
solana --version
anchor --version
node --version

cd ~/chickenpicks-hackathon/programs/chickenpicks-onchain

echo "--- ensuring devnet cluster ---"
solana config set --url devnet >/dev/null
solana balance

echo "--- anchor build ---"
anchor build

echo "--- copying IDL to anchor-client ---"
cp target/idl/chickenpicks_onchain.json ../../packages/anchor-client/src/idl.json
cp target/idl/chickenpicks_onchain.json ../../apps/mobile/lib/idl.json

echo "--- anchor deploy (devnet) ---"
anchor deploy --provider.cluster devnet

echo "--- DONE ---"
solana program show Cdd53o33BTaZcmpZ55TemGPmZRR2mbMiYDEU6Mecb3ut --url devnet || true
