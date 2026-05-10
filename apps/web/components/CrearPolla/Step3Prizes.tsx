'use client';

// Step 3 — entry amount + prize tiers.
// Mirrors la-polla's Step 3: a stack of percentage rows (1°, 2°, 3°, …), an
// "+ Crear otro ganador" button to add tiers up to MAX_PRIZE_TIERS, and a
// running total so the user can see how far they are from 100%.
//
// On-chain rules to obey (see programs/.../instructions/create_polla.rs):
//   - prize_distribution is [u8; 10], sum must be ≤ 100 (the program rejects
//     >100). 5% of the pool is taken as platform fee at settle time, separate
//     from prize_distribution. So a sum of 100 means winners share 95% of the
//     pool (the 5% fee comes off the top before prizes are computed).
//   - Each tier value is u8: 0..=100 — no fractional percentages.

import { MAX_PRIZE_TIERS } from '@chickenpicks/shared';

export type Step3Value = {
  /** USDC entry amount as a string so the user can clear/type freely. */
  entryUsdc: string;
  /** Percentage for each prize tier, length 1..MAX_PRIZE_TIERS. */
  tiers: number[];
};

export function defaultStep3(): Step3Value {
  return {
    entryUsdc: '1',
    tiers: [50, 30, 20], // sensible default for a 3-winner polla
  };
}

const ORDINAL = ['1°', '2°', '3°', '4°', '5°', '6°', '7°', '8°', '9°', '10°'];

export function Step3Prizes({
  value,
  busy,
  error,
  txSig,
  progress,
  onChange,
  onBack,
  onCancel,
  onSubmit,
}: {
  value: Step3Value;
  busy: boolean;
  error: string | null;
  txSig: string | null;
  progress: { current: number; total: number } | null;
  onChange: (v: Step3Value) => void;
  onBack: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const total = value.tiers.reduce((s, n) => s + (Number.isFinite(n) ? n : 0), 0);
  const remaining = 100 - total;
  const exact = total === 100;
  const over = total > 100;

  const entryNum = Number(value.entryUsdc);
  const entryOk = Number.isFinite(entryNum) && entryNum > 0;
  const canSubmit = !busy && entryOk && exact;

  function setTier(idx: number, v: string) {
    const n = v === '' ? 0 : Math.max(0, Math.min(100, Math.floor(Number(v))));
    const next = [...value.tiers];
    next[idx] = Number.isFinite(n) ? n : 0;
    onChange({ ...value, tiers: next });
  }

  function addTier() {
    if (value.tiers.length >= MAX_PRIZE_TIERS) return;
    // Auto-fill remaining if there's room — small UX nicety.
    const auto = remaining > 0 ? remaining : 0;
    onChange({ ...value, tiers: [...value.tiers, auto] });
  }

  function removeTier(idx: number) {
    if (value.tiers.length <= 1) return;
    const next = value.tiers.filter((_, i) => i !== idx);
    onChange({ ...value, tiers: next });
  }

  return (
    <div className="space-y-6">
      {/* Payout at settlement — informational copy */}
      <section className="lp-card p-5 sm:p-6">
        <h2 className="lp-section-title mb-3">Payout</h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          When the pool settles, prizes are distributed on-chain to winners
          based on the percentages below. The platform takes an automatic{' '}
          <span className="text-gold">5% fee</span> on the pot at settle time.
        </p>
      </section>

      {/* Entry amount */}
      <section className="lp-card p-5 sm:p-6">
        <h2 className="lp-section-title mb-3">Entry cost</h2>
        <label className="block">
          <span className="font-display tracking-[0.04em] text-xs text-text-secondary">
            Amount in USDC <span className="text-red-alert">*</span>
          </span>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={value.entryUsdc}
              onChange={(e) =>
                onChange({ ...value, entryUsdc: e.target.value })
              }
              className="flex-1 rounded-md bg-bg-base/60 border border-border-default px-3 py-3 text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none transition"
              placeholder="1.00"
            />
            <span className="font-display tracking-[0.08em] text-xs text-gold">
              USDC
            </span>
          </div>
        </label>
      </section>

      {/* Prize tiers */}
      <section className="lp-card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="lp-section-title">Prizes</h2>
          <span
            className={`font-display tracking-[0.08em] text-xs ${
              exact ? 'text-turf' : over ? 'text-red-alert' : 'text-amber'
            }`}
          >
            {total}%
            {!exact && (
              <span className="ml-2 text-text-muted normal-case font-sans tracking-normal text-xs">
                {over
                  ? `${total - 100}% over`
                  : `${remaining}% to reach 100%`}
              </span>
            )}
          </span>
        </div>

        <ul className="space-y-2">
          {value.tiers.map((tierVal, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-md border border-border-default bg-bg-base/40 px-3 py-2"
            >
              <span className="w-9 font-display tracking-[0.04em] text-sm text-gold">
                {ORDINAL[i] ?? `${i + 1}°`}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                value={Number.isFinite(tierVal) ? tierVal : 0}
                onChange={(e) => setTier(i, e.target.value)}
                className="flex-1 rounded-md bg-bg-card border border-border-default px-3 py-2 text-sm text-text-primary text-right focus:border-gold focus:outline-none"
              />
              <span className="font-display tracking-[0.08em] text-xs text-text-muted">
                %
              </span>
              {value.tiers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTier(i)}
                  aria-label={`Remove tier ${i + 1}`}
                  className="ml-1 text-text-muted hover:text-red-alert transition w-7 h-7 flex items-center justify-center"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>

        {value.tiers.length < MAX_PRIZE_TIERS && (
          <button
            type="button"
            onClick={addTier}
            className="mt-3 w-full rounded-md border border-dashed border-border-default bg-bg-base/20 px-3 py-2.5 font-display tracking-[0.08em] text-xs text-gold hover:border-gold/60 hover:bg-gold/5 transition"
          >
            + ADD ANOTHER WINNER
          </button>
        )}

        <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between">
          <span className="font-display tracking-[0.08em] text-xs text-text-muted">
            TOTAL
          </span>
          <span
            className={`font-display tracking-[0.04em] text-base ${
              exact ? 'text-turf' : over ? 'text-red-alert' : 'text-amber'
            }`}
          >
            {total}%
          </span>
        </div>
      </section>

      {/* Progress (during the add_match × N loop) */}
      {busy && progress && progress.total > 0 && (
        <div className="rounded-md border border-gold/30 bg-gold/5 px-3 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-display tracking-[0.08em] text-[11px] text-gold">
              {progress.current === 0
                ? 'CREATING POOL…'
                : `ADDING MATCH ${progress.current + 1} OF ${progress.total}`}
            </span>
            <span className="font-display tracking-[0.04em] text-[11px] text-text-muted">
              {Math.round((progress.current / progress.total) * 100)}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-bg-base/60 overflow-hidden">
            <div
              className="h-full bg-gold transition-[width] duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] text-text-muted">
            Each match needs its own on-chain account. Don&apos;t close this
            tab until it finishes.
          </p>
        </div>
      )}

      {/* Error / success */}
      {error && (
        <div className="rounded-md border border-red-alert/30 bg-red-alert/10 px-3 py-2">
          <p className="text-xs text-red-alert">{error}</p>
        </div>
      )}
      {txSig && (
        <div className="rounded-md border border-turf/30 bg-turf/10 px-3 py-3">
          <p className="text-xs text-turf font-display tracking-[0.04em]">
            ✓ POOL CREATED. Tx:{' '}
            <a
              href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-gold hover:underline"
            >
              {txSig.slice(0, 12)}…
            </a>
          </p>
        </div>
      )}

      {/* Footer CTAs */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-md border border-border-default bg-bg-card/50 px-3 py-3 font-display tracking-[0.08em] text-xs text-text-muted hover:text-text-primary hover:border-border-strong disabled:opacity-50 transition"
        >
          Cancel
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={busy}
            className="rounded-md border border-border-default bg-bg-card/50 px-4 py-3 font-display tracking-[0.08em] text-xs text-text-muted hover:text-text-primary hover:border-border-strong disabled:opacity-50 transition"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="rounded-md bg-gold px-5 py-3 font-display tracking-[0.08em] text-xs text-black hover:bg-amber disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {busy ? 'CREATING…' : 'Create pool'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Tiny export for the wizard to validate the user's tier shape outside the
// component (e.g. before submit in the parent). The component already enforces
// it visually but the parent should sanity-check too.
export function tiersAreValid(tiers: number[]): boolean {
  if (tiers.length < 1 || tiers.length > MAX_PRIZE_TIERS) return false;
  if (tiers.some((n) => !Number.isInteger(n) || n < 0 || n > 100)) return false;
  const sum = tiers.reduce((a, b) => a + b, 0);
  return sum === 100;
}

