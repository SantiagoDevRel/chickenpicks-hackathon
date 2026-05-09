// Inicio — la-polla style home screen for logged-in users.
//
// Sections:
//   1. Pollito greeting + wordmark
//   2. "+ CREAR POLLA NUEVA" yellow CTA → /(tabs)/crear
//   3. "🔗 UNIRME CON CÓDIGO" outlined CTA (alert stub for now)
//   4. "MIS POLLAS ACTIVAS" preview (1-3 cards)
//   5. "AVISOS RECIENTES" preview (3 lines)
//   6. "🎙 TALK TO COACH" button → VoiceCoachModal
//
// We re-use the same /api/pools and /api/avisos endpoints the dedicated
// tabs use (/pollas + /avisos). Brief view here, full lists in tabs.
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useWallet } from '@/lib/useWallet';
import { ConnectButton } from '@/components/ConnectButton';
import { PoolCard, type PoolCardData } from '@/components/PoolCard';
import { VoiceCoachModal } from '@/components/VoiceCoachModal';

const POOLS_API = 'https://onchain.chickenpicks.app/api/pools';
const AVISOS_API = 'https://onchain.chickenpicks.app/api/avisos';

const captain = require('../../assets/pollitos/pollito_capitan_lider.webp');

type Aviso = {
  id: string;
  type: string; // 'iniciaste-sesion' | 'clavaste-marcador' | 'subiste-#1' | …
  title: string;
  body?: string;
  context?: string;
  createdAt: string;
  unread?: boolean;
};

export default function InicioScreen() {
  const router = useRouter();
  const { wallet, pubkey, ready } = useWallet();
  const [pools, setPools] = useState<PoolCardData[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(false);
  const [coachVisible, setCoachVisible] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [poolsRes, avisosRes] = await Promise.allSettled([
          fetch(POOLS_API, { cache: 'no-store' }).then((r) => r.json()),
          pubkey
            ? fetch(`${AVISOS_API}?wallet=${pubkey.toBase58()}`, { cache: 'no-store' })
                .then((r) => r.json())
                .catch(() => ({ avisos: [] }))
            : Promise.resolve({ avisos: [] }),
        ]);
        if (cancelled) return;
        if (poolsRes.status === 'fulfilled') {
          setPools((poolsRes.value?.pools ?? []) as PoolCardData[]);
        }
        if (avisosRes.status === 'fulfilled') {
          setAvisos((avisosRes.value?.avisos ?? []) as Aviso[]);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[inicio.load] error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [pubkey, tick]);

  // Top 3 active pools.
  const activePools = pools.filter((p) => p.status !== 'SETTLED').slice(0, 3);
  const recentAvisos = avisos.slice(0, 3);

  return (
    <SafeAreaView className="flex-1 bg-bg-base" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
        <View className="flex-row items-baseline gap-1">
          <Text className="font-display text-xl tracking-wider text-gold">CHICKEN</Text>
          <Text className="font-display text-xl tracking-wider text-amber">PICKS</Text>
          <Text className="font-display text-xl tracking-wider text-turf">ONCHAIN</Text>
        </View>
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
        {/* Greeting */}
        <View className="rounded-lg border border-border-default bg-bg-card p-4 mb-4 flex-row items-center gap-4">
          <Image
            source={captain}
            style={{ width: 72, height: 72 }}
            contentFit="contain"
          />
          <View className="flex-1">
            <Text className="font-display text-[11px] tracking-widest text-text-muted mb-1">
              ¡HOLA!
            </Text>
            <Text className="font-display text-xl uppercase text-text-primary">
              {wallet ? '¡Listo para jugar!' : 'Bienvenido a la cancha'}
            </Text>
            <Text className="text-sm text-text-secondary">
              {wallet
                ? 'Crea una polla, únete con código o llama al coach.'
                : 'Inicia sesión para arrancar.'}
            </Text>
          </View>
        </View>

        {/* Primary CTAs */}
        <Pressable
          onPress={() => router.push('/(tabs)/crear')}
          className="rounded-lg bg-gold px-5 py-4 mb-3 flex-row items-center justify-center"
        >
          <Text className="font-display text-base tracking-widest text-black">
            + CREAR POLLA NUEVA
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            Alert.alert(
              'Unirme con código',
              'TODO: invite-code modal — paste a polla pubkey or short code to deep-link to /pools/<id>.',
            )
          }
          className="rounded-lg border border-gold/50 bg-bg-card px-5 py-4 mb-6 flex-row items-center justify-center"
        >
          <Text className="font-display text-base tracking-widest text-gold">
            🔗  UNIRME CON CÓDIGO
          </Text>
        </Pressable>

        {/* Active pollas preview */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="font-display text-xs tracking-widest text-gold">
            MIS POLLAS ACTIVAS · {activePools.length}
          </Text>
          {pools.length > 0 && (
            <Pressable onPress={() => router.push('/(tabs)/pollas')}>
              <Text className="font-display text-[11px] tracking-widest text-text-muted">
                VER TODAS →
              </Text>
            </Pressable>
          )}
        </View>

        {!ready && (
          <Text className="text-text-muted text-sm">Loading…</Text>
        )}

        {ready && activePools.length === 0 && (
          <View className="rounded-lg border border-border-default bg-bg-card p-6 items-center mb-4">
            <Text className="font-display text-sm uppercase text-text-primary mb-1">
              Todavía no tienes pollas activas
            </Text>
            <Text className="text-xs text-text-muted text-center">
              Crea la primera o únete con un código.
            </Text>
          </View>
        )}

        {activePools.map((p) => (
          <PoolCard key={p.pubkey} pool={p} />
        ))}

        {/* Avisos preview */}
        <View className="flex-row items-center justify-between mb-3 mt-4">
          <Text className="font-display text-xs tracking-widest text-gold">
            AVISOS RECIENTES
          </Text>
          {avisos.length > 0 && (
            <Pressable onPress={() => router.push('/(tabs)/avisos')}>
              <Text className="font-display text-[11px] tracking-widest text-text-muted">
                VER TODOS →
              </Text>
            </Pressable>
          )}
        </View>

        {recentAvisos.length === 0 && (
          <View className="rounded-lg border border-border-default bg-bg-card p-6">
            <Text className="text-text-muted text-sm text-center">
              No hay avisos por ahora.
            </Text>
          </View>
        )}

        {recentAvisos.map((a) => (
          <View
            key={a.id}
            className="rounded-lg border border-border-default bg-bg-card p-3 mb-2 flex-row items-center gap-3"
          >
            <View
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: a.unread ? '#FFD700' : '#2A3441' }}
            />
            <View className="flex-1">
              <Text
                className="font-display text-sm uppercase text-text-primary"
                numberOfLines={1}
              >
                {a.title}
              </Text>
              {a.body && (
                <Text className="text-xs text-text-muted" numberOfLines={1}>
                  {a.body}
                </Text>
              )}
            </View>
          </View>
        ))}

        {/* Talk to coach */}
        <Pressable
          onPress={() => setCoachVisible(true)}
          className="rounded-lg border border-amber/60 bg-bg-card px-5 py-4 mt-6 flex-row items-center justify-center"
        >
          <Text className="font-display text-base tracking-widest text-amber">
            🎙  TALK TO COACH
          </Text>
        </Pressable>
      </ScrollView>

      <VoiceCoachModal visible={coachVisible} onClose={() => setCoachVisible(false)} />
    </SafeAreaView>
  );
}
