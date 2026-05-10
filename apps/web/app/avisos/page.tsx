'use client';

// /avisos — notification feed, mobile-first, mirrors la-polla.
// Fetches from /api/avisos (currently a stub returning a hardcoded list,
// see TODO in the route handler). Each row: icon → title + subtitle → relative
// timestamp → red dot if unread. "LEER TODAS" header button just clears the
// red dots client-side for the demo (real mark-as-read mutation comes later).

import { useEffect, useMemo, useState } from 'react';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { BrandHeader } from '@/components/BrandHeader';

type AvisoKind =
  | 'sign_in'
  | 'pick_correct'
  | 'rank_up'
  | 'overtaken'
  | 'pool_settled'
  | 'pool_locked'
  | 'invite';

type Aviso = {
  id: string;
  kind: AvisoKind;
  title: string;
  subtitle: string;
  at: string;
  unread: boolean;
};

export default function AvisosPage() {
  const { wallets } = useSolanaWallets();
  const wallet = wallets[0]?.address;

  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const url = wallet
          ? `/api/avisos?wallet=${encodeURIComponent(wallet)}`
          : '/api/avisos';
        const res = await fetch(url);
        const j = await res.json();
        if (cancelled) return;
        setAvisos(j.avisos ?? []);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  function markAllRead() {
    setAvisos((prev) => prev.map((a) => ({ ...a, unread: false })));
    // TODO(post-hack): PATCH /api/avisos with { ids: prev.filter(unread).map(id) }
  }

  return (
    <main className="min-h-screen pb-28">
      <BrandHeader />

      <div className="mx-auto max-w-2xl px-4 pt-4">
        <div className="flex items-baseline justify-between mb-4">
          <h1 className="font-display tracking-[0.04em] text-2xl md:text-3xl text-text-primary uppercase">
            Alerts
          </h1>
          <button
            type="button"
            onClick={markAllRead}
            className="font-display tracking-[0.08em] text-xs text-text-muted hover:text-text-primary uppercase transition"
          >
            ✓ Mark all read
          </button>
        </div>

        {loading && (
          <div className="lp-card p-8 text-center">
            <div className="font-display tracking-[0.08em] text-sm text-text-muted">
              LOADING…
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="lp-card p-6 text-center border-red-alert/40">
            <p className="text-red-alert text-sm">Error: {error}</p>
          </div>
        )}

        {!loading && !error && avisos.length === 0 && (
          <div className="lp-card p-12 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pollitos/Pollito_esperando.webp"
              alt=""
              width={100}
              height={100}
              className="mx-auto mb-4 opacity-90"
            />
            <p className="font-display tracking-[0.04em] text-xl text-text-primary mb-1 uppercase">
              No alerts
            </p>
            <p className="text-base text-text-muted">
              When something happens in your pools, it will show up here.
            </p>
          </div>
        )}

        {!loading && !error && avisos.length > 0 && (
          <div className="lp-card overflow-hidden">
            {avisos.map((a, i) => (
              <AvisoRow
                key={a.id}
                aviso={a}
                isLast={i === avisos.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function AvisoRow({ aviso, isLast }: { aviso: Aviso; isLast: boolean }) {
  const relative = useRelative(aviso.at);
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3.5 ${
        isLast ? '' : 'border-b border-border-subtle'
      } ${aviso.unread ? 'bg-gold/[0.025]' : ''}`}
    >
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md"
        style={{ background: kindBg(aviso.kind) }}
      >
        <KindIcon kind={aviso.kind} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="font-display tracking-[0.02em] text-sm text-text-primary truncate">
            {aviso.title}
          </div>
          <div className="font-display tracking-[0.06em] text-xs text-text-muted whitespace-nowrap uppercase">
            {relative}
          </div>
        </div>
        <div className="text-xs text-text-muted truncate mt-0.5">
          {aviso.subtitle}
        </div>
      </div>
      {aviso.unread && (
        <span
          aria-label="unread"
          className="mt-2 inline-block h-2 w-2 rounded-full bg-red-alert flex-shrink-0"
        />
      )}
    </div>
  );
}

// Render "hace X" relative to the user's current clock. We compute once on
// mount; this page is short-lived enough that we don't need an interval.
function useRelative(iso: string): string {
  return useMemo(() => {
    const then = new Date(iso).getTime();
    const diffMs = Date.now() - then;
    const min = Math.max(1, Math.round(diffMs / 60000));
    if (min < 60) return `${min} min ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr} h ago`;
    const d = Math.round(hr / 24);
    return `${d} d ago`;
  }, [iso]);
}

function kindBg(kind: AvisoKind): string {
  switch (kind) {
    case 'pick_correct':
      return 'rgba(31, 216, 127, 0.12)';
    case 'rank_up':
      return 'rgba(255, 215, 0, 0.12)';
    case 'overtaken':
      return 'rgba(255, 61, 87, 0.12)';
    case 'pool_settled':
      return 'rgba(255, 159, 28, 0.12)';
    case 'pool_locked':
      return 'rgba(255, 159, 28, 0.10)';
    case 'invite':
      return 'rgba(255, 215, 0, 0.10)';
    case 'sign_in':
    default:
      return 'rgba(168, 175, 188, 0.10)';
  }
}

function KindIcon({ kind }: { kind: AvisoKind }) {
  const stroke =
    kind === 'pick_correct'
      ? 'rgb(var(--turf-rgb))'
      : kind === 'rank_up' || kind === 'invite'
        ? 'rgb(var(--gold-rgb))'
        : kind === 'overtaken'
          ? 'rgb(var(--red-alert-rgb))'
          : kind === 'pool_settled' || kind === 'pool_locked'
            ? 'rgb(var(--amber-rgb))'
            : 'rgb(var(--text-muted-rgb))';
  switch (kind) {
    case 'pick_correct':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12l5 5L20 7"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'rank_up':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 19V5M5 12l7-7 7 7"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'overtaken':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5v14M19 12l-7 7-7-7"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'pool_settled':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="5" stroke={stroke} strokeWidth="1.8" />
          <path
            d="M9 13l-1 8 4-2 4 2-1-8"
            stroke={stroke}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'pool_locked':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect
            x="5"
            y="11"
            width="14"
            height="9"
            rx="2"
            stroke={stroke}
            strokeWidth="1.8"
          />
          <path
            d="M8 11V7a4 4 0 1 1 8 0v4"
            stroke={stroke}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'invite':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"
            stroke={stroke}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"
            stroke={stroke}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'sign_in':
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M3 12h12"
            stroke={stroke}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}
