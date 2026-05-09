// Pool detail + predict + claim. Mirrors apps/web/app/pollas/[id]/page.tsx
// minus the voice agent hooks and the cross-chain bridge UI (web-only).
//
// Three on-chain actions, all signed via the active wallet from
// useWallet():
//   1. join_polla    → creates the prediction PDA + transfers USDC entry
//   2. submit_prediction → updates scores on existing prediction
//   3. claim_prize   → claims USDC payout if user ranked
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  decodeFixedString,
  getProgram,
  getReadOnlyProgram,
  predictionPda,
  matchPda,
} from '@/lib/anchor';
import { USDC_MINT } from '@/lib/constants';
import { formatUsdc, statusKey } from '@/lib/format';
import { useWallet } from '@/lib/useWallet';
import { MatchRow } from '@/components/MatchRow';
import { ConnectButton } from '@/components/ConnectButton';

const waiting = require('../../assets/pollitos/Pollito_esperando.webp');
const captain = require('../../assets/pollitos/pollito_capitan_lider.webp');
const sad = require('../../assets/pollitos/pollito_arquero_triste.webp');

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

const usdcMintKey = new PublicKey(USDC_MINT);

export default function PoolDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const pollaPubkey = useMemo(() => {
    try {
      return new PublicKey(params.id);
    } catch {
      return null;
    }
  }, [params.id]);

  const { wallet, pubkey: userPubkey } = useWallet();

  const [polla, setPolla] = useState<RawPolla | null>(null);
  const [matches, setMatches] = useState<RawMatch[]>([]);
  const [prediction, setPrediction] = useState<RawPrediction | null>(null);
  const [scores, setScores] = useState<{ home: string; away: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastSig, setLastSig] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!pollaPubkey) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const program = getReadOnlyProgram();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pollaData = await (program.account as any).polla.fetch(pollaPubkey);
        if (cancelled) return;
        setPolla(pollaData as RawPolla);

        const matchPdas: PublicKey[] = [];
        for (let i = 0; i < pollaData.numMatches; i++) {
          matchPdas.push(matchPda(pollaPubkey!, i)[0]);
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
        setScores(matchesList.map(() => ({ home: '', away: '' })));

        if (userPubkey) {
          const [predPda] = predictionPda(pollaPubkey!, userPubkey);
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const predData = await (program.account as any).prediction.fetch(predPda);
            if (cancelled) return;
            setPrediction(predData as RawPrediction);
            setScores(
              (predData.scores as { home: number; away: number }[])
                .slice(0, matchesList.length)
                .map((s) => ({
                  home: s.home >= 0 ? s.home.toString() : '',
                  away: s.away >= 0 ? s.away.toString() : '',
                })),
            );
          } catch {
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
  }, [pollaPubkey, userPubkey, tick]);

  const joinPool = useCallback(async () => {
    if (!pollaPubkey || !polla || !wallet || !userPubkey) return;
    setBusy(true);
    setError(null);
    try {
      const program = getProgram(wallet);
      const [predPda] = predictionPda(pollaPubkey, userPubkey);
      const userUsdcAta = getAssociatedTokenAddressSync(usdcMintKey, userPubkey);
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
      refresh();
    } catch (e) {
      setError((e as Error).message);
      Alert.alert('Join failed', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [pollaPubkey, polla, wallet, userPubkey, refresh]);

  const submitPicks = useCallback(async () => {
    if (!pollaPubkey || !polla || !wallet || !userPubkey || !prediction) return;
    setBusy(true);
    setError(null);
    try {
      const program = getProgram(wallet);
      const [predPda] = predictionPda(pollaPubkey, userPubkey);

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
      refresh();
    } catch (e) {
      setError((e as Error).message);
      Alert.alert('Submit failed', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [pollaPubkey, polla, wallet, userPubkey, prediction, scores, refresh]);

  const claimPrize = useCallback(async () => {
    if (!pollaPubkey || !polla || !wallet || !userPubkey || !prediction) return;
    setBusy(true);
    setError(null);
    try {
      const program = getProgram(wallet);
      const [predPda] = predictionPda(pollaPubkey, userPubkey);
      const userUsdcAta = getAssociatedTokenAddressSync(usdcMintKey, userPubkey);
      const sig = await program.methods
        .claimPrize()
        .accounts({
          polla: pollaPubkey,
          pollaVault: polla.vault,
          prediction: predPda,
          predictorUsdcAta: userUsdcAta,
          predictor: userPubkey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      setLastSig(sig);
      refresh();
    } catch (e) {
      setError((e as Error).message);
      Alert.alert('Claim failed', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [pollaPubkey, polla, wallet, userPubkey, prediction, refresh]);

  // Payout preview (only when settled + ranked)
  const payoutPreview = useMemo(() => {
    if (!polla || !prediction) return null;
    if (statusKey(polla.status) !== 'SETTLED') return null;
    if (prediction.finalRank === 0xff) return null;
    const sharePct = polla.prizeDistribution[prediction.finalRank] ?? 0;
    if (sharePct === 0) return null;
    const poolAfterFee = polla.totalPool.muln(9500).divn(10000);
    const active = Math.min(polla.numParticipants, polla.prizeDistribution.length);
    let denom = 0;
    for (let i = 0; i < active; i++) denom += polla.prizeDistribution[i];
    if (denom === 0) return null;
    return {
      sharePct,
      payout: poolAfterFee.muln(sharePct).divn(denom),
    };
  }, [polla, prediction]);

  if (!pollaPubkey) {
    return (
      <SafeAreaView className="flex-1 bg-bg-base items-center justify-center px-6">
        <Text className="text-red-alert">Invalid pool address.</Text>
      </SafeAreaView>
    );
  }

  const status = polla ? statusKey(polla.status) : null;

  return (
    <SafeAreaView className="flex-1 bg-bg-base" edges={['bottom']}>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
        <Text className="font-display text-xl uppercase text-text-primary" numberOfLines={1}>
          {polla ? decodeFixedString(polla.name) : 'POOL'}
        </Text>
        <ConnectButton />
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            tintColor="#FFD700"
            refreshing={loading}
            onRefresh={refresh}
          />
        }
      >
        {loading && !polla && (
          <View className="rounded-md border border-border-default bg-bg-card p-12 items-center">
            <ActivityIndicator color="#FFD700" />
          </View>
        )}

        {polla && status && (
          <>
            {/* Hero */}
            <View className="rounded-md border border-border-default bg-bg-card p-4 mb-4">
              <View className="flex-row items-start gap-3 mb-3">
                <Image
                  source={captain}
                  style={{ width: 64, height: 64 }}
                  contentFit="contain"
                />
                <View className="flex-1">
                  <Text
                    className={`font-display text-[11px] tracking-widest mb-1 ${
                      status === 'OPEN'
                        ? 'text-turf'
                        : status === 'LOCKED'
                          ? 'text-amber'
                          : 'text-text-muted'
                    }`}
                  >
                    {status}
                  </Text>
                  <Text className="font-display text-2xl uppercase text-text-primary">
                    {decodeFixedString(polla.name)}
                  </Text>
                  <Text className="text-xs text-text-muted">
                    {decodeFixedString(polla.tournament)}
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-3 pt-3 border-t border-border-subtle">
                <Stat label="ENTRY" value={formatUsdc(polla.entryAmount)} suffix="USDC" />
                <Stat label="POOL" value={formatUsdc(polla.totalPool)} suffix="USDC" />
                <Stat label="MATCHES" value={polla.numMatches.toString()} />
                <Stat label="PLAYERS" value={polla.numParticipants.toString()} />
              </View>
            </View>

            {/* Matches + picks */}
            <View className="rounded-md border border-border-default bg-bg-card p-4 mb-4">
              <Text className="font-display text-base tracking-widest text-text-primary mb-3">
                MATCHES & PICKS
              </Text>

              {!prediction && status === 'OPEN' && (
                <View className="rounded-md border border-amber/30 bg-amber/5 p-3 mb-3">
                  <Text className="text-xs font-display tracking-widest text-amber">
                    JOIN THE POOL TO UNLOCK PICKS
                  </Text>
                </View>
              )}

              {matches.map((m, i) => (
                <MatchRow
                  key={i}
                  index={i}
                  home={decodeFixedString(m.homeTeam)}
                  away={decodeFixedString(m.awayTeam)}
                  homeScore={scores[i]?.home ?? ''}
                  awayScore={scores[i]?.away ?? ''}
                  finalHome={m.settled ? m.homeScore : undefined}
                  finalAway={m.settled ? m.awayScore : undefined}
                  settled={m.settled}
                  locked={status !== 'OPEN' || !wallet || !prediction}
                  onChange={(home, away) =>
                    setScores((prev) => {
                      const next = [...prev];
                      next[i] = { home, away };
                      return next;
                    })
                  }
                />
              ))}

              {/* Action button */}
              <View className="mt-4 pt-4 border-t border-border-subtle">
                {!wallet && (
                  <Text className="text-text-secondary text-sm text-center">
                    Sign in to join + pick.
                  </Text>
                )}

                {wallet && !prediction && status === 'OPEN' && (
                  <Pressable
                    onPress={joinPool}
                    disabled={busy}
                    className="rounded-md bg-gold py-4 items-center"
                  >
                    <Text className="font-display text-sm tracking-widest text-black">
                      {busy
                        ? 'JOINING…'
                        : `JOIN POOL (${formatUsdc(polla.entryAmount)} USDC)`}
                    </Text>
                  </Pressable>
                )}

                {wallet && prediction && status === 'OPEN' && (
                  <Pressable
                    onPress={submitPicks}
                    disabled={busy}
                    className="rounded-md bg-gold py-4 items-center"
                  >
                    <Text className="font-display text-sm tracking-widest text-black">
                      {busy
                        ? 'SAVING…'
                        : prediction.scores.some((s) => s.home >= 0)
                          ? 'UPDATE PICKS'
                          : 'SAVE PICKS'}
                    </Text>
                  </Pressable>
                )}

                {prediction && status === 'LOCKED' && (
                  <View className="items-center">
                    <Image
                      source={waiting}
                      style={{ width: 64, height: 64, marginBottom: 8 }}
                      contentFit="contain"
                    />
                    <Text className="text-text-muted text-sm">
                      Picks locked. Waiting for results.
                    </Text>
                  </View>
                )}

                {prediction && status === 'SETTLED' && (
                  <View className="items-center">
                    {payoutPreview && !prediction.claimed ? (
                      <>
                        <Image
                          source={captain}
                          style={{ width: 80, height: 80, marginBottom: 8 }}
                          contentFit="contain"
                        />
                        <Text className="font-display text-2xl uppercase text-gold mb-1">
                          You ranked #{prediction.finalRank + 1}
                        </Text>
                        <Text className="text-sm text-text-muted mb-4">
                          {prediction.points} pts · {payoutPreview.sharePct}% of pool-after-fee
                        </Text>
                        <Pressable
                          onPress={claimPrize}
                          disabled={busy}
                          className="rounded-md bg-gold px-6 py-4"
                        >
                          <Text className="font-display text-sm tracking-widest text-black">
                            {busy
                              ? 'CLAIMING…'
                              : `CLAIM ${formatUsdc(payoutPreview.payout)} USDC`}
                          </Text>
                        </Pressable>
                      </>
                    ) : prediction.claimed ? (
                      <>
                        <Image
                          source={captain}
                          style={{ width: 64, height: 64, marginBottom: 8, opacity: 0.8 }}
                          contentFit="contain"
                        />
                        <Text className="font-display text-sm tracking-widest text-turf">
                          ✓ PRIZE CLAIMED · {prediction.points} PTS
                        </Text>
                      </>
                    ) : (
                      <>
                        <Image
                          source={sad}
                          style={{ width: 64, height: 64, marginBottom: 8 }}
                          contentFit="contain"
                        />
                        <Text className="text-text-muted text-sm text-center">
                          Pool settled. You scored {prediction.points} pts — not in the
                          prize tier this time.
                        </Text>
                      </>
                    )}
                  </View>
                )}

                {error && (
                  <Text className="mt-3 text-red-alert text-xs text-center">{error}</Text>
                )}
                {lastSig && (
                  <Pressable
                    onPress={() =>
                      Linking.openURL(
                        `https://explorer.solana.com/tx/${lastSig}?cluster=devnet`,
                      )
                    }
                  >
                    <Text className="mt-3 text-xs text-gold text-center font-mono">
                      Tx: {lastSig.slice(0, 12)}…
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <View className="flex-1">
      <Text className="font-display text-[10px] tracking-widest text-text-muted">{label}</Text>
      <Text className="font-display text-base text-text-primary">
        {value}
        {suffix ? <Text className="text-[10px] text-text-muted"> {suffix}</Text> : null}
      </Text>
    </View>
  );
}
