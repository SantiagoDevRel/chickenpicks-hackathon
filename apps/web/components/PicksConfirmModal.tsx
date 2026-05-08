'use client';

import { useEffect } from 'react';

export type ProposedPick = {
  matchIndex: number;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
};

export type ConfirmState =
  | { kind: 'idle' }
  | { kind: 'open'; picks: ProposedPick[] }
  | { kind: 'busy' }
  | { kind: 'error'; picks: ProposedPick[]; message: string };

export function PicksConfirmModal({
  state,
  onConfirm,
  onCancel,
}: {
  state: ConfirmState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Esc closes
  useEffect(() => {
    if (state.kind !== 'open' && state.kind !== 'error') return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state.kind, onCancel]);

  if (state.kind === 'idle') return null;

  const picks =
    state.kind === 'open' || state.kind === 'error' ? state.picks : [];
  const busy = state.kind === 'busy';
  const error = state.kind === 'error' ? state.message : null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur flex items-center justify-center p-4 animate-fade-in"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="lp-card-hero max-w-md w-full p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pollitos/pollito_capitan_lider.webp"
            alt=""
            width={48}
            height={48}
          />
          <div>
            <h2 className="font-display tracking-[0.04em] text-xl text-gold uppercase leading-none">
              Confirm picks
            </h2>
            <p className="text-[11px] text-text-muted mt-1">
              Voice heard these scores. Confirm to sign on-chain.
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-5">
          {picks.map((p) => (
            <div
              key={p.matchIndex}
              className="flex items-center justify-between rounded-md bg-bg-base/60 border border-border-subtle px-3 py-2"
            >
              <span className="flex-1 text-right font-display tracking-[0.04em] text-sm uppercase text-text-secondary">
                {p.home}
              </span>
              <span className="px-3 font-display tracking-[0.04em] text-lg text-gold">
                {p.homeScore} - {p.awayScore}
              </span>
              <span className="flex-1 text-left font-display tracking-[0.04em] text-sm uppercase text-text-secondary">
                {p.away}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded-md bg-red-alert/10 border border-red-alert/30 px-3 py-2 mb-4">
            <p className="text-xs text-red-alert">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-md border border-border-default bg-bg-card/50 backdrop-blur px-4 py-2.5 font-display tracking-[0.08em] text-xs text-text-muted hover:text-text-primary hover:border-border-strong disabled:opacity-50 transition"
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 rounded-md bg-gold px-4 py-2.5 font-display tracking-[0.08em] text-xs text-black hover:bg-amber disabled:opacity-50 transition"
          >
            {busy ? 'SIGNING…' : 'CONFIRM & SIGN'}
          </button>
        </div>

        <p className="mt-3 text-center text-[10px] font-display tracking-[0.08em] text-text-muted">
          ESC TO CANCEL
        </p>
      </div>
    </div>
  );
}
