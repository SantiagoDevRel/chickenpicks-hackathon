use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::{EXPECTED_USDC_MINT, MAX_MATCHES, MAX_PRIZE_TIERS, POLLA_SEED};
use crate::errors::ChickenPicksError;
use crate::state::{Polla, PollaStatus};

#[derive(Accounts)]
#[instruction(name: [u8; 32])]
pub struct CreatePolla<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + Polla::INIT_SPACE,
        seeds = [POLLA_SEED, creator.key().as_ref(), name.as_ref()],
        bump
    )]
    pub polla: Account<'info, Polla>,

    /// USDC mint for entry payments. Pinned on-chain via EXPECTED_USDC_MINT.
    #[account(
        constraint = usdc_mint.key() == EXPECTED_USDC_MINT @ ChickenPicksError::InvalidUsdcMint
    )]
    pub usdc_mint: Account<'info, Mint>,

    /// Vault — token account owned by the Polla PDA, holds entry USDC.
    #[account(
        init,
        payer = creator,
        associated_token::mint = usdc_mint,
        associated_token::authority = polla
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreatePolla>,
    name: [u8; 32],
    tournament: [u8; 32],
    entry_amount: u64,
    num_matches: u8,
    prize_distribution: [u8; MAX_PRIZE_TIERS],
) -> Result<()> {
    require!(
        num_matches >= 1 && (num_matches as usize) <= MAX_MATCHES,
        ChickenPicksError::InvalidMatchCount
    );

    let prize_sum: u32 = prize_distribution.iter().map(|&p| p as u32).sum();
    require!(prize_sum <= 100, ChickenPicksError::InvalidPrizeDistribution);

    let polla = &mut ctx.accounts.polla;
    polla.creator = ctx.accounts.creator.key();
    polla.name = name;
    polla.tournament = tournament;
    polla.entry_amount = entry_amount;
    polla.usdc_mint = ctx.accounts.usdc_mint.key();
    polla.vault = ctx.accounts.vault.key();
    polla.num_matches = num_matches;
    polla.matches_settled = 0;
    polla.num_participants = 0;
    polla.total_pool = 0;
    polla.status = PollaStatus::Open;
    polla.locked_at_slot = 0;
    polla.prize_distribution = prize_distribution;
    polla.winners_settled = 0;
    polla.bump = ctx.bumps.polla;

    Ok(())
}
