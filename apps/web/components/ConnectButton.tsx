'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';

export function ConnectButton() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useSolanaWallets();
  const [copied, setCopied] = useState(false);

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

  function copyAddress() {
    if (!addr) return;
    navigator.clipboard.writeText(addr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={copyAddress}
        title={addr ?? ''}
        className="rounded-md border border-border-subtle bg-bg-card/50 backdrop-blur px-2.5 py-1.5 text-[11px] font-mono text-text-secondary hover:text-text-primary hover:border-border-default transition"
      >
        {copied ? 'COPIED ✓' : short}
      </button>
      <button
        onClick={logout}
        className="rounded-md border border-border-subtle bg-bg-card/50 backdrop-blur px-3 py-1.5 text-[11px] font-display tracking-[0.08em] text-text-muted hover:text-text-primary hover:border-border-default transition"
      >
        OUT
      </button>
    </div>
  );
}
