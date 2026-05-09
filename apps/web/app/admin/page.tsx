'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, type Idl } from '@coral-xyz/anchor';
import idl from '@chickenpicks/anchor-client/idl' with { type: 'json' };
import { PROGRAM_ID, SOLANA_RPC_URL, USDC_MINT } from '@chickenpicks/shared';
import { BrandHeader } from '@/components/BrandHeader';

const programId = new PublicKey(PROGRAM_ID);

const READ_ONLY_WALLET = {
  publicKey: PublicKey.default,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signTransaction: async () => {
    throw new Error('read-only');
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signAllTransactions: async () => {
    throw new Error('read-only');
  },
};

function decodeFixedString(bytes: number[]): string {
  const arr = Uint8Array.from(bytes);
  let end = arr.length;
  while (end > 0 && arr[end - 1] === 0) end--;
  return new TextDecoder().decode(arr.subarray(0, end));
}

function statusKey(status: { open?: object; locked?: object; settled?: object }) {
  if ('open' in status) return 'OPEN';
  if ('locked' in status) return 'LOCKED';
  return 'SETTLED';
}

type PoolWithMatches = {
  pubkey: string;
  name: string;
  status: 'OPEN' | 'LOCKED' | 'SETTLED';
  numMatches: number;
  matchesSettled: number;
  numParticipants: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  matches: { idx: number; home: string; away: string; homeScore: number; awayScore: number; settled: boolean }[];
};

export default function AdminPage() {
  const { authenticated, ready, user } = usePrivy();
  const email = user?.email?.address ?? null;

  const [pools, setPools] = useState<PoolWithMatches[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastSig, setLastSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch all pools + their matches once
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const conn = new Connection(SOLANA_RPC_URL, 'confirmed');
        const provider = new AnchorProvider(conn, READ_ONLY_WALLET, {
          commitment: 'confirmed',
        });
        const program = new Program(idl as Idl, provider);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allPollas = await (program.account as any).polla.all();
        const configuredMint = new PublicKey(USDC_MINT);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filtered = allPollas.filter(({ account }: any) =>
          account.usdcMint.equals(configuredMint),
        );

        const result: PoolWithMatches[] = [];
        for (const { publicKey, account } of filtered) {
          const matchPdas: PublicKey[] = [];
          for (let i = 0; i < account.numMatches; i++) {
            const [pda] = PublicKey.findProgramAddressSync(
              [
                new TextEncoder().encode('match'),
                publicKey.toBuffer(),
                Uint8Array.from([i]),
              ],
              programId,
            );
            matchPdas.push(pda);
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const matchAccs = await (program.account as any).match.fetchMultiple(matchPdas);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const matches = matchAccs.map((m: any, idx: number) => ({
            idx,
            home: decodeFixedString(m.homeTeam),
            away: decodeFixedString(m.awayTeam),
            homeScore: m.homeScore,
            awayScore: m.awayScore,
            settled: m.settled,
          }));
          result.push({
            pubkey: publicKey.toBase58(),
            name: decodeFixedString(account.name),
            status: statusKey(account.status),
            numMatches: account.numMatches,
            matchesSettled: account.matchesSettled,
            numParticipants: account.numParticipants,
            matches,
          });
        }
        if (cancelled) return;
        setPools(result);
        setError(null);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function postResult(
    pollaPubkey: string,
    matchIndex: number,
    homeScore: number,
    awayScore: number,
  ) {
    if (!email) return;
    setBusy(`post-${pollaPubkey}-${matchIndex}`);
    setError(null);
    try {
      const res = await fetch('/api/admin/post-result', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-admin-email': email },
        body: JSON.stringify({ pollaPubkey, matchIndex, homeScore, awayScore }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `Server ${res.status}`);
      setLastSig(j.sig);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function settle(pollaPubkey: string) {
    if (!email) return;
    setBusy(`settle-${pollaPubkey}`);
    setError(null);
    try {
      const res = await fetch('/api/admin/settle', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-admin-email': email },
        body: JSON.stringify({ pollaPubkey }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `Server ${res.status}`);
      setLastSig(j.sig);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen">
      <BrandHeader />

      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center gap-4 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pollitos/pollito_arbitro_lider.webp"
            alt=""
            width={56}
            height={56}
            className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
          />
          <div>
            <h1 className="font-display tracking-[0.04em] text-3xl text-text-primary uppercase leading-none">
              Admin · Fake Oracle
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              Post fake match results, then settle pools so users can claim.
            </p>
          </div>
        </div>

        {!ready && <p className="text-text-muted">Loading…</p>}
        {ready && !authenticated && (
          <div className="lp-card p-6">
            <p className="text-text-secondary">Sign in first.</p>
          </div>
        )}

        {ready && authenticated && (
          <>
            {loading && (
              <div className="lp-card p-6 text-text-muted">Loading pools…</div>
            )}

            {!loading && pools.length === 0 && (
              <div className="lp-card p-6">
                <p className="text-text-muted">
                  No pools created yet. Run{' '}
                  <code className="text-gold">pnpm seed:demo</code> first.
                </p>
              </div>
            )}

            {!loading && pools.length > 0 && (
              <div className="space-y-6">
                {pools.map((p) => (
                  <PoolAdminCard
                    key={p.pubkey}
                    pool={p}
                    busy={busy}
                    onPostResult={postResult}
                    onSettle={settle}
                  />
                ))}
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-md bg-red-alert/10 border border-red-alert/30 px-3 py-2">
                <p className="text-xs text-red-alert">{error}</p>
              </div>
            )}
            {lastSig && (
              <p className="mt-4 text-xs text-text-muted">
                Last tx:{' '}
                <a
                  href={`https://explorer.solana.com/tx/${lastSig}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-gold hover:underline"
                >
                  {lastSig.slice(0, 12)}…
                </a>
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function PoolAdminCard({
  pool,
  busy,
  onPostResult,
  onSettle,
}: {
  pool: PoolWithMatches;
  busy: string | null;
  onPostResult: (
    pollaPubkey: string,
    matchIndex: number,
    homeScore: number,
    awayScore: number,
  ) => void;
  onSettle: (pollaPubkey: string) => void;
}) {
  const allSettled = pool.matchesSettled === pool.numMatches;
  return (
    <div className="lp-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-display tracking-[0.04em] text-xl text-text-primary uppercase">
            {pool.name}
          </div>
          <div className="text-xs text-text-muted mt-1">
            {pool.matchesSettled}/{pool.numMatches} matches settled ·{' '}
            {pool.numParticipants} player{pool.numParticipants === 1 ? '' : 's'}
          </div>
        </div>
        <div
          className={`font-display tracking-[0.08em] text-[11px] ${
            pool.status === 'OPEN'
              ? 'text-turf'
              : pool.status === 'LOCKED'
                ? 'text-amber'
                : 'text-text-muted'
          }`}
        >
          {pool.status}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {pool.matches.map((m) => (
          <MatchAdminRow
            key={m.idx}
            pool={pool}
            match={m}
            busy={busy}
            onPostResult={onPostResult}
          />
        ))}
      </div>

      {pool.status === 'LOCKED' && allSettled && (
        <button
          onClick={() => onSettle(pool.pubkey)}
          disabled={busy === `settle-${pool.pubkey}`}
          className="w-full rounded-md bg-gold px-4 py-2.5 font-display tracking-[0.08em] text-xs text-black hover:bg-amber disabled:opacity-50 transition"
        >
          {busy === `settle-${pool.pubkey}` ? 'SETTLING…' : 'SETTLE POOL'}
        </button>
      )}
      {pool.status === 'SETTLED' && (
        <p className="text-center text-xs text-text-muted font-display tracking-[0.08em]">
          POOL SETTLED
        </p>
      )}
    </div>
  );
}

function MatchAdminRow({
  pool,
  match,
  busy,
  onPostResult,
}: {
  pool: PoolWithMatches;
  match: PoolWithMatches['matches'][number];
  busy: string | null;
  onPostResult: (
    pollaPubkey: string,
    matchIndex: number,
    homeScore: number,
    awayScore: number,
  ) => void;
}) {
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const isBusy = busy === `post-${pool.pubkey}-${match.idx}`;

  if (match.settled) {
    return (
      <div className="rounded-md bg-bg-elevated/40 border border-border-subtle p-2.5 flex items-center gap-3">
        <div className="flex-1 text-right text-sm font-display tracking-[0.04em] uppercase text-text-secondary">
          {match.home}
        </div>
        <div className="font-display tracking-[0.04em] text-base text-amber">
          {match.homeScore} - {match.awayScore}
        </div>
        <div className="flex-1 text-left text-sm font-display tracking-[0.04em] uppercase text-text-secondary">
          {match.away}
        </div>
      </div>
    );
  }

  function submit() {
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    if (Number.isNaN(h) || Number.isNaN(a) || h < 0 || a < 0) return;
    onPostResult(pool.pubkey, match.idx, h, a);
  }

  return (
    <div className="rounded-md bg-bg-elevated/40 border border-border-subtle p-2.5 flex items-center gap-2">
      <div className="flex-1 text-right text-sm font-display tracking-[0.04em] uppercase text-text-secondary">
        {match.home}
      </div>
      <input
        type="number"
        min={0}
        max={20}
        value={home}
        onChange={(e) => setHome(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
        className="w-10 h-8 rounded-md bg-bg-card text-center font-display text-sm text-text-primary border border-border-default focus:border-gold focus:outline-none"
      />
      <span className="text-xs text-text-muted">vs</span>
      <input
        type="number"
        min={0}
        max={20}
        value={away}
        onChange={(e) => setAway(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
        className="w-10 h-8 rounded-md bg-bg-card text-center font-display text-sm text-text-primary border border-border-default focus:border-gold focus:outline-none"
      />
      <div className="flex-1 text-left text-sm font-display tracking-[0.04em] uppercase text-text-secondary">
        {match.away}
      </div>
      <button
        onClick={submit}
        disabled={isBusy || !home || !away}
        className="rounded-md bg-gold px-3 py-1.5 font-display tracking-[0.08em] text-[10px] text-black hover:bg-amber disabled:opacity-30 transition"
      >
        {isBusy ? '…' : 'POST'}
      </button>
    </div>
  );
}
