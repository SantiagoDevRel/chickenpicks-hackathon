'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { VoiceAgent } from './VoiceAgent';

// Friendly page names the agent can navigate to. Keep keys lowercase, the
// agent normalises before calling go_to_page.
const PAGE_ROUTES: Record<string, string> = {
  home: '/',
  pools: '/pollas',
  pool: '/pollas',
  'pool list': '/pollas',
  pollas: '/pollas',
  admin: '/admin',
  profile: '/profile',
};

/**
 * Voice agent wrapper for pages that don't carry a specific pool context.
 * Mount this on the landing page (/) so users can talk to the coach from
 * the very first page load and ask to be taken anywhere in the app. The
 * pool detail page mounts the bigger VoiceAgent directly because it needs
 * pollaPubkey + the join/submit callbacks.
 */
export function NavVoiceMount() {
  const router = useRouter();

  const goToPage = useCallback(
    async (page: string) => {
      const path = PAGE_ROUTES[page.toLowerCase().trim()];
      if (!path) {
        return {
          navigated: false,
          error: `Unknown page "${page}". Try: home, pools, admin.`,
        };
      }
      router.push(path);
      return { navigated: true };
    },
    [router],
  );

  const openPool = useCallback(
    async (poolId: string) => {
      try {
        new PublicKey(poolId);
        router.push(`/pollas/${poolId}`);
        return { navigated: true };
      } catch (e) {
        return { navigated: false, error: (e as Error).message };
      }
    },
    [router],
  );

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <VoiceAgent onGoToPage={goToPage} onOpenPool={openPool} />
    </div>
  );
}
