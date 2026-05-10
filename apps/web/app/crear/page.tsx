// apps/web/app/crear/page.tsx
//
// "Crear nueva polla" — 3-step wizard. Mirrors la-polla's UX:
//   1. Info        → name + tournament
//   2. Partidos    → fixture picker fed by /api/espn/fixtures
//   3. Configuración → entry amount + prize tiers, submit on-chain
//
// On-chain authority model (important):
//   - The Anchor program's `create_polla` and `add_match` only require the
//     pool's *creator* (whoever signs) — there is no platform-authority gate
//     on these instructions. See:
//       programs/.../src/instructions/create_polla.rs (line 33: `pub creator: Signer`)
//       programs/.../src/instructions/add_match.rs    (has_one = creator)
//     So this wizard signs everything with the user's Privy embedded wallet.
//     The user pays SOL rent for the polla PDA + each match account.
//
//   - The /api/admin/create-polla endpoint scaffold exists for the case where
//     we want to migrate to a "platform-creates, user-funds" model (e.g. to
//     hide rent costs from the user) — but it's TODO and not used by this
//     wizard today.
//
// Submit flow:
//   1. Build name [u8;32] and tournament [u8;32] padded buffers.
//   2. Derive polla PDA with seeds [b"polla", creator.toBuffer(), name].
//   3. Compute the vault ATA off-curve.
//   4. createPolla(name, tournament, entryAmount, numMatches, prizeDistribution).
//   5. For each selected fixture, derive match PDA + send addMatch(idx, home, away).
//   6. On success, redirect to /pollas/<polla>.
//
// Privy + Anchor wiring lives at the top of the file (mirrors the pattern in
// apps/web/app/pollas/[id]/page.tsx — same `adaptedWallet` shim because Privy
// returns a slightly different wallet shape than Anchor's `Wallet`).
//
// Edge cases worth knowing:
//   - Privy embedded wallet may not be funded with SOL on first use. We don't
//     handle airdrop here — the tx will fail with "insufficient funds" and the
//     user sees the raw error. Future: detect that error and show a helpful
//     CTA. (TODO comment near the catch block.)
//   - `add_match` errors don't roll back the `create_polla` because we send
//     them as separate txs. If the user partially succeeds they'll see a polla
//     with fewer matches than expected. We surface this in the error UI and
//     offer a "Continue adding matches" button. (TODO — basic for now.)

'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AnchorProvider,
  BN,
  Program,
  type Idl,
} from '@coral-xyz/anchor';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import idl from '@chickenpicks/anchor-client/idl' with { type: 'json' };
import {
  MAX_PRIZE_TIERS,
  PROGRAM_ID,
  SOLANA_RPC_URL,
  USDC_DECIMALS,
  USDC_MINT,
} from '@chickenpicks/shared';

import { BrandHeader } from '@/components/BrandHeader';
import { ProgressChips, type WizardStep } from '@/components/CrearPolla/ProgressChips';
import { Step1Info, type Step1Value } from '@/components/CrearPolla/Step1Info';
import {
  Step2Matches,
  defaultStep2,
  type Step2Value,
} from '@/components/CrearPolla/Step2Matches';
import {
  Step3Prizes,
  defaultStep3,
  tiersAreValid,
  type Step3Value,
} from '@/components/CrearPolla/Step3Prizes';
import { getTournament } from '@/lib/espn/tournaments';

const programId = new PublicKey(PROGRAM_ID);
const usdcMintKey = new PublicKey(USDC_MINT);

// --- Helpers -----------------------------------------------------------------

/** Pad/truncate a UTF-8 string to exactly `len` bytes. Used for both polla.name
 *  ([u8;32]) and match.home_team / match.away_team ([u8;16]). */
function padToBytes(s: string, len: number): number[] {
  const buf = new Uint8Array(len);
  const enc = new TextEncoder().encode(s);
  buf.set(enc.subarray(0, Math.min(enc.length, len)), 0);
  return Array.from(buf);
}

/** Build the polla PDA from seeds [b"polla", creator, name] — same logic as
 *  the on-chain seeds in create_polla.rs. */
function pollaPda(creator: PublicKey, name32: number[]): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      new TextEncoder().encode('polla'),
      creator.toBuffer(),
      Uint8Array.from(name32),
    ],
    programId,
  );
  return pda;
}

function matchPda(polla: PublicKey, idx: number): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('match'), polla.toBuffer(), Uint8Array.from([idx])],
    programId,
  );
  return pda;
}

/** Convert a decimal USDC string ("1.50") to a base-units BN respecting the
 *  6-decimal USDC convention. Floors anything past 6 decimals. */
function usdcToBaseUnits(amount: string): BN {
  const [whole, fracRaw = ''] = amount.split('.');
  const frac = (fracRaw + '000000').slice(0, USDC_DECIMALS);
  const combined = `${whole || '0'}${frac}`.replace(/^0+/, '') || '0';
  return new BN(combined);
}

// --- Wizard state ------------------------------------------------------------

type SubmitStatus = {
  busy: boolean;
  error: string | null;
  txSig: string | null;
  /** Progress through the add_match loop after create_polla succeeds. */
  progress: { current: number; total: number } | null;
};

// Per-account rent (lamports) — read once via conn.getMinimumBalanceForRentExemption
// would be cleaner, but each Match account is ~1.4M lamports based on observed
// txs (insufficient lamports 1092480, need 1426800). Conservative buffer.
const RENT_PER_MATCH_LAMPORTS = 1_500_000;
const TX_FEE_BUFFER_LAMPORTS = 100_000; // generous fee headroom per tx
const POLLA_OVERHEAD_LAMPORTS = 5_000_000; // create_polla rent + ATA + buffer

export default function CrearPollaPage() {
  const router = useRouter();
  const { authenticated, ready, login } = usePrivy();
  const { wallets } = useSolanaWallets();
  const wallet = wallets[0];
  const userPubkey = useMemo(() => {
    if (!wallet?.address) return null;
    try {
      return new PublicKey(wallet.address);
    } catch {
      return null;
    }
  }, [wallet?.address]);

  const [step, setStep] = useState<WizardStep>(1);

  const [step1, setStep1] = useState<Step1Value>({
    name: '',
    tournamentId: null,
  });
  const [step2, setStep2] = useState<Step2Value>(defaultStep2());
  const [step3, setStep3] = useState<Step3Value>(defaultStep3());
  const [submit, setSubmit] = useState<SubmitStatus>({
    busy: false,
    error: null,
    txSig: null,
    progress: null,
  });

  // Used to disable the wizard if the page is in the middle of submitting —
  // we don't want the user to navigate steps mid-tx.
  const submitInFlight = useRef(false);

  function onCancel() {
    if (submitInFlight.current) return;
    router.push('/pollas');
  }

  // --- Step 1 → 2 ----------------------------------------------------------
  function goToStep2() {
    if (!step1.name.trim() || !step1.tournamentId) return;
    setStep(2);
  }

  // --- Step 2 → 3 ----------------------------------------------------------
  function goToStep3() {
    if (step2.selected.length < 1) return;
    setStep(3);
  }

  // --- Step 3 submit -------------------------------------------------------
  async function handleSubmit() {
    if (submit.busy) return;
    if (!ready || !authenticated || !userPubkey || !wallet) {
      setSubmit({
        busy: false,
        error: 'Sign in with email to create the pool.',
        txSig: null,
        progress: null,
      });
      return;
    }
    if (!tiersAreValid(step3.tiers)) {
      setSubmit({
        busy: false,
        error: 'Prize tiers must add up to exactly 100%.',
        txSig: null,
        progress: null,
      });
      return;
    }
    const entryNum = Number(step3.entryUsdc);
    if (!Number.isFinite(entryNum) || entryNum <= 0) {
      setSubmit({
        busy: false,
        error: 'Entry amount must be greater than 0.',
        txSig: null,
        progress: null,
      });
      return;
    }
    if (step2.selected.length < 1) {
      setSubmit({
        busy: false,
        error: 'Go back to step 2 and pick at least 1 match.',
        txSig: null,
        progress: null,
      });
      return;
    }
    const tournament = step1.tournamentId
      ? getTournament(step1.tournamentId)
      : null;
    if (!tournament) {
      setSubmit({
        busy: false,
        error: 'Go back to step 1 and pick a tournament.',
        txSig: null,
        progress: null,
      });
      return;
    }

    submitInFlight.current = true;
    setSubmit({ busy: true, error: null, txSig: null, progress: null });
    try {
      const conn = new Connection(SOLANA_RPC_URL, 'confirmed');

      // Preflight: check user's SOL balance is enough to fund create_polla
      // + every add_match before kicking off any tx. This prevents the
      // partial-failure footgun where the polla gets created but only some
      // match accounts allocate (leaving an unsettleable polla on chain).
      const numMatches = step2.selected.length;
      const requiredLamports =
        POLLA_OVERHEAD_LAMPORTS +
        numMatches * (RENT_PER_MATCH_LAMPORTS + TX_FEE_BUFFER_LAMPORTS);
      const userBalance = await conn.getBalance(userPubkey);
      if (userBalance < requiredLamports) {
        const needSol = (requiredLamports / 1e9).toFixed(3);
        const haveSol = (userBalance / 1e9).toFixed(3);
        setSubmit({
          busy: false,
          error: `Need ~${needSol} SOL to create this pool with ${numMatches} matches. You have ${haveSol} SOL. Pick fewer matches or top up your wallet.`,
          txSig: null,
          progress: null,
        });
        submitInFlight.current = false;
        return;
      }
      // Privy's Solana wallet returns a different shape than Anchor expects.
      // This adapter mirrors the one in apps/web/app/pollas/[id]/page.tsx.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adaptedWallet: any = {
        publicKey: userPubkey,
        signTransaction: async (tx: unknown) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return await (wallet as any).signTransaction(tx);
        },
        signAllTransactions: async (txs: unknown[]) => {
          return Promise.all(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            txs.map((tx) => (wallet as any).signTransaction(tx)),
          );
        },
      };
      const provider = new AnchorProvider(conn, adaptedWallet, {
        commitment: 'confirmed',
      });
      const program = new Program(idl as Idl, provider);

      // Build inputs.
      // We use the tournament *name* (not slug) on-chain to keep the existing
      // /pollas listing readable. Slug is what the picker uses internally.
      const nameBytes = padToBytes(step1.name.trim(), 32);
      const tournamentBytes = padToBytes(tournament.name, 32);
      const entryAmount = usdcToBaseUnits(step3.entryUsdc);

      // Pad prize_distribution to exactly MAX_PRIZE_TIERS slots.
      const prizeDistribution: number[] = [];
      for (let i = 0; i < MAX_PRIZE_TIERS; i++) {
        prizeDistribution.push(step3.tiers[i] ?? 0);
      }

      const polla = pollaPda(userPubkey, nameBytes);
      const vault = getAssociatedTokenAddressSync(usdcMintKey, polla, true);

      // 1) create_polla
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createSig = await (program.methods as any)
        .createPolla(
          nameBytes,
          tournamentBytes,
          entryAmount,
          numMatches,
          prizeDistribution,
        )
        .accounts({
          polla,
          usdcMint: usdcMintKey,
          vault,
          creator: userPubkey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // 2) add_match × N (sequential — they share the same `creator` signer
      //    and order matters because polla.num_matches is checked per-call).
      //    Update progress on each iteration so Step3Prizes can render
      //    "Adding match X of N" — without this the user sees "creating..."
      //    for 30-180s with no feedback.
      for (let i = 0; i < step2.selected.length; i++) {
        const fix = step2.selected[i];
        if (!fix) continue;
        setSubmit({
          busy: true,
          error: null,
          txSig: null,
          progress: { current: i, total: step2.selected.length },
        });
        const homeBytes = padToBytes(fix.homeTeam, 16);
        const awayBytes = padToBytes(fix.awayTeam, 16);
        const matchAccount = matchPda(polla, i);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (program.methods as any)
          .addMatch(i, homeBytes, awayBytes)
          .accounts({
            polla,
            matchAccount,
            creator: userPubkey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      }

      setSubmit({
        busy: false,
        error: null,
        txSig: createSig,
        progress: { current: step2.selected.length, total: step2.selected.length },
      });

      // Tiny delay so the user can see the success toast before we redirect.
      setTimeout(() => {
        router.push(`/pollas/${polla.toBase58()}`);
      }, 900);
    } catch (e) {
      // Surface a friendlier error for the most common partial-failure case
      // (insufficient lamports mid-loop) so the user knows the polla is
      // half-created and can't be settled.
      const raw = (e as Error).message ?? 'Tx failed.';
      const isInsufficient =
        raw.includes('insufficient lamports') ||
        raw.includes('insufficient funds');
      setSubmit({
        busy: false,
        error: isInsufficient
          ? 'Ran out of SOL while creating match accounts. The polla was partly created and cannot be settled — please top up your wallet and create a new pool with fewer matches.'
          : raw,
        txSig: null,
        progress: null,
      });
    } finally {
      submitInFlight.current = false;
    }
  }

  // --- Render --------------------------------------------------------------

  return (
    <main className="min-h-screen pb-48">
      <BrandHeader />

      <div className="mx-auto max-w-md md:max-w-2xl px-4 pt-6">
        {/* Title row + back link */}
        <div className="flex items-center gap-3 mb-5">
          <Link
            href="/pollas"
            aria-label="Back to pools"
            className="text-text-muted hover:text-text-primary transition text-2xl leading-none"
          >
            ←
          </Link>
          <h1 className="font-display tracking-[0.04em] text-2xl text-text-primary uppercase">
            Create new pool
          </h1>
        </div>

        {/* Progress chips */}
        <div className="mb-6">
          <ProgressChips
            current={step}
            onJump={(s) => {
              if (submit.busy) return;
              if (s < step) setStep(s);
            }}
          />
        </div>

        {/* Auth gate — wizard is fully usable without sign-in until submit, but
            we surface the gate up-front so the user knows they'll need an
            embedded wallet at the end. */}
        {ready && !authenticated && (
          <div className="lp-card p-4 mb-5 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pollitos/Pollito_esperando.webp"
              alt=""
              width={36}
              height={36}
            />
            <div className="flex-1">
              <p className="text-sm text-amber font-display tracking-[0.04em]">
                YOU NEED TO SIGN IN TO CREATE THE POOL
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Your embedded wallet signs create_polla on-chain.
              </p>
            </div>
            <button
              onClick={() => login()}
              className="rounded-md bg-gold px-3 py-2 font-display tracking-[0.08em] text-xs text-black hover:bg-amber transition"
            >
              SIGN IN
            </button>
          </div>
        )}

        {/* Steps */}
        {step === 1 && (
          <Step1Info
            value={step1}
            onChange={setStep1}
            onContinue={goToStep2}
            onCancel={onCancel}
          />
        )}

        {step === 2 && step1.tournamentId && (
          <Step2Matches
            tournamentId={step1.tournamentId}
            value={step2}
            onChange={setStep2}
            onBack={() => setStep(1)}
            onContinue={goToStep3}
          />
        )}

        {step === 3 && (
          <Step3Prizes
            value={step3}
            busy={submit.busy}
            error={submit.error}
            txSig={submit.txSig}
            progress={submit.progress}
            onChange={setStep3}
            onBack={() => setStep(2)}
            onCancel={onCancel}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </main>
  );
}
