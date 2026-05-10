import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { Connection, Keypair } from '@solana/web3.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const idl = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'packages/anchor-client/src/idl.json'), 'utf8'),
);
const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
const wallet = new Wallet(Keypair.generate());
const provider = new AnchorProvider(conn, wallet, { commitment: 'confirmed' });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const program = new Program(idl as any, provider);

(async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all = await (program.account as any).polla.all();
  console.log(`Total pollas: ${all.length}`);
  for (const { publicKey, account } of all) {
    const name = Buffer.from(account.name).toString('utf8').replace(/\0+$/g, '');
    const tournament = Buffer.from(account.tournament)
      .toString('utf8')
      .replace(/\0+$/g, '');
    const status = Object.keys(account.status)[0];
    console.log(`  ${publicKey.toBase58()}`);
    console.log(`    name="${name}" tournament="${tournament}"`);
    console.log(`    status=${status} num_matches=${account.numMatches} num_participants=${account.numParticipants}`);
    console.log(`    creator=${account.creator.toBase58()}`);
  }
})().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
