// scripts/seed-demo-polla.ts — create a demo polla + 3 matches on devnet.
//
// Idempotent: if the polla PDA already exists for the same (creator, name),
// skip the create + each existing match. Run as many times as needed.
//
// Usage:
//   pnpm seed:demo

import { AnchorProvider, BN, Program, Wallet } from '@coral-xyz/anchor';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from '@solana/web3.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const KEYPAIR_PATH = path.join(repoRoot, 'keys', 'deployer.json');
const IDL_PATH = path.join(
  repoRoot,
  'packages',
  'anchor-client',
  'src',
  'idl.json',
);

// Polla name can be overridden via CLI arg so we can seed multiple distinct
// pools for testing without hitting the idempotent "already exists" guard.
const POLLA_NAME = process.argv[2] ?? 'World Cup with Friends';
const TOURNAMENT = 'World Cup 2026';
const ENTRY_AMOUNT = new BN(1_000_000); // 1 USDC (6 decimals)
const PRIZE_DISTRIBUTION = [50, 30, 20, 0, 0, 0, 0, 0, 0, 0];

// Resolve test USDC mint from keys/test-mint.json (created by mint:setup).
// Falls back to Circle's devnet USDC if test mint isn't set up — but that
// path requires Circle's faucet for users to get USDC.
const TEST_MINT_PATH = path.join(repoRoot, 'keys', 'test-mint.json');
let USDC_MINT: PublicKey;
if (fs.existsSync(TEST_MINT_PATH)) {
  const bytes = JSON.parse(fs.readFileSync(TEST_MINT_PATH, 'utf8'));
  USDC_MINT = Keypair.fromSecretKey(Uint8Array.from(bytes)).publicKey;
} else {
  USDC_MINT = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');
}

const MATCHES = [
  { home: 'Argentina', away: 'Brazil' },
  { home: 'Spain', away: 'France' },
  { home: 'Germany', away: 'Italy' },
];

const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

function nameToSeed(name: string): Buffer {
  const buf = Buffer.alloc(32);
  Buffer.from(name, 'utf8').copy(buf, 0);
  return buf;
}

function teamBytes(team: string): number[] {
  const buf = Buffer.alloc(16);
  Buffer.from(team, 'utf8').copy(buf, 0);
  return Array.from(buf);
}

function tournamentBytes(name: string): number[] {
  return Array.from(nameToSeed(name));
}

async function main() {
  console.log(`RPC: ${RPC}`);

  if (!fs.existsSync(KEYPAIR_PATH) || !fs.existsSync(IDL_PATH)) {
    console.error('✗ Missing keypair or IDL. Run init:platform first.');
    process.exit(1);
  }

  const idl = JSON.parse(fs.readFileSync(IDL_PATH, 'utf8'));
  const keypairBytes = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8'));
  const deployer = Keypair.fromSecretKey(Uint8Array.from(keypairBytes));

  const conn = new Connection(RPC, 'confirmed');
  const wallet = new Wallet(deployer);
  const provider = new AnchorProvider(conn, wallet, { commitment: 'confirmed' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = new Program(idl as any, provider);

  console.log(`Creator/deployer: ${deployer.publicKey.toBase58()}`);

  const nameSeed = nameToSeed(POLLA_NAME);
  const [pollaPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('polla'), deployer.publicKey.toBuffer(), nameSeed],
    program.programId,
  );
  const vault = getAssociatedTokenAddressSync(
    USDC_MINT,
    pollaPda,
    true, // allowOwnerOffCurve — pollaPda is a PDA, not a regular keypair
  );

  console.log(`Polla PDA:  ${pollaPda.toBase58()}`);
  console.log(`Vault ATA:  ${vault.toBase58()}`);
  console.log('');

  // ─── 1. create_polla (skip if exists) ───────────────────────────────────
  const existing = await conn.getAccountInfo(pollaPda);
  if (existing) {
    console.log('✓ Polla already exists — skipping create_polla.');
  } else {
    console.log(`Creating polla "${POLLA_NAME}" / tournament "${TOURNAMENT}"...`);
    const sig = await program.methods
      .createPolla(
        Array.from(nameSeed),
        tournamentBytes(TOURNAMENT),
        ENTRY_AMOUNT,
        MATCHES.length,
        PRIZE_DISTRIBUTION,
      )
      .accounts({
        polla: pollaPda,
        usdcMint: USDC_MINT,
        vault,
        creator: deployer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`  ✓ Polla created. Tx: ${sig}`);
    console.log(`    https://explorer.solana.com/tx/${sig}?cluster=devnet`);
    console.log('');
  }

  // ─── 2. add_match × 3 ───────────────────────────────────────────────────
  for (let i = 0; i < MATCHES.length; i++) {
    const m = MATCHES[i];
    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('match'), pollaPda.toBuffer(), Buffer.from([i])],
      program.programId,
    );
    const matchExists = await conn.getAccountInfo(matchPda);
    if (matchExists) {
      console.log(`✓ Match #${i} (${m.home} vs ${m.away}) already exists — skipping.`);
      continue;
    }
    console.log(`Adding match #${i}: ${m.home} vs ${m.away}...`);
    const sig = await program.methods
      .addMatch(i, teamBytes(m.home), teamBytes(m.away))
      .accounts({
        polla: pollaPda,
        matchAccount: matchPda,
        creator: deployer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`  ✓ Tx: ${sig}`);
  }

  console.log('');
  console.log('✓ Seed complete.');
  console.log(`  Polla: ${pollaPda.toBase58()}`);
  console.log(`  https://explorer.solana.com/address/${pollaPda.toBase58()}?cluster=devnet`);
}

main().catch((e) => {
  console.error('');
  console.error('✗ Failed:', e instanceof Error ? e.message : e);
  if (e instanceof Error && e.stack) {
    console.error(e.stack);
  }
  process.exit(1);
});
