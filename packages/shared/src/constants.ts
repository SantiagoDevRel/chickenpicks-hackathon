// Cluster + RPC
export const SOLANA_CLUSTER = 'devnet' as const;
export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';

// Program ID — replaced after `solana-keygen new -o keys/program.json` + `anchor deploy`.
// Keep this in sync with:
//   - declare_id!() in programs/.../src/lib.rs
//   - all 3 [programs.*] entries in Anchor.toml
//   - NEXT_PUBLIC_PROGRAM_ID in .env
export const PROGRAM_ID =
  process.env.NEXT_PUBLIC_PROGRAM_ID ?? 'Cdd53o33BTaZcmpZ55TemGPmZRR2mbMiYDEU6Mecb3ut';

// USDC mint addresses
export const USDC_MINT_DEVNET = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'; // Circle devnet
export const USDC_MINT_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // Circle mainnet

export const USDC_MINT =
  process.env.NEXT_PUBLIC_USDC_MINT ?? USDC_MINT_DEVNET;

export const USDC_DECIMALS = 6;
export const SOL_DECIMALS = 9;

// Program constants — must match Rust constants
export const PLATFORM_FEE_BPS = 500;       // 5%
// Bump in lockstep with programs/chickenpicks-onchain/src/constants.rs.
// 256 is the single-tx submit cap (512 bytes args, fits 1232 tx limit).
// >256 needs chunked submit_prediction — handle in batches client-side.
export const MAX_MATCHES = 256;
export const MAX_PRIZE_TIERS = 10;
export const UNSET_SCORE = -1;
export const UNRANKED = 0xff;

// PDA seed prefixes — must byte-match Rust constants
export const PLATFORM_SEED = new TextEncoder().encode('platform');
export const POLLA_SEED = new TextEncoder().encode('polla');
export const MATCH_SEED = new TextEncoder().encode('match');
export const PREDICTION_SEED = new TextEncoder().encode('prediction');
export const VAULT_SEED = new TextEncoder().encode('vault');

// Platform authority pubkey — set after solana-keygen, used to gate /admin UI
export const PLATFORM_AUTHORITY = process.env.NEXT_PUBLIC_PLATFORM_AUTHORITY ?? '';

// Pollas to hide from every UI surface (lists, voice agent's list_pools).
// We can't delete a polla on-chain (no instruction), and partially-created
// pollas (where add_match failed mid-loop) can't be settled either. We keep
// them filtered out at the UI layer so they don't appear OPEN to users.
//
// Each entry should include a one-line reason so future cleanup knows what
// happened. Entries can be removed once the on-chain row is truly gone
// (e.g. after a future cancel_polla instruction).
export const HIDDEN_POLLAS = new Set<string>([
  // 2026-05-09: user ran out of SOL mid add_match loop (66/104 added);
  // unsettleable because num_matches=104 != actual match accounts.
  'FpYgD5XwMMpjKvZEcbwTPnUKeYfgpkZ3CppNZtjee6nq',
]);
