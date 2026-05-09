// End-to-end happy path: initialize → create polla → add 2 matches → 3 users
// join + predict → admin posts both results → settle → top winner claims.
//
// Scoring is the la-polla rule (5/3/2/0). Verify ranking + 5% fee + payout.

import * as anchor from '@coral-xyz/anchor';
import { BN, Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { expect } from 'chai';

import {
  airdrop,
  fundUserWithUsdc,
  getTokenBalance,
  matchPda,
  nameSeed,
  platformPda,
  pollaPda,
  predictionPda,
  setupTestUsdcMint,
  teamBytes,
  tournamentSeed,
  ATA_PROGRAM,
  SYSTEM_PROGRAM,
  TOKEN_PROGRAM,
} from './helpers';

describe('chickenpicks-onchain — happy path', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = anchor.workspace.ChickenpicksOnchain as Program<any>;
  const programId = program.programId;
  const connection = provider.connection;

  // wallets
  const admin = (provider.wallet as anchor.Wallet).payer;
  let user1: Keypair, user2: Keypair, user3: Keypair;
  let usdcMint: PublicKey;
  let user1Ata: PublicKey, user2Ata: PublicKey, user3Ata: PublicKey;
  let treasuryAta: PublicKey;

  // polla state
  const POLLA_NAME = 'WC2026 Group A';
  const TOURNAMENT = 'World Cup 2026';
  const ENTRY_AMOUNT = new BN(1_000_000); // 1 USDC
  const NUM_MATCHES = 2;
  // 50% / 30% / 20% / 0... — top 3 share, fee already taken
  const PRIZE_DISTRIBUTION = [50, 30, 20, 0, 0, 0, 0, 0, 0, 0];

  let pollaPubkey: PublicKey;
  let pollaName: Buffer;
  let vaultPubkey: PublicKey;

  before(async () => {
    user1 = Keypair.generate();
    user2 = Keypair.generate();
    user3 = Keypair.generate();
    pollaName = nameSeed(POLLA_NAME);

    // mint authority + payer = admin
    usdcMint = await setupTestUsdcMint(connection, admin);

    // Fund each user with 5 USDC
    user1Ata = await fundUserWithUsdc(connection, admin, user1, usdcMint, 5_000_000n);
    user2Ata = await fundUserWithUsdc(connection, admin, user2, usdcMint, 5_000_000n);
    user3Ata = await fundUserWithUsdc(connection, admin, user3, usdcMint, 5_000_000n);

    // Treasury ATA owned by admin (since admin == platform.treasury)
    const treasuryAtaAcc = await getOrCreateAssociatedTokenAccount(
      connection,
      admin,
      usdcMint,
      admin.publicKey,
    );
    treasuryAta = treasuryAtaAcc.address;

    // Polla pubkey precompute
    [pollaPubkey] = pollaPda(programId, admin.publicKey, pollaName);
    vaultPubkey = getAssociatedTokenAddressSync(usdcMint, pollaPubkey, true);
  });

  it('1. initialize_platform', async () => {
    const [platform] = platformPda(programId);
    await program.methods
      .initializePlatform()
      .accounts({
        platform,
        authority: admin.publicKey,
        systemProgram: SYSTEM_PROGRAM,
      })
      .rpc();

    const cfg = await program.account.platformConfig.fetch(platform);
    expect(cfg.authority.toBase58()).eq(admin.publicKey.toBase58());
    expect(cfg.treasury.toBase58()).eq(admin.publicKey.toBase58());
    expect(cfg.feeBps).eq(500);
  });

  it('2. create_polla', async () => {
    await program.methods
      .createPolla(
        Array.from(pollaName),
        tournamentSeed(TOURNAMENT),
        ENTRY_AMOUNT,
        NUM_MATCHES,
        PRIZE_DISTRIBUTION,
      )
      .accounts({
        polla: pollaPubkey,
        usdcMint,
        vault: vaultPubkey,
        creator: admin.publicKey,
        tokenProgram: TOKEN_PROGRAM,
        associatedTokenProgram: ATA_PROGRAM,
        systemProgram: SYSTEM_PROGRAM,
      })
      .rpc();

    const polla = await program.account.polla.fetch(pollaPubkey);
    expect(polla.numMatches).eq(NUM_MATCHES);
    expect(polla.numParticipants).eq(0);
    expect(polla.totalPool.toString()).eq('0');
  });

  it('3. add_match × 2', async () => {
    for (let i = 0; i < NUM_MATCHES; i++) {
      const [matchAcc] = matchPda(programId, pollaPubkey, i);
      await program.methods
        .addMatch(i, teamBytes(`HOME_${i}`), teamBytes(`AWAY_${i}`))
        .accounts({
          polla: pollaPubkey,
          matchAccount: matchAcc,
          creator: admin.publicKey,
          systemProgram: SYSTEM_PROGRAM,
        })
        .rpc();
    }
  });

  it('4. join_polla — three users', async () => {
    for (const [user, ata] of [
      [user1, user1Ata],
      [user2, user2Ata],
      [user3, user3Ata],
    ] as const) {
      const [prediction] = predictionPda(programId, pollaPubkey, user.publicKey);
      await program.methods
        .joinPolla()
        .accounts({
          polla: pollaPubkey,
          pollaVault: vaultPubkey,
          participantUsdcAta: ata,
          prediction,
          participant: user.publicKey,
          tokenProgram: TOKEN_PROGRAM,
          systemProgram: SYSTEM_PROGRAM,
        })
        .signers([user])
        .rpc();
    }

    const polla = await program.account.polla.fetch(pollaPubkey);
    expect(polla.numParticipants).eq(3);
    expect(polla.totalPool.toString()).eq('3000000'); // 3 USDC
  });

  it('5. submit_prediction — three users with different scores', async () => {
    // Match 0 actual will be 2-1 (home win)
    // Match 1 actual will be 1-1 (draw)
    // Scoring rule (5/3/0): exact = 5, correct W/D/L outcome = 3, wrong = 0.
    // user1 predictions: [2-1 exact, 1-1 exact]                = 5 + 5 = 10 pts (top)
    // user2 predictions: [3-2 home-win, 2-2 draw]              = 3 + 3 = 6  pts (second)
    // user3 predictions: [4-1 home-win, 0-3 away-win-wrong]    = 3 + 0 = 3  pts (third)
    const userPreds = [
      { user: user1, scores: pad([{ home: 2, away: 1 }, { home: 1, away: 1 }]) },
      { user: user2, scores: pad([{ home: 3, away: 2 }, { home: 2, away: 2 }]) },
      { user: user3, scores: pad([{ home: 4, away: 1 }, { home: 0, away: 3 }]) },
    ];

    for (const { user, scores } of userPreds) {
      const [prediction] = predictionPda(programId, pollaPubkey, user.publicKey);
      await program.methods
        .submitPrediction(scores)
        .accounts({
          polla: pollaPubkey,
          prediction,
          predictor: user.publicKey,
        })
        .signers([user])
        .rpc();
    }
  });

  it('6. set_match_result — both matches', async () => {
    const [platform] = platformPda(programId);
    const results = [
      { idx: 0, h: 2, a: 1 },
      { idx: 1, h: 1, a: 1 },
    ];
    for (const r of results) {
      const [matchAcc] = matchPda(programId, pollaPubkey, r.idx);
      await program.methods
        .setMatchResult(r.idx, r.h, r.a)
        .accounts({
          platform,
          polla: pollaPubkey,
          matchAccount: matchAcc,
          authority: admin.publicKey,
        })
        .rpc();
    }
    const polla = await program.account.polla.fetch(pollaPubkey);
    expect(polla.matchesSettled).eq(NUM_MATCHES);
  });

  it('7. settle_polla — on-chain ranking + 5% fee', async () => {
    const treasuryBefore = await getTokenBalance(connection, treasuryAta);
    const [platform] = platformPda(programId);
    const [m0] = matchPda(programId, pollaPubkey, 0);
    const [m1] = matchPda(programId, pollaPubkey, 1);
    const [p1] = predictionPda(programId, pollaPubkey, user1.publicKey);
    const [p2] = predictionPda(programId, pollaPubkey, user2.publicKey);
    const [p3] = predictionPda(programId, pollaPubkey, user3.publicKey);

    await program.methods
      .settlePolla()
      .accounts({
        platform,
        polla: pollaPubkey,
        pollaVault: vaultPubkey,
        treasuryUsdcAta: treasuryAta,
        caller: admin.publicKey,
        tokenProgram: TOKEN_PROGRAM,
      })
      .remainingAccounts([
        { pubkey: m0, isWritable: false, isSigner: false },
        { pubkey: m1, isWritable: false, isSigner: false },
        { pubkey: p1, isWritable: true, isSigner: false },
        { pubkey: p2, isWritable: true, isSigner: false },
        { pubkey: p3, isWritable: true, isSigner: false },
      ])
      .rpc();

    // 5% of 3 USDC = 0.15 USDC = 150_000 base units
    const treasuryAfter = await getTokenBalance(connection, treasuryAta);
    expect((treasuryAfter - treasuryBefore).toString()).eq('150000');

    const polla = await program.account.polla.fetch(pollaPubkey);
    expect((polla.status as { settled?: object }).settled !== undefined).eq(true);

    const pred1 = await program.account.prediction.fetch(p1);
    const pred2 = await program.account.prediction.fetch(p2);
    const pred3 = await program.account.prediction.fetch(p3);
    expect(pred1.points).eq(10);
    expect(pred2.points).eq(6);
    expect(pred3.points).eq(3);
    expect(pred1.finalRank).eq(0);
    expect(pred2.finalRank).eq(1);
    expect(pred3.finalRank).eq(2);
  });

  it('8. claim_prize — top winner gets 50% of pool-after-fee', async () => {
    // pool-after-fee = 3 USDC * 0.95 = 2.85 USDC = 2_850_000 base units
    // user1 share = 50% → 1_425_000 base units
    const before = await getTokenBalance(connection, user1Ata);
    const [prediction] = predictionPda(programId, pollaPubkey, user1.publicKey);

    await program.methods
      .claimPrize()
      .accounts({
        polla: pollaPubkey,
        pollaVault: vaultPubkey,
        prediction,
        predictorUsdcAta: user1Ata,
        predictor: user1.publicKey,
        tokenProgram: TOKEN_PROGRAM,
      })
      .signers([user1])
      .rpc();

    const after = await getTokenBalance(connection, user1Ata);
    expect((after - before).toString()).eq('1425000');
  });

  it('9. claim_prize — third winner gets 20% of pool-after-fee', async () => {
    // user3 share = 20% → 570_000 base units
    const before = await getTokenBalance(connection, user3Ata);
    const [prediction] = predictionPda(programId, pollaPubkey, user3.publicKey);

    await program.methods
      .claimPrize()
      .accounts({
        polla: pollaPubkey,
        pollaVault: vaultPubkey,
        prediction,
        predictorUsdcAta: user3Ata,
        predictor: user3.publicKey,
        tokenProgram: TOKEN_PROGRAM,
      })
      .signers([user3])
      .rpc();

    const after = await getTokenBalance(connection, user3Ata);
    expect((after - before).toString()).eq('570000');
  });

  it('10. claim_prize — already-claimed reverts', async () => {
    const [prediction] = predictionPda(programId, pollaPubkey, user1.publicKey);
    let threw = false;
    try {
      await program.methods
        .claimPrize()
        .accounts({
          polla: pollaPubkey,
          pollaVault: vaultPubkey,
          prediction,
          predictorUsdcAta: user1Ata,
          predictor: user1.publicKey,
          tokenProgram: TOKEN_PROGRAM,
        })
        .signers([user1])
        .rpc();
    } catch (e) {
      threw = true;
    }
    expect(threw).eq(true);
  });
});

function pad(scores: { home: number; away: number }[]): { home: number; away: number }[] {
  const out = [...scores];
  while (out.length < 10) out.push({ home: -1, away: -1 });
  return out;
}
