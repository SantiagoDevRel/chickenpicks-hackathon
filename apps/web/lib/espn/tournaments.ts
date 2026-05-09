// Static catalogue of tournaments we let users pick from when creating a pool.
// Mirrors the la-polla picker: a small, curated set of leagues that ESPN's
// public site API exposes via stable league slugs.
//
// The slug is what ESPN's scoreboard endpoint expects in the path:
//   https://site.api.espn.com/apis/site/v2/sports/soccer/{leagueSlug}/scoreboard
//
// Logo URLs come from ESPN's own league-logo CDN — same provider we already
// consume for fixtures, so no additional rights/source question.
//
// IMPORTANT: this is the ONLY source of truth for tournament metadata in the
// app. UI labels, logos, and the league slug all live here. Don't duplicate.

export type Tournament = {
  /** Stable, URL-safe id used by the app to reference this tournament. */
  id: string;
  /** Human-readable name shown in the picker. */
  name: string;
  /** ESPN league slug (path segment in the scoreboard URL). */
  leagueSlug: string;
  /** Real tournament logo (ESPN CDN). */
  logoUrl: string;
  /** Emoji fallback when the logo image fails to load. */
  emoji: string;
};

export const TOURNAMENTS: readonly Tournament[] = [
  {
    id: 'world-cup-2026',
    name: 'World Cup 2026',
    leagueSlug: 'fifa.world',
    logoUrl: 'https://a.espncdn.com/i/leaguelogos/soccer/500/4.png',
    emoji: '🏆',
  },
  {
    id: 'champions-league',
    name: 'Champions League',
    leagueSlug: 'uefa.champions',
    logoUrl: 'https://a.espncdn.com/i/leaguelogos/soccer/500/2.png',
    emoji: '⭐',
  },
  {
    id: 'premier-league',
    name: 'Premier League',
    leagueSlug: 'eng.1',
    logoUrl: 'https://a.espncdn.com/i/leaguelogos/soccer/500/23.png',
    emoji: '⚽',
  },
  {
    id: 'la-liga',
    name: 'La Liga',
    leagueSlug: 'esp.1',
    logoUrl: 'https://a.espncdn.com/i/leaguelogos/soccer/500/15.png',
    emoji: '⚽',
  },
  {
    id: 'serie-a',
    name: 'Serie A',
    leagueSlug: 'ita.1',
    logoUrl: 'https://a.espncdn.com/i/leaguelogos/soccer/500/12.png',
    emoji: '⚽',
  },
  {
    id: 'copa-libertadores',
    name: 'Copa Libertadores',
    leagueSlug: 'conmebol.libertadores',
    logoUrl: 'https://a.espncdn.com/i/leaguelogos/soccer/500/58.png',
    emoji: '🏆',
  },
  {
    id: 'copa-sudamericana',
    name: 'Copa Sudamericana',
    leagueSlug: 'conmebol.sudamericana',
    logoUrl: 'https://a.espncdn.com/i/leaguelogos/soccer/500/1208.png',
    emoji: '🥈',
  },
  {
    id: 'liga-betplay',
    name: 'Liga BetPlay',
    leagueSlug: 'col.1',
    logoUrl: 'https://a.espncdn.com/i/leaguelogos/soccer/500/1543.png',
    emoji: '⚽',
  },
] as const;

/**
 * Look up a tournament by its app-side id. Returns undefined if not found —
 * callers should treat that as a 404 / invalid param.
 */
export function getTournament(id: string): Tournament | undefined {
  return TOURNAMENTS.find((t) => t.id === id);
}
