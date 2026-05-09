// Unified wallet hook. Returns the active signing wallet (whether it
// came from Privy embedded or MWA), exposed in the AnchorProvider
// `Wallet` shape. Screens import this and don't need to know which path
// the user took.
import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { PublicKey } from '@solana/web3.js';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { makePrivyWallet } from './privyAdapter';
import { makeMwaWallet, mwaConnect, mwaDisconnect } from './mwaAdapter';
import type { Wallet } from './anchor';

type Source = 'privy' | 'mwa' | null;

export function useWallet() {
  const { isReady, user, logout } = usePrivy();
  const embedded = useEmbeddedSolanaWallet();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [source, setSource] = useState<Source>(null);
  const [pubkey, setPubkey] = useState<PublicKey | null>(null);

  // Privy embedded wallet path — auto-promote when available.
  useEffect(() => {
    let cancelled = false;
    async function attachPrivy() {
      const w = embedded?.wallets?.[0];
      if (!w?.address) return;
      try {
        const adapter = await makePrivyWallet(w);
        if (cancelled) return;
        setWallet(adapter);
        setPubkey(adapter.publicKey);
        setSource('privy');
      } catch {
        // ignore — user may switch to MWA
      }
    }
    if (source !== 'mwa') void attachPrivy();
    return () => {
      cancelled = true;
    };
  }, [embedded, source]);

  const connectMwa = useCallback(async () => {
    if (Platform.OS !== 'android') {
      throw new Error('Mobile Wallet Adapter is Android-only — use Privy on iOS.');
    }
    const { publicKey } = await mwaConnect();
    const w = makeMwaWallet();
    setWallet(w);
    setPubkey(publicKey);
    setSource('mwa');
  }, []);

  const disconnect = useCallback(async () => {
    if (source === 'mwa') {
      await mwaDisconnect();
    } else if (source === 'privy') {
      await logout();
    }
    setWallet(null);
    setPubkey(null);
    setSource(null);
  }, [source, logout]);

  return {
    ready: isReady,
    user,
    wallet,
    pubkey,
    source,
    connectMwa,
    disconnect,
  };
}
