'use client';

// /inicio — authenticated landing page.
// Mirrors la-polla's mobile home: hero with the user's pollito + greeting,
// two big CTAs (CREAR + UNIRME CON CÓDIGO), then preview slices of the
// user's two most-used surfaces (active pollas + recent avisos), each
// with a "ver todas →" link to the full page.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { BrandHeader } from '@/components/BrandHeader';
import { pollitoImage, usePollito } from '@/lib/usePollito';

type Pool = {
  pubkey: string;
  name: string;
  tournament: string;
  entryUsdc: string;
  numMatches: number;
  numParticipants: number;
  totalPoolUsdc: string;
  status: 'OPEN' | 'LOCKED' | 'SETTLED';
};

type Aviso = {
  id: string;
  title: string;
  subtitle: string;
  at: string;
  unread: boolean;
};

export default function InicioPage() {
  const { ready, authenticated, user, login } = usePrivy();
  const { pollito } = usePollito();
  const [pools, setPools] = useState<Pool[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loadingPools, setLoadingPools] = useState(true);
  const [loadingAvisos, setLoadingAvisos] = useState(true);

  // First-name greeting if Privy gave us an email; otherwise generic.
  const handle = user?.email?.address?.split('@')[0] ?? 'Player';

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/pools');
        const j = await res.json();
        if (cancelled) return;
        setPools(j.pools ?? []);
      } catch {
        // keep silent — empty state still renders fine
      } finally {
        if (!cancelled) setLoadingPools(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/avisos');
        const j = await res.json();
        if (cancelled) return;
        setAvisos(j.avisos ?? []);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingAvisos(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (ready && !authenticated) {
    return (
      <main className="min-h-screen pb-20">
        <BrandHeader />
        <div className="mx-auto max-w-md px-4 pt-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pollitos/pollito_capitan_lider.webp"
            alt=""
            width={120}
            height={120}
            className="mx-auto mb-6"
          />
          <h1 className="font-display tracking-[0.04em] text-3xl text-text-primary uppercase">
            Sign in to continue
          </h1>
          <p className="mt-3 text-text-muted text-base">
            Your pools, picks, and alerts live in your account.
          </p>
          <button
            onClick={login}
            className="mt-6 rounded-md bg-gold px-6 py-3 font-display tracking-[0.08em] text-sm text-black hover:bg-amber transition"
          >
            SIGN IN
          </button>
        </div>
      </main>
    );
  }

  const previewPools = pools.slice(0, 3);
  const previewAvisos = avisos.slice(0, 3);

  return (
    <main className="min-h-screen pb-20">
      <BrandHeader />

      <div className="mx-auto max-w-2xl px-4 pt-4">
        {/* Hero with pollito + greeting (flat, no card shell — la-polla style) */}
        <section className="mb-4 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pollitoImage(pollito, 'lider')}
            alt={pollito.label}
            width={72}
            height={72}
            className="flex-shrink-0 drop-shadow-[0_8px_28px_rgba(255,215,0,0.25)]"
          />
          <div className="min-w-0">
            <div className="font-display tracking-[0.08em] text-xs text-text-muted uppercase">
              {pollito.label}
            </div>
            <div className="font-display tracking-[0.02em] text-[32px] text-gold uppercase leading-none truncate">
              Hi, {handle}
            </div>
            <div className="mt-1 text-sm text-text-muted">
              {pollito.vibe}
            </div>
          </div>
        </section>

        {/* Two CTA cards */}
        <section className="grid gap-3 mb-6 md:grid-cols-2">
          <Link
            href="/crear"
            className="rounded-md bg-gold px-5 py-4 font-display tracking-[0.08em] text-sm text-black flex items-center justify-between hover:bg-amber transition min-h-12"
          >
            <span>+ CREATE NEW POOL</span>
            <ArrowRight />
          </Link>
          <button
            type="button"
            onClick={() => alert('Invite-code flow coming soon')}
            className="rounded-md border border-border-default bg-bg-card/50 backdrop-blur px-5 py-4 font-display tracking-[0.08em] text-sm text-text-primary flex items-center justify-between hover:border-gold transition min-h-12"
          >
            <span>JOIN WITH CODE</span>
            <ArrowRight muted />
          </button>
        </section>

        {/* MY ACTIVE POOLS preview */}
        <section className="mb-6">
          <SectionHeading
            title={`My active pools · ${pools.length}`}
            href="/pollas"
            ctaLabel="See all"
          />
          {loadingPools && <SkeletonCard />}
          {!loadingPools && previewPools.length === 0 && (
            <div className="lp-card p-6 text-center">
              <p className="text-text-muted text-base">
                No pools yet. Create one or join with a code.
              </p>
            </div>
          )}
          {!loadingPools && previewPools.length > 0 && (
            <div className="grid gap-3">
              {previewPools.map((p) => (
                <PoolPreview key={p.pubkey} pool={p} />
              ))}
            </div>
          )}
        </section>

        {/* RECENT ALERTS preview */}
        <section className="mb-6">
          <SectionHeading
            title="Recent alerts"
            href="/avisos"
            ctaLabel="See all"
          />
          {loadingAvisos && <SkeletonCard />}
          {!loadingAvisos && previewAvisos.length === 0 && (
            <div className="lp-card p-6 text-center">
              <p className="text-text-muted text-base">
                No alerts yet.
              </p>
            </div>
          )}
          {!loadingAvisos && previewAvisos.length > 0 && (
            <div className="lp-card overflow-hidden">
              {previewAvisos.map((a, i) => (
                <AvisoPreviewRow
                  key={a.id}
                  aviso={a}
                  isLast={i === previewAvisos.length - 1}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SectionHeading({
  title,
  href,
  ctaLabel,
}: {
  title: string;
  href: string;
  ctaLabel: string;
}) {
  return (
    <div className="flex items-baseline justify-between mb-2.5 px-1">
      <h2 className="lp-section-title text-gold">
        {title}
      </h2>
      <Link
        href={href}
        className="font-display tracking-[0.06em] text-xs text-text-muted hover:text-text-primary transition uppercase"
      >
        {ctaLabel} →
      </Link>
    </div>
  );
}

function PoolPreview({ pool }: { pool: Pool }) {
  return (
    <Link
      href={`/pollas/${pool.pubkey}`}
      className="lp-card p-4 flex items-center justify-between hover:border-border-strong transition"
    >
      <div className="min-w-0">
        <div className="font-display tracking-[0.04em] text-xl text-text-primary uppercase truncate">
          {pool.name}
        </div>
        <div className="text-xs text-text-muted truncate">
          {pool.tournament}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
          <span>${pool.entryUsdc} each</span>
          <span>·</span>
          <span className="text-gold font-display tracking-[0.06em]">
            POT ${pool.totalPoolUsdc}
          </span>
        </div>
      </div>
      <div className="text-right ml-3">
        <div
          className={`font-display tracking-[0.08em] text-xs ${
            pool.status === 'OPEN'
              ? 'text-turf'
              : pool.status === 'LOCKED'
                ? 'text-amber'
                : 'text-text-muted'
          }`}
        >
          {pool.status}
        </div>
        <div className="font-display tracking-[0.04em] text-xl text-text-primary leading-none mt-0.5">
          {pool.numParticipants}
        </div>
        <div className="font-display tracking-[0.06em] text-[11px] text-text-muted">
          PLAYERS
        </div>
      </div>
    </Link>
  );
}

function AvisoPreviewRow({
  aviso,
  isLast,
}: {
  aviso: Aviso;
  isLast: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 ${
        isLast ? '' : 'border-b border-border-subtle'
      }`}
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-bg-elevated/60">
        <BellIcon />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display tracking-[0.02em] text-sm text-text-primary truncate">
          {aviso.title}
        </div>
        <div className="text-xs text-text-muted truncate mt-0.5">
          {aviso.subtitle}
        </div>
      </div>
      {aviso.unread && (
        <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-red-alert" />
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="lp-card p-6 animate-pulse">
      <div className="h-4 bg-bg-elevated/60 rounded w-1/3 mb-3" />
      <div className="h-3 bg-bg-elevated/40 rounded w-2/3" />
    </div>
  );
}

function ArrowRight({ muted = false }: { muted?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={muted ? 'rgb(var(--text-muted-rgb))' : 'currentColor'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgb(var(--gold-rgb))"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 1 1 12 0v4l1.6 3.2a1 1 0 0 1-.9 1.4H5.3a1 1 0 0 1-.9-1.4L6 12V8z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}
