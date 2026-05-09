// Polla card — la-polla visual style.
// Examples (from screenshots):
//   ┌────────────────────────────────────────────────────────┐
//   │ Primos polla 2                                         │
//   │ 4   $10.000 c/u            POZO  $40.000               │
//   │                                                        │
//   │ #1 ─────────────────── 16 PTS ────── 10 de 11 partidos │
//   └────────────────────────────────────────────────────────┘
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
const arquero = require('../assets/pollitos/pollito_arquero_lider.webp');
const goleador = require('../assets/pollitos/pollito_goleador_lider.webp');

// Pick a pollito sprite based on a stable pubkey hash so each pool gets a
// consistent face without the user feeling it's random.
function pickPollito(pubkey: string) {
  const sum = Array.from(pubkey).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const all = [captain, arquero, goleador];
  return all[sum % all.length];
}

export function PoolCard({ pool }: { pool: PoolCardData }) {
  const router = useRouter();
  const statusBadge = badgeStyle(pool.status);
  const sprite = pickPollito(pool.pubkey);

  return (
    <Pressable
      onPress={() => router.push(`/pools/${pool.pubkey}`)}
      className="rounded-lg border border-border-default bg-bg-card p-4 mb-3"
    >
      {/* Header row: title + status badge */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1 pr-2">
          <Text
            className="font-display text-lg uppercase text-text-primary"
            numberOfLines={1}
          >
            {pool.name}
          </Text>
          <Text className="text-xs text-text-muted" numberOfLines={1}>
            {pool.tournament}
          </Text>
        </View>
        <View
          className="rounded-md px-2 py-1"
          style={{ backgroundColor: statusBadge.bg }}
        >
          <Text
            className="font-display text-[10px] tracking-widest"
            style={{ color: statusBadge.fg }}
          >
            {pool.status}
          </Text>
        </View>
      </View>

      {/* Stats row: participants · entry · pool */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          {/* Participants chip */}
          <View className="flex-row items-center gap-1 rounded-full bg-bg-elevated px-2 py-1">
            <Image
              source={sprite}
              style={{ width: 18, height: 18 }}
              contentFit="contain"
            />
            <Text className="font-display text-xs text-text-primary">
              {pool.numParticipants}
            </Text>
          </View>
          <Text className="font-display text-base text-gold">
            ${pool.entryUsdc}
          </Text>
          <Text className="text-[10px] text-text-muted">USDC c/u</Text>
        </View>
        <View className="items-end">
          <Text className="font-display text-[10px] tracking-widest text-text-muted">
            POZO
          </Text>
          <Text className="font-display text-lg text-gold">
            ${pool.totalPoolUsdc}
          </Text>
        </View>
      </View>

      {/* Footer row: matches count */}
      <View
        className="flex-row items-center justify-between pt-3 rounded-md px-3 py-2 -mx-1"
        style={{ backgroundColor: '#0C1116' }}
      >
        <Text className="font-display text-[10px] tracking-widest text-text-muted">
          {pool.numMatches} PARTIDOS
        </Text>
        <Text className="font-display text-[10px] tracking-widest text-amber">
          {pool.numParticipants} JUGADORES
        </Text>
      </View>
    </Pressable>
  );
}

function badgeStyle(status: PoolCardData['status']) {
  switch (status) {
    case 'OPEN':
      return { bg: 'rgba(31, 216, 127, 0.15)', fg: '#1FD87F' };
    case 'LOCKED':
      return { bg: 'rgba(255, 159, 28, 0.15)', fg: '#FF9F1C' };
    case 'SETTLED':
    default:
      return { bg: 'rgba(122, 134, 148, 0.15)', fg: '#B8C2CC' };
  }
}
