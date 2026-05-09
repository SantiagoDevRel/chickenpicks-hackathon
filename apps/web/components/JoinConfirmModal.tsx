'use client';

import { useEffect, useState } from 'react';
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/paymentMethods';

export type JoinConfirmState =
  | { kind: 'idle' }
  | {
      kind: 'open';
      poolName: string;
      entryUsdc: string;
      tournament: string;
      preselectedMethodId?: string;
    }
  | { kind: 'busy' }
  | {
      kind: 'error';
      poolName: string;
      entryUsdc: string;
      tournament: string;
      message: string;
      preselectedMethodId?: string;
    };

export function JoinConfirmModal({
  state,
  onConfirm,
  onCancel,
}: {
  state: JoinConfirmState;
  onConfirm: (methodId: string) => void;
  onCancel: () => void;
}) {
  // Default-select the first available method, but let voice pre-select
  // by passing preselectedMethodId in the state.
  const initialId =
    (state.kind === 'open' || state.kind === 'error'
      ? state.preselectedMethodId
      : null) ?? PAYMENT_METHODS.find((m) => m.available)?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(initialId);

  useEffect(() => {
    if (state.kind === 'open' || state.kind === 'error') {
      setSelectedId(
        state.preselectedMethodId ??
          PAYMENT_METHODS.find((m) => m.available)?.id ??
          null,
      );
    }
  }, [state]);

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
  const selected = selectedId
    ? PAYMENT_METHODS.find((m) => m.id === selectedId)
    : null;
  const canConfirm = !busy && selected?.available === true;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur flex items-center justify-center p-4 animate-fade-in"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="lp-card-hero max-w-lg w-full p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pollitos/pollito_capitan_lider.webp"
            alt=""
            width={56}
            height={56}
            className="drop-shadow-[0_4px_12px_rgba(255,215,0,0.3)]"
          />
          <div className="flex-1">
            <h2 className="font-display tracking-[0.04em] text-xl text-gold uppercase leading-none">
              Pay & Join
            </h2>
            <p className="text-[11px] text-text-muted mt-1">
              Pick how you want to pay the entry
            </p>
          </div>
        </div>

        <div className="rounded-md bg-bg-base/60 border border-border-subtle p-3 mb-4 text-center">
          <div className="font-display tracking-[0.04em] text-base text-text-primary uppercase">
            {data.poolName}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5 mb-2">
            {data.tournament}
          </div>
          <div className="font-display tracking-[0.08em] text-[10px] text-text-muted">
            ENTRY
          </div>
          <div className="font-display tracking-[0.04em] text-2xl text-gold leading-none">
            {data.entryUsdc}
            <span className="text-xs text-text-muted ml-1">USDC</span>
          </div>
        </div>

        <div className="font-display tracking-[0.08em] text-[10px] text-text-muted mb-2">
          PAYMENT METHOD
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4 max-h-[280px] overflow-y-auto">
          {PAYMENT_METHODS.map((m) => (
            <PaymentCard
              key={m.id}
              method={m}
              selected={m.id === selectedId}
              onSelect={() => m.available && setSelectedId(m.id)}
            />
          ))}
        </div>

        {selected && !selected.available && (
          <div className="rounded-md bg-amber/10 border border-amber/30 px-3 py-2 mb-4">
            <p className="text-xs text-amber">
              {selected.chainName} {selected.label} bridging is coming soon via
              LI.FI. Pick Solana for now to confirm.
            </p>
          </div>
        )}

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
            onClick={() => selectedId && onConfirm(selectedId)}
            disabled={!canConfirm}
            className="flex-1 rounded-md bg-gold px-4 py-2.5 font-display tracking-[0.08em] text-xs text-black hover:bg-amber disabled:opacity-50 transition"
          >
            {busy ? 'JOINING…' : 'CONFIRM & SIGN'}
          </button>
        </div>

        <p className="mt-3 text-center text-[10px] font-display tracking-[0.08em] text-text-muted">
          ESC TO CANCEL
        </p>
      </div>
    </div>
  );
}

function PaymentCard({
  method,
  selected,
  onSelect,
}: {
  method: PaymentMethod;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={!method.available}
      className={`text-left rounded-md p-2.5 border transition ${
        selected && method.available
          ? 'border-gold bg-gold/10'
          : method.available
            ? 'border-border-default bg-bg-base/40 hover:border-border-strong'
            : 'border-border-subtle bg-bg-base/20 opacity-50 cursor-not-allowed'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="text-2xl leading-none mt-0.5">{method.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-display tracking-[0.04em] text-xs text-text-primary uppercase">
            {method.label} on {method.chainName}
          </div>
          <div className="text-[10px] text-text-muted mt-0.5 leading-tight">
            {method.description}
          </div>
        </div>
      </div>
      <div className="mt-1.5 font-display tracking-[0.08em] text-[9px]">
        {method.available ? (
          <span className="text-turf">✓ AVAILABLE</span>
        ) : (
          <span className="text-text-muted">🔒 COMING SOON</span>
        )}
      </div>
    </button>
  );
}
