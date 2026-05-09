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
 * Conversational AI agent. Client tools:
 *   - list_pools, get_pool_details, get_user_balance (read-only)
 *   - submit_picks: opens a confirm modal in the parent page; on confirm
 *     the parent signs + submits, then the resolver returns to the agent.
 *     Confirmation step protects against voice misrecognition.
 */
export function VoiceAgent({
  pollaPubkey,
  onVoiceSubmitPicks,
  onVoiceJoinPool,
}: {
  pollaPubkey?: string;
  onVoiceSubmitPicks?: (
    scores: { home: number; away: number }[],
    verballyConfirmed: boolean,
  ) => Promise<{ ok: boolean; sig?: string; error?: string }>;
  onVoiceJoinPool?: (
    verballyConfirmed: boolean,
  ) => Promise<{
    ok: boolean;
    sig?: string;
    error?: string;
  }>;
}) {
  const { wallets } = useSolanaWallets();
  const wallet = wallets[0];
  const [error, setError] = useState<string | null>(null);

  // Pulled out so we can register both list_pools (new) and list_pollas
  // (legacy) names against the same implementation.
  const listPoolsImpl = async () => {
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
  };

  // ElevenLabs SDK clientTools type is strict (string|number|void only)
  // but at runtime it JSON-serializes whatever we return. Build the tools
  // object as an any-typed const so TS doesn't structurally check every
  // tool's return value against the strict signature.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientTools: any = {
      // ─── get_current_pool: tells the agent which pool the user is on ───
      get_current_pool: async () => {
        if (!pollaPubkey) {
          return {
            current_pool_id: null,
            on_pool_page: false,
            message: 'User is on the pools list, not a specific pool yet.',
          };
        }
        return { current_pool_id: pollaPubkey, on_pool_page: true };
      },

      // ─── list_pools / list_pollas: returns OPEN pools with the mint ────
      list_pools: listPoolsImpl,
      // legacy alias — old agent configs in the dashboard may still use the
      // pre-rename name. Both call the same function so either works.
      list_pollas: listPoolsImpl,

      // ─── get_pool_details: matches list for a given pool ───────────────
      // Resilient param parsing: accepts pool_id (new), polla_id (legacy),
      // or falls back to the page's pollaPubkey if the agent forgot to
      // pass anything. Stops the "tool failed -> agent hallucinates teams"
      // failure mode dead.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get_pool_details: async (params: any) => {
        const idArg: string | undefined =
          params?.pool_id ?? params?.polla_id ?? params?.id ?? pollaPubkey;
        if (!idArg) {
          return {
            error:
              'No pool selected. Call get_current_pool first or ask the user which pool.',
          };
        }
        const conn = new Connection(SOLANA_RPC_URL, 'confirmed');
        const provider = new AnchorProvider(conn, READ_ONLY_WALLET, {
          commitment: 'confirmed',
        });
        const program = new Program(idl as Idl, provider);
        const pollaPk = new PublicKey(idArg);
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

      // ─── preview_bridge_quote: voice → real LI.FI route preview ────────
      // Calls our /api/lifi/quote endpoint, which uses @lifi/sdk to fetch
      // a real cross-chain route from the user's source chain to Solana
      // USDC. Returns a digestible summary (duration, fee, provider) so
      // the agent can speak realistic numbers like "from Polygon it'd
      // take 30 seconds and cost 5 cents". Keeps the LI.FI integration
      // story alive without needing to actually execute the bridge.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      preview_bridge_quote: async (params: any) => {
        const chainNameToId: Record<string, number> = {
          ethereum: 1,
          eth: 1,
          mainnet: 1,
          polygon: 137,
          matic: 137,
          arbitrum: 42161,
          arb: 42161,
          optimism: 10,
          op: 10,
          base: 8453,
          bsc: 56,
          bnb: 56,
        };
        const rawChain = (params?.from_chain ?? '')
          .toString()
          .toLowerCase()
          .trim();
        const fromChain = chainNameToId[rawChain];
        if (!fromChain) {
          return {
            supported: false,
            message: `Chain "${rawChain}" is not in our supported list yet.`,
          };
        }
        try {
          const res = await fetch('/api/lifi/quote', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              from_chain: fromChain,
              amount: params?.amount?.toString(),
            }),
          });
          const data = await res.json();
          return data;
        } catch (e) {
          return { supported: false, error: (e as Error).message };
        }
      },

      // ─── join_pool: voice → on-chain join (modal as fallback) ──────────
      // Voice-only flow: when verbally_confirmed=true the agent has already
      // asked "are you sure?" and the user said yes — the tool fires the
      // tx straight from the wallet, no popup. With verbally_confirmed=false
      // (or missing) the modal still pops as a safety net.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      join_pool: async (params: any) => {
        if (!onVoiceJoinPool) {
          return {
            status: 'error',
            error: 'Join not available — open a specific pool page first.',
          };
        }
        const verbally =
          params?.verbally_confirmed === true ||
          params?.verbally_confirmed === 'true';
        const result = await onVoiceJoinPool(verbally);
        if (result.ok) {
          return { status: 'joined', tx_signature: result.sig };
        }
        return { status: 'cancelled', error: result.error };
      },

      // ─── submit_picks: voice → confirm modal → on-chain submit ─────────
      // Resilient input parsing: ElevenLabs' tool param schema can mangle
      // capitalisation (Home vs home) or wrap the array in different shapes.
      // Accept whatever the agent sends and normalise.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      submit_picks: async (params: any) => {
        if (!onVoiceSubmitPicks) {
          return {
            status: 'error',
            error:
              'Submit not available — open a specific pool page first.',
          };
        }
        // Normalize a single score entry: tolerate Home/home, Away/away.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const normEntry = (s: any): { home: number; away: number } => {
          const h = s?.home ?? s?.Home ?? 0;
          const a = s?.away ?? s?.Away ?? 0;
          return {
            home: typeof h === 'number' ? h : Number(h) || 0,
            away: typeof a === 'number' ? a : Number(a) || 0,
          };
        };
        // Accept: { scores: [...] } OR a bare array OR { home_scores, away_scores } CSV strings
        let normalized: { home: number; away: number }[] = [];
        if (Array.isArray(params)) {
          normalized = params.map(normEntry);
        } else if (Array.isArray(params?.scores)) {
          normalized = params.scores.map(normEntry);
        } else if (
          typeof params?.home_scores === 'string' &&
          typeof params?.away_scores === 'string'
        ) {
          const homes = params.home_scores
            .split(',')
            .map((s: string) => Number(s.trim()) || 0);
          const aways = params.away_scores
            .split(',')
            .map((s: string) => Number(s.trim()) || 0);
          normalized = homes.map((h: number, i: number) => ({
            home: h,
            away: aways[i] ?? 0,
          }));
        } else {
          return {
            status: 'error',
            error:
              'Could not parse the scores. Expected { scores: [{ home, away }, ...] }.',
          };
        }
        if (normalized.length === 0) {
          return { status: 'error', error: 'Empty scores list.' };
        }
        const verbally =
          params?.verbally_confirmed === true ||
          params?.verbally_confirmed === 'true';
        const result = await onVoiceSubmitPicks(normalized, verbally);
        if (result.ok) {
          return { status: 'submitted', tx_signature: result.sig };
        }
        return { status: 'cancelled', error: result.error };
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
  };

  // Cast useConversation itself as any — its strict tools signature wants
  // string|number|void returns but the runtime serializes objects fine.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversation = (useConversation as any)({
    onConnect: () => setError(null),
    onError: (e: unknown) =>
      setError(
        typeof e === 'string'
          ? e
          : (e as { message?: string })?.message ?? 'Connection error',
      ),
    clientTools,
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
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Pass the pool pubkey + auth state as dynamic variables so the
      // agent's system prompt can interpolate them via {{current_pool_id}}
      // and {{is_signed_in}} — saves a round-trip tool call to discover
      // context the page already knows.
      await conversation.startSession({
        signedUrl,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dynamicVariables: {
          current_pool_id: pollaPubkey ?? '',
          on_pool_page: pollaPubkey ? 'yes' : 'no',
          is_signed_in: wallet?.address ? 'yes' : 'no',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
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
