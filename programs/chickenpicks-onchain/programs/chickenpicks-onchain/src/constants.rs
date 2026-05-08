// Platform fee — 5%, locked at compile time. Cannot be changed by any instruction.
pub const PLATFORM_FEE_BPS: u16 = 500;

// Hard caps on per-polla scale. Tuned for hackathon demo size.
pub const MAX_MATCHES: usize = 10;
pub const MAX_PRIZE_TIERS: usize = 10;

// PDA seed prefixes
pub const PLATFORM_SEED: &[u8] = b"platform";
pub const POLLA_SEED: &[u8] = b"polla";
pub const MATCH_SEED: &[u8] = b"match";
pub const PREDICTION_SEED: &[u8] = b"prediction";
pub const VAULT_SEED: &[u8] = b"vault";

// Sentinel: -1 in i8 represents an unset score. Used for both predictions and match results.
pub const UNSET_SCORE: i8 = -1;

// Sentinel: 0xFF means "did not place in the prize tier" — written by settle_polla.
pub const UNRANKED: u8 = 0xFF;
