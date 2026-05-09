// Login / landing screen. The gate before the tab nav.
//
// - When wallet is null → show hero + sign-in CTAs.
// - When wallet is connected → auto-redirect to the (tabs) home.
//
// Mirrors apps/web/app/page.tsx hero — same chicken hero image, same
// gold/amber/turf wordmark, but adapted for RN.
import { useEffect } from 'react';
import { Text, View, ScrollView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallet } from '@/lib/useWallet';
import { ConnectButton } from '@/components/ConnectButton';

const heroChicken = require('../assets/pollitos/pollito_capitan_lider.webp');

export default function LoginScreen() {
  const router = useRouter();
  const { wallet, ready } = useWallet();

  // Once a wallet is attached, jump straight into the tab nav.
  useEffect(() => {
    if (ready && wallet) {
      router.replace('/(tabs)');
    }
  }, [ready, wallet, router]);

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center px-6 pt-12 pb-10">
          {/* Wordmark — gold/amber/turf */}
          <View className="flex-row items-baseline gap-1 mb-2">
            <Text className="font-display text-2xl tracking-wider text-gold">CHICKEN</Text>
            <Text className="font-display text-2xl tracking-wider text-amber">PICKS</Text>
            <Text className="font-display text-2xl tracking-wider text-turf">ONCHAIN</Text>
          </View>
          <Text className="font-display text-[11px] tracking-widest text-text-muted mb-8">
            DEVNET · SOLANA MOBILE EDITION
          </Text>

          <Image
            source={heroChicken}
            style={{ width: 160, height: 160, marginBottom: 24 }}
            contentFit="contain"
          />

          <Text className="font-display text-3xl uppercase text-text-primary text-center leading-9 mb-3">
            Predict football.{'\n'}
            <Text className="text-gold">On-chain.</Text>{' '}
            <Text className="text-amber">On mobile.</Text>
          </Text>

          <Text className="text-text-secondary text-center text-base mb-10 max-w-md">
            Native Android client for ChickenPicks OnChain — sign in with email or
            your favorite Solana wallet, browse pools, and claim prizes from your
            phone.
          </Text>

          {!ready && (
            <Text className="font-display text-xs tracking-widest text-text-muted">LOADING…</Text>
          )}

          {ready && !wallet && (
            <View className="w-full items-center gap-4">
              <ConnectButton />
              <Text className="text-text-muted text-xs text-center max-w-xs">
                {Platform.OS === 'android'
                  ? 'Use "SIGN IN" for an email-OTP embedded wallet, or "WALLET APP" to connect Phantom/Solflare via Mobile Wallet Adapter.'
                  : 'iOS uses the embedded Privy wallet — Mobile Wallet Adapter is Android-only.'}
              </Text>
            </View>
          )}

          {/* When ready && wallet, the useEffect above redirects. We just
              show a brief loading state here as a fallback. */}
          {ready && wallet && (
            <Text className="font-display text-xs tracking-widest text-text-muted">
              SIGNED IN — REDIRECTING…
            </Text>
          )}
        </View>

        <View className="px-6 py-6 border-t border-border-subtle">
          <Text className="font-display text-[11px] tracking-widest text-text-muted text-center">
            BUILT FOR DEV3PACK 2026 · SOLANA MOBILE TRACK
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
