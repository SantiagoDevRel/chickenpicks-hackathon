import { useCallback, useState } from 'react';
import {
  Pressable,
  Text,
  View,
  Alert,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { useLoginWithEmail } from '@privy-io/expo';
import { useWallet } from '@/lib/useWallet';

// Renders the active wallet pubkey (truncated) when connected, or two
// CTAs when not: "SIGN IN" (Privy email OTP — opens an in-app modal with
// proper email + 6-digit-code inputs) and on Android also "USE WALLET APP"
// (Mobile Wallet Adapter).
//
// Note: Alert.prompt is iOS-only so we built our own email/OTP modal that
// works on both platforms.
export function ConnectButton() {
  const { ready, wallet, pubkey, source, connectMwa, disconnect } = useWallet();
  const { sendCode, loginWithCode } = useLoginWithEmail();

  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openModal = useCallback(() => {
    setStep('email');
    setEmail('');
    setCode('');
    setErrorMsg(null);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setBusy(false);
  }, []);

  const onSendCode = useCallback(async () => {
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Enter a valid email address.');
      return;
    }
    setErrorMsg(null);
    setBusy(true);
    try {
      await sendCode({ email: email.trim() });
      setStep('code');
    } catch (e) {
      setErrorMsg((e as Error).message || 'Failed to send code');
    } finally {
      setBusy(false);
    }
  }, [email, sendCode]);

  const onSubmitCode = useCallback(async () => {
    if (!code.trim() || code.trim().length < 4) {
      setErrorMsg('Enter the OTP code from your email.');
      return;
    }
    setErrorMsg(null);
    setBusy(true);
    try {
      await loginWithCode({ code: code.trim() });
      closeModal();
    } catch (e) {
      setErrorMsg((e as Error).message || 'Invalid code');
    } finally {
      setBusy(false);
    }
  }, [code, loginWithCode, closeModal]);

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
        <Text className="font-display text-xs tracking-widest text-text-muted">
          LOADING…
        </Text>
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
        <Text className="font-display text-xs tracking-widest text-gold">
          {short}
        </Text>
      </Pressable>
    );
  }

  return (
    <>
      <View className="flex-row gap-2">
        <Pressable
          onPress={openModal}
          className="rounded-md bg-gold px-4 py-2"
        >
          <Text className="font-display text-xs tracking-widest text-black">
            SIGN IN
          </Text>
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

      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeModal}
      >
        <View className="flex-1 items-center justify-center bg-black/70 px-6">
          <View className="w-full max-w-sm rounded-lg bg-bg-card p-6 border border-border-default">
            <Text className="font-display text-xl uppercase text-text-primary mb-1">
              {step === 'email' ? 'Sign in' : 'Enter code'}
            </Text>
            <Text className="text-text-secondary text-sm mb-5">
              {step === 'email'
                ? 'We will email you a 6-digit code.'
                : `Code sent to ${email}. Check your inbox.`}
            </Text>

            {step === 'email' ? (
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#6B7280"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                className="rounded-md border border-border-default bg-bg-base px-3 py-3 text-text-primary mb-3"
                style={{ color: '#F5F7FA', fontSize: 15 }}
              />
            ) : (
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                placeholderTextColor="#6B7280"
                keyboardType="number-pad"
                maxLength={8}
                className="rounded-md border border-border-default bg-bg-base px-3 py-3 text-text-primary mb-3"
                style={{
                  color: '#F5F7FA',
                  fontSize: 18,
                  letterSpacing: 4,
                  textAlign: 'center',
                }}
              />
            )}

            {errorMsg && (
              <Text className="text-red-alert text-xs mb-3">{errorMsg}</Text>
            )}

            <View className="flex-row gap-2 mt-2">
              <Pressable
                onPress={closeModal}
                className="flex-1 rounded-md border border-border-default bg-bg-card px-4 py-3"
                disabled={busy}
              >
                <Text className="font-display text-xs tracking-widest text-text-secondary text-center">
                  CANCEL
                </Text>
              </Pressable>
              <Pressable
                onPress={step === 'email' ? onSendCode : onSubmitCode}
                disabled={busy}
                className="flex-1 rounded-md bg-gold px-4 py-3"
                style={busy ? { opacity: 0.6 } : undefined}
              >
                <Text className="font-display text-xs tracking-widest text-black text-center">
                  {busy ? '…' : step === 'email' ? 'SEND CODE' : 'VERIFY'}
                </Text>
              </Pressable>
            </View>

            {step === 'code' && (
              <Pressable onPress={() => setStep('email')} className="mt-4">
                <Text className="font-display text-[11px] tracking-widest text-text-muted text-center">
                  ← USE A DIFFERENT EMAIL
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
