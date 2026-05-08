'use client';

import { useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import {
  getAccount,
  getAssociatedTokenAddressSync,
  TokenAccountNotFoundError,
} from '@solana/spl-token';
import {
  AnchorProvider,
  Program,
  type Idl,
} from '@coral-xyz/anchor';
import idl from '@chickenpicks/anchor-client/idl' with { type: 'json' };
import {
  PROGRAM_ID,
  SOLANA_RPC_URL,
  USDC_DECIMALS,
  USDC_MINT,
} from '@chickenpicks/shared';

const programId = new PublicKey(PROGRAM_ID);

function decodeFixedString(bytes: number[]): string {
  const arr = Uint8Array.from(bytes);
  let end = arr.length;
  while (end > 0 && arr[end - 1] === 0) end--;
  return new TextDecoder().decode(arr.subarray(0, end));
}

const READ_ONLY_WALLET = {
  publicKey: PublicKey.default,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signTransaction: async () => {
    throw new Error('read-only');
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signAllTransactions: async () => {
    throw new Error('read-only');
  },
};

/**
 * Floating "Talk to Coach" button that connects to the ElevenLabs
 * Conversational AI agent. Read-only client tools for v1: list_pollas,
 * get_user_balance. submit_prediction (write) wired in next iteration.
 */
export function VoiceAgent({ pollaPubkey }: { pollaPubkey?: string }) {
  const { wallets } = useSolanaWallets();
  const wallet = wallets[0];
  const [error, setError] = useState<string | null>(null);

  const conversation = useConversation({
    onConnect: () => setError(null),
    onError: (e: unknown) =>
      setError(
        typeof e === 'string'
          ? e
          : (e as { message?: string })?.message ?? 'Connection error',
      ),
    clientTools: {
      // ─── list_pollas: returns OPEN pollas with the configured mint ──────
      list_pollas: async () => {
        const conn = new Connection(SOLANA_RPC_URL, 'confirmed');
        const provider = new AnchorProvider(conn, READ_ONLY_WALLET, {
          commitment: 'confirmed',
        });
        const program = new Program(idl as Idl, provider);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const accounts = await (program.account as any).polla.all();
        const configuredMint = new PublicKey(USDC_MINT);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return accounts
          .filter(({ account }: { account: any }) =>
            account.usdcMint.equals(configuredMint),
          )
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map(({ publicKey, account }: any) => ({
            id: publicKey.toBase58(),
            name: decodeFixedString(account.name),
            tournament: decodeFixedString(account.tournament),
            entry_usdc: Number(account.entryAmount.toString()) / 10 ** USDC_DECIMALS,
            num_matches: account.numMatches,
            num_participants: account.numParticipants,
            status: Object.keys(account.status)[0],
          }));
      },

      // ─── get_polla_details: matches list for a given polla ──────────────
      get_polla_details: async ({ polla_id }: { polla_id: string }) => {
        const conn = new Connection(SOLANA_RPC_URL, 'confirmed');
        const provider = new AnchorProvider(conn, READ_ONLY_WALLET, {
          commitment: 'confirmed',
        });
        const program = new Program(idl as Idl, provider);
        const pollaPk = new PublicKey(polla_id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const polla = await (program.account as any).polla.fetch(pollaPk);
        const matchPdas: PublicKey[] = [];
        for (let i = 0; i < polla.numMatches; i++) {
          const [pda] = PublicKey.findProgramAddressSync(
            [Buffer.from('match'), pollaPk.toBuffer(), Buffer.from([i])],
            programId,
          );
          matchPdas.push(pda);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const matchAccs = await (program.account as any).match.fetchMultiple(matchPdas);
        return {
          name: decodeFixedString(polla.name),
          status: Object.keys(polla.status)[0],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          matches: matchAccs.map((m: any, i: number) => ({
            index: i,
            home: decodeFixedString(m.homeTeam),
            away: decodeFixedString(m.awayTeam),
            home_score: m.homeScore < 0 ? null : m.homeScore,
            away_score: m.awayScore < 0 ? null : m.awayScore,
            settled: m.settled,
          })),
        };
      },

      // ─── get_user_balance: SOL + USDC of the connected user ─────────────
      get_user_balance: async () => {
        if (!wallet?.address) {
          return { error: 'User is not signed in' };
        }
        const conn = new Connection(SOLANA_RPC_URL, 'confirmed');
        const pubkey = new PublicKey(wallet.address);
        const sol = (await conn.getBalance(pubkey)) / LAMPORTS_PER_SOL;
        let usdc = 0;
        try {
          const ata = getAssociatedTokenAddressSync(
            new PublicKey(USDC_MINT),
            pubkey,
          );
          const acc = await getAccount(conn, ata);
          usdc = Number(acc.amount) / 10 ** USDC_DECIMALS;
        } catch (e) {
          if (!(e instanceof TokenAccountNotFoundError)) throw e;
        }
        return { sol: sol.toFixed(4), usdc: usdc.toFixed(2) };
      },
    },
  });

  async function start() {
    setError(null);
    try {
      const res = await fetch('/api/voice', { method: 'POST' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Server returned ${res.status}`);
      }
      const { signedUrl } = (await res.json()) as { signedUrl: string };
      // Request mic permission (most browsers prompt automatically once
      // the WebSocket attempts to access the audio device, but doing it
      // here gives a cleaner error if denied).
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({ signedUrl });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function stop() {
    await conversation.endSession();
  }

  const isConnected = conversation.status === 'connected';
  const isConnecting = conversation.status === 'connecting';

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={isConnected ? stop : start}
        disabled={isConnecting}
        className={`rounded-full px-5 py-3 font-display tracking-[0.08em] text-sm shadow-2xl transition flex items-center gap-2 ${
          isConnected
            ? 'bg-red-alert text-white hover:opacity-90'
            : 'bg-gold text-black hover:bg-amber'
        } disabled:opacity-50`}
      >
        {isConnecting ? (
          <>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            CONNECTING…
          </>
        ) : isConnected ? (
          <>
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            END CALL
          </>
        ) : (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <line x1="12" y1="18" x2="12" y2="22" />
            </svg>
            TALK TO COACH
          </>
        )}
      </button>
      {error && (
        <div className="rounded-md bg-red-alert/10 border border-red-alert/30 px-3 py-2 text-xs text-red-alert max-w-xs text-right">
          {error}
        </div>
      )}
      {isConnected && (
        <div className="rounded-md bg-bg-card/80 backdrop-blur border border-border-default px-3 py-1.5 text-[10px] text-text-muted font-display tracking-[0.08em]">
          {conversation.isSpeaking ? '🔊 SPEAKING' : '🎤 LISTENING'}
        </div>
      )}
    </div>
  );
}
