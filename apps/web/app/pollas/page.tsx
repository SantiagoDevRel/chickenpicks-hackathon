'use client';

// /pollas — "Mis pollas" list, mobile-first, mirrors la-polla.
//
// Sections:
//   - Code-entry pill: "¿Tienes un código? Únete" (placeholder for invite-code)
//   - "MIS POLLAS ACTIVAS · N" → cards for OPEN/LOCKED pools
//   - "Finalizadas · N" → SETTLED pools, dimmer styling
//
// Until we wire per-user filtering (we need wallet → participant index from
// chain), all on-chain pollas using the configured USDC mint show up here —
// the la-polla shape stays correct.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnchorProvider, BN, Program } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import idl from '@chickenpicks/anchor-client/idl' with { type: 'json' };
import {
  SOLANA_RPC_URL,
  USDC_DECIMALS,
  USDC_MINT,
} from '@chickenpicks/shared';
import { BrandHeader } from '@/components/BrandHeader';
import { POLLITOS, pollitoImage } from '@/lib/usePollito';

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
  matchesSettled: number;
  numParticipants: number;
  totalPoolUsdc: string;
  status: 'OPEN' | 'LOCKED' | 'SETTLED';
};

function decodeName(bytes: number[]): string {
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
              matchesSettled: raw.matchesSettled,
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

  const active = pollas.filter((p) => p.status !== 'SETTLED');
  const finalized = pollas.filter((p) => p.status === 'SETTLED');

  return (
    <main className="min-h-screen pb-20">
      <BrandHeader />

      <div className="mx-auto max-w-2xl px-4 pt-4">
        <h1 className="font-display tracking-[0.04em] text-2xl md:text-3xl text-text-primary uppercase mb-3">
          My pools
        </h1>

        {/* Code-entry pill (la-polla pattern). Placeholder for invite-code feature. */}
        <button
          type="button"
          onClick={() => alert('Invite-code flow coming soon')}
          className="lp-card w-full p-3.5 mb-5 flex items-center gap-3 hover:border-gold transition text-left"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-bg-elevated/60 flex-shrink-0">
            <LinkIcon />
          </span>
          <span className="font-display tracking-[0.04em] text-sm text-text-secondary uppercase">
            Have a code? <span className="text-gold">Join</span>
          </span>
        </button>

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
              No pools yet
            </p>
            <p className="text-sm text-text-muted max-w-md mx-auto">
              Tap the <span className="text-gold">+</span> button to create one,
              or run <code className="text-gold">pnpm seed:demo</code>.
            </p>
          </div>
        )}

        {!loading && !error && pollas.length > 0 && (
          <>
            {/* My active pools · N */}
            <Section
              label={`My active pools · ${active.length}`}
              tone="gold"
            >
              {active.length === 0 && (
                <div className="lp-card p-6 text-center">
                  <p className="text-text-muted text-base">
                    No active pools yet.
                  </p>
                </div>
              )}
              <div className="grid gap-3">
                {active.map((p) => (
                  <PollaListCard key={p.pubkey} polla={p} />
                ))}
              </div>
            </Section>

            {/* Finished · N */}
            {finalized.length > 0 && (
              <Section
                label={`Finished · ${finalized.length}`}
                tone="muted"
                className="mt-6"
              >
                <div className="grid gap-3">
                  {finalized.map((p) => (
                    <PollaListCard key={p.pubkey} polla={p} dimmed />
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Section({
  label,
  children,
  tone,
  className,
}: {
  label: string;
  children: React.ReactNode;
  tone: 'gold' | 'muted';
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="flex items-center gap-2 mb-2.5 px-1">
        <span
          className={`lp-section-title ${
            tone === 'gold' ? 'text-gold' : 'text-text-muted'
          }`}
        >
          {label}
        </span>
      </div>
      {children}
    </section>
  );
}

function PollaListCard({
  polla,
  dimmed = false,
}: {
  polla: PollaCard;
  dimmed?: boolean;
}) {
  // Build a stable-ish set of avatars for the card. Anchor doesn't expose
  // per-participant pollito ids on-chain (we'd need a side store) so for
  // the hackathon we deterministically pick `min(numParticipants, 4)` from
  // the catalog seeded by the polla pubkey — visual variety, no collisions.
  const avatars = pickAvatars(polla.pubkey, polla.numParticipants);

  return (
    <Link
      href={`/pollas/${polla.pubkey}`}
      className={`lp-card p-4 transition hover:border-border-strong group ${
        dimmed ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="font-display tracking-[0.02em] text-xl text-text-primary uppercase truncate leading-tight">
            {polla.name}
          </div>
          <div className="text-xs text-text-muted truncate mt-0.5">
            {polla.tournament}
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-sm text-text-secondary">
            <span className="text-text-muted">
              <span className="text-text-secondary">{polla.numParticipants}</span>{' '}
              ·
            </span>
            <span>${polla.entryUsdc} each</span>
            <span className="text-text-muted">·</span>
            <span className="font-display tracking-[0.04em] text-gold">
              POT ${polla.totalPoolUsdc}
            </span>
          </div>
        </div>

        {/* Participant avatar stack */}
        <div className="flex -space-x-2 flex-shrink-0">
          {avatars.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt=""
              width={28}
              height={28}
              className="rounded-full border-2 border-bg-card bg-bg-card"
            />
          ))}
        </div>
      </div>

      {/* Footer: status badge + matches progress */}
      <div className="flex items-center justify-between border-t border-border-subtle pt-2.5">
        <span
          className={`font-display tracking-[0.08em] text-xs uppercase ${
            polla.status === 'OPEN'
              ? 'text-turf'
              : polla.status === 'LOCKED'
                ? 'text-amber'
                : 'text-text-muted'
          }`}
        >
          ● {polla.status}
        </span>
        <span className="font-display tracking-[0.04em] text-xs text-text-muted uppercase">
          {polla.matchesSettled} of {polla.numMatches} matches
        </span>
      </div>
    </Link>
  );
}

// Deterministic pollito picker based on polla pubkey — purely cosmetic.
function pickAvatars(pubkey: string, n: number): string[] {
  const count = Math.max(0, Math.min(4, n));
  const out: string[] = [];
  let seed = 0;
  for (let i = 0; i < pubkey.length; i++) seed = (seed * 31 + pubkey.charCodeAt(i)) >>> 0;
  for (let i = 0; i < count; i++) {
    const idx = (seed + i * 13) % POLLITOS.length;
    out.push(pollitoImage(POLLITOS[idx]!, 'lider'));
  }
  return out;
}

function LinkIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgb(var(--gold-rgb))"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </svg>
  );
}
