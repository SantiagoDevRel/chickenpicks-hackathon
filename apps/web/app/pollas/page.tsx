'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnchorProvider, BN, Program } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import idl from '@chickenpicks/anchor-client/idl' with { type: 'json' };
import {
  PROGRAM_ID,
  SOLANA_RPC_URL,
  USDC_DECIMALS,
  USDC_MINT,
} from '@chickenpicks/shared';
import { BrandHeader } from '@/components/BrandHeader';

type RawPolla = {
  creator: PublicKey;
  name: number[];
  tournament: number[];
  entryAmount: BN;
  usdcMint: PublicKey;
  numMatches: number;
  matchesSettled: number;
  numParticipants: number;
  totalPool: BN;
  status: { open?: object; locked?: object; settled?: object };
  prizeDistribution: number[];
};

type PollaCard = {
  pubkey: string;
  creator: string;
  name: string;
  tournament: string;
  entryUsdc: string;
  numMatches: number;
  numParticipants: number;
  totalPoolUsdc: string;
  status: 'OPEN' | 'LOCKED' | 'SETTLED';
};

function decodeName(bytes: number[]): string {
  // 32-byte zero-padded utf-8
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
  const denom = new BN(10).pow(new BN(USDC_DECIMALS));
  const whole = raw.div(denom).toString();
  const frac = raw.mod(denom).toString().padStart(USDC_DECIMALS, '0').slice(0, 2);
  return `${whole}.${frac}`;
}

// Read-only wallet stub for Anchor's Program constructor (we never sign here).
const READ_ONLY_WALLET = {
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

export default function PollasPage() {
  const [pollas, setPollas] = useState<PollaCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchPollas() {
      try {
        const conn = new Connection(SOLANA_RPC_URL, 'confirmed');
        const provider = new AnchorProvider(conn, READ_ONLY_WALLET, {
          commitment: 'confirmed',
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const program = new Program(idl as any, provider);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const accounts = await (program.account as any).polla.all();
        if (cancelled) return;

        // Only show pollas that use the configured USDC mint. Other pollas
        // (e.g. legacy ones pointing at Circle's mint when we've moved to
        // a test mint) stay invisible — users can't fund those anyway.
        const configuredMint = new PublicKey(USDC_MINT);
        const filtered = accounts.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ({ account }: { account: any }) =>
            (account as RawPolla).usdcMint.equals(configuredMint),
        );

        const cards: PollaCard[] = filtered.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ({ publicKey, account }: { publicKey: PublicKey; account: any }) => {
            const raw = account as RawPolla;
            return {
              pubkey: publicKey.toBase58(),
              creator: raw.creator.toBase58(),
              name: decodeName(raw.name),
              tournament: decodeName(raw.tournament),
              entryUsdc: formatUsdc(raw.entryAmount),
              numMatches: raw.numMatches,
              numParticipants: raw.numParticipants,
              totalPoolUsdc: formatUsdc(raw.totalPool),
              status: statusKey(raw.status),
            };
          },
        );

        cards.sort((a, b) => a.name.localeCompare(b.name));
        setPollas(cards);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchPollas();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen">
      <BrandHeader />

      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display tracking-[0.04em] text-3xl md:text-4xl text-text-primary uppercase">
            Public Pollas
          </h1>
          <Link
            href="/pollas/create"
            className="rounded-md border border-border-default bg-bg-card/50 backdrop-blur px-4 py-2 font-display tracking-[0.08em] text-xs text-text-primary hover:border-border-strong transition"
          >
            + CREATE POLLA
          </Link>
        </div>

        {loading && (
          <div className="lp-card p-12 text-center">
            <div className="font-display tracking-[0.08em] text-sm text-text-muted">
              LOADING ON-CHAIN…
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="lp-card p-12 text-center border-red-alert/40">
            <p className="text-red-alert text-sm">Failed to load: {error}</p>
          </div>
        )}

        {!loading && !error && pollas.length === 0 && (
          <div className="lp-card p-12 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pollitos/Pollito_esperando.webp"
              alt=""
              width={120}
              height={120}
              className="mx-auto mb-6 opacity-90"
            />
            <p className="font-display tracking-[0.04em] text-xl text-text-primary mb-2 uppercase">
              No pollas yet
            </p>
            <p className="text-sm text-text-muted max-w-md mx-auto">
              Run <code className="text-gold">pnpm seed:demo</code> to create the
              demo polla, or visit{' '}
              <Link href="/pollas/create" className="text-gold hover:underline">
                /pollas/create
              </Link>{' '}
              to make your own.
            </p>
          </div>
        )}

        {!loading && !error && pollas.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pollas.map((p) => (
              <PollaCardView key={p.pubkey} polla={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function PollaCardView({ polla }: { polla: PollaCard }) {
  const statusColor =
    polla.status === 'OPEN'
      ? 'text-turf'
      : polla.status === 'LOCKED'
        ? 'text-amber'
        : 'text-text-muted';
  return (
    <Link
      href={`/pollas/${polla.pubkey}`}
      className="lp-card p-5 transition hover:border-border-strong group"
    >
      <div className="flex items-start gap-3 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pollitos/pollito_capitan_lider.webp"
          alt=""
          width={48}
          height={48}
          className="flex-shrink-0 transition-transform group-hover:scale-110"
        />
        <div className="flex-1 min-w-0">
          <div
            className={`font-display tracking-[0.08em] text-[11px] mb-1 ${statusColor}`}
          >
            {polla.status}
          </div>
          <div className="font-display tracking-[0.02em] text-lg text-text-primary uppercase truncate">
            {polla.name}
          </div>
          <div className="text-xs text-text-muted truncate">{polla.tournament}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border-subtle">
        <Stat label="ENTRY" value={`${polla.entryUsdc}`} suffix="USDC" />
        <Stat label="MATCHES" value={polla.numMatches.toString()} />
        <Stat label="PLAYERS" value={polla.numParticipants.toString()} />
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div>
      <div className="font-display tracking-[0.08em] text-[10px] text-text-muted">
        {label}
      </div>
      <div className="font-display tracking-[0.04em] text-base text-text-primary">
        {value}
        {suffix && <span className="text-[10px] text-text-muted ml-1">{suffix}</span>}
      </div>
    </div>
  );
}
