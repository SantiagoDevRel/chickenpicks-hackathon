// Bottom-tab nav, mirrors la-polla mobile UX:
//   Inicio · Pollas · ➕ Crear · Avisos · Perfil
//
// The middle "Crear" tab is rendered as a yellow filled circle that floats
// above the bar — implemented via tabBarButton override + a custom view.
// We use react-native-svg for icons (already a transitive dep of expo) so
// we don't add a new icon library.
import { Tabs } from 'expo-router';
import { View, Pressable, Text, Platform } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

const COLOR_ACTIVE = '#FFD700';
const COLOR_INACTIVE = '#6B7280';
const COLOR_BG = '#080C10';
const COLOR_BORDER = '#1F2937';

// ── Icons ────────────────────────────────────────────────────────────────
function HomeIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 11l9-8 9 8v9a2 2 0 01-2 2h-4v-7H9v7H5a2 2 0 01-2-2v-9z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PollasIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 3h9l3 3v15a1 1 0 01-1.4.9L12 19.5 7.4 21.9A1 1 0 016 21V3z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlusIcon({ color = '#000', size = 28 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function BellIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 8a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6zM10 18a2 2 0 004 0"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function UserIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.8} />
      <Path
        d="M4 21c0-4 4-7 8-7s8 3 8 7"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Custom button for the floating "Crear" tab — yellow circle that sits
// slightly above the bar.
type TabButtonProps = {
  onPress?: (e: unknown) => void;
  accessibilityState?: { selected?: boolean };
};
function CrearTabButton(props: TabButtonProps) {
  return (
    <Pressable
      onPress={props.onPress}
      style={{
        top: -18,
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
      }}
      accessibilityRole="button"
      accessibilityLabel="Crear nueva polla"
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: COLOR_ACTIVE,
          justifyContent: 'center',
          alignItems: 'center',
          // Subtle elevation so it pops off the bar
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.4,
          shadowRadius: 4,
          elevation: 6,
        }}
      >
        <PlusIcon color="#000" size={30} />
      </View>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLOR_ACTIVE,
        tabBarInactiveTintColor: COLOR_INACTIVE,
        tabBarStyle: {
          backgroundColor: COLOR_BG,
          borderTopColor: COLOR_BORDER,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'BebasNeue_400Regular',
          fontSize: 11,
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="pollas"
        options={{
          title: 'Pollas',
          tabBarIcon: ({ color }) => <PollasIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="crear"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <CrearTabButton
              onPress={props.onPress as (e: unknown) => void}
              accessibilityState={props.accessibilityState}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="avisos"
        options={{
          title: 'Avisos',
          tabBarIcon: ({ color }) => <BellIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <UserIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
