import { useCallback, useState } from 'react';
import { Pressable, Text, View, Alert, Platform } from 'react-native';
import { useLoginWithEmail } from '@privy-io/expo';
import { useWallet } from '@/lib/useWallet';

// Renders the active wallet pubkey (truncated) when connected, or two
// CTAs when not: "SIGN IN" (Privy email OTP) and on Android also
// "USE WALLET APP" (Mobile Wallet Adapter).
export function ConnectButton() {
  const { ready, wallet, pubkey, source, connectMwa, disconnect } = useWallet();
  const { sendCode, loginWithCode, state } = useLoginWithEmail();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const onSendCode = useCallback(async () => {
    if (!email) return;
    try {
      await sendCode({ email });
      Alert.prompt?.('Enter OTP', 'Code sent to your email', async (otp) => {
        if (!otp) return;
        await loginWithCode({ code: otp });
      });
    } catch (e) {
      Alert.alert('Login failed', (e as Error).message);
    }
  }, [email, sendCode, loginWithCode]);

  const onConnectMwa = useCallback(async () => {
    try {
      await connectMwa();
    } catch (e) {
      Alert.alert('MWA failed', (e as Error).message);
    }
  }, [connectMwa]);

  if (!ready) {
    return (
      <View className="rounded-md border border-border-default bg-bg-card px-3 py-2">
        <Text className="font-display text-xs tracking-widest text-text-muted">LOADING…</Text>
      </View>
    );
  }

  if (wallet && pubkey) {
    const short = `${pubkey.toBase58().slice(0, 4)}…${pubkey.toBase58().slice(-4)}`;
    return (
      <Pressable
        onPress={() =>
          Alert.alert(
            source === 'mwa' ? 'Wallet App' : 'Embedded Wallet',
            pubkey.toBase58(),
            [
              { text: 'Disconnect', style: 'destructive', onPress: disconnect },
              { text: 'Close', style: 'cancel' },
            ],
          )
        }
        className="rounded-md border border-gold/40 bg-bg-card px-3 py-2"
      >
        <Text className="font-display text-xs tracking-widest text-gold">{short}</Text>
      </Pressable>
    );
  }

  return (
    <View className="flex-row gap-2">
      <Pressable
        onPress={onSendCode}
        className="rounded-md bg-gold px-4 py-2"
      >
        <Text className="font-display text-xs tracking-widest text-black">SIGN IN</Text>
      </Pressable>
      {Platform.OS === 'android' && (
        <Pressable
          onPress={onConnectMwa}
          className="rounded-md border border-border-default bg-bg-card px-3 py-2"
        >
          <Text className="font-display text-xs tracking-widest text-text-primary">
            WALLET APP
          </Text>
        </Pressable>
      )}
    </View>
  );
}
