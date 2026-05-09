// POST /api/admin/settle
// body: { pollaPubkey: string }
// Calls settle_polla with all match + prediction accounts derived server-side.
// Returns { sig } on success.

import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getAdminProgram, isAdminEmail } from '@/lib/server-admin';

export async function POST(req: NextRequest) {
  const adminEmail = req.headers.get('x-admin-email');
  if (!isAdminEmail(adminEmail)) {
    return NextResponse.json(
      { error: 'Not authorized — admin email mismatch.' },
      { status: 403 },
    );
  }

  const { pollaPubkey } = (await req.json()) as { pollaPubkey: string };
  if (typeof pollaPubkey !== 'string') {
    return NextResponse.json(
      { error: 'Bad body: { pollaPubkey: string }' },
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pollaAcc = await (program.account as any).polla.fetch(polla);

    const matchPdas: PublicKey[] = [];
    for (let i = 0; i < pollaAcc.numMatches; i++) {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from('match'), polla.toBuffer(), Buffer.from([i])],
        program.programId,
      );
      matchPdas.push(pda);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const predictions = await (program.account as any).prediction.all([
      { memcmp: { offset: 8, bytes: polla.toBase58() } },
    ]);

    const treasuryAta = getAssociatedTokenAddressSync(
      pollaAcc.usdcMint,
      pollaAcc.creator,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sig = await (program.methods as any)
      .settlePolla()
      .accounts({
        platform: platformPda,
        polla,
        pollaVault: pollaAcc.vault,
        treasuryUsdcAta: treasuryAta,
        caller: deployer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts([
        ...matchPdas.map((pubkey) => ({
          pubkey,
          isWritable: false,
          isSigner: false,
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...predictions.map((p: any) => ({
          pubkey: p.publicKey,
          isWritable: true,
          isSigner: false,
        })),
      ])
      .rpc();

    return NextResponse.json({ sig });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
