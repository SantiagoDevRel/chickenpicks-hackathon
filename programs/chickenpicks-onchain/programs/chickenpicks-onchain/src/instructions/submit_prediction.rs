use anchor_lang::prelude::*;

use crate::constants::{MAX_MATCHES, PREDICTION_SEED};
use crate::errors::ChickenPicksError;
use crate::state::{Polla, PollaStatus, Prediction, PredictionScore};

#[derive(Accounts)]
pub struct SubmitPrediction<'info> {
    pub polla: Account<'info, Polla>,

    #[account(
        mut,
        seeds = [PREDICTION_SEED, polla.key().as_ref(), predictor.key().as_ref()],
        bump = prediction.bump,
        has_one = predictor @ ChickenPicksError::PredictorMismatch,
    )]
    pub prediction: Account<'info, Prediction>,

    pub predictor: Signer<'info>,
}

pub fn handler(
    ctx: Context<SubmitPrediction>,
    scores: [PredictionScore; MAX_MATCHES],
) -> Result<()> {
    let polla = &ctx.accounts.polla;
    require!(polla.status == PollaStatus::Open, ChickenPicksError::PollaNotOpen);

    let prediction = &mut ctx.accounts.prediction;
    prediction.scores = scores;
    prediction.submitted_at_slot = Clock::get()?.slot;

    Ok(())
}
