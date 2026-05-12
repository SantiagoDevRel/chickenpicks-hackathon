use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::{
    MAX_PRIZE_TIERS, PLATFORM_FEE_BPS, PLATFORM_SEED, POLLA_SEED, UNRANKED,
};
use crate::errors::ChickenPicksError;
use crate::scoring::score_match;
use crate::state::{Match, PlatformConfig, Polla, PollaStatus, Prediction};

/// Permissionless settle. Caller passes via `remaining_accounts`:
///   - First N entries: Match accounts (one per match_index 0..N-1, any order;
///     we sort by match_index internally).
///   - Next P entries: Prediction accounts (any order).
/// Where N == polla.num_matches and P == polla.num_participants. The program
/// verifies all counts, polla pubkey matches, and that all matches are settled
/// before scoring. Match accounts are read-only here; Prediction accounts are
/// mutated (points + final_rank are written back).
#[derive(Accounts)]
pub struct SettlePolla<'info> {
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform.bump,
    )]
    pub platform: Account<'info, PlatformConfig>,

    #[account(mut)]
    pub polla: Account<'info, Polla>,

    #[account(
        mut,
        constraint = polla_vault.key() == polla.vault @ ChickenPicksError::PredictionPollaMismatch
    )]
    pub polla_vault: Account<'info, TokenAccount>,

    /// Treasury USDC ATA — canonical Associated Token Account of
    /// (polla.usdc_mint, platform.treasury). Anchor verifies the address
    /// derivation, so a sibling token account owned by the treasury cannot
    /// be substituted.
    #[account(
        mut,
        associated_token::mint = polla.usdc_mint,
        associated_token::authority = platform.treasury,
    )]
    pub treasury_usdc_ata: Account<'info, TokenAccount>,

    /// Anyone — pays the tx fee, receives nothing.
    #[account(mut)]
    pub caller: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler<'info>(
    ctx: Context<'_, '_, 'info, 'info, SettlePolla<'info>>,
) -> Result<()> {
    let polla_key = ctx.accounts.polla.key();
    let polla_creator;
    let polla_name;
    let polla_bump;
    let polla_total_pool;
    let polla_prize_distribution;
    let num_matches;
    let num_participants;

    {
        let polla = &ctx.accounts.polla;
        require!(
            polla.status == PollaStatus::Locked,
            ChickenPicksError::PollaNotLocked
        );
        require!(
            polla.matches_settled == polla.num_matches,
            ChickenPicksError::MatchesNotSettled
        );
        polla_creator = polla.creator;
        polla_name = polla.name;
        polla_bump = polla.bump;
        polla_total_pool = polla.total_pool;
        polla_prize_distribution = polla.prize_distribution;
        num_matches = polla.num_matches as usize;
        num_participants = polla.num_participants as usize;
    }

    let expected_remaining = num_matches + num_participants;
    require_eq!(
        ctx.remaining_accounts.len(),
        expected_remaining,
        ChickenPicksError::PredictionAccountCountMismatch
    );

    // ─── Phase 1: deserialize Match accounts (read-only) ─────────────────────
    let mut matches: Vec<Match> = Vec::with_capacity(num_matches);
    for i in 0..num_matches {
        let ai = &ctx.remaining_accounts[i];
        let m: Account<'info, Match> = Account::try_from(ai)
            .map_err(|_| error!(ChickenPicksError::MatchAccountCountMismatch))?;
        require_keys_eq!(m.polla, polla_key, ChickenPicksError::MatchPollaMismatch);
        require!(m.settled, ChickenPicksError::MatchesNotSettled);
        matches.push(Match {
            polla: m.polla,
            match_index: m.match_index,
            home_team: m.home_team,
            away_team: m.away_team,
            home_score: m.home_score,
            away_score: m.away_score,
            settled: m.settled,
            bump: m.bump,
        });
    }

    matches.sort_by_key(|m| m.match_index);
    for (i, m) in matches.iter().enumerate() {
        require_eq!(
            m.match_index as usize,
            i,
            ChickenPicksError::InvalidMatchOrdering
        );
    }

    // ─── Phase 2: deserialize Prediction accounts and compute points ─────────
    // We score each prediction in this loop; we keep the indices into
    // remaining_accounts so we can re-deserialize and write back final_rank
    // after sorting (Anchor's Account<T> doesn't easily survive a sort over
    // borrowed AccountInfos, so we work with indexes).
    let mut scored: Vec<(usize, u32, u64)> = Vec::with_capacity(num_participants);

    for i in 0..num_participants {
        let ai = &ctx.remaining_accounts[num_matches + i];
        let p: Account<'info, Prediction> = Account::try_from(ai)
            .map_err(|_| error!(ChickenPicksError::PredictionAccountCountMismatch))?;
        require_keys_eq!(
            p.polla,
            polla_key,
            ChickenPicksError::PredictionPollaMismatch
        );

        let mut total_points: u32 = 0;
        for (idx, ps) in p.scores.iter().enumerate() {
            if idx >= num_matches {
                break;
            }
            total_points = total_points
                .checked_add(score_match(ps, &matches[idx]))
                .ok_or(ChickenPicksError::NumericalOverflow)?;
        }

        scored.push((num_matches + i, total_points, p.submitted_at_slot));
    }

    // ─── Phase 3: sort by (points DESC, submitted_at_slot ASC) ──────────────
    scored.sort_by(|a, b| b.1.cmp(&a.1).then(a.2.cmp(&b.2)));

    // ─── Phase 4: write points + final_rank back to each Prediction ─────────
    for (rank, (acc_idx, total_points, _slot)) in scored.iter().enumerate() {
        let ai = &ctx.remaining_accounts[*acc_idx];
        let mut p: Account<'info, Prediction> = Account::try_from(ai)?;
        p.points = *total_points;
        p.final_rank = if rank < MAX_PRIZE_TIERS && polla_prize_distribution[rank] > 0 {
            rank as u8
        } else {
            UNRANKED
        };
        p.exit(ctx.program_id)?;
    }

    // ─── Phase 5: 5% fee CPI vault → treasury (Polla PDA signs) ─────────────
    let fee = polla_total_pool
        .checked_mul(PLATFORM_FEE_BPS as u64)
        .ok_or(ChickenPicksError::NumericalOverflow)?
        .checked_div(10_000)
        .ok_or(ChickenPicksError::NumericalOverflow)?;

    if fee > 0 {
        let signer_seeds: &[&[&[u8]]] = &[&[
            POLLA_SEED,
            polla_creator.as_ref(),
            polla_name.as_ref(),
            &[polla_bump],
        ]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.polla_vault.to_account_info(),
            to: ctx.accounts.treasury_usdc_ata.to_account_info(),
            authority: ctx.accounts.polla.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, fee)?;
    }

    // ─── Phase 6: mark settled ──────────────────────────────────────────────
    let polla = &mut ctx.accounts.polla;
    polla.status = PollaStatus::Settled;
    polla.winners_settled = num_participants.min(MAX_PRIZE_TIERS) as u8;

    Ok(())
}
