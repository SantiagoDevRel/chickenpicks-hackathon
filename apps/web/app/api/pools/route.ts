// GET /api/pools — list all pollas (server-side Anchor fetch).
//
// Why this exists: the mobile app's Hermes JS engine fails on the Anchor
// borsh `decode` path with "undefined is not a function" deep inside
// buffer-layout — even after polyfilling structuredClone, Promise.withResolvers,
// findLast, etc. We can't reproduce on web (V8) so debugging is impractical
// before the demo deadline. Server-side fetch sidesteps the whole decoder
// issue: Node has zero Hermes gaps, and the mobile app just fetches JSON.
//
// Returns the same shape that apps/web's /pollas page uses, so both surfaces
// can share rendering logic if we want to deduplicate later.

import { NextResponse } from 'next/server';
import { AnchorProvider, BN, Program, type Idl } from '@coral-xyz/anchor';
import {
  Connection,
  Keypair,
  PublicKey,
  type Transaction,
  type VersionedTransaction,
} from '@solana/web3.js';
import idl from '@chickenpicks/anchor-client/idl' with { type: 'json' };
import { HIDDEN_POLLAS, SOLANA_RPC_URL, USDC_MINT } from '@chickenpicks/shared';

// Anchor 0.31 stopped re-exporting Wallet from the barrel. Inline the
// minimal wallet interface that AnchorProvider needs (publicKey + sign).
class KeypairWallet {
  constructor(public readonly payer: Keypair) {}
  get publicKey() {
    return this.payer.publicKey;
  }
  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if ('partialSign' in tx) (tx as Transaction).partialSign(this.payer);
    else (tx as VersionedTransaction).sign([this.payer]);
    return tx;
  }
  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return Promise.all(txs.map((t) => this.signTransaction(t)));
  }
}

export const dynamic = 'force-dynamic';

type RawPolla = {
  creator: PublicKey;
  name: number[];
  tournament: number[];
  entryAmount: BN;
  usdcMint: PublicKey;
  vault: PublicKey;
  numMatches: number;
  matchesSettled: number;
  numParticipants: number;
  totalPool: BN;
  status: { open?: object; locked?: object; settled?: object };
  prizeDistribution: number[];
};

function decodeFixedString(bytes: number[]): string {
  const arr = Uint8Array.from(bytes);
  let end = arr.length;
  while (end > 0 && arr[end - 1] === 0) end--;
  return new TextDecoder().decode(arr.subarray(0, end));
}

function statusKey(status: RawPolla['status']): 'OPEN' | 'LOCKED' | 'SETTLED' {
  if ('open' in status) return 'OPEN';
  if ('locked' in status) return 'LOCKED';
  return 'SETTLED';
}

function formatUsdc(raw: BN): string {
  const denom = new BN(10).pow(new BN(6));
  const whole = raw.div(denom).toString();
  const frac = raw.mod(denom).toString().padStart(6, '0').slice(0, 2);
  return `${whole}.${frac}`;
}

export async function GET() {
  try {
    const conn = new Connection(SOLANA_RPC_URL, 'confirmed');
    // Anchor's AnchorProvider needs SOMETHING wallet-shaped. We never sign
    // here (read-only), but the constructor demands a payer.
    const provider = new AnchorProvider(conn, new KeypairWallet(Keypair.generate()), {
      commitment: 'confirmed',
    });
    const program = new Program(idl as Idl, provider);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accs = await (program.account as any).polla.all();

    const configuredMint = new PublicKey(USDC_MINT);
    const filtered = accs.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ publicKey, account }: { publicKey: PublicKey; account: any }) =>
        (account as RawPolla).usdcMint.equals(configuredMint) &&
        !HIDDEN_POLLAS.has(publicKey.toBase58()),
    );

    const pools = filtered.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ publicKey, account }: { publicKey: PublicKey; account: any }) => {
        const raw = account as RawPolla;
        return {
          pubkey: publicKey.toBase58(),
          name: decodeFixedString(raw.name),
          tournament: decodeFixedString(raw.tournament),
          entryUsdc: formatUsdc(raw.entryAmount),
          numMatches: raw.numMatches,
          numParticipants: raw.numParticipants,
          totalPoolUsdc: formatUsdc(raw.totalPool),
          status: statusKey(raw.status),
        };
      },
    );

    pools.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

    return NextResponse.json({ pools });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message, stack: (e as Error).stack?.split('\n').slice(0, 5).join('\n') },
      { status: 500 },
    );
  }
}
