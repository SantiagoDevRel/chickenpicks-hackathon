'use client';

import { AnchorProvider, Program, type Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import idl from '@chickenpicks/anchor-client/idl' with { type: 'json' };
import { PROGRAM_ID, SOLANA_RPC_URL } from '@chickenpicks/shared';

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

// PDA helpers
export function platformPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('platform')],
    programId,
  );
}
