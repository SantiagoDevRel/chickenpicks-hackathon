'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { SystemProgram } from '@solana/web3.js';
import { BrandHeader } from '@/components/BrandHeader';
import { getConnection, getProgram, platformPda } from '@/lib/anchor';

const PLATFORM_AUTHORITY = process.env.NEXT_PUBLIC_PLATFORM_AUTHORITY ?? '';

type Status =
  | { kind: 'unknown' }
  | { kind: 'not-initialized' }
  | { kind: 'initialized'; authority: string; treasury: string; feeBps: number }
  | { kind: 'error'; message: string };

export default function AdminPage() {
  const { authenticated, ready } = usePrivy();
  const { wallets } = useSolanaWallets();
  const wallet = wallets[0];
  const myAddress = wallet?.address ?? '';

  const isAuthority = myAddress && myAddress === PLATFORM_AUTHORITY;
  const [status, setStatus] = useState<Status>({ kind: 'unknown' });
  const [busy, setBusy] = useState(false);
  const [lastSig, setLastSig] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const conn = getConnection();
        const [pda] = platformPda();
        const acc = await conn.getAccountInfo(pda);
        if (cancelled) return;
        if (!acc) {
          setStatus({ kind: 'not-initialized' });
          return;
        }
        setStatus({
          kind: 'initialized',
          authority: PLATFORM_AUTHORITY,
          treasury: PLATFORM_AUTHORITY,
          feeBps: 500,
        });
      } catch (e) {
        if (cancelled) return;
        setStatus({ kind: 'error', message: (e as Error).message });
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleInitialize() {
    if (!wallet) return;
    setBusy(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adaptedWallet: any = {
        publicKey: wallet.address
          ? new (await import('@solana/web3.js')).PublicKey(wallet.address)
          : null,
        signTransaction: async (tx: unknown) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return await (wallet as any).signTransaction(tx);
        },
        signAllTransactions: async (txs: unknown[]) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return Promise.all(txs.map((tx) => (wallet as any).signTransaction(tx)));
        },
      };
      const program = getProgram(adaptedWallet);
      const [pda] = platformPda();
      const sig = await program.methods
        .initializePlatform()
        .accounts({
          platform: pda,
          authority: adaptedWallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      setLastSig(sig);
      setStatus({
        kind: 'initialized',
        authority: myAddress,
        treasury: myAddress,
        feeBps: 500,
      });
    } catch (e) {
      setStatus({ kind: 'error', message: (e as Error).message });
    } finally {
      setBusy(false);
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
              Restricted to platform authority{' '}
              <code className="font-mono text-text-secondary">
                {PLATFORM_AUTHORITY.slice(0, 6)}…{PLATFORM_AUTHORITY.slice(-4)}
              </code>
            </p>
          </div>
        </div>

        {!ready && <p className="text-text-muted">Loading wallet…</p>}

        {ready && !authenticated && (
          <div className="lp-card p-6">
            <p className="text-text-secondary">Sign in with phone first to access /admin.</p>
          </div>
        )}

        {ready && authenticated && !isAuthority && (
          <div className="lp-card p-6 border-red-alert/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pollitos/pollito_arbitro_triste.webp"
              alt=""
              width={64}
              height={64}
              className="mb-3"
            />
            <p className="text-red-alert">
              You are signed in as{' '}
              <code className="font-mono">
                {myAddress.slice(0, 6)}…{myAddress.slice(-4)}
              </code>{' '}
              — not the platform authority. Switch to the deployer wallet to use admin
              tools.
            </p>
          </div>
        )}

        {ready && authenticated && isAuthority && (
          <div className="space-y-6">
            <Section title="Platform">
              {status.kind === 'unknown' && (
                <p className="text-text-muted">Checking…</p>
              )}
              {status.kind === 'not-initialized' && (
                <>
                  <p className="mb-4 text-sm text-text-muted">
                    PlatformConfig PDA does not exist on devnet yet. Click below to
                    call <code className="text-text-secondary">initialize_platform</code>.
                  </p>
                  <button
                    onClick={handleInitialize}
                    disabled={busy}
                    className="rounded-md bg-gold px-5 py-2.5 font-display tracking-[0.08em] text-sm text-black hover:bg-amber disabled:opacity-50 transition"
                  >
                    {busy ? 'SENDING…' : 'INITIALIZE PLATFORM (5% FEE)'}
                  </button>
                </>
              )}
              {status.kind === 'initialized' && (
                <ul className="space-y-2 text-sm">
                  <Row label="authority" value={status.authority} />
                  <Row label="treasury" value={status.treasury} />
                  <Row label="fee_bps" value={`${status.feeBps} (5%)`} />
                </ul>
              )}
              {status.kind === 'error' && (
                <p className="text-red-alert text-sm">{status.message}</p>
              )}
              {lastSig && (
                <p className="mt-3 text-xs text-text-muted">
                  Tx:{' '}
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
            </Section>

            <Section title="Pollas + Matches (Day 2)">
              <p className="text-sm text-text-muted">
                Create polla, add matches, post fake results — wired up next iteration.
              </p>
            </Section>
          </div>
        )}
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="lp-card p-6">
      <h2 className="lp-section-title mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-4">
      <span className="text-text-muted">{label}</span>
      <code className="font-mono text-text-secondary text-xs truncate max-w-[60%]">
        {value}
      </code>
    </li>
  );
}
