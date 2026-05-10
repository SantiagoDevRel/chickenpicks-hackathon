// Show matches list + every prediction account for a given polla.
// Used to plan rigged demo: we need to know what the user predicted so
// set_match_result can be called with the same scores → user wins.
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const POLLA = process.argv[2];
if (!POLLA) {
  console.error('Usage: pnpm tsx scripts/inspect-polla.ts <polla_pubkey>');
  process.exit(1);
}

const idl = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'packages/anchor-client/src/idl.json'), 'utf8'),
);
const programId = new PublicKey(idl.address);
const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
const wallet = new Wallet(Keypair.generate());
const provider = new AnchorProvider(conn, wallet, { commitment: 'confirmed' });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const program = new Program(idl as any, provider);

function decode(bytes: number[]): string {
  const arr = Uint8Array.from(bytes);
  let end = arr.length;
  while (end > 0 && arr[end - 1] === 0) end--;
  return new TextDecoder().decode(arr.subarray(0, end));
}

(async () => {
  const pollaPk = new PublicKey(POLLA);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polla = await (program.account as any).polla.fetch(pollaPk);
  console.log(`Polla ${POLLA}`);
  console.log(`  name="${decode(polla.name)}" tournament="${decode(polla.tournament)}"`);
  console.log(`  num_matches=${polla.numMatches} num_participants=${polla.numParticipants} status=${Object.keys(polla.status)[0]}`);
  console.log(`  creator=${polla.creator.toBase58()}`);
  console.log('');

  // Match accounts
  console.log('=== MATCHES ===');
  for (let i = 0; i < polla.numMatches; i++) {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('match'), pollaPk.toBuffer(), Buffer.from([i])],
      programId,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = await (program.account as any).match.fetch(pda);
    const home = decode(m.homeTeam);
    const away = decode(m.awayTeam);
    const result =
      m.homeScore >= 0
        ? `${m.homeScore}-${m.awayScore}${m.settled ? ' [SETTLED]' : ''}`
        : 'pending';
    console.log(`  ${i.toString().padStart(2)}. ${home.padEnd(16)} vs ${away.padEnd(16)} → ${result}`);
  }

  // Prediction accounts
  console.log('');
  console.log('=== PREDICTIONS ===');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allPreds = await (program.account as any).prediction.all([
    { memcmp: { offset: 8, bytes: pollaPk.toBase58() } },
  ]);
  for (const { publicKey, account } of allPreds) {
    const userPicks = account.scores
      .slice(0, polla.numMatches)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((s: any) => `${s.home}-${s.away}`)
      .join(' | ');
    console.log(`  pred=${publicKey.toBase58()}`);
    console.log(`    predictor=${account.predictor.toBase58()}`);
    console.log(`    points=${account.points} rank=${account.finalRank} claimed=${account.claimed}`);
    console.log(`    picks=${userPicks}`);
  }
})().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
