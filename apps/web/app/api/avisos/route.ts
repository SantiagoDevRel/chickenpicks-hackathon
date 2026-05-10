// GET /api/avisos?wallet=<pubkey>
//
// Hackathon scope: returns a hardcoded list of on-chain-flavored events so
// the /avisos page renders something realistic for the demo. The wallet
// query param is accepted but unused — once we wire real event indexing
// (Helius webhook → Postgres), this endpoint will filter by wallet and
// stream from there.
//
// TODO(post-hack): subscribe to program logs via Helius webhook, store
// events keyed by (wallet, sig, polla, event_type), filter unread state
// per-user via signed Privy session token, mark-as-read mutations via
// PATCH /api/avisos.

import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export type AvisoKind =
  | 'sign_in'
  | 'pick_correct'
  | 'rank_up'
  | 'overtaken'
  | 'pool_settled'
  | 'pool_locked'
  | 'invite';

export type Aviso = {
  id: string;
  kind: AvisoKind;
  title: string;
  subtitle: string;
  // ISO timestamp; the client computes "hace X" relative to now.
  at: string;
  unread: boolean;
};

function nowMinus(amount: number, unit: 'h' | 'd'): string {
  const ms = unit === 'h' ? 3600_000 : 86_400_000;
  return new Date(Date.now() - amount * ms).toISOString();
}

export async function GET(req: NextRequest) {
  // wallet param is currently unused — kept so the client can pass it
  // and we can wire real per-user filtering in a follow-up.
  const _wallet = req.nextUrl.searchParams.get('wallet');
  void _wallet;

  const stub: Aviso[] = [
    {
      id: 'evt-1',
      kind: 'pick_correct',
      title: 'You nailed the score',
      subtitle: 'Argentina 2-1 Brazil · World Cup with Friends',
      at: nowMinus(8, 'h'),
      unread: true,
    },
    {
      id: 'evt-2',
      kind: 'rank_up',
      title: 'You moved up to #1',
      subtitle: 'In World Cup with Friends',
      at: nowMinus(1, 'd'),
      unread: true,
    },
    {
      id: 'evt-3',
      kind: 'overtaken',
      title: 'Pipe passed you',
      subtitle: 'In World Cup with Friends',
      at: nowMinus(2, 'd'),
      unread: false,
    },
    {
      id: 'evt-4',
      kind: 'pool_locked',
      title: 'Pool locked',
      subtitle: 'Champions League 20k · picks closed',
      at: nowMinus(2, 'd'),
      unread: false,
    },
    {
      id: 'evt-5',
      kind: 'sign_in',
      title: 'Signed in with email',
      subtitle: 'From Windows · Medellín, CO',
      at: nowMinus(21, 'h'),
      unread: false,
    },
    {
      id: 'evt-6',
      kind: 'pool_settled',
      title: 'Pool settled — claim your prize',
      subtitle: 'Champions Semifinals 2 · finished 2nd',
      at: nowMinus(3, 'd'),
      unread: false,
    },
    {
      id: 'evt-7',
      kind: 'invite',
      title: 'You were invited to a pool',
      subtitle: 'Primos Pool 2 · 4 players',
      at: nowMinus(4, 'd'),
      unread: false,
    },
  ];

  return NextResponse.json({ avisos: stub });
}
