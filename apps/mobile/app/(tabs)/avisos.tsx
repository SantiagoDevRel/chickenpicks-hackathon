// Avisos — la-polla event feed.
//
// Mirrors screenshot 175616 — list of cards each with:
//   - Icon (sign-in arrow / pollito for score events)
//   - Title (e.g. "Iniciaste sesión con código")
//   - Subtitle ("Desde Windows en Medellín, CO")
//   - Right side: relative time + unread dot
//
// Pulls from `https://onchain.chickenpicks.app/api/avisos?wallet=<pubkey>`
// (sibling agent is scaffolding the endpoint with hardcoded sample data).
// We render gracefully whether the endpoint returns data or not.
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
import { useWallet } from '@/lib/useWallet';
import { ConnectButton } from '@/components/ConnectButton';

const AVISOS_API = 'https://onchain.chickenpicks.app/api/avisos';

const captain = require('../../assets/pollitos/pollito_capitan_lider.webp');
const arquero = require('../../assets/pollitos/pollito_arquero_lider.webp');
const sad = require('../../assets/pollitos/pollito_arquero_triste.webp');
const waiting = require('../../assets/pollitos/Pollito_esperando.webp');

type AvisoType =
  | 'iniciaste-sesion'
  | 'clavaste-marcador'
  | 'subiste-rank'
  | 'te-paso'
  | 'invitacion'
  | 'generic';

type Aviso = {
  id: string;
  type: AvisoType;
  title: string;
  body?: string;
  context?: string;
  createdAt: string; // ISO
  unread?: boolean;
  pollaPubkey?: string;
};

export default function AvisosScreen() {
  const { wallet, pubkey } = useWallet();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!pubkey) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const url = `${AVISOS_API}?wallet=${pubkey!.toBase58()}`;
        const r = await fetch(url, { cache: 'no-store' });
        const data = await r.json();
        if (cancelled) return;
        if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
        setAvisos((data.avisos ?? []) as Aviso[]);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          // eslint-disable-next-line no-console
          console.warn('[avisos.load] error:', e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [pubkey, tick]);

  const onMarkAllRead = () => {
    setAvisos((prev) => prev.map((a) => ({ ...a, unread: false })));
    // TODO: POST /api/avisos/mark-read once the endpoint exists.
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-base" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
        <Text className="font-display text-2xl uppercase text-text-primary">Avisos</Text>
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
        {!wallet && (
          <View className="rounded-lg border border-border-default bg-bg-card p-10 items-center">
            <Image
              source={waiting}
              style={{ width: 100, height: 100, marginBottom: 16 }}
              contentFit="contain"
            />
            <Text className="font-display text-base uppercase text-text-primary mb-2">
              Inicia sesión para ver tus avisos
            </Text>
            <ConnectButton />
          </View>
        )}

        {wallet && avisos.length > 0 && (
          <View className="flex-row items-center justify-end mb-3">
            <Pressable onPress={onMarkAllRead}>
              <Text className="font-display text-[11px] tracking-widest text-gold">
                ✓ LEER TODAS
              </Text>
            </Pressable>
          </View>
        )}

        {wallet && loading && avisos.length === 0 && (
          <View className="rounded-lg border border-border-default bg-bg-card p-12 items-center">
            <ActivityIndicator color="#FFD700" />
          </View>
        )}

        {wallet && error && (
          <View className="rounded-lg border border-red-alert/40 bg-bg-card p-6 mb-3">
            <Text className="text-red-alert text-sm">No pudimos cargar avisos: {error}</Text>
            <Text className="text-text-muted text-xs mt-2">
              Endpoint: GET /api/avisos?wallet=&lt;pubkey&gt;
            </Text>
          </View>
        )}

        {wallet && !loading && !error && avisos.length === 0 && (
          <View className="rounded-lg border border-border-default bg-bg-card p-10 items-center">
            <Image
              source={waiting}
              style={{ width: 96, height: 96, marginBottom: 12 }}
              contentFit="contain"
            />
            <Text className="font-display text-base uppercase text-text-primary mb-1">
              No tienes avisos
            </Text>
            <Text className="text-xs text-text-muted text-center">
              Cuando alguien te pase, claves un marcador o te inviten a una polla, lo verás aquí.
            </Text>
          </View>
        )}

        {avisos.map((a) => (
          <AvisoCard key={a.id} aviso={a} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function AvisoCard({ aviso }: { aviso: Aviso }) {
  const { icon, accent } = avisoVisual(aviso.type);
  return (
    <View
      className={`rounded-lg border ${
        aviso.unread ? 'border-gold/40' : 'border-border-default'
      } bg-bg-card p-3 mb-2 flex-row items-start gap-3`}
    >
      <View
        className="w-10 h-10 rounded-full bg-bg-elevated items-center justify-center"
        style={{ borderWidth: 1, borderColor: accent }}
      >
        {typeof icon === 'string' ? (
          <Text className="font-display text-base" style={{ color: accent }}>
            {icon}
          </Text>
        ) : (
          <Image source={icon} style={{ width: 28, height: 28 }} contentFit="contain" />
        )}
      </View>
      <View className="flex-1">
        <Text
          className="font-display text-sm uppercase text-text-primary"
          numberOfLines={1}
        >
          {aviso.title}
        </Text>
        {aviso.body && (
          <Text className="text-xs text-text-secondary mt-0.5" numberOfLines={2}>
            {aviso.body}
          </Text>
        )}
        {aviso.context && (
          <Text className="text-[10px] text-text-muted mt-1" numberOfLines={1}>
            {aviso.context}
          </Text>
        )}
      </View>
      <View className="items-end">
        <Text className="text-[10px] text-text-muted">{relativeTime(aviso.createdAt)}</Text>
        {aviso.unread && (
          <View
            className="w-2 h-2 rounded-full bg-gold mt-1"
            style={{ marginRight: 2 }}
          />
        )}
      </View>
    </View>
  );
}

function avisoVisual(type: AvisoType): {
  icon: string | number;
  accent: string;
} {
  switch (type) {
    case 'iniciaste-sesion':
      return { icon: '→', accent: '#FFD700' };
    case 'clavaste-marcador':
      return { icon: arquero, accent: '#1FD87F' };
    case 'subiste-rank':
      return { icon: captain, accent: '#FFD700' };
    case 'te-paso':
      return { icon: sad, accent: '#FF3D57' };
    case 'invitacion':
      return { icon: '✉', accent: '#FF9F1C' };
    case 'generic':
    default:
      return { icon: '•', accent: '#7A8694' };
  }
}

function relativeTime(iso: string): string {
  try {
    const d = new Date(iso);
    const ms = Date.now() - d.getTime();
    const m = Math.round(ms / 60000);
    if (m < 1) return 'ahora';
    if (m < 60) return `hace ${m}m`;
    const h = Math.round(m / 60);
    if (h < 24) return `hace ${h}h`;
    const days = Math.round(h / 24);
    if (days < 7) return `hace ${days}d`;
    const weeks = Math.round(days / 7);
    return `hace ${weeks}sem`;
  } catch {
    return '—';
  }
}
