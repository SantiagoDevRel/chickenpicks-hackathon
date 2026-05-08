use anchor_lang::prelude::*;

use crate::constants::{MAX_MATCHES, MAX_PRIZE_TIERS};

// ─────────────────────────────────────────────────────────────────────────────
// PlatformConfig — singleton, PDA seeds = ["platform"]
// ─────────────────────────────────────────────────────────────────────────────
#[account]
#[derive(InitSpace)]
pub struct PlatformConfig {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub fee_bps: u16,
    pub bump: u8,
}

// ─────────────────────────────────────────────────────────────────────────────
// Polla — one per prediction pool, PDA seeds = ["polla", creator, name_seed]
// ─────────────────────────────────────────────────────────────────────────────
#[account]
#[derive(InitSpace)]
pub struct Polla {
    pub creator: Pubkey,
    pub name: [u8; 32],
    pub tournament: [u8; 32],
    pub entry_amount: u64,
    pub usdc_mint: Pubkey,
    pub vault: Pubkey,
    pub num_matches: u8,
    pub matches_settled: u8,
    pub num_participants: u32,
    pub total_pool: u64,
    pub status: PollaStatus,
    pub locked_at_slot: u64,
    /// Percentage points 0..=100 for top N predictors (e.g. [50, 30, 20, 0, ...]).
    /// Sum must be <= 100. Applied to (total_pool - 5% fee). Index = final_rank.
    pub prize_distribution: [u8; MAX_PRIZE_TIERS],
    pub winners_settled: u8,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum PollaStatus {
    Open,    // accepting predictions and joins
    Locked,  // first match result posted; predictions frozen, waiting for remaining results
    Settled, // all results in, ranks computed, fee paid; claims open
}

// ─────────────────────────────────────────────────────────────────────────────
// Match — PDA seeds = ["match", polla, match_index]
// ─────────────────────────────────────────────────────────────────────────────
#[account]
#[derive(InitSpace)]
pub struct Match {
    pub polla: Pubkey,
    pub match_index: u8,
    pub home_team: [u8; 16],
    pub away_team: [u8; 16],
    /// -1 (UNSET_SCORE) until set_match_result is called.
    pub home_score: i8,
    pub away_score: i8,
    pub settled: bool,
    pub bump: u8,
}

// ─────────────────────────────────────────────────────────────────────────────
// Prediction — PDA seeds = ["prediction", polla, predictor]
// ─────────────────────────────────────────────────────────────────────────────
#[account]
#[derive(InitSpace)]
pub struct Prediction {
    pub polla: Pubkey,
    pub predictor: Pubkey,
    pub scores: [PredictionScore; MAX_MATCHES],
    pub submitted_at_slot: u64,
    pub points: u32,
    /// 0..MAX_PRIZE_TIERS once settled and in prize tier; UNRANKED (0xFF) otherwise.
    pub final_rank: u8,
    pub claimed: bool,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Default, Debug)]
pub struct PredictionScore {
    pub home: i8, // UNSET_SCORE (-1) until submitted
    pub away: i8,
}
