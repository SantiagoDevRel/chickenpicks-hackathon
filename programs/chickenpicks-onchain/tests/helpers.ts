import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from '@solana/spl-token';

// PDA seeds — duplicated here intentionally so tests don't depend on the
// JS workspace shared package being built first.
export const PLATFORM_SEED = Buffer.from('platform');
export const POLLA_SEED = Buffer.from('polla');
export const MATCH_SEED = Buffer.from('match');
export const PREDICTION_SEED = Buffer.from('prediction');

export function nameSeed(name: string): Buffer {
  const bytes = Buffer.from(name, 'utf8');
  if (bytes.length > 32) throw new Error('polla name exceeds 32 bytes');
  const out = Buffer.alloc(32);
  bytes.copy(out, 0);
  return out;
}

export function tournamentSeed(name: string): number[] {
  const bytes = Buffer.from(name, 'utf8');
  if (bytes.length > 32) throw new Error('tournament exceeds 32 bytes');
  const out = Buffer.alloc(32);
  bytes.copy(out, 0);
  return Array.from(out);
}

export function teamBytes(team: string): number[] {
  const bytes = Buffer.from(team, 'utf8');
  if (bytes.length > 16) throw new Error(`team "${team}" exceeds 16 bytes`);
  const out = Buffer.alloc(16);
  bytes.copy(out, 0);
  return Array.from(out);
}

export async function airdrop(
  connection: anchor.web3.Connection,
  pubkey: PublicKey,
  sol: number,
): Promise<void> {
  const sig = await connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, 'confirmed');
}

export async function setupTestUsdcMint(
  connection: anchor.web3.Connection,
  payer: Keypair,
): Promise<PublicKey> {
  return await createMint(
    connection,
    payer,
    payer.publicKey,
    null,
    6, // USDC decimals
  );
}

export async function fundUserWithUsdc(
  connection: anchor.web3.Connection,
  payer: Keypair,        // mint authority
  user: Keypair,
  usdcMint: PublicKey,
  amount: bigint,
): Promise<PublicKey> {
  await airdrop(connection, user.publicKey, 2);
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    usdcMint,
    user.publicKey,
  );
  await mintTo(connection, payer, usdcMint, ata.address, payer, amount);
  return ata.address;
}

export async function getTokenBalance(
  connection: anchor.web3.Connection,
  ata: PublicKey,
): Promise<bigint> {
  const acc = await getAccount(connection, ata);
  return acc.amount;
}

export function platformPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([PLATFORM_SEED], programId);
}

export function pollaPda(programId: PublicKey, creator: PublicKey, name: Buffer): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POLLA_SEED, creator.toBuffer(), name],
    programId,
  );
}

export function matchPda(programId: PublicKey, polla: PublicKey, matchIndex: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [MATCH_SEED, polla.toBuffer(), Buffer.from([matchIndex])],
    programId,
  );
}

export function predictionPda(programId: PublicKey, polla: PublicKey, predictor: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PREDICTION_SEED, polla.toBuffer(), predictor.toBuffer()],
    programId,
  );
}

export const TOKEN_PROGRAM = TOKEN_PROGRAM_ID;
export const ATA_PROGRAM = ASSOCIATED_TOKEN_PROGRAM_ID;
export const SYSTEM_PROGRAM = SystemProgram.programId;
