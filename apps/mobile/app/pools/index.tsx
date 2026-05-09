// Browse all pools — calls program.account.polla.all() with a read-only
// wallet stub, filters to the configured USDC mint, and renders cards.
// Mirrors apps/web/app/pollas/page.tsx logic.
import { useEffect, useState } from 'react';
import { ScrollView, Text, View, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { getReadOnlyProgram, decodeFixedString } from '@/lib/anchor';
import { USDC_MINT } from '@/lib/constants';
import { formatUsdc, statusKey } from '@/lib/format';
import { PoolCard, type PoolCardData } from '@/components/PoolCard';
import { ConnectButton } from '@/components/ConnectButton';

const waiting = require('../../assets/pollitos/Pollito_esperando.webp');

type RawPolla = {
  creator: PublicKey;
  name: number[];
  tournament: number[];
  entryAmount: BN;
  usdcMint: PublicKey;
  numMatches: number;
  matchesSettled: number;
  numParticipants: number;
  totalPool: BN;
  status: { open?: object; locked?: object; settled?: object };
  prizeDistribution: number[];
};

export default function PoolsScreen() {
  const [pools, setPools] = useState<PoolCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const program = getReadOnlyProgram();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const accs = await (program.account as any).polla.all();
        if (cancelled) return;

        const configuredMint = new PublicKey(USDC_MINT);
        const filtered = accs.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ({ account }: { account: any }) =>
            (account as RawPolla).usdcMint.equals(configuredMint),
        );

        const cards: PoolCardData[] = filtered.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ({ publicKey, account }: { publicKey: PublicKey; account: any }) => {
            const raw = account as RawPolla;
            return {
              pubkey: publicKey.toBase58(),
              name: decodeFixedString(raw.name),
              tournament: decodeFixedString(raw.tournament),
              entryUsdc: formatUsdc(raw.entryAmount),
              numMatches: raw.numMatches,
              numParticipants: raw.numParticipants,
              totalPoolUsdc: formatUsdc(raw.totalPool),
              status: statusKey(raw.status),
            };
          },
        );
        cards.sort((a, b) => a.name.localeCompare(b.name));
        setPools(cards);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          const err = e as Error;
          // Surface stack so we can debug "undefined is not a function" type
          // errors on real devices via the on-screen banner (no adb logcat
          // available on Play Protect-locked phones).
          const stackHead = (err.stack ?? '').split('\n').slice(0, 4).join('\n');
          setError(`${err.message}\n\n${stackHead}`);
          // eslint-disable-next-line no-console
          console.warn('[pools.load] error:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return (
    <SafeAreaView className="flex-1 bg-bg-base" edges={['bottom']}>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
        <Text className="font-display text-2xl uppercase text-text-primary">Public Pools</Text>
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
        {loading && pools.length === 0 && (
          <View className="rounded-md border border-border-default bg-bg-card p-12 items-center">
            <ActivityIndicator color="#FFD700" />
            <Text className="mt-3 font-display text-xs tracking-widest text-text-muted">
              LOADING ON-CHAIN…
            </Text>
          </View>
        )}

        {error && !loading && (
          <View className="rounded-md border border-red-alert/40 bg-bg-card p-12 items-center">
            <Text className="text-red-alert text-sm text-center">Failed to load: {error}</Text>
          </View>
        )}

        {!loading && !error && pools.length === 0 && (
          <View className="rounded-md border border-border-default bg-bg-card p-10 items-center">
            <Image
              source={waiting}
              style={{ width: 120, height: 120, marginBottom: 16, opacity: 0.9 }}
              contentFit="contain"
            />
            <Text className="font-display text-xl uppercase text-text-primary mb-2">
              No pools yet
            </Text>
            <Text className="text-sm text-text-muted text-center">
              Run <Text className="text-gold">pnpm seed:demo</Text> in the monorepo to
              create the demo pool, or visit the web app to make your own.
            </Text>
          </View>
        )}

        {!loading &&
          !error &&
          pools.length > 0 &&
          pools.map((p) => <PoolCard key={p.pubkey} pool={p} />)}
      </ScrollView>
    </SafeAreaView>
  );
}
