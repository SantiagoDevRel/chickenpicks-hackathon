// GET /api/espn/fixtures?league=<slug>&from=YYYYMMDD&to=YYYYMMDD
//
// Thin proxy over ESPN's public scoreboard endpoint. The /pollas/crear UI hits
// this route to populate the fixture picker — keeping the call server-side
// means we can swap the data source later (or add caching) without touching
// every consumer.
//
// Validation:
//   - league must match one of our supported league slugs (see TOURNAMENTS).
//   - from/to are required, must parse as YYYYMMDD, and to >= from.
//   - the range is capped at 60 days to prevent runaway queries.

import { NextRequest, NextResponse } from 'next/server';
import { fetchFixtures } from '@/lib/espn/fixtures';
import { TOURNAMENTS } from '@/lib/espn/tournaments';

export const dynamic = 'force-dynamic';

// 90 gives the /crear wizard headroom — it paginates in 60-day windows but
// the inclusive-endpoint count makes those windows 61 days each, which used
// to fail validation. ESPN handles ~90-day spans without complaint.
const MAX_RANGE_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

const VALID_SLUGS = new Set(TOURNAMENTS.map((t) => t.leagueSlug));

/** Parse YYYYMMDD into a UTC Date. Returns null if invalid. */
function parseYmd(input: string | null): Date | null {
  if (!input || !/^\d{8}$/.test(input)) return null;
  const year = Number(input.slice(0, 4));
  const month = Number(input.slice(4, 6));
  const day = Number(input.slice(6, 8));
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  // Reject dates that "rolled over" (e.g. 20260230 -> March 2).
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return d;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const league = searchParams.get('league');
  const fromRaw = searchParams.get('from');
  const toRaw = searchParams.get('to');

  if (!league || !VALID_SLUGS.has(league)) {
    return NextResponse.json(
      { error: 'Invalid or missing `league` query param.' },
      { status: 400 },
    );
  }

  const from = parseYmd(fromRaw);
  const to = parseYmd(toRaw);
  if (!from || !to) {
    return NextResponse.json(
      { error: '`from` and `to` must be YYYYMMDD dates.' },
      { status: 400 },
    );
  }

  if (to.getTime() < from.getTime()) {
    return NextResponse.json(
      { error: '`to` must be on or after `from`.' },
      { status: 400 },
    );
  }

  const rangeDays = Math.floor((to.getTime() - from.getTime()) / DAY_MS) + 1;
  if (rangeDays > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { error: `Date range exceeds ${MAX_RANGE_DAYS} days.` },
      { status: 400 },
    );
  }

  try {
    const fixtures = await fetchFixtures(league, from, to);
    return NextResponse.json({ fixtures });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? 'Failed to fetch fixtures from ESPN.' },
      { status: 502 },
    );
  }
}
