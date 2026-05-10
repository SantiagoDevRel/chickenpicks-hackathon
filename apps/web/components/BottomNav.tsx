'use client';

// 5-tab bottom nav (mobile-first), ported from la-polla.
// On mobile: fixed at the bottom with safe-area padding.
// On desktop (≥md): becomes a top horizontal bar that slides under the
// BrandHeader. Active route gets a gold tint; the center "+" tab is bigger,
// filled gold, and routes to /crear.
//
// Mounted globally in app/layout.tsx so it's always visible while a user
// is signed in. We hide it on the public landing page (/) so guests see
// the marketing hero unobscured.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';

type Tab = {
  href: string;
  label: string;
  icon: 'home' | 'pollas' | 'plus' | 'avisos' | 'perfil';
  hasNotification?: boolean;
};

const TABS: Tab[] = [
  { href: '/inicio', label: 'Home', icon: 'home' },
  { href: '/pollas', label: 'Pools', icon: 'pollas' },
  { href: '/crear', label: '', icon: 'plus' },
  { href: '/avisos', label: 'Alerts', icon: 'avisos', hasNotification: true },
  { href: '/perfil', label: 'Profile', icon: 'perfil' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { authenticated, ready } = usePrivy();

  // Hide on the public landing route — that page has its own marketing
  // CTA, the bottom nav would just clutter it. Also hide before Privy
  // resolves so we don't flash an unauthenticated nav at guests.
  if (pathname === '/' || !ready || !authenticated) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border-default bg-bg-base/95 backdrop-blur-md safe-bottom md:static md:border-t-0 md:border-b md:bg-transparent md:backdrop-blur-none"
    >
      <div className="mx-auto flex max-w-2xl items-stretch justify-around gap-1 px-3 py-2 md:max-w-5xl md:justify-center md:gap-6">
        {TABS.map((tab) => {
          const isActive =
            tab.href === '/inicio'
              ? pathname === '/inicio'
              : pathname === tab.href || pathname.startsWith(tab.href + '/');
          return (
            <NavTab
              key={tab.href}
              tab={tab}
              isActive={isActive}
            />
          );
        })}
      </div>
    </nav>
  );
}

function NavTab({ tab, isActive }: { tab: Tab; isActive: boolean }) {
  // Center "+" tab — bigger, filled gold, sits slightly above the bar on
  // mobile so it reads as the primary action.
  if (tab.icon === 'plus') {
    return (
      <Link
        href={tab.href}
        aria-label="Create new pool"
        className="relative flex flex-1 items-center justify-center md:flex-none"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold text-black shadow-[0_8px_24px_-4px_rgba(255,215,0,0.45)] ring-4 ring-bg-base transition hover:bg-amber md:h-11 md:w-11 md:ring-0">
          <PlusIcon />
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={tab.href}
      className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 transition md:flex-none md:flex-row md:gap-2 md:px-3 md:py-2 ${
        isActive
          ? 'text-gold'
          : 'text-text-muted hover:text-text-secondary'
      }`}
    >
      <span className="relative">
        <TabIcon icon={tab.icon} active={isActive} />
        {tab.hasNotification && (
          <span className="absolute -right-0.5 -top-0.5 inline-block h-2 w-2 rounded-full bg-red-alert ring-2 ring-bg-base" />
        )}
      </span>
      <span
        className={`font-display text-xs tracking-[0.06em] md:text-sm ${
          isActive ? 'text-gold' : ''
        }`}
      >
        {tab.label.toUpperCase()}
      </span>
    </Link>
  );
}

function TabIcon({
  icon,
  active,
}: {
  icon: Tab['icon'];
  active: boolean;
}) {
  const stroke = active ? 'rgb(var(--gold-rgb))' : 'currentColor';

  switch (icon) {
    case 'home':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2v-9z"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? `rgba(255,215,0,0.12)` : 'none'}
          />
        </svg>
      );
    case 'pollas':
      // bookmark-style stack
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 4h12a1 1 0 0 1 1 1v15l-7-3.5L5 20V5a1 1 0 0 1 1-1z"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? `rgba(255,215,0,0.12)` : 'none'}
          />
        </svg>
      );
    case 'avisos':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 8a6 6 0 1 1 12 0v4l1.6 3.2a1 1 0 0 1-.9 1.4H5.3a1 1 0 0 1-.9-1.4L6 12V8z"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
            fill={active ? `rgba(255,215,0,0.12)` : 'none'}
          />
          <path
            d="M10 19a2 2 0 0 0 4 0"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'perfil':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="8"
            r="4"
            stroke={stroke}
            strokeWidth="1.6"
            fill={active ? `rgba(255,215,0,0.12)` : 'none'}
          />
          <path
            d="M4 21a8 8 0 0 1 16 0"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );
    default:
      return null;
  }
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
