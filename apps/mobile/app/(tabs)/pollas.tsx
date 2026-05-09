// Browse all pools — fetches from /api/pools (server-side Anchor decode).
//
// Moved from app/pools/index.tsx into the tab group. Deep-links to a
// specific pool (`/pools/:id`) still resolve outside the group.
//
// We used to call program.account.polla.all() directly here, but Hermes
// (RN's JS engine) chokes inside Anchor's borsh decoder with
// "undefined is not a function at decode" — even after polyfilling
// structuredClone, Promise.withResolvers, findLast, etc. The server has
// no Hermes gaps, so the server-side fetch is reliable. Mobile just
// renders the JSON.
import { useEffect, useState } from 'react';
import { ScrollView, Text, View, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PoolCard, type PoolCardData } from '@/components/PoolCard';
import { ConnectButton } from '@/components/ConnectButton';

const POOLS_API = 'https://onchain.chickenpicks.app/api/pools';

const waiting = require('../../assets/pollitos/Pollito_esperando.webp');

export default function PollasScreen() {
  const [pools, setPools] = useState<PoolCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const r = await fetch(POOLS_API, { cache: 'no-store' });
        const data = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          throw new Error(data?.error ?? `HTTP ${r.status}`);
        }
        const cards: PoolCardData[] = (data.pools ?? []) as PoolCardData[];
        setPools(cards);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          const err = e as Error;
          setError(err.message);
          // eslint-disable-next-line no-console
          console.warn('[pollas.load] error:', err);
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

  // Group pools la-polla style: activas (OPEN/LOCKED) vs finalizadas (SETTLED).
  const activas = pools.filter((p) => p.status !== 'SETTLED');
  const finalizadas = pools.filter((p) => p.status === 'SETTLED');

  return (
    <SafeAreaView className="flex-1 bg-bg-base" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
        <Text className="font-display text-2xl uppercase text-text-primary">
          Mis Pollas
        </Text>
        <ConnectButton />
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
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
              No pollas yet
            </Text>
            <Text className="text-sm text-text-muted text-center">
              Run <Text className="text-gold">pnpm seed:demo</Text> in the monorepo to
              create the demo polla, or visit the web app to make your own.
            </Text>
          </View>
        )}

        {!loading && !error && activas.length > 0 && (
          <>
            <SectionHeader label="MIS POLLAS ACTIVAS" count={activas.length} />
            {activas.map((p) => (
              <PoolCard key={p.pubkey} pool={p} />
            ))}
          </>
        )}

        {!loading && !error && finalizadas.length > 0 && (
          <>
            <View className="h-2" />
            <SectionHeader label="FINALIZADAS" count={finalizadas.length} muted />
            {finalizadas.map((p) => (
              <PoolCard key={p.pubkey} pool={p} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({
  label,
  count,
  muted,
}: {
  label: string;
  count: number;
  muted?: boolean;
}) {
  return (
    <View className="flex-row items-center gap-2 mb-3 mt-1">
      <Text
        className={`font-display text-xs tracking-widest ${muted ? 'text-text-muted' : 'text-gold'}`}
      >
        {label}
      </Text>
      <Text className="font-display text-xs tracking-widest text-text-muted">
        · {count}
      </Text>
    </View>
  );
}
