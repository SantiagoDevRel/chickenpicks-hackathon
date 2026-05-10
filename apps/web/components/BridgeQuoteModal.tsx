'use client';

// BridgeQuoteModal — visual surface for the voice agent's preview_bridge_quote
// tool. Shows REAL LI.FI quotes for several EVM mainnets bridging USDC into
// Solana mainnet USDC, then collapses the demo back to "USDC on Solana
// devnet" via a CTA at the bottom. Displays one row per source chain with
// duration / fee / amount-out / provider — proves the LI.FI integration is
// wired to live data, not a stub.

import { useEffect } from 'react';
import {
  useBridgeQuote,
  useSetBridgeQuote,
  type BridgeQuoteRow,
} from '@/lib/VoiceContext';

const CHAIN_ICON: Record<string, string> = {
  Polygon: '🟣',
  Arbitrum: '🔵',
  Base: '🟦',
  Optimism: '🔴',
  Ethereum: '⬛',
  BSC: '🟡',
};

export function BridgeQuoteModal() {
  const state = useBridgeQuote();
  const setState = useSetBridgeQuote();

  useEffect(() => {
    if (state.kind !== 'open') return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setState({ kind: 'idle' });
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state.kind, setState]);

  if (state.kind !== 'open') return null;
  const { amountUsdc, quotes, loading } = state;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur flex items-center justify-center p-4 animate-fade-in"
      onClick={() => setState({ kind: 'idle' })}
    >
      <div
        className="lp-card-hero max-w-md w-full p-5 animate-slide-up max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl">🌉</div>
          <div className="flex-1">
            <h2 className="font-display tracking-[0.04em] text-xl text-gold uppercase leading-none">
              Bridge {amountUsdc} USDC → Solana
            </h2>
            <p className="text-[11px] text-text-muted mt-1">
              Live LI.FI routes from EVM mainnets
            </p>
          </div>
        </div>

        {loading && (
          <p className="text-text-muted text-xs font-display tracking-[0.08em] text-center py-6">
            FETCHING QUOTES…
          </p>
        )}

        {!loading && (
          <div className="space-y-2 mb-4">
            {quotes.map((q) => (
              <QuoteRowCard key={q.chain_id} row={q} amountUsdc={amountUsdc} />
            ))}
          </div>
        )}

        <div className="rounded-md bg-amber/10 border border-amber/30 px-3 py-2.5 mb-4">
          <p className="text-xs text-amber leading-snug">
            Right now ChickenPicks lives on Solana <strong>devnet</strong>, so
            real EVM-side bridging is read-only for the demo. Use the test USDC
            mint on Solana devnet to play.
          </p>
        </div>

        <button
          onClick={() => setState({ kind: 'idle' })}
          className="w-full rounded-md bg-gold px-4 py-3 font-display tracking-[0.08em] text-xs text-black hover:bg-amber transition"
        >
          USE SOLANA USDC DEVNET
        </button>
        <p className="mt-2 text-center text-[10px] font-display tracking-[0.08em] text-text-muted">
          ESC TO CLOSE
        </p>
      </div>
    </div>
  );
}

function QuoteRowCard({
  row,
  amountUsdc,
}: {
  row: BridgeQuoteRow;
  amountUsdc: string;
}) {
  const icon = CHAIN_ICON[row.chain_label] ?? '⬡';
  return (
    <div
      className={`rounded-md border p-3 ${
        row.ok
          ? 'border-border-default bg-bg-base/40'
          : 'border-border-subtle bg-bg-base/20 opacity-60'
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-lg">{icon}</span>
        <span className="font-display tracking-[0.04em] text-sm text-text-primary uppercase flex-1">
          {row.chain_label}
        </span>
        <span className="font-display tracking-[0.04em] text-xs text-gold">
          {amountUsdc} USDC →{' '}
          {row.to_amount_usdc != null
            ? `${row.to_amount_usdc.toFixed(2)} SOL-USDC`
            : '—'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="DURATION" value={formatDuration(row.duration_seconds)} />
        <Stat label="FEE" value={formatUsd(row.bridge_fee_usd)} />
        <Stat label="VIA" value={row.route_provider ?? '—'} />
      </div>
      {!row.ok && row.error && (
        <p className="mt-1.5 text-[10px] text-red-alert/80 truncate">
          {row.error}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border-subtle bg-bg-base/40 py-1.5">
      <div className="font-display tracking-[0.08em] text-[9px] text-text-muted">
        {label}
      </div>
      <div className="font-display tracking-[0.04em] text-xs text-text-primary truncate px-1">
        {value}
      </div>
    </div>
  );
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

function formatUsd(usd: number | null): string {
  if (usd == null) return '—';
  return `$${usd.toFixed(2)}`;
}
