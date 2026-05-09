// GET /api/predictions?wallet=<pubkey> — list a user's predictions.
//
// Server-side fetch to bypass Hermes' "undefined is not a function at decode"
// bug in Anchor's borsh decoder on RN. Same rationale as /api/pools.

import { NextResponse, type NextRequest } from 'next/server';
import { AnchorProvider, BN, Program, type Idl } from '@coral-xyz/anchor';
import {
  Connection,
  Keypair,
  PublicKey,
  type Transaction,
  type VersionedTransaction,
} from '@solana/web3.js';
import idl from '@chickenpicks/anchor-client/idl' with { type: 'json' };
import { SOLANA_RPC_URL } from '@chickenpicks/shared';

export const dynamic = 'force-dynamic';

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

function decodeFixedString(bytes: number[]): string {
  const arr = Uint8Array.from(bytes);
  let end = arr.length;
  while (end > 0 && arr[end - 1] === 0) end--;
  return new TextDecoder().decode(arr.subarray(0, end));
}

function statusKey(status: { open?: object; locked?: object; settled?: object }) {
  if ('open' in status) return 'OPEN' as const;
  if ('locked' in status) return 'LOCKED' as const;
  return 'SETTLED' as const;
}

function formatUsdc(raw: BN): string {
  const denom = new BN(10).pow(new BN(6));
  const whole = raw.div(denom).toString();
  const frac = raw.mod(denom).toString().padStart(6, '0').slice(0, 2);
  return `${whole}.${frac}`;
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'Missing ?wallet=<pubkey>' }, { status: 400 });
  }
  let userPubkey: PublicKey;
  try {
    userPubkey = new PublicKey(wallet);
  } catch {
    return NextResponse.json({ error: 'Invalid wallet pubkey' }, { status: 400 });
  }

  try {
    const conn = new Connection(SOLANA_RPC_URL, 'confirmed');
    const provider = new AnchorProvider(conn, new KeypairWallet(Keypair.generate()), {
      commitment: 'confirmed',
    });
    const program = new Program(idl as Idl, provider);

    // Prediction layout: [8 disc][32 polla][32 predictor]… so memcmp at offset 40.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const preds = await (program.account as any).prediction.all([
      { memcmp: { offset: 40, bytes: userPubkey.toBase58() } },
    ]);

    const pollaKeys = Array.from(
      new Set(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        preds.map(({ account }: { account: any }) => account.polla.toBase58()),
      ),
    ) as string[];

    const pollaPdas = pollaKeys.map((k) => new PublicKey(k));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pollas = await (program.account as any).polla.fetchMultiple(pollaPdas);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pollaByKey: Record<string, any> = {};
    pollaPdas.forEach((pk, i) => {
      if (pollas[i]) pollaByKey[pk.toBase58()] = pollas[i];
    });

    const entries = preds.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ account }: { account: any }) => {
        const pk = account.polla.toBase58();
        const polla = pollaByKey[pk];
        return {
          pollaPubkey: pk,
          pollaName: polla ? decodeFixedString(polla.name) : '???',
          tournament: polla ? decodeFixedString(polla.tournament) : '',
          status: polla ? statusKey(polla.status) : ('OPEN' as const),
          points: account.points,
          finalRank: account.finalRank,
          claimed: account.claimed,
          totalPoolUsdc: polla ? formatUsdc(polla.totalPool as BN) : '0.00',
        };
      },
    );

    entries.sort((a: { status: string; claimed: boolean; finalRank: number }, b: typeof a) => {
      const score = (e: typeof a) =>
        e.status === 'SETTLED' && !e.claimed && e.finalRank !== 0xff
          ? 0
          : e.status === 'SETTLED'
            ? 3
            : e.status === 'LOCKED'
              ? 1
              : 2;
      return score(a) - score(b);
    });

    return NextResponse.json({ entries });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message, stack: (e as Error).stack?.split('\n').slice(0, 5).join('\n') },
      { status: 500 },
    );
  }
}
