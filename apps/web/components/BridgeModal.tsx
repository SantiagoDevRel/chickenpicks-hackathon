'use client';

import { useEffect } from 'react';
import { LiFiWidget, type WidgetConfig } from '@lifi/widget';
import { USDC_MINT } from '@chickenpicks/shared';

export type BridgeModalState =
  | { kind: 'closed' }
  | { kind: 'open'; fromChain?: number; fromToken?: string; amount?: string };

const SOLANA_CHAIN_ID = 1151111081099710;

/**
 * Floating LI.FI Widget overlay. Pre-configured with destination = Solana
 * USDC so the user only has to pick the source chain + amount. Voice can
 * pre-fill those via the state's fromChain / fromToken / amount fields.
 */
export function BridgeModal({
  state,
  onClose,
}: {
  state: BridgeModalState;
  onClose: () => void;
}) {
  useEffect(() => {
    if (state.kind !== 'open') return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state.kind, onClose]);

  if (state.kind === 'closed') return null;

  const config: WidgetConfig = {
    integrator: 'chickenpicks-onchain',
    appearance: 'dark',
    theme: {
      palette: {
        primary: { main: '#FFD700' },
        secondary: { main: '#FF9F1C' },
        background: { default: '#0e1420', paper: '#131b2b' },
      },
      shape: { borderRadius: 12, borderRadiusSecondary: 8 },
      typography: { fontFamily: 'Outfit, system-ui, sans-serif' },
    },
    toChain: SOLANA_CHAIN_ID,
    toToken: USDC_MINT,
    fromChain: state.fromChain,
    fromToken: state.fromToken,
    fromAmount: state.amount,
    hiddenUI: ['poweredBy'],
    variant: 'compact',
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="max-w-md w-full animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{ height: '640px' }}
      >
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="font-display tracking-[0.04em] text-sm text-gold uppercase">
            🌉 BRIDGE TO SOLANA USDC
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-border-subtle bg-bg-card/50 backdrop-blur px-2 py-1 text-[10px] font-display tracking-[0.08em] text-text-muted hover:text-text-primary"
          >
            CLOSE
          </button>
        </div>
        <div
          className="rounded-xl overflow-hidden border border-border-default"
          style={{ height: 'calc(100% - 32px)' }}
        >
          <LiFiWidget integrator="chickenpicks-onchain" config={config} />
        </div>
      </div>
    </div>
  );
}
