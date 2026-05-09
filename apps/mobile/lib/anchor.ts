// RN-side mirror of apps/web/lib/anchor.ts. Same surface so screen logic
// stays portable: getConnection(), getProgram(wallet), platformPda(), etc.
//
// Key difference from web: there's no `with { type: 'json' }` import on
// RN/Metro; we require() the IDL the old-fashioned way. Also, `wallet`
// here is whatever shape we adapt to in lib/privyAdapter.ts (Privy
// embedded) or lib/mwaAdapter.ts (Mobile Wallet Adapter fallback).
import { AnchorProvider, Program, type Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, SOLANA_RPC_URL } from './constants';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const idl = require('./idl.json');

export function getConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, 'confirmed');
}

export const programId = new PublicKey(PROGRAM_ID);

export type Wallet = AnchorProvider['wallet'];

export function getProgram(wallet: Wallet): Program {
  const provider = new AnchorProvider(getConnection(), wallet, {
    commitment: 'confirmed',
  });
  return new Program(idl as Idl, provider);
}

// Read-only wallet stub — used when fetching accounts without signing.
// Mirrors the READ_ONLY_WALLET pattern in apps/web.
export const READ_ONLY_WALLET: Wallet = {
  publicKey: PublicKey.default,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signTransaction: async (_tx: any) => {
    throw new Error('read-only wallet');
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signAllTransactions: async (_txs: any[]) => {
    throw new Error('read-only wallet');
  },
};

export function getReadOnlyProgram(): Program {
  return getProgram(READ_ONLY_WALLET);
}

// ── PDA helpers ──────────────────────────────────────────────────────────

export function platformPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('platform')],
    programId,
  );
}

export function predictionPda(
  polla: PublicKey,
  predictor: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('prediction'), polla.toBuffer(), predictor.toBuffer()],
    programId,
  );
}

export function matchPda(polla: PublicKey, matchIndex: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      new TextEncoder().encode('match'),
      polla.toBuffer(),
      Uint8Array.from([matchIndex]),
    ],
    programId,
  );
}

// ── Decoders, mirrored from web ──────────────────────────────────────────

export function decodeFixedString(bytes: number[]): string {
  const arr = Uint8Array.from(bytes);
  let end = arr.length;
  while (end > 0 && arr[end - 1] === 0) end--;
  return new TextDecoder().decode(arr.subarray(0, end));
}
