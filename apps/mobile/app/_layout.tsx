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
          config={{
            embedded: {
              solana: {
                createOnLogin: 'users-without-wallets',
              },
            },
            // Devnet for the hackathon — flip to mainnet-beta for prod.
            // The Privy RN SDK defaults to mainnet, so we override here.
            // Note: this key path mirrors web; if the RN SDK uses a different
            // shape in your installed version, adjust accordingly.
            solanaClusters: [{ name: 'devnet', rpcUrl: SOLANA_RPC_URL }],
          }}
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
            <Stack.Screen name="pools/index" options={{ title: 'POOLS' }} />
            <Stack.Screen name="pools/[id]" options={{ title: 'POOL' }} />
            <Stack.Screen name="profile" options={{ title: 'PROFILE' }} />
          </Stack>
          <PrivyElements />
          <StatusBar style="light" />
        </PrivyProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
