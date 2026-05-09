// Mobile Wallet Adapter (MWA) fallback for users who prefer their own
// installed Solana wallet (Phantom, Solflare, Backpack, etc.) instead of
// the Privy embedded wallet. This is the "I have my own wallet" path
// required by the Solana Mobile track judging rubric.
//
// MWA only works on Android (the protocol is Android-only as of writing —
// iOS uses a different flow). On iOS we fall back to Privy embedded.
import { transact, type Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import {
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import type { Wallet } from './anchor';

const APP_IDENTITY = {
  name: 'ChickenPicks OnChain',
  uri: 'https://onchain.chickenpicks.app',
  icon: 'favicon.ico',
};

type AnyTx = Transaction | VersionedTransaction;

let cachedAuthToken: string | null = null;
let cachedPublicKey: PublicKey | null = null;

export async function mwaConnect(): Promise<{
  publicKey: PublicKey;
  authToken: string;
}> {
  const result = await transact(async (wallet: Web3MobileWallet) => {
    const auth = await wallet.authorize({
      chain: 'solana:devnet',
      identity: APP_IDENTITY,
    });
    const account = auth.accounts[0];
    // account.address is base64; convert to PublicKey via raw bytes
    const raw = Buffer.from(account.address, 'base64');
    return { publicKey: new PublicKey(raw), authToken: auth.auth_token };
  });
  cachedAuthToken = result.authToken;
  cachedPublicKey = result.publicKey;
  return result;
}

export async function mwaDisconnect(): Promise<void> {
  if (!cachedAuthToken) return;
  const token = cachedAuthToken;
  cachedAuthToken = null;
  cachedPublicKey = null;
  await transact(async (wallet) => {
    await wallet.deauthorize({ auth_token: token });
  });
}

export function makeMwaWallet(): Wallet {
  if (!cachedPublicKey) {
    throw new Error('MWA wallet not connected — call mwaConnect() first');
  }
  const publicKey = cachedPublicKey;

  async function signOne(tx: AnyTx): Promise<AnyTx> {
    return transact(async (wallet) => {
      if (cachedAuthToken) {
        await wallet.reauthorize({
          auth_token: cachedAuthToken,
          identity: APP_IDENTITY,
        });
      }
      const [signed] = await wallet.signTransactions({ transactions: [tx as Transaction] });
      return signed as AnyTx;
    });
  }

  async function signMany(txs: AnyTx[]): Promise<AnyTx[]> {
    return transact(async (wallet) => {
      if (cachedAuthToken) {
        await wallet.reauthorize({
          auth_token: cachedAuthToken,
          identity: APP_IDENTITY,
        });
      }
      const signed = await wallet.signTransactions({
        transactions: txs as Transaction[],
      });
      return signed as AnyTx[];
    });
  }

  return {
    publicKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signTransaction: (async (tx: any) => signOne(tx)) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signAllTransactions: (async (txs: any[]) => signMany(txs)) as any,
  };
}
