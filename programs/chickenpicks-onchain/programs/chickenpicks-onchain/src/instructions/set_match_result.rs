use anchor_lang::prelude::*;

use crate::constants::{MATCH_SEED, PLATFORM_SEED};
use crate::errors::ChickenPicksError;
use crate::state::{Match, PlatformConfig, Polla, PollaStatus};

#[derive(Accounts)]
#[instruction(match_index: u8)]
pub struct SetMatchResult<'info> {
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform.bump,
        has_one = authority @ ChickenPicksError::UnauthorizedAuthority,
    )]
    pub platform: Account<'info, PlatformConfig>,

    #[account(mut)]
    pub polla: Account<'info, Polla>,

    #[account(
        mut,
        seeds = [MATCH_SEED, polla.key().as_ref(), &[match_index]],
        bump = match_account.bump,
        constraint = match_account.polla == polla.key() @ ChickenPicksError::MatchPollaMismatch,
    )]
    pub match_account: Account<'info, Match>,

    pub authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<SetMatchResult>,
    match_index: u8,
    home_score: i8,
    away_score: i8,
) -> Result<()> {
    require!(
        home_score >= 0 && away_score >= 0,
        ChickenPicksError::MatchIndexOutOfRange
    );

    let polla = &mut ctx.accounts.polla;
    require!(
        polla.status == PollaStatus::Open || polla.status == PollaStatus::Locked,
        ChickenPicksError::PollaAlreadySettled
    );
    require!(
        match_index < polla.num_matches,
        ChickenPicksError::MatchIndexOutOfRange
    );

    let m = &mut ctx.accounts.match_account;
    require!(!m.settled, ChickenPicksError::MatchAlreadySettled);

    m.home_score = home_score;
    m.away_score = away_score;
    m.settled = true;

    // First result locks the polla — predictions can no longer be submitted.
    if polla.status == PollaStatus::Open {
        polla.status = PollaStatus::Locked;
        polla.locked_at_slot = Clock::get()?.slot;
    }

    polla.matches_settled = polla
        .matches_settled
        .checked_add(1)
        .ok_or(ChickenPicksError::NumericalOverflow)?;

    Ok(())
}
