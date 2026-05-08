use anchor_lang::prelude::*;

use crate::constants::{MATCH_SEED, UNSET_SCORE};
use crate::errors::ChickenPicksError;
use crate::state::{Match, Polla, PollaStatus};

#[derive(Accounts)]
#[instruction(match_index: u8)]
pub struct AddMatch<'info> {
    #[account(
        mut,
        has_one = creator @ ChickenPicksError::UnauthorizedAuthority,
    )]
    pub polla: Account<'info, Polla>,

    #[account(
        init,
        payer = creator,
        space = 8 + Match::INIT_SPACE,
        seeds = [MATCH_SEED, polla.key().as_ref(), &[match_index]],
        bump
    )]
    pub match_account: Account<'info, Match>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<AddMatch>,
    match_index: u8,
    home_team: [u8; 16],
    away_team: [u8; 16],
) -> Result<()> {
    let polla = &ctx.accounts.polla;

    require!(polla.status == PollaStatus::Open, ChickenPicksError::PollaNotOpen);
    require!(
        match_index < polla.num_matches,
        ChickenPicksError::MatchIndexOutOfRange
    );

    let m = &mut ctx.accounts.match_account;
    m.polla = polla.key();
    m.match_index = match_index;
    m.home_team = home_team;
    m.away_team = away_team;
    m.home_score = UNSET_SCORE;
    m.away_score = UNSET_SCORE;
    m.settled = false;
    m.bump = ctx.bumps.match_account;

    Ok(())
}
