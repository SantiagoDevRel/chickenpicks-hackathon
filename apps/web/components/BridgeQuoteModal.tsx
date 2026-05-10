'use client';

// BridgeQuoteModal — visual surface for the voice agent's preview_bridge_quote
// tool. When the agent quotes a bridge from chain X → Solana USDC, we open
// this modal instead of the agent rambling raw numbers. Includes a single
// "Use Solana USDC devnet" CTA that collapses the conversation back to the
// happy path (we only support devnet today, so EVM bridges are aspirational).

import { useEffect } from 'react';
import {
  useBridgeQuote,
  useSetBridgeQuote,
  type BridgeQuoteData,
} from '@/lib/VoiceContext';

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
  const { data } = state;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur flex items-center justify-center p-4 animate-fade-in"
      onClick={() => setState({ kind: 'idle' })}
    >
      <div
        className="lp-card-hero max-w-md w-full p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl">🌉</div>
          <div className="flex-1">
            <h2 className="font-display tracking-[0.04em] text-xl text-gold uppercase leading-none">
              Bridge quote
            </h2>
            <p className="text-[11px] text-text-muted mt-1">
              Powered by LI.FI
            </p>
          </div>
        </div>

        <div className="rounded-md bg-bg-base/60 border border-border-subtle p-3 mb-4 grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="font-display tracking-[0.08em] text-[10px] text-text-muted">
              FROM
            </div>
            <div className="font-display tracking-[0.04em] text-base text-text-primary uppercase">
              {data.fromChain}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              {data.amountUsdc} USDC
            </div>
          </div>
          <div>
            <div className="font-display tracking-[0.08em] text-[10px] text-text-muted">
              TO
            </div>
            <div className="font-display tracking-[0.04em] text-base text-gold uppercase">
              Solana
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              USDC (devnet)
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <QuoteStat
            label="DURATION"
            value={
              data.durationSeconds != null
                ? formatDuration(data.durationSeconds)
                : '—'
            }
          />
          <QuoteStat
            label="FEE"
            value={data.feeUsd != null ? `$${data.feeUsd.toFixed(2)}` : '—'}
          />
          <QuoteStat label="VIA" value={data.provider ?? '—'} />
        </div>

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

function QuoteStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border-subtle bg-bg-base/40 p-2.5 text-center">
      <div className="font-display tracking-[0.08em] text-[9px] text-text-muted">
        {label}
      </div>
      <div className="font-display tracking-[0.04em] text-sm text-text-primary mt-0.5 truncate">
        {value}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

// Helper to map raw LI.FI quote payload → modal-friendly shape.
// Keeps the modal dumb and the parsing logic in one place.
export function buildBridgeQuoteData(
  fromChainId: number,
  fromChainLabel: string,
  amountUsdc: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any,
): BridgeQuoteData {
  return {
    fromChain: fromChainLabel,
    fromChainId,
    amountUsdc,
    toChain: 'Solana',
    toToken: 'USDC',
    durationSeconds:
      typeof raw?.estimated_duration_seconds === 'number'
        ? raw.estimated_duration_seconds
        : typeof raw?.estimate?.executionDuration === 'number'
          ? raw.estimate.executionDuration
          : null,
    feeUsd:
      typeof raw?.fee_usd === 'number'
        ? raw.fee_usd
        : typeof raw?.estimate?.feeCosts?.[0]?.amountUSD === 'string'
          ? Number(raw.estimate.feeCosts[0].amountUSD)
          : null,
    provider: raw?.provider ?? raw?.toolDetails?.name ?? raw?.tool ?? null,
  };
}
