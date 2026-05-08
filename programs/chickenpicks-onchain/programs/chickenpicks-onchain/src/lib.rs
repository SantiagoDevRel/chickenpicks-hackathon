// ChickenPicks OnChain — Solana program
//
// Football prediction market. Users join pollas (pools), predict scores for a
// list of matches, and split a USDC prize pool 5/3/2/0 (la-polla rule) when an
// admin posts the fake match results. 5% platform fee is paid atomically with
// settlement; ranking is computed on-chain from the full set of Predictions
// (passed via remaining_accounts) so no caller can fake the winners list.
//
// See /docs/sponsors/solana.md for full architecture.

use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod scoring;
pub mod state;

use instructions::*;
use state::*;

// Placeholder. Replace with the pubkey from `solana address -k keys/program.json`
// after generating keypairs (docs/SETUP.md §5). Must match all three Anchor.toml
// [programs.*] entries and NEXT_PUBLIC_PROGRAM_ID.
declare_id!("Cdd53o33BTaZcmpZ55TemGPmZRR2mbMiYDEU6Mecb3ut");

#[program]
pub mod chickenpicks_onchain {
    use super::*;

    pub fn initialize_platform(ctx: Context<InitializePlatform>) -> Result<()> {
        instructions::initialize_platform::handler(ctx)
    }

    pub fn create_polla(
        ctx: Context<CreatePolla>,
        name: [u8; 32],
        tournament: [u8; 32],
        entry_amount: u64,
        num_matches: u8,
        prize_distribution: [u8; 10],
    ) -> Result<()> {
        instructions::create_polla::handler(
            ctx,
            name,
            tournament,
            entry_amount,
            num_matches,
            prize_distribution,
        )
    }

    pub fn add_match(
        ctx: Context<AddMatch>,
        match_index: u8,
        home_team: [u8; 16],
        away_team: [u8; 16],
    ) -> Result<()> {
        instructions::add_match::handler(ctx, match_index, home_team, away_team)
    }

    pub fn join_polla(ctx: Context<JoinPolla>) -> Result<()> {
        instructions::join_polla::handler(ctx)
    }

    pub fn submit_prediction(
        ctx: Context<SubmitPrediction>,
        scores: [PredictionScore; 10],
    ) -> Result<()> {
        instructions::submit_prediction::handler(ctx, scores)
    }

    pub fn set_match_result(
        ctx: Context<SetMatchResult>,
        match_index: u8,
        home_score: i8,
        away_score: i8,
    ) -> Result<()> {
        instructions::set_match_result::handler(ctx, match_index, home_score, away_score)
    }

    /// Permissionless trigger. Caller must pass:
    ///   - All N Match accounts (in any order; we sort by match_index internally)
    ///     where N == polla.num_matches.
    ///   - All P Prediction accounts (in any order) where P == polla.num_participants.
    /// Match accounts come FIRST, then Prediction accounts. Both must reference
    /// the same polla. Program verifies completeness, scores on-chain via the
    /// 5/3/2/0 rule, sorts by (points DESC, submitted_at_slot ASC), writes
    /// final_rank to each Prediction, transfers 5% fee to treasury, marks
    /// polla.status = Settled.
    pub fn settle_polla(ctx: Context<SettlePolla>) -> Result<()> {
        instructions::settle_polla::handler(ctx)
    }

    /// Strict signer: ctx.accounts.predictor.key() must equal prediction.predictor.
    pub fn claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
        instructions::claim_prize::handler(ctx)
    }
}
