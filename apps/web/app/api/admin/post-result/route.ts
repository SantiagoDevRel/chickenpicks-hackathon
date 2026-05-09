// POST /api/admin/post-result
// body: { pollaPubkey: string, matchIndex: number, homeScore: number, awayScore: number }
// Calls set_match_result with the deployer keypair (platform authority).
// Returns { sig } on success.
//
// WARNING: this trusts the caller to be admin. The Privy server SDK could
// verify the bearer token and pull the email; for hackathon scope we trust
// a single header X-Admin-Email matched against ADMIN_EMAILS allowlist.
// Replace with privy.verifyAuthToken() pre-deploy.

import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getAdminProgram, isAdminEmail } from '@/lib/server-admin';

export async function POST(req: NextRequest) {
  const adminEmail = req.headers.get('x-admin-email');
  if (!isAdminEmail(adminEmail)) {
    return NextResponse.json(
      { error: 'Not authorized — admin email mismatch.' },
      { status: 403 },
    );
  }

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
