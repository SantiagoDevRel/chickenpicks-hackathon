use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::{
    MAX_PRIZE_TIERS, PLATFORM_FEE_BPS, POLLA_SEED, PREDICTION_SEED, UNRANKED,
};
use crate::errors::ChickenPicksError;
use crate::state::{Polla, PollaStatus, Prediction};

#[derive(Accounts)]
pub struct ClaimPrize<'info> {
    #[account(mut)]
    pub polla: Account<'info, Polla>,

    #[account(
        mut,
        constraint = polla_vault.key() == polla.vault @ ChickenPicksError::PredictionPollaMismatch
    )]
    pub polla_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [PREDICTION_SEED, polla.key().as_ref(), predictor.key().as_ref()],
        bump = prediction.bump,
        has_one = predictor @ ChickenPicksError::PredictorMismatch,
        constraint = prediction.polla == polla.key() @ ChickenPicksError::PredictionPollaMismatch,
    )]
    pub prediction: Account<'info, Prediction>,

    #[account(
        mut,
        constraint = predictor_usdc_ata.mint == polla.usdc_mint,
        constraint = predictor_usdc_ata.owner == predictor.key(),
    )]
    pub predictor_usdc_ata: Account<'info, TokenAccount>,

    pub predictor: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimPrize>) -> Result<()> {
    let polla = &ctx.accounts.polla;
    require!(polla.status == PollaStatus::Settled, ChickenPicksError::PollaNotSettled);

    let prediction = &mut ctx.accounts.prediction;
    require!(!prediction.claimed, ChickenPicksError::AlreadyClaimed);
    require!(prediction.final_rank != UNRANKED, ChickenPicksError::NotInPrizeTier);
    require!(
        (prediction.final_rank as usize) < MAX_PRIZE_TIERS,
        ChickenPicksError::NotInPrizeTier
    );

    let share_pct = polla.prize_distribution[prediction.final_rank as usize] as u64;
    require!(share_pct > 0, ChickenPicksError::NotInPrizeTier);

    // After-fee pool: total_pool * (10000 - PLATFORM_FEE_BPS) / 10000
    let pool_after_fee = polla
        .total_pool
        .checked_mul((10_000 - PLATFORM_FEE_BPS) as u64)
        .ok_or(ChickenPicksError::NumericalOverflow)?
        .checked_div(10_000)
        .ok_or(ChickenPicksError::NumericalOverflow)?;

    let payout = pool_after_fee
        .checked_mul(share_pct)
        .ok_or(ChickenPicksError::NumericalOverflow)?
        .checked_div(100)
        .ok_or(ChickenPicksError::NumericalOverflow)?;

    // Transfer from vault → predictor. Polla PDA signs.
    let polla_key = polla.key();
    let creator = polla.creator;
    let name = polla.name;
    let bump = polla.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[
        POLLA_SEED,
        creator.as_ref(),
        name.as_ref(),
        &[bump],
    ]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.polla_vault.to_account_info(),
        to: ctx.accounts.predictor_usdc_ata.to_account_info(),
        authority: polla.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    token::transfer(cpi_ctx, payout)?;

    prediction.claimed = true;

    // Quiet the unused-binding lint in case Rust gets noisy
    let _ = polla_key;

    Ok(())
}
