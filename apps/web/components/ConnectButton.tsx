'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';

export function ConnectButton() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useSolanaWallets();

  if (!ready) {
    return (
      <button
        disabled
        className="rounded-md border border-border-subtle bg-bg-card/50 backdrop-blur px-3 py-1.5 text-xs text-text-muted font-display tracking-[0.08em]"
      >
        LOADING…
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="rounded-md bg-gold px-4 py-1.5 text-xs font-display tracking-[0.08em] text-black hover:bg-amber transition"
      >
        SIGN IN
      </button>
    );
  }

  const wallet = wallets[0];
  const addr = wallet?.address;
  const short = addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : '—';

  return (
    <div className="flex items-center gap-2">
      <span className="rounded-md border border-border-subtle bg-bg-card/50 backdrop-blur px-2.5 py-1.5 text-[11px] font-mono text-text-secondary">
        {short}
      </span>
      <button
        onClick={logout}
        className="rounded-md border border-border-subtle bg-bg-card/50 backdrop-blur px-3 py-1.5 text-[11px] font-display tracking-[0.08em] text-text-muted hover:text-text-primary hover:border-border-default transition"
      >
        OUT
      </button>
    </div>
  );
}
