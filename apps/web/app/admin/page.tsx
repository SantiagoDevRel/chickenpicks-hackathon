'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { SystemProgram } from '@solana/web3.js';
import { ConnectButton } from '@/components/ConnectButton';
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
        // Account exists — for v1, just confirm. Decoding via Anchor would
        // give us authority/treasury/feeBps; we can add that once useProgram
        // is wired with a wallet.
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
      // Privy embedded wallets implement signTransaction. Adapt to AnchorProvider.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adaptedWallet: any = {
        publicKey: wallet.address ? new (await import('@solana/web3.js')).PublicKey(wallet.address) : null,
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
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          🐔 ChickenPicks <span className="text-accent">OnChain</span>
        </Link>
        <ConnectButton />
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-2 text-3xl font-bold">Admin · Fake oracle</h1>
        <p className="mb-8 text-sm text-muted">
          Restricted to the platform authority wallet (
          <code className="font-mono">{PLATFORM_AUTHORITY.slice(0, 6)}…{PLATFORM_AUTHORITY.slice(-4)}</code>).
        </p>

        {!ready && <p className="text-muted">Loading wallet…</p>}

        {ready && !authenticated && (
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-muted">Sign in with phone first to access /admin.</p>
          </div>
        )}

        {ready && authenticated && !isAuthority && (
          <div className="rounded-xl border border-red-900 bg-red-950/30 p-6">
            <p className="text-red-300">
              You are signed in as <code className="font-mono">{myAddress.slice(0, 6)}…{myAddress.slice(-4)}</code>{' '}
              — not the platform authority. Switch to the deployer wallet to use admin tools.
            </p>
          </div>
        )}

        {ready && authenticated && isAuthority && (
          <div className="space-y-6">
            <Section title="Platform">
              {status.kind === 'unknown' && <p className="text-muted">Checking…</p>}
              {status.kind === 'not-initialized' && (
                <>
                  <p className="mb-4 text-sm text-muted">
                    PlatformConfig PDA does not exist on devnet yet. Click below to call{' '}
                    <code>initialize_platform</code>.
                  </p>
                  <button
                    onClick={handleInitialize}
                    disabled={busy}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {busy ? 'Sending…' : 'Initialize platform (5% fee)'}
                  </button>
                </>
              )}
              {status.kind === 'initialized' && (
                <ul className="space-y-1 text-sm">
                  <li>
                    <span className="text-muted">authority:</span>{' '}
                    <code className="font-mono">{status.authority}</code>
                  </li>
                  <li>
                    <span className="text-muted">treasury:</span>{' '}
                    <code className="font-mono">{status.treasury}</code>
                  </li>
                  <li>
                    <span className="text-muted">fee_bps:</span>{' '}
                    <code className="font-mono">{status.feeBps}</code> (5%)
                  </li>
                </ul>
              )}
              {status.kind === 'error' && (
                <p className="text-red-300">{status.message}</p>
              )}
              {lastSig && (
                <p className="mt-3 text-xs text-muted">
                  Tx:{' '}
                  <a
                    href={`https://explorer.solana.com/tx/${lastSig}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-accent underline"
                  >
                    {lastSig.slice(0, 12)}…
                  </a>
                </p>
              )}
            </Section>

            <Section title="Pollas + matches (Day 2)">
              <p className="text-sm text-muted">
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
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </div>
  );
}
