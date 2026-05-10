// scripts/rig-demo.ts — orchestrates a "user wins" demo flow on a single polla.
// Steps:
//   1. Seed N fake users into the polla (each joins + predicts varied scores).
//   2. As the platform authority, call set_match_result for every match using
//      the REAL user's exact predictions → user maxes out points.
//   3. Settle the polla (permissionless caller, so we sign as the deployer).
//   4. Print the final ranking so you can sanity-check before recording.
//
// NOTE: this assumes the real user (creator) already submitted predictions.
// We read their prediction account first and rig set_match_result to it.
//
// Usage:
//   pnpm tsx scripts/rig-demo.ts <polla_pubkey> [--users N]
//   default N = 20

import { AnchorProvider, BN, Program, Wallet } from '@coral-xyz/anchor';
import {
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const POLLA_PUBKEY = process.argv[2];
if (!POLLA_PUBKEY) {
  console.error('Usage: pnpm tsx scripts/rig-demo.ts <polla_pubkey> [--users N]');
  process.exit(1);
}
const usersArgIdx = process.argv.indexOf('--users');
const N_FAKES = usersArgIdx !== -1 ? Number(process.argv[usersArgIdx + 1]) : 20;

const RPC = 'https://api.devnet.solana.com';
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const DEPLOYER = path.join(repoRoot, 'keys', 'deployer.json');
const MINT = path.join(repoRoot, 'keys', 'test-mint.json');
const IDL = path.join(repoRoot, 'packages', 'anchor-client', 'src', 'idl.json');

function load(p: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, 'utf8'))));
}

function fakeKeypair(pollaB58: string, idx: number): Keypair {
  const seed = createHash('sha256')
    .update(`chickenpicks-fake-v1:${pollaB58}:${idx}`)
    .digest();
  return Keypair.fromSeed(seed.subarray(0, 32));
}

const FLAVORS = [
  [
    { home: 3, away: 0 },
    { home: 0, away: 0 },
    { home: 1, away: 1 },
  ],
  [
    { home: 1, away: 2 },
    { home: 2, away: 1 },
    { home: 0, away: 1 },
  ],
  [
    { home: 0, away: 0 },
    { home: 1, away: 0 },
    { home: 2, away: 0 },
  ],
  [
    { home: 4, away: 3 },
    { home: 3, away: 3 },
    { home: 1, away: 2 },
  ],
  [
    { home: 2, away: 2 },
    { home: 1, away: 1 },
    { home: 0, away: 0 },
  ],
];

function pickScores(idx: number, numMatches: number) {
  const flavor = FLAVORS[idx % FLAVORS.length]!;
  const out: { home: number; away: number }[] = [];
  for (let i = 0; i < numMatches; i++) {
    out.push(flavor[i] ?? { home: -1, away: -1 });
  }
  while (out.length < 256) out.push({ home: -1, away: -1 });
  return out;
}

(async () => {
  const conn = new Connection(RPC, 'confirmed');
  const deployer = load(DEPLOYER);
  const mintKp = load(MINT);
  const idl = JSON.parse(fs.readFileSync(IDL, 'utf8'));
  const programId = new PublicKey(idl.address);
  const pollaPk = new PublicKey(POLLA_PUBKEY);

  const deployerProvider = new AnchorProvider(conn, new Wallet(deployer), {
    commitment: 'confirmed',
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminProgram = new Program(idl as any, deployerProvider);

  // -------- Step 0: read polla + matches + REAL user prediction --------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polla = await (adminProgram.account as any).polla.fetch(pollaPk);
  console.log(`▸ Polla: ${POLLA_PUBKEY}`);
  console.log(`  num_matches=${polla.numMatches} status=${Object.keys(polla.status)[0]}`);
  console.log(`  creator (real user)=${polla.creator.toBase58()}`);
  console.log(`  prize_distribution=[${polla.prizeDistribution.slice(0, 3).join(', ')}, ...]`);
  console.log('');

  const realUserPk = polla.creator;
  const [realPredPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('prediction'), pollaPk.toBuffer(), realUserPk.toBuffer()],
    programId,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const realPred = await (adminProgram.account as any).prediction
    .fetchNullable(realPredPda);
  if (!realPred) {
    console.error('✗ Real user has not submitted a prediction yet — submit first.');
    process.exit(1);
  }
  console.log(
    `  user picks: ${realPred.scores
      .slice(0, polla.numMatches)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((s: any) => `${s.home}-${s.away}`)
      .join(' | ')}`,
  );
  console.log('');

  // -------- Step 1: seed N fake users --------
  console.log(`=== Seeding ${N_FAKES} fake users ===`);
  const vault = getAssociatedTokenAddressSync(mintKp.publicKey, pollaPk, true);
  for (let i = 0; i < N_FAKES; i++) {
    const fake = fakeKeypair(POLLA_PUBKEY, i);
    const [predPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('prediction'), pollaPk.toBuffer(), fake.publicKey.toBuffer()],
      programId,
    );
    const existing = await conn.getAccountInfo(predPda);
    if (existing) {
      console.log(`  fake#${i} already joined — skip`);
      continue;
    }

    // Fund SOL + USDC
    const bal = await conn.getBalance(fake.publicKey);
    if (bal < 0.05 * LAMPORTS_PER_SOL) {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: deployer.publicKey,
          toPubkey: fake.publicKey,
          lamports: Math.floor(0.05 * LAMPORTS_PER_SOL),
        }),
      );
      await sendAndConfirmTransaction(conn, tx, [deployer]);
    }
    const ata = await getOrCreateAssociatedTokenAccount(
      conn,
      deployer,
      mintKp.publicKey,
      fake.publicKey,
    );
    if (ata.amount < BigInt(2_000_000)) {
      await mintTo(conn, deployer, mintKp.publicKey, ata.address, deployer, 5_000_000);
    }

    // Join + predict via fake's wallet
    const fakeProvider = new AnchorProvider(conn, new Wallet(fake), {
      commitment: 'confirmed',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeProg = new Program(idl as any, fakeProvider);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (fakeProg.methods as any)
        .joinPolla()
        .accounts({
          polla: pollaPk,
          pollaVault: vault,
          participantUsdcAta: ata.address,
          prediction: predPda,
          participant: fake.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (fakeProg.methods as any)
        .submitPrediction(pickScores(i, polla.numMatches))
        .accounts({
          polla: pollaPk,
          prediction: predPda,
          predictor: fake.publicKey,
        })
        .rpc();
      console.log(`  fake#${i} ${fake.publicKey.toBase58().slice(0, 6)}… ✓`);
    } catch (e) {
      console.log(`  fake#${i} ✗ ${(e as Error).message.split('\n')[0]}`);
    }
  }
  console.log('');

  // -------- Step 2: set_match_result for every match = REAL user's pick --------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const refreshed = await (adminProgram.account as any).polla.fetch(pollaPk);
  console.log(`=== Setting results ===`);
  console.log(`  num_participants now: ${refreshed.numParticipants}`);
  const [platformPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform')],
    programId,
  );
  for (let i = 0; i < refreshed.numMatches; i++) {
    const [matchAcc] = PublicKey.findProgramAddressSync(
      [Buffer.from('match'), pollaPk.toBuffer(), Buffer.from([i])],
      programId,
    );
    const userScore = realPred.scores[i];
    const home = userScore.home;
    const away = userScore.away;
    if (home < 0 || away < 0) {
      console.log(`  match#${i} user did not predict — skipping (will leave as pending)`);
      continue;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sig = await (adminProgram.methods as any)
        .setMatchResult(i, home, away)
        .accounts({
          platform: platformPda,
          polla: pollaPk,
          matchAccount: matchAcc,
          authority: deployer.publicKey,
        })
        .rpc();
      console.log(`  match#${i} → ${home}-${away}  sig=${sig.slice(0, 10)}…`);
    } catch (e) {
      console.log(`  match#${i} ✗ ${(e as Error).message.split('\n')[0]}`);
    }
  }
  console.log('');

  // -------- Step 3: settle_polla --------
  console.log('=== Settling polla ===');
  const matchPdas: PublicKey[] = [];
  for (let i = 0; i < refreshed.numMatches; i++) {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('match'), pollaPk.toBuffer(), Buffer.from([i])],
      programId,
    );
    matchPdas.push(pda);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allPreds = await (adminProgram.account as any).prediction.all([
    { memcmp: { offset: 8, bytes: pollaPk.toBase58() } },
  ]);
  const predPubkeys: PublicKey[] = allPreds.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => p.publicKey,
  );
  const treasuryAta = (
    await getOrCreateAssociatedTokenAccount(
      conn,
      deployer,
      mintKp.publicKey,
      deployer.publicKey,
    )
  ).address;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sig = await (adminProgram.methods as any)
      .settlePolla()
      .accounts({
        platform: platformPda,
        polla: pollaPk,
        pollaVault: vault,
        treasuryUsdcAta: treasuryAta,
        caller: deployer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts([
        ...matchPdas.map((pk) => ({ pubkey: pk, isWritable: false, isSigner: false })),
        ...predPubkeys.map((pk) => ({ pubkey: pk, isWritable: true, isSigner: false })),
      ])
      // settle_polla scores N predictions × M matches + sorts. With 21
      // participants the default 200k CUs blows up. Max single-tx CU is
      // 1.4M which is plenty.
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
      ])
      .rpc();
    console.log(`  ✓ settled  sig=${sig.slice(0, 10)}…`);
  } catch (e) {
    console.log(`  ✗ settle failed: ${(e as Error).message}`);
    process.exit(1);
  }

  // -------- Step 4: print final ranking --------
  console.log('');
  console.log('=== Final ranking ===');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const final = await (adminProgram.account as any).prediction.all([
    { memcmp: { offset: 8, bytes: pollaPk.toBase58() } },
  ]);
  final.sort(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any, b: any) => a.account.finalRank - b.account.finalRank,
  );
  for (const { publicKey, account } of final) {
    const isReal = account.predictor.toBase58() === realUserPk.toBase58();
    console.log(
      `  rank=${account.finalRank.toString().padStart(3)} pts=${account.points
        .toString()
        .padStart(2)}  ${account.predictor.toBase58().slice(0, 8)}…  ${
        isReal ? '← YOU (claim from UI)' : ''
      }  ${publicKey.toBase58().slice(0, 8)}…`,
    );
  }
  console.log('');
  console.log('Open the polla page on the website and tap CLAIM PRIZE.');
})().catch((e) => {
  console.error('✗ Failed:', e instanceof Error ? e.message : e);
  if (e instanceof Error && e.stack) console.error(e.stack);
  process.exit(1);
});
