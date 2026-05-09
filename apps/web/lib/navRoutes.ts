// Single source of truth for friendly-name → route mapping. Used by the
// voice agent's go_to_page tool so we tolerate variations the user might
// say ("home", "homepage", "main", "go back") without surprising them.

export function resolvePagePath(input: string): string | null {
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/^the\s+/, '')
    .replace(/^\//, '');

  if (['home', 'homepage', 'landing', 'main', 'start', 'index', ''].includes(normalized)) {
    return '/';
  }
  if (
    [
      'inicio',
      'dashboard',
      'feed',
      'app home',
      'my home',
      'logged in',
      'logged-in home',
    ].includes(normalized)
  ) {
    return '/inicio';
  }
  if (
    ['pools', 'pool', 'pool list', 'pool-list', 'pollas', 'browse', 'list pools', 'all pools', 'my pollas', 'my pools'].includes(
      normalized,
    )
  ) {
    return '/pollas';
  }
  if (
    ['create', 'create pool', 'create polla', 'crear', 'new pool', 'new polla', 'nueva polla', '+', 'plus'].includes(
      normalized,
    )
  ) {
    return '/crear';
  }
  if (
    ['avisos', 'notifications', 'alerts', 'inbox', 'updates', 'announcements'].includes(
      normalized,
    )
  ) {
    return '/avisos';
  }
  if (['admin', 'oracle', 'manage', 'manager', 'control'].includes(normalized)) {
    return '/admin';
  }
  if (
    [
      'profile',
      'my profile',
      'account',
      'me',
      'my account',
      'my picks',
      'perfil',
      'mi perfil',
      'settings',
    ].includes(normalized)
  ) {
    return '/perfil';
  }
  return null;
}
