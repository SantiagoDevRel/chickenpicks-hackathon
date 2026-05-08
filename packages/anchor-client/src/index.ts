import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import {
  PLATFORM_SEED,
  POLLA_SEED,
  MATCH_SEED,
  PREDICTION_SEED,
  PROGRAM_ID,
} from '@chickenpicks/shared';

import idl from './idl.json' with { type: 'json' };

export { idl };
export const programId = new PublicKey(PROGRAM_ID);

// ─── PDA derivers ────────────────────────────────────────────────────────────

export function platformPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([PLATFORM_SEED], programId);
}

export function pollaPda(creator: PublicKey, name: Uint8Array): [PublicKey, number] {
  if (name.length !== 32) {
    throw new Error('polla name seed must be exactly 32 bytes');
  }
  return PublicKey.findProgramAddressSync(
    [POLLA_SEED, creator.toBuffer(), name],
    programId,
  );
}

export function matchPda(polla: PublicKey, matchIndex: number): [PublicKey, number] {
  if (matchIndex < 0 || matchIndex > 255) {
    throw new Error('match_index must fit in u8');
  }
  return PublicKey.findProgramAddressSync(
    [MATCH_SEED, polla.toBuffer(), Uint8Array.from([matchIndex])],
    programId,
  );
}

export function predictionPda(polla: PublicKey, predictor: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PREDICTION_SEED, polla.toBuffer(), predictor.toBuffer()],
    programId,
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert a UTF-8 polla name to the 32-byte zero-padded seed array. */
export function nameToSeed(name: string): Uint8Array {
  const bytes = new TextEncoder().encode(name);
  if (bytes.length > 32) {
    throw new Error(`polla name "${name}" exceeds 32 bytes after utf-8 encoding`);
  }
  const out = new Uint8Array(32);
  out.set(bytes, 0);
  return out;
}

/** Decode a 32-byte zero-padded seed back to a string (trims trailing nulls). */
export function seedToName(seed: Uint8Array | number[]): string {
  const arr = seed instanceof Uint8Array ? seed : Uint8Array.from(seed);
  let end = arr.length;
  while (end > 0 && arr[end - 1] === 0) end--;
  return new TextDecoder().decode(arr.subarray(0, end));
}

// ─── Program builder ─────────────────────────────────────────────────────────

/**
 * Construct an Anchor `Program` instance against the deployed IDL.
 * Once `anchor build` produces the real IDL, this stops being a stub.
 */
export function getProgram(connection: Connection, wallet: AnchorProvider['wallet']): Program {
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Program(idl as any, provider);
}

export { BN, AnchorProvider, Connection, PublicKey, Keypair };
