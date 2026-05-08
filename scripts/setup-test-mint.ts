// scripts/setup-test-mint.ts — Create our own devnet USDC-equivalent mint.
//
// Why: Circle's devnet USDC (Gh9Z...) requires their faucet (rate-limited,
// often broken). Our own mint with deployer as mint authority lets us
// freely mint test USDC to any wallet for the demo flow.
//
// Idempotent: writes the mint keypair to keys/test-mint.json on first run.
// Re-running with the keypair present just verifies the on-chain mint and
// reports the address.
//
// Usage: pnpm mint:setup

import {
  createMint,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const DEPLOYER_PATH = path.join(repoRoot, 'keys', 'deployer.json');
const MINT_PATH = path.join(repoRoot, 'keys', 'test-mint.json');
const DECIMALS = 6;
const INITIAL_SUPPLY = 1_000_000_000_000n; // 1,000,000.000000 USDC

function loadKeypair(p: string): Keypair {
  const bytes = JSON.parse(fs.readFileSync(p, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(bytes));
}

function saveKeypair(p: string, kp: Keypair): void {
  fs.writeFileSync(p, JSON.stringify(Array.from(kp.secretKey)));
}

async function main() {
  console.log(`RPC: ${RPC}`);

  if (!fs.existsSync(DEPLOYER_PATH)) {
    console.error('✗ Deployer keypair missing.');
    process.exit(1);
  }
  const deployer = loadKeypair(DEPLOYER_PATH);
  const conn = new Connection(RPC, 'confirmed');

  const balance = await conn.getBalance(deployer.publicKey);
  console.log(`Deployer: ${deployer.publicKey.toBase58()}`);
  console.log(`Balance:  ${(balance / 1e9).toFixed(4)} SOL`);

  let mintKeypair: Keypair;
  let isNew = false;
  if (fs.existsSync(MINT_PATH)) {
    mintKeypair = loadKeypair(MINT_PATH);
    console.log(`Mint keypair found: ${mintKeypair.publicKey.toBase58()}`);
  } else {
    mintKeypair = Keypair.generate();
    saveKeypair(MINT_PATH, mintKeypair);
    isNew = true;
    console.log(`Generated new mint keypair: ${mintKeypair.publicKey.toBase58()}`);
  }

  // Check if mint exists on chain
  let onChain = false;
  try {
    await getMint(conn, mintKeypair.publicKey);
    onChain = true;
  } catch {
    onChain = false;
  }

  if (onChain) {
    console.log('✓ Mint already exists on chain.');
  } else {
    console.log('Creating mint on chain...');
    const mint = await createMint(
      conn,
      deployer,
      deployer.publicKey, // mint authority
      null, // freeze authority
      DECIMALS,
      mintKeypair,
    );
    console.log(`✓ Mint created: ${mint.toBase58()}`);
  }

  // Ensure deployer has an ATA + initial supply
  console.log('Ensuring deployer ATA + initial supply...');
  const deployerAta = await getOrCreateAssociatedTokenAccount(
    conn,
    deployer,
    mintKeypair.publicKey,
    deployer.publicKey,
  );
  console.log(`Deployer ATA: ${deployerAta.address.toBase58()}`);
  console.log(`  Balance: ${deployerAta.amount.toString()} base units`);

  if (deployerAta.amount === 0n && (isNew || !onChain)) {
    console.log(`Minting initial supply (${INITIAL_SUPPLY} base units)...`);
    await mintTo(
      conn,
      deployer,
      mintKeypair.publicKey,
      deployerAta.address,
      deployer,
      INITIAL_SUPPLY,
    );
    console.log('✓ Minted.');
  }

  console.log('');
  console.log('━━━ DONE ━━━');
  console.log(`MINT: ${mintKeypair.publicKey.toBase58()}`);
  console.log('');
  console.log('Update env so apps + scripts pick up the new mint:');
  console.log(`  NEXT_PUBLIC_USDC_MINT="${mintKeypair.publicKey.toBase58()}"`);
}

main().catch((e) => {
  console.error('');
  console.error('✗ Failed:', e instanceof Error ? e.message : e);
  if (e instanceof Error && e.stack) console.error(e.stack);
  process.exit(1);
});
