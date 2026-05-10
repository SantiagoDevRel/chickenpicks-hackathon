use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::{MAX_MATCHES, PREDICTION_SEED, UNRANKED, UNSET_SCORE};
use crate::errors::ChickenPicksError;
use crate::state::{Polla, PollaStatus, Prediction, PredictionScore};

#[derive(Accounts)]
pub struct JoinPolla<'info> {
    #[account(mut)]
    pub polla: Account<'info, Polla>,

    /// Vault ATA owned by the Polla PDA. Verified by ATA constraint.
    #[account(
        mut,
        constraint = polla_vault.key() == polla.vault @ ChickenPicksError::PredictionPollaMismatch
    )]
    pub polla_vault: Account<'info, TokenAccount>,

    /// Participant's USDC token account — funded with at least entry_amount.
    #[account(
        mut,
        constraint = participant_usdc_ata.mint == polla.usdc_mint,
        constraint = participant_usdc_ata.owner == participant.key()
    )]
    pub participant_usdc_ata: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = participant,
        space = 8 + Prediction::INIT_SPACE,
        seeds = [PREDICTION_SEED, polla.key().as_ref(), participant.key().as_ref()],
        bump
    )]
    pub prediction: Account<'info, Prediction>,

    #[account(mut)]
    pub participant: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<JoinPolla>) -> Result<()> {
    let polla = &mut ctx.accounts.polla;
    require!(polla.status == PollaStatus::Open, ChickenPicksError::PollaNotOpen);

    // Transfer entry_amount USDC from participant to vault
    if polla.entry_amount > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.participant_usdc_ata.to_account_info(),
            to: ctx.accounts.polla_vault.to_account_info(),
            authority: ctx.accounts.participant.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, polla.entry_amount)?;
    }

    // Init prediction account with empty scores
    let prediction = &mut ctx.accounts.prediction;
    prediction.polla = polla.key();
    prediction.predictor = ctx.accounts.participant.key();
    prediction.scores = [PredictionScore { home: UNSET_SCORE, away: UNSET_SCORE }; MAX_MATCHES];
    prediction.submitted_at_slot = 0;
    prediction.points = 0;
    prediction.final_rank = UNRANKED;
    prediction.claimed = false;
    prediction.bump = ctx.bumps.prediction;

    // Bookkeeping
    polla.num_participants = polla
        .num_participants
        .checked_add(1)
        .ok_or(ChickenPicksError::NumericalOverflow)?;
    polla.total_pool = polla
        .total_pool
        .checked_add(polla.entry_amount)
        .ok_or(ChickenPicksError::NumericalOverflow)?;

    Ok(())
}
