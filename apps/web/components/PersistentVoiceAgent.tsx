'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PublicKey } from '@solana/web3.js';
import { VoiceAgent } from './VoiceAgent';
import { useVoiceCallbacks } from '@/lib/VoiceContext';
import { resolvePagePath } from '@/lib/navRoutes';

/**
 * The single VoiceAgent for the entire app. Mounted once inside the
 * Providers tree so it survives Next.js route changes — the user's
 * conversation persists when they navigate between landing / pools list
 * / pool detail. Pages register their own join/submit callbacks via
 * useSetVoiceCallbacks() — this component reads from useVoiceCallbacks
 * and re-renders when they change.
 */
export function PersistentVoiceAgent() {
  const router = useRouter();
  const { pollaPubkey, onVoiceJoinPool, onVoiceSubmitPicks } =
    useVoiceCallbacks();

  const goToPage = useCallback(
    async (page: string) => {
      const path = resolvePagePath(page);
      if (!path) {
        return {
          navigated: false,
          error: `Unknown page "${page}". Try: home, pools, admin, profile.`,
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
    <div className="fixed bottom-24 right-4 z-40 sm:bottom-24 sm:right-6">
      <VoiceAgent
        pollaPubkey={pollaPubkey}
        onVoiceJoinPool={onVoiceJoinPool}
        onVoiceSubmitPicks={onVoiceSubmitPicks}
        onOpenPool={openPool}
        onGoToPage={goToPage}
      />
    </div>
  );
}
