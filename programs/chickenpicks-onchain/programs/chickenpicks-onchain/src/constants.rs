use anchor_lang::prelude::{pubkey, Pubkey};

// Platform fee — 5%, locked at compile time. Cannot be changed by any instruction.
pub const PLATFORM_FEE_BPS: u16 = 500;

// Pinned USDC mint for the active network (devnet). Pollas may only be created
// against this mint — prevents an attacker from registering a fake "USDC" polla
// using a mint they control.
pub const EXPECTED_USDC_MINT: Pubkey = pubkey!("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

// MAX_MATCHES sets the on-chain `scores: [PredictionScore; MAX_MATCHES]`
// array. 256 is the practical cap for a single-tx submit_prediction —
// 256 * 2 = 512 bytes of args fits in Solana's 1232-byte tx limit with
// room for accounts/signatures. Covers WC (104), Champions full season,
// and most cup competitions. League seasons (Premier 380, La Liga 380)
// would need a chunked submit (post-demo).
pub const MAX_MATCHES: usize = 256;
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
