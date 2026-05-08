// scripts/settle-polla.ts — Trigger settle_polla for the demo polla.
//
// Reads the polla, finds all Match PDAs (by polla + match_index) and all
// Prediction accounts (via getProgramAccounts memcmp filter), and passes
// them as remaining_accounts in the required order: matches first, then
// predictions.
//
// On-chain logic computes points for each prediction, sorts by
// (points DESC, submitted_at_slot ASC), writes final_rank, and pays the 5%
// fee to the treasury — all in one tx.
//
// Usage: pnpm settle [polla_pubkey]

import {
  AnchorProvider,
  Program,
  Wallet,
  type Idl,
} from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const DEPLOYER_PATH = path.join(repoRoot, 'keys', 'deployer.json');
const IDL_PATH = path.join(
  repoRoot,
  'packages',
  'anchor-client',
  'src',
  'idl.json',
);
const POLLA_NAME = 'WC2026 Test Group';

function loadKeypair(p: string): Keypair {
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(p, 'utf8'))),
  );
}

function nameSeed(name: string): Buffer {
  const buf = Buffer.alloc(32);
  Buffer.from(name, 'utf8').copy(buf, 0);
  return buf;
}

async function main() {
  const deployer = loadKeypair(DEPLOYER_PATH);
  const idl = JSON.parse(fs.readFileSync(IDL_PATH, 'utf8'));
  const conn = new Connection(RPC, 'confirmed');
  const provider = new AnchorProvider(conn, new Wallet(deployer), {
    commitment: 'confirmed',
  });
  const program = new Program(idl as Idl, provider);

  const [platformPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform')],
    program.programId,
  );

  let pollaPubkey: PublicKey;
  if (process.argv[2]) {
    pollaPubkey = new PublicKey(process.argv[2]);
  } else {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('polla'), deployer.publicKey.toBuffer(), nameSeed(POLLA_NAME)],
      program.programId,
    );
    pollaPubkey = pda;
  }
  console.log(`Polla: ${pollaPubkey.toBase58()}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polla = await (program.account as any).polla.fetch(pollaPubkey);
  console.log(
    `  status: ${Object.keys(polla.status)[0]} | matches: ${polla.matchesSettled}/${polla.numMatches} | participants: ${polla.numParticipants}`,
  );

  if (polla.status.settled !== undefined) {
    console.log('✓ Already settled — nothing to do.');
    return;
  }
  if (polla.matchesSettled !== polla.numMatches) {
    console.error(
      `✗ Cannot settle: only ${polla.matchesSettled}/${polla.numMatches} matches have results.`,
    );
    process.exit(1);
  }

  // Match PDAs in order 0..N-1
  const matchPdas: PublicKey[] = [];
  for (let i = 0; i < polla.numMatches; i++) {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('match'), pollaPubkey.toBuffer(), Buffer.from([i])],
      program.programId,
    );
    matchPdas.push(pda);
  }

  // All Prediction accounts for this polla — memcmp on polla field at offset 8
  // (8-byte discriminator + polla pubkey is the first field).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const predictions = await (program.account as any).prediction.all([
    { memcmp: { offset: 8, bytes: pollaPubkey.toBase58() } },
  ]);
  console.log(`  predictions found: ${predictions.length}`);
  if (predictions.length !== polla.numParticipants) {
    console.error(
      `✗ Mismatch: polla.numParticipants=${polla.numParticipants} but found ${predictions.length} on-chain.`,
    );
    process.exit(1);
  }

  // Treasury ATA for the polla's USDC mint
  const treasuryAta = getAssociatedTokenAddressSync(
    polla.usdcMint,
    polla.creator, // deployer is also treasury
  );

  console.log('Sending settle_polla...');
  const sig = await program.methods
    .settlePolla()
    .accounts({
      platform: platformPda,
      polla: pollaPubkey,
      pollaVault: polla.vault,
      treasuryUsdcAta: treasuryAta,
      caller: deployer.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts([
      ...matchPdas.map((pubkey) => ({
        pubkey,
        isWritable: false,
        isSigner: false,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...predictions.map((p: any) => ({
        pubkey: p.publicKey,
        isWritable: true,
        isSigner: false,
      })),
    ])
    .rpc();
  console.log(`✓ Settled. Tx: ${sig}`);
  console.log(`  https://explorer.solana.com/tx/${sig}?cluster=devnet`);

  // Print final ranks
  console.log('');
  console.log('━━━ Final Ranks ━━━');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const refreshed = await (program.account as any).prediction.all([
    { memcmp: { offset: 8, bytes: pollaPubkey.toBase58() } },
  ]);
  const sorted = refreshed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => ({
      predictor: p.account.predictor.toBase58(),
      points: p.account.points,
      finalRank: p.account.finalRank,
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => a.finalRank - b.finalRank);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of sorted) {
    const rank = r.finalRank === 0xff ? '—' : `#${r.finalRank + 1}`;
    console.log(`  ${rank.padEnd(4)} ${r.points.toString().padStart(3)} pts  ${r.predictor}`);
  }
}

main().catch((e) => {
  console.error('✗ Failed:', e instanceof Error ? e.message : e);
  if (e instanceof Error && e.stack) console.error(e.stack);
  process.exit(1);
});
