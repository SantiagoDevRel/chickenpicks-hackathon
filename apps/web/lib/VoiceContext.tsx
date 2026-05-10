'use client';

// VoiceContext lets pages register page-specific voice agent callbacks
// (onVoiceJoinPool, onVoiceSubmitPicks) WITHOUT mounting their own
// VoiceAgent. The single VoiceAgent lives at the providers level so
// the conversation persists across route changes — no more
// reconnect-after-every-nav.
//
// Usage on a page that needs custom callbacks:
//
//   const setVoice = useSetVoiceCallbacks();
//   useEffect(() => {
//     setVoice({ pollaPubkey, onVoiceJoinPool, onVoiceSubmitPicks });
//     return () => setVoice({}); // clear on unmount
//   }, [pollaPubkey, onVoiceJoinPool, onVoiceSubmitPicks]);
//
// Usage by the providers-level <PersistentVoiceAgent />:
//
//   const { pollaPubkey, onVoiceJoinPool, onVoiceSubmitPicks } = useVoiceCallbacks();
//   <VoiceAgent
//     pollaPubkey={pollaPubkey}
//     onVoiceJoinPool={onVoiceJoinPool}
//     onVoiceSubmitPicks={onVoiceSubmitPicks}
//     onOpenPool={...} onGoToPage={...} // these are router-driven, set in providers
//   />

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

export type VoiceCallbacks = {
  pollaPubkey?: string;
  onVoiceJoinPool?: (
    verballyConfirmed: boolean,
  ) => Promise<{ ok: boolean; sig?: string; error?: string }>;
  onVoiceSubmitPicks?: (
    scores: { home: number; away: number }[],
    verballyConfirmed: boolean,
  ) => Promise<{ ok: boolean; sig?: string; error?: string }>;
};

// Bridge quote popup — when the voice agent's preview_bridge_quote tool
// fires, we render this modal showing live LI.FI quotes from several EVM
// mainnets to Solana mainnet USDC. CTA collapses the demo back to
// "Use Solana USDC devnet".
export type BridgeQuoteRow = {
  chain_id: number;
  chain_label: string;
  ok: boolean;
  duration_seconds: number | null;
  bridge_fee_usd: number | null;
  gas_cost_usd: number | null;
  route_provider: string | null;
  to_amount_usdc: number | null;
  error?: string;
};
export type BridgeQuoteState =
  | { kind: 'idle' }
  | {
      kind: 'open';
      amountUsdc: string;
      quotes: BridgeQuoteRow[];
      loading: boolean;
    };

type Ctx = {
  callbacks: VoiceCallbacks;
  setCallbacks: (cb: VoiceCallbacks) => void;
  bridgeQuote: BridgeQuoteState;
  setBridgeQuote: (s: BridgeQuoteState) => void;
};

const VoiceContext = createContext<Ctx>({
  callbacks: {},
  setCallbacks: () => {},
  bridgeQuote: { kind: 'idle' },
  setBridgeQuote: () => {},
});

export function VoiceCallbacksProvider({ children }: { children: ReactNode }) {
  const [callbacks, setLocalCallbacks] = useState<VoiceCallbacks>({});
  const [bridgeQuote, setLocalBridgeQuote] = useState<BridgeQuoteState>({
    kind: 'idle',
  });

  const setCallbacks = useCallback((cb: VoiceCallbacks) => {
    setLocalCallbacks(cb);
  }, []);

  const setBridgeQuote = useCallback((s: BridgeQuoteState) => {
    setLocalBridgeQuote(s);
  }, []);

  return (
    <VoiceContext.Provider
      value={{ callbacks, setCallbacks, bridgeQuote, setBridgeQuote }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoiceCallbacks(): VoiceCallbacks {
  return useContext(VoiceContext).callbacks;
}

export function useSetVoiceCallbacks(): (cb: VoiceCallbacks) => void {
  return useContext(VoiceContext).setCallbacks;
}

export function useBridgeQuote(): BridgeQuoteState {
  return useContext(VoiceContext).bridgeQuote;
}

export function useSetBridgeQuote(): (s: BridgeQuoteState) => void {
  return useContext(VoiceContext).setBridgeQuote;
}
