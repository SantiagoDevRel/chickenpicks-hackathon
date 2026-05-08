use anchor_lang::prelude::*;

use crate::constants::{PLATFORM_FEE_BPS, PLATFORM_SEED};
use crate::state::PlatformConfig;

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + PlatformConfig::INIT_SPACE,
        seeds = [PLATFORM_SEED],
        bump
    )]
    pub platform: Account<'info, PlatformConfig>,

    /// The authority is also the treasury for hackathon scope.
    /// Must match deployer wallet to satisfy admin-only ixs (set_match_result).
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializePlatform>) -> Result<()> {
    let platform = &mut ctx.accounts.platform;
    platform.authority = ctx.accounts.authority.key();
    platform.treasury = ctx.accounts.authority.key();
    platform.fee_bps = PLATFORM_FEE_BPS;
    platform.bump = ctx.bumps.platform;
    Ok(())
}
