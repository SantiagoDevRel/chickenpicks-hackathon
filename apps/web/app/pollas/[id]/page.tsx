'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AnchorProvider,
  BN,
  Program,
  type Idl,
} from '@coral-xyz/anchor';
import {
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import idl from '@chickenpicks/anchor-client/idl' with { type: 'json' };
import {
  PROGRAM_ID,
  SOLANA_RPC_URL,
  USDC_DECIMALS,
  USDC_MINT,
} from '@chickenpicks/shared';
import { BrandHeader } from '@/components/BrandHeader';

const programId = new PublicKey(PROGRAM_ID);
const usdcMintKey = new PublicKey(USDC_MINT);

type RawPolla = {
  creator: PublicKey;
  name: number[];
  tournament: number[];
  entryAmount: BN;
  usdcMint: PublicKey;
  vault: PublicKey;
  numMatches: number;
  matchesSettled: number;
  numParticipants: number;
  totalPool: BN;
  status: { open?: object; locked?: object; settled?: object };
  prizeDistribution: number[];
};

type RawMatch = {
  polla: PublicKey;
  matchIndex: number;
  homeTeam: number[];
  awayTeam: number[];
  homeScore: number;
  awayScore: number;
  settled: boolean;
};

type RawPrediction = {
  polla: PublicKey;
  predictor: PublicKey;
  scores: { home: number; away: number }[];
  submittedAtSlot: BN;
  points: number;
  finalRank: number;
  claimed: boolean;
};

function decodeFixedString(bytes: number[]): string {
  const arr = Uint8Array.from(bytes);
  let end = arr.length;
  while (end > 0 && arr[end - 1] === 0) end--;
  return new TextDecoder().decode(arr.subarray(0, end));
}

function statusKey(status: RawPolla['status']): 'OPEN' | 'LOCKED' | 'SETTLED' {
  if ('open' in status) return 'OPEN';
  if ('locked' in status) return 'LOCKED';
  return 'SETTLED';
}

function formatUsdc(raw: BN): string {
  const denom = new BN(10).pow(new BN(USDC_DECIMALS));
  const whole = raw.div(denom).toString();
  const frac = raw.mod(denom).toString().padStart(USDC_DECIMALS, '0').slice(0, 2);
  return `${whole}.${frac}`;
}

const READ_ONLY_WALLET = {
  publicKey: PublicKey.default,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signTransaction: async (_tx: any) => {
    throw new Error('read-only wallet');
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signAllTransactions: async (_txs: any[]) => {
    throw new Error('read-only wallet');
  },
};

export default function PollaDetailPage() {
  const params = useParams<{ id: string }>();
  const pollaPubkey = useMemo(() => {
    try {
      return new PublicKey(params.id);
    } catch {
      return null;
    }
  }, [params.id]);

  const { authenticated, ready } = usePrivy();
  const { wallets } = useSolanaWallets();
  const wallet = wallets[0];
  const userPubkey = useMemo(() => {
    if (!wallet?.address) return null;
    try {
      return new PublicKey(wallet.address);
    } catch {
      return null;
    }
  }, [wallet?.address]);

  const [polla, setPolla] = useState<RawPolla | null>(null);
  const [matches, setMatches] = useState<RawMatch[]>([]);
  const [prediction, setPrediction] = useState<RawPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [scores, setScores] = useState<{ home: string; away: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastSig, setLastSig] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshAll = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Load polla + matches + prediction
  useEffect(() => {
    if (!pollaPubkey) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const conn = new Connection(SOLANA_RPC_URL, 'confirmed');
        const provider = new AnchorProvider(conn, READ_ONLY_WALLET, {
          commitment: 'confirmed',
        });
        const program = new Program(idl as Idl, provider);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pollaData = await (program.account as any).polla.fetch(pollaPubkey);
        if (cancelled) return;
        setPolla(pollaData as RawPolla);

        const matchPdas: PublicKey[] = [];
        for (let i = 0; i < pollaData.numMatches; i++) {
          const [pda] = PublicKey.findProgramAddressSync(
            [
              new TextEncoder().encode('match'),
              pollaPubkey!.toBuffer(),
              Uint8Array.from([i]),
            ],
            programId,
          );
          matchPdas.push(pda);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const matchAccs = await (program.account as any).match.fetchMultiple(matchPdas);
        if (cancelled) return;
        const matchesList = (matchAccs as RawMatch[]).map((acc, i) => ({
          ...acc,
          matchIndex: i,
        }));
        matchesList.sort((a, b) => a.matchIndex - b.matchIndex);
        setMatches(matchesList);

        // Initialize empty scores
        setScores(
          matchesList.map(() => ({ home: '', away: '' })),
        );

        // Load user's prediction if logged in
        if (userPubkey) {
          const [predPda] = PublicKey.findProgramAddressSync(
            [
              new TextEncoder().encode('prediction'),
              pollaPubkey!.toBuffer(),
              userPubkey.toBuffer(),
            ],
            programId,
          );
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const predData = await (program.account as any).prediction.fetch(predPda);
            if (cancelled) return;
            setPrediction(predData as RawPrediction);
            // pre-fill from existing prediction
            setScores(
              (predData.scores as { home: number; away: number }[])
                .slice(0, matchesList.length)
                .map((s) => ({
                  home: s.home >= 0 ? s.home.toString() : '',
                  away: s.away >= 0 ? s.away.toString() : '',
                })),
            );
          } catch {
            // No prediction yet — fine
            if (!cancelled) setPrediction(null);
          }
        }

        setError(null);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [pollaPubkey, userPubkey, refreshKey]);

  // ── Actions ────────────────────────────────────────────────────────────

  async function joinAndPredict() {
    if (!pollaPubkey || !polla || !wallet || !userPubkey) return;
    setBusy(true);
    setError(null);
    try {
      const conn = new Connection(SOLANA_RPC_URL, 'confirmed');
      // Adapt Privy wallet to Anchor wallet shape
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adaptedWallet: any = {
        publicKey: userPubkey,
        signTransaction: async (tx: unknown) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return await (wallet as any).signTransaction(tx);
        },
        signAllTransactions: async (txs: unknown[]) => {
          return Promise.all(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            txs.map((tx) => (wallet as any).signTransaction(tx)),
          );
        },
      };
      const provider = new AnchorProvider(conn, adaptedWallet, {
        commitment: 'confirmed',
      });
      const program = new Program(idl as Idl, provider);

      const [predPda] = PublicKey.findProgramAddressSync(
        [
          new TextEncoder().encode('prediction'),
          pollaPubkey.toBuffer(),
          userPubkey.toBuffer(),
        ],
        programId,
      );
      const userUsdcAta = getAssociatedTokenAddressSync(
        usdcMintKey,
        userPubkey,
      );

      const sig = await program.methods
        .joinPolla()
        .accounts({
          polla: pollaPubkey,
          pollaVault: polla.vault,
          participantUsdcAta: userUsdcAta,
          prediction: predPda,
          participant: userPubkey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      setLastSig(sig);
      refreshAll();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitPrediction() {
    if (!pollaPubkey || !polla || !wallet || !userPubkey || !prediction) return;
    setBusy(true);
    setError(null);
    try {
      const conn = new Connection(SOLANA_RPC_URL, 'confirmed');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adaptedWallet: any = {
        publicKey: userPubkey,
        signTransaction: async (tx: unknown) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return await (wallet as any).signTransaction(tx);
        },
        signAllTransactions: async (txs: unknown[]) => {
          return Promise.all(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            txs.map((tx) => (wallet as any).signTransaction(tx)),
          );
        },
      };
      const provider = new AnchorProvider(conn, adaptedWallet, {
        commitment: 'confirmed',
      });
      const program = new Program(idl as Idl, provider);

      const [predPda] = PublicKey.findProgramAddressSync(
        [
          new TextEncoder().encode('prediction'),
          pollaPubkey.toBuffer(),
          userPubkey.toBuffer(),
        ],
        programId,
      );

      // Build full 10-element scores array; pad with -1 for unused slots
      const fullScores: { home: number; away: number }[] = [];
      for (let i = 0; i < 10; i++) {
        const s = scores[i];
        if (s && s.home !== '' && s.away !== '') {
          fullScores.push({ home: parseInt(s.home, 10), away: parseInt(s.away, 10) });
        } else {
          fullScores.push({ home: -1, away: -1 });
        }
      }

      const sig = await program.methods
        .submitPrediction(fullScores)
        .accounts({
          polla: pollaPubkey,
          prediction: predPda,
          predictor: userPubkey,
        })
        .rpc();
      setLastSig(sig);
      refreshAll();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!pollaPubkey) {
    return (
      <main className="min-h-screen">
        <BrandHeader />
        <div className="mx-auto max-w-3xl px-4 py-10 text-center">
          <p className="text-red-alert">Invalid polla address.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <BrandHeader />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/pollas"
          className="font-display tracking-[0.08em] text-xs text-text-muted hover:text-text-primary transition"
        >
          ← BACK TO POLLAS
        </Link>

        {loading && (
          <div className="lp-card p-12 mt-4 text-center">
            <div className="font-display tracking-[0.08em] text-sm text-text-muted">
              LOADING…
            </div>
          </div>
        )}

        {!loading && error && !polla && (
          <div className="lp-card p-12 mt-4 text-center border-red-alert/40">
            <p className="text-red-alert text-sm">Failed to load: {error}</p>
          </div>
        )}

        {!loading && polla && (
          <>
            {/* Polla hero */}
            <div className="lp-card-hero p-6 mt-4">
              <div className="flex items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/pollitos/pollito_capitan_lider.webp"
                  alt=""
                  width={80}
                  height={80}
                  className="flex-shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
                />
                <div className="flex-1">
                  <div
                    className={`font-display tracking-[0.08em] text-[11px] mb-1 ${
                      statusKey(polla.status) === 'OPEN'
                        ? 'text-turf'
                        : statusKey(polla.status) === 'LOCKED'
                          ? 'text-amber'
                          : 'text-text-muted'
                    }`}
                  >
                    {statusKey(polla.status)}
                  </div>
                  <h1 className="font-display tracking-[0.02em] text-2xl md:text-3xl text-text-primary uppercase leading-none">
                    {decodeFixedString(polla.name)}
                  </h1>
                  <div className="text-sm text-text-muted mt-1">
                    {decodeFixedString(polla.tournament)}
                  </div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-3 pt-4 border-t border-border-subtle">
                <Stat label="ENTRY" value={formatUsdc(polla.entryAmount)} suffix="USDC" />
                <Stat label="POOL" value={formatUsdc(polla.totalPool)} suffix="USDC" />
                <Stat label="MATCHES" value={polla.numMatches.toString()} />
                <Stat label="PLAYERS" value={polla.numParticipants.toString()} />
              </div>
            </div>

            {/* Matches + predict form */}
            <div className="lp-card p-6 mt-6">
              <h2 className="lp-section-title mb-4">Matches & Predictions</h2>

              {/* Hint when user hasn't joined yet */}
              {ready && authenticated && !prediction && statusKey(polla.status) === 'OPEN' && (
                <div className="rounded-md border border-amber/30 bg-amber/5 p-3 mb-4 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/pollitos/Pollito_esperando.webp"
                    alt=""
                    width={36}
                    height={36}
                  />
                  <p className="text-xs text-amber font-display tracking-[0.04em]">
                    JOIN THE POLLA TO UNLOCK PREDICTIONS
                  </p>
                </div>
              )}

              <PredictForm
                matches={matches}
                scores={scores}
                locked={
                  statusKey(polla.status) !== 'OPEN' ||
                  !authenticated ||
                  !prediction
                }
                onChange={(idx, home, away) =>
                  setScores((prev) => {
                    const next = [...prev];
                    next[idx] = { home, away };
                    return next;
                  })
                }
              />

              {/* Action area */}
              <div className="mt-6 pt-5 border-t border-border-subtle">
                {!ready && (
                  <p className="text-text-muted text-sm">Loading wallet…</p>
                )}

                {ready && !authenticated && (
                  <p className="text-text-secondary text-sm">
                    Sign in with email or phone to join + predict.
                  </p>
                )}

                {ready && authenticated && polla && (
                  <>
                    {!prediction && statusKey(polla.status) === 'OPEN' && (
                      <button
                        onClick={joinAndPredict}
                        disabled={busy}
                        className="w-full rounded-md bg-gold px-5 py-3 font-display tracking-[0.08em] text-sm text-black hover:bg-amber disabled:opacity-50 transition"
                      >
                        {busy
                          ? 'JOINING…'
                          : `JOIN POLLA (${formatUsdc(polla.entryAmount)} USDC)`}
                      </button>
                    )}
                    {prediction && statusKey(polla.status) === 'OPEN' && (
                      <button
                        onClick={submitPrediction}
                        disabled={busy}
                        className="w-full rounded-md bg-gold px-5 py-3 font-display tracking-[0.08em] text-sm text-black hover:bg-amber disabled:opacity-50 transition"
                      >
                        {busy
                          ? 'SAVING…'
                          : prediction.scores.some((s) => s.home >= 0)
                            ? 'UPDATE PREDICTIONS'
                            : 'SAVE PREDICTIONS'}
                      </button>
                    )}
                    {prediction && statusKey(polla.status) !== 'OPEN' && (
                      <p className="text-text-muted text-sm text-center">
                        Predictions locked. {prediction.points > 0 && (
                          <span className="text-gold">
                            You scored {prediction.points} pts.
                          </span>
                        )}
                      </p>
                    )}
                  </>
                )}

                {error && (
                  <p className="mt-3 text-red-alert text-xs">
                    {error}
                  </p>
                )}
                {lastSig && (
                  <p className="mt-3 text-xs text-text-muted">
                    Tx:{' '}
                    <a
                      href={`https://explorer.solana.com/tx/${lastSig}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-gold hover:underline"
                    >
                      {lastSig.slice(0, 12)}…
                    </a>
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function PredictForm({
  matches,
  scores,
  locked,
  onChange,
}: {
  matches: RawMatch[];
  scores: { home: string; away: string }[];
  locked: boolean;
  onChange: (idx: number, home: string, away: string) => void;
}) {
  // Flat input refs: 2 per match (home, away). Used for autojump on input.
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  function focusNext(flatIdx: number) {
    const next = inputRefs.current[flatIdx + 1];
    if (next) {
      next.focus();
      next.select();
    }
  }

  return (
    <div className="space-y-3">
      {matches.map((m, i) => {
        const score = scores[i] || { home: '', away: '' };
        const home = decodeFixedString(m.homeTeam);
        const away = decodeFixedString(m.awayTeam);
        const hasResult = m.settled && m.homeScore >= 0 && m.awayScore >= 0;
        return (
          <div
            key={i}
            className="rounded-md bg-bg-elevated/40 border border-border-subtle p-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 text-right font-display tracking-[0.04em] text-sm uppercase text-text-primary">
                {home}
              </div>
              <div className="flex items-center gap-1.5">
                <ScoreInput
                  refSetter={(el) => {
                    inputRefs.current[i * 2] = el;
                  }}
                  value={score.home}
                  disabled={locked}
                  onValueChange={(v) => {
                    onChange(i, v, score.away);
                    if (v.length >= 1) focusNext(i * 2);
                  }}
                />
                <span className="font-display text-text-muted text-sm">vs</span>
                <ScoreInput
                  refSetter={(el) => {
                    inputRefs.current[i * 2 + 1] = el;
                  }}
                  value={score.away}
                  disabled={locked}
                  onValueChange={(v) => {
                    onChange(i, score.home, v);
                    if (v.length >= 1) focusNext(i * 2 + 1);
                  }}
                />
              </div>
              <div className="flex-1 text-left font-display tracking-[0.04em] text-sm uppercase text-text-primary">
                {away}
              </div>
            </div>
            {hasResult && (
              <div className="mt-2 text-center font-display tracking-[0.08em] text-xs text-amber">
                FINAL: {m.homeScore} - {m.awayScore}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ScoreInput({
  value,
  disabled,
  onValueChange,
  refSetter,
}: {
  value: string;
  disabled: boolean;
  onValueChange: (v: string) => void;
  refSetter: (el: HTMLInputElement | null) => void;
}) {
  return (
    <input
      ref={refSetter}
      type="number"
      inputMode="numeric"
      min={0}
      max={20}
      value={value}
      disabled={disabled}
      onChange={(e) => {
        // Cap to 2 chars max to avoid silly long inputs
        const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
        onValueChange(v);
      }}
      onFocus={(e) => e.currentTarget.select()}
      className="w-12 h-10 rounded-md bg-bg-card text-center font-display tracking-[0.04em] text-lg text-text-primary border border-border-default focus:border-gold focus:outline-none disabled:opacity-60"
    />
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div>
      <div className="font-display tracking-[0.08em] text-[10px] text-text-muted">
        {label}
      </div>
      <div className="font-display tracking-[0.04em] text-base text-text-primary">
        {value}
        {suffix && <span className="text-[10px] text-text-muted ml-1">{suffix}</span>}
      </div>
    </div>
  );
}
