'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
} from '@solana/web3.js';
import {
  getAccount,
  getAssociatedTokenAddressSync,
  TokenAccountNotFoundError,
} from '@solana/spl-token';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import {
  SOLANA_RPC_URL,
  USDC_DECIMALS,
  USDC_MINT,
} from '@chickenpicks/shared';

export function ConnectButton() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useSolanaWallets();
  const wallet = wallets[0];
  const addr = wallet?.address;

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [loadingBalances, setLoadingBalances] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Fetch balances when dropdown opens + poll every 10s while open
  useEffect(() => {
    if (!open || !addr) return;
    let cancelled = false;

    async function fetchBalances() {
      if (!addr) return;
      setLoadingBalances(true);
      try {
        const conn = new Connection(SOLANA_RPC_URL, 'confirmed');
        const pubkey = new PublicKey(addr);

        // SOL
        const sol = await conn.getBalance(pubkey);
        if (cancelled) return;
        setSolBalance(sol / LAMPORTS_PER_SOL);

        // USDC (test mint per env)
        const mint = new PublicKey(USDC_MINT);
        const ata = getAssociatedTokenAddressSync(mint, pubkey);
        try {
          const acc = await getAccount(conn, ata);
          if (cancelled) return;
          setUsdcBalance(Number(acc.amount) / 10 ** USDC_DECIMALS);
        } catch (e) {
          if (e instanceof TokenAccountNotFoundError) {
            if (!cancelled) setUsdcBalance(0);
          } else {
            console.error('USDC balance fetch failed:', e);
          }
        }
      } catch (e) {
        console.error('SOL balance fetch failed:', e);
      } finally {
        if (!cancelled) setLoadingBalances(false);
      }
    }

    void fetchBalances();
    const interval = setInterval(fetchBalances, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open, addr]);

  function copyAddress() {
    if (!addr) return;
    navigator.clipboard.writeText(addr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

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

  const short = addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : '—';

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-border-subtle bg-bg-card/50 backdrop-blur px-2.5 py-1.5 text-[11px] font-mono text-text-secondary hover:text-text-primary hover:border-border-default transition flex items-center gap-1.5"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-turf animate-pulse" />
        {short}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path
            d="M2 4l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 lp-card p-4 z-50"
          style={{ boxShadow: '0 20px 60px -10px rgba(0, 0, 0, 0.6)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="font-display tracking-[0.08em] text-[10px] text-text-muted">
              EMBEDDED WALLET
            </div>
            <span className="font-display tracking-[0.08em] text-[9px] text-turf">
              · DEVNET
            </span>
          </div>

          {/* Full address */}
          <button
            onClick={copyAddress}
            title="Click to copy"
            className="w-full text-left mb-4 rounded-md bg-bg-base/60 border border-border-subtle p-2.5 hover:border-border-default transition"
          >
            <div className="font-mono text-[11px] text-text-secondary break-all leading-relaxed">
              {addr}
            </div>
            <div className="mt-1.5 text-[10px] font-display tracking-[0.08em] text-text-muted">
              {copied ? (
                <span className="text-turf">COPIED ✓</span>
              ) : (
                'CLICK TO COPY'
              )}
            </div>
          </button>

          {/* Balances */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <BalanceCard
              label="SOL"
              value={solBalance}
              loading={loadingBalances && solBalance === null}
              decimals={4}
            />
            <BalanceCard
              label="USDC"
              value={usdcBalance}
              loading={loadingBalances && usdcBalance === null}
              decimals={2}
            />
          </div>

          <div className="text-[10px] text-text-muted text-center mb-3 font-display tracking-[0.08em]">
            AUTO-REFRESHES EVERY 10S
          </div>

          {/* Sign out */}
          <button
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="w-full rounded-md border border-border-subtle bg-bg-base/60 px-3 py-2 text-xs font-display tracking-[0.08em] text-text-muted hover:text-red-alert hover:border-red-alert/40 transition"
          >
            SIGN OUT
          </button>
        </div>
      )}
    </div>
  );
}

function BalanceCard({
  label,
  value,
  loading,
  decimals,
}: {
  label: string;
  value: number | null;
  loading: boolean;
  decimals: number;
}) {
  return (
    <div className="rounded-md bg-bg-base/60 border border-border-subtle p-3">
      <div className="font-display tracking-[0.08em] text-[10px] text-text-muted">
        {label}
      </div>
      <div className="font-display tracking-[0.04em] text-xl text-text-primary mt-0.5">
        {loading ? (
          <span className="text-text-muted text-sm">…</span>
        ) : value === null ? (
          <span className="text-text-muted text-sm">—</span>
        ) : (
          value.toFixed(decimals)
        )}
      </div>
    </div>
  );
}
