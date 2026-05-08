'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';

export function ConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useSolanaWallets();

  if (!ready) {
    return (
      <button
        disabled
        className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted"
      >
        Loading…
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:opacity-90 transition"
      >
        Sign in with phone
      </button>
    );
  }

  const wallet = wallets[0];
  const addr = wallet?.address;
  const short = addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : '—';

  return (
    <div className="flex items-center gap-2">
      <span className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-mono text-muted">
        {short}
      </span>
      <button
        onClick={logout}
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-border transition"
      >
        Sign out
      </button>
    </div>
  );
}
