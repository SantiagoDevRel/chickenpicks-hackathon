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

type Ctx = {
  callbacks: VoiceCallbacks;
  setCallbacks: (cb: VoiceCallbacks) => void;
};

const VoiceContext = createContext<Ctx>({
  callbacks: {},
  setCallbacks: () => {},
});

export function VoiceCallbacksProvider({ children }: { children: ReactNode }) {
  const [callbacks, setLocalCallbacks] = useState<VoiceCallbacks>({});

  const setCallbacks = useCallback((cb: VoiceCallbacks) => {
    setLocalCallbacks(cb);
  }, []);

  return (
    <VoiceContext.Provider value={{ callbacks, setCallbacks }}>
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
