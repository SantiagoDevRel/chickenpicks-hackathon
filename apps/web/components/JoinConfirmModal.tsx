'use client';

import { useEffect } from 'react';

export type JoinConfirmState =
  | { kind: 'idle' }
  | { kind: 'open'; poolName: string; entryUsdc: string; tournament: string }
  | { kind: 'busy' }
  | {
      kind: 'error';
      poolName: string;
      entryUsdc: string;
      tournament: string;
      message: string;
    };

export function JoinConfirmModal({
  state,
  onConfirm,
  onCancel,
}: {
  state: JoinConfirmState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (state.kind !== 'open' && state.kind !== 'error') return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state.kind, onCancel]);

  if (state.kind === 'idle') return null;

  const data =
    state.kind === 'open' || state.kind === 'error'
      ? state
      : { poolName: '', entryUsdc: '', tournament: '' };
  const busy = state.kind === 'busy';
  const error = state.kind === 'error' ? state.message : null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur flex items-center justify-center p-4 animate-fade-in"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="lp-card-hero max-w-md w-full p-6 animate-slide-up text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pollitos/pollito_capitan_lider.webp"
          alt=""
          width={80}
          height={80}
          className="mx-auto mb-4 drop-shadow-[0_4px_12px_rgba(255,215,0,0.3)]"
        />

        <h2 className="font-display tracking-[0.04em] text-xl text-gold uppercase">
          Join Pool
        </h2>
        <p className="text-[11px] text-text-muted mt-1 mb-5">
          Voice asked to enter this pool — confirm to sign and pay.
        </p>

        <div className="rounded-md bg-bg-base/60 border border-border-subtle p-4 mb-5">
          <div className="font-display tracking-[0.04em] text-lg text-text-primary uppercase mb-1">
            {data.poolName}
          </div>
          <div className="text-xs text-text-muted mb-3">{data.tournament}</div>
          <div className="font-display tracking-[0.08em] text-[10px] text-text-muted mb-1">
            ENTRY
          </div>
          <div className="font-display tracking-[0.04em] text-3xl text-gold">
            {data.entryUsdc}
            <span className="text-xs text-text-muted ml-2">USDC</span>
          </div>
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
            {busy ? 'JOINING…' : 'CONFIRM & SIGN'}
          </button>
        </div>

        <p className="mt-3 text-[10px] font-display tracking-[0.08em] text-text-muted">
          ESC TO CANCEL
        </p>
      </div>
    </div>
  );
}
