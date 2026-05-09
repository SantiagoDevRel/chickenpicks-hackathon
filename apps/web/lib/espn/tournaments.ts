// Static catalogue of tournaments we let users pick from when creating a polla.
// Mirrors the la-polla picker: a small, curated set of leagues that ESPN's
// public site API exposes via stable league slugs.
//
// The slug is what ESPN's scoreboard endpoint expects in the path:
//   https://site.api.espn.com/apis/site/v2/sports/soccer/{leagueSlug}/scoreboard
//
// IMPORTANT: this is the ONLY source of truth for tournament metadata in the
// app. UI labels, emojis, and the league slug all live here. Don't duplicate.

export type Tournament = {
  /** Stable, URL-safe id used by the app to reference this tournament. */
  id: string;
  /** Human-readable name shown in the picker. */
  name: string;
  /** ESPN league slug (path segment in the scoreboard URL). */
  leagueSlug: string;
  /** Single emoji rendered next to the name. */
  emoji: string;
};

export const TOURNAMENTS: readonly Tournament[] = [
  {
    id: 'champions-league',
    name: 'Champions League',
    leagueSlug: 'uefa.champions',
    emoji: '🏆',
  },
  {
    id: 'world-cup-2026',
    name: 'Mundial 2026',
    leagueSlug: 'fifa.world',
    emoji: '🌍',
  },
  {
    id: 'la-liga',
    name: 'La Liga',
    leagueSlug: 'esp.1',
    emoji: '🇪🇸',
  },
  {
    id: 'premier-league',
    name: 'Premier League',
    leagueSlug: 'eng.1',
    emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  },
  {
    id: 'serie-a',
    name: 'Serie A',
    leagueSlug: 'ita.1',
    emoji: '🇮🇹',
  },
  {
    id: 'copa-libertadores',
    name: 'Copa Libertadores',
    leagueSlug: 'conmebol.libertadores',
    emoji: '🥇',
  },
  {
    id: 'copa-sudamericana',
    name: 'Copa Sudamericana',
    leagueSlug: 'conmebol.sudamericana',
    emoji: '🥈',
  },
  {
    id: 'liga-betplay',
    name: 'Liga BetPlay',
    leagueSlug: 'col.1',
    emoji: '🇨🇴',
  },
] as const;

/**
 * Look up a tournament by its app-side id. Returns undefined if not found —
 * callers should treat that as a 404 / invalid param.
 */
export function getTournament(id: string): Tournament | undefined {
  return TOURNAMENTS.find((t) => t.id === id);
}
