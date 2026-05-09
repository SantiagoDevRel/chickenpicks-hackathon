// Root layout — must import polyfills FIRST so anything below has Buffer,
// crypto.getRandomValues, and URL ready.
import '@/lib/polyfills';
import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PrivyProvider, PrivyElements } from '@privy-io/expo';
import { View, Text } from 'react-native';
import { PRIVY_APP_ID, PRIVY_CLIENT_ID, SOLANA_RPC_URL } from '@/lib/constants';

export default function RootLayout() {
  if (!PRIVY_APP_ID) {
    return (
      <SafeAreaProvider>
        <View className="flex-1 items-center justify-center bg-bg-base p-6">
          <Text className="font-display text-2xl text-amber mb-4">Missing config</Text>
          <Text className="text-text-secondary text-center">
            Set <Text className="text-gold">privyAppId</Text> and{' '}
            <Text className="text-gold">privyClientId</Text> in{' '}
            <Text className="text-gold">app.json → expo.extra</Text>, then rebuild.
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PrivyProvider
          appId={PRIVY_APP_ID}
          clientId={PRIVY_CLIENT_ID}
          // Cast: @privy-io/expo's PrivyConfig type doesn't formally expose
          // solanaClusters in this version, but the runtime accepts it (mirrors
          // the web SDK shape). Without this we'd default to mainnet.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          config={{
            embedded: {
              solana: {
                createOnLogin: 'users-without-wallets',
              },
            },
            solanaClusters: [{ name: 'devnet', rpcUrl: SOLANA_RPC_URL }],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any}
        >
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: '#080C10' },
              headerTitleStyle: { color: '#F5F7FA', fontFamily: 'BebasNeue_400Regular' },
              headerTintColor: '#FFD700',
              contentStyle: { backgroundColor: '#080C10' },
            }}
          >
            <Stack.Screen name="index" options={{ title: 'CHICKENPICKS', headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="pools/[id]" options={{ title: 'POOL' }} />
          </Stack>
          <PrivyElements />
          <StatusBar style="light" />
        </PrivyProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
