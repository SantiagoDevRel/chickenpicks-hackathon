use anchor_lang::prelude::*;

#[error_code]
pub enum ChickenPicksError {
    #[msg("Platform already initialized")]
    PlatformAlreadyInitialized,

    #[msg("Polla is not accepting new predictions")]
    PollaLocked,

    #[msg("Polla must be Open to submit predictions")]
    PollaNotOpen,

    #[msg("Polla must be Locked to settle")]
    PollaNotLocked,

    #[msg("Polla must be Settled to claim")]
    PollaNotSettled,

    #[msg("Polla is already settled")]
    PollaAlreadySettled,

    #[msg("Match index out of range for this polla")]
    MatchIndexOutOfRange,

    #[msg("Match already settled — cannot overwrite")]
    MatchAlreadySettled,

    #[msg("Not all matches are settled — cannot trigger settlement")]
    MatchesNotSettled,

    #[msg("Caller is not the platform authority")]
    UnauthorizedAuthority,

    #[msg("Number of Prediction accounts does not match polla.num_participants")]
    PredictionAccountCountMismatch,

    #[msg("Number of Match accounts does not match polla.num_matches")]
    MatchAccountCountMismatch,

    #[msg("A Match account belongs to a different polla")]
    MatchPollaMismatch,

    #[msg("A Prediction account belongs to a different polla")]
    PredictionPollaMismatch,

    #[msg("Match indices must cover 0..num_matches with no gaps and no duplicates")]
    InvalidMatchOrdering,

    #[msg("Prize distribution sum must be <= 100")]
    InvalidPrizeDistribution,

    #[msg("num_matches must be in 1..=10")]
    InvalidMatchCount,

    #[msg("Strict signer check failed: prediction.predictor != ctx.accounts.predictor")]
    PredictorMismatch,

    #[msg("Prize already claimed")]
    AlreadyClaimed,

    #[msg("Predictor is not in the prize tier")]
    NotInPrizeTier,

    #[msg("Numerical overflow")]
    NumericalOverflow,
}
