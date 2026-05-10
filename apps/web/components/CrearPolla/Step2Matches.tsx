'use client';

// Step 2 — pick fixtures from the selected tournament.
//
// Calls /api/espn/fixtures?league=<slug>&from=YYYYMMDD&to=YYYYMMDD on mount.
// Range is fixed at today → +365 days (paginated under the hood).
// MAX_MATCHES is the silent on-chain hard cap from constants.rs (256 — the
// max scores array that fits in a single submit_prediction tx). UI never
// surfaces the number to the user.

import { useEffect, useMemo, useState } from 'react';
import { MAX_MATCHES } from '@chickenpicks/shared';
import {
  TOURNAMENTS,
  getTournament,
  type Tournament,
} from '@/lib/espn/tournaments';
import type { Fixture } from '@/lib/espn/fixtures';

export type Step2Value = {
  /** Fixture ids the user has selected. Silent cap at MAX_MATCHES. */
  selected: Fixture[];
};

// --- Date helpers -------------------------------------------------------------

function ymdCompact(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
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
  return { selected: [] };
}

/**
 * Fetch upcoming fixtures across a long horizon by paginating the API in
 * 60-day windows (the route caps a single call at 60).
 */
async function fetchUpcoming(slug: string, days = 365): Promise<Fixture[]> {
  const acc: Fixture[] = [];
  for (let offset = 0; offset < days; offset += 60) {
    const span = Math.min(60, days - offset);
    const from = ymdCompact(offset);
    const to = ymdCompact(offset + span);
    const url = `/api/espn/fixtures?league=${encodeURIComponent(slug)}&from=${from}&to=${to}`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const j = (await res.json()) as { fixtures?: Fixture[] };
      if (j.fixtures) acc.push(...j.fixtures);
    } catch {
      // ignore individual window errors; keep what we have so far.
    }
  }
  // De-dup by id and sort by date.
  const dedup = new Map<string, Fixture>();
  for (const f of acc) dedup.set(f.id, f);
  const out = Array.from(dedup.values());
  out.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  return out.filter((f) => f.status !== 'post');
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

  // Fetch whenever league changes.
  useEffect(() => {
    if (!tournament) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const upcoming = await fetchUpcoming(tournament!.leagueSlug);
        if (cancelled) return;
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
  }, [tournament]);

  const selectedIds = useMemo(
    () => new Set(value.selected.map((f) => f.id)),
    [value.selected],
  );

  function toggleFixture(f: Fixture) {
    const isSelected = selectedIds.has(f.id);
    if (isSelected) {
      onChange({
        selected: value.selected.filter((x) => x.id !== f.id),
      });
    } else {
      if (value.selected.length >= MAX_MATCHES) return;
      onChange({ selected: [...value.selected, f] });
    }
  }

  function selectAll() {
    if (!fixtures) return;
    const trimmed = fixtures.slice(0, MAX_MATCHES);
    onChange({ selected: trimmed });
  }

  function clearAll() {
    onChange({ selected: [] });
  }

  const canContinue = value.selected.length >= 1;

  // Group fixtures by month for easier scanning of long lists (World Cup,
  // Champions League knockouts, etc.). MUST be declared before any
  // conditional return — Hooks rules.
  const byMonth = useMemo(() => {
    if (!fixtures) return [];
    const groups = new Map<string, Fixture[]>();
    for (const f of fixtures) {
      const key = new Date(f.scheduledAt).toLocaleString(undefined, {
        month: 'long',
        year: 'numeric',
      });
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(f);
    }
    return Array.from(groups.entries());
  }, [fixtures]);

  if (!tournament) {
    return (
      <div className="lp-card p-6 text-center">
        <p className="text-red-alert text-sm">
          Invalid tournament — go back to step 1.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 rounded-md border border-border-default bg-bg-card/50 px-4 py-2 font-display tracking-[0.08em] text-xs text-text-muted hover:text-text-primary"
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header — selected tournament + selection counter */}
      <section className="lp-card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tournament.logoUrl}
            alt=""
            width={40}
            height={40}
            className="flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="font-display tracking-[0.08em] text-xs text-text-muted">
              TOURNAMENT
            </div>
            <div className="font-display tracking-[0.04em] text-base text-text-primary uppercase truncate">
              {tournament.name}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display tracking-[0.08em] text-xs text-text-muted">
              PICKED
            </div>
            <div className="font-display tracking-[0.04em] text-lg text-gold">
              {value.selected.length}
            </div>
          </div>
        </div>
      </section>

      {/* Fixture list grouped by month */}
      <section className="lp-card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h2 className="lp-section-title">Upcoming matches</h2>
          {!loading && fixtures && fixtures.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="rounded-md border border-gold/40 bg-gold/10 px-3 py-1.5 font-display tracking-[0.06em] text-xs text-gold hover:bg-gold/20 transition"
              >
                SELECT ALL
              </button>
              {value.selected.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-md border border-border-default bg-bg-card/50 px-3 py-1.5 font-display tracking-[0.06em] text-xs text-text-muted hover:text-text-primary transition"
                >
                  CLEAR
                </button>
              )}
            </div>
          )}
        </div>

        {loading && (
          <p className="text-text-muted text-sm font-display tracking-[0.08em] text-center py-8">
            LOADING FIXTURES…
          </p>
        )}

        {!loading && error && (
          <div className="rounded-md border border-red-alert/30 bg-red-alert/5 p-3">
            <p className="text-xs text-red-alert">
              Couldn&apos;t fetch fixtures: {error}
            </p>
          </div>
        )}

        {!loading && !error && fixtures && fixtures.length === 0 && (
          <div className="text-center py-8">
            <p className="text-text-muted text-sm">
              No upcoming matches in this tournament.
            </p>
          </div>
        )}

        {!loading && !error && fixtures && fixtures.length > 0 && (
          <div className="space-y-5">
            {byMonth.map(([month, list]) => (
              <div key={month}>
                <div className="font-display tracking-[0.08em] text-xs text-text-muted uppercase mb-2">
                  {month}
                </div>
                <ul className="space-y-2">
                  {list.map((f) => (
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
              </div>
            ))}
          </div>
        )}

      </section>

      {/* Footer CTAs */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-border-default bg-bg-card/50 backdrop-blur px-4 py-3 font-display tracking-[0.08em] text-xs text-text-muted hover:text-text-primary hover:border-border-strong transition"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="rounded-md bg-gold px-6 py-3 font-display tracking-[0.08em] text-xs text-black hover:bg-amber disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Continue →
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

        <span className="font-display text-text-muted text-xs tracking-[0.08em]">
          VS
        </span>

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
      <div className="mt-1 text-xs text-text-muted font-display tracking-[0.04em] uppercase pl-3">
        {formatKickoff(fixture.scheduledAt)}
        {fixture.status === 'in' && (
          <span className="ml-2 text-amber">· LIVE</span>
        )}
      </div>
    </li>
  );
}

export { TOURNAMENTS };
