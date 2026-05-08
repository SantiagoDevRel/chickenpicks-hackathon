'use client';

import Link from 'next/link';
import { BrandHeader } from '@/components/BrandHeader';

export default function PollasPage() {
  // TODO Day 2: read pollas from chain via getProgramAccounts.
  const pollas: { pubkey: string; name: string; entry: string; status: string }[] = [];

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

        {pollas.length === 0 ? (
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
              Once the platform is initialized and the first polla is created,
              they'll appear here. Admin: head to{' '}
              <Link href="/admin" className="text-gold hover:underline">
                /admin
              </Link>{' '}
              to bootstrap.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pollas.map((p) => (
              <Link
                key={p.pubkey}
                href={`/pollas/${p.pubkey}`}
                className="lp-card p-5 transition hover:border-border-strong"
              >
                <div className="font-display tracking-[0.08em] text-[11px] text-gold mb-2 uppercase">
                  {p.status}
                </div>
                <div className="font-display tracking-[0.02em] text-xl text-text-primary mb-2 uppercase">
                  {p.name}
                </div>
                <div className="text-sm text-text-muted">Entry: {p.entry}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
