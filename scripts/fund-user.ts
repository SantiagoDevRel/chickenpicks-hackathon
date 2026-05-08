// scripts/fund-user.ts — Top up a Privy/test wallet with SOL + test USDC.
//
// Reads the test mint from keys/test-mint.json, transfers SOL from the
// deployer if the target balance is low, then mints test USDC to the
// target's ATA.
//
// Usage: pnpm fund <pubkey>      e.g. pnpm fund HFe4...7nyx

import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
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

const TARGET_SOL = 0.1;            // top up to this SOL balance
const SOL_THRESHOLD = 0.05;        // skip transfer if recipient already has more
const USDC_TO_MINT = 10_000_000n;  // 10 USDC (6 decimals)

function loadKeypair(p: string): Keypair {
  const bytes = JSON.parse(fs.readFileSync(p, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(bytes));
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: pnpm fund <pubkey>');
    process.exit(1);
  }
  let target: PublicKey;
  try {
    target = new PublicKey(arg);
  } catch {
    console.error(`✗ "${arg}" is not a valid base58 pubkey.`);
    process.exit(1);
  }

  if (!fs.existsSync(DEPLOYER_PATH) || !fs.existsSync(MINT_PATH)) {
    console.error('✗ Missing keypairs. Run init:platform + mint:setup first.');
    process.exit(1);
  }

  const deployer = loadKeypair(DEPLOYER_PATH);
  const mintKeypair = loadKeypair(MINT_PATH);
  const conn = new Connection(RPC, 'confirmed');

  console.log(`RPC:      ${RPC}`);
  console.log(`Deployer: ${deployer.publicKey.toBase58()}`);
  console.log(`Mint:     ${mintKeypair.publicKey.toBase58()}`);
  console.log(`Target:   ${target.toBase58()}`);
  console.log('');

  // ─── 1. SOL top-up ──────────────────────────────────────────────────────
  const targetSolLamports = await conn.getBalance(target);
  const targetSolHuman = targetSolLamports / LAMPORTS_PER_SOL;
  console.log(`Target SOL balance: ${targetSolHuman} SOL`);
  if (targetSolHuman >= SOL_THRESHOLD) {
    console.log(`✓ Already > ${SOL_THRESHOLD} SOL — skipping SOL transfer.`);
  } else {
    const transferLamports = Math.floor(TARGET_SOL * LAMPORTS_PER_SOL);
    console.log(`Transferring ${TARGET_SOL} SOL from deployer...`);
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: deployer.publicKey,
        toPubkey: target,
        lamports: transferLamports,
      }),
    );
    const sig = await sendAndConfirmTransaction(conn, tx, [deployer]);
    console.log(`  ✓ Tx: ${sig}`);
  }

  // ─── 2. Test USDC mint ──────────────────────────────────────────────────
  console.log(`Ensuring target ATA + minting ${USDC_TO_MINT} USDC base units...`);
  const ata = await getOrCreateAssociatedTokenAccount(
    conn,
    deployer,
    mintKeypair.publicKey,
    target,
  );
  console.log(`  ATA: ${ata.address.toBase58()}`);
  console.log(`  Current balance: ${ata.amount} base units`);
  await mintTo(
    conn,
    deployer,
    mintKeypair.publicKey,
    ata.address,
    deployer,
    USDC_TO_MINT,
  );

  // Verify
  const afterAta = await getOrCreateAssociatedTokenAccount(
    conn,
    deployer,
    mintKeypair.publicKey,
    target,
  );
  console.log(`  ✓ New balance: ${afterAta.amount} base units (${Number(afterAta.amount) / 1_000_000} USDC)`);

  console.log('');
  console.log(`✓ Funded ${target.toBase58()}`);
}

main().catch((e) => {
  console.error('');
  console.error('✗ Failed:', e instanceof Error ? e.message : e);
  if (e instanceof Error && e.stack) console.error(e.stack);
  process.exit(1);
});
