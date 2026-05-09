'use client';

// Step 2 — pick fixtures from the selected tournament.
// Calls /api/espn/fixtures?league=<slug>&from=YYYYMMDD&to=YYYYMMDD on mount
// (and whenever the date range or tournament changes). Default range is
// today → +30 days; user can widen up to the API cap of 60 days.
//
// MAX_MATCHES is the on-chain hard cap from constants.rs (10). We enforce it
// client-side to give immediate feedback — but the on-chain instruction will
// reject anything over that anyway.

import { useEffect, useMemo, useState } from 'react';
import { MAX_MATCHES } from '@chickenpicks/shared';
import {
  TOURNAMENTS,
  getTournament,
  type Tournament,
} from '@/lib/espn/tournaments';
import type { Fixture } from '@/lib/espn/fixtures';

export type Step2Value = {
  /** Fixture ids the user has selected. We enforce MAX_MATCHES (10). */
  selected: Fixture[];
  /** Date range used to query fixtures. Persisted across step transitions. */
  fromYmd: string; // YYYY-MM-DD (input[type=date] format)
  toYmd: string;
};

// --- Date helpers -------------------------------------------------------------

function ymdToday(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Convert YYYY-MM-DD (HTML date input) → YYYYMMDD (ESPN/our API). */
function dashedToCompact(ymd: string): string {
  return ymd.replace(/-/g, '');
}

function formatKickoff(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Default Step 2 starting state — used by the parent wizard the first time. */
export function defaultStep2(): Step2Value {
  return {
    selected: [],
    fromYmd: ymdToday(0),
    toYmd: ymdToday(30),
  };
}

export function Step2Matches({
  tournamentId,
  value,
  onChange,
  onBack,
  onContinue,
}: {
  tournamentId: string;
  value: Step2Value;
  onChange: (v: Step2Value) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const tournament: Tournament | undefined = getTournament(tournamentId);
  const [fixtures, setFixtures] = useState<Fixture[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch whenever league or date range changes.
  useEffect(() => {
    if (!tournament) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const url =
          `/api/espn/fixtures?league=${encodeURIComponent(tournament!.leagueSlug)}` +
          `&from=${dashedToCompact(value.fromYmd)}` +
          `&to=${dashedToCompact(value.toYmd)}`;
        const res = await fetch(url, { cache: 'no-store' });
        const j = (await res.json()) as { fixtures?: Fixture[]; error?: string };
        if (cancelled) return;
        if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
        // Filter out finished matches from the picker — there's nothing to
        // predict. Keep "pre" (scheduled) and "in" (live, edge case). We hide
        // 'post' which avoids users accidentally locking a settled match.
        const upcoming = (j.fixtures ?? []).filter((f) => f.status !== 'post');
        setFixtures(upcoming);
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setFixtures([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [tournament, value.fromYmd, value.toYmd]);

  // Selected ids for fast lookup in the render loop.
  const selectedIds = useMemo(
    () => new Set(value.selected.map((f) => f.id)),
    [value.selected],
  );

  function toggleFixture(f: Fixture) {
    const isSelected = selectedIds.has(f.id);
    if (isSelected) {
      onChange({
        ...value,
        selected: value.selected.filter((x) => x.id !== f.id),
      });
    } else {
      if (value.selected.length >= MAX_MATCHES) return;
      onChange({ ...value, selected: [...value.selected, f] });
    }
  }

  const canContinue = value.selected.length >= 1;

  if (!tournament) {
    return (
      <div className="lp-card p-6 text-center">
        <p className="text-red-alert text-sm">
          Torneo inválido. Volvé al paso anterior.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 rounded-md border border-border-default bg-bg-card/50 px-4 py-2 font-display tracking-[0.08em] text-xs text-text-muted hover:text-text-primary"
        >
          ← Atrás
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header — selected tournament + selection counter */}
      <section className="lp-card p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl leading-none">{tournament.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="font-display tracking-[0.08em] text-[10px] text-text-muted">
              TORNEO
            </div>
            <div className="font-display tracking-[0.04em] text-base text-text-primary uppercase truncate">
              {tournament.name}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display tracking-[0.08em] text-[10px] text-text-muted">
              SELECCIONADOS
            </div>
            <div
              className={`font-display tracking-[0.04em] text-lg ${
                value.selected.length >= MAX_MATCHES
                  ? 'text-amber'
                  : 'text-gold'
              }`}
            >
              {value.selected.length}
              <span className="text-text-muted text-sm">/{MAX_MATCHES}</span>
            </div>
          </div>
        </div>

        {/* Date range pickers */}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="font-display tracking-[0.08em] text-[10px] text-text-muted">
              DESDE
            </span>
            <input
              type="date"
              value={value.fromYmd}
              max={value.toYmd}
              onChange={(e) =>
                onChange({ ...value, fromYmd: e.target.value, selected: [] })
              }
              className="mt-1 w-full rounded-md bg-bg-base/60 border border-border-default px-3 py-2 text-sm text-text-primary focus:border-gold focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="font-display tracking-[0.08em] text-[10px] text-text-muted">
              HASTA
            </span>
            <input
              type="date"
              value={value.toYmd}
              min={value.fromYmd}
              onChange={(e) =>
                onChange({ ...value, toYmd: e.target.value, selected: [] })
              }
              className="mt-1 w-full rounded-md bg-bg-base/60 border border-border-default px-3 py-2 text-sm text-text-primary focus:border-gold focus:outline-none"
            />
          </label>
        </div>
      </section>

      {/* Fixture list */}
      <section className="lp-card p-5 sm:p-6">
        <h2 className="lp-section-title mb-4">Partidos</h2>

        {loading && (
          <p className="text-text-muted text-sm font-display tracking-[0.08em] text-center py-8">
            CARGANDO PARTIDOS…
          </p>
        )}

        {!loading && error && (
          <div className="rounded-md border border-red-alert/30 bg-red-alert/5 p-3">
            <p className="text-xs text-red-alert">No pude traer fixtures: {error}</p>
          </div>
        )}

        {!loading && !error && fixtures && fixtures.length === 0 && (
          <div className="text-center py-8">
            <p className="text-text-muted text-sm">
              No hay partidos en este rango. Probá ampliando las fechas.
            </p>
          </div>
        )}

        {!loading && !error && fixtures && fixtures.length > 0 && (
          <ul className="space-y-2">
            {fixtures.map((f) => (
              <FixtureCard
                key={f.id}
                fixture={f}
                selected={selectedIds.has(f.id)}
                disabled={
                  !selectedIds.has(f.id) &&
                  value.selected.length >= MAX_MATCHES
                }
                onToggle={() => toggleFixture(f)}
              />
            ))}
          </ul>
        )}

        {value.selected.length >= MAX_MATCHES && (
          <p className="mt-3 text-[11px] text-amber font-display tracking-[0.04em]">
            Máximo {MAX_MATCHES} partidos por polla. Deseleccioná uno para
            cambiar.
          </p>
        )}
      </section>

      {/* Footer CTAs */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-border-default bg-bg-card/50 backdrop-blur px-4 py-3 font-display tracking-[0.08em] text-xs text-text-muted hover:text-text-primary hover:border-border-strong transition"
          >
            ← Atrás
          </button>
        </div>
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

function FixtureCard({
  fixture,
  selected,
  disabled,
  onToggle,
}: {
  fixture: Fixture;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`w-full flex items-center gap-3 rounded-md border px-3 py-3 text-left transition ${
          selected
            ? 'border-gold bg-gold/10'
            : disabled
              ? 'border-border-subtle bg-bg-base/20 opacity-50 cursor-not-allowed'
              : 'border-border-default bg-bg-base/40 hover:border-border-strong'
        }`}
      >
        {/* Home */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {fixture.homeLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fixture.homeLogo}
              alt=""
              width={20}
              height={20}
              className="flex-shrink-0"
            />
          )}
          <span className="font-display tracking-[0.04em] text-xs uppercase text-text-primary truncate">
            {fixture.homeTeam}
          </span>
        </div>

        <span className="font-display text-text-muted text-[10px] tracking-[0.08em]">
          VS
        </span>

        {/* Away */}
        <div className="flex-1 flex items-center gap-2 min-w-0 justify-end">
          <span className="font-display tracking-[0.04em] text-xs uppercase text-text-primary truncate text-right">
            {fixture.awayTeam}
          </span>
          {fixture.awayLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fixture.awayLogo}
              alt=""
              width={20}
              height={20}
              className="flex-shrink-0"
            />
          )}
        </div>

        {/* Selection circle + kickoff time */}
        <div className="flex flex-col items-end gap-1 ml-1 flex-shrink-0">
          <span
            className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition ${
              selected
                ? 'border-gold bg-gold'
                : 'border-border-default bg-transparent'
            }`}
          >
            {selected && <span className="h-2 w-2 rounded-full bg-black"></span>}
          </span>
        </div>
      </button>
      <div className="mt-1 text-[10px] text-text-muted font-display tracking-[0.04em] uppercase pl-3">
        {formatKickoff(fixture.scheduledAt)}
        {fixture.status === 'in' && (
          <span className="ml-2 text-amber">· EN VIVO</span>
        )}
      </div>
    </li>
  );
}

// Re-export TOURNAMENTS so the wizard can iterate without re-importing.
export { TOURNAMENTS };
