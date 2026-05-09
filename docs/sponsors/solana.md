# Solana integration

ChickenPicks OnChain treats Solana as the **source of truth** — every pool, vault, prediction, match result, settlement, and prize claim lives in the Anchor program. There is no off-chain database mirroring this state.

## Program

- **Path**: `programs/chickenpicks-onchain/programs/chickenpicks-onchain/src/lib.rs`
- **Framework**: Anchor 0.31
- **Cluster**: devnet
- **Program ID**: `Cdd53o33BTaZcmpZ55TemGPmZRR2mbMiYDEU6Mecb3ut`
- **Treasury / authority**: `76QkvEWDpRW3PnLVz2wctcFJm9dAsXquHTEkwSxxq31H`
- **Test USDC mint** (deployer-controlled, so judges can be funded on demand): `sWjZfTkMM2zbNBx1YwgYGmsXfZpA1yo5HkhSqB9AUXC`

## Instructions

| Instruction | Caller | Purpose |
|---|---|---|
| `initialize_platform` | treasury | One-shot, sets `PlatformConfig` (treasury, fee bps). |
| `create_polla` | treasury | Creates a `Polla` PDA + match list + USDC vault PDA. |
| `join_polla` | any user | Pays entry into the vault PDA, allocates `Prediction`. |
| `submit_prediction` | participant | Writes the user's scores; rejected once any result is posted. |
| `post_match_result` | treasury (oracle role) | Records the official scoreline for one match. |
| `settle_polla` | any signer | Atomic: scores all predictions, transfers 5 % fee to treasury, writes ranks + winner pubkeys to the pool. |
| `claim_prize` | strict winner | Transfers the winner's slice from vault → user. Enforces `winner_pubkey == ctx.accounts.winner.key()`. |

## On-chain ranking

`settle_polla` iterates predictions and computes points using the la-polla rule:

- **5 pts** — exact scoreline.
- **3 pts** — correct goal-difference (and not exact).
- **2 pts** — correct winner only.
- **0 pts** — otherwise.

Predictions are sorted in-program; top-N per the pool's `prize_distribution` get their pubkey + amount written into the `Polla` account. The 5 % fee is moved to the treasury ATA in the same instruction — single tx, no orchestration.

## Compute-budget cap

Sorting in-program means `settle_polla` is bounded by participant count. The current safe ceiling is **~5 participants per pool**. A chunked `settle_polla_partial` is the post-hackathon path for larger pools.

## Strict-signer claim

`claim_prize` is the simplest of the seven and the most security-critical:

```rust
require_keys_eq!(
    polla.winners[idx].pubkey,
    ctx.accounts.winner.key(),
    ChickenPicksError::Unauthorized
);
```

There is no admin override. Even the treasury cannot pull a winner's slice.

## Mainnet migration

The program is cluster-agnostic. Mainnet flip needs:
1. Re-deploy under a fresh program ID (or use a Squads multisig + upgrade authority transfer for the existing one).
2. Swap the test USDC mint for canonical USDC `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`.
3. Pin the new IDs in `packages/shared/src/constants.ts` and Vercel env.

The web + mobile + voice clients already read these from constants — flipping cluster is a config change, not a code change.

## Scripts

- `scripts/init-platform.ts` — one-shot init.
- `scripts/seed-demo-polla.ts` — creates the "World Cup with Friends" pool.
- `scripts/post-results.ts` — fake-oracle posting.
- `scripts/settle-polla.ts` — admin-side settle for the demo recording.
