import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

export type PoolCardData = {
  pubkey: string;
  name: string;
  tournament: string;
  entryUsdc: string;
  numMatches: number;
  numParticipants: number;
  totalPoolUsdc: string;
  status: 'OPEN' | 'LOCKED' | 'SETTLED';
};

const captain = require('../assets/pollitos/pollito_capitan_lider.webp');

export function PoolCard({ pool }: { pool: PoolCardData }) {
  const router = useRouter();
  const statusColor =
    pool.status === 'OPEN'
      ? 'text-turf'
      : pool.status === 'LOCKED'
        ? 'text-amber'
        : 'text-text-muted';
  return (
    <Pressable
      onPress={() => router.push(`/pools/${pool.pubkey}`)}
      className="rounded-md border border-border-default bg-bg-card p-4 mb-3"
    >
      <View className="flex-row items-start gap-3 mb-3">
        <Image source={captain} style={{ width: 48, height: 48 }} contentFit="contain" />
        <View className="flex-1">
          <Text className={`font-display text-[11px] tracking-widest mb-1 ${statusColor}`}>
            {pool.status}
          </Text>
          <Text className="font-display text-lg uppercase text-text-primary" numberOfLines={1}>
            {pool.name}
          </Text>
          <Text className="text-xs text-text-muted" numberOfLines={1}>
            {pool.tournament}
          </Text>
        </View>
      </View>
      <View className="flex-row gap-3 pt-3 border-t border-border-subtle">
        <Stat label="ENTRY" value={pool.entryUsdc} suffix="USDC" />
        <Stat label="MATCHES" value={pool.numMatches.toString()} />
        <Stat label="PLAYERS" value={pool.numParticipants.toString()} />
      </View>
    </Pressable>
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
