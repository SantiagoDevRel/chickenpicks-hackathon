// POST /api/admin/create-polla
//
// SCAFFOLD — not wired into the /crear wizard today.
//
// Why it exists:
//   The on-chain `create_polla` instruction (see programs/.../create_polla.rs)
//   accepts ANY wallet as the `creator` signer — there's no platform-authority
//   constraint. The /crear wizard signs everything with the user's Privy
//   embedded wallet, so this endpoint isn't needed for the happy path.
//
//   We're keeping this scaffold for one specific future case: if we want to
//   migrate to a "platform-creates-pool, user-only-pays-entry" model so users
//   never see a SOL rent prompt. That model would have the deployer sign
//   create_polla + add_match (paying rent), and the user only signs join_polla.
//
// Until that migration:
//   - The wizard at apps/web/app/crear/page.tsx does NOT call this route.
//   - This route returns 501 Not Implemented to make accidental usage obvious.
//
// X-Admin-Email auth pattern mirrors /api/admin/post-result and /api/admin/settle.
// When/if we wire it for real, replace `getAdminProgram()` calls below with the
// same pattern as those routes.

import { NextRequest, NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/server-admin';

type CreatePollaBody = {
  /** UTF-8 string, max 32 bytes — server pads to [u8; 32]. */
  name: string;
  /** UTF-8 string, max 32 bytes — server pads to [u8; 32]. */
  tournament: string;
  /** USDC base units (6 decimals). String to avoid JSON precision issues. */
  entryAmountBaseUnits: string;
  /** Number of match slots (1..=10). */
  numMatches: number;
  /** Length-10 array of u8, sum must be ≤ 100. */
  prizeDistribution: number[];
  /** Each match — server pads team names to [u8; 16]. */
  matches: { homeTeam: string; awayTeam: string }[];
};

export async function POST(req: NextRequest) {
  const adminEmail = req.headers.get('x-admin-email');
  if (!isAdminEmail(adminEmail)) {
    return NextResponse.json(
      { error: 'Not authorized — admin email mismatch.' },
      { status: 403 },
    );
  }

  let body: CreatePollaBody;
  try {
    body = (await req.json()) as CreatePollaBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Basic shape validation — leave the heavy lifting to Anchor when wired.
  if (
    typeof body.name !== 'string' ||
    typeof body.tournament !== 'string' ||
    typeof body.entryAmountBaseUnits !== 'string' ||
    typeof body.numMatches !== 'number' ||
    !Array.isArray(body.prizeDistribution) ||
    !Array.isArray(body.matches)
  ) {
    return NextResponse.json(
      { error: 'Bad body shape.' },
      { status: 400 },
    );
  }

  // TODO — wire create_polla + addMatch loop using getAdminProgram() from
  // @/lib/server-admin, mirroring the pattern in /api/admin/settle/route.ts:
  //
  //   const { program, deployer } = getAdminProgram();
  //   const nameBytes = padToBytes(body.name, 32);
  //   const [polla] = PublicKey.findProgramAddressSync(
  //     [Buffer.from('polla'), deployer.publicKey.toBuffer(), Buffer.from(nameBytes)],
  //     program.programId,
  //   );
  //   const vault = getAssociatedTokenAddressSync(USDC_MINT, polla, true);
  //   const sig = await program.methods.createPolla(
  //     Array.from(nameBytes),
  //     Array.from(padToBytes(body.tournament, 32)),
  //     new BN(body.entryAmountBaseUnits),
  //     body.numMatches,
  //     body.prizeDistribution,
  //   ).accounts({ polla, usdcMint: USDC_MINT, vault, creator: deployer.publicKey, ...}).rpc();
  //   for (const [i, m] of body.matches.entries()) {
  //     await program.methods.addMatch(i, padToBytes(m.homeTeam, 16), padToBytes(m.awayTeam, 16))
  //       .accounts({ polla, matchAccount: matchPda(polla, i), creator: deployer.publicKey, systemProgram: SystemProgram.programId })
  //       .rpc();
  //   }
  //   return NextResponse.json({ pollaPubkey: polla.toBase58(), sig });

  return NextResponse.json(
    {
      error:
        'Not implemented. The /crear wizard signs create_polla with the user wallet. ' +
        'See file header for when to wire this server-side path.',
    },
    { status: 501 },
  );
}
