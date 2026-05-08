// scripts/init-platform.ts — One-shot bootstrap for devnet.
//
// Reads keys/deployer.json (the deployer keypair), connects to the configured
// RPC (devnet by default), and calls initialize_platform if the PlatformConfig
// PDA doesn't exist yet. Idempotent: safe to re-run.
//
// Run from the repo root:
//   pnpm init:platform

import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
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

async function main() {
  console.log(`RPC: ${RPC}`);

  if (!fs.existsSync(KEYPAIR_PATH)) {
    console.error(`✗ Deployer keypair not found at ${KEYPAIR_PATH}`);
    console.error(`  Did you run \`solana-keygen new -o keys/deployer.json\`?`);
    process.exit(1);
  }
  if (!fs.existsSync(IDL_PATH)) {
    console.error(`✗ IDL not found at ${IDL_PATH}`);
    console.error(`  Run \`bash scripts/sync-idl.sh\` after \`anchor build\`.`);
    process.exit(1);
  }

  const idl = JSON.parse(fs.readFileSync(IDL_PATH, 'utf8'));
  const keypairBytes = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8'));
  const deployer = Keypair.fromSecretKey(Uint8Array.from(keypairBytes));

  const conn = new Connection(RPC, 'confirmed');
  const balance = await conn.getBalance(deployer.publicKey);
  console.log(`Deployer: ${deployer.publicKey.toBase58()}`);
  console.log(`Balance:  ${(balance / 1e9).toFixed(4)} SOL`);

  if (balance < 0.01 * 1e9) {
    console.error('✗ Deployer balance < 0.01 SOL — top up before init.');
    process.exit(1);
  }

  const wallet = new Wallet(deployer);
  const provider = new AnchorProvider(conn, wallet, { commitment: 'confirmed' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = new Program(idl as any, provider);
  console.log(`Program:  ${program.programId.toBase58()}`);

  const [platformPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform')],
    program.programId,
  );
  console.log(`Platform PDA: ${platformPda.toBase58()}`);

  const existing = await conn.getAccountInfo(platformPda);
  if (existing) {
    console.log('');
    console.log('✓ Platform already initialized — nothing to do.');
    return;
  }

  console.log('');
  console.log('Sending initialize_platform tx...');
  const sig = await program.methods
    .initializePlatform()
    .accounts({
      platform: platformPda,
      authority: deployer.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log('');
  console.log('✓ Platform initialized!');
  console.log(`  Tx: ${sig}`);
  console.log(`  Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}

main().catch((e) => {
  console.error('');
  console.error('✗ Failed:', e instanceof Error ? e.message : e);
  if (e instanceof Error && e.stack) {
    console.error(e.stack);
  }
  process.exit(1);
});
