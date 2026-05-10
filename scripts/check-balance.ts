import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const USER = '9o8JhoSME1fFt5X5Jj9cYDSuY2SXiTBbASDf9SP545wK';
const TEST_MINT = 'sWjZfTkMM2zbNBx1YwgYGmsXfZpA1yo5HkhSqB9AUXC';
const CIRCLE_DEVNET_MINT = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr';
const POLLA = 'F4ZzGuCtsumTMBcn5bFuFA5LkfX4bAdUvxShTcAh9Q2z';

const conn = new Connection('https://api.devnet.solana.com', 'confirmed');

async function readMint(label: string, mint: string) {
  try {
    const ata = getAssociatedTokenAddressSync(new PublicKey(mint), new PublicKey(USER));
    const acc = await getAccount(conn, ata);
    console.log(`  ${label.padEnd(20)} ata=${ata.toBase58()}`);
    console.log(`  ${' '.padEnd(20)} amount=${Number(acc.amount) / 1e6} (raw ${acc.amount})`);
  } catch (e) {
    console.log(`  ${label.padEnd(20)} ATA not found / not initialized`);
  }
}

(async () => {
  console.log(`User wallet: ${USER}`);
  const sol = await conn.getBalance(new PublicKey(USER));
  console.log(`SOL: ${sol / 1e9}`);
  console.log('');
  console.log('USDC balances by mint:');
  await readMint('TEST mint (sWjZ…)', TEST_MINT);
  await readMint('Circle devnet', CIRCLE_DEVNET_MINT);

  console.log('');
  console.log(`Polla ${POLLA} usdc_mint:`);
  const idl = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'packages/anchor-client/src/idl.json'), 'utf8'),
  );
  const provider = new AnchorProvider(conn, new Wallet(Keypair.generate()), {
    commitment: 'confirmed',
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = new Program(idl as any, provider);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polla = await (program.account as any).polla.fetch(new PublicKey(POLLA));
  console.log(`  ${polla.usdcMint.toBase58()}`);
})().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
