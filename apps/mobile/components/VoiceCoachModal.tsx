import { useRef } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

const COACH_URL = 'https://onchain.chickenpicks.app/voice-embed';

// Modal that hosts the ElevenLabs Conv AI widget inside a WebView so the
// voice agent works on native Android (and iOS) too, without porting the
// @elevenlabs/react SDK. The standalone /voice-embed page on our web app
// renders just the widget; this WebView grants it microphone access.
export function VoiceCoachModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const webRef = useRef<WebView>(null);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-bg-base">
        <View className="flex-row items-center justify-between px-5 py-3 border-b border-border-subtle">
          <Text className="font-display text-base tracking-widest text-gold">
            COACH
          </Text>
          <Pressable
            onPress={onClose}
            className="rounded-md border border-border-default bg-bg-card px-3 py-1.5"
          >
            <Text className="font-display text-xs tracking-widest text-text-primary">
              CLOSE
            </Text>
          </Pressable>
        </View>
        <WebView
          ref={webRef}
          source={{ uri: COACH_URL }}
          // Critical for ElevenLabs widget: allow microphone + autoplay.
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          domStorageEnabled
          javaScriptEnabled
          allowsProtectedMedia
          // iOS: auto-grant mic capture (Android prompts the user once).
          mediaCapturePermissionGrantType="grant"
          style={{ flex: 1, backgroundColor: '#080C10' }}
        />
      </View>
    </Modal>
  );
}
