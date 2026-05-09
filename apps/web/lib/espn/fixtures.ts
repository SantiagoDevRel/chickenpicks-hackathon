// Server-side helper for ESPN's public soccer scoreboard endpoint.
//
// Endpoint contract:
//   GET https://site.api.espn.com/apis/site/v2/sports/soccer/{leagueSlug}/scoreboard?dates=YYYYMMDD-YYYYMMDD
//
// The site API is open (no key, no auth header). It returns a payload with an
// `events[]` array; each event has a `competitions[0].competitors[]` pair with
// `homeAway` discriminator and a `status.type.state` enum ('pre' / 'in' / 'post').
//
// We normalize that into a flat Fixture shape the rest of the app consumes —
// callers should never have to reach into ESPN's nested objects directly.

export type FixtureStatus = 'pre' | 'in' | 'post';

export type Fixture = {
  /** ESPN event id, opaque string. */
  id: string;
  /** ISO-8601 kickoff timestamp. */
  scheduledAt: string;
  /** Short display name preferred (e.g. "Real Madrid"); falls back to full name. */
  homeTeam: string;
  awayTeam: string;
  /** Optional logo URLs from ESPN's CDN. */
  homeLogo?: string;
  awayLogo?: string;
  /** Match lifecycle: pre = scheduled, in = live, post = finished. */
  status: FixtureStatus;
};

// --- Internal types matching the relevant slice of ESPN's response ----------

type EspnTeam = {
  displayName?: string;
  shortDisplayName?: string;
  logo?: string;
};

type EspnCompetitor = {
  homeAway?: 'home' | 'away';
  team?: EspnTeam;
};

type EspnCompetition = {
  competitors?: EspnCompetitor[];
};

type EspnStatus = {
  type?: { state?: string };
};

type EspnEvent = {
  id?: string;
  date?: string;
  competitions?: EspnCompetition[];
  status?: EspnStatus;
};

type EspnScoreboard = {
  events?: EspnEvent[];
};

// --- Helpers -----------------------------------------------------------------

/** Format a Date as YYYYMMDD in UTC — ESPN's expected query param format. */
function formatDate(d: Date): string {
  const yyyy = d.getUTCFullYear().toString().padStart(4, '0');
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = d.getUTCDate().toString().padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function pickName(team: EspnTeam | undefined): string {
  return team?.shortDisplayName ?? team?.displayName ?? 'TBD';
}

function normalizeStatus(state: string | undefined): FixtureStatus {
  if (state === 'in') return 'in';
  if (state === 'post') return 'post';
  // Default everything else (including unknown values) to 'pre' — the picker
  // treats that as "scheduled, can be picked".
  return 'pre';
}

// --- Public API --------------------------------------------------------------

/**
 * Fetch fixtures from ESPN for the given league and date range.
 *
 * @param leagueSlug ESPN league slug (e.g. "eng.1", "uefa.champions").
 * @param fromDate Inclusive start (UTC date).
 * @param toDate Inclusive end (UTC date).
 *
 * Throws if ESPN responds with a non-2xx status. Returns an empty array if
 * ESPN responds 200 with no events (common when the date range is empty).
 */
export async function fetchFixtures(
  leagueSlug: string,
  fromDate: Date,
  toDate: Date,
): Promise<Fixture[]> {
  const dates = `${formatDate(fromDate)}-${formatDate(toDate)}`;
  const url =
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(leagueSlug)}/scoreboard` +
    `?dates=${dates}`;

  const res = await fetch(url, {
    // ESPN's response varies frequently for live events; don't cache.
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`ESPN scoreboard ${leagueSlug} ${dates} failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as EspnScoreboard;
  const events = data.events ?? [];

  const fixtures: Fixture[] = [];
  for (const ev of events) {
    if (!ev.id || !ev.date) continue;
    const competition = ev.competitions?.[0];
    const competitors = competition?.competitors ?? [];

    const home = competitors.find((c) => c.homeAway === 'home');
    const away = competitors.find((c) => c.homeAway === 'away');
    if (!home || !away) continue;

    fixtures.push({
      id: ev.id,
      scheduledAt: ev.date,
      homeTeam: pickName(home.team),
      awayTeam: pickName(away.team),
      homeLogo: home.team?.logo,
      awayLogo: away.team?.logo,
      status: normalizeStatus(ev.status?.type?.state),
    });
  }

  // Stable order: chronological by kickoff. ESPN usually returns this order
  // already but don't rely on it.
  fixtures.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  return fixtures;
}
