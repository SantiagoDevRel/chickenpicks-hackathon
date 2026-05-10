import { Connection, PublicKey } from '@solana/web3.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const POLLA = process.argv[2];
if (!POLLA) {
  console.error('Usage: pnpm tsx scripts/check-matches.ts <polla_pubkey>');
  process.exit(1);
}

const idl = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'packages/anchor-client/src/idl.json'), 'utf8'),
);
const programId = new PublicKey(idl.address);
const conn = new Connection('https://api.devnet.solana.com', 'confirmed');

const pollaPk = new PublicKey(POLLA);

(async () => {
  const pdas: PublicKey[] = [];
  for (let i = 0; i < 256; i++) {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('match'), pollaPk.toBuffer(), Buffer.from([i])],
      programId,
    );
    pdas.push(pda);
  }
  // getMultipleAccountsInfo can take 100 max per call.
  const chunks: PublicKey[][] = [];
  for (let i = 0; i < pdas.length; i += 100) {
    chunks.push(pdas.slice(i, i + 100));
  }
  let exists = 0;
  let firstMissing = -1;
  for (const chunk of chunks) {
    const info = await conn.getMultipleAccountsInfo(chunk);
    info.forEach((acc, j) => {
      const idx = exists + j;
      if (acc !== null) exists++;
      else if (firstMissing === -1) firstMissing = chunks.indexOf(chunk) * 100 + j;
    });
  }
  console.log(`Polla ${POLLA}`);
  console.log(`Match accounts found: ${exists}/256 (sentinel scan)`);
  if (firstMissing !== -1) console.log(`First missing index: ${firstMissing}`);
})().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
