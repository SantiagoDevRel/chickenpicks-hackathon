// Crear Polla — 3-step wizard (Info → Partidos → Configuración).
//
// Mirrors la-polla screenshots 175629/175634/175638/175658.
//
// Flow:
//   Step 1 (Info): name, tournament picker (8 options).
//   Step 2 (Partidos): pick from ESPN fixtures (max 10) — endpoint:
//     GET /api/espn/fixtures?league=<slug>&from=<YYYYMMDD>&to=<YYYYMMDD>
//   Step 3 (Configuración): entry amount + prize distribution (% or fixed).
//
// Submit semantics:
//   The Anchor `create_polla` ix takes (name, tournament, entryAmount,
//   numMatches, prizeDistribution) signed by the `creator`. Per task brief
//   we *might* want it to be authority-only — so we route the submit
//   through `POST /api/admin/create-polla` (TODO: endpoint scaffolding by
//   the api agent) and fall back to a TODO toast if that endpoint isn't
//   live yet. The on-chain `add_match` × N is also routed through the
//   same admin endpoint.
//
// Note: this screen INTENTIONALLY does not call `program.methods` itself
// because the IDL doesn't have a server-side bypass for users without
// USDC ATAs, and we want a single canonical create path. If we later
// open creation to anyone, swap the submit call for direct Anchor.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useWallet } from '@/lib/useWallet';
import { ConnectButton } from '@/components/ConnectButton';

// ── Tournaments catalogue ────────────────────────────────────────────────
type TournamentDef = {
  id: string;
  label: string;
  espnSlug: string;
  emoji: string;
};

const TOURNAMENTS: TournamentDef[] = [
  { id: 'champions',     label: 'Champions League',  espnSlug: 'uefa.champions',  emoji: '⭐' },
  { id: 'worldcup-2026', label: 'Mundial 2026',       espnSlug: 'fifa.worldq.uefa', emoji: '🏆' },
  { id: 'la-liga',       label: 'La Liga',            espnSlug: 'esp.1',           emoji: '🇪🇸' },
  { id: 'premier',       label: 'Premier League',     espnSlug: 'eng.1',           emoji: '🏴' },
  { id: 'serie-a',       label: 'Serie A',            espnSlug: 'ita.1',           emoji: '🇮🇹' },
  { id: 'libertadores',  label: 'Copa Libertadores',  espnSlug: 'conmebol.libertadores', emoji: '🏆' },
  { id: 'sudamericana',  label: 'Copa Sudamericana',  espnSlug: 'conmebol.sudamericana', emoji: '🥈' },
  { id: 'betplay',       label: 'Liga BetPlay',       espnSlug: 'col.1',           emoji: '🇨🇴' },
];

const ESPN_API = 'https://onchain.chickenpicks.app/api/espn/fixtures';
const ADMIN_CREATE_API = 'https://onchain.chickenpicks.app/api/admin/create-polla';

const captain = require('../../assets/pollitos/pollito_capitan_lider.webp');

// ── Wizard state ─────────────────────────────────────────────────────────
type Fixture = {
  id: string;
  home: string;
  away: string;
  scheduledAt: string; // ISO
  league?: string;
};

type PrizeRow = { rank: number; pct: string };

export default function CrearScreen() {
  const router = useRouter();
  const { wallet, pubkey } = useWallet();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [name, setName] = useState('');
  const [tournamentId, setTournamentId] = useState<string | null>(null);

  // Step 2 — pulled from ESPN once tournament is chosen.
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(false);
  const [fixturesError, setFixturesError] = useState<string | null>(null);
  const [selectedFixtureIds, setSelectedFixtureIds] = useState<string[]>([]);

  // Step 3
  const [entryAmount, setEntryAmount] = useState('1'); // USDC, decimal
  const [prizeRows, setPrizeRows] = useState<PrizeRow[]>([
    { rank: 1, pct: '100' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const tournament = useMemo(
    () => TOURNAMENTS.find((t) => t.id === tournamentId) ?? null,
    [tournamentId],
  );

  // ── Step-2 fixture fetch ───────────────────────────────────────────────
  useEffect(() => {
    if (step !== 2 || !tournament) return;
    let cancelled = false;
    async function load() {
      try {
        setFixturesLoading(true);
        // Window: today → +30 days.
        const from = formatYmd(new Date());
        const to = formatYmd(new Date(Date.now() + 30 * 24 * 3600_000));
        const url = `${ESPN_API}?league=${encodeURIComponent(
          tournament!.espnSlug,
        )}&from=${from}&to=${to}`;
        const r = await fetch(url, { cache: 'no-store' });
        const data = await r.json();
        if (cancelled) return;
        if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
        const list: Fixture[] = (data.fixtures ?? data.events ?? []).map(
          // Tolerant of either shape from the espn route — sibling agent.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (raw: any) => ({
            id: String(raw.id ?? raw.eventId ?? raw.uid ?? ''),
            home: String(raw.home ?? raw.homeTeam ?? raw.competitors?.[0]?.team?.name ?? '?'),
            away: String(raw.away ?? raw.awayTeam ?? raw.competitors?.[1]?.team?.name ?? '?'),
            scheduledAt: String(raw.scheduledAt ?? raw.date ?? raw.startsAt ?? ''),
            league: tournament!.label,
          }),
        );
        setFixtures(list);
        setFixturesError(null);
      } catch (e) {
        if (!cancelled) setFixturesError((e as Error).message);
      } finally {
        if (!cancelled) setFixturesLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [step, tournament]);

  // ── Step navigation ────────────────────────────────────────────────────
  const canAdvanceStep1 = name.trim().length >= 3 && !!tournamentId;
  const canAdvanceStep2 =
    selectedFixtureIds.length >= 1 && selectedFixtureIds.length <= 10;
  const totalPrizePct = prizeRows.reduce(
    (acc, r) => acc + (parseInt(r.pct || '0', 10) || 0),
    0,
  );
  const canSubmit =
    Number(entryAmount) > 0 &&
    totalPrizePct === 100 &&
    prizeRows.length <= 10 &&
    !submitting;

  const goNext = useCallback(() => {
    if (step === 1 && canAdvanceStep1) setStep(2);
    else if (step === 2 && canAdvanceStep2) setStep(3);
  }, [step, canAdvanceStep1, canAdvanceStep2]);

  const goBack = useCallback(() => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
    else router.back();
  }, [step, router]);

  // ── Submit ─────────────────────────────────────────────────────────────
  const onSubmit = useCallback(async () => {
    if (!wallet || !pubkey) {
      Alert.alert('Conecta tu wallet', 'Necesitas iniciar sesión antes de crear una polla.');
      return;
    }
    if (!canSubmit || !tournament) return;

    setSubmitting(true);
    try {
      const selectedFixtures = fixtures.filter((f) =>
        selectedFixtureIds.includes(f.id),
      );

      // Pad prize distribution to 10 slots with 0.
      const prizeDistribution: number[] = Array.from({ length: 10 }, () => 0);
      prizeRows.forEach((r) => {
        const idx = r.rank - 1;
        if (idx >= 0 && idx < 10) {
          prizeDistribution[idx] = parseInt(r.pct || '0', 10) || 0;
        }
      });

      const body = {
        creator: pubkey.toBase58(),
        name: name.trim(),
        tournament: tournament.label,
        entryAmount: Number(entryAmount), // USDC decimal — server multiplies
        numMatches: selectedFixtures.length,
        prizeDistribution,
        matches: selectedFixtures.map((f) => ({
          home: f.home,
          away: f.away,
          scheduledAt: f.scheduledAt,
        })),
      };

      const r = await fetch(ADMIN_CREATE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(data?.error ?? `HTTP ${r.status}`);
      }
      Alert.alert(
        'Polla creada',
        data.pollaPubkey
          ? `Tu polla está activa: ${shortPubkey(data.pollaPubkey)}`
          : 'Polla enviada al programa.',
        [
          {
            text: 'Ver',
            onPress: () => {
              if (data.pollaPubkey) router.push(`/pools/${data.pollaPubkey}`);
              else router.push('/(tabs)/pollas');
            },
          },
        ],
      );
      // Reset wizard
      setStep(1);
      setName('');
      setTournamentId(null);
      setFixtures([]);
      setSelectedFixtureIds([]);
      setEntryAmount('1');
      setPrizeRows([{ rank: 1, pct: '100' }]);
    } catch (e) {
      Alert.alert(
        'TODO: create endpoint',
        `El endpoint ${ADMIN_CREATE_API} todavía no existe (otro agente está armándolo).\n\nDetalle: ${(e as Error).message}`,
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    wallet,
    pubkey,
    canSubmit,
    tournament,
    fixtures,
    selectedFixtureIds,
    name,
    entryAmount,
    prizeRows,
    router,
  ]);

  return (
    <SafeAreaView className="flex-1 bg-bg-base" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
          <View className="flex-row items-center gap-2">
            <Pressable onPress={goBack}>
              <Text className="font-display text-2xl text-text-primary">←</Text>
            </Pressable>
            <Text className="font-display text-2xl uppercase text-text-primary">
              Crear nueva polla
            </Text>
          </View>
          <ConnectButton />
        </View>

        {/* Step indicator */}
        <View className="flex-row items-center justify-center gap-3 py-4 border-b border-border-subtle">
          {[1, 2, 3].map((n, i) => (
            <View key={n} className="flex-row items-center gap-3">
              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{
                  backgroundColor:
                    step === n
                      ? '#FFD700'
                      : step > n
                        ? 'rgba(255, 215, 0, 0.2)'
                        : '#1C242E',
                }}
              >
                <Text
                  className="font-display text-sm"
                  style={{
                    color: step === n ? '#000' : step > n ? '#FFD700' : '#7A8694',
                  }}
                >
                  {n}
                </Text>
              </View>
              <Text
                className={`font-display text-xs tracking-widest ${
                  step === n ? 'text-text-primary' : 'text-text-muted'
                }`}
              >
                {['INFO', 'PARTIDOS', 'CONFIG'][n - 1]}
              </Text>
              {i < 2 && (
                <View
                  className="w-6 h-px"
                  style={{ backgroundColor: '#1C242E' }}
                />
              )}
            </View>
          ))}
        </View>

        {/* Body */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        >
          {step === 1 && (
            <Step1Info
              name={name}
              setName={setName}
              tournamentId={tournamentId}
              setTournamentId={setTournamentId}
            />
          )}
          {step === 2 && (
            <Step2Partidos
              tournament={tournament}
              fixtures={fixtures}
              loading={fixturesLoading}
              error={fixturesError}
              selected={selectedFixtureIds}
              setSelected={setSelectedFixtureIds}
            />
          )}
          {step === 3 && (
            <Step3Config
              entryAmount={entryAmount}
              setEntryAmount={setEntryAmount}
              prizeRows={prizeRows}
              setPrizeRows={setPrizeRows}
              totalPct={totalPrizePct}
            />
          )}
        </ScrollView>

        {/* Footer actions */}
        <View className="flex-row items-center justify-between px-4 py-3 border-t border-border-subtle bg-bg-card">
          <Pressable onPress={goBack}>
            <Text className="font-display text-xs tracking-widest text-text-muted">
              {step === 1 ? 'CANCELAR' : '← ATRÁS'}
            </Text>
          </Pressable>
          {step < 3 ? (
            <Pressable
              onPress={goNext}
              disabled={
                (step === 1 && !canAdvanceStep1) ||
                (step === 2 && !canAdvanceStep2)
              }
              className="rounded-md bg-gold px-6 py-3"
              style={{
                opacity:
                  (step === 1 && canAdvanceStep1) ||
                  (step === 2 && canAdvanceStep2)
                    ? 1
                    : 0.4,
              }}
            >
              <Text className="font-display text-xs tracking-widest text-black">
                CONTINUAR →
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit}
              className="rounded-md bg-gold px-6 py-3"
              style={{ opacity: canSubmit ? 1 : 0.4 }}
            >
              <Text className="font-display text-xs tracking-widest text-black">
                {submitting ? 'CREANDO…' : 'CREAR POLLA'}
              </Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Step components ──────────────────────────────────────────────────────
function Step1Info({
  name,
  setName,
  tournamentId,
  setTournamentId,
}: {
  name: string;
  setName: (v: string) => void;
  tournamentId: string | null;
  setTournamentId: (v: string) => void;
}) {
  return (
    <View>
      <View className="rounded-lg border border-border-default bg-bg-card p-4 mb-4">
        <Text className="font-display text-base uppercase text-text-primary mb-2">
          Información básica
        </Text>
        <Text className="font-display text-[10px] tracking-widest text-text-muted mb-2">
          NOMBRE *
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ej: Polla Mundial Oficina"
          placeholderTextColor="#6B7280"
          maxLength={32}
          className="rounded-md border border-border-default bg-bg-base px-3 py-3"
          style={{ color: '#F5F7FA', fontSize: 15 }}
        />
        <Text className="text-[10px] text-text-muted mt-1">
          {name.length}/32
        </Text>
      </View>

      <View className="rounded-lg border border-border-default bg-bg-card p-4">
        <Text className="font-display text-base uppercase text-text-primary mb-3">
          Torneos *
        </Text>
        {TOURNAMENTS.map((t) => {
          const selected = tournamentId === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTournamentId(t.id)}
              className={`flex-row items-center justify-between rounded-md border bg-bg-elevated px-4 py-3 mb-2 ${
                selected ? 'border-gold' : 'border-border-default'
              }`}
            >
              <View className="flex-row items-center gap-3">
                <Text className="text-lg">{t.emoji}</Text>
                <Text className="font-display text-sm uppercase text-text-primary">
                  {t.label}
                </Text>
              </View>
              <View
                className="w-5 h-5 rounded-full"
                style={{
                  borderWidth: 2,
                  borderColor: selected ? '#FFD700' : '#2A3441',
                  backgroundColor: selected ? '#FFD700' : 'transparent',
                }}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Step2Partidos({
  tournament,
  fixtures,
  loading,
  error,
  selected,
  setSelected,
}: {
  tournament: TournamentDef | null;
  fixtures: Fixture[];
  loading: boolean;
  error: string | null;
  selected: string[];
  setSelected: (v: string[]) => void;
}) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id));
    } else if (selected.length < 10) {
      setSelected([...selected, id]);
    } else {
      Alert.alert('Máximo 10 partidos', 'Una polla puede tener hasta 10 partidos.');
    }
  };

  return (
    <View>
      <View className="rounded-lg border border-border-default bg-bg-card p-4 mb-4">
        <Text className="font-display text-[10px] tracking-widest text-text-muted mb-1">
          TORNEO
        </Text>
        <Text className="font-display text-lg uppercase text-text-primary">
          {tournament?.label ?? '—'}
        </Text>
        <Text className="text-xs text-text-muted mt-1">
          Selecciona entre 1 y 10 partidos próximos.
          {' '}
          <Text className="text-gold">
            {selected.length}/10
          </Text>
        </Text>
      </View>

      {loading && (
        <View className="rounded-lg border border-border-default bg-bg-card p-12 items-center">
          <ActivityIndicator color="#FFD700" />
          <Text className="mt-3 font-display text-xs tracking-widest text-text-muted">
            CARGANDO FIXTURES…
          </Text>
        </View>
      )}

      {error && (
        <View className="rounded-lg border border-red-alert/40 bg-bg-card p-4">
          <Text className="text-red-alert text-sm">{error}</Text>
          <Text className="text-text-muted text-xs mt-2">
            (Sibling agent shipping `/api/espn/fixtures` — re-pull when ready.)
          </Text>
        </View>
      )}

      {!loading && !error && fixtures.length === 0 && (
        <View className="rounded-lg border border-border-default bg-bg-card p-8 items-center">
          <Image
            source={captain}
            style={{ width: 80, height: 80, marginBottom: 12, opacity: 0.7 }}
            contentFit="contain"
          />
          <Text className="font-display text-sm uppercase text-text-primary mb-1">
            No hay fixtures próximos
          </Text>
          <Text className="text-xs text-text-muted text-center">
            Prueba otro torneo o vuelve pronto.
          </Text>
        </View>
      )}

      {fixtures.map((f) => {
        const sel = selected.includes(f.id);
        return (
          <Pressable
            key={f.id}
            onPress={() => toggle(f.id)}
            className={`rounded-md border bg-bg-card px-3 py-3 mb-2 flex-row items-center justify-between ${
              sel ? 'border-gold' : 'border-border-default'
            }`}
          >
            <View className="flex-1 pr-2">
              <Text
                className="font-display text-sm uppercase text-text-primary"
                numberOfLines={1}
              >
                {f.home} vs {f.away}
              </Text>
              <Text className="text-[10px] text-text-muted">
                {prettyDate(f.scheduledAt)}
              </Text>
            </View>
            <View
              className="w-5 h-5 rounded-full"
              style={{
                borderWidth: 2,
                borderColor: sel ? '#FFD700' : '#2A3441',
                backgroundColor: sel ? '#FFD700' : 'transparent',
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function Step3Config({
  entryAmount,
  setEntryAmount,
  prizeRows,
  setPrizeRows,
  totalPct,
}: {
  entryAmount: string;
  setEntryAmount: (v: string) => void;
  prizeRows: PrizeRow[];
  setPrizeRows: (v: PrizeRow[]) => void;
  totalPct: number;
}) {
  const addRow = () => {
    if (prizeRows.length >= 10) return;
    setPrizeRows([...prizeRows, { rank: prizeRows.length + 1, pct: '0' }]);
  };
  const removeRow = (rank: number) => {
    const next = prizeRows
      .filter((r) => r.rank !== rank)
      .map((r, i) => ({ ...r, rank: i + 1 }));
    setPrizeRows(next);
  };
  const updatePct = (rank: number, pct: string) => {
    setPrizeRows(
      prizeRows.map((r) =>
        r.rank === rank
          ? { ...r, pct: pct.replace(/[^0-9]/g, '').slice(0, 3) }
          : r,
      ),
    );
  };

  const totalOk = totalPct === 100;

  return (
    <View>
      <View className="rounded-lg border border-border-default bg-bg-card p-4 mb-4">
        <Text className="font-display text-base uppercase text-text-primary mb-2">
          Pago al final
        </Text>
        <Text className="text-xs text-text-secondary mb-3">
          Al terminar la polla, el programa transfiere el pozo en USDC a los ganadores
          según los porcentajes que definas abajo.
        </Text>
        <Text className="font-display text-[10px] tracking-widest text-text-muted mb-2">
          ENTRADA POR JUGADOR (USDC)
        </Text>
        <TextInput
          value={entryAmount}
          onChangeText={(v) => setEntryAmount(v.replace(/[^0-9.]/g, ''))}
          placeholder="1.00"
          placeholderTextColor="#6B7280"
          keyboardType="decimal-pad"
          className="rounded-md border border-border-default bg-bg-base px-3 py-3"
          style={{ color: '#F5F7FA', fontSize: 18 }}
        />
      </View>

      <View className="rounded-lg border border-border-default bg-bg-card p-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="font-display text-base uppercase text-text-primary">
            Premios
          </Text>
          <Text className="font-display text-[10px] tracking-widest text-text-muted">
            OPCIONAL
          </Text>
        </View>

        {/* Mode toggle (% only for now — fixed COP needs an off-chain treasury). */}
        <View className="flex-row gap-2 mb-3">
          <View className="flex-1 rounded-md bg-gold py-2 items-center">
            <Text className="font-display text-xs tracking-widest text-black">
              PORCENTAJE (%)
            </Text>
          </View>
          <View className="flex-1 rounded-md bg-bg-elevated py-2 items-center opacity-40">
            <Text className="font-display text-xs tracking-widest text-text-muted">
              MONTO FIJO
            </Text>
          </View>
        </View>

        {prizeRows.map((r) => (
          <View
            key={r.rank}
            className="flex-row items-center gap-2 mb-2"
          >
            <View className="w-12 rounded-md bg-bg-elevated py-2 items-center">
              <Text className="font-display text-sm text-gold">{r.rank}°</Text>
            </View>
            <TextInput
              value={r.pct}
              onChangeText={(v) => updatePct(r.rank, v)}
              keyboardType="number-pad"
              maxLength={3}
              className="flex-1 rounded-md border border-border-default bg-bg-base px-3 py-2 text-text-primary"
              style={{ color: '#F5F7FA', fontSize: 16 }}
            />
            <Text className="font-display text-base text-text-secondary">%</Text>
            {prizeRows.length > 1 && (
              <Pressable
                onPress={() => removeRow(r.rank)}
                className="w-8 h-8 rounded-md bg-bg-elevated items-center justify-center"
              >
                <Text className="font-display text-base text-red-alert">×</Text>
              </Pressable>
            )}
          </View>
        ))}

        {prizeRows.length < 10 && (
          <Pressable
            onPress={addRow}
            className="rounded-md border border-dashed border-border-default py-2 items-center mt-2"
          >
            <Text className="font-display text-xs tracking-widest text-text-secondary">
              + CREAR OTRO GANADOR
            </Text>
          </Pressable>
        )}

        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-border-subtle">
          <Text className="font-display text-[10px] tracking-widest text-text-muted">
            SUMA TOTAL
          </Text>
          <Text
            className={`font-display text-base ${totalOk ? 'text-turf' : 'text-red-alert'}`}
          >
            {totalPct}%
          </Text>
        </View>
        {!totalOk && (
          <Text className="text-red-alert text-[10px] mt-1 text-right">
            Faltan {100 - totalPct}% para llegar a 100%.
          </Text>
        )}
      </View>
    </View>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────
function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function prettyDate(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('es', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function shortPubkey(s: string): string {
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}
