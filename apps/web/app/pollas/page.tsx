'use client';

import Link from 'next/link';
import { ConnectButton } from '@/components/ConnectButton';

export default function PollasPage() {
  // TODO Day 2: read pollas from chain via getProgramAccounts.
  // For now: empty state until /admin → initialize_platform → create_polla flow runs.
  const pollas: { pubkey: string; name: string; entry: string; status: string }[] = [];

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          🐔 ChickenPicks <span className="text-accent">OnChain</span>
        </Link>
        <ConnectButton />
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Public pollas</h1>
          <Link
            href="/pollas/create"
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-border transition"
          >
            + Create polla
          </Link>
        </div>

        {pollas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-lg text-muted">No pollas yet.</p>
            <p className="mt-2 text-sm text-muted">
              Once the platform is initialized and the first polla is created, it
              will appear here. Admins: visit{' '}
              <Link href="/admin" className="text-accent underline">
                /admin
              </Link>{' '}
              to initialize.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pollas.map((p) => (
              <Link
                key={p.pubkey}
                href={`/pollas/${p.pubkey}`}
                className="rounded-xl border border-border bg-card p-5 transition hover:border-accent"
              >
                <div className="mb-1 text-sm uppercase tracking-widest text-accent">
                  {p.status}
                </div>
                <div className="mb-2 text-lg font-bold">{p.name}</div>
                <div className="text-sm text-muted">Entry: {p.entry}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
