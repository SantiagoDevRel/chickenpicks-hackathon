'use client';

// Step 1 — pool name + tournament selection.
// Mirrors la-polla's Step 1: a single text input for the polla name + an 8-row
// list of tournaments rendered as radio cards (emoji + name + filled circle on
// the right when selected).
//
// The "Tipo de polla" copy at the bottom is informational only — every polla
// is invite-link/code based, no public discovery wired in this wizard yet.

import { TOURNAMENTS, type Tournament } from '@/lib/espn/tournaments';

export type Step1Value = {
  name: string;
  tournamentId: string | null;
};

const NAME_BYTE_LIMIT = 32; // matches Rust polla.name [u8; 32]

/** UTF-8 byte length of `s` — used to enforce the 32-byte on-chain cap. */
function byteLen(s: string): number {
  return new TextEncoder().encode(s).length;
}

export function Step1Info({
  value,
  onChange,
  onContinue,
  onCancel,
}: {
  value: Step1Value;
  onChange: (v: Step1Value) => void;
  onContinue: () => void;
  onCancel: () => void;
}) {
  const nameBytes = byteLen(value.name);
  const nameOk = value.name.trim().length > 0 && nameBytes <= NAME_BYTE_LIMIT;
  const tournamentOk = value.tournamentId !== null;
  const canContinue = nameOk && tournamentOk;

  return (
    <div className="space-y-6">
      {/* Información básica */}
      <section className="lp-card p-5 sm:p-6">
        <h2 className="lp-section-title mb-4">Información básica</h2>
        <label className="block">
          <span className="font-display tracking-[0.04em] text-xs text-text-secondary">
            Nombre <span className="text-red-alert">*</span>
          </span>
          <input
            type="text"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder="Ej: Polla Mundial Oficina"
            maxLength={NAME_BYTE_LIMIT * 2}
            className="mt-2 w-full rounded-md bg-bg-base/60 border border-border-default px-3 py-3 text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none transition"
          />
          <div className="mt-1.5 flex items-center justify-between text-[10px]">
            <span className="text-text-muted">
              Máx 32 caracteres (on-chain)
            </span>
            <span
              className={
                nameBytes > NAME_BYTE_LIMIT
                  ? 'text-red-alert'
                  : 'text-text-muted'
              }
            >
              {nameBytes}/{NAME_BYTE_LIMIT}
            </span>
          </div>
        </label>
      </section>

      {/* Torneos */}
      <section className="lp-card p-5 sm:p-6">
        <h2 className="lp-section-title mb-4">
          Torneos <span className="text-red-alert">*</span>
        </h2>
        <ul className="space-y-2.5">
          {TOURNAMENTS.map((t) => (
            <TournamentRadio
              key={t.id}
              tournament={t}
              selected={value.tournamentId === t.id}
              onSelect={() => onChange({ ...value, tournamentId: t.id })}
            />
          ))}
        </ul>
      </section>

      {/* Tipo de polla — informational copy only */}
      <section className="lp-card p-5 sm:p-6">
        <h2 className="lp-section-title mb-3">Tipo de polla</h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          Solo personas con el link o el código de invitación podrán unirse a tu
          polla.
        </p>
      </section>

      {/* Footer CTAs */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border-default bg-bg-card/50 backdrop-blur px-5 py-3 font-display tracking-[0.08em] text-xs text-text-muted hover:text-text-primary hover:border-border-strong transition"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="rounded-md bg-gold px-6 py-3 font-display tracking-[0.08em] text-xs text-black hover:bg-amber disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Continuar →
        </button>
      </div>
    </div>
  );
}

function TournamentRadio({
  tournament,
  selected,
  onSelect,
}: {
  tournament: Tournament;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`w-full flex items-center gap-3 rounded-md border px-4 py-3.5 transition ${
          selected
            ? 'border-gold bg-gold/10'
            : 'border-border-default bg-bg-base/40 hover:border-border-strong'
        }`}
      >
        <span className="text-xl leading-none">{tournament.emoji}</span>
        <span
          className={`flex-1 text-left font-display tracking-[0.04em] text-sm uppercase ${
            selected ? 'text-text-primary' : 'text-text-secondary'
          }`}
        >
          {tournament.name}
        </span>
        <span
          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition ${
            selected
              ? 'border-gold bg-gold'
              : 'border-border-default bg-transparent'
          }`}
        >
          {selected && (
            <span className="h-2 w-2 rounded-full bg-black"></span>
          )}
        </span>
      </button>
    </li>
  );
}
