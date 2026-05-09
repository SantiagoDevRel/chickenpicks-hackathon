import { Text, TextInput, View } from 'react-native';

export type MatchRowProps = {
  index: number;
  home: string;
  away: string;
  homeScore: string;
  awayScore: string;
  finalHome?: number;
  finalAway?: number;
  settled?: boolean;
  locked: boolean;
  onChange: (homeScore: string, awayScore: string) => void;
};

export function MatchRow({
  home,
  away,
  homeScore,
  awayScore,
  finalHome,
  finalAway,
  settled,
  locked,
  onChange,
}: MatchRowProps) {
  return (
    <View className="rounded-md border border-border-subtle bg-bg-elevated/60 p-3 mb-2">
      <View className="flex-row items-center gap-2">
        <Text
          className="flex-1 text-right font-display text-sm uppercase text-text-primary"
          numberOfLines={1}
        >
          {home}
        </Text>
        <ScoreInput
          value={homeScore}
          editable={!locked}
          onChange={(v) => onChange(v, awayScore)}
        />
        <Text className="font-display text-sm text-text-muted">vs</Text>
        <ScoreInput
          value={awayScore}
          editable={!locked}
          onChange={(v) => onChange(homeScore, v)}
        />
        <Text
          className="flex-1 text-left font-display text-sm uppercase text-text-primary"
          numberOfLines={1}
        >
          {away}
        </Text>
      </View>
      {settled && finalHome !== undefined && finalAway !== undefined && (
        <Text className="mt-2 text-center font-display text-xs tracking-widest text-amber">
          FINAL: {finalHome} - {finalAway}
        </Text>
      )}
    </View>
  );
}

function ScoreInput({
  value,
  editable,
  onChange,
}: {
  value: string;
  editable: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <TextInput
      value={value}
      editable={editable}
      keyboardType="number-pad"
      maxLength={2}
      onChangeText={(v) => onChange(v.replace(/[^0-9]/g, '').slice(0, 2))}
      className="w-12 h-10 rounded-md border border-border-default bg-bg-card text-center font-display text-lg text-text-primary"
      placeholderTextColor="#7A8694"
    />
  );
}
