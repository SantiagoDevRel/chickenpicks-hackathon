// scripts/seed-many-users.ts — fund 5 fake users + have each join + predict on
// every OPEN polla (so the demo pots look full when the real user opens
// /pollas).
//
// Usage:
//   pnpm tsx scripts/seed-many-users.ts                # add 5 to every OPEN polla
//   pnpm tsx scripts/seed-many-users.ts <pollaPubkey>  # only that polla
//
// Idempotent-ish: if a fake user already has a Prediction PDA for the polla
// (i.e. already joined in a previous run), we skip them. Each fake user is
// derived deterministically from the polla pubkey + index so re-runs land on
// the same wallets.

import { AnchorProvider, BN, Program, Wallet } from '@coral-xyz/anchor';
import {
  getAssociatedTokenAddressSync,
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
import { createHash } from 'node:crypto';
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
const IDL_PATH = path.join(repoRoot, 'packages', 'anchor-client', 'src', 'idl.json');

const FAKE_USERS_PER_POLLA = 5;
const SOL_PER_FAKE = 0.05;          // enough for prediction tx + tiny rent
const USDC_PER_FAKE = 5_000_000n;   // 5 USDC base units (covers entry x5)

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

function loadKeypair(p: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, 'utf8'))));
}

/** Deterministic Keypair seed = SHA256("chickenpicks-fake-v1" + pollaPubkey + idx). */
function deriveFakeKeypair(pollaPubkey: string, idx: number): Keypair {
  const seed = createHash('sha256')
    .update(`chickenpicks-fake-v1:${pollaPubkey}:${idx}`)
    .digest();
  return Keypair.fromSeed(seed.subarray(0, 32));
}

/** Pick varied scores per fake user so each gets a different point total
 *  once results are posted — makes the leaderboard interesting. The actual
 *  user (real wallet) picks separately and tends to nail more games, so
 *  these are intentionally "wrong-ish" picks. */
function pickScoresFor(idx: number, numMatches: number): { home: number; away: number }[] {
  // Five flavors of varied predictions; each fake user uses one.
  const FLAVORS = [
    [{ home: 3, away: 0 }, { home: 0, away: 0 }, { home: 1, away: 1 }],   // home-blowout fan
    [{ home: 1, away: 2 }, { home: 2, away: 1 }, { home: 0, away: 1 }],   // away-leaning
    [{ home: 0, away: 0 }, { home: 1, away: 0 }, { home: 2, away: 0 }],   // low-scorer
    [{ home: 4, away: 3 }, { home: 3, away: 3 }, { home: 1, away: 2 }],   // high-scorer
    [{ home: 2, away: 2 }, { home: 1, away: 1 }, { home: 0, away: 0 }],   // draws everywhere
  ];
  const flavor = FLAVORS[idx % FLAVORS.length]!;
  // Pad to numMatches (extra slots are -1 = unset, on-chain).
  const out: { home: number; away: number }[] = [];
  for (let i = 0; i < numMatches; i++) {
    out.push(flavor[i] ?? { home: -1, away: -1 });
  }
  // Pad to MAX_MATCHES (on-chain layout, currently 256). Pulled from a
  // local constant to avoid coupling this script to the workspace shared lib.
  const SCRIPT_MAX_MATCHES = 256;
  while (out.length < SCRIPT_MAX_MATCHES) out.push({ home: -1, away: -1 });
  return out;
}

async function fundFakeUser(
  conn: Connection,
  deployer: Keypair,
  mint: PublicKey,
  fake: Keypair,
): Promise<void> {
  const balance = await conn.getBalance(fake.publicKey);
  if (balance < SOL_PER_FAKE * LAMPORTS_PER_SOL * 0.6) {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: deployer.publicKey,
        toPubkey: fake.publicKey,
        lamports: Math.floor(SOL_PER_FAKE * LAMPORTS_PER_SOL),
      }),
    );
    await sendAndConfirmTransaction(conn, tx, [deployer]);
  }
  const ata = await getOrCreateAssociatedTokenAccount(
    conn,
    deployer,
    mint,
    fake.publicKey,
  );
  if (ata.amount < USDC_PER_FAKE / 2n) {
    await mintTo(conn, deployer, mint, ata.address, deployer, USDC_PER_FAKE);
  }
}

async function joinAndPredict(
  conn: Connection,
  programId: PublicKey,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pollaIdl: any,
  mint: PublicKey,
  pollaPubkey: PublicKey,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pollaAccount: any,
  fake: Keypair,
  idx: number,
): Promise<{ joined: boolean; predicted: boolean }> {
  const fakeWallet = new Wallet(fake);
  const provider = new AnchorProvider(conn, fakeWallet, { commitment: 'confirmed' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = new Program(pollaIdl as any, provider);

  const [predictionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('prediction'), pollaPubkey.toBuffer(), fake.publicKey.toBuffer()],
    programId,
  );

  const predExisting = await conn.getAccountInfo(predictionPda);
  let joined = false;
  if (!predExisting) {
    const fakeAta = getAssociatedTokenAddressSync(mint, fake.publicKey);
    const pollaVault = getAssociatedTokenAddressSync(mint, pollaPubkey, true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program.methods as any)
        .joinPolla()
        .accounts({
          polla: pollaPubkey,
          pollaVault,
          participantUsdcAta: fakeAta,
          prediction: predictionPda,
          participant: fake.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      joined = true;
    } catch (e) {
      console.log(`    ⚠ join_polla failed for fake#${idx}: ${(e as Error).message.split('\n')[0]}`);
      return { joined: false, predicted: false };
    }
  }

  // Submit prediction
  const scores = pickScoresFor(idx, pollaAccount.numMatches);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .submitPrediction(scores)
      .accounts({
        polla: pollaPubkey,
        prediction: predictionPda,
        predictor: fake.publicKey,
      })
      .rpc();
    return { joined, predicted: true };
  } catch (e) {
    console.log(`    ⚠ submit_prediction failed for fake#${idx}: ${(e as Error).message.split('\n')[0]}`);
    return { joined, predicted: false };
  }
}

async function main() {
  const explicitPolla = process.argv[2];

  const deployer = loadKeypair(DEPLOYER_PATH);
  const mintKeypair = loadKeypair(MINT_PATH);
  const idl = JSON.parse(fs.readFileSync(IDL_PATH, 'utf8'));
  const programId = new PublicKey(idl.address);
  const conn = new Connection(RPC, 'confirmed');

  const deployerWallet = new Wallet(deployer);
  const provider = new AnchorProvider(conn, deployerWallet, { commitment: 'confirmed' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminProgram = new Program(idl as any, provider);

  // Pull list of pollas to seed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allPollas = await (adminProgram.account as any).polla.all();
  const targets: { pubkey: PublicKey; account: { numMatches: number; status: { open?: object } } }[] = [];
  for (const { publicKey, account } of allPollas) {
    if (explicitPolla && publicKey.toBase58() !== explicitPolla) continue;
    if (!('open' in account.status)) {
      console.log(`Skip ${publicKey.toBase58()} — not OPEN (${Object.keys(account.status).join('|')})`);
      continue;
    }
    if (account.usdcMint.toBase58() !== mintKeypair.publicKey.toBase58()) {
      console.log(`Skip ${publicKey.toBase58()} — wrong mint`);
      continue;
    }
    targets.push({ pubkey: publicKey, account });
  }

  if (targets.length === 0) {
    console.log('No matching OPEN pollas to seed.');
    return;
  }

  console.log(`Seeding ${FAKE_USERS_PER_POLLA} fake users into ${targets.length} polla(s)...`);
  console.log('');

  for (const { pubkey, account } of targets) {
    console.log(`▸ Polla ${pubkey.toBase58()}  (${account.numMatches} matches)`);
    for (let i = 0; i < FAKE_USERS_PER_POLLA; i++) {
      const fake = deriveFakeKeypair(pubkey.toBase58(), i);
      console.log(`  fake#${i} ${fake.publicKey.toBase58()}`);
      await fundFakeUser(conn, deployer, mintKeypair.publicKey, fake);
      const r = await joinAndPredict(conn, programId, idl, mintKeypair.publicKey, pubkey, account, fake, i);
      console.log(`    join=${r.joined ? '✓' : '−'} predict=${r.predicted ? '✓' : '−'}`);
    }
    console.log('');
  }

  console.log('✓ Done. Refresh /pollas to see the populated pots.');
}

main().catch((e) => {
  console.error('✗ Failed:', e instanceof Error ? e.message : e);
  if (e instanceof Error && e.stack) console.error(e.stack);
  process.exit(1);
});
