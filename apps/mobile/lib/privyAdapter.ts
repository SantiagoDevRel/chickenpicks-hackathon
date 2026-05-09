// Adapts a Privy RN embedded Solana wallet (from `useEmbeddedSolanaWallet`)
// into the Wallet shape that AnchorProvider expects:
//   { publicKey, signTransaction, signAllTransactions }
//
// IMPORTANT: The Privy RN SDK exposes embedded Solana wallets via
// `useEmbeddedSolanaWallet()` (NOT `useSolanaWallets` like the web SDK).
// The wallet's signing surface is `wallet.getProvider().request({ method:
// 'signTransaction', params: { transaction } })` — this returns a base64-
// encoded signed tx that we must deserialize back into a Transaction /
// VersionedTransaction. The exact provider-method names sometimes change
// between Privy SDK versions; if signing fails, check Privy docs and
// adjust here. See: https://docs.privy.io/reference/sdk/expo
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import type { Wallet } from './anchor';

// We type Privy's wallet loosely — the SDK's exact types differ between
// versions, and Anchor only cares about the three methods below.
type PrivyEmbeddedSolanaWallet = {
  address: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getProvider: () => Promise<any> | any;
};

type AnyTx = Transaction | VersionedTransaction;

async function privySignTx(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider: any,
  tx: AnyTx,
): Promise<AnyTx> {
  // Serialize the unsigned tx → base64. Privy expects this shape on RN
  // (web SDK is more flexible). We pass the connection from the caller's
  // AnchorProvider implicitly; the embedded wallet handles signing only.
  const serialized = (tx as Transaction).serialize
    ? (tx as Transaction).serialize({ requireAllSignatures: false })
    : (tx as VersionedTransaction).serialize();
  // base64 (Buffer is polyfilled in lib/polyfills.ts)
  const txBase64 = Buffer.from(serialized).toString('base64');

  // The provider exposes a JSON-RPC-ish `request()` interface. The
  // canonical method name on Privy RN today is `signTransaction`. If
  // your SDK version uses `solana_signTransaction`, swap it here.
  const resp = await provider.request({
    method: 'signTransaction',
    params: { transaction: txBase64 },
  });

  // Response shape: { signedTransaction: '<base64>' } — flatten if Privy
  // returns just a string.
  const signedB64: string =
    typeof resp === 'string' ? resp : resp?.signedTransaction ?? resp?.signed_transaction;
  if (!signedB64) throw new Error('Privy did not return a signed transaction');

  const signedBytes = Uint8Array.from(Buffer.from(signedB64, 'base64'));
  if ((tx as VersionedTransaction).version !== undefined) {
    return VersionedTransaction.deserialize(signedBytes);
  }
  return Transaction.from(signedBytes);
}

export async function makePrivyWallet(
  wallet: PrivyEmbeddedSolanaWallet,
): Promise<Wallet> {
  const publicKey = new PublicKey(wallet.address);
  const provider = await wallet.getProvider();

  return {
    publicKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signTransaction: (async (tx: any) => privySignTx(provider, tx)) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signAllTransactions: (async (txs: any[]) =>
      Promise.all(txs.map((tx) => privySignTx(provider, tx)))) as any,
  };
}
