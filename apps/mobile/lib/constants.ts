// Vendored from packages/shared/src/constants.ts. We duplicate them here
// to avoid Metro chasing pnpm symlinks across the workspace; these are
// stable on-chain constants so drift risk is low. If you change the
// program ID or USDC mint, mirror it here AND in packages/shared.
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

export const SOLANA_CLUSTER = 'devnet' as const;
export const SOLANA_RPC_URL =
  extra.solanaRpcUrl ?? 'https://api.devnet.solana.com';

export const PROGRAM_ID =
  extra.programId ?? 'Cdd53o33BTaZcmpZ55TemGPmZRR2mbMiYDEU6Mecb3ut';

export const USDC_MINT_DEVNET = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr';
export const USDC_MINT = extra.usdcMint ?? USDC_MINT_DEVNET;

export const USDC_DECIMALS = 6;
export const SOL_DECIMALS = 9;

export const PLATFORM_FEE_BPS = 500;
// Bump in lockstep with programs/chickenpicks-onchain/src/constants.rs.
export const MAX_MATCHES = 256;
export const MAX_PRIZE_TIERS = 10;
export const UNSET_SCORE = -1;
export const UNRANKED = 0xff;

export const PLATFORM_SEED = new TextEncoder().encode('platform');
export const POLLA_SEED = new TextEncoder().encode('polla');
export const MATCH_SEED = new TextEncoder().encode('match');
export const PREDICTION_SEED = new TextEncoder().encode('prediction');
export const VAULT_SEED = new TextEncoder().encode('vault');

export const PRIVY_APP_ID = extra.privyAppId ?? '';
export const PRIVY_CLIENT_ID = extra.privyClientId ?? '';
