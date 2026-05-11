// POST /api/admin/post-result
// body: { pollaPubkey: string, matchIndex: number, homeScore: number, awayScore: number }
// Calls set_match_result with the deployer keypair (platform authority).
// Returns { sig } on success.
//
// Auth: requires `Authorization: Bearer <privy_access_token>`. Verified
// server-side via @privy-io/server-auth, then the resolved user's email is
// checked against the ADMIN_EMAILS allowlist. See lib/auth/require-admin.ts.

import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getAdminProgram } from '@/lib/server-admin';
import { requireAdmin } from '@/lib/auth/require-admin';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  let body: {
    pollaPubkey: string;
    matchIndex: number;
    homeScore: number;
    awayScore: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { pollaPubkey, matchIndex, homeScore, awayScore } = body;
  if (
    typeof pollaPubkey !== 'string' ||
    typeof matchIndex !== 'number' ||
    typeof homeScore !== 'number' ||
    typeof awayScore !== 'number'
  ) {
    return NextResponse.json(
      { error: 'Bad body shape: { pollaPubkey, matchIndex, homeScore, awayScore }' },
      { status: 400 },
    );
  }

  try {
    const { program, deployer } = getAdminProgram();
    const polla = new PublicKey(pollaPubkey);

    const [platformPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('platform')],
      program.programId,
    );
    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('match'), polla.toBuffer(), Buffer.from([matchIndex])],
      program.programId,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sig = await (program.methods as any)
      .setMatchResult(matchIndex, homeScore, awayScore)
      .accounts({
        platform: platformPda,
        polla,
        matchAccount: matchPda,
        authority: deployer.publicKey,
      })
      .rpc();

    return NextResponse.json({ sig });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
