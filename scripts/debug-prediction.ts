import { AnchorProvider, Program, Wallet, type Idl } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
const idl = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'packages/anchor-client/src/idl.json'), 'utf8'),
);
const deployer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(path.join(repoRoot, 'keys/deployer.json'), 'utf8'))),
);
const provider = new AnchorProvider(conn, new Wallet(deployer), { commitment: 'confirmed' });
const program = new Program(idl as Idl, provider);

const pollaPubkey = new PublicKey('EauNHCB3hkH2H65g2tYHPeiBKWAzpHhgec1ZcvjH5fic');
const userPubkey = new PublicKey('HFe4G2dfxFFCxu4ptQVHzPCxN92WnhttXfkg9LvL7nyx');

const [predPda] = PublicKey.findProgramAddressSync(
  [Buffer.from('prediction'), pollaPubkey.toBuffer(), userPubkey.toBuffer()],
  program.programId,
);

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pred = await (program.account as any).prediction.fetch(predPda);
  console.log('Stored predictions (first 3):');
  for (let i = 0; i < 3; i++) {
    console.log(`  Match ${i}: ${pred.scores[i].home} - ${pred.scores[i].away}`);
  }
  console.log('');
  console.log('Match results posted:');
  for (let i = 0; i < 3; i++) {
    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('match'), pollaPubkey.toBuffer(), Buffer.from([i])],
      program.programId,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = await (program.account as any).match.fetch(matchPda);
    console.log(`  Match ${i}: ${m.homeScore} - ${m.awayScore} (settled=${m.settled})`);
  }
  console.log('');
  console.log(`Total points: ${pred.points}`);
  console.log(`Final rank:   ${pred.finalRank}`);
  console.log(`Claimed:      ${pred.claimed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
