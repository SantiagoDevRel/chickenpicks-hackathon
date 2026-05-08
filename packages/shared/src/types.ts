// TS-side mirrors of the Anchor account types. Anchor IDL generates more
// detailed types in @chickenpicks/anchor-client; these are friendly names
// for the UI/logic layer.

export type PollaStatus = 'open' | 'locked' | 'settled';

export interface PollaSummary {
  pubkey: string;
  creator: string;
  name: string;          // utf-8 decoded (without trailing zero pad)
  tournament: string;
  entryAmount: bigint;   // raw USDC base units (6 decimals)
  numMatches: number;
  matchesSettled: number;
  numParticipants: number;
  totalPool: bigint;
  status: PollaStatus;
  prizeDistribution: number[]; // length 10, percentage points 0..=100
}

export interface MatchView {
  pubkey: string;
  matchIndex: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null; // null if -1 (unset)
  awayScore: number | null;
  settled: boolean;
}

export interface PredictionView {
  pubkey: string;
  polla: string;
  predictor: string;
  scores: { home: number | null; away: number | null }[]; // length 10
  submittedAtSlot: bigint;
  points: number;
  finalRank: number | null;     // null if 0xff (unranked)
  claimed: boolean;
}

// Voice-agent tool call argument shapes — used by both /api/voice-tools and
// the ElevenLabs agent's tool definitions in lib/voice-tools.ts.

export interface SubmitPredictionArgs {
  pollaId: string;
  scores: { home: number; away: number }[];
}

export interface PollaListItem {
  id: string;
  name: string;
  entry: string; // formatted USDC, e.g. "1.00 USDC"
  status: PollaStatus;
  numMatches: number;
  numParticipants: number;
}
