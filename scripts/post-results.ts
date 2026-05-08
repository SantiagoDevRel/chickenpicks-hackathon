// scripts/post-results.ts — Admin posts fake match results for the demo polla.
//
// Calls set_match_result(match_index, home_score, away_score) for each match
// in MATCH_RESULTS. Idempotent: skips matches that are already settled.
//
// Usage: pnpm post:results [polla_pubkey]
//   defaults to the seeded polla derived from POLLA_NAME + deployer.

import { AnchorProvider, Program, Wallet, type Idl } from '@coral-xyz/anchor';
import {
  Connection,
  Keypair,
  PublicKey,
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
const IDL_PATH = path.join(
  repoRoot,
  'packages',
  'anchor-client',
  'src',
  'idl.json',
);

const POLLA_NAME = 'WC2026 Test Group';

// Match results — same scores the demo user predicted, so they get 15 pts (5×3 exact).
const MATCH_RESULTS = [
  { idx: 0, home: 2, away: 1 }, // Argentina 2 - 1 Brazil
  { idx: 1, home: 1, away: 1 }, // Spain    1 - 1 France
  { idx: 2, home: 0, away: 2 }, // Germany  0 - 2 Italy
];

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

  // Resolve polla pubkey from CLI arg or derive from seed naming.
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

  for (const r of MATCH_RESULTS) {
    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('match'), pollaPubkey.toBuffer(), Buffer.from([r.idx])],
      program.programId,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = await (program.account as any).match.fetch(matchPda).catch(() => null);
    if (!m) {
      console.error(`✗ Match #${r.idx} not found at ${matchPda.toBase58()}.`);
      continue;
    }
    if (m.settled) {
      console.log(
        `✓ Match #${r.idx} already settled (${m.homeScore}-${m.awayScore}) — skipping.`,
      );
      continue;
    }

    console.log(`Posting match #${r.idx}: ${r.home} - ${r.away}...`);
    const sig = await program.methods
      .setMatchResult(r.idx, r.home, r.away)
      .accounts({
        platform: platformPda,
        polla: pollaPubkey,
        matchAccount: matchPda,
        authority: deployer.publicKey,
      })
      .rpc();
    console.log(`  ✓ Tx: ${sig}`);
  }

  console.log('');
  console.log('✓ Post complete.');
}

main().catch((e) => {
  console.error('✗ Failed:', e instanceof Error ? e.message : e);
  if (e instanceof Error && e.stack) console.error(e.stack);
  process.exit(1);
});
