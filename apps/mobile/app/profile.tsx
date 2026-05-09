// User's prediction history. Calls program.account.prediction.all() with
// a memcmp filter on the predictor pubkey, then enriches with the parent
// polla's name + status.
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { decodeFixedString, getReadOnlyProgram } from '@/lib/anchor';
import { formatUsdc, statusKey } from '@/lib/format';
import { useWallet } from '@/lib/useWallet';
import { ConnectButton } from '@/components/ConnectButton';

const captain = require('../assets/pollitos/pollito_capitan_lider.webp');
const waiting = require('../assets/pollitos/Pollito_esperando.webp');

type PredEntry = {
  pollaPubkey: string;
  pollaName: string;
  tournament: string;
  status: 'OPEN' | 'LOCKED' | 'SETTLED';
  points: number;
  finalRank: number;
  claimed: boolean;
  totalPoolUsdc: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { wallet, pubkey: userPubkey, ready } = useWallet();
  const [entries, setEntries] = useState<PredEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userPubkey) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const program = getReadOnlyProgram();
        // Anchor `Prediction` discriminator is auto-applied — we add a
        // memcmp on the `predictor` field. Layout: [8 disc][32 polla]
        // [32 predictor]… so offset = 8 + 32 = 40.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const preds = await (program.account as any).prediction.all([
          {
            memcmp: {
              offset: 40,
              bytes: userPubkey!.toBase58(),
            },
          },
        ]);
        if (cancelled) return;

        // Enrich with parent polla
        const pollaKeys = Array.from(
          new Set(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            preds.map(({ account }: { account: any }) => account.polla.toBase58()),
          ),
        );
        const pollaPdas = pollaKeys.map((k) => new PublicKey(k));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pollas = await (program.account as any).polla.fetchMultiple(pollaPdas);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pollaByKey: Record<string, any> = {};
        pollaPdas.forEach((pk, i) => {
          if (pollas[i]) pollaByKey[pk.toBase58()] = pollas[i];
        });

        const list: PredEntry[] = preds.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ({ account }: { account: any }) => {
            const pk = account.polla.toBase58();
            const polla = pollaByKey[pk];
            return {
              pollaPubkey: pk,
              pollaName: polla ? decodeFixedString(polla.name) : '???',
              tournament: polla ? decodeFixedString(polla.tournament) : '',
              status: polla ? statusKey(polla.status) : 'OPEN',
              points: account.points,
              finalRank: account.finalRank,
              claimed: account.claimed,
              totalPoolUsdc: polla ? formatUsdc(polla.totalPool as BN) : '0.00',
            };
          },
        );

        // Sort: settled+unclaimed first, then locked, then open, then claimed
        list.sort((a, b) => {
          const score = (e: PredEntry) =>
            e.status === 'SETTLED' && !e.claimed && e.finalRank !== 0xff
              ? 0
              : e.status === 'SETTLED'
                ? 3
                : e.status === 'LOCKED'
                  ? 1
                  : 2;
          return score(a) - score(b);
        });

        setEntries(list);
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
  }, [userPubkey, tick]);

  return (
    <SafeAreaView className="flex-1 bg-bg-base" edges={['bottom']}>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
        <Text className="font-display text-2xl uppercase text-text-primary">My Picks</Text>
        <ConnectButton />
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            tintColor="#FFD700"
            refreshing={loading}
            onRefresh={() => setTick((t) => t + 1)}
          />
        }
      >
        {ready && !wallet && (
          <View className="rounded-md border border-border-default bg-bg-card p-10 items-center">
            <Image
              source={waiting}
              style={{ width: 100, height: 100, marginBottom: 16 }}
              contentFit="contain"
            />
            <Text className="font-display text-xl uppercase text-text-primary mb-2">
              Sign in to see your picks
            </Text>
            <ConnectButton />
          </View>
        )}

        {wallet && loading && entries.length === 0 && (
          <View className="rounded-md border border-border-default bg-bg-card p-12 items-center">
            <ActivityIndicator color="#FFD700" />
          </View>
        )}

        {wallet && error && (
          <View className="rounded-md border border-red-alert/40 bg-bg-card p-8">
            <Text className="text-red-alert text-sm">Failed to load: {error}</Text>
          </View>
        )}

        {wallet && !loading && !error && entries.length === 0 && (
          <View className="rounded-md border border-border-default bg-bg-card p-10 items-center">
            <Image
              source={waiting}
              style={{ width: 100, height: 100, marginBottom: 16 }}
              contentFit="contain"
            />
            <Text className="font-display text-xl uppercase text-text-primary mb-2">
              No predictions yet
            </Text>
            <Text className="text-sm text-text-muted text-center mb-4">
              Browse pools and join one to see your picks here.
            </Text>
            <Pressable
              onPress={() => router.push('/pools')}
              className="rounded-md bg-gold px-6 py-3"
            >
              <Text className="font-display text-xs tracking-widest text-black">
                BROWSE POOLS →
              </Text>
            </Pressable>
          </View>
        )}

        {wallet &&
          !error &&
          entries.map((e) => (
            <Pressable
              key={e.pollaPubkey}
              onPress={() => router.push(`/pools/${e.pollaPubkey}`)}
              className="rounded-md border border-border-default bg-bg-card p-4 mb-3"
            >
              <View className="flex-row items-start gap-3">
                <Image
                  source={captain}
                  style={{ width: 48, height: 48 }}
                  contentFit="contain"
                />
                <View className="flex-1">
                  <Text
                    className={`font-display text-[11px] tracking-widest mb-1 ${
                      e.status === 'OPEN'
                        ? 'text-turf'
                        : e.status === 'LOCKED'
                          ? 'text-amber'
                          : 'text-text-muted'
                    }`}
                  >
                    {e.status}
                    {e.status === 'SETTLED' &&
                      e.finalRank !== 0xff &&
                      ` · #${e.finalRank + 1}`}
                  </Text>
                  <Text
                    className="font-display text-base uppercase text-text-primary"
                    numberOfLines={1}
                  >
                    {e.pollaName}
                  </Text>
                  <Text className="text-xs text-text-muted" numberOfLines={1}>
                    {e.tournament} · {e.points} pts
                  </Text>
                  {e.status === 'SETTLED' && !e.claimed && e.finalRank !== 0xff && (
                    <Text className="font-display text-xs tracking-widest text-gold mt-1">
                      ★ CLAIM AVAILABLE
                    </Text>
                  )}
                  {e.claimed && (
                    <Text className="font-display text-xs tracking-widest text-turf mt-1">
                      ✓ CLAIMED
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}
