// Mi Perfil — la-polla style.
//
// Layout (mirrors screenshot 175620):
//   - Header strip: title "MI PERFIL"
//   - Avatar card with pollito + wallet shortname
//   - "Cuenta para cobrar" pill (here: full pubkey)
//   - List of historical predictions / claim CTAs
//
// Fetches /api/predictions?wallet=... — server-side Anchor decode bypasses
// Hermes' borsh decoder bug (same rationale as /pools).
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useWallet } from '@/lib/useWallet';
import { ConnectButton } from '@/components/ConnectButton';

const PREDICTIONS_API = 'https://onchain.chickenpicks.app/api/predictions';

const captain = require('../../assets/pollitos/pollito_capitan_lider.webp');
const waiting = require('../../assets/pollitos/Pollito_esperando.webp');

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

export default function PerfilScreen() {
  const router = useRouter();
  const { wallet, pubkey: userPubkey, ready, disconnect } = useWallet();
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
        const url = `${PREDICTIONS_API}?wallet=${userPubkey!.toBase58()}`;
        const r = await fetch(url, { cache: 'no-store' });
        const data = await r.json();
        if (cancelled) return;
        if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
        setEntries((data.entries ?? []) as PredEntry[]);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          const err = e as Error;
          setError(err.message);
          // eslint-disable-next-line no-console
          console.warn('[perfil.load] error:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [userPubkey, tick]);

  const onCopyAddress = useCallback(async () => {
    if (!userPubkey) return;
    await Clipboard.setStringAsync(userPubkey.toBase58());
    Alert.alert('Copiado', 'Wallet address copied to clipboard');
  }, [userPubkey]);

  const onSignOut = useCallback(() => {
    Alert.alert('Cerrar sesión', '¿Salir y desconectar la wallet?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await disconnect();
          router.replace('/');
        },
      },
    ]);
  }, [disconnect, router]);

  const short = userPubkey
    ? `${userPubkey.toBase58().slice(0, 4)}…${userPubkey.toBase58().slice(-4)}`
    : '';
  const fullAddress = userPubkey?.toBase58() ?? '';

  return (
    <SafeAreaView className="flex-1 bg-bg-base" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
        <Text className="font-display text-2xl uppercase text-text-primary">Mi Perfil</Text>
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
        {ready && !wallet && (
          <View className="rounded-lg border border-border-default bg-bg-card p-10 items-center">
            <Image
              source={waiting}
              style={{ width: 100, height: 100, marginBottom: 16 }}
              contentFit="contain"
            />
            <Text className="font-display text-xl uppercase text-text-primary mb-2">
              Inicia sesión para ver tu perfil
            </Text>
            <ConnectButton />
          </View>
        )}

        {wallet && (
          <>
            {/* Avatar card */}
            <View className="rounded-lg border border-border-default bg-bg-card p-5 items-center mb-4">
              <View className="relative mb-3">
                <Image
                  source={captain}
                  style={{ width: 96, height: 96 }}
                  contentFit="contain"
                />
                <View
                  className="absolute -bottom-1 -right-1 rounded-full bg-gold px-2 py-1"
                  style={{ borderWidth: 2, borderColor: '#080C10' }}
                >
                  <Text className="font-display text-[10px] tracking-widest text-black">
                    EDITAR
                  </Text>
                </View>
              </View>
              <Text className="font-display text-2xl uppercase text-text-primary mb-1">
                {short}
              </Text>
              <Pressable onPress={onCopyAddress}>
                <Text className="text-xs text-text-muted">{fullAddress}</Text>
              </Pressable>
            </View>

            {/* Wallet address card */}
            <View className="rounded-lg border border-border-default bg-bg-card p-4 mb-4">
              <Text className="font-display text-[10px] tracking-widest text-text-muted mb-2">
                CUENTA PARA COBRAR
              </Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-base text-gold flex-shrink" numberOfLines={1}>
                  {fullAddress}
                </Text>
                <Pressable
                  onPress={onCopyAddress}
                  className="rounded-md border border-border-default bg-bg-elevated px-3 py-1.5"
                >
                  <Text className="font-display text-[10px] tracking-widest text-text-primary">
                    COPIAR
                  </Text>
                </Pressable>
              </View>
              <Text className="text-[10px] text-text-muted mt-2">
                Solana devnet · USDC payouts
              </Text>
            </View>

            {/* Predictions list */}
            <Text className="font-display text-xs tracking-widest text-gold mb-3 mt-2">
              MIS PREDICCIONES · {entries.length}
            </Text>

            {loading && entries.length === 0 && (
              <View className="rounded-lg border border-border-default bg-bg-card p-12 items-center">
                <ActivityIndicator color="#FFD700" />
              </View>
            )}

            {error && (
              <View className="rounded-lg border border-red-alert/40 bg-bg-card p-6 mb-3">
                <Text className="text-red-alert text-sm">Failed to load: {error}</Text>
              </View>
            )}

            {!loading && !error && entries.length === 0 && (
              <View className="rounded-lg border border-border-default bg-bg-card p-8 items-center">
                <Image
                  source={waiting}
                  style={{ width: 80, height: 80, marginBottom: 12 }}
                  contentFit="contain"
                />
                <Text className="font-display text-base uppercase text-text-primary mb-1">
                  No predictions yet
                </Text>
                <Text className="text-sm text-text-muted text-center mb-4">
                  Browse pollas and join one to see your picks here.
                </Text>
                <Pressable
                  onPress={() => router.push('/(tabs)/pollas')}
                  className="rounded-md bg-gold px-6 py-3"
                >
                  <Text className="font-display text-xs tracking-widest text-black">
                    BROWSE POLLAS →
                  </Text>
                </Pressable>
              </View>
            )}

            {!error &&
              entries.map((e) => (
                <Pressable
                  key={e.pollaPubkey}
                  onPress={() => router.push(`/pools/${e.pollaPubkey}`)}
                  className="rounded-lg border border-border-default bg-bg-card p-4 mb-3"
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

            {/* Sign out */}
            <Pressable onPress={onSignOut} className="mt-4 py-3 items-center">
              <Text className="font-display text-xs tracking-widest text-red-alert">
                CERRAR SESIÓN
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
